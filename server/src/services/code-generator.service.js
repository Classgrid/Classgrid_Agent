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
 * Classgrid — Cryptographically Secure Code Generator
 *
 * Generates exactly 12-character uppercase alphanumeric codes.
 * Uses crypto.randomBytes for true randomness (CSPRNG-backed).
 *
 * Charset: A-Z + 2-9 (confusing O/0/I/1 removed) = 32 characters
 * 12-char code = ~60-bit entropy — secure yet easy to type.
 */

import crypto from "crypto";

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 12;

/**
 * Generate a single cryptographically random 12-char code.
 * @returns {string} e.g. "X7K9P2LQ8A4M"
 */
export const generateSecureCode = () => {
    const bytes = crypto.randomBytes(CODE_LENGTH * 2);
    let code = "";
    let i = 0;
    while (code.length < CODE_LENGTH) {
        const byte = bytes[i++];
        if (byte < 252) {
            code += CHARSET[byte % CHARSET.length];
        }
        if (i >= bytes.length) {
            const extra = crypto.randomBytes(CODE_LENGTH * 2);
            extra.copy(bytes, 0);
            i = 0;
        }
    }
    return code;
};

/**
 * Generate a SINGLE unique organization code (no more dual codes).
 * @param {import('mongoose').Model} OrgModel - The Organization Mongoose model
 * @returns {Promise<{ organizationCode: string }>}
 */
export const generateUniqueOrgCode = async (OrgModel) => {
    let organizationCode;
    let attempts = 0;

    while (true) {
        attempts++;
        if (attempts > 20) {
            throw new Error("Unable to generate unique org code after 20 attempts.");
        }

        organizationCode = generateSecureCode();

        const exists = await OrgModel.exists({
            $or: [
                { organizationCode },
                { private_code: organizationCode },
            ]
        });

        if (!exists) break;
    }

    return { organizationCode };
};

const codeExists = async (OrgModel, code) => {
    return OrgModel.exists({
        $or: [
            { organizationCode: code },
            { honorCode: code },
            { private_code: code },
        ]
    });
};

// Legacy export for backward compatibility
export const generateUniqueDualCodes = async (OrgModel) => {
    const { organizationCode } = await generateUniqueOrgCode(OrgModel);

    let honorCode;
    let attempts = 0;

    while (true) {
        attempts++;
        if (attempts > 20) {
            throw new Error("Unable to generate unique honor code after 20 attempts.");
        }

        const candidate = generateSecureCode();
        if (candidate === organizationCode) continue;

        const exists = await codeExists(OrgModel, candidate);
        if (!exists) {
            honorCode = candidate;
            break;
        }
    }

    return { organizationCode, honorCode };
};
