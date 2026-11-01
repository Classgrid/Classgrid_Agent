// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
// A song the owner downloaded with the AI's download_song tool (owner's emails only, personal use).
// The audio sits in R2 under an unguessable key and is only played through a short-lived signed link.
import mongoose from "mongoose";

const savedSongSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    videoId: { type: String, required: true },
    title: { type: String, default: "" },
    channel: { type: String, default: "" },
    durationSec: { type: Number, default: 0 },
    thumbnail: { type: String, default: "" },
    r2Key: { type: String, required: true },
    mimeType: { type: String, default: "audio/mp4" },
    sizeBytes: { type: Number, default: 0 },
}, { timestamps: true });

savedSongSchema.index({ userId: 1, videoId: 1 });

export default mongoose.models.SavedSong || mongoose.model("SavedSong", savedSongSchema);
