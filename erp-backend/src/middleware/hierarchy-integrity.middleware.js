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

import { getTerminology, isFeatureBlocked } from '../utils/terminology.js';

/**
 * Hierarchy Integrity Middleware (Day 1)
 * Enforces strict plan-specific rules on incoming requests.
 * Prevents "Illegal Level Requests" (e.g., Coaching asking for Semesters).
 */
export const validateHierarchyRequest = async (req, res, next) => {
    try {
        const organization = req.organization; // populated by subdomain or auth
        if (!organization) return next();

        const structureType = organization.structure_type || 'engineering';
        const levelType = req.body.level_type || req.query.level_type;

        if (levelType) {
            // Check if this type of node is blocked for this institution plan
            if (isFeatureBlocked(structureType, levelType)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid request: The "${structureType}" plan does not support nodes of type "${levelType}".`,
                    terminology: getTerminology(structureType)
                });
            }
        }

        next();
    } catch (error) {
        console.error("Hierarchy Integrity Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

/**
 * Ensures that if a student is being registered, their student_id matches terminology rules.
 * e.g. PRN for Engineering, Roll No for School.
 */
export const validateIdentityField = (req, res, next) => {
    const organization = req.organization;
    if (!organization) return next();

    const terms = getTerminology(organization.structure_type);
    
    // If the body contains keys that don't match terminology, normalize them
    // (Helps frontends that might send "roll_no" instead of "prn")
    if (terms.student_id === 'PRN' && req.body.roll_no) {
        req.body.prn = req.body.roll_no;
        delete req.body.roll_no;
    }

    next();
};
