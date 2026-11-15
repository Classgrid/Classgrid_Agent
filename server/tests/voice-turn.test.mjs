/*
 * ─────────────────────────────────────────────────────────
 * 🚨 ERP SHUT DOWN 🚨
 * The Classgrid ERP is shut down and will never work or be worked on again.
 * The org admin dashboard and every dashboard other than chat.classgrid.in and the
 * super admin dashboard are banned, and so is all ERP backend code.
 * Any issue or bug in the ERP or the org admin dashboard is banned too: do not look
 * for it, report it or fix it.
 * Do not build, fix, test or talk about ERP features. Only chat.classgrid.in and the
 * super admin dashboard are live.
 * ─────────────────────────────────────────────────────────
 */
// node --test server/tests/voice-turn.test.mjs
// The phone app's fast voice mode (POST /api/ai/voice/turn): how the model's words are cut into sentences, and the
// order of the events one turn sends. The model and the voice are stubbed: no network, no database, no paid call.
import test from "node:test";
import assert from "node:assert/strict";
import { sentenceTaker, readClaudeStream, readOpenAiStream } from "../src/services/voice-stream.js";
import { runVoiceTurn, createSpeaker, toVoiceMessages, VOICE_AUDIO } from "../src/services/voice-turn.service.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A model's answer as the HTTP response the stream readers take: each string is one network chunk
function sseResponse(chunks, { failAfter = -1 } = {}) {
    const encoder = new TextEncoder();
    let i = 0;
    return {
        body: new ReadableStream({
            async pull(controller) {
                if (failAfter >= 0 && i === failAfter) { controller.error(Object.assign(new Error("This operation was aborted"), { name: "AbortError" })); return; }
                if (i >= chunks.length) { controller.close(); return; }
                await sleep(1);
                controller.enqueue(encoder.encode(chunks[i++]));
            },
        }),
    };
}
const sse = (event) => `data: ${JSON.stringify(event)}\n\n`;

// Claude's stream for one answer: its text in `pieces`, then (optionally) one tool request
function claudeEvents(pieces, tool = null) {
    const out = [sse({ type: "message_start", message: { usage: { input_tokens: 120, output_tokens: 1 } } })];
    if (pieces.length) {
        out.push(sse({ type: "content_block_start", index: 0, content_block: { type: "text", text: "" } }));
        for (const p of pieces) out.push(sse({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text: p } }));
        out.push(sse({ type: "content_block_stop", index: 0 }));
    }
    if (tool) {
        const json = JSON.stringify(tool.input);
        out.push(sse({ type: "content_block_start", index: 1, content_block: { type: "tool_use", id: tool.id, name: tool.name } }));
        out.push(sse({ type: "content_block_delta", index: 1, delta: { type: "input_json_delta", partial_json: json.slice(0, 5) } }));
        out.push(sse({ type: "content_block_delta", index: 1, delta: { type: "input_json_delta", partial_json: json.slice(5) } }));
        out.push(sse({ type: "content_block_stop", index: 1 }));
    }
    out.push(sse({ type: "message_delta", delta: { stop_reason: tool ? "tool_use" : "end_turn" }, usage: { output_tokens: 40 } }));
    return out;
}

// The model stub: answers come from `script` (one entry per round), read by the real Claude stream reader
function stubModel(script) {
    let round = 0;
    const asked = [];
    const askModel = async ({ messages, noTools, onSentence, onText }) => {
        asked.push({ noTools, messages: JSON.parse(JSON.stringify(messages)) });
        const { pieces, tool } = script[round++];
        const data = await readClaudeStream(sseResponse(claudeEvents(pieces, tool)), onSentence, onText);
        const text = data.content.filter((b) => b.type === "text").map((b) => b.text).join(" ").trim();
        return { model: "stub-model", content: data.content, text, tools: data.content.filter((b) => b.type === "tool_use"), cutOff: false, usage: { prompt_tokens: 120, completion_tokens: 40 }, aborted: false };
    };
    return { askModel, asked };
}

// ── Sentence cutting ─────────────────────────────────────────────────────────

test("sentences are handed over one at a time, as soon as each is complete", () => {
    const said = [];
    const taker = sentenceTaker((s) => said.push(s));
    taker.push("Hello");
    taker.push(" there.");
    assert.deepEqual(said, [], "a sentence is complete only when the next one starts");
    taker.push(" How are");
    assert.deepEqual(said, ["Hello there."]);
    taker.push(" you? I am fine! Thanks");
    assert.deepEqual(said, ["Hello there.", "How are you?", "I am fine!"]);
    taker.flush();
    assert.deepEqual(said, ["Hello there.", "How are you?", "I am fine!", "Thanks"]);
    taker.flush();
    assert.equal(said.length, 4, "nothing is said twice");
});

test("Hindi and Marathi sentences end with the danda, quotes stay with their sentence, numbers are not cut", () => {
    const said = [];
    const taker = sentenceTaker((s) => said.push(s));
    taker.push("नमस्ते। आप कैसे हैं? ");
    taker.push("She said \"go.\" Then it cost 3.5 rupees. Done");
    taker.flush();
    assert.deepEqual(said, ["नमस्ते।", "आप कैसे हैं?", "She said \"go.\"", "Then it cost 3.5 rupees.", "Done"]);
});

test("Claude's stream gives every piece of text, whole sentences, the tool request and the usage", async () => {
    const pieces = [], sentences = [];
    const data = await readClaudeStream(
        sseResponse(claudeEvents(["Let me ", "check that. One", " moment."], { id: "toolu_1", name: "ask_classgrid", input: { request: "tomorrow's schedule" } })),
        (s) => sentences.push(s), (p) => pieces.push(p),
    );
    assert.deepEqual(pieces, ["Let me ", "check that. One", " moment."]);
    assert.deepEqual(sentences, ["Let me check that.", "One moment."]);
    assert.deepEqual(data.content, [
        { type: "text", text: "Let me check that. One moment." },
        { type: "tool_use", id: "toolu_1", name: "ask_classgrid", input: { request: "tomorrow's schedule" } },
    ]);
    assert.equal(data.stop_reason, "tool_use");
    assert.equal(data.usage.input_tokens, 120);
    assert.equal(data.usage.output_tokens, 40);
});

test("a stream that is cut off passes on what had arrived, and voices no half sentence", async () => {
    const sentences = [];
    const events = claudeEvents(["First sentence. Second sen"]);
    await assert.rejects(
        readClaudeStream(sseResponse(events, { failAfter: 3 }), (s) => sentences.push(s)),
        (e) => {
            assert.equal(e.name, "AbortError");
            assert.deepEqual(e.partial.content, [{ type: "text", text: "First sentence. Second sen" }]);
            assert.equal(e.partial.usage.input_tokens, 120);
            return true;
        },
    );
    assert.deepEqual(sentences, ["First sentence."]);
});

test("the fallback model's stream is read the same way", async () => {
    const pieces = [], sentences = [];
    const chunk = (delta, extra = {}) => sse({ choices: [{ delta, ...extra }] });
    const { choice, usage } = await readOpenAiStream(sseResponse([
        chunk({ content: "Sure. I will " }),
        chunk({ content: "look." }),
        chunk({ tool_calls: [{ index: 0, id: "call_1", function: { name: "start_task", arguments: "{\"task\":" } }] }),
        chunk({ tool_calls: [{ index: 0, function: { arguments: "\"slides\"}" } }] }, { finish_reason: "tool_calls" }),
        sse({ choices: [], usage: { prompt_tokens: 50, completion_tokens: 9 } }),
        "data: [DONE]\n\n",
    ]), (s) => sentences.push(s), (p) => pieces.push(p));
    assert.deepEqual(pieces, ["Sure. I will ", "look."]);
    assert.deepEqual(sentences, ["Sure.", "I will look."]);
    assert.equal(choice.message.content, "Sure. I will look.");
    assert.deepEqual(choice.message.tool_calls, [{ id: "call_1", type: "function", function: { name: "start_task", arguments: "{\"task\":\"slides\"}" } }]);
    assert.equal(choice.finish_reason, "tool_calls");
    assert.deepEqual(usage, { prompt_tokens: 50, completion_tokens: 9 });
});

// ── The chat's history as the model's conversation ───────────────────────────

test("the chat's history becomes user and assistant turns that take turns, ending with what was just said", () => {
    const messages = toVoiceMessages([
        { role: "assistant", content: "An answer with no question before it" },
        { role: "user", content: "Hi" },
        { role: "assistant", content: "Hello!" },
        { role: "system", content: "[SYSTEM NOTE: a note for the AI]" },
        { role: "user", content: "" },
        { role: "user", content: "x".repeat(9000) },
        { role: "assistant", content: { not: "text" } },
    ], "What time is it?");
    assert.deepEqual(messages.map((m) => m.role), ["user", "assistant", "user"]);
    assert.equal(messages[0].content, "Hi");
    assert.equal(messages[1].content, "Hello!");
    assert.ok(messages[2].content.startsWith("[SYSTEM NOTE: a note for the AI]\n\n"));
    assert.ok(messages[2].content.endsWith("\n\nWhat time is it?"));
    assert.ok(messages[2].content.length < 4200 + 100, "a long message is cut");
    assert.deepEqual(toVoiceMessages([], "Hello"), [{ role: "user", content: "Hello" }]);
});

// ── The events of one turn ───────────────────────────────────────────────────

test("one turn: text as it is written, each sentence's voice in order, the tool, then done", async () => {
    const events = [];
    const { askModel, asked } = stubModel([
        { pieces: ["Let me ", "check that."], tool: { id: "toolu_1", name: "ask_classgrid", input: { request: "tomorrow's schedule" } } },
        { pieces: ["You have two things tomorrow. ", "A review at ten. ", "And lunch at one."] },
    ]);
    // The first sentence of the second answer takes the longest to voice: it must still go out before the others
    const delays = { "Let me check that.": 5, "You have two things tomorrow.": 60, "A review at ten.": 5, "And lunch at one.": 20 };
    const voiced = [];
    const toolRuns = [];
    const rounds = [];
    const messages = [{ role: "user", content: "What is on tomorrow?" }];
    const turn = await runVoiceTurn({
        messages, askModel,
        speak: async (sentence) => { voiced.push(sentence); await sleep(delays[sentence]); return Buffer.from(`pcm:${sentence}`); },
        runTool: async (tool, { cutOff }) => { toolRuns.push({ name: tool.name, input: tool.input, cutOff }); await sleep(10); return { content: "Review at 10, lunch at 1." }; },
        send: (e) => events.push(e),
        onRound: (model, usage) => rounds.push({ model, usage }),
        beforeDone: async (t) => ({ sessionId: "chat-1", messageId: 7, usage: { rounds: t.rounds.length } }),
    });

    // Text: every piece, in the order written, with a space between the two answers
    const text = events.filter((e) => e.type === "text").map((e) => e.delta).join("");
    assert.equal(text, "Let me check that. You have two things tomorrow. A review at ten. And lunch at one.");
    assert.equal(turn.text, text);

    // Voice: every sentence was asked for at once (before the slow one was ready), and sent strictly in order
    assert.deepEqual(voiced, ["Let me check that.", "You have two things tomorrow.", "A review at ten.", "And lunch at one."]);
    const audio = events.filter((e) => e.type === "audio");
    assert.deepEqual(audio.map((e) => e.index), [0, 1, 2, 3]);
    assert.deepEqual(audio.map((e) => e.text), voiced);
    for (const e of audio) {
        assert.equal(e.format, VOICE_AUDIO.format);
        assert.equal(e.sampleRate, 24000);
        assert.equal(Buffer.from(e.data, "base64").toString(), `pcm:${e.text}`);
        assert.equal(e.failed, undefined);
    }

    // The tool: started after the model asked for it, finished before the second answer's text
    const types = events.map((e) => (e.type === "tool" ? `tool:${e.status}` : e.type));
    const at = (t) => types.indexOf(t);
    assert.ok(at("text") < at("tool:start"), "the first words come before the tool");
    assert.ok(at("tool:start") < at("tool:done"));
    assert.ok(types.lastIndexOf("text") > at("tool:done"), "the second answer is written after the tool's result");
    assert.deepEqual(events.filter((e) => e.type === "tool").map((e) => e.name), ["ask_classgrid", "ask_classgrid"]);
    assert.deepEqual(toolRuns, [{ name: "ask_classgrid", input: { request: "tomorrow's schedule" }, cutOff: false }]);

    // Done: last, once, after every sentence's voice, with what the controller added
    assert.equal(types.filter((t) => t === "done").length, 1);
    assert.equal(types[types.length - 1], "done");
    assert.deepEqual(events[events.length - 1], { type: "done", text, sessionId: "chat-1", messageId: 7, usage: { rounds: 2 } });

    // The conversation the second round got: the first answer with its tool request, then the tool's result
    assert.equal(asked.length, 2);
    assert.equal(asked[1].messages[1].role, "assistant");
    assert.deepEqual(asked[1].messages[2], { role: "user", content: [{ type: "tool_result", tool_use_id: "toolu_1", content: "Review at 10, lunch at 1." }] });
    assert.equal(rounds.length, 2, "each model answer's usage is counted");
    assert.deepEqual(turn.steps, [{ tool: "ask_classgrid", args: { request: "tomorrow's schedule" }, result: "Review at 10, lunch at 1.", error: false }]);
    assert.deepEqual(turn.spoken, { sentences: 4, characters: voiced.join("").length, failed: 0, cut: false });
    assert.equal(turn.aborted, false);
});

test("the phone leaves (the user talks over the answer): the model stops, unsent sentences are dropped, no done", async () => {
    const events = [];
    let closed = false;
    let rounds = 0;
    const askModel = async ({ onSentence, onText }) => {
        rounds++;
        for (const piece of ["One. ", "Two. ", "Three. ", "Four."]) {
            if (closed) return { model: "stub-model", content: [{ type: "text", text: "One. Two." }], text: "One. Two.", tools: [], cutOff: false, usage: { prompt_tokens: 10, completion_tokens: 3 }, aborted: true };
            onText(piece);
            if (piece !== "Four.") onSentence(piece.trim());
            await sleep(5);
        }
        throw new Error("the model was not stopped");
    };
    let saved = null;
    const turn = await runVoiceTurn({
        messages: [{ role: "user", content: "Count." }], askModel,
        runTool: async () => { throw new Error("no tool is run"); },
        // "One." is ready at once; "Two." is still being voiced when the phone leaves
        speak: async (sentence) => { await sleep(sentence === "One." ? 1 : 40); return Buffer.from(sentence); },
        send: (e) => { events.push(e); if (e.type === "audio") closed = true; },
        isClosed: () => closed,
        beforeDone: async (t) => { saved = t; return {}; },
    });
    assert.equal(turn.aborted, true);
    assert.equal(rounds, 1);
    assert.deepEqual(events.filter((e) => e.type === "audio").map((e) => e.text), ["One."], "only the sentence already sent");
    assert.equal(events.some((e) => e.type === "done"), false);
    assert.ok(events.every((e) => e.type === "text" || e.type === "audio"));
    assert.ok(saved && saved.aborted, "what was written is still handed over to be saved");
    assert.ok(saved.text.startsWith("One."));
});

test("a sentence whose voice fails keeps its place, and the turn goes on", async () => {
    const events = [];
    const { askModel } = stubModel([{ pieces: ["First. Second. Third."] }]);
    const turn = await runVoiceTurn({
        messages: [{ role: "user", content: "Go" }], askModel, runTool: async () => ({ content: "" }),
        speak: async (sentence) => { if (sentence === "Second.") throw new Error("voice failed"); return Buffer.from(sentence); },
        send: (e) => events.push(e),
    });
    const audio = events.filter((e) => e.type === "audio");
    assert.deepEqual(audio.map((e) => [e.index, e.text, !!e.failed, e.data === ""]), [[0, "First.", false, false], [1, "Second.", true, true], [2, "Third.", false, false]]);
    assert.deepEqual({ sentences: turn.spoken.sentences, failed: turn.spoken.failed }, { sentences: 2, failed: 1 });
    assert.equal(events[events.length - 1].type, "done");
});

test("a turn with no voice sends text and done only, and reads no more than the allowed characters", async () => {
    const events = [];
    const { askModel } = stubModel([{ pieces: ["Short answer. And more."] }]);
    const turn = await runVoiceTurn({ messages: [{ role: "user", content: "Go" }], askModel, runTool: async () => ({ content: "" }), speak: null, send: (e) => events.push(e) });
    assert.deepEqual([...new Set(events.map((e) => e.type))], ["text", "done"]);
    assert.equal(turn.spoken.sentences, 0);

    const sent = [];
    const speaker = createSpeaker({ speak: async (s) => Buffer.from(s), send: (e) => sent.push(e), maxChars: 20 });
    speaker.say("Twelve chars");
    speaker.say("This one is over the limit.");
    await speaker.done();
    assert.deepEqual(sent.map((e) => e.text), ["Twelve chars"]);
    assert.equal(speaker.state.cut, true);
});

test("still asking for tools after the allowed rounds: one last answer without tools", async () => {
    const tool = { id: "toolu_x", name: "ask_classgrid", input: { request: "again" } };
    const { askModel, asked } = stubModel([{ pieces: [], tool }, { pieces: [], tool }, { pieces: ["Here is what I found."] }]);
    const events = [];
    const turn = await runVoiceTurn({ messages: [{ role: "user", content: "Go" }], askModel, runTool: async () => ({ content: "nothing", is_error: true }), speak: null, send: (e) => events.push(e), maxRounds: 2 });
    assert.deepEqual(asked.map((a) => a.noTools), [false, false, true]);
    assert.deepEqual(events.filter((e) => e.type === "tool").map((e) => e.status), ["start", "error", "start", "error"]);
    assert.equal(turn.text, "Here is what I found.");
});

test("a model failure is passed on with what was already said", async () => {
    const events = [];
    const askModel = async ({ onText }) => { onText("Half an "); throw new Error("model down"); };
    await assert.rejects(
        runVoiceTurn({ messages: [{ role: "user", content: "Go" }], askModel, runTool: async () => ({ content: "" }), speak: null, send: (e) => events.push(e) }),
        (e) => { assert.equal(e.message, "model down"); assert.equal(e.turn.text, "Half an"); assert.equal(e.turn.aborted, false); return true; },
    );
    assert.equal(events.some((e) => e.type === "done"), false);
});
