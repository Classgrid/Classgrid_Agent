// A message sent from the phone into a Remote PC chat (owner, 2026-11-18): its steps on the computer go over the
// runner socket and carry the answer's checkpoint, so the app keeps the before-copies for Review and Undo.
// services/local-runner.service.js setSocketCheckpoint. Run: node --experimental-test-module-mocks --test tests/socket-checkpoint.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";

const S = "11111111-2222-3333-4444-555555555555";
const sent = [];
const sock = {
    timeout: () => ({ emitWithAck: async (ev, payload) => { sent.push(payload); return { text: payload.tool === "ping" ? "ok" : "Edited a.js (+1 -0)." }; } }),
    disconnect() {},
};
const io = { local: { in: () => ({ fetchSockets: async () => [sock] }) }, in: () => ({ fetchSockets: async () => [sock] }) };
mock.module("../src/services/socket.service.js", { namedExports: { getIO: () => io } });
mock.module("../src/services/ide-project.service.js", { namedExports: { projectForChat: async () => null } });
mock.module("../src/config/redis.js", { defaultExport: { get: async () => null, set: async () => "OK", del: async () => 1 } });

const runner = await import("../src/services/local-runner.service.js");

test("a phone message's steps carry its checkpoint until its answer ends", async () => {
    const done = runner.setSocketCheckpoint(S, "1700000000001");
    assert.equal(runner.socketCheckpointFor(S), "1700000000001");
    await runner.callRunner("u1", "edit_project_file", { path: "a.js" }, S);
    assert.equal(sent.find((p) => p.tool === "edit_project_file").checkpoint, "1700000000001");
    // another chat's steps don't
    sent.length = 0;
    await runner.callRunner("u1", "edit_project_file", { path: "a.js" }, "other");
    assert.equal(sent.find((p) => p.tool === "edit_project_file").checkpoint, undefined);
    // a newer answer's checkpoint is not taken away by the older one ending
    runner.setSocketCheckpoint(S, "1700000000002");
    done();
    assert.equal(runner.socketCheckpointFor(S), "1700000000002");
});
