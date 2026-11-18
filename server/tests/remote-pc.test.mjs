// Remote PC (owner, 2026-11-18): a chat on the computer followed and answered from the phone.
// services/remote-pc.service.js. Run: node --experimental-test-module-mocks --test tests/remote-pc.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";

// ---- a small Redis in memory (only what the service uses) ----
const kv = new Map(); const lists = new Map(); const sets = new Map();
const redis = {
    async get(k) { return kv.has(k) ? kv.get(k) : null; },
    async set(k, v, ...opts) { if (opts.includes("NX") && kv.has(k)) return null; kv.set(k, String(v)); return "OK"; },
    async del(...ks) { for (const k of ks) { kv.delete(k); lists.delete(k); sets.delete(k); } return 1; },
    async exists(k) { return kv.has(k) || lists.has(k) || sets.has(k) ? 1 : 0; },
    async expire() { return 1; },
    async sismember(k, v) { return sets.get(k)?.has(String(v)) ? 1 : 0; },
    async lrange(k) { return [...(lists.get(k) || [])]; },
    multi() {
        const ops = [];
        const m = {
            del: (k) => { ops.push(() => redis.del(k)); return m; },
            sadd: (k, ...vs) => { ops.push(() => { const s = sets.get(k) || new Set(); vs.forEach((v) => s.add(String(v))); sets.set(k, s); }); return m; },
            expire: () => m,
            rpush: (k, v) => { ops.push(() => { const l = lists.get(k) || []; l.push(v); lists.set(k, l); }); return m; },
            ltrim: (k, a) => { ops.push(() => { const l = lists.get(k) || []; lists.set(k, l.slice(a)); }); return m; },
            set: (k, v) => { ops.push(() => kv.set(k, String(v))); return m; },
            exec: async () => { for (const op of ops) await op(); return []; },
        };
        return m;
    },
};
const emitted = [];
let remoteRows = [];
let online = true;
let answering = false;
const runs = [];

mock.module("../src/config/redis.js", { defaultExport: redis });
mock.module("../src/services/socket.service.js", { namedExports: { getIO: () => ({ to: (room) => ({ emit: (name, data) => emitted.push({ room, name, data }) }) }) } });
mock.module("../src/models/RemoteChat.js", {
    defaultExport: {
        find: () => ({ select: () => ({ lean: async () => remoteRows.filter((r) => r.on) }), sort: () => ({ limit: () => ({ lean: async () => remoteRows.filter((r) => r.on) }) }) }),
        findOne: (q) => ({ lean: async () => remoteRows.find((r) => r.sessionId === q.sessionId && r.on) || null }),
        findOneAndUpdate: (q, u) => ({ lean: async () => { let r = remoteRows.find((x) => x.sessionId === q.sessionId); if (!r) { r = { sessionId: q.sessionId }; remoteRows.push(r); } Object.assign(r, u.$set); return r; } }),
    },
});
mock.module("../src/models/User.js", { defaultExport: { findById: () => ({ select: async () => ({ _id: "u1", email: "a@b.c" }) }) } });
mock.module("../src/config/supabaseClient.js", { namedExports: { primarySupabaseClient: {} } });
const pushes = [];
mock.module("../src/services/user-push.service.js", { namedExports: { pushRemoteQuestion: async (p) => { pushes.push(p); } } });
mock.module("../src/services/local-runner.service.js", { namedExports: { runnerOnline: async () => online } });
mock.module("../src/services/chat-wake.service.js", { namedExports: { chatAnswering: async () => answering } });
mock.module("../src/services/whatsapp-call.service.js", {
    namedExports: {
        runAgentTask: async (user, question, projectId, onSession, sessionId, onStep, extraBody, signal, onData) => {
            runs.push({ question, sessionId, extraBody });
            onData({ type: "token", token: "Hi" });
            onData({ type: "permission_request", id: "p1", tool: "execute_terminal_command", title: "Run npm test" });
            onData({ type: "pc_tool_call", id: "x" }); // (never sent to the phone)
            return { answer: "Hi" };
        },
    },
});

const S = "11111111-2222-3333-4444-555555555555";
const svc = await import("../src/services/remote-pc.service.js");
const tick = () => new Promise((r) => setTimeout(r, 20));

test("only the events the phone shows go out, and a step's result is cut", () => {
    assert.equal(svc.liveEventOf({ type: "pc_tool_call" }), null);
    assert.equal(svc.liveEventOf({ type: "round_end" }), null);
    assert.deepEqual(svc.liveEventOf({ type: "token", token: "a" }), { type: "token", token: "a" });
    assert.equal(svc.liveEventOf({ type: "tool_result", result: "x".repeat(9000) }).result.length, 4000);
    assert.ok(svc.liveEventOf({ type: "permission_request", id: "p" }));
});

test("/remote turns a chat on; a phone message is refused when it can't run, with a clear reason", async () => {
    assert.deepEqual(await svc.sendFromPhone({ _id: "u1" }, S, { question: "hi" }).then((r) => r.code), "not_remote");
    await svc.setRemoteChat({ userId: "u1", sessionId: S, on: true, deviceName: "Classgrid desktop app on Windows" });
    assert.equal(await svc.remoteChatOn("u1", S), true);
    online = false;
    assert.equal((await svc.sendFromPhone({ _id: "u1" }, S, { question: "hi" })).code, "offline");
    online = true; answering = true;
    assert.equal((await svc.sendFromPhone({ _id: "u1" }, S, { question: "hi" })).code, "busy");
    answering = false;
    assert.equal((await svc.sendFromPhone({ _id: "u1" }, S, { question: "  " })).code, "empty");
});

test("a phone message runs the chat the computer's way, live to the phone and to the computer's app", async () => {
    emitted.length = 0;
    const out = await svc.sendFromPhone({ _id: "u1" }, S, { question: "run the tests", permissionMode: "turbo" });
    assert.deepEqual(out, { ok: true });
    await tick();
    assert.equal(runs.at(-1).question, "run the tests");
    assert.equal(runs.at(-1).extraBody.clientApp, "desktop");
    assert.equal(runs.at(-1).extraBody.permissionMode, "turbo", "Turbo can be picked from the phone (owner)");
    const names = emitted.map((e) => e.name);
    assert.ok(names.includes("remote:turn"));
    assert.ok(emitted.some((e) => e.name === "remote:live" && e.data.event.type === "permission_request"), "the question reaches the phone");
    assert.equal(pushes.at(-1)?.sessionId, S, "and as a push: nobody is at the computer for a message sent from the phone");
    assert.ok(!emitted.some((e) => e.name === "remote:live" && e.data.event.type === "pc_tool_call"));
    assert.ok(emitted.some((e) => e.name === "chat:woke-live" && e.data.event.type === "token"), "the computer's app shows it live");
    assert.deepEqual(emitted.filter((e) => e.name === "chat:woke").map((e) => e.data.phase), ["start", "end"]);
    assert.ok(emitted.every((e) => e.room === "u1"));
    // the next message, once that one has ended, runs too (while one runs, "busy" above)
    assert.equal((await svc.sendFromPhone({ _id: "u1" }, S, { question: "again" })).ok, true);
    await tick(); // (that run ends before the next test)
});

test("a phone that opens the chat mid-answer gets what it missed; the end clears the answer", async () => {
    await svc.remoteTurnStarted("u1", S, { question: "build it", from: "computer", turnId: "t1" });
    svc.mirrorRemoteEvent("u1", S, { type: "token", token: "Work" });
    svc.mirrorRemoteEvent("u1", S, { type: "pc_tool_call", id: "nope" });
    const before = pushes.length;
    svc.mirrorRemoteEvent("u1", S, { type: "permission_request", id: "q", title: "Run it?" }, { computerOnStream: true });
    assert.equal(pushes.length, before, "no push while the computer's app is on the answer");
    await tick();
    const live = await svc.liveState(S);
    assert.equal(live.running, true);
    assert.equal(live.turnId, "t1");
    assert.equal(live.question, "build it");
    assert.deepEqual(live.events, [{ type: "token", token: "Work" }, { type: "permission_request", id: "q", title: "Run it?" }]);
    await svc.remoteTurnEnded("u1", S);
    const after = await svc.liveState(S);
    assert.equal(after.running, false);
    assert.deepEqual(after.events, []);
    assert.equal((await svc.stopRemote("u1", S)).ok, true);
});

test("/remote off: the chat is no longer remote", async () => {
    await svc.setRemoteChat({ userId: "u1", sessionId: S, on: false });
    assert.equal(await svc.remoteChatOn("u1", S), false);
    assert.equal((await svc.sendFromPhone({ _id: "u1" }, S, { question: "hi" })).code, "not_remote");
});
