// A conversation a Cloudflare model started, in Claude's shape, so a Claude model can go on with it (the stand-in when
// Cloudflare's daily cap refuses a round: services/llm-stream-anthropic.js toClaudeConversation). Checked here:
//   - the system prompt in front is left out; a system note further in goes with the next user message
//   - an assistant message with tool calls becomes text + tool_use blocks, the tool messages become tool_result blocks
//     of the next user message, in front of its text and pictures
//   - ids Claude would refuse are cleaned, empty and repeated ids get their own, and results still find their call
//   - a call to a tool the Claude model does not have is kept as plain text, and so is its result; the thought tool's
//     calls and results are left out altogether (Claude Sonnet declines a conversation that carries them)
//   - arguments that are not JSON become an empty input; a call with no result gets one
//   - the conversation starts with a user message and ends with one
// Run: node --experimental-test-module-mocks --test tests/claude-conversation.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";

mock.module("../src/services/cf-neuron-cap.service.js", { namedExports: { cfAiFetch: async () => { throw new Error("not used"); }, isCfNeuronCapError: () => false } });
const { toClaudeConversation } = await import("../src/services/llm-stream-anthropic.js");

const call = (id, name, args) => ({ id, type: "function", function: { name, arguments: args } });

test("a round with a tool call and a picture", () => {
    const out = toClaudeConversation([
        { role: "system", content: "SYSTEM PROMPT" },
        { role: "user", content: "Find x" },
        { role: "assistant", content: "Let me look.", tool_calls: [call("chatcmpl-tool.1!", "lookup", "{\"q\":\"x\"}")] },
        { role: "tool", tool_call_id: "chatcmpl-tool.1!", content: "found x" },
        { role: "user", content: [{ type: "text", text: "The images from the tool results above." }, { type: "image_url", image_url: { url: "data:image/PNG;base64,AAAA" } }] },
    ]);
    assert.deepEqual(out, [
        { role: "user", content: [{ type: "text", text: "Find x" }] },
        { role: "assistant", content: [{ type: "text", text: "Let me look." }, { type: "tool_use", id: "chatcmpl-tool_1_", name: "lookup", input: { q: "x" } }] },
        { role: "user", content: [
            { type: "tool_result", tool_use_id: "chatcmpl-tool_1_", content: "found x" },
            { type: "text", text: "The images from the tool results above." },
            { type: "image", source: { type: "base64", media_type: "image/png", data: "AAAA" } },
        ] },
    ]);
    assert.ok(!JSON.stringify(out).includes("SYSTEM PROMPT"), "the system prompt is not part of the conversation");
});

test("empty and repeated ids: every call gets its own id and its own result", () => {
    const out = toClaudeConversation([
        { role: "user", content: "go" },
        { role: "assistant", content: "", tool_calls: [call("", "a", "{}"), call("", "b", "{\"n\":1}"), call("same", "c", "{}")] },
        { role: "tool", tool_call_id: "", content: "A" },
        { role: "tool", tool_call_id: "", content: "B" },
        { role: "tool", tool_call_id: "same", content: "C" },
        { role: "assistant", content: "again", tool_calls: [call("same", "c", "{}")] },
        { role: "tool", tool_call_id: "same", content: "C2" },
    ]);
    const uses = out.flatMap((m) => m.content).filter((b) => b.type === "tool_use");
    const results = out.flatMap((m) => m.content).filter((b) => b.type === "tool_result");
    assert.equal(new Set(uses.map((u) => u.id)).size, 4, "four calls, four ids");
    assert.ok(uses.every((u) => /^[a-zA-Z0-9_-]+$/.test(u.id)));
    assert.deepEqual(results.map((r) => r.content), ["A", "B", "C", "C2"]);
    assert.deepEqual(results.map((r) => r.tool_use_id), uses.map((u) => u.id), "each result names its own call, in order");
    assert.equal(out[1].content[0].type, "tool_use", "an assistant message with no text is only its calls");
});

test("a tool the Claude model does not have stays as plain text, and tool results come first", () => {
    const out = toClaudeConversation([
        { role: "user", content: "go" },
        { role: "assistant", content: "Checking.", tool_calls: [call("t1", "old_search", "{\"q\":\"plan\"}"), call("t2", "lookup", "{}")] },
        { role: "tool", tool_call_id: "t1", content: "Nothing found." },
        { role: "tool", tool_call_id: "t2", content: "found" },
    ], { toolNames: new Set(["lookup"]) });
    assert.deepEqual(out[1].content.map((b) => b.type), ["text", "text", "tool_use"]);
    assert.match(out[1].content[1].text, /old_search/);
    assert.deepEqual(out[2].content.map((b) => b.type), ["tool_result", "text"], "the tool result is in front of the text");
    assert.equal(out[2].content[0].tool_use_id, "t2");
    assert.match(out[2].content[1].text, /Result of old_search:\nNothing found\./);
});

test("the thought tool's calls and results are left out altogether", () => {
    const out = toClaudeConversation([
        { role: "user", content: "go" },
        { role: "assistant", content: "Let me check.", tool_calls: [call("t1", "internal_thought_process", "{\"thought\":\"two lookups\"}"), call("", "lookup", "{\"q\":\"x\"}")] },
        { role: "tool", tool_call_id: "t1", content: "Thought logged. Provide your final answer now." },
        { role: "tool", tool_call_id: "", content: "found x" },
        { role: "assistant", content: "", tool_calls: [call("t3", "internal_thought_process", "{}")] },
        { role: "tool", tool_call_id: "t3", content: "ERROR: You have ALREADY used the internal_thought_process tool. Provide your final answer now." },
    ], { toolNames: new Set(["lookup", "internal_thought_process"]) });
    const all = JSON.stringify(out);
    assert.ok(!/internal_thought_process|Thought logged|two lookups/.test(all), all);
    assert.deepEqual(out[1].content.map((b) => b.type), ["text", "tool_use"]);
    assert.deepEqual(out[2].content.map((b) => b.type), ["tool_result"]);
    assert.equal(out[2].content[0].content, "found x", "the real call still finds its result");
    assert.equal(out.length, 3, "an assistant message that was only a thought leaves nothing behind");
});

test("arguments that are not JSON become an empty input; a call with no result gets one", () => {
    const out = toClaudeConversation([
        { role: "user", content: "go" },
        { role: "assistant", content: "", tool_calls: [call("x1", "lookup", "{not json"), call("x2", "lookup", "[1,2]")] },
        { role: "tool", tool_call_id: "x1", content: "Error: Invalid JSON arguments." },
        { role: "user", content: "and now?" },
    ]);
    assert.deepEqual(out[1].content.map((b) => b.input), [{}, {}]);
    assert.deepEqual(out[2].content.map((b) => b.type), ["tool_result", "tool_result", "text"]);
    assert.equal(out[2].content[1].tool_use_id, "x2");
    assert.match(out[2].content[1].content, /No result was kept/);
});

test("a system note further in goes with the next user message; one at the very end is not lost", () => {
    const out = toClaudeConversation([
        { role: "system", content: "SYSTEM" },
        { role: "user", content: "one" },
        { role: "assistant", content: "answer one" },
        { role: "system", content: "[NOTE] tools ran earlier" },
        { role: "user", content: "two" },
        { role: "assistant", content: "answer two" },
        { role: "system", content: "[NOTE] late" },
    ]);
    assert.deepEqual(out[2].content.map((b) => b.text), ["[NOTE] tools ran earlier", "two"]);
    assert.deepEqual(out.at(-1), { role: "user", content: [{ type: "text", text: "[NOTE] late" }] });
});

test("the conversation starts with a user message and ends with one", () => {
    const out = toClaudeConversation([
        { role: "assistant", content: "left over", tool_calls: [call("old", "lookup", "{}")] },
        { role: "tool", tool_call_id: "old", content: "old result" },
        { role: "user", content: "hello" },
        { role: "assistant", content: "   " },
        { role: "user", content: "still there?" },
        { role: "assistant", content: "half an answ" },
    ]);
    assert.equal(out[0].role, "user");
    assert.match(out[0].content[0].text, /Result of lookup:\nold result/, "the result of a call that was left out stays as text");
    assert.deepEqual(out[0].content.slice(1).map((b) => b.text), ["hello", "still there?"], "user messages next to each other are one message");
    assert.equal(out[1].role, "assistant");
    assert.equal(out.at(-1).role, "user");
    assert.equal(out.length, 3);
    assert.deepEqual(toClaudeConversation([]), []);
    assert.deepEqual(toClaudeConversation(null), []);
});

test("a picture by its https link, and other kinds of links are left out", () => {
    const out = toClaudeConversation([{ role: "user", content: [
        { type: "text", text: "look" },
        { type: "image_url", image_url: { url: "https://cdn.classgrid.in/a.jpg" } },
        { type: "image_url", image_url: { url: "data:image/jpg;base64,QUJD" } },
        { type: "image_url", image_url: { url: "file:///etc/passwd" } },
    ] }]);
    assert.deepEqual(out[0].content, [
        { type: "text", text: "look" },
        { type: "image", source: { type: "url", url: "https://cdn.classgrid.in/a.jpg" } },
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: "QUJD" } },
    ]);
});
