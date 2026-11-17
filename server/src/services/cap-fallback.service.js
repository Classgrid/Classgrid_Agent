// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
// When Cloudflare's free Neurons of the day are used up, text work moves to Claude (owner, 2026-11-17: "we have
// 10 thousand free; after finishing those, all fall back to Claude models, depending on the task: helpers use
// Sonnet, summary and titles use Claude").
//
// It only happens while the super admin's "Cloudflare daily Neuron cap" switch is on and today's count has reached
// the cap (services/cf-neuron-cap.service.js: 9,500 of Cloudflare's free 10,000, UTC day). With the switch off
// nothing is refused and nothing moves. Before this, a capped Cloudflare request fell to Mistral Nemo or stopped.
//
// Which Claude model does which job:
//   hard    the main answer for a longer or harder message  -> Claude Sonnet
//   simple  the main answer for a short simple message, and voice mode's answer -> Claude Haiku
//   helper  a helper in Project Mode or Studio              -> Claude Sonnet
//   small   chat titles, the short message titles, the chat's summary, the file reader -> Claude Haiku
// It is the system's choice, not the person's pick: no plan gate applies (a Free plan has no Claude to pick, but
// its answers still have to come from somewhere), and the answer is counted on the person's normal limits at the
// model's own rate, never on a plan's weekly Claude credits.
import { capSettings, usedToday } from "./cf-neuron-cap.service.js";

export const CAP_SONNET = "claude-sonnet-5-5";
export const CAP_HAIKU = "claude-haiku-5-5";
const BY_JOB = { hard: CAP_SONNET, simple: CAP_HAIKU, helper: CAP_SONNET, small: CAP_HAIKU };
const KEEP_MS = 5000; // one answer asks several times (the answer, its helpers, its title)

let kept = { at: 0, value: false };
export const forgetCapState = () => { kept = { at: 0, value: false }; };

/**
 * True while the cap switch is on and today's free Neurons are used up. A count that cannot be read counts as used
 * up, because the gate refuses Cloudflare then too.
 */
export async function cloudflareCapped(now = Date.now()) {
    if (now - kept.at < KEEP_MS) return kept.value;
    let value = false;
    try {
        const s = await capSettings();
        if (s?.enabled) {
            try { value = (await usedToday()) >= s.cap; } catch { value = true; }
        }
    } catch {
        value = false; // the settings could not be read: Cloudflare is tried as usual
    }
    kept = { at: now, value };
    return value;
}

/**
 * The Claude model that does `job` while Cloudflare is capped, or null when Cloudflare should be used as usual
 * (not capped), or Claude can't be (no Anthropic key, the Claude family switched off, or the model turned off in the
 * Model manager: then the other Claude model, or null when both are off).
 */
export async function claudeWhenCapped(job, { claudeOff = false, disabled = [] } = {}) {
    if (claudeOff || !process.env.ANTHROPIC_API_KEY) return null;
    if (!(await cloudflareCapped())) return null;
    const off = Array.isArray(disabled) ? disabled : [];
    const first = BY_JOB[job] || CAP_HAIKU;
    if (!off.includes(first)) return first;
    const other = first === CAP_SONNET ? CAP_HAIKU : CAP_SONNET;
    return off.includes(other) ? null : other;
}
