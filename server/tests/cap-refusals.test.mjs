// What happens around a refusal of Cloudflare's daily cap, outside the answer loop (owner, 2026-11-17: "carefully
// check all Cloudflare models ... so we are not charged"; the review of every place the cap can refuse a request).
// Checked here:
//   - claudeSwitches: every Claude stand-in respects what the super admin switched off (the Claude feature flag and
//     the Model manager); titles, the summary, the file reader, the picture reader, the task checker and voice mode on
//     Auto used Claude Haiku whatever those said
//   - keepsCloudflareRounds: an answer picked up after a restart from a Cloudflare model's saved rounds is not moved
//     to Claude before it starts (Claude's loop would start the question again and run its tools a second time)
//   - CAP_REFUSED_WHY and search by meaning: what the main AI reads when the cap refused a job does not carry the
//     cap's wording ("Cloudflare AI is paused for today: 9512 of 9500 Neurons used"), which it repeated to people
//   - fromOpenAiAnswer: a voice turn's tool calls carry ids Claude's API takes, so the turn can move to Claude
// Nothing is sent anywhere; the database, Redis and the sandbox are stand-ins.
// Run: node --experimental-test-module-mocks --test tests/cap-refusals.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";

class CapError extends Error { constructor() { super("Cloudflare AI is paused for today: 9512 of 9500 Neurons used (the cap in Global AI Config; it resets at 00:00 UTC)"); this.name = "CfNeuronCapError"; this.code = "cf_neuron_cap"; } }
mock.module("../src/services/cf-neuron-cap.service.js", {
    namedExports: {
        capSettings: async () => ({ enabled: true, cap: 9500 }),
        spokenForToday: async () => 0,
        cfAiFetch: async () => { throw new CapError(); },
        isCfNeuronCapError: (e) => !!e && (e.code === "cf_neuron_cap" || e.name === "CfNeuronCapError"),
    },
});
let flagsOff = new Set();
let flagsFail = false;
mock.module("../src/services/feature-flag.service.js", {
    namedExports: { offFeatures: async () => { if (flagsFail) throw new Error("no database"); return flagsOff; } },
});
let disabled = [];
mock.module("../src/services/model-access.service.js", {
    namedExports: { disabledModels: async () => disabled },
});
// (what the project service loads: none of it is used by the parts checked here)
mock.module("node-ssh", { namedExports: { NodeSSH: class {} } });
mock.module("../src/models/IdeProject.js", { defaultExport: {} });
mock.module("../src/models/User.js", { defaultExport: {} });
mock.module("../src/services/github-token.service.js", { namedExports: { githubUser: async () => null } });
mock.module("../src/services/classgrid-guide.service.js", { namedExports: { guideFiles: async () => [], GUIDE_PROJECT_DIR: ".classgrid" } });
mock.module("../src/services/github-app.service.js", { namedExports: { githubAppReady: () => false, githubAppInstallUrl: () => "", repoAppToken: async () => null, classgridAuthor: () => ({}), userCoAuthorLine: () => "" } });
mock.module("../config/db.js", { defaultExport: async () => {} });
mock.module("../src/config/redis.js", { defaultExport: { get: async () => null, set: async () => "OK" } });

const { claudeSwitches, claudeFor, claudeWhenCapped, keepsCloudflareRounds, CAP_REFUSED_WHY, forgetCapState } = await import("../src/services/cap-fallback.service.js");
const { meaningVectors, MEANING_SEARCH_PAUSED } = await import("../src/services/ide-project.service.js");
const { fromOpenAiAnswer, toOpenAiMessages } = await import("../src/services/voice-stream.js");

const CAP_WORDS = /cloudflare|neuron|9500|cap\b|paused for today/i;

test("claudeSwitches: the Claude flag and the Model manager reach every stand-in", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-test";
    flagsOff = new Set(); disabled = []; flagsFail = false;
    assert.deepEqual(await claudeSwitches(), { claudeOff: false, disabled: [] });
    assert.equal(claudeFor("small", await claudeSwitches()), "claude-haiku-5-5");

    // Haiku turned off in the Model manager: the small jobs go to Sonnet; both off: no stand-in
    disabled = ["claude-haiku-5-5"];
    assert.equal(claudeFor("small", await claudeSwitches()), "claude-sonnet-5-5");
    disabled = ["claude-haiku-5-5", "claude-sonnet-5-5"];
    assert.equal(claudeFor("simple", await claudeSwitches()), null);

    // The Claude family switched off with its feature flag: no stand-in at all, before a job or after a refusal
    disabled = []; flagsOff = new Set(["model_claude"]);
    const off = await claudeSwitches();
    assert.equal(off.claudeOff, true);
    assert.equal(claudeFor("small", off), null);
    forgetCapState();
    // (the day is not used up in this test; with the flag off nothing is asked at all)
    assert.equal(await claudeWhenCapped("small", off), null);

    // Other flags off do not touch Claude; flags that cannot be read count as on
    flagsOff = new Set(["model_open", "live_browser"]);
    assert.equal((await claudeSwitches()).claudeOff, false);
    flagsFail = true;
    assert.deepEqual(await claudeSwitches(), { claudeOff: false, disabled: [] });
    flagsFail = false; flagsOff = new Set();
});

test("keepsCloudflareRounds: only a Cloudflare model's own saved rounds, of the same person, stay on the Cloudflare path", () => {
    const cf = { provider: "cf", userId: "u1", sessionId: "s1", conversation: [{ role: "system", content: "x" }, { role: "user", content: "q" }], usage: { total_tokens: 10 } };
    assert.equal(keepsCloudflareRounds(cf, "u1"), true);
    assert.equal(keepsCloudflareRounds(cf, { toString: () => "u1" }), true, "an id object compares as its string");
    assert.equal(keepsCloudflareRounds({ ...cf, provider: "claude" }, "u1"), false, "rounds in Claude's shape go on with Claude");
    assert.equal(keepsCloudflareRounds({ ...cf, standIn: { model: "claude-haiku-5-5" }, provider: "claude" }, "u1"), false);
    assert.equal(keepsCloudflareRounds({ ...cf, conversation: [] }, "u1"), false);
    assert.equal(keepsCloudflareRounds(cf, "someone else"), false);
    assert.equal(keepsCloudflareRounds(null, "u1"), false, "nothing saved (expired): the answer is not picked up, as before");
});

test("what the main AI reads after a refusal does not carry the cap's wording", () => {
    assert.doesNotMatch(CAP_REFUSED_WHY, CAP_WORDS);
    assert.doesNotMatch(MEANING_SEARCH_PAUSED, CAP_WORDS);
    assert.match(MEANING_SEARCH_PAUSED, /search_project/, "it says what to use instead");
    // (helpers and the file reader: their "5xx" retry pattern no longer sees the cap's wording either)
    assert.doesNotMatch(CAP_REFUSED_WHY, /429|408|5\d\d|rate limit|timeout|timed out/i);
});

test("search by meaning: a refusal of its embeddings becomes the plain answer; other failures go up as they are", async () => {
    const refused = await meaningVectors(["find the login code"], async () => { throw new CapError(); });
    assert.deepEqual(refused, { paused: MEANING_SEARCH_PAUSED });
    // (the real embedder sends through the gate, which refuses here)
    assert.deepEqual(await meaningVectors(["find the login code"]), { paused: MEANING_SEARCH_PAUSED });
    assert.deepEqual(await meaningVectors(["a"], async (t) => t.map(() => [0.1, 0.2])), { vectors: [[0.1, 0.2]] });
    await assert.rejects(() => meaningVectors(["a"], async () => { throw new Error("embedding failed (500)"); }), /embedding failed \(500\)/);
});

test("fromOpenAiAnswer: the calls' ids are ones Claude's API takes, unique, and the result is filed under the same id", () => {
    const content = fromOpenAiAnswer({
        content: "Let me check.",
        tool_calls: [
            { id: "chatcmpl-tool:0.weather/now", function: { name: "weather", arguments: "{\"city\":\"Pune\"}" } },
            { id: "chatcmpl-tool:0.weather/now", function: { name: "weather", arguments: "{\"city\":\"Mumbai\"}" } },
            { id: "", function: { name: "time", arguments: "{}" } },
            { id: "x".repeat(100), function: { name: "time", arguments: "not json" } },
            { id: "call_ok-1", function: { name: "time", arguments: "{}" } },
        ],
    });
    const calls = content.filter((b) => b.type === "tool_use");
    assert.equal(calls.length, 5);
    for (const c of calls) assert.match(c.id, /^[a-zA-Z0-9_-]{1,64}$/, c.id);
    assert.equal(new Set(calls.map((c) => c.id)).size, 5, "no two calls share an id");
    assert.equal(calls[0].id, "chatcmpl-tool_0_weather_now");
    assert.equal(calls[4].id, "call_ok-1", "a good id is kept as it is");
    assert.deepEqual(calls[0].input, { city: "Pune" });
    assert.deepEqual(calls[3].input, {});
    // The conversation goes back to the Cloudflare model with the same ids on the calls and their results
    const back = toOpenAiMessages("sys", [
        { role: "user", content: "weather?" },
        { role: "assistant", content },
        { role: "user", content: calls.map((c) => ({ type: "tool_result", tool_use_id: c.id, content: "ok" })) },
    ]);
    const asked = back.find((m) => m.tool_calls).tool_calls.map((t) => t.id);
    const answered = back.filter((m) => m.role === "tool").map((m) => m.tool_call_id);
    assert.deepEqual(answered, asked);
});
