// Two Classgrid sessions working on the same file (owner, 2026-11-23: "if both are used at the same time, does one
// stop and message the other?"). The app refuses an edit of a file that was changed on disk after the AI last read
// it, and said only "the user or another program edited it": the AI read it again and edited on. The server now adds
// to that answer that another session may be the one, and to list the sessions and message it before editing again
// (services/local-runner.service.js withOtherSessionNote).
// Checked here:
//   - a refused edit's answer carries the note, on both ways a step reaches the app (the answer's own stream, the socket)
//   - every other answer is left as it is: a done edit, a failed edit of another kind, a read
//   - a helper's step gets no note (a helper has no session tools)
//   - the note is added once
// Nothing is sent anywhere: the socket and Redis are stand-ins.
// Run: node --experimental-test-module-mocks --test tests/other-session-note.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";

const REFUSED = "Error: src/app.js was changed on disk after you last read it (the user or another program edited it). Nothing was changed. Read it again first.";
let answer = REFUSED;
const sock = {
    timeout: () => ({ emitWithAck: async (_ev, payload) => ({ text: payload.tool === "ping" ? "ok" : answer }) }),
    disconnect() {},
};
const io = { local: { in: () => ({ fetchSockets: async () => [sock] }) }, in: () => ({ fetchSockets: async () => [sock] }) };
mock.module("../src/services/socket.service.js", { namedExports: { getIO: () => io } });
mock.module("../src/services/ide-project.service.js", { namedExports: { projectForChat: async () => null } });
// (the app's reply to a step sent down the answer's stream is read from Redis)
mock.module("../src/config/redis.js", { defaultExport: { get: async (k) => (String(k).startsWith("ai:pctool:res:") ? JSON.stringify({ text: answer }) : null), set: async () => "OK", del: async () => 1 } });

const runner = await import("../src/services/local-runner.service.js");
const { helperScope } = await import("../src/utils/step-scope.js");
const NOTE = runner.OTHER_SESSION_NOTE;

test("the note says what to do, in the tools' own names", () => {
    assert.ok(NOTE.startsWith("\n\nAnother Classgrid session on this computer may be the one that changed it."));
    assert.ok(NOTE.includes("call list_classgrid_sessions"));
    assert.ok(NOTE.includes("message it with message_classgrid_session"));
    assert.ok(NOTE.includes("If no other session is running, the person changed it: read it again and go on."));
});

test("a refused edit carries the note over the socket; other answers are left as they are", async () => {
    answer = REFUSED;
    const refused = await runner.callRunner("u1", "edit_project_file", { path: "src/app.js" }, "chat-1");
    assert.equal(refused.text, REFUSED + NOTE);
    for (const other of [
        "Edited src/app.js (+1 -0).",
        "Error in edit 1: old_text was not found. Nothing was changed.",
        "1: const a = 1;",
        "Error: src/app.js already exists, so it was not changed. Change it with edit_project_file, or replace the whole file with overwrite: true (after reading it).",
    ]) {
        answer = other;
        assert.equal((await runner.callRunner("u1", "edit_project_file", { path: "src/app.js" }, "chat-1")).text, other);
    }
});

test("the same over the answer's own stream, and a helper's step gets no note", async () => {
    answer = REFUSED;
    const sent = [];
    const off = runner.registerPcExecutor({ userId: "u1", sessionId: "chat-2", send: (ev) => { sent.push(ev); return true; }, alive: () => true });
    try {
        const main = await runner.callRunner("u1", "write_project_file", { path: "src/app.js" }, "chat-2");
        assert.equal(main.text, REFUSED + NOTE);
        assert.equal(sent.length, 1);
        const helper = await helperScope.run({ helper: 2 }, () => runner.callRunner("u1", "write_project_file", { path: "src/app.js" }, "chat-2"));
        assert.equal(helper.text, REFUSED);
    } finally { off(); }
    // (over the socket too)
    const helperSocket = await helperScope.run({ helper: 2 }, () => runner.callRunner("u1", "edit_project_file", { path: "src/app.js" }, "chat-9"));
    assert.equal(helperSocket.text, REFUSED);
});

test("the note is added once", async () => {
    answer = REFUSED + NOTE; // (an app that already carries it)
    const r = await runner.callRunner("u1", "edit_project_file", { path: "src/app.js" }, "chat-1");
    assert.equal(r.text, REFUSED + NOTE);
});
