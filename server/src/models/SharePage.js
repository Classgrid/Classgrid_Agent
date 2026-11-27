// A small web page the AI publishes for a user, opened at chat.classgrid.in/p/<id>, or a video the AI made
// (kind "video", 2026-11-27): the same link, sharing and comments, with the video in place of the HTML.
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
    // Only on a video (kind "video"), all left out on a page: the moment of the video the comment is on (seconds),
    // the end of a stretch of time, and a box drawn on the frame (each 0-1, a part of the frame's width or height)
    time: { type: Number },
    timeEnd: { type: Number },
    area: { type: new mongoose.Schema({ x: Number, y: Number, w: Number, h: Number }, { _id: false }) },
    // Only on a video: the version of the video the comment was written on (a comment from before 2026-11-27 has none)
    version: { type: Number },
}, { _id: false });

// A video the AI made with make_video (kind "video"): the MP4 and its pictures on cdn.classgrid.in, and its scenes
const sceneSchema = new mongoose.Schema({
    title: { type: String, default: "", maxlength: 200 },
    start: { type: Number, default: 0 }, // seconds
    end: { type: Number, default: 0 },
    thumb: { type: String, default: "" }, // a JPG of the scene
}, { _id: false });

const videoSchema = new mongoose.Schema({
    url: { type: String, required: true }, // the MP4
    poster: { type: String, default: "" }, // a JPG
    stills: { type: [String], default: [] },
    seconds: { type: Number, default: 0 },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    fps: { type: Number, default: 0 },
    scenes: { type: [sceneSchema], default: [] },
    // The HTML the video was recorded from, so the AI can change it later (never sent to the screens)
    sourceHtml: { type: String, default: "" },
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
    // "page": a web page in HTML; "video": a video the AI made (make_video). A page from before kinds is a page.
    kind: { type: String, enum: ["page", "video"], default: "page" },
    html: { type: String, required: function () { return (this.kind || "page") === "page"; } },
    video: { type: videoSchema, default: undefined },
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
