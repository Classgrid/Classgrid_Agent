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
    applyOrganization,
    addFaculty,
    removeFaculty,
    getOrganizationDetails,
    getOrgPublicInfo,
    getFaculties,
    getStudents,
    getClassrooms,
    validateOrganization,
    resetFacultyPassword,
    verifyOrgCode,
    requestDeleteOrganization,
    verifyDeleteOrganization,
    getOrganizationAnalytics,
    updateFaculty,
    updateFacultyRole,
    removeStudent,
    createOrganizationAnnouncement,
    getOrganizationAnnouncements,
    updateOrganizationAnnouncement,
    deleteOrganizationAnnouncement,
    getOrganizationAnnouncementStats,
    getAttendanceAnalytics,
    changeOrgAdminPassword,
    archiveClassroomByAdmin,
    getStudentPerformance,
    getOrgAuditLog,
    updateOrgLogo,
    getOrgBranding,
    getTestAccounts,
    createTestAccount,
    resetTestAccountPassword,
    deleteTestAccount
} from "../controllers/organization.controller.js";

import { validateOrganizationAnnouncement } from "../middleware/validation.middleware.js";
import {
    approveOrganization as approvePendingOrganization,
    getOrgPendingNotes,
    approveOrgNote,
    rejectOrgNote,
} from "../controllers/admin.controller.js";
import { isAuthenticated, requireRole } from "../middleware/auth.middleware.js";
import { validateOrganization as joiValidateOrg, validateApplyOrg, validateFaculty, validateOrgCode, validateVerifyCode } from "../middleware/validation.middleware.js";
import OrganizationPending from "../models/OrganizationPending.js";
import rateLimit from "express-rate-limit";
import {
    getMyOrganizationConfig,
    getOrganizationUsageSummary,
    getOrganizationBilling,
    updateBillingSettings,
    setupBillingMandate,
    sendBillingEmailVerification,
    verifyBillingEmail,
    sendBillingPhoneOtp,
    verifyBillingPhoneOtp,
    updateOrganizationBillingSettings
} from "../controllers/org-configuration.controller.js";

const router = express.Router();

// Self-service organization configuration, usage, and billing.
// This router is mounted at both /api/organization and /api/org.
router.get("/my-config", isAuthenticated, requireRole("org_admin"), getMyOrganizationConfig);
router.get("/usage", isAuthenticated, requireRole("org_admin"), getOrganizationUsageSummary);
router.get("/billing", isAuthenticated, requireRole("org_admin"), getOrganizationBilling);
router.put("/billing/settings", isAuthenticated, requireRole("org_admin"), updateOrganizationBillingSettings);
router.post("/billing/setup-mandate", isAuthenticated, requireRole("org_admin"), setupBillingMandate);
router.post("/billing/verify-email/send", isAuthenticated, requireRole("org_admin"), sendBillingEmailVerification);
router.get("/billing/verify-email", verifyBillingEmail);
router.post("/billing/verify-email/confirm", isAuthenticated, requireRole("org_admin"), verifyBillingEmail);
router.post("/billing/verify-phone/send", isAuthenticated, requireRole("org_admin"), sendBillingPhoneOtp);
router.post("/billing/verify-phone/confirm", isAuthenticated, requireRole("org_admin"), verifyBillingPhoneOtp);

// Rate limiter for code verification — 10 attempts per 15 minutes per IP
const verifyCodeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: { message: "Too many verification attempts. Please wait 15 minutes before trying again.", code: "RATE_LIMITED" },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
});

// Rate limiter for org applications — 5 attempts per 30 minutes per IP
const applyLimiter = rateLimit({
    windowMs: 30 * 60 * 1000,
    max: 5,
    message: { message: "Too many application attempts. Please wait before trying again.", code: "RATE_LIMITED" },
    standardHeaders: true,
    legacyHeaders: false,
});

// Public: Apply for a new organization (rate limited)
router.post("/apply", applyLimiter, validateApplyOrg, applyOrganization);

// Public: Get branding info for an organization via subdomain
router.get("/branding", getOrgBranding);

// Super Admin compatibility: legacy frontend calls /api/organization?status=pending
router.get("/", isAuthenticated, requireRole("super_admin"), async (req, res) => {
    try {
        const status = req.query.status || "pending";
        const pendingOrgs = await OrganizationPending.find({ status }).sort({ createdAt: -1 }).lean();
        const data = pendingOrgs.map((org) => ({
            _id: org._id,
            name: org.institute_name,
            domain: org.website || "",
            type: org.designation || "organization",
            email: org.owner_email,
            ownerEmail: org.owner_email,
            ownerName: org.owner_name,
            status: org.status,
            createdAt: org.createdAt,
            updatedAt: org.updatedAt,
        }));

        res.json({ success: true, data });
    } catch (err) {
        console.error("[Organization] pending list error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Super Admin compatibility: approve pending organization from the new dashboard.
router.patch("/:id", isAuthenticated, requireRole("super_admin"), (req, res, next) => {
    if (req.body?.status !== "approved") {
        return res.status(400).json({ success: false, message: "Only approval is supported from this endpoint" });
    }

    return approvePendingOrganization(req, res, next);
});

// POST /api/org/verify-code — NEW dual code verification (faculty OR student)
// Authenticated + Rate limited
router.post("/verify-code", isAuthenticated, verifyCodeLimiter, validateVerifyCode, verifyOrgCode);

// POST /api/organization/validate — legacy endpoint (kept for backward compat)
router.post("/validate", isAuthenticated, validateOrgCode, validateOrganization);

// Org Admin + Super Admin routes (requirePasswordSet blocks org_admin if mustResetPassword=true)
router.post("/add-faculty", isAuthenticated, requireRole("super_admin", "org_admin"), validateFaculty, addFaculty);
router.delete("/remove-faculty/:id", isAuthenticated, requireRole("super_admin", "org_admin"), removeFaculty);
router.put("/faculty/:id", isAuthenticated, requireRole("super_admin", "org_admin"), updateFaculty);
router.put("/faculty/:id/role", isAuthenticated, requireRole("super_admin", "org_admin"), updateFacultyRole);
router.post("/reset-faculty-password", isAuthenticated, requireRole("super_admin", "org_admin"), resetFacultyPassword);
router.get("/me", isAuthenticated, requireRole("super_admin", "org_admin"), getOrganizationDetails);
router.get("/public-info", isAuthenticated, getOrgPublicInfo);
router.get("/faculties", isAuthenticated, requireRole("super_admin", "org_admin"), getFaculties);

router.delete("/remove-student/:id", isAuthenticated, requireRole("super_admin", "org_admin"), removeStudent);
router.get("/students", isAuthenticated, requireRole("super_admin", "org_admin"), getStudents);
router.get("/classrooms", isAuthenticated, requireRole("super_admin", "org_admin"), getClassrooms);
router.get("/analytics", isAuthenticated, requireRole("super_admin", "org_admin"), getOrganizationAnalytics);
router.get("/attendance-analytics", isAuthenticated, requireRole("super_admin", "org_admin"), getAttendanceAnalytics);

// Announcements (Smart Broadcast System)
router.post("/announcements", isAuthenticated, requireRole("super_admin", "org_admin"), validateOrganizationAnnouncement, createOrganizationAnnouncement);
router.get("/announcements", isAuthenticated, getOrganizationAnnouncements); // Accessible by faculty/students too, filtered inside controller
router.put("/announcements/:id", isAuthenticated, requireRole("super_admin", "org_admin"), validateOrganizationAnnouncement, updateOrganizationAnnouncement);
router.delete("/announcements/:id", isAuthenticated, requireRole("super_admin", "org_admin"), deleteOrganizationAnnouncement);
router.get("/announcements/:id/stats", isAuthenticated, requireRole("super_admin", "org_admin"), getOrganizationAnnouncementStats);

// Organisation deletion (Org Admin email verification flow)
router.post("/request-delete", isAuthenticated, requireRole("org_admin"), requestDeleteOrganization);
router.get("/verify-delete", verifyDeleteOrganization); // Public — accessed via email link

// Org Admin — Notes Review (scoped to their organization)
router.get("/notes/pending", isAuthenticated, requireRole("org_admin"), getOrgPendingNotes);
router.post("/notes/:id/approve", isAuthenticated, requireRole("org_admin"), approveOrgNote);
router.post("/notes/:id/reject", isAuthenticated, requireRole("org_admin"), rejectOrgNote);

// Org Admin — Change own password (in-dashboard)
router.post("/change-password", isAuthenticated, requireRole("org_admin", "super_admin"), changeOrgAdminPassword);

// Org Admin — Archive a classroom in their org (org-level admin action)
router.post("/archive-classroom/:id", isAuthenticated, requireRole("org_admin", "super_admin"), archiveClassroomByAdmin);

// Org Admin — Student Performance Snapshot (top 10, 5-min cached)
router.get("/student-performance", isAuthenticated, requireRole("org_admin", "super_admin"), getStudentPerformance);

// Org Admin — Admin Audit Log (last 50, this org only)
router.get("/audit-log", isAuthenticated, requireRole("org_admin"), getOrgAuditLog);

// Org Admin — Update organization logo
router.put("/logo", isAuthenticated, requireRole("org_admin", "super_admin"), updateOrgLogo);

// Org Admin - Test Accounts (Role Sandbox)
router.get("/test-accounts", isAuthenticated, requireRole("org_admin", "super_admin"), getTestAccounts);
router.post("/test-accounts", isAuthenticated, requireRole("org_admin", "super_admin"), createTestAccount);
router.post("/test-accounts/:id/reset", isAuthenticated, requireRole("org_admin", "super_admin"), resetTestAccountPassword);
router.delete("/test-accounts/:id", isAuthenticated, requireRole("org_admin", "super_admin"), deleteTestAccount);

export default router;
