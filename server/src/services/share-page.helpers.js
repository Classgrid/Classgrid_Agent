// Share pages (chat.classgrid.in/p/<id>): small checks with no database, so they can be tested on their own.
import {
    roleOf, canView as roleCanView, canComment as roleCanComment, canEdit as roleCanEdit, canResolve as roleCanResolve, docForClient, cleanRole,
} from "./live-doc.helpers.js";

export const PAGE_APP_URL = "https://chat.classgrid.in";
export const PAGE_HTML_MAX_BYTES = 2 * 1024 * 1024;
export const PAGE_TITLE_MAX = 200;
export const DATA_MAX_KEYS = 200;
export const DATA_MAX_BYTES = 500 * 1024;
export const DATA_KEY_RE = /^[A-Za-z0-9_\-:]{1,100}$/;
export const COMMENT_MAX_CHARS = 5000;
export const COMMENTS_MAX = 1000;
export const QUOTE_MAX_CHARS = 2000;
export const VISIBILITIES = ["private", "link"];

export const pageLink = (id) => `${PAGE_APP_URL}/p/${id}`;
export const byteSize = (s) => Buffer.byteLength(String(s ?? ""), "utf8");
// Size of a stored JSON value (undefined counts as nothing)
export const jsonSize = (v) => (v === undefined ? 0 : byteSize(JSON.stringify(v)));

const idOf = (v) => (v && typeof v === "object" && v._id ? String(v._id) : v == null ? "" : String(v));

// ── Who may do what ──
// A page is shared like a live doc (owner, 2026-11-16; the rules are live-doc.helpers.js's): its owner, the people
// it was shared with by email (viewer, commenter or editor) and, when its general access is "link", any signed-in
// user with the link (as the link's role; a page from before roles gives "commenter", as its link always did).
//   viewer     opens the page and uses it (the page's own saved data is the page working, so every viewer writes it)
//   commenter  + comments and replies
//   editor     + renames the page, resolves any comment, and shares the page (people, requests, the link)
//   owner      + deletes the page, and can make another person its owner; only the owner's AI changes the page
// `who` is a user id, or the signed-in user ({ _id, email }): a person invited by email before they had an account
// is known by that email.
export const isOwner = (page, who) => roleOf(page, who) === "owner";
export const canView = roleCanView;
export const canWriteData = roleCanView;
export const canComment = roleCanComment;
export const canShare = roleCanEdit;
export const canRename = roleCanEdit;
// Resolve or reopen a comment: an editor, or a commenter on their own comment
export const canResolveComment = roleCanResolve;
// Delete a comment with its replies: an editor, or the person who wrote it
export const canDeleteComment = (page, comment, who) =>
    roleCanEdit(page, who) || (roleCanView(page, who) && !!comment?.userId && !comment.byAi && idOf(comment.userId) === idOf(who));

/** The words of the page a comment is on, cleaned (empty: the comment is on the page as a whole). */
export const cleanQuote = (quote) => String(quote ?? "").replace(/\s+/g, " ").trim().slice(0, QUOTE_MAX_CHARS);

/**
 * The page's comments as threads, the way a live doc's are sent: each comment with its replies under it (a reply
 * to a reply goes under the same comment). `photoOf(userId)` gives a person's photo.
 */
export function commentThreads(comments, photoOf = () => "") {
    const list = comments || [];
    const top = new Map();
    const parent = new Map(list.map((c) => [c.id, c.replyTo || null]));
    const threads = [];
    for (const c of list) {
        if (c.replyTo && parent.has(c.replyTo)) continue;
        const thread = {
            id: c.id, userId: idOf(c.userId), name: c.byAi ? "Classgrid AI" : c.name || "", photo: c.byAi ? "" : photoOf(c.userId), text: c.text,
            quote: c.quote || "", at: c.at, resolved: !!c.resolved, byAI: !!c.byAi, replies: [],
        };
        top.set(c.id, thread);
        threads.push(thread);
    }
    for (const c of list) {
        if (!c.replyTo || !parent.has(c.replyTo)) continue;
        let at = c.replyTo;
        for (let i = 0; i < 20 && at && !top.has(at); i++) at = parent.get(at);
        const thread = top.get(at);
        if (thread) thread.replies.push({ id: c.id, userId: idOf(c.userId), name: c.byAi ? "Classgrid AI" : c.name || "", photo: c.byAi ? "" : photoOf(c.userId), text: c.text, at: c.at, byAI: !!c.byAi });
    }
    return threads;
}

/**
 * What a signed-in person is sent for a page: the page, what they may do with it and, for the people who share it
 * (its owner and its editors), the people it is shared with and the access requests. `profiles` gives people's
 * current name and photo ({ byId, byEmail }).
 */
export function pageForClient(page, who, profiles = {}) {
    const shared = docForClient({
        _id: page._id, title: page.title, owner: page.owner, visibility: page.visibility, linkRole: page.linkRole, members: page.members,
        requests: page.requests, views: page.views, pinnedBy: page.pinnedBy, comments: [], versions: [], createdAt: page.createdAt, updatedAt: page.updatedAt,
    }, who, profiles);
    const byId = profiles.byId || {};
    const { markdown: _m, rev: _r, lastBy: _l, ...rest } = shared;
    return {
        ...rest,
        html: page.html,
        versions: page.versions || 1,
        link: pageLink(page._id),
        // (a page has no text to edit by hand: "edit" is renaming it, and it comes with sharing)
        comments: commentThreads(page.comments, (userId) => byId[idOf(userId)]?.photo || ""),
    };
}

/** A page's row in a list (no HTML). */
export function pageRow(page, who, profiles = {}) {
    const ownerProfile = (profiles.byId || {})[idOf(page.owner)];
    const me = idOf(who);
    return {
        id: String(page._id),
        title: page.title,
        visibility: page.visibility,
        role: roleOf(page, who),
        shared: (page.members || []).length > 0 || page.visibility === "link",
        ownerName: ownerProfile?.name || "",
        ownerPhoto: ownerProfile?.photo || "",
        pinned: !!me && (page.pinnedBy || []).some((id) => idOf(id) === me),
        versions: page.versions || 1,
        openComments: (page.comments || []).filter((c) => !c.resolved && !c.replyTo).length,
        link: pageLink(page._id),
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
    };
}

/** "Plan" -> "Copy of Plan" (inside the title's length). */
export const copyPageTitle = (title) => cleanTitle(`Copy of ${cleanTitle(title)}`);
export { cleanRole };

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
