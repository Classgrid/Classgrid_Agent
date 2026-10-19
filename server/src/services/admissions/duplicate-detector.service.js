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

import AdmissionApplication from "../../models/AdmissionApplication.js";

/**
 * duplicate-detector.service.js
 * 
 * Logic to prevent duplicate admissions in the same organization.
 */

/**
 * Checks if an application already exists for the given identity markers.
 * @param {string} organizationId 
 * @param {Object} identity { phone, full_name, dob, en_number }
 * @returns {Promise<Object|null>} The existing application if found, else null.
 */
export const checkDuplicate = async (organizationId, { phone, full_name, dob, en_number, aadhar }) => {
    const query = {
        organization_id: organizationId,
        is_deleted: false,
    };

    const orConditions = [];

    // Check 1: Phone number (Unique identifier for Direct track)
    if (phone) {
        orConditions.push({ phone });
    }

    // Check 2: EN Number (Unique identifier for Engineering track)
    if (en_number) {
        orConditions.push({ en_number });
    }

    // Check 3: Identity Combo (Full Name + DOB) 
    // This catches variations in phone numbers for the same student.
    if (full_name && dob) {
        orConditions.push({
            full_name: { $regex: new RegExp(`^${full_name.trim()}$`, "i") },
            dob: new Date(dob)
        });
    }

    // Check 4: Aadhaar Number
    if (aadhar) {
        orConditions.push({ "form_data.student_aadhar": aadhar });
    }

    if (orConditions.length === 0) return null;

    query.$or = orConditions;

    // We exclude 'withdrawn' and 'upgraded' from duplicate blocking usually, 
    // but for now, we block if ANY active record exists.
    const duplicate = await AdmissionApplication.findOne(query).lean();

    return duplicate;
};

export default {
    checkDuplicate
};
