// Read aloud, sentence by sentence (owner, 2026-11-15: "by pressing the aloud button why 4 sec delay"): the whole
// answer used to be made into one sound file before a single word was sent, so the wait grew with the answer. The
// text is cut into pieces here, each piece is voiced on its own, and the first one is on its way while the rest
// are still being made (ai-speak.controller.js speakStream).
//
// - a piece ends at the end of a sentence (. ! ? the Devanagari danda, or a line break);
// - the FIRST piece is short (the first sentence, cut at a comma when it is long), so the voice starts soon;
// - a very long sentence is cut at a comma, else at a space;
// - short sentences after the first two pieces are joined, so a list of one-word lines is not a request each.

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
