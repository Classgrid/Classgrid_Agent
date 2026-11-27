// Share pages API (mounted at /api/pages): pages the AI publishes, their comments and their small data store.
// A page is shared like a live doc (owner, 2026-11-16): people added by email with a role, access requests, a link
// with a role, who has it open now, views, pin, a copy and reports. The sharing itself is the live docs' service
// (services/live-doc-share.service.js), which works on a doc or a page; who may do what is in
// services/share-page.helpers.js. The answers the phone app already reads (GET /:id, PATCH /:id, the comment
// routes) keep their old fields. A video the AI made (make_video) is a page of kind "video" (2026-11-27): the same
// routes, with `video` in place of the HTML, and comments that may be on a time and an area of the video.
import express from "express";
import { isAuthenticated } from "../middleware/auth.middleware.js";
import SharePage from "../models/SharePage.js";
import User from "../models/User.js";
import {
    pageLink, isOwner, canView, canWriteData, canComment, canShare, canRename, canResolveComment, canDeleteComment, cleanTitle, checkVisibility,
    checkCommentText, checkCommentPlace, pageRow, kindOf, DATA_KEY_RE,
} from "../services/share-page.helpers.js";
import {
    findPage, commentView, summaryView, addComment, setCommentResolved, removeComment, writeData, dataObject, pageFor, duplicatePage, pagesOf,
} from "../services/share-page.service.js";
import { requestOf } from "../services/live-doc.helpers.js";
import {
    readingNow, stoppedReading, countView, claimMembership, inviteMembers, setMemberRole, removeMember, setGeneralAccess, requestAccess,
    answerRequest, makeOwner, setPinned, reportDoc, reportComment,
} from "../services/live-doc-share.service.js";

const router = express.Router();
const fail = (res, status, message, more = {}) => res.status(status).json({ message, ...more });
const NOT_FOUND = "This page doesn't exist or you don't have access to it.";
const CANT_SHARE = "Only the owner and the editors of this page can share it.";
const CANT_COMMENT = "You can open this page, but not comment on it.";
// (everything of a page but its HTML and its saved data: enough to know who may do what, and to send it back; a
// video's HTML it was made from is never sent)
const LIGHT = "-html -data -video.sourceHtml";

const wrap = (fn) => async (req, res, next) => {
    try {
        await fn(req, res, next);
    } catch (err) {
        console.error("[share-pages]", err?.message || err);
        // (the sharing service says what went wrong in words for the person: "Type an email address first.")
        if (!res.headersSent) fail(res, 400, err?.message || "Something went wrong. Please try again.");
    }
};

// Loads the page and checks access; sends the error itself and answers null when not allowed. A page this person
// can't open answers 403 with private: true (and whether they already asked for access), so the screen can offer
// "Request access"; a page that does not exist answers 404.
async function load(req, res, { check = canView, refused = "Only the owner can change this page.", select = LIGHT } = {}) {
    const page = await findPage(req.params.id, select);
    if (!page) { fail(res, 404, NOT_FOUND); return null; }
    if (!canView(page, req.user)) {
        fail(res, 403, "This page is private. Ask its owner for access.", { code: "private", private: true, requested: !!requestOf(page, req.user) });
        return null;
    }
    if (!check(page, req.user)) { fail(res, 403, refused); return null; }
    return page;
}
// (the page as it is now, after a change made with updateOne)
const fresh = async (req) => pageFor(await findPage(req.params.id, LIGHT), req.user);

// The person's pages, newest first: `pages` are their own (as before), `shared` the ones shared with them by name
router.get("/", isAuthenticated, wrap(async (req, res) => {
    const { mine, shared, profiles } = await pagesOf(req.user);
    res.json({ pages: mine.map((p) => ({ ...summaryView(p), ...pageRow(p, req.user) })), shared: shared.map((p) => pageRow(p, req.user, profiles)) });
}));

// ?card=1: only what the card of a /p/ link in the chat needs to draw itself (2026-11-27), with the same access
// check; it is not opening the page, so no view is counted, no invite is tied to the account and nobody is shown
// as reading it
router.get("/:id", isAuthenticated, wrap(async (req, res, next) => {
    if (req.query.card !== "1") return next();
    const page = await load(req, res, { select: "owner kind title visibility linkRole members requests video.poster video.seconds video.url" });
    if (!page) return;
    const kind = kindOf(page);
    res.json({
        page: {
            _id: String(page._id), kind, title: page.title,
            ...(kind === "video" ? { video: { poster: String(page.video?.poster || ""), seconds: Number(page.video?.seconds) || 0, url: String(page.video?.url || "") } } : {}),
        },
    });
}));

router.get("/:id", isAuthenticated, wrap(async (req, res) => {
    const page = await load(req, res, { select: "-data -video.sourceHtml" });
    if (!page) return;
    const reading = await readingNow(page, req.user);
    // Polling: nothing changed since the time the screen already has (who has it open is told every time)
    if (req.query.known && new Date(String(req.query.known)).getTime() === new Date(page.updatedAt).getTime()) return res.json({ unchanged: true, reading });
    // Opening the page (not a poll): it counts as a view, and an invite by email is tied to this account
    let views = page.views || 0;
    if (!req.query.known) {
        await claimMembership(page, req.user);
        views = await countView(page, req.user);
    }
    const full = await pageFor(page, req.user, { views });
    const owner = await User.findById(page.owner).select("name email").lean().catch(() => null);
    res.json({
        page: { ...full, owner: { name: owner?.name || "", email: owner?.email || "" } },
        isOwner: full.isOwner,
        link: pageLink(page._id),
        comments: (page.comments || []).map(commentView),
        reading,
    });
}));

// The screen was closed: this person is no longer shown as having the page open
router.post("/:id/leave", isAuthenticated, wrap(async (req, res) => {
    await stoppedReading(String(req.params.id), req.user);
    res.json({ ok: true });
}));

// { title } (the owner and the editors), { visibility } (the people who share the page)
router.patch("/:id", isAuthenticated, wrap(async (req, res) => {
    const page = await load(req, res);
    if (!page) return;
    const set = {};
    if (req.body?.title !== undefined) {
        if (!canRename(page, req.user)) return fail(res, 403, "Only the owner and the editors of this page can rename it.");
        set.title = cleanTitle(req.body.title);
    }
    if (req.body?.visibility !== undefined) {
        if (!canShare(page, req.user)) return fail(res, 403, CANT_SHARE);
        const v = checkVisibility(req.body.visibility);
        if (!v.ok) return fail(res, 400, v.error);
        set.visibility = v.value;
    }
    const saved = await SharePage.findByIdAndUpdate(page._id, { $set: set }, { new: true }).select("title kind visibility versions comments.resolved createdAt updatedAt");
    res.json({ page: summaryView(saved) });
}));

router.delete("/:id", isAuthenticated, wrap(async (req, res) => {
    const page = await load(req, res, { check: isOwner, refused: "Only the owner can delete this page." });
    if (!page) return;
    await SharePage.deleteOne({ _id: page._id });
    res.json({ ok: true });
}));

// ── Sharing ──

// General access: { visibility: "private" | "link", linkRole }
router.patch("/:id/visibility", isAuthenticated, wrap(async (req, res) => {
    const page = await load(req, res, { check: canShare, refused: CANT_SHARE });
    if (!page) return;
    if (req.body?.visibility === undefined && req.body?.linkRole === undefined) return fail(res, 400, 'visibility must be "private" or "link".');
    await setGeneralAccess(page, { visibility: req.body?.visibility, linkRole: req.body?.linkRole });
    res.json({ page: await pageFor(page, req.user) });
}));

// { emails: ["a@b.c"] or "a@b.c, d@e.f", role, notify }: one result line per email
router.post("/:id/members", isAuthenticated, wrap(async (req, res) => {
    const page = await load(req, res, { check: canShare, refused: CANT_SHARE });
    if (!page) return;
    const results = await inviteMembers(page, { by: req.user, emails: req.body?.emails ?? req.body?.email, role: req.body?.role, notify: req.body?.notify !== false });
    res.json({ results, page: await pageFor(page, req.user) });
}));

// { role: "viewer" | "commenter" | "editor" }, or { role: "owner" } (the owner only): the page becomes that person's
router.patch("/:id/members/:mid", isAuthenticated, wrap(async (req, res) => {
    const toOwner = req.body?.role === "owner";
    const page = toOwner
        ? await load(req, res, { check: isOwner, refused: "Only the owner can make someone else the owner." })
        : await load(req, res, { check: canShare, refused: CANT_SHARE });
    if (!page) return;
    if (toOwner) await makeOwner(page, req.params.mid, req.user);
    else await setMemberRole(page, req.params.mid, req.body?.role);
    res.json({ page: await pageFor(page, req.user) });
}));

// (a person may always take themselves off a page; removing someone else needs the right to share it)
router.delete("/:id/members/:mid", isAuthenticated, wrap(async (req, res) => {
    const page = await load(req, res);
    if (!page) return;
    const myEmail = String(req.user.email || "").trim().toLowerCase();
    const mine = (page.members || []).find((m) => m.id === String(req.params.mid) && (String(m.userId || "") === String(req.user._id) || (!!myEmail && String(m.email || "") === myEmail)));
    if (!mine && !canShare(page, req.user)) return fail(res, 403, CANT_SHARE);
    await removeMember(page, req.params.mid);
    if (mine && !canView(page, req.user)) return res.json({ ok: true, left: true });
    res.json({ page: await pageFor(page, req.user) });
}));

// A signed-in person asks the page's owner for access: to open it, or ({ wants }) for more than they have
router.post("/:id/access-requests", isAuthenticated, wrap(async (req, res) => {
    const page = await findPage(req.params.id, LIGHT);
    if (!page) return fail(res, 404, NOT_FOUND);
    res.json({ status: await requestAccess(page, req.user, req.body?.wants) });
}));

// The answer: { action: "approve" | "decline", role }
router.post("/:id/access-requests/:rid", isAuthenticated, wrap(async (req, res) => {
    const page = await load(req, res, { check: canShare, refused: "Only the owner and the editors of this page can answer access requests." });
    if (!page) return;
    const action = String(req.body?.action || "");
    if (!["approve", "decline"].includes(action)) return fail(res, 400, 'action must be "approve" or "decline".');
    await answerRequest(page, req.params.rid, { approve: action === "approve", role: req.body?.role, by: req.user });
    res.json({ page: await pageFor(page, req.user) });
}));

// ── The page's own menu ──

router.post("/:id/duplicate", isAuthenticated, wrap(async (req, res) => {
    const page = await load(req, res, { select: "-data" });
    if (!page) return;
    const copy = await duplicatePage(page, req.user);
    res.json({ id: String(copy._id), title: copy.title });
}));

router.post("/:id/pin", isAuthenticated, wrap(async (req, res) => {
    const page = await load(req, res);
    if (!page) return;
    res.json({ pinned: await setPinned(page, req.user, req.body?.pinned !== false) });
}));

router.post("/:id/report", isAuthenticated, wrap(async (req, res) => {
    const page = await load(req, res);
    if (!page) return;
    await reportDoc(page, req.user, { reason: String(req.body?.reason || ""), description: req.body?.description });
    res.json({ ok: true });
}));

// ── Comments ──

// { text, replyTo, quote }: `quote` is the words of the page the comment is on. On a video also { time, timeEnd,
// area }: the moment (seconds), the end of a stretch of time, and a box on the frame (x, y, w, h, each 0-1)
router.post("/:id/comments", isAuthenticated, wrap(async (req, res) => {
    const page = await load(req, res, { check: canComment, refused: CANT_COMMENT, select: "owner kind video.seconds visibility linkRole members requests comments.id" });
    if (!page) return;
    const text = checkCommentText(req.body?.text);
    if (!text.ok) return fail(res, 400, text.error);
    const replyTo = req.body?.replyTo ? String(req.body.replyTo) : null;
    if (replyTo && !(page.comments || []).some((c) => c.id === replyTo)) return fail(res, 400, "That comment was not found.");
    const place = checkCommentPlace(req.body, page);
    if (!place.ok) return fail(res, 400, place.error);
    const comment = await addComment(page._id, { user: req.user, text: text.value, replyTo, quote: req.body?.quote, place: place.value });
    if (!comment) return fail(res, 400, "This page has too many comments.");
    res.status(201).json({ comment: commentView(comment), page: await fresh(req) });
}));

router.patch("/:id/comments/:cid", isAuthenticated, wrap(async (req, res) => {
    const page = await load(req, res);
    if (!page) return;
    const comment = (page.comments || []).find((c) => c.id === req.params.cid);
    if (!comment) return fail(res, 404, "That comment was not found.");
    if (!canResolveComment(page, comment, req.user)) return fail(res, 403, "Only the page's owner, its editors or the person who wrote it can do this.");
    const resolved = req.body?.resolved === undefined ? true : !!req.body.resolved;
    await setCommentResolved(page._id, comment.id, resolved);
    res.json({ comment: { ...commentView(comment), resolved }, page: await fresh(req) });
}));

// Removes a comment with its replies (its writer, or an editor of the page)
router.delete("/:id/comments/:cid", isAuthenticated, wrap(async (req, res) => {
    const page = await load(req, res);
    if (!page) return;
    const comment = (page.comments || []).find((c) => c.id === req.params.cid);
    if (!comment) return fail(res, 404, "That comment was not found.");
    if (!canDeleteComment(page, comment, req.user)) return fail(res, 403, "Only the page's owner, its editors or the person who wrote it can delete this.");
    await removeComment(page._id, comment.id);
    res.json({ page: await fresh(req) });
}));

router.post("/:id/comments/:cid/report", isAuthenticated, wrap(async (req, res) => {
    const page = await load(req, res);
    if (!page) return;
    const comment = (page.comments || []).find((c) => c.id === req.params.cid);
    if (!comment) return fail(res, 404, "That comment was not found.");
    await reportComment(page, comment, req.user, { reason: String(req.body?.reason || ""), description: req.body?.description });
    res.json({ ok: true });
}));

// ── Page data: everyone who can open the page can read and write it ──

router.get("/:id/data", isAuthenticated, wrap(async (req, res) => {
    const page = await findPage(req.params.id, "owner visibility linkRole members data");
    if (!page || !canView(page, req.user)) return fail(res, 404, NOT_FOUND);
    res.json({ data: dataObject(page) });
}));

router.get("/:id/data/:key", isAuthenticated, wrap(async (req, res) => {
    const page = await findPage(req.params.id, "owner visibility linkRole members data");
    if (!page || !canView(page, req.user)) return fail(res, 404, NOT_FOUND);
    if (!DATA_KEY_RE.test(req.params.key)) return fail(res, 400, "Key must be 1-100 letters, numbers, _ - or :.");
    const value = page.data?.get(req.params.key);
    res.json({ key: req.params.key, value: value === undefined ? null : value });
}));

router.put("/:id/data/:key", isAuthenticated, wrap(async (req, res) => {
    const page = await findPage(req.params.id, "owner visibility linkRole members data");
    if (!page || !canWriteData(page, req.user)) return fail(res, 404, NOT_FOUND);
    if (!req.body || !("value" in req.body)) return fail(res, 400, "Send { value }.");
    // null deletes the key
    const value = req.body.value === null ? undefined : req.body.value;
    const result = await writeData(page, req.params.key, value);
    if (!result.ok) return fail(res, 400, result.error);
    res.json({ ok: true });
}));

export default router;
