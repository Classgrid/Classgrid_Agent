// Read an answer aloud (the speaker button beside the thumbs on an answer, web app only; owner, 2026-11-14):
// ElevenLabs speech in Classgrid's voice (elevenlabs.service.js, ELEVENLABS_VOICE_ID). Every reading counts as one
// voice reply of the day: the plan's voice_replies_per_day while plans are on, otherwise the super admin's global
// setting global_voice_replies_per_day. One reading is at most voice_reply_max_chars characters (global setting);
// a longer answer is read up to its last full sentence inside that length. Nothing here is fixed in code.
import GlobalAiConfig from "../models/GlobalAiConfig.js";
import AiUsageLog from "../models/AiUsageLog.js";
import { textToSpeech, elevenLabsEnabled, TTS_MODEL } from "../services/elevenlabs.service.js";
import { planOf } from "../services/plan-limits.service.js";
import { usedToday, addToday, nextDayText } from "../services/plan-usage.service.js";
import { canPayExtra, chargeExtra, extraOfferText } from "../services/extra-usage.service.js";
import { VOICE_CHOICES, voiceIdFor, publicVoiceChoices } from "../services/voice-choices.js";
import { speakPieces, streamAudioFor } from "../services/speak-pieces.service.js";

const KIND = "voicereply"; // the per-day counter's name (plan-usage.service.js)

/** The words a voice should say, from the answer's markdown (code, tables, links, emoji and markup are not read) */
export function spokenText(markdown) {
    return String(markdown || "")
        .replace(/```[\s\S]*?```/g, " ")                         // code blocks
        .replace(/<[^>]+>/g, " ")                                // html tags
        .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")                   // pictures
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")                 // links: their words
        .replace(/^\s*\|[^\n]*\|\s*$/gm, " ")                    // table rows
        .replace(/^\s*[-:| ]+\s*$/gm, " ")                       // table separators / rules
        .replace(/^#{1,6}\s+/gm, "")                             // headings
        .replace(/(\*\*|__)(.+?)\1/g, "$2")                      // bold
        .replace(/(\*|_)(.+?)\1/g, "$2")                         // italic
        .replace(/`([^`]+)`/g, "$1")                             // inline code
        .replace(/^\s*>\s?/gm, "")                               // quotes
        .replace(/^\s*[-*+]\s+/gm, "")                           // bullets
        .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "") // emoji
        .replace(/[ \t]+/g, " ")
        .replace(/\n{2,}/g, "\n")
        .trim();
}

/** The first `max` characters, cut at the last sentence end inside them when there is one */
function cutToSentence(text, max) {
    if (text.length <= max) return { text, cut: false };
    const head = text.slice(0, max);
    const end = Math.max(head.lastIndexOf(". "), head.lastIndexOf("।"), head.lastIndexOf("? "), head.lastIndexOf("! "), head.lastIndexOf("\n"));
    return { text: (end > max * 0.5 ? head.slice(0, end + 1) : head).trim(), cut: true };
}

// GET /api/ai/voices: the voices the user can pick (voice-choices.js)
export const listVoices = (req, res) => res.json({ voices: publicVoiceChoices(), enabled: elevenLabsEnabled() });

// A voice's short sample for the picker: a fixed sentence, made once per voice and kept in memory, not counted as a
// voice reply (the app plays it when a voice is tapped)
const samples = new Map();
async function voiceSample(req, res) {
    const choice = VOICE_CHOICES.find((v) => v.key === String(req.body?.sample || ""));
    if (!choice) return res.status(400).json({ error: "Unknown voice.", code: "unknown_voice" });
    if (!elevenLabsEnabled()) return res.status(503).json({ error: "Voice is not set up right now. Try again later.", code: "voice_unavailable" });
    let audio = samples.get(choice.key);
    if (!audio) {
        audio = await textToSpeech(`Hi, I'm ${choice.name}. This is how I'll sound when we talk in Classgrid.`, { voiceId: voiceIdFor(choice.key), outputFormat: "mp3_44100_128", timeoutMs: 30000 });
        if (!audio?.length) return res.status(502).json({ error: "This voice could not be played right now.", code: "voice_failed" });
        samples.set(choice.key, audio);
    }
    res.set({ "Content-Type": "audio/mpeg", "Content-Length": String(audio.length), "Cache-Control": "private, max-age=86400" });
    return res.send(audio);
}

/**
 * May this user have one more voice reply now? The day's number comes from the plan (voice_replies_per_day) while
 * plans are on, otherwise from the global setting; past it (or with none included) a reply is paid from top-up
 * credits when extras are on (extra-usage.service.js). Returns { allowed: true, extra, maxChars } or
 * { allowed: false, status, body } (the answer for the app: 402 voice_not_included or 429 voice_cap_reached).
 * Nothing is counted here: call countVoiceReply once a reply was really read. Used by the speaker button (below)
 * and by the phone app's fast voice mode (ai-voice.controller.js), so both count against the same number.
 */
export async function voiceReplyGate(user) {
    const config = await GlobalAiConfig.findOne({ key: "singleton" }).lean().catch(() => null);
    const maxChars = Math.max(200, Number(config?.voice_reply_max_chars) || 4000);
    const plan = await planOf(user).catch(() => null);
    const cap = plan ? Number(plan.voice_replies_per_day) : (config?.global_voice_replies_per_day === undefined ? 20 : Number(config.global_voice_replies_per_day));
    const who = plan ? `the ${plan.name} plan` : "your account";
    // Past the day's number (or with none included): a reading is paid from top-up credits (extra-usage.service.js)
    let extra = null;
    if (cap === 0 || (cap > 0 && (await usedToday(String(user._id), KIND)) >= cap)) {
        const pay = await canPayExtra(user, KIND);
        if (pay.allowed) extra = pay;
        else if (cap === 0) return { allowed: false, status: 402, body: { error: `Voice replies are not included in ${who}. Upgrade your plan to have answers read aloud.${extraOfferText(KIND, pay.price)}`, code: "voice_not_included", plan: plan?.key, extraCredits: pay.price } };
        else return { allowed: false, status: 429, body: { error: `You've used the ${cap} voice replies a day of ${who}. They refill on ${nextDayText()}.${extraOfferText(KIND, pay.price)}`, code: "voice_cap_reached", plan: plan?.key, extraCredits: pay.price } };
    }
    return { allowed: true, extra, maxChars };
}

/** One voice reply was read: it counts for the day, and an extra one (past the day's number) is paid from top-up credits */
export function countVoiceReply(user, gate) {
    addToday(String(user._id), KIND, 1).catch(() => {});
    if (gate?.extra) chargeExtra(user, KIND, 1, gate.extra.price).catch(() => {});
}

// How many pieces are being voiced at the same time (they are always sent in their order)
const PIECES_AHEAD = 3;

// The reading as a stream (text/event-stream, each event one `data: {json}` line, `data: [DONE]` last):
//   { type: "audio", index, text, format, sampleRate: 24000, encoding, data }   data: base64 of that piece's sound;
//                                 "" with failed: true when it could not be voiced. The sound is what the request's
//                                 `audio` asked for (speak-pieces.service.js streamAudioFor):
//                                   (nothing)  encoding "pcm", format "pcm_24000": 16-bit little-endian mono PCM
//                                   "mp3"      encoding "mp3", format "mp3_24000_48": one whole mp3 per piece,
//                                              about a tenth of the size, so the first word is not kept waiting
//                                              by its download
//   { type: "done", cut, pieces }  every piece was sent (cut: the answer was longer than one reading may be)
//   { type: "error", message, code }  the first piece could not be voiced: nothing was read
// The same events voice mode sends (ai-voice.controller.js), so the phone plays them with the same speaker.
// The reading counts as one voice reply once its first piece is voiced. When the phone closes the stream (the
// user tapped stop), no more pieces are made.
async function speakStream(req, res, { spoken, cut, gate }) {
    const pieces = speakPieces(spoken);
    const audio = streamAudioFor(req.body?.audio);
    const classgridVoice = voiceIdFor("classgrid");
    let voiceId = voiceIdFor(String(req.body?.voice || ""));
    const started = Date.now();
    const userId = String(req.user._id);

    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no", // tells NGINX to pass every event on at once instead of buffering
    });
    // 2 KB of padding makes NGINX and the load balancer pass the headers on and start the stream at once
    res.write(":" + Array(2048).join(" ") + "\n\n");
    res.flushHeaders?.();
    res.socket?.setNoDelay?.(true);

    let closed = false;
    res.on("close", () => { closed = true; });
    const send = (event) => {
        if (closed || res.writableEnded) return;
        try { res.write(`data: ${JSON.stringify(event)}\n\n`); } catch { /* the phone left */ }
    };

    // One piece's sound: the picked voice; if ElevenLabs refuses that voice, Classgrid's own voice reads on
    const voice = async (words) => {
        const make = (id) => textToSpeech(words, { voiceId: id, outputFormat: audio.format, timeoutMs: 20000 });
        let pcm;
        try {
            pcm = await make(voiceId);
        } catch (voiceErr) {
            if (voiceId === classgridVoice) throw voiceErr;
            console.error(`[speak] voice ${req.body?.voice} failed, using Classgrid's voice:`, voiceErr.message);
            voiceId = classgridVoice; // (the pieces after this one too)
            pcm = await make(classgridVoice);
        }
        if (audio.encoding !== "pcm") return pcm; // (a whole mp3: every byte of it)
        return pcm.length % 2 ? pcm.subarray(0, pcm.length - 1) : pcm; // (16-bit samples: a whole number of them)
    };

    const jobs = new Map();
    const begin = (i) => {
        if (i < pieces.length && !jobs.has(i) && !closed) jobs.set(i, voice(pieces[i]).then((pcm) => ({ pcm }), (error) => ({ error })));
    };

    let sent = 0;
    let firstMs = null;
    let lastError = "";
    for (let i = 0; i < pieces.length && !closed; i++) {
        for (let k = i; k < i + PIECES_AHEAD; k++) begin(k);
        const { pcm, error } = await jobs.get(i);
        jobs.delete(i);
        if (closed) break;
        if (error || !pcm?.length) {
            lastError = String(error?.message || "no sound came back").slice(0, 500);
            console.error(`[speak] piece ${i + 1}/${pieces.length} failed:`, lastError);
            if (sent === 0) {
                send({ type: "error", message: "The voice could not read this answer right now. Try again in a moment.", code: "voice_failed" });
                break;
            }
            send({ type: "audio", index: i, text: pieces[i], ...audio, data: "", failed: true });
            continue;
        }
        if (sent === 0) {
            firstMs = Date.now() - started;
            countVoiceReply(req.user, gate);
        }
        send({ type: "audio", index: i, text: pieces[i], ...audio, data: pcm.toString("base64") });
        sent++;
    }

    if (!closed && !res.writableEnded) {
        if (sent > 0) send({ type: "done", cut, pieces: pieces.length });
        try { res.write("data: [DONE]\n\n"); res.end(); } catch { /* the phone left */ }
    }
    AiUsageLog.create({
        organization_id: req.user.organization_id || null, userId: req.user._id, provider: "elevenlabs", model: TTS_MODEL, feature: "chat_ai",
        success: sent > 0, ...(sent > 0 ? {} : { error: lastError || "stopped before the first piece" }), latencyMs: Date.now() - started,
        metadata: { characters: spoken.length, cut, stream: true, audio: audio.format, pieces: pieces.length, sent, firstMs, stopped: closed, messageId: String(req.body?.messageId || "") },
    }).catch(() => {});
    console.log(`[speak] stream: ${sent}/${pieces.length} pieces of ${spoken.length} characters${cut ? " (cut)" : ""}, first voice in ${firstMs ?? "-"} ms, ${Date.now() - started} ms in all${closed ? " (stopped by the phone)" : ""} for ${req.user.email || userId}`);
}

export const speakAnswer = async (req, res) => {
    try {
        if (req.body?.sample) return await voiceSample(req, res);
        const text = spokenText(req.body?.text);
        if (!text) return res.status(400).json({ error: "There is nothing to read in this answer.", code: "nothing_to_read" });
        if (!elevenLabsEnabled()) return res.status(503).json({ error: "Voice is not set up right now. Try again later.", code: "voice_unavailable" });

        const userId = String(req.user._id);
        const gate = await voiceReplyGate(req.user);
        if (!gate.allowed) return res.status(gate.status).json(gate.body);
        const { maxChars } = gate;

        const { text: spoken, cut } = cutToSentence(text, maxChars);
        // The phone app asks for the reading as a stream (stream: true): sentence by sentence, the first one on its
        // way while the others are still being made. Without it (the website) the whole reading is one mp3, as before.
        if (req.body?.stream === true) return await speakStream(req, res, { spoken, cut, gate });
        const started = Date.now();
        let audio;
        // The voice the user picked (voice-choices.js); if ElevenLabs refuses that voice, Classgrid's own voice reads it
        const voiceId = voiceIdFor(String(req.body?.voice || ""));
        try {
            try {
                audio = await textToSpeech(spoken, { voiceId, outputFormat: "mp3_44100_128", timeoutMs: 60000 });
            } catch (voiceErr) {
                if (voiceId === voiceIdFor("classgrid")) throw voiceErr;
                console.error(`[speak] voice ${req.body?.voice} failed, using Classgrid's voice:`, voiceErr.message);
                audio = await textToSpeech(spoken, { outputFormat: "mp3_44100_128", timeoutMs: 60000 });
            }
        } catch (e) {
            console.error("[speak] ElevenLabs failed:", e.message);
            AiUsageLog.create({ organization_id: req.user.organization_id || null, userId: req.user._id, provider: "elevenlabs", model: TTS_MODEL, feature: "chat_ai", success: false, error: String(e.message).slice(0, 500), latencyMs: Date.now() - started, metadata: { characters: spoken.length, messageId: String(req.body?.messageId || "") } }).catch(() => {});
            return res.status(502).json({ error: "The voice could not read this answer right now. Try again in a moment.", code: "voice_failed" });
        }
        if (!audio?.length) return res.status(502).json({ error: "The voice could not read this answer right now. Try again in a moment.", code: "voice_failed" });

        countVoiceReply(req.user, gate);
        AiUsageLog.create({ organization_id: req.user.organization_id || null, userId: req.user._id, provider: "elevenlabs", model: TTS_MODEL, feature: "chat_ai", success: true, latencyMs: Date.now() - started, metadata: { characters: spoken.length, cut, messageId: String(req.body?.messageId || "") } }).catch(() => {});
        console.log(`[speak] ${spoken.length} characters${cut ? " (cut)" : ""} in ${Date.now() - started} ms for ${req.user.email || userId}`);

        res.set({ "Content-Type": "audio/mpeg", "Content-Length": String(audio.length), "Cache-Control": "private, max-age=3600", "X-Voice-Cut": cut ? "1" : "0" });
        res.send(audio);
    } catch (err) {
        console.error("[speak]", err);
        res.status(500).json({ error: "The voice could not read this answer right now. Try again in a moment.", code: "voice_failed" });
    }
};
