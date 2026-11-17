// Cloudflare Workers AI: a daily Neuron cap for the whole account, and the meter behind it (owner, 2026-11-13).
//
// From 2026-12-01 Cloudflare bills Workers AI above 10,000 Neurons a day (every model of the account together: chat,
// voice to text, text to speech, images, embeddings). The super admin's Global AI Config has a switch: with the switch
// on, no request goes to Cloudflare unless the most it can cost still fits under the cap today (UTC day, like
// Cloudflare's); a request that does not fit is refused, and text work moves to Claude (cap-fallback.service.js).
// With the switch off nothing is refused, but the meter still counts, so the super admin sees what a day costs.
//
// Neurons are counted here from Cloudflare's own price list (developers.cloudflare.com/workers-ai/platform/pricing):
// text models by tokens, Whisper by audio minutes, Aura by characters, Flux by tiles and steps.
//
// How nothing passes the cap (owner, 2026-11-17: "carefully check all Cloudflare models ... so we are not charged"):
//   - Before a request is sent, room for the MOST it can cost is held in Redis (holdNeurons): its whole body as input
//     and its full max_tokens as output. The room held for every request on its way counts as used, so requests sent
//     at the same moment see each other, and the last request before the cap cannot carry the day past it. (Before
//     this, the check expected at most 1,024 answer tokens, left the tool list out, and saw nothing of the requests
//     on their way: one GLM 5.3 answer is about 3,500 Neurons, the margin is 500.)
//   - When the answer ends, its real cost replaces the held room in one step (countAndRelease). A stream that is
//     stopped is counted by what had arrived (its last usage, or the words written); a request stopped or timed out
//     before any answer is counted at its expected cost (a request without a stream: at the room held for it, since
//     Cloudflare may write its whole answer anyway). Nothing is ever counted as free.
//   - A count that cannot be read refuses (it never guesses zero), and a switch that cannot be read counts as on
//     unless it was last seen off (capSettings).
// The room held is on purpose more than a request usually costs (Cloudflare's prompt cache makes most rounds far
// cheaper than their size): near the cap, or with many requests at once, a request is refused a little early and
// Claude does that work. That is the price of never passing 10,000.
//
// Closed after a review of this file (2026-11-17; each is checked in tests/cf-neuron-cap.test.mjs):
//   - Room held for a request that never reports back (its process restarted, its count could not be written) is no
//     longer dropped when its 30 minutes are over: it is counted, in full, once (sweepHolds). Until then it counts as
//     used like any other held room.
//   - A count that cannot be written is tried again; a hold is only given back in the same Redis step as its count.
//   - A request that left and then failed (a server error, a connection lost after sending) is counted at its
//     expected cost; only an answer that proves nothing ran is counted as nothing (DNS, connection refused, 400...).
//   - An answer whose usage reports no input is counted at the expected cost, not as nothing.
//   - Redis keeps its data only in snapshots on this server: a Redis crash can bring back an older count, or none. The
//     day's count is also kept in the database (models/CfNeuronDay.js) and in each process's memory, and the day is
//     never counted as less than those (countedOf).
//   - Compressed audio, number-heavy text and a missing max_tokens could cost more than the room held for them.
//   - The first 30 minutes of a day also see the room still held for requests sent before midnight.
//   - A model with no price row is counted at the dearest price of its kind.
//   - A missing settings document no longer turns the cap off.
//
// Every request to Cloudflare AI goes through cfAiFetch(): this module also installs it as the process's fetch for
// Cloudflare AI addresses (globalThis.fetch), so the SDK clients (openai, groq-sdk: each is given fetch: cfAiFetch),
// the @classgrid/ai client and any plain fetch() are gated and counted too, once each, without every call site
// having to remember it. Nothing is counted twice: cfAiFetch sends with the fetch that was there before it was
// installed.
// Not covered, because nothing here uses them (tests/cf-neuron-cap.test.mjs fails when a source file starts to):
// Cloudflare's AI Gateway (gateway.ai.cloudflare.com), AI Search (/autorag/) and /ai/tomarkdown. A Worker with its
// own AI binding (env.AI) spends Neurons this meter never sees: there is none on the account (checked 2026-11-17).
import redis from "../config/redis.js";
import GlobalAiConfig from "../models/GlobalAiConfig.js";
import CfNeuronDay from "../models/CfNeuronDay.js";

// The cap is fixed: Cloudflare's free 10,000 Neurons a day, less a margin of 500 because this meter is an estimate
// (owner, 2026-11-13: never a number anyone can raise, and always under the free amount, so nothing is ever billed)
export const FREE_NEURONS_PER_DAY = 10000;
export const SAFETY_MARGIN = 500;
export const DEFAULT_CAP = FREE_NEURONS_PER_DAY - SAFETY_MARGIN;
const CONFIG_TTL_MS = 15000;
const KEEP_DAYS = 10;
// What a text answer is taken to be when its real usage cannot be read afterwards (the least that is counted for it)
const ASSUMED_OUTPUT_TOKENS = 1024;
// The most a text request may write when it names no max_tokens of its own (for the room held while it runs). With
// the cap on, the gate writes this into such a request, so Cloudflare is told the limit its room was held for.
const UNSET_MAX_OUTPUT_TOKENS = 4096;
// A picture in a request: a vision model reads it as a set number of tokens, not by its bytes (the most one takes)
const IMAGE_TOKENS = 6500;
// How long room stays held for a request that never reports back (its server stopped in the middle); after that it
// is counted in full
const HOLD_MS = 30 * 60 * 1000;
// The waits before a count that could not be written is tried again (a Redis hiccup)
export const COUNT_RETRY_WAITS_MS = [250, 1000];
// How often each process writes the day's count to the database, at most
export const DURABLE_WRITE = { everyMs: 60 * 1000 };

// Neurons per model: per million input / cached-input / output tokens, or per unit (minute, 1k characters, image)
const PER_M_TOKENS = {
    "@cf/deepseek-ai/deepseek-v4-pro-0813": { input: 120000, cached: 4000, output: 360000 },
    "@cf/deepseek-ai/deepseek-v4-flash-0731": { input: 40000, cached: 1273, output: 120000 },
    "@cf/deepseek-ai/deepseek-v4.1-flash-1017": { input: 27273, cached: 545, output: 109091 },
    "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b": { input: 45170, output: 443756 },
    "@cf/zai-org/glm-5.2": { input: 127273, cached: 23636, output: 400000 },
    "@cf/zai-org/glm-5.3": { input: 127273, cached: 23636, output: 400000 },
    "@cf/zai-org/glm-5.3-flash": { input: 13636, cached: 2727, output: 45455 },
    "@cf/zai-org/glm-4.7-flash": { input: 5500, output: 36400 },
    "@cf/qwen/qwen3.8-27b": { input: 40909, output: 290909 },
    "@cf/qwen/qwen3-30b-a3b-fp8": { input: 4625, output: 30475 },
    "@cf/google/gemma-4-26b-a4b-it": { input: 9091, output: 27273 },
    "@cf/meta/llama-3.2-11b-vision-instruct": { input: 4410, output: 61493 },
    "@cf/meta/llama-3.2-1b-instruct": { input: 2457, output: 18252 },
    "@cf/meta/llama-3.2-3b-instruct": { input: 4625, output: 30475 },
    "@cf/meta/llama-3.1-8b-instruct-fp8-fast": { input: 4119, output: 34868 },
    "@cf/meta/llama-3.3-70b-instruct-fp8-fast": { input: 26668, output: 204805 },
    "@cf/meta/llama-4-scout-17b-16e-instruct": { input: 24545, output: 77273 },
    "@cf/openai/gpt-oss-120b": { input: 31818, output: 68182 },
    "@cf/openai/gpt-oss-20b": { input: 18182, output: 27273 },
    "@cf/nvidia/nemotron-3-120b-a12b": { input: 45455, output: 136364 },
    // (Cloudflare has answered requests to K2.5 with K2.6, at K2.6's price, since 30 May 2026)
    "@cf/moonshotai/kimi-k2.5": { input: 86364, cached: 14545, output: 363636 },
    "@cf/moonshotai/kimi-k2.6": { input: 86364, cached: 14545, output: 363636 },
    "@cf/moonshotai/kimi-k2.7-code": { input: 86364, cached: 17273, output: 363636 },
    "@cf/mistralai/mistral-small-3.1-24b-instruct": { input: 31876, output: 50488 },
    "@cf/moondream/moondream3.1-9B-A2B": { input: 27273, output: 90909 },
    "@cf/baai/bge-small-en-v1.5": { input: 1841, output: 0 },
    "@cf/baai/bge-base-en-v1.5": { input: 6058, output: 0 },
    "@cf/baai/bge-large-en-v1.5": { input: 18582, output: 0 },
    "@cf/baai/bge-m3": { input: 1075, output: 0 },
    "@cf/qwen/qwen3-embedding-0.6b": { input: 1075, output: 0 },
    "@cf/baai/bge-reranker-base": { input: 283, output: 0 },
};
const PER_AUDIO_MINUTE = { "@cf/openai/whisper-large-v3-turbo": 46.63, "@cf/openai/whisper": 41.14, "@cf/deepgram/nova-3": 472.73 };
const PER_1K_CHARS = { "@cf/deepgram/aura-2-en": 2727.27, "@cf/deepgram/aura-2-es": 2727.27, "@cf/deepgram/aura-1": 1363.64 };
// Flux: schnell by 512x512 tiles and steps; klein 9B by the first megapixel (1024x1024) and the next ones
const FLUX_SCHNELL = { tile: 4.8, step: 9.6, defaultSteps: 4 };
const FLUX_KLEIN_9B = { firstMp: 1363.64, nextMp: 181.82 };
// A model with no row is counted at the dearest price of its kind, worked out from the rows (an unknown model must
// never be counted too low). For text that is the dearest input and the dearest output of any row, and its cached
// input at the full input price (an unknown model is not taken to discount it). (The comment here said DeepSeek V4
// Pro was the dearest chat model; GLM 5.3, R1 and Kimi are dearer: a review, 2026-11-17.)
const TEXT_ROWS = Object.values(PER_M_TOKENS);
const DEAREST_INPUT = Math.max(...TEXT_ROWS.map((r) => r.input));
const UNKNOWN_TEXT = { input: DEAREST_INPUT, cached: DEAREST_INPUT, output: Math.max(...TEXT_ROWS.map((r) => r.output)) };
const UNKNOWN_AUDIO_MINUTE = Math.max(...Object.values(PER_AUDIO_MINUTE));
const UNKNOWN_1K_CHARS = Math.max(...Object.values(PER_1K_CHARS));
const rateOf = (model) => PER_M_TOKENS[model] || UNKNOWN_TEXT;
// Audio by its upload's length. A WAV says its own byte rate in its header; a WAV without a readable one is taken at
// 16,000 bytes a second (16 kHz 16-bit mono, what the voice features send, is 32,000: it is held at twice its length,
// and an 8 kHz one at its length). Anything else (webm, ogg, mp3, m4a: compressed, as the voice note and voice mode
// uploads are) is taken at 1,500 bytes a second, about the lowest bitrate speech is sent at, so its length is never
// guessed short (it was taken as WAV before: a 10 MB webm was held at a quarter of its length or less).
const WAV_BYTES_PER_SECOND = 16000;
const COMPRESSED_BYTES_PER_SECOND = 1500;

export class CfNeuronCapError extends Error {
    constructor(used, cap, reason) {
        super(reason === "unreadable"
            ? "Cloudflare AI is paused: today's Neuron count could not be read, so nothing is sent to Cloudflare while the daily cap is on"
            : `Cloudflare AI is paused for today: ${Math.round(used)} of ${cap} Neurons used (the cap in Global AI Config; it resets at 00:00 UTC)`);
        this.name = "CfNeuronCapError";
        this.code = "cf_neuron_cap";
        this.status = 429;
        this.rateLimited = false; // (not a "try again in a minute" error: the chat moves to another provider at once)
    }
}
export const isCfNeuronCapError = (e) => !!e && (e.code === "cf_neuron_cap" || e.name === "CfNeuronCapError");

const sleep = (ms) => new Promise((r) => { const t = setTimeout(r, ms); t.unref?.(); });
// (a warning that could repeat on every request is written once a minute at most)
const warnedAt = new Map();
const warnSometimes = (key, ...line) => {
    if (Date.now() - (warnedAt.get(key) || 0) < 60000) return;
    warnedAt.set(key, Date.now());
    console.warn(...line);
};

// ── Settings (Global AI Config, cached for a few seconds) ─────────────────────────────────────────────────────────
// (`read`: this process has read the switch from the database at least once)
let cached = { at: 0, enabled: false, cap: DEFAULT_CAP, read: false };
const SWITCH_KEY = "cf:neurons:cap:switch"; // the switch as the last process read it: "on" or "off"
export async function capSettings() {
    if (Date.now() - cached.at < CONFIG_TTL_MS) return cached;
    let found;
    try {
        const c = await GlobalAiConfig.findOne({ key: "singleton" }).select("cf_neuron_cap_enabled").lean();
        // Only a switch really set to on or off counts as read. A missing settings document (a database restored or
        // moved without it: the Atlas move is the same week as the switch-on) or one without the field is treated
        // like a database that cannot be read, never as "off" (a review, 2026-11-17: it was read as off, and that
        // "off" was even left in Redis for the other processes)
        if (typeof c?.cf_neuron_cap_enabled === "boolean") found = c.cf_neuron_cap_enabled;
        else warnSometimes("no-switch", "[cf-neurons] the settings document has no daily cap switch: it is treated as unreadable (never as off)");
    } catch { /* the database could not be read */ }
    if (found !== undefined) {
        if (!cached.read || cached.enabled !== found) {
            try { Promise.resolve(redis.set(SWITCH_KEY, found ? "on" : "off")).catch(() => {}); } catch { /* Redis away */ }
        }
        cached = { at: Date.now(), enabled: found, cap: DEFAULT_CAP, read: true };
        return cached;
    }
    // The switch could not be read. Another process that read it "on" (left in Redis) wins. Otherwise what this process
    // read last stays; a process that has not read it yet takes what the last process left in Redis; with nothing
    // there either (or Redis away too), the cap counts as ON: nothing goes to Cloudflare on a guess (owner,
    // 2026-11-17: "so we are not charged").
    let left;
    try { left = await redis.get(SWITCH_KEY); } catch { left = undefined; }
    const enabled = left === "on" ? true : cached.read ? cached.enabled : left !== "off";
    cached = { ...cached, enabled, at: Date.now() };
    return cached;
}
export const forgetCapSettings = () => { cached = { ...cached, at: 0 }; };

// ── The meter (Redis, one UTC day per key, like Cloudflare's free allocation) ─────────────────────────────────────
export const utcDay = (d = new Date()) => d.toISOString().slice(0, 10);
const dayStart = (day) => Date.parse(`${day}T00:00:00.000Z`);
const dayBefore = (day) => utcDay(new Date(dayStart(day) - 86400000));
const totalKey = (day) => `cf:neurons:${day}`;
const modelsKey = (day) => `cf:neurons:${day}:models`;
const requestsKey = (day) => `cf:neurons:${day}:requests`;
// Which held rooms were already counted (hold id -> "how|neurons|model|day"): a hold is counted once, by whoever
// comes first, its request reporting back or the sweep after its time ran out (another process included)
const doneKey = (day) => `cf:neurons:${day}:done`;
const liftKey = (day, to) => `cf:neurons:${day}:lift:${to}`;
const TTL = KEEP_DAYS * 86400;

/** Today's Neurons so far, as Redis has them. Throws when Redis cannot answer: the gate then refuses. */
export async function usedToday(day = utcDay()) {
    return Number(await redis.get(totalKey(day))) || 0;
}
export async function usageToday(day = utcDay()) {
    const out = { day, used: 0, byModel: [] };
    try {
        const [used, models, requests] = await Promise.all([redis.get(totalKey(day)), redis.hgetall(modelsKey(day)), redis.hgetall(requestsKey(day))]);
        out.used = Number(used) || 0;
        out.byModel = Object.entries(models || {})
            .map(([model, n]) => ({ model, neurons: Math.round(Number(n) || 0), requests: Number(requests?.[model]) || 0 }))
            .sort((a, b) => b.neurons - a.neurons);
    } catch { /* Redis away: nothing to show */ }
    return out;
}

// ── The day's count kept beyond Redis (a review, 2026-11-17) ────────────────────────────────────────────────────
// Redis on this server keeps its data only in snapshots (every few minutes, no append-only file), so a Redis crash
// can bring the day's count back lower than it was, or not at all, and the gate would then let the day pass 10,000.
// So the day is never counted as less than the highest count this process has seen (its memory: covers Redis
// restarting under a running server) and the copy in the database (covers the whole machine restarting). Each process
// writes its highest count there on its first count of a day and then at most once a minute, never in a request's
// way. When Redis is found lower, it is raised back once (liftIfLost), so every process and the dashboard see it.
const seenTotal = new Map(); // day -> the highest count this process has read or written
const durable = new Map(); // day -> { used, at, ok, loading }: the database's copy, read at most once a minute
const writes = new Map(); // day -> { at, pending, timer }
const lifting = new Set();
const keepRecent = (map, onDrop) => {
    const old = [...map.keys()].sort().slice(0, Math.max(0, map.size - 3));
    for (const k of old) { onDrop?.(map.get(k)); map.delete(k); }
};
/** Forgets what this process remembers of the days' counts (tests, a process starting) */
export function forgetCountsSeen() {
    seenTotal.clear();
    durable.clear();
    for (const w of writes.values()) clearTimeout(w.timer);
    writes.clear();
    lifting.clear();
    warnedAt.clear();
    sweeping.clear();
    sweptDays.clear();
}
const databaseReady = () => CfNeuronDay?.db?.readyState === 1;
const withTimeout = (promise, ms) => Promise.race([promise, new Promise((_, no) => { const t = setTimeout(() => no(new Error(`no answer in ${ms} ms`)), ms); t.unref?.(); })]);

function seeTotal(day, total) {
    const t = Number(total) || 0;
    if (t > (seenTotal.get(day) || 0)) seenTotal.set(day, t);
    keepRecent(seenTotal);
}
// A count was written and Redis answered with the day's new total
function noteTotal(day, total) {
    const t = Number(total) || 0;
    if (!(t > 0)) return;
    seeTotal(day, t);
    let w = writes.get(day);
    if (!w) {
        w = { at: 0, pending: 0, timer: null };
        writes.set(day, w);
        keepRecent(writes, (old) => clearTimeout(old?.timer));
    }
    w.pending = Math.max(w.pending, t);
    const wait = w.at ? w.at + DURABLE_WRITE.everyMs - Date.now() : 0;
    if (wait <= 0) writeDurable(day, w).catch(() => {});
    else if (!w.timer) {
        w.timer = setTimeout(() => { w.timer = null; writeDurable(day, w).catch(() => {}); }, wait);
        w.timer.unref?.();
    }
}
async function writeDurable(day, w) {
    const used = w.pending;
    if (!(used > 0)) return;
    w.at = Date.now();
    w.pending = 0;
    const again = () => {
        w.pending = Math.max(w.pending, used);
        if (!w.timer) {
            w.timer = setTimeout(() => { w.timer = null; writeDurable(day, w).catch(() => {}); }, DURABLE_WRITE.everyMs);
            w.timer.unref?.();
        }
    };
    if (!databaseReady()) {
        warnSometimes("durable-write", "[cf-neurons] the database is not connected: the day's count is kept in Redis only for now");
        return again();
    }
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            await withTimeout(CfNeuronDay.updateOne({ day }, { $max: { used } }, { upsert: true }), 5000);
            const d = durable.get(day);
            if (d && used > d.used) d.used = used;
            return;
        } catch (e) {
            // (two processes making the day's document at the same moment: one of them is told it exists; once more)
            if (e?.code === 11000 && attempt === 0) continue;
            warnSometimes("durable-write", "[cf-neurons] could not keep the day's count in the database:", e?.message || e);
            return again();
        }
    }
}
function readDurable(day, d) {
    if (d.loading) return d.loading;
    d.loading = (async () => {
        try {
            if (!databaseReady()) throw new Error("the database is not connected");
            const doc = await withTimeout(CfNeuronDay.findOne({ day }).select("used").lean(), 2000);
            d.used = Math.max(d.used, Number(doc?.used) || 0);
            d.ok = true;
        } catch (e) {
            d.ok = false;
            // (behaves as before this copy existed: Redis's count alone, and this process's memory)
            warnSometimes("durable-read", `[cf-neurons] could not read the day's count kept in the database (${e?.message || e}): Redis's count is used alone`);
        } finally {
            d.at = Date.now();
            d.loading = null;
        }
    })();
    return d.loading;
}
/** The least the day can have used: what this process has seen, and the database's copy */
async function floorOf(day) {
    let d = durable.get(day);
    if (!d) {
        d = { used: 0, at: 0, ok: false, loading: null };
        durable.set(day, d);
        keepRecent(durable);
    }
    // (the first time a process needs a day it waits for the copy, once; then it is read again in the background, every
    // minute, or every 5 seconds while the database cannot be read)
    if (!d.at) await readDurable(day, d);
    else if (Date.now() - d.at > (d.ok ? DURABLE_WRITE.everyMs : 5000)) readDurable(day, d).catch(() => {});
    return Math.max(seenTotal.get(day) || 0, d.used);
}
function liftIfLost(day, redisTotal, floor) {
    const to = Math.ceil(floor);
    const key = `${day}:${to}`;
    if (lifting.has(key)) return;
    lifting.add(key);
    (async () => {
        // (once for each count it is raised to, whichever process gets there first)
        const [first, now] = await execOrThrow(redis.multi().set(liftKey(day, to), "1", "EX", 2 * 86400, "NX").get(totalKey(day)));
        if (first !== "OK") return;
        const add = floor - (Number(now) || 0);
        if (!(add > 0)) return;
        await execOrThrow(redis.multi().incrbyfloat(totalKey(day), add).expire(totalKey(day), TTL));
        console.warn(`[cf-neurons] Redis had ${Math.round(Number(now) || 0)} Neurons for ${day}, but ${Math.round(floor)} had been counted (Redis lost data): raised back by ${Math.round(add)}`);
    })().catch((e) => {
        lifting.delete(key);
        warnSometimes("lift", "[cf-neurons] could not raise the day's count back in Redis:", e?.message || e);
    });
}
/** The day's count: Redis's, never less than what was seen or kept before */
async function countedOf(day, raw) {
    const inRedis = Number(raw) || 0;
    seeTotal(day, inRedis);
    const floor = await floorOf(day);
    if (floor > inRedis + 1) liftIfLost(day, inRedis, floor);
    return Math.max(inRedis, floor);
}

// ── Room held for requests on their way ─────────────────────────────────────────────────────────────────────────
// One Redis hash a day: hold id -> "neurons|until|model" (until: the time after which a request that never reported
// back is taken as lost, and its room is counted in full).
const heldKey = (day) => `cf:neurons:${day}:held`;
let holdNo = 0;
const newHoldId = () => `${process.pid}.${Date.now().toString(36)}.${(holdNo++).toString(36)}`;
const holdValue = (neurons, until, model) => `${neurons}|${until}|${model || "unknown"}`;
const parseHold = (value) => {
    const [neurons, until, model] = String(value).split("|");
    return { neurons: Number(neurons) || 0, until: Number(until) || 0, model: model || "unknown" };
};
// all: every hold (one whose time ran out still counts until it is counted); live: those whose time has not run out
const heldOf = (all, now) => {
    let total = 0;
    let live = 0;
    const expired = [];
    for (const [id, value] of Object.entries(all || {})) {
        const h = parseHold(value);
        total += h.neurons;
        if (h.until > now) live += h.neurons; else expired.push([id, h]);
    }
    return { all: total, live, expired };
};
const execOrThrow = async (multi) => {
    const r = await multi.exec();
    const failed = Array.isArray(r) ? r.find((x) => x?.[0]) : null;
    if (!Array.isArray(r) || failed) throw (failed?.[0] || new Error("no answer from Redis"));
    return r.map((x) => x[1]);
};
// A refused request's own room (nothing was sent): given back, tried a few times. If Redis never answers, the room
// stays and is counted when its time runs out: too much, never too little.
async function dropOwnHold(day, id) {
    for (let attempt = 0; attempt <= COUNT_RETRY_WAITS_MS.length; attempt++) {
        try { await redis.hdel(heldKey(day), id); return; } catch { if (attempt < COUNT_RETRY_WAITS_MS.length) await sleep(COUNT_RETRY_WAITS_MS[attempt]); }
    }
}

/**
 * Writes one count in one Redis step, tried again on a Redis hiccup (COUNT_RETRY_WAITS_MS). `claim` is the held room
 * this count stands for ({ day, id, how }: "counted" when its request reported back, "swept" when its time ran out):
 * the room is given back in the same step, and a hold is counted once. If the hold was counted already (its time ran
 * out and it was counted in full, or this same step was done before and only its answer was lost), the earlier
 * count is taken back: the request's own count replaces the sweep's, and a sweep that came second takes back its
 * own. Returns "counted", "already" (the hold had been counted: this count was taken back or replaced the earlier
 * one), or false when nothing could be written; the hold is then still held, and counted when its time runs out.
 */
async function writeCount(countDay, model, neurons, claim = null) {
    const n = Number(neurons);
    const amount = Number.isFinite(n) && n > 0 ? n : 0;
    const name = model || "unknown";
    for (let attempt = 0; ; attempt++) {
        try {
            const m = redis.multi();
            const at = {};
            let i = 0;
            if (claim) {
                at.before = i++; m.hget(doneKey(claim.day), claim.id);
                at.first = i++; m.hsetnx(doneKey(claim.day), claim.id, `${claim.how}|${amount}|${name}|${countDay}`);
                i++; m.expire(doneKey(claim.day), 2 * 86400);
            }
            if (amount > 0) {
                at.total = i++; m.incrbyfloat(totalKey(countDay), amount);
                i += 5; m.expire(totalKey(countDay), TTL).hincrbyfloat(modelsKey(countDay), name, amount).expire(modelsKey(countDay), TTL)
                    .hincrby(requestsKey(countDay), name, 1).expire(requestsKey(countDay), TTL);
            }
            if (claim) m.hdel(heldKey(claim.day), claim.id);
            const r = await execOrThrow(m);
            if (!claim || Number(r[at.first]) === 1) {
                if (amount > 0) noteTotal(countDay, r[at.total]);
                return "counted";
            }
            // Counted already: take back the count that does not stand
            if (claim.how === "swept") await takeBack(countDay, name, amount);
            else {
                const [, was, wasModel, wasDay] = String(r[at.before] || "").split("|");
                if (Number(was) > 0) await takeBack(wasDay || claim.day, wasModel || name, Number(was));
                await Promise.resolve(redis.hset(doneKey(claim.day), claim.id, `${claim.how}|${amount}|${name}|${countDay}`)).catch(() => {});
            }
            return "already";
        } catch (e) {
            if (attempt >= COUNT_RETRY_WAITS_MS.length) {
                console.warn(`[cf-neurons] could not count ${Math.round(amount)} Neurons of ${name} after ${attempt + 1} tries:`, e?.message || e);
                return false;
            }
            await sleep(COUNT_RETRY_WAITS_MS[attempt]);
        }
    }
}
// (a count that does not stand; if this cannot be written the day stays counted too high: too much, never too little)
async function takeBack(day, model, neurons) {
    if (!(neurons > 0)) return;
    for (let attempt = 0; attempt <= COUNT_RETRY_WAITS_MS.length; attempt++) {
        try {
            await execOrThrow(redis.multi().incrbyfloat(totalKey(day), -neurons).hincrbyfloat(modelsKey(day), model, -neurons).hincrby(requestsKey(day), model, -1));
            return;
        } catch {
            if (attempt < COUNT_RETRY_WAITS_MS.length) await sleep(COUNT_RETRY_WAITS_MS[attempt]);
        }
    }
}
/**
 * Counts, in full, the held room of requests that never reported back (their time ran out): each once, in the day it
 * was held for, whichever process gets there first. In the background; until then the room still counts as used.
 */
const sweeping = new Set(); // (holds this process is counting right now: not started twice)
function sweepHolds(day, expired) {
    for (const [id, h] of expired || []) {
        if (sweeping.has(id)) continue;
        sweeping.add(id);
        writeCount(day, h.model, h.neurons, { day, id, how: "swept" })
            .then((done) => { if (done === "counted") console.warn(`[cf-neurons] a request of ${h.model} held ${Math.round(h.neurons)} Neurons for ${day} and never reported back: counted in full`); })
            .catch(() => {})
            .finally(() => sweeping.delete(id));
    }
}
// After the first 30 minutes of a day, what is still held for the day before has run out: counted, once per process
const sweptDays = new Set();
function sweepDayOnce(day, now) {
    if (sweptDays.has(day)) return;
    sweptDays.add(day);
    if (sweptDays.size > 5) sweptDays.delete([...sweptDays][0]);
    Promise.resolve(redis.hgetall(heldKey(day)))
        .then((all) => sweepHolds(day, heldOf(all, now).expired))
        .catch(() => sweptDays.delete(day));
}

/**
 * Today's Neurons that are spoken for: counted so far (never less than what was seen or kept before), plus the room
 * held for requests on their way (a hold whose time ran out still counts until it is counted), plus, in the first
 * 30 minutes of the day, the room still held for requests sent before midnight (they are counted on the day they
 * end). Throws when Redis cannot answer (the callers then refuse; nothing is guessed).
 */
export async function spokenForToday(day = utcDay(), now = Date.now()) {
    const nearMidnight = now - dayStart(day) < HOLD_MS;
    const m = redis.multi().get(totalKey(day)).hgetall(heldKey(day));
    if (nearMidnight) m.hgetall(heldKey(dayBefore(day)));
    const [used, all, before] = await execOrThrow(m);
    return (await countedOf(day, used)) + heldOf(all, now).all + (nearMidnight ? heldOf(before, now).live : 0);
}

/**
 * Takes room for a request before it is sent: `worst` is the most it can cost (a number, or a function that gives
 * it: called only while the cap is on, so a request's body is not read for nothing). With the cap off nothing is held
 * (null). With the cap on, the hold is written first and the day's count and every hold are read in the same Redis
 * step, so two requests sent together cannot both take the last room. Throws CfNeuronCapError when the room is not
 * there, or when Redis cannot answer. The hold is given back by countAndRelease().
 */
export async function holdNeurons(model = "", worst = 0) {
    const s = await capSettings();
    if (!s.enabled) return null;
    const now = Date.now();
    const day = utcDay(new Date(now));
    const before = dayBefore(day);
    const nearMidnight = now - dayStart(day) < HOLD_MS;
    const id = newHoldId();
    const name = model || "unknown";
    const want = Math.max(0, Number(typeof worst === "function" ? worst() : worst) || 0);
    let used = 0;
    let held = 0;
    let expired = [];
    let expiredBefore = [];
    try {
        const m = redis.multi()
            .hset(heldKey(day), id, holdValue(want, now + HOLD_MS, name)).expire(heldKey(day), TTL)
            .get(totalKey(day)).hgetall(heldKey(day));
        if (nearMidnight) m.hgetall(heldKey(before));
        const [, , usedNow, all, allBefore] = await execOrThrow(m);
        used = await countedOf(day, usedNow);
        const today = heldOf(all, now);
        held = today.all; // (this request's own hold is in it)
        expired = today.expired;
        if (nearMidnight) {
            const y = heldOf(allBefore, now);
            held += y.live;
            expiredBefore = y.expired;
        }
    } catch (e) {
        dropOwnHold(day, id);
        console.warn(`[cf-neurons] refused ${model || "a request"}: today's count could not be read (${e?.message || e})`);
        throw new CfNeuronCapError(0, s.cap, "unreadable");
    }
    sweepHolds(day, expired);
    if (nearMidnight) sweepHolds(before, expiredBefore); else sweepDayOnce(before, now);
    if (used + held > s.cap) {
        dropOwnHold(day, id);
        console.warn(`[cf-neurons] refused ${model || "a request"}: ${Math.round(used)} used + ${Math.round(held - want)} held for requests on their way + ${Math.round(want)} this one can cost > ${s.cap} Neurons today`);
        throw new CfNeuronCapError(used, s.cap);
    }
    return { id, day, neurons: want, model: name };
}

/**
 * Adds a request's real `neurons` to today's count and gives its held room back, in one Redis step, tried again on a
 * Redis hiccup. Never throws. If it cannot be written, the room stays held and is counted in full when its time runs
 * out (a hold is never given back without its count).
 */
export async function countAndRelease(model, neurons, hold = null) {
    const n = Number(neurons);
    const counts = Number.isFinite(n) && n > 0;
    if (!counts && !hold) return;
    const ok = await writeCount(utcDay(), model, counts ? n : 0, hold ? { day: hold.day, id: hold.id, how: "counted" } : null);
    if (!ok && hold) console.warn(`[cf-neurons] the room held for this ${model || "request"} stays held, and is counted in full when its time runs out`);
}
/** Adds `neurons` of `model` to today's count (never throws) */
export const addNeurons = (model, neurons) => countAndRelease(model, neurons);

// ── Neurons from what a request used ─────────────────────────────────────────────────────────────────────────────
export function neuronsForText(model, { promptTokens = 0, cachedTokens = 0, completionTokens = 0 } = {}) {
    const r = rateOf(model);
    const fresh = Math.max(0, (Number(promptTokens) || 0) - (Number(cachedTokens) || 0));
    return (fresh * r.input + (Number(cachedTokens) || 0) * (r.cached ?? r.input) + (Number(completionTokens) || 0) * r.output) / 1e6;
}
export const neuronsForAudio = (model, seconds) => ((Number(seconds) || 0) / 60) * (PER_AUDIO_MINUTE[model] ?? UNKNOWN_AUDIO_MINUTE);
export const neuronsForSpeech = (model, characters) => ((Number(characters) || 0) / 1000) * (PER_1K_CHARS[model] ?? UNKNOWN_1K_CHARS);
export function neuronsForImage(model, { width = 1024, height = 1024, steps } = {}) {
    const w = Number(width) || 1024, h = Number(height) || 1024;
    const klein = () => FLUX_KLEIN_9B.firstMp + Math.max(0, (w * h) / (1024 * 1024) - 1) * FLUX_KLEIN_9B.nextMp;
    const schnell = () => Math.ceil(w / 512) * Math.ceil(h / 512) * FLUX_SCHNELL.tile + (Number(steps) || FLUX_SCHNELL.defaultSteps) * FLUX_SCHNELL.step;
    if (/flux-2-klein-9b/.test(model)) return klein();
    if (/flux-1-schnell/.test(model)) return schnell();
    return Math.max(klein(), schnell()); // (a picture model with no row: the dearer of the two)
}
// A usage's numbers, under either name Cloudflare's endpoints use
const inputOf = (u) => Number(u?.prompt_tokens ?? u?.input_tokens ?? u?.promptTokens) || 0;
const outputOf = (u) => Number(u?.completion_tokens ?? u?.output_tokens ?? u?.completionTokens) || 0;
const cachedOf = (u) => Number(u?.prompt_tokens_details?.cached_tokens ?? u?.input_tokens_details?.cached_tokens ?? u?.cached_tokens ?? u?.cachedTokens) || 0;
// (a usage that reports no input says nothing about what the request cost: empty, or all zero)
const usageReadable = (u) => inputOf(u) > 0;
const usageNeurons = (model, usage) => neuronsForText(model, { promptTokens: inputOf(usage), cachedTokens: cachedOf(usage), completionTokens: outputOf(usage) });
/** Counts a text answer from its usage */
export const meterText = (model, usage) => addNeurons(model, usageNeurons(model, usage));

// What a model is, by its row, else by its name (a model with no row is counted at the dearest price of that kind):
// speech (Aura), audio (Whisper, Nova and Deepgram's other speech to text models, whose "flux" is not a picture
// model), picture, or else text
const SPEECH_RE = /aura|melotts|\btts\b/i;
const AUDIO_RE = /whisper|nova-\d|^@cf\/deepgram\/(?!aura)/i;
const IMAGE_RE = /flux|stable-diffusion|dreamshaper|sdxl|img2img|inpainting|lucid-origin|phoenix/i;
const kindOf = (model) => PER_1K_CHARS[model] ? "speech"
    : PER_AUDIO_MINUTE[model] ? "audio"
    : PER_M_TOKENS[model] ? "text"
    : SPEECH_RE.test(model) ? "speech" : AUDIO_RE.test(model) ? "audio" : IMAGE_RE.test(model) ? "image" : "text";
/** A model this meter has a row for, or a kind it prices by (speech, audio, pictures); a text model needs a row */
export const knownModel = (model) => !!(PER_M_TOKENS[model] || PER_AUDIO_MINUTE[model] || PER_1K_CHARS[model]) || kindOf(model) !== "text";

const bodyBytes = (init) => Number(init?.body?.byteLength ?? init?.body?.size ?? init?.body?.length) || 0;
const headerOf = (init, name) => {
    const h = init?.headers;
    if (!h) return "";
    if (typeof h.get === "function") return h.get(name) || "";
    const pairs = Array.isArray(h) ? h : Object.entries(h);
    const hit = pairs.find(([k]) => String(k).toLowerCase() === name);
    return hit ? String(hit[1] || "") : "";
};
const firstBytes = (body, count) => {
    if (!body) return null;
    if (body instanceof Uint8Array) return body.subarray(0, count);
    if (body instanceof ArrayBuffer) return new Uint8Array(body, 0, Math.min(count, body.byteLength));
    if (ArrayBuffer.isView(body)) return new Uint8Array(body.buffer, body.byteOffset, Math.min(count, body.byteLength));
    return null;
};
const ascii = (bytes, from, to) => String.fromCharCode(...bytes.subarray(from, to));
/** How long an audio upload is, never guessed short (see WAV_BYTES_PER_SECOND) */
export function audioSecondsOf(init) {
    const bytes = bodyBytes(init);
    const head = firstBytes(init?.body, 44);
    if (head && head.length >= 32 && ascii(head, 0, 4) === "RIFF" && ascii(head, 8, 12) === "WAVE") {
        const rate = head[28] | (head[29] << 8) | (head[30] << 16) | (head[31] * 16777216);
        return bytes / (rate >= 2000 && rate <= 1536000 ? rate : WAV_BYTES_PER_SECOND);
    }
    if (/audio\/(wav|wave|x-wav|vnd\.wave|l16|pcm)/i.test(headerOf(init, "content-type"))) return bytes / WAV_BYTES_PER_SECOND;
    return bytes / COMPRESSED_BYTES_PER_SECOND;
}

// Text that tokenizes densely (a review, 2026-11-17): digits, symbols and runs like base64 or hex come to about one
// token for every one or two characters, not three bytes, so they count one token each (a symbol of more than two
// bytes, like an emoji, one for every two bytes); letters, their marks and spaces count three bytes to a token
// (English runs at about four, Devanagari at about three). A run counts as base64 or hex when it is 24 characters or
// more of letters, digits and + / = _ - with both a letter and a digit in it.
const DENSE_RUN_RE = /[A-Za-z0-9+/=_-]{24,}/g;
const NOT_LETTER_RE = /[^\p{L}\p{M}\s]/gu;
export function textTokens(s) {
    let tokens = 0;
    const rest = String(s).replace(DENSE_RUN_RE, (run) => {
        if (!/[0-9]/.test(run) || !/[A-Za-z]/.test(run)) return run;
        tokens += run.length;
        return " ";
    });
    const letters = rest.replace(NOT_LETTER_RE, (ch) => {
        tokens += Math.max(1, Buffer.byteLength(ch, "utf8") / 2);
        return "";
    });
    return tokens + Buffer.byteLength(letters, "utf8") / 3;
}
/**
 * The input tokens of a text request, from its body, never too low: the whole body counts (the messages, the tool
 * list, every field: each text by textTokens, and a few tokens for each field and list around it), and a picture
 * counts as IMAGE_TOKENS in place of its bytes.
 */
export function promptTokensOf(body, init) {
    if (!body || typeof body !== "object") {
        const raw = init?.body;
        return Math.ceil(typeof raw === "string" ? textTokens(raw) : bodyBytes(init) / 3);
    }
    let pictures = 0;
    const walk = (value, key, top) => {
        // (a vision request to /ai/run carries the picture as `image` at the top; a chat message as an image_url part)
        if (top && key === "image" && value) { pictures++; return 0; }
        if (key === "image_url" && value && typeof value === "object" && typeof value.url === "string") { pictures++; return 0; }
        if (typeof value === "string") {
            if (value.startsWith("data:image/")) { pictures++; return 0; }
            return textTokens(value) + 1;
        }
        if (typeof value === "number" || typeof value === "boolean") return String(value).length;
        if (value === null || value === undefined) return 1;
        if (Array.isArray(value)) return value.reduce((t, v) => t + walk(v, null, false) + 1, 2);
        if (typeof value === "object") return Object.entries(value).reduce((t, [k, v]) => t + textTokens(k) + 3 + walk(v, k, value === body), 2);
        return 0;
    };
    return Math.ceil(walk(body, null, false)) + pictures * IMAGE_TOKENS;
}
// The answer a request may write: its own limit (max_tokens, max_completion_tokens or max_output_tokens), for each of
// the n answers it asks for
const wantedOutput = (body) => Number(body?.max_tokens ?? body?.max_completion_tokens ?? body?.max_output_tokens) || 0;
const answersOf = (body) => Math.max(1, Math.floor(Number(body?.n) || 1));
const outputLimit = (body) => (wantedOutput(body) || UNSET_MAX_OUTPUT_TOKENS) * answersOf(body);
/**
 * A request's cost before it is sent, from one reading of its body:
 *   expected  what it is likely to cost: Aura by its text, Flux by its size, Whisper by the upload's length, a text
 *             model by its input (promptTokensOf) plus an answer of at most ASSUMED_OUTPUT_TOKENS. It is what is
 *             counted when the real usage cannot be read afterwards.
 *   worst     the MOST it can cost, which is the room held for it while it runs: for a text model its input at the
 *             full price (no prompt cache) plus everything it is allowed to write (its max_tokens;
 *             UNSET_MAX_OUTPUT_TOKENS when it names none; times n). Voice and pictures cost what they are expected to.
 */
function requestCost(model, body, init) {
    const same = (neurons) => ({ expected: neurons, worst: neurons, promptTokens: 0 });
    switch (kindOf(model)) {
        case "speech": return same(neuronsForSpeech(model, String(body?.text || "").length));
        case "image": return same(neuronsForImage(model, { width: body?.width, height: body?.height, steps: body?.steps ?? body?.num_steps }));
        case "audio": return same(neuronsForAudio(model, audioSecondsOf(init)));
        default: {
            const r = rateOf(model);
            const promptTokens = promptTokensOf(body, init);
            const wanted = wantedOutput(body);
            const answers = answersOf(body);
            return {
                promptTokens,
                expected: neuronsForText(model, { promptTokens, completionTokens: r.output ? Math.min(wanted || ASSUMED_OUTPUT_TOKENS, ASSUMED_OUTPUT_TOKENS) * answers : 0 }),
                worst: neuronsForText(model, { promptTokens, completionTokens: r.output ? outputLimit(body) : 0 }),
            };
        }
    }
}
export const estimateRequestNeurons = (model, body, init) => requestCost(model, body, init).expected;
export const worstCaseNeurons = (model, body, init) => requestCost(model, body, init).worst;

// ── The gate ─────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * A check only (nothing is held; cfAiFetch holds room with holdNeurons): throws CfNeuronCapError when the cap is on
 * and today's Neurons, the room held for requests on their way and `expected` together would pass it, or when today's
 * count cannot be read (Redis away): with the cap on, nothing is sent on a guess.
 */
export async function assertCloudflareAiAllowed(model = "", expected = 0) {
    const s = await capSettings();
    if (!s.enabled) return;
    let used;
    try {
        used = await spokenForToday();
    } catch (e) {
        console.warn(`[cf-neurons] refused ${model || "a request"}: today's count could not be read (${e.message})`);
        throw new CfNeuronCapError(0, s.cap, "unreadable");
    }
    const want = Number(expected) || 0;
    if (used + want > s.cap) {
        console.warn(`[cf-neurons] refused ${model || "a request"}: ${Math.round(used)} used + ${Math.round(want)} expected > ${s.cap} Neurons today`);
        throw new CfNeuronCapError(used, s.cap);
    }
}
/** For the @classgrid/ai client's provider list: without the Cloudflare ones while the cap is reached (or unreadable) */
export async function providersWithoutCappedCloudflare(providers) {
    const list = Array.isArray(providers) ? providers : [];
    const s = await capSettings();
    if (!s.enabled) return list;
    try {
        if ((await spokenForToday()) < s.cap) return list;
    } catch (e) {
        console.warn(`[cf-neurons] today's count could not be read (${e.message}): Cloudflare left out`);
    }
    const kept = list.filter((p) => !isCloudflareAiUrl(p?.url));
    if (kept.length < list.length) console.warn(`[cf-neurons] the cap is reached: ${list.length - kept.length} Cloudflare provider(s) left out of this request`);
    return kept;
}

// ── cfAiFetch: fetch, with the gate before and the meter after, for every Cloudflare AI request ─────────────────
const CF_AI_RE = /^https:\/\/api\.cloudflare\.com\/client\/v4\/accounts\/[^/]+\/ai\/(run\/(.+?)(?:\?.*)?$|v1\/)/;
export const isCloudflareAiUrl = (url) => CF_AI_RE.test(String(url || ""));
const addressOf = (url) => typeof url === "string" ? url : String(url?.url || url?.href || url || "");
const modelFromUrl = (url) => { const m = CF_AI_RE.exec(String(url || "")); return m && m[2] ? decodeURIComponent(m[2]) : null; };
const parseBody = (init) => {
    try { return init && typeof init.body === "string" ? JSON.parse(init.body) : null; } catch { return null; }
};
// Answers that prove nothing ran at Cloudflare (the request was turned away before any model work): not counted.
// 410 is a removed model and 413 a request too large; every other error (5xx, 408, ...) may come after the model ran,
// and is counted at the expected cost (a review, 2026-11-17: they were all counted as nothing).
const NOTHING_RAN_STATUS = new Set([400, 401, 403, 404, 410, 413, 429]);
// Network errors that prove the request never left: the name could not be looked up, or no connection was made
const NOTHING_SENT_CODES = new Set(["ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED", "ENETUNREACH", "EHOSTUNREACH", "UND_ERR_CONNECT_TIMEOUT"]);
const STOPPED_CODES = new Set(["UND_ERR_HEADERS_TIMEOUT", "UND_ERR_BODY_TIMEOUT"]);
const errorCodes = (e) => {
    const out = [];
    for (let x = e, depth = 0; x && depth < 5; x = x.cause, depth++) {
        if (x.code) out.push(String(x.code));
        for (const inner of Array.isArray(x.errors) ? x.errors : []) if (inner?.code) out.push(String(inner.code));
    }
    return out;
};
const nothingWasSent = (e) => { const codes = errorCodes(e); return codes.length > 0 && codes.every((c) => NOTHING_SENT_CODES.has(c)); };
const stoppedAfterSending = (e, init) => e?.name === "AbortError" || e?.name === "TimeoutError" || !!init?.signal?.aborted || errorCodes(e).some((c) => STOPPED_CODES.has(c));
/**
 * With the cap on, a text request that names no output limit is given the one its room was held for
 * (UNSET_MAX_OUTPUT_TOKENS), so Cloudflare cannot write more than was held (a review, 2026-11-17: some calls named
 * none, and Cloudflare's own default may be larger). Embeddings and every other kind are sent as they are.
 */
function withOutputLimit(address, model, body, init) {
    if (!body || typeof body !== "object" || Array.isArray(body) || kindOf(model) !== "text" || !(rateOf(model).output > 0)) return init;
    const responses = /\/ai\/v1\/responses/.test(address);
    const asks = Array.isArray(body.messages) || typeof body.prompt === "string" || (responses && body.input !== undefined);
    if (!asks || /\/embeddings/.test(address)) return init;
    if (body.max_tokens != null || body.max_completion_tokens != null || body.max_output_tokens != null) return init;
    try {
        const headers = new Headers(init?.headers || undefined);
        headers.delete("content-length"); // (the body is longer now; fetch works out the new length)
        return { ...init, headers, body: JSON.stringify({ ...body, [responses ? "max_output_tokens" : "max_tokens"]: UNSET_MAX_OUTPUT_TOKENS }) };
    } catch (e) {
        warnSometimes("output-limit", "[cf-neurons] could not add an output limit to a request; it is sent as it was:", e?.message || e);
        return init;
    }
}
/**
 * Reads a streamed text answer (a copy of it) as it arrives and keeps what counts.
 * How Cloudflare reports usage in a stream (read live 2026-11-17 on DeepSeek V4.1 Flash, DeepSeek V4 Pro and GLM 5.3):
 * the first chunk carries the real input count and nothing written yet (N in, 0 out); every chunk in between says only
 * how many tokens it holds itself (0 in, k out); the last chunk carries the whole answer (N in, all out). So:
 *   usage        the chunk usage with an input count and the largest total: the last chunk's for a stream that reached
 *                its end, the first chunk's (input only) for one stopped before that
 *   pieceTokens  what the chunks in between add up to: the tokens written so far, for a stream stopped before its end
 *   writtenBytes how much text arrived, for a provider that sends no usage at all
 * A stream that is stopped in the middle ends here with what had arrived, so a stopped answer is counted by what it
 * really used, not by a guess.
 */
async function readStreamedAnswer(copy) {
    const reader = copy.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let usage = null;
    let pieceTokens = 0;
    let writtenBytes = 0;
    const totalOf = (u) => Number(u?.total_tokens) || inputOf(u) + outputOf(u);
    const take = (line) => {
        if (!line.startsWith("data:")) return;
        const raw = line.slice(5).trim();
        if (!raw || raw === "[DONE]") return;
        let c;
        try { c = JSON.parse(raw); } catch { return; /* a partial chunk */ }
        if (c.usage) {
            if (inputOf(c.usage) > 0) {
                if (!usage || totalOf(c.usage) >= totalOf(usage)) usage = c.usage;
            } else {
                pieceTokens += outputOf(c.usage);
            }
        }
        const d = c.choices?.[0]?.delta;
        if (d) {
            for (const piece of [d.content, d.reasoning_content, d.reasoning]) if (typeof piece === "string") writtenBytes += Buffer.byteLength(piece, "utf8");
            for (const tc of d.tool_calls || []) writtenBytes += Buffer.byteLength(String(tc?.function?.name || "") + String(tc?.function?.arguments || ""), "utf8");
        } else if (typeof c.response === "string") {
            writtenBytes += Buffer.byteLength(c.response, "utf8"); // (the /ai/run stream shape)
        }
    };
    try {
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop();
            for (const line of lines) take(line);
        }
        if (buffer) take(buffer);
    } catch { /* stopped in the middle: what arrived until then is what is counted */ }
    return { usage, pieceTokens, writtenBytes };
}

// The fetch that was there before this module installed its own (below): what cfAiFetch sends with
const nativeFetch = globalThis.fetch;

/**
 * fetch() for Cloudflare AI. Any other address goes straight through. For a Cloudflare AI address: room for the most
 * the request can cost is held first (CfNeuronCapError when the cap has no room for it), and when the answer ends its
 * real cost is counted and the room given back: text by its usage (JSON, or the stream as it arrives), Whisper by the
 * audio's duration (or the upload's length when the answer has none), Aura by the text's characters, Flux by the
 * image. An answer whose usage cannot be read is counted at the expected cost; a request that left and then failed
 * or was stopped too (one without a stream that was stopped: at the room held for it). Only a request that provably
 * never ran is counted as nothing: stopped before it was sent, no connection made, or an answer like 400 or 429.
 */
export async function cfAiFetch(url, init = {}) {
    const address = addressOf(url);
    if (!isCloudflareAiUrl(address)) return nativeFetch(url, init);
    const body = parseBody(init);
    const model = modelFromUrl(address) || body?.model || "";
    // (worked out once, and only when a number is needed: with the cap off and the usage readable, the body is not read)
    let cost = null;
    const costs = () => (cost ||= requestCost(model, body, init));
    const hold = await holdNeurons(model, () => costs().worst);
    const sent = hold ? withOutputLimit(address, model, body, init) : init;
    let settled = false;
    const settle = (neurons) => {
        if (settled) return;
        settled = true;
        countAndRelease(model, typeof neurons === "function" ? neurons() : neurons, hold);
    };
    const expected = () => costs().expected;
    const worst = () => costs().worst;
    const streamed = body?.stream === true;
    const stoppedBeforeSending = !!init?.signal?.aborted;
    let response;
    try {
        response = await nativeFetch(url, sent);
    } catch (e) {
        settle(stoppedBeforeSending || nothingWasSent(e) ? 0 : !streamed && stoppedAfterSending(e, init) ? worst : expected);
        throw e;
    }
    if (!response.ok) {
        settle(NOTHING_RAN_STATUS.has(response.status) ? 0 : expected);
        return response;
    }
    try {
        switch (kindOf(model)) {
            case "speech":
            case "image":
                settle(expected);
                break;
            case "audio": {
                response.clone().json().then((j) => {
                    const r = j?.result || {};
                    const seconds = Number(r.transcription_info?.duration) || Number(r.segments?.at?.(-1)?.end) || (r.words?.length ? Number(r.words.at(-1)?.end) : 0) || audioSecondsOf(init);
                    settle(neuronsForAudio(model, seconds));
                }).catch(() => settle(expected));
                break;
            }
            default: {
                const type = response.headers.get("content-type") || "";
                const copy = response.clone();
                if (type.includes("text/event-stream")) {
                    readStreamedAnswer(copy).then(({ usage, pieceTokens, writtenBytes }) => {
                        // (what the chunks in between add up to can never be more than the request may write)
                        const written = Math.min(pieceTokens, outputLimit(body));
                        settle(usage
                            // the real input, and the whole answer's count or, for a stream stopped before its last
                            // chunk, what its pieces add up to
                            ? usageNeurons(model, { ...usage, completion_tokens: Math.max(outputOf(usage), written) })
                            // (no usage with an input count arrived: the input by the request's size, the output by
                            // its pieces or the text that arrived, and never less than the expected cost)
                            : Math.max(expected(), neuronsForText(model, { promptTokens: costs().promptTokens, completionTokens: Math.max(written, Math.ceil(writtenBytes / 3)) })));
                    }).catch(() => settle(expected));
                } else {
                    copy.json().then((j) => {
                        const usage = j?.usage || j?.result?.usage || null;
                        // (a usage that reports no input, empty or all zero, says nothing: the expected cost)
                        settle(usageReadable(usage) ? usageNeurons(model, usage) : expected);
                    }).catch(() => settle(expected));
                }
            }
        }
    } catch (e) {
        console.warn("[cf-neurons] could not meter:", e.message);
        settle(expected);
    }
    return response;
}
// Installed as the process's fetch: a Cloudflare AI request from anywhere (an SDK client, the @classgrid/ai client, a
// plain fetch) is gated and counted; every other address goes to the fetch that was there before.
if (!globalThis.fetch?.cfNeuronCap) {
    const gatedFetch = (url, init) => isCloudflareAiUrl(addressOf(url)) ? cfAiFetch(url, init) : nativeFetch(url, init);
    gatedFetch.cfNeuronCap = true;
    globalThis.fetch = gatedFetch;
}
