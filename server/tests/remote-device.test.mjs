// Remote PC: which computer is connected, since when, and for how long in all (owner, 2026-11-18: the phone's Details,
// "connected time, total connected time"). services/remote-device.service.js.
// Run: node --experimental-test-module-mocks --test tests/remote-device.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";

const kv = new Map();
const redis = {
    async get(k) { return kv.has(k) ? kv.get(k) : null; },
    async set(k, v) { kv.set(k, String(v)); return "OK"; },
};

// RemoteDevice rows in memory: the queries the service makes
const rows = [];
const matches = (r, q) => Object.entries(q).every(([k, v]) => {
    if (v && typeof v === "object" && "$ne" in v) return (r[k] ?? null) !== v.$ne;
    if (v instanceof Date || r[k] instanceof Date) return (r[k] ? new Date(r[k]).getTime() : null) === (v ? new Date(v).getTime() : null);
    return String(r[k] ?? null) === String(v ?? null);
});
const RemoteDevice = {
    findOne: (q) => ({ select: () => ({ lean: async () => { const r = rows.find((x) => matches(x, q)); return r ? { ...r } : null; } }) }),
    updateOne: async (q, u, opts = {}) => {
        let r = rows.find((x) => matches(x, q));
        if (!r && opts.upsert) { r = { userId: q.userId, deviceId: q.deviceId, totalConnectedMs: 0, connectedSince: null }; rows.push(r); }
        if (!r) return { matchedCount: 0 };
        for (const [k, v] of Object.entries(u.$inc || {})) r[k] = (r[k] || 0) + v;
        Object.assign(r, u.$set || {});
        for (const [k, v] of Object.entries(u.$addToSet || {})) r[k] = [...new Set([...(r[k] || []), v])];
        return { matchedCount: 1 };
    },
};

let runner = []; // the user's runner connections now, on every server process
const localSockets = new Map(); // this process's sockets (getIO().of("/").sockets)

mock.module("../src/config/redis.js", { defaultExport: redis });
mock.module("../src/models/RemoteChat.js", { namedExports: { RemoteDevice }, defaultExport: {} });
mock.module("../src/services/local-runner.service.js", { namedExports: { runnerSockets: async () => runner } });
mock.module("../src/services/socket.service.js", { namedExports: { getIO: () => ({ of: () => ({ sockets: localSockets }) }) } });

const svc = await import("../src/services/remote-device.service.js");
const PC = "a".repeat(64);
const OTHER = "b".repeat(64);
const row = (deviceId = PC) => rows.find((r) => r.deviceId === deviceId);
const sock = (id, { deviceId, sid, at } = {}) => ({ id, userId: "u1", sid, handshake: { auth: { token: "t", runner: true, ...(deviceId ? { deviceId } : {}) }, time: at ? new Date(at).toString() : undefined }, data: {} });

test("a computer's app connects: the computer is known and its connection starts", async () => {
    const s = sock("s1", { deviceId: PC });
    assert.equal(await svc.runnerConnected(s, { now: 1_000_000 }), PC);
    assert.equal(s.data.remoteDevice, PC);
    runner = [s];
    assert.equal(new Date(row().connectedSince).getTime(), 1_000_000);
    // Classgrid Code on the same computer a minute later: the same connection goes on
    const s2 = sock("s2", { deviceId: PC });
    await svc.runnerConnected(s2, { now: 1_060_000 });
    runner = [s, s2];
    assert.equal(new Date(row().connectedSince).getTime(), 1_000_000);
    // the app closes; Classgrid Code is still connected: nothing ends
    runner = [s2];
    await svc.runnerDisconnected(s, { graceMs: 0 });
    assert.equal(new Date(row().connectedSince).getTime(), 1_000_000);
    assert.equal(row().totalConnectedMs, 0);
    // the last one closes: the time adds up and the computer is not connected any more
    runner = [];
    await svc.runnerDisconnected(s2, { graceMs: 0 });
    assert.equal(row().connectedSince, null);
    assert.ok(row().totalConnectedMs > 0);
});

test("online: the chat's own computer, or a connection that did not say its computer; another computer doesn't count", async () => {
    const other = sock("o1", { deviceId: OTHER }); other.data.remoteDevice = OTHER;
    runner = [other];
    assert.equal(await svc.deviceOnline("u1", PC), false, "only another computer of the person is on");
    assert.equal(await svc.deviceOnline("u1", null), true, "no computer named: any connection");
    const unknown = sock("x1", { at: 5_000_000 });
    runner = [other, unknown];
    const st = await svc.deviceStatus("u1", PC);
    assert.equal(st.online, true, "an app from before says no computer: it may be this one");
    assert.equal(st.sure, false);
    runner = [];
});

test("an app from before: its computer is learnt from its sign-in's chat requests", async () => {
    rows.length = 0;
    const s = sock("s3", { sid: "sid-1" });
    localSockets.set("s3", s);
    assert.equal(await svc.runnerConnected(s, { now: 2_000_000 }), null, "nothing known yet");
    runner = [s];
    // a chat message from that sign-in names the computer
    await svc.learnDevice("u1", "sid-1", PC);
    assert.equal(s.data.remoteDevice, PC, "its open connection is that computer's now");
    assert.equal(new Date(row().connectedSince).getTime(), 2_000_000, "connected since the connection opened");
    // its next connection (after a restart of the server) is known at once
    const again = sock("s4", { sid: "sid-1" });
    assert.equal(await svc.runnerConnected(again, { now: 2_030_000 }), PC);
    assert.equal(new Date(row().connectedSince).getTime(), 2_000_000, "a reconnect within seconds keeps the connection");
    assert.equal(await svc.learnDevice("u1", "sid-1", "not-an-id"), undefined);
    localSockets.clear();
    runner = [];
});

test("a connection the server never saw close ends at its last sign of life", async () => {
    rows.length = 0;
    rows.push({ userId: "u1", deviceId: PC, connectedSince: new Date(10_000_000), lastSeenAt: new Date(10_600_000), totalConnectedMs: 1000 });
    // the computer comes back an hour later: the old connection lasted 10 minutes, a new one starts
    const s = sock("s5", { deviceId: PC });
    await svc.runnerConnected(s, { now: 14_000_000 });
    assert.equal(row().totalConnectedMs, 1000 + 600_000);
    assert.equal(new Date(row().connectedSince).getTime(), 14_000_000);
    runner = [s];
    // Details while connected: the total includes the connection open now
    const d = await svc.deviceConnection("u1", PC, { now: 14_060_000 });
    assert.equal(d.online, true);
    assert.equal(d.connectedSince, new Date(14_000_000).toISOString());
    assert.equal(d.totalConnectedMs, 1000 + 600_000 + 60_000);
    // gone without a close (the server stopped meanwhile): Details closes it at its last sign of life
    runner = [];
    row().lastSeenAt = new Date(14_120_000);
    const gone = await svc.deviceConnection("u1", PC, { now: 20_000_000 });
    assert.equal(gone.online, false);
    assert.equal(gone.connectedSince, null);
    assert.equal(gone.totalConnectedMs, 1000 + 600_000 + 120_000);
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(row().connectedSince, null, "and it is kept closed");
    assert.equal(row().totalConnectedMs, 1000 + 600_000 + 120_000);
});

test("Details of a computer whose app said nothing yet: connected since its connection opened", async () => {
    rows.length = 0;
    runner = [sock("x2", { at: 30_000_000 })];
    const d = await svc.deviceConnection("u1", PC, { now: 30_000_000 + 90_000 });
    assert.equal(d.online, true);
    assert.equal(d.connectedSince, new Date(30_000_000).toISOString());
    assert.equal(d.totalConnectedMs, 90_000);
    runner = [];
    const off = await svc.deviceConnection("u1", PC);
    assert.deepEqual(off, { online: false, state: "offline", connectedSince: null, totalConnectedMs: 0 });
});

// (owner, 2026-11-18: "when the app is closed show it; you still show green")
test("the Classgrid app with its window closed (in the tray) is a yellow \"background\", and an old extension is not the app", async () => {
    const DEV = "c".repeat(64);
    const app = { id: "app", userId: "u1", handshake: { auth: { token: "t", runner: true, deviceId: DEV, app: "desktop", windowOpen: true } }, data: {} };
    await svc.runnerConnected(app, { now: 5_000_000 });
    runner = [app];
    assert.equal((await svc.deviceStatus("u1", DEV, "desktop")).state, "connected");
    svc.runnerState(app, { windowOpen: false });
    assert.equal((await svc.deviceStatus("u1", DEV, "desktop")).state, "background");
    svc.runnerState(app, { windowOpen: true });
    assert.equal((await svc.deviceStatus("u1", DEV, "desktop")).state, "connected");
    // An editor extension from before 2026-11-18 (says neither its computer nor its app) is left open; the app quits
    const oldExtension = { id: "ext", userId: "u1", handshake: { auth: { token: "t", runner: true } }, data: {} };
    runner = [oldExtension];
    assert.equal((await svc.deviceStatus("u1", DEV, "desktop")).state, "offline");
    // ...it still counts for an editor chat, and for a computer whose apps never said which app they are
    assert.equal((await svc.deviceStatus("u1", DEV, "editor")).state, "connected");
    assert.equal((await svc.deviceStatus("u1", OTHER, "desktop")).state, "connected");
});
