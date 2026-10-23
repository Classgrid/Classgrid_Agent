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

const CET_STRUCTURE_TYPES = new Set([
    "engineering",
    "engineering_with_div",
    "engineering_no_div",
    "diploma",
    "diploma_with_div",
    "diploma_no_div",
]);

const SCHOOL_STRUCTURE_TYPES = new Set([
    "school",
    "school_with_div",
    "school_no_div",
]);

const JUNIOR_COLLEGE_STRUCTURE_TYPES = new Set([
    "junior_college",
    "junior_college_with_div",
    "junior_college_no_div",
]);

const COACHING_STRUCTURE_TYPES = new Set(["coaching"]);

export function resolveStructureType(organization = {}) {
    return (
        organization.structure_type ||
        organization.admission_config?.structure_type ||
        organization.admission_config?.admission_preset ||
        null
    );
}

export function isCETStructureType(structureType) {
    return CET_STRUCTURE_TYPES.has(structureType);
}

export function isSchoolStructureType(structureType) {
    return SCHOOL_STRUCTURE_TYPES.has(structureType);
}

export function isJuniorCollegeStructureType(structureType) {
    return JUNIOR_COLLEGE_STRUCTURE_TYPES.has(structureType);
}

export function isCoachingStructureType(structureType) {
    return COACHING_STRUCTURE_TYPES.has(structureType);
}

export function getAdmissionTrack(structureType) {
    return isCETStructureType(structureType) ? "cet" : "direct";
}

export function assertAdmissionTrack(structureType, expectedTrack) {
    const actualTrack = getAdmissionTrack(structureType);
    if (actualTrack !== expectedTrack) {
        throw new Error(
            `Invalid admission track for structure_type "${structureType}". Expected "${expectedTrack}", got "${actualTrack}".`
        );
    }
}

export function getDefaultQuotaByStructureType(structureType) {
    if (isCoachingStructureType(structureType)) return "REGULAR";
    if (isSchoolStructureType(structureType)) return "GENERAL";
    if (isJuniorCollegeStructureType(structureType) || isCETStructureType(structureType)) return "CAP";
    return "GENERAL";
}

export default {
    resolveStructureType,
    isCETStructureType,
    isSchoolStructureType,
    isJuniorCollegeStructureType,
    isCoachingStructureType,
    getAdmissionTrack,
    assertAdmissionTrack,
    getDefaultQuotaByStructureType,
};
