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

/**
 * admission-en-validator.js
 * 
 * Utility to validate DTE Maharashtra EN numbers using MOD-11 checksum.
 * Pattern: EN (Year) (CollegeCode) (SerialNumber) (ChecksumDigit)
 */

export function validateENNumber(en_number, institute_code) {
    if (!en_number) return { valid: false, error: "EN Number is required." };
    
    en_number = en_number.trim().toUpperCase();
    
    // Pattern: EN + Year(2) + Rest(5 to 12 digits)
    // Pattern: EN + Year(2) + College(5) + Serial(4-5) + Checksum(1)
    const pattern = /^EN(\d{2})(\d{5})(\d{4,5})(\d{1})$/;
    const match = en_number.match(pattern);
    
    if (!match) {
        return { valid: false, error: "Invalid EN Number format. Expected: EN + Year + CollegeCode + Serial + Checksum" };
    }

    const [, year, college, serial, checksum] = match;

    // 1. Validate Year
    const currentYear = new Date().getFullYear() % 100;
    const yearNum = parseInt(year);
    if (yearNum !== currentYear && yearNum !== currentYear - 1) {
        return { valid: false, error: `Academic year mismatch: ${year}. Candidate must be from current cycle.` };
    }

    // 2. Validate College Code strictly
    if (institute_code && college !== institute_code) {
        return { valid: false, error: `College code mismatch. This EN belongs to institute ${college}, not ${institute_code}.` };
    }

    // 3. Dynamic MOD-11 Checksum Validation
    // Formula: Sum of (digit * weight) % 11 should match checksum digit.
    const digits = (college + serial).split('').map(Number);
    let sum = 0;
    
    for (let i = 0; i < digits.length; i++) {
        sum += digits[i] * (digits.length - i);
    }

    const calculatedChecksum = sum % 11;
    
    if (parseInt(checksum) !== calculatedChecksum) {
        return { valid: false, error: "EN verification failed: Checksum digit mismatch. Possible typo." };
    }

    return { 
        valid: true, 
        data: { year, college, serial, checksum } 
    };
}
