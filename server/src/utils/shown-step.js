// What the chat is shown of a step: its result, cut to a size the app can hold, and a model's failure in plain words.
//
// 1. A step's result that is JSON stays JSON when it is cut.
// The copy of a helper's step that goes to the chat (the Agent map) is cut at 6,000 characters, and a woken answer's
// step at 4,000. The cards for an opened page and a web search read the result as JSON, so a long page, cut in the
// middle, could not be read and the card said "Failed" for a page that was opened and read without any problem
// (owner, 2026-11-24, the first day helpers could open pages: "what does it mean failed"). Now a JSON result is made
// shorter from the inside: its long texts are cut until the whole fits, and it is still JSON.
//
// 2. Why a model stopped, in plain words.
// When a helper's model fails and another takes over, the Agent map says why. It showed the provider's own error,
// with the provider's name and its raw JSON ("Anthropic 400: {"type":"error",...}"), to the person. The reason is
// now one plain phrase, and the main AI gets the same phrase, so it cannot repeat the raw error either.

// What the cards put on the screen is never cut: a website's name and its address (owner, 2026-11-24: "show
// everything, don't cut; the web search shows the websites to me just like the main agent's"). Only the long page
// text behind them, which no card shows, is made shorter.
const SHOWN_WHOLE = new Set(["title", "url", "id", "domain", "favicon", "part", "name"]);
const cutStrings = (value, each, key = "") => {
    if (typeof value === "string") return value.length > each && !(SHOWN_WHOLE.has(key) && value.length <= 600) ? `${value.slice(0, each)}…` : value;
    if (Array.isArray(value)) return value.map((v) => cutStrings(v, each, key));
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, cutStrings(v, each, k)]));
    return value;
};

// How long a JSON result may be when it is its list (the websites of a search) that makes it long
const LIST_MAX = 30000;
const shortLists = (value, keep) => {
    if (Array.isArray(value)) return value.slice(0, keep).map((v) => shortLists(v, keep));
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shortLists(v, keep)]));
    return value;
};

/** The text of a step's result (a handler may return { text, ... }) */
export const stepText = (out) => String(out && typeof out === "object" && "text" in out ? out.text : out ?? "");

/** A step's result for the chat, at most `max` characters; JSON stays JSON */
export function shownStepResult(out, max = 6000) {
    const text = stepText(out);
    if (text.length <= max) return text;
    const first = text.trimStart()[0];
    if (first === "{" || first === "[") {
        let parsed;
        try { parsed = JSON.parse(text); } catch { parsed = undefined; }
        if (parsed !== undefined) {
            // (its long texts shorter and shorter until the whole fits)
            for (const each of [2000, 800, 300, 120, 40]) {
                const cut = JSON.stringify(cutStrings(parsed, each));
                if (cut.length <= max) return cut;
            }
            // Still longer than max with every long text down to a few words: what is left is the list itself, the
            // websites with their names and addresses, and that is what the card shows. It is kept whole, up to a
            // far higher size. (The first version fell back to a plain cut here, which is not JSON: a search with
            // 15 websites, or with long addresses, still said "Could not parse search results. Failed".)
            const small = cutStrings(parsed, 40);
            const whole = JSON.stringify(small);
            const most = Math.max(max, LIST_MAX);
            if (whole.length <= most) return whole;
            // Longer even than that: its lists keep fewer items, and it is still JSON
            for (let keep = 64; keep >= 1; keep = Math.floor(keep / 2)) {
                const cut = JSON.stringify(shortLists(small, keep));
                if (cut.length <= most) return cut;
            }
            return Array.isArray(parsed) ? "[]" : "{}";
        }
    }
    return text.slice(0, max);
}

/** Why a model stopped, for the person and for the main AI: never the provider's name or its raw error */
export function plainModelError(error) {
    const text = String(error?.message || error || "");
    if (!text.trim() || /^no answer$/i.test(text.trim())) return "it gave no answer";
    if (/the model is not available right now/i.test(text)) return "it is not available right now";
    if (/usage limit|spend limit|credit balance|billing|quota|insufficient|payment/i.test(text)) return "it is not available right now";
    if (/\b429\b|rate.?limit|too many requests|overloaded|\b529\b/i.test(text)) return "it was too busy";
    if (/\b408\b|timeout|timed out|aborted/i.test(text)) return "it took too long to answer";
    if (/\b5\d\d\b|internal server error|bad gateway|unavailable/i.test(text)) return "it had a problem on its side";
    if (/\b401\b|\b403\b|unauthori[sz]ed|forbidden|invalid.{0,20}key/i.test(text)) return "it is not available right now";
    return "it could not go on";
}
