/*
 * ─────────────────────────────────────────────────────────
 * 🚫 NO BLOCKS RULE (owner's order, 2026-10-23) 🚫
 * Claude and every AI model are FORBIDDEN to add any kind of block, restriction, allowlist or
 * "only for X" rule (owner-only, super-admin-only, email checks, test-number-only, role checks)
 * unless the owner explicitly asks for that exact limit.
 * Every feature is for ALL users. Project Mode is for all users, never super-admin only.
 * ─────────────────────────────────────────────────────────
 */
/*
 * ─────────────────────────────────────────────────────────
 * 🚫 NO DISK BLAME RULE (owner's order, 2026-10-27) 🚫
 * Claude and every AI model are FORBIDDEN to say an error comes from a full disk or low disk space.
 * The owner's disks are not full. Never guess the cause of an error: read the real logs and code first,
 * and only name a cause that was actually seen.
 * ─────────────────────────────────────────────────────────
 */
/*
 * ─────────────────────────────────────────────────────────
 * 🚨 ERP SHUT DOWN 🚨
 * The Classgrid ERP is shut down and will never work or be worked on again.
 * The org admin dashboard and every dashboard other than chat.classgrid.in and the
 * super admin dashboard are banned, and so is all ERP backend code.
 * Any issue or bug in the ERP or the org admin dashboard is banned too: do not look
 * for it, report it or fix it.
 * Do not build, fix, test or talk about ERP features. Only chat.classgrid.in and the
 * super admin dashboard are live.
 * ─────────────────────────────────────────────────────────
 */
// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
/*
 * =========================================================================================
 * 🚨 CRITICAL AI & SYSTEM RULE 🚨
 * NO FRONTEND GITHUB ACTIONS: NEVER create yaml files that build/deploy the frontend to EC2.
 * The frontend is hosted 100% on Vercel. EC2 is only for the backend.
 * =========================================================================================
 */

/*
 * =========================================================================================
 * STRICT SECURITY POLICY:
 * NO ONE CAN EVER CHANGE THE ORGANIZATION TYPE FROM THE FRONTEND OR BACKEND.
 * NEVER ADD A DROPDOWN OR OPTION TO CHANGE IT ANYWHERE IN THE CODEBASE.
 * NO MEANS NO. THIS IS A FIXED PLATFORM RULE.
 * =========================================================================================
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 CRITICAL AI AND SYSTEM RULES 🚨
 * 1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
 * 2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
 * 3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 NAMING CONVENTION RULE 🚨
 * 1. "CLASSGRID PLATFORM" is strictly the REPO NAME.
 * 2. chat.classgrid.in (Classgrid AI) is the actual PRODUCT. The ERP is shut down.
 * 3. NEVER use "Classgrid Platform" anywhere in the frontend UI or user-facing text.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 HOSTING & ARCHITECTURE RULE 🚨
 * 1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
 * 2. FRONTEND IS HOSTED ON VERCEL
 * ─────────────────────────────────────────────────────────
 */

import mongoose from "mongoose";

// Sub-schemas for structured data
const ticketEventSchema = new mongoose.Schema({
    type: { type: String, enum: ['ticketCreated', 'statusChanged', 'priorityChanged', 'categoryChanged', 'assigned', 'unassigned', 'adminReply', 'userReply', 'internalNote', 'attachmentAdded', 'resolved', 'reopened'] },
    label: { type: String },
    from: { type: mongoose.Schema.Types.Mixed },
    to: { type: mongoose.Schema.Types.Mixed },
    actorName: { type: String },
    actorRole: { type: String },
    createdAt: { type: Date, default: Date.now }
}, { _id: false });

/**
 * SupportTicket — In-app support system.
 * Users raise tickets, Super Admin / Support team responds.
 */
const supportTicketSchema = new mongoose.Schema({
    subject: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 10000000 // Increased significantly to support embedded base64 images from rich text editor
    },
    attachments: [{
        type: mongoose.Schema.Types.Mixed // Mixed to support legacy String URLs and new structured attachment objects
    }],
    category: {
        type: String,
        default: "general"
    },
    // Priority for internal tracking
    priority: {
        type: String,
        enum: ["low", "medium", "high", "critical"],
        default: "medium"
    },
    // Ticket lifecycle
    status: {
        type: String,
        enum: ["open", "in_progress", "waiting_on_user", "resolved", "closed", "reopened"],
        default: "open"
    },
    // Who raised the ticket (null for public/marketing submissions)
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
        index: true
    },
    submitterEmail: {
        type: String,
        trim: true
    },
    submitterName: {
        type: String,
        trim: true
    },
    submitterRole: {
        type: String,
        trim: true,
        default: ""
    },
    // Organization context
    organization_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        default: null
    },
    institution: {
        type: String,
        trim: true,
        default: ""
    },
    // Who is handling this ticket (Super Admin / Support Agent)
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    // Conversation thread (back and forth replies)
    messages: [{
        author: { type: String, trim: true },
        role: { type: String, enum: ["user", "admin"], required: true },
        body: { type: String, required: true },
        date: { type: Date, default: Date.now },
        footer: { type: String, default: "" },
        attachments: [{ type: mongoose.Schema.Types.Mixed }], // Mixed to support legacy and new formats
        avatar: { type: String, default: "" },
        orgName: { type: String, default: "" },
        orgLogo: { type: String, default: "" },
        authorRole: { type: String, default: "" }
    }],
    replies: [{
        author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        authorName: String,
        authorRole: String,
        message: { type: String, required: true },
        attachments: [{ type: mongoose.Schema.Types.Mixed }], // Mixed format
        createdAt: { type: Date, default: Date.now }
    }],
    lastComment: {
        type: Date,
        default: Date.now,
        index: true
    },
    // Resolution
    resolvedAt: {
        type: Date,
        default: null
    },
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    // New Advanced Features
    events: [ticketEventSchema],
    firstResponseDueAt: { type: Date },
    nextResponseDueAt: { type: Date },
    lastAdminReplyAt: { type: Date },
    lastUserReplyAt: { type: Date },
    slaStatus: { type: String, enum: ["ok", "due_soon", "breached"], default: "ok" },
    satisfaction: {
        rating: { type: Number, min: 1, max: 5 },
        comment: { type: String },
        createdAt: { type: Date }
    }
}, { timestamps: true });

supportTicketSchema.index({ status: 1, createdAt: -1 });
supportTicketSchema.index({ submittedBy: 1, createdAt: -1 });

export default mongoose.models.SupportTicket ||
    mongoose.model("SupportTicket", supportTicketSchema);
