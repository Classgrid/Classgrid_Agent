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

/**
 * The messages that go with a question (the app's `saidBefore`): the ones the person sent while the last answer
 * worked and the AI did not get to. Clean texts, in the order sent, at most 30.
 */
export function earlierMessages(list) {
    return (Array.isArray(list) ? list : [])
        .map((t) => (typeof t === "string" ? t.trim().slice(0, USER_NOTE_MAX) : ""))
        .filter(Boolean)
        .slice(0, 30);
}

/** What the model reads for this turn: the earlier messages and the question, in order, as the person's one turn */
export function turnWithEarlier(earlier, question) {
    return [...(earlier || []), String(question ?? "")].filter((t) => String(t).trim()).join("\n\n");
}

/** The most files and pasted texts one such message carries */
export const USER_NOTE_MAX_FILES = 10;
export const USER_NOTE_MAX_PASTED = 5;

// A message with files or pasted text joins the running answer too (owner, 2026-11-27: "remove the queue for uploads
// too"; before, only plain words could, and a message with a file waited in the queue). The model reads it the way it
// reads a question: pasted text as "[PASTED TEXT n]:" blocks, files as an "Attached Files:" list of links that it
// opens with its tools (analyze_image, parse_document; a desktop picture is its desktop-image: link).
export function noteBody(n) {
    const parts = [String(n?.text || "").trim()];
    const pasted = Array.isArray(n?.pasted) ? n.pasted : [];
    if (pasted.length) parts.push(pasted.map((t, i) => `[PASTED TEXT ${i + 1}]:\n${t}`).join("\n\n"));
    const files = Array.isArray(n?.files) ? n.files : [];
    if (files.length) parts.push(`Attached Files:\n${files.map((f) => f.url).join("\n")}\n(Open them with your file tools: analyze_image for pictures, parse_document for documents.)`);
    return parts.filter(Boolean).join("\n\n");
}

/** What the model reads with its tools' results */
export function userNotesText(notes) {
    const list = (notes || []).map(noteBody).filter(Boolean);
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
            const files = (Array.isArray(note?.files) ? note.files : [])
                .filter((f) => f && typeof f.url === "string" && f.url.trim() && !/^\s*data:/i.test(f.url))
                .slice(0, USER_NOTE_MAX_FILES)
                .map((f) => ({ url: f.url.trim().slice(0, 2000), name: String(f.name || f.url.split("/").pop() || "file").slice(0, 200), ...(f.mimeType ? { mimeType: String(f.mimeType).slice(0, 100) } : {}) }));
            const pasted = (Array.isArray(note?.pasted) ? note.pasted : [])
                .map((t) => (typeof t === "string" ? t.slice(0, USER_NOTE_MAX) : ""))
                .filter((t) => t.trim())
                .slice(0, USER_NOTE_MAX_PASTED);
            if (!id || (!text && !files.length && !pasted.length)) return false;
            if (seen.has(id)) return true; // (already here: said to be taken, never taken twice)
            seen.add(id);
            waiting.push({ id, text, ...(files.length ? { files } : {}), ...(pasted.length ? { pasted } : {}) });
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
