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
 * billingDateUtils.js
 * Centralizes date arithmetic for subscriptions, ensuring all billing cycles strictly operate in UTC at 00:00:00 boundary.
 */

/**
 * Returns the current date forced to UTC 00:00:00 for stable daily billing calculations.
 * @returns {Date}
 */
export function getBillingToday() {
    const today = new Date();
    return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
}

/**
 * Calculates the end date of a billing cycle given the start date and cycle type.
 * @param {Date} startDate 
 * @param {string} cycle - "MONTHLY", "QUARTERLY", "BIANNUAL", "ANNUAL"
 * @returns {Date}
 */
export function calculateCycleEndDate(startDate, cycle) {
    const end = new Date(startDate);
    switch (cycle) {
        case "MONTHLY":
            end.setUTCMonth(end.getUTCMonth() + 1);
            break;
        case "QUARTERLY":
            end.setUTCMonth(end.getUTCMonth() + 3);
            break;
        case "BIANNUAL":
            end.setUTCMonth(end.getUTCMonth() + 6);
            break;
        case "ANNUAL":
            end.setUTCFullYear(end.getUTCFullYear() + 1);
            break;
        default:
            end.setUTCMonth(end.getUTCMonth() + 1);
    }
    return end;
}

/**
 * Computes the remaining days in a billing period for proration calculations.
 * @param {Date} current 
 * @param {Date} end 
 * @returns {number} Integer number of days remaining
 */
export function getDaysRemaining(current, end) {
    const diffTime = end.getTime() - current.getTime();
    if (diffTime <= 0) return 0;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Computes total days in a period.
 * @param {Date} start 
 * @param {Date} end 
 * @returns {number}
 */
export function getTotalPeriodDays(start, end) {
    const diffTime = end.getTime() - start.getTime();
    if (diffTime <= 0) return 1; // Prevent division by zero
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
