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
//   - files stored under a name that does not say whose they are (models/StoredFile.js): the person's objects and
//     rows go and another person's stay; a row kept by number alone follows the inbox's rule; an object a Library
//     record or another row still points to stays; a file that cannot be deleted keeps its row; a row that is not a
//     plain file or a deep enough folder is never followed; the WhatsApp writer writes its row (run for real)
//   - the profile photo from before the account existed is found by the organization record the person owns
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
    create: async (row) => {
        if (failing.has(name)) throw new Error(`${name} cannot be reached`);
        const saved = { _id: `${name}-${rowsOf(name).length + 1}-${Math.random().toString(36).slice(2, 8)}`, ...row };
        rowsOf(name).push(saved);
        return saved;
    },
    deleteOne: async (filter) => {
        const all = rowsOf(name);
        const at = all.findIndex((r) => matches(r, filter));
        if (at >= 0) all.splice(at, 1);
        return { deletedCount: at >= 0 ? 1 : 0 };
    },
});
for (const name of ["ActivityLog", "AgentTask", "AiLibraryFile", "AiMemoryNote", "AiSchedule", "AiSkill", "AiUsageLog", "Call", "ChatGroup",
    "ContentReport", "CustomMcpServer", "EmailJob", "IdeProject", "LiveDoc", "Notification", "NotificationLog", "OnboardingEvent", "Organization",
    "PushSubscription", "SavedSong", "SharePage", "StoredFile", "StudentApplication", "User", "UserProfile", "UserStorageQuota", "UserSession", "WhatsappDirectSend"]) {
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

// ── R2: what was asked to be deleted, and the objects of its buckets in memory ("test-r2" is the usual one) ──
const r2Deleted = [];
const r2Folders = [];
const r2Buckets = new Map();
const r2Bucket = (name = "test-r2") => { if (!r2Buckets.has(name)) r2Buckets.set(name, new Set()); return r2Buckets.get(name); };
let r2Refuses = null; // a key R2 refuses to delete
mock.module("../src/config/r2Client.js", {
    namedExports: {
        R2_BUCKET_NAME: "test-r2",
        deleteFromR2: async (key, bucketName = "test-r2") => {
            if (key === r2Refuses) throw new Error("Access Denied");
            r2Deleted.push(key);
            r2Bucket(bucketName).delete(key);
            return true;
        },
        deletePrefixFromR2: async (prefix, bucketName = "test-r2") => {
            if (typeof prefix !== "string" || prefix.length < 3 || !prefix.endsWith("/")) throw new Error("deletePrefixFromR2 needs a folder prefix");
            r2Folders.push(prefix);
            const keys = [...r2Bucket(bucketName)].filter((k) => k.startsWith(prefix));
            for (const k of keys) r2Bucket(bucketName).delete(k);
            return keys.length;
        },
    },
});
mock.module("../src/services/r2.service.js", { namedExports: { generateR2UploadUrl: async (name) => ({ uploadUrl: `https://upload.test/${name}`, publicUrl: `https://files.example/${name}` }) } });

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
    if (kind === "DeleteObjectCommand") {
        if (input.Key === s3Refuses) throw new Error("Access Denied");
        bucket(input.Bucket).delete(input.Key);
        return {};
    }
    throw new Error(`the test's bucket does not know ${kind}`);
};

const { deleteAccountData, deleteStoredFiles } = await import("../src/services/account-deletion.service.js");
const { saveIncomingMessages, noteMessagesRead, readRecentMessages } = await import("../src/services/whatsapp-inbox.service.js");
const { recordDirectWhatsappSend } = await import("../src/services/ai-feature-limits.js");
const { rememberStoredFile } = await import("../src/services/stored-files.service.js");

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
    tables.clear(); store.clear(); buckets.clear(); r2Buckets.clear();
    for (const k of Object.keys(sbTables)) delete sbTables[k];
    failing.clear(); sbFailing.clear(); redisDown = false; s3ListFails = null; s3Refuses = null; r2Refuses = null;
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
    assert.deepEqual(r2Folders, [`${A}/`, `ai-chat-uploads/${A}/`, `private/student-proofs/${A}/`]);
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

test("the CDN bucket: no folder is ever named from something that is not an account id", async (t) => {
    await fill();
    t.mock.method(console, "error", () => {}); // (R2 refuses the folder "/" an empty id makes, and that is logged)
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

// ── Files stored under a name that does not say whose they are, found by their rows (models/StoredFile.js). The
// rows are written by the real helper (services/stored-files.service.js), the way each writer calls it. ──
const ORG_A = "a0a0a0a0a0a0a0a0a0a0a0a0"; // the organization record A owns
const ORG_B = "b0b0b0b0b0b0b0b0b0b0b0b0";
const A_STORED = [
    ["r2", "ai-generated/office/1700000000100-abc123/", true, "office-file"],
    ["r2", "ai-generated/pdf/1700000000200-def456/", true, "pdf"],
    ["r2", "ai-generated/image-1700000000300.png", false, "picture"],
    ["s3", "ai-generated/1700000000400-notes..final.pdf", false, "ai-file"],
    ["s3", "ai-generated/1700000000500-clip.mp4", false, "video"],
    ["s3", "ai-generated/1700000000501-frame-2s.jpg", false, "video-frame"],
];
const B_STORED = [
    ["r2", "ai-generated/office/1700000000600-zzz999/", true, "office-file"],
    ["r2", "ai-generated/image-1700000000700.png", false, "picture"],
    ["s3", "ai-generated/1700000000800-ravi.mp4", false, "video"],
];
// (a row is written without the writer waiting for it: a few turns of the loop let it finish)
const settle = async () => { for (let i = 0; i < 5; i += 1) await new Promise((r) => setImmediate(r)); };
const storedKeys = (owner) => rowsOf("StoredFile").filter((r) => same(r.userId, owner)).map((r) => r.key).sort();

async function fillStored() {
    await fill();
    for (const [owner, list] of [[A, A_STORED], [B, B_STORED]]) {
        for (const [store, key, folder, kind] of list) assert.equal(await rememberStoredFile({ userId: owner, store, key, folder, kind }), true);
    }
    // A file each of them sent on WhatsApp: written down with the account and the number, in the bucket it was put in
    await rememberStoredFile({ userId: A, whatsappNumber: A_NUMBER, store: "r2", bucket: "classgrid-bucket", key: "whatsapp-files/11111111-a.jpg", kind: "whatsapp-file" });
    await rememberStoredFile({ userId: B, whatsappNumber: B_NUMBER, store: "r2", bucket: "classgrid-bucket", key: "whatsapp-files/22222222-b.jpg", kind: "whatsapp-file" });

    for (const key of [
        "ai-generated/office/1700000000100-abc123/Report.docx",
        "ai-generated/pdf/1700000000200-def456/part-1.pdf",
        "ai-generated/pdf/1700000000200-def456/part-2.pdf",
        "ai-generated/image-1700000000300.png",
        "ai-generated/office/1700000000600-zzz999/Ravi.xlsx",
        "ai-generated/image-1700000000700.png",
        "ai-generated/office/1700000000100-abc1234/a-folder-that-only-starts-the-same.docx",
        "ai-generated/image-1700000000999.png", // stored before rows were kept: nobody's row points to it
    ]) r2Bucket().add(key);
    r2Bucket("classgrid-bucket").add("whatsapp-files/11111111-a.jpg");
    r2Bucket("classgrid-bucket").add("whatsapp-files/22222222-b.jpg");
    for (const key of ["ai-generated/1700000000400-notes..final.pdf", "ai-generated/1700000000500-clip.mp4", "ai-generated/1700000000501-frame-2s.jpg", "ai-generated/1700000000800-ravi.mp4"]) bucket("test-ai-files").add(key);
}

test("files found by their rows: this person's objects and rows go, another person's stay", async () => {
    await fillStored();
    assert.equal(rowsOf("StoredFile").length, A_STORED.length + B_STORED.length + 2);

    const { report, files } = await deleteAccountData(person());
    assert.equal(report.storedFiles, 7, "six files the AI made and one sent on WhatsApp");
    assert.equal(report.whatsappFiles, 0, "none is kept by number alone");
    // (nothing is deleted yet: the rows are only listed, so a file that cannot be deleted can still be found)
    assert.equal(storedKeys(A).length, 7);

    const deleted = await deleteStoredFiles(A, files);

    assert.deepEqual([...r2Bucket()].sort(), [
        "ai-generated/image-1700000000700.png",
        "ai-generated/image-1700000000999.png",
        "ai-generated/office/1700000000100-abc1234/a-folder-that-only-starts-the-same.docx",
        "ai-generated/office/1700000000600-zzz999/Ravi.xlsx",
    ]);
    assert.deepEqual([...r2Bucket("classgrid-bucket")], ["whatsapp-files/22222222-b.jpg"], "A's WhatsApp file went from the bucket it was put in");
    for (const [, key] of A_STORED.filter(([store]) => store === "s3")) assert.equal(bucket("test-ai-files").has(key), false, key);
    assert.equal(bucket("test-ai-files").has("ai-generated/1700000000800-ravi.mp4"), true);
    assert.deepEqual(storedKeys(A), [], "A's rows are gone");
    assert.deepEqual(storedKeys(B), [...B_STORED.map(([, key]) => key), "whatsapp-files/22222222-b.jpg"].sort(), "B's rows are untouched");
    // 2 Library files + (1 office file, 2 PDFs, 1 picture, 3 on the CDN, 1 WhatsApp file) + 5 screenshots + 2 profile photos
    assert.equal(deleted, 2 + 8 + 5 + 2);
    // Only folders three names deep were ever listed in R2, besides the account's own two folders
    assert.deepEqual(r2Folders, ["ai-generated/office/1700000000100-abc123/", "ai-generated/pdf/1700000000200-def456/", `${A}/`, `ai-chat-uploads/${A}/`, `private/student-proofs/${A}/`]);
});

test("a file kept by number alone follows the inbox's rule: only when the number is this account's alone", async () => {
    const byNumber = async () => {
        await fillStored();
        assert.equal(await rememberStoredFile({ whatsappNumber: A_NUMBER, store: "r2", key: "whatsapp-files/33333333-old.jpg", kind: "whatsapp-file" }), true);
        assert.equal(await rememberStoredFile({ whatsappNumber: B_NUMBER, store: "r2", key: "whatsapp-files/44444444-ravi.jpg", kind: "whatsapp-file" }), true);
        r2Bucket().add("whatsapp-files/33333333-old.jpg");
        r2Bucket().add("whatsapp-files/44444444-ravi.jpg");
    };
    const numberRows = () => rowsOf("StoredFile").filter((r) => r.userId === null).map((r) => r.key).sort();

    await byNumber();
    let { report, files } = await deleteAccountData(person());
    assert.equal(report.whatsappFiles, 1);
    await deleteStoredFiles(A, files);
    assert.equal(r2Bucket().has("whatsapp-files/33333333-old.jpg"), false);
    assert.equal(r2Bucket().has("whatsapp-files/44444444-ravi.jpg"), true, "another number's file is never touched");
    assert.deepEqual(numberRows(), ["whatsapp-files/44444444-ravi.jpg"]);

    // Another account has the same number: the file could be theirs, so it stays with its row
    await byNumber();
    rowsOf("User").push({ _id: "cccccccccccccccccccccccc", metadata: { whatsappPhone: A_NUMBER.slice(-10) } });
    ({ report, files } = await deleteAccountData(person()));
    assert.equal(report.whatsappFiles, "left: another account has the same number");
    await deleteStoredFiles(A, files);
    assert.equal(r2Bucket().has("whatsapp-files/33333333-old.jpg"), true);
    assert.deepEqual(numberRows(), ["whatsapp-files/33333333-old.jpg", "whatsapp-files/44444444-ravi.jpg"]);
    // (what was written down with A's account still goes: that is known to be A's)
    assert.equal(r2Bucket("classgrid-bucket").has("whatsapp-files/11111111-a.jpg"), false);

    // A test number several accounts share
    await byNumber();
    assert.equal(await rememberStoredFile({ whatsappNumber: "918623947038", store: "r2", key: "whatsapp-files/55555555-test.jpg", kind: "whatsapp-file" }), true);
    r2Bucket().add("whatsapp-files/55555555-test.jpg");
    ({ report, files } = await deleteAccountData(person({ metadata: { whatsappPhone: "+918623947038" } })));
    assert.equal(report.whatsappFiles, "left: a test number several accounts share");
    await deleteStoredFiles(A, files);
    assert.equal(r2Bucket().has("whatsapp-files/55555555-test.jpg"), true);
    assert.equal(r2Bucket().has("whatsapp-files/33333333-old.jpg"), true, "a number that is not on the account is never used");
});

test("a recorded file stays while a Library record or another row still points to it", async () => {
    await fillStored();
    const inLibrary = "ai-generated/1700000001000-in-ravis-library.pdf";
    const sameMoment = "ai-generated/image-1700000002000.png";
    const twice = "ai-generated/1700000003000-twice.pdf";
    const folder = "ai-generated/pdf/1700000004000-ffffff/";
    const alsoInOwnLibrary = "ai-generated/1700000000001-report.pdf"; // A's Library record (see fill) and A's row
    // B's Library has a record of an object A's row points to, and of a file inside a folder of A's
    rowsOf("AiLibraryFile").push({ user_id: B, source: "generated", file_key: inLibrary }, { user_id: B, source: "uploaded", file_key: `${folder}kept.pdf` });
    await rememberStoredFile({ userId: A, store: "s3", key: inLibrary, kind: "ai-file" });
    await rememberStoredFile({ userId: A, store: "r2", key: folder, folder: true, kind: "pdf" });
    // Two pictures made in the same millisecond got one name: A's row and B's row point to one object
    await rememberStoredFile({ userId: A, store: "r2", key: sameMoment, kind: "picture" });
    await rememberStoredFile({ userId: B, store: "r2", key: sameMoment, kind: "picture" });
    // One object written down twice for A
    await rememberStoredFile({ userId: A, store: "s3", key: twice, kind: "ai-file" });
    await rememberStoredFile({ userId: A, store: "s3", key: twice, kind: "ai-file" });
    await rememberStoredFile({ userId: A, store: "s3", key: alsoInOwnLibrary, kind: "ai-file" });
    bucket("test-ai-files").add(inLibrary);
    bucket("test-ai-files").add(twice);
    r2Bucket().add(sameMoment);
    r2Bucket().add(`${folder}kept.pdf`);

    const { files } = await deleteAccountData(person());
    await deleteStoredFiles(A, files);

    assert.equal(bucket("test-ai-files").has(inLibrary), true, "B's Library record still points to it");
    assert.equal(r2Bucket().has(`${folder}kept.pdf`), true, "a Library record still points into the folder");
    assert.equal(r2Bucket().has(sameMoment), true, "B's row still points to it");
    assert.equal(bucket("test-ai-files").has(twice), false, "the last of A's two rows deleted it");
    assert.equal(bucket("test-ai-files").has(alsoInOwnLibrary), false);
    assert.deepEqual(storedKeys(A), [], "A's rows go either way");
    assert.equal(storedKeys(B).includes(sameMoment), true);
    // (an object is asked to be deleted once, also when both a Library record and a row listed it)
    const asked = s3Calls.filter((c) => c.kind === "DeleteObjectCommand").map((c) => c.Key);
    assert.equal(asked.filter((k) => k === twice).length, 1);
    assert.equal(asked.filter((k) => k === alsoInOwnLibrary).length, 1);
    assert.equal(asked.includes(inLibrary), false);
});

test("a recorded file that cannot be deleted keeps its row, and the others still go", async (t) => {
    await fillStored();
    t.mock.method(console, "error", () => {});
    s3Refuses = "ai-generated/1700000000500-clip.mp4";
    r2Refuses = "ai-generated/image-1700000000300.png";
    const { files } = await deleteAccountData(person());
    await deleteStoredFiles(A, files);
    assert.deepEqual(storedKeys(A), ["ai-generated/1700000000500-clip.mp4", "ai-generated/image-1700000000300.png"], "the two that failed can still be found");
    assert.equal(bucket("test-ai-files").has("ai-generated/1700000000500-clip.mp4"), true);
    assert.equal(bucket("test-ai-files").has("ai-generated/1700000000501-frame-2s.jpg"), false);
    assert.equal(r2Bucket().has("ai-generated/office/1700000000100-abc123/Report.docx"), false);
});

test("a row that is not a plain file or a deep enough folder is never followed", async (t) => {
    await fillStored();
    t.mock.method(console, "error", () => {});
    // Rows no writer makes (put straight into the table): a whole top folder, a path that climbs, a link, another store
    const bad = [
        { store: "r2", key: "ai-generated/", folder: true },
        { store: "r2", key: "ai-generated/office/", folder: true },
        { store: "r2", key: "ai-generated/pdf/../office/1700000000600-zzz999/", folder: true },
        { store: "r2", key: "https://files.example/ai-generated/image-1700000000700.png", folder: false },
        { store: "s3", key: "/ai-generated/1700000000800-ravi.mp4", folder: false },
        { store: "s3", key: "ai-generated/../ai-generated/1700000000800-ravi.mp4", folder: false },
        { store: "disk", key: "ai-generated/1700000000800-ravi.mp4", folder: false },
    ];
    bad.forEach((row, n) => rowsOf("StoredFile").push({ _id: `bad-${n}`, userId: A, whatsappNumber: null, bucket: null, kind: "ai-file", ...row }));
    const { files } = await deleteAccountData(person());
    await deleteStoredFiles(A, files);
    assert.equal(r2Bucket().has("ai-generated/office/1700000000600-zzz999/Ravi.xlsx"), true);
    assert.equal(r2Bucket().has("ai-generated/image-1700000000700.png"), true);
    assert.equal(r2Bucket().has("ai-generated/image-1700000000999.png"), true);
    assert.equal(bucket("test-ai-files").has("ai-generated/1700000000800-ravi.mp4"), true);
    assert.deepEqual(rowsOf("StoredFile").filter((r) => String(r._id).startsWith("bad-")).length, bad.length, "the bad rows are kept, for someone to look at");
    assert.equal(r2Folders.some((p) => p === "ai-generated/" || p === "ai-generated/office/"), false);
});

test("the profile photo from before the account existed: found by the organization record the person owns, never by a link", async () => {
    await fill();
    rowsOf("Organization").push({ _id: ORG_A, owner_id: A }, { _id: ORG_B, owner_id: B });
    bucket("test-photos").add(`profile_pictures/pending_${ORG_A}-1690000000000.png`);
    bucket("test-photos").add(`profile_pictures/pending_${ORG_B}-1690000000000.png`);
    // The link on A's account points at B's photo (a person can save any link there): it is not followed
    const { report, files } = await deleteAccountData(person({ profilePicture: `https://cdn.classgrid.in/profile_pictures/pending_${ORG_B}-1690000000000.png` }));
    assert.equal(report.signUpPhoto, 1);
    await deleteStoredFiles(A, files);
    assert.equal(bucket("test-photos").has(`profile_pictures/pending_${ORG_A}-1690000000000.png`), false);
    assert.equal(bucket("test-photos").has(`profile_pictures/pending_${ORG_B}-1690000000000.png`), true);
    assert.equal(bucket("test-photos").has(`profile_pictures/pending_${A}-1700000000000.png`), true, "a name with the account's own id after pending_ is not an organization the person owns");
    // An entry that is not exactly that kind of folder is not listed at all
    s3Calls.length = 0;
    await deleteStoredFiles("not-an-id", [{ s3Folder: "profile_pictures/" }, { s3Folder: "profile_pictures/pending_" }, { s3Folder: `studio-shots/${B}/` }, { s3Folder: `profile_pictures/pending_${ORG_B}-1` }]);
    assert.deepEqual(s3Calls, []);
});

test("a file sent on WhatsApp is written down when it is saved: with the account that reads the inbox, and the number", async (t) => {
    await fill();
    // Meta's two answers (where the file is, then the file) and our storage taking the upload: nothing leaves the test
    const asked = [];
    t.mock.method(globalThis, "fetch", async (url, options = {}) => {
        asked.push(`${options.method || "GET"} ${url}`);
        if (String(url).startsWith("https://graph.facebook.com/")) return { json: async () => ({ url: "https://lookaside.fbsbx.com/file/1", mime_type: "image/jpeg", file_size: 8 }) };
        if (String(url).startsWith("https://lookaside.fbsbx.com/")) return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) };
        if (String(url).startsWith("https://upload.test/")) return { ok: true };
        throw new Error(`the test does not answer ${url}`);
    });
    const now = Math.floor(Date.now() / 1000);
    await saveIncomingMessages({ messages: [{ from: A_NUMBER, id: "in-a9", timestamp: now, type: "document", document: { id: "9001", mime_type: "application/pdf", filename: "My Notes..final.pdf" } }] });

    const items = await readRecentMessages(A_NUMBER, 1, A);
    await settle();
    assert.match(items[0].fileUrl, /^https:\/\/files\.example\/whatsapp-files\/[0-9a-f-]{36}-My_Notes\.\.final\.pdf$/);
    const rows = rowsOf("StoredFile");
    assert.equal(rows.length, 1);
    assert.equal(`https://files.example/${rows[0].key}`, items[0].fileUrl, "the row's key is the key the file was stored under");
    assert.deepEqual({ ...rows[0], _id: 0, key: 0 }, { _id: 0, userId: A, whatsappNumber: A_NUMBER, store: "r2", bucket: "classgrid-bucket", key: 0, folder: false, kind: "whatsapp-file" });
    assert.equal(asked.filter((a) => a.startsWith("PUT https://upload.test/whatsapp-files/")).length, 1);

    // Read again: the file is not stored a second time, and no second row is written
    await readRecentMessages(A_NUMBER, 1, A);
    await settle();
    assert.equal(rowsOf("StoredFile").length, 1);

    // A reader that does not say whose inbox it is: kept by number alone. With R2_BUCKET_NAME set, the bucket is the
    // usual one and the row leaves it out.
    process.env.R2_BUCKET_NAME = "test-r2";
    try {
        await saveIncomingMessages({ messages: [{ from: B_NUMBER, id: "in-b9", timestamp: now, type: "image", image: { id: "9002", mime_type: "image/jpeg" } }] });
        await readRecentMessages(B_NUMBER, 1);
        await settle();
    } finally {
        delete process.env.R2_BUCKET_NAME;
    }
    const second = rowsOf("StoredFile")[1];
    assert.deepEqual([second.userId, second.whatsappNumber, second.bucket, second.kind], [null, B_NUMBER, null, "whatsapp-file"]);
    assert.match(second.key, /^whatsapp-files\/[0-9a-f-]{36}-file\.jpeg$/);
});

test("the row cannot be written: the file is still stored and its link still given", async (t) => {
    await fill();
    t.mock.method(console, "error", () => {});
    t.mock.method(globalThis, "fetch", async (url) => {
        if (String(url).startsWith("https://graph.facebook.com/")) return { json: async () => ({ url: "https://lookaside.fbsbx.com/file/2", mime_type: "image/png", file_size: 8 }) };
        if (String(url).startsWith("https://lookaside.fbsbx.com/")) return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) };
        return { ok: true };
    });
    failing.add("StoredFile");
    await saveIncomingMessages({ messages: [{ from: A_NUMBER, id: "in-a10", timestamp: Math.floor(Date.now() / 1000), type: "image", image: { id: "9003", mime_type: "image/png" } }] });
    const items = await readRecentMessages(A_NUMBER, 1, A);
    await settle();
    assert.match(items[0].fileUrl, /^https:\/\/files\.example\/whatsapp-files\//);
    assert.equal(items[0].fileError, undefined);
    assert.equal(rowsOf("StoredFile").length, 0);
});

test("applications for student prices go with the account, and the proof documents' folder is the account's own", async () => {
    await fill();
    rowsOf("StudentApplication").push(
        { user_id: A, status: "approved", document: { key: `private/student-proofs/${A}/proof-1.pdf` } },
        { user_id: A, status: "rejected", document: { key: `private/student-proofs/${A}/proof-0.jpg` } },
        { user_id: B, status: "pending", document: { key: `private/student-proofs/${B}/proof-1.pdf` } },
    );
    const { report, files } = await deleteAccountData(person());
    assert.equal(report.studentApplications, 2);
    assert.deepEqual(rowsOf("StudentApplication").map((r) => String(r.user_id)), [B]);
    await deleteStoredFiles(A, files);
    assert.ok(r2Folders.includes(`private/student-proofs/${A}/`));
    assert.ok(!r2Folders.some((p) => p.includes(B)), "nobody else's folder is named");
    // (never from something that is not an account id)
    r2Folders.length = 0;
    for (const notAnId of ["", "undefined", "../", `${A}/`]) await deleteStoredFiles(notAnId, []).catch(() => {});
    assert.ok(!r2Folders.some((p) => p.startsWith("private/student-proofs/")));
});
