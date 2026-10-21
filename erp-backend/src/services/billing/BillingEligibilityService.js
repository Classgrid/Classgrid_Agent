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

import BillingEligibilityRule from "../../models/BillingEligibilityRule.js";

/**
 * BillingEligibilityService
 * Validates if an organization can subscribe to a given plan or module based on rules.
 */
class BillingEligibilityService {
    /**
     * Check if an org is eligible for a plan or module.
     * @param {Object} orgContext - Retrieved from OrganizationBillingContextService
     * @param {String} entityType - "PLAN" or "MODULE"
     * @param {String} entityId - ObjectId string
     */
    static async checkEligibility(orgContext, entityType, entityId) {
        const rules = await BillingEligibilityRule.find({
            entityType,
            entityId,
            effectiveFrom: { $lte: new Date() },
            $or: [
                { effectiveUntil: null },
                { effectiveUntil: { $gt: new Date() } }
            ]
        }).lean();

        // If no rules exist, default to eligible
        if (rules.length === 0) return { eligible: true };

        for (const rule of rules) {
            // Check Exclusions First
            if (rule.excludedOrgTypes.includes(orgContext.orgType)) return { eligible: false, reason: `OrgType ${orgContext.orgType} is explicitly excluded.` };
            if (rule.excludedStructureTypes.includes(orgContext.structureType)) return { eligible: false, reason: `StructureType ${orgContext.structureType} is explicitly excluded.` };

            // Check Inclusions
            if (rule.allowedOrgTypes.length > 0 && !rule.allowedOrgTypes.includes(orgContext.orgType)) {
                return { eligible: false, reason: `OrgType ${orgContext.orgType} is not in allowed list.` };
            }
            if (rule.allowedStructureTypes.length > 0 && !rule.allowedStructureTypes.includes(orgContext.structureType)) {
                return { eligible: false, reason: `StructureType ${orgContext.structureType} is not in allowed list.` };
            }
            if (rule.allowedDivisionModes.length > 0 && !rule.allowedDivisionModes.includes(orgContext.divisionMode)) {
                return { eligible: false, reason: `DivisionMode ${orgContext.divisionMode} is required.` };
            }
            if (rule.requiresSubBatches && !orgContext.allowSubBatches) {
                return { eligible: false, reason: "Sub-batches are required for this module." };
            }
        }

        return { eligible: true };
    }
}

export default BillingEligibilityService;
