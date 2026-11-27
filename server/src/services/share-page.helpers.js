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
export const SCENE_TITLE_MAX = 200;
export const SCENES_MAX = 50; // a video's scenes (each gets its own picture)
export const VIDEO_SOURCE_MAX_BYTES = 8 * 1024 * 1024; // the HTML a video was made from, kept with it

export const pageLink = (id) => `${PAGE_APP_URL}/p/${id}`;
export const byteSize = (s) => Buffer.byteLength(String(s ?? ""), "utf8");
// Size of a stored JSON value (undefined counts as nothing)
export const jsonSize = (v) => (v === undefined ? 0 : byteSize(JSON.stringify(v)));

const idOf = (v) => (v && typeof v === "object" && v._id ? String(v._id) : v == null ? "" : String(v));

// ── Kinds: a web page, or a video the AI made (make_video, 2026-11-27) ──
// A video is a page with kind "video": the same link, sharing, pins, reports and comments, with `video` in place of
// the HTML. A page saved before kinds has no kind and is a page.
export const kindOf = (page) => (page?.kind === "video" ? "video" : "page");

/** The video as the screens get it: everything but the HTML it was recorded from. */
export function videoForClient(video) {
    if (!video) return null;
    const num = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0);
    return {
        url: String(video.url || ""),
        poster: String(video.poster || ""),
        stills: [...(video.stills || [])].map(String),
        seconds: num(video.seconds),
        width: num(video.width),
        height: num(video.height),
        fps: num(video.fps),
        scenes: [...(video.scenes || [])].map((s) => ({ title: String(s.title || ""), start: num(s.start), end: num(s.end), thumb: String(s.thumb || "") })),
    };
}

const escapeHtml = (v) => String(v ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);

/**
 * A video's page for a screen that only knows pages (an app from before videos shows a page's HTML): the video
 * itself, playing in the page.
 */
export function videoPageHtml(page) {
    const v = page?.video || {};
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(page?.title)}</title>`
        + "<style>html,body{margin:0;height:100%;background:#000}body{display:flex;align-items:center;justify-content:center}video{max-width:100%;max-height:100%}</style></head>"
        + `<body><video src="${escapeHtml(v.url)}"${v.poster ? ` poster="${escapeHtml(v.poster)}"` : ""} controls playsinline preload="metadata"></video></body></html>`;
}

const round = (n, places) => Math.round(n * 10 ** places) / 10 ** places;
const isNum = (n) => typeof n === "number" && Number.isFinite(n);

/**
 * The place on a video a new comment is on: { time, timeEnd, area } (time in seconds, timeEnd the end of a stretch
 * or null, area a box on the frame { x, y, w, h }, each 0-1, or null). `body` is what the screen sent, `page` the
 * page with its kind and video.seconds. Answers { ok, value } (value null: no place, a comment on the whole) or
 * { ok: false, error }.
 */
export function checkCommentPlace(body = {}, page = {}) {
    const has = (k) => body?.[k] !== undefined && body?.[k] !== null;
    if (!has("time") && !has("timeEnd") && !has("area")) return { ok: true, value: null };
    if (kindOf(page) !== "video") return { ok: false, error: "Only a comment on a video can have a time or an area." };
    if (!has("time")) return { ok: false, error: "Send the time of the video the comment is on." };
    const seconds = Number(page.video?.seconds) || 0;
    const { time } = body;
    if (!isNum(time) || time < 0 || time > seconds) return { ok: false, error: `The time must be a number of seconds from 0 to ${seconds}.` };
    let timeEnd = null;
    if (has("timeEnd")) {
        if (!isNum(body.timeEnd) || body.timeEnd < time || body.timeEnd > seconds) {
            return { ok: false, error: `The end time must be a number of seconds from ${round(time, 3)} to ${seconds}.` };
        }
        if (body.timeEnd > time) timeEnd = round(body.timeEnd, 3);
    }
    let area = null;
    if (has("area")) {
        const a = body.area;
        const parts = ["x", "y", "w", "h"];
        if (typeof a !== "object" || Array.isArray(a) || !parts.every((k) => isNum(a[k]) && a[k] >= 0 && a[k] <= 1)) {
            return { ok: false, error: "The area must be x, y, w and h, each a number from 0 to 1." };
        }
        // (a little room for rounding on the screen)
        if (a.x + a.w > 1.001 || a.y + a.h > 1.001) return { ok: false, error: "The area must be inside the video." };
        area = Object.fromEntries(parts.map((k) => [k, round(a[k], 4)]));
        area.w = round(Math.min(area.w, 1 - area.x), 4);
        area.h = round(Math.min(area.h, 1 - area.y), 4);
    }
    return { ok: true, value: { time: round(time, 3), timeEnd, area } };
}

/**
 * The place on the video a comment is on, as it is sent ({} for a comment with no time). `seconds`: the video's
 * length now. A comment written on a longer version of the video is kept, and its time is sent inside the video as
 * it is now (the end, at most); a stretch that no longer fits becomes that moment.
 */
export function commentPlace(c, seconds) {
    if (!isNum(c?.time)) return {};
    const a = c.area;
    const end = isNum(seconds) && seconds >= 0 ? seconds : Infinity;
    const time = Math.min(c.time, end);
    const timeEnd = isNum(c.timeEnd) ? Math.min(c.timeEnd, end) : null;
    return {
        time,
        timeEnd: timeEnd != null && timeEnd > time ? timeEnd : null,
        area: a && isNum(a.x) ? { x: a.x, y: a.y, w: a.w, h: a.h } : null,
    };
}

/** A video's length now (seconds), for commentPlace; undefined for a page. */
export const videoSecondsOf = (page) => (kindOf(page) === "video" && isNum(Number(page.video?.seconds)) ? Number(page.video.seconds) : undefined);

/** 21 -> "0:21", 129.4 -> "2:09" */
export function clockTime(seconds) {
    const s = Math.max(0, Math.floor(Number(seconds) || 0));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * make_video's scenes, cleaned: [{ title, start, end }], in order, the first starting at 0, each ending where the
 * next starts and the last at the end of the video. `scenes` is what the AI sent ([{ title, start }]); with none,
 * the video is one scene called `title`.
 */
export function cleanScenes(scenes, seconds, title = "") {
    const length = Math.max(0, Number(seconds) || 0);
    const list = (Array.isArray(scenes) ? scenes : [])
        .filter((s) => s && typeof s === "object")
        .map((s, i) => ({
            title: String(s.title ?? "").replace(/\s+/g, " ").trim().slice(0, SCENE_TITLE_MAX) || `Scene ${i + 1}`,
            start: round(Math.max(0, Number(s.start)), 3),
        }))
        .filter((s) => Number.isFinite(s.start) && s.start < length)
        .sort((a, b) => a.start - b.start)
        .filter((s, i, all) => i === 0 || s.start > all[i - 1].start)
        .slice(0, SCENES_MAX);
    if (!list.length) list.push({ title: cleanTitle(title), start: 0 });
    list[0].start = 0;
    return list.map((s, i) => ({ ...s, end: i + 1 < list.length ? list[i + 1].start : round(length, 3) }));
}

/**
 * When each scene's picture is cut: a little after the scene starts (at its very start a scene is often still
 * coming in, or blank), at most 1 second and a quarter of the scene in.
 */
export const sceneThumbTime = (scene) => round(scene.start + Math.min(1, Math.max(0, scene.end - scene.start) / 4), 3);

/** The still picture nearest a moment: stills [{ at, url }]. */
export function nearestStill(stills, at) {
    let best = null;
    for (const s of stills || []) if (s?.url && (!best || Math.abs(s.at - at) < Math.abs(best.at - at))) best = s;
    return best?.url || "";
}

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
export function commentThreads(comments, photoOf = () => "", seconds) {
    const list = comments || [];
    const top = new Map();
    const parent = new Map(list.map((c) => [c.id, c.replyTo || null]));
    const threads = [];
    for (const c of list) {
        if (c.replyTo && parent.has(c.replyTo)) continue;
        const thread = {
            id: c.id, userId: idOf(c.userId), name: c.byAi ? "Classgrid AI" : c.name || "", photo: c.byAi ? "" : photoOf(c.userId), text: c.text,
            quote: c.quote || "", ...commentPlace(c, seconds), at: c.at, resolved: !!c.resolved, byAI: !!c.byAi, replies: [],
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
    const kind = kindOf(page);
    return {
        ...rest,
        kind,
        // (a video has no HTML of its own: a screen that only knows pages is sent a page that plays the video)
        html: kind === "video" ? videoPageHtml(page) : page.html,
        ...(kind === "video" ? { video: videoForClient(page.video) } : {}),
        versions: page.versions || 1,
        link: pageLink(page._id),
        // (a page has no text to edit by hand: "edit" is renaming it, and it comes with sharing)
        comments: commentThreads(page.comments, (userId) => byId[idOf(userId)]?.photo || "", videoSecondsOf(page)),
    };
}

/** A page's row in a list (no HTML; a video with its picture, length and MP4). */
export function pageRow(page, who, profiles = {}) {
    const ownerProfile = (profiles.byId || {})[idOf(page.owner)];
    const me = idOf(who);
    const kind = kindOf(page);
    return {
        id: String(page._id),
        title: page.title,
        kind,
        ...(kind === "video" ? { video: { poster: String(page.video?.poster || ""), seconds: Number(page.video?.seconds) || 0, url: String(page.video?.url || "") } } : {}),
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
