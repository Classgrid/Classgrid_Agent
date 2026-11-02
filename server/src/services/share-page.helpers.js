// Share pages (chat.classgrid.in/p/<id>): small checks with no database, so they can be tested on their own.

export const PAGE_APP_URL = "https://chat.classgrid.in";
export const PAGE_HTML_MAX_BYTES = 2 * 1024 * 1024;
export const PAGE_TITLE_MAX = 200;
export const DATA_MAX_KEYS = 200;
export const DATA_MAX_BYTES = 500 * 1024;
export const DATA_KEY_RE = /^[A-Za-z0-9_\-:]{1,100}$/;
export const COMMENT_MAX_CHARS = 5000;
export const COMMENTS_MAX = 1000;
export const VISIBILITIES = ["private", "link"];

export const pageLink = (id) => `${PAGE_APP_URL}/p/${id}`;
export const byteSize = (s) => Buffer.byteLength(String(s ?? ""), "utf8");
// Size of a stored JSON value (undefined counts as nothing)
export const jsonSize = (v) => (v === undefined ? 0 : byteSize(JSON.stringify(v)));

const idOf = (v) => (v && typeof v === "object" && v._id ? String(v._id) : v == null ? "" : String(v));

export function isOwner(page, userId) {
    return !!page && !!userId && idOf(page.owner) === idOf(userId);
}

// Owner always; anyone signed in when the page is shared by link
export function canView(page, userId) {
    if (!page || !userId) return false;
    return isOwner(page, userId) || page.visibility === "link";
}

// The page's shared data and comments: everyone who can view the page
export const canWriteData = canView;
export const canComment = canView;

// Resolve or reopen a comment: the page owner or the person who wrote it
export function canResolveComment(page, comment, userId) {
    if (!page || !comment || !userId) return false;
    return isOwner(page, userId) || idOf(comment.userId) === idOf(userId);
}

export function cleanTitle(title) {
    const t = String(title ?? "").replace(/\s+/g, " ").trim().slice(0, PAGE_TITLE_MAX);
    return t || "Untitled page";
}

export function checkVisibility(v) {
    return VISIBILITIES.includes(v) ? { ok: true, value: v } : { ok: false, error: 'visibility must be "private" or "link".' };
}

export function checkHtml(html) {
    if (typeof html !== "string" || !html.trim()) return { ok: false, error: "The page has no HTML." };
    const size = byteSize(html);
    if (size > PAGE_HTML_MAX_BYTES) return { ok: false, error: `The page is too big (${(size / 1048576).toFixed(1)} MB). The limit is 2 MB.` };
    return { ok: true, size };
}

export function checkCommentText(text) {
    const t = String(text ?? "").trim();
    if (!t) return { ok: false, error: "The comment is empty." };
    if (t.length > COMMENT_MAX_CHARS) return { ok: false, error: `The comment is too long (max ${COMMENT_MAX_CHARS} letters).` };
    return { ok: true, value: t };
}

// Plain object view of the stored data (a Mongoose Map, a Map or an object)
export function dataEntries(data) {
    if (!data) return [];
    if (data instanceof Map || (typeof data.entries === "function" && typeof data.get === "function")) return [...data.entries()];
    return Object.entries(data);
}

/**
 * Checks one write to the page's data store.
 * value === undefined means delete the key.
 * Returns { ok, error?, totalBytes, keys }.
 */
export function checkDataWrite(data, key, value) {
    if (typeof key !== "string" || !DATA_KEY_RE.test(key)) {
        return { ok: false, error: "Key must be 1-100 letters, numbers, _ - or :." };
    }
    let serialized;
    if (value !== undefined) {
        try { serialized = JSON.stringify(value); } catch { return { ok: false, error: "Value must be plain JSON." }; }
        if (serialized === undefined) return { ok: false, error: "Value must be plain JSON." };
    }
    const entries = dataEntries(data).filter(([k]) => k !== key);
    const keys = entries.length + (value === undefined ? 0 : 1);
    if (keys > DATA_MAX_KEYS) return { ok: false, error: `Too many keys (max ${DATA_MAX_KEYS}).` };
    const totalBytes = entries.reduce((n, [k, v]) => n + byteSize(k) + jsonSize(v), 0) + (value === undefined ? 0 : byteSize(key) + byteSize(serialized));
    if (totalBytes > DATA_MAX_BYTES) return { ok: false, error: `Page data is too big (max ${DATA_MAX_BYTES / 1024} KB in all).` };
    return { ok: true, totalBytes, keys };
}
