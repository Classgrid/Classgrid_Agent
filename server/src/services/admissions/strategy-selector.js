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
 * 🚫 NO DISK BLAME RULE (owner's order, 2026-10-27) 🚫
 * Claude and every AI model are FORBIDDEN to say an error comes from a full disk or low disk space.
 * The owner's disks are not full. Never guess the cause of an error: read the real logs and code first,
 * and only name a cause that was actually seen.
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
 * strategy-selector.js — Admission Strategy Factory (v2: Universal Master Pool)
 *
 * Architecture:
 *   1. MASTER_FIELD_POOL — ONE universal list of fields
 *   2. ORG_TYPE_DEFAULTS — Which fields are pre-toggled ON per org type
 *   3. ADMISSION_STRATEGIES — Workflow configs (auth, ranking, exports, etc.)
 *   4. getResolvedAdmissionStrategy(org) — Merges defaults + org customizations
 *
 * Every org type sees the FULL master pool. They toggle ON/OFF what they need.
 * Plus they can add unlimited custom fields (Bus Route, Hostel Preference, etc.)
 */
// 1. MASTER FIELD POOL â€” The universal superset (all ~111 fields)
//    Grouped by ERP section for clean UI rendering
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const DEFAULT_REQUIRED_FIELD_KEYS = new Set([
    "full_name",
    "dob",
    "mobile_number",
    "father_name",
    "previous_percentage",
    "10th_percentage",
    "standard_applying",
    "stream_applying",
    "course_selected",
    "en_number",
]);

const MASTER_FIELD_POOL = {
    // Section 1: Student Identity
    student_identity: {
        label: "Student Identity",
        fields: [
            { key: "first_name", label: "First Name", type: "text" },
            { key: "middle_name", label: "Middle Name", type: "text" },
            { key: "last_name", label: "Last Name", type: "text" },
            { key: "full_name", label: "Full Name", type: "text" },
            { key: "dob", label: "Date of Birth", type: "date" },
            { key: "gender", label: "Gender", type: "dropdown", options: ["Male", "Female", "Other"] },
            { key: "blood_group", label: "Blood Group", type: "dropdown", options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] },
            { key: "nationality", label: "Nationality", type: "text" },
            { key: "domicile", label: "Domicile", type: "text" },
            { key: "mobile_number", label: "Mobile Number", type: "text" },
            { key: "official_email", label: "Official Email", type: "text" },
            { key: "primary_email", label: "Primary Email (Personal)", type: "text" },
            { key: "alternate_email", label: "Alternate Email", type: "text" },
        ]
    },

    // Section 2: Parent & Family Names
    parent_names: {
        label: "Parent & Family Names",
        fields: [
            { key: "father_name", label: "Father Name", type: "text" },
            { key: "father_first_name", label: "Father First Name", type: "text" },
            { key: "mother_name", label: "Mother Name", type: "text" },
            { key: "earning_parent_name", label: "Earning Parent Name", type: "text" },
            { key: "earning_parent_relation", label: "Earning Parent Relation", type: "dropdown", options: ["Father", "Mother", "Guardian", "Other"] },
        ]
    },

    // Section 3: Demographics & Category
    demographics: {
        label: "Demographics & Category",
        fields: [
            { key: "religion", label: "Religion", type: "dropdown", options: ["Hindu", "Muslim", "Christian", "Buddhist", "Jain", "Sikh", "Parsi", "Other"] },
            { key: "mother_tongue", label: "Mother Tongue", type: "text" },
            { key: "area_type", label: "Area Type (Rural/Urban)", type: "dropdown", options: ["Rural", "Urban", "Semi-Urban"] },
            { key: "marital_status", label: "Marital Status", type: "dropdown", options: ["Single", "Married", "Divorced", "Widowed"] },
            { key: "admission_main_category", label: "Admission Main Category", type: "text" },
            { key: "caste", label: "Caste", type: "text" },
            { key: "sub_caste", label: "Sub Caste", type: "text" },
            { key: "physically_handicapped", label: "Physically Handicapped", type: "boolean" },
            { key: "ph_type", label: "PH Type", type: "text" },
            { key: "ph_percentage", label: "PH Percentage", type: "number" },
            { key: "ex_serviceman", label: "Ex-Serviceman", type: "boolean" },
            { key: "belongs_to_minority", label: "Belongs to Minority", type: "boolean" },
            { key: "government_scheme", label: "Government Scheme", type: "text" },
            { key: "creamy_layer", label: "Creamy Layer", type: "boolean" },
        ]
    },

    // Section 4: Birth & Native Place
    birth_native: {
        label: "Birth & Native Place",
        fields: [
            { key: "birth_place", label: "Birth Place", type: "text" },
            { key: "native_place", label: "Native Place", type: "text" },
            { key: "native_area_type", label: "Native Area Type", type: "dropdown", options: ["Rural", "Urban"] },
        ]
    },

    // Section 5: Permanent Address
    permanent_address: {
        label: "Permanent Address",
        fields: [
            { key: "permanent_address", label: "Permanent Address", type: "text" },
            { key: "permanent_country", label: "Permanent Country", type: "dropdown", options: ["India", "USA", "UK", "Canada", "Australia", "Other"] },
            { key: "permanent_state", label: "Permanent State", type: "dropdown", options: ["Maharashtra", "Gujarat", "Delhi", "Karnataka", "Tamil Nadu", "Other"] },
            { key: "permanent_district", label: "Permanent District", type: "dropdown", options: ["Pune", "Mumbai", "Thane", "Nagpur", "Nashik", "Other"] },
            { key: "permanent_city", label: "Permanent City", type: "text" },
            { key: "permanent_taluka", label: "Permanent Taluka", type: "dropdown", options: ["Haveli", "Pune City", "Maval", "Mulshi", "Other"] },
            { key: "permanent_pincode", label: "Permanent Pincode", type: "text" },
        ]
    },

    // Section 6: Current Address
    current_address: {
        label: "Current Address",
        fields: [
            { key: "current_address", label: "Current Address", type: "text" },
            { key: "current_country", label: "Current Country", type: "dropdown", options: ["India", "USA", "UK", "Canada", "Australia", "Other"] },
            { key: "current_state", label: "Current State", type: "dropdown", options: ["Maharashtra", "Gujarat", "Delhi", "Karnataka", "Tamil Nadu", "Other"] },
            { key: "current_district", label: "Current District", type: "dropdown", options: ["Pune", "Mumbai", "Thane", "Nagpur", "Nashik", "Other"] },
            { key: "current_city", label: "Current City", type: "text" },
            { key: "current_taluka", label: "Current Taluka", type: "dropdown", options: ["Haveli", "Pune City", "Maval", "Mulshi", "Other"] },
            { key: "current_pincode", label: "Current Pincode", type: "text" },
        ]
    },

    // Section 7: Emergency Contact
    emergency_contact: {
        label: "Emergency Contact",
        fields: [
            { key: "emergency_contact_name", label: "Emergency Contact Name", type: "text" },
            { key: "emergency_contact_mobile", label: "Emergency Contact Mobile", type: "text" },
            { key: "emergency_contact_address", label: "Emergency Contact Address", type: "text" },
            { key: "emergency_contact_phone", label: "Emergency Contact Phone", type: "text" },
            { key: "emergency_contact_city", label: "Emergency Contact City", type: "text" },
            { key: "emergency_contact_age", label: "Emergency Contact Age", type: "number" },
            { key: "emergency_contact_remark", label: "Emergency Contact Remark", type: "text" },
        ]
    },

    // Section 8: Local Guardian
    local_guardian: {
        label: "Local Guardian",
        fields: [
            { key: "local_guardian_name", label: "Local Guardian Name", type: "text" },
            { key: "local_guardian_mobile", label: "Local Guardian Mobile", type: "text" },
            { key: "local_guardian_address", label: "Local Guardian Address", type: "text" },
            { key: "local_guardian_phone", label: "Local Guardian Phone", type: "text" },
            { key: "local_guardian_city", label: "Local Guardian City", type: "text" },
            { key: "local_guardian_remark", label: "Local Guardian Remark", type: "text" },
        ]
    },

    // Section 9: Hostel
    hostel: {
        label: "Hostel Information",
        fields: [
            { key: "hostel_name", label: "Hostel Name", type: "text" },
            { key: "hostel_address", label: "Hostel Address", type: "text" },
        ]
    },

    // Section 10: Father Details
    father_details: {
        label: "Father Details",
        fields: [
            { key: "father_full_name", label: "Father Full Name", type: "text" },
            { key: "father_education", label: "Father Education", type: "text" },
            { key: "father_occupation", label: "Father Occupation", type: "text" },
            { key: "father_income", label: "Father Income", type: "number" },
            { key: "father_mobile", label: "Father Mobile", type: "text" },
            { key: "father_phone", label: "Father Phone (Landline)", type: "text" },
            { key: "father_email", label: "Father Email", type: "text" },
            { key: "father_organization", label: "Father Organization", type: "text" },
            { key: "father_department", label: "Father Department", type: "text" },
            { key: "father_designation", label: "Father Designation", type: "text" },
            { key: "father_office_address", label: "Father Office Address", type: "text" },
            { key: "father_rank", label: "Father Rank", type: "text" },
        ]
    },

    // Section 11: Mother Details
    mother_details: {
        label: "Mother Details",
        fields: [
            { key: "mother_full_name", label: "Mother Full Name", type: "text" },
            { key: "mother_education", label: "Mother Education", type: "text" },
            { key: "mother_occupation", label: "Mother Occupation", type: "text" },
            { key: "mother_income", label: "Mother Income", type: "number" },
            { key: "mother_mobile", label: "Mother Mobile", type: "text" },
            { key: "mother_phone", label: "Mother Phone (Landline)", type: "text" },
            { key: "mother_email", label: "Mother Email", type: "text" },
            { key: "mother_organization", label: "Mother Organization", type: "text" },
            { key: "mother_department", label: "Mother Department", type: "text" },
            { key: "mother_designation", label: "Mother Designation", type: "text" },
            { key: "mother_office_address", label: "Mother Office Address", type: "text" },
        ]
    },

    // Section 12: Academic IDs & Compliance
    academic_ids: {
        label: "Academic IDs & Compliance",
        fields: [
            { key: "eligibility_number", label: "Eligibility Number", type: "text" },
            { key: "abc_id", label: "ABC ID", type: "text" },
            { key: "university_prn_number", label: "University PRN Number", type: "text" },
            { key: "aadhar_number", label: "Aadhar Number", type: "text" },
            { key: "pan_number", label: "PAN Number", type: "text" },
            { key: "anti_ragging_number", label: "Anti-Ragging Undertaking Number", type: "text" },
            { key: "anti_ragging_link", label: "Anti-Ragging Form Link", type: "text" },
        ]
    },

    // Section 13: Academic History (10th/12th/CET)
    academic_history: {
        label: "Academic History",
        fields: [
            { key: "10th_board", label: "10th Board", type: "text" },
            { key: "10th_percentage", label: "10th Percentage", type: "number" },
            { key: "12th_board", label: "12th Board", type: "text" },
            { key: "12th_percentage", label: "12th Percentage", type: "number" },
            { key: "pcm_percentage", label: "PCM Percentage", type: "number" },
            { key: "diploma_percentage", label: "Diploma Percentage", type: "number" },
            { key: "stream_applying", label: "Stream Applying For", type: "text" },
            { key: "previous_school", label: "Previous School/College", type: "text" },
            { key: "previous_percentage", label: "Previous Percentage", type: "number" },
            { key: "standard_applying", label: "Standard Applying For", type: "text" },
            { key: "course_selected", label: "Course Selected", type: "text" },
            { key: "batch_preferred", label: "Batch Preferred", type: "text" },
        ]
    },

    // Section 14: Entrance Exam / CET
    entrance_exam: {
        label: "Entrance Exam / CET",
        fields: [
            { key: "en_number", label: "EN Number", type: "text", locked_by_cet: true },
            { key: "cet_score", label: "CET Score", type: "number", locked_by_cet: true },
            { key: "jee_score", label: "JEE Score", type: "number" },
            { key: "seat_type", label: "Seat Type", type: "dropdown", options: ["CAP", "INSTITUTIONAL", "MANAGEMENT", "SPOT"], locked_by_cet: true },
            { key: "branch_allotted", label: "Branch Allotted", type: "text", locked_by_cet: true },
            { key: "cap_round", label: "CAP Round", type: "text", locked_by_cet: true },
            { key: "lateral_entry", label: "Lateral Entry", type: "boolean" },
            { key: "entrance_score", label: "Entrance Score (Custom)", type: "number" },
        ]
    },

    // Section 15: Passport & Visa
    passport_visa: {
        label: "Passport & Visa",
        fields: [
            { key: "passport_number", label: "Passport Number", type: "text" },
            { key: "passport_valid_upto", label: "Passport Valid Upto", type: "date" },
            { key: "visa_number", label: "Visa Number", type: "text" },
            { key: "fsis_number", label: "FSIS Number", type: "text" },
            { key: "permit_valid_upto", label: "Permit Valid Upto", type: "date" },
        ]
    },

    // Section 16: Bank Details
    bank_details: {
        label: "Bank Details",
        fields: [
            { key: "bank_account_number", label: "Account Number", type: "text" },
            { key: "bank_ifsc_code", label: "IFSC Code", type: "text" },
            { key: "bank_name", label: "Bank Name", type: "text" },
            { key: "bank_branch", label: "Branch Name", type: "text" },
            { key: "bank_micr_code", label: "MICR Code", type: "text" },
        ]
    },

    // Section 17: Institutional Goals
    institutional_goals: {
        label: "Institutional Goals",
        fields: [
            { key: "career_choice", label: "Career Choice", type: "text" },
            { key: "alumni_institute", label: "Alumni Institute", type: "text" },
        ]
    },

    // Section 18: Extras
    extras: {
        label: "Extra Information",
        fields: [
            { key: "experience_details", label: "Experience Details", type: "text" },
            { key: "awards_participation", label: "Awards & Participation", type: "text" },
            { key: "sibling_in_school", label: "Sibling in School", type: "boolean" },
            { key: "transport_required", label: "Transport Required", type: "boolean" },
            { key: "referral_code", label: "Referral Code", type: "text" },
            { key: "discount_code", label: "Discount Code", type: "text" },
        ]
    },
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// 2. MASTER DOCUMENT POOL â€” All 39 document types
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// 3. ORG-TYPE DEFAULTS â€” Which fields are pre-toggled ON
//    Admin can always toggle any field ON/OFF from the master pool
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// 4. ADMISSION STRATEGIES â€” Workflow config (auth, ranking, exports)
//    These define HOW the admission works, not WHAT fields to show
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const ADMISSION_STRATEGIES = {
    engineering: {
        auth_method: "cet_en_otp",
        ranking_type: "cap_round",
        seat_types: ["CAP", "INSTITUTIONAL", "MANAGEMENT", "SPOT"],
        entry_modes: ["CET", "DESK"],
        workflow_variant: "cet_pipeline",
        requires_printout: false,
        govt_exports: ["dte_csv", "aicte_csv"],
        supports_rla: true,
        supports_cap_upgrade: true,
        credential_generation: {
            email_pattern: "{first}.{last}{seq}@{domain}",
            platforms: ["google_workspace", "zoho", "cpanel"],
        },
    },

    school_with_div: {
        auth_method: "phone_otp",
        ranking_type: "direct",
        seat_types: ["GENERAL", "RTE", "MANAGEMENT"],
        entry_modes: ["PORTAL", "DESK"],
        workflow_variant: "fast_track",
        requires_printout: true,
        govt_exports: ["saral_csv"],
        supports_rla: false,
        supports_cap_upgrade: false,
        credential_generation: null,
    },

    school_no_div: {
        auth_method: "phone_otp",
        ranking_type: "direct",
        seat_types: ["GENERAL", "RTE", "MANAGEMENT"],
        entry_modes: ["PORTAL", "DESK"],
        workflow_variant: "fast_track",
        requires_printout: true,
        govt_exports: ["saral_csv"],
        supports_rla: false,
        supports_cap_upgrade: false,
        credential_generation: null,
    },

    coaching: {
        auth_method: "phone_otp",
        ranking_type: "fcfs",
        seat_types: ["REGULAR", "DISCOUNT", "EARLY_BIRD"],
        entry_modes: ["PORTAL", "DESK"],
        workflow_variant: "fast_track",
        requires_printout: true,
        govt_exports: [],
        supports_rla: false,
        supports_cap_upgrade: false,
        credential_generation: null,
    },

    junior_college: {
        auth_method: "phone_otp",
        ranking_type: "10th_merit",
        seat_types: ["CAP", "MANAGEMENT", "MINORITY"],
        entry_modes: ["PORTAL", "DESK"],
        workflow_variant: "standard",
        requires_printout: true,
        govt_exports: ["state_board_csv"],
        supports_rla: false,
        supports_cap_upgrade: false,
        credential_generation: null,
    },

    diploma: {
        auth_method: "cet_en_otp",
        ranking_type: "cap_round",
        seat_types: ["CAP", "INSTITUTIONAL", "MANAGEMENT"],
        entry_modes: ["CET", "DESK"],
        workflow_variant: "cet_pipeline",
        requires_printout: false,
        govt_exports: ["dte_csv"],
        supports_rla: true,
        supports_cap_upgrade: true,
        credential_generation: {
            email_pattern: "{first}.{last}{seq}@{domain}",
            platforms: ["google_workspace", "zoho"],
        },
    },

    custom: {
        auth_method: "phone_otp",
        ranking_type: "admin_defined",
        seat_types: ["GENERAL"],
        entry_modes: ["PORTAL", "DESK"],
        workflow_variant: "fast_track",
        requires_printout: false,
        govt_exports: [],
        supports_rla: false,
        supports_cap_upgrade: false,
        credential_generation: null,
    },

    // â”€â”€ Variant aliases â€” same workflow as base, divided by structure only â”€â”€

    engineering_with_div: null, // resolved below
    engineering_no_div: null,   // resolved below
    diploma_with_div: null,     // resolved below
    diploma_no_div: null,       // resolved below
};

// Populate variant aliases so getAdmissionStrategy() never throws for
// structure_type values that are valid in Organization.structure_type enum
// but were previously missing from ADMISSION_STRATEGIES.
ADMISSION_STRATEGIES.engineering_with_div = { ...ADMISSION_STRATEGIES.engineering, structure_type: "engineering_with_div" };
ADMISSION_STRATEGIES.engineering_no_div   = { ...ADMISSION_STRATEGIES.engineering, structure_type: "engineering_no_div" };

ADMISSION_STRATEGIES.school_with_div = { ...ADMISSION_STRATEGIES.school_with_div }; // already present, no-op
ADMISSION_STRATEGIES.school_no_div   = { ...ADMISSION_STRATEGIES.school_no_div };   // already present, no-op

ADMISSION_STRATEGIES.junior_college_with_div = {
    ...ADMISSION_STRATEGIES.junior_college,
    structure_type: "junior_college_with_div",
};
ADMISSION_STRATEGIES.junior_college_no_div = {
    ...ADMISSION_STRATEGIES.junior_college,
    structure_type: "junior_college_no_div",
};

ADMISSION_STRATEGIES.diploma_with_div = { ...ADMISSION_STRATEGIES.diploma, structure_type: "diploma_with_div" };
ADMISSION_STRATEGIES.diploma_no_div   = { ...ADMISSION_STRATEGIES.diploma, structure_type: "diploma_no_div" };

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// 5. EXPORTED FUNCTIONS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * Get the MASTER field pool â€” shown to ALL org types.
 * The frontend renders this as the full checkbox/toggle list.
 */
export function getMasterFieldPool() {
    return MASTER_FIELD_POOL;
}

export function getMasterFieldDefinition(fieldKey) {
    return MASTER_FIELD_DEFINITION_MAP[fieldKey] || null;
}

/**
 * Get the MASTER document pool â€” shown to ALL org types.
 */
export function getMasterDocumentPool() {
    return MASTER_DOCUMENT_POOL;
}

/**
 * Get the default enabled fields for an org type.
 * Used during onboarding to pre-check the toggles.
 * @param {string} orgType - "engineering", "school", "coaching", "junior_college", "diploma"
 */
export function getOrgTypeDefaults(orgType) {
    // Map structure_types to their base org type
    const typeMap = {
        engineering: "engineering",
        engineering_with_div: "engineering",
        engineering_no_div: "engineering",
        school_with_div: "school",
        school_no_div: "school",
        coaching: "coaching",
        junior_college: "junior_college",
        junior_college_with_div: "junior_college",
        junior_college_no_div: "junior_college",
        diploma: "diploma",
        diploma_with_div: "diploma",
        diploma_no_div: "diploma",
        custom: "coaching", // Custom orgs get coaching defaults (lightweight)
    };
    const baseType = typeMap[orgType] || "school";
    return ORG_TYPE_DEFAULTS[baseType] || ORG_TYPE_DEFAULTS.school;
}

/**
 * Get the base admission strategy (workflow, auth, ranking).
 * @param {string} structureType
 */
export function getAdmissionStrategy(structureType) {
    const strategy = ADMISSION_STRATEGIES[structureType];
    if (!strategy) {
        throw new Error(
            `No admission strategy found for structure_type: "${structureType}". ` +
            `Valid types: ${Object.keys(ADMISSION_STRATEGIES).join(", ")}`
        );
    }
    return { ...strategy, structure_type: structureType };
}

/**
 * Get the RESOLVED admission strategy for a specific organization.
 * Merges the workflow config + the org's form_builder_config.
 * 
 * @param {Object} org - The full Organization document
 * @param {string} formType - "admission" or "onboarding"
 * @returns {Object} Complete strategy with resolved fields, documents, and custom fields
 */
export function getResolvedAdmissionStrategy(org, formType = "admission") {
    const baseStrategy = getAdmissionStrategy(org.structure_type);
    const formConfig = org.admission_config?.form_builder_config;
    const defaults = getOrgTypeDefaults(org.structure_type);

    const fieldEntries = formConfig?.field_toggles?.length
        ? formConfig.field_toggles.filter((field) => field[formType] === true)
        : defaults.enabled_fields.map((key) => ({ key }));

    const customFields = (formConfig?.custom_fields || []).filter((field) => field[formType] === true);

    const resolvedFields = [];
    const resolvedRequiredFields = [];
    const resolvedOptionalFields = [];

    for (const entry of fieldEntries) {
        resolvedFields.push(entry.key);

        const definition = getMasterFieldDefinition(entry.key);
        const isRequired = typeof entry.is_required === "boolean"
            ? entry.is_required
            : Boolean(definition?.is_required_by_default);

        if (isRequired) {
            resolvedRequiredFields.push(entry.key);
        } else {
            resolvedOptionalFields.push(entry.key);
        }
    }

    for (const customField of customFields) {
        resolvedFields.push(customField.field_key);
        if (customField.is_required) {
            resolvedRequiredFields.push(customField.field_key);
        } else {
            resolvedOptionalFields.push(customField.field_key);
        }
    }

    const resolvedDocuments = formConfig?.document_toggles?.length
        ? formConfig.document_toggles
            .filter((document) => document[formType] === true)
            .map((document) => document.key)
        : defaults.enabled_documents;

    return {
        ...baseStrategy,
        resolved_fields: Array.from(new Set(resolvedFields)),
        resolved_required_fields: Array.from(new Set(resolvedRequiredFields)),
        resolved_optional_fields: Array.from(new Set(resolvedOptionalFields)),
        resolved_documents: resolvedDocuments,
        custom_field_definitions: customFields,
    };
}

/**
 * Check if an org type supports a specific admission feature.
 */
export function supportsFeature(structureType, feature) {
    const strategy = getAdmissionStrategy(structureType);
    switch (feature) {
        case "rla": return strategy.supports_rla;
        case "cap_upgrade": return strategy.supports_cap_upgrade;
        case "credential_generation": return strategy.credential_generation !== null;
        default: return false;
    }
}
export {
    MASTER_FIELD_POOL,
    MASTER_DOCUMENT_POOL,
    ORG_TYPE_DEFAULTS,
};

export default ADMISSION_STRATEGIES;
