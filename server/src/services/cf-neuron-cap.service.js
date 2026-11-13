// Cloudflare Workers AI: a daily Neuron cap for the whole account, and the meter behind it (owner, 2026-11-13).
//
// From 2026-12-01 Cloudflare bills Workers AI above 10,000 Neurons a day (every model of the account together: chat,
// voice to text, text to speech, images, embeddings). The super admin's Global AI Config has a switch and a cap: with
// the switch on, once today's Neurons (UTC day, like Cloudflare's) reach the cap, every Cloudflare model is refused
// until midnight UTC; the chat falls back to its non-Cloudflare models where it has them. With the switch off nothing
// is refused, but the meter still counts, so the super admin sees what a day costs.
//
// Neurons are counted here from Cloudflare's own price list (developers.cloudflare.com/workers-ai/platform/pricing):
// text models by tokens, Whisper by audio minutes, Aura by characters, Flux by tiles and steps. Every request to
// Cloudflare AI goes through cfAiFetch() (or, where a shared client makes the request, through assertCloudflareAiAllowed
// and the AiUsageLog meter), so the count and the cap cover all of them.
import redis from "../config/redis.js";
import GlobalAiConfig from "../models/GlobalAiConfig.js";

// The cap is fixed: Cloudflare's free 10,000 Neurons a day, less a margin of 500 because this meter is an estimate
// (owner, 2026-11-13: never a number anyone can raise, and always under the free amount, so nothing is ever billed)
export const FREE_NEURONS_PER_DAY = 10000;
export const SAFETY_MARGIN = 500;
export const DEFAULT_CAP = FREE_NEURONS_PER_DAY - SAFETY_MARGIN;
const CONFIG_TTL_MS = 15000;
const KEEP_DAYS = 10;

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
// A text model that is not in the list is counted like DeepSeek V4.1 Flash, the main chat model
const UNKNOWN_TEXT = PER_M_TOKENS["@cf/deepseek-ai/deepseek-v4.1-flash-1017"];

export class CfNeuronCapError extends Error {
    constructor(used, cap) {
        super(`Cloudflare AI is paused for today: ${Math.round(used)} of ${cap} Neurons used (the cap in Global AI Config; it resets at 00:00 UTC)`);
        this.name = "CfNeuronCapError";
        this.code = "cf_neuron_cap";
        this.status = 429;
        this.rateLimited = false; // (not a "try again in a minute" error: the chat moves to another provider at once)
    }
}
export const isCfNeuronCapError = (e) => !!e && (e.code === "cf_neuron_cap" || e.name === "CfNeuronCapError");

// ── Settings (Global AI Config, cached for a few seconds) ─────────────────────────────────────────────────────────
let cached = { at: 0, enabled: false, cap: DEFAULT_CAP };
export async function capSettings() {
    if (Date.now() - cached.at < CONFIG_TTL_MS) return cached;
    try {
        const c = await GlobalAiConfig.findOne({ key: "singleton" }).select("cf_neuron_cap_enabled").lean();
        cached = { at: Date.now(), enabled: c?.cf_neuron_cap_enabled === true, cap: DEFAULT_CAP };
    } catch {
        cached = { ...cached, at: Date.now() };
    }
    return cached;
}
export const forgetCapSettings = () => { cached = { ...cached, at: 0 }; };

// ── The meter (Redis, one UTC day per key, like Cloudflare's free allocation) ─────────────────────────────────────
export const utcDay = (d = new Date()) => d.toISOString().slice(0, 10);
const totalKey = (day) => `cf:neurons:${day}`;
const modelsKey = (day) => `cf:neurons:${day}:models`;
const requestsKey = (day) => `cf:neurons:${day}:requests`;

export async function usedToday(day = utcDay()) {
    try { return Number(await redis.get(totalKey(day))) || 0; } catch { return 0; }
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

/** Adds `neurons` of `model` to today's count (never throws; a Redis hiccup only loses that count) */
export async function addNeurons(model, neurons) {
    const n = Number(neurons);
    if (!model || !Number.isFinite(n) || n <= 0) return;
    const day = utcDay();
    try {
        await redis.multi()
            .incrbyfloat(totalKey(day), n).expire(totalKey(day), KEEP_DAYS * 86400)
            .hincrbyfloat(modelsKey(day), model, n).expire(modelsKey(day), KEEP_DAYS * 86400)
            .hincrby(requestsKey(day), model, 1).expire(requestsKey(day), KEEP_DAYS * 86400)
            .exec();
    } catch (e) {
        console.warn("[cf-neurons] could not count:", e.message);
    }
}

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
/** Counts a text answer (also used by the AiUsageLog meter) */
export const meterText = (model, usage) => addNeurons(model, neuronsForText(model, {
    promptTokens: usage?.prompt_tokens ?? usage?.promptTokens,
    cachedTokens: usage?.prompt_tokens_details?.cached_tokens ?? usage?.cached_tokens ?? usage?.cachedTokens,
    completionTokens: usage?.completion_tokens ?? usage?.completionTokens,
}));

// ── The gate ─────────────────────────────────────────────────────────────────────────────────────────────────────
/** Throws CfNeuronCapError when the cap is on and today's Neurons have reached it */
export async function assertCloudflareAiAllowed(model = "") {
    const s = await capSettings();
    if (!s.enabled) return;
    const used = await usedToday();
    if (used >= s.cap) {
        console.warn(`[cf-neurons] refused ${model || "a request"}: ${Math.round(used)} / ${s.cap} Neurons today`);
        throw new CfNeuronCapError(used, s.cap);
    }
}
/** For the shared LLM client: its provider list without the Cloudflare ones while the cap is reached */
export async function providersWithoutCappedCloudflare(providers) {
    const list = Array.isArray(providers) ? providers : [];
    const s = await capSettings();
    if (!s.enabled || (await usedToday()) < s.cap) return list;
    const kept = list.filter((p) => !isCloudflareAiUrl(p?.url));
    if (kept.length < list.length) console.warn(`[cf-neurons] the cap is reached: ${list.length - kept.length} Cloudflare provider(s) left out of this request`);
    return kept;
}

// ── cfAiFetch: fetch, with the gate before and the meter after, for every Cloudflare AI request ─────────────────
const CF_AI_RE = /^https:\/\/api\.cloudflare\.com\/client\/v4\/accounts\/[^/]+\/ai\/(run\/(.+?)(?:\?.*)?$|v1\/)/;
export const isCloudflareAiUrl = (url) => CF_AI_RE.test(String(url || ""));
const modelFromUrl = (url) => { const m = CF_AI_RE.exec(String(url || "")); return m && m[2] ? decodeURIComponent(m[2]) : null; };
const parseBody = (init) => {
    try { return init && typeof init.body === "string" ? JSON.parse(init.body) : null; } catch { return null; }
};
const parseSseUsage = (text) => {
    // Cloudflare attaches usage to every chunk; the largest total is the final count
    let usage = null;
    for (const line of String(text).split("\n")) {
        if (!line.startsWith("data:")) continue;
        const raw = line.slice(5).trim();
        if (!raw || raw === "[DONE]") continue;
        try { const c = JSON.parse(raw); if (c.usage && (!usage || (c.usage.total_tokens || 0) >= (usage.total_tokens || 0))) usage = c.usage; } catch { /* a partial chunk */ }
    }
    return usage;
};

/**
 * fetch() for Cloudflare AI. Any other address goes straight through. For a Cloudflare AI address: the cap is checked
 * first (CfNeuronCapError when reached), and the answer is metered: text by its usage (JSON or SSE), Whisper by the
 * audio's duration (or the upload's size when the answer has none), Aura by the text's characters, Flux by the image.
 * `meter: false` for a request whose usage is written to AiUsageLog by the caller (that log meters it, once).
 */
/** cfAiFetch for an SDK client whose answers are logged to AiUsageLog (the log counts them): the gate only */
export const cfAiFetchGateOnly = (url, init) => cfAiFetch(url, init, { meter: false });
export async function cfAiFetch(url, init = {}, { meter = true } = {}) {
    const address = typeof url === "string" ? url : String(url?.url || url || "");
    if (!isCloudflareAiUrl(address)) return fetch(url, init);
    const body = parseBody(init);
    const model = modelFromUrl(address) || body?.model || "";
    await assertCloudflareAiAllowed(model);
    const response = await fetch(url, init);
    if (!meter || !response.ok) return response;
    try {
        if (PER_1K_CHARS[model]) {
            addNeurons(model, neuronsForSpeech(model, String(body?.text || "").length));
        } else if (/flux/.test(model)) {
            addNeurons(model, neuronsForImage(model, { width: body?.width, height: body?.height, steps: body?.steps ?? body?.num_steps }));
        } else if (PER_AUDIO_MINUTE[model]) {
            const bytes = init?.body?.byteLength ?? init?.body?.length ?? 0;
            response.clone().json().then((j) => {
                const r = j?.result || {};
                const seconds = Number(r.transcription_info?.duration) || Number(r.segments?.at?.(-1)?.end) || (r.words?.length ? Number(r.words.at(-1)?.end) : 0) || bytes / 16000; // (16 kB/s is 16 kHz 16-bit mono WAV)
                addNeurons(model, neuronsForAudio(model, seconds));
            }).catch(() => addNeurons(model, neuronsForAudio(model, bytes / 16000)));
        } else {
            const type = response.headers.get("content-type") || "";
            const clone = response.clone();
            (type.includes("text/event-stream") ? clone.text().then(parseSseUsage) : clone.json().then((j) => j?.usage || j?.result?.usage || null))
                .then((usage) => {
                    if (usage) return meterText(model, usage);
                    // No usage in the answer (embeddings): the request's text, four characters to a token
                    const text = Array.isArray(body?.text) ? body.text.join(" ") : String(body?.text || body?.input || body?.prompt || "");
                    if (text) return addNeurons(model, neuronsForText(model, { promptTokens: Math.ceil(text.length / 4) }));
                })
                .catch(() => {});
        }
    } catch (e) {
        console.warn("[cf-neurons] could not meter:", e.message);
    }
    return response;
}
