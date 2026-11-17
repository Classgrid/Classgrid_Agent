// The Cloudflare daily Neuron cap: nothing may pass it (owner, 2026-11-17: "carefully check all Cloudflare models ...
// add the fallback of 10 thousand to all so we are not charged"). Checked here (services/cf-neuron-cap.service.js):
//   - the switch: off counts but refuses nothing; a switch that cannot be read keeps what was read last, takes what the
//     last process left in Redis, and with neither counts as ON
//   - before a request is sent, room for the MOST it can cost is held (whole body as input, full max_tokens as output),
//     and the room held for requests on their way counts as used: two requests sent together cannot both take the
//     last room; a request that does not fit is refused and nothing is sent
//   - when the answer ends, its real cost replaces the held room; a hold whose request never reported back runs out
//   - a stream is read as Cloudflare really sends it (the first chunk has the input count, each chunk in between how
//     many tokens it holds, the last one the whole answer): a finished stream is counted by its last chunk, a stopped
//     one by the input plus what its pieces add up to; a stream with no usage by what was written, never under the
//     expected cost; a request stopped after sending is counted at the expected cost; a failed one is not counted
//   - a count that cannot be read refuses
//   - a picture in a request counts as a set number of tokens, not by its bytes
//   - the source: every SDK client pointed at Cloudflare AI is given the gated fetch, and nothing uses a Cloudflare AI
//     address this gate does not cover
// Redis, the database and the network are stand-ins.
// Run: node --experimental-test-module-mocks --test tests/cf-neuron-cap.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ── Redis stand-in (strings and hashes, with multi) ──
const strings = new Map();
const hashes = new Map();
let redisDown = false;
const hash = (k) => { if (!hashes.has(k)) hashes.set(k, new Map()); return hashes.get(k); };
const ops = {
    get: (k) => (strings.has(k) ? strings.get(k) : null),
    set: (k, v) => { strings.set(k, String(v)); return "OK"; },
    incrbyfloat: (k, n) => { const v = (Number(strings.get(k)) || 0) + Number(n); strings.set(k, String(v)); return String(v); },
    expire: () => 1,
    hset: (k, f, v) => { hash(k).set(f, String(v)); return 1; },
    hdel: (k, ...fs) => { let n = 0; for (const f of fs) if (hash(k).delete(f)) n++; return n; },
    hgetall: (k) => Object.fromEntries(hash(k)),
    hincrbyfloat: (k, f, n) => { const v = (Number(hash(k).get(f)) || 0) + Number(n); hash(k).set(f, String(v)); return String(v); },
    hincrby: (k, f, n) => { const v = (Number(hash(k).get(f)) || 0) + Number(n); hash(k).set(f, String(v)); return v; },
};
const redis = {};
for (const [name, fn] of Object.entries(ops)) redis[name] = async (...a) => { if (redisDown) throw new Error("redis is away"); return fn(...a); };
redis.multi = () => {
    const queued = [];
    const chain = {};
    for (const name of Object.keys(ops)) chain[name] = (...a) => { queued.push([name, a]); return chain; };
    chain.exec = async () => { if (redisDown) throw new Error("redis is away"); return queued.map(([name, a]) => [null, ops[name](...a)]); };
    return chain;
};
mock.module("../src/config/redis.js", { defaultExport: redis });

// ── The database stand-in (Global AI Config) ──
let switchOn = false;
let dbDown = false;
mock.module("../src/models/GlobalAiConfig.js", {
    defaultExport: { findOne: () => ({ select: () => ({ lean: async () => { if (dbDown) throw new Error("no database"); return { cf_neuron_cap_enabled: switchOn }; } }) }) },
});

// ── The network stand-in: set before the service is loaded (it keeps the fetch that was there) ──
let answer = async () => new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
const sentTo = [];
globalThis.fetch = async (url, init) => { sentTo.push(String(url)); return answer(url, init); };

const cap = await import("../src/services/cf-neuron-cap.service.js");
const { cfAiFetch, capSettings, forgetCapSettings, spokenForToday, usedToday, holdNeurons, countAndRelease, worstCaseNeurons, estimateRequestNeurons, promptTokensOf, neuronsForText, isCfNeuronCapError, utcDay, DEFAULT_CAP } = cap;

const DAY = utcDay();
const TOTAL = `cf:neurons:${DAY}`;
const HELD = `cf:neurons:${DAY}:held`;
const CHAT = "https://api.cloudflare.com/client/v4/accounts/acc/ai/v1/chat/completions";
const GLM = "@cf/zai-org/glm-5.3";
const chatInit = (extra = {}) => ({ method: "POST", body: JSON.stringify({ model: GLM, max_tokens: 8192, messages: [{ role: "user", content: "x".repeat(3000) }], ...extra }) });
const bodyOf = (init) => JSON.parse(init.body);
const json = (o) => new Response(JSON.stringify(o), { status: 200, headers: { "content-type": "application/json" } });
// (one chunk per read, like a real stream; `breakAfter`: the stream breaks a moment after the last chunk, as a stopped
// answer does, instead of ending)
const sse = (chunks, { breakAfter = false } = {}) => {
    let i = 0;
    return new Response(new ReadableStream({
        pull(controller) {
            if (i < chunks.length) { controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(chunks[i++])}\n\n`)); return; }
            if (!breakAfter) { controller.close(); return; }
            return new Promise((r) => setTimeout(r, 5)).then(() => controller.error(new Error("stopped")));
        },
    }), { status: 200, headers: { "content-type": "text/event-stream" } });
};
const settled = () => new Promise((r) => setTimeout(r, 30)); // (the count is written after the answer is handed back)
const reset = ({ on = true, used = 0 } = {}) => {
    strings.clear(); hashes.clear(); sentTo.length = 0;
    redisDown = false; dbDown = false; switchOn = on;
    if (used) strings.set(TOTAL, String(used));
    forgetCapSettings();
    answer = async () => json({ usage: { prompt_tokens: 100, completion_tokens: 10, total_tokens: 110 } });
};

// (first, on purpose: this process has not read the switch yet)
test("a switch that cannot be read: on when nothing is known, else what was left in Redis, else what was read last", async () => {
    reset({ on: false });
    dbDown = true;
    assert.equal((await capSettings()).enabled, true, "nothing known anywhere: the cap counts as on");
    strings.set("cf:neurons:cap:switch", "off");
    forgetCapSettings();
    assert.equal((await capSettings()).enabled, false, "the last process left it off");
    dbDown = false; switchOn = true; forgetCapSettings();
    assert.equal((await capSettings()).enabled, true);
    await settled();
    assert.equal(strings.get("cf:neurons:cap:switch"), "on", "what was read is left in Redis for the next process");
    dbDown = true; switchOn = false; forgetCapSettings();
    assert.equal((await capSettings()).enabled, true, "the database is away: what was read last stays");
    dbDown = false; forgetCapSettings();
    assert.equal((await capSettings()).enabled, false);
    await settled();
    assert.equal(strings.get("cf:neurons:cap:switch"), "off");
});

test("the switch off: nothing is refused or held, the answer is still counted", async () => {
    reset({ on: false, used: 50000 });
    const res = await cfAiFetch(CHAT, chatInit());
    assert.equal(res.status, 200);
    await settled();
    assert.equal(hash(HELD).size, 0);
    const counted = neuronsForText(GLM, { promptTokens: 100, completionTokens: 10 });
    assert.ok(Math.abs((await usedToday()) - (50000 + counted)) < 1e-6);
});

test("another address goes straight through, uncounted", async () => {
    reset();
    await cfAiFetch("https://api.anthropic.com/v1/messages", { method: "POST", body: "{}" });
    await settled();
    assert.equal(await usedToday(), 0);
    assert.equal(hash(HELD).size, 0);
});

test("room for the most a request can cost is held while it runs, and its real cost replaces it", async () => {
    reset();
    const init = chatInit();
    const worst = worstCaseNeurons(GLM, bodyOf(init), init);
    assert.ok(worst > 3000, "8,192 answer tokens of GLM 5.3 alone are about 3,277 Neurons");
    let heldDuring = null;
    answer = async () => { heldDuring = await spokenForToday(); return json({ usage: { prompt_tokens: 1000, completion_tokens: 200, total_tokens: 1200 } }); };
    await cfAiFetch(CHAT, init);
    assert.ok(Math.abs(heldDuring - worst) < 1e-6, "while the request runs, its worst case counts as used");
    await settled();
    assert.equal(hash(HELD).size, 0, "the room is given back");
    assert.ok(Math.abs((await spokenForToday()) - neuronsForText(GLM, { promptTokens: 1000, completionTokens: 200 })) < 1e-6, "only the real cost stays");
});

test("a request whose worst case does not fit is refused and nothing is sent", async () => {
    const init = chatInit();
    const worst = worstCaseNeurons(GLM, bodyOf(init), init);
    reset({ used: DEFAULT_CAP - worst + 1 });
    await assert.rejects(() => cfAiFetch(CHAT, init), (e) => isCfNeuronCapError(e));
    assert.equal(sentTo.length, 0);
    assert.equal(hash(HELD).size, 0, "a refused request holds nothing");
    // The old check let this one through: it expected an answer of 1,024 tokens at most
    assert.ok(DEFAULT_CAP - worst + 1 + estimateRequestNeurons(GLM, bodyOf(init), init) < DEFAULT_CAP);
    // One Neuron less used: it fits exactly
    reset({ used: DEFAULT_CAP - worst });
    await cfAiFetch(CHAT, init);
    assert.equal(sentTo.length, 1);
});

test("two requests sent together cannot both take the last room", async () => {
    const init = chatInit();
    const worst = worstCaseNeurons(GLM, bodyOf(init), init);
    reset({ used: DEFAULT_CAP - worst * 1.5 }); // room for one, not for two
    let release;
    const waiting = new Promise((r) => { release = r; });
    answer = async () => { await waiting; return json({ usage: { prompt_tokens: 1000, completion_tokens: 100, total_tokens: 1100 } }); };
    const first = cfAiFetch(CHAT, init);
    await settled();
    await assert.rejects(() => cfAiFetch(CHAT, init), (e) => isCfNeuronCapError(e), "the second sees the room the first holds");
    assert.equal(sentTo.length, 1);
    release();
    await first;
    await settled();
    // The first has ended at its real cost: now there is room again
    answer = async () => json({ usage: { prompt_tokens: 1000, completion_tokens: 100, total_tokens: 1100 } });
    await cfAiFetch(CHAT, init);
    assert.equal(sentTo.length, 2);
});

test("many requests at the same moment never take more than the cap between them", async () => {
    const init = chatInit();
    const worst = worstCaseNeurons(GLM, bodyOf(init), init);
    reset();
    let release;
    const waiting = new Promise((r) => { release = r; });
    answer = async () => { await waiting; return json({ usage: { prompt_tokens: 1000, completion_tokens: 8192, total_tokens: 9192 } }); }; // each writes all it is allowed to
    const results = await Promise.allSettled(Array.from({ length: 10 }, () => { const p = cfAiFetch(CHAT, init); p.catch(() => {}); return Promise.race([p.then(() => "sent"), settled().then(() => "waiting")]); }));
    const refused = results.filter((r) => r.status === "rejected").length;
    assert.equal(sentTo.length, Math.floor(DEFAULT_CAP / worst), "only as many as fit are sent");
    assert.equal(refused, 10 - sentTo.length);
    release();
    await settled();
    assert.ok((await usedToday()) <= 10000, `the day's count stays inside Cloudflare's free 10,000 (${Math.round(await usedToday())})`);
});

// (the usage on each chunk as Cloudflare sends it: read live 2026-11-17)
const firstChunk = (input) => ({ choices: [{ delta: { role: "assistant", content: "" } }], usage: { prompt_tokens: input, completion_tokens: 0, total_tokens: input } });
const piece = (text, tokens) => ({ choices: [{ delta: { content: text } }], usage: { prompt_tokens: 0, completion_tokens: tokens, total_tokens: tokens } });
const lastChunk = (input, output) => ({ choices: [{ delta: {}, finish_reason: "stop" }], usage: { prompt_tokens: input, completion_tokens: output, total_tokens: input + output } });

test("a stream that reaches its end is counted by its last chunk, once", async () => {
    reset();
    answer = async () => sse([firstChunk(5000), piece("Hello", 1500), piece(" there", 1500), lastChunk(5000, 3000)]);
    await cfAiFetch(CHAT, chatInit({ stream: true }));
    await settled();
    assert.ok(Math.abs((await usedToday()) - neuronsForText(GLM, { promptTokens: 5000, completionTokens: 3000 })) < 1e-6, "the pieces are not added on top of the last chunk's count");
    assert.equal(hash(HELD).size, 0);
});

test("a stream that is stopped in the middle is counted by its input and what its pieces add up to", async () => {
    reset();
    answer = async () => sse([firstChunk(5000), piece("Hello", 1500), piece(" there", 1500)], { breakAfter: true });
    await cfAiFetch(CHAT, chatInit({ stream: true }));
    await settled();
    assert.ok(Math.abs((await usedToday()) - neuronsForText(GLM, { promptTokens: 5000, completionTokens: 3000 })) < 1e-6, "the input from the first chunk and the 3,000 tokens written, not input only and not a guessed 1,024");
    assert.equal(hash(HELD).size, 0);
    // What the pieces add up to is never more than the request may write
    reset();
    answer = async () => sse([firstChunk(5000), piece("a", 6000), piece("b", 6000)], { breakAfter: true });
    await cfAiFetch(CHAT, chatInit({ stream: true })); // max_tokens 8192
    await settled();
    assert.ok(Math.abs((await usedToday()) - neuronsForText(GLM, { promptTokens: 5000, completionTokens: 8192 })) < 1e-6);
    // A provider that sends the running count with the input on every chunk: the largest one counts
    reset();
    answer = async () => sse([
        { choices: [{ delta: { content: "Hello" } }], usage: { prompt_tokens: 5000, completion_tokens: 3, total_tokens: 5003 } },
        { choices: [{ delta: { content: " there" } }], usage: { prompt_tokens: 5000, completion_tokens: 3000, total_tokens: 8000 } },
    ], { breakAfter: true });
    await cfAiFetch(CHAT, chatInit({ stream: true }));
    await settled();
    assert.ok(Math.abs((await usedToday()) - neuronsForText(GLM, { promptTokens: 5000, completionTokens: 3000 })) < 1e-6);
});

test("a stream that sends no usage is counted by what was written, never under the expected cost", async () => {
    reset();
    const init = chatInit({ stream: true });
    const long = "y".repeat(30000); // about 10,000 tokens written
    answer = async () => sse([{ choices: [{ delta: { content: long } }] }]);
    await cfAiFetch(CHAT, init);
    await settled();
    const byWritten = neuronsForText(GLM, { promptTokens: promptTokensOf(bodyOf(init), init), completionTokens: 10000 });
    assert.ok(Math.abs((await usedToday()) - byWritten) < 1e-6);
    reset();
    answer = async () => sse([{ choices: [{ delta: { content: "ok" } }] }]);
    await cfAiFetch(CHAT, init);
    await settled();
    assert.ok(Math.abs((await usedToday()) - estimateRequestNeurons(GLM, bodyOf(init), init)) < 1e-6, "a short answer with no usage: the expected cost");
});

test("stopped or timed out after sending: counted at the expected cost; a failed request is not counted; the room is given back", async () => {
    const init = chatInit();
    const expected = estimateRequestNeurons(GLM, bodyOf(init), init);
    reset();
    answer = async () => { const e = new Error("This operation was aborted"); e.name = "AbortError"; throw e; };
    await assert.rejects(() => cfAiFetch(CHAT, init));
    await settled();
    assert.ok(Math.abs((await usedToday()) - expected) < 1e-6);
    assert.equal(hash(HELD).size, 0);

    reset();
    answer = async () => { throw new TypeError("fetch failed"); }; // never reached Cloudflare
    await assert.rejects(() => cfAiFetch(CHAT, init));
    await settled();
    assert.equal(await usedToday(), 0);
    assert.equal(hash(HELD).size, 0);

    reset();
    answer = async () => new Response("busy", { status: 503 });
    assert.equal((await cfAiFetch(CHAT, init)).status, 503);
    await settled();
    assert.equal(await usedToday(), 0);
    assert.equal(hash(HELD).size, 0);

    // Stopped before it was sent at all: nothing counted
    reset();
    const stopped = new AbortController();
    stopped.abort();
    answer = async () => { const e = new Error("aborted"); e.name = "AbortError"; throw e; };
    await assert.rejects(() => cfAiFetch(CHAT, { ...init, signal: stopped.signal }));
    await settled();
    assert.equal(await usedToday(), 0);
});

test("a count that cannot be read refuses, and nothing is sent", async () => {
    reset();
    await capSettings(); // (the switch is read while Redis still answers)
    redisDown = true;
    await assert.rejects(() => cfAiFetch(CHAT, chatInit()), (e) => isCfNeuronCapError(e) && /could not be read/.test(e.message));
    assert.equal(sentTo.length, 0);
});

test("room held for a request that never reported back runs out by itself", async () => {
    reset();
    hash(HELD).set("old", `9000|${Date.now() - 1000}`); // its time is over
    hash(HELD).set("live", `2000|${Date.now() + 60000}`);
    assert.equal(await spokenForToday(), 2000);
    const hold = await holdNeurons(GLM, 1000);
    assert.ok(hold?.id);
    await settled();
    assert.equal(hash(HELD).has("old"), false, "the ended hold is cleared away");
    await countAndRelease(GLM, 400, hold);
    assert.equal(await spokenForToday(), 2400);
});

test("a request that names no model is still counted", async () => {
    reset();
    await countAndRelease("", 12);
    assert.equal(await usedToday(), 12);
    assert.equal(hash(`cf:neurons:${DAY}:models`).get("unknown"), "12");
});

test("the input is taken from the whole body, and a picture counts as a set number of tokens", async () => {
    const tools = [{ type: "function", function: { name: "edit_image", description: "d".repeat(3000), parameters: { type: "object", properties: { image: { type: "string" } } } } }];
    const withTools = { model: GLM, messages: [{ role: "user", content: "hi" }], tools };
    assert.ok(promptTokensOf(withTools, { body: JSON.stringify(withTools) }) > 1000, "the tool list is part of the input (it was left out before)");
    const picture = `data:image/png;base64,${"A".repeat(3_000_000)}`;
    const chatWithPicture = { model: GLM, messages: [{ role: "user", content: [{ type: "text", text: "what is this" }, { type: "image_url", image_url: { url: picture } }] }] };
    const t = promptTokensOf(chatWithPicture, { body: JSON.stringify(chatWithPicture) });
    assert.ok(t > 6000 && t < 7000, `a 3 MB picture is about 6,500 tokens, not a million (${t})`);
    const run = { prompt: "describe", image: "B".repeat(2_000_000) };
    const r = promptTokensOf(run, { body: JSON.stringify(run) });
    assert.ok(r > 6000 && r < 7000, `the /ai/run picture too (${r})`);
    // Embeddings write nothing: no answer tokens in the worst case
    const emb = { text: ["hello world"] };
    assert.ok(worstCaseNeurons("@cf/baai/bge-small-en-v1.5", emb, { body: JSON.stringify(emb) }) < 1);
});

// ── The source: nothing reaches Cloudflare AI around the gate ──
const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const sources = (dir) => readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? (name === "node_modules" ? [] : sources(p)) : /\.(js|mjs|cjs)$/.test(name) ? [p] : [];
});

test("the source: every SDK client pointed at Cloudflare AI is given the gated fetch", () => {
    const bad = [];
    for (const file of sources(SRC)) {
        const text = readFileSync(file, "utf8");
        for (const m of text.matchAll(/new\s+(?:Groq|OpenAI)\(\{[\s\S]*?\}\)/g)) {
            if (m[0].includes("api.cloudflare.com") && !/fetch:\s*cfAiFetch/.test(m[0])) bad.push(`${file}: ${m[0].slice(0, 80)}`);
        }
    }
    assert.deepEqual(bad, []);
});

test("the source: no Cloudflare AI address this gate does not cover, no other HTTP client, no Worker AI binding", () => {
    const bad = [];
    for (const file of sources(SRC)) {
        if (file.endsWith("cf-neuron-cap.service.js")) continue; // (it names them in its notes)
        const text = readFileSync(file, "utf8");
        for (const [what, re] of [
            ["Cloudflare AI Gateway", /gateway\.ai\.cloudflare\.com/],
            ["Cloudflare AI Search", /\/autorag\//],
            ["Cloudflare to-markdown", /\/ai\/tomarkdown/],
            ["a Worker AI binding", /\benv\.AI\b|\.AI\.run\(/],
            ["axios to Cloudflare AI", /axios[^\n]*api\.cloudflare\.com[^\n]*\/ai\//],
        ]) if (re.test(text)) bad.push(`${file}: ${what}`);
    }
    assert.deepEqual(bad, []);
});
