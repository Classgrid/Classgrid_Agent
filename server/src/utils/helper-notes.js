// A working helper's note to the main AI (tell_main) reaches it at once (owner, 2026-11-23: "the main agent sending a
// message to a subagent and the subagent sending one to the main agent is too slow, why, make it faster").
//
// Why it was slow: a helper's note was only put on the chat's board. The main AI saw it when it called check_helpers
// by itself, and it is told to end its answer while helpers work, so in practice a note (often a question) was read
// when the helper finished, with its report: minutes or hours later, and the helper never had its answer.
//
// Now a note is handed over the moment it is written:
// - the chat is answering: it comes with the result of the main AI's next step (takeNotes, added by the step wrapper
//   in ai-chat.controller.js), the way a message reaches a helper;
// - the chat is not answering: the chat is woken with it (sendNotes), like a finished helper's report;
// - a background task owns the chat: the task is woken and gets the note with its next step.
// A helper that cannot go on without the answer waits for it in tell_main (wait_for_answer) and has it the moment the
// main AI sends it with message_helper.

const WAITING = " and is waiting for your answer";

/** The helpers of a chat's board with a note the main AI has not had (a workflow's helpers report through the workflow) */
export const helpersWithNotes = (board) => (board?.helpers || []).filter((h) => !h.quiet && (h.notes?.length || 0) > (h.notesRead || 0));

/**
 * For the result of the main AI's step: every unread note, marked as read. "" when there is none.
 * "[Message from Helper 2, still working]: ..." is also what the chat screen shows as "Message from Helper 2".
 */
export function takeNotes(board) {
    const lines = [];
    for (const h of helpersWithNotes(board)) {
        const fresh = h.notes.slice(h.notesRead || 0);
        h.notesRead = h.notes.length;
        const state = h.state === "running" ? `still working${h.waitingForMain ? WAITING : ""}` : h.state === "done" ? "finished" : "failed";
        for (const note of fresh) lines.push(`[Message from Helper ${h.no}, ${state}]: ${note}`);
    }
    if (!lines.length) return "";
    return `${lines.join("\n\n")}\n\n[To answer a helper, use message_helper: a helper that is waiting has your message at once, another with the result of its next step.]`;
}

/** For the message that wakes the chat: one helper's unread notes (marked as read). "" when it has none. */
export function wakeNoteOf(h) {
    const fresh = (h.notes || []).slice(h.notesRead || 0);
    if (!fresh.length) return "";
    h.notesRead = h.notes.length;
    const working = h.state === "running";
    return `Helper ${h.no} (${String(h.task || "").slice(0, 120)}) says:\n${fresh.join("\n")}\n\n[Helper ${h.no} ${working ? `is still working${h.waitingForMain ? WAITING : ""}` : "has stopped working"}.]`;
}

/**
 * Hands the unread notes of a chat's helpers to the main AI when the chat is not answering. board: the chat's
 * helpers. answerEnded: called from the end of an answer (what was not read in it goes out now). The rest is how to
 * reach the chat: hasTask (a background task owns it), wakeTask, answering, wake(note). Returns how many notes
 * messages went out.
 */
export async function sendNotes({ board, answerEnded = false, hasTask, wakeTask, answering, wake }) {
    if (!helpersWithNotes(board).length) return 0;
    if (await hasTask()) {
        // (never from the end of the task's own run: a task that did not read the note would wake itself again and again)
        if (answerEnded || (await answering())) return 0;
        await wakeTask();
        return 0;
    }
    // The chat is answering: the main AI gets the note with its next step, or from the end of that answer (answerEnded)
    if (!answerEnded && (await answering())) return 0;
    let sent = 0;
    for (const h of helpersWithNotes(board)) {
        const note = wakeNoteOf(h);
        if (!note) continue;
        sent++;
        await wake(note);
    }
    return sent;
}
