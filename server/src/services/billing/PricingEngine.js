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

import OrganizationPriceOverride from "../../models/OrganizationPriceOverride.js";
import PlanModule from "../../models/PlanModule.js";

/**
 * PricingEngine
 * Determines the final active price for a module or plan for a specific organization.
 */
class PricingEngine {
    /**
     * Resolves the price for a specific module under a specific plan.
     * Order of precedence:
     * 1. Org-specific override
     * 2. Plan-module override
     * 3. Module-version standard price (passed in)
     */
    static async resolveModulePrice(organizationId, planVersionId, moduleVersionId, defaultMonthlyPaise, defaultAnnualPaise, billingCycle = "MONTHLY") {
        // 1. Check Org Override
        const orgOverride = await OrganizationPriceOverride.findOne({
            organizationId,
            billingModuleId: moduleVersionId, // Simplified for this prototype
            effectiveFrom: { $lte: new Date() },
            $or: [{ effectiveUntil: null }, { effectiveUntil: { $gt: new Date() } }]
        }).sort({ createdAt: -1 }).lean();

        if (orgOverride) {
            return {
                amountPaise: billingCycle === "ANNUAL" ? orgOverride.annualPricePaise : orgOverride.monthlyPricePaise,
                source: "ORGANIZATION_OVERRIDE",
                includedQuantity: orgOverride.includedQuantity || 0
            };
        }

        // 2. Check Plan-Module Override
        const planModule = await PlanModule.findOne({
            billingPlanVersionId: planVersionId,
            billingModuleId: moduleVersionId // Simplified mapping
        }).lean();

        if (planModule && (planModule.monthlyPricePaise > 0 || planModule.annualPricePaise > 0)) {
            return {
                amountPaise: billingCycle === "ANNUAL" ? planModule.annualPricePaise : planModule.monthlyPricePaise,
                source: "PLAN_MODULE_OVERRIDE",
                includedQuantity: planModule.includedQuantity || 0
            };
        }

        // 3. Fallback to default version price
        return {
            amountPaise: billingCycle === "ANNUAL" ? defaultAnnualPaise : defaultMonthlyPaise,
            source: "MODULE_VERSION_DEFAULT",
            includedQuantity: 0
        };
    }
}

export default PricingEngine;
