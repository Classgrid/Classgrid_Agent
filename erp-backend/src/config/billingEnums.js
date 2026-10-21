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

/**
 * billingEnums.js
 * Core configuration for billing constants and enums to maintain strict type safety.
 */

export const PLAN_STATUS = {
    DRAFT: "DRAFT",
    SCHEDULED: "SCHEDULED",
    ACTIVE: "ACTIVE",
    SUPERSEDED: "SUPERSEDED",
    RETIRED: "RETIRED"
};

export const SUBSCRIPTION_STATUS = {
    TRIALING: "TRIALING",
    ACTIVE: "ACTIVE",
    PAST_DUE: "PAST_DUE",
    CANCELED: "CANCELED",
    UNPAID: "UNPAID"
};

export const INVOICE_STATUS = {
    DRAFT: "DRAFT",
    ISSUED: "ISSUED",
    PARTIALLY_PAID: "PARTIALLY_PAID",
    PAID: "PAID",
    OVERDUE: "OVERDUE",
    VOID: "VOID",
    UNCOLLECTIBLE: "UNCOLLECTIBLE"
};

export const PAYMENT_STATUS = {
    PENDING: "PENDING",
    AUTHORIZED: "AUTHORIZED",
    CAPTURED: "CAPTURED",
    FAILED: "FAILED",
    REFUNDED: "REFUNDED"
};

export const BILLING_CYCLE = {
    MONTHLY: "MONTHLY",
    QUARTERLY: "QUARTERLY",
    BIANNUAL: "BIANNUAL",
    ANNUAL: "ANNUAL"
};

export const METRIC_CODES = {
    ACTIVE_LEARNERS: "ACTIVE_LEARNERS",
    ACTIVE_STAFF: "ACTIVE_STAFF",
    NATIVE_BATCHES: "NATIVE_BATCHES",
    SUB_BATCHES: "SUB_BATCHES",
    VISIBLE_DIVISIONS: "VISIBLE_DIVISIONS",
    STORAGE_GB: "STORAGE_GB",
    SMS_CREDITS: "SMS_CREDITS"
};

export const DISCOUNT_TYPE = {
    PERCENTAGE: "PERCENTAGE",
    FIXED_AMOUNT: "FIXED_AMOUNT"
};
