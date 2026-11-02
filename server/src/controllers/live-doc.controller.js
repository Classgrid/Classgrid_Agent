// /api/docs: live docs the AI writes and the user keeps editing, sharing and commenting on
import LiveDoc from "../models/LiveDoc.js";
import { findDoc, saveDoc, addComment, addReply, setResolved, exportDocx, exportPdf } from "../services/live-doc.service.js";
import { canView, canEdit, canComment, canResolve, docForClient } from "../services/live-doc.helpers.js";

const fail = (res, status, message) => res.status(status).json({ success: false, message });

// Loads the doc and checks access; sends the error itself and returns null when not allowed
async function load(req, res, check = canView) {
    const doc = await findDoc(req.params.id);
    if (!doc || !canView(doc, req.user?._id)) { fail(res, 404, "This doc was not found, or you don't have access to it."); return null; }
    if (!check(doc, req.user?._id)) { fail(res, 403, "Only the owner can change this doc."); return null; }
    return doc;
}

const wrap = (fn) => async (req, res) => {
    try { await fn(req, res); } catch (e) {
        console.error("[live-docs]", e);
        if (!res.headersSent) fail(res, 400, e?.message || "Something went wrong.");
    }
};

export const listDocs = wrap(async (req, res) => {
    const docs = await LiveDoc.find({ owner: req.user._id }).select("title visibility updatedAt createdAt lastBy").sort({ updatedAt: -1 }).limit(200).lean();
    res.json({ success: true, docs: docs.map((d) => ({ id: String(d._id), title: d.title, visibility: d.visibility, updatedAt: d.updatedAt, createdAt: d.createdAt, lastBy: d.lastBy })) });
});

export const getDoc = wrap(async (req, res) => {
    const doc = await load(req, res);
    if (!doc) return;
    // Polling: nothing changed since the time the page already has
    if (req.query.known && new Date(String(req.query.known)).getTime() === new Date(doc.updatedAt).getTime()) return res.json({ success: true, unchanged: true });
    res.json({ success: true, doc: docForClient(doc, req.user._id) });
});

export const getVersion = wrap(async (req, res) => {
    const doc = await load(req, res);
    if (!doc) return;
    const v = doc.versions.find((x) => String(x._id) === String(req.params.vid));
    if (!v) return fail(res, 404, "That version was not found.");
    res.json({ success: true, version: { id: String(v._id), at: v.at, by: v.by, markdown: v.markdown } });
});

export const updateDoc = wrap(async (req, res) => {
    const doc = await load(req, res, canEdit);
    if (!doc) return;
    const { title, markdown, rev, force } = req.body || {};
    // Someone (the AI) changed the text after this page loaded it
    if (markdown !== undefined && rev !== undefined && !force && Number(rev) !== (doc.rev || 0)) {
        return res.status(409).json({ success: false, message: "This doc was changed while you were editing.", rev: doc.rev, lastBy: doc.lastBy });
    }
    await saveDoc(doc, { title, markdown: markdown === undefined ? undefined : String(markdown), by: "user" });
    res.json({ success: true, doc: docForClient(doc, req.user._id) });
});

export const setVisibility = wrap(async (req, res) => {
    const doc = await load(req, res, canEdit);
    if (!doc) return;
    const v = req.body?.visibility;
    if (!["private", "link"].includes(v)) return fail(res, 400, 'visibility must be "private" or "link".');
    doc.visibility = v;
    await doc.save();
    res.json({ success: true, visibility: doc.visibility });
});

export const deleteDoc = wrap(async (req, res) => {
    const doc = await load(req, res, canEdit);
    if (!doc) return;
    await doc.deleteOne();
    res.json({ success: true });
});

export const postComment = wrap(async (req, res) => {
    const doc = await load(req, res, canComment);
    if (!doc) return;
    await addComment(doc, { user: req.user, text: req.body?.text, quote: req.body?.quote });
    res.json({ success: true, doc: docForClient(doc, req.user._id) });
});

export const postReply = wrap(async (req, res) => {
    const doc = await load(req, res, canComment);
    if (!doc) return;
    await addReply(doc, req.params.cid, { user: req.user, text: req.body?.text });
    res.json({ success: true, doc: docForClient(doc, req.user._id) });
});

export const patchComment = wrap(async (req, res) => {
    const doc = await load(req, res);
    if (!doc) return;
    const comment = doc.comments.find((c) => c.id === String(req.params.cid));
    if (!comment) return fail(res, 404, "That comment was not found.");
    if (!canResolve(doc, comment, req.user._id)) return fail(res, 403, "Only the owner or the person who wrote it can resolve this comment.");
    await setResolved(doc, comment.id, req.body?.resolved !== false);
    res.json({ success: true, doc: docForClient(doc, req.user._id) });
});

export const exportDoc = wrap(async (req, res) => {
    const doc = await load(req, res);
    if (!doc) return;
    const format = String(req.query.format || "docx").toLowerCase();
    if (!["docx", "pdf"].includes(format)) return fail(res, 400, 'format must be "docx" or "pdf".');
    const file = format === "pdf" ? await exportPdf(doc) : await exportDocx(doc);
    res.setHeader("Content-Type", file.mime);
    res.setHeader("Content-Disposition", `attachment; filename="${file.fileName.replace(/[^\x20-\x7e]|"/g, "_")}"; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
    res.send(file.buffer);
});
