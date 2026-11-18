// The desktop app driving the AI's loop (services/local-loop.service.js) and an answer that is stopped while a round
// waits for the app (found during the owner's Remote PC work, 2026-11-18). After each model round the server hands the
// app the tool calls (`round_end`) and waits for run/skip/round_done/stop; an app that stays silent for 15 minutes has
// the round run by the server. A desktop answer whose app disappears is stopped by the durable turn after 4 minutes
// (durable-turn.service.js), and a newer message in the chat stops the older answer; both only aborted the answer's
// signal, which the round's wait did not watch: the answer hung until the 15-minute timer, and then the server ran the
// steps the app never asked for (through the runner socket, on the user's PC, after the user saw the answer stop).
// Checked here:
//   - a stop from the answer's signal ends the round's wait at once; its steps never run, not even after 15 minutes;
//     the app's late commands are refused and no later round starts
//   - the app's own Stop command does the same (and stops the answer)
//   - a run the app had queued but that had not started when the answer stopped never starts
//   - a live app drives a round as before (run, skip, round_done), and an attached app that stays silent still has its
//     round run by the server after 15 minutes
//   - end to end, in both model loops (Cloudflare: llm-stream.js streamChat; Claude: llm-stream-anthropic.js
//     streamClaudeChat): a stop while a round waits for the app ends the answer at once and the terminal step never
//     runs; without the app driving the loop, a stop during one step keeps the round's next steps from starting
// Cloudflare and Claude are stand-ins here: nothing is sent anywhere, no server, no database.
// Run: node --experimental-test-module-mocks --test tests/local-loop-stop.test.mjs
import test, { mock, afterEach } from "node:test";
import assert from "node:assert/strict";

process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "test-key-not-used";

// ── Cloudflare stand-in: one scripted streamed round per request ──
let cfScript = [];
mock.module("../src/services/cf-neuron-cap.service.js", {
    namedExports: {
        isCfNeuronCapError: () => false,
        cfAiFetch: async () => {
            const next = cfScript.shift();
            if (!next) throw new Error("no scripted Cloudflare round left");
            const text = next.map((c) => `data: ${JSON.stringify(c)}\n\n`).join("") + "data: [DONE]\n\n";
            return new Response(text, { status: 200, headers: { "content-type": "text/event-stream" } });
        },
    },
});

// ── Claude stand-in: the SDK's stream, one scripted message per round ──
let claudeScript = [];
class FakeAnthropic {
    constructor() {
        this.beta = {
            messages: {
                stream: (params, opts = {}) => {
                    const msg = claudeScript.shift();
                    if (!msg) throw new Error("no scripted Claude round left");
                    return {
                        abort() {},
                        async *[Symbol.asyncIterator]() {
                            if (opts.signal?.aborted) throw new Error("Request was aborted.");
                            yield { type: "message_start", message: { usage: { input_tokens: 10, output_tokens: 0 } } };
                            for (const b of msg.content) if (b.type === "text") yield { type: "content_block_delta", delta: { type: "text_delta", text: b.text } };
                            yield { type: "message_delta", usage: { output_tokens: 5 } };
                        },
                        async finalMessage() { return { ...msg, model: params.model, usage: { input_tokens: 10, output_tokens: 5 } }; },
                    };
                },
            },
        };
    }
}
FakeAnthropic.APIError = class extends Error {};
FakeAnthropic.RateLimitError = class extends FakeAnthropic.APIError {};
mock.module("@anthropic-ai/sdk", { defaultExport: FakeAnthropic });

const { makeLocalLoopDriver, handleTurnCommand } = await import("../src/services/local-loop.service.js");
const { streamChat } = await import("../src/services/llm-stream.js");
const { streamClaudeChat } = await import("../src/services/llm-stream-anthropic.js");

const FIFTEEN_MIN = 15 * 60 * 1000;
const T = { timeout: 15000 }; // (a hanging answer fails its test instead of holding the run)
afterEach(() => { mock.timers.reset(); cfScript = []; claudeScript = []; });

// (setImmediate is not mocked: it lets promises, streams and the loops move on)
const flush = () => new Promise((r) => setImmediate(r));
async function until(cond, turns = 400) { for (let i = 0; i < turns && !cond(); i++) await flush(); return cond(); }
const watch = (p) => { const s = { done: false, value: undefined, error: undefined }; p.then((v) => { s.done = true; s.value = v; }, (e) => { s.done = true; s.error = e; }); return s; };
let turnNo = 0;
// One answer's driver as streamAskAi makes it: the answer's own stop signal, its stream, and its Stop
function answer() {
    const turnId = `turn${++turnNo}`;
    const stopAll = new AbortController(); // streamAbort in streamAskAi
    const events = [];
    let stoppedByApp = 0;
    const loop = makeLocalLoopDriver({
        turnId, userId: "u1",
        emit: (ev) => events.push(ev),
        onStop: () => { stoppedByApp++; stopAll.abort(); },
        signal: stopAll.signal,
    });
    return { turnId, stopAll, events, loop, stoppedByApp: () => stoppedByApp };
}
const calls = [{ id: "a", name: "computer_terminal", input: { command: "del important.txt" } }, { id: "b", name: "computer_terminal", input: { command: "echo hi" } }];

test("stopped by the answer's signal (durable turn timeout, newer message): the wait ends at once and the round never runs", T, async () => {
    mock.timers.enable({ apis: ["setTimeout"] });
    const { turnId, stopAll, events, loop } = answer();
    const ran = [];
    const round = watch(loop.driver(calls, { run: async (id) => { ran.push(id); return { content: "ran", isError: false }; }, text: "Deleting it." }));
    await flush();
    assert.equal(events[0]?.type, "round_end");
    stopAll.abort(); // durableTurn.onAbort / the newer message: streamAbort.abort()
    assert.ok(await until(() => round.done), "the round's wait ends at once");
    assert.equal(round.error, undefined);
    assert.ok([...round.value.values()].every((o) => o.isError && /^Not run/.test(o.content)), "every call comes back as not run");
    mock.timers.tick(FIFTEEN_MIN + 1000);
    await until(() => false, 50);
    assert.deepEqual(ran, [], "nothing runs after 15 minutes either");
    assert.deepEqual(await handleTurnCommand(turnId, "u1", { type: "run", roundId: events[0].roundId, id: "a" }), { error: "unknown_round" });
    await assert.rejects(loop.driver(calls, { run: async () => ({ content: "", isError: false }) }), /Request aborted/);
    loop.dispose();
});

test("a signal already stopped: the driver refuses the round and tells the app nothing", T, async () => {
    const { stopAll, events, loop } = answer();
    stopAll.abort();
    await assert.rejects(loop.driver(calls, { run: async () => { throw new Error("must not run"); } }), /Request aborted/);
    assert.equal(events.length, 0);
    loop.dispose();
});

test("the app's Stop command: the round ends at once, never runs, and the answer is stopped", T, async () => {
    mock.timers.enable({ apis: ["setTimeout"] });
    const { turnId, stopAll, loop, stoppedByApp } = answer();
    const ran = [];
    const round = watch(loop.driver(calls, { run: async (id) => { ran.push(id); return { content: "ran", isError: false }; } }));
    await flush();
    assert.deepEqual(await handleTurnCommand(turnId, "u1", { type: "stop" }), { ok: true });
    assert.ok(await until(() => round.done));
    assert.equal(stoppedByApp(), 1);
    assert.ok(stopAll.signal.aborted);
    mock.timers.tick(FIFTEEN_MIN + 1000);
    await until(() => false, 50);
    assert.deepEqual(ran, []);
    loop.dispose();
});

test("a run the app queued that had not started when the answer stopped never starts; the round does not wait for the step in progress", T, async () => {
    const { turnId, stopAll, events, loop } = answer();
    const ran = [];
    let release;
    const slow = new Promise((r) => { release = r; });
    const round = watch(loop.driver(calls, { run: async (id) => { ran.push(id); if (id === "a") await slow; return { content: `ran ${id}`, isError: false }; } }));
    await flush();
    const roundId = events[0].roundId;
    assert.deepEqual(await handleTurnCommand(turnId, "u1", { type: "run", roundId, id: "a" }), { ok: true });
    assert.deepEqual(await handleTurnCommand(turnId, "u1", { type: "run", roundId, id: "b" }), { ok: true });
    await until(() => ran.length === 1);
    assert.deepEqual(ran, ["a"], "a is running on the PC, b waits its turn");
    stopAll.abort();
    assert.ok(await until(() => round.done), "the round ends without waiting for a");
    release();
    await until(() => false, 50);
    assert.deepEqual(ran, ["a"], "b never starts");
    loop.dispose();
});

test("a live app drives the round as before: run, skip, round_done", T, async () => {
    const { turnId, events, loop } = answer();
    const ran = [];
    const round = watch(loop.driver(calls, { run: async (id) => { ran.push(id); return { content: `ran ${id}`, isError: false }; }, text: "Two steps." }));
    await flush();
    const ev = events[0];
    assert.equal(ev.type, "round_end");
    assert.deepEqual(ev.calls.map((c) => c.id), ["a", "b"]);
    assert.equal(ev.text, "Two steps.");
    assert.deepEqual(await handleTurnCommand(turnId, "u1", { type: "run", roundId: ev.roundId, id: "a" }), { ok: true });
    assert.deepEqual(await handleTurnCommand(turnId, "u1", { type: "skip", roundId: ev.roundId, id: "b", reason: "the user said no" }), { ok: true });
    assert.deepEqual(await handleTurnCommand(turnId, "u2", { type: "round_done", roundId: ev.roundId }), { error: "unknown_turn" }, "another user can't drive it");
    assert.deepEqual(await handleTurnCommand(turnId, "u1", { type: "round_done", roundId: ev.roundId }), { ok: true });
    assert.ok(await until(() => round.done));
    assert.deepEqual(ran, ["a"]);
    assert.deepEqual(round.value.get("a"), { content: "ran a", isError: false });
    assert.deepEqual(round.value.get("b"), { content: "Not run: the user said no", isError: true });
    assert.deepEqual(events.filter((e) => e.type === "tool_done").map((e) => [e.id, e.isError, !!e.skipped]), [["b", true, true], ["a", false, false]]);
    loop.dispose();
});

test("an attached app that stays silent: after 15 minutes the server runs the round itself (the fallback stays)", T, async () => {
    mock.timers.enable({ apis: ["setTimeout"] });
    const { loop } = answer();
    const ran = [];
    const round = watch(loop.driver(calls, { run: async (id) => { ran.push(id); return { content: `ran ${id}`, isError: false }; } }));
    await until(() => false, 20);
    assert.equal(round.done, false, "it waits for the app");
    mock.timers.tick(FIFTEEN_MIN);
    assert.ok(await until(() => round.done));
    assert.deepEqual(ran, ["a", "b"]);
    loop.dispose();
});

// ── End to end, in the model loops ──
const termTool = [{ type: "function", function: { name: "computer_terminal", description: "Run a command on the user's computer", parameters: { type: "object", properties: { command: { type: "string" } }, required: ["command"] } } }];
const cfProvider = { name: "cloudflare", url: "https://api.cloudflare.com/client/v4/accounts/acc/ai/v1/chat/completions", apiKey: "k", model: "@cf/zai-org/glm-5.3" };
const cfMessages = [{ role: "system", content: "You are the assistant." }, { role: "user", content: "Clean my desktop." }];
const cfToolRound = (ids = ["call_a"]) => [
    { choices: [{ delta: { content: "Cleaning up. ", tool_calls: ids.map((id, index) => ({ index, id, function: { name: "computer_terminal", arguments: JSON.stringify({ command: `del ${id}.txt` }) } })) } }], usage: { prompt_tokens: 100, completion_tokens: 5, total_tokens: 105 } },
    { choices: [{ delta: {}, finish_reason: "tool_calls" }], usage: { prompt_tokens: 100, completion_tokens: 10, total_tokens: 110 } },
];
const cfAnswerRound = [{ choices: [{ delta: { content: "All done." }, finish_reason: "stop" }], usage: { prompt_tokens: 120, completion_tokens: 3, total_tokens: 123 } }];
const claudeToolRound = (ids = ["toolu_a"]) => ({ content: [{ type: "text", text: "Cleaning up. " }, ...ids.map((id) => ({ type: "tool_use", id, name: "computer_terminal", input: { command: `del ${id}.txt` } }))], stop_reason: "tool_use" });
const claudeAnswerRound = { content: [{ type: "text", text: "All done." }], stop_reason: "end_turn" };

const loops = {
    "Cloudflare (streamChat)": {
        script: (rounds) => { cfScript = rounds.map((r) => (r === "tool" ? cfToolRound() : r === "tool2" ? cfToolRound(["call_a", "call_b"]) : cfAnswerRound)); },
        run: (args) => streamChat({ provider: cfProvider, messages: cfMessages, tools: termTool, maxTokens: 1000, thinking: "none", ...args }),
    },
    "Claude (streamClaudeChat)": {
        script: (rounds) => { claudeScript = rounds.map((r) => (r === "tool" ? claudeToolRound() : r === "tool2" ? claudeToolRound(["toolu_a", "toolu_b"]) : claudeAnswerRound)); },
        run: (args) => streamClaudeChat({ model: "claude-sonnet-5-5", messages: cfMessages, tools: termTool, loadedToolNames: new Set(["computer_terminal"]), maxTokens: 1000, ...args }),
    },
};

for (const [name, L] of Object.entries(loops)) {
    test(`${name}: stopped while a round waits for the app, the answer ends at once and the step never reaches the PC`, T, async () => {
        mock.timers.enable({ apis: ["setTimeout"] });
        const { turnId, stopAll, events, loop } = answer();
        const onPc = [];
        L.script(["tool", "answer"]);
        const result = watch(L.run({ toolHandlers: { computer_terminal: async (a) => { onPc.push(a.command); return "deleted"; } }, signal: stopAll.signal, toolDriver: loop.driver }));
        assert.ok(await until(() => events.some((e) => e.type === "round_end")), "the round goes to the app");
        stopAll.abort(); // the durable turn's 4 minutes ran out (or a newer message replaced the answer)
        assert.ok(await until(() => result.done), "the answer ends at once");
        assert.match(String(result.error?.message), /Request aborted/);
        mock.timers.tick(FIFTEEN_MIN + 1000);
        await until(() => false, 50);
        assert.deepEqual(onPc, [], "nothing ran on the PC");
        assert.deepEqual(await handleTurnCommand(turnId, "u1", { type: "run", roundId: events.find((e) => e.type === "round_end").roundId, id: "x" }), { error: "unknown_round" });
        loop.dispose();
    });

    test(`${name}: a live app drives the round and the answer goes on`, T, async () => {
        const { turnId, events, loop } = answer();
        const onPc = [];
        L.script(["tool", "answer"]);
        const result = watch(L.run({ toolHandlers: { computer_terminal: async (a) => { onPc.push(a.command); return "deleted"; } }, signal: new AbortController().signal, toolDriver: loop.driver }));
        assert.ok(await until(() => events.some((e) => e.type === "round_end")));
        const ev = events.find((e) => e.type === "round_end");
        assert.equal(ev.calls.length, 1);
        assert.deepEqual(await handleTurnCommand(turnId, "u1", { type: "run", roundId: ev.roundId, id: ev.calls[0].id }), { ok: true });
        await until(() => events.some((e) => e.type === "tool_done"));
        assert.deepEqual(await handleTurnCommand(turnId, "u1", { type: "round_done", roundId: ev.roundId }), { ok: true });
        assert.ok(await until(() => result.done));
        assert.equal(result.error, undefined, String(result.error?.stack));
        assert.equal(result.value.answer, "All done.");
        assert.equal(onPc.length, 1);
        loop.dispose();
    });

    test(`${name}: without the app driving, a stop during one step keeps the round's next steps from starting`, T, async () => {
        const stop = new AbortController();
        const onPc = [];
        L.script(["tool2", "answer"]);
        const result = watch(L.run({
            toolHandlers: { computer_terminal: async (a) => { onPc.push(a.command); stop.abort(); return "done"; } }, // the user presses Stop while the first step runs
            signal: stop.signal,
        }));
        assert.ok(await until(() => result.done));
        assert.match(String(result.error?.message), /Request aborted/);
        assert.equal(onPc.length, 1, "only the step that was already running");
    });
}
