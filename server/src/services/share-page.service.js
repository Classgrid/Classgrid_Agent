// Share pages: database work used by the /api/pages routes and by the AI tools publish_page and page_comments, and
// the saving of a video the AI made with make_video as a page of kind "video" (saveVideoArtifact).
import crypto from "crypto";
import mongoose from "mongoose";
import SharePage from "../models/SharePage.js";
import User from "../models/User.js";
import {
    pageLink, isOwner, canView, cleanTitle, checkHtml, checkVisibility, checkCommentText, checkDataWrite, dataEntries, COMMENTS_MAX,
    cleanQuote, pageForClient, copyPageTitle, kindOf, commentPlace, clockTime, byteSize, VIDEO_SOURCE_MAX_BYTES, canShare,
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

// `seconds`: a video's length now (a comment written on a longer version is sent inside it, commentPlace)
export function commentView(c, seconds) {
    return { id: c.id, userId: c.userId ? String(c.userId) : null, name: c.name, email: c.email, text: c.text, quote: c.quote || "", ...commentPlace(c, seconds), at: c.at, resolved: !!c.resolved, replyTo: c.replyTo || null, byAi: !!c.byAi };
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

/**
 * A copy of the page for this person: theirs, private, with the same HTML (not its comments or its saved data). A
 * video's copy is a video with the same video. The HTML the video was made from goes with the copy only when the
 * person copying is its owner or an editor (the people read_page gives it to): anyone else's copy has none.
 */
export function duplicatePage(page, user) {
    const base = { owner: user._id, title: copyPageTitle(page.title), visibility: "private" };
    if (kindOf(page) !== "video") return SharePage.create({ ...base, html: page.html });
    const video = typeof page.video?.toObject === "function" ? page.video.toObject() : { ...page.video };
    if (!canShare(page, user)) video.sourceHtml = "";
    return SharePage.create({ ...base, kind: "video", video });
}

/** The pages this person owns and the pages shared with them by name (not the ones only a link opens). */
export async function pagesOf(user) {
    const email = normEmail(user.email);
    const fields = "title kind video.poster video.seconds video.url visibility linkRole owner members pinnedBy versions comments.resolved comments.replyTo createdAt updatedAt";
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
    return { id: String(p._id), title: p.title, kind: kindOf(p), visibility: p.visibility, versions: p.versions, openComments: open, link: pageLink(p._id), createdAt: p.createdAt, updatedAt: p.updatedAt };
}

// `place`: where on a video the comment is ({ time, timeEnd, area }, from checkCommentPlace); a reply has none.
// `version`: on a video, the version of the video the comment was written on
export async function addComment(pageId, { user, text, replyTo = null, byAi = false, quote = "", place = null, version = null }) {
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
    if (place && !replyTo) {
        comment.time = place.time;
        if (place.timeEnd != null) comment.timeEnd = place.timeEnd;
        if (place.area) comment.area = place.area;
    }
    if (version != null) comment.version = version;
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
            description: "Publishes an artifact: a small web page in HTML (report, dashboard, slides, form, mini app, layout or mock-up) the user opens at chat.classgrid.in/p/<id>, and returns its link. Private by default. To change a page you made before, send its page_id: that saves a new version at the same link.",
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
            name: "read_page",
            description: "Reads a published page (chat.classgrid.in/p/<id>): its title, version and HTML. Use it before changing a page whose HTML is not in this chat (for example the page open beside the chat), then send the whole changed page to publish_page with its page_id. A long page comes in parts: call again with start set to the number given. On a video artifact it gives the HTML the video was made from.",
            parameters: {
                type: "object",
                properties: {
                    page_id: { type: "string", description: "The page id (the part after /p/ in the link), or the link itself." },
                    start: { type: "number", description: "Character to start reading from, for the next part of a long page (default 0)." },
                },
                required: ["page_id"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "page_comments",
            description: "Reads and answers comments on a page you published with publish_page. list = all comments, reply = answer a comment (or add a note when comment_id is empty), resolve = mark a comment done. Works on video artifacts too (a comment on a video has its time).",
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

// What "artifact" and "doc" mean, sent in every chat whatever tools are loaded (owner, 2026-11-21: asked for a Play
// Store layout as a page, DeepSeek made pictures with generate_image; the /artifact and /docs commands use these names)
export const ARTIFACT_DOC_NAMES = `

ARTIFACTS AND DOCS (the words the user uses):
- An ARTIFACT is a web page built in HTML, published with publish_page (chat.classgrid.in/p/<id>; in Studio it opens beside the chat). "Artifact", "page", "/p page", "HTML page", "web page", "layout", "mock-up", "dashboard" and "mini app" all mean this. Write the HTML yourself; pictures inside it may come from generate_image, but the artifact itself is never a picture.
- A video made with make_video is saved as a video artifact (its own chat.classgrid.in/p/<id> link); to change it, call make_video again with its artifactId.
- A DOC is writing the user keeps editing, shares and comments on (headings, lists, tables, like Markdown or Word), made with create_doc (chat.classgrid.in/docs/<id>). "Doc", "document", "notes", "report to edit" and "Markdown" mean this.
- Use generate_image only when the user asks for a picture itself. When the tool you need is not loaded, load its group with load_tools (share_pages for an artifact, live_docs for a doc).`;

export const SHARE_PAGE_PROMPT = `

SHARE PAGES (publish_page, read_page, page_comments):
1. WHEN: use publish_page for something the user will look at again or share and that is bigger than a chat answer: a report, dashboard, slides, a form, a tracker or a mini app. Short answers stay in the chat. To change a page you made, call publish_page with its page_id (same link, new version). When the page's HTML is not in this chat (the page open beside the chat, or one made in another chat), read it first with read_page, change only what was asked, and publish the whole page again with its page_id. Put the link in your reply.
2. HOW: one self-contained HTML file: inline CSS and JS; outside scripts only from cdnjs.cloudflare.com, cdn.jsdelivr.net or unpkg.com with an exact version (e.g. chart.js@4.4.1). It must look good in light and dark mode (prefers-color-scheme), fit a phone screen, and use no login, cookies or localStorage for important data.
3. SAVED DATA: the page can keep shared data (everyone who opens it sees the same): await window.classgrid.data.get(key), await window.classgrid.data.set(key, value) (value = any JSON, null deletes), await window.classgrid.data.list() (object of all keys). Keys: letters, numbers, _ - :. Max 200 keys and 500 KB in all. Use it for forms, polls, checklists and trackers. Use page_comments to read and answer comments people leave on the page.`;

// The page id in what the AI sent: the id, or the link itself
export const idFrom = (v) => String(v ?? "").trim().replace(/^.*\/p\//, "").replace(/[/?#].*$/, "");

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
        const page = await findPage(pageId, "owner title kind visibility versions");
        if (!page) return `FAILED to publish the page: page ${pageId} was not found.`;
        if (!isOwner(page, user._id)) return "FAILED to publish the page: only the person who owns this page can change it.";
        if (kindOf(page) === "video") return `FAILED to publish the page: ${pageId} is a video, not a web page. To change the video, call make_video with artifactId ${pageId} (read_page gives the HTML it was made from).`;
        const set = { html: args.html };
        if (String(args.title ?? "").trim()) set.title = cleanTitle(args.title);
        if (visibility) set.visibility = visibility;
        const saved = await SharePage.findByIdAndUpdate(page._id, { $set: set, $inc: { versions: 1 } }, { new: true }).select("title visibility versions");
        return `Published "${saved.title}" (version ${saved.versions}, ${saved.visibility === "link" ? "anyone signed in with the link can open it" : "private"}). page_id: ${saved._id}\nLink: ${pageLink(saved._id)}\nPut this link in your reply.`;
    }
    const page = await SharePage.create({ owner: user._id, title: cleanTitle(args.title), html: args.html, visibility: visibility || "private" });
    return `Published "${page.title}" (version 1, ${page.visibility === "link" ? "anyone signed in with the link can open it" : "private"}). page_id: ${page._id}\nLink: ${pageLink(page._id)}\nPut this link in your reply.`;
}

// How much of a page's HTML one read_page call gives (the chat keeps up to 100,000 characters of its result,
// services/llm-stream.js and llm-stream-anthropic.js); a longer page is read in parts with `start`
export const READ_PAGE_PART = 90000;

/**
 * read_page: the page's HTML, for the AI to change a page whose HTML is not in the chat (owner, 2026-11-21: the AI
 * could not read the page open beside the chat, so it could change it only from a comment). Anyone who may open the
 * page may have their AI read it; only the owner's AI can publish a new version (runPublishPage). A video's HTML it
 * was made from is given only to its owner and editors (readVideoPage).
 */
export async function runReadPage(user, args = {}) {
    if (!user?._id) return "FAILED: no signed-in user.";
    const pageId = idFrom(args.page_id);
    const page = await findPage(pageId, "owner title kind visibility linkRole members versions html video updatedAt");
    if (!page) return `FAILED: page ${pageId || "(empty)"} was not found.`;
    if (!canView(page, user)) return "FAILED: this page is not shared with the user.";
    if (kindOf(page) === "video") return readVideoPage(page, user, args);
    const html = String(page.html || "");
    const start = Math.max(0, Math.min(html.length, Math.floor(Number(args.start) || 0)));
    const part = html.slice(start, start + READ_PAGE_PART);
    const end = start + part.length;
    const owner = isOwner(page, user._id);
    const head = `Page "${page.title}" (version ${page.versions || 1}, page_id: ${page._id}${owner ? "" : ", shared with the user: only its owner can publish a new version"}). Link: ${pageLink(page._id)}`;
    const range = html.length > READ_PAGE_PART || start > 0 ? `\nHTML characters ${start}-${end} of ${html.length}${end < html.length ? ` (more: call read_page again with start ${end})` : " (the end)"}:` : `\nHTML (${html.length} characters):`;
    return `${head}${range}\n${part}`;
}

// read_page on a video: what the video is, and the HTML it was recorded from (in parts, like a page's HTML). The
// HTML is the owner's work: only the owner and the editors are given it; a person who may only open the video, or
// comment on it, is given what the video is
function readVideoPage(page, user, args) {
    const v = page.video || {};
    const mayRead = canShare(page, user);
    const html = mayRead ? String(v.sourceHtml || "") : "";
    const start = Math.max(0, Math.min(html.length, Math.floor(Number(args.start) || 0)));
    const part = html.slice(start, start + READ_PAGE_PART);
    const end = start + part.length;
    const owner = isOwner(page, user._id);
    const scenes = (v.scenes || []).map((s) => `${clockTime(s.start)} ${s.title}`).join(" | ");
    const head = `Video "${page.title}" (version ${page.versions || 1}, artifactId: ${page._id}, ${v.width}x${v.height}, ${v.seconds}s, ${v.fps} fps${owner ? "" : ", shared with the user: only its owner can make a new version"}). Link: ${pageLink(page._id)}\nVideo link: ${v.url}${scenes ? `\nScenes: ${scenes}` : ""}`;
    const how = owner ? "\nTo change it, change this HTML and call make_video with the whole page and artifactId (same link, new version)." : "";
    if (!mayRead) return `${head}\nThe HTML it was made from is given only to its owner and editors. Only its owner's AI can change this video.`;
    if (!html) return `${head}\nThe HTML it was made from was not kept.`;
    const range = html.length > READ_PAGE_PART || start > 0 ? `\nHTML it was made from, characters ${start}-${end} of ${html.length}${end < html.length ? ` (more: call read_page again with start ${end})` : " (the end)"}:` : `\nHTML it was made from (${html.length} characters):`;
    return `${head}${how}${range}\n${part}`;
}

// Where on a video a comment is, for the AI: " at 0:21", " at 0:21-0:30", and the box on the frame
function placeWords(c) {
    if (typeof c.time !== "number") return "";
    const a = c.area;
    const box = a ? `, area x ${a.x} y ${a.y} w ${a.w} h ${a.h} of the frame` : "";
    return ` at ${clockTime(c.time)} (${c.time}s${c.timeEnd != null ? `-${c.timeEnd}s` : ""})${box}`;
}

// Which version of a video a comment was written on, for the AI, when it is not the video as it is now: the times
// of a comment on an older version may not match the scenes now (a comment from before versions were noted has
// none: when the video has had more than one version, that version is not known)
function versionWords(c, page) {
    if (kindOf(page) !== "video") return "";
    const now = page.versions || 1;
    const seconds = Number(page.video?.seconds) || 0;
    const past = typeof c.time === "number" && c.time > seconds ? `, past the end of the video now (it is ${seconds}s)` : "";
    if (typeof c.version === "number") return c.version < now ? `, written on version ${c.version} (the video is now version ${now})${past}` : past;
    return now > 1 ? `, written on a version that is not known (the video is now version ${now})${past}` : past;
}

export async function runPageComments(user, args = {}) {
    if (!user?._id) return "FAILED: no signed-in user.";
    const pageId = idFrom(args.page_id);
    const page = await findPage(pageId, "owner title kind versions video.seconds comments");
    if (!page) return `FAILED: page ${pageId || "(empty)"} was not found.`;
    if (!isOwner(page, user._id)) return "FAILED: you can only read comments on the user's own pages.";
    const action = String(args.action || "list").toLowerCase();
    if (action === "list") {
        // (the times as they were written: versionWords says when one is past the end of the video now)
        const list = (page.comments || []).map((c) => ({ ...commentView(c), version: c.version }));
        if (!list.length) return `"${page.title}" has no comments yet.`;
        return `Comments on "${page.title}" (${list.length}):\n` + list.map((c) =>
            `- [${c.id}]${c.replyTo ? ` (reply to ${c.replyTo})` : ""} ${c.byAi ? "Classgrid AI" : `${c.name || "Someone"} <${c.email}>`}, ${new Date(c.at).toISOString()}${c.resolved ? ", resolved" : ""}${placeWords(c)}${versionWords(c, page)}${c.quote ? `, on "${String(c.quote).slice(0, 300)}"` : ""}: ${c.text}`
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
        const c = await addComment(page._id, { user, text: text.value, replyTo: cid || null, byAi: true, version: kindOf(page) === "video" ? page.versions || 1 : null });
        return c ? `Reply added (${c.id}).` : "FAILED: this page has too many comments.";
    }
    return 'FAILED: action must be "list", "reply" or "resolve".';
}

// ---------------------------------------------------------------------------------------------------------
// make_video: the video is an artifact (owner, 2026-11-27)

/**
 * Before a video is made to update an artifact: whether this person may (their own video). Answers the reason it
 * can't, or "" when it can. `artifactId` is the id or the /p/ link.
 */
export async function videoArtifactProblem(user, artifactId) {
    const id = idFrom(artifactId);
    if (!id) return "";
    const page = await findPage(id, "owner kind");
    if (!page) return `artifact ${id} was not found.`;
    if (!isOwner(page, user?._id)) return "only the person who owns this video can change it.";
    if (kindOf(page) !== "video") return `${id} is a web page, not a video. Leave artifactId out to make a new video.`;
    return "";
}

/**
 * Saves a made video as an artifact: a new private page of kind "video" owned by `user`, or (artifactId) a new
 * version of the person's own video at the same link. `video`: { url, poster, stills, seconds, width, height, fps,
 * scenes: [{ title, start, end, thumb }], sourceHtml }. Answers { id, title, versions, link } or throws.
 */
export async function saveVideoArtifact(user, { artifactId = "", title = "", video }) {
    if (!user?._id) throw new Error("no signed-in user.");
    // (the HTML it was made from is kept for the AI to change the video later, when it fits well inside the page's
    // database record; a bigger one is left out and read_page says it was not kept)
    if (byteSize(video?.sourceHtml) > VIDEO_SOURCE_MAX_BYTES) video = { ...video, sourceHtml: "" };
    const id = idFrom(artifactId);
    if (id) {
        const problem = await videoArtifactProblem(user, id);
        if (problem) throw new Error(problem);
        const set = { kind: "video", video };
        if (String(title ?? "").trim()) set.title = cleanTitle(title);
        // (the owner again in the filter: the video changes only while it is still theirs)
        const saved = await SharePage.findOneAndUpdate({ _id: id, owner: user._id }, { $set: set, $inc: { versions: 1 } }, { new: true, runValidators: true }).select("title versions");
        if (!saved) throw new Error("only the person who owns this video can change it.");
        return { id: String(saved._id), title: saved.title, versions: saved.versions, link: pageLink(saved._id) };
    }
    const page = await SharePage.create({ owner: user._id, title: cleanTitle(title), kind: "video", video, visibility: "private" });
    return { id: String(page._id), title: page.title, versions: page.versions, link: pageLink(page._id) };
}
