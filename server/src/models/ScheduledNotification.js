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

import mongoose from "mongoose";

/**
 * ScheduledNotification — Pre-schedule push notifications for festivals, events, maintenance, etc.
 * Super Admin can set these up once, and they fire automatically every year.
 * 
 * Examples:
 *   - "Happy Diwali! 🪔" → fires every year on Diwali date
 *   - "System Maintenance at 2 AM" → fires once on a specific date
 *   - "Happy Independence Day! 🇮🇳" → fires every Aug 15
 */
const scheduledNotificationSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    body: {
        type: String,
        required: true,
        trim: true
    },
    // Who receives this?
    target: {
        type: String,
        enum: [
            "global",         // ALL users across ALL organizations
            "all_org_admins",  // Only Org Admins
            "all_super_admins", // Only Super Admins
            "all_students",    // Only Students globally
            "all_faculty",     // Only Faculty globally
            "all_department_admins", // Existing HOD users acting as department admins
            "active_orgs",     // Users attached to active organizations
            "specific_org"     // Only a specific organization
        ],
        default: "global"
    },
    // If target is "specific_org", which org?
    targetOrgId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        default: null
    },
    // When should it fire?
    scheduledAt: {
        type: Date,
        required: true,
        index: true
    },
    // Does it repeat every year? (For festivals)
    isRecurring: {
        type: Boolean,
        default: false
    },
    // Category for filtering
    category: {
        type: String,
        enum: ["festival", "maintenance", "announcement", "update", "marketing"],
        default: "announcement"
    },
    // Push notification deep link
    deepLink: {
        type: String,
        default: ""
    },
    // Should we also send email along with push?
    sendEmail: {
        type: Boolean,
        default: false
    },
    // Execution status
    status: {
        type: String,
        enum: ["pending", "processing", "sent", "failed", "cancelled"],
        default: "pending"
    },
    sentAt: {
        type: Date,
        default: null
    },
    sentCount: {
        type: Number,
        default: 0
    },
    // Who created this scheduled notification
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, { timestamps: true });

scheduledNotificationSchema.index({ status: 1, scheduledAt: 1 });

export default mongoose.models.ScheduledNotification || 
    mongoose.model("ScheduledNotification", scheduledNotificationSchema);
