// Live docs: small pure helpers (no database), so they can be tested on their own.

export const MAX_MARKDOWN = 1024 * 1024; // ~1 MB per doc
export const MAX_VERSIONS = 20;
export const MAX_VERSION_BYTES = 8 * 1024 * 1024; // all kept versions together stay well under Mongo's 16 MB
export const MAX_TITLE = 200;
export const MAX_COMMENT = 5000;
export const MAX_QUOTE = 2000;
export const MAX_MEMBERS = 100; // people one doc can be shared with by name
export const MAX_REQUESTS = 100; // access requests one doc keeps waiting
export const MAX_INVITES_AT_ONCE = 20;
export const MAX_REPORT = 2000;
export const REQUEST_EMAIL_EVERY_MS = 24 * 60 * 60 * 1000; // the owner gets one email a day from the same person
export const DOC_BASE_URL = "https://chat.classgrid.in/docs";

export const docLink = (id) => `${DOC_BASE_URL}/${id}`;
export const cleanTitle = (t) => String(t ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_TITLE) || "Untitled";
export const cleanMarkdown = (m) => String(m ?? "").replace(/\r\n/g, "\n");
export const tooBig = (m) => Buffer.byteLength(String(m ?? ""), "utf8") > MAX_MARKDOWN;

const idOf = (v) => (v && typeof v === "object" && v._id ? String(v._id) : v == null ? "" : String(v));

// ── Who may do what ──
// Every route needs a signed-in user. A doc is opened by its owner, by the people it was shared with by email
// (members: viewer, commenter or editor) and, when its general access is "link", by any signed-in user with the
// link (as the link's role: linkRole, "commenter" for the docs made before roles existed, which is what a link gave
// then). The highest of a person's roles counts.
//   viewer     reads, exports, makes a copy
//   commenter  + comments and replies
//   editor     + changes the text and the title, restores a version, resolves any comment, and shares the doc
//                (adds people up to editor, changes their role, answers access requests, sets the link)
//   owner      + deletes the doc, and can make another person its owner
// `who` is a user id, or the signed-in user ({ _id, email }): a person invited by email before they had an account
// is known by that email.
export const ROLES = ["viewer", "commenter", "editor"];
const RANK = { viewer: 1, commenter: 2, editor: 3, owner: 4 };
export const cleanRole = (role, fallback = "viewer") => (ROLES.includes(role) ? role : fallback);
export const normEmail = (email) => String(email ?? "").trim().toLowerCase();
export const isEmail = (s) => typeof s === "string" && s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

// (an account's id is 24 hex characters: anything else, like an empty object, is nobody)
const accountId = (v) => { const id = idOf(v); return /^[0-9a-f]{24}$/i.test(id) ? id.toLowerCase() : ""; };
const whoOf = (who) => (who && typeof who === "object" && typeof who.email === "string"
    ? { id: accountId(who._id), email: normEmail(who.email) }
    : { id: accountId(who), email: "" });

/** The member entry of this person (by id, or by the email they were invited with), or null. */
export function memberOf(doc, who) {
    const { id, email } = whoOf(who);
    if (!doc || (!id && !email)) return null;
    return (doc.members || []).find((m) => (id && accountId(m.userId) === id) || (email && normEmail(m.email) === email)) || null;
}

/** "owner", "editor", "commenter", "viewer", or null when this person can't open the doc. */
export function roleOf(doc, who) {
    const { id, email } = whoOf(who);
    if (!doc || (!id && !email)) return null;
    if (id && accountId(doc.owner) === id) return "owner";
    const roles = [];
    const member = memberOf(doc, who);
    if (member) roles.push(cleanRole(member.role));
    if (doc.visibility === "link") roles.push(cleanRole(doc.linkRole, "commenter"));
    roles.sort((a, b) => RANK[b] - RANK[a]);
    return roles[0] || null;
}
const atLeast = (doc, who, role) => (RANK[roleOf(doc, who)] || 0) >= RANK[role];
export const isOwner = (doc, who) => roleOf(doc, who) === "owner";
export const canView = (doc, who) => atLeast(doc, who, "viewer");
export const canComment = (doc, who) => atLeast(doc, who, "commenter");
export const canEdit = (doc, who) => atLeast(doc, who, "editor");
export const canShare = canEdit;
export const canManage = isOwner;
export const canResolve = (doc, comment, who) =>
    canEdit(doc, who) || (canComment(doc, who) && !!comment && !!whoOf(who).id && accountId(comment.userId) === whoOf(who).id);

/** Whether `role` (or null: no access) already gives what `wanted` gives. */
export const roleCovers = (role, wanted) => (RANK[role] || 0) >= (RANK[cleanRole(wanted)] || 1);

/** What a role lets a person do, in words for an email or a message. */
export const roleWords = (role) => (role === "editor" ? "read, comment and edit" : role === "commenter" ? "read and comment" : "read");

/** The request this person has waiting on the doc, or null. */
export function requestOf(doc, who) {
    const { id, email } = whoOf(who);
    if (!doc || (!id && !email)) return null;
    return (doc.requests || []).find((r) => (id && accountId(r.userId) === id) || (email && normEmail(r.email) === email)) || null;
}

/**
 * Emails typed into "Add people" (a list, or one text with commas, spaces or new lines between them): cleaned,
 * each once, split into the ones that are emails and the ones that are not.
 */
export function splitEmails(input) {
    const parts = (Array.isArray(input) ? input : [input]).flatMap((x) => String(x ?? "").split(/[\s,;]+/)).map(normEmail).filter(Boolean);
    const good = [];
    const bad = [];
    for (const part of [...new Set(parts)]) (isEmail(part) ? good : bad).push(part);
    return { good, bad };
}

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

// What the client gets for a doc (versions without their text). `who` is the signed-in user (or their id).
// `profiles` gives people's current name and photo: { byId: { <userId>: { name, photo } }, byEmail: { <email>: ... } }
// (the service fills it; without it the names saved on the doc are used and there are no photos).
// Only the people who can share the doc (its owner and its editors) get the list of people it is shared with and
// the access requests.
export function docForClient(doc, who, profiles = {}) {
    const role = roleOf(doc, who);
    const owner = role === "owner";
    const me = whoOf(who);
    const byId = profiles.byId || {};
    const byEmail = profiles.byEmail || {};
    const person = (userId, email) => byId[idOf(userId)] || byEmail[normEmail(email)] || null;
    const ownerProfile = person(doc.owner);
    return {
        id: String(doc._id),
        title: doc.title,
        markdown: doc.markdown,
        visibility: doc.visibility,
        linkRole: cleanRole(doc.linkRole, "commenter"),
        rev: doc.rev || 0,
        lastBy: doc.lastBy || "user",
        isOwner: owner,
        role,
        can: { comment: canComment(doc, who), edit: canEdit(doc, who), share: canShare(doc, who), manage: owner },
        ownerName: ownerProfile?.name || doc.ownerName || "",
        ownerPhoto: ownerProfile?.photo || "",
        views: doc.views || 0,
        pinned: !!me.id && (doc.pinnedBy || []).some((id) => accountId(id) === me.id),
        // What this person asked the owner for and is still waiting on ("editor": they asked to edit), or null
        asked: owner ? null : (requestOf(doc, who) ? cleanRole(requestOf(doc, who).wants) : null),
        comments: (doc.comments || []).map((c) => ({
            id: c.id, userId: idOf(c.userId), name: c.name, photo: person(c.userId)?.photo || "", text: c.text, quote: c.quote, at: c.at, resolved: !!c.resolved,
            replies: (c.replies || []).map((r) => ({ name: r.name, photo: r.byAI ? "" : person(r.userId)?.photo || "", text: r.text, at: r.at, byAI: !!r.byAI })),
        })),
        versions: (doc.versions || []).map((v) => ({ id: idOf(v._id), at: v.at, by: v.by })).reverse(),
        ...(canShare(doc, who) ? {
            people: (doc.members || []).map((m) => {
                const p = person(m.userId, m.email);
                return { id: m.id, email: normEmail(m.email), name: p?.name || m.name || "", photo: p?.photo || "", role: cleanRole(m.role), joined: !!p, me: !!memberOf({ members: [m] }, who), addedAt: m.addedAt };
            }),
            requests: (doc.requests || []).map((r) => {
                const p = person(r.userId, r.email);
                return { id: r.id, email: normEmail(r.email), name: p?.name || r.name || "", photo: p?.photo || "", wants: cleanRole(r.wants), has: roleOf(doc, { _id: r.userId, email: r.email }), at: r.at };
            }),
        } : {}),
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
    };
}

/** A doc's row in a list (no text). */
export function docRow(doc, who, profiles = {}) {
    const me = whoOf(who);
    const ownerProfile = (profiles.byId || {})[idOf(doc.owner)];
    return {
        id: String(doc._id),
        title: doc.title,
        visibility: doc.visibility,
        role: roleOf(doc, who),
        shared: (doc.members || []).length > 0 || doc.visibility === "link",
        ownerName: ownerProfile?.name || doc.ownerName || "",
        ownerPhoto: ownerProfile?.photo || "",
        pinned: !!me.id && (doc.pinnedBy || []).some((id) => accountId(id) === me.id),
        lastBy: doc.lastBy || "user",
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
    };
}

/** "Plan" -> "Copy of Plan" (inside the title's length). */
export const copyTitle = (title) => cleanTitle(`Copy of ${cleanTitle(title)}`);

// "Monthly plan" -> "Monthly-plan" for file names
export const fileBase = (title) => String(title || "").replace(/[^\p{L}\p{N} _-]+/gu, " ").trim().replace(/\s+/g, "-").slice(0, 80) || "document";
