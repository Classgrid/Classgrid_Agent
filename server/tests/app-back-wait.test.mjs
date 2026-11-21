// A step of an answer on a project folder of the person's computer waits for the desktop app when its connection is
// away for a moment (the server it was connected to restarted for a new version, or the internet dropped): owner,
// 2026-11-21, a helper's command failed with "the Classgrid desktop app isn't open there" 10 seconds after a new
// server version went live, with the app open. services/local-runner.service.js callLocal / askWhenAppIsBack.
// Checked here:
//   - the app connected: the step is sent at once
//   - the app's connection away, back a little later: the step waits and then goes through (it failed before)
//   - the app really closed: after the wait the step fails with the same words as before
//   - a button of the app or the website (no chat) does not wait
//   - the editor's state read before every answer does not wait
//   - an app that answered a moment ago and misses one quick check is busy, not dead: its connection is kept and the
//     step is sent to it (on 2026-11-21 the server cut the app's only connection that way while five helpers worked)
//   - a connection that has answered nothing for a long time and misses the check is dropped, as before
// The socket server, the projects and Redis are stand-ins: no app or server is contacted.
// Run: node --experimental-test-module-mocks --test tests/app-back-wait.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";

let connected = true;
let busy = false; // the app does not answer the quick check (it is in the middle of a step)
let dropped = 0;
const sent = [];
const sock = {
    data: {},
    handshake: { issued: Date.now() },
    timeout: () => ({ emitWithAck: async (_ev, payload) => {
        if (busy && payload.tool === "ping") throw new Error("operation has timed out");
        sent.push(payload.tool);
        return { text: payload.tool === "ping" ? "ok" : "done" };
    } }),
    disconnect() { dropped++; },
};
const room = { fetchSockets: async () => (connected ? [sock] : []) };
const io = { local: { in: () => room }, in: () => room };
mock.module("../src/services/socket.service.js", { namedExports: { getIO: () => io } });
mock.module("../src/services/ide-project.service.js", { namedExports: { projectForChat: async () => null } });
mock.module("../src/config/redis.js", { defaultExport: { get: async () => null, set: async () => "OK", del: async () => 1 } });

const runner = await import("../src/services/local-runner.service.js");
const PROJECT = { owner: "u1", _id: "p1", localPath: "C:\\work" };
const CHAT = "11111111-2222-3333-4444-555555555555";
const NOT_OPEN = /isn't open there/;
const fresh = (isConnected) => { connected = isConnected; busy = false; dropped = 0; sent.length = 0; sock.data = {}; sock.handshake = { issued: Date.now() }; runner.APP_BACK_WAIT.forMs = 400; runner.APP_BACK_WAIT.everyMs = 20; };

test("the app connected: the step is sent at once", async () => {
    fresh(true);
    const started = Date.now();
    assert.equal(await runner.callLocal(PROJECT, "execute_terminal_command", { command: "dir" }, CHAT), "done");
    assert.ok(Date.now() - started < 200);
});

test("the connection away and back a little later: the step waits, then goes through", async () => {
    fresh(false);
    setTimeout(() => { connected = true; }, 120); // the app connects again by itself
    const out = await runner.callLocal(PROJECT, "execute_terminal_command", { command: "dir" }, CHAT);
    assert.equal(out, "done"); // ("Error: ... isn't open there" before 2026-11-21)
    assert.ok(sent.includes("execute_terminal_command"));
});

test("the app really closed: the step fails after the wait, in the same words", async () => {
    fresh(false);
    const started = Date.now();
    const out = await runner.callLocal(PROJECT, "execute_terminal_command", { command: "dir" }, CHAT);
    assert.match(out, NOT_OPEN);
    assert.ok(Date.now() - started >= 380, "it waited for the app first");
    assert.equal(sent.length, 0);
});

test("a button of the app or the website (no chat) does not wait", async () => {
    fresh(false);
    const started = Date.now();
    assert.match(await runner.callLocal(PROJECT, "sync_repo", { mode: "pull" }), NOT_OPEN);
    assert.ok(Date.now() - started < 200);
});

test("the editor's state read before every answer does not wait", async () => {
    fresh(false);
    const started = Date.now();
    assert.match(await runner.callLocal(PROJECT, "editor_context", {}, CHAT), NOT_OPEN);
    assert.ok(Date.now() - started < 200);
});

test("an app that answered a moment ago and misses one quick check is kept and asked", async () => {
    fresh(true);
    assert.equal(await runner.callLocal(PROJECT, "search_project", { query: "x" }, CHAT), "done"); // it answers: noted
    busy = true; // now in the middle of a step: the quick check gets no answer
    assert.equal(await runner.callLocal(PROJECT, "execute_terminal_command", { command: "dir" }, CHAT), "done");
    assert.equal(dropped, 0, "its connection was not cut");
});

test("a connection that answered nothing for a long time and misses the check is dropped", async () => {
    fresh(true);
    sock.handshake = { issued: Date.now() - runner.BUSY_GRACE_MS - 1000 };
    busy = true;
    assert.match(await runner.callLocal(PROJECT, "sync_repo", { mode: "pull" }), NOT_OPEN);
    assert.equal(dropped, 1);
});
