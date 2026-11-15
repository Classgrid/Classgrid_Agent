// Read aloud, sentence by sentence (owner, 2026-11-15: "by pressing the aloud button why 4 sec delay"): the whole
// answer used to be made into one sound file before a single word was sent, so the wait grew with the answer. The
// text is cut into pieces here, each piece is voiced on its own, and the first one is on its way while the rest
// are still being made (ai-speak.controller.js speakStream).
//
// - a piece ends at the end of a sentence (. ! ? the Devanagari danda, or a line break);
// - the FIRST piece is short (the first sentence, cut at a comma when it is long), so the voice starts soon;
// - a very long sentence is cut at a comma, else at a space;
// - short sentences after the first two pieces are joined, so a list of one-word lines is not a request each.

// The sound of a piece, by what the phone asked for in the request's `audio`:
//   (nothing)  raw sound, pcm_24000: what the first phone builds with read aloud as a stream play (1.0.24, 1.0.25)
//   "mp3"      compressed, mp3_24000_48: about a tenth of the raw sound's size. The raw first sentence was about
//              174 KB on the wire and the line to a phone in India carried about 40 KB a second, so the first word
//              waited 4 to 5 seconds for its download (owner, 2026-11-15: "aloud still takes 4-5 sec"). The phone
//              decodes each piece and plays it on the same speaker.
// Both are 24 kHz mono, so the phone's speaker is the same for the two.
const STREAM_AUDIO = {
    pcm: { format: "pcm_24000", sampleRate: 24000, encoding: "pcm" },
    mp3: { format: "mp3_24000_48", sampleRate: 24000, encoding: "mp3" },
};
export const streamAudioFor = (asked) => (String(asked || "").trim().toLowerCase() === "mp3" ? STREAM_AUDIO.mp3 : STREAM_AUDIO.pcm);

const FIRST_MAX = 140;
const PIECE_MAX = 320;
const JOIN_UP_TO = 160;

/** `sentence` in parts of at most `limit` characters, cut at a comma, a semicolon or a colon, else at a space. */
function cutLong(sentence, limit) {
    const out = [];
    let rest = sentence;
    while (rest.length > limit) {
        const head = rest.slice(0, limit);
        let at = Math.max(head.lastIndexOf(", "), head.lastIndexOf("; "), head.lastIndexOf(": "));
        if (at < limit * 0.4) at = head.lastIndexOf(" ");
        if (at < limit * 0.4) at = limit - 1;
        out.push(rest.slice(0, at + 1).trim());
        rest = rest.slice(at + 1).trim();
    }
    if (rest) out.push(rest);
    return out;
}

/** The pieces of `text` to voice, in the order they are read. */
export function speakPieces(text) {
    const clean = String(text || "").trim();
    if (!clean) return [];
    const sentences = clean.split(/(?<=[.!?।])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
    const pieces = [];
    for (const sentence of sentences) {
        for (const part of cutLong(sentence, pieces.length === 0 ? FIRST_MAX : PIECE_MAX)) {
            const last = pieces[pieces.length - 1];
            if (pieces.length > 1 && last.length + part.length + 1 <= JOIN_UP_TO) pieces[pieces.length - 1] = `${last} ${part}`;
            else pieces.push(part);
        }
    }
    return pieces;
}
