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

// 2. MASTER DOCUMENT POOL — All 39 document types
// ═══════════════════════════════════════════════════════════════
const MASTER_DOCUMENT_POOL = [
    // Universal
    { key: "birth_certificate", label: "Birth Certificate" },
    { key: "student_aadhar", label: "Student Aadhar Card" },
    { key: "parent_aadhar", label: "Parent Aadhar Card" },
    { key: "proof_of_residence", label: "Proof of Residence" },
    { key: "transfer_certificate", label: "Transfer / Leaving Certificate" },
    { key: "previous_academic_records", label: "Previous Academic Records" },
    { key: "passport_size_photo", label: "Passport Size Photo" },
    { key: "signature", label: "Signature Upload" },
    { key: "medical_certificate", label: "Medical Certificate" },
    { key: "caste_certificate", label: "Caste Certificate" },
    { key: "income_certificate", label: "Income Certificate" },
    { key: "10th_marksheet", label: "10th Marksheet (SSC)" },
    { key: "12th_marksheet", label: "12th Marksheet (HSC)" },
    // Engineering / College Specific
    { key: "cet_jee_scorecard", label: "CET/JEE Scorecard" },
    { key: "allotment_letter", label: "Allotment Letter (CAP)" },
    { key: "eligibility_form", label: "Eligibility Form" },
    { key: "migration_certificate", label: "Migration Certificate" },
    { key: "gap_certificate", label: "GAP Certificate" },
    { key: "domicile_certificate", label: "Domicile Certificate" },
    { key: "nationality_certificate", label: "Nationality Certificate" },
    { key: "non_creamy_layer_certificate", label: "Non-Creamy Layer Certificate" },
    { key: "ews_certificate", label: "EWS Certificate" },
    { key: "anti_ragging_affidavit", label: "Anti-Ragging Affidavit" },
    { key: "diploma_marksheet", label: "Diploma Marksheet" },
    { key: "character_certificate", label: "Character Certificate" },
    { key: "caste_validity_certificate", label: "Caste Validity Certificate" },
    { key: "physically_handicapped_certificate", label: "PH Certificate" },
    { key: "freedom_fighter_certificate", label: "Freedom Fighter Certificate" },
    { key: "defence_certificate", label: "Defence Certificate" },
    // MahaDBT Scholarship
    { key: "ration_card", label: "Ration Card" },
    { key: "hostel_certificate", label: "Hostel Certificate" },
    { key: "bank_seeding_form", label: "Bank Seeding Form" },
    { key: "attendance_certificate", label: "Attendance Certificate" },
    { key: "death_certificate", label: "Father's Death Certificate" },
    { key: "small_land_holder_certificate", label: "Small Land Holder Certificate" },
    { key: "labour_certificate", label: "Registered Labour Certificate" },
    { key: "service_certificate", label: "Service Certificate (ZP/PTC)" },
    { key: "fee_receipt", label: "Fee Receipt" },
    { key: "other", label: "Other Document" },
];

// ═══════════════════════════════════════════════════════════════

export { MASTER_DOCUMENT_POOL };
