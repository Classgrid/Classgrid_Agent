// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
// When Cloudflare's free Neurons of the day are used up, text work moves to Claude (owner, 2026-11-17: "we have
// 10 thousand free; after finishing those, all fall back to Claude models, depending on the task: helpers use
// Sonnet, summary and titles use Claude").
//
// It only happens while the super admin's "Cloudflare daily Neuron cap" switch is on (services/cf-neuron-cap.service.js:
// 9,500 of Cloudflare's free 10,000, UTC day). With the switch off nothing is refused and nothing moves. Before this,
// a capped Cloudflare request fell to Mistral Nemo or stopped. Two moments:
//   - The day is used up (today's count, with the room held for requests on their way, has reached the cap): the job
//     starts on Claude (claudeWhenCapped, asked before the job).
//   - The day is not used up, but this one request does not fit (the cap holds room for the MOST a request can cost:
//     a big model's round is refused long before a small one's), or the cap is reached in the middle of a job: the
//     request is refused (CfNeuronCapError) and Claude goes on from there (claudeFor: streamChat's capStandIn in
//     llm-stream.js finishes the answer from where it stands; a single request is simply asked again on Claude).
//
// Which Claude model does which job:
//   hard    the main answer for a longer or harder message  -> Claude Sonnet
//   simple  the main answer for a short simple message, and voice mode's answer -> Claude Haiku
//   helper  a helper in Project Mode or Studio              -> Claude Sonnet
//   small   chat titles, the short message titles, the chat's summary, the file reader, looking at a picture
//           (analyze_image) and the small model that checks a WhatsApp or call task -> Claude Haiku
// It is the system's choice, not the person's pick: no plan gate applies (a Free plan has no Claude to pick, but
// its answers still have to come from somewhere), and the answer is counted on the person's normal limits at the
// model's own rate, never on a plan's weekly Claude credits.
// The chat does not say that Claude answered in place of the picked model: no event, no line under the answer, nothing
// kept with the saved answer (owner, 2026-11-17, about an "Answered by Claude Haiku" line that was added and taken
// out the same day: "why you added that, it was good, so the user doesn't know").
import { capSettings, spokenForToday } from "./cf-neuron-cap.service.js";

export const CAP_SONNET = "claude-sonnet-5-5";
export const CAP_HAIKU = "claude-haiku-5-5";
const BY_JOB = { hard: CAP_SONNET, simple: CAP_HAIKU, helper: CAP_SONNET, small: CAP_HAIKU };
const KEEP_MS = 5000; // one answer asks several times (the answer, its helpers, its title)

let kept = { at: 0, value: false };
export const forgetCapState = () => { kept = { at: 0, value: false }; };

/**
 * True while the cap switch is on and today's free Neurons are used up (what is counted, plus the room held for
 * requests on their way). A count that cannot be read counts as used up, because the gate refuses Cloudflare then too.
 */
export async function cloudflareCapped(now = Date.now()) {
    if (now - kept.at < KEEP_MS) return kept.value;
    let value = false;
    try {
        const s = await capSettings();
        if (s?.enabled) {
            try { value = (await spokenForToday()) >= s.cap; } catch { value = true; }
        }
    } catch {
        value = false; // the settings could not be read: Cloudflare is tried as usual
    }
    kept = { at: now, value };
    return value;
}

/**
 * The Claude model that does `job` in place of a Cloudflare model, or null when Claude can't be used (no Anthropic
 * key, the Claude family switched off, or the model turned off in the Model manager: then the other Claude model, or
 * null when both are off). It does not look at the cap: it is for the moment the cap has just refused a request.
 */
export function claudeFor(job, { claudeOff = false, disabled = [] } = {}) {
    if (claudeOff || !process.env.ANTHROPIC_API_KEY) return null;
    const off = Array.isArray(disabled) ? disabled : [];
    const first = BY_JOB[job] || CAP_HAIKU;
    if (!off.includes(first)) return first;
    const other = first === CAP_SONNET ? CAP_HAIKU : CAP_SONNET;
    return off.includes(other) ? null : other;
}

/**
 * The Claude model that does `job` while Cloudflare is capped, or null when Cloudflare should be used as usual (not
 * capped) or Claude can't be used (claudeFor). Asked before a job starts.
 */
export async function claudeWhenCapped(job, opts = {}) {
    if (opts.claudeOff || !process.env.ANTHROPIC_API_KEY) return null;
    if (!(await cloudflareCapped())) return null;
    return claudeFor(job, opts);
}

/**
 * The parts of a finished job's usage, each with the model it is counted at: one part for a job a single model did;
 * for a job a Claude stand-in finished (result.standIn, llm-stream.js), the Cloudflare model's rounds before the cap
 * refused one, then the stand-in's rounds. Parts that used nothing are left out.
 */
export function usageParts(result, model) {
    const parts = result?.standIn
        ? [{ usage: result.standIn.before?.usage, model: result.standIn.before?.model || model }, { usage: result.usage, model: result.servedModel || result.standIn.model }]
        : [{ usage: result?.usage, model }];
    return parts.filter((p) => p.usage?.total_tokens > 0);
}

/** The picture's type from its first bytes (what Claude's API accepts), or null */
export function imageTypeOf(buffer) {
    const b = buffer || Buffer.alloc(0);
    if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
    if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
    if (b.length > 6 && b.slice(0, 3).toString("latin1") === "GIF") return "image/gif";
    if (b.length > 12 && b.slice(0, 4).toString("latin1") === "RIFF" && b.slice(8, 12).toString("latin1") === "WEBP") return "image/webp";
    return null;
}

/**
 * A Claude model looks at one picture and answers the question about it (the stand-in for Cloudflare's vision model
 * while Cloudflare is capped). Returns { answer, usage } with usage in the usual prompt_tokens / completion_tokens
 * shape. Throws when the picture is not a type Claude reads, or the request fails.
 */
export async function claudeSeesImage(model, buffer, question) {
    const type = imageTypeOf(buffer);
    if (!type) throw new Error("this picture type can't be read");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
            model,
            max_tokens: 2000,
            messages: [{
                role: "user",
                content: [
                    { type: "image", source: { type: "base64", media_type: type, data: buffer.toString("base64") } },
                    { type: "text", text: String(question || "Describe this image in high detail, extracting all text and explaining visual elements.") },
                ],
            }],
        }),
        signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) throw new Error(`Claude could not read the picture (HTTP ${res.status})`);
    const json = await res.json();
    const answer = (json.content || []).filter((c) => c?.type === "text").map((c) => c.text).join("\n").trim();
    const input = json.usage?.input_tokens || 0;
    const output = json.usage?.output_tokens || 0;
    return { answer, usage: { prompt_tokens: input, completion_tokens: output, total_tokens: input + output } };
}
