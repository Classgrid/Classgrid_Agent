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

export const CLAIMABLE_CET_STATUSES = Object.freeze(["imported", "acap_registered"]);

export function hasClaimableCETStatus(status) {
    return CLAIMABLE_CET_STATUSES.includes(status);
}

export function getEngineeringInstituteCode(org) {
    return (
        org?.admission_config?.engineering_config?.institute_code ||
        org?.admission_config?.institute_code ||
        ""
    );
}

export function getEngineeringAicteId(org) {
    return (
        org?.admission_config?.engineering_config?.aicte_id ||
        org?.admission_config?.aicte_id ||
        ""
    );
}

function getTenthRecord(formData = {}) {
    if (!Array.isArray(formData.previous_education)) {
        return null;
    }
    return formData.previous_education.find((entry) => entry?.level === "10th") || null;
}

export function getAdmissionFieldValue(source = {}, field) {
    const formData = source.form_data || {};
    const customFields = formData.custom_fields || {};
    const tenthRecord = getTenthRecord(formData);

    switch (field) {
        case "student_name":
        case "full_name":
            return source.full_name || formData.full_name || formData.personal_details?.full_name;
        case "phone":
        case "mobile_number":
            return (
                source.phone ||
                formData.mobile_number ||
                formData.phone ||
                formData.personal_details?.mobile_number
            );
        case "email":
        case "primary_email":
            return (
                source.email ||
                formData.primary_email ||
                formData.email ||
                formData.personal_details?.primary_email
            );
        case "dob":
            return source.dob || formData.dob || formData.personal_details?.dob;
        case "father_name":
            return (
                formData.father_name ||
                formData.parent_details?.father_name ||
                formData.family?.father?.full_name ||
                formData.father_full_name
            );
        case "mother_name":
            return (
                formData.mother_name ||
                formData.parent_details?.mother_name ||
                formData.family?.mother?.full_name ||
                formData.mother_full_name
            );
        case "10th_percentage":
            return (
                formData["10th_percentage"] ??
                tenthRecord?.percentage_or_cgpa ??
                formData.previous_percentage ??
                source.merit_score
            );
        case "10th_board":
            return formData["10th_board"] || tenthRecord?.board || formData.board;
        case "previous_percentage":
            return (
                formData.previous_percentage ??
                formData["10th_percentage"] ??
                tenthRecord?.percentage_or_cgpa
            );
        default: {
            const containers = [
                customFields,
                formData,
                formData.personal_details || {},
                formData.parent_details || {},
                source,
            ];

            for (const container of containers) {
                const value = container?.[field];
                if (value !== undefined && value !== null) {
                    return value;
                }
            }
            return undefined;
        }
    }
}

export function hasAdmissionFieldValue(source, field) {
    const value = getAdmissionFieldValue(source, field);

    if (Array.isArray(value)) {
        return value.length > 0;
    }
    if (typeof value === "string") {
        return value.trim().length > 0;
    }

    return value !== undefined && value !== null && value !== "";
}
