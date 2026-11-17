// When Cloudflare's daily cap refuses a round, a Claude model finishes the answer from where it stands (owner,
// 2026-11-17: "after finishing those, all fall back to Claude models"; "carefully check all Cloudflare models").
// Checked here (services/llm-stream.js streamChat, its capStandIn):
//   - refused at the first round (the day is not used up, but this request does not fit): the stand-in answers, and
//     nothing is counted for the Cloudflare model
//   - refused in the middle, after a tool ran: the stand-in gets the conversation so far (the call and its result),
//     the same tools and handlers, and the live token check at ITS rate; the result says what each model used, and
//     the tools that ran are counted together
//   - a stand-in that brings its own system prompt and tool list (the main chat's: what a Claude answer gets) works
//     with those, and the tools the answer already used are in its context from the start
//   - no stand-in (none given, or Claude can't be used): the refusal goes up as before
//   - the stand-in's own failure goes up with what both models used
//   - an answer a stand-in was finishing when the server restarted goes on with a stand-in, without asking Cloudflare
// Also here, the usage of a Cloudflare round the user stops (streamOneRound): Cloudflare's first chunk carries the
// input count, each chunk after it how many tokens it holds, and only the last chunk the whole round, so a stopped
// round is charged for its input and for what its chunks add up to (it used to be charged for the input only).
// Cloudflare and Claude are stand-ins here: nothing is sent anywhere.
// Run: node --experimental-test-module-mocks --test tests/cap-standin.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";

class CapError extends Error { constructor() { super("Cloudflare AI is paused for today"); this.name = "CfNeuronCapError"; this.code = "cf_neuron_cap"; } }
let script = []; // what Cloudflare answers, one entry per request: "refuse", or the chunks of a streamed round
const sent = [];
mock.module("../src/services/cf-neuron-cap.service.js", {
    namedExports: {
        isCfNeuronCapError: (e) => !!e && e.code === "cf_neuron_cap",
        cfAiFetch: async (url, init) => {
            const next = script.shift();
            if (!next || next === "refuse") throw new CapError();
            sent.push(JSON.parse(init.body));
            if (next.stopAfter) {
                // (a round the user stops: its chunks arrive one by one, then Stop is pressed and the stream breaks)
                let i = 0;
                return new Response(new ReadableStream({
                    pull(controller) {
                        if (i < next.stopAfter.length) { controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(next.stopAfter[i++])}\n\n`)); return; }
                        return new Promise((r) => setTimeout(r, 5)).then(() => { next.stop.abort(); controller.error(new Error("This operation was aborted")); });
                    },
                }), { status: 200, headers: { "content-type": "text/event-stream" } });
            }
            const text = next.map((c) => `data: ${JSON.stringify(c)}\n\n`).join("") + "data: [DONE]\n\n";
            return new Response(text, { status: 200, headers: { "content-type": "text/event-stream" } });
        },
    },
});

let claudeCalls = [];
let claudeAnswer = async () => ({ answer: "Done by the stand-in.", usage: { prompt_tokens: 900, completion_tokens: 50, total_tokens: 950 }, toolsRun: 2, servedModel: "claude-haiku-5-5" });
mock.module("../src/services/llm-stream-anthropic.js", {
    namedExports: {
        makeToolImageCollector: () => null,
        toClaudeConversation: (messages, opts) => [{ role: "user", content: [{ type: "text", text: `converted ${messages.length} messages` }], from: messages.map((m) => m.role), toolNames: [...(opts?.toolNames || [])] }],
        streamClaudeChat: async (args) => { claudeCalls.push(args); return claudeAnswer(args); },
    },
});

const { streamChat } = await import("../src/services/llm-stream.js");

const provider = { name: "cloudflare", url: "https://api.cloudflare.com/client/v4/accounts/acc/ai/v1/chat/completions", apiKey: "k", model: "@cf/zai-org/glm-5.3" };
const tools = [{ type: "function", function: { name: "lookup", description: "look something up", parameters: { type: "object", properties: { q: { type: "string" } } } } }];
const messages = [{ role: "system", content: "You are the assistant." }, { role: "user", content: "Find x and tell me." }];
const toolRound = [
    { choices: [{ delta: { content: "Let me look. ", tool_calls: [{ index: 0, id: "call_a", function: { name: "lookup", arguments: "{\"q\":\"x\"}" } }] } }], usage: { prompt_tokens: 100, completion_tokens: 5, total_tokens: 105 } },
    { choices: [{ delta: {}, finish_reason: "tool_calls" }], usage: { prompt_tokens: 100, completion_tokens: 10, total_tokens: 110 } },
];
const start = (s) => { script = s; sent.length = 0; claudeCalls = []; };
const standIn = (extra = {}) => async () => ({ model: "claude-haiku-5-5", ...extra });

test("refused at the first round: the stand-in answers, nothing is counted for the Cloudflare model", async () => {
    start(["refuse"]);
    const r = await streamChat({ provider, messages, tools, maxTokens: 1000, capStandIn: standIn() });
    assert.equal(sent.length, 0);
    assert.equal(claudeCalls.length, 1);
    assert.equal(claudeCalls[0].model, "claude-haiku-5-5");
    assert.equal(claudeCalls[0].resumeProvider, "claude");
    assert.deepEqual(claudeCalls[0].resumeConversation[0].from, ["system", "user"]);
    assert.equal(claudeCalls[0].messages[0].role, "system", "the system prompt goes along");
    assert.equal(r.answer, "Done by the stand-in.");
    assert.equal(r.standIn.model, "claude-haiku-5-5");
    assert.equal(r.standIn.before.model, "@cf/zai-org/glm-5.3");
    assert.equal(r.standIn.before.usage.total_tokens, 0);
    assert.equal(r.usage.total_tokens, 950);
});

test("refused in the middle, after a tool ran: the stand-in goes on with the conversation, the tools and its own meter", async () => {
    start([toolRound, "refuse"]);
    let ran = 0;
    const seen = [];
    const hooks = { onRoundUsage: () => {}, tokensLeft: () => 5000, maxOutputTokens: () => 700, inputTooBig: () => false };
    const cfRounds = [];
    const r = await streamChat({
        provider, messages, tools, maxTokens: 1000, maxToolDepth: 10, thinking: "all",
        toolHandlers: { lookup: async (a) => { ran++; return `found ${a.q}`; } },
        onRoundUsage: (u) => cfRounds.push(u.total_tokens),
        onConversation: (c, u, extra) => seen.push(extra || null),
        capStandIn: standIn(hooks),
    });
    assert.equal(sent.length, 1, "one round went to Cloudflare");
    assert.equal(ran, 1);
    assert.deepEqual(cfRounds, [110], "the Cloudflare round was counted at the caller's own rate");
    const a = claudeCalls[0];
    assert.deepEqual(a.resumeConversation[0].from, ["system", "user", "assistant", "tool"], "the call and its result go to the stand-in");
    assert.deepEqual(a.resumeConversation[0].toolNames, ["lookup"]);
    assert.deepEqual(a.toolsNow().map((t) => t.function.name), ["lookup"]);
    assert.equal(typeof a.toolHandlers.lookup, "function");
    assert.equal(a.onRoundUsage, hooks.onRoundUsage, "the stand-in's rounds are counted at its own rate");
    assert.equal(a.tokensLeft, hooks.tokensLeft);
    assert.equal(a.maxOutputTokens, hooks.maxOutputTokens);
    assert.equal(a.inputTooBig, hooks.inputTooBig);
    assert.equal(a.maxToolDepth, 9, "the rounds already used are taken off");
    assert.equal(a.effort, "high", "Deep stays Deep");
    assert.equal(r.toolsRun, 3, "1 on Cloudflare + 2 on the stand-in");
    assert.equal(r.standIn.before.usage.total_tokens, 110);
    assert.equal(r.usage.total_tokens, 950);
    assert.equal(r.servedModel, "claude-haiku-5-5");
    // What the stand-in saves for a restart is marked as its own
    await a.onConversation([{ role: "user", content: [] }], { total_tokens: 1 });
    assert.equal(seen.at(-1).standIn.model, "claude-haiku-5-5");
    assert.equal(seen.at(-1).standIn.before.usage.total_tokens, 110);
});

test("a stand-in with its own system prompt and tool list works with those", async () => {
    start([toolRound, "refuse"]);
    const claudeTools = [...tools, { type: "function", function: { name: "view_image", description: "look at a picture", parameters: { type: "object", properties: {} } } }];
    const groupNeedingLoad = () => null;
    await streamChat({
        provider, messages, tools, maxTokens: 1000, toolHandlers: { lookup: async () => "found" },
        capStandIn: standIn({ system: "CLAUDE SYSTEM PROMPT", systemCacheBoundary: 6, tools: claudeTools, loadedToolNames: new Set(["view_image"]), groupNeedingLoad }),
    });
    const a = claudeCalls[0];
    assert.deepEqual(a.messages, [{ role: "system", content: "CLAUDE SYSTEM PROMPT" }]);
    assert.equal(a.systemCacheBoundary, 6);
    assert.equal(a.tools, claudeTools);
    assert.equal(a.toolsNow, undefined);
    assert.deepEqual([...a.loadedToolNames].sort(), ["lookup", "view_image"], "the tool the answer already used is loaded with the stand-in's own");
    assert.equal(a.groupNeedingLoad, groupNeedingLoad);
    assert.deepEqual(a.resumeConversation[0].toolNames.sort(), ["lookup", "view_image"]);
});

test("no stand-in: the refusal goes up as before", async () => {
    start([toolRound, "refuse"]);
    await assert.rejects(
        () => streamChat({ provider, messages, tools, maxTokens: 1000, toolHandlers: { lookup: async () => "found" } }),
        (e) => /paused for today/.test(e.message) && e.toolsRun === 1 && e.usage.total_tokens === 110 && !e.standIn,
    );
    start(["refuse"]);
    await assert.rejects(() => streamChat({ provider, messages, tools, maxTokens: 1000, capStandIn: async () => null }), /paused for today/);
    start(["refuse"]);
    await assert.rejects(() => streamChat({ provider, messages, tools, maxTokens: 1000, capStandIn: async () => { throw new Error("no"); } }), /paused for today/);
    assert.equal(claudeCalls.length, 0);
});

test("a stopped answer is not handed to a stand-in", async () => {
    start(["refuse"]);
    const stop = new AbortController();
    stop.abort();
    await assert.rejects(() => streamChat({ provider, messages, tools, maxTokens: 1000, signal: stop.signal, capStandIn: standIn() }));
    assert.equal(claudeCalls.length, 0);
});

test("the stand-in's own failure goes up with what both models used", async () => {
    start([toolRound, "refuse"]);
    const keep = claudeAnswer;
    claudeAnswer = async () => { const e = new Error("Anthropic 529: overloaded"); e.toolsRun = 1; e.usage = { prompt_tokens: 40, completion_tokens: 0, total_tokens: 40 }; throw e; };
    try {
        await assert.rejects(
            () => streamChat({ provider, messages, tools, maxTokens: 1000, toolHandlers: { lookup: async () => "found" }, capStandIn: standIn() }),
            (e) => /overloaded/.test(e.message) && e.toolsRun === 2 && e.usage.total_tokens === 40 && e.standIn.model === "claude-haiku-5-5" && e.standIn.before.usage.total_tokens === 110,
        );
    } finally { claudeAnswer = keep; }
});

test("after a restart, an answer a stand-in was finishing goes on with a stand-in", async () => {
    start([toolRound]); // (would be used if Cloudflare were asked: it must not be)
    const saved = [{ role: "user", content: [{ type: "text", text: "Find x" }] }, { role: "assistant", content: [{ type: "text", text: "Working" }] }];
    const before = { model: "@cf/zai-org/glm-5.3", usage: { prompt_tokens: 100, completion_tokens: 10, total_tokens: 110 } };
    const r = await streamChat({
        provider, messages, tools, maxTokens: 1000, capStandIn: standIn(),
        resumeProvider: "claude", resumeConversation: saved, resumeUsage: { total_tokens: 500 }, resumeStandIn: { model: "claude-haiku-5-5", before },
    });
    assert.equal(sent.length, 0);
    assert.equal(claudeCalls[0].resumeConversation, saved);
    assert.deepEqual(claudeCalls[0].resumeUsage, { total_tokens: 500 });
    assert.deepEqual(r.standIn.before, before, "what the Cloudflare model used before the restart is kept");
    // Without a stand-in to go on with, the answer starts again on Cloudflare, as another loop's conversation always did
    start([[{ choices: [{ delta: { content: "Fresh answer" } }], usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 } }, { choices: [{ delta: {}, finish_reason: "stop" }] }]]);
    const again = await streamChat({ provider, messages, tools, maxTokens: 1000, resumeProvider: "claude", resumeConversation: saved, resumeStandIn: { model: "claude-haiku-5-5", before } });
    assert.equal(again.answer, "Fresh answer");
    assert.equal(again.standIn, undefined);
});

test("a Cloudflare round the user stops is charged for its input and for what it wrote", async () => {
    const stop = new AbortController();
    // (the usage on each chunk as Cloudflare sends it: read live 2026-11-17)
    start([{ stop, stopAfter: [
        { choices: [{ delta: { role: "assistant", content: "" } }], usage: { prompt_tokens: 5000, completion_tokens: 0, total_tokens: 5000 } },
        { choices: [{ delta: { content: "One two three " } }], usage: { prompt_tokens: 0, completion_tokens: 6, total_tokens: 6 } },
        { choices: [{ delta: { content: "four five six " } }], usage: { prompt_tokens: 0, completion_tokens: 6, total_tokens: 6 } },
        { choices: [{ delta: { content: "seven" } }], usage: { prompt_tokens: 0, completion_tokens: 1, total_tokens: 1 } },
    ] }]);
    let shown = "";
    await assert.rejects(
        () => streamChat({ provider, messages, tools, maxTokens: 1000, signal: stop.signal, onToken: (p) => { shown += p; }, capStandIn: standIn() }),
        (e) => e.usage.prompt_tokens === 5000 && e.usage.completion_tokens === 13 && e.usage.total_tokens === 5013,
    );
    assert.equal(shown, "One two three four five six seven");
    assert.equal(claudeCalls.length, 0, "a stopped answer is not handed to a stand-in");
});
