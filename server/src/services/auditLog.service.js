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

import AdminAuditLog from "../models/AdminAuditLog.js";
import Organization from "../models/Organization.js";

/**
 * logAdminAction — fire-and-forget audit writer.
 * Call after any successful admin mutation.
 *
 * SECURITY: actorId, actorName, actorRole, organization_id
 * are ALWAYS derived from req.user — never from request body.
 *
 * @param {object} req         - Express request (provides user + IP + UA)
 * @param {string} action      - Action enum value from AdminAuditLog schema
 * @param {string} targetType  - Type of entity affected
 * @param {string|null} targetId   - ID of affected entity
 * @param {string} targetName  - Human-readable name of affected entity
 * @param {object} metadata    - Optional diff info { oldRole, newRole, etc. }
 * @param {string|null} forceOrgId - Optional override for organization_id
 * @param {string} status      - 'success' | 'failure' | 'pending'
 * @param {number} durationMs  - Optional override for duration, otherwise auto-calc from req._startTime
 */
export async function logAdminAction(req, action, targetType, targetId = null, targetName = "", metadata = {}, forceOrgId = null, status = "success", durationMs = null) {
    try {
        let actor = req.user;
        if (!actor) {
            // Handle system automated webhooks
            actor = {
                _id: null,
                name: "SYSTEM (Webhook)",
                role: "system"
            };
        }

        let orgId = actor.organization_id || forceOrgId;

        // Auto-resolve organization if missing (common for Super Admins)
        if (!orgId && targetId) {
            if (targetType === "organization") {
                orgId = targetId;
            } else if (targetType === "user" || targetType === "faculty" || targetType === "student") {
                const User = (await import("../models/User.js")).default;
                const targetUser = await User.findById(targetId).select("organization_id").lean();
                if (targetUser) orgId = targetUser.organization_id;
            } else if (targetType === "users") {
                // For bulk user actions, targetId is usually the orgId
                orgId = targetId;
            } else if (targetType === "classroom") {
                const Classroom = (await import("../models/Classroom.js")).default;
                const targetClass = await Classroom.findById(targetId).select("organization_id").lean();
                if (targetClass) orgId = targetClass.organization_id;
            }
        }

        let orgName = "";
        let orgType = null;
        if (orgId) {
            const org = await Organization.findById(orgId).select("name org_type").lean();
            orgName = org?.name || "";
            orgType = org?.org_type || null;
        }

        const ip =
            req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
            req.socket?.remoteAddress ||
            "";

        const userAgent = (req.headers["user-agent"] || "").substring(0, 300);

        let finalDuration = durationMs;
        if (finalDuration === null && req._startTime) {
            finalDuration = Date.now() - new Date(req._startTime).getTime();
        }

        await AdminAuditLog.create({
            actorId: actor._id,
            actorName: actor.name || actor.email || "Unknown",
            actorRole: actor.role,
            organization_id: orgId || null,
            organizationName: orgName,
            orgType: orgType,
            action,
            targetId: targetId ? String(targetId) : null,
            targetName: String(targetName || ""),
            targetType,
            metadata,
            ip,
            userAgent,
            durationMs: finalDuration || 0,
            status,
            timestamp: new Date(),
        });
    } catch (err) {
        // Audit log failure must NEVER break the main flow
        console.error("[AuditLog] Failed to write audit log:", err.message);
    }
}
