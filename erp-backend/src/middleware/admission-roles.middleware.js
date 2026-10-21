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

import Organization from "../models/Organization.js";

/**
 * Edge Case 10: Role-Based Access for Admission Staff (Multi-Role Aware)
 * 
 * Verifies if the authenticated user has one of the allowed admission roles.
 * Now checks BOTH `role` (primary) and `additional_roles` (secondary) arrays.
 * 
 * Admission roles are hierarchical/specialized:
 * - org_admin: Full access to everything
 * - admission_head: Full access to admission portal, configuration, and generation
 * - admission_verifier: Can verify documents and approve/reject applications
 * - admission_counselor: Can view applications and call students
 * - admission_clerk: Can view applications and do desk-enrollment
 * 
 * @param {Array<string>} allowedRoles - Array of roles allowed to access the route
 */
export const requireAdmissionRole = (allowedRoles = []) => {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.organization_id) {
                return res.status(401).json({ error: "Unauthorized access. No organization context." });
            }

            const userRoles = getUserRoles(req.user);

            // Check if any of the user's roles match the allowed roles
            const hasAccess = userRoles.some(r => allowedRoles.includes(r));
            if (hasAccess) {
                return next();
            }

            return res.status(403).json({ 
                error: "Forbidden. Insufficient admission permissions.",
                required_roles: allowedRoles,
                user_roles: userRoles
            });
        } catch (err) {
            console.error("Admission Role Check Error:", err);
            return res.status(500).json({ error: "Server error checking permissions." });
        }
    };
};

/**
 * Generic Role-Based Access Control Middleware (Multi-Role Aware)
 * 
 * Use this for ANY route that needs role gating (not just admissions).
 * Examples:
 *   requireRole(["fee_manager", "org_admin"])  → fee routes
 *   requireRole(["librarian", "org_admin"])    → library routes
 *   requireRole(["hod", "principal", "org_admin"]) → department analytics
 * 
 * @param {Array<string>} allowedRoles - Array of roles allowed to access the route
 */
export const requireRole = (allowedRoles = []) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized. Please log in." });
        }

        const userRoles = getUserRoles(req.user);
        const hasAccess = userRoles.some(r => allowedRoles.includes(r));

        if (hasAccess) {
            return next();
        }

        return res.status(403).json({
            error: "Forbidden. You do not have the required role for this action.",
            required_roles: allowedRoles,
            user_roles: userRoles
        });
    };
};

/**
 * Utility: Extract all roles from a user (primary + additional)
 * @param {Object} user - The user object from req.user
 * @returns {string[]} - Array of all roles the user holds
 */
export const getUserRoles = (user) => {
    const roles = [user.role];
    if (user.additional_roles && Array.isArray(user.additional_roles)) {
        roles.push(...user.additional_roles);
    }
    // org_admin is a universal super-role within their org
    return [...new Set(roles)];
};

/**
 * Utility: Check if a user has a specific role (primary or additional)
 * @param {Object} user - The user object
 * @param {string} role - The role to check
 * @returns {boolean}
 */
export const userHasRole = (user, role) => {
    return getUserRoles(user).includes(role);
};
