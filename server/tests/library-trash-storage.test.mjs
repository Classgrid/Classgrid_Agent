// The Library's Trash deletes the file itself, not only its record (controllers/ai-library.controller.js). Until
// 2026-11-25 a file the AI made lost its record when the Trash was emptied, when its 30 days passed or when it was
// deleted from the Trash, and its object stayed on the CDN bucket for ever. Checked here:
//   - Empty Trash: every Trash file's record goes, and the object of each AI-made file; files not in the Trash, and
//     other people's, keep both
//   - the 30 days: a file longer in the Trash than that goes with its object when the Library is listed; a newer one
//     stays
//   - deleting one file: an AI-made file goes to the Trash first (nothing deleted); deleted from the Trash, its
//     object goes; an uploaded file's object goes from R2 as before, never from the CDN bucket
//   - a file restored in the same moment keeps its object; a bucket that refuses does not stop the delete
// The database, R2 and the CDN bucket are stand-ins in memory: nothing real is read or deleted.
// Run: node --experimental-test-module-mocks --test tests/library-trash-storage.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";

const A = "aaaaaaaaaaaaaaaaaaaaaaaa";
const B = "bbbbbbbbbbbbbbbbbbbbbbbb";
const DAY = 24 * 60 * 60 * 1000;

// ── The Library's records, in memory ──
let rows = [];
let beforeDelete = null; // runs between reading the Trash and deleting it (someone restoring a file just then)
const same = (a, b) => (a === null || a === undefined || b === null || b === undefined ? (a ?? null) === (b ?? null) : String(a) === String(b));
const matches = (row, filter = {}) => Object.entries(filter).every(([field, want]) => {
    const have = row[field];
    if (want && typeof want === "object" && !(want instanceof Date)) {
        if ("$in" in want && !want.$in.some((w) => same(have, w))) return false;
        if ("$ne" in want && same(have, want.$ne)) return false;
        if ("$lt" in want && !(have && have < want.$lt)) return false;
        return true;
    }
    return same(have, want);
});
const found = (value) => { const q = { select: () => q, lean: () => q, sort: () => q, then: (ok, bad) => Promise.resolve().then(value).then(ok, bad) }; return q; };
mock.module("../src/models/AiLibraryFile.js", {
    defaultExport: {
        find: (filter) => found(() => rows.filter((r) => matches(r, filter)).map((r) => ({ ...r }))),
        findOne: (filter) => found(() => {
            const row = rows.find((r) => matches(r, filter));
            return row ? { ...row, save: async function save() { Object.assign(row, { deleted_at: this.deleted_at }); } } : null;
        }),
        deleteMany: async (filter) => {
            if (beforeDelete) { beforeDelete(); beforeDelete = null; }
            const keep = rows.filter((r) => !matches(r, filter));
            const deletedCount = rows.length - keep.length;
            rows = keep;
            return { deletedCount };
        },
        deleteOne: async (filter) => { const n = rows.length; rows = rows.filter((r) => !matches(r, filter)); return { deletedCount: n - rows.length }; },
    },
});
mock.module("../src/models/UserStorageQuota.js", { defaultExport: { findOne: async () => null } });
mock.module("../src/services/plan-limits.service.js", { namedExports: { libraryStorageFor: async () => ({ used_bytes: 0, max_bytes: 1 }) } });
mock.module("../src/services/socket.service.js", { namedExports: { getIO: () => ({ to: () => ({ emit: () => {} }) }) } });
const r2Deleted = [];
mock.module("../src/config/r2Client.js", { namedExports: { uploadBufferToR2: async () => "", deleteFromR2: async (key) => { r2Deleted.push(key); return true; } } });

// ── The CDN bucket: the real client's helper, with `send` answered from memory ──
process.env.AWS_S3_ERP_BUCKET_NAME = "test-ai-files";
const s3 = await import("../src/config/s3Client.js");
let objects = new Set();
const s3Deleted = [];
let bucketRefuses = false;
s3.s3Client.send = async (command) => {
    if (command.constructor.name !== "DeleteObjectCommand") throw new Error(`the test's bucket does not know ${command.constructor.name}`);
    if (bucketRefuses) throw new Error("Access Denied");
    s3Deleted.push([command.input.Bucket, command.input.Key]);
    objects.delete(command.input.Key);
    return {};
};

const { getLibrary, deleteFromLibrary, emptyTrash } = await import("../src/controllers/ai-library.controller.js");

const reply = () => ({ code: 0, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
const ago = (days) => new Date(Date.now() - days * DAY);
// (the objects are deleted after the reply: a few turns of the loop let that finish)
const settle = async () => { for (let i = 0; i < 5; i += 1) await new Promise((r) => setImmediate(r)); };
const ids = () => rows.map((r) => r._id).sort();

function fill() {
    rows = [
        { _id: "a-made-trash", user_id: A, source: "generated", file_key: "ai-generated/1-report.pdf", deleted_at: ago(2) },
        { _id: "a-made-old", user_id: A, source: "generated", file_key: "ai-generated/2-old.mp4", deleted_at: ago(31) },
        { _id: "a-link-trash", user_id: A, source: "generated", file_key: null, deleted_at: ago(2) }, // a link found in an answer
        { _id: "a-made-kept", user_id: A, source: "generated", file_key: "ai-generated/3-kept.pdf", deleted_at: null },
        { _id: "a-upload", user_id: A, source: "uploaded", file_key: `ai-library/${A}/photo.png`, deleted_at: null },
        { _id: "b-made-trash", user_id: B, source: "generated", file_key: "ai-generated/4-ravi.pdf", deleted_at: ago(40) },
    ];
    objects = new Set(["ai-generated/1-report.pdf", "ai-generated/2-old.mp4", "ai-generated/3-kept.pdf", "ai-generated/4-ravi.pdf"]);
    s3Deleted.length = 0; r2Deleted.length = 0; bucketRefuses = false; beforeDelete = null;
}

test("Empty Trash: the records and the AI-made files' objects go; what is not in this person's Trash keeps both", async () => {
    fill();
    const res = reply();
    await emptyTrash({ user: { _id: A } }, res);
    await settle();
    assert.equal(res.code, 200);
    assert.equal(res.body.deleted, 3);
    assert.deepEqual(ids(), ["a-made-kept", "a-upload", "b-made-trash"]);
    assert.deepEqual(s3Deleted.sort(), [["test-ai-files", "ai-generated/1-report.pdf"], ["test-ai-files", "ai-generated/2-old.mp4"]]);
    assert.deepEqual([...objects].sort(), ["ai-generated/3-kept.pdf", "ai-generated/4-ravi.pdf"]);
    assert.deepEqual(r2Deleted, []);
});

test("the 30 days: listing the Library deletes what is longer in the Trash, with its object; newer Trash files stay", async () => {
    fill();
    const res = reply();
    await getLibrary({ user: { _id: A }, query: {} }, res);
    await settle();
    assert.equal(res.code, 200);
    assert.deepEqual(ids(), ["a-link-trash", "a-made-kept", "a-made-trash", "a-upload", "b-made-trash"]);
    assert.deepEqual(s3Deleted, [["test-ai-files", "ai-generated/2-old.mp4"]]);
    assert.equal(objects.has("ai-generated/1-report.pdf"), true);
    assert.equal(objects.has("ai-generated/4-ravi.pdf"), true, "another person's old Trash file is not this listing's to delete");
});

test("deleting one file: an AI-made file goes to the Trash first, and from the Trash its object goes too", async () => {
    fill();
    let res = reply();
    await deleteFromLibrary({ user: { _id: A }, params: { id: "a-made-kept" } }, res);
    assert.equal(res.body.trashed, true);
    assert.ok(rows.find((r) => r._id === "a-made-kept").deleted_at, "in the Trash now");
    assert.deepEqual(s3Deleted, [], "nothing is deleted while it can still be restored");

    res = reply();
    await deleteFromLibrary({ user: { _id: A }, params: { id: "a-made-kept" } }, res);
    assert.equal(res.body.success, true);
    assert.equal(rows.some((r) => r._id === "a-made-kept"), false);
    assert.deepEqual(s3Deleted, [["test-ai-files", "ai-generated/3-kept.pdf"]]);

    // An uploaded file: its R2 object, as before; the CDN bucket is not asked
    res = reply();
    await deleteFromLibrary({ user: { _id: A }, params: { id: "a-upload" } }, res);
    assert.deepEqual(r2Deleted, [`ai-library/${A}/photo.png`]);
    assert.equal(s3Deleted.length, 1);

    // Somebody else's file is not found, and nothing of it is deleted
    res = reply();
    await deleteFromLibrary({ user: { _id: A }, params: { id: "b-made-trash" } }, res);
    assert.equal(res.code, 404);
    assert.equal(objects.has("ai-generated/4-ravi.pdf"), true);
});

test("a file restored in the same moment keeps its object", async () => {
    fill();
    beforeDelete = () => { rows.find((r) => r._id === "a-made-trash").deleted_at = null; };
    const res = reply();
    await emptyTrash({ user: { _id: A } }, res);
    await settle();
    assert.equal(res.body.deleted, 2);
    assert.equal(rows.some((r) => r._id === "a-made-trash"), true, "the restored file is still in the Library");
    assert.equal(objects.has("ai-generated/1-report.pdf"), true, "and so is its object");
    assert.deepEqual(s3Deleted, [["test-ai-files", "ai-generated/2-old.mp4"]]);
});

test("a bucket that refuses does not stop the delete", async (t) => {
    fill();
    t.mock.method(console, "error", () => {});
    bucketRefuses = true;
    let res = reply();
    await emptyTrash({ user: { _id: A } }, res);
    await settle();
    assert.equal(res.code, 200);
    assert.equal(res.body.deleted, 3);
    res = reply();
    rows.push({ _id: "a-again", user_id: A, source: "generated", file_key: "ai-generated/5-again.pdf", deleted_at: ago(1) });
    await deleteFromLibrary({ user: { _id: A }, params: { id: "a-again" } }, res);
    assert.equal(res.body.success, true);
    assert.equal(rows.some((r) => r._id === "a-again"), false);
});

test("only a key the AI's uploads make is ever sent to the CDN bucket", async () => {
    const { aiMadeFileKey } = await import("../src/utils/library-file-key.js");
    assert.equal(aiMadeFileKey({ source: "generated", file_key: "ai-generated/1-a.pdf" }), "ai-generated/1-a.pdf");
    assert.equal(aiMadeFileKey({ source: "uploaded", file_key: "ai-generated/1-a.pdf" }), null);
    assert.equal(aiMadeFileKey({ source: "generated", file_key: `ai-library/${A}/x.png` }), null);
    assert.equal(aiMadeFileKey({ source: "generated", file_key: "ai-generated/../profile_pictures/x.png" }), null);
    // (two dots inside a name are a name: the AI's uploads keep dots, so "notes..final.pdf" is a key they make)
    assert.equal(aiMadeFileKey({ source: "generated", file_key: "ai-generated/1-notes..final.pdf" }), "ai-generated/1-notes..final.pdf");
    fill();
    assert.equal(await s3.deleteFromS3("ai-generated/1-notes..final.pdf", "test-ai-files"), true);
    await assert.rejects(() => s3.deleteFromS3("ai-generated/../1-notes.pdf", "test-ai-files"), /needs an object key/);
    assert.equal(aiMadeFileKey({ source: "generated", file_key: null }), null);
    assert.equal(aiMadeFileKey({ source: "generated" }), null);
    assert.equal(aiMadeFileKey(null), null);
});

test("an object another Library record still points to is kept", async () => {
    fill();
    // somebody else has a record of the same object
    rows.push({ _id: "b-same-file", user_id: B, source: "generated", file_key: "ai-generated/1-report.pdf", deleted_at: null });
    const res = reply();
    await emptyTrash({ user: { _id: A } }, res);
    await settle();
    assert.equal(res.code, 200);
    assert.equal(res.body.deleted, 3);
    assert.ok(objects.has("ai-generated/1-report.pdf"), "the shared object stays");
    assert.ok(!objects.has("ai-generated/2-old.mp4"), "the other Trash file's object goes");
    assert.ok(!s3Deleted.some(([, key]) => key === "ai-generated/1-report.pdf"));
});
