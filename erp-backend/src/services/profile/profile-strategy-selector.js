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
 * profile-strategy-selector.js — Profile Field Strategy Factory
 *
 * Architecture (mirrors admission/strategy-selector.js):
 *   1. MASTER_PROFILE_SECTION_POOL — ALL possible profile sections & fields
 *   2. ORG_TYPE_LABEL_MAP          — Label overrides per org type (PRN → Roll Number, etc.)
 *   3. ROLE_PROFILE_CONFIGS        — Which sections/fields show per TARGET user's role
 *   4. VIEWER_ACCESS_MATRIX        — What a VIEWER can see based on their own role
 *   5. getResolvedProfileStrategy() — Merges everything into a single resolved config
 *
 * Usage:
 *   const config = getResolvedProfileStrategy({
 *     targetRole: "student",
 *     viewerRole: "faculty",
 *     orgType: "engineering",
 *     structureType: "engineering_with_div",
 *     isSelfView: false,
 *   });
 *   // → Returns { sections: [...], labels: {...}, permissions: {...} }
 */

// ═══════════════════════════════════════════════════════════════
// 1. MASTER PROFILE SECTION POOL — Every possible section & field
//    Organized exactly like the ERP profile sidebar
// ═══════════════════════════════════════════════════════════════

const MASTER_PROFILE_SECTION_POOL = {

  // ── Section 1: Personal Details ──────────────────────────────
  personal_details: {
    key: "personal_details",
    label: "Personal Details",
    icon: "User",
    sub_tabs: ["identity", "religion", "physically_handicapped", "minority_details", "passport_details", "admission_details"],
    fields: [
      // Identity
      { key: "name",               label: "Full Name",                type: "text",     sub_tab: "identity" },
      { key: "first_name",         label: "First Name",               type: "text",     sub_tab: "identity" },
      { key: "middle_name",        label: "Middle Name",              type: "text",     sub_tab: "identity" },
      { key: "last_name",          label: "Last Name",                type: "text",     sub_tab: "identity" },
      { key: "dob",                label: "Date of Birth",            type: "date",     sub_tab: "identity" },
      { key: "gender",             label: "Gender",                   type: "dropdown", sub_tab: "identity", options: ["Male", "Female", "Other", "Prefer not to say"] },
      { key: "blood_group",        label: "Blood Group",              type: "dropdown", sub_tab: "identity", options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] },
      { key: "nationality",        label: "Nationality",              type: "text",     sub_tab: "identity" },
      { key: "domicile",           label: "Domicile",                 type: "text",     sub_tab: "identity" },
      { key: "mother_tongue",      label: "Mother Tongue",            type: "text",     sub_tab: "identity" },
      { key: "marital_status",     label: "Marital Status",           type: "dropdown", sub_tab: "identity", options: ["Single", "Married", "Divorced", "Widowed"] },
      { key: "aadhar_number",      label: "Aadhar Number",            type: "text",     sub_tab: "identity", sensitive: true },
      { key: "pan_number",         label: "PAN Number",               type: "text",     sub_tab: "identity", sensitive: true },
      { key: "birth_place",        label: "Birth Place",              type: "text",     sub_tab: "identity" },
      { key: "native_place",       label: "Native Place",             type: "text",     sub_tab: "identity" },

      // Religion
      { key: "religion",           label: "Religion",                 type: "dropdown", sub_tab: "religion", options: ["Hindu", "Muslim", "Christian", "Buddhist", "Jain", "Sikh", "Parsi", "Other"] },
      { key: "caste",              label: "Caste",                    type: "text",     sub_tab: "religion" },
      { key: "sub_caste",          label: "Sub Caste",                type: "text",     sub_tab: "religion" },
      { key: "category",           label: "Category",                 type: "dropdown", sub_tab: "religion", options: ["Open", "SC", "ST", "OBC", "EWS", "VJ-NT", "SBC", "Other"] },
      { key: "creamy_layer",       label: "Creamy Layer",             type: "boolean",  sub_tab: "religion" },

      // Physically Handicapped
      { key: "physically_handicapped", label: "Physically Handicapped", type: "boolean",  sub_tab: "physically_handicapped" },
      { key: "ph_type",            label: "PH Type",                  type: "text",     sub_tab: "physically_handicapped" },
      { key: "ph_percentage",      label: "PH Percentage",            type: "number",   sub_tab: "physically_handicapped" },

      // Minority Details
      { key: "belongs_to_minority", label: "Belongs to Minority",     type: "boolean",  sub_tab: "minority_details" },
      { key: "minority_type",      label: "Minority Type",            type: "text",     sub_tab: "minority_details" },

      // Passport Details
      { key: "passport_number",    label: "Passport Number",          type: "text",     sub_tab: "passport_details", sensitive: true },
      { key: "passport_valid_upto", label: "Passport Valid Upto",     type: "date",     sub_tab: "passport_details" },
      { key: "visa_number",        label: "Visa Number",              type: "text",     sub_tab: "passport_details", sensitive: true },

      // Admission Details
      { key: "admission_type",     label: "Admission Type",           type: "dropdown", sub_tab: "admission_details", options: ["CAP", "Management", "Direct", "Lateral"] },
      { key: "admission_main_category", label: "Admission Category",  type: "text",     sub_tab: "admission_details" },
      { key: "seat_type",          label: "Seat Type",                type: "dropdown", sub_tab: "admission_details", options: ["CAP", "INSTITUTIONAL", "MANAGEMENT", "SPOT"] },
      { key: "cap_round",          label: "CAP Round",                type: "text",     sub_tab: "admission_details" },
      { key: "lateral_entry",      label: "Lateral Entry",            type: "boolean",  sub_tab: "admission_details" },
    ],
  },

  // ── Section 2: Contact Details ───────────────────────────────
  contact_details: {
    key: "contact_details",
    label: "Contact Details",
    icon: "Phone",
    fields: [
      { key: "email",              label: "Email",                    type: "text" },
      { key: "alternateEmail",     label: "Alternate Email",          type: "text" },
      { key: "phoneNumber",        label: "Mobile Number",            type: "text",     sensitive: true },
      { key: "permanent_address",  label: "Permanent Address",        type: "text" },
      { key: "permanent_state",    label: "State",                    type: "text" },
      { key: "permanent_city",     label: "City",                     type: "text" },
      { key: "permanent_district", label: "District",                 type: "text" },
      { key: "permanent_pincode",  label: "Pincode",                  type: "text" },
      { key: "current_address",    label: "Current Address",          type: "text" },
      { key: "current_state",      label: "Current State",            type: "text" },
      { key: "current_city",       label: "Current City",             type: "text" },
      { key: "current_pincode",    label: "Current Pincode",          type: "text" },
      // Emergency contact
      { key: "emergency_contact_name",   label: "Emergency Contact Name",   type: "text" },
      { key: "emergency_contact_mobile", label: "Emergency Contact Mobile", type: "text",  sensitive: true },
      { key: "emergency_contact_relation", label: "Relation",               type: "text" },
    ],
  },

  // ── Section 3: Family Details ────────────────────────────────
  family_details: {
    key: "family_details",
    label: "Family Details",
    icon: "Users",
    fields: [
      { key: "fatherName",         label: "Father's Name",            type: "text" },
      { key: "motherName",         label: "Mother's Name",            type: "text" },
      { key: "father_occupation",  label: "Father's Occupation",      type: "text" },
      { key: "mother_occupation",  label: "Mother's Occupation",      type: "text" },
      { key: "father_income",      label: "Father's Income",          type: "number",   sensitive: true },
      { key: "mother_income",      label: "Mother's Income",          type: "number",   sensitive: true },
      { key: "father_mobile",      label: "Father's Mobile",          type: "text",     sensitive: true },
      { key: "mother_mobile",      label: "Mother's Mobile",          type: "text",     sensitive: true },
      { key: "father_email",       label: "Father's Email",           type: "text" },
      { key: "mother_email",       label: "Mother's Email",           type: "text" },
      { key: "father_education",   label: "Father's Education",       type: "text" },
      { key: "mother_education",   label: "Mother's Education",       type: "text" },
      // Local Guardian
      { key: "local_guardian_name",   label: "Local Guardian Name",   type: "text" },
      { key: "local_guardian_mobile", label: "Local Guardian Mobile", type: "text",     sensitive: true },
      { key: "local_guardian_address", label: "Local Guardian Address", type: "text" },
    ],
  },

  // ── Section 4: Education Details ─────────────────────────────
  education_details: {
    key: "education_details",
    label: "Education Details",
    icon: "GraduationCap",
    fields: [
      { key: "10th_board",         label: "10th Board",               type: "text" },
      { key: "10th_percentage",    label: "10th Percentage",          type: "number" },
      { key: "12th_board",         label: "12th Board",               type: "text" },
      { key: "12th_percentage",    label: "12th Percentage",          type: "number" },
      { key: "pcm_percentage",     label: "PCM Percentage",           type: "number" },
      { key: "diploma_percentage", label: "Diploma Percentage",       type: "number" },
      { key: "previous_school",    label: "Previous School/College",  type: "text" },
      { key: "previous_percentage", label: "Previous Percentage",     type: "number" },
      // Entrance exams
      { key: "en_number",          label: "EN Number",                type: "text" },
      { key: "cet_score",          label: "CET Score",                type: "number" },
      { key: "jee_score",          label: "JEE Score",                type: "number" },
      { key: "entrance_score",     label: "Entrance Score (Custom)",  type: "number" },
      // Compliance IDs
      { key: "eligibilityNo",     label: "Eligibility Number",       type: "text" },
      { key: "abc_id",             label: "ABC ID",                   type: "text" },
      { key: "university_prn_number", label: "University PRN",        type: "text" },
    ],
  },

  // ── Section 5: Bank Details ──────────────────────────────────
    faculty_education_details: {
    key: "faculty_education_details",
    label: "Education Details",
    icon: "GraduationCap",
    fields: [
      { key: "ug_degree", label: "Undergraduate Degree", type: "text" },
      { key: "ug_specialization", label: "Undergraduate Specialization", type: "text" },
      { key: "ug_university", label: "Undergraduate University", type: "text" },
      { key: "ug_percentage", label: "Undergraduate Percentage", type: "number" },
      { key: "ug_year", label: "Undergraduate Year", type: "number" },
      { key: "pg_degree", label: "Postgraduate Degree", type: "text" },
      { key: "pg_specialization", label: "Postgraduate Specialization", type: "text" },
      { key: "pg_university", label: "Postgraduate University", type: "text" },
      { key: "pg_percentage", label: "Postgraduate Percentage", type: "number" },
      { key: "pg_year", label: "Postgraduate Year", type: "number" },
      { key: "bed_degree", label: "B.Ed Degree", type: "text" },
      { key: "bed_university", label: "B.Ed University", type: "text" },
      { key: "bed_percentage", label: "B.Ed Percentage", type: "number" },
      { key: "bed_year", label: "B.Ed Year", type: "number" },
      { key: "phd_qualified", label: "PhD (Yes/No)", type: "boolean" },
      { key: "phd_specialization", label: "PhD Specialization", type: "text" },
      { key: "phd_university", label: "PhD University", type: "text" },
      { key: "phd_year", label: "PhD Year", type: "number" },
      { key: "net_qualified", label: "NET Qualified", type: "boolean" },
      { key: "slet_qualified", label: "SLET Qualified", type: "boolean" },
    ],
  },
  admin_education_details: {
    key: "admin_education_details",
    label: "Education Details",
    icon: "GraduationCap",
    fields: [
      { key: "ug_degree", label: "Undergraduate Degree", type: "text" },
      { key: "ug_specialization", label: "Undergraduate Specialization", type: "text" },
      { key: "ug_university", label: "Undergraduate University", type: "text" },
      { key: "pg_degree", label: "Postgraduate Degree", type: "text" },
      { key: "pg_specialization", label: "Postgraduate Specialization", type: "text" },
      { key: "pg_university", label: "Postgraduate University", type: "text" },
      { key: "bed_degree", label: "B.Ed Degree", type: "text" },
      { key: "phd_qualified", label: "PhD (Yes/No)", type: "boolean" },
      { key: "phd_specialization", label: "PhD Specialization", type: "text" },
      { key: "phd_university", label: "PhD University", type: "text" },
    ],
  },
  staff_education_details: {
    key: "staff_education_details",
    label: "Education Details",
    icon: "GraduationCap",
    fields: [
      { key: "ug_degree", label: "Undergraduate Degree", type: "text" },
      { key: "ug_specialization", label: "Undergraduate Specialization", type: "text" },
      { key: "ug_university", label: "Undergraduate University", type: "text" },
    ],
  },
  faculty_documents: {
    key: "faculty_documents",
    label: "Upload Documents",
    icon: "FileUp",
    fields: [
      { key: "doc_aadhar", label: "Aadhar Card", type: "file_list" },
      { key: "doc_pan", label: "PAN Card", type: "file_list" },
      { key: "doc_highest_degree", label: "Highest Degree Certificate", type: "file_list" },
      { key: "doc_bed", label: "B.Ed Certificate", type: "file_list" },
      { key: "doc_experience", label: "Experience/Relieving Letter", type: "file_list" },
      { key: "doc_appointment", label: "Appointment Letter", type: "file_list" },
      { key: "doc_net_slet", label: "NET/SLET Certificate", type: "file_list" },
      { key: "doc_police_verification", label: "Police Verification Certificate", type: "file_list" },
    ],
  },
  admin_documents: {
    key: "admin_documents",
    label: "Upload Documents",
    icon: "FileUp",
    fields: [
      { key: "doc_aadhar", label: "Aadhar Card", type: "file_list" },
      { key: "doc_pan", label: "PAN Card", type: "file_list" },
      { key: "doc_highest_degree", label: "Highest Degree Certificate", type: "file_list" },
      { key: "doc_experience", label: "Experience/Relieving Letter", type: "file_list" },
      { key: "doc_appointment", label: "Appointment Letter", type: "file_list" },
      { key: "doc_police_verification", label: "Police Verification Certificate", type: "file_list" },
    ],
  },
  staff_documents: {
    key: "staff_documents",
    label: "Upload Documents",
    icon: "FileUp",
    fields: [
      { key: "doc_aadhar", label: "Aadhar Card", type: "file_list" },
      { key: "doc_pan", label: "PAN Card", type: "file_list" },
      { key: "doc_highest_degree", label: "Highest Qualification Certificate", type: "file_list" },
      { key: "doc_experience", label: "Experience/Relieving Letter", type: "file_list" },
      { key: "doc_appointment", label: "Appointment Letter", type: "file_list" },
    ],
  },
  transport_documents: {
    key: "transport_documents",
    label: "Upload Documents",
    icon: "FileUp",
    fields: [
      { key: "doc_aadhar", label: "Aadhar Card", type: "file_list" },
      { key: "doc_pan", label: "PAN Card", type: "file_list" },
      { key: "doc_highest_degree", label: "Highest Qualification Certificate", type: "file_list" },
      { key: "doc_experience", label: "Experience/Relieving Letter", type: "file_list" },
      { key: "doc_appointment", label: "Appointment Letter", type: "file_list" },
      { key: "doc_driving_license", label: "Driving License", type: "file_list" },
      { key: "doc_heavy_vehicle_permit", label: "Heavy Vehicle Permit", type: "file_list" },
      { key: "doc_puc", label: "PUC Certificate", type: "file_list" },
    ],
  },
  faculty_experience_details: {
    key: "faculty_experience_details",
    label: "Experience Details",
    icon: "Briefcase",
    fields: [
      { key: "qualification", label: "Qualification", type: "text" },
      { key: "department", label: "Department", type: "text" },
      { key: "designation", label: "Designation", type: "text" },
      { key: "subjectsAssigned", label: "Subjects Assigned", type: "text" },
      { key: "subject", label: "Primary Subject", type: "text" },
      { key: "experience_years", label: "Experience (Years)", type: "number" },
      { key: "experience_details", label: "Experience Details", type: "text" },
    ],
  },
  admin_experience_details: {
    key: "admin_experience_details",
    label: "Experience Details",
    icon: "Briefcase",
    fields: [
      { key: "qualification", label: "Qualification", type: "text" },
      { key: "department", label: "Department", type: "text" },
      { key: "designation", label: "Designation", type: "text" },
      { key: "experience_years", label: "Experience (Years)", type: "number" },
      { key: "experience_details", label: "Experience Details", type: "text" },
      { key: "responsibilities", label: "Responsibilities", type: "text" },
    ],
  },
  staff_experience_details: {
    key: "staff_experience_details",
    label: "Experience Details",
    icon: "Briefcase",
    fields: [
      { key: "qualification", label: "Qualification", type: "text" },
      { key: "department", label: "Department", type: "text" },
      { key: "designation", label: "Designation", type: "text" },
      { key: "experience_years", label: "Experience (Years)", type: "number" },
      { key: "experience_details", label: "Experience Details", type: "text" },
    ],
  },
  exam_controller_experience_details: {
    key: "exam_controller_experience_details",
    label: "Experience Details",
    icon: "Briefcase",
    fields: [
      { key: "qualification", label: "Qualification", type: "text" },
      { key: "department", label: "Department", type: "text" },
      { key: "designation", label: "Designation", type: "text" },
      { key: "experience_years", label: "Experience (Years)", type: "number" },
      { key: "experience_details", label: "Experience Details", type: "text" },
      { key: "board_affiliation_experience", label: "Board/Affiliation Experience", type: "text" },
    ],
  },

  bank_details: {
    key: "bank_details",
    label: "Bank Details",
    icon: "Landmark",
    fields: [
      { key: "bank_account_number", label: "Account Number",          type: "text",     sensitive: true },
      { key: "bank_ifsc_code",     label: "IFSC Code",                type: "text" },
      { key: "bank_name",          label: "Bank Name",                type: "text" },
      { key: "bank_branch",        label: "Branch Name",              type: "text" },
      { key: "bank_micr_code",     label: "MICR Code",                type: "text" },
    ],
  },

  // ── Section 6: Documents ─────────────────────────────────────
  upload_documents: {
    key: "upload_documents",
    label: "Upload Documents",
    icon: "FileUp",
    fields: [
      { key: "documents",          label: "Uploaded Documents",        type: "file_list" },
    ],
  },

  // ── Section 7: Experience Details (Faculty / Staff) ──────────
  experience_details: {
    key: "experience_details",
    label: "Experience Details",
    icon: "Briefcase",
    fields: [
      { key: "qualification",      label: "Qualification",            type: "text" },
      { key: "department",         label: "Department",               type: "text" },
      { key: "designation",        label: "Designation",              type: "text" },
      { key: "subjectsAssigned",   label: "Subjects Assigned",        type: "text" },
      { key: "subject",            label: "Primary Subject",          type: "text" },
      { key: "experience_years",   label: "Experience (Years)",       type: "number" },
      { key: "experience_details", label: "Experience Details",       type: "text" },
      
    ],
  },

  // ── Section 8: Awards / Participation ────────────────────────
  awards_participation: {
    key: "awards_participation",
    label: "Award / Participation Details",
    icon: "Trophy",
    fields: [
      { key: "awards",             label: "Awards & Achievements",    type: "text" },
      { key: "participation",      label: "Participation Details",    type: "text" },
      { key: "sports",             label: "Sports",                   type: "text" },
      { key: "cultural_activities", label: "Cultural Activities",     type: "text" },
    ],
  },

  // ── Section 9: Student Activity ──────────────────────────────
  student_activity: {
    key: "student_activity",
    label: "Student Activity",
    icon: "Activity",
    fields: [
      { key: "clubs_joined",       label: "Clubs Joined",             type: "text" },
      { key: "committees",         label: "Committee Membership",     type: "text" },
      { key: "nss_ncc",            label: "NSS / NCC",                type: "text" },
      { key: "internships",        label: "Internships",              type: "text" },
      { key: "projects",           label: "Projects",                 type: "text" },
    ],
  },

  // ── Section 10: Social Details ───────────────────────────────
  social_details: {
    key: "social_details",
    label: "Social Details",
    icon: "Globe",
    fields: [
      { key: "bio",                label: "Bio",                      type: "text" },
      { key: "hobby",              label: "Hobbies",                  type: "text" },
      { key: "linkedin_url",       label: "LinkedIn",                 type: "url" },
      { key: "github_url",         label: "GitHub",                   type: "url" },
      { key: "instagram_url",      label: "Instagram",                type: "url" },
      { key: "portfolio_url",      label: "Portfolio",                type: "url" },
    ],
  },

  // ── Section 11: ID-Card Photo & Sign ─────────────────────────
  id_card_photos: {
    key: "id_card_photos",
    label: "ID-Card Photo & Sign Upload",
    icon: "CreditCard",
    fields: [
      { key: "profilePicture",     label: "Profile Photo",            type: "image" },
      { key: "profileBanner",      label: "Profile Banner",           type: "image" },
      { key: "signature",          label: "Signature",                type: "image" },
    ],
  },

  // ── Section 12: Medical Details ──────────────────────────────
  medical_details: {
    key: "medical_details",
    label: "Medical Details",
    icon: "HeartPulse",
    fields: [
      { key: "medical_conditions",  label: "Medical Conditions",      type: "text" },
      { key: "allergies",           label: "Allergies",                type: "text" },
      { key: "disability_type",     label: "Disability Type",         type: "text" },
      { key: "medical_insurance",   label: "Medical Insurance No.",   type: "text" },
    ],
  },

  // ── Section 13: Person Skill & Interest ──────────────────────
  skills_interest: {
    key: "skills_interest",
    label: "Person Skill & Interest",
    icon: "Sparkles",
    fields: [
      { key: "skills",             label: "Skills",                   type: "text" },
      { key: "interests",          label: "Interests",                type: "text" },
      { key: "languages_known",    label: "Languages Known",          type: "text" },
      { key: "career_goal",        label: "Career Goal",              type: "text" },
    ],
  },

  // ── Section 14: Anti-Ragging Details ─────────────────────────
  anti_ragging: {
    key: "anti_ragging",
    label: "Anti-Ragging Details",
    icon: "ShieldCheck",
    fields: [
      { key: "anti_ragging_undertaking_no", label: "Anti-Ragging Undertaking No.", type: "text" },
      { key: "anti_ragging_link",           label: "Anti-Ragging Form Link",       type: "url" },
      { key: "anti_ragging_date",           label: "Undertaking Date",             type: "date" },
    ],
  },

  // ── Section 15: Academic Placement (Hierarchy Context) ───────
  // This is dynamically constructed based on org_type / structure_type
  academic_placement: {
    key: "academic_placement",
    label: "Academic Placement",
    icon: "School",
    fields: [
      { key: "prn",                label: "PRN",                      type: "text" },
      { key: "branch",             label: "Branch",                   type: "text" },
      { key: "batch",              label: "Batch",                    type: "text" },
      { key: "department",         label: "Department",               type: "text" },
      { key: "division",           label: "Division",                 type: "text" },
      { key: "standard",           label: "Standard",                 type: "text" },
      { key: "stream",             label: "Stream",                   type: "text" },
      { key: "course",             label: "Course",                   type: "text" },
      { key: "semester",           label: "Semester",                 type: "text" },
      { key: "year",               label: "Year",                     type: "text" },
      { key: "degree",             label: "Degree",                   type: "text" },
    ],
  },

  // ── Section 16: Platform Metadata (always shown) ─────────────
  platform_metadata: {
    key: "platform_metadata",
    label: "Platform Info",
    icon: "Clock",
    fields: [
      { key: "lastLoginAt",        label: "Last Seen",                type: "datetime" },
      { key: "createdAt",          label: "Member Since",             type: "date" },
      { key: "status",             label: "Account Status",           type: "text" },
      { key: "verification_status", label: "Verification Status",    type: "text" },
      { key: "organization_name",  label: "Organization",             type: "text" },
    ],
  },

  // ── Section 17: HR & Payroll (Staff only, Admin viewers) ─────
  hr_payroll: {
    key: "hr_payroll",
    label: "HR & Payroll",
    icon: "Wallet",
    fields: [
      { key: "payroll_salary_mode",     label: "Salary Mode",         type: "dropdown", options: ["hourly", "monthly", "none"], sensitive: true },
      { key: "payroll_hourly_rate",     label: "Hourly Rate",         type: "number",   sensitive: true },
      { key: "payroll_base_salary",     label: "Base Monthly Salary", type: "number",   sensitive: true },
      
    ],
  },
};


// ═══════════════════════════════════════════════════════════════
// 2. ORG-TYPE LABEL OVERRIDES
//    Same field key → different label depending on org type
// ═══════════════════════════════════════════════════════════════

const ORG_TYPE_LABEL_MAP = {
  engineering: {
    prn:        "PRN",
    branch:     "Branch",
    batch:      "Batch (e.g. 2023-2027)",
    department: "Department",
    division:   "Division",
    semester:   "Semester",
    year:       "Year",
    degree:     "Degree Program",
    standard:   null,    // not applicable
    stream:     null,    // not applicable
    course:     null,    // not applicable
  },

  school: {
    prn:        "Roll Number",
    branch:     null,    // not applicable
    batch:      "Academic Year",
    department: null,    // not applicable
    division:   "Division",
    semester:   null,    // not applicable
    year:       null,    // not applicable
    degree:     null,    // not applicable
    standard:   "Class / Standard",
    stream:     null,    // not applicable
    course:     null,    // not applicable
  },

  junior_college: {
    prn:        "Roll Number",
    branch:     null,    // not applicable
    batch:      "Academic Year",
    department: null,    // not applicable
    division:   "Division",
    semester:   null,    // not applicable
    year:       null,    // not applicable
    degree:     null,    // not applicable
    standard:   "Class (11th / 12th)",
    stream:     "Stream",
    course:     null,    // not applicable
  },

  coaching: {
    prn:        "Student ID",
    branch:     null,    // not applicable
    batch:      "Batch",
    department: null,    // not applicable
    division:   null,    // not applicable
    semester:   null,    // not applicable
    year:       null,    // not applicable
    degree:     null,    // not applicable
    standard:   null,    // not applicable
    stream:     null,    // not applicable
    course:     "Course / Program",
  },

  diploma: {
    prn:        "PRN / Enrollment No.",
    branch:     "Branch",
    batch:      "Batch",
    department: "Department",
    division:   "Division",
    semester:   "Semester",
    year:       "Year",
    degree:     null,    // not applicable
    standard:   null,    // not applicable
    stream:     null,    // not applicable
    course:     null,    // not applicable
  },

  other: {
    prn:        "ID Number",
    branch:     "Branch",
    batch:      "Batch",
    department: "Department",
    division:   "Division",
    semester:   "Semester",
    year:       "Year",
    degree:     "Degree",
    standard:   "Level",
    stream:     "Stream",
    course:     "Course",
  },
};


// ═══════════════════════════════════════════════════════════════
// 3. ROLE PROFILE CONFIGS — What sections show for each TARGET role
//    (whose profile we are looking at)
// ═══════════════════════════════════════════════════════════════

const ROLE_PROFILE_CONFIGS = {

  // ── STUDENT — Full academic profile ──────────────────────────
  student: {
    sections: ["personal_details", "academic_placement", "contact_details", "family_details", "education_details", "bank_details", "upload_documents", "awards_participation", "student_activity", "social_details", "id_card_photos", "medical_details", "skills_interest", "anti_ragging", "platform_metadata"],
    // Academic placement fields that are relevant per org type
    academic_placement_fields: {
      engineering:      ["prn", "degree", "department", "branch", "year", "semester", "division", "batch"],
      school:           ["prn", "standard", "division", "batch"],
      junior_college:   ["prn", "stream", "standard", "division", "batch"],
      coaching:         ["prn", "course", "batch"],
      diploma:          ["prn", "department", "branch", "year", "semester", "division", "batch"],
      other:            ["prn", "department", "branch", "batch"],
    },
  },

  // ── FACULTY / TEACHER — Professional profile ─────────────────
  faculty: {
    sections: ["personal_details", "faculty_experience_details", "contact_details", "faculty_education_details", "social_details", "id_card_photos", "awards_participation", "skills_interest", "platform_metadata", "faculty_documents"],
    academic_placement_fields: null, // Faculty don't have academic placement
  },

  // Alias: "teacher" maps to same as "faculty"
  teacher: null, // resolved below

  // ── ORG ADMIN — Administrative profile ───────────────────────
  org_admin: {
    sections: ["personal_details", "admin_experience_details", "contact_details", "social_details", "id_card_photos", "platform_metadata", "admin_education_details", "admin_documents"],
    academic_placement_fields: null,
  },

  // ── DEPARTMENT ADMINS — Similar to org_admin but with dept context ──
  // All 7 dept admin roles share this config
  admission_head: {
    sections: ["personal_details", "staff_experience_details", "contact_details", "social_details", "id_card_photos", "platform_metadata", "staff_education_details", "staff_documents"],
    academic_placement_fields: null,
  },

  // ── SUPER ADMIN — Minimal platform-level profile ─────────────
  super_admin: {
    sections: [
      "personal_details",
      "contact_details",
      "social_details",
      "id_card_photos",
      "platform_metadata",
    ],
    academic_placement_fields: null,
  },

  // ── HOD — Same as faculty + department context ───────────────
  hod: {
    sections: ["personal_details", "admin_experience_details", "contact_details", "admin_education_details", "social_details", "id_card_photos", "awards_participation", "skills_interest", "platform_metadata", "admin_documents"],
    academic_placement_fields: null,
  },

  // ── PRINCIPAL / VICE PRINCIPAL ───────────────────────────────
  principal: {
    sections: ["personal_details", "admin_experience_details", "contact_details", "social_details", "id_card_photos", "platform_metadata", "admin_education_details", "admin_documents"],
    academic_placement_fields: null,
  },
};

// ── Populate role aliases ──────────────────────────────────────
// Many roles share the same profile layout
ROLE_PROFILE_CONFIGS.teacher           = ROLE_PROFILE_CONFIGS.faculty;
ROLE_PROFILE_CONFIGS.vice_principal    = ROLE_PROFILE_CONFIGS.principal;
ROLE_PROFILE_CONFIGS.exam_controller   = ROLE_PROFILE_CONFIGS.admission_head;
ROLE_PROFILE_CONFIGS.fee_manager       = ROLE_PROFILE_CONFIGS.admission_head;
ROLE_PROFILE_CONFIGS.admission_verifier = ROLE_PROFILE_CONFIGS.admission_head;
ROLE_PROFILE_CONFIGS.admission_counselor = ROLE_PROFILE_CONFIGS.admission_head;
ROLE_PROFILE_CONFIGS.admission_clerk   = ROLE_PROFILE_CONFIGS.admission_head;
ROLE_PROFILE_CONFIGS.library_manager   = ROLE_PROFILE_CONFIGS.admission_head;
ROLE_PROFILE_CONFIGS.tpo_officer       = ROLE_PROFILE_CONFIGS.admission_head;
ROLE_PROFILE_CONFIGS.transport_manager = ROLE_PROFILE_CONFIGS.admission_head;
ROLE_PROFILE_CONFIGS.counselor         = ROLE_PROFILE_CONFIGS.admission_head;
ROLE_PROFILE_CONFIGS.coordinator       = ROLE_PROFILE_CONFIGS.admission_head;


// ═══════════════════════════════════════════════════════════════
// 4. VIEWER ACCESS MATRIX
//    What a VIEWER can see based on their own role.
//    Controls: section visibility, sensitive field access, edit rights.
//
//    access_level:
//      "full"        — sees all sections + sensitive fields
//      "professional" — sees most sections, no sensitive fields (bank, income, etc.)
//      "public"      — sees only non-sensitive, public-facing sections
// ═══════════════════════════════════════════════════════════════

const VIEWER_ACCESS_MATRIX = {

  // ── SELF VIEW (user viewing own profile) ─────────────────────
  self: {
    access_level: "full",
    can_edit: true,
    hidden_sections: [],           // sees everything
    show_sensitive: true,
    show_settings: true,           // shows User Experience, Contact & Support toggles
  },

  // ── SUPER ADMIN viewing anyone ───────────────────────────────
  super_admin: {
    access_level: "full",
    can_edit: false,
    hidden_sections: [],
    show_sensitive: true,
    show_settings: false,
  },

  // ── ORG ADMIN viewing anyone in their org ────────────────────
  org_admin: {
    access_level: "full",
    can_edit: false,
    hidden_sections: [],
    show_sensitive: true,
    show_settings: false,
  },

  // ── PRINCIPAL viewing anyone in their org ────────────────────
  principal: {
    access_level: "full",
    can_edit: false,
    hidden_sections: ["hr_payroll"],
    show_sensitive: true,
    show_settings: false,
  },

  // ── HOD viewing faculty/students in their dept ───────────────
  hod: {
    access_level: "professional",
    can_edit: false,
    hidden_sections: ["bank_details", "hr_payroll"],
    show_sensitive: false,
    show_settings: false,
  },

  // ── DEPT ADMINS — Contextual access ──────────────────────────
  // Admission head sees admission-related fields
  admission_head: {
    access_level: "professional",
    can_edit: false,
    hidden_sections: ["bank_details", "hr_payroll", "medical_details"],
    show_sensitive: false,
    show_settings: false,
  },

  // Fee manager sees bank + financial info
  fee_manager: {
    access_level: "professional",
    can_edit: false,
    hidden_sections: ["hr_payroll", "medical_details"],
    show_sensitive: false, // except bank — handled by special override
    show_settings: false,
    section_overrides: {
      bank_details: { visible: true, show_sensitive: true },
    },
  },

  // Exam controller — academic focused
  exam_controller: {
    access_level: "professional",
    can_edit: false,
    hidden_sections: ["bank_details", "hr_payroll", "family_details", "medical_details"],
    show_sensitive: false,
    show_settings: false,
  },

  // Library manager — minimal
  library_manager: {
    access_level: "public",
    can_edit: false,
    hidden_sections: ["bank_details", "hr_payroll", "family_details", "medical_details", "education_details"],
    show_sensitive: false,
    show_settings: false,
  },

  // HR dept — sees payroll + staff info
  hr_dept: {
    access_level: "full",
    can_edit: false,
    hidden_sections: [],
    show_sensitive: true,
    show_settings: false,
    // HR can see hr_payroll for faculty/staff targets
    section_overrides: {
      hr_payroll: { visible: true, show_sensitive: true },
    },
  },

  // ── FACULTY viewing students ─────────────────────────────────
  faculty: {
    access_level: "professional",
    can_edit: false,
    hidden_sections: ["bank_details", "hr_payroll"],
    show_sensitive: false,
    show_settings: false,
  },

  // ── STUDENT viewing anyone ───────────────────────────────────
  student: {
    access_level: "public",
    can_edit: false,
    hidden_sections: [
      "bank_details", "hr_payroll", "family_details",
      "medical_details", "upload_documents", "anti_ragging",
    ],
    show_sensitive: false,
    show_settings: false,
  },
};

// Map remaining roles to their closest access matrix entry
VIEWER_ACCESS_MATRIX.teacher           = VIEWER_ACCESS_MATRIX.faculty;
VIEWER_ACCESS_MATRIX.vice_principal    = VIEWER_ACCESS_MATRIX.principal;
VIEWER_ACCESS_MATRIX.admission_verifier = VIEWER_ACCESS_MATRIX.admission_head;
VIEWER_ACCESS_MATRIX.admission_counselor = VIEWER_ACCESS_MATRIX.admission_head;
VIEWER_ACCESS_MATRIX.admission_clerk   = VIEWER_ACCESS_MATRIX.admission_head;
VIEWER_ACCESS_MATRIX.tpo_officer       = VIEWER_ACCESS_MATRIX.admission_head;
VIEWER_ACCESS_MATRIX.transport_manager = VIEWER_ACCESS_MATRIX.library_manager;
VIEWER_ACCESS_MATRIX.counselor         = VIEWER_ACCESS_MATRIX.faculty;
VIEWER_ACCESS_MATRIX.coordinator       = VIEWER_ACCESS_MATRIX.faculty;


// ═══════════════════════════════════════════════════════════════
// 5. CHAT PROFILE CONFIGS — Lightweight subset for chat sidebar
//    (WhatsApp-style quick view when clicking on a user in chat)
//    These are the sections/fields shown in the chat profile panel
// ═══════════════════════════════════════════════════════════════

const CHAT_PROFILE_SECTIONS = {

  // What to show for a student in chat profile
  student: {
    header: ["name", "role", "profilePicture", "profileBanner", "organization_name", "lastLoginAt"],
    sections: [
      {
        key: "identity",
        label: "Identity",
        fields: ["email", "bio", "prn", "gender"],
      },
      {
        key: "academic",
        label: "Academic Info",
        // Fields resolved dynamically by org_type
        fields_by_org: {
          engineering:    ["degree", "department", "branch", "year", "semester", "division", "batch"],
          school:         ["standard", "division", "batch"],
          junior_college: ["stream", "standard", "division", "batch"],
          coaching:       ["course", "batch"],
          diploma:        ["department", "branch", "year", "semester", "division", "batch"],
          other:          ["department", "branch", "batch"],
        },
      },
      {
        key: "social",
        label: "About",
        fields: ["hobby", "skills", "linkedin_url", "github_url"],
      },
      {
        key: "activity",
        label: "Activity",
        fields: ["createdAt", "lastLoginAt"],
      },
    ],
  },

  faculty: {
    header: ["name", "role", "profilePicture", "profileBanner", "organization_name", "lastLoginAt"],
    sections: [
      {
        key: "identity",
        label: "Identity",
        fields: ["email", "bio"],
      },
      {
        key: "professional",
        label: "Professional",
        fields: ["department", "qualification", "subjectsAssigned", "designation"],
      },
      {
        key: "social",
        label: "About",
        fields: ["hobby", "linkedin_url", "github_url"],
      },
      {
        key: "activity",
        label: "Activity",
        fields: ["createdAt", "lastLoginAt"],
      },
    ],
  },

  // Dept admin / org_admin in chat
  admin: {
    header: ["name", "role", "profilePicture", "profileBanner", "organization_name", "lastLoginAt"],
    sections: [
      {
        key: "identity",
        label: "Identity",
        fields: ["email", "bio"],
      },
      {
        key: "role_info",
        label: "Role",
        fields: ["department", "additional_roles"],
      },
      {
        key: "activity",
        label: "Activity",
        fields: ["createdAt", "lastLoginAt"],
      },
    ],
  },

  // Super admin in chat — minimal
  super_admin: {
    header: ["name", "role", "profilePicture", "profileBanner", "lastLoginAt"],
    sections: [
      {
        key: "identity",
        label: "Platform Support",
        fields: ["email", "bio"],
      },
      {
        key: "activity",
        label: "Activity",
        fields: ["createdAt", "lastLoginAt"],
      },
    ],
  },
};


// ═══════════════════════════════════════════════════════════════
// 6. EXPORTED FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get the full master section pool.
 */
export function getMasterProfileSectionPool() {
  return MASTER_PROFILE_SECTION_POOL;
}

/**
 * Get a specific section definition from the master pool.
 * @param {string} sectionKey
 */
export function getProfileSection(sectionKey) {
  return MASTER_PROFILE_SECTION_POOL[sectionKey] || null;
}

/**
 * Get the label overrides for a specific org type.
 * @param {string} orgType — "engineering", "school", "coaching", "junior_college", "diploma", "other"
 */
export function getOrgTypeLabelMap(orgType) {
  return ORG_TYPE_LABEL_MAP[orgType] || ORG_TYPE_LABEL_MAP.other;
}

/**
 * Resolve a field's display label based on org type.
 * Falls back to the master pool's default label if no override exists.
 * @param {string} fieldKey
 * @param {string} orgType
 */
export function resolveFieldLabel(fieldKey, orgType) {
  const overrides = ORG_TYPE_LABEL_MAP[orgType] || ORG_TYPE_LABEL_MAP.other;
  if (overrides[fieldKey] !== undefined) {
    return overrides[fieldKey]; // null means field is not applicable for this org
  }
  // Search master pool for default label
  for (const section of Object.values(MASTER_PROFILE_SECTION_POOL)) {
    const field = section.fields.find(f => f.key === fieldKey);
    if (field) return field.label;
  }
  return fieldKey; // fallback
}

/**
 * Get the profile sections config for a specific target role.
 * @param {string} targetRole — the role of the user whose profile is being viewed
 */
export function getRoleProfileConfig(targetRole) {
  return ROLE_PROFILE_CONFIGS[targetRole] || ROLE_PROFILE_CONFIGS.student;
}

/**
 * Get the viewer access config for a specific viewer role.
 * @param {string} viewerRole
 */
export function getViewerAccess(viewerRole) {
  return VIEWER_ACCESS_MATRIX[viewerRole] || VIEWER_ACCESS_MATRIX.student;
}

/**
 * Get the chat-specific profile config for a target role.
 * @param {string} targetRole
 */
export function getChatProfileConfig(targetRole) {
  // Map roles to their chat profile category
  const chatRoleMap = {
    student: "student",
    faculty: "faculty",
    teacher: "faculty",
    hod: "faculty",
    principal: "admin",
    vice_principal: "admin",
    org_admin: "admin",
    admission_head: "admin",
    admission_verifier: "admin",
    admission_counselor: "admin",
    admission_clerk: "admin",
    exam_controller: "admin",
    fee_manager: "admin",
    library_manager: "admin",
    tpo_officer: "admin",
    transport_manager: "admin",
    counselor: "faculty",
    coordinator: "faculty",
    super_admin: "super_admin",
  };

  const chatRole = chatRoleMap[targetRole] || "student";
  return CHAT_PROFILE_SECTIONS[chatRole];
}

/**
 * MAIN RESOLVER — Merges everything into a single resolved strategy.
 *
 * @param {Object} params
 * @param {string} params.targetRole     — role of the user whose profile is being viewed
 * @param {string} params.viewerRole     — role of the user who is viewing
 * @param {string} params.orgType        — "engineering", "school", "coaching", "junior_college", "diploma", "other"
 * @param {string} params.structureType  — full structure type (e.g. "engineering_with_div")
 * @param {boolean} params.isSelfView    — true if the viewer is viewing their own profile
 * @param {string} [params.context="full"] — "full" for full profile page, "chat" for chat sidebar
 *
 * @returns {Object} Resolved profile strategy
 */
export function getResolvedProfileStrategy({
  targetRole,
  viewerRole,
  orgType,
  structureType,
  isSelfView = false,
  context = "full",
}) {
  // 1. Resolve base org type from structure type
  const baseOrgType = resolveBaseOrgType(orgType, structureType);

  // 2. Get label overrides
  const labels = getOrgTypeLabelMap(baseOrgType);

  // 3. Get the target's profile config
  const targetConfig = getRoleProfileConfig(targetRole);

  // 4. Get the viewer's access level
  const viewerAccess = isSelfView
    ? VIEWER_ACCESS_MATRIX.self
    : (VIEWER_ACCESS_MATRIX[viewerRole] || VIEWER_ACCESS_MATRIX.student);

  // 5. For chat context, return lightweight config
  if (context === "chat") {
    const chatConfig = getChatProfileConfig(targetRole);
    return {
      context: "chat",
      targetRole,
      viewerRole,
      orgType: baseOrgType,
      labels,
      chatConfig,
      viewerAccess,
      // Resolve academic fields for the org type
      resolvedAcademicFields: chatConfig.sections
        .find(s => s.key === "academic")
        ?.fields_by_org?.[baseOrgType] || [],
    };
  }

  // 6. Full profile: Determine visible sections
  const allTargetSections = targetConfig.sections || [];
  const hiddenByViewer = new Set(viewerAccess.hidden_sections || []);

  const visibleSections = allTargetSections
    .filter(sectionKey => {
      // Check viewer overrides
      const override = viewerAccess.section_overrides?.[sectionKey];
      if (override?.visible === true) return true;
      if (override?.visible === false) return false;
      // Default: show if not in viewer's hidden list
      return !hiddenByViewer.has(sectionKey);
    })
    .map(sectionKey => {
      const sectionDef = MASTER_PROFILE_SECTION_POOL[sectionKey];
      if (!sectionDef) return null;

      // For academic_placement, filter fields by org type
      let fields = sectionDef.fields;
      if (sectionKey === "academic_placement" && targetConfig.academic_placement_fields) {
        const relevantKeys = targetConfig.academic_placement_fields[baseOrgType] || [];
        fields = sectionDef.fields.filter(f => relevantKeys.includes(f.key));
      }

      // Filter out fields with null labels (not applicable for this org)
      fields = fields.filter(f => {
        const resolvedLabel = labels[f.key];
        return resolvedLabel !== null; // null = not applicable
      });

      // Apply label overrides
      fields = fields.map(f => ({
        ...f,
        label: labels[f.key] !== undefined ? labels[f.key] : f.label,
      }));

      // Hide sensitive fields if viewer doesn't have access
      const sectionOverride = viewerAccess.section_overrides?.[sectionKey];
      const showSensitive = sectionOverride?.show_sensitive ?? viewerAccess.show_sensitive;

      if (!showSensitive) {
        fields = fields.filter(f => !f.sensitive);
      }

      return {
        key: sectionKey,
        label: sectionDef.label,
        icon: sectionDef.icon,
        sub_tabs: sectionDef.sub_tabs || null,
        fields,
      };
    })
    .filter(Boolean)
    .filter(s => s.fields.length > 0); // Remove empty sections

  return {
    context: "full",
    targetRole,
    viewerRole,
    orgType: baseOrgType,
    structureType: structureType || baseOrgType,
    isSelfView,
    labels,
    sections: visibleSections,
    permissions: {
      can_edit: viewerAccess.can_edit,
      show_settings: viewerAccess.show_settings,
      access_level: viewerAccess.access_level,
    },
  };
}

/**
 * Resolve a structure_type to its base org type.
 * @param {string} orgType
 * @param {string} structureType
 */
function resolveBaseOrgType(orgType, structureType) {
  if (orgType) return orgType;

  const structureMap = {
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
    custom: "other",
  };

  return structureMap[structureType] || "other";
}

/**
 * Check if a field should be shown for a given org type.
 * Returns false if the org label map marks it as null (not applicable).
 * @param {string} fieldKey
 * @param {string} orgType
 */
export function isFieldApplicable(fieldKey, orgType) {
  const labels = ORG_TYPE_LABEL_MAP[orgType] || ORG_TYPE_LABEL_MAP.other;
  return labels[fieldKey] !== null;
}

/**
 * Convenience: Get the human-readable role badge text for display.
 * @param {string} role
 */
export function getRoleBadgeText(role) {
  const ROLE_BADGE_MAP = {
    student: "Student",
    teacher: "Teacher",
    faculty: "Faculty",
    org_admin: "Organization Admin",
    super_admin: "Platform Support",
    hod: "Head of Department",
    principal: "Principal",
    vice_principal: "Vice Principal",
    exam_controller: "Exam Controller",
    fee_manager: "Fee Manager",
    admission_head: "Admission Head",
    admission_verifier: "Admission Verifier",
    admission_counselor: "Admission Counselor",
    admission_clerk: "Admission Clerk",
    library_manager: "Librarian",
    tpo_officer: "TPO Officer",
    transport_manager: "Transport Manager",
    counselor: "Counselor",
    coordinator: "Coordinator",
  };
  return ROLE_BADGE_MAP[role] || role?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "User";
}


// ═══════════════════════════════════════════════════════════════
// 7. NAMED EXPORTS
// ═══════════════════════════════════════════════════════════════

export {
  MASTER_PROFILE_SECTION_POOL,
  ORG_TYPE_LABEL_MAP,
  ROLE_PROFILE_CONFIGS,
  VIEWER_ACCESS_MATRIX,
  CHAT_PROFILE_SECTIONS,
};

export default {
  getMasterProfileSectionPool,
  getProfileSection,
  getOrgTypeLabelMap,
  resolveFieldLabel,
  getRoleProfileConfig,
  getViewerAccess,
  getChatProfileConfig,
  getResolvedProfileStrategy,
  isFieldApplicable,
  getRoleBadgeText,
};
