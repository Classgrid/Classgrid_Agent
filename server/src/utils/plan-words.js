// The AI never brings up the person's plan by itself (owner, 2026-11-24: "why will it tell about Free every time
// without being asked; only if the user asked"). Where the work can go on (fewer helpers, another model, credits that
// paid, a file that is not in the Library), it goes on and gives the limit only when the person asks. Where what the
// person asked for cannot be done at all (the picture limit, the usage used up), it says why, because the request failed.
//
// What the AI is told when the person's plan stops or shrinks something it is doing (owner, 2026-11-24, after a Free
// account's test: "find all limits and fix it so the AI knows its limit"). A check of every plan limit found places
// where the AI was told nothing, or only that something failed: it then guessed, promised what would be refused
// again, or reported cut work as finished. Every text here says that it is the plan's limit, which one, and what to
// do, and is for the AI (a tool's answer or a note in its prompt), never shown to the person as it is.
// The first of these, for helpers that did not start, is utils/helper-room.js.

/** "25 Nov, 12:38 am (India time)" for a time a limit comes back; "" when it is not known */
export function comesBackText(at) {
    const d = at ? new Date(at) : null;
    if (!d || Number.isNaN(d.getTime()) || d.getTime() <= Date.now()) return "";
    return `${d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} (India time)`;
}

/**
 * A helper whose work was cut because the person's usage ran out. Its answer used to come back as a FINISHED report
 * with the note written for the person at its end ("Stopped here: your plan's limit ran out... ask me to continue").
 * stopNote: that note (services/llm-stream.js BUDGET_STOP_NOTE), taken off what the helper wrote.
 */
export function helperLimitReport(answer, stopNote = "") {
    const soFar = String(answer || "").split(stopNote || "\u0000")[0].trim();
    // (what the main AI may do about it, starting the same helper again, comes with the report as its own note:
    // utils/helper-restart.js limitRestartHint. This text said "do not start this helper or any other again now: it
    // is refused until the limit comes back", which was not true once the person had usage again, and the main AI
    // answered "I can't restart it right now"; owner, 2026-11-24)
    return `the person's usage ran out while this helper was working, so it stopped before it finished. This is not a finished report.${soFar ? `\n\nWhat it had written before it stopped:\n${soFar}` : ""}`;
}

/** The file reader or file writer was cut by the limit: nothing of it is used (a cut file was written before) */
export const READER_LIMIT_ERROR = "the person's plan usage limit ran out in the middle of it, so nothing was read or written. Do not try it again now and do not do it another way: it is refused until the limit comes back. Tell the user plainly that their plan's usage limit ran out";

/** A tool that needs the person's usage (a picture) when it is used up. what: "made" for a new picture, "edited" */
export function usageUsedUpText(what, resetAt) {
    const when = comesBackText(resetAt);
    return `NOT ${what}: the person's plan usage limit is used up${when ? `, and it comes back on ${when}` : ""}. Do not call this tool again in this conversation and do not make the picture another way (no code, SVG, canvas, HTML or outside links). Tell the user plainly that their plan's usage limit is used up${when ? " and when it comes back" : ""}.`;
}

/** Every helper the plan allows is already working */
export function helpersBusyText({ maxHelpers = 5, planName = "" }) {
    const many = maxHelpers === 1 ? "1 helper" : `${maxHelpers} helpers`;
    const why = planName && maxHelpers < 5 ? `the ${planName} plan allows ${many} working at the same time in a chat` : `at most ${many} can work at the same time in a chat`;
    return `Error: no helper was started, because ${why} and ${maxHelpers === 1 ? "it is" : "they are"} already working. Do not call run_project_helpers again now: it is refused until a helper finishes (its report reaches you by itself). Wait for a report or do that work yourself. Do not bring up the plan or this limit by yourself; only if the user asks why no more helpers are working, say that ${why}.`;
}

/** Helpers are not in the plan at all */
export const helpersNotInPlanText = (planName = "") => `Error: helpers are not included in the ${planName ? `${planName} ` : ""}plan. Do the work yourself in this chat. Do not bring up the plan by yourself; only if the user asks for helpers or asks why none are working, say that their plan has none.`;

/**
 * Why a helper does not run on the model the main AI asked for. Returns "" when it does, or when no model was asked.
 * asked: what the main AI wrote; askedId: the model it means (null when no such model); ran: the model that runs.
 */
export function helperModelWhy({ asked = "", askedId = null, ran = "", fable = false, off = false, claude = false, planName = "", planHasClaude = true, planAllows = true, claudeLeft = true }) {
    if (!String(asked || "").trim() || (askedId && askedId === ran)) return "";
    const plan = planName ? `the person's ${planName} plan` : "the person's plan";
    if (!askedId) return "Classgrid has no model of that name";
    if (fable) return "Claude Fable is never used for a helper";
    if (off) return "that model is turned off right now";
    if (claude && !planHasClaude) return `Claude models are not in ${plan}`;
    if (!planAllows) return `that model is not in ${plan}`;
    if (claude && !claudeLeft) return `this week's Claude credits of ${plan} are used up`;
    return "that model cannot run a helper right now";
}

/** For the "Started N helper(s)" answer: the helpers that run on another model than the one asked for */
export function helperModelNote(changes = []) {
    const real = changes.filter((c) => c?.why);
    if (!real.length) return "";
    return `\n\nNot on the model you asked for:\n${real.map((c) => `Helper ${c.no} runs on ${c.ranName}, not ${c.askedName}: ${c.why}.`).join("\n")}\nGo on with these helpers as they are. Tell the user about it only if they asked for that model themselves.`;
}

/** The person picked Deep thinking and the plan does not have it: the answer runs at Normal */
export const thinkingNotInPlanNote = (planName = "") => `\n\n--- THINKING LEVEL ---\nThe user picked Deep thinking, but Deep thinking is not in their ${planName ? `${planName} ` : ""}plan, so this answer is written at the Normal level. Do not say that you thought deeply. If they ask why, tell them plainly that Deep thinking is not in their plan.`;

/** Older messages of the chat are not in front of the AI because of the plan's context size */
export const contextCutNote = (dropped, planName = "") => `\n\n--- OLDER MESSAGES ---\nThe ${dropped} oldest message${dropped === 1 ? "" : "s"} of this chat ${dropped === 1 ? "is" : "are"} not in front of you: the user's ${planName ? `${planName} ` : ""}plan carries a limited amount of a chat at once. They are covered by the chat's summary, and you can read them with recall_chat and search_recall_chat. Never tell the user that something was not said: look it up first.`;

// ── Calls and the work that comes from them ──

/**
 * How long a call may last, for the call's AI. It was told "at most 15 minutes" on every plan, while a Free call ends
 * at 5, and when the time was nearly up only "[The call ends in about 15 seconds.]", with no reason to give the caller.
 * minutesRunOut: the call ends because the plan's call minutes of the period run out, not because of the longest call.
 */
export function callTimeWords({ maxMs = 15 * 60000, minutesRunOut = false, planName = "" } = {}) {
    const minutes = Math.max(1, Math.round(Number(maxMs) / 60000));
    const plan = planName ? `the caller's ${planName} plan` : "the caller's plan";
    const why = minutesRunOut
        ? `the call minutes of ${plan} for this period are used up`
        : minutes < 15 ? `${minutes} minute${minutes === 1 ? " is" : "s are"} the longest one call can be on ${plan}` : "15 minutes is the longest a call can be";
    return {
        line: `The call can last at most ${minutes} minute${minutes === 1 ? "" : "s"}${minutesRunOut ? ` (the call minutes left on ${plan} for this period)` : minutes < 15 ? ` (the longest call on ${plan})` : ""}. If the caller asks why a call ended, that is the reason.`,
        ends: `[The call ends in about 15 seconds, because ${why}. Say goodbye now. Give that reason only if the caller asks why the call is ending.]`,
    };
}

/** For the AI that does a task from a call: how many minutes of work the caller's plan gives it. "" when there is no cap */
export function workTimeNote(leftMs, capMs) {
    const cap = Number(capMs);
    if (!(cap > 0) || !Number.isFinite(Number(leftMs))) return "";
    const mins = (ms) => { const m = Math.max(1, Math.round(Number(ms) / 60000)); return `${m} minute${m === 1 ? "" : "s"}`; };
    return `\n\n[The caller's plan gives this task ${mins(cap)} of work, and ${mins(leftMs)} ${Math.round(Number(leftMs) / 60000) <= 1 ? "is" : "are"} left. The work is stopped when the time runs out: do the most important part first, and send what you have before the time ends.]`;
}

/** ask_classgrid on a call when the caller's usage is used up */
export function askRefusedForUsage(resetAt) {
    const when = comesBackText(resetAt);
    return `Classgrid could not do it: the caller's plan usage limit is used up${when ? ` and comes back on ${when}` : ""}. Tell the caller that plainly, and do not ask Classgrid again on this call.`;
}

// ── A background task (from WhatsApp, a call or an email) whose run the plan refuses ──

// The codes of a request refused by the person's plan, before the AI ran (ai-chat.controller.js). A task took such a
// refusal for a failed run: it tried again every 5 minutes and after 5 tries told the person it was "stuck".
export const PLAN_REFUSAL_CODES = new Set(["chats_cap_reached", "model_locked", "claude_cap_reached", "fable_cap_reached", "files_per_message"]);
/** The result of a run (whatsapp-call.service.js runAgentTask) that the plan refused; not the usage limit, which has its own pause */
export const isPlanRefusal = (result) => !String(result?.answer || "").trim() && !result?.quota && PLAN_REFUSAL_CODES.has(String(result?.code || ""));

// ── Limits that were not checked where the AI works (owner, 2026-11-24: "fix all then") ──

/** A file the AI made that does not fit the plan's Library storage: the link works, the Library entry is not made */
export const libraryFullNote = (room) => `\nNOT added to the user's Library: the Library of their ${room?.planName ? `${room.planName} ` : ""}plan is full (${room?.used} of ${room?.cap} used). The link above works: give it to the user as usual. Do not bring up the Library or the plan by yourself; only if the user asks where the file is in their Library, say it was not saved there because the Library is full, and that deleting files there makes room.`;

/** Something past the plan's number that the person's credits paid for (a picture, a WhatsApp message) */
export const paidFromCreditsNote = (what, planName = "") => ` This ${what} was past the number the person's ${planName ? `${planName} ` : ""}plan includes for this period, so it was paid from their AI credits. Do not bring that up by yourself; say it only if the user asks about their limit or their credits.`;

/** transcribe_audio past the plan's voice minutes. error: the limit's own sentence (voice-input-limit.service.js) */
export const notTranscribedText = (error) => `NOT transcribed: ${String(error || "").trim()} Tell the user that plainly, and do not turn this sound into text another way.`;

// ── The note at the end of an answer that the limit stopped ──

/**
 * What the person reads at the end of an answer that stopped because their usage ran out. It said "your plan's limit
 * ran out" for every case; it now says which one (the plan's usage, the week's Claude credits, the Claude Fable
 * share) and when it comes back (owner, 2026-11-24, "fix all": the sixth point of the limits check). The AI reads
 * the same note in the chat's history, so it knows too.
 * resetAt unknown: the old closing words ("When it comes back, ask me to continue").
 */
export function limitStopNote({ planName = "", claude = false, fable = false, resetAt = null } = {}) {
    const when = comesBackText(resetAt);
    const plan = planName ? `your ${planName} plan` : "your plan";
    const what = fable ? `this week's Claude Fable share of ${plan}` : claude ? `this week's Claude credits of ${plan}` : `${plan}'s usage limit`;
    const back = when ? `${claude && !fable ? "They come" : "It comes"} back on ${when}. Ask me to continue then` : "When it comes back, ask me to continue";
    const other = fable ? ", or pick Sonnet or Opus to go on now" : claude ? ", or pick another model to go on now" : "";
    return `_(Stopped here: ${what} ran out while I was working. ${back}${other}.)_`;
}
/** An answer that ends with the stop note, in the old words or the new ones */
export const isBudgetStop = (text) => /_\(Stopped here: [^\n]* ran out while I was working\.[^\n]*\)_\s*$/.test(String(text || ""));
