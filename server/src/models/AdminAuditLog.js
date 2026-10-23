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
 * AdminAuditLog — immutable record of every admin action.
 * Actor fields are ALWAYS derived server-side from req.user.
 * NEVER accept actorName / actorRole / organization_id from the request body.
 */
const adminAuditLogSchema = new mongoose.Schema(
    {
        // ── Actor (who did it) ──────────────────────────────────
        actorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false, // system events might not have a user
        },
        actorName: { type: String, required: true },
        actorRole: {
            type: String,
            enum: ["org_admin", "super_admin", "system"],
            required: true,
        },

        // ── Scope ──────────────────────────────────────────────
        organization_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            default: null,
        },
        organizationName: { type: String, default: "" },
        orgType: {
            type: String,
            enum: ["K12", "HIGHER_ED", "COACHING", "CORPORATE", "DEMO", "TRIAL"],
            default: null,
        },

        // ── Action ─────────────────────────────────────────────
        action: {
            type: String,
            required: true,
            enum: [
                // ── Org Admin actions ───────────────────────────
                "add_faculty",
                "remove_faculty",
                "remove_student",
                "remove_member",
                "invite_staff",
                "resend_invite",
                "change_role",
                "bulk_role_update",
                "bulk_suspend",
                "bulk_reactivate",
                "bulk_delete",
                "archive_classroom",
                "restore_classroom",
                "approve_note",
                "reject_note",
                "create_announcement",
                "delete_announcement",
                "approve_org",
                "reject_org",
                "suspend_org",
                "block_org",
                "reactivate_org",
                "delete_org",
                "suspend_user",
                "block_user",
                "delete_user",
                "reactivate_user",
                "change_password",
                "login_as_demo",
                "update_branding",
                "update_domains",
                "update_org_type",
                "update_academic_config",
                "schedule_promotion",
                "promote_students",
                "regenerate_org_code",
                "clear_subdomain",
                "update_subdomain",
                "update_custom_domain_settings",
                "register_custom_domain",
                "change_custom_domain",
                "verify_custom_domain",
                "delete_custom_domain",
                // ── Attendance security actions ─────────────────
                "attendance_suspicious",
                "attendance_manual_override",
                // ── Super Admin / God Mode actions ─────────────
                "org.suspend",
                "org.activate",
                "org.delete",
                "org.impersonate",
                "user.ban",
                "user.unban",
                "user.force_logout",
                "user.role_change",
                "user.reset_password",
                "user.gdpr_export",
                "user.gdpr_erase",
                "subscription.update",
                "feature_flag.toggle",
                "feature_flag.kill_all",
                "platform.broadcast",
                "UPDATE_BILLING",
                "VIEW",
                "WEBHOOK_EVENT"
            ],
        },

        // ── Target (what was affected) ─────────────────────────
        targetId: { type: String, default: null },
        targetName: { type: String, default: "" },
        targetType: {
            type: String,
            enum: [
                "faculty", "student", "classroom", "note", "announcement",
                "organization", "user", "users", "academic", "demo", "AttendanceSession",
                "AttendanceRecord", "feature_flag", "subscription", "platform", "billing"
            ],
            required: true,
        },

        // ── State snapshot (for rollback) ───────────────────────
        previousState: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },

        // ── Extra diff metadata (old → new role, etc.) ─────────
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },

        // ── Rollback tracking ───────────────────────────────────
        rollbackStatus: {
            type: String,
            enum: ["none", "rolled_back"],
            default: "none",
        },
        rolledBackBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        rolledBackAt: { type: Date, default: null },

        // ── Request context (security & performance) ────────────
        ip: { type: String, default: "" },
        userAgent: { type: String, default: "" },
        durationMs: { type: Number, default: 0 },
        status: { type: String, enum: ["success", "failure", "pending"], default: "success" },

        // ── Timestamp (indexed for fast time-range queries) ────
        timestamp: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: false, // using custom `timestamp` field
    }
);

// Compound indexes for dashboard queries
adminAuditLogSchema.index({ organization_id: 1, timestamp: -1 });
adminAuditLogSchema.index({ actorId: 1, timestamp: -1 });
adminAuditLogSchema.index({ action: 1, timestamp: -1 });
adminAuditLogSchema.index({ rollbackStatus: 1, timestamp: -1 });

export default mongoose.models.AdminAuditLog ||
    mongoose.model("AdminAuditLog", adminAuditLogSchema);
