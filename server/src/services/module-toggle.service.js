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
 * 🚨 CRITICAL AI  s AND SYSTEM RULES 🚨qfeqf
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

/**
 * Determines which features are active for an organization based on subscription state.
 * Classgrid uses a strict lifecycle:
 * - demo: mandatory 31-day onboarding/demo window
 * - active: the single paid production state after the demo ends
 */

const PLAN_FEATURES = {
    demo: {
        attendance: true,
        examinations: true,
        admissions: true,
        canteen: true,
        ai_viva: true,
        naac_auditor: true,
    },
    sandbox: {
        attendance: true,
        examinations: true,
        admissions: true,
        canteen: true,
        ai_viva: true,
        naac_auditor: true,
    },
    active: {
        attendance: true,
        examinations: true,
        admissions: true,
        canteen: true,
        ai_viva: true,
        naac_auditor: true,
    }
};

/**
 * Checks if a specific feature is enabled for an organization.
 * @param {string} plan - The subscription state (demo, active)
 * @param {string} featureKey - The feature to check (e.g., 'admissions')
 */
export const isFeatureEnabled = (plan, featureKey) => {
    const tier = plan?.toLowerCase() || 'demo';
    const features = PLAN_FEATURES[tier] || PLAN_FEATURES.demo;
    return !!features[featureKey];
};

/**
 * Gets all limits for a given plan.
 */
export const getPlanLimits = (plan) => {
    const tier = plan?.toLowerCase() || 'demo';
    return PLAN_FEATURES[tier] || PLAN_FEATURES.demo;
};

export default { isFeatureEnabled, getPlanLimits };
