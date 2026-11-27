// A video the AI makes (make_video) is an artifact (owner, 2026-11-27): a published page of kind "video" at
// chat.classgrid.in/p/<id>, with its scenes, and comments pinned to a time and an area of the video. Checked here on
// real SharePage documents with no database (the database calls are stand-ins, so nothing is saved):
//   1. the comment's place on a video (time, a stretch of time, a box on the frame) and what is refused
//   2. what the screens are sent for a video (never the HTML it was made from) and what a page is sent (as before)
//   3. the scenes make_video is given, cleaned, and when each one's picture is cut
//   4. saving the made video as an artifact: a new one, a new version of the person's own, and what is refused
//   5. the AI's page tools on a video: publish_page refuses it, read_page gives the HTML it was made from,
//      page_comments shows each comment's time
// Run: node --experimental-test-module-mocks --test tests/video-artifact.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";

const OWNER = { _id: "aaaaaaaaaaaaaaaaaaaaaaaa", name: "Nikhil", email: "nikhil@x.in" };
const ASHA = { _id: "bbbbbbbbbbbbbbbbbbbbbbbb", name: "Asha", email: "asha@x.in" };
const query = (rows) => {
    const q = { select: () => q, lean: () => q, then: (ok, bad) => Promise.resolve(rows).then(ok, bad) };
    return q;
};
mock.module("../src/models/User.js", {
    defaultExport: { find: () => query([]), findOne: () => query(null), findById: () => query(null) },
});
mock.module("../src/config/redis.js", { defaultExport: { set: async () => "OK", hdel: async () => 1, multi: () => { throw new Error("no redis here"); } } });
// (the routes, with the signed-in person given by the test: req.user is `signedIn`)
let signedIn = null;
mock.module("../src/middleware/auth.middleware.js", { namedExports: { isAuthenticated: (req, res, next) => { req.user = signedIn; next(); } } });

const { default: SharePage } = await import("../src/models/SharePage.js");
const helpers = await import("../src/services/share-page.helpers.js");
const service = await import("../src/services/share-page.service.js");
const { default: router } = await import("../src/routes/share-page.routes.js");

const VIDEO = {
    url: "https://cdn.classgrid.in/ai-generated/1-studio.mp4",
    poster: "https://cdn.classgrid.in/ai-generated/2-frame-6.4s.jpg",
    stills: ["https://cdn.classgrid.in/ai-generated/2-frame-6.4s.jpg", "https://cdn.classgrid.in/ai-generated/3-frame-16s.jpg", "https://cdn.classgrid.in/ai-generated/4-frame-27.2s.jpg"],
    seconds: 32, width: 1920, height: 1080, fps: 30,
    scenes: [
        { title: "Intro", start: 0, end: 10, thumb: "https://cdn.classgrid.in/ai-generated/5-scene-1s.jpg" },
        { title: "AI Hub", start: 10, end: 32, thumb: "https://cdn.classgrid.in/ai-generated/6-scene-11s.jpg" },
    ],
    sourceHtml: "<!doctype html><html><body>studio</body></html>",
};
const videoPage = (more = {}) => new SharePage({ owner: OWNER._id, title: "Classgrid Studio Mode", kind: "video", video: VIDEO, ...more });

// ── 1. a comment's place on a video ──────────────────────────────────────────────────────────────────────────

test("a comment on a video: a time, a stretch of time and a box on the frame are taken, rounded", () => {
    const v = videoPage();
    assert.deepEqual(helpers.checkCommentPlace({ time: 21.123456 }, v), { ok: true, value: { time: 21.123, timeEnd: null, area: null } });
    assert.deepEqual(helpers.checkCommentPlace({ time: 0, timeEnd: 32, area: { x: 0.1, y: 0.2, w: 0.3, h: 0.4 } }, v),
        { ok: true, value: { time: 0, timeEnd: 32, area: { x: 0.1, y: 0.2, w: 0.3, h: 0.4 } } });
    // (a tapped point is a box with no size; a stretch that ends where it starts is just the moment)
    assert.deepEqual(helpers.checkCommentPlace({ time: 5, timeEnd: 5, area: { x: 0.5, y: 0.5, w: 0, h: 0 } }, v).value, { time: 5, timeEnd: null, area: { x: 0.5, y: 0.5, w: 0, h: 0 } });
    // (a box a hair past the edge from the screen's rounding is kept inside the frame)
    assert.deepEqual(helpers.checkCommentPlace({ time: 1, area: { x: 0.6, y: 0, w: 0.4004, h: 1 } }, v).value.area, { x: 0.6, y: 0, w: 0.4, h: 1 });
    // no place: a comment on the whole video, or on a page
    assert.deepEqual(helpers.checkCommentPlace({ text: "nice" }, v), { ok: true, value: null });
    assert.deepEqual(helpers.checkCommentPlace({ time: null, area: null }, new SharePage({ owner: OWNER._id, html: "<p>x</p>" })), { ok: true, value: null });
});

test("a comment's place that is not right is refused, in words", () => {
    const v = videoPage();
    const error = (body, page = v) => helpers.checkCommentPlace(body, page).error;
    assert.equal(error({ time: 40 }), "The time must be a number of seconds from 0 to 32.");
    assert.equal(error({ time: -1 }), "The time must be a number of seconds from 0 to 32.");
    assert.equal(error({ time: "21" }), "The time must be a number of seconds from 0 to 32.");
    assert.equal(error({ time: Number.NaN }), "The time must be a number of seconds from 0 to 32.");
    assert.equal(error({ time: 10, timeEnd: 4 }), "The end time must be a number of seconds from 10 to 32.");
    assert.equal(error({ time: 10, timeEnd: 33 }), "The end time must be a number of seconds from 10 to 32.");
    assert.equal(error({ area: { x: 0, y: 0, w: 1, h: 1 } }), "Send the time of the video the comment is on.");
    assert.equal(error({ time: 1, area: { x: 0, y: 0, w: 1.2, h: 1 } }), "The area must be x, y, w and h, each a number from 0 to 1.");
    assert.equal(error({ time: 1, area: { x: 0, y: 0, w: 1 } }), "The area must be x, y, w and h, each a number from 0 to 1.");
    assert.equal(error({ time: 1, area: [0, 0, 1, 1] }), "The area must be x, y, w and h, each a number from 0 to 1.");
    assert.equal(error({ time: 1, area: { x: 0.8, y: 0, w: 0.5, h: 1 } }), "The area must be inside the video.");
    assert.equal(error({ time: 1 }, new SharePage({ owner: OWNER._id, html: "<p>x</p>" })), "Only a comment on a video can have a time or an area.");
});

test("a comment with its place is kept on the video and sent back with it; a page's comments are sent as before", async () => {
    const saved = [];
    const realUpdate = SharePage.updateOne;
    SharePage.updateOne = async (filter, update) => { saved.push(update.$push.comments); return { modifiedCount: 1 }; };
    try {
        const place = helpers.checkCommentPlace({ time: 21, timeEnd: 25.5, area: { x: 0, y: 0.1, w: 0.25, h: 0.5 } }, videoPage()).value;
        const c = await service.addComment("p1", { user: ASHA, text: "The left sidebar", place });
        assert.deepEqual([c.time, c.timeEnd, c.area], [21, 25.5, { x: 0, y: 0.1, w: 0.25, h: 0.5 }]);
        assert.deepEqual(service.commentView(c), {
            id: c.id, userId: ASHA._id, name: "Asha", email: "asha@x.in", text: "The left sidebar", quote: "",
            time: 21, timeEnd: 25.5, area: { x: 0, y: 0.1, w: 0.25, h: 0.5 }, at: c.at, resolved: false, replyTo: null, byAi: false,
        });
        // (a reply is on its comment, not on a moment)
        const reply = await service.addComment("p1", { user: OWNER, text: "Fixed", replyTo: c.id, place });
        assert.equal("time" in reply, false);
        // (on a page nothing new is sent with a comment)
        const plain = await service.addComment("p1", { user: ASHA, text: "hi" });
        assert.deepEqual(Object.keys(service.commentView(plain)), ["id", "userId", "name", "email", "text", "quote", "at", "resolved", "replyTo", "byAi"]);
    } finally {
        SharePage.updateOne = realUpdate;
    }
    // the stored comment, as Mongoose keeps it on the video
    const v = videoPage({ comments: [{ id: "c1", userId: ASHA._id, name: "Asha", text: "The left sidebar", time: 21, area: { x: 0, y: 0.1, w: 0.25, h: 0.5 } }] });
    assert.equal(v.validateSync(), undefined);
    const [thread] = helpers.pageForClient(v, OWNER).comments;
    assert.deepEqual([thread.time, thread.timeEnd, thread.area], [21, null, { x: 0, y: 0.1, w: 0.25, h: 0.5 }]);
});

// ── 2. what the screens are sent ─────────────────────────────────────────────────────────────────────────────

test("a video needs no HTML, a page still does; a page from before kinds is a page", () => {
    assert.equal(videoPage().validateSync(), undefined);
    assert.match(String(new SharePage({ owner: OWNER._id, title: "x" }).validateSync()?.errors?.html), /required/);
    assert.match(String(new SharePage({ owner: OWNER._id, kind: "video" }).validateSync()?.errors?.["video.url"] || new SharePage({ owner: OWNER._id, kind: "video", video: {} }).validateSync()?.errors?.["video.url"]), /required/);
    assert.equal(helpers.kindOf({ title: "old page" }), "page");
    assert.equal(new SharePage({ owner: OWNER._id, html: "<p>x</p>" }).kind, "page");
});

test("a video is sent with its kind and video, never the HTML it was made from; a page is sent as before", () => {
    const v = videoPage();
    const full = helpers.pageForClient(v, OWNER);
    assert.equal(full.kind, "video");
    assert.deepEqual(full.video, {
        url: VIDEO.url, poster: VIDEO.poster, stills: VIDEO.stills, seconds: 32, width: 1920, height: 1080, fps: 30,
        scenes: VIDEO.scenes,
    });
    assert.equal(JSON.stringify(full).includes("studio</body>"), false);
    // (an app from before videos shows a page's HTML: it is sent a page that plays the video)
    assert.match(full.html, /<video src="https:\/\/cdn\.classgrid\.in\/ai-generated\/1-studio\.mp4" poster="https:\/\/cdn\.classgrid\.in\/ai-generated\/2-frame-6\.4s\.jpg" controls/);
    assert.match(helpers.videoPageHtml({ title: '<b>"x"</b>', video: { url: 'https://cdn.classgrid.in/a.mp4"><script>' } }), /<title>&lt;b&gt;&quot;x&quot;&lt;\/b&gt;<\/title>.*src="https:\/\/cdn\.classgrid\.in\/a\.mp4&quot;&gt;&lt;script&gt;"/);

    const row = helpers.pageRow(v, OWNER);
    assert.equal(row.kind, "video");
    assert.deepEqual(row.video, { poster: VIDEO.poster, seconds: 32, url: VIDEO.url });
    assert.equal(service.summaryView(v).kind, "video");

    const page = new SharePage({ owner: OWNER._id, title: "Tip calculator", html: "<h1>Tip</h1>" });
    const pageFull = helpers.pageForClient(page, OWNER);
    assert.equal(pageFull.kind, "page");
    assert.equal(pageFull.html, "<h1>Tip</h1>");
    assert.equal("video" in pageFull, false);
    assert.equal("video" in helpers.pageRow(page, OWNER), false);
    assert.equal(helpers.pageRow({ _id: "p1", title: "old", owner: OWNER._id }, OWNER).kind, "page");
});

test("a copy of a video is the person's own video, with the same video and the HTML it was made from", async () => {
    const realCreate = SharePage.create;
    let made;
    SharePage.create = async (doc) => { made = doc; return doc; };
    try {
        await service.duplicatePage(videoPage({ visibility: "link" }), ASHA);
        assert.deepEqual([made.owner, made.title, made.visibility, made.kind, made.html], [ASHA._id, "Copy of Classgrid Studio Mode", "private", "video", undefined]);
        assert.equal(made.video.url, VIDEO.url);
        assert.equal(made.video.sourceHtml, VIDEO.sourceHtml);
        assert.equal(made.video.scenes.length, 2);
        await service.duplicatePage(new SharePage({ owner: OWNER._id, title: "Tip", html: "<h1>Tip</h1>" }), ASHA);
        assert.deepEqual(made, { owner: ASHA._id, title: "Copy of Tip", visibility: "private", html: "<h1>Tip</h1>" });
    } finally {
        SharePage.create = realCreate;
    }
});

// ── 3. scenes ────────────────────────────────────────────────────────────────────────────────────────────────

test("the scenes make_video is given are put in order, the first from 0, each to the next, the last to the end", () => {
    assert.deepEqual(helpers.cleanScenes([{ title: " AI   Hub ", start: 10 }, { title: "Intro", start: 0.5 }, { title: "Studio", start: 21.8 }, { title: "late", start: 40 }, { title: "same", start: 10 }, null, { start: "x" }], 32), [
        { title: "Intro", start: 0, end: 10 },
        { title: "AI Hub", start: 10, end: 21.8 },
        { title: "Studio", start: 21.8, end: 32 },
    ]);
    assert.deepEqual(helpers.cleanScenes([{ start: 3 }], 10), [{ title: "Scene 1", start: 0, end: 10 }]);
    // (none given: the video is one scene with its title)
    assert.deepEqual(helpers.cleanScenes(undefined, 45, "Launch"), [{ title: "Launch", start: 0, end: 45 }]);
    assert.equal(helpers.cleanScenes(Array.from({ length: 80 }, (_, i) => ({ title: `S${i}`, start: i })), 120).length, helpers.SCENES_MAX);
});

test("each scene's picture is cut a little after it starts; a scene with none gets the nearest still", () => {
    assert.equal(helpers.sceneThumbTime({ start: 0, end: 10 }), 1);
    assert.equal(helpers.sceneThumbTime({ start: 10, end: 12 }), 10.5);
    const stills = [{ at: 6.4, url: "a" }, { at: 16, url: "b" }, { at: 27.2, url: "c" }];
    assert.equal(helpers.nearestStill(stills, 1), "a");
    assert.equal(helpers.nearestStill(stills, 20), "b");
    assert.equal(helpers.nearestStill(stills, 31), "c");
    assert.equal(helpers.nearestStill([], 3), "");
    assert.deepEqual([helpers.clockTime(21), helpers.clockTime(129.4), helpers.clockTime(0)], ["0:21", "2:09", "0:00"]);
});

// ── 4. saving the video as an artifact ───────────────────────────────────────────────────────────────────────

// The database, stood in for: findById (findPage) and findOneAndUpdate answer from `stored`, create keeps what it was given
function standIn(stored) {
    const calls = [];
    const real = { findById: SharePage.findById, findOneAndUpdate: SharePage.findOneAndUpdate, create: SharePage.create };
    const q = (doc) => { const p = Promise.resolve(doc); p.select = () => p; return p; };
    SharePage.findById = (id) => q(stored[String(id)] || null);
    SharePage.findOneAndUpdate = (filter, update, options) => {
        calls.push({ filter, update, options });
        const doc = stored[String(filter._id)];
        return q(doc && String(doc.owner) === String(filter.owner) ? { _id: doc._id, title: update.$set.title || doc.title, versions: (doc.versions || 1) + 1 } : null);
    };
    SharePage.create = async (doc) => { const d = new SharePage(doc); calls.push({ create: doc, valid: d.validateSync() }); return d; };
    return { calls, restore: () => Object.assign(SharePage, real) };
}

test("a made video is saved as a new private video artifact of the person, at its /p/ link", async () => {
    const db = standIn({});
    try {
        const a = await service.saveVideoArtifact(OWNER, { title: "Classgrid Studio Mode", video: VIDEO });
        assert.equal(db.calls[0].valid, undefined);
        assert.deepEqual([db.calls[0].create.owner, db.calls[0].create.kind, db.calls[0].create.visibility, db.calls[0].create.video], [OWNER._id, "video", "private", VIDEO]);
        assert.deepEqual([a.title, a.versions, a.link], ["Classgrid Studio Mode", 1, `https://chat.classgrid.in/p/${a.id}`]);
        // (an HTML too big to keep with it is left out; the video is still saved)
        await service.saveVideoArtifact(OWNER, { title: "Big", video: { ...VIDEO, sourceHtml: "x".repeat(helpers.VIDEO_SOURCE_MAX_BYTES + 1) } });
        assert.equal(db.calls[1].create.video.sourceHtml, "");
        await assert.rejects(service.saveVideoArtifact(null, { video: VIDEO }), /no signed-in user/);
    } finally {
        db.restore();
    }
});

test("artifactId: a new version of the person's own video at the same link; someone else's video or a page is refused", async () => {
    const mine = videoPage({ versions: 2 });
    const hers = videoPage({ owner: ASHA._id });
    const page = new SharePage({ owner: OWNER._id, title: "Tip", html: "<h1>Tip</h1>" });
    const db = standIn({ [mine._id]: mine, [hers._id]: hers, [page._id]: page });
    try {
        const a = await service.saveVideoArtifact(OWNER, { artifactId: `https://chat.classgrid.in/p/${mine._id}`, title: "", video: VIDEO });
        assert.deepEqual([a.id, a.versions, a.title, a.link], [String(mine._id), 3, "Classgrid Studio Mode", `https://chat.classgrid.in/p/${mine._id}`]);
        assert.deepEqual(db.calls[0].filter, { _id: String(mine._id), owner: OWNER._id });
        assert.deepEqual(db.calls[0].update, { $set: { kind: "video", video: VIDEO }, $inc: { versions: 1 } });
        await service.saveVideoArtifact(OWNER, { artifactId: String(mine._id), title: "New name", video: VIDEO });
        assert.equal(db.calls[1].update.$set.title, "New name");

        // (make_video asks this before it records, so nothing is recorded for a video it can't save)
        assert.equal(await service.videoArtifactProblem(OWNER, String(mine._id)), "");
        assert.equal(await service.videoArtifactProblem(OWNER, String(hers._id)), "only the person who owns this video can change it.");
        assert.equal(await service.videoArtifactProblem(OWNER, String(page._id)), `${page._id} is a web page, not a video. Leave artifactId out to make a new video.`);
        assert.equal(await service.videoArtifactProblem(OWNER, "nope"), "artifact nope was not found.");
        await assert.rejects(service.saveVideoArtifact(OWNER, { artifactId: String(hers._id), video: VIDEO }), /only the person who owns this video/);
        assert.equal(db.calls.length, 2, "nothing was written for the refused ones");
    } finally {
        db.restore();
    }
});

// ── 5. the AI's page tools on a video ────────────────────────────────────────────────────────────────────────

test("publish_page refuses a video, read_page gives the HTML it was made from, page_comments shows each comment's time", async () => {
    const v = videoPage({ comments: [{ id: "c1", userId: ASHA._id, name: "Asha", email: ASHA.email, text: "The left sidebar", time: 21, timeEnd: 25, area: { x: 0, y: 0.1, w: 0.25, h: 0.5 } }] });
    const db = standIn({ [v._id]: v });
    try {
        assert.equal(await service.runPublishPage(OWNER, { title: "x", html: "<p>x</p>", page_id: String(v._id) }),
            `FAILED to publish the page: ${v._id} is a video, not a web page. To change the video, call make_video with artifactId ${v._id} (read_page gives the HTML it was made from).`);
        const read = await service.runReadPage(OWNER, { page_id: String(v._id) });
        assert.match(read, /^Video "Classgrid Studio Mode" \(version 1, artifactId: [0-9a-f]{24}, 1920x1080, 32s, 30 fps\)\. Link: https:\/\/chat\.classgrid\.in\/p\//);
        assert.match(read, /\nScenes: 0:00 Intro \| 0:10 AI Hub\n/);
        assert.match(read, /call make_video with the whole page and artifactId/);
        assert.ok(read.endsWith(`HTML it was made from (${VIDEO.sourceHtml.length} characters):\n${VIDEO.sourceHtml}`));
        const comments = await service.runPageComments(OWNER, { page_id: String(v._id), action: "list" });
        assert.match(comments, /Asha <asha@x\.in>, .* at 0:21 \(21s-25s\), area x 0 y 0\.1 w 0\.25 h 0\.5 of the frame: The left sidebar$/);
    } finally {
        db.restore();
    }
});

// ── 6. the routes ────────────────────────────────────────────────────────────────────────────────────────────

// One request through the /api/pages router, as Express would send it; answers { status, body }
function call(method, url, { user = OWNER, body = {} } = {}) {
    signedIn = user;
    return new Promise((resolve, reject) => {
        const [path, search = ""] = url.split("?");
        const req = { method, url, originalUrl: url, path, headers: {}, body, query: Object.fromEntries(new URLSearchParams(search)), params: {} };
        const res = {
            statusCode: 200, headersSent: false,
            status(code) { this.statusCode = code; return this; },
            json(data) { this.headersSent = true; resolve({ status: this.statusCode, body: data }); return this; },
            setHeader() {}, getHeader() {},
        };
        router.handle(req, res, (err) => (err ? reject(err) : resolve({ status: 404, body: null })));
    });
}

test("GET /:id?card=1: only what the chat card needs, with the same access check, and no view, invite or reading", async () => {
    const v = videoPage({ members: [{ id: "m1", userId: null, email: ASHA.email, role: "viewer" }] });
    const page = new SharePage({ owner: OWNER._id, title: "Tip calculator", html: "<h1>Tip</h1>" });
    const db = standIn({ [v._id]: v, [page._id]: page });
    const writes = [];
    const realUpdate = SharePage.updateOne;
    SharePage.updateOne = async (...a) => { writes.push(a); return { modifiedCount: 1, matchedCount: 1 }; };
    const realSave = SharePage.prototype.save;
    SharePage.prototype.save = async function () { writes.push(["save"]); return this; };
    try {
        assert.deepEqual(await call("GET", `/${v._id}?card=1`), { status: 200, body: { page: { _id: String(v._id), kind: "video", title: "Classgrid Studio Mode", video: { poster: VIDEO.poster, seconds: 32, url: VIDEO.url } } } });
        assert.deepEqual(await call("GET", `/${page._id}?card=1`), { status: 200, body: { page: { _id: String(page._id), kind: "page", title: "Tip calculator" } } });
        // (Asha was invited by email: the card does not tie the invite to her account)
        const hers = await call("GET", `/${v._id}?card=1`, { user: ASHA });
        assert.equal(hers.status, 200);
        assert.equal(v.members[0].userId, null);
        assert.deepEqual(writes, [], "no view counted, nothing saved");
        const other = await call("GET", `/${v._id}?card=1`, { user: { _id: "cccccccccccccccccccccccc", email: "ravi@x.in" } });
        assert.deepEqual([other.status, other.body.private], [403, true]);
        assert.equal((await call("GET", "/aaaaaaaaaaaaaaaaaaaaaaab?card=1")).status, 404);
    } finally {
        db.restore();
        SharePage.updateOne = realUpdate;
        SharePage.prototype.save = realSave;
    }
});

test("POST /:id/comments on a video takes its time and area, and refuses a wrong one", async () => {
    const v = videoPage({ visibility: "link" });
    const db = standIn({ [v._id]: v });
    const pushed = [];
    const realUpdate = SharePage.updateOne;
    SharePage.updateOne = async (filter, update) => { if (update.$push) { pushed.push(update.$push.comments); v.comments.push(update.$push.comments); } return { modifiedCount: 1, matchedCount: 1 }; };
    try {
        const ok = await call("POST", `/${v._id}/comments`, { user: ASHA, body: { text: "The left sidebar", time: 21, area: { x: 0, y: 0, w: 0.3, h: 1 } } });
        assert.equal(ok.status, 201);
        assert.deepEqual([ok.body.comment.time, ok.body.comment.timeEnd, ok.body.comment.area], [21, null, { x: 0, y: 0, w: 0.3, h: 1 }]);
        assert.equal(ok.body.page.kind, "video");
        assert.equal(JSON.stringify(ok.body).includes("studio</body>"), false, "the HTML it was made from is never sent");
        const bad = await call("POST", `/${v._id}/comments`, { user: ASHA, body: { text: "x", time: 99 } });
        assert.deepEqual(bad, { status: 400, body: { message: "The time must be a number of seconds from 0 to 32." } });
        assert.equal(pushed.length, 1);
    } finally {
        db.restore();
        SharePage.updateOne = realUpdate;
    }
});
