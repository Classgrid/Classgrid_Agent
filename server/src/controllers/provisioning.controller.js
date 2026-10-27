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

import { provisionDemoOrg } from '../services/provisioning.service.js';

/**
 * Super Admin Endpoint: Manually provision a new tenant
 * POST /api/admin/organizations/provision
 */
export const handleManualProvisioning = async (req, res) => {
    try {
        const { admin, organization } = req.body;

        if (!admin?.phone_number || !organization?.name) {
            return res.status(400).json({ message: "Admin phone and Organization name are required." });
        }

        // Only Super Admins can use this internal provisioning tool
        if (req.user.role !== 'super_admin') {
            return res.status(403).json({ message: "Only platform administrators can provision new tenants." });
        }

        const result = await provisionDemoOrg(admin, organization);

        const io = req.app.get("io");
        if (io) io.emit("platform_analytics_updated");

        res.status(201).json({
            message: "Tenant provisioned successfully",
            data: result
        });

    } catch (error) {
        console.error("Provisioning Error:", error);
        res.status(500).json({ 
            message: "Provisioning failed", 
            error: error.message 
        });
    }
};

/**
 * Public Endpoint: Self-service demo provisioning
 * POST /api/public/demo/provision
 */
export const handleSelfServiceDemo = async (req, res) => {
    try {
        const { admin, organization } = req.body;

        // Add rate limiting here in production to prevent spam
        
        const result = await provisionDemoOrg({
            ...admin,
            role: 'org_admin'
        }, {
            ...organization,
            org_type: organization.org_type || 'school'
        });

        const io = req.app.get("io");
        if (io) io.emit("platform_analytics_updated");

        res.status(201).json({
            message: "Demo institution created. Redirecting to your portal...",
            subdomain: result.organization.subdomain
        });

    } catch (error) {
        console.error("Self-Service Provisioning Error:", error);
        res.status(500).json({ message: "Could not create demo. Please try again later." });
    }
};
