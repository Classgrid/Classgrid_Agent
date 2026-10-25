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
import { isAuthenticated, requireOrganization, requireRole } from "../middleware/auth.middleware.js";
import { attachInstitutionProfile } from "../middleware/institution-profile.middleware.js";
import Organization from "../models/Organization.js";
import User from "../models/User.js";
import RoleRequest from "../models/RoleRequest.js";
import Classroom from "../models/Classroom.js";
import { logAdminAction } from "../services/auditLog.service.js";
import { getChatSb } from "../config/supabaseClient.js";
import { trackOnboardingEvent } from "../services/onboarding-event.service.js";
import { buildInstitutionProfile as buildSharedInstitutionProfile } from "../services/institution-profile.service.js";
import { getOrgDashboardMetrics } from '../controllers/org-dashboard.controller.js';
import { 
    getMyOrganizationConfig, 
    getOrganizationUsageSummary, 
    getOrganizationBilling,
    sendBillingEmailVerification,
    verifyBillingEmail,
    sendBillingPhoneOtp,
    verifyBillingPhoneOtp,
    updateOrganizationBillingSettings,
    downloadInvoicePdf
} from "../controllers/org-configuration.controller.js";
import { getOrgAdminBillingDashboard, createSaasInvoiceOrder, verifySaasInvoicePayment } from '../controllers/admin-analytics.controller.js';
import redis from '../config/redis.js';
import { getDeptAdminInviteEmailHtml, getErpRoleInvitationHtml, getErpRoleRequestAdminHtml, getErpRoleApprovedHtml, getErpRoleInstantlyGrantedHtml, getErpRoleRejectedHtml } from '../services/email-templates.service.js';
import { sendEmail } from '../services/aws-ses.service.js';
import crypto from 'crypto';
import { invalidateBrandingCache } from '../services/branding-resolver.service.js';

const ERP_ROLE_LABELS = {
    admission_head: "Admissions Department Head",
    fee_manager: "Fees & Accounts Manager",
    exam_controller: "Examination Controller",
    library_manager: "Library Manager",
    hod: "Head of Department (HOD)",
    tpo_officer: "Training & Placement Officer",
    transport_manager: "Transport Manager",
    coordinator: "Academic Coordinator",
    counselor: "Student Counselor",
    faculty: "Faculty Member",
    teacher: "Faculty Member",
    principal: "Principal",
    vice_principal: "Vice Principal",
    admission_verifier: "Admissions Verifier",
    admission_counselor: "Admissions Counselor",
    admission_clerk: "Admissions Clerk",
};

const ERP_DASHBOARD_PATHS = {
    org_admin: "/org/admin/dashboard",
    library_manager: "/dept/library/dashboard",
    hod: "/org/admin/dashboard",
    principal: "/org/admin/dashboard",
    vice_principal: "/org/admin/dashboard",
    exam_controller: "/dept/exams/dashboard",
    fee_manager: "/dept/fees/dashboard",
    admission_head: "/dept/admissions/dashboard",
    admission_verifier: "/dept/admissions/dashboard",
    admission_counselor: "/dept/admissions/dashboard",
    admission_clerk: "/dept/admissions/dashboard",
    tpo_officer: "/org/admin/dashboard",
    transport_manager: "/dept/transport/dashboard",
    counselor: "/org/admin/dashboard",
    coordinator: "/org/admin/dashboard",
    faculty: "/faculty/agent",
    teacher: "/faculty/agent",
    student: "/student/agent",
};

function getOrgFrontendUrl(req, org) {
    return req.get('origin')
        || (org?.custom_domain ? `https://${org.custom_domain}` : null)
        || (org?.subdomain ? `https://${org.subdomain}.classgrid.in` : null)
        || process.env.FRONTEND_URL?.trim()
        || 'https://app.classgrid.in';
}

function formatExpiry(ms) {
    return new Date(Date.now() + ms).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
}

import {
    getAdmissionTrack,
    getDefaultQuotaByStructureType,
    isCETStructureType,
    isCoachingStructureType,
    isJuniorCollegeStructureType,
    isSchoolStructureType,
    resolveStructureType,
} from "../services/admissions/organization-admission-type.service.js";
import {
    TRACKED_ONBOARDING_STEPS,
    deriveOnboardingStage,
    getOnboardingStatusSnapshot,
    markOnboardingStep,
    syncDerivedOnboardingProgress,
} from "../services/onboarding-progress.service.js";
import {
    createOrgSupportConversation,
    getOrgSupportConversation,
    listOrgSupportConversations,
    markOrgSupportConversationRead,
    sendOrgSupportMessage,
} from "../controllers/support-communication.controller.js";

const router = express.Router();



router.get("/my-config", isAuthenticated, requireRole("org_admin"), getMyOrganizationConfig);
router.get("/usage", isAuthenticated, requireRole("org_admin"), getOrganizationUsageSummary);
router.get("/billing", isAuthenticated, requireRole("org_admin"), getOrganizationBilling);
router.put("/billing/settings", isAuthenticated, requireRole("org_admin"), updateOrganizationBillingSettings);
router.post("/billing/verify-email/send", isAuthenticated, requireRole("org_admin"), sendBillingEmailVerification);
router.post("/billing/verify-email/confirm", isAuthenticated, requireRole("org_admin"), verifyBillingEmail);
router.post("/billing/verify-phone/send", isAuthenticated, requireRole("org_admin"), sendBillingPhoneOtp);
router.post("/billing/verify-phone/confirm", isAuthenticated, requireRole("org_admin"), verifyBillingPhoneOtp);
router.get("/billing/invoice/:invoiceId/pdf", isAuthenticated, requireRole("org_admin"), downloadInvoicePdf);

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function normalizeBrandHex(value) {
    return typeof value === "string" ? value.trim() : "";
}

function getThemeColors(org = {}) {
    const themeColors = org.branding?.theme_colors;
    if (themeColors && typeof themeColors.toObject === "function") return themeColors.toObject();
    return themeColors || {};
}

function resolveBrandColors(org = {}) {
    const themeColors = getThemeColors(org);
    return {
        primary: org.brand_colors?.primary || themeColors.primary || "#6366f1",
        secondary: org.brand_colors?.secondary || themeColors.secondary || "#4f46e5",
    };
}

const PROFILE_BY_ORG_TYPE = {
    school: {
        dashboardVariant: "school",
        admissionMode: "school_standard",
        terminology: {
            institution: "School",
            learner: "Student",
            educator: "Teacher",
            program: "Standard",
            group: "Division",
            identifier: "Roll No",
        },
        academicHierarchy: ["standard", "division"],
        enabledModules: ["admissions", "fees", "attendance", "examinations", "library", "transport"],
        admissionWorkflows: ["class_capacity", "parent_details", "age_check", "document_review"],
    },
    junior_college: {
        dashboardVariant: "junior_college",
        admissionMode: "junior_college_merit",
        terminology: {
            institution: "Junior College",
            learner: "Student",
            educator: "Faculty",
            program: "Stream",
            group: "Division",
            identifier: "Roll No",
        },
        academicHierarchy: ["stream", "standard", "division"],
        enabledModules: ["admissions", "fees", "attendance", "examinations", "library"],
        admissionWorkflows: ["stream_selection", "tenth_marks_merit", "rounds", "document_review"],
    },
    engineering: {
        dashboardVariant: "engineering",
        admissionMode: "engineering_cet_cap",
        terminology: {
            institution: "Engineering College",
            learner: "Student",
            educator: "Faculty",
            program: "Branch",
            group: "Division",
            identifier: "PRN",
        },
        academicHierarchy: ["degree", "department", "year", "semester", "division", "batch"],
        enabledModules: ["admissions", "fees", "attendance", "examinations", "library", "compliance", "placements"],
        admissionWorkflows: ["cet_import", "cap_rounds", "branch_merit", "seat_matrix", "document_review"],
    },
    coaching: {
        dashboardVariant: "coaching",
        admissionMode: "coaching_enrollment",
        terminology: {
            institution: "Coaching Institute",
            learner: "Learner",
            educator: "Mentor",
            program: "Course",
            group: "Batch",
            identifier: "Enrollment No",
        },
        academicHierarchy: ["course", "batch"],
        enabledModules: ["admissions", "fees", "attendance", "examinations", "crm"],
        admissionWorkflows: ["lead_tracking", "counselling", "trial_batch", "batch_capacity", "fee_plan"],
    },
    diploma: {
        dashboardVariant: "engineering",
        admissionMode: "diploma_merit",
        terminology: {
            institution: "Diploma Institute",
            learner: "Student",
            educator: "Faculty",
            program: "Department",
            group: "Division",
            identifier: "Enrollment No",
        },
        academicHierarchy: ["department", "year", "semester", "division"],
        enabledModules: ["admissions", "fees", "attendance", "examinations", "library"],
        admissionWorkflows: ["department_merit", "seat_matrix", "document_review"],
    },
};

function normalizeOrgType(org, resolvedStructureType) {
    const type = String(org?.org_type || "").toLowerCase();
    if (PROFILE_BY_ORG_TYPE[type]) return type;

    const structure = String(resolvedStructureType || org?.structure_type || "").toLowerCase();
    if (isSchoolStructureType(structure)) return "school";
    if (isJuniorCollegeStructureType(structure)) return "junior_college";
    if (isCoachingStructureType(structure)) return "coaching";
    if (isCETStructureType(structure)) return structure.includes("diploma") ? "diploma" : "engineering";
    return "school";
}

function buildInstitutionProfile(org) {
    const structureType = resolveStructureType(org) || org.structure_type;
    const orgType = normalizeOrgType(org, structureType);
    const base = PROFILE_BY_ORG_TYPE[orgType] || PROFILE_BY_ORG_TYPE.school;
    const identifierLabel = org.academic_config?.identifierLabel || org.rollNumberLabel || base.terminology.identifier;
    const admissionTrack = getAdmissionTrack(structureType);

    return {
        organization: {
            id: org._id.toString(),
            name: org.name,
            org_type: orgType,
            structure_type: structureType,
            division_mode: org.division_mode,
            allow_sub_batches: Boolean(org.allow_sub_batches),
            status: org.status,
        },
        dashboardVariant: base.dashboardVariant,
        terminology: {
            ...base.terminology,
            identifier: identifierLabel,
        },
        academicHierarchy: base.academicHierarchy,
        enabledModules: base.enabledModules,
        admissionProfile: {
            mode: base.admissionMode,
            track: admissionTrack,
            structureType,
            baseOrgType: orgType,
            defaultQuota: getDefaultQuotaByStructureType(structureType),
            dashboardVariant: base.dashboardVariant,
            enabledWorkflows: base.admissionWorkflows,
        },
        academicConfig: org.academic_config || {},
    };
}

/**
 * PATH: /api/org/dashboard
 * Access: org_admin only
 * Desc: Basic placeholder for the localized Org Admin Dashboard
 */
router.get("/dashboard", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        if (!req.user.organization_id) {
            return res.status(400).json({ message: "You are not bound to an active organization." });
        }

        const org = await Organization.findById(req.user.organization_id).select("name plan allowed_domains status");

        // Basic payload. Can expand later with Faculty count, student count, storage limits, etc.
        res.json({
            message: "Welcome to your Organization Dashboard",
            organization: org
        });
    } catch (err) {
        console.error("[Org Dashboard Error]:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * GET /api/org-admin/institution-profile
 * Frontend contract for institution-specific dashboards and workflows.
 */
router.get("/institution-profile", isAuthenticated, requireOrganization, attachInstitutionProfile(), (req, res) => {
    res.json(req.institutionProfile);
});

/**
 * PATH: /api/org/domains
 * Access: org_admin only
 * Desc: Modifies the list of allowed domain restrictions for an Org
 */
router.patch("/domains", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const { domains } = req.body;
        
        if (!Array.isArray(domains)) {
            return res.status(400).json({ message: "Domains payload must be an array of strings." });
        }

        if (!req.user.organization_id) {
            return res.status(400).json({ message: "You are not bound to an active organization." });
        }

        // String sanitization: strictly lowercase, no spaces, strip @ if accidently provided
        const cleanedDomains = [...new Set(domains
            .map(d => String(d).toLowerCase().trim().replace(/^@/, ''))
            .filter(d => d.length > 0 && !d.includes(" "))
        )];

        const updatedOrg = await Organization.findByIdAndUpdate(
            req.user.organization_id,
            { $set: { allowed_domains: cleanedDomains } },
            { returnDocument: 'after', runValidators: true }
        ).select("allowed_domains name");

        // Audit log: org admin changed domains
        logAdminAction(req, "update_domains", "organization", req.user.organization_id, updatedOrg.name, { domains: cleanedDomains });

        res.json({
            message: "Organization domains updated successfully",
            allowed_domains: updatedOrg.allowed_domains
        });
    } catch (err) {
        console.error("[Org Domains Error]:", err.message);
        res.status(500).json({ message: "Server error updating organization configuration." });
    }
});

/**
 * PATH: /api/org/type
 * Access: org_admin only
 * Desc: Modifies the organization type (SCHOOL or COLLEGE)
 */
router.patch("/type", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const { org_type } = req.body;
        
        if (!["SCHOOL", "COLLEGE"].includes(org_type)) {
            return res.status(400).json({ message: "Invalid org_type." });
        }

        if (!req.user.organization_id) {
            return res.status(400).json({ message: "You are not bound to an active organization." });
        }

        const updatedOrg = await Organization.findByIdAndUpdate(
            req.user.organization_id,
            { $set: { org_type } },
            { returnDocument: 'after', runValidators: true }
        ).select("org_type name");

        logAdminAction(req, "update_org_type", "organization", req.user.organization_id, updatedOrg.name, { org_type });

        res.json({
            message: "Organization type updated successfully",
            org_type: updatedOrg.org_type
        });
    } catch (err) {
        console.error("[Org Type Error]:", err.message);
        res.status(500).json({ message: "Server error updating organization type." });
    }
});

/**
 * PATH: /api/org/invite-staff
 * Access: org_admin only
 * Desc: Manually invite a single Faculty / Dept Admin (Method 1 in docs)
 * Note: Staff are instantly 'verified' because they are created by the admin.
 */
router.post("/invite-staff", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const { name, email, role, department } = req.body;

        if (!name || !email || !role) {
            return res.status(400).json({ message: "Name, email, and role are required." });
        }

        const orgId = req.user.organization_id;
        if (!orgId) return res.status(400).json({ message: "No organization bound." });

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
        if (existingUser) {
            return res.status(409).json({ message: "User with this email already exists." });
        }

        // Create the verified staff member
        const newUser = await User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            role: role.toLowerCase().trim(),
            department: department ? department.trim() : null,
            organization_id: orgId,
            verification_status: "verified", // Staff invited by Admin are instantly verified
            mustResetPassword: true, // Forces them to set a password on first login
            status: "active"
        });

        // Audit log
        logAdminAction(req, "invite_staff", "user", newUser._id, newUser.name, { role: newUser.role });
        await syncDerivedOnboardingProgress(orgId);
        await trackOnboardingEvent({
            organizationId: orgId,
            userId: newUser._id,
            eventType: "staff_invited",
            stage: "setup",
            actorRole: req.user?.role || "org_admin",
            metadata: { role: newUser.role, email: newUser.email },
        });

        // Generate 7-hour single-use activation token
        const activationToken = crypto.randomBytes(32).toString('hex');
        const activationExpiry = new Date(Date.now() + 7 * 60 * 60 * 1000); // 7 hours — single-use
        newUser.activationToken = activationToken;
        newUser.activationTokenExpires = activationExpiry;
        newUser.activationUsedAt = null; // Ensure single-use tracking is clear
        await newUser.save();

        const org = await Organization.findById(orgId).select('name subdomain custom_domain').lean();
        
        // Use the origin of the current request as the frontend URL (e.g. https://ganesha.classgrid.in)
        // Fallback to custom domain, then subdomain.classgrid.in, then environment variable
        const frontendUrl = req.get('origin') 
            || (org?.custom_domain ? `https://${org.custom_domain}` : null)
            || (org?.subdomain ? `https://${org.subdomain}.classgrid.in` : null)
            || process.env.FRONTEND_URL?.trim() 
            || 'https://app.classgrid.in';

        const activationLink = `${frontendUrl}/activate?token=${activationToken}`;

        // Email 1: Role Invitation (getErpRoleInvitationHtml)
        try {
            const roleLabel = ERP_ROLE_LABELS[newUser.role] || newUser.role;
            await sendEmail({
                to: newUser.email,
                subject: `You've been assigned ${roleLabel} at ${org?.name || 'your organization'}`,
                html: getErpRoleInvitationHtml(
                    newUser.name,
                    roleLabel,
                    org?.name || 'Your Organization',
                    activationLink,
                    formatExpiry(24 * 60 * 60 * 1000)
                ),
            });
        } catch (emailErr) {
            console.warn('[Invite Staff] Email send failed (user created):', emailErr.message);
        }

        res.status(201).json({
            message: "Invitation sent successfully.",
            user: { _id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role }
        });

    } catch (err) {
        console.error("[Invite Staff Error]:", err.message);
        res.status(500).json({ message: "Server error inviting staff." });
    }
});

/**
 * PATH: /api/org/request-role
 * Access: Authenticated users
 * Desc: Self-serve role request using Tenant Join Code
 */
router.post("/request-role", isAuthenticated, async (req, res) => {
    try {
        const { tenant_join_code, role, email } = req.body;

        if (!tenant_join_code || !role) {
            return res.status(400).json({ error: "Tenant Join Code and role are required." });
        }

        // 1. Validate Tenant ID (organizationCode)
        const org = await Organization.findOne({ 
            $or: [{ organizationCode: tenant_join_code }, { private_code: tenant_join_code }] 
        });
        if (!org) {
            return res.status(404).json({ error: "Invalid Tenant ID." });
        }

        // 2. Validate Role for this Org Type
        const { getAvailableRoles } = await import("../utils/roles.js");
        const availableRoles = getAvailableRoles(org.org_type || org.structure_type, "super_admin");
        if (!availableRoles.includes(role) || ["student", "org_admin", "super_admin"].includes(role)) {
            return res.status(400).json({ error: "This role cannot be requested." });
        }

        // 3. Admin Instant Assignment
        if (req.user.role === "org_admin" && req.user.organization_id?.toString() === org._id.toString()) {
            let targetUser = await User.findOne({ email });
            
            if (targetUser) {
                // If user exists, add role to additional_roles
                if (!targetUser.additional_roles.includes(role) && targetUser.role !== role) {
                    targetUser.additional_roles.push(role);
                    await targetUser.save();
                }

                // Email 4: Instantly Granted (getErpRoleInstantlyGrantedHtml)
                try {
                    const roleLabel = ERP_ROLE_LABELS[role] || role;
                    const frontendUrl = getOrgFrontendUrl(req, org);
                    const dashboardPath = ERP_DASHBOARD_PATHS[role] || '/agent';
                    await sendEmail({
                        to: targetUser.email,
                        subject: `Security Notice: ${roleLabel} privileges granted at ${org.name}`,
                        html: getErpRoleInstantlyGrantedHtml(
                            targetUser.name,
                            roleLabel,
                            org.name,
                            req.user.name || 'Organization Admin',
                            new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Kolkata' }),
                            `${frontendUrl}${dashboardPath}`
                        ),
                    });
                } catch (emailErr) {
                    console.warn('[Request Role] Instant grant email failed:', emailErr.message);
                }
            } else {
                return res.status(404).json({ error: "User with this email not found. They must sign up first." });
            }
            
            return res.json({ message: "Role granted instantly.", instant_approval: true });
        }

        // 4. Normal User Request (Self-serve)
        let targetUser = await User.findOne({ email: req.user.email });
        if (!targetUser) return res.status(404).json({ error: "User not found." });

        // Block if user already holds this role
        const alreadyHasRole = targetUser.role === role || (targetUser.additional_roles || []).includes(role);
        if (alreadyHasRole) {
            return res.status(400).json({ error: "You already have this role." });
        }

        // Self-serve users must belong to the same org (or have no org yet)
        if (targetUser.organization_id && targetUser.organization_id.toString() !== org._id.toString()) {
            return res.status(403).json({ error: "This Tenant ID does not match your organization." });
        }


        const existingReq = await RoleRequest.findOne({ 
            user_id: targetUser._id, 
            organization_id: org._id, 
            role, 
            status: "pending" 
        });
        
        if (existingReq) {
            return res.status(400).json({ error: "A pending request for this role already exists." });
        }

        await RoleRequest.create({
            user_id: targetUser._id,
            organization_id: org._id,
            email: targetUser.email,
            role,
            tenant_join_code: tenant_join_code, // Audit trail
            status: "pending"
        });
        
        // Email 2: Notify Org Admin about the pending request (getErpRoleRequestAdminHtml)
        try {
            const orgAdmin = await User.findOne({ organization_id: org._id, role: 'org_admin' }).select('name email').lean();
            if (orgAdmin) {
                const roleLabel = ERP_ROLE_LABELS[role] || role;
                const frontendUrl = getOrgFrontendUrl(req, org);
                await sendEmail({
                    to: orgAdmin.email,
                    subject: `Access Request: ${targetUser.name} wants ${roleLabel} at ${org.name}`,
                    html: getErpRoleRequestAdminHtml(
                        orgAdmin.name,
                        targetUser.name,
                        targetUser.email,
                        roleLabel,
                        org.name,
                        new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Kolkata' }),
                        `${frontendUrl}/org/admin/dashboard`
                    ),
                });
            }
        } catch (emailErr) {
            console.warn('[Request Role] Admin notification email failed:', emailErr.message);
        }

        res.status(200).json({ message: "Role request sent to Org Admin." });
    } catch (err) {
        console.error("[Request Role Error]:", err.message);
        res.status(500).json({ error: "Server error requesting role." });
    }
});

/**
 * PATH: /api/org/accept-role-request
 * Access: org_admin
 * Desc: Admin approves a pending role request
 */
router.post("/accept-role-request/:requestId", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const { requestId } = req.params;
        const request = await RoleRequest.findOne({ _id: requestId, organization_id: req.user.organization_id });
        
        if (!request) return res.status(404).json({ error: "Request not found or unauthorized." });
        if (request.status !== "pending") return res.status(400).json({ error: "Request is already processed." });

        const targetUser = await User.findById(request.user_id);
        if (!targetUser) return res.status(404).json({ error: "User no longer exists." });

        // Update role
        if (!targetUser.additional_roles.includes(request.role) && targetUser.role !== request.role) {
            targetUser.additional_roles.push(request.role);
            await targetUser.save();
        }

        request.status = "approved";
        request.processed_by = req.user._id;
        await request.save();

        // Email 3: Role Approved — link to the short welcome page (getErpRoleApprovedHtml)
        try {
            const org = await Organization.findById(req.user.organization_id).select('name subdomain custom_domain').lean();
            const roleLabel = ERP_ROLE_LABELS[request.role] || request.role;
            const frontendUrl = getOrgFrontendUrl(req, org);
            // Send to /welcome-new-role?role=... so user sees the short welcome screen first
            const welcomeLink = `${frontendUrl}/welcome-new-role?role=${encodeURIComponent(request.role)}`;
            await sendEmail({
                to: targetUser.email,
                subject: `Access Approved: You are now ${roleLabel} at ${org?.name || 'your organization'}`,
                html: getErpRoleApprovedHtml(
                    targetUser.name,
                    roleLabel,
                    org?.name || 'Your Organization',
                    welcomeLink
                ),
            });
        } catch (emailErr) {
            console.warn('[Accept Role] Approval email failed:', emailErr.message);
        }


        res.json({ message: "Role request approved." });
    } catch (err) {
        console.error("[Accept Role Error]:", err.message);
        res.status(500).json({ error: "Server error approving role request." });
    }
});

/**
 * PATH: /api/org/reject-role-request
 * Access: org_admin
 */
router.post("/reject-role-request/:requestId", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const { requestId } = req.params;
        const { reason } = req.body; // Optional: admin can provide a reason

        const request = await RoleRequest.findOne({ _id: requestId, organization_id: req.user.organization_id });
        if (!request) return res.status(404).json({ error: "Request not found." });
        if (request.status !== "pending") return res.status(400).json({ error: "Request is already processed." });

        request.status = "rejected";
        request.processed_by = req.user._id;
        request.rejection_reason = reason || null;
        await request.save();

        // Email: Notify requester their request was declined (getErpRoleRejectedHtml)
        try {
            const targetUser = await User.findById(request.user_id).select('name email').lean();
            if (targetUser) {
                const org = await Organization.findById(req.user.organization_id).select('name subdomain custom_domain').lean();
                const roleLabel = ERP_ROLE_LABELS[request.role] || request.role;
                const frontendUrl = getOrgFrontendUrl(req, org);
                await sendEmail({
                    to: targetUser.email,
                    subject: `Access Request Declined: ${roleLabel} at ${org?.name || 'your organization'}`,
                    html: getErpRoleRejectedHtml(
                        targetUser.name,
                        roleLabel,
                        org?.name || 'Your Organization',
                        reason || null,
                        `${frontendUrl}/contact` // Contact link — user can reach admin
                    ),
                });
            }
        } catch (emailErr) {
            console.warn('[Reject Role] Decline email failed:', emailErr.message);
        }

        res.json({ message: "Role request rejected." });
    } catch (err) {
        console.error("[Reject Role Error]:", err.message);
        res.status(500).json({ error: "Server error rejecting role request." });
    }
});

/**
 * GET /api/org/members
 * Returns: All active dept admins and faculty in this org (for Members page)
 * Roles are fetched dynamically from the org's allowed role list — never hardcoded.
 */
router.get("/members", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        if (!orgId) return res.status(400).json({ message: "No organization bound." });

        const org = await Organization.findById(orgId).select("org_type structure_type").lean();
        if (!org) return res.status(404).json({ message: "Organization not found." });

        // Dynamically get invitable roles for this org type (excludes student/org_admin/super_admin)
        const { getAvailableRoles: getRoles } = await import("../utils/roles.js");
        const allRoles = getRoles(org.org_type || org.structure_type, "org_admin");
        const memberRoles = allRoles.filter(r => !["student", "org_admin", "super_admin"].includes(r));

        const search = req.query.search ? req.query.search.trim() : '';
        const roleFilter = req.query.role || null;

        const filter = {
            organization_id: orgId,
            role: { $in: memberRoles },
            mustResetPassword: { $ne: true }, // Only activated members
        };
        if (roleFilter) filter.role = roleFilter;
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }

        const members = await User.find(filter)
            .select('name email role department status createdAt profilePicture')
            .sort({ createdAt: -1 })
            .lean();

        res.json({ members, total: members.length });
    } catch (err) {
        console.error('[Org Members] Error:', err.message);
        res.status(500).json({ message: 'Server error fetching members.' });
    }
});

/**
 * GET /api/org/members/pending
 * Returns: Users invited but who haven't activated yet (mustResetPassword = true)
 */
router.get("/members/pending", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        if (!orgId) return res.status(400).json({ message: "No organization bound." });
        const org = await Organization.findById(orgId).select("org_type structure_type").lean();
        if (!org) return res.status(404).json({ message: "Organization not found." });

        const { getAvailableRoles: getRoles } = await import("../utils/roles.js");
        const allRoles = getRoles(org.org_type || org.structure_type, "org_admin");
        const memberRoles = allRoles.filter(r => !["student", "org_admin", "super_admin"].includes(r));

        const pending = await User.find({
            organization_id: orgId,
            role: { $in: memberRoles },
            mustResetPassword: true,
        })
            .select('name email role department createdAt')
            .sort({ createdAt: -1 })
            .lean();

        res.json({ pending, total: pending.length });
    } catch (err) {
        console.error('[Org Pending Invites] Error:', err.message);
        res.status(500).json({ message: 'Server error fetching pending invitations.' });
    }
});

/**
 * DELETE /api/org/members/:userId
 * Removes a staff member from this org
 */
router.delete("/members/:userId", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        if (!orgId) return res.status(400).json({ message: "No organization bound." });

        const user = await User.findOne({ _id: req.params.userId, organization_id: orgId });
        if (!user) return res.status(404).json({ message: 'Member not found in your organization.' });
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: 'You cannot remove yourself.' });
        }

        await User.findByIdAndDelete(req.params.userId);
        logAdminAction(req, 'remove_member', 'user', user._id, user.name, { role: user.role });

        res.json({ message: 'Member removed successfully.' });
    } catch (err) {
        console.error('[Remove Member] Error:', err.message);
        res.status(500).json({ message: 'Server error removing member.' });
    }
});

/**
 * POST /api/org/members/:userId/resend
 * Resends the invitation email to a pending member
 */
router.post("/members/:userId/resend", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        if (!orgId) return res.status(400).json({ message: "No organization bound." });

        const user = await User.findOne({ _id: req.params.userId, organization_id: orgId, mustResetPassword: true });
        if (!user) return res.status(404).json({ message: 'Pending member not found.' });

        // Regenerate 7-hour single-use activation token
        const activationToken = crypto.randomBytes(32).toString('hex');
        user.activationToken = activationToken;
        user.activationTokenExpires = new Date(Date.now() + 7 * 60 * 60 * 1000); // 7 hours
        user.activationUsedAt = null; // Reset single-use tracker
        await user.save();

        const org = await Organization.findById(orgId).select('name subdomain custom_domain').lean();
        const frontendUrl = getOrgFrontendUrl(req, org);
        const activationLink = `${frontendUrl}/activate?token=${activationToken}`;
        const roleLabel = ERP_ROLE_LABELS[user.role] || user.role;

        await sendEmail({
            to: user.email,
            subject: `Reminder: You've been assigned ${roleLabel} at ${org?.name || 'your organization'}`,
            html: getErpRoleInvitationHtml(
                user.name,
                roleLabel,
                org?.name || 'Your Organization',
                activationLink,
                formatExpiry(24 * 60 * 60 * 1000)
            ),
        });

        res.json({ message: 'Invitation resent successfully.' });
    } catch (err) {
        console.error('[Resend Invite] Error:', err.message);
        res.status(500).json({ message: 'Server error resending invitation.' });
    }
});


// -------------------------------------------------
// HELPDESK / COMMUNICATION CENTER
// -------------------------------------------------
router.get("/helpdesk/threads", isAuthenticated, requireRole("org_admin"), listOrgSupportConversations);
router.post("/helpdesk/threads", isAuthenticated, requireRole("org_admin"), createOrgSupportConversation);
router.get("/helpdesk/threads/:threadId", isAuthenticated, requireRole("org_admin"), getOrgSupportConversation);
router.post("/helpdesk/threads/:threadId/messages", isAuthenticated, requireRole("org_admin"), sendOrgSupportMessage);
router.patch("/helpdesk/threads/:threadId/read", isAuthenticated, requireRole("org_admin"), markOrgSupportConversationRead);

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ACADEMIC CONFIGURATION

// -------------------------------------------------
// HELPDESK / COMMUNICATION CENTER
// -------------------------------------------------
router.get("/helpdesk/threads", isAuthenticated, requireRole("org_admin"), listOrgSupportConversations);
router.post("/helpdesk/threads", isAuthenticated, requireRole("org_admin"), createOrgSupportConversation);
router.get("/helpdesk/threads/:threadId", isAuthenticated, requireRole("org_admin"), getOrgSupportConversation);
router.post("/helpdesk/threads/:threadId/messages", isAuthenticated, requireRole("org_admin"), sendOrgSupportMessage);
router.patch("/helpdesk/threads/:threadId/read", isAuthenticated, requireRole("org_admin"), markOrgSupportConversationRead);

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * GET /api/org-admin/academic-config
 * Returns the current academic configuration for this org
 */
router.get("/academic-config", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        if (!orgId) return res.status(400).json({ message: "No organization bound." });

        const org = await Organization.findById(orgId)
            .select("academic_config rollNumberLabel")
            .lean();

        if (!org) return res.status(404).json({ message: "Organization not found." });

        // Merge legacy rollNumberLabel into response for consistency
        const config = org.academic_config || {};
        if (!config.identifierLabel && org.rollNumberLabel) {
            config.identifierLabel = org.rollNumberLabel;
        }
        res.json({ academic_config: config });
    } catch (err) {
        console.error("[Academic Config GET] Error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * PUT /api/org-admin/academic-config
 * Updates the academic configuration for this org
 */
router.put("/academic-config", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        if (!orgId) return res.status(400).json({ message: "No organization bound." });

        const {
            identifierLabel, prnRequired, prnLocked,
            batches, branches,
            requiredFields, idCardFields,
        } = req.body;

        const update = {};

        // Identifier label (also sync with legacy rollNumberLabel)
        if (identifierLabel && ["PRN", "Roll No", "Enrollment No"].includes(identifierLabel)) {
            update["academic_config.identifierLabel"] = identifierLabel;
            // Sync legacy field
            if (["PRN", "Roll No"].includes(identifierLabel)) {
                update["rollNumberLabel"] = identifierLabel;
            }
        }

        // PRN toggles
        if (typeof prnRequired === "boolean") update["academic_config.prnRequired"] = prnRequired;
        if (typeof prnLocked === "boolean") update["academic_config.prnLocked"] = prnLocked;

        // Batches â€” sanitize strings
        if (Array.isArray(batches)) {
            update["academic_config.batches"] = [...new Set(
                batches.map(b => String(b).replace(/\s+/g, ' ').trim()).filter(b => b.length > 0)
            )];
        }

        // Branches â€” sanitize strings
        if (Array.isArray(branches)) {
            update["academic_config.branches"] = [...new Set(
                branches.map(b => String(b).replace(/\s+/g, ' ').trim()).filter(b => b.length > 0)
            )];
        }

        // Required fields toggles
        if (requiredFields && typeof requiredFields === "object") {
            if (typeof requiredFields.prn === "boolean") update["academic_config.requiredFields.prn"] = requiredFields.prn;
            if (typeof requiredFields.batch === "boolean") update["academic_config.requiredFields.batch"] = requiredFields.batch;
            if (typeof requiredFields.branch === "boolean") update["academic_config.requiredFields.branch"] = requiredFields.branch;
        }

        // ID card display
        if (Array.isArray(idCardFields)) {
            const valid = idCardFields.filter(f => ["prn", "rollNo", "both"].includes(f));
            if (valid.length > 0) update["academic_config.idCardFields"] = valid;
        }

        const updatedOrg = await Organization.findByIdAndUpdate(
            orgId,
            { $set: update },
            { returnDocument: 'after', runValidators: true }
        ).select("academic_config rollNumberLabel");

        logAdminAction(req, "update_academic_config", "organization", orgId, "Academic config", update);
        res.json({
            message: "Academic configuration updated successfully",
            academic_config: updatedOrg.academic_config,
        });
    } catch (err) {
        console.error("[Academic Config PUT] Error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});


// -------------------------------------------------
// HELPDESK / COMMUNICATION CENTER
// -------------------------------------------------
router.get("/helpdesk/threads", isAuthenticated, requireRole("org_admin"), listOrgSupportConversations);
router.post("/helpdesk/threads", isAuthenticated, requireRole("org_admin"), createOrgSupportConversation);
router.get("/helpdesk/threads/:threadId", isAuthenticated, requireRole("org_admin"), getOrgSupportConversation);
router.post("/helpdesk/threads/:threadId/messages", isAuthenticated, requireRole("org_admin"), sendOrgSupportMessage);
router.patch("/helpdesk/threads/:threadId/read", isAuthenticated, requireRole("org_admin"), markOrgSupportConversationRead);

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ORG ADMIN DASHBOARD API (org-scoped equivalents)

// -------------------------------------------------
// HELPDESK / COMMUNICATION CENTER
// -------------------------------------------------
router.get("/helpdesk/threads", isAuthenticated, requireRole("org_admin"), listOrgSupportConversations);
router.post("/helpdesk/threads", isAuthenticated, requireRole("org_admin"), createOrgSupportConversation);
router.get("/helpdesk/threads/:threadId", isAuthenticated, requireRole("org_admin"), getOrgSupportConversation);
router.post("/helpdesk/threads/:threadId/messages", isAuthenticated, requireRole("org_admin"), sendOrgSupportMessage);
router.patch("/helpdesk/threads/:threadId/read", isAuthenticated, requireRole("org_admin"), markOrgSupportConversationRead);

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * GET /api/org-admin/dashboard/overview
 * Returns: org-scoped counts (faculty, students, classrooms, memberships)
 */
router.get("/dashboard/overview", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        if (!orgId) return res.status(400).json({ message: "No organization bound." });

        const [totalFaculty, totalStudents, totalClassrooms] = await Promise.all([
            User.countDocuments({ organization_id: orgId, role: "faculty" }),
            User.countDocuments({ organization_id: orgId, role: "student" }),
            Classroom.countDocuments({ organization_id: orgId }),
        ]);

        // Memberships from Supabase (cross-referenced with org classrooms)
        let totalMemberships = 0;
        try {
            const classroomIds = (await Classroom.find({ organization_id: orgId }).select("_id").lean()).map(c => c._id.toString());
            if (classroomIds.length > 0) {
                const { count, error } = await getChatSb()
                    .from('classroom_memberships')
                    .select('*', { count: 'exact', head: true })
                    .in('classroom_id', classroomIds);
                if (!error && count !== null) totalMemberships = count;
            }
        } catch (sbErr) {
            console.warn("[Org Overview] Supabase membership count failed:", sbErr.message);
        }

        res.json({ totalFaculty, totalStudents, totalClassrooms, totalMemberships });
    } catch (err) {
        console.error("[Org Overview] Error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * GET /api/org-admin/dashboard/billing
 * Returns: Vercel-style Pay-As-You-Go Billing Dashboard with charts
 */
router.get("/dashboard/billing", isAuthenticated, requireRole("org_admin"), getOrgAdminBillingDashboard);
router.post("/dashboard/billing/razorpay-order", isAuthenticated, requireRole("org_admin"), createSaasInvoiceOrder);
router.post("/dashboard/billing/razorpay-verify", isAuthenticated, requireRole("org_admin"), verifySaasInvoicePayment);

/**
 * GET /api/org-admin/dashboard/analytics
 * Returns: MongoDB aggregated data for Org Admin Dashboard Charts
 */
router.get("/dashboard/analytics", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        if (!orgId) return res.status(400).json({ message: "No organization bound." });

        // 1. Demographics (Pie/Donut Chart) - Count users by role
        const demographicsAgg = await User.aggregate([
            { $match: { organization_id: orgId } },
            { $group: { _id: "$role", count: { $sum: 1 } } }
        ]);

        const roleColors = { student: "hsl(var(--primary))", faculty: "hsl(var(--accent))", org_admin: "hsl(var(--warning))" };
        const demographics = demographicsAgg.map(d => ({
            name: d._id ? d._id.charAt(0).toUpperCase() + d._id.slice(1) : "Unknown",
            value: d.count,
            color: roleColors[d._id] || "hsl(var(--muted-foreground))"
        }));

        // 2. Branch Distribution (Bar Chart) - Students per branch
        const branchAgg = await User.aggregate([
            { $match: { organization_id: orgId, role: "student", branch: { $exists: true, $ne: "" } } },
            { $group: { _id: "$branch", students: { $sum: 1 } } },
            { $sort: { students: -1 } },
            { $limit: 10 }
        ]);
        const branchDistribution = branchAgg.map(b => ({
            branch: b._id,
            students: b.students
        }));

        // 3. Enrollment Trends (Area Chart) - Users created per month over the last 6 months
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        
        const enrollmentAgg = await User.aggregate([
            { $match: { organization_id: orgId, createdAt: { $gte: sixMonthsAgo } } },
            { 
                $group: { 
                    _id: { 
                        month: { $month: "$createdAt" }, 
                        year: { $year: "$createdAt" } 
                    }, 
                    newUsers: { $sum: 1 } 
                } 
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const enrollmentTrends = enrollmentAgg.map(e => ({
            month: `${monthNames[e._id.month - 1]} ${e._id.year.toString().substring(2)}`,
            newUsers: e.newUsers
        }));

        res.json({
            demographics,
            branchDistribution,
            enrollmentTrends
        });
    } catch (err) {
        console.error("[Org Analytics] Error:", err.message);
        res.status(500).json({ message: "Server error fetching analytics" });
    }
});

/**
 * GET /api/org-admin/dashboard/users?page=1&limit=20&role=student
 * Returns: paginated users within this organization
 */
router.get("/dashboard/users", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        if (!orgId) return res.status(400).json({ message: "No organization bound." });

        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
        const skip = (page - 1) * limit;

        const filter = { organization_id: orgId };
        if (req.query.role) filter.role = req.query.role;

        // Search support: name, email, or PRN
        if (req.query.search) {
            const s = req.query.search.trim();
            filter.$or = [
                { name: { $regex: s, $options: "i" } },
                { email: { $regex: s, $options: "i" } },
                { prn: { $regex: s, $options: "i" } },
            ];
        }
        // Batch / Branch filters
        if (req.query.batch) filter.batch = req.query.batch;
        if (req.query.branch) filter.branch = { $regex: req.query.branch, $options: "i" };

        const [users, total] = await Promise.all([
            User.find(filter)
                .select("name email role status profile_completed prn branch batch department createdAt")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            User.countDocuments(filter),
        ]);

        res.json({
            users,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
    } catch (err) {
        import("fs").then(fs => fs.writeFileSync('C:\\Users\\nikhi\\OneDrive\\Documents\\Classgrid\\classgrid_platform\\server\\error_log.txt', String(err.stack)));
        console.error("[Org Users] Error:", err.message);
        res.status(500).json({ message: "Server error", stack: err.stack });
    }
});

/**
 * GET /api/org-admin/dashboard/classrooms
 * Returns: all classrooms within this organization
 */
router.get("/dashboard/classrooms", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        if (!orgId) return res.status(400).json({ message: "No organization bound." });

        const classrooms = await Classroom.find({ organization_id: orgId })
            .select("name classCode subject teacher memberCount createdAt")
            .populate("teacher", "name email")
            .lean();

        res.json({ classrooms });
    } catch (err) {
        console.error("[Org Classrooms] Error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * GET /api/org-admin/dashboard/classrooms/:id/members
 * Returns: Students & faculty enrolled in a specific classroom
 */
router.get("/dashboard/classrooms/:id/members", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        if (!orgId) return res.status(400).json({ message: "No organization bound." });

        // Verify classroom belongs to this org
        const classroom = await Classroom.findOne({ _id: req.params.id, organization_id: orgId })
            .populate("teacher", "name email")
            .lean();
        if (!classroom) return res.status(404).json({ message: "Classroom not found in your organization." });

        // Get memberships from Supabase
        let students = [];
        try {
            const { data: memberships, error } = await getChatSb()
                .from("classroom_memberships")
                .select("student_id, status, joined_at")
                .eq("classroom_id", req.params.id);

            if (!error && memberships?.length > 0) {
                const studentIds = memberships.map(m => m.student_id).filter(id => /^[0-9a-fA-F]{24}$/.test(id));
                const userDocs = await User.find({ _id: { $in: studentIds } }).select("name email prn branch batch status").lean();
                const userMap = {};
                userDocs.forEach(u => { userMap[u._id.toString()] = u; });
                students = memberships.map(m => ({
                    ...userMap[m.student_id],
                    membershipStatus: m.status,
                    joinedAt: m.joined_at,
                })).filter(s => s.name); // filter out unresolved
            }
        } catch (sbErr) {
            console.warn("[Classroom Members] Supabase error:", sbErr.message);
        }

        res.json({
            classroom: { name: classroom.name, classCode: classroom.classCode, subject: classroom.subject },
            teacher: classroom.teacher || null,
            students,
        });
    } catch (err) {
        console.error("[Classroom Members] Error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * GET /api/org-admin/dashboard/activity?limit=10
 * Returns: recent membership activity for this org's classrooms
 */
router.get("/dashboard/activity", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        if (!orgId) return res.status(400).json({ message: "No organization bound." });

        const limit = Math.min(parseInt(req.query.limit) || 10, 50);

        const classroomIds = (await Classroom.find({ organization_id: orgId }).select("_id").lean()).map(c => c._id.toString());
        if (classroomIds.length === 0) return res.json({ activity: [] });

        const { data: recentJoins, error } = await getChatSb()
            .from('classroom_memberships')
            .select('student_id, classroom_id, status, joined_at')
            .in('classroom_id', classroomIds)
            .order('joined_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.warn("[Org Activity] Supabase query failed:", error.message);
            return res.json({ activity: [] });
        }

        const studentIds = [...new Set(recentJoins.map(j => j.student_id).filter(id => /^[0-9a-fA-F]{24}$/.test(id)))];
        const [users, classrooms] = await Promise.all([
            User.find({ _id: { $in: studentIds } }).select("name email").lean(),
            Classroom.find({ _id: { $in: classroomIds } }).select("name").lean(),
        ]);

        const userMap = {}; users.forEach(u => { userMap[u._id.toString()] = u; });
        const classMap = {}; classrooms.forEach(c => { classMap[c._id.toString()] = c; });

        const activity = recentJoins.map(j => ({
            studentName: userMap[j.student_id]?.name || "Unknown",
            studentEmail: userMap[j.student_id]?.email || "",
            classroomName: classMap[j.classroom_id]?.name || "Unknown",
            status: j.status,
            joinedAt: j.joined_at,
        }));

        res.json({ activity });
    } catch (err) {
        console.error("[Org Activity] Error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * GET /api/org-admin/users/export?role=student
 * Returns: CSV download of org-scoped users
 */
router.get("/users/export", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        if (!orgId) return res.status(400).json({ message: "No organization bound." });

        const filter = { organization_id: orgId };
        if (req.query.role) filter.role = req.query.role;

        const users = await User.find(filter)
            .select("name email role status profile_completed prn branch batch department createdAt")
            .lean();

        const header = "Name,Email,Role,Status,Profile Complete,PRN,Branch,Batch,Department,Created At";
        const rows = users.map(u => [
            `"${(u.name || '').replace(/"/g, '""')}"`,
            u.email || '', u.role || '', u.status || 'active',
            u.profile_completed ? 'Yes' : 'No',
            u.prn || '', u.branch || '', u.batch || '', u.department || '',
            u.createdAt ? new Date(u.createdAt).toISOString() : '',
        ].join(','));

        const csv = [header, ...rows].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=org_users_${Date.now()}.csv`);
        res.send(csv);
    } catch (err) {
        console.error("[Org Export] Error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});


// -------------------------------------------------
// HELPDESK / COMMUNICATION CENTER
// -------------------------------------------------
router.get("/helpdesk/threads", isAuthenticated, requireRole("org_admin"), listOrgSupportConversations);
router.post("/helpdesk/threads", isAuthenticated, requireRole("org_admin"), createOrgSupportConversation);
router.get("/helpdesk/threads/:threadId", isAuthenticated, requireRole("org_admin"), getOrgSupportConversation);
router.post("/helpdesk/threads/:threadId/messages", isAuthenticated, requireRole("org_admin"), sendOrgSupportMessage);
router.patch("/helpdesk/threads/:threadId/read", isAuthenticated, requireRole("org_admin"), markOrgSupportConversationRead);

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// BULK ACTIONS (org-scoped)

// -------------------------------------------------
// HELPDESK / COMMUNICATION CENTER
// -------------------------------------------------
router.get("/helpdesk/threads", isAuthenticated, requireRole("org_admin"), listOrgSupportConversations);
router.post("/helpdesk/threads", isAuthenticated, requireRole("org_admin"), createOrgSupportConversation);
router.get("/helpdesk/threads/:threadId", isAuthenticated, requireRole("org_admin"), getOrgSupportConversation);
router.post("/helpdesk/threads/:threadId/messages", isAuthenticated, requireRole("org_admin"), sendOrgSupportMessage);
router.patch("/helpdesk/threads/:threadId/read", isAuthenticated, requireRole("org_admin"), markOrgSupportConversationRead);

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * POST /api/org-admin/bulk-suspend
 * Body: { userIds: [...], action: "suspend" | "reactivate" }
 */
router.post("/bulk-suspend", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        if (!orgId) return res.status(400).json({ message: "No organization bound." });

        const { userIds, action } = req.body;
        if (!Array.isArray(userIds) || userIds.length === 0) return res.status(400).json({ message: "userIds must be a non-empty array." });
        if (userIds.length > 50) return res.status(400).json({ message: "Bulk actions are limited to a maximum of 50 users at a time." });
        if (!["suspend", "reactivate"].includes(action)) return res.status(400).json({ message: "action must be 'suspend' or 'reactivate'." });

        const newStatus = action === "suspend" ? "suspended" : "active";
        const result = await User.updateMany(
            { _id: { $in: userIds }, organization_id: orgId, role: { $ne: "org_admin" } },
            { $set: { status: newStatus } }
        );

        logAdminAction(req, `bulk_${action}`, "users", orgId, `${result.modifiedCount} users`, { userIds });
        res.json({ message: `${result.modifiedCount} user(s) ${action}ed successfully.`, modifiedCount: result.modifiedCount });
    } catch (err) {
        console.error("[Bulk Suspend] Error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * POST /api/org-admin/bulk-role-update
 * Body: { userIds: [...], newRole: "student" | "faculty" }
 */
router.post("/bulk-role-update", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        if (!orgId) return res.status(400).json({ message: "No organization bound." });

        const { userIds, newRole } = req.body;
        if (!Array.isArray(userIds) || userIds.length === 0) return res.status(400).json({ message: "userIds must be a non-empty array." });
        if (userIds.length > 50) return res.status(400).json({ message: "Bulk actions are limited to a maximum of 50 users at a time." });
        if (!["student", "faculty"].includes(newRole)) return res.status(400).json({ message: "newRole must be 'student' or 'faculty'." });

        const result = await User.updateMany(
            { _id: { $in: userIds }, organization_id: orgId, role: { $ne: "org_admin" } },
            { $set: { role: newRole } }
        );

        logAdminAction(req, "bulk_role_update", "users", orgId, `${result.modifiedCount} users â†’ ${newRole}`, { userIds, newRole });
        res.json({ message: `${result.modifiedCount} user(s) updated to ${newRole}.`, modifiedCount: result.modifiedCount });
    } catch (err) {
        console.error("[Bulk Role Update] Error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * POST /api/org-admin/change-role
 * Body: { userId, newRole: "student" | "faculty" }
 */
router.post("/change-role", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        if (!orgId) return res.status(400).json({ message: "No organization bound." });

        const { userId, newRole } = req.body;
        if (!userId || !["student", "faculty"].includes(newRole)) return res.status(400).json({ message: "Invalid userId or newRole." });

        const user = await User.findOneAndUpdate(
            { _id: userId, organization_id: orgId, role: { $ne: "org_admin" } },
            { $set: { role: newRole } },
            { returnDocument: 'after' }
        ).select("name email role");

        if (!user) return res.status(404).json({ message: "User not found in your organization." });

        // Email: Notify user about role change (getErpRoleInstantlyGrantedHtml)
        try {
            const org = await Organization.findById(orgId).select('name subdomain custom_domain').lean();
            const roleLabel = ERP_ROLE_LABELS[newRole] || newRole;
            const frontendUrl = getOrgFrontendUrl(req, org);
            const dashboardPath = ERP_DASHBOARD_PATHS[newRole] || '/agent';
            await sendEmail({
                to: user.email,
                subject: `Security Notice: Your role has been updated to ${roleLabel} at ${org?.name || 'your organization'}`,
                html: getErpRoleInstantlyGrantedHtml(
                    user.name,
                    roleLabel,
                    org?.name || 'Your Organization',
                    req.user.name || 'Organization Admin',
                    new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Kolkata' }),
                    `${frontendUrl}${dashboardPath}`
                ),
            });
        } catch (emailErr) {
            console.warn('[Change Role] Email notification failed:', emailErr.message);
        }

        logAdminAction(req, "change_role", "user", userId, user.name, { newRole });
        res.json({ message: `${user.name} is now a ${ERP_ROLE_LABELS[newRole] || newRole}.`, user });
    } catch (err) {
        console.error("[Change Role] Error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});


// -------------------------------------------------
// HELPDESK / COMMUNICATION CENTER
// -------------------------------------------------
router.get("/helpdesk/threads", isAuthenticated, requireRole("org_admin"), listOrgSupportConversations);
router.post("/helpdesk/threads", isAuthenticated, requireRole("org_admin"), createOrgSupportConversation);
router.get("/helpdesk/threads/:threadId", isAuthenticated, requireRole("org_admin"), getOrgSupportConversation);
router.post("/helpdesk/threads/:threadId/messages", isAuthenticated, requireRole("org_admin"), sendOrgSupportMessage);
router.patch("/helpdesk/threads/:threadId/read", isAuthenticated, requireRole("org_admin"), markOrgSupportConversationRead);

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PENDING INVITES (Faculty invitations not yet accepted)

// -------------------------------------------------
// HELPDESK / COMMUNICATION CENTER
// -------------------------------------------------
router.get("/helpdesk/threads", isAuthenticated, requireRole("org_admin"), listOrgSupportConversations);
router.post("/helpdesk/threads", isAuthenticated, requireRole("org_admin"), createOrgSupportConversation);
router.get("/helpdesk/threads/:threadId", isAuthenticated, requireRole("org_admin"), getOrgSupportConversation);
router.post("/helpdesk/threads/:threadId/messages", isAuthenticated, requireRole("org_admin"), sendOrgSupportMessage);
router.patch("/helpdesk/threads/:threadId/read", isAuthenticated, requireRole("org_admin"), markOrgSupportConversationRead);

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * GET /api/org-admin/pending-invites
 * Returns: faculty users in this org that haven't activated yet (status=pending or mustResetPassword=true)
 */
router.get("/pending-invites", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        if (!orgId) return res.status(400).json({ message: "No organization bound." });

        const pendingFaculty = await User.find({
            organization_id: orgId,
            role: "faculty",
            $or: [{ status: "pending" }, { mustResetPassword: true }],
        }).select("name email status mustResetPassword createdAt").lean();

        res.json({ invites: pendingFaculty });
    } catch (err) {
        console.error("[Pending Invites] Error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * POST /api/org-admin/resend-invite
 * Body: { userId }
 * Resends the activation email for a pending faculty
 */
router.post("/resend-invite", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        if (!orgId) return res.status(400).json({ message: "No organization bound." });

        const { userId } = req.body;
        const user = await User.findOne({ _id: userId, organization_id: orgId });
        if (!user) return res.status(404).json({ message: "Member not found in your organization." });

        // Regenerate 7-hour single-use activation token
        const activationToken = crypto.randomBytes(32).toString('hex');
        user.activationToken = activationToken;
        user.activationTokenExpires = new Date(Date.now() + 7 * 60 * 60 * 1000); // 7 hours
        user.activationUsedAt = null; // Reset single-use tracker
        await user.save();

        const org = await Organization.findById(orgId).select('name subdomain custom_domain').lean();
        const frontendUrl = getOrgFrontendUrl(req, org);
        const activationLink = `${frontendUrl}/activate?token=${activationToken}`;
        const roleLabel = ERP_ROLE_LABELS[user.role] || user.role;

        await sendEmail({
            to: user.email,
            subject: `Reminder: You've been assigned ${roleLabel} at ${org?.name || 'your organization'}`,
            html: getErpRoleInvitationHtml(
                user.name,
                roleLabel,
                org?.name || 'Your Organization',
                activationLink,
                formatExpiry(24 * 60 * 60 * 1000)
            ),
        });

        logAdminAction(req, "resend_invite", "user", userId, user.name, {});
        res.json({ message: `Invitation resent to ${user.email}.` });
    } catch (err) {
        console.error("[Resend Invite] Error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});


// -------------------------------------------------
// HELPDESK / COMMUNICATION CENTER
// -------------------------------------------------
router.get("/helpdesk/threads", isAuthenticated, requireRole("org_admin"), listOrgSupportConversations);
router.post("/helpdesk/threads", isAuthenticated, requireRole("org_admin"), createOrgSupportConversation);
router.get("/helpdesk/threads/:threadId", isAuthenticated, requireRole("org_admin"), getOrgSupportConversation);
router.post("/helpdesk/threads/:threadId/messages", isAuthenticated, requireRole("org_admin"), sendOrgSupportMessage);
router.patch("/helpdesk/threads/:threadId/read", isAuthenticated, requireRole("org_admin"), markOrgSupportConversationRead);

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ACADEMIC PROMOTION SYSTEM

// -------------------------------------------------
// HELPDESK / COMMUNICATION CENTER
// -------------------------------------------------
router.get("/helpdesk/threads", isAuthenticated, requireRole("org_admin"), listOrgSupportConversations);
router.post("/helpdesk/threads", isAuthenticated, requireRole("org_admin"), createOrgSupportConversation);
router.get("/helpdesk/threads/:threadId", isAuthenticated, requireRole("org_admin"), getOrgSupportConversation);
router.post("/helpdesk/threads/:threadId/messages", isAuthenticated, requireRole("org_admin"), sendOrgSupportMessage);
router.patch("/helpdesk/threads/:threadId/read", isAuthenticated, requireRole("org_admin"), markOrgSupportConversationRead);

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * GET /api/org-admin/academic-years
 */
router.get("/academic-years", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const orgId = req.user.organization_id?.toString();
        if (!orgId) return res.status(400).json({ message: "No organization bound." });

        const sb = getChatSb();
        const { data, error } = await sb
            .from("academic_years")
            .select("*")
            .eq("org_id", orgId)
            .order("start_date", { ascending: false });

        if (error) throw error;
        res.json({ years: data || [] });
    } catch (err) {
        console.error("[Academic Years GET]:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * POST /api/org-admin/academic-years
 * Body: { name, start_date, end_date, is_active }
 */
router.post("/academic-years", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const orgId = req.user.organization_id?.toString();
        if (!orgId) return res.status(400).json({ message: "No organization bound." });

        const { id, name, start_date, end_date, is_active } = req.body;
        if (!name) return res.status(400).json({ message: "Name is required." });

        const sb = getChatSb();

        // If setting active, deactivate all others first
        if (is_active) {
            await sb.from("academic_years").update({ is_active: false }).eq("org_id", orgId);
        }

        if (id) {
            // Update existing
            const { data, error } = await sb.from("academic_years")
                .update({ name, start_date, end_date, is_active: !!is_active })
                .eq("id", id).eq("org_id", orgId).select().single();
            if (error) throw error;
            return res.json({ year: data });
        }

        // Create new
        const { data, error } = await sb.from("academic_years")
            .insert({ org_id: orgId, name, start_date, end_date, is_active: !!is_active })
            .select().single();
        if (error) throw error;
        res.json({ year: data });
    } catch (err) {
        console.error("[Academic Years POST]:", err.message);
        res.status(500).json({ message: err.message || "Server error" });
    }
});

/**
 * GET /api/org-admin/division-mappings
 */
router.get("/division-mappings", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const orgId = req.user.organization_id?.toString();
        if (!orgId) return res.status(400).json({ message: "No organization bound." });

        const sb = getChatSb();
        const { data, error } = await sb
            .from("division_promotions")
            .select("*, from_div:divisions!division_promotions_from_division_id_fkey(name), to_div:divisions!division_promotions_to_division_id_fkey(name)")
            .eq("org_id", orgId);

        if (error) throw error;
        res.json({ mappings: data || [] });
    } catch (err) {
        console.error("[Division Mappings GET]:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * POST /api/org-admin/division-mappings
 * Body: { mappings: [{ from_division_id, to_division_id }] }
 */
router.post("/division-mappings", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const orgId = req.user.organization_id?.toString();
        if (!orgId) return res.status(400).json({ message: "No organization bound." });

        const { mappings } = req.body;
        if (!Array.isArray(mappings)) return res.status(400).json({ message: "mappings must be an array." });

        const sb = getChatSb();

        // Clear old and insert new
        await sb.from("division_promotions").delete().eq("org_id", orgId);

        if (mappings.length > 0) {
            const inserts = mappings.map(m => ({
                org_id: orgId,
                from_division_id: m.from_division_id,
                to_division_id: m.to_division_id,
            }));
            const { error } = await sb.from("division_promotions").insert(inserts);
            if (error) throw error;
        }

        res.json({ message: "Division mappings updated.", count: mappings.length });
    } catch (err) {
        console.error("[Division Mappings POST]:", err.message);
        res.status(500).json({ message: err.message || "Server error" });
    }
});

/**
 * GET /api/org-admin/promotion-preview?target_year_id=X
 * Returns preview of what promotion would do (dry-run, no mutations)
 */
router.get("/promotion-preview", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const orgId = req.user.organization_id?.toString();
        if (!orgId) return res.status(400).json({ message: "No organization bound." });

        const { target_year_id } = req.query;
        if (!target_year_id) return res.status(400).json({ message: "target_year_id is required." });

        const org = await Organization.findById(orgId).select("org_type").lean();
        const orgType = org?.org_type || "COLLEGE";

        const sb = getChatSb();

        // Fetch active students (include those with NULL academic_year_id â€” never promoted)
        const { data: students, error: sErr } = await sb
            .from("students")
            .select("*, divisions(name)")
            .eq("org_id", orgId)
            .eq("status", "active")
            .or(`academic_year_id.is.null,academic_year_id.neq.${target_year_id}`)
            .order("name");
        if (sErr) throw sErr;

        // Fetch division mappings
        const { data: mappings } = await sb
            .from("division_promotions")
            .select("from_division_id, to_division_id, to_div:divisions!division_promotions_to_division_id_fkey(name)")
            .eq("org_id", orgId);
        const mapLookup = {};
        (mappings || []).forEach(m => { mapLookup[m.from_division_id] = { id: m.to_division_id, name: m.to_div?.name }; });

        // Fetch all divisions for fallback matching
        const { data: allDivisions } = await sb.from("divisions").select("id, name").eq("org_id", orgId);
        const divByName = {};
        (allDivisions || []).forEach(d => { divByName[d.name?.toUpperCase()] = d; });

        const preview = (students || []).map(s => {
            const current = {
                division: s.divisions?.name || "Unknown",
                standard: s.standard,
                year: s.year,
                semester: s.semester,
            };

            let nextStatus = "active";
            let nextStandard = s.standard;
            let nextSemester = s.semester;
            let nextYear = s.year;
            let nextDivision = current.division;

            if (orgType === "SCHOOL") {
                nextStandard = (s.standard || 0) + 1;
                if (nextStandard > 12) nextStatus = "graduated";
            } else {
                nextSemester = (s.semester || 0) + 1;
                if (nextSemester > 8) {
                    nextStatus = "graduated";
                } else {
                    if (nextSemester <= 2) nextYear = "FY";
                    else if (nextSemester <= 4) nextYear = "SY";
                    else if (nextSemester <= 6) nextYear = "TY";
                    else nextYear = "BE";
                }
            }

            // Division mapping
            if (nextStatus !== "graduated") {
                if (mapLookup[s.division_id]) {
                    nextDivision = mapLookup[s.division_id].name || nextDivision;
                } else {
                    // Fallback: same section letter
                    const section = current.division?.match(/\b([A-Z])\s*$/i)?.[1] || "";
                    let targetName;
                    if (orgType === "SCHOOL") {
                        const ordinal = nextStandard === 1 ? "1st" : nextStandard === 2 ? "2nd" : nextStandard === 3 ? "3rd" : `${nextStandard}th`;
                        targetName = `${ordinal} ${section}`;
                    } else {
                        targetName = `${nextYear} Sem ${nextSemester} ${section}`;
                    }
                    if (targetName && divByName[targetName.toUpperCase()]) {
                        nextDivision = divByName[targetName.toUpperCase()].name;
                    } else if (targetName) {
                        nextDivision = targetName + " (will be created)";
                    }
                }
            }

            return {
                id: s.id,
                name: s.name,
                user_id: s.user_id,
                current,
                next: {
                    division: nextDivision,
                    standard: nextStandard,
                    year: nextYear,
                    semester: nextSemester,
                    status: nextStatus,
                },
            };
        });

        const promoting = preview.filter(p => p.next.status === "active").length;
        const graduating = preview.filter(p => p.next.status === "graduated").length;

        res.json({
            preview,
            summary: { total: preview.length, promoting, graduating },
        });
    } catch (err) {
        console.error("[Promotion Preview]:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * POST /api/org-admin/promote
 * Body: { target_year_id, excluded_ids: [], scheduled_for: null | ISOString }
 * Executes promotion via Supabase RPC or schedules it for later (SaaS Automation)
 */
router.post("/promote", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const orgId = req.user.organization_id?.toString();
        if (!orgId) return res.status(400).json({ message: "No organization bound." });

        // Strict access: verify admin's org matches
        const adminId = (req.user._id || req.user.id)?.toString();
        const { target_year_id, excluded_ids = [], scheduled_for } = req.body;
        if (!target_year_id) return res.status(400).json({ message: "target_year_id is required." });

        const orgInfo = await Organization.findById(orgId).select("org_type is_promoting").lean();
        if (orgInfo?.is_promoting) {
            return res.status(409).json({ message: "A promotion is already in progress. Please wait." });
        }

        const orgType = orgInfo?.org_type || "COLLEGE";

        // 📅 SAAS SCHEDULED AUTOMATION
        if (scheduled_for) {
            const executeAt = new Date(scheduled_for);
            if (executeAt <= new Date()) {
                return res.status(400).json({ message: "Scheduled date must be in the future." });
            }

            await Organization.findByIdAndUpdate(orgId, {
                $set: {
                    scheduled_promotion: {
                        target_year_id,
                        excluded_ids,
                        execute_at: executeAt,
                        admin_id: adminId,
                        status: "pending"
                    }
                }
            });

            logAdminAction(req, "schedule_promotion", "academic", orgId, `Target Year ${target_year_id}`, { scheduled_for });

            return res.json({
                message: "Promotion successfully scheduled!",
                scheduled_for: executeAt
            });
        }

        // --- IMMEDIATE EXECUTION FLOW ---
        const sb = getChatSb();

        // [SAFETY FEATURE]: Auto-fail any stale 'running' batches in the DB (older than 10 mins)
        // This handles cases where Vercel timed out or the server crashed mid-execution previously.
        const tenMinAgoStr = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        await sb.from("promotion_batches")
            .update({ status: "failed", error_message: "Process timed out or server crashed.", completed_at: new Date().toISOString() })
            .eq("org_id", orgId)
            .eq("status", "running")
            .lt("started_at", tenMinAgoStr);

        // Atomically acquire soft lock with timeout recovery (10 min)
        const tenMinAgoDate = new Date(Date.now() - 10 * 60 * 1000);
        const lockAcquired = await Organization.findOneAndUpdate({
            _id: orgId,
            $or: [
                { is_promoting: false },
                { is_promoting: { $exists: false } },
                { promotion_started_at: { $lt: tenMinAgoDate } }
            ]
        }, {
            $set: { is_promoting: true, promotion_started_at: new Date() }
        }, { returnDocument: 'after' });

        if (!lockAcquired) {
            return res.status(409).json({ message: "A promotion is already in progress. Please wait." });
        }


        // Create batch record (capture current active year for audit)
        const { data: activeYear } = await sb.from("academic_years").select("id").eq("org_id", orgId).eq("is_active", true).maybeSingle();

        const { data: batch, error: bErr } = await sb.from("promotion_batches").insert({
            org_id: orgId,
            from_academic_year_id: activeYear?.id || null,
            to_academic_year_id: target_year_id,
            status: "idle",
            created_by: adminId,
            excluded_count: excluded_ids.length,
        }).select().single();
        if (bErr) {
            // Un-acquire lock if batch creation fails
            await Organization.findByIdAndUpdate(orgId, { $set: { is_promoting: false } });
            throw bErr;
        }

        // Execute via RPC
        const { data: result, error: rpcErr } = await sb.rpc("execute_promotion", {
            p_batch_id: batch.id,
            p_org_id: orgId,
            p_to_academic_year_id: target_year_id,
            p_excluded_ids: excluded_ids,
            p_admin_id: adminId,
            p_org_type: orgType,
        });

        // Release soft lock
        await Organization.findByIdAndUpdate(orgId, { $set: { is_promoting: false } });

        if (rpcErr) {
            console.error("[Promote RPC Error]:", rpcErr);
            // Mark batch as failed since the RPC transaction rolled back
            await sb.from("promotion_batches").update({ status: "failed", error_message: rpcErr.message || "RPC error", completed_at: new Date().toISOString() }).eq("id", batch.id);
            return res.status(500).json({ message: rpcErr.message || "Promotion failed.", batch_id: batch.id });
        }

        if (result?.success === false) {
            // RPC returned error (caught by EXCEPTION handler) â€” mark batch as failed
            await sb.from("promotion_batches").update({ status: "failed", error_message: result.error || "Unknown error", completed_at: new Date().toISOString() }).eq("id", batch.id);
            return res.status(500).json({
                message: result.error || "Promotion failed.",
                batch_id: batch.id,
            });
        }

        logAdminAction(req, "promote_students", "academic", orgId, `Batch ${batch.id}`, result);

        res.json({
            message: "Promotion completed successfully!",
            batch_id: batch.id,
            ...result,
        });
    } catch (err) {
        // Release lock on error
        try {
            const orgId = req.user.organization_id?.toString();
            if (orgId) await Organization.findByIdAndUpdate(orgId, { $set: { is_promoting: false } });
        } catch (_) {}
        console.error("[Promote Error]:", err.message);
        res.status(500).json({ message: err.message || "Server error" });
    }
});

/**
 * GET /api/org-admin/promotion-batches
 * Returns past promotion batches for audit dashboard
 */
router.get("/promotion-batches", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const orgId = req.user.organization_id?.toString();
        if (!orgId) return res.status(400).json({ message: "No organization bound." });

        const sb = getChatSb();
        const { data, error } = await sb
            .from("promotion_batches")
            .select("*, to_year:academic_years!promotion_batches_to_academic_year_id_fkey(name)")
            .eq("org_id", orgId)
            .order("batch_created_at", { ascending: false })
            .limit(20);

        if (error) throw error;
        res.json({ batches: data || [] });
    } catch (err) {
        console.error("[Promotion Batches]:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});


// -------------------------------------------------
// HELPDESK / COMMUNICATION CENTER
// -------------------------------------------------
router.get("/helpdesk/threads", isAuthenticated, requireRole("org_admin"), listOrgSupportConversations);
router.post("/helpdesk/threads", isAuthenticated, requireRole("org_admin"), createOrgSupportConversation);
router.get("/helpdesk/threads/:threadId", isAuthenticated, requireRole("org_admin"), getOrgSupportConversation);
router.post("/helpdesk/threads/:threadId/messages", isAuthenticated, requireRole("org_admin"), sendOrgSupportMessage);
router.patch("/helpdesk/threads/:threadId/read", isAuthenticated, requireRole("org_admin"), markOrgSupportConversationRead);

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ENTERPRISE HARDENING: Data Export, Import Validation, Onboarding

// -------------------------------------------------
// HELPDESK / COMMUNICATION CENTER
// -------------------------------------------------
router.get("/helpdesk/threads", isAuthenticated, requireRole("org_admin"), listOrgSupportConversations);
router.post("/helpdesk/threads", isAuthenticated, requireRole("org_admin"), createOrgSupportConversation);
router.get("/helpdesk/threads/:threadId", isAuthenticated, requireRole("org_admin"), getOrgSupportConversation);
router.post("/helpdesk/threads/:threadId/messages", isAuthenticated, requireRole("org_admin"), sendOrgSupportMessage);
router.patch("/helpdesk/threads/:threadId/read", isAuthenticated, requireRole("org_admin"), markOrgSupportConversationRead);

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * GET /api/org-admin/data-export
 * Returns: Full JSON export of all org data (staff, students, applications)
 * Data Ownership compliance â€” clients can download their data at any time.
 */
router.get("/data-export", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        if (!orgId) return res.status(400).json({ message: "No organization bound." });

        const { generateOrgDataExport, recordsToCsv } = await import("../services/data-export.service.js");
        const exportData = await generateOrgDataExport(orgId);

        const format = req.query.format || "json";
        if (format === "csv") {
            const staffCsv = recordsToCsv(exportData.staff, "staff");
            const studentCsv = recordsToCsv(exportData.students, "students");
            const appCsv = recordsToCsv(exportData.applications, "applications");

            const fullCsv = `=== STAFF ===\n${staffCsv}\n=== STUDENTS ===\n${studentCsv}\n=== APPLICATIONS ===\n${appCsv}`;
            res.setHeader("Content-Type", "text/csv");
            res.setHeader("Content-Disposition", `attachment; filename=classgrid_export_${Date.now()}.csv`);
            return res.send(fullCsv);
        }

        res.json({ success: true, ...exportData });
    } catch (err) {
        console.error("[Data Export] Error:", err.message);
        res.status(500).json({ message: "Server error exporting data." });
    }
});

/**
 * POST /api/org-admin/import/validate
 * Body: { rows: [...], import_type: "students" | "faculty" }
 * Returns: Dry-run validation report (no records created)
 */
router.post("/import/validate", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        if (!orgId) return res.status(400).json({ message: "No organization bound." });

        const { rows, import_type } = req.body;
        if (!Array.isArray(rows) || rows.length === 0) {
            return res.status(400).json({ message: "rows must be a non-empty array." });
        }

        const { validateImportBatch } = await import("../services/import-validation.service.js");
        const report = await validateImportBatch(rows, orgId, import_type || "students");

        res.json({ success: true, dry_run: true, ...report });
    } catch (err) {
        console.error("[Import Validate] Error:", err.message);
        res.status(500).json({ message: "Server error validating import." });
    }
});

/**
 * POST /api/org-admin/import/rollback/:batchId
 * Rolls back a previously committed import batch
 */
router.post("/import/rollback/:batchId", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        if (!orgId) return res.status(400).json({ message: "No organization bound." });

        const { rollbackImportBatch } = await import("../services/import-validation.service.js");
        const result = await rollbackImportBatch(req.params.batchId, req.user._id);

        res.json({ success: true, ...result });
    } catch (err) {
        console.error("[Import Rollback] Error:", err.message);
        res.status(500).json({ message: err.message || "Server error during rollback." });
    }
});

/**
 * GET /api/org-admin/import/errors/:batchId
 * Downloads error CSV for a specific import batch
 */
router.get("/import/errors/:batchId", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const ImportBatch = (await import("../models/ImportBatch.js")).default;
        const batch = await ImportBatch.findById(req.params.batchId).lean();
        if (!batch) return res.status(404).json({ message: "Import batch not found." });

        const { generateErrorCsv } = await import("../services/import-validation.service.js");
        const allErrors = [...(batch.failed_rows || []), ...(batch.duplicate_rows || [])];
        const csv = generateErrorCsv(allErrors);

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename=import_errors_${req.params.batchId}.csv`);
        res.send(csv);
    } catch (err) {
        console.error("[Import Errors CSV] Error:", err.message);
        res.status(500).json({ message: "Server error generating error CSV." });
    }
});

/**
 * GET /api/org-admin/onboarding-progress
 * Returns the onboarding checklist status for the org
 */
router.get("/onboarding-progress", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const snapshot = await getOnboardingStatusSnapshot(req.user.organization_id);

        res.json({
            success: true,
            org_name: snapshot.organizationName,
            progress: snapshot.progress,
            completed_steps: snapshot.completed_steps,
            total_steps: snapshot.total_steps,
            percentage: snapshot.percentage,
            is_complete: snapshot.is_complete,
            current_stage: snapshot.stage,
            next_actions: snapshot.next_actions,
            blockers: snapshot.blockers,
        });
    } catch (err) {
        console.error("[Onboarding Progress] Error:", err.message);
        res.status(500).json({ message: "Server error." });
    }
});

/**
 * PATCH /api/org-admin/onboarding-progress
 * Body: { step: "staff_imported", value: true }
 * Updates a specific onboarding step
 */
router.patch("/onboarding-progress", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const { step, value } = req.body;
        const validSteps = TRACKED_ONBOARDING_STEPS;

        if (!validSteps.includes(step)) {
            return res.status(400).json({ message: `Invalid step. Valid: ${validSteps.join(", ")}` });
        }

        const org = await Organization.findById(req.user.organization_id).select("onboarding_progress").lean();
        const current = { ...(org?.onboarding_progress || {}), [step]: !!value };
        const allDone = validSteps.every((trackedStep) => current[trackedStep] === true);
        await markOnboardingStep(req.user.organization_id, step, value);
        await Organization.findByIdAndUpdate(req.user.organization_id, {
            $set: {
                "onboarding_progress.current_stage": deriveOnboardingStage(current),
            },
        });

        res.json({ success: true, message: `Step '${step}' updated.`, all_complete: allDone });
    } catch (err) {
        console.error("[Onboarding Update] Error:", err.message);
        res.status(500).json({ message: "Server error." });
    }
});

/**
 * GET /api/org-admin/onboarding-status
 * Returns the current onboarding stage, next actions, and progress snapshot.
 */
router.get("/onboarding-status", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const snapshot = await getOnboardingStatusSnapshot(req.user.organization_id);
        res.json({ success: true, ...snapshot });
    } catch (err) {
        console.error("[Onboarding Status] Error:", err.message);
        res.status(500).json({ message: "Server error." });
    }
});

router.get("/onboarding-events", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const snapshot = await getOnboardingStatusSnapshot(req.user.organization_id);
        res.json({
            success: true,
            metrics: snapshot.metrics,
            events: snapshot.recent_events || [],
        });
    } catch (err) {
        console.error("[Onboarding Events] Error:", err.message);
        res.status(500).json({ message: "Server error." });
    }
});

/**
 * POST /api/org-admin/regenerate-org-code
 * Regenerates the org code with optional expiry (invalidates old code)
 */
router.post("/regenerate-org-code", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        if (!orgId) return res.status(400).json({ message: "No organization bound." });

        const { expires_in_days } = req.body; // optional: set expiry in days

        const { generateUniqueDualCodes, generateSecureCode } = await import("../services/code-generator.service.js");
        const { organizationCode, honorCode } = await generateUniqueDualCodes(Organization);
        let privateCode = generateSecureCode();
        while (await Organization.exists({ private_code: privateCode })) {
            privateCode = generateSecureCode();
        }

        const update = {
            organizationCode,
            private_code: privateCode,
            honorCode,
            org_code_regenerated_at: new Date(),
        };

        if (expires_in_days && typeof expires_in_days === "number" && expires_in_days > 0) {
            update.org_code_expires_at = new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000);
        } else {
            update.org_code_expires_at = null; // no expiry
        }

        await Organization.findByIdAndUpdate(orgId, { $set: update });

        logAdminAction(req, "regenerate_org_code", "organization", orgId, "Org code regenerated", {});

        res.json({
            success: true,
            message: "Organization join codes regenerated successfully.",
            organizationCode,
            honorCode,
            expires_at: update.org_code_expires_at || "Never",
        });
    } catch (err) {
        console.error("[Regenerate Org Code] Error:", err.message);
        res.status(500).json({ message: "Server error." });
    }
});

// ═══════════════════════════════════════════════════════════
// SUBDOMAIN MANAGEMENT (orgname.classgrid.in)
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/org-admin/subdomain
 * Returns the current subdomain for this organization
 */
router.get("/subdomain", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        if (!orgId) return res.status(400).json({ message: "No organization bound." });

        const org = await Organization.findById(orgId).select("subdomain name").lean();
        if (!org) return res.status(404).json({ message: "Organization not found." });

        res.json({
            subdomain: org.subdomain || null,
            url: org.subdomain ? `${org.subdomain}.classgrid.in` : null,
            name: org.name,
        });
    } catch (err) {
        console.error("[Subdomain GET] Error:", err.message);
        res.status(500).json({ message: "Server error." });
    }
});

/**
 * PATCH /api/org-admin/subdomain
 * Body: { subdomain: "example-campus" }
 * Sets or updates the subdomain slug for this organization.
 * 
 * Rules:
 * - 3-30 characters
 * - Lowercase alphanumeric + hyphens only
 * - Cannot start or end with a hyphen
 * - Cannot be a system subdomain (www, app, admin, api, etc.)
 * - Must be unique across all organizations
 */
router.patch("/subdomain", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        if (!orgId) return res.status(400).json({ message: "No organization bound." });

        const { subdomain } = req.body;

        // Allow clearing subdomain
        if (subdomain === null || subdomain === "") {
            const org = await Organization.findById(orgId).select("subdomain").lean();
            const oldSlug = org?.subdomain;

            await Organization.findByIdAndUpdate(orgId, { $unset: { subdomain: 1 } });

            // Invalidate cache for old slug
            if (oldSlug) {
                try {
                    const { invalidateTenantCache } = await import("../middleware/subdomain-router.middleware.js");
                    invalidateTenantCache(oldSlug);
                } catch (_) { /* best effort */ }
            }

            logAdminAction(req, "clear_subdomain", "organization", orgId, "Subdomain cleared", { old: oldSlug });
            return res.json({ success: true, message: "Subdomain cleared.", subdomain: null, url: null });
        }

        // Validate format
        const slug = String(subdomain).toLowerCase().trim();

        if (slug.length < 3 || slug.length > 30) {
            return res.status(400).json({ message: "Subdomain must be between 3 and 30 characters." });
        }

        if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug)) {
            return res.status(400).json({
                message: "Subdomain can only contain lowercase letters, numbers, and hyphens. Cannot start or end with a hyphen.",
            });
        }

        // Block system subdomains
        const SYSTEM_SUBDOMAINS = new Set([
            "www", "app", "admin", "api", "dev", "staging", "mail", "ftp",
            "superadmin", "v1", "v2", "studio", "docs", "blog", "help",
            "support", "status", "cdn", "static", "assets", "test",
            "demo", "sandbox", "classgrid", "platform", "dashboard",
        ]);

        if (SYSTEM_SUBDOMAINS.has(slug)) {
            return res.status(400).json({ message: `"${slug}" is a reserved subdomain and cannot be used.` });
        }

        // Check uniqueness (exclude current org)
        const existing = await Organization.findOne({ subdomain: slug, _id: { $ne: orgId } }).select("_id name").lean();
        if (existing) {
            return res.status(409).json({
                message: `Subdomain "${slug}" is already taken by another organization.`,
            });
        }

        // Get old slug for cache invalidation
        const currentOrg = await Organization.findById(orgId).select("subdomain").lean();
        const oldSlug = currentOrg?.subdomain;

        if (oldSlug === slug) {
            return res.json({
                success: true,
                message: "Subdomain was already up to date.",
                subdomain: slug,
                url: `${slug}.classgrid.in`,
            });
        }

        // Update
        const updatedOrg = await Organization.findByIdAndUpdate(
            orgId,
            { $set: { subdomain: slug } },
            { returnDocument: 'after', runValidators: true }
        ).select("subdomain name");

        // Invalidate cache for both old and new slugs
        try {
            const { invalidateTenantCache } = await import("../middleware/subdomain-router.middleware.js");
            if (oldSlug) invalidateTenantCache(oldSlug);
            invalidateTenantCache(slug);
        } catch (_) { /* best effort */ }

        try {
            await redis.del(`org:branding:${orgId}`);
        } catch (cacheError) {
            console.warn("[Subdomain PATCH] Branding cache invalidation failed:", cacheError.message);
        }

        // Send email notification to admin
        try {
            const { notifyDomainChange } = await import("../services/domain-change-email.service.js");
            await notifyDomainChange({
                to: req.user.email,
                orgName: updatedOrg.name,
                adminName: req.user.name || "Admin",
                adminEmail: req.user.email,
                oldDomain: oldSlug || "none",
                newDomain: slug,
                organizationId: orgId,
                userId: req.user._id
            });
        } catch (emailErr) {
            console.error("[Subdomain PATCH] Failed to send domain change email:", emailErr);
            // Non-fatal, continue with response
        }

        logAdminAction(req, "update_subdomain", "organization", orgId, updatedOrg.name, {
            old: oldSlug || null,
            new: slug,
        });

        res.json({
            success: true,
            message: `Subdomain set to "${slug}" successfully.`,
            subdomain: slug,
            url: `${slug}.classgrid.in`,
        });
    } catch (err) {
        // Handle MongoDB unique constraint violation
        if (err.code === 11000) {
            return res.status(409).json({ message: "This subdomain is already in use." });
        }
        console.error("[Subdomain PATCH] Error:", err.message);
        res.status(500).json({ message: "Server error." });
    }
});

/**
 * GET /api/org-admin/subdomain/check?slug=example-campus
 * Public-ish availability check (still requires auth for rate-limit safety)
 */
router.get("/subdomain/check", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const slug = String(req.query.slug || "").toLowerCase().trim();

        if (!slug || slug.length < 3) {
            return res.json({ available: false, reason: "Too short (min 3 characters)." });
        }

        if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug)) {
            return res.json({ available: false, reason: "Invalid characters." });
        }

        const SYSTEM_SUBDOMAINS = new Set([
            "www", "app", "admin", "api", "dev", "staging", "mail", "ftp",
            "superadmin", "v1", "v2", "studio", "docs", "blog", "help",
            "support", "status", "cdn", "static", "assets", "test",
            "demo", "sandbox", "classgrid", "platform", "dashboard",
        ]);

        if (SYSTEM_SUBDOMAINS.has(slug)) {
            return res.json({ available: false, reason: "Reserved subdomain." });
        }

        const orgId = req.user.organization_id;
        const existing = await Organization.findOne({ subdomain: slug, _id: { $ne: orgId } }).select("_id").lean();

        res.json({
            available: !existing,
            reason: existing ? "Already taken." : null,
            preview: `${slug}.classgrid.in`,
        });
    } catch (err) {
        console.error("[Subdomain Check] Error:", err.message);
        res.status(500).json({ message: "Server error." });
    }
});

// ======================================================
// CUSTOM DOMAIN MANAGEMENT (for example, portal.example.edu)
// ======================================================

import dns from "dns/promises";
import { isIP } from "node:net";

const CUSTOM_DOMAIN_TYPES = new Set(["custom_domain", "erp_domain"]);
const CLASSGRID_APEX_IP = "76.76.21.21";

function parseCustomDomainInput(rawDomain) {
    if (typeof rawDomain !== "string" || !rawDomain.trim()) {
        return { error: "Domain is required." };
    }

    let candidate = rawDomain.trim().toLowerCase();
    const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(candidate);

    if (hasScheme) {
        let parsed;
        try {
            parsed = new URL(candidate);
        } catch {
            return { error: "Enter a valid hostname, such as portal.example.edu." };
        }

        if (!["http:", "https:"].includes(parsed.protocol)) {
            return { error: "Only HTTP or HTTPS URLs can be converted to a custom hostname." };
        }
        if (parsed.username || parsed.password || parsed.port || parsed.search || parsed.hash || parsed.pathname !== "/") {
            return { error: "Enter a hostname only. Paths, ports, credentials, queries, and fragments are not supported." };
        }
        candidate = parsed.hostname.toLowerCase();
    } else if (/[\\/?#@:]/.test(candidate)) {
        return { error: "Enter a hostname only, without a path, port, credentials, query, or fragment." };
    }

    candidate = candidate.replace(/\.$/, "");
    if (!candidate || candidate.length > 253 || isIP(candidate)) {
        return { error: "Enter a valid public hostname, such as portal.example.edu." };
    }

    const labels = candidate.split(".");
    const validLabel = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
    if (labels.length < 2 || labels.some((label) => !validLabel.test(label)) || /^\d+$/.test(labels.at(-1))) {
        return { error: "Enter a valid hostname, such as portal.example.edu." };
    }

    if (candidate === "classgrid.in" || candidate.endsWith(".classgrid.in")) {
        return { error: "Platform domains cannot be used as custom domains.", status: 403 };
    }

    return { domain: candidate };
}

function isVerifiedDomainConfig(config) {
    return config?.status === "verified" || config?.status === "active";
}

function domainAccessSnapshot(config = {}) {
    return {
        allow_classgrid_url: config.allow_classgrid_url !== false,
        is_enabled: config.is_enabled !== false,
    };
}

async function invalidateCustomDomainCaches(orgId, ...hosts) {
    try {
        await redis.del(`org:branding:${orgId}`);
    } catch (error) {
        console.warn("[Custom Domain] Redis cache invalidation failed:", error.message);
    }

    try {
        const { invalidateTenantCache } = await import("../middleware/subdomain-router.middleware.js");
        hosts.filter(Boolean).forEach((host) => invalidateTenantCache(host));
    } catch (error) {
        console.warn("[Custom Domain] Tenant cache invalidation failed:", error.message);
    }
}

async function queueExternalDomainNotification(req, org, payload) {
    try {
        const { notifyExternalDomainChange } = await import("../services/domain-change-email.service.js");
        const result = await notifyExternalDomainChange({
            to: req.user.email || org.ownerEmail,
            orgName: org.name,
            adminName: req.user.name || "Admin",
            adminEmail: req.user.email || org.ownerEmail,
            organizationId: req.user.organization_id,
            userId: req.user._id || req.user.id,
            ...payload,
        });
        if (!result?.queued) {
            console.warn("[Custom Domain] Notification email was not queued:", result?.reason || "unknown reason");
        }
    } catch (error) {
        console.error("[Custom Domain] Failed to queue notification email:", error.message);
    }
}

function getCustomDomainProjectId(domainType) {
    return domainType === "erp_domain"
        ? process.env.VERCEL_PROJECT_ID
        : process.env.VERCEL_MARKETING_PROJECT_ID;
}

async function detachCustomDomainFromHosting(domain, domainType) {
    const projectId = getCustomDomainProjectId(domainType);
    if (!domain || !process.env.VERCEL_API_TOKEN || !projectId) return;

    const teamQuery = process.env.VERCEL_TEAM_ID
        ? `?teamId=${encodeURIComponent(process.env.VERCEL_TEAM_ID)}`
        : "";
    try {
        const response = await fetch(
            `https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(domain)}${teamQuery}`,
            {
                method: "DELETE",
                headers: { Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}` },
            }
        );
        if (!response.ok && response.status !== 404) {
            console.error("[Custom Domain] Hosting detach failed:", await response.text());
        }
    } catch (error) {
        console.error("[Custom Domain] Hosting detach request failed:", error.message);
    }
}

/**
 * GET /api/org-admin/custom-domain
 * Returns the current custom domain configuration
 */
router.get("/custom-domain", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        if (!orgId) return res.status(400).json({ message: "No organization bound." });

        const org = await Organization.findById(orgId).select("custom_domain erp_domain feature_flags purchased_modules").lean();
        if (!org) return res.status(404).json({ message: "Organization not found." });

        if (!org.feature_flags?.custom_domain_module) {
            return res.status(403).json({ message: "Custom domain feature is not enabled for this organization." });
        }

        res.json({
            custom_domain: org.custom_domain || {
                domain: null,
                status: "pending_verification",
                verification_token: null,
                txt_verified: false,
                cname_verified: false
            },
            erp_domain: org.erp_domain || {
                domain: null,
                status: "pending_verification",
                verification_token: null,
                txt_verified: false,
                cname_verified: false
            },
            purchased_modules: org.purchased_modules || { college_website: false }
        });
    } catch (err) {
        console.error("[Custom Domain GET] Error:", err.message);
        res.status(500).json({ message: "Server error." });
    }
});

/**
 * PATCH /api/org-admin/custom-domain/settings
 * Updates the settings for the custom domain (allow_classgrid_url and is_enabled)
 */
router.patch("/custom-domain/settings", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        if (!orgId) return res.status(400).json({ message: "No organization bound." });

        const { allow_classgrid_url, is_enabled, domainType = "custom_domain" } = req.body;
        if (!CUSTOM_DOMAIN_TYPES.has(domainType)) {
            return res.status(400).json({ message: "Invalid domainType" });
        }

        if (typeof allow_classgrid_url !== "boolean" && typeof is_enabled !== "boolean") {
            return res.status(400).json({ message: "Provide at least one domain setting to update." });
        }
        if (domainType !== "erp_domain" && typeof allow_classgrid_url === "boolean") {
            return res.status(400).json({ message: "The default Classgrid URL setting applies only to the ERP login domain." });
        }

        const currentOrg = await Organization.findById(orgId)
            .select("custom_domain erp_domain feature_flags name ownerEmail")
            .lean();
        if (!currentOrg) return res.status(404).json({ message: "Organization not found." });
        if (!currentOrg.feature_flags?.custom_domain_module) {
            return res.status(403).json({ message: "Custom domain feature is not enabled for this organization." });
        }

        const currentConfig = currentOrg[domainType] || {};
        if (!currentConfig.domain) {
            return res.status(400).json({ message: "No custom domain is registered for this domain type." });
        }

        let nextEnabled = typeof is_enabled === "boolean"
            ? is_enabled
            : currentConfig.is_enabled !== false;
        let nextAllowClassgrid = typeof allow_classgrid_url === "boolean"
            ? allow_classgrid_url
            : currentConfig.allow_classgrid_url !== false;

        if (nextEnabled && !isVerifiedDomainConfig(currentConfig)) {
            return res.status(409).json({ message: "Verify the custom domain before enabling it." });
        }

        if (domainType === "erp_domain") {
            // Exactly one normal ERP entrance stays active. The org-admin emergency
            // route remains available through the Classgrid hostname by design.
            if (typeof is_enabled === "boolean" && is_enabled) nextAllowClassgrid = false;
            if (typeof allow_classgrid_url === "boolean" && allow_classgrid_url) nextEnabled = false;
            if (!nextEnabled && !nextAllowClassgrid) {
                return res.status(409).json({
                    message: "At least one ERP entrance must remain enabled. Enable the default Classgrid URL or the verified custom domain.",
                });
            }
        }

        const oldSettings = domainAccessSnapshot(currentConfig);
        const updateFields = {
            [`${domainType}.is_enabled`]: nextEnabled,
        };
        if (domainType === "erp_domain") {
            updateFields[`${domainType}.allow_classgrid_url`] = nextAllowClassgrid;
        }

        const newSettings = {
            allow_classgrid_url: domainType === "erp_domain" ? nextAllowClassgrid : oldSettings.allow_classgrid_url,
            is_enabled: nextEnabled,
        };
        const settingsChanged = oldSettings.is_enabled !== newSettings.is_enabled
            || (domainType === "erp_domain" && oldSettings.allow_classgrid_url !== newSettings.allow_classgrid_url);

        if (!settingsChanged) {
            return res.json({
                success: true,
                message: "Custom domain settings were already up to date.",
                custom_domain: currentOrg.custom_domain,
                erp_domain: currentOrg.erp_domain,
            });
        }

        const org = await Organization.findByIdAndUpdate(
            orgId,
            { $set: updateFields },
            { returnDocument: 'after', runValidators: true }
        ).select("custom_domain erp_domain name ownerEmail");

        logAdminAction(req, "update_custom_domain_settings", "organization", orgId, org.name, {
            domainType,
            oldSettings,
            newSettings,
        });

        await invalidateCustomDomainCaches(orgId, currentConfig.domain);
        await queueExternalDomainNotification(req, org, {
            action: "settings_updated",
            domainType,
            oldDomain: currentConfig.domain,
            newDomain: currentConfig.domain,
            oldSettings,
            newSettings,
        });

        res.json({
            success: true,
            message: "Custom domain settings updated.",
            custom_domain: org.custom_domain,
            erp_domain: org.erp_domain
        });
    } catch (err) {
        console.error("[Custom Domain Settings PATCH] Error:", err.message);
        res.status(500).json({ message: "Server error." });
    }
});

/**
 * POST /api/org-admin/custom-domain
 * Registers a new custom domain and generates verification tokens
 */
router.post("/custom-domain", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        if (!orgId) return res.status(400).json({ message: "No organization bound." });

        const { domain, domainType = "custom_domain" } = req.body;
        if (!domain) return res.status(400).json({ message: "Domain is required." });
        if (!CUSTOM_DOMAIN_TYPES.has(domainType)) {
            return res.status(400).json({ message: "Invalid domainType" });
        }

        const org = await Organization.findById(orgId).select("custom_domain erp_domain feature_flags name ownerEmail").lean();
        if (!org) return res.status(404).json({ message: "Organization not found." });
        if (!org.feature_flags?.custom_domain_module) {
            return res.status(403).json({ message: "Custom domain feature is not enabled for this organization." });
        }

        if (org[domainType]?.domain) {
            return res.status(409).json({
                message: "A domain is already registered here. Use Edit Domain to change it without resetting branding, or remove it first.",
            });
        }

        const parsedDomain = parseCustomDomainInput(domain);
        if (parsedDomain.error) {
            return res.status(parsedDomain.status || 400).json({ message: parsedDomain.error });
        }
        const cleanDomain = parsedDomain.domain;

        // A hostname can belong to only one slot across the entire platform,
        // including the other domain slot on the same organization.
        const existing = await Organization.findOne({
            $or: [
                { "custom_domain.domain": cleanDomain },
                { "erp_domain.domain": cleanDomain }
            ]
        }).select("_id").lean();
        if (existing) {
            const sameOrganization = String(existing._id) === String(orgId);
            return res.status(409).json({
                message: sameOrganization
                    ? "This hostname is already used by another domain slot in your organization."
                    : "This hostname is already registered to another organization.",
            });
        }

        const verificationToken = crypto.randomBytes(16).toString("hex");

        const updateObj = {};
        updateObj[domainType] = {
            domain: cleanDomain,
            status: "pending_verification",
            verification_token: verificationToken,
            txt_verified: false,
            cname_verified: false,
            ssl_provisioned: false,
            created_at: new Date(),
            verified_at: null,
            allow_classgrid_url: true,
            is_enabled: false
        };

        const updatedOrg = await Organization.findByIdAndUpdate(
            orgId,
            { $set: updateObj },
            { returnDocument: 'after' }
        ).select("custom_domain erp_domain name ownerEmail");

        logAdminAction(req, "register_custom_domain", "organization", orgId, updatedOrg.name, { domainType, domain: cleanDomain });
        
        await invalidateCustomDomainCaches(orgId, cleanDomain);
        await queueExternalDomainNotification(req, updatedOrg, {
            action: "registered",
            domainType,
            newDomain: cleanDomain,
            newSettings: domainAccessSnapshot(updatedOrg[domainType]),
        });

        res.json({
            success: true,
            message: "Custom domain registered. Please configure your DNS records.",
            custom_domain: updatedOrg.custom_domain,
            erp_domain: updatedOrg.erp_domain
        });
    } catch (err) {
        console.error("[Custom Domain POST] Error:", err.message);
        res.status(500).json({ message: "Server error." });
    }
});

/**
 * PATCH /api/org-admin/custom-domain
 * Changes an existing external hostname without deleting or resetting branding.
 * DNS ownership and routing must be verified again for the replacement hostname.
 */
router.patch("/custom-domain", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        if (!orgId) return res.status(400).json({ message: "No organization bound." });

        const { domain, domainType = "custom_domain" } = req.body;
        if (!CUSTOM_DOMAIN_TYPES.has(domainType)) {
            return res.status(400).json({ message: "Invalid domainType" });
        }

        const org = await Organization.findById(orgId)
            .select("custom_domain erp_domain feature_flags name ownerEmail")
            .lean();
        if (!org) return res.status(404).json({ message: "Organization not found." });
        if (!org.feature_flags?.custom_domain_module) {
            return res.status(403).json({ message: "Custom domain feature is not enabled for this organization." });
        }

        const currentConfig = org[domainType];
        if (!currentConfig?.domain) {
            return res.status(400).json({ message: "No existing domain was found. Add a domain first." });
        }

        const parsedDomain = parseCustomDomainInput(domain);
        if (parsedDomain.error) {
            return res.status(parsedDomain.status || 400).json({ message: parsedDomain.error });
        }
        const cleanDomain = parsedDomain.domain;
        const oldDomain = currentConfig.domain;

        if (cleanDomain === oldDomain) {
            return res.status(400).json({ message: "Enter a different hostname to make a change." });
        }

        const existing = await Organization.findOne({
            $or: [
                { "custom_domain.domain": cleanDomain },
                { "erp_domain.domain": cleanDomain },
            ],
        }).select("_id").lean();
        if (existing) {
            const sameOrganization = String(existing._id) === String(orgId);
            return res.status(409).json({
                message: sameOrganization
                    ? "This hostname is already used by another domain slot in your organization."
                    : "This hostname is already registered to another organization.",
            });
        }

        const verificationToken = crypto.randomBytes(16).toString("hex");
        const replacementConfig = {
            domain: cleanDomain,
            status: "pending_verification",
            verification_token: verificationToken,
            txt_verified: false,
            cname_verified: false,
            ssl_provisioned: false,
            created_at: new Date(),
            verified_at: null,
            allow_classgrid_url: true,
            is_enabled: false,
        };

        const updatedOrg = await Organization.findByIdAndUpdate(
            orgId,
            { $set: { [domainType]: replacementConfig } },
            { returnDocument: 'after', runValidators: true }
        ).select("custom_domain erp_domain name ownerEmail");

        await detachCustomDomainFromHosting(oldDomain, domainType);
        await invalidateCustomDomainCaches(orgId, oldDomain, cleanDomain);
        await queueExternalDomainNotification(req, updatedOrg, {
            action: "changed",
            domainType,
            oldDomain,
            newDomain: cleanDomain,
            oldSettings: domainAccessSnapshot(currentConfig),
            newSettings: domainAccessSnapshot(replacementConfig),
        });

        logAdminAction(req, "change_custom_domain", "organization", orgId, updatedOrg.name, {
            domainType,
            oldDomain,
            newDomain: cleanDomain,
            brandingPreserved: true,
        });

        res.json({
            success: true,
            message: "Domain changed. Branding was preserved; configure and verify DNS for the new hostname.",
            custom_domain: updatedOrg.custom_domain,
            erp_domain: updatedOrg.erp_domain,
        });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ message: "This hostname is already in use." });
        }
        console.error("[Custom Domain PATCH] Error:", err.message);
        res.status(500).json({ message: "Server error while changing the custom domain." });
    }
});

/**
 * POST /api/org-admin/custom-domain/verify
 * Performs DNS lookup to verify TXT and CNAME records
 */
router.post("/custom-domain/verify", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const { domainType = "custom_domain" } = req.body;
        if (!CUSTOM_DOMAIN_TYPES.has(domainType)) {
            return res.status(400).json({ message: "Invalid domainType" });
        }

        const orgId = req.user.organization_id;
        if (!orgId) return res.status(400).json({ message: "No organization bound." });
        const org = await Organization.findById(orgId)
            .select("custom_domain erp_domain feature_flags name ownerEmail")
            .lean();
        if (!org) return res.status(404).json({ message: "Organization not found." });
        if (!org.feature_flags?.custom_domain_module) {
            return res.status(403).json({ message: "Custom domain feature is not enabled for this organization." });
        }

        const domainConfig = org[domainType];
        if (!domainConfig || !domainConfig.domain || !domainConfig.verification_token) {
            return res.status(400).json({ message: "No pending custom domain found." });
        }

        const { domain, verification_token } = domainConfig;
        let txtVerified = false;
        let cnameVerified = false;
        let hasConflicts = false;
        let conflictingRecords = [];
        
        // Use a custom resolver bypassing local OS cache (hits Cloudflare and Google directly for freshest state)
        const resolver = new dns.Resolver();
        resolver.setServers(['1.1.1.1', '8.8.8.8']);
        
        // 1. Verify TXT Record
        try {
            const txtRecords = await resolver.resolveTxt(`_classgrid-verify.${domain}`);
            const flatRecords = txtRecords.flat();
            txtVerified = flatRecords.some(r => r === `classgrid-verify=${verification_token}`);
        } catch (err) {
            console.log(`[DNS Verify] TXT lookup failed for ${domain}:`, err.code);
        }

        // 2. Verify routing. Subdomains normally use CNAME; apex domains use A.
        try {
            const cnameRecords = await resolver.resolveCname(domain);
            const normalizedRecords = cnameRecords.map((record) => record.toLowerCase().replace(/\.$/, ""));
            const isApprovedCname = (record) =>
                record === "classgrid.in"
                || record.endsWith(".classgrid.in")
                || record === "cname.vercel-dns.com"
                || record.endsWith(".vercel-dns.com")
                || record.endsWith(".vercel.app")
                || record.endsWith(".vercel.com");
            cnameVerified = normalizedRecords.some(isApprovedCname);
            conflictingRecords = normalizedRecords.filter((record) => !isApprovedCname(record));
            hasConflicts = cnameVerified && conflictingRecords.length > 0;
        } catch (err) {
            try {
                const aRecords = await resolver.resolve4(domain);
                cnameVerified = aRecords.includes(CLASSGRID_APEX_IP);
                conflictingRecords = aRecords.filter((record) => record !== CLASSGRID_APEX_IP);
                hasConflicts = cnameVerified && conflictingRecords.length > 0;
            } catch (aErr) {
                console.log(`[DNS Verify] CNAME/A lookup failed for ${domain}:`, aErr.code || err.code);
            }
        }

        const routingAndOwnershipVerified = txtVerified && cnameVerified;
        const isFullyVerified = routingAndOwnershipVerified && !hasConflicts;

        const resolvedStatus = routingAndOwnershipVerified
            ? (hasConflicts ? "verified_with_conflicts" : "verified")
            : "pending_verification";

        const updateObj = {
            [`${domainType}.txt_verified`]: txtVerified,
            [`${domainType}.cname_verified`]: cnameVerified,
            [`${domainType}.status`]: resolvedStatus,
            [`${domainType}.verified_at`]: isFullyVerified ? (domainConfig.verified_at || new Date()) : null,
        };
        if (isFullyVerified) {
            updateObj[`${domainType}.is_enabled`] = true;
            if (domainType === "erp_domain") {
                updateObj[`${domainType}.allow_classgrid_url`] = false;
            }
        }

        const updatedOrg = await Organization.findByIdAndUpdate(
            orgId,
            { $set: updateObj },
            { returnDocument: 'after', runValidators: true }
        ).select("custom_domain erp_domain name ownerEmail");

        if (isFullyVerified) {
            logAdminAction(req, "verify_custom_domain", "organization", orgId, "Custom Domain Verified", { domainType, domain });
            
            // ==========================================
            // AUTOMATED VERCEL INTEGRATION
            // ==========================================
            const targetProjectId = getCustomDomainProjectId(domainType);

            if (process.env.VERCEL_API_TOKEN && targetProjectId) {
                try {
                    const vercelRes = await fetch(`https://api.vercel.com/v10/projects/${targetProjectId}/domains`, {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${process.env.VERCEL_API_TOKEN}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ name: domain })
                    });
                    
                    if (!vercelRes.ok) {
                        const errData = await vercelRes.json();
                        console.error("[Vercel API Error]:", errData);
                    } else {
                        console.log(`[Vercel API] Successfully attached ${domain} to project ${targetProjectId}.`);
                    }
                } catch (vercelErr) {
                    console.error("[Vercel Fetch Error]:", vercelErr.message);
                }
            } else {
                console.warn(`[Vercel API] VERCEL_API_TOKEN or Project ID for ${domainType} not set in .env. Skipping automated domain attachment.`);
            }
        }

        await invalidateCustomDomainCaches(orgId, domain);

        const wasAlreadyVerified = isVerifiedDomainConfig(domainConfig);
        if (isFullyVerified && !wasAlreadyVerified) {
            await queueExternalDomainNotification(req, updatedOrg, {
                action: "verified",
                domainType,
                oldDomain: domain,
                newDomain: domain,
                oldSettings: domainAccessSnapshot(domainConfig),
                newSettings: domainAccessSnapshot(updatedOrg[domainType]),
            });
        }

        let message;
        if (hasConflicts) {
            message = `Ownership and Classgrid routing were found, but conflicting DNS record(s) remain: ${conflictingRecords.join(", ")}. Remove the conflicting records and verify again.`;
        } else if (!isFullyVerified) {
            message = "Verification pending. Check both the ownership TXT record and the routing CNAME or A record.";
        } else {
            message = "Domain verified successfully! SSL provisioning will begin.";
        }

        res.json({
            success: true,
            isFullyVerified,
            hasConflicts,
            conflictingRecords,
            txtVerified,
            cnameVerified,
            custom_domain: updatedOrg.custom_domain,
            erp_domain: updatedOrg.erp_domain,
            message
        });
    } catch (err) {
        console.error("[Custom Domain Verify] Error:", err.message);
        res.status(500).json({ message: "Server error during verification." });
    }
});

/**
 * DELETE /api/org-admin/custom-domain
 * Removes the custom domain
 */
router.delete("/custom-domain", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const resolvedDomainType = req.body.domainType || req.query.domainType || "custom_domain";
        if (!CUSTOM_DOMAIN_TYPES.has(resolvedDomainType)) {
            return res.status(400).json({ message: "Invalid domainType" });
        }

        const orgId = req.user.organization_id;
        if (!orgId) return res.status(400).json({ message: "No organization bound." });
        const org = await Organization.findById(orgId)
            .select("custom_domain erp_domain feature_flags name ownerEmail")
            .lean();
        if (!org) return res.status(404).json({ message: "Organization not found." });
        if (!org.feature_flags?.custom_domain_module) {
            return res.status(403).json({ message: "Custom domain feature is not enabled for this organization." });
        }
        
        const domainToDelete = org[resolvedDomainType]?.domain;
        if (!domainToDelete) {
            return res.status(400).json({ message: "No custom domain is registered for this domain type." });
        }
        const oldSettings = domainAccessSnapshot(org[resolvedDomainType]);

        // CRITICAL SECURITY PRECAUTION: Never allow the backend to delete our own platform domains from Vercel
        if (domainToDelete === "classgrid.in" || domainToDelete?.endsWith(".classgrid.in")) {
            return res.status(403).json({ message: "Security block: Cannot delete core platform domains." });
        }

        const updateObj = {
            [resolvedDomainType]: {
                domain: null,
                status: "pending_verification",
                verification_token: null,
                txt_verified: false,
                cname_verified: false,
                ssl_provisioned: false,
                allow_classgrid_url: true,
                is_enabled: true
            },
            site_title: "Classgrid ERP",
            favicon_url: "",
            campus_photo_url: "",
            brand_colors: {
                primary: "#6366f1",
                secondary: "#4f46e5"
            }
        };

        await Organization.findByIdAndUpdate(orgId, {
            $set: updateObj
        });

        const targetProjectId = resolvedDomainType === "erp_domain" 
            ? process.env.VERCEL_PROJECT_ID 
            : process.env.VERCEL_MARKETING_PROJECT_ID;

        // Remove from Vercel if configured
        if (domainToDelete && process.env.VERCEL_API_TOKEN && targetProjectId) {
            try {
                const vercelRes = await fetch(`https://api.vercel.com/v9/projects/${targetProjectId}/domains/${domainToDelete}?teamId=${process.env.VERCEL_TEAM_ID || ''}`, {
                    method: "DELETE",
                    headers: {
                        "Authorization": `Bearer ${process.env.VERCEL_API_TOKEN}`
                    }
                });
                
                if (!vercelRes.ok) {
                    console.error("[Vercel API Error on Delete]:", await vercelRes.json());
                } else {
                    console.log(`[Vercel API] Successfully detached ${domainToDelete} from project ${targetProjectId}.`);
                }
            } catch (err) {
                console.error("[Vercel Fetch Error on Delete]:", err.message);
            }
        }

        logAdminAction(req, "delete_custom_domain", "organization", orgId, org.name, { domainType: resolvedDomainType, old_domain: domainToDelete });

        await invalidateCustomDomainCaches(orgId, domainToDelete);
        await queueExternalDomainNotification(req, org, {
            action: "removed",
            domainType: resolvedDomainType,
            oldDomain: domainToDelete,
            oldSettings,
            newSettings: { allow_classgrid_url: true, is_enabled: true },
            brandingReset: true,
        });

        res.json({ success: true, message: "Custom domain removed." });
    } catch (err) {
        console.error("[Custom Domain DELETE] Error:", err.message);
        res.status(500).json({ message: "Server error." });
    }
});

// ======================================================
// GET /api/org-admin/dashboard/metrics
// Real MongoDB metrics via Controller layer
// ======================================================
router.get('/dashboard/metrics', isAuthenticated, requireOrganization, attachInstitutionProfile, getOrgDashboardMetrics);

/**
 * PATH: /api/org-admin/join-codes
 * Access: org_admin only
 * Desc: Retrieves the organization codes (organizationCode and honorCode)
 */
router.get("/join-codes", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        if (!orgId) return res.status(400).json({ message: "No organization bound." });

        const org = await Organization.findById(orgId).select("organizationCode honorCode private_code org_type _id");
        if (!org) return res.status(404).json({ message: "Organization not found." });

        res.json({
            tenantId: org._id.toString(),
            organizationCode: org.organizationCode || org.private_code || "",
            honorCode: org.honorCode || "",
            orgType: org.org_type || "",
        });
    } catch (err) {
        console.error("[Join Codes Error]:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * PATH: /api/org/branding (Often prefixed by /api/org-admin in express mounting)
 * Access: org_admin only
 * Desc: Retrieves the organization's custom branding (logo, favicon, theme colors) and custom domain status
 */
router.get("/branding", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        if (!orgId) return res.status(400).json({ message: "No organization bound." });

        const cacheKey = `org:branding:${orgId}`;
        const cached = await redis.get(cacheKey);
        if (cached) {
            return res.json(JSON.parse(cached));
        }

        const org = await Organization.findById(orgId).select("logo_url sidebar_logo_url favicon_url campus_photo_url social_links custom_domain erp_domain site_title subdomain name sidebar_name brand_colors branding.theme_colors");
        if (!org) return res.status(404).json({ message: "Organization not found." });

        const themeColors = getThemeColors(org);
        const brandColors = resolveBrandColors(org);
        const responseData = {
            logo_url: org.logo_url || "",
            sidebar_logo_url: org.sidebar_logo_url || "",
            favicon_url: org.favicon_url || "",
            campus_photo_url: org.campus_photo_url || "",
            social_links: org.social_links || {},
            has_custom_domain: !!org.custom_domain?.domain && org.custom_domain?.is_enabled !== false,
            has_erp_domain: !!org.erp_domain?.domain && org.erp_domain?.is_enabled !== false,
            site_title: org.site_title || "Classgrid ERP",
            subdomain: org.subdomain,
            name: org.name || "",
            sidebar_name: org.sidebar_name || "",
            brand_colors: brandColors,
            branding: {
                theme_colors: {
                    ...themeColors,
                    primary: brandColors.primary,
                    secondary: brandColors.secondary,
                },
            },
        };

        await redis.set(cacheKey, JSON.stringify(responseData), "EX", 3600);
        res.json(responseData);
    } catch (err) {
        console.error("[Org Branding GET Error]:", err.message);
        res.status(500).json({ message: "Server error fetching branding." });
    }
});

/**
 * PATH: /api/org/branding
 */
router.patch("/branding", isAuthenticated, requireRole("org_admin"), async (req, res) => {
    try {
        const { logo_url, sidebar_logo_url, favicon_url, campus_photo_url, social_links, site_title, name, sidebar_name, brand_colors } = req.body;
        const orgId = req.user.organization_id?._id || req.user.organization_id;
        
        if (!orgId) return res.status(400).json({ message: "No organization bound." });

        const updateData = {};
        if (logo_url !== undefined) updateData.logo_url = logo_url;
        if (sidebar_logo_url !== undefined) updateData.sidebar_logo_url = sidebar_logo_url;
        if (favicon_url !== undefined) updateData.favicon_url = favicon_url;
        if (campus_photo_url !== undefined) updateData.campus_photo_url = campus_photo_url;
        if (social_links !== undefined) updateData.social_links = social_links;
        if (site_title !== undefined) updateData.site_title = site_title;
        if (name !== undefined) updateData.name = name;
        if (sidebar_name !== undefined) updateData.sidebar_name = sidebar_name;

        if (brand_colors !== undefined) {
            if (!brand_colors || typeof brand_colors !== "object" || Array.isArray(brand_colors)) {
                return res.status(400).json({ message: "brand_colors must be an object with primary and secondary hex colors." });
            }

            for (const colorKey of ["primary", "secondary"]) {
                if (brand_colors[colorKey] === undefined) continue;
                const color = normalizeBrandHex(brand_colors[colorKey]);
                if (!HEX_COLOR_PATTERN.test(color)) {
                    return res.status(400).json({ message: `${colorKey} brand color must be a valid hex value (example: #00E590).` });
                }
                updateData[`brand_colors.${colorKey}`] = color;
                updateData[`branding.theme_colors.${colorKey}`] = color;
            }
        }

        const updatedOrg = await Organization.findByIdAndUpdate(
            orgId,
            { $set: updateData },
            { returnDocument: 'after', runValidators: true }
        ).select("logo_url sidebar_logo_url favicon_url campus_photo_url social_links site_title name sidebar_name subdomain brand_colors branding.theme_colors custom_domain.domain erp_domain.domain");

        if (!updatedOrg) return res.status(404).json({ message: "Organization not found." });

        logAdminAction(req, "update_branding", "organization", orgId, updatedOrg.name, updateData);

        const themeColors = getThemeColors(updatedOrg);
        const brandColors = resolveBrandColors(updatedOrg);

        await redis.del(`org:branding:${orgId}`);
        if (updatedOrg.subdomain) {
            await redis.del(`branding:${String(updatedOrg.subdomain).toLowerCase().trim()}`);
        }
        await redis.del(`user:profile:${req.user._id}`);
        await redis.del(`user:profile:v2:${req.user._id}`);

        try {
            const { getIO } = await import("../services/socket.service.js");
            const io = getIO();
            if (io) {
                // Inform all connected users in this org to refresh their profiles/branding
                io.to(`org:${orgId}`).emit("user_profile_updated");
            }
        } catch (socketErr) {
            console.error("[Org Branding Socket Error]:", socketErr.message);
        }

        // Invalidate the in-memory branding cache (used by branding-resolver for HTML injection)
        // so the next page load picks up the new favicon/title immediately.
        if (updatedOrg.subdomain) {
            invalidateBrandingCache(`${updatedOrg.subdomain}.classgrid.in`);
        }
        if (updatedOrg.custom_domain?.domain) {
            invalidateBrandingCache(updatedOrg.custom_domain.domain);
        }
        if (updatedOrg.erp_domain?.domain) {
            invalidateBrandingCache(updatedOrg.erp_domain.domain);
        }

        res.json({
            message: "Organization branding updated successfully",
            branding: {
                logo_url: updatedOrg.logo_url,
                sidebar_logo_url: updatedOrg.sidebar_logo_url,
                favicon_url: updatedOrg.favicon_url,
                campus_photo_url: updatedOrg.campus_photo_url,
                social_links: updatedOrg.social_links,
                site_title: updatedOrg.site_title,
                name: updatedOrg.name,
                sidebar_name: updatedOrg.sidebar_name,
                brand_colors: brandColors,
                theme_colors: {
                    ...themeColors,
                    primary: brandColors.primary,
                    secondary: brandColors.secondary,
                },
            }
        });
    } catch (err) {
        console.error("[Org Branding Error]:", err.message);
        res.status(500).json({ message: "Server error updating branding." });
    }
});
/**
 * PATH: /api/org/switch-role
 * Access: Authenticated users
 * Desc: Switch active role context
 */
router.post("/switch-role", isAuthenticated, async (req, res) => {
    try {
        const { targetRole } = req.body;
        
        if (!targetRole) return res.status(400).json({ error: "Target role is required." });

        if (req.user.role === targetRole) {
            return res.json({ message: "Role is already active." });
        }

        if (!req.user.additional_roles.includes(targetRole) && req.user.role !== "super_admin") {
            // Super admins can switch to any role for testing/context
            // But normal users can only switch to roles they possess
            if (!req.user.additional_roles.includes(targetRole)) {
                return res.status(403).json({ error: "You do not have permission to switch to this role." });
            }
        }

        // Swap the roles
        const oldRole = req.user.role;
        req.user.role = targetRole;
        if (!req.user.additional_roles.includes(oldRole) && oldRole !== 'super_admin') {
            req.user.additional_roles.push(oldRole);
        }

        await req.user.save();

        res.json({ message: "Active role switched successfully." });
    } catch (err) {
        console.error("[Switch Role Error]:", err.message);
        res.status(500).json({ error: "Server error switching role." });
    }
});

export default router;

