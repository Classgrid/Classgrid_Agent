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

import { MASTER_FIELD_POOL, DEFAULT_REQUIRED_FIELD_KEYS } from './master-fields.js';

// 3. ORG-TYPE DEFAULTS — Which fields are pre-toggled ON
//    Admin can always toggle any field ON/OFF from the master pool
// ═══════════════════════════════════════════════════════════════
for (const section of Object.values(MASTER_FIELD_POOL)) {
    section.fields = section.fields.map((field) => ({
        ...field,
        is_required_by_default:
            field.is_required_by_default ?? DEFAULT_REQUIRED_FIELD_KEYS.has(field.key),
    }));
}

const MASTER_FIELD_DEFINITION_MAP = Object.values(MASTER_FIELD_POOL).reduce((acc, section) => {
    for (const field of section.fields) {
        acc[field.key] = field;
    }
    return acc;
}, {});

const ORG_TYPE_DEFAULTS = {
    // Engineering: EVERYTHING ON (the full ~99 mandatory + optional)
    engineering: {
        enabled_fields: [
            // Identity
            "first_name", "middle_name", "last_name", "full_name", "dob", "gender", "blood_group",
            "nationality", "domicile", "mobile_number", "official_email", "primary_email", "alternate_email",
            // Parent Names
            "father_name", "father_first_name", "mother_name", "earning_parent_name", "earning_parent_relation",
            // Demographics
            "religion", "mother_tongue", "area_type", "marital_status", "admission_main_category",
            "caste", "sub_caste", "physically_handicapped", "ph_type", "ph_percentage", "ex_serviceman",
            "belongs_to_minority", "government_scheme", "creamy_layer",
            // Birth & Native
            "birth_place", "birth_country", "birth_state", "birth_district",
            "native_place", "native_country", "native_state", "native_district", "native_area_type",
            // Addresses
            "permanent_address", "permanent_country", "permanent_state", "permanent_district", "permanent_city", "permanent_taluka", "permanent_pincode",
            "current_address", "current_country", "current_state", "current_district", "current_city", "current_taluka", "current_pincode",
            // Emergency & Guardian
            "emergency_contact_name", "emergency_contact_mobile", "emergency_contact_address", "emergency_contact_phone", "emergency_contact_city", "emergency_contact_age", "emergency_contact_remark",
            "local_guardian_name", "local_guardian_mobile", "local_guardian_address", "local_guardian_phone", "local_guardian_city", "local_guardian_remark",
            // Hostel
            "hostel_name", "hostel_address",
            // Family
            "father_full_name", "father_education", "father_occupation", "father_income", "father_mobile",
            "mother_full_name", "mother_education", "mother_occupation", "mother_income", "mother_mobile",
            // Academic IDs
            "eligibility_number", "abc_id", "university_prn_number", "aadhar_number", "pan_number",
            "anti_ragging_number", "anti_ragging_link",
            // CET
            "en_number", "10th_board", "10th_percentage", "12th_board", "12th_percentage", "pcm_percentage",
            "cet_score", "seat_type", "branch_allotted", "cap_round",
            // Goals
            "career_choice", "alumni_institute",
        ],
        enabled_documents: [
            "allotment_letter", "12th_marksheet", "student_aadhar", "caste_certificate",
            "income_certificate", "domicile_certificate", "gap_certificate", "migration_certificate",
            "passport_size_photo", "anti_ragging_affidavit",
        ],
    },

    // School: Lightweight defaults (admin can enable more)
    school: {
        enabled_fields: [
            "first_name", "middle_name", "last_name", "full_name", "dob", "gender", "blood_group",
            "mobile_number", "primary_email",
            "father_name", "mother_name",
            "religion", "mother_tongue", "caste", "sub_caste", "admission_main_category",
            "permanent_address", "permanent_state", "permanent_city", "permanent_pincode",
            "father_full_name", "father_occupation", "father_income", "father_mobile",
            "mother_full_name", "mother_occupation", "mother_mobile",
            "aadhar_number",
            "previous_school", "previous_percentage", "standard_applying",
        ],
        enabled_documents: [
            "transfer_certificate", "birth_certificate", "student_aadhar",
            "previous_academic_records", "caste_certificate", "passport_size_photo",
        ],
    },

    // Coaching: Fast-track defaults (admin can enable more)
    coaching: {
        enabled_fields: [
            "first_name", "middle_name", "last_name", "full_name", "dob", "gender", "blood_group",
            "mobile_number", "primary_email",
            "father_name", "mother_name",
            "religion", "mother_tongue", "caste",
            "permanent_address", "permanent_state", "permanent_city", "permanent_pincode",
            "aadhar_number",
            "10th_percentage", "previous_school", "course_selected", "batch_preferred",
        ],
        enabled_documents: [
            "student_aadhar", "passport_size_photo", "10th_marksheet",
        ],
    },

    // Junior College: Heavy like Engineering but no CET
    junior_college: {
        enabled_fields: [
            // Identity
            "first_name", "middle_name", "last_name", "full_name", "dob", "gender", "blood_group",
            "nationality", "domicile", "mobile_number", "primary_email", "alternate_email",
            // Parent Names
            "father_name", "father_first_name", "mother_name", "earning_parent_name", "earning_parent_relation",
            // Demographics
            "religion", "mother_tongue", "area_type", "marital_status", "admission_main_category",
            "caste", "sub_caste", "physically_handicapped", "ph_type", "ph_percentage", "ex_serviceman",
            "belongs_to_minority", "government_scheme", "creamy_layer",
            // Birth & Native
            "birth_place", "birth_country", "birth_state", "birth_district",
            "native_place", "native_country", "native_state", "native_district", "native_area_type",
            // Addresses
            "permanent_address", "permanent_country", "permanent_state", "permanent_district", "permanent_city", "permanent_taluka", "permanent_pincode",
            "current_address", "current_country", "current_state", "current_district", "current_city", "current_taluka", "current_pincode",
            // Emergency & Guardian
            "emergency_contact_name", "emergency_contact_mobile", "emergency_contact_address", "emergency_contact_phone", "emergency_contact_city", "emergency_contact_age", "emergency_contact_remark",
            "local_guardian_name", "local_guardian_mobile", "local_guardian_address", "local_guardian_phone", "local_guardian_city", "local_guardian_remark",
            // Hostel
            "hostel_name", "hostel_address",
            // Family
            "father_full_name", "father_education", "father_occupation", "father_income", "father_mobile",
            "mother_full_name", "mother_education", "mother_occupation", "mother_income", "mother_mobile",
            // Academic IDs
            "eligibility_number", "abc_id", "university_prn_number", "aadhar_number", "pan_number",
            // Jr College Specifics
            "10th_board", "10th_percentage", "stream_applying",
            "career_choice", "alumni_institute",
        ],
        enabled_documents: [
            "10th_marksheet", "transfer_certificate", "student_aadhar",
            "caste_certificate", "income_certificate", "domicile_certificate", "passport_size_photo",
        ],
    },

    // Diploma: Similar to Engineering
    diploma: {
        enabled_fields: [
            "first_name", "middle_name", "last_name", "full_name", "dob", "gender", "blood_group",
            "nationality", "domicile", "mobile_number", "primary_email",
            "father_name", "mother_name",
            "religion", "caste", "sub_caste", "admission_main_category",
            "permanent_address", "permanent_state", "permanent_district", "permanent_city", "permanent_pincode",
            "aadhar_number",
            "en_number", "10th_board", "10th_percentage", "seat_type", "branch_allotted",
        ],
        enabled_documents: [
            "allotment_letter", "10th_marksheet", "student_aadhar",
            "caste_certificate", "income_certificate",
        ],
    },
};

// ═══════════════════════════════════════════════════════════════

export { MASTER_FIELD_DEFINITION_MAP, ORG_TYPE_DEFAULTS };
