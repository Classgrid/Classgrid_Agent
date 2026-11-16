// What a voice-mode turn's speech-to-text result holds as spoken words (POST /api/ai/voice/turn).
//
// Tested 2026-11-16 with speech, bus noise, a crowd and silence (the owner on a bus: "hello hello" got no answer).
// Speech was heard right even with noise louder than the voice. Sound with no words in it was not: it came back as
// a sound tag ("[static noise]", "[laughs]", "[लगातार शोर की आवाज़]") or, for silence, as Whisper's "Thank you.",
// and the AI answered it like a question. Here those become "nothing said", so the phone just listens on.

/** The text without sound tags: "[laughs]", "(music)", in any language. */
export const withoutSoundTags = (text) =>
    String(text || "")
        .replace(/\[[^\]\n]{0,80}\]|\([^)\n]{0,80}\)/g, " ")
        .replace(/\s+/g, " ")
        .trim();

const HAS_A_WORD = /[\p{L}\p{N}]/u;

// What Whisper writes for silence or noise (it is only asked when ElevenLabs is down). A person who really says only
// "thank you" in that moment is not answered, which is the lesser harm.
const WHISPER_INVENTS = new Set([
    "thank you",
    "thank you for watching",
    "thanks for watching",
    "please subscribe",
    "subtitles by the amara org community",
    "you",
]);

/**
 * The spoken words of a transcript, or "" when it holds none: only sound tags, only punctuation, or (from Whisper)
 * one of the lines it invents for silence. `by` is the service that heard it ("elevenlabs" | "cloudflare").
 */
export function spokenWords(text, by) {
    const words = withoutSoundTags(text);
    if (!words || !HAS_A_WORD.test(words)) return "";
    if (by === "cloudflare") {
        const plain = words.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
        if (WHISPER_INVENTS.has(plain)) return "";
    }
    return words;
}
