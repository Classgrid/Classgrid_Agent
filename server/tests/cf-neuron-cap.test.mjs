// The Cloudflare daily Neuron cap: nothing may pass it (owner, 2026-11-17: "carefully check all Cloudflare models ...
// add the fallback of 10 thousand to all so we are not charged"). Checked here (services/cf-neuron-cap.service.js):
//   - the switch: off counts but refuses nothing; a switch that cannot be read keeps what was read last, takes what the
//     last process left in Redis, and with neither counts as ON; another process's "on" wins; a missing settings
//     document is never read as off
//   - before a request is sent, room for the MOST it can cost is held (whole body as input, full max_tokens as output),
//     and the room held for requests on their way counts as used: two requests sent together cannot both take the
//     last room; a request that does not fit is refused and nothing is sent
//   - when the answer ends, its real cost replaces the held room; room held for a request that never reported back is
//     counted in full when its time runs out, once, even with a late answer or two processes at once
//   - a count that cannot be written is tried again, and a hold is never given back without its count
//   - a stream is read as Cloudflare really sends it (the first chunk has the input count, each chunk in between how
//     many tokens it holds, the last one the whole answer): a finished stream is counted by its last chunk, a stopped
//     one by the input plus what its pieces add up to; a stream with no usage by what was written, never under the
//     expected cost; a usage that reports no input by the expected cost
//   - a request that left and failed is counted at the expected cost (stopped without a stream: the room held); only
//     what proves nothing ran is counted as nothing
//   - a count that cannot be read refuses; a count Redis lost is taken from the database's copy or the process's memory
//   - the input estimate: a picture is a set number of tokens; digits, symbols, base64 and hex one token each
//   - compressed audio is held by a low bitrate; a request with no max_tokens is given the one it was held for
//   - the first 30 minutes of a day see the room held before midnight
//   - a model with no row is priced at the dearest of its kind; every Cloudflare model in the source is priced
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
// failExecs: the next N multi steps fail before running; loseReplies: the next N run, but their answer is lost
let failExecs = 0;
let loseReplies = 0;
const hash = (k) => { if (!hashes.has(k)) hashes.set(k, new Map()); return hashes.get(k); };
const ops = {
    get: (k) => (strings.has(k) ? strings.get(k) : null),
    set: (k, v, ...opts) => { if (opts.includes("NX") && strings.has(k)) return null; strings.set(k, String(v)); return "OK"; },
    incrbyfloat: (k, n) => { const v = (Number(strings.get(k)) || 0) + Number(n); strings.set(k, String(v)); return String(v); },
    expire: () => 1,
    hget: (k, f) => (hash(k).has(f) ? hash(k).get(f) : null),
    hset: (k, f, v) => { hash(k).set(f, String(v)); return 1; },
    hsetnx: (k, f, v) => { if (hash(k).has(f)) return 0; hash(k).set(f, String(v)); return 1; },
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
    chain.exec = async () => {
        if (redisDown) throw new Error("redis is away");
        if (failExecs > 0) { failExecs--; throw new Error("redis hiccup"); }
        const out = queued.map(([name, a]) => [null, ops[name](...a)]);
        if (loseReplies > 0) { loseReplies--; throw new Error("connection lost after the step ran"); }
        return out;
    };
    return chain;
};
mock.module("../src/config/redis.js", { defaultExport: redis });

// ── The database stand-ins (Global AI Config, and the day's count kept in the database) ──
let switchOn = false;
let dbDown = false;
let configDoc = "normal"; // "normal" | "missing" (no document) | "nofield" (a document without the switch)
mock.module("../src/models/GlobalAiConfig.js", {
    defaultExport: {
        findOne: () => ({ select: () => ({ lean: async () => {
            if (dbDown) throw new Error("no database");
            return configDoc === "missing" ? null : configDoc === "nofield" ? { key: "singleton" } : { cf_neuron_cap_enabled: switchOn };
        } }) }),
    },
});
const kept = new Map(); // day -> used
let keptDown = false;
let keptWrites = 0;
mock.module("../src/models/CfNeuronDay.js", {
    defaultExport: {
        db: { get readyState() { return keptDown ? 0 : 1; } },
        findOne: ({ day }) => ({ select: () => ({ lean: async () => { if (keptDown) throw new Error("no database"); return kept.has(day) ? { day, used: kept.get(day) } : null; } }) }),
        updateOne: async ({ day }, { $max }) => { if (keptDown) throw new Error("no database"); keptWrites++; kept.set(day, Math.max(kept.get(day) || 0, $max.used)); return { acknowledged: true }; },
    },
});

// ── The network stand-in: set before the service is loaded (it keeps the fetch that was there) ──
let answer = async () => new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
const sentTo = [];
const sentInits = [];
globalThis.fetch = async (url, init) => { sentTo.push(String(url)); sentInits.push(init); return answer(url, init); };

const cap = await import("../src/services/cf-neuron-cap.service.js");
const { cfAiFetch, capSettings, forgetCapSettings, forgetCountsSeen, spokenForToday, usedToday, holdNeurons, countAndRelease, worstCaseNeurons, estimateRequestNeurons, promptTokensOf, textTokens, neuronsForText, neuronsForAudio, neuronsForSpeech, neuronsForImage, audioSecondsOf, knownModel, isCfNeuronCapError, utcDay, DEFAULT_CAP, COUNT_RETRY_WAITS_MS, DURABLE_WRITE } = cap;
const { CF_REPLACEMENTS } = await import("../src/services/cf-retired-models.js");
COUNT_RETRY_WAITS_MS.splice(0, COUNT_RETRY_WAITS_MS.length, 1, 1); // (the tries again come at once here)

const DAY = utcDay();
const TOTAL = `cf:neurons:${DAY}`;
const HELD = `cf:neurons:${DAY}:held`;
const CHAT = "https://api.cloudflare.com/client/v4/accounts/acc/ai/v1/chat/completions";
const RUN = (model) => `https://api.cloudflare.com/client/v4/accounts/acc/ai/run/${model}`;
const GLM = "@cf/zai-org/glm-5.3";
const WHISPER = "@cf/openai/whisper-large-v3-turbo";
const chatInit = (extra = {}) => ({ method: "POST", body: JSON.stringify({ model: GLM, max_tokens: 8192, messages: [{ role: "user", content: "x".repeat(3000) }], ...extra }) });
const bodyOf = (init) => JSON.parse(init.body);
const json = (o) => new Response(JSON.stringify(o), { status: 200, headers: { "content-type": "application/json" } });
const near = (a, b, what) => assert.ok(Math.abs(a - b) < 1e-6, `${what || "value"}: ${a} vs ${b}`);
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
const settled = (ms = 30) => new Promise((r) => setTimeout(r, ms)); // (the count is written after the answer is handed back)
const reset = ({ on = true, used = 0 } = {}) => {
    strings.clear(); hashes.clear(); sentTo.length = 0; sentInits.length = 0;
    redisDown = false; dbDown = false; switchOn = on; configDoc = "normal";
    failExecs = 0; loseReplies = 0;
    kept.clear(); keptDown = false; keptWrites = 0; DURABLE_WRITE.everyMs = 60000;
    forgetCountsSeen();
    if (used) strings.set(TOTAL, String(used));
    forgetCapSettings();
    answer = async () => json({ usage: { prompt_tokens: 100, completion_tokens: 10, total_tokens: 110 } });
};
// A hold whose time is over (its request never reported back)
const expire = (day, id) => {
    const [n, , model] = hash(`cf:neurons:${day}:held`).get(id).split("|");
    hash(`cf:neurons:${day}:held`).set(id, `${n}|${Date.now() - 1000}|${model}`);
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

test("the switch: another process's 'on' wins when the database cannot be read, and a missing document is never 'off'", async () => {
    // This process read it off; the database then fails, and another process has read it on since
    reset({ on: false });
    assert.equal((await capSettings()).enabled, false);
    await settled();
    dbDown = true;
    strings.set("cf:neurons:cap:switch", "on");
    forgetCapSettings();
    assert.equal((await capSettings()).enabled, true, "on wins over what this process read last");

    // A database with no settings document (moved or restored without it): not read as off, and "off" not left in Redis
    reset({ on: true });
    assert.equal((await capSettings()).enabled, true);
    await settled();
    configDoc = "missing";
    strings.delete("cf:neurons:cap:switch");
    forgetCapSettings();
    assert.equal((await capSettings()).enabled, true, "what was read last stays (it was on)");
    await settled();
    assert.equal(strings.has("cf:neurons:cap:switch"), false, "nothing is written for the other processes");
    // A document without the switch field is the same
    configDoc = "nofield";
    forgetCapSettings();
    assert.equal((await capSettings()).enabled, true);
    // Only an explicit off is off
    configDoc = "normal"; switchOn = false; forgetCapSettings();
    assert.equal((await capSettings()).enabled, false);
});

test("the switch off: nothing is refused or held, the answer is still counted", async () => {
    reset({ on: false, used: 50000 });
    const res = await cfAiFetch(CHAT, chatInit());
    assert.equal(res.status, 200);
    await settled();
    assert.equal(hash(HELD).size, 0);
    near(await usedToday(), 50000 + neuronsForText(GLM, { promptTokens: 100, completionTokens: 10 }));
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
    near(heldDuring, worst, "while the request runs, its worst case counts as used");
    await settled();
    assert.equal(hash(HELD).size, 0, "the room is given back");
    near(await spokenForToday(), neuronsForText(GLM, { promptTokens: 1000, completionTokens: 200 }), "only the real cost stays");
});

test("a request whose worst case does not fit is refused and nothing is sent", async () => {
    const init = chatInit();
    const worst = worstCaseNeurons(GLM, bodyOf(init), init);
    reset({ used: DEFAULT_CAP - worst + 1 });
    await assert.rejects(() => cfAiFetch(CHAT, init), (e) => isCfNeuronCapError(e));
    assert.equal(sentTo.length, 0);
    await settled();
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
    near(await usedToday(), neuronsForText(GLM, { promptTokens: 5000, completionTokens: 3000 }), "the pieces are not added on top of the last chunk's count");
    assert.equal(hash(HELD).size, 0);
});

test("a stream that is stopped in the middle is counted by its input and what its pieces add up to", async () => {
    reset();
    answer = async () => sse([firstChunk(5000), piece("Hello", 1500), piece(" there", 1500)], { breakAfter: true });
    await cfAiFetch(CHAT, chatInit({ stream: true }));
    await settled();
    near(await usedToday(), neuronsForText(GLM, { promptTokens: 5000, completionTokens: 3000 }), "the input from the first chunk and the 3,000 tokens written, not input only and not a guessed 1,024");
    assert.equal(hash(HELD).size, 0);
    // What the pieces add up to is never more than the request may write
    reset();
    answer = async () => sse([firstChunk(5000), piece("a", 6000), piece("b", 6000)], { breakAfter: true });
    await cfAiFetch(CHAT, chatInit({ stream: true })); // max_tokens 8192
    await settled();
    near(await usedToday(), neuronsForText(GLM, { promptTokens: 5000, completionTokens: 8192 }));
    // A provider that sends the running count with the input on every chunk: the largest one counts
    reset();
    answer = async () => sse([
        { choices: [{ delta: { content: "Hello" } }], usage: { prompt_tokens: 5000, completion_tokens: 3, total_tokens: 5003 } },
        { choices: [{ delta: { content: " there" } }], usage: { prompt_tokens: 5000, completion_tokens: 3000, total_tokens: 8000 } },
    ], { breakAfter: true });
    await cfAiFetch(CHAT, chatInit({ stream: true }));
    await settled();
    near(await usedToday(), neuronsForText(GLM, { promptTokens: 5000, completionTokens: 3000 }));
});

test("a stream that sends no usage is counted by what was written, never under the expected cost", async () => {
    reset();
    const init = chatInit({ stream: true });
    const long = "y".repeat(30000); // about 10,000 tokens written
    answer = async () => sse([{ choices: [{ delta: { content: long } }] }]);
    await cfAiFetch(CHAT, init);
    await settled();
    near(await usedToday(), neuronsForText(GLM, { promptTokens: promptTokensOf(bodyOf(init), init), completionTokens: 10000 }));
    reset();
    answer = async () => sse([{ choices: [{ delta: { content: "ok" } }] }]);
    await cfAiFetch(CHAT, init);
    await settled();
    near(await usedToday(), estimateRequestNeurons(GLM, bodyOf(init), init), "a short answer with no usage: the expected cost");
});

test("an answer whose usage reports no input is counted at the expected cost; input_tokens and output_tokens are read", async () => {
    const init = chatInit();
    const expected = estimateRequestNeurons(GLM, bodyOf(init), init);
    for (const usage of [{}, { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }, { completion_tokens: 50 }]) {
        reset();
        answer = async () => json({ usage });
        await cfAiFetch(CHAT, init);
        await settled();
        near(await usedToday(), expected, `usage ${JSON.stringify(usage)} (it was counted as nothing)`);
        assert.equal(hash(HELD).size, 0);
    }
    reset();
    answer = async () => json({ usage: { input_tokens: 2000, output_tokens: 300 } });
    await cfAiFetch(CHAT, init);
    await settled();
    near(await usedToday(), neuronsForText(GLM, { promptTokens: 2000, completionTokens: 300 }));
    // In a stream too: a first chunk with input_tokens is the input count
    reset();
    answer = async () => sse([{ choices: [{ delta: { content: "hi" } }], usage: { input_tokens: 4000, output_tokens: 0 } }, piece("there", 700)], { breakAfter: true });
    await cfAiFetch(CHAT, chatInit({ stream: true }));
    await settled();
    near(await usedToday(), neuronsForText(GLM, { promptTokens: 4000, completionTokens: 700 }));
});

test("a request that left and failed is counted; only what proves nothing ran is not; the room is always given back", async () => {
    const init = chatInit();
    const streamInit = chatInit({ stream: true });
    const expected = estimateRequestNeurons(GLM, bodyOf(init), init);
    const worst = worstCaseNeurons(GLM, bodyOf(init), init);
    const netError = (code) => { const e = new TypeError("fetch failed"); if (code) e.cause = Object.assign(new Error(code), { code }); return e; };
    const cases = [
        ["stopped after sending, no stream: the room held (the answer may be written anyway)", init, async () => { const e = new Error("This operation was aborted"); e.name = "AbortError"; throw e; }, worst],
        ["a headers timeout, no stream: the room held", init, async () => { throw netError("UND_ERR_HEADERS_TIMEOUT"); }, worst],
        ["stopped after sending, a stream: the expected cost", streamInit, async () => { const e = new Error("aborted"); e.name = "AbortError"; throw e; }, estimateRequestNeurons(GLM, bodyOf(streamInit), streamInit)],
        ["a failure with no reason given: the expected cost (it used to be nothing)", init, async () => { throw netError(); }, expected],
        ["the connection reset after sending: the expected cost", init, async () => { throw netError("ECONNRESET"); }, expected],
        ["no connection made: nothing", init, async () => { throw netError("ECONNREFUSED"); }, 0],
        ["the name not found: nothing", init, async () => { throw netError("ENOTFOUND"); }, 0],
        ["connect timeout: nothing", init, async () => { throw netError("UND_ERR_CONNECT_TIMEOUT"); }, 0],
    ];
    for (const [what, i, fail, counted] of cases) {
        reset();
        answer = fail;
        await assert.rejects(() => cfAiFetch(CHAT, i));
        await settled();
        near(await usedToday(), counted, what);
        assert.equal(hash(HELD).size, 0, `${what}: the room is given back`);
    }
    for (const [status, counted] of [[503, expected], [500, expected], [408, expected], [400, 0], [401, 0], [403, 0], [404, 0], [410, 0], [413, 0], [429, 0]]) {
        reset();
        answer = async () => new Response("no", { status });
        assert.equal((await cfAiFetch(CHAT, init)).status, status);
        await settled();
        near(await usedToday(), counted, `HTTP ${status}`);
        assert.equal(hash(HELD).size, 0);
    }
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

test("room held for a request that never reported back counts as used, and is counted in full when its time runs out", async () => {
    reset();
    hash(HELD).set("old", `3000|${Date.now() - 1000}|${GLM}`); // its time is over: its process stopped
    hash(HELD).set("live", `2000|${Date.now() + 60000}|${GLM}`);
    assert.equal(await spokenForToday(), 5000, "the old room still counts (it was dropped as if it cost nothing)");
    const hold = await holdNeurons(GLM, 1000); // (seeing it, the gate counts it)
    assert.ok(hold?.id);
    await settled();
    assert.equal(hash(HELD).has("old"), false);
    assert.equal(await usedToday(), 3000, "counted in full");
    assert.equal(hash(`cf:neurons:${DAY}:requests`).get(GLM), "1");
    assert.equal(await spokenForToday(), 6000, "3,000 counted + 2,000 and 1,000 held: nothing lost, nothing twice");
    await countAndRelease(GLM, 400, hold);
    assert.equal(await spokenForToday(), 5400);
    // An old hold written before this change (no model in it) is counted too
    reset();
    hash(HELD).set("older", `700|${Date.now() - 1000}`);
    await holdNeurons(GLM, 10);
    await settled();
    assert.equal(await usedToday(), 700);
    assert.equal(hash(`cf:neurons:${DAY}:models`).get("unknown"), "700");
});

test("a hold is counted once: its late answer replaces the full count, whichever comes first, and a step taken twice", async () => {
    // The sweep first, then the request reports back at last: its real cost replaces the full count
    reset();
    const hold = await holdNeurons(GLM, 3000);
    expire(DAY, hold.id);
    await holdNeurons(GLM, 10); // (sees it, counts it in full)
    await settled();
    assert.equal(await usedToday(), 3000);
    await countAndRelease(GLM, 400, hold);
    assert.equal(await usedToday(), 400, "the real cost stands, once");
    assert.equal(hash(`cf:neurons:${DAY}:requests`).get(GLM), "1");
    assert.equal(hash(HELD).has(hold.id), false);

    // Both at the same moment (two processes): one count stands
    reset();
    const h2 = await holdNeurons(GLM, 3000);
    expire(DAY, h2.id);
    await Promise.all([countAndRelease(GLM, 400, h2), holdNeurons(GLM, 10)]);
    await settled();
    assert.equal(await usedToday(), 400);
    assert.equal(hash(`cf:neurons:${DAY}:requests`).get(GLM), "1");

    // The step ran but its answer was lost, and it is tried again: counted once
    reset();
    const h3 = await holdNeurons(GLM, 3000);
    loseReplies = 1;
    await countAndRelease(GLM, 400, h3);
    assert.equal(await usedToday(), 400);
    assert.equal(hash(`cf:neurons:${DAY}:requests`).get(GLM), "1");
    // A sweep whose answer was lost and is tried again: once
    reset();
    const h4 = await holdNeurons(GLM, 3000);
    expire(DAY, h4.id);
    loseReplies = 0;
    const sweeper = holdNeurons(GLM, 10);
    await sweeper;
    loseReplies = 1; // (the sweep's own step)
    await settled(60);
    assert.equal(await usedToday(), 3000);
    assert.equal(hash(`cf:neurons:${DAY}:requests`).get(GLM), "1");
});

test("a count that cannot be written is tried again; if it never can, the room stays held and is counted later", async () => {
    reset();
    const hold = await holdNeurons(GLM, 3000);
    failExecs = 2; // two hiccups, then it goes through
    await countAndRelease(GLM, 400, hold);
    assert.equal(await usedToday(), 400);
    assert.equal(hash(HELD).has(hold.id), false);

    reset();
    const lost = await holdNeurons(GLM, 3000);
    failExecs = 10; // Redis never answers in time
    await countAndRelease(GLM, 400, lost);
    failExecs = 0;
    assert.equal(hash(HELD).has(lost.id), true, "never given back without its count");
    assert.equal(await spokenForToday(), 3000, "it still counts as used");
    expire(DAY, lost.id);
    await holdNeurons(GLM, 10);
    await settled();
    assert.equal(await usedToday(), 3000, "counted in full when its time runs out (it used to be lost)");
});

test("a count Redis lost is not forgotten: the database's copy and the process's memory keep the day", async () => {
    reset();
    await countAndRelease(GLM, 3000);
    await settled();
    assert.equal(kept.get(DAY), 3000, "the first count of the day is kept in the database at once");
    // Later counts are kept at most once a minute (here: 50 ms)
    DURABLE_WRITE.everyMs = 50;
    await countAndRelease(GLM, 1000);
    await countAndRelease(GLM, 1000);
    assert.equal(kept.get(DAY), 3000, "not written on every count");
    await settled(120);
    assert.equal(kept.get(DAY), 5000, "the last count is written when the minute is over");
    const writesSoFar = keptWrites;

    // Redis crashes and comes back with no count for the day, and the server processes start again too
    strings.delete(TOTAL);
    forgetCountsSeen();
    assert.equal(await spokenForToday(), 5000, "the day is not taken as unused (it read as 0)");
    await settled();
    assert.equal(await usedToday(), 5000, "Redis is raised back");
    const big = 5000;
    await assert.rejects(() => holdNeurons(GLM, big), (e) => isCfNeuronCapError(e), "5,000 + 5,000 does not fit");
    assert.ok(keptWrites >= writesSoFar);

    // Redis comes back from an older snapshot while the server keeps running: its memory keeps the day
    reset();
    keptDown = true; // (and the database cannot be reached)
    await countAndRelease(GLM, 6000);
    strings.set(TOTAL, "1000");
    assert.equal(await spokenForToday(), 6000);
    await settled();
    assert.equal(await usedToday(), 6000);

    // The database away and Redis lost the day: as before this copy, Redis's count alone (and a warning)
    reset();
    keptDown = true;
    strings.delete(TOTAL);
    assert.equal(await spokenForToday(), 0);
});

test("the first 30 minutes of a day see the room still held for requests sent before midnight", async (t) => {
    const midnight = Date.parse("2026-12-01T00:00:00.000Z");
    t.mock.timers.enable({ apis: ["Date"], now: midnight - 60000 });
    try {
        reset();
        const old = await holdNeurons(GLM, 9000); // sent at 23:59
        assert.equal(old.day, "2026-11-30");
        t.mock.timers.setTime(midnight + 10 * 60000); // 00:10
        assert.equal(await spokenForToday("2026-12-01", Date.now()), 9000);
        await assert.rejects(() => holdNeurons(GLM, 1000), (e) => isCfNeuronCapError(e), "9,000 held from before midnight + 1,000 does not fit");
        // It ends at 00:12 and is counted on the new day
        t.mock.timers.setTime(midnight + 12 * 60000);
        await countAndRelease(GLM, 2500, old);
        assert.equal(Number(strings.get("cf:neurons:2026-12-01")), 2500);
        assert.equal(await spokenForToday("2026-12-01", Date.now()), 2500);
        // A request sent before midnight that never reported back is counted on its own day once its time runs out
        reset();
        t.mock.timers.setTime(midnight - 60000);
        await holdNeurons(GLM, 4000);
        t.mock.timers.setTime(midnight + 10 * 60000);
        assert.equal(await spokenForToday("2026-12-01", Date.now()), 4000);
        t.mock.timers.setTime(midnight + 40 * 60000); // 00:40: its time ran out, it no longer counts for the new day
        assert.equal(await spokenForToday("2026-12-01", Date.now()), 0);
        await holdNeurons(GLM, 1000);
        await settled();
        assert.equal(Number(strings.get("cf:neurons:2026-11-30")), 4000, "counted in full on the day it was sent");
    } finally {
        t.mock.timers.reset();
    }
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

test("digits, symbols, base64 and hex count a token each; letters three bytes to a token", () => {
    const b64 = Buffer.from(Array.from({ length: 30000 }, (_, i) => (i * 7919) % 256)).toString("base64"); // 40,000 characters
    assert.ok(textTokens(b64) >= 40000, `base64 with no picture prefix: one token a character (${Math.round(textTokens(b64))}; it was counted as 13,334)`);
    const md = `Here it is: ![chart](data:image/png;base64,${b64})`;
    const inMarkdown = { model: GLM, messages: [{ role: "user", content: md }] };
    assert.ok(promptTokensOf(inMarkdown, { body: JSON.stringify(inMarkdown) }) >= 40000, "a picture inside markdown text is text");
    const csv = Array.from({ length: 4000 }, (_, i) => `${1000000 + i},${(i * 3.14159).toFixed(4)}`).join("\n");
    assert.ok(textTokens(csv) >= csv.replace(/\n/g, "").length, "a table of numbers: a token for every digit and comma");
    const hex = "a3f9".repeat(10000);
    assert.ok(textTokens(hex) >= 40000);
    // Plain words stay at three bytes a token: a long word and a path with no digit are not base64
    near(textTokens("international collaboration"), Buffer.byteLength("international collaboration") / 3);
    near(textTokens("supercalifragilisticexpialidociousword"), 38 / 3);
    assert.ok(textTokens("नमस्ते दुनिया") >= Buffer.byteLength("नमस्ते दुनिया") / 3 - 1e-9, "Devanagari: three bytes a token");
    assert.ok(textTokens("🙂🙂") >= 4, "an emoji: one token for every two bytes");
    // A GLM request carrying a base64 file: about 40,000 tokens of input in its room (it was about 13,400)
    const body = { model: GLM, max_tokens: 100, messages: [{ role: "user", content: b64 }] };
    assert.ok(worstCaseNeurons(GLM, body, { body: JSON.stringify(body) }) >= neuronsForText(GLM, { promptTokens: 40000, completionTokens: 100 }));
});

test("compressed audio is held by a low bitrate; a WAV by the rate in its header", () => {
    const webm = { body: Buffer.alloc(15000), headers: { "Content-Type": "audio/webm" } };
    near(audioSecondsOf(webm), 10, "15,000 bytes of webm: 10 seconds at 1,500 bytes a second (it was taken as 0.9)");
    near(worstCaseNeurons(WHISPER, null, webm), neuronsForAudio(WHISPER, 10));
    // A plain ArrayBuffer with no type, as the transcribe tool sends it
    near(audioSecondsOf({ body: new ArrayBuffer(3000) }), 2);
    // A 16 kHz 16-bit mono WAV: 32,000 bytes a second, from its header
    const wav = Buffer.alloc(320044);
    wav.write("RIFF", 0, "ascii"); wav.write("WAVE", 8, "ascii"); wav.writeUInt32LE(32000, 28);
    near(audioSecondsOf({ body: wav }), 320044 / 32000);
    // An 8 kHz 8-bit WAV: 8,000 bytes a second (taken as 16,000 before: half its length)
    const small = Buffer.alloc(80044);
    small.write("RIFF", 0, "ascii"); small.write("WAVE", 8, "ascii"); small.writeUInt32LE(8000, 28);
    near(audioSecondsOf({ body: small }), 80044 / 8000);
    // Said to be WAV, with no header to read: 16,000 bytes a second
    near(audioSecondsOf({ body: Buffer.alloc(16000), headers: new Headers({ "content-type": "audio/wav" }) }), 1);
});

test("with the cap on, a request that names no max_tokens is told the one its room was held for", async () => {
    const plain = { method: "POST", headers: { "content-type": "application/json", "content-length": "999" }, body: JSON.stringify({ model: GLM, messages: [{ role: "user", content: "hi" }] }) };
    reset();
    await cfAiFetch(CHAT, plain);
    const sent = sentInits.at(-1);
    assert.equal(JSON.parse(sent.body).max_tokens, 4096, "the 4,096 the room was held for");
    assert.equal(new Headers(sent.headers).get("content-length"), null, "the old length is not sent with the longer body");
    assert.equal(new Headers(sent.headers).get("content-type"), "application/json");
    // Its own limit is kept; max_completion_tokens and max_output_tokens count as one
    for (const own of [{ max_tokens: 50 }, { max_completion_tokens: 50 }, { max_output_tokens: 50 }]) {
        reset();
        const init = { method: "POST", body: JSON.stringify({ model: GLM, messages: [{ role: "user", content: "hi" }], ...own }) };
        await cfAiFetch(CHAT, init);
        assert.equal(sentInits.at(-1).body, init.body);
    }
    // With the cap off nothing is changed; embeddings are never changed
    reset({ on: false });
    await cfAiFetch(CHAT, plain);
    assert.equal(sentInits.at(-1).body, plain.body);
    reset();
    const emb = { method: "POST", body: JSON.stringify({ text: ["hello"] }) };
    await cfAiFetch(RUN("@cf/baai/bge-small-en-v1.5"), emb);
    assert.equal(sentInits.at(-1).body, emb.body);
    // n answers and max_output_tokens are part of the room held
    const one = { model: GLM, max_output_tokens: 1000, messages: [{ role: "user", content: "hi" }] };
    const three = { ...one, n: 3 };
    const out = (b) => worstCaseNeurons(GLM, b, { body: JSON.stringify(b) }) - neuronsForText(GLM, { promptTokens: promptTokensOf(b, { body: JSON.stringify(b) }) });
    near(out(one), neuronsForText(GLM, { completionTokens: 1000 }));
    near(out(three), neuronsForText(GLM, { completionTokens: 3000 }));
});

test("a model with no row is priced at the dearest of its kind", () => {
    const tokens = { promptTokens: 1000, cachedTokens: 500, completionTokens: 1000 };
    const unknown = neuronsForText("@cf/someone/new-model", tokens);
    for (const m of [GLM, "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b", "@cf/moonshotai/kimi-k2.7-code", "@cf/deepseek-ai/deepseek-v4-pro-0813"]) {
        assert.ok(unknown >= neuronsForText(m, tokens), `not under ${m}`);
    }
    assert.ok(neuronsForAudio("@cf/someone/new-whisper", 60) >= 472.73);
    assert.ok(neuronsForSpeech("@cf/deepgram/aura-3", 1000) >= 2727.27);
    // Deepgram's speech to text "flux" is audio, not a picture
    const upload = { body: Buffer.alloc(15000), headers: { "content-type": "audio/webm" } };
    assert.ok(worstCaseNeurons("@cf/deepgram/flux", null, upload) >= neuronsForAudio("@cf/deepgram/nova-3", 10));
    // A picture model with no row: the dearer of the two price shapes
    const size = { width: 1024, height: 1024 };
    assert.ok(neuronsForImage("@cf/black-forest-labs/flux-2-dev", size) >= neuronsForImage("@cf/black-forest-labs/flux-2-klein-9b", size));
    assert.ok(neuronsForImage("@cf/black-forest-labs/flux-2-dev", size) >= neuronsForImage("@cf/black-forest-labs/flux-1-schnell", size));
    // Kimi K2.5 is answered by K2.6, at K2.6's price
    near(neuronsForText("@cf/moonshotai/kimi-k2.5", tokens), neuronsForText("@cf/moonshotai/kimi-k2.6", tokens));
});

// ── The source: nothing reaches Cloudflare AI around the gate ──
const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const sources = (dir) => readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? (name === "node_modules" ? [] : sources(p)) : /\.(js|mjs|cjs)$/.test(name) ? [p] : [];
});

test("the source: every Cloudflare model named anywhere is priced (a row, or a kind priced by its name)", () => {
    const missing = [];
    for (const file of sources(SRC)) {
        for (const [id] of readFileSync(file, "utf8").matchAll(/@cf\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+/g)) {
            // (a removed model is never sent: it is swapped for its replacement first, which must be priced)
            const sentAs = CF_REPLACEMENTS[id] || id;
            if (!knownModel(sentAs)) missing.push(`${file}: ${id}`);
        }
    }
    assert.deepEqual([...new Set(missing)], []);
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
