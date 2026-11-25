// Writes down whose file it is when the server stores a file under a name that does not say so (models/StoredFile.js),
// so Delete Account can find it later (services/account-deletion.service.js). Called at each such writer:
//   - an office file the AI made or edited, and the files of an edited PDF (R2, "ai-generated/office/..." and the
//     folder "ai-generated/pdf/<time>-<random>/"): ai-chat.controller.js make_office_file, edit_office_file, edit_pdf
//   - a picture the AI made (R2, "ai-generated/image-<time>"): ai-chat.controller.js generateImage
//   - a file or a video the AI put on the CDN, and a video's still frames (the CDN bucket, "ai-generated/<time>-<name>"):
//     ai-chat.controller.js upload_file_to_cdn, upload_sandbox_file_to_cdn, make_video
//   - a file the person sent on WhatsApp (R2, "whatsapp-files/<random>-<name>"): whatsapp-inbox.service.js mediaToCdn
// The write is never waited for and never throws: a file is stored and the answer goes on whether or not its row could
// be written. A row that could not be written is logged (that file can then not be found by a deletion).
import StoredFile from "../models/StoredFile.js";
import { R2_BUCKET_NAME } from "../config/r2Client.js";
import { AI_FILES_BUCKET } from "../config/s3Client.js";

const ACCOUNT_ID = /^[a-f0-9]{24}$/i;
// The bucket a row leaves out (models/StoredFile.js `bucket`)
const USUAL_BUCKET = { r2: R2_BUCKET_NAME, s3: AI_FILES_BUCKET };

/**
 * Why this store and key cannot be written down or deleted, or null when they can. A key is a plain path inside the
 * bucket: never a link, never with a ".." or "." part or a leading "/" (a name such as "notes..final.pdf" is fine).
 * A folder ends in "/" and is at least three names deep ("ai-generated/pdf/<time>-<random>/"), so a folder row can
 * never name a whole top folder.
 */
export function storedFileProblem({ store, key, folder = false } = {}) {
    if (store !== "r2" && store !== "s3") return "the store must be r2 or s3";
    if (typeof key !== "string" || key.length < 3 || key.length > 1024) return "the key must be a path";
    // (no link, no ".." part, no "\", no "//", nothing but printable characters)
    const parts = key.replace(/\/$/, "").split("/");
    if (/^[a-z][a-z0-9+.-]*:/i.test(key) || key.startsWith("/") || key.includes("\\") || /[\u0000-\u001f\u007f]/.test(key)
        || parts.some((part) => part === "" || part === "." || part === "..")) return "the key must be a plain path";
    if (folder) {
        if (!key.endsWith("/")) return "a folder must end in /";
        if (key.split("/").filter(Boolean).length < 3) return "a folder must be at least three names deep";
    } else if (key.endsWith("/")) {
        return "a file's key cannot end in /";
    }
    return null;
}

/** The row for a stored file, or an Error saying why there is none (no owner, a key that is not a plain path). */
export function storedFileRow({ userId = null, whatsappNumber = null, store, bucket = null, key, folder = false, kind } = {}) {
    const problem = storedFileProblem({ store, key, folder });
    if (problem) return new Error(problem);
    const account = userId && ACCOUNT_ID.test(String(userId)) ? String(userId) : null;
    const number = String(whatsappNumber || "").replace(/\D/g, "");
    if (!account && !(number.length >= 8 && number.length <= 15)) return new Error("no account and no number to keep it under");
    if (typeof kind !== "string" || !kind) return new Error("no kind");
    const named = typeof bucket === "string" && bucket.trim() ? bucket.trim() : null;
    return {
        userId: account,
        whatsappNumber: number.length >= 8 && number.length <= 15 ? number : null,
        store,
        bucket: named && named !== USUAL_BUCKET[store] ? named : null,
        key,
        folder: !!folder,
        kind,
    };
}

/**
 * Writes the row. Call it without `await` where the file is stored: it resolves true when the row is written and
 * false when it is not, and never rejects or throws.
 */
export function rememberStoredFile(file) {
    return Promise.resolve()
        .then(async () => {
            const row = storedFileRow(file);
            if (row instanceof Error) throw row;
            await StoredFile.create(row);
            return true;
        })
        .catch((e) => {
            console.error(`[stored files] not written down (${file?.store || "?"} ${file?.key || "?"}):`, e?.message || e);
            return false;
        });
}
