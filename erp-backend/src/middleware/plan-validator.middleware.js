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
 * PlanValidator — Enforces institutional logic boundaries.
 * 
 * Prevents "feature leakage" where a Coaching class might try to use
 * College-only structures like Semesters, or Schools try to use
 * Engineering-only Lab Batches.
 */
export const validateStructureAction = async (req, res, next) => {
    try {
        const organization_id = req.user.organization_id;
        if (!organization_id) return next();

        const organization = await Organization.findById(organization_id).select('org_type structure_type');
        if (!organization) return next();

        const { org_type, structure_type } = organization;
        const requestedUrl = req.originalUrl.toLowerCase();

        // 1. Coaching vs Semesters
        if (org_type === 'coaching' && requestedUrl.includes('semester')) {
            return res.status(400).json({
                success: false,
                message: "Semesters are not available for Coaching plans. Use Batches instead.",
                code: "PLAN_CONSTRAINT_VIOLATION"
            });
        }

        // 2. Junior College vs Standard Boundary (11th & 12th only)
        if (org_type === 'junior_college') {
            const { standard } = req.body;
            if (standard && !['11', '12', '11th', '12th'].includes(standard.toString().toLowerCase())) {
                return res.status(403).json({
                    success: false,
                    message: "Junior College plans are restricted to 11th and 12th grades only.",
                    code: "HIERARCHY_BOUNDARY_VIOLATION"
                });
            }
        }

        // 3. School (No Div) vs Divisions
        if (structure_type === 'school_no_div' && requestedUrl.includes('division')) {
             return res.status(400).json({
                success: false,
                message: "Divisions are disabled for this organization structure.",
                code: "PLAN_CONSTRAINT_VIOLATION"
            });
        }

        next();
    } catch (error) {
        console.error("[PlanValidator] Error:", error.message);
        next();
    }
};

export default validateStructureAction;
