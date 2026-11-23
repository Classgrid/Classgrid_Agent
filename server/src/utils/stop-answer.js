// The text an answer ends with when a tool ends the run (sleep_until, end_conversation). The tool's handler returns
// { text, stopAnswer, stopAnswerOnlyIfSilent? }: `stopAnswer` is what the person is shown. With
// `stopAnswerOnlyIfSilent: true` it is shown only when the AI wrote nothing itself (an answer can't be empty):
// sleep_until's "Waiting for…" line, which until 2026-11-22 was added under every sleeping answer (owner: "that line
// is to remove, hardcoded").

/**
 * said: what the AI wrote before the call, kept for sleep_until only (the caller decides); result: the handler's answer.
 * The AI's words and the tool's text are both shown, once: when one holds the other, only the longer one.
 */
export function stopAnswerText(said, result) {
    const own = String(said || "").trim();
    const fromTool = String(result?.stopAnswer || "").trim();
    if (own && result?.stopAnswerOnlyIfSilent === true) return own;
    if (!own || !fromTool) return own || fromTool;
    return fromTool.includes(own) ? fromTool : own.includes(fromTool) ? own : `${own}\n\n${fromTool}`;
}

// What a sleeping answer says (sleep_until): always the AI's own words, never a sentence written for it. Until
// 2026-11-23 an AI that said nothing got the fixed line "💤 Waiting for <time>. I'll continue then." as its answer
// (owner: "this is hardcoded, and the emoji too: fix it"). Now the sleep is not set until the AI has said something:
//   - what it wrote in this answer before the call (`said`), or
//   - `message` (shown to the person; on a task from WhatsApp it is also sent there), or
//   - `chat_line` (a task from WhatsApp only: one sentence for the chat's record, never sent on WhatsApp).
// Returns { refuse } (the tool's answer: the sleep is not set, the AI calls again with its words), or
// { stopAnswer, quiet }: what the tool adds to the answer, and whether nothing of this answer goes to WhatsApp.
export function sleepWords({ message = "", chatLine = "", said = "", origin = "chat" } = {}) {
    const msg = String(message || "").trim();
    const line = String(chatLine || "").trim();
    const spoke = String(said || "").trim();
    if (!msg && !spoke && !(origin === "whatsapp" && line)) {
        return {
            refuse: origin === "whatsapp"
                ? "ERROR: not sleeping yet. You have said nothing in this answer, and nothing is written for you. Call sleep_until again with the same values and one of: `message` (one short sentence in your own words, sent to the person on WhatsApp), or `chat_line` (one short sentence in your own words for this chat's record only, not sent on WhatsApp): what you are waiting for and until when."
                : "ERROR: not sleeping yet. You have said nothing in this answer, and nothing is written for you. Call sleep_until again with the same values and `message`: one short sentence in your own words telling the person what you are waiting for and until when.",
        };
    }
    // (the chat's own line is used only when there is nothing else: with a message or written words it is left out,
    // because everything in such an answer is sent on WhatsApp)
    const quiet = !msg && !spoke;
    return { stopAnswer: msg || (quiet ? line : ""), quiet };
}
