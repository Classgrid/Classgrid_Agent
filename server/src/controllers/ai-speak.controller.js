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

export const speakAnswer = async (req, res) => {
    try {
        if (req.body?.sample) return await voiceSample(req, res);
        const text = spokenText(req.body?.text);
        if (!text) return res.status(400).json({ error: "There is nothing to read in this answer.", code: "nothing_to_read" });
        if (!elevenLabsEnabled()) return res.status(503).json({ error: "Voice is not set up right now. Try again later.", code: "voice_unavailable" });

        const userId = String(req.user._id);
        const config = await GlobalAiConfig.findOne({ key: "singleton" }).lean().catch(() => null);
        const maxChars = Math.max(200, Number(config?.voice_reply_max_chars) || 4000);
        const plan = await planOf(req.user).catch(() => null);
        const cap = plan ? Number(plan.voice_replies_per_day) : (config?.global_voice_replies_per_day === undefined ? 20 : Number(config.global_voice_replies_per_day));
        const who = plan ? `the ${plan.name} plan` : "your account";
        // Past the day's number (or with none included): a reading is paid from top-up credits (extra-usage.service.js)
        let extra = null;
        if (cap === 0 || (cap > 0 && (await usedToday(userId, KIND)) >= cap)) {
            const pay = await canPayExtra(req.user, KIND);
            if (pay.allowed) extra = pay;
            else if (cap === 0) return res.status(402).json({ error: `Voice replies are not included in ${who}. Upgrade your plan to have answers read aloud.${extraOfferText(KIND, pay.price)}`, code: "voice_not_included", plan: plan?.key, extraCredits: pay.price });
            else return res.status(429).json({ error: `You've used the ${cap} voice replies a day of ${who}. They refill on ${nextDayText()}.${extraOfferText(KIND, pay.price)}`, code: "voice_cap_reached", plan: plan?.key, extraCredits: pay.price });
        }

        const { text: spoken, cut } = cutToSentence(text, maxChars);
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

        addToday(userId, KIND, 1).catch(() => {});
        if (extra) chargeExtra(req.user, KIND, 1, extra.price).catch(() => {});
        AiUsageLog.create({ organization_id: req.user.organization_id || null, userId: req.user._id, provider: "elevenlabs", model: TTS_MODEL, feature: "chat_ai", success: true, latencyMs: Date.now() - started, metadata: { characters: spoken.length, cut, messageId: String(req.body?.messageId || "") } }).catch(() => {});
        console.log(`[speak] ${spoken.length} characters${cut ? " (cut)" : ""} in ${Date.now() - started} ms for ${req.user.email || userId}`);

        res.set({ "Content-Type": "audio/mpeg", "Content-Length": String(audio.length), "Cache-Control": "private, max-age=3600", "X-Voice-Cut": cut ? "1" : "0" });
        res.send(audio);
    } catch (err) {
        console.error("[speak]", err);
        res.status(500).json({ error: "The voice could not read this answer right now. Try again in a moment.", code: "voice_failed" });
    }
};
