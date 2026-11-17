// Priority at peak (owner, 2026-11-17: the Max plan's "priority at peak" must be real, not only shown).
// Each server process counts the AI answers it is running. While fewer than the Global AI Config number
// `peak_answers_at_once` run, every answer starts at once. At that number the server is at its peak: an answer for a
// person whose plan has `priority` on (Max) still starts at once, everyone else waits in line, first come first
// served, and starts when an answer ends. 0 turns the line off (every answer starts at once, as before).
// Staff and plans off: no plan, so no priority and no line skip, but the line still applies to them only when it is
// on. A person who stops waiting (closes the chat) leaves the line. Nothing here is stored: a restart empties it.
import GlobalAiConfig from "../models/GlobalAiConfig.js";

export const DEFAULT_PEAK_ANSWERS = 40;
const CONFIG_KEEP_MS = 30 * 1000;

let running = 0;
const waiting = []; // { resolve, cancelled }
let cfgCache = { at: 0, value: DEFAULT_PEAK_ANSWERS };

/** The number from Global AI Config (kept 30 s); 0 = no line */
export async function peakAnswersAtOnce() {
    if (Date.now() - cfgCache.at < CONFIG_KEEP_MS) return cfgCache.value;
    const cfg = await GlobalAiConfig.findOne({ key: "singleton" }).select("peak_answers_at_once").lean().catch(() => null);
    const n = Number(cfg?.peak_answers_at_once);
    cfgCache = { at: Date.now(), value: Number.isFinite(n) && n >= 0 ? Math.trunc(n) : DEFAULT_PEAK_ANSWERS };
    return cfgCache.value;
}

function startNext(limit) {
    while (waiting.length && (limit === 0 || running < limit)) {
        const next = waiting.shift();
        if (next.cancelled) continue;
        running++;
        next.resolve();
    }
}

/**
 * Wait for a place to answer. `priority`: the person's plan has priority (Max). `signal`: the request's AbortSignal
 * (closing the chat leaves the line). `onWait()` is called once when the answer has to wait. Resolves to a release
 * function, to call exactly once when the answer ends; rejects with an AbortError when the person left the line.
 * `limitOverride` is for tests.
 */
export async function takeAnswerPlace({ priority = false, signal = null, onWait = null, limitOverride } = {}) {
    const limit = limitOverride ?? (await peakAnswersAtOnce());
    let released = false;
    const release = () => {
        if (released) return;
        released = true;
        running = Math.max(0, running - 1);
        startNext(limit);
    };
    if (limit === 0 || priority || running < limit) {
        running++;
        return release;
    }
    if (signal?.aborted) throw Object.assign(new Error("aborted"), { name: "AbortError" });
    onWait?.();
    await new Promise((resolve, reject) => {
        const entry = { resolve, cancelled: false };
        waiting.push(entry);
        signal?.addEventListener("abort", () => {
            if (entry.cancelled) return;
            entry.cancelled = true;
            const i = waiting.indexOf(entry);
            if (i >= 0) {
                waiting.splice(i, 1);
                reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
            }
        }, { once: true });
    });
    return release;
}

/** For tests and the health page: answers running and waiting on this process */
export const answerLineState = () => ({ running, waiting: waiting.filter((w) => !w.cancelled).length });

/** For tests only */
export function _resetAnswerLine() {
    running = 0;
    waiting.length = 0;
    cfgCache = { at: 0, value: DEFAULT_PEAK_ANSWERS };
}
