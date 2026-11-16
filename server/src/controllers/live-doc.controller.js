// /api/docs: live docs the AI writes and the user keeps editing, sharing and commenting on
import { findDoc, saveDoc, addComment, addReply, setResolved, removeComment, exportDocx, exportPdf, exportMarkdown, exportHtml } from "../services/live-doc.service.js";
import { canView, canEdit, canComment, canShare, canManage, canResolve, docRow, requestOf } from "../services/live-doc.helpers.js";
import {
    docFor, readingNow, stoppedReading, countView, claimMembership, inviteMembers, setMemberRole, removeMember, setGeneralAccess,
    requestAccess, answerRequest, makeOwner, duplicateDoc, setPinned, reportDoc, reportComment, docsOf,
} from "../services/live-doc-share.service.js";

const fail = (res, status, message, more = {}) => res.status(status).json({ success: false, message, ...more });

// Loads the doc and checks access; sends the error itself and returns null when not allowed.
// A doc this person can't open answers 403 with private: true (and whether they already asked for access), so the
// page can offer "Request access"; a doc that does not exist answers 404.
async function load(req, res, check = canView, refused = "Only the owner can change this doc.") {
    const doc = await findDoc(req.params.id);
    if (!doc) { fail(res, 404, "This doc was not found."); return null; }
    if (!canView(doc, req.user)) {
        fail(res, 403, "This doc is private. Ask its owner for access.", { code: "private", private: true, requested: !!requestOf(doc, req.user) });
        return null;
    }
    if (!check(doc, req.user)) { fail(res, 403, refused); return null; }
    return doc;
}
const CANT_EDIT = "You can read this doc, but not change it.";
const CANT_SHARE = "Only the owner and the editors of this doc can share it.";
const CANT_COMMENT = "You can read this doc, but not comment on it.";

const wrap = (fn) => async (req, res) => {
    try { await fn(req, res); } catch (e) {
        console.error("[live-docs]", e);
        if (!res.headersSent) fail(res, 400, e?.message || "Something went wrong.");
    }
};

// The person's docs: `docs` are their own (as before), `shared` the ones shared with them by name
export const listDocs = wrap(async (req, res) => {
    const { mine, shared, profiles } = await docsOf(req.user);
    res.json({ success: true, docs: mine.map((d) => docRow(d, req.user)), shared: shared.map((d) => docRow(d, req.user, profiles)) });
});

export const getDoc = wrap(async (req, res) => {
    const doc = await load(req, res);
    if (!doc) return;
    const reading = await readingNow(doc, req.user);
    // Polling: nothing changed since the time the page already has (who is reading is told every time)
    if (req.query.known && new Date(String(req.query.known)).getTime() === new Date(doc.updatedAt).getTime()) return res.json({ success: true, unchanged: true, reading });
    // Opening the doc (not a poll): it counts as a view, and an invite by email is tied to this account
    let views = doc.views || 0;
    if (!req.query.known) {
        await claimMembership(doc, req.user);
        views = await countView(doc, req.user);
    }
    res.json({ success: true, doc: await docFor(doc, req.user, { views }), reading });
});

// The page was closed: this person is no longer shown as reading
export const leaveDoc = wrap(async (req, res) => {
    await stoppedReading(String(req.params.id), req.user);
    res.json({ success: true });
});

export const getVersion = wrap(async (req, res) => {
    const doc = await load(req, res);
    if (!doc) return;
    const v = doc.versions.find((x) => String(x._id) === String(req.params.vid));
    if (!v) return fail(res, 404, "That version was not found.");
    res.json({ success: true, version: { id: String(v._id), at: v.at, by: v.by, markdown: v.markdown } });
});

export const updateDoc = wrap(async (req, res) => {
    const doc = await load(req, res, canEdit, CANT_EDIT);
    if (!doc) return;
    const { title, markdown, rev, force } = req.body || {};
    // Someone (the AI, or another editor) changed the text after this page loaded it
    if (markdown !== undefined && rev !== undefined && !force && Number(rev) !== (doc.rev || 0)) {
        return res.status(409).json({ success: false, message: "This doc was changed while you were editing.", rev: doc.rev, lastBy: doc.lastBy });
    }
    await saveDoc(doc, { title, markdown: markdown === undefined ? undefined : String(markdown), by: "user" });
    res.json({ success: true, doc: await docFor(doc, req.user) });
});

// General access: { visibility: "private" | "link", linkRole: "viewer" | "commenter" | "editor" } (either or both)
export const setVisibility = wrap(async (req, res) => {
    const doc = await load(req, res, canShare, CANT_SHARE);
    if (!doc) return;
    if (req.body?.visibility === undefined && req.body?.linkRole === undefined) return fail(res, 400, 'visibility must be "private" or "link".');
    await setGeneralAccess(doc, { visibility: req.body?.visibility, linkRole: req.body?.linkRole });
    res.json({ success: true, visibility: doc.visibility, linkRole: doc.linkRole, doc: await docFor(doc, req.user) });
});

export const deleteDoc = wrap(async (req, res) => {
    const doc = await load(req, res, canManage, "Only the owner can delete this doc.");
    if (!doc) return;
    await doc.deleteOne();
    res.json({ success: true });
});

// ── Sharing ──

// { emails: ["a@b.c", ...] or "a@b.c, d@e.f", role, notify }: one result line per email
export const postMembers = wrap(async (req, res) => {
    const doc = await load(req, res, canShare, CANT_SHARE);
    if (!doc) return;
    const results = await inviteMembers(doc, { by: req.user, emails: req.body?.emails ?? req.body?.email, role: req.body?.role, notify: req.body?.notify !== false });
    res.json({ success: true, results, doc: await docFor(doc, req.user) });
});

// { role: "viewer" | "commenter" | "editor" }, or { role: "owner" } (the owner only): the doc becomes that person's
export const patchMember = wrap(async (req, res) => {
    const toOwner = req.body?.role === "owner";
    const doc = toOwner ? await load(req, res, canManage, "Only the owner can make someone else the owner.") : await load(req, res, canShare, CANT_SHARE);
    if (!doc) return;
    if (toOwner) await makeOwner(doc, req.params.mid, req.user);
    else await setMemberRole(doc, req.params.mid, req.body?.role);
    res.json({ success: true, doc: await docFor(doc, req.user) });
});

// (a person may always take themselves off a doc; removing someone else needs the right to share it)
export const deleteMember = wrap(async (req, res) => {
    const doc = await load(req, res);
    if (!doc) return;
    const mine = (doc.members || []).find((m) => m.id === String(req.params.mid) && (String(m.userId || "") === String(req.user._id) || String(m.email || "") === String(req.user.email || "").trim().toLowerCase()));
    if (!mine && !canShare(doc, req.user)) return fail(res, 403, CANT_SHARE);
    await removeMember(doc, req.params.mid);
    if (mine && !canView(doc, req.user)) return res.json({ success: true, left: true });
    res.json({ success: true, doc: await docFor(doc, req.user) });
});

// A signed-in person asks the doc's owner for access: to open it, or ({ wants: "editor" }) to be let to edit a doc
// they can already read
export const postAccessRequest = wrap(async (req, res) => {
    const doc = await findDoc(req.params.id);
    if (!doc) return fail(res, 404, "This doc was not found.");
    const status = await requestAccess(doc, req.user, req.body?.wants);
    res.json({ success: true, status });
});

// The owner answers: { action: "approve" | "decline", role }
export const answerAccessRequest = wrap(async (req, res) => {
    const doc = await load(req, res, canShare, "Only the owner and the editors of this doc can answer access requests.");
    if (!doc) return;
    const action = String(req.body?.action || "");
    if (!["approve", "decline"].includes(action)) return fail(res, 400, 'action must be "approve" or "decline".');
    await answerRequest(doc, req.params.rid, { approve: action === "approve", role: req.body?.role, by: req.user });
    res.json({ success: true, doc: await docFor(doc, req.user) });
});

// ── The doc's own menu ──

export const postDuplicate = wrap(async (req, res) => {
    const doc = await load(req, res);
    if (!doc) return;
    const copy = await duplicateDoc(doc, req.user);
    res.json({ success: true, id: String(copy._id), title: copy.title });
});

export const postPin = wrap(async (req, res) => {
    const doc = await load(req, res);
    if (!doc) return;
    res.json({ success: true, pinned: await setPinned(doc, req.user, req.body?.pinned !== false) });
});

export const postReport = wrap(async (req, res) => {
    const doc = await load(req, res);
    if (!doc) return;
    await reportDoc(doc, req.user, { reason: String(req.body?.reason || ""), description: req.body?.description });
    res.json({ success: true });
});

// ── Comments ──

export const postComment = wrap(async (req, res) => {
    const doc = await load(req, res, canComment, CANT_COMMENT);
    if (!doc) return;
    const comment = await addComment(doc, { user: req.user, text: req.body?.text, quote: req.body?.quote });
    res.json({ success: true, commentId: comment.id, doc: await docFor(doc, req.user) });
});

export const postReply = wrap(async (req, res) => {
    const doc = await load(req, res, canComment, CANT_COMMENT);
    if (!doc) return;
    await addReply(doc, req.params.cid, { user: req.user, text: req.body?.text });
    res.json({ success: true, doc: await docFor(doc, req.user) });
});

export const patchComment = wrap(async (req, res) => {
    const doc = await load(req, res);
    if (!doc) return;
    const comment = doc.comments.find((c) => c.id === String(req.params.cid));
    if (!comment) return fail(res, 404, "That comment was not found.");
    if (!canResolve(doc, comment, req.user)) return fail(res, 403, "Only an editor or the person who wrote it can resolve this comment.");
    await setResolved(doc, comment.id, req.body?.resolved !== false);
    res.json({ success: true, doc: await docFor(doc, req.user) });
});

// The whole thread goes: by the person who wrote the comment, or by an editor of the doc
export const deleteComment = wrap(async (req, res) => {
    const doc = await load(req, res);
    if (!doc) return;
    const comment = doc.comments.find((c) => c.id === String(req.params.cid));
    if (!comment) return fail(res, 404, "That comment was not found.");
    const mine = String(comment.userId || "") === String(req.user._id);
    if (!mine && !canEdit(doc, req.user)) return fail(res, 403, "Only an editor or the person who wrote it can delete this comment.");
    await removeComment(doc, comment.id);
    res.json({ success: true, doc: await docFor(doc, req.user) });
});

export const postCommentReport = wrap(async (req, res) => {
    const doc = await load(req, res);
    if (!doc) return;
    const comment = doc.comments.find((c) => c.id === String(req.params.cid));
    if (!comment) return fail(res, 404, "That comment was not found.");
    await reportComment(doc, comment, req.user, { reason: String(req.body?.reason || ""), description: req.body?.description });
    res.json({ success: true });
});

// ── Export: Word, PDF, Markdown or a web page ──

const EXPORTS = { docx: exportDocx, pdf: exportPdf, md: exportMarkdown, html: exportHtml };

export const exportDoc = async (req, res) => {
    try {
        const doc = await load(req, res);
        if (!doc) return;
        const format = String(req.query.format || "docx").toLowerCase();
        const make = EXPORTS[format];
        if (!make) return fail(res, 400, 'format must be "docx", "pdf", "md" or "html".');
        const file = await make(doc);
        res.setHeader("Content-Type", file.mime);
        res.setHeader("Content-Disposition", `attachment; filename="${file.fileName.replace(/[^\x20-\x7e]|"/g, "_")}"; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
        res.send(file.buffer);
    } catch (e) {
        // The page shows this message, so a file that can't be made says why (before, every failure read the same)
        console.error("[live-docs] export failed:", e);
        if (!res.headersSent) fail(res, 500, `The file could not be made: ${String(e?.message || "unknown error").slice(0, 300)}`);
    }
};
