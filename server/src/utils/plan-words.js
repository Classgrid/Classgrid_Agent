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
    return `the person's plan usage limit ran out while this helper was working, so it stopped before it finished. This is not a finished report. Do not start this helper or any other again now: it is refused until the limit comes back. Tell the user plainly that their plan's usage limit ran out and that this part is not finished.${soFar ? `\n\nWhat it had written before it stopped:\n${soFar}` : ""}`;
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
    return `Error: no helper was started, because ${why} and ${maxHelpers === 1 ? "it is" : "they are"} already working. Do not call run_project_helpers again now: it is refused until a helper finishes (its report reaches you by itself). Tell the user plainly that ${why}, then wait for a report or do that work yourself.`;
}

/** Helpers are not in the plan at all */
export const helpersNotInPlanText = (planName = "") => `Error: helpers are not included in the ${planName ? `${planName} ` : ""}plan. Do the work yourself in this chat, and if the user asked for helpers, tell them plainly that their plan has none.`;

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
