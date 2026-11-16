// Share pages: database work used by the /api/pages routes and by the AI tools publish_page and page_comments.
import crypto from "crypto";
import mongoose from "mongoose";
import SharePage from "../models/SharePage.js";
import User from "../models/User.js";
import {
    pageLink, isOwner, cleanTitle, checkHtml, checkVisibility, checkCommentText, checkDataWrite, dataEntries, COMMENTS_MAX,
    cleanQuote, pageForClient, copyPageTitle,
} from "./share-page.helpers.js";
import { profilesOf } from "./live-doc-share.service.js";
import { normEmail } from "./live-doc.helpers.js";

export const newCommentId = () => crypto.randomBytes(8).toString("hex");

export async function findPage(id, select) {
    if (!mongoose.isValidObjectId(id)) return null;
    const q = SharePage.findById(id);
    if (select) q.select(select);
    return q;
}

export function commentView(c) {
    return { id: c.id, userId: c.userId ? String(c.userId) : null, name: c.name, email: c.email, text: c.text, quote: c.quote || "", at: c.at, resolved: !!c.resolved, replyTo: c.replyTo || null, byAi: !!c.byAi };
}

/** The page as the signed-in user gets it, with everyone's current name and photo. */
export async function pageFor(page, user, extra = {}) {
    const profiles = await profilesOf(page).catch(() => ({}));
    return { ...pageForClient(page, user, profiles), ...extra };
}

/** Removes a comment with its replies. Answers whether it was there. */
export async function removeComment(pageId, commentId) {
    const res = await SharePage.updateOne({ _id: pageId, "comments.id": commentId }, { $pull: { comments: { $or: [{ id: commentId }, { replyTo: commentId }] } } }, { timestamps: false });
    return res.modifiedCount > 0;
}

/** A copy of the page for this person: theirs, private, with the same HTML (not its comments or its saved data). */
export const duplicatePage = (page, user) => SharePage.create({ owner: user._id, title: copyPageTitle(page.title), html: page.html, visibility: "private" });

/** The pages this person owns and the pages shared with them by name (not the ones only a link opens). */
export async function pagesOf(user) {
    const email = normEmail(user.email);
    const fields = "title visibility linkRole owner members pinnedBy versions comments.resolved comments.replyTo createdAt updatedAt";
    const [mine, shared] = await Promise.all([
        SharePage.find({ owner: user._id }).select(fields).sort({ updatedAt: -1 }).limit(200).lean(),
        SharePage.find({ owner: { $ne: user._id }, $or: [{ "members.userId": user._id }, ...(email ? [{ "members.email": email }] : [])] }).select(fields).sort({ updatedAt: -1 }).limit(200).lean(),
    ]);
    const owners = [...new Set(shared.map((p) => String(p.owner)))];
    const people = owners.length ? await User.find({ _id: { $in: owners } }).select("name email profilePicture").lean() : [];
    const byId = {};
    for (const u of people) byId[String(u._id)] = { name: u.name || u.email || "", photo: u.profilePicture || "" };
    return { mine, shared, profiles: { byId } };
}

export function summaryView(p) {
    const open = (p.comments || []).filter((c) => !c.resolved).length;
    return { id: String(p._id), title: p.title, visibility: p.visibility, versions: p.versions, openComments: open, link: pageLink(p._id), createdAt: p.createdAt, updatedAt: p.updatedAt };
}

export async function addComment(pageId, { user, text, replyTo = null, byAi = false, quote = "" }) {
    const comment = {
        id: newCommentId(),
        userId: user?._id,
        name: byAi ? "Classgrid AI" : String(user?.name || ""),
        email: byAi ? "" : String(user?.email || ""),
        text,
        quote: replyTo ? "" : cleanQuote(quote),
        at: new Date(),
        resolved: false,
        replyTo: replyTo || null,
        byAi,
    };
    const res = await SharePage.updateOne(
        { _id: pageId, [`comments.${COMMENTS_MAX - 1}`]: { $exists: false } },
        { $push: { comments: comment } },
    );
    if (!res.modifiedCount) return null;
    return comment;
}

export async function setCommentResolved(pageId, commentId, resolved) {
    const res = await SharePage.updateOne({ _id: pageId, "comments.id": commentId }, { $set: { "comments.$.resolved": !!resolved } });
    return res.matchedCount > 0;
}

/** Saves one key of the page data (value undefined = delete). Returns { ok, error? }. */
export async function writeData(page, key, value) {
    const check = checkDataWrite(page.data, key, value);
    if (!check.ok) return check;
    const update = value === undefined ? { $unset: { [`data.${key}`]: "" } } : { $set: { [`data.${key}`]: value } };
    // (the page working is not the page changing: its "updated" time stays, so the people who have it open are
    // not sent the whole page again each time it saves something)
    await SharePage.updateOne({ _id: page._id }, update, { timestamps: false });
    return { ok: true };
}

export const dataObject = (page) => Object.fromEntries(dataEntries(page.data));

// ---------------------------------------------------------------------------------------------------------
// AI tools

export const SHARE_PAGE_TOOLS = [
    {
        type: "function",
        function: {
            name: "publish_page",
            description: "Publishes a small web page (report, dashboard, slides, form, mini app) the user opens at chat.classgrid.in/p/<id>, and returns its link. Private by default. To change a page you made before, send its page_id: that saves a new version at the same link.",
            parameters: {
                type: "object",
                properties: {
                    title: { type: "string", description: "Short page name, e.g. \"Sales this month\"." },
                    html: { type: "string", description: "The whole page as one self-contained HTML file (inline CSS and JS; scripts only from cdnjs.cloudflare.com, cdn.jsdelivr.net or unpkg.com with exact versions). Max 2 MB." },
                    visibility: { type: "string", enum: ["private", "link"], description: "private = only the user (default). link = any signed-in Classgrid user with the link can view and comment." },
                    page_id: { type: "string", description: "Id of a page you published before, to update it (new version, same link)." },
                },
                required: ["title", "html"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "page_comments",
            description: "Reads and answers comments on a page you published with publish_page. list = all comments, reply = answer a comment (or add a note when comment_id is empty), resolve = mark a comment done.",
            parameters: {
                type: "object",
                properties: {
                    page_id: { type: "string", description: "The page id (the part after /p/ in the link)." },
                    action: { type: "string", enum: ["list", "reply", "resolve"] },
                    comment_id: { type: "string", description: "The comment to reply to or resolve." },
                    text: { type: "string", description: "Your reply, for action reply." },
                },
                required: ["page_id", "action"],
            },
        },
    },
];

export const SHARE_PAGE_PROMPT = `

SHARE PAGES (publish_page, page_comments):
1. WHEN: use publish_page for something the user will look at again or share and that is bigger than a chat answer: a report, dashboard, slides, a form, a tracker or a mini app. Short answers stay in the chat. To change a page you made, call publish_page with its page_id (same link, new version). Put the link in your reply.
2. HOW: one self-contained HTML file: inline CSS and JS; outside scripts only from cdnjs.cloudflare.com, cdn.jsdelivr.net or unpkg.com with an exact version (e.g. chart.js@4.4.1). It must look good in light and dark mode (prefers-color-scheme), fit a phone screen, and use no login, cookies or localStorage for important data.
3. SAVED DATA: the page can keep shared data (everyone who opens it sees the same): await window.classgrid.data.get(key), await window.classgrid.data.set(key, value) (value = any JSON, null deletes), await window.classgrid.data.list() (object of all keys). Keys: letters, numbers, _ - :. Max 200 keys and 500 KB in all. Use it for forms, polls, checklists and trackers. Use page_comments to read and answer comments people leave on the page.`;

const idFrom = (v) => String(v ?? "").trim().replace(/^.*\/p\//, "").replace(/[/?#].*$/, "");

export async function runPublishPage(user, args = {}) {
    if (!user?._id) return "FAILED to publish the page: no signed-in user.";
    const html = checkHtml(args.html);
    if (!html.ok) return `FAILED to publish the page: ${html.error}`;
    let visibility;
    if (args.visibility != null && args.visibility !== "") {
        const v = checkVisibility(args.visibility);
        if (!v.ok) return `FAILED to publish the page: ${v.error}`;
        visibility = v.value;
    }
    const pageId = idFrom(args.page_id);
    if (pageId) {
        const page = await findPage(pageId, "owner title visibility versions");
        if (!page) return `FAILED to publish the page: page ${pageId} was not found.`;
        if (!isOwner(page, user._id)) return "FAILED to publish the page: only the person who owns this page can change it.";
        const set = { html: args.html };
        if (String(args.title ?? "").trim()) set.title = cleanTitle(args.title);
        if (visibility) set.visibility = visibility;
        const saved = await SharePage.findByIdAndUpdate(page._id, { $set: set, $inc: { versions: 1 } }, { new: true }).select("title visibility versions");
        return `Published "${saved.title}" (version ${saved.versions}, ${saved.visibility === "link" ? "anyone signed in with the link can open it" : "private"}). page_id: ${saved._id}\nLink: ${pageLink(saved._id)}\nPut this link in your reply.`;
    }
    const page = await SharePage.create({ owner: user._id, title: cleanTitle(args.title), html: args.html, visibility: visibility || "private" });
    return `Published "${page.title}" (version 1, ${page.visibility === "link" ? "anyone signed in with the link can open it" : "private"}). page_id: ${page._id}\nLink: ${pageLink(page._id)}\nPut this link in your reply.`;
}

export async function runPageComments(user, args = {}) {
    if (!user?._id) return "FAILED: no signed-in user.";
    const pageId = idFrom(args.page_id);
    const page = await findPage(pageId, "owner title comments");
    if (!page) return `FAILED: page ${pageId || "(empty)"} was not found.`;
    if (!isOwner(page, user._id)) return "FAILED: you can only read comments on the user's own pages.";
    const action = String(args.action || "list").toLowerCase();
    if (action === "list") {
        const list = (page.comments || []).map(commentView);
        if (!list.length) return `"${page.title}" has no comments yet.`;
        return `Comments on "${page.title}" (${list.length}):\n` + list.map((c) =>
            `- [${c.id}]${c.replyTo ? ` (reply to ${c.replyTo})` : ""} ${c.byAi ? "Classgrid AI" : `${c.name || "Someone"} <${c.email}>`}, ${new Date(c.at).toISOString()}${c.resolved ? ", resolved" : ""}${c.quote ? `, on "${String(c.quote).slice(0, 300)}"` : ""}: ${c.text}`
        ).join("\n");
    }
    const cid = String(args.comment_id || "").trim();
    if (action === "resolve") {
        if (!cid) return "FAILED: send comment_id to resolve.";
        return (await setCommentResolved(page._id, cid, true)) ? `Comment ${cid} marked resolved.` : `FAILED: comment ${cid} was not found.`;
    }
    if (action === "reply") {
        const text = checkCommentText(args.text);
        if (!text.ok) return `FAILED: ${text.error}`;
        if (cid && !(page.comments || []).some((c) => c.id === cid)) return `FAILED: comment ${cid} was not found.`;
        const c = await addComment(page._id, { user, text: text.value, replyTo: cid || null, byAi: true });
        return c ? `Reply added (${c.id}).` : "FAILED: this page has too many comments.";
    }
    return 'FAILED: action must be "list", "reply" or "resolve".';
}
