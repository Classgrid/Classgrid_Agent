// One row per file (or folder of files) the server stored for a person under a name that does not say whose it is:
// an office file or edited PDF the AI made, a picture it made, a file or video it put on the CDN, a video's still
// frames, a file the person sent on WhatsApp (services/stored-files.service.js rememberStoredFile, called where each
// file is stored). Until 2026-11-25 nothing kept this, so Delete Account could not find these files and they stayed
// for ever. The rows exist only so deletion can find the files (services/account-deletion.service.js): they are never
// listed or shown anywhere in the product.
import mongoose from "mongoose";

const storedFileSchema = new mongoose.Schema({
    // Whose file it is. A file sent on WhatsApp is kept by number: `whatsappNumber` is always set for it (digits
    // only, with the country code), and `userId` too when the account reading the inbox was known. A row with only
    // a number is deleted with an account only when that number is the account's alone.
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    whatsappNumber: { type: String, default: null },
    // Where the file is: "r2" (Cloudflare R2, config/r2Client.js) or "s3" (the CDN bucket, config/s3Client.js)
    store: { type: String, enum: ["r2", "s3"], required: true },
    // The bucket, only when it is not the store's usual one (R2: R2_BUCKET_NAME; S3: AI_FILES_BUCKET). null = the usual one.
    bucket: { type: String, default: null },
    // The object's key, or with `folder` the folder's prefix (it ends in "/": every object under it is the person's)
    key: { type: String, required: true },
    folder: { type: Boolean, default: false },
    // What it is, in a word: "office-file", "pdf", "picture", "ai-file", "video", "video-frame", "whatsapp-file"
    kind: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

storedFileSchema.index({ userId: 1 });
storedFileSchema.index({ whatsappNumber: 1 }, { sparse: true });
// (deletion asks whether another row still points to the same object)
storedFileSchema.index({ store: 1, key: 1 });

export default mongoose.models.StoredFile || mongoose.model("StoredFile", storedFileSchema);
