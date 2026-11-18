// Remote PC (owner, 2026-11-18): a chat on the computer followed and answered from the phone.
// services/remote-pc.service.js. Run: node --experimental-test-module-mocks --test tests/remote-pc.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";

// ---- a small Redis in memory (only what the service uses) ----
const kv = new Map(); const lists = new Map(); const sets = new Map(); const hashes = new Map();
const redis = {
    async hexists(k, f) { return hashes.get(k)?.has(String(f)) ? 1 : 0; },
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
let devices = {};
mock.module("../src/models/RemoteChat.js", {
    namedExports: {
        RemoteDevice: {
            findOne: (q) => ({ select: () => ({ lean: async () => (q.deviceId in devices ? { allowed: devices[q.deviceId] } : null) }) }),
            updateOne: async (q, u) => { devices[q.deviceId] = u.$set.allowed; },
        },
    },
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
const onlineAsked = [];
mock.module("../src/services/remote-device.service.js", {
    namedExports: {
        deviceOnline: async (userId, deviceId) => { onlineAsked.push(deviceId); return online; },
        deviceConnection: async () => ({ online, connectedSince: online ? "2026-11-18T06:00:00.000Z" : null, totalConnectedMs: 5400000 }),
    },
});
// (the chat's project: its copy on the chat's computer is the one used)
const CHAT_PROJECT = { _id: "6ae794f2ae1c1229bcf72dd4", name: "classgrid_marketting", location: "local", localPath: "c:\\classgrid_marketting" };
let chatProject = CHAT_PROJECT;
const lookups = [];
mock.module("../src/services/ide-project.service.js", { namedExports: { projectForChat: async (sessionId, opts) => { lookups.push({ sessionId, opts }); return chatProject; } } });
let answeringFn = null; // (a test that needs the real check: the working mark or the run key)
mock.module("../src/services/chat-wake.service.js", { namedExports: { chatAnswering: async () => (answeringFn ? answeringFn() : answering) } });
mock.module("../src/services/whatsapp-call.service.js", {
    namedExports: {
        runAgentTask: async (user, question, projectId, onSession, sessionId, onStep, extraBody, signal, onData) => {
            runs.push({ question, sessionId, extraBody, projectId });
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
    assert.equal(svc.liveEventOf({ type: "tool_done" }), null);
    assert.equal(svc.liveEventOf({ type: "turn_info", turnId: "t" }), null);
    assert.deepEqual(svc.liveEventOf({ type: "token", token: "a" }), { type: "token", token: "a" });
    assert.equal(svc.liveEventOf({ type: "tool_result", result: "x".repeat(30000) }).result.length, svc.LIVE_RESULT_CHARS);
    assert.equal(svc.liveEventOf({ type: "tool_result", result: "x".repeat(9000) }).result.length, 9000, "a command's output of 9,000 characters reaches the phone whole");
    assert.deepEqual(svc.liveEventOf({ type: "tool_result", tool: "spotify_connector", result: { tracks: [1] } }).result, { tracks: [1] }, "a card's data stays as it is");
    assert.ok(svc.liveEventOf({ type: "permission_request", id: "p" }));
    // everything else the computer's chat shows of an answer goes too
    for (const type of ["sources", "checkpoint", "file_update", "plan_step_update", "helper_progress", "generated_image", "title_updated", "limit_ended", "chat_ended"]) {
        assert.ok(svc.liveEventOf({ type }), type);
    }
    // a file edit's whole change (the phone draws its diff from the step's input)
    const edit = { type: "tool_start", tool: "edit_project_file", args: { path: "src/a.ts", edits: [{ old_text: "a", new_text: "b".repeat(50000) }] } };
    assert.deepEqual(svc.liveEventOf(edit), edit);
});

test("a phone message's files: web links only, at most 10, with a name", () => {
    assert.deepEqual(svc.cleanAttachments(null), []);
    assert.deepEqual(svc.cleanAttachments([{ url: "javascript:alert(1)" }, { url: "data:image/png;base64,AAA" }, { url: "http://x.y/a.png" }]), []);
    assert.deepEqual(svc.cleanAttachments([{ url: "https://cdn.classgrid.in/u/photo.jpg?x=1", mimeType: "image/jpeg" }]), [{ url: "https://cdn.classgrid.in/u/photo.jpg?x=1", name: "photo.jpg", mimeType: "image/jpeg" }]);
    assert.equal(svc.cleanAttachments(Array.from({ length: 14 }, (_, i) => ({ url: `https://a.b/${i}.png`, name: `${i}.png` }))).length, 10);
});

test("/remote turns a chat on; a phone message is refused when it can't run, with a clear reason", async () => {
    assert.deepEqual(await svc.sendFromPhone({ _id: "u1" }, S, { question: "hi" }).then((r) => r.code), "not_remote");
    await svc.setRemoteChat({ userId: "u1", sessionId: S, on: true, deviceName: "Classgrid desktop app on Windows" });
    assert.equal(await svc.remoteChatOn("u1", S), true);
    online = false;
    assert.equal((await svc.sendFromPhone({ _id: "u1" }, S, { question: "hi" })).code, "offline");
    assert.equal(onlineAsked.at(-1), null, "the chat's own computer is asked about (none known for this chat)");
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
    // Stop also ends the answer on the server: its run key changes, which streamAskAi checks every 3 seconds
    await redis.set(`chat:run:u1:${S}`, "run-1");
    assert.equal((await svc.stopRemote("u1", S)).ok, true);
    assert.match(await redis.get(`chat:run:u1:${S}`), /^stopped-/);
});

test("a phone message carries its photos and files, and runs on the chat's own computer", async () => {
    remoteRows = remoteRows.map((r) => (r.sessionId === S ? { ...r, deviceId: "abcdef0123456789abcdef" } : r));
    emitted.length = 0;
    const out = await svc.sendFromPhone({ _id: "u1" }, S, { question: "", attachments: [{ url: "https://cdn.classgrid.in/u/shot.png", name: "shot.png", mimeType: "image/png" }, { url: "file:///c:/x" }] });
    assert.deepEqual(out, { ok: true }, "a photo alone is a message");
    await tick();
    const body = runs.at(-1).extraBody;
    assert.deepEqual(body.attachments, [{ url: "https://cdn.classgrid.in/u/shot.png", name: "shot.png", mimeType: "image/png" }]);
    assert.deepEqual(body.fileUrls, ["https://cdn.classgrid.in/u/shot.png"]);
    assert.equal(body.deviceId, "abcdef0123456789abcdef", "the chat's computer: its folder project is used, as when typed there");
    assert.equal(onlineAsked.at(-1), "abcdef0123456789abcdef");
    const start = emitted.find((e) => e.name === "remote:turn" && e.data.phase === "start");
    assert.equal(start.data.attachments[0].name, "shot.png", "the phone shows the photo above the answer");
    assert.equal(emitted.find((e) => e.name === "chat:woke" && e.data.phase === "start").data.attachments.length, 1);
});

test("a phone message has its own checkpoint on the computer, and an edited question says so", async () => {
    assert.deepEqual(await svc.sendFromPhone({ _id: "u1" }, S, { question: "change it", isEdit: true }), { ok: true });
    await tick();
    const body = runs.at(-1).extraBody;
    assert.match(body.localCheckpoint, /^\d{13}$/, "the app keeps this answer's before-copies under it (Review, Undo)");
    assert.equal(body.isEdit, true);
    assert.equal((await svc.sendFromPhone({ _id: "u1" }, S, { question: "again" })).ok, true);
    await tick();
    assert.equal(runs.at(-1).extraBody.isEdit, undefined);
});

test("a message sent right after Stop waits for the stopped answer to end instead of being refused", async () => {
    // (the owner's phone, 2026-11-18: Stop, then a message a second later, got "This chat is answering right now")
    // The stopped answer is still saving (the chat is marked working); Stop's mark stays 8 seconds after it
    answering = true;
    await redis.set(`chat:run:u1:${S}`, "stopped-1");
    hashes.set("ai:working:u1", new Set([S]));
    setTimeout(() => { hashes.delete("ai:working:u1"); }, 300);
    // (chat-wake.service.js chatAnswering: the working mark or the run key)
    answeringFn = async () => (await redis.hexists("ai:working:u1", S)) === 1 || (await redis.exists(`chat:run:u1:${S}`)) === 1;
    const out = await svc.sendFromPhone({ _id: "u1" }, S, { question: "next" }, { stopWaitMs: 3000 });
    answeringFn = null;
    assert.deepEqual(out, { ok: true });
    assert.equal(await redis.get(`chat:run:u1:${S}`), null, "Stop's mark no longer holds the chat once the answer has ended");
    await tick();
    // an answer that was not stopped: refused at once, as before
    answering = true;
    await redis.set(`chat:run:u1:${S}`, "run-2");
    const started = Date.now();
    assert.equal((await svc.sendFromPhone({ _id: "u1" }, S, { question: "next" }, { stopWaitMs: 3000 })).code, "busy");
    assert.ok(Date.now() - started < 1000);
    // a stopped answer that doesn't end in time: still refused, and Stop's mark stays for it
    await redis.set(`chat:run:u1:${S}`, "stopped-2");
    hashes.set("ai:working:u1", new Set([S]));
    assert.equal((await svc.sendFromPhone({ _id: "u1" }, S, { question: "next" }, { stopWaitMs: 300 })).code, "busy");
    assert.equal(await redis.get(`chat:run:u1:${S}`), "stopped-2");
    answering = false;
    hashes.clear();
    await redis.del(`chat:run:u1:${S}`);
});

test("Details: the computer, its connection, the project open there, the mode and when it was turned on", async () => {
    online = true;
    const d = await svc.remoteChatDetails({ _id: "u1" }, S);
    assert.deepEqual(Object.keys(d).sort(), ["clientApp", "connectedSince", "deviceId", "deviceKind", "deviceName", "mode", "effort", "online", "project", "selectedModel", "state", "totalConnectedMs", "turnedOnAt"].sort());
    assert.equal(d.deviceName, "Classgrid desktop app on Windows");
    assert.equal(d.deviceKind, "desktop");
    assert.equal(d.online, true);
    assert.equal(d.connectedSince, "2026-11-18T06:00:00.000Z");
    assert.equal(d.totalConnectedMs, 5400000);
    assert.deepEqual(d.project, { name: "classgrid_marketting", path: "c:\\classgrid_marketting" });
    assert.equal(d.clientApp, "desktop");
    assert.match(d.turnedOnAt, /^\d{4}-\d\d-\d\dT/, "turned on with /remote: its time is kept");
    assert.equal(await svc.remoteChatDetails({ _id: "u1" }, "99999999-2222-3333-4444-555555555555"), null);
});

test("a computer whose own Remote PC switch is off: the phone's message is refused", async () => {
    remoteRows = remoteRows.map((r) => (r.sessionId === S ? { ...r, on: true, deviceId: "abcdef0123456789" } : r));
    await svc.setDeviceAllowed("u1", "abcdef0123456789", false);
    assert.equal(await svc.deviceAllowed("u1", "abcdef0123456789"), false);
    assert.equal((await svc.sendFromPhone({ _id: "u1" }, S, { question: "hi" })).code, "not_allowed");
    await svc.setDeviceAllowed("u1", "abcdef0123456789", true);
    assert.equal(await svc.deviceAllowed("u1", null), true, "no computer known: allowed");
});

test("/remote off: the chat is no longer remote", async () => {
    await svc.setRemoteChat({ userId: "u1", sessionId: S, on: false });
    assert.equal(await svc.remoteChatOn("u1", S), false);
    assert.equal((await svc.sendFromPhone({ _id: "u1" }, S, { question: "hi" })).code, "not_remote");
});

test("a phone message names the chat's project and its computer, as the computer's app does, and picks tools the same way", async () => {
    // (2026-11-18: with no project named, the phone's message took the chat off its project and off the computer's
    // copy, so it ran in the cloud copy: the sandbox, 20 s per message, no prompt cache)
    remoteRows = remoteRows.map((r) => (r.sessionId === S ? { ...r, on: true, deviceId: "495b3e5d4e0316451f73" } : r));
    devices = {};
    online = true; answering = false; answeringFn = null;
    await redis.del(`chat:run:u1:${S}`, `remote:running:${S}`);
    assert.deepEqual(await svc.sendFromPhone({ _id: "u1" }, S, { question: "see my project" }), { ok: true });
    await tick();
    const run = runs.at(-1);
    assert.equal(run.projectId, "6ae794f2ae1c1229bcf72dd4", "the chat's project goes with the message (body.projectId)");
    assert.equal(run.extraBody.deviceId, "495b3e5d4e0316451f73", "with the chat's own computer, whose copy is used");
    assert.equal(run.extraBody.clientApp, "desktop");
    assert.equal(run.extraBody.allTools, false, "tools by the message, as on the computer, not every tool at once");
    assert.equal(run.extraBody.remoteFrom, "phone");
    assert.equal(String(lookups.at(-1).sessionId), S);
    // a chat with no project names none
    chatProject = null;
    assert.deepEqual(await svc.sendFromPhone({ _id: "u1" }, S, { question: "hi" }), { ok: true });
    await tick();
    assert.equal(runs.at(-1).projectId, null);
    chatProject = CHAT_PROJECT;
});

test("the other accounts' memory: kept from the computer's messages in a Remote PC chat, used for the phone's", async () => {
    const mem = [{ email: "other@x.y", prefs: { nickname: "Nik" }, skills: [] }];
    const T = "22222222-2222-3333-4444-555555555555";
    // the computer's message: what it sent is used, and kept for the chat
    assert.deepEqual(await svc.computerMemoryFor({ clientApp: "desktop", computerMemory: mem }, { remoteChat: true, sessionId: T }), mem);
    await tick();
    assert.deepEqual(await svc.computerMemoryFor({ clientApp: "desktop", remoteFrom: "phone" }, { remoteChat: true, sessionId: T }), mem, "the phone's message gets the same");
    // a chat that is not a Remote PC chat keeps nothing
    const U = "33333333-2222-3333-4444-555555555555";
    assert.deepEqual(await svc.computerMemoryFor({ clientApp: "desktop", computerMemory: mem }, { remoteChat: false, sessionId: U }), mem);
    await tick();
    assert.equal(await redis.get(`remote:compmem:${U}`), null);
    // the computer sends none any more: none for the phone either
    assert.deepEqual(await svc.computerMemoryFor({ clientApp: "desktop" }, { remoteChat: true, sessionId: T }), []);
    await tick();
    assert.deepEqual(await svc.computerMemoryFor({ clientApp: "desktop", remoteFrom: "phone" }, { remoteChat: true, sessionId: T }), []);
    // the website never has it
    assert.deepEqual(await svc.computerMemoryFor({ clientApp: "web", computerMemory: mem }, { remoteChat: true, sessionId: T }), []);
});
