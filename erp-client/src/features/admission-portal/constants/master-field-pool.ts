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

export const MASTER_FIELD_POOL: Record<string, { label: string, fields: any[] }> = {
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
    birth_native: {
        label: "Birth & Native Place",
        fields: [
            { key: "birth_place", label: "Birth Place", type: "text" },
            { key: "native_place", label: "Native Place", type: "text" },
            { key: "native_area_type", label: "Native Area Type", type: "dropdown", options: ["Rural", "Urban"] },
        ]
    },
    permanent_address: {
        label: "Permanent Address",
        fields: [
            { key: "permanent_address", label: "Permanent Address", type: "text" },
            { key: "permanent_country", label: "Permanent Country", type: "dropdown", options: ["India", "USA", "UK", "Canada", "Australia", "Other"] },
            { key: "permanent_state", label: "Permanent State", type: "dropdown", options: ["Maharashtra", "Gujarat", "Delhi", "Karnataka", "Tamil Nadu", "Other"] },
            { key: "permanent_district", label: "Permanent District", type: "dropdown", options: ["Pune", "Mumbai", "Thane", "Nagpur", "Nashik", "Other"] },
            { key: "permanent_city", label: "Permanent City (Type to Search)", type: "city_search" },
            { key: "permanent_taluka", label: "Permanent Taluka", type: "text" },
            { key: "permanent_pincode", label: "Permanent Pincode", type: "text" },
        ]
    },
    current_address: {
        label: "Current Address",
        fields: [
            { key: "current_address", label: "Current Address", type: "text" },
            { key: "current_country", label: "Current Country", type: "dropdown", options: ["India", "USA", "UK", "Canada", "Australia", "Other"] },
            { key: "current_state", label: "Current State", type: "dropdown", options: ["Maharashtra", "Gujarat", "Delhi", "Karnataka", "Tamil Nadu", "Other"] },
            { key: "current_district", label: "Current District", type: "dropdown", options: ["Pune", "Mumbai", "Thane", "Nagpur", "Nashik", "Other"] },
            { key: "current_city", label: "Current City (Type to Search)", type: "city_search" },
            { key: "current_taluka", label: "Current Taluka", type: "text" },
            { key: "current_pincode", label: "Current Pincode", type: "text" },
        ]
    },
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
    hostel: {
        label: "Hostel Information",
        fields: [
            { key: "hostel_name", label: "Hostel Name", type: "text" },
            { key: "hostel_address", label: "Hostel Address", type: "text" },
        ]
    },
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
    entrance_exam: {
        label: "Entrance Exam / CET",
        fields: [
            { key: "en_number", label: "EN Number", type: "text" },
            { key: "cet_score", label: "CET Score", type: "number" },
            { key: "jee_score", label: "JEE Score", type: "number" },
            { key: "seat_type", label: "Seat Type", type: "dropdown", options: ["CAP", "INSTITUTIONAL", "MANAGEMENT", "SPOT"] },
            { key: "branch_allotted", label: "Branch Allotted", type: "text" },
            { key: "cap_round", label: "CAP Round", type: "text" },
            { key: "lateral_entry", label: "Lateral Entry", type: "boolean" },
            { key: "entrance_score", label: "Entrance Score (Custom)", type: "number" },
        ]
    },
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
    institutional_goals: {
        label: "Institutional Goals",
        fields: [
            { key: "career_choice", label: "Career Choice", type: "text" },
            { key: "alumni_institute", label: "Alumni Institute", type: "text" },
        ]
    },
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
