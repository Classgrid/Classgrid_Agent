// AI tools for live docs: create_doc, read_doc, edit_doc, doc_comments (group "live_docs" in ai-tool-groups.js)
import { findDoc, createDoc, saveDoc, addReply, setResolved } from "./live-doc.service.js";
import { applyDocEdits, canView, canEdit, isOwner, docLink, numberLines, commentsForAI } from "./live-doc.helpers.js";

const fn = (name, description, properties, required) => ({ type: "function", function: { name, description, parameters: { type: "object", properties, required } } });

export const LIVE_DOC_TOOLS = [
    fn("create_doc",
        "Create a live doc: a document the user can open at chat.classgrid.in/docs/<id>, keep editing, share and comment on. Use it for plans, reports, essays, notes and drafts the user wants to keep working on, not for short answers. Returns the doc link.",
        {
            title: { type: "string", description: "Short title of the doc." },
            markdown: { type: "string", description: "The whole doc in clean markdown: # headings, paragraphs, lists, | tables |, code blocks, $math$." },
        },
        ["title", "markdown"]),
    fn("read_doc",
        "Read a live doc: its text with line numbers and its open comments (each with comment_id, the quoted text, the comment and replies). Read it before editing or answering comments.",
        {
            doc_id: { type: "string", description: "The doc id (from the link chat.classgrid.in/docs/<id>)." },
            start_line: { type: "number", description: "Optional first line to show." },
            end_line: { type: "number", description: "Optional last line to show." },
        },
        ["doc_id"]),
    fn("edit_doc",
        "Change a live doc. Send edits (each old_text is exact text copied from the doc, without line numbers, found exactly once, replaced by new_text) or markdown (the whole new text). Nothing changes if any edit doesn't match. A version is saved so the user can go back.",
        {
            doc_id: { type: "string", description: "The doc id." },
            edits: {
                type: "array",
                description: "Exact text replacements, applied in order.",
                items: { type: "object", properties: { old_text: { type: "string" }, new_text: { type: "string" } }, required: ["old_text", "new_text"] },
            },
            markdown: { type: "string", description: "The whole new doc text (instead of edits)." },
            title: { type: "string", description: "Optional new title." },
        },
        ["doc_id"]),
    fn("doc_comments",
        "Answer or resolve a comment on a live doc. action reply adds your answer under the comment (text needed); action resolve marks it done.",
        {
            doc_id: { type: "string", description: "The doc id." },
            action: { type: "string", enum: ["reply", "resolve"], description: "reply or resolve." },
            comment_id: { type: "string", description: "The comment_id from read_doc." },
            text: { type: "string", description: "Your reply (for action reply)." },
        },
        ["doc_id", "action", "comment_id"]),
];

export const LIVE_DOC_PROMPT = `\n\nLIVE DOCS:
1. When the user wants a document to keep working on or share (a plan, report, essay, notes, a draft), write it with create_doc and put the link in your reply. Short answers stay in the chat.
2. To change a doc, read it with read_doc first, then use edit_doc with small exact edits (old_text copied without line numbers). Keep the markdown clean: headings, short paragraphs, lists and tables.
3. When the user asks about comments, read them with read_doc, make the asked changes, then answer each one with doc_comments (reply) and resolve the ones that are done.`;

const ownerOnly = "Only the owner of this doc can change it.";
const notFound = "Error: this doc was not found, or the user can't open it.";

// Handlers for the chat's tool loop. user = req.user of the chat.
export function buildLiveDocHandlers({ user }) {
    const uid = user?._id;
    const open = async (id) => {
        const doc = await findDoc(String(id || "").trim().replace(/^.*\/docs\//, "").replace(/[/?#].*$/, ""));
        return doc && canView(doc, uid) ? doc : null;
    };
    return {
        create_doc: async (args) => {
            try {
                if (!uid) return "Error: sign in first to create a doc.";
                const doc = await createDoc({ user, title: args?.title, markdown: args?.markdown, by: "ai" });
                return `Created "${doc.title}" (doc_id ${doc._id}). Link: ${docLink(doc._id)}\nPut this link in your reply.`;
            } catch (e) {
                return `Error: could not create the doc: ${e.message}`;
            }
        },
        read_doc: async (args) => {
            try {
                const doc = await open(args?.doc_id);
                if (!doc) return notFound;
                const lines = numberLines(doc.markdown, args?.start_line, args?.end_line);
                let text = lines.text;
                const LIMIT = 120000;
                if (text.length > LIMIT) text = `${text.slice(0, LIMIT)}\n... (cut here: read more with start_line/end_line)`;
                return [
                    `Doc "${doc.title}" (doc_id ${doc._id}), ${isOwner(doc, uid) ? "owned by the user" : "shared with the user (read and comment only)"}. Link: ${docLink(doc._id)}`,
                    `Lines ${lines.start}-${lines.end} of ${lines.total}:`,
                    text,
                    "",
                    commentsForAI(doc.comments),
                ].join("\n");
            } catch (e) {
                return `Error: could not read the doc: ${e.message}`;
            }
        },
        edit_doc: async (args) => {
            try {
                const doc = await open(args?.doc_id);
                if (!doc) return notFound;
                if (!canEdit(doc, uid)) return `Error: ${ownerOnly}`;
                let markdown;
                let what;
                let edits = args?.edits;
                if (typeof edits === "string") { try { edits = JSON.parse(edits); } catch { edits = undefined; } }
                if (edits && (!Array.isArray(edits) || edits.length > 0)) {
                    const r = applyDocEdits(doc.markdown, edits);
                    if (!r.ok) return r.error;
                    markdown = r.markdown;
                    what = `${r.count} change${r.count === 1 ? "" : "s"}`;
                } else if (typeof args?.markdown === "string") {
                    markdown = args.markdown;
                    what = "whole text replaced";
                } else if (args?.title === undefined) {
                    return "Error: send edits or markdown. Nothing was changed.";
                }
                await saveDoc(doc, { title: args?.title, markdown, by: "ai" });
                return `Edited "${doc.title}" (${what || "title changed"}, version saved). Link: ${docLink(doc._id)}`;
            } catch (e) {
                return `Error: could not edit the doc: ${e.message}`;
            }
        },
        doc_comments: async (args) => {
            try {
                const doc = await open(args?.doc_id);
                if (!doc) return notFound;
                const comment = doc.comments.find((c) => c.id === String(args?.comment_id || "").trim());
                if (!comment) return "Error: that comment_id was not found. Read the doc with read_doc to see the comments.";
                if (args?.action === "reply") {
                    await addReply(doc, comment.id, { user, text: args?.text, byAI: true });
                    return `Replied to the comment on "${doc.title}".`;
                }
                if (args?.action === "resolve") {
                    if (!isOwner(doc, uid)) return `Error: ${ownerOnly}`;
                    await setResolved(doc, comment.id, true);
                    return `Resolved the comment on "${doc.title}".`;
                }
                return 'Error: action must be "reply" or "resolve".';
            } catch (e) {
                return `Error: ${e.message}`;
            }
        },
    };
}
