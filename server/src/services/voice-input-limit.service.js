// The plan's voice input minutes per day (plans on, India time), for every place that turns a user's voice into
// text: voice notes in chats (routes/voice.routes.js) and the phone's voice mode (controllers/ai-voice.controller.js).
// A count that cannot be read never blocks. Past the day's minutes, each started minute is paid from top-up credits
// (extra-usage.service.js): the check says so with { extra: true } and countVoiceInput charges once the audio was heard.
import { planOf } from "./plan-limits.service.js";
import { usedToday, addToday, nextDayText } from "./plan-usage.service.js";
import { canPayExtra, chargeExtra, extraOfferText } from "./extra-usage.service.js";

/** { allowed: true, extra?, price? } or { allowed: false, error } */
export async function voiceInputAllowed(user) {
    const plan = await planOf(user).catch(() => null);
    if (!plan) return { allowed: true };
    const cap = Number(plan.voice_input_minutes_per_day);
    if (cap < 0) return { allowed: true };
    const used = await usedToday(String(user._id), "voiceinput");
    if (cap > 0 && used / 60 < cap) return { allowed: true };
    const extra = await canPayExtra(user, "voiceinput");
    if (extra.allowed) return { allowed: true, extra: true, price: extra.price };
    if (cap === 0) return { allowed: false, error: `Voice input is not included in the ${plan.name} plan. Upgrade your plan, or type instead.${extraOfferText("voiceinput", extra.price)}` };
    return { allowed: false, error: `You've used the ${cap} minutes of voice input a day of your ${plan.name} plan. It refills on ${nextDayText()}. Upgrade your plan, or type instead.${extraOfferText("voiceinput", extra.price)}` };
}

/** Counts the seconds that were heard on the day's minutes (and charges the extra minutes when the day's are used) */
export function countVoiceInput(user, gate, seconds) {
    addToday(String(user._id), "voiceinput", seconds).catch(() => {});
    if (gate?.extra) chargeExtra(user, "voiceinput", Math.max(1, Math.ceil((Number(seconds) || 0) / 60)), gate.price).catch(() => {});
}

/** Raw 16-bit little-endian mono PCM as a WAV file (what the speech-to-text services take) */
export function pcmToWav(pcm, sampleRate = 16000) {
    const n = pcm.length - (pcm.length % 2);
    const b = Buffer.alloc(44 + n);
    b.write("RIFF", 0); b.writeUInt32LE(36 + n, 4); b.write("WAVE", 8); b.write("fmt ", 12);
    b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sampleRate, 24);
    b.writeUInt32LE(sampleRate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n, 40);
    pcm.copy(b, 44, 0, n);
    return b;
}
