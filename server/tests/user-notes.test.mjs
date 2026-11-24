// A message the person sends while the AI is still working goes to the AI with its next round of tools (owner,
// 2026-11-24, "Send immediately": "while it is working I send a message and it takes it in and goes on"; ours queued
// each message and answered them one by one after the answer had ended).
// Checked here:
//   1. utils/user-notes.js: a message is taken once, however often the app posts it; what the model reads
//   2. services/local-loop.service.js: the app's "say" command reaches the running answer, and is refused once the
//      answer has stopped or ended, or for another person's answer (the app then sends it as the next message)
//   3. both model loops (Cloudflare: llm-stream.js streamChat; Claude: llm-stream-anthropic.js streamClaudeChat):
//      what was said goes to the model right after the tools' results of the round it came in, once, and the answer
//      goes on; nothing is taken when the answer has no round of tools, or when a tool just ended the answer
// Cloudflare and Claude are stand-ins here: nothing is sent anywhere, no server, no database.
// Run: node --experimental-test-module-mocks --test tests/user-notes.test.mjs
import test, { mock, afterEach } from "node:test";
import assert from "node:assert/strict";

process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "test-key-not-used";

let cfScript = [];
const cfSent = [];
mock.module("../src/services/cf-neuron-cap.service.js", {
    namedExports: {
        isCfNeuronCapError: () => false,
        cfAiFetch: async (url, init) => {
            const next = cfScript.shift();
            if (!next) throw new Error("no scripted Cloudflare round left");
            cfSent.push(JSON.parse(init.body));
            const text = next.map((c) => `data: ${JSON.stringify(c)}\n\n`).join("") + "data: [DONE]\n\n";
            return new Response(text, { status: 200, headers: { "content-type": "text/event-stream" } });
        },
    },
});

let claudeScript = [];
const claudeSent = [];
class FakeAnthropic {
    constructor() {
        this.beta = {
            messages: {
                stream: (params, opts = {}) => {
                    const msg = claudeScript.shift();
                    if (!msg) throw new Error("no scripted Claude round left");
                    claudeSent.push(JSON.parse(JSON.stringify(params.messages)));
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

const { makeUserNotes, userNotesText, answerWithUserNotes, USER_NOTE_MAX } = await import("../src/utils/user-notes.js");
const { makeLocalLoopDriver, handleTurnCommand } = await import("../src/services/local-loop.service.js");
const { streamChat } = await import("../src/services/llm-stream.js");
const { streamClaudeChat } = await import("../src/services/llm-stream-anthropic.js");

const T = { timeout: 15000 };
afterEach(() => { cfScript = []; claudeScript = []; cfSent.length = 0; claudeSent.length = 0; });

// ── 1. The messages that wait ──

test("a message is taken once, however often the app posts it, and handed over once", () => {
    const notes = makeUserNotes();
    assert.equal(notes.take(), null);
    assert.equal(notes.add({ id: "m1", text: "  use port 5000, not 3000  " }), true);
    assert.equal(notes.add({ id: "m1", text: "use port 5000, not 3000" }), true, "the same message again: said to be taken");
    assert.equal(notes.waiting(), 1, "and not taken twice");
    const got = notes.take();
    assert.deepEqual(got.notes, [{ id: "m1", text: "use port 5000, not 3000" }]);
    assert.match(got.text, /^\[The user sent this message while you were working\. It is part of the same task: read it now and take it into account in what you do next\. Go on with the work; do not start it again/);
    assert.ok(got.text.endsWith("\n\nuse port 5000, not 3000"));
    assert.equal(notes.take(), null, "handed over once");
    // (posted again after it was read: still not a second time)
    assert.equal(notes.add({ id: "m1", text: "use port 5000, not 3000" }), true);
    assert.equal(notes.take(), null);
    // nothing to take: no id, no words
    assert.equal(notes.add({ id: "", text: "x" }), false);
    assert.equal(notes.add({ id: "m2", text: "   " }), false);
    assert.equal(notes.add(null), false);
    // a very long one is cut, never refused
    notes.add({ id: "m3", text: "y".repeat(USER_NOTE_MAX + 500) });
    assert.equal(notes.take().notes[0].text.length, USER_NOTE_MAX);
});

test("several messages go together, in the order they were sent", () => {
    const notes = makeUserNotes();
    notes.add({ id: "a", text: "also check the login page" });
    notes.add({ id: "b", text: "and do not touch the database" });
    const got = notes.take();
    assert.deepEqual(got.notes.map((n) => n.id), ["a", "b"]);
    assert.match(got.text, /^\[The user sent these 2 messages while you were working\. They are part of the same task: read them now/);
    assert.ok(got.text.endsWith("Message 1:\nalso check the login page\n\nMessage 2:\nand do not touch the database"));
    assert.equal(userNotesText([]), "");
});

test("in later turns the AI still knows what the person wrote in the middle of an answer", () => {
    const saved = { classgrid_ai_message: true, content: "Done: the server listens on port 5000.", steps: [
        { id: "1", type: "tool", tool: "execute_terminal_command", args: { command: "npm start" }, result: "ok", status: "success" },
        { id: "said-m1", type: "tool", tool: "user_message", args: { message: "use port 5000, not 3000", thoughtAt: 12 }, result: "Read.", status: "success" },
    ] };
    assert.equal(answerWithUserNotes(saved), '[While you were working on this answer the user also wrote: "use port 5000, not 3000"]\n\nDone: the server listens on port 5000.');
    // an answer with no such message is its own text, as before
    assert.equal(answerWithUserNotes({ content: "Hello.", steps: [saved.steps[0]] }), "Hello.");
    assert.equal(answerWithUserNotes({ content: "Hello." }), "Hello.");
    assert.equal(answerWithUserNotes(null), "");
});

// ── 2. The app's command ──

let turnNo = 0;
function answer(withSay = true) {
    const turnId = `say-turn${++turnNo}`;
    const stopAll = new AbortController();
    const notes = makeUserNotes();
    const loop = makeLocalLoopDriver({ turnId, userId: "u1", emit: () => {}, onStop: () => stopAll.abort(), ...(withSay ? { onSay: (n) => notes.add(n) } : {}), signal: stopAll.signal });
    return { turnId, stopAll, notes, loop };
}

test("the app's 'say' reaches the running answer; it is refused once the answer stopped or ended", async () => {
    const a = answer();
    assert.deepEqual(await handleTurnCommand(a.turnId, "u1", { type: "say", id: "m1", text: "stop, use the other file" }), { ok: true });
    assert.equal(a.notes.waiting(), 1);
    // (needs no round: it can come at any moment of the answer)
    assert.deepEqual(await handleTurnCommand(a.turnId, "u1", { type: "say", id: "m1", text: "stop, use the other file" }), { ok: true });
    assert.equal(a.notes.waiting(), 1);
    // empty words: not taken
    assert.deepEqual(await handleTurnCommand(a.turnId, "u1", { type: "say", id: "m2", text: "" }), { error: "not_taken" });
    // another person's answer is never reached
    assert.deepEqual(await handleTurnCommand(a.turnId, "someone-else", { type: "say", id: "m3", text: "hi" }), { error: "unknown_turn" });
    // stopped (any way): not taken
    a.stopAll.abort();
    assert.deepEqual(await handleTurnCommand(a.turnId, "u1", { type: "say", id: "m4", text: "too late" }), { error: "not_taken" });
    a.loop.dispose();
    // ended: the answer is gone
    assert.deepEqual(await handleTurnCommand(a.turnId, "u1", { type: "say", id: "m5", text: "too late" }), { error: "unknown_turn" });
    // an answer that takes no messages (no onSay)
    const b = answer(false);
    assert.deepEqual(await handleTurnCommand(b.turnId, "u1", { type: "say", id: "m1", text: "hi" }), { error: "not_taken" });
    b.loop.dispose();
    // the app's Stop command: nothing is taken after it
    const c = answer();
    await handleTurnCommand(c.turnId, "u1", { type: "stop" });
    assert.deepEqual(await handleTurnCommand(c.turnId, "u1", { type: "say", id: "m1", text: "hi" }), { error: "not_taken" });
    c.loop.dispose();
});

// ── 3. The model loops ──

const termTool = [{ type: "function", function: { name: "computer_terminal", description: "Run a command on the user's computer", parameters: { type: "object", properties: { command: { type: "string" } }, required: ["command"] } } }];
const cfProvider = { name: "cloudflare", url: "https://api.cloudflare.com/client/v4/accounts/acc/ai/v1/chat/completions", apiKey: "k", model: "@cf/zai-org/glm-5.3" };
const messages = [{ role: "system", content: "You are the assistant." }, { role: "user", content: "Clean my desktop." }];
const cfToolRound = (id) => [
    { choices: [{ delta: { content: "Cleaning up. ", tool_calls: [{ index: 0, id, function: { name: "computer_terminal", arguments: JSON.stringify({ command: `del ${id}.txt` }) } }] } }], usage: { prompt_tokens: 100, completion_tokens: 5, total_tokens: 105 } },
    { choices: [{ delta: {}, finish_reason: "tool_calls" }], usage: { prompt_tokens: 100, completion_tokens: 10, total_tokens: 110 } },
];
const cfAnswerRound = [{ choices: [{ delta: { content: "All done." }, finish_reason: "stop" }], usage: { prompt_tokens: 120, completion_tokens: 3, total_tokens: 123 } }];
const claudeToolRound = (id) => ({ content: [{ type: "text", text: "Cleaning up. " }, { type: "tool_use", id, name: "computer_terminal", input: { command: `del ${id}.txt` } }], stop_reason: "tool_use" });
const claudeAnswerRound = { content: [{ type: "text", text: "All done." }], stop_reason: "end_turn" };

const loops = {
    "Cloudflare (streamChat)": {
        script: (rounds) => { cfScript = rounds.map((r, i) => (r === "tool" ? cfToolRound(`call_${i}`) : cfAnswerRound)); },
        run: (args) => streamChat({ provider: cfProvider, messages, tools: termTool, maxTokens: 1000, thinking: "none", maxToolDepth: 10, ...args }),
        sent: () => cfSent.map((b) => b.messages),
        // the person's words in a request: a user message after the tool's result
        said: (request) => request.filter((m) => m.role === "user" && typeof m.content === "string" && m.content.startsWith("[The user sent")),
        afterResults: (request) => { const i = request.findIndex((m) => typeof m.content === "string" && m.content.startsWith("[The user sent")); return i > 0 && request[i - 1].role === "tool"; },
    },
    "Claude (streamClaudeChat)": {
        script: (rounds) => { claudeScript = rounds.map((r, i) => (r === "tool" ? claudeToolRound(`toolu_${i}`) : claudeAnswerRound)); },
        run: (args) => streamClaudeChat({ model: "claude-sonnet-5-5", messages, tools: termTool, loadedToolNames: new Set(["computer_terminal"]), maxTokens: 1000, maxToolDepth: 10, ...args }),
        sent: () => claudeSent,
        // one more text block in the message that carries the tool's result
        said: (request) => request.flatMap((m) => (Array.isArray(m.content) ? m.content : [])).filter((b) => b.type === "text" && String(b.text).startsWith("[The user sent")),
        afterResults: (request) => request.some((m) => Array.isArray(m.content) && m.content[0]?.type === "tool_result" && m.content[m.content.length - 1]?.type === "text" && String(m.content[m.content.length - 1].text).startsWith("[The user sent")),
    },
};

for (const [name, L] of Object.entries(loops)) {
    test(`${name}: what the person says while a step runs goes to the model with that step's result, once, and the answer goes on`, T, async () => {
        L.script(["tool", "tool", "answer"]);
        const notes = makeUserNotes();
        const read = [];
        let steps = 0;
        const r = await L.run({
            toolHandlers: { computer_terminal: async () => { if (++steps === 1) notes.add({ id: "m1", text: "keep the photos folder" }); return "deleted"; } },
            userNotes: () => { const got = notes.take(); if (got) read.push(...got.notes.map((n) => n.id)); return got ? got.text : null; },
        });
        assert.equal(r.answer, "All done.");
        assert.equal(steps, 2, "the work went on");
        assert.deepEqual(read, ["m1"]);
        const sent = L.sent();
        assert.equal(sent.length, 3);
        assert.equal(L.said(sent[0]).length, 0, "not before it was said");
        assert.equal(L.said(sent[1]).length, 1, "in the very next round");
        assert.ok(L.afterResults(sent[1]), "right after the step's result");
        assert.ok(JSON.stringify(sent[1]).includes("keep the photos folder"));
        assert.equal(L.said(sent[2]).length, 1, "it stays in the conversation, and is not said a second time");
    });

    test(`${name}: an answer with no step takes nothing (the app sends the message next, itself)`, T, async () => {
        L.script(["answer"]);
        const notes = makeUserNotes();
        notes.add({ id: "m1", text: "one more thing" });
        let asked = 0;
        const r = await L.run({ toolHandlers: {}, userNotes: () => { asked++; return notes.take()?.text || null; } });
        assert.equal(r.answer, "All done.");
        assert.equal(asked, 0);
        assert.equal(notes.waiting(), 1, "still waiting, not lost");
        assert.equal(L.said(L.sent()[0]).length, 0);
    });

    test(`${name}: a step that ends the answer takes nothing with it, and a reading that breaks never breaks the answer`, T, async () => {
        L.script(["tool"]);
        const notes = makeUserNotes();
        notes.add({ id: "m1", text: "one more thing" });
        const ended = await L.run({ toolHandlers: { computer_terminal: async () => ({ text: "Sleeping.", stopAnswer: "I will come back at 5." }) }, userNotes: () => notes.take()?.text || null });
        assert.equal(ended.answer, "I will come back at 5.");
        assert.equal(notes.waiting(), 1, "the message stays for the app to send next");
        L.script(["tool", "answer"]);
        const r = await L.run({ toolHandlers: { computer_terminal: async () => "deleted" }, userNotes: () => { throw new Error("broken"); } });
        assert.equal(r.answer, "All done.");
    });
}

// ── 4. More of the same path, as the app really uses it ──

for (const [name, L] of Object.entries(loops)) {
    test(`${name}: several messages sent during one step go to the model together; one sent during a later step arrives after that step`, T, async () => {
        L.script(["tool", "tool", "tool", "answer"]);
        const notes = makeUserNotes();
        let steps = 0;
        const r = await L.run({
            toolHandlers: { computer_terminal: async () => {
                steps++;
                if (steps === 1) { notes.add({ id: "a", text: "first thing" }); notes.add({ id: "b", text: "second thing" }); }
                if (steps === 3) notes.add({ id: "c", text: "third thing, later" });
                return "ok";
            } },
            userNotes: () => notes.take()?.text || null,
        });
        assert.equal(r.answer, "All done.");
        const sent = L.sent();
        assert.equal(sent.length, 4);
        assert.equal(L.said(sent[1]).length, 1, "two messages, one text");
        assert.ok(JSON.stringify(sent[1]).includes("these 2 messages") && JSON.stringify(sent[1]).includes("first thing") && JSON.stringify(sent[1]).includes("second thing"));
        assert.equal(JSON.stringify(sent[2]).includes("third thing"), false, "not before it was sent");
        assert.equal(L.said(sent[3]).length, 2, "the later one after its own step");
        assert.ok(JSON.stringify(sent[3]).includes("third thing, later"));
    });

    test(`${name}: with the app driving the steps, a message posted to the answer while a step waits goes to the model with that round`, T, async () => {
        L.script(["tool", "answer"]);
        const stopAll = new AbortController();
        const notes = makeUserNotes();
        const events = [];
        const turnId = `e2e-${name.slice(0, 2)}-${++turnNo}`;
        const loop = makeLocalLoopDriver({ turnId, userId: "u1", emit: (ev) => events.push(ev), onStop: () => stopAll.abort(), onSay: (n) => notes.add(n), signal: stopAll.signal });
        const read = [];
        const answer = L.run({
            signal: stopAll.signal, toolDriver: loop.driver,
            toolHandlers: { computer_terminal: async () => "deleted" },
            userNotes: () => { const got = notes.take(); if (got) read.push(...got.notes.map((n) => n.id)); return got ? got.text : null; },
        });
        // the model asked for a step and waits for the app
        for (let i = 0; i < 400 && !events.some((e) => e.type === "round_end"); i++) await new Promise((r) => setImmediate(r));
        const round = events.find((e) => e.type === "round_end");
        assert.ok(round, "the round is handed to the app");
        // the person sends a message now (the app posts it), then the app drives the round
        assert.deepEqual(await handleTurnCommand(turnId, "u1", { type: "say", id: "m1", text: "do not delete the photos" }), { ok: true });
        assert.deepEqual(await handleTurnCommand(turnId, "u1", { type: "run", roundId: round.roundId, id: round.calls[0].id }), { ok: true });
        for (let i = 0; i < 400 && !events.some((e) => e.type === "tool_done"); i++) await new Promise((r) => setImmediate(r));
        assert.deepEqual(await handleTurnCommand(turnId, "u1", { type: "round_done", roundId: round.roundId }), { ok: true });
        const r = await answer;
        loop.dispose();
        assert.equal(r.answer, "All done.");
        assert.deepEqual(read, ["m1"]);
        const sent = L.sent();
        assert.equal(sent.length, 2);
        assert.equal(L.said(sent[1]).length, 1);
        assert.ok(JSON.stringify(sent[1]).includes("do not delete the photos"));
        // after the answer has ended nothing more is taken (the app sends it as the next message)
        assert.deepEqual(await handleTurnCommand(turnId, "u1", { type: "say", id: "m2", text: "late" }), { error: "unknown_turn" });
    });
}
