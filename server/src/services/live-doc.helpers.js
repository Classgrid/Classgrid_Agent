// Live docs: small pure helpers (no database), so they can be tested on their own.

export const MAX_MARKDOWN = 1024 * 1024; // ~1 MB per doc
export const MAX_VERSIONS = 20;
export const MAX_VERSION_BYTES = 8 * 1024 * 1024; // all kept versions together stay well under Mongo's 16 MB
export const MAX_TITLE = 200;
export const MAX_COMMENT = 5000;
export const MAX_QUOTE = 2000;
export const DOC_BASE_URL = "https://chat.classgrid.in/docs";

export const docLink = (id) => `${DOC_BASE_URL}/${id}`;
export const cleanTitle = (t) => String(t ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_TITLE) || "Untitled";
export const cleanMarkdown = (m) => String(m ?? "").replace(/\r\n/g, "\n");
export const tooBig = (m) => Buffer.byteLength(String(m ?? ""), "utf8") > MAX_MARKDOWN;

const idOf = (v) => (v && typeof v === "object" && v._id ? String(v._id) : v == null ? "" : String(v));

// Who may do what. Every route needs a signed-in user; "link" docs can be seen by any signed-in user with the link.
export const isOwner = (doc, userId) => !!doc && !!userId && idOf(doc.owner) === idOf(userId);
export const canView = (doc, userId) => !!doc && (isOwner(doc, userId) || (doc.visibility === "link" && !!userId));
export const canComment = canView;
export const canEdit = isOwner;
export const canResolve = (doc, comment, userId) => isOwner(doc, userId) || (!!comment && !!userId && idOf(comment.userId) === idOf(userId));

// Applies exact-match edits. Each old_text must be found exactly once; if any edit fails nothing changes.
export function applyDocEdits(markdown, edits) {
    let text = cleanMarkdown(markdown);
    const list = Array.isArray(edits) ? edits : edits && typeof edits === "object" ? [edits] : [];
    if (list.length === 0) return { ok: false, error: "No edits were sent. Nothing was changed." };
    for (let i = 0; i < list.length; i++) {
        const oldText = cleanMarkdown(list[i]?.old_text);
        const newText = cleanMarkdown(list[i]?.new_text);
        if (!oldText) return { ok: false, error: `Error in edit ${i + 1}: old_text is empty. Nothing was changed.` };
        const first = text.indexOf(oldText);
        if (first === -1) return { ok: false, error: `Error in edit ${i + 1}: old_text was not found. Read the doc again with read_doc and copy the text exactly (without line numbers). Nothing was changed.` };
        if (text.indexOf(oldText, first + 1) !== -1) {
            let count = 0;
            for (let at = text.indexOf(oldText); at !== -1; at = text.indexOf(oldText, at + 1)) count++;
            return { ok: false, error: `Error in edit ${i + 1}: old_text was found ${count} times. Add more surrounding text so it matches only once. Nothing was changed.` };
        }
        text = text.slice(0, first) + newText + text.slice(first + oldText.length);
    }
    return { ok: true, markdown: text, count: list.length };
}

// Adds a version and keeps only the newest MAX_VERSIONS, also dropping the oldest while all of them are too big.
export function pushVersion(versions, entry, { max = MAX_VERSIONS, maxBytes = MAX_VERSION_BYTES } = {}) {
    const out = [...(versions || []), entry];
    while (out.length > max) out.shift();
    const size = (v) => Buffer.byteLength(String(v?.markdown ?? ""), "utf8");
    let total = out.reduce((n, v) => n + size(v), 0);
    while (out.length > 1 && total > maxBytes) total -= size(out.shift());
    return out;
}

// "   1\tline" for every line (from/to are 1-based and optional)
export function numberLines(markdown, from = 1, to = Infinity) {
    const lines = cleanMarkdown(markdown).split("\n");
    const start = Math.max(1, Number(from) || 1);
    const end = Math.min(lines.length, Number(to) || lines.length);
    const width = String(end).length;
    const out = [];
    for (let i = start; i <= end; i++) out.push(`${String(i).padStart(width, " ")}\t${lines[i - 1]}`);
    return { text: out.join("\n"), total: lines.length, start, end };
}

// Open comments as plain text for the AI
export function commentsForAI(comments) {
    const open = (comments || []).filter((c) => !c.resolved);
    if (open.length === 0) return "Open comments: none.";
    const lines = [`Open comments (${open.length}):`];
    for (const c of open) {
        lines.push(`- comment_id ${c.id} by ${c.name || "someone"}${c.quote ? ` on "${String(c.quote).slice(0, 300)}"` : ""}: ${c.text}`);
        for (const r of c.replies || []) lines.push(`    reply by ${r.byAI ? "the AI" : r.name || "someone"}: ${r.text}`);
    }
    return lines.join("\n");
}

// What the client gets for a doc (versions without their text)
export function docForClient(doc, userId) {
    return {
        id: String(doc._id),
        title: doc.title,
        markdown: doc.markdown,
        visibility: doc.visibility,
        rev: doc.rev || 0,
        lastBy: doc.lastBy || "user",
        isOwner: isOwner(doc, userId),
        ownerName: doc.ownerName || "",
        comments: (doc.comments || []).map((c) => ({
            id: c.id, userId: idOf(c.userId), name: c.name, text: c.text, quote: c.quote, at: c.at, resolved: !!c.resolved,
            replies: (c.replies || []).map((r) => ({ name: r.name, text: r.text, at: r.at, byAI: !!r.byAI })),
        })),
        versions: (doc.versions || []).map((v) => ({ id: idOf(v._id), at: v.at, by: v.by })).reverse(),
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
    };
}

// "Monthly plan" -> "Monthly-plan" for file names
export const fileBase = (title) => String(title || "").replace(/[^\p{L}\p{N} _-]+/gu, " ").trim().replace(/\s+/g, "-").slice(0, 80) || "document";
