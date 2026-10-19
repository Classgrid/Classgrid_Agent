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

import mongoose from "mongoose";

const MAX_PAGE_SIZE = 200;

function findInvalidPaiseValue(value, path = "body") {
    if (!value || typeof value !== "object") return null;

    for (const [key, nestedValue] of Object.entries(value)) {
        const fieldPath = `${path}.${key}`;
        if (key.endsWith("Paise") && nestedValue !== undefined && nestedValue !== null && !Number.isSafeInteger(nestedValue)) {
            return `${fieldPath} must be an integer number of paise`;
        }
        if (nestedValue && typeof nestedValue === "object") {
            const nestedError = findInvalidPaiseValue(nestedValue, fieldPath);
            if (nestedError) return nestedError;
        }
    }
    return null;
}

export function validateBillingRequest(req, res, next) {
    for (const [key, value] of Object.entries(req.params || {})) {
        if (key.toLowerCase().endsWith("id") && value && !mongoose.isValidObjectId(value)) {
            return res.status(400).json({ success: false, code: "INVALID_IDENTIFIER", message: `${key} must be a valid identifier` });
        }
    }

    const paiseError = findInvalidPaiseValue(req.body);
    if (paiseError) {
        return res.status(400).json({ success: false, code: "INVALID_MONEY_VALUE", message: paiseError });
    }

    if (req.query.page !== undefined) {
        const page = Number(req.query.page);
        if (!Number.isInteger(page) || page < 1) {
            return res.status(400).json({ success: false, code: "INVALID_PAGE", message: "page must be a positive integer" });
        }
    }
    if (req.query.limit !== undefined) {
        const limit = Number(req.query.limit);
        if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
            return res.status(400).json({ success: false, code: "INVALID_LIMIT", message: `limit must be an integer between 1 and ${MAX_PAGE_SIZE}` });
        }
    }
    next();
}
