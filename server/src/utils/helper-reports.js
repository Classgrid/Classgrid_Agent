// The message that wakes a chat when its helpers finished after its answer had ended (ai-chat.controller.js,
// run_project_helpers).
//
// Every finished helper's report used to be pasted into that one message and marked as given. The message has a
// length limit (chat-wake.service.js WAKE_NOTE_MAX) and a report can be 40,000 characters, so the first report
// filled the message and came cut, the ones after it were not in it at all, and check_helpers then answered
// "report already given" for each of them: the work was done and the main AI never got it (owner, 2026-11-17: the
// Agent map showed three helpers finished, the main AI said "the helper 1 report is cut off" and started the same
// audits again).
//
// Now every helper's report is its own message, sent the moment that helper finishes (sendReports; owner, same
// day: "send one by one, don't send all together"), and a report is in a message only when the whole of it fits.
// A report that does not fit stays on the board, not marked as given, and the message says to read it with
// check_helpers, which gives it in full.

const who = (h) => `Helper ${h.no} (${String(h.task || "").slice(0, 120)}) ${h.state === "done" ? "finished" : "failed"}`;
const whole = (h) => `${who(h)}:\n${h.report}${h.notes?.length ? `\nNotes it sent: ${h.notes.join(" | ")}` : ""}`;
const pointer = (h) => `${who(h)}. Its report (${String(h.report || "").length} characters) is too long for this message and is NOT in it: read it in full with check_helpers before you answer.`;
const BETWEEN = "\n\n";

/**
 * helpers: the finished helpers whose reports the main AI has not had yet, in the order they are told.
 * room: how many characters their part of the message may take.
 * Returns the text, and the helpers whose whole report is in it: only those are to be marked as given.
 */
export function helperWakeNote(helpers, room) {
    const parts = helpers.map(pointer);
    let used = parts.reduce((n, p) => n + p.length, 0) + BETWEEN.length * Math.max(0, parts.length - 1);
    const given = [];
    helpers.forEach((h, i) => {
        const full = whole(h);
        if (used - parts[i].length + full.length > room) return;
        used += full.length - parts[i].length;
        parts[i] = full;
        given.push(h);
    });
    return { text: parts.join(BETWEEN), given };
}

/**
 * Sends each finished helper's unread report to its chat by itself: one wake-up message per helper (the rules are
 * above sendHelperReports in ai-chat.controller.js). board: the chat's helpers. The rest is how to reach the chat:
 * hasTask (a background task owns this chat), wakeTask, answering (the chat is answering right now), wake(note),
 * max (the longest note), changesText(helpers) (their "files changed" list). Returns the helpers a message went out for.
 *
 * While the chat is answering, a finished helper's report is not sent: the main AI can read it in that answer with
 * check_helpers. This waits for the answer to end (looking every few seconds) and then sends what was not read.
 * The end of an answer also calls this (answerEnded), so the report goes out at once; the wait is what catches a
 * helper that finishes in the moment an answer is ending.
 */
const LOOK_EVERY_MS = 3000;
const WAIT_AT_MOST_MS = 6 * 60 * 60 * 1000;
export async function sendReports({ board, answerEnded = false, hasTask, wakeTask, answering, wake, max, changesText = () => "", sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
    const waiting = () => board.helpers.filter((x) => x.state !== "running" && !x.reportTaken && !x.reportTold && !x.quiet); // a workflow's helpers report through the workflow
    if (!waiting().length) return [];
    if (await hasTask()) {
        if (!answerEnded && !board.helpers.some((x) => x.state === "running")) await wakeTask();
        return [];
    }
    if (!answerEnded) {
        for (let waited = 0; waited < WAIT_AT_MOST_MS && waiting().length && (await answering()); waited += LOOK_EVERY_MS) await sleep(LOOK_EVERY_MS);
    }
    const sent = [];
    for (const h of waiting()) {
        if (h.reportTaken || h.reportTold) continue; // (read with check_helpers while the one before was being sent)
        const working = board.helpers.filter((x) => x.state === "running" && !x.quiet).length;
        const rest = working
            ? `\n\n[${working} other helper${working === 1 ? "" : "s"} of this chat ${working === 1 ? "is" : "are"} still working. Each one's report comes to you by itself when it finishes: do not do their work again, and do not start them again.]`
            : "\n\n[No helper of this chat is working now.]";
        const changes = changesText([h]);
        const { text, given } = helperWakeNote([h], max - rest.length - changes.length);
        if (given.length) h.reportTaken = true; else h.reportTold = true;
        sent.push(h);
        await wake(`${text}${given.length ? changes : ""}${rest}`);
    }
    return sent;
}
