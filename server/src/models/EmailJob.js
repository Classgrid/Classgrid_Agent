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

/**
 * Classgrid — EmailJob Model
 *
 * MongoDB-backed email job queue. Each document represents a single
 * email to be sent. The background worker picks up pending jobs,
 * sends them, and updates status. Failed jobs are retried with
 * exponential backoff (max 3 attempts).
 */

import mongoose from "mongoose";

const emailJobSchema = new mongoose.Schema(
    {
        // ── Recipient & Content ─────────────────────────
        to: { type: String, required: true },
        subject: { type: String, required: true },
        html: { type: String, required: true },
        text: { type: String, default: "" },

        // ── Classification ──────────────────────────────
        type: {
            type: String,
            enum: [
                "announcement",
                "quiz",
                "notes",
                "join_request",
                "join_approved",
                "attendance",
                "absence",
                "support_ticket_reply",
                "support_ticket_new",
                "talk_request_new",
                "talk_request_reply",
                "domain_change",
                "demo_meeting_scheduled",
                "demo_meeting_scheduled_internal",
                "demo_provisioning_onboarding",
                "other",
            ],
            default: "other",
        },

        // ── References ──────────────────────────────────
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        classroomId: { type: mongoose.Schema.Types.ObjectId, ref: "Classroom" },
        organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization" },

        // ── Sender Channel ──────────────────────────────
        // Routes email through the correct provider/sender:
        //   "support"      → Brevo → support@classgrid.in
        //   "noreply"      → Brevo → noreply@classgrid.in (default)
        //   "billing"      → Brevo → billing@classgrid.in
        //   "notification" → Resend → notification@updates.classgrid.in
        channel: {
            type: String,
            enum: ["support", "noreply", "billing", "notification", null],
            default: null,
        },

        // ── Job State ───────────────────────────────────
        status: {
            type: String,
            enum: ["pending", "processing", "sent", "failed"],
            default: "pending",
        },
        attempts: { type: Number, default: 0 },
        maxAttempts: { type: Number, default: 3 },
        error: { type: String, default: null },
        nextRetryAt: { type: Date, default: Date.now },
        processedAt: { type: Date, default: null },
    },
    {
        timestamps: true, // adds createdAt, updatedAt
    }
);

// ── Indexes for worker queries & monitoring ─────────
emailJobSchema.index({ status: 1, nextRetryAt: 1 });
emailJobSchema.index({ classroomId: 1, type: 1, createdAt: -1 });
emailJobSchema.index({ userId: 1, createdAt: -1 });
emailJobSchema.index({ organizationId: 1, createdAt: -1 });
emailJobSchema.index({ type: 1 });

const EmailJob = mongoose.model("EmailJob", emailJobSchema);

export default EmailJob;
