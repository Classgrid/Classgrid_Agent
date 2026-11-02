// Share pages API (mounted at /api/pages): pages the AI publishes, their comments and their small data store.
import express from "express";
import { isAuthenticated } from "../middleware/auth.middleware.js";
import SharePage from "../models/SharePage.js";
import {
    pageLink, isOwner, canView, canWriteData, canComment, canResolveComment, cleanTitle, checkVisibility, checkCommentText, DATA_KEY_RE,
} from "../services/share-page.helpers.js";
import { findPage, commentView, summaryView, addComment, setCommentResolved, writeData, dataObject } from "../services/share-page.service.js";

const router = express.Router();
const fail = (res, status, message) => res.status(status).json({ message });
const NOT_FOUND = "This page doesn't exist or you don't have access to it.";

const wrap = (fn) => async (req, res) => {
    try {
        await fn(req, res);
    } catch (err) {
        console.error("[share-pages]", err?.message || err);
        if (!res.headersSent) fail(res, 500, "Something went wrong. Please try again.");
    }
};

// The owner's pages, newest first
router.get("/", isAuthenticated, wrap(async (req, res) => {
    const pages = await SharePage.find({ owner: req.user._id })
        .select("title visibility versions comments.resolved createdAt updatedAt")
        .sort({ updatedAt: -1 })
        .limit(200)
        .lean();
    res.json({ pages: pages.map(summaryView) });
}));

router.get("/:id", isAuthenticated, wrap(async (req, res) => {
    const page = await findPage(req.params.id, "-data");
    if (!page || !canView(page, req.user._id)) return fail(res, 404, NOT_FOUND);
    await page.populate("owner", "name email");
    res.json({
        page: {
            id: String(page._id),
            title: page.title,
            html: page.html,
            visibility: page.visibility,
            versions: page.versions,
            owner: { name: page.owner?.name || "", email: page.owner?.email || "" },
            createdAt: page.createdAt,
            updatedAt: page.updatedAt,
        },
        isOwner: isOwner(page, req.user._id),
        link: pageLink(page._id),
        comments: (page.comments || []).map(commentView),
    });
}));

router.patch("/:id", isAuthenticated, wrap(async (req, res) => {
    const page = await findPage(req.params.id, "owner visibility");
    if (!page || !canView(page, req.user._id)) return fail(res, 404, NOT_FOUND);
    if (!isOwner(page, req.user._id)) return fail(res, 403, "Only the owner can change this page.");
    const set = {};
    if (req.body?.title !== undefined) set.title = cleanTitle(req.body.title);
    if (req.body?.visibility !== undefined) {
        const v = checkVisibility(req.body.visibility);
        if (!v.ok) return fail(res, 400, v.error);
        set.visibility = v.value;
    }
    const saved = await SharePage.findByIdAndUpdate(page._id, { $set: set }, { new: true }).select("title visibility versions comments.resolved createdAt updatedAt");
    res.json({ page: summaryView(saved) });
}));

router.delete("/:id", isAuthenticated, wrap(async (req, res) => {
    const page = await findPage(req.params.id, "owner visibility");
    if (!page || !canView(page, req.user._id)) return fail(res, 404, NOT_FOUND);
    if (!isOwner(page, req.user._id)) return fail(res, 403, "Only the owner can delete this page.");
    await SharePage.deleteOne({ _id: page._id });
    res.json({ ok: true });
}));

router.post("/:id/comments", isAuthenticated, wrap(async (req, res) => {
    const page = await findPage(req.params.id, "owner visibility comments.id");
    if (!page || !canComment(page, req.user._id)) return fail(res, 404, NOT_FOUND);
    const text = checkCommentText(req.body?.text);
    if (!text.ok) return fail(res, 400, text.error);
    const replyTo = req.body?.replyTo ? String(req.body.replyTo) : null;
    if (replyTo && !(page.comments || []).some((c) => c.id === replyTo)) return fail(res, 400, "That comment was not found.");
    const comment = await addComment(page._id, { user: req.user, text: text.value, replyTo });
    if (!comment) return fail(res, 400, "This page has too many comments.");
    res.status(201).json({ comment: commentView(comment) });
}));

router.patch("/:id/comments/:cid", isAuthenticated, wrap(async (req, res) => {
    const page = await findPage(req.params.id, "owner visibility comments");
    if (!page || !canView(page, req.user._id)) return fail(res, 404, NOT_FOUND);
    const comment = (page.comments || []).find((c) => c.id === req.params.cid);
    if (!comment) return fail(res, 404, "That comment was not found.");
    if (!canResolveComment(page, comment, req.user._id)) return fail(res, 403, "Only the page owner or the person who wrote it can do this.");
    const resolved = req.body?.resolved === undefined ? true : !!req.body.resolved;
    await setCommentResolved(page._id, comment.id, resolved);
    res.json({ comment: { ...commentView(comment), resolved } });
}));

// Page data: everyone who can view the page can read and write it
router.get("/:id/data", isAuthenticated, wrap(async (req, res) => {
    const page = await findPage(req.params.id, "owner visibility data");
    if (!page || !canView(page, req.user._id)) return fail(res, 404, NOT_FOUND);
    res.json({ data: dataObject(page) });
}));

router.get("/:id/data/:key", isAuthenticated, wrap(async (req, res) => {
    const page = await findPage(req.params.id, "owner visibility data");
    if (!page || !canView(page, req.user._id)) return fail(res, 404, NOT_FOUND);
    if (!DATA_KEY_RE.test(req.params.key)) return fail(res, 400, "Key must be 1-100 letters, numbers, _ - or :.");
    const value = page.data?.get(req.params.key);
    res.json({ key: req.params.key, value: value === undefined ? null : value });
}));

router.put("/:id/data/:key", isAuthenticated, wrap(async (req, res) => {
    const page = await findPage(req.params.id, "owner visibility data");
    if (!page || !canWriteData(page, req.user._id)) return fail(res, 404, NOT_FOUND);
    if (!req.body || !("value" in req.body)) return fail(res, 400, "Send { value }.");
    // null deletes the key
    const value = req.body.value === null ? undefined : req.body.value;
    const result = await writeData(page, req.params.key, value);
    if (!result.ok) return fail(res, 400, result.error);
    res.json({ ok: true });
}));

export default router;
