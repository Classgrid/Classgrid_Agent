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

import { isFeatureBlocked, getTerminology } from "../utils/terminology.js";

/**
 * Hierarchy Validator Middleware
 * 
 * Validates that incoming requests respect the organization's structure_type.
 * If a Coaching class tries to create a "Semester" → 400 Bad Request.
 * If a School tries to create a "Sub Batch" → 400 Bad Request.
 * 
 * Usage in routes:
 *   import { validateHierarchyRequest, enforcePlanBoundary } from "../middleware/hierarchy-validator.middleware.js";
 * 
 *   router.post("/hierarchy/node", auth, validateHierarchyRequest, createNode);
 *   router.post("/hierarchy/semester", auth, enforcePlanBoundary("period"), createSemester);
 */

/**
 * General hierarchy request validator.
 * Reads req.body.level_type and checks if it's allowed for the org's structure_type.
 * Requires req.organization (set by auth middleware) to have structure_type.
 */
export async function validateHierarchyRequest(req, res, next) {
    try {
        let organization = req.organization;

        // If not found, fetch from DB using user's org id
        if (!organization && req.user?.organization_id) {
            const { default: Organization } = await import("../models/Organization.js");
            organization = await Organization.findById(req.user.organization_id).lean();
        }

        const structureType = organization?.structure_type;
        if (!structureType) {
            return res.status(400).json({
                error: "Organization structure_type not found. Please configure the organization first.",
            });
        }
        
        // Attachment for controller use
        req.organization = organization;

        const { level_type } = req.body;
        if (!level_type) {
            return next(); // Not a hierarchy creation request, pass through
        }

        // Map level_type to feature key for blocking check
        const LEVEL_TO_FEATURE = {
            semester: "period",
            division: "division",
            sub_batch: "sub_batch",
            year: "year",
        };

        const featureKey = LEVEL_TO_FEATURE[level_type];
        if (featureKey && isFeatureBlocked(structureType, featureKey)) {
            const terms = getTerminology(structureType);
            return res.status(400).json({
                error: `${level_type} is not available for ${terms.org_label} organizations.`,
                hint: `Organization type "${structureType}" does not support "${level_type}". Allowed hierarchy: ${terms.hierarchy.join(" → ")}`,
            });
        }

        // Junior College boundary enforcement: only 11th and 12th
        if (structureType === "junior_college" && level_type === "standard") {
            const name = req.body.name?.trim();
            const allowed = ["11th", "12th", "11", "12", "XI", "XII"];
            if (name && !allowed.some((a) => name.toLowerCase().includes(a.toLowerCase()))) {
                return res.status(403).json({
                    error: "Junior Colleges can only have 11th and 12th standards.",
                    hint: `Attempted to create "${name}" which is outside the allowed grade boundary.`,
                });
            }
        }

        // Sub-batch validation: only allowed if org has allow_sub_batches = true
        if (level_type === "sub_batch") {
            if (!req.organization?.allow_sub_batches) {
                return res.status(400).json({
                    error: "Sub-batches (lab splitting) are not enabled for this organization.",
                    hint: "Set allow_sub_batches to true in organization settings to enable lab batch splitting.",
                });
            }
        }

        next();
    } catch (err) {
        return res.status(500).json({
            error: "Hierarchy validation failed.",
            details: err.message,
        });
    }
}

/**
 * Enforce that a specific feature is available for the org type.
 * Use as a route-level guard for endpoints tied to specific features.
 * 
 * @param {string} feature - The feature to check: "division", "period", "sub_batch", "year"
 * @returns {Function} Express middleware
 * 
 * Usage:
 *   router.post("/semesters", auth, enforcePlanBoundary("period"), createSemester);
 */
export function enforcePlanBoundary(feature) {
    return async (req, res, next) => {
        let organization = req.organization;

        if (!organization && req.user?.organization_id) {
            const { default: Organization } = await import("../models/Organization.js");
            organization = await Organization.findById(req.user.organization_id).lean();
        }

        const structureType = organization?.structure_type;
        if (!structureType) {
            return res.status(400).json({
                error: "Organization structure_type not configured.",
            });
        }

        req.organization = organization;

        if (isFeatureBlocked(structureType, feature)) {
            const terms = getTerminology(structureType);
            return res.status(400).json({
                error: `This feature is not available for ${terms.org_label} organizations.`,
                blocked_feature: feature,
                org_type: structureType,
            });
        }

        next();
    };
}
