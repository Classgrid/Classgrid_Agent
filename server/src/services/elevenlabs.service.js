// ElevenLabs (the ElevenLabs Grant, 2026-11-14): Classgrid's voice, voice to text and pictures.
//
// - textToSpeech: the v4 Turbo model (made for real-time and agents) with Classgrid's voice (ELEVENLABS_VOICE_ID).
// - speechToText: Scribe v3.
// - generateImage: the image API (GPT Image 2.5 by default; one request, then the finished picture is fetched).
//
// Keys: ELEVENLABS_API_KEY and ELEVENLABS_API_KEY_2. Each call tries them in that order and moves to the next key
// when a key lacks the permission for that operation (the console gives each key its own permissions). Every caller
// keeps its Cloudflare model as the fallback, so a missing key or an ElevenLabs error never breaks a feature.
// Nothing here goes through the Cloudflare Neuron cap: these requests are not Cloudflare's.

const BASE = "https://api.elevenlabs.io/v1";
export const TTS_MODEL = "eleven_v4_turbo";
export const TTS_MODEL_EXPRESSIVE = "eleven_v3";
export const STT_MODEL = "scribe_v3";
export const IMAGE_MODEL = "gpt-image-2.5-flare";
export const IMAGE_MODEL_FALLBACK = "gemini-3.1-flash-image";
// Classgrid's voice (owner, 2026-11-14), when ELEVENLABS_VOICE_ID is not set
const DEFAULT_VOICE_ID = "Ms9OTvWb99V6DwRHZn6q";

export const elevenLabsKeys = () => [process.env.ELEVENLABS_API_KEY, process.env.ELEVENLABS_API_KEY_2].map((k) => String(k || "").trim()).filter(Boolean);
export const elevenLabsEnabled = () => elevenLabsKeys().length > 0;
export const classgridVoiceId = () => String(process.env.ELEVENLABS_VOICE_ID || "").trim() || DEFAULT_VOICE_ID;

export class ElevenLabsError extends Error {
    constructor(message, { status, code } = {}) {
        super(message);
        this.name = "ElevenLabsError";
        this.status = status;
        this.code = code;
    }
}

// A key without the permission for this call (or an invalid key): the next key gets a try
const keyProblem = (status, body) => status === 401 || (status === 403 && /permission/i.test(String(body?.detail?.message || body?.detail || "")));

/** fetch with each key in turn; `what` names the call for errors. Returns the first response that is not a key problem. */
async function withKeys(what, send) {
    const keys = elevenLabsKeys();
    if (!keys.length) throw new ElevenLabsError(`${what}: no ElevenLabs key (ELEVENLABS_API_KEY)`, { code: "no_key" });
    let last = null;
    for (const key of keys) {
        const res = await send(key);
        if (res.ok) return res;
        const text = await res.text().catch(() => "");
        let body = null;
        try { body = JSON.parse(text); } catch { /* not JSON */ }
        const message = body?.detail?.message || (typeof body?.detail === "string" ? body.detail : "") || text.slice(0, 300) || res.statusText;
        last = new ElevenLabsError(`${what}: ${res.status} ${message}`, { status: res.status, code: body?.detail?.code || body?.detail?.status });
        if (!keyProblem(res.status, body)) throw last;
        console.warn(`[elevenlabs] ${what}: this key cannot do it (${res.status}); trying the next key`);
    }
    throw last;
}

/**
 * Speech from text, as audio bytes. `outputFormat` is ElevenLabs' name (mp3_44100_128 for files, pcm_48000 for the
 * WhatsApp call's raw 48 kHz 16-bit mono, pcm_16000, opus_48000_64...). `language` is an ISO 639-1 code (optional).
 */
export async function textToSpeech(text, { voiceId = classgridVoiceId(), modelId = TTS_MODEL, outputFormat = "mp3_44100_128", language, timeoutMs = 30000 } = {}) {
    const spoken = String(text || "").trim();
    if (!spoken) return Buffer.alloc(0);
    const res = await withKeys("text to speech", (key) => fetch(`${BASE}/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${encodeURIComponent(outputFormat)}`, {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({ text: spoken, model_id: modelId, ...(language ? { language_code: language } : {}) }),
        signal: AbortSignal.timeout(timeoutMs),
    }));
    return Buffer.from(await res.arrayBuffer());
}

/**
 * Text from audio (any common audio or video format; `mimeType` and `fileName` only help the upload). `language` is an
 * ISO 639-1/639-3 code; without it the language is detected. Returns { text, languageCode, seconds }.
 */
export async function speechToText(audio, { mimeType = "audio/webm", fileName, language, timeoutMs = 60000 } = {}) {
    const bytes = Buffer.isBuffer(audio) ? audio : Buffer.from(audio);
    if (!bytes.length) return { text: "", languageCode: null, seconds: 0 };
    const clean = String(mimeType || "audio/webm").split(";")[0].trim();
    const ext = { "audio/webm": "webm", "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/mp3": "mp3", "audio/wav": "wav", "audio/x-wav": "wav", "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/aac": "aac", "audio/flac": "flac", "video/mp4": "mp4", "video/webm": "webm" }[clean] || "bin";
    const res = await withKeys("speech to text", (key) => {
        const form = new FormData();
        form.append("file", new Blob([bytes], { type: clean }), fileName || `audio.${ext}`);
        form.append("model_id", STT_MODEL);
        if (language) form.append("language_code", language);
        return fetch(`${BASE}/speech-to-text`, { method: "POST", headers: { "xi-api-key": key }, body: form, signal: AbortSignal.timeout(timeoutMs) });
    });
    const json = await res.json().catch(() => ({}));
    const first = Array.isArray(json?.transcripts) ? json.transcripts[0] : json;
    return { text: String(first?.text || "").trim(), languageCode: first?.language_code || null, seconds: Number(json?.audio_duration_secs ?? first?.audio_duration_secs) || 0 };
}

/**
 * A picture from a prompt: the generation is started, then asked for until it is done (a few seconds to a minute),
 * and the finished picture is downloaded. Returns { buffer, mimeType, model }.
 * `aspectRatio` like "1:1", "16:9", "9:16", "4:3", "3:4"; `quality` low | medium | high (GPT Image).
 */
export async function generateImage(prompt, { modelId = IMAGE_MODEL, aspectRatio = "1:1", quality = "medium", resolution = "1K", timeoutMs = 120000 } = {}) {
    const text = String(prompt || "").trim();
    if (!text) throw new ElevenLabsError("image: no prompt", { code: "no_prompt" });
    const isGpt = /^gpt-image/.test(modelId);
    const body = { model_id: modelId, prompt: text, aspect_ratio: aspectRatio, ...(isGpt ? { quality } : {}), ...(/^(gpt-image-2|gemini-3)/.test(modelId) ? { resolution } : {}) };
    let key = null;
    const created = await withKeys("image", (k) => { key = k; return fetch(`${BASE}/flows/image`, { method: "POST", headers: { "xi-api-key": k, "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) }); });
    const { id } = await created.json();
    if (!id) throw new ElevenLabsError("image: no generation id in the answer", { code: "bad_answer" });
    const until = Date.now() + timeoutMs;
    let wait = 2000;
    while (Date.now() < until) {
        await new Promise((r) => setTimeout(r, wait));
        wait = Math.min(wait + 1000, 5000);
        const res = await fetch(`${BASE}/flows/image/${encodeURIComponent(id)}`, { headers: { "xi-api-key": key }, signal: AbortSignal.timeout(20000) });
        const g = await res.json().catch(() => ({}));
        if (!res.ok) throw new ElevenLabsError(`image: ${res.status} ${g?.detail?.message || ""}`.trim(), { status: res.status });
        if (g.status === "completed") {
            const file = await fetch(g.content_url, { signal: AbortSignal.timeout(60000) });
            if (!file.ok) throw new ElevenLabsError(`image: download ${file.status}`, { status: file.status });
            return { buffer: Buffer.from(await file.arrayBuffer()), mimeType: g.content_mime_type || file.headers.get("content-type") || "image/png", model: modelId, id };
        }
        if (g.status === "failed") throw new ElevenLabsError(`image: ${g.error_message || g.failure_reason || "failed"}`, { code: g.failure_reason });
    }
    throw new ElevenLabsError("image: took too long", { code: "timeout" });
}
