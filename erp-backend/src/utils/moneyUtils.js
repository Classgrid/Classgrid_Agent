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
 * moneyUtils.js
 * Utility functions for handling currency in strict integer paise.
 * ALL financial calculations must be done using these functions to prevent floating point errors.
 */

/**
 * Converts INR (rupees) to paise (integer)
 * @param {number|string} rupees 
 * @returns {number} Integer paise
 */
export function rupeesToPaise(rupees) {
    const num = parseFloat(rupees);
    if (isNaN(num)) return 0;
    return Math.round(num * 100);
}

/**
 * Converts paise (integer) to INR (rupees)
 * @param {number} paise 
 * @returns {number} Float rupees
 */
export function paiseToRupees(paise) {
    const num = parseInt(paise, 10);
    if (isNaN(num)) return 0;
    return num / 100;
}

/**
 * Formats paise as an INR currency string (e.g. ₹1,200.50)
 * @param {number} paise 
 * @returns {string} Formatted string
 */
export function formatPaise(paise) {
    const rupees = paiseToRupees(paise);
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(rupees);
}

/**
 * Calculates a percentage of a paise amount, rounding safely to nearest integer paise.
 * @param {number} paiseAmount 
 * @param {number} percentage (e.g., 18 for 18% GST)
 * @returns {number} Integer paise
 */
export function calculatePercentage(paiseAmount, percentage) {
    const amt = parseInt(paiseAmount, 10);
    const pct = parseFloat(percentage);
    if (isNaN(amt) || isNaN(pct)) return 0;
    return Math.round((amt * pct) / 100);
}

/**
 * Validates that an amount is a strict integer (valid paise representation).
 * @param {any} amount 
 * @returns {boolean}
 */
export function isIntegerPaise(amount) {
    return Number.isInteger(amount);
}
