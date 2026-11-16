// A small web page the AI publishes for a user, opened at chat.classgrid.in/p/<id>.
// A page the AI published (chat.classgrid.in/p/<id>). It is shared like a live doc (owner, 2026-11-16): people
// added by email with a role (members), access requests, and a link with a role. A page from before roles has no
// linkRole: its link lets people open it and comment, as it always did.
import mongoose from "mongoose";

const ROLES = ["viewer", "commenter", "editor"];

const commentSchema = new mongoose.Schema({
    id: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    text: { type: String, required: true, maxlength: 5000 },
    // The words of the page the comment is on (empty: a comment on the page as a whole)
    quote: { type: String, default: "", maxlength: 2000 },
    at: { type: Date, default: Date.now },
    resolved: { type: Boolean, default: false },
    // Set on a reply (the comment it answers) and on replies written by the AI
    replyTo: { type: String, default: null },
    byAi: { type: Boolean, default: false },
}, { _id: false });

const memberSchema = new mongoose.Schema({
    id: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    email: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, default: "" },
    role: { type: String, enum: ROLES, default: "viewer" },
    addedAt: { type: Date, default: Date.now },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { _id: false });

const requestSchema = new mongoose.Schema({
    id: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, default: "" },
    wants: { type: String, enum: ROLES, default: "viewer" },
    at: { type: Date, default: Date.now },
    emailedAt: { type: Date, default: null }, // when the owner was last emailed about it
}, { _id: false });

const sharePageSchema = new mongoose.Schema({
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, default: "Untitled page", maxlength: 200 },
    html: { type: String, required: true },
    visibility: { type: String, enum: ["private", "link"], default: "private" },
    linkRole: { type: String, enum: ROLES, default: "commenter" },
    members: { type: [memberSchema], default: [] },
    requests: { type: [requestSchema], default: [] },
    views: { type: Number, default: 0 }, // times it was opened (one person counts once in half an hour)
    pinnedBy: { type: [mongoose.Schema.Types.ObjectId], default: [] }, // the people who pinned it in their own list
    comments: { type: [commentSchema], default: [] },
    // Small shared store the page can use (window.classgrid.data)
    data: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
    versions: { type: Number, default: 1 },
}, { timestamps: true });

sharePageSchema.index({ owner: 1, updatedAt: -1 });
sharePageSchema.index({ "members.userId": 1 });
sharePageSchema.index({ "members.email": 1 });

export default mongoose.models.SharePage || mongoose.model("SharePage", sharePageSchema);
