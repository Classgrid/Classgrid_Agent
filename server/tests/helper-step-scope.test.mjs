// A helper's step on the user's computer is marked `helper: true` when it is sent to the app, and the main answer's
// own steps are not (utils/step-scope.js). The app hands unread messages from other Classgrid sessions to the chat's
// AI after a step of the main answer only; in desktop 1.0.48 it did so after every step, so a message could end in a
// helper's step, marked read, and the chat's AI never saw it.
// Checked here:
//   - the mark is there for everything under helperScope.run, however deep, and nowhere else
//   - a helper's round the app drives (the run comes from the app's HTTP command, outside the helper's own chain) is
//     marked; the main answer's round is not; a helper's round the server finishes itself is marked too
//   - the step as it goes to the app (pc_tool_call) carries helper: true for a helper, and no such field for the main answer
// Nothing is sent anywhere: the socket, Redis and the model loop are stand-ins.
// Run: node --experimental-test-module-mocks --test tests/helper-step-scope.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";

mock.module("../src/services/llm-stream.js", { namedExports: { StreamChatError: class StreamChatError extends Error {} } });
mock.module("../src/services/socket.service.js", { namedExports: { getIO: () => ({ local: { in: () => ({ fetchSockets: async () => [] }) }, in: () => ({ fetchSockets: async () => [] }) }) } });
mock.module("../src/services/ide-project.service.js", { namedExports: { projectForChat: async () => null } });
// (the app's reply to a pc_tool_call is read from Redis: every step is answered at once here)
mock.module("../src/config/redis.js", { defaultExport: { get: async (k) => (String(k).startsWith("ai:pctool:res:") ? JSON.stringify({ text: "done" }) : null), set: async () => "OK", del: async () => 1 } });

const { helperScope, inHelper } = await import("../src/utils/step-scope.js");
const { makeLocalLoopDriver, handleTurnCommand } = await import("../src/services/local-loop.service.js");
const runner = await import("../src/services/local-runner.service.js");

const tick = () => new Promise((r) => setTimeout(r, 5));
async function until(fn, ms = 2000) {
    const end = Date.now() + ms;
    while (Date.now() < end) { if (fn()) return; await tick(); }
    throw new Error("timed out waiting");
}

test("the mark is there under helperScope.run, however deep, and nowhere else", async () => {
    assert.equal(inHelper(), false);
    const deep = async () => { await tick(); await Promise.all([tick(), tick()]); return inHelper(); };
    assert.equal(await helperScope.run({ helper: 2 }, deep), true);
    assert.equal(await deep(), false);
    // two helpers at once keep their own
    const which = async () => { await tick(); return helperScope.getStore()?.helper; };
    assert.deepEqual(await Promise.all([helperScope.run({ helper: 1 }, which), helperScope.run({ helper: 5 }, which), which()]), [1, 5, undefined]);
});

test("a round the app drives: a helper's step is marked, the main answer's is not", async () => {
    const events = [];
    const { driver, driverFor, dispose } = makeLocalLoopDriver({ turnId: "turn-a", userId: "u1", emit: (e) => events.push(e), onStop() {} });
    const seen = [];
    const run = (who) => async () => { await tick(); seen.push([who, inHelper(), helperScope.getStore()?.helper]); return { content: "ok", isError: false }; };

    // the main answer's round
    const main = driver([{ id: "m1", name: "search_project", input: {} }], { run: run("main"), text: "" });
    await until(() => events.some((e) => e.type === "round_end" && !("helper" in e)));
    const mainRound = events.find((e) => e.type === "round_end" && !("helper" in e)).roundId;
    // helper 3's round, started inside its own chain (as runHelper is)
    const helper = helperScope.run({ helper: 3 }, () => driverFor(3)([{ id: "h1", name: "search_project", input: {} }], { run: run("helper"), text: "" }));
    await until(() => events.some((e) => e.type === "round_end" && e.helper === 3));
    const helperRound = events.find((e) => e.type === "round_end" && e.helper === 3).roundId;

    // the app's commands arrive from plain HTTP requests: no mark around them
    assert.equal(inHelper(), false);
    assert.deepEqual(await handleTurnCommand("turn-a", "u1", { type: "run", roundId: helperRound, id: "h1" }), { ok: true });
    assert.deepEqual(await handleTurnCommand("turn-a", "u1", { type: "run", roundId: mainRound, id: "m1" }), { ok: true });
    await until(() => events.filter((e) => e.type === "tool_done").length === 2);
    await handleTurnCommand("turn-a", "u1", { type: "round_done", roundId: helperRound });
    await handleTurnCommand("turn-a", "u1", { type: "round_done", roundId: mainRound });
    await Promise.all([main, helper]);
    dispose();

    assert.deepEqual(seen.find((s) => s[0] === "helper"), ["helper", true, 3]);
    assert.deepEqual(seen.find((s) => s[0] === "main"), ["main", false, undefined]);
});

test("a helper's round the server finishes itself (the answer ended) is marked too", async () => {
    const events = [];
    const { driverFor, dispose } = makeLocalLoopDriver({ turnId: "turn-b", userId: "u1", emit: (e) => events.push(e), onStop() {} });
    let saw = null;
    const round = helperScope.run({ helper: 4 }, () => driverFor(4)([{ id: "h1", name: "search_project", input: {} }], { run: async () => { await tick(); saw = [inHelper(), helperScope.getStore()?.helper]; return { content: "ok", isError: false }; }, text: "" }));
    await until(() => events.some((e) => e.type === "round_end"));
    dispose(); // called from the answer's own end, outside the helper's chain
    await round;
    assert.deepEqual(saw, [true, 4]);
});

test("the step sent to the app says whose it is", async () => {
    const sent = [];
    const off = runner.registerPcExecutor({ userId: "u1", sessionId: "chat-1", send: (ev) => { sent.push(ev); return true; }, alive: () => true });
    try {
        const fromHelper = await helperScope.run({ helper: 1 }, () => runner.callRunner("u1", "search_project", { query: "x" }, "chat-1"));
        const fromMain = await runner.callRunner("u1", "search_project", { query: "x" }, "chat-1");
        assert.equal(fromHelper.text, "done");
        assert.equal(fromMain.text, "done");
        assert.equal(sent.length, 2);
        assert.equal(sent[0].type, "pc_tool_call");
        assert.equal(sent[0].helper, true);
        assert.equal("helper" in sent[1], false);
        assert.equal(sent[1].chat, "chat-1");
    } finally { off(); }
});
