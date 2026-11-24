// run_project_helpers starts as many helpers as there is room for (the plan's helpers at once, at most 5, less the
// ones already working) and used to answer only "Started N helper(s)". When fewer started than were asked for, the
// main AI did not know why: on a Free account (1 helper at a time) it wrote "Helpers 2 and 3 didn't launch, so I'll
// start them again in a moment" (owner's test, 2026-11-24), a promise the tool refuses while the first helper works.
// This is the part of the tool's answer that says which tasks were left out and why, so the AI tells the person the
// real reason and does not try again at once.

/**
 * asked: the helper tasks that were asked for ({ task, title }), in order; started: how many of them started (the
 * first ones); maxHelpers: how many may work at once in this chat; planName: the person's plan ("" when plans are off).
 * Returns "" when every one started.
 */
export function notStartedNote({ asked = [], started = 0, maxHelpers = 5, planName = "" }) {
    const left = asked.slice(started);
    if (!left.length) return "";
    const names = left.map((h, i) => `${started + i + 1}. ${String(h?.title || h?.task || "").replace(/\s+/g, " ").trim().slice(0, 80)}`).join("\n");
    const many = maxHelpers === 1 ? "1 helper" : `${maxHelpers} helpers`;
    // (5 is the most any chat has; below that it is the plan's own number)
    const why = planName && maxHelpers < 5
        ? `the ${planName} plan allows ${many} working at the same time in a chat`
        : `at most ${many} can work at the same time in a chat`;
    return `\n\nNOT started (${left.length} of the ${asked.length} you asked for), because ${why}:\n${names}\nDo not call run_project_helpers for them again now: it is refused while ${maxHelpers === 1 ? "the helper is" : "these helpers are"} working. Tell the user plainly that ${why}, so ${left.length === 1 ? "this task has" : "these tasks have"} not started. Then either start ${left.length === 1 ? "it" : "them"} when a helper finishes (its report reaches you by itself), or do that work yourself.`;
}
