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

import express from "express";
import {
    getPendingOrganizations,
    approveOrganization,
    rejectOrganization,
    suspendOrganization,
    blockOrganization,
    reactivateOrganization,
    deleteOrganization,
    resetOrgAdminPassword,
    suspendUser,
    deleteUser,
    reactivateUser,
    createSuperAdmin,
    getPendingNotes,
    approveNote,
    rejectNote,
    getOrgInsight,
    getApiMetrics,
    getGlobalStudentPerformance,
    getGlobalAuditLog,
    getDashboardOverview,
    getDashboardOrganizations,
    getDashboardUsers,
    updateOrgDomains,
    getOrgAnalytics,
    getRecentActivity,
    exportUsers,
} from "../controllers/admin.controller.js";
import { handleManualProvisioning } from "../controllers/provisioning.controller.js";
import {
    getAllOrganizations,
    getAllUsers
} from "../controllers/organization.controller.js";
import {
    getSystemSettings,
    updateSystemSettings,
    getOrgUsage,
    getEmailAnalytics,
    getDashboardAnalytics,
    getSystemActivity,
    getGlobalStorageUsage
} from "../controllers/admin-analytics.controller.js";
import { isAuthenticated, requireRole } from "../middleware/auth.middleware.js";
import { adminLimiter } from "../middleware/rateLimiter.js";
import { getOrganizationConfig, updateOrganizationConfig } from "../controllers/org-configuration.controller.js";

const router = express.Router();

// Rate limit all admin routes
router.use(adminLimiter);

// Pending org management
router.get("/pending-organizations", isAuthenticated, requireRole("super_admin"), getPendingOrganizations);
router.post("/approve-organization/:id", isAuthenticated, requireRole("super_admin"), approveOrganization);
router.post("/reject-organization/:id", isAuthenticated, requireRole("super_admin"), rejectOrganization);

// Global data (super admin only)
router.get("/all-organizations", isAuthenticated, requireRole("super_admin"), getAllOrganizations);
router.get("/all-users", isAuthenticated, requireRole("super_admin"), getAllUsers);

// Organization Actions (super admin only)
router.post("/suspend-organization/:id", isAuthenticated, requireRole("super_admin"), suspendOrganization);
router.post("/block-organization/:id", isAuthenticated, requireRole("super_admin"), blockOrganization);
router.post("/reactivate-organization/:id", isAuthenticated, requireRole("super_admin"), reactivateOrganization);
router.delete("/delete-organization/:id", isAuthenticated, requireRole("super_admin"), deleteOrganization);
router.post("/reset-admin-password/:id", isAuthenticated, requireRole("super_admin"), resetOrgAdminPassword);

// User Actions
router.post("/suspend-user/:id", isAuthenticated, requireRole("super_admin", "org_admin"), suspendUser);
router.post("/reactivate-user/:id", isAuthenticated, requireRole("super_admin", "org_admin"), reactivateUser);
router.delete("/delete-user/:id", isAuthenticated, requireRole("super_admin"), deleteUser);

// Create super admin (god user only)
router.post("/create-super-admin", isAuthenticated, requireRole("super_admin"), createSuperAdmin);

// Notes Review Actions (super admin only)
router.get("/notes/pending", isAuthenticated, requireRole("super_admin"), getPendingNotes);
router.post("/notes/:id/approve", isAuthenticated, requireRole("super_admin"), approveNote);
router.post("/notes/:id/reject", isAuthenticated, requireRole("super_admin"), rejectNote);

// â”€â”€ NEW: System Settings & Analytics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get("/system-settings", isAuthenticated, requireRole("super_admin"), getSystemSettings);
router.post("/system-settings", isAuthenticated, requireRole("super_admin"), updateSystemSettings);

router.get("/usage/:orgId", isAuthenticated, requireRole("super_admin"), getOrgUsage);
router.get("/org/:orgId/config", isAuthenticated, requireRole("super_admin"), getOrganizationConfig);
router.put("/org/:orgId/config", isAuthenticated, requireRole("super_admin"), updateOrganizationConfig);
router.get("/email-analytics", isAuthenticated, requireRole("super_admin"), getEmailAnalytics);
router.get("/dashboard-analytics", isAuthenticated, requireRole("super_admin"), getDashboardAnalytics);
router.get("/global-storage", isAuthenticated, requireRole("super_admin"), getGlobalStorageUsage);

// â”€â”€ Org Insight & API Metrics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get("/org-insight/:orgId", isAuthenticated, requireRole("super_admin"), getOrgInsight);
router.get("/api-metrics", isAuthenticated, requireRole("super_admin"), getApiMetrics);
router.get("/system-activity", isAuthenticated, requireRole("super_admin"), getSystemActivity);

// â”€â”€ Email Queue Monitoring (super admin only) â”€â”€â”€â”€â”€
router.get("/email-stats", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
        const { getEmailStats } = await import("../services/email-queue.service.js");
        const stats = await getEmailStats();
        res.json(stats);
    } catch (err) {
        console.error("[Admin] Email stats error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

router.get("/email-logs", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
        const { getEmailLogs } = await import("../services/email-queue.service.js");
        const { page = 1, limit = 50, status, classroomId, type } = req.query;
        const logs = await getEmailLogs({
            page: parseInt(page),
            limit: Math.min(parseInt(limit) || 50, 100),
            status: status || null,
            classroomId: classroomId || null,
            type: type || null,
        });
        res.json(logs);
    } catch (err) {
        console.error("[Admin] Email logs error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

router.post("/email-resend/:jobId", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
        const { resendEmailJob } = await import("../services/email-queue.service.js");
        const job = await resendEmailJob(req.params.jobId);
        if (!job) {
            return res.status(404).json({ message: "Job not found or not in failed state" });
        }
        res.json({ message: "Job reset to pending", job });
    } catch (err) {
        console.error("[Admin] Email resend error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});


// -- Student Performance & Audit Log (NEW) --
router.get("/student-performance", isAuthenticated, requireRole("super_admin"), getGlobalStudentPerformance);
router.get("/audit-log", isAuthenticated, requireRole("super_admin"), getGlobalAuditLog);

// ── Super Admin Dashboard API ─────────────────────────────
router.get("/dashboard/overview", isAuthenticated, requireRole("super_admin"), getDashboardOverview);
router.get("/dashboard/organizations", isAuthenticated, requireRole("super_admin"), getDashboardOrganizations);
router.get("/dashboard/users", isAuthenticated, requireRole("super_admin"), getDashboardUsers);
router.get("/dashboard/activity", isAuthenticated, requireRole("super_admin"), getRecentActivity);
router.patch("/organization/:id/domains", isAuthenticated, requireRole("super_admin"), updateOrgDomains);
router.get("/org-analytics/:orgId", isAuthenticated, requireRole("super_admin"), getOrgAnalytics);
router.get("/users/export", isAuthenticated, requireRole("super_admin"), exportUsers);

// ── Provisioning Logic (Day 4) ─────────────────────────────
router.post("/organizations/provision", isAuthenticated, requireRole("super_admin"), handleManualProvisioning);

export default router;
