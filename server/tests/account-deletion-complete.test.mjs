// Delete Account removes what it used to leave behind (services/account-deletion.service.js; checked against the
// code on 2026-11-25): the Remote PC chats and computers, the reports the person sent, their old activity log, the
// feedback they sent (under every email of the account), the count of their WhatsApp sends and what they wrote to
// Classgrid's WhatsApp number, the lists of screenshots in Redis, and on the CDN bucket their screenshots, the files
// the AI made that are in their Library and the profile photo saved at sign-up. Checked here:
//   - each new part deletes this person's rows and keys and nobody else's
//   - a report someone else sent about this person's content stays
//   - the records kept on purpose (payments, invoices, credit records, Google Play purchases, the audit log, the
//     system logs) are never read or changed
//   - a part that fails is reported and the others still run
//   - the WhatsApp inbox is left alone when another account has the same number
//   - the CDN bucket: a folder is deleted page by page, and nothing outside the person's own folder is deleted
// The database, Supabase, Redis, R2 and the CDN bucket are stand-ins in memory: nothing real is read or deleted, and
// no network or key is needed. The WhatsApp inbox and the WhatsApp count are written by the real services, so the
// key names checked here are the ones really used.
// Run: node --experimental-test-module-mocks --test tests/account-deletion-complete.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const A = "aaaaaaaaaaaaaaaaaaaaaaaa"; // the person whose account is deleted
const B = "bbbbbbbbbbbbbbbbbbbbbbbb"; // somebody else
const A_EMAIL = "asha@example.com";
const A_ADDED = "asha.work@example.com";
const A_NOT_CONFIRMED = "asha.typo@example.com";
const B_EMAIL = "ravi@example.com";
const A_NUMBER = "919800000001";
const B_NUMBER = "919800000002";

// ── The database: a few rows per model, in memory ──
const tables = new Map();
const rowsOf = (name) => { if (!tables.has(name)) tables.set(name, []); return tables.get(name); };
const failing = new Set(); // models whose deleteMany throws
const same = (a, b) => String(a) === String(b);
const valueAt = (row, path) => path.split(".").reduce((v, k) => v?.[k], row);
const matches = (row, filter = {}) => Object.entries(filter).every(([field, want]) => {
    if (field === "$or") return want.some((f) => matches(row, f));
    const have = valueAt(row, field);
    if (want && typeof want === "object" && !Array.isArray(want)) {
        if ("$ne" in want) return !same(have, want.$ne);
        if ("$in" in want) return want.$in.some((w) => same(have, w));
        if ("$regex" in want) return new RegExp(want.$regex).test(String(have ?? ""));
    }
    return same(have, want);
});
const found = (rows) => { const q = { select: () => q, lean: () => q, then: (ok, bad) => Promise.resolve(rows).then(ok, bad) }; return q; };
const model = (name) => ({
    find: (filter) => found(rowsOf(name).filter((r) => matches(r, filter))),
    deleteMany: async (filter) => {
        if (failing.has(name)) throw new Error(`${name} cannot be reached`);
        const all = rowsOf(name);
        const keep = all.filter((r) => !matches(r, filter));
        tables.set(name, keep);
        return { deletedCount: all.length - keep.length };
    },
    updateMany: async () => ({ modifiedCount: 0 }),
    create: async (row) => { rowsOf(name).push(row); return row; },
});
for (const name of ["ActivityLog", "AgentTask", "AiLibraryFile", "AiMemoryNote", "AiSchedule", "AiSkill", "AiUsageLog", "Call", "ChatGroup",
    "ContentReport", "CustomMcpServer", "EmailJob", "IdeProject", "LiveDoc", "Notification", "NotificationLog", "OnboardingEvent",
    "PushSubscription", "SavedSong", "SharePage", "User", "UserProfile", "UserStorageQuota", "UserSession", "WhatsappDirectSend"]) {
    mock.module(`../src/models/${name}.js`, { defaultExport: model(name) });
}
mock.module("../src/models/RemoteChat.js", { defaultExport: model("RemoteChat"), namedExports: { RemoteDevice: model("RemoteDevice") } });
mock.module("../src/models/OAuth.js", { namedExports: { OAuthToken: model("OAuthToken"), OAuthAuthCode: model("OAuthAuthCode") } });

// The records kept on purpose: anything that reads or changes one of them is written down
const KEPT = ["PlatformTransaction", "AiCreditTransaction", "AiCreditSpend", "GooglePlayPurchase", "AdminAuditLog", "SystemLog",
    "Invoice", "InvoiceLineItem", "PaymentTransaction", "PaymentOrder", "PaymentRefund"];
const keptTouched = [];
for (const name of KEPT) {
    mock.module(`../src/models/${name}.js`, { defaultExport: new Proxy({}, { get: (_t, what) => { keptTouched.push(`${name}.${String(what)}`); return async () => ({}); } }) });
}

// ── Supabase: tables in memory, with the few query words the service uses ──
const sbTables = {};
const sbDeletes = [];
const sbFailing = new Set();
const sb = {
    from(table) {
        const state = { op: "select", filters: [], range: null, single: false };
        const run = () => {
            if (sbFailing.has(table)) return { data: null, error: new Error(`${table} cannot be reached`) };
            const all = sbTables[table] || (sbTables[table] = []);
            const hit = (r) => state.filters.every((f) => f(r));
            if (state.op === "delete") { sbDeletes.push(table); sbTables[table] = all.filter((r) => !hit(r)); return { data: null, error: null }; }
            let rows = all.filter(hit);
            if (state.range) rows = rows.slice(state.range[0], state.range[1] + 1);
            return { data: state.single ? rows[0] || null : rows, error: null };
        };
        const q = {
            select: () => q,
            delete: () => { state.op = "delete"; return q; },
            in: (col, list) => { state.filters.push((r) => list.includes(r[col])); return q; },
            eq: (col, v) => { state.filters.push((r) => r[col] === v); return q; },
            is: (col, v) => { state.filters.push((r) => (r[col] ?? null) === v); return q; },
            range: (from, to) => { state.range = [from, to]; return q; },
            maybeSingle: () => { state.single = true; return q; },
            then: (ok, bad) => Promise.resolve().then(run).then(ok, bad),
        };
        return q;
    },
};
mock.module("../src/config/supabaseClient.js", { namedExports: { primarySupabaseClient: sb } });

// ── Redis: plain keys, lists and sorted sets in memory ──
const store = new Map();
let redisDown = false;
const up = () => { if (redisDown) throw new Error("redis cannot be reached"); };
const glob = (pattern) => new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`);
const redis = {
    get: async (k) => { up(); return store.has(k) ? String(store.get(k)) : null; },
    set: async (k, v, ...opts) => { up(); if (opts.includes("NX") && store.has(k)) return null; store.set(k, v); return "OK"; },
    del: async (...ks) => { up(); let n = 0; for (const k of ks) if (store.delete(k)) n += 1; return n; },
    scan: async (_cursor, _match, pattern) => { up(); return ["0", [...store.keys()].filter((k) => glob(pattern).test(k))]; },
    lpush: async (k, v) => { up(); const list = store.get(k) || []; list.unshift(v); store.set(k, list); return list.length; },
    ltrim: async (k, from, to) => { up(); store.set(k, (store.get(k) || []).slice(from, to + 1)); return "OK"; },
    lrange: async (k, from, to) => { up(); const list = store.get(k) || []; return to === -1 ? list.slice(from) : list.slice(from, to + 1); },
    expire: async () => { up(); return 1; },
    ttl: async () => { up(); return -1; },
    zadd: async (k, score, member) => { up(); const z = store.get(k) || new Map(); z.set(member, score); store.set(k, z); return 1; },
};
mock.module("../src/config/redis.js", { defaultExport: redis });

// ── R2: what was asked to be deleted ──
const r2Deleted = [];
const r2Folders = [];
mock.module("../src/config/r2Client.js", {
    namedExports: {
        deleteFromR2: async (key) => { r2Deleted.push(key); return true; },
        deletePrefixFromR2: async (prefix) => { r2Folders.push(prefix); return 0; },
    },
});
mock.module("../src/services/r2.service.js", { namedExports: { generateR2UploadUrl: async () => ({ uploadUrl: "", publicUrl: "" }) } });

// ── The other services the deletion calls ──
mock.module("../src/services/ai-chat.service.js", { namedExports: { forgetSession: () => {} } });
mock.module("../src/services/ai-chat-history.service.js", { namedExports: { invalidateHistoryCache: async () => {} } });
mock.module("../src/services/ai-chat-grid.service.js", { namedExports: { leaveSharedChat: async () => "left" } });
mock.module("../src/services/ide-project.service.js", { namedExports: { sandboxSsh: async () => ({ execCommand: async () => ({}), dispose() {} }) } });

// ── The CDN bucket (AWS S3): the real client's helpers, with `send` answered from memory. Two bucket names, so a
// delete sent to the wrong bucket shows. A list gives 2 keys a page, so a folder of 5 takes 3 pages. ──
process.env.AWS_S3_ERP_BUCKET_NAME = "test-ai-files";
process.env.AWS_S3_BUCKET = "test-photos";
const s3 = await import("../src/config/s3Client.js");
const buckets = new Map();
const bucket = (name) => { if (!buckets.has(name)) buckets.set(name, new Set()); return buckets.get(name); };
const s3Calls = [];
let s3ListFails = null; // a folder whose listing throws
let s3Refuses = null; // a key the bucket refuses to delete
const PAGE = 2;
s3.s3Client.send = async (command) => {
    const kind = command.constructor.name;
    const input = command.input;
    s3Calls.push({ kind, ...input });
    if (kind === "ListObjectsV2Command") {
        if (s3ListFails && input.Prefix === s3ListFails) throw new Error("Access Denied");
        // (as in S3, the mark for the next page is a place among the keys, so keys deleted meanwhile do not shift it)
        const keys = [...bucket(input.Bucket)].filter((k) => k.startsWith(input.Prefix) && (!input.ContinuationToken || k > input.ContinuationToken)).sort();
        const page = keys.slice(0, PAGE);
        const more = keys.length > PAGE;
        return { Contents: page.map((Key) => ({ Key })), IsTruncated: more, NextContinuationToken: more ? page[page.length - 1] : undefined };
    }
    if (kind === "DeleteObjectsCommand") {
        const Errors = [];
        for (const { Key } of input.Delete.Objects) {
            if (Key === s3Refuses) Errors.push({ Key, Code: "AccessDenied" });
            else bucket(input.Bucket).delete(Key);
        }
        return Errors.length ? { Errors } : {};
    }
    if (kind === "DeleteObjectCommand") { bucket(input.Bucket).delete(input.Key); return {}; }
    throw new Error(`the test's bucket does not know ${kind}`);
};

const { deleteAccountData, deleteStoredFiles } = await import("../src/services/account-deletion.service.js");
const { saveIncomingMessages, noteMessagesRead } = await import("../src/services/whatsapp-inbox.service.js");
const { recordDirectWhatsappSend } = await import("../src/services/ai-feature-limits.js");

const person = (over = {}) => ({
    _id: A, email: A_EMAIL, name: "Asha",
    account_emails: [
        { email: A_ADDED, verified_at: new Date("2026-11-16") },
        { email: A_NOT_CONFIRMED, verified_at: null },
    ],
    metadata: { whatsappPhone: `+${A_NUMBER}` },
    profilePicture: `https://cdn.classgrid.in/profile_pictures/${B}-1700000000000.png`, // a link to someone else's photo: never followed
    ...over,
});

/** Fills every store with rows of both people, the way the real code writes them. */
async function fill() {
    tables.clear(); store.clear(); buckets.clear();
    for (const k of Object.keys(sbTables)) delete sbTables[k];
    failing.clear(); sbFailing.clear(); redisDown = false; s3ListFails = null; s3Refuses = null;
    r2Deleted.length = 0; r2Folders.length = 0; s3Calls.length = 0; sbDeletes.length = 0; keptTouched.length = 0;

    rowsOf("User").push({ _id: A, metadata: { whatsappPhone: `+${A_NUMBER}` } }, { _id: B, metadata: { whatsappPhone: `+${B_NUMBER}` } });
    rowsOf("RemoteChat").push({ userId: A, sessionId: "chat-a1" }, { userId: A, sessionId: "chat-a2" }, { userId: B, sessionId: "chat-b1" });
    rowsOf("RemoteDevice").push({ userId: A, deviceId: "pc-a" }, { userId: B, deviceId: "pc-b" });
    rowsOf("ContentReport").push(
        { reportedBy: A, reportedUser: B, contentId: "doc-1" }, // A's own report
        { reportedBy: B, reportedUser: A, contentId: "doc-2" }, // B's report about A's doc: stays
        { reportedBy: B, reportedUser: null, contentId: "doc-3" },
    );
    rowsOf("ActivityLog").push({ user: A, action: "login" }, { user: A, action: "open_chat" }, { user: B, action: "login" });
    rowsOf("AiLibraryFile").push(
        { user_id: A, source: "uploaded", file_key: `ai-library/${A}/photo.png` },
        { user_id: A, source: "generated", file_key: "ai-generated/1700000000001-report.pdf" },
        { user_id: A, source: "generated", file_key: null, cdn_url: "https://example.com/some.pdf" }, // a link found in an answer
        { user_id: B, source: "generated", file_key: "ai-generated/1700000000002-ravi.pdf" },
    );
    sbTables.ai_agent_reviews = [
        { id: 1, user_email: A_EMAIL, type: "down", feedback_text: "wrong answer" },
        { id: 2, user_email: A_ADDED, type: "up" },
        { id: 3, user_email: A_NOT_CONFIRMED, type: "down" }, // an email never confirmed on A's account: not A's
        { id: 4, user_email: B_EMAIL, type: "down" },
        { id: 5, user_email: "Unknown User", type: "down" },
    ];

    // Written by the real services: the WhatsApp count (database row + Redis) and the inbox of each number
    await recordDirectWhatsappSend(A, "wamid-a1");
    await recordDirectWhatsappSend(A, "wamid-a2");
    await recordDirectWhatsappSend(B, "wamid-b1");
    const now = Math.floor(Date.now() / 1000);
    await saveIncomingMessages({ messages: [
        { from: A_NUMBER, id: "in-a1", timestamp: now, type: "text", text: { body: "hello" } },
        { from: A_NUMBER, id: "in-a2", timestamp: now, type: "image", image: { id: "7001", mime_type: "image/jpeg" } },
        { from: B_NUMBER, id: "in-b1", timestamp: now, type: "image", image: { id: "7002", mime_type: "image/jpeg" } },
    ] });
    store.set("wa:media:7001", "https://files.example/whatsapp-files/a.jpg");
    store.set("wa:media:7002", "https://files.example/whatsapp-files/b.jpg");
    await noteMessagesRead(A_NUMBER, [{ at: Date.now() }]);
    await noteMessagesRead(B_NUMBER, [{ at: Date.now() }]);

    // Redis keys kept under an account id
    store.set(`studio:shots:${A}:chat-a1`, ["{}"]);
    store.set(`studio:shots:${A}:chat-a2`, ["{}"]);
    store.set(`studio:shots:${B}:chat-b1`, ["{}"]);
    store.set(`plan:voice:${A}`, "12");
    store.set(`plan:voice:${B}`, "7");

    // The CDN bucket
    for (const n of [1, 2, 3, 4, 5]) bucket("test-ai-files").add(`studio-shots/${A}/shot-${n}.jpg`);
    bucket("test-ai-files").add(`studio-shots/${B}/shot-1.jpg`);
    bucket("test-ai-files").add(`studio-shots/${A}x/shot-1.jpg`); // a longer name that only starts the same
    bucket("test-ai-files").add("ai-generated/1700000000001-report.pdf");
    bucket("test-ai-files").add("ai-generated/1700000000002-ravi.pdf");
    bucket("test-ai-files").add("ai-generated/1700000000003-nobody-knows-whose.pdf");
    bucket("test-photos").add(`profile_pictures/${A}-1690000000000.png`);
    bucket("test-photos").add(`profile_pictures/${A}-1695000000000.jpeg`);
    bucket("test-photos").add(`profile_pictures/${B}-1700000000000.png`);
    bucket("test-photos").add(`profile_pictures/pending_${A}-1700000000000.png`);
}

const keysWith = (text) => [...store.keys()].filter((k) => k.includes(text)).sort();

test("the new parts: this person's rows and keys go, everybody else's stay", async () => {
    await fill();
    assert.equal(rowsOf("WhatsappDirectSend").length, 3, "the real service wrote the count's rows");
    assert.deepEqual(keysWith(A_NUMBER), [`wa:inbox:${A_NUMBER}`, `wa:lastin:${A_NUMBER}`, `wa:readupto:${A_NUMBER}`], "the real service wrote the inbox");

    const { report } = await deleteAccountData(person());

    assert.equal(report.remoteChats, 2);
    assert.equal(report.remoteDevices, 1);
    assert.equal(report.reportsSent, 1);
    assert.equal(report.activityLog, 2);
    assert.equal(report.whatsappSends, 2);
    assert.equal(report.feedback, "done");
    assert.equal(report.whatsappInbox, 4, "the inbox, the last-wrote time, the read mark and one file's link");
    assert.equal(report.redis, 4, "the WhatsApp count, two screenshot lists and one plan counter");
    assert.deepEqual(Object.entries(report).filter(([, v]) => typeof v === "string" && v.startsWith("failed")), []);

    assert.deepEqual(rowsOf("RemoteChat"), [{ userId: B, sessionId: "chat-b1" }]);
    assert.deepEqual(rowsOf("RemoteDevice"), [{ userId: B, deviceId: "pc-b" }]);
    assert.deepEqual(rowsOf("ActivityLog"), [{ user: B, action: "login" }]);
    assert.deepEqual(rowsOf("WhatsappDirectSend").map((r) => [r.userId, r.ref]), [[B, "wamid:wamid-b1"]]);
    // (the report B sent about A's doc is B's and the team's: it stays)
    assert.deepEqual(rowsOf("ContentReport").map((r) => r.contentId), ["doc-2", "doc-3"]);
    // (feedback: A's main email and A's confirmed added email; not an email A never confirmed, not B's)
    assert.deepEqual(sbTables.ai_agent_reviews.map((r) => r.id), [3, 4, 5]);

    assert.deepEqual(keysWith(A), [], "nothing is left in Redis under A's id");
    assert.deepEqual(keysWith(A_NUMBER), [], "nothing is left in Redis under A's number");
    assert.equal(store.has("wa:media:7001"), false);
    assert.deepEqual(keysWith(B), [`ai:wa-direct:${B}`, `plan:voice:${B}`, `studio:shots:${B}:chat-b1`]);
    assert.deepEqual(keysWith(B_NUMBER), [`wa:inbox:${B_NUMBER}`, `wa:lastin:${B_NUMBER}`, `wa:readupto:${B_NUMBER}`]);
    assert.equal(store.has("wa:media:7002"), true);
    // (the "seen" marks stay, so a message Meta sends again is not saved again)
    assert.equal(store.has("wa:msgseen:in-a1"), true);
});

test("the records kept on purpose are never read or changed", async () => {
    await fill();
    await deleteAccountData(person());
    assert.deepEqual(keptTouched, []);
    assert.deepEqual([...new Set(sbDeletes)].sort(), ["ai_agent_reviews", "device_tokens", "notifications", "shared_chat_snapshots"]);
    // (and the service does not even load them)
    const source = fs.readFileSync(new URL("../src/services/account-deletion.service.js", import.meta.url), "utf8");
    const imports = source.split("\n").filter((line) => /^import /.test(line)).join("\n");
    for (const name of [...KEPT, "Payment", "Invoice"]) assert.equal(imports.includes(`models/${name}`), false, `${name} is not loaded`);
});

test("a part that fails is reported, and the others still run", async (t) => {
    await fill();
    t.mock.method(console, "error", () => {});
    failing.add("RemoteChat");
    sbFailing.add("ai_agent_reviews");
    redisDown = true;
    const { report } = await deleteAccountData(person());
    redisDown = false;

    assert.match(report.remoteChats, /^failed: /);
    assert.match(report.feedback, /^failed: /);
    assert.match(report.whatsappInbox, /^failed: /);
    assert.match(report.redis, /^failed: /);
    assert.equal(rowsOf("RemoteChat").length, 3, "the failed part deleted nothing");
    assert.equal(sbTables.ai_agent_reviews.length, 5);
    // (the parts after a failed one were still done)
    assert.equal(report.remoteDevices, 1);
    assert.equal(report.reportsSent, 1);
    assert.equal(report.activityLog, 2);
    assert.equal(report.whatsappSends, 2);
    assert.equal(report.bellNotifications, "done");
    // (the super admin's erase reads the failed parts this way: routes/super-admin.routes.js)
    const failed = Object.entries(report).filter(([, v]) => typeof v === "string" && v.startsWith("failed")).map(([k]) => k);
    assert.deepEqual(failed.sort(), ["feedback", "redis", "remoteChats", "whatsappInbox"]);
});

test("the WhatsApp inbox is left alone when the number is not this account's alone, or there is none", async () => {
    await fill();
    rowsOf("User").push({ _id: "cccccccccccccccccccccccc", metadata: { whatsappPhone: A_NUMBER.slice(-10) } }); // the same number, saved without the country code
    let { report } = await deleteAccountData(person());
    assert.equal(report.whatsappInbox, "left: another account has the same number");
    assert.deepEqual(keysWith(A_NUMBER), [`wa:inbox:${A_NUMBER}`, `wa:lastin:${A_NUMBER}`, `wa:readupto:${A_NUMBER}`]);

    await fill();
    await saveIncomingMessages({ messages: [{ from: "918623947038", id: "in-t1", timestamp: 1, type: "text", text: { body: "test" } }] });
    ({ report } = await deleteAccountData(person({ metadata: { whatsappPhone: "+918623947038" } })));
    assert.equal(report.whatsappInbox, "left: a test number several accounts share");
    assert.equal(store.has("wa:inbox:918623947038"), true);
    assert.equal(store.has(`wa:inbox:${A_NUMBER}`), true, "a number that is not on the account is never touched");

    await fill();
    ({ report } = await deleteAccountData(person({ metadata: {} })));
    assert.equal(report.whatsappInbox, 0);
    assert.equal(store.has(`wa:inbox:${A_NUMBER}`), true);
});

test("an account with no added emails: feedback under its main email goes", async () => {
    await fill();
    const { report } = await deleteAccountData(person({ account_emails: undefined, email: "  Asha@Example.com " }));
    assert.equal(report.feedback, "done");
    assert.deepEqual(sbTables.ai_agent_reviews.map((r) => r.id), [2, 3, 4, 5]);
});

test("the CDN bucket: the person's folders go page by page, and nothing outside them", async () => {
    await fill();
    const { files } = await deleteAccountData(person());
    // (an uploaded Library file is listed by its R2 key, a file the AI made as { s3 }, a link with no key not at all)
    assert.deepEqual(files, [`ai-library/${A}/photo.png`, { s3: "ai-generated/1700000000001-report.pdf" }]);

    const deleted = await deleteStoredFiles(A, files);

    assert.deepEqual([...bucket("test-ai-files")].sort(), [
        "ai-generated/1700000000002-ravi.pdf",
        "ai-generated/1700000000003-nobody-knows-whose.pdf",
        `studio-shots/${A}x/shot-1.jpg`,
        `studio-shots/${B}/shot-1.jpg`,
    ]);
    assert.deepEqual([...bucket("test-photos")].sort(), [`profile_pictures/${B}-1700000000000.png`, `profile_pictures/pending_${A}-1700000000000.png`]);
    assert.equal(deleted, 2 + 5 + 2, "two listed files, five screenshots, two profile photos");

    // The screenshots' folder was read in 3 pages, each asked for with the mark the page before gave
    const shotPages = s3Calls.filter((c) => c.kind === "ListObjectsV2Command" && c.Prefix === `studio-shots/${A}/`);
    assert.deepEqual(shotPages.map((c) => c.ContinuationToken), [undefined, `studio-shots/${A}/shot-2.jpg`, `studio-shots/${A}/shot-4.jpg`]);
    assert.ok(shotPages.every((c) => c.Bucket === "test-ai-files"));
    // Every list was for a folder with A's id in it, and every key deleted was A's
    for (const c of s3Calls.filter((x) => x.kind === "ListObjectsV2Command")) assert.ok([`studio-shots/${A}/`, `profile_pictures/${A}-`].includes(c.Prefix), c.Prefix);
    const gone = s3Calls.flatMap((c) => (c.kind === "DeleteObjectsCommand" ? c.Delete.Objects.map((o) => o.Key) : c.kind === "DeleteObjectCommand" ? [c.Key] : []));
    for (const key of gone) assert.ok(key.startsWith(`studio-shots/${A}/`) || key.startsWith(`profile_pictures/${A}-`) || key === "ai-generated/1700000000001-report.pdf", key);
    // The AI-made file went from the CDN bucket and was not sent to R2; the uploaded file went from R2
    assert.deepEqual(s3Calls.filter((c) => c.kind === "DeleteObjectCommand").map((c) => [c.Bucket, c.Key]), [["test-ai-files", "ai-generated/1700000000001-report.pdf"]]);
    assert.deepEqual(r2Deleted, [`ai-library/${A}/photo.png`]);
    assert.deepEqual(r2Folders, [`${A}/`, `ai-chat-uploads/${A}/`]);
});

test("the CDN bucket: one folder failing does not stop the other, and a key the bucket refuses is not counted", async (t) => {
    await fill();
    t.mock.method(console, "error", () => {});
    s3ListFails = `studio-shots/${A}/`;
    s3Refuses = `profile_pictures/${A}-1690000000000.png`;
    const deleted = await deleteStoredFiles(A, []);
    assert.equal(deleted, 1, "only the profile photo the bucket let go");
    assert.equal(bucket("test-ai-files").has(`studio-shots/${A}/shot-1.jpg`), true);
    assert.deepEqual([...bucket("test-photos")].filter((k) => k.startsWith(`profile_pictures/${A}-`)), [`profile_pictures/${A}-1690000000000.png`]);
});

test("the CDN bucket: no folder is ever named from something that is not an account id", async () => {
    await fill();
    for (const notAnId of ["", "undefined", "../", `${A}/`, "studio-shots"]) await deleteStoredFiles(notAnId, []);
    assert.deepEqual(s3Calls, []);
    assert.equal(bucket("test-ai-files").size, 10);
    assert.equal(bucket("test-photos").size, 4);
});

test("the bucket helpers: a short or open prefix is refused, and a key outside the prefix is never deleted", async () => {
    await fill();
    for (const bad of ["", "/", "a/", "studio-shots", undefined, null, 7]) {
        await assert.rejects(() => s3.deletePrefixFromS3(bad), /needs a folder prefix/);
    }
    for (const bad of ["", "/absolute", "a/../b", undefined, null]) await assert.rejects(() => s3.deleteFromS3(bad), /needs an object key/);
    assert.deepEqual(s3Calls, []);

    // A list that answers with a key from somewhere else (it never should): that key is not deleted
    const realSend = s3.s3Client.send;
    const asked = [];
    s3.s3Client.send = async (command) => {
        asked.push(command);
        if (command.constructor.name === "ListObjectsV2Command") return { Contents: [{ Key: `studio-shots/${A}/one.jpg` }, { Key: `studio-shots/${B}/other.jpg` }, {}], IsTruncated: false };
        return {};
    };
    try {
        assert.equal(await s3.deletePrefixFromS3(`studio-shots/${A}/`, "test-ai-files"), 1);
    } finally {
        s3.s3Client.send = realSend;
    }
    assert.deepEqual(asked[1].input.Delete.Objects, [{ Key: `studio-shots/${A}/one.jpg` }]);

    // Refused keys: an error once every page is done, that says how many did go
    for (const n of [1, 2, 3]) bucket("test-ai-files").add(`folder-x/${n}.jpg`);
    s3Refuses = "folder-x/1.jpg";
    await assert.rejects(() => s3.deletePrefixFromS3("folder-x/", "test-ai-files"), (e) => e.deleted === 2 && /1 object\(s\) under folder-x\/ could not be deleted \(AccessDenied\)/.test(e.message));
    assert.deepEqual([...bucket("test-ai-files")].filter((k) => k.startsWith("folder-x/")), ["folder-x/1.jpg"]);
});

test("the key names read here are the ones the writers use", () => {
    const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");
    const shots = read("../src/services/studio-browser-tools.js");
    assert.ok(shots.includes("`studio:shots:${userId}:${sessionId}`"), "the screenshot list's Redis key");
    assert.ok(shots.includes("`studio-shots/${userId}/${crypto.randomUUID()}.jpg`"), "the screenshot's bucket key");
    assert.ok(shots.includes('process.env.AWS_S3_ERP_BUCKET_NAME || "erp-classgrid"'), "the screenshot's bucket");
    const auth = read("../src/controllers/auth.controller.js");
    assert.ok(auth.includes("const key = `${folder}/${filenamePrefix}-${Date.now()}.${extension}`;"), "the profile photo's bucket key");
    assert.ok(auth.includes('uploadBase64ToS3(dynamicData.profile_photo.image, "profile_pictures", user._id.toString())'), "the profile photo's folder and name");
    assert.ok(read("../src/services/video-render.service.js").includes("const key = `ai-generated/${Date.now()}-"), "a made video's bucket key");
    assert.equal((read("../src/controllers/ai-chat.controller.js").match(/const s3Key = `ai-generated\/\$\{Date\.now\(\)\}-\$\{safeFileName\}`;/g) || []).length, 2, "an AI-made file's bucket key");
});

test("a file another account also has a record of is not deleted from storage", async () => {
    await fill();
    // B kept the same two files in B's own Library (the same objects in storage)
    rowsOf("AiLibraryFile").push(
        { user_id: B, source: "generated", file_key: "ai-generated/1700000000001-report.pdf" },
        { user_id: B, source: "uploaded", file_key: `ai-library/${A}/photo.png` },
    );
    const { report, files } = await deleteAccountData(person());
    assert.equal(report.libraryFiles, 3, "A's three records go");
    assert.deepEqual(files, [], "neither object is listed for deletion: B's records still point to them");
    assert.equal(rowsOf("AiLibraryFile").filter((r) => String(r.user_id) === B).length, 3, "B's records are untouched");
});

test("when the Library's records cannot be deleted, none of its files is listed for deletion", async (t) => {
    await fill();
    t.mock.method(console, "error", () => {});
    failing.add("AiLibraryFile");
    const { report, files } = await deleteAccountData(person());
    assert.match(String(report.libraryFiles), /^failed/);
    assert.deepEqual(files.filter((f) => f?.s3 || String(f).startsWith("ai-library/")), []);
});
