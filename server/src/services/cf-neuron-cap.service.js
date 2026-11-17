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
//     before any answer is counted at its expected cost. Nothing is ever counted as free.
//   - A count that cannot be read refuses (it never guesses zero), and a switch that cannot be read counts as on
//     unless it was last seen off (capSettings).
// The room held is on purpose more than a request usually costs (Cloudflare's prompt cache makes most rounds far
// cheaper than their size): near the cap, or with many requests at once, a request is refused a little early and
// Claude does that work. That is the price of never passing 10,000.
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

// The cap is fixed: Cloudflare's free 10,000 Neurons a day, less a margin of 500 because this meter is an estimate
// (owner, 2026-11-13: never a number anyone can raise, and always under the free amount, so nothing is ever billed)
export const FREE_NEURONS_PER_DAY = 10000;
export const SAFETY_MARGIN = 500;
export const DEFAULT_CAP = FREE_NEURONS_PER_DAY - SAFETY_MARGIN;
const CONFIG_TTL_MS = 15000;
const KEEP_DAYS = 10;
// What a text answer is taken to be when its real usage cannot be read afterwards (the least that is counted for it)
const ASSUMED_OUTPUT_TOKENS = 1024;
// The most a text request may write when it names no max_tokens of its own (for the room held while it runs)
const UNSET_MAX_OUTPUT_TOKENS = 4096;
// A picture in a request: a vision model reads it as a set number of tokens, not by its bytes (the most one takes)
const IMAGE_TOKENS = 6500;
// How long room stays held for a request that never reports back (its server stopped in the middle)
const HOLD_MS = 30 * 60 * 1000;

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
    "@cf/moonshotai/kimi-k2.5": { input: 54545, cached: 9091, output: 272727 },
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
// A text model that is not in the list is counted like DeepSeek V4 Pro, the dearest chat model (an unknown model
// must never be counted too low)
const UNKNOWN_TEXT = PER_M_TOKENS["@cf/deepseek-ai/deepseek-v4-pro-0813"];
const WAV_BYTES_PER_SECOND = 16000; // (16 kHz 16-bit mono WAV, what the voice features upload)

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

// ── Settings (Global AI Config, cached for a few seconds) ─────────────────────────────────────────────────────────
// (`read`: this process has read the switch from the database at least once)
let cached = { at: 0, enabled: false, cap: DEFAULT_CAP, read: false };
const SWITCH_KEY = "cf:neurons:cap:switch"; // the switch as the last process read it: "on" or "off"
export async function capSettings() {
    if (Date.now() - cached.at < CONFIG_TTL_MS) return cached;
    try {
        const c = await GlobalAiConfig.findOne({ key: "singleton" }).select("cf_neuron_cap_enabled").lean();
        const enabled = c?.cf_neuron_cap_enabled === true;
        if (!cached.read || cached.enabled !== enabled) {
            try { Promise.resolve(redis.set(SWITCH_KEY, enabled ? "on" : "off")).catch(() => {}); } catch { /* Redis away */ }
        }
        cached = { at: Date.now(), enabled, cap: DEFAULT_CAP, read: true };
    } catch {
        // The database could not be read. What this process read last stays. A process that has not read it yet takes
        // what the last process left in Redis; with nothing there either, the cap counts as ON: nothing goes to
        // Cloudflare on a guess (owner, 2026-11-17: "so we are not charged").
        let enabled = cached.enabled;
        if (!cached.read) {
            try { enabled = (await redis.get(SWITCH_KEY)) !== "off"; } catch { enabled = true; }
        }
        cached = { ...cached, enabled, at: Date.now() };
    }
    return cached;
}
export const forgetCapSettings = () => { cached = { ...cached, at: 0 }; };

// ── The meter (Redis, one UTC day per key, like Cloudflare's free allocation) ─────────────────────────────────────
export const utcDay = (d = new Date()) => d.toISOString().slice(0, 10);
const totalKey = (day) => `cf:neurons:${day}`;
const modelsKey = (day) => `cf:neurons:${day}:models`;
const requestsKey = (day) => `cf:neurons:${day}:requests`;

/** Today's Neurons so far. Throws when Redis cannot answer: the gate then refuses (it never guesses zero). */
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

// ── Room held for requests on their way ─────────────────────────────────────────────────────────────────────────
// One Redis hash a day: hold id -> "neurons|until" (until: the time after which a hold whose request never reported
// back no longer counts).
const heldKey = (day) => `cf:neurons:${day}:held`;
let holdNo = 0;
const newHoldId = () => `${process.pid}.${Date.now().toString(36)}.${(holdNo++).toString(36)}`;
const liveHolds = (all, now) => {
    let held = 0;
    const ended = [];
    for (const [id, value] of Object.entries(all || {})) {
        const [neurons, until] = String(value).split("|");
        if (Number(until) > now) held += Number(neurons) || 0; else ended.push(id);
    }
    return { held, ended };
};
const dropHolds = (day, ids) => {
    if (!ids.length) return;
    try { Promise.resolve(redis.hdel(heldKey(day), ...ids)).catch(() => {}); } catch { /* Redis away: they run out by themselves */ }
};
const execOrThrow = async (multi) => {
    const r = await multi.exec();
    const failed = Array.isArray(r) ? r.find((x) => x?.[0]) : null;
    if (!Array.isArray(r) || failed) throw (failed?.[0] || new Error("no answer from Redis"));
    return r.map((x) => x[1]);
};

/**
 * Today's Neurons that are spoken for: counted so far, plus the room held for requests on their way. Throws when
 * Redis cannot answer (the callers then refuse; nothing is guessed).
 */
export async function spokenForToday(day = utcDay(), now = Date.now()) {
    const [used, all] = await execOrThrow(redis.multi().get(totalKey(day)).hgetall(heldKey(day)));
    return (Number(used) || 0) + liveHolds(all, now).held;
}

/**
 * Takes room for a request before it is sent: `worst` is the most it can cost (a number, or a function that gives
 * it: called only while the cap is on, so a request's body is not read for nothing). With the cap off nothing is held
 * (null). With the cap on, the hold is written first and the day's count and every live hold are read in the same
 * Redis step, so two requests sent together cannot both take the last room. Throws CfNeuronCapError when the room is
 * not there, or when Redis cannot answer. The hold is given back by countAndRelease().
 */
export async function holdNeurons(model = "", worst = 0) {
    const s = await capSettings();
    if (!s.enabled) return null;
    const day = utcDay();
    const now = Date.now();
    const id = newHoldId();
    const want = Math.max(0, Number(typeof worst === "function" ? worst() : worst) || 0);
    let used = 0;
    let held = 0;
    try {
        const [, , usedNow, all] = await execOrThrow(redis.multi()
            .hset(heldKey(day), id, `${want}|${now + HOLD_MS}`).expire(heldKey(day), KEEP_DAYS * 86400)
            .get(totalKey(day)).hgetall(heldKey(day)));
        used = Number(usedNow) || 0;
        const live = liveHolds(all, now);
        held = live.held; // (this request's own hold is in it)
        dropHolds(day, live.ended);
    } catch (e) {
        dropHolds(day, [id]);
        console.warn(`[cf-neurons] refused ${model || "a request"}: today's count could not be read (${e?.message || e})`);
        throw new CfNeuronCapError(0, s.cap, "unreadable");
    }
    if (used + held > s.cap) {
        dropHolds(day, [id]);
        console.warn(`[cf-neurons] refused ${model || "a request"}: ${Math.round(used)} used + ${Math.round(held - want)} held for requests on their way + ${Math.round(want)} this one can cost > ${s.cap} Neurons today`);
        throw new CfNeuronCapError(used, s.cap);
    }
    return { id, day };
}

/**
 * Adds a request's real `neurons` to today's count and gives its held room back, in one Redis step (never throws; a
 * Redis hiccup loses that count, and the room then stays held until it runs out by itself).
 */
export async function countAndRelease(model, neurons, hold = null) {
    const n = Number(neurons);
    const counts = Number.isFinite(n) && n > 0;
    if (!counts && !hold) return;
    const name = model || "unknown"; // (a request that names no model is still counted)
    const day = utcDay();
    try {
        const m = redis.multi();
        if (counts) {
            m.incrbyfloat(totalKey(day), n).expire(totalKey(day), KEEP_DAYS * 86400)
                .hincrbyfloat(modelsKey(day), name, n).expire(modelsKey(day), KEEP_DAYS * 86400)
                .hincrby(requestsKey(day), name, 1).expire(requestsKey(day), KEEP_DAYS * 86400);
        }
        if (hold) m.hdel(heldKey(hold.day), hold.id);
        await m.exec();
    } catch (e) {
        console.warn("[cf-neurons] could not count:", e.message);
    }
}
/** Adds `neurons` of `model` to today's count (never throws) */
export const addNeurons = (model, neurons) => countAndRelease(model, neurons);

// ── Neurons from what a request used ─────────────────────────────────────────────────────────────────────────────
export function neuronsForText(model, { promptTokens = 0, cachedTokens = 0, completionTokens = 0 } = {}) {
    const r = PER_M_TOKENS[model] || UNKNOWN_TEXT;
    const fresh = Math.max(0, (Number(promptTokens) || 0) - (Number(cachedTokens) || 0));
    return (fresh * r.input + (Number(cachedTokens) || 0) * (r.cached ?? r.input) + (Number(completionTokens) || 0) * r.output) / 1e6;
}
export const neuronsForAudio = (model, seconds) => ((Number(seconds) || 0) / 60) * (PER_AUDIO_MINUTE[model] || PER_AUDIO_MINUTE["@cf/openai/whisper-large-v3-turbo"]);
export const neuronsForSpeech = (model, characters) => ((Number(characters) || 0) / 1000) * (PER_1K_CHARS[model] || PER_1K_CHARS["@cf/deepgram/aura-2-en"]);
export function neuronsForImage(model, { width = 1024, height = 1024, steps } = {}) {
    const w = Number(width) || 1024, h = Number(height) || 1024;
    if (/flux-2-klein-9b/.test(model)) {
        const mp = (w * h) / (1024 * 1024);
        return FLUX_KLEIN_9B.firstMp + Math.max(0, mp - 1) * FLUX_KLEIN_9B.nextMp;
    }
    const tiles = Math.ceil(w / 512) * Math.ceil(h / 512);
    return tiles * FLUX_SCHNELL.tile + (Number(steps) || FLUX_SCHNELL.defaultSteps) * FLUX_SCHNELL.step;
}
const usageNeurons = (model, usage) => neuronsForText(model, {
    promptTokens: usage?.prompt_tokens ?? usage?.promptTokens,
    cachedTokens: usage?.prompt_tokens_details?.cached_tokens ?? usage?.cached_tokens ?? usage?.cachedTokens,
    completionTokens: usage?.completion_tokens ?? usage?.completionTokens,
});
/** Counts a text answer from its usage */
export const meterText = (model, usage) => addNeurons(model, usageNeurons(model, usage));

const kindOf = (model) => PER_1K_CHARS[model] ? "speech" : /flux/.test(model) ? "image" : PER_AUDIO_MINUTE[model] ? "audio" : "text";
const bodyBytes = (init) => Number(init?.body?.byteLength ?? init?.body?.size ?? init?.body?.length) || 0;
/**
 * The input tokens of a text request, from its body, never too low: the whole body counts (the messages, the tool
 * list, every field) at three bytes to a token (English runs at about four, Devanagari at about three), and a picture
 * counts as IMAGE_TOKENS in place of its bytes.
 */
export function promptTokensOf(body, init) {
    if (!body || typeof body !== "object") return Math.ceil(bodyBytes(init) / 3);
    let pictures = 0;
    const text = JSON.stringify(body, function (key, value) {
        // (a vision request to /ai/run carries the picture as `image` at the top; a chat message as an image_url part)
        if (key === "image" && this === body && value) { pictures++; return undefined; }
        if (key === "image_url" && value && typeof value === "object" && typeof value.url === "string") { pictures++; return undefined; }
        if (typeof value === "string" && value.startsWith("data:image/")) { pictures++; return undefined; }
        return value;
    }) || "";
    return Math.ceil(Buffer.byteLength(text, "utf8") / 3) + pictures * IMAGE_TOKENS;
}
const wantedOutput = (body) => Number(body?.max_tokens ?? body?.max_completion_tokens) || 0;
/**
 * A request's cost before it is sent, from one reading of its body:
 *   expected  what it is likely to cost: Aura by its text, Flux by its size, Whisper by the upload's length, a text
 *             model by its input (promptTokensOf) plus an answer of at most ASSUMED_OUTPUT_TOKENS. It is what is
 *             counted when the real usage cannot be read afterwards.
 *   worst     the MOST it can cost, which is the room held for it while it runs: for a text model its input at the
 *             full price (no prompt cache) plus everything it is allowed to write (its max_tokens;
 *             UNSET_MAX_OUTPUT_TOKENS when it names none). Voice and pictures cost what they are expected to.
 */
function requestCost(model, body, init) {
    const same = (neurons) => ({ expected: neurons, worst: neurons, promptTokens: 0 });
    switch (kindOf(model)) {
        case "speech": return same(neuronsForSpeech(model, String(body?.text || "").length));
        case "image": return same(neuronsForImage(model, { width: body?.width, height: body?.height, steps: body?.steps ?? body?.num_steps }));
        case "audio": return same(neuronsForAudio(model, bodyBytes(init) / WAV_BYTES_PER_SECOND));
        default: {
            const r = PER_M_TOKENS[model] || UNKNOWN_TEXT;
            const promptTokens = promptTokensOf(body, init);
            const wanted = wantedOutput(body);
            return {
                promptTokens,
                expected: neuronsForText(model, { promptTokens, completionTokens: r.output ? Math.min(wanted || ASSUMED_OUTPUT_TOKENS, ASSUMED_OUTPUT_TOKENS) : 0 }),
                worst: neuronsForText(model, { promptTokens, completionTokens: r.output ? (wanted || UNSET_MAX_OUTPUT_TOKENS) : 0 }),
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
/**
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
    const take = (line) => {
        if (!line.startsWith("data:")) return;
        const raw = line.slice(5).trim();
        if (!raw || raw === "[DONE]") return;
        let c;
        try { c = JSON.parse(raw); } catch { return; /* a partial chunk */ }
        if (c.usage) {
            if ((c.usage.prompt_tokens || 0) > 0) {
                if (!usage || (c.usage.total_tokens || 0) >= (usage.total_tokens || 0)) usage = c.usage;
            } else {
                pieceTokens += Number(c.usage.completion_tokens) || 0;
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
 * audio's duration (or the upload's size when the answer has none), Aura by the text's characters, Flux by the image.
 * An answer whose usage cannot be read is counted at the expected cost, and a request that was stopped or timed out
 * after it was sent too, so a request is never counted as free. A request that failed (an HTTP error, no connection)
 * is not counted.
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
    let settled = false;
    const settle = (neurons) => {
        if (settled) return;
        settled = true;
        countAndRelease(model, typeof neurons === "function" ? neurons() : neurons, hold);
    };
    const expected = () => costs().expected;
    const stoppedBeforeSending = !!init?.signal?.aborted;
    let response;
    try {
        response = await nativeFetch(url, init);
    } catch (e) {
        const stoppedAfterSending = !stoppedBeforeSending && (e?.name === "AbortError" || e?.name === "TimeoutError" || !!init?.signal?.aborted);
        settle(stoppedAfterSending ? expected : 0);
        throw e;
    }
    if (!response.ok) {
        settle(0);
        return response;
    }
    try {
        switch (kindOf(model)) {
            case "speech":
            case "image":
                settle(expected);
                break;
            case "audio": {
                const bytes = bodyBytes(init);
                response.clone().json().then((j) => {
                    const r = j?.result || {};
                    const seconds = Number(r.transcription_info?.duration) || Number(r.segments?.at?.(-1)?.end) || (r.words?.length ? Number(r.words.at(-1)?.end) : 0) || bytes / WAV_BYTES_PER_SECOND;
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
                        const written = Math.min(pieceTokens, wantedOutput(body) || UNSET_MAX_OUTPUT_TOKENS);
                        settle(usage
                            // the real input, and the whole answer's count or, for a stream stopped before its last
                            // chunk, what its pieces add up to
                            ? usageNeurons(model, { ...usage, completion_tokens: Math.max(Number(usage.completion_tokens) || 0, written) })
                            // (no usage with an input count arrived: the input by the request's size, the output by
                            // its pieces or the text that arrived, and never less than the expected cost)
                            : Math.max(expected(), neuronsForText(model, { promptTokens: costs().promptTokens, completionTokens: Math.max(written, Math.ceil(writtenBytes / 3)) })));
                    }).catch(() => settle(expected));
                } else {
                    copy.json().then((j) => {
                        const usage = j?.usage || j?.result?.usage || null;
                        settle(usage ? usageNeurons(model, usage) : expected);
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
