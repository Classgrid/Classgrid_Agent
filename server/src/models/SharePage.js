// A small web page the AI publishes for a user, opened at chat.classgrid.in/p/<id>.
import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
    id: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    text: { type: String, required: true, maxlength: 5000 },
    at: { type: Date, default: Date.now },
    resolved: { type: Boolean, default: false },
    // Set on a reply (the comment it answers) and on replies written by the AI
    replyTo: { type: String, default: null },
    byAi: { type: Boolean, default: false },
}, { _id: false });

const sharePageSchema = new mongoose.Schema({
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, default: "Untitled page", maxlength: 200 },
    html: { type: String, required: true },
    visibility: { type: String, enum: ["private", "link"], default: "private" },
    comments: { type: [commentSchema], default: [] },
    // Small shared store the page can use (window.classgrid.data)
    data: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
    versions: { type: Number, default: 1 },
}, { timestamps: true });

sharePageSchema.index({ owner: 1, updatedAt: -1 });

export default mongoose.models.SharePage || mongoose.model("SharePage", sharePageSchema);
