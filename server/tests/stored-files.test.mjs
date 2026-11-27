// Whose file it is gets written down where the server stores a file under a name that does not say so
// (services/stored-files.service.js, models/StoredFile.js; 2026-11-25), so Delete Account can find it. Checked here:
//   - the row: the account or the number, the store, the key or folder, the bucket only when it is not the usual one
//   - what is refused: no owner, another store, a link instead of a key, a path that climbs (".."), a folder that
//     is a whole top folder; a name that only has two dots in it is fine
//   - the write never throws and never rejects, also when the database refuses it or it is called with nothing
//   - every writer calls it with the right store and the key it really stores under. For the writers inside the
//     chat controller (too big to run here) this is read from the source, next to the upload call; the WhatsApp
//     writer is run for real in tests/account-deletion-complete.test.mjs
// The database is a stand-in in memory: nothing real is written.
// Run: node --experimental-test-module-mocks --test tests/stored-files.test.mjs
import test, { mock } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const A = "aaaaaaaaaaaaaaaaaaaaaaaa";

let rows = [];
let databaseDown = false;
mock.module("../src/models/StoredFile.js", {
    defaultExport: { create: async (row) => { if (databaseDown) throw new Error("database cannot be reached"); rows.push(row); return row; } },
});
mock.module("../src/config/r2Client.js", { namedExports: { R2_BUCKET_NAME: "test-r2" } });
process.env.AWS_S3_ERP_BUCKET_NAME = "test-ai-files";

const { rememberStoredFile, storedFileRow, storedFileProblem } = await import("../src/services/stored-files.service.js");

test("the row each writer's call makes", () => {
    // An office file's own folder, an edited PDF's folder (R2)
    assert.deepEqual(storedFileRow({ userId: A, store: "r2", key: "ai-generated/office/1700000000100-abc123/", folder: true, kind: "office-file" }),
        { userId: A, whatsappNumber: null, store: "r2", bucket: null, key: "ai-generated/office/1700000000100-abc123/", folder: true, kind: "office-file" });
    // A picture (R2), a file and a video's frame on the CDN bucket (S3)
    assert.deepEqual(storedFileRow({ userId: A, store: "r2", key: "ai-generated/image-1700000000300.png", kind: "picture" }),
        { userId: A, whatsappNumber: null, store: "r2", bucket: null, key: "ai-generated/image-1700000000300.png", folder: false, kind: "picture" });
    assert.deepEqual(storedFileRow({ userId: A, store: "s3", key: "ai-generated/1700000000501-frame-2s.jpg", kind: "video-frame" }),
        { userId: A, whatsappNumber: null, store: "s3", bucket: null, key: "ai-generated/1700000000501-frame-2s.jpg", folder: false, kind: "video-frame" });
    // An account id given as an object (as req.user._id is) is kept as its text
    assert.equal(storedFileRow({ userId: { toString: () => A }, store: "s3", key: "ai-generated/1-a.pdf", kind: "ai-file" }).userId, A);
    // A file sent on WhatsApp: the number as digits, with the account when it is known
    assert.deepEqual(storedFileRow({ userId: A, whatsappNumber: "+91 98000-00001", store: "r2", key: "whatsapp-files/1111-a.jpg", kind: "whatsapp-file" }),
        { userId: A, whatsappNumber: "919800000001", store: "r2", bucket: null, key: "whatsapp-files/1111-a.jpg", folder: false, kind: "whatsapp-file" });
    assert.equal(storedFileRow({ whatsappNumber: "919800000001", store: "r2", key: "whatsapp-files/1111-a.jpg", kind: "whatsapp-file" }).userId, null);
});

test("the bucket is kept only when it is not the store's usual one", () => {
    const row = (store, bucket) => storedFileRow({ userId: A, store, bucket, key: "ai-generated/1-a.pdf", kind: "ai-file" }).bucket;
    assert.equal(row("r2", "test-r2"), null);
    assert.equal(row("r2", "classgrid-bucket"), "classgrid-bucket");
    assert.equal(row("s3", "test-ai-files"), null);
    assert.equal(row("s3", "test-r2"), "test-r2", "the usual bucket of the other store is not this store's");
    assert.equal(row("s3", "  "), null);
    assert.equal(row("s3", undefined), null);
});

test("what is refused: no owner, another store, a link, a path that climbs, a whole top folder", () => {
    const why = (file) => { const row = storedFileRow({ userId: A, store: "r2", kind: "ai-file", ...file }); return row instanceof Error ? row.message : null; };
    assert.equal(why({ key: "ai-generated/1-a.pdf" }), null);
    assert.equal(why({ key: "ai-generated/1700000000400-notes..final.pdf" }), null, "two dots inside a name are a name");
    assert.equal(why({ key: "ai-generated/office/1-abc/दस्तावेज़ 1.docx" }), null, "any letters and spaces");

    assert.match(why({ userId: null, key: "ai-generated/1-a.pdf" }), /no account and no number/);
    assert.match(why({ userId: "not-an-id", key: "ai-generated/1-a.pdf" }), /no account and no number/);
    assert.match(why({ userId: null, whatsappNumber: "12345", key: "whatsapp-files/1-a.jpg" }), /no account and no number/);
    assert.match(why({ store: "disk", key: "ai-generated/1-a.pdf" }), /r2 or s3/);
    assert.match(why({ kind: "", key: "ai-generated/1-a.pdf" }), /no kind/);
    for (const key of [
        "", "ab", undefined, null, 7,
        "https://files.example/ai-generated/1-a.pdf", "HTTPS://files.example/a.pdf", "s3://bucket/ai-generated/1-a.pdf",
        "/ai-generated/1-a.pdf", "ai-generated/../1-a.pdf", "../ai-generated/1-a.pdf", "ai-generated/./1-a.pdf", "ai-generated/..",
        "ai-generated//1-a.pdf", "ai-generated\\1-a.pdf", "ai-generated/1-a\n.pdf", "ai-generated/1-a.pdf/",
        "x".repeat(1025),
    ]) assert.ok(why({ key }), `refused: ${String(key).slice(0, 40)}`);
    // A folder ends in "/" and is at least three names deep
    for (const key of ["ai-generated/", "ai-generated/pdf/", "ai-generated/pdf/1-abc", "whatsapp-files/", "ai-generated/pdf/../", "//x/"]) {
        assert.ok(why({ key, folder: true }), `refused as a folder: ${key}`);
    }
    assert.equal(why({ key: "ai-generated/pdf/1700000000200-def456/", folder: true }), null);
    assert.equal(storedFileProblem({ store: "s3", key: "ai-generated/pdf/1700000000200-def456/", folder: true }), null);
    assert.ok(storedFileProblem());
});

test("the write: a row when it can, false and a log line when it cannot, and never a throw", async (t) => {
    const logged = [];
    t.mock.method(console, "error", (...words) => logged.push(words.join(" ")));
    rows = [];
    assert.equal(await rememberStoredFile({ userId: A, store: "s3", key: "ai-generated/1-a.pdf", kind: "ai-file" }), true);
    assert.deepEqual(rows, [{ userId: A, whatsappNumber: null, store: "s3", bucket: null, key: "ai-generated/1-a.pdf", folder: false, kind: "ai-file" }]);
    assert.equal(logged.length, 0);

    // Nobody signed in (no account), a key that is not a plain path: no row, one line each
    assert.equal(await rememberStoredFile({ userId: undefined, store: "s3", key: "ai-generated/2-b.pdf", kind: "ai-file" }), false);
    assert.equal(await rememberStoredFile({ userId: A, store: "s3", key: "https://cdn.classgrid.in/ai-generated/2-b.pdf", kind: "ai-file" }), false);
    // The database refuses the row: the writer goes on
    databaseDown = true;
    assert.equal(await rememberStoredFile({ userId: A, store: "s3", key: "ai-generated/3-c.pdf", kind: "ai-file" }), false);
    databaseDown = false;
    // Called with nothing at all
    for (const nothing of [undefined, null, {}, "x", 7]) assert.equal(await rememberStoredFile(nothing), false);
    assert.equal(rows.length, 1);
    assert.equal(logged.length, 8);
    assert.match(logged[2], /not written down \(s3 ai-generated\/3-c\.pdf\): database cannot be reached/);
    // (a call that is not waited for leaves nothing unhandled: the promise it gives never rejects)
    assert.doesNotThrow(() => { rememberStoredFile(null); });
});

test("every writer writes the row down, with the store it really uploads to and the key it uploads under (read from the source)", () => {
    const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");
    const chat = read("../src/controllers/ai-chat.controller.js");
    const squeeze = (text) => text.replace(/\s+/g, " ");
    // The lines from a writer's row to its upload, with comments left out: the row is written just before the upload,
    // from the same variable the upload uses
    const between = (from, to, nth = 0) => {
        let at = -1;
        for (let i = 0; i <= nth; i += 1) at = chat.indexOf(from, at + 1);
        assert.ok(at >= 0, `found: ${from}`);
        const end = chat.indexOf(to, at);
        assert.ok(end > at && end - at < 900, `the upload follows the row: ${to}`);
        return squeeze(chat.slice(at, end + to.length).replace(/^\s*\/\/.*$/gm, ""));
    };

    // make_office_file and edit_office_file: R2 (uploadBufferToR2), the file's own folder
    const officeRow = 'rememberStoredFile({ userId: req.user?._id, store: "r2", key: `${folder}/`, folder: true, kind: "office-file" });';
    for (const nth of [0, 1]) {
        const lines = between("const folder = `ai-generated/office/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;", "await uploadBufferToR2(file.buffer, file.fileName, file.mime, `${folder}/${file.fileName}`);", nth);
        assert.ok(lines.includes(officeRow), `office writer ${nth + 1}`);
    }
    // edit_pdf: R2, one folder for all its files
    const pdf = between("const folder = `ai-generated/pdf/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;", "await uploadBufferToR2(f.buffer, f.fileName, f.mime, `${folder}/${f.fileName}`);");
    assert.ok(pdf.includes('rememberStoredFile({ userId: req.user?._id, store: "r2", key: `${folder}/`, folder: true, kind: "pdf" });'));
    // upload_file_to_cdn and upload_sandbox_file_to_cdn: the CDN bucket (S3 PutObject with the same key)
    for (const nth of [0, 1]) {
        const lines = between("const s3Key = `ai-generated/${Date.now()}-${safeFileName}`;", "Key: s3Key,", nth);
        assert.ok(lines.includes('rememberStoredFile({ userId: req.user?._id, store: "s3", key: s3Key, kind: "ai-file" });'), `CDN writer ${nth + 1}`);
        assert.ok(lines.includes("await s3Client.send(new PutObjectCommand({ Bucket: process.env.AWS_S3_ERP_BUCKET_NAME || 'erp-classgrid', Key: s3Key,"), "the bucket is the AI files' bucket");
    }
    // make_video: the video and each still frame, with the key uploadToCdn gives back (it uploads to the CDN bucket)
    const video = squeeze(chat.slice(chat.indexOf('const { key, url } = await uploadToCdn(video.mp4, name, "video/mp4");'), chat.indexOf("const libraryRoom = await libraryRoomFor(req.user, video.mp4.length)")).replace(/^\s*\/\/.*$/gm, ""));
    assert.ok(video.includes('rememberStoredFile({ userId: req.user?._id, store: "s3", key, kind: "video" });'));
    assert.ok(video.includes('const frame = await uploadToCdn(c.jpg, `frame-${c.at}s.jpg`, "image/jpeg"); rememberStoredFile({ userId: req.user?._id, store: "s3", key: frame.key, kind: "video-frame" });'));
    // (and each scene's picture of a video artifact, 2026-11-27)
    assert.ok(video.includes('const shot = await uploadToCdn(t.jpg, `scene-${t.at}s.jpg`, "image/jpeg"); rememberStoredFile({ userId: req.user?._id, store: "s3", key: shot.key, kind: "video-frame" });'));
    const render = read("../src/services/video-render.service.js");
    assert.ok(render.includes('await s3.send(new PutObjectCommand({ Bucket: process.env.AWS_S3_ERP_BUCKET_NAME || "erp-classgrid", Key: key, Body: buffer, ContentType: mimeType }));'));
    assert.ok(render.includes("return { key, url:"));
    // generateImage: R2, the picture's key
    const picture = between("const imageKey = `ai-generated/image-${Date.now()}.${imageExt}`;", "`generated-${Date.now()}.${imageExt}`,");
    assert.ok(picture.includes('rememberStoredFile({ userId: req.user?._id, store: "r2", key: imageKey, kind: "picture" });'));
    assert.ok(picture.includes("await uploadBufferToR2( imageBuffer,"));
    assert.ok(squeeze(chat).includes("const r2Url = await uploadBufferToR2( imageBuffer, `generated-${Date.now()}.${imageExt}`, imageMime, imageKey );"), "the picture is uploaded under the key written down");
    // No writer of these kinds is left without a row: as many rows as uploads
    assert.equal((chat.match(/rememberStoredFile\(\{/g) || []).length, 9);
    assert.equal((chat.match(/`ai-generated\//g) || []).length, 6, "a new ai-generated writer needs a row too: add it here");

    // WhatsApp: R2 through r2.service.js, in the bucket that file names; the readers pass the account on
    const inbox = read("../src/services/whatsapp-inbox.service.js");
    assert.ok(squeeze(inbox).includes('const { uploadUrl, publicUrl } = await generateR2UploadUrl(name, mime); // (the bucket as r2.service.js generateR2UploadUrl names it; the row leaves it out when it is the usual one) rememberStoredFile({ userId: owner, whatsappNumber: number, store: "r2", bucket: process.env.R2_BUCKET_NAME || "classgrid-bucket", key: name, kind: "whatsapp-file" });'));
    assert.ok(read("../src/services/r2.service.js").includes('const bucketName = process.env.R2_BUCKET_NAME || "classgrid-bucket";'));
    assert.equal((inbox.match(/, number, owner\);/g) || []).length, 6, "every reader hands the number and the account to the file saver");
    assert.ok(chat.includes("await waitForReply(phone, since, minutes * 60 * 1000, stop.signal, req.user?._id);"));
    assert.equal((chat.match(/readRecentMessages\(phone, (20|count), req\.user\?\._id\)/g) || []).length, 2);
    const tasks = read("../src/services/agent-task.service.js");
    assert.ok(tasks.includes("await messagesSince(number, callStartedAt || Date.now(), user._id)"));
    assert.ok(tasks.includes("await messagesByIds(number, ids, user?._id);"));
});
