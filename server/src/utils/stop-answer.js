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
