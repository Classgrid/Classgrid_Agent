// What the person says while the AI is still working on their last message (owner, 2026-11-24, with recordings of
// two other apps and of Classgrid: "while it is working I send a message and it takes it in and goes on... ours
// queues 12 messages and answers them one by one").
//
// A message typed while an answer was running could only wait: the app kept it in a queue and sent each one as its
// own question after the answer had ended, so the AI finished work the person had already corrected, and twelve
// messages got twelve answers.
//
// With "Send immediately" chosen in the app's settings (the desktop app, Classgrid Code and the extension; the
// website keeps the queue), the app posts the message to the running answer (POST /api/ai/turn/:id/cmd, type "say";
// services/local-loop.service.js). It waits here until the model's next round of tools has run, and goes to the model
// with those tools' results, as the person's own words (the model loops' userNotes hook). The chat shows it as the
// person's message at that place in the answer, and the answer goes on.
// A message that no round of tools came for (the AI was writing its final answer) is not lost: the app still holds
// it and sends everything it holds as one next message when the answer ends, so several messages get one answer.

/** The longest message taken this way */
export const USER_NOTE_MAX = 20000;

/** What the model reads with its tools' results */
export function userNotesText(notes) {
    const list = (notes || []).map((n) => String(n?.text || "").trim()).filter(Boolean);
    if (!list.length) return "";
    const one = list.length === 1;
    const head = `[The user sent ${one ? "this message" : `these ${list.length} messages`} while you were working. ${one ? "It is" : "They are"} part of the same task: read ${one ? "it" : "them"} now and take ${one ? "it" : "them"} into account in what you do next. Go on with the work; do not start it again, and stop or change course only if the user says so here. Your reply at the end answers ${one ? "it" : "them"} too.]`;
    return `${head}\n\n${one ? list[0] : list.map((t, i) => `Message ${i + 1}:\n${t}`).join("\n\n")}`;
}

/**
 * The messages waiting for one answer. add({ id, text }) takes a message once (the app posts until it gets through,
 * so the same id can come twice) and says whether it was taken; take() hands over everything that waits, as
 * { text, notes } for the model and the chat, or null; waiting() is how many wait.
 */
export function makeUserNotes() {
    const seen = new Set();
    let waiting = [];
    return {
        add(note) {
            const id = String(note?.id || "").trim().slice(0, 80);
            const text = String(note?.text || "").trim().slice(0, USER_NOTE_MAX);
            if (!id || !text) return false;
            if (seen.has(id)) return true; // (already here: said to be taken, never taken twice)
            seen.add(id);
            waiting.push({ id, text });
            return true;
        },
        take() {
            if (!waiting.length) return null;
            const notes = waiting;
            waiting = [];
            return { text: userNotesText(notes), notes };
        },
        waiting: () => waiting.length,
    };
}

/**
 * A saved answer as the AI reads it in later turns: its text, with what the person wrote while it was being worked on
 * in front (those messages are kept as steps of the answer, tool "user_message", and the history gives the model the
 * answer's text only: without this the AI would not know later what the person had told it in the middle).
 * inner: the saved answer ({ content, steps }).
 */
export function answerWithUserNotes(inner) {
    const text = String(inner?.content || "");
    const said = (Array.isArray(inner?.steps) ? inner.steps : [])
        .filter((s) => s?.tool === "user_message" && typeof s?.args?.message === "string")
        .map((s) => s.args.message.trim())
        .filter(Boolean);
    if (!said.length) return text;
    return `[While you were working on this answer the user also wrote: ${said.map((t) => JSON.stringify(t.slice(0, 4000))).join("; ")}]${text ? `\n\n${text}` : ""}`;
}
