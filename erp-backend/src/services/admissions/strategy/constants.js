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

export const FIELD_KEYS = {
    FIRST_NAME: "first_name",
    MIDDLE_NAME: "middle_name",
    LAST_NAME: "last_name",
    FULL_NAME: "full_name",
    DOB: "dob",
    GENDER: "gender",
    BLOOD_GROUP: "blood_group",
    NATIONALITY: "nationality",
    DOMICILE: "domicile",
    MOBILE_NUMBER: "mobile_number",
    OFFICIAL_EMAIL: "official_email",
    PRIMARY_EMAIL: "primary_email",
    ALTERNATE_EMAIL: "alternate_email",
    FATHER_NAME: "father_name",
    FATHER_FIRST_NAME: "father_first_name",
    MOTHER_NAME: "mother_name",
    EARNING_PARENT_NAME: "earning_parent_name",
    EARNING_PARENT_RELATION: "earning_parent_relation",
    RELIGION: "religion",
    MOTHER_TONGUE: "mother_tongue",
    AREA_TYPE: "area_type",
    MARITAL_STATUS: "marital_status",
    ADMISSION_MAIN_CATEGORY: "admission_main_category",
    CASTE: "caste",
    SUB_CASTE: "sub_caste",
    PHYSICALLY_HANDICAPPED: "physically_handicapped",
    PH_TYPE: "ph_type",
    PH_PERCENTAGE: "ph_percentage",
    EX_SERVICEMAN: "ex_serviceman",
    BELONGS_TO_MINORITY: "belongs_to_minority",
    GOVERNMENT_SCHEME: "government_scheme",
    CREAMY_LAYER: "creamy_layer",
    BIRTH_PLACE: "birth_place",
    BIRTH_COUNTRY: "birth_country",
    BIRTH_STATE: "birth_state",
    BIRTH_DISTRICT: "birth_district",
    NATIVE_PLACE: "native_place",
    NATIVE_COUNTRY: "native_country",
    NATIVE_STATE: "native_state",
    NATIVE_DISTRICT: "native_district",
    NATIVE_AREA_TYPE: "native_area_type",
    PERMANENT_ADDRESS: "permanent_address",
    PERMANENT_COUNTRY: "permanent_country",
    PERMANENT_STATE: "permanent_state",
    PERMANENT_DISTRICT: "permanent_district",
    PERMANENT_CITY: "permanent_city",
    PERMANENT_TALUKA: "permanent_taluka",
    PERMANENT_PINCODE: "permanent_pincode",
    CURRENT_ADDRESS: "current_address",
    CURRENT_COUNTRY: "current_country",
    CURRENT_STATE: "current_state",
    CURRENT_DISTRICT: "current_district",
    CURRENT_CITY: "current_city",
    CURRENT_TALUKA: "current_taluka",
    CURRENT_PINCODE: "current_pincode",
    EMERGENCY_CONTACT_NAME: "emergency_contact_name",
    EMERGENCY_CONTACT_MOBILE: "emergency_contact_mobile",
    EMERGENCY_CONTACT_ADDRESS: "emergency_contact_address",
    EMERGENCY_CONTACT_PHONE: "emergency_contact_phone",
    EMERGENCY_CONTACT_CITY: "emergency_contact_city",
    EMERGENCY_CONTACT_AGE: "emergency_contact_age",
    EMERGENCY_CONTACT_REMARK: "emergency_contact_remark",
    LOCAL_GUARDIAN_NAME: "local_guardian_name",
    LOCAL_GUARDIAN_MOBILE: "local_guardian_mobile",
    LOCAL_GUARDIAN_ADDRESS: "local_guardian_address",
    LOCAL_GUARDIAN_PHONE: "local_guardian_phone",
    LOCAL_GUARDIAN_CITY: "local_guardian_city",
    LOCAL_GUARDIAN_REMARK: "local_guardian_remark",
    HOSTEL_NAME: "hostel_name",
    HOSTEL_ADDRESS: "hostel_address",
    FATHER_FULL_NAME: "father_full_name",
    FATHER_EDUCATION: "father_education",
    FATHER_OCCUPATION: "father_occupation",
    FATHER_INCOME: "father_income",
    FATHER_MOBILE: "father_mobile",
    FATHER_PHONE: "father_phone",
    FATHER_EMAIL: "father_email",
    FATHER_ORGANIZATION: "father_organization",
    FATHER_DEPARTMENT: "father_department",
    FATHER_DESIGNATION: "father_designation",
    FATHER_OFFICE_ADDRESS: "father_office_address",
    FATHER_RANK: "father_rank",
    MOTHER_FULL_NAME: "mother_full_name",
    MOTHER_EDUCATION: "mother_education",
    MOTHER_OCCUPATION: "mother_occupation",
    MOTHER_INCOME: "mother_income",
    MOTHER_MOBILE: "mother_mobile",
    MOTHER_PHONE: "mother_phone",
    MOTHER_EMAIL: "mother_email",
    MOTHER_ORGANIZATION: "mother_organization",
    MOTHER_DEPARTMENT: "mother_department",
    MOTHER_DESIGNATION: "mother_designation",
    MOTHER_OFFICE_ADDRESS: "mother_office_address",
    ELIGIBILITY_NUMBER: "eligibility_number",
    ABC_ID: "abc_id",
    UNIVERSITY_PRN_NUMBER: "university_prn_number",
    AADHAR_NUMBER: "aadhar_number",
    PAN_NUMBER: "pan_number",
    ANTI_RAGGING_NUMBER: "anti_ragging_number",
    ANTI_RAGGING_LINK: "anti_ragging_link",
    "10TH_BOARD": "10th_board",
    "10TH_PERCENTAGE": "10th_percentage",
    "12TH_BOARD": "12th_board",
    "12TH_PERCENTAGE": "12th_percentage",
    PCM_PERCENTAGE: "pcm_percentage",
    DIPLOMA_PERCENTAGE: "diploma_percentage",
    STREAM_APPLYING: "stream_applying",
    PREVIOUS_SCHOOL: "previous_school",
    PREVIOUS_PERCENTAGE: "previous_percentage",
    STANDARD_APPLYING: "standard_applying",
    COURSE_SELECTED: "course_selected",
    BATCH_PREFERRED: "batch_preferred",
    EN_NUMBER: "en_number",
    CET_SCORE: "cet_score",
    JEE_SCORE: "jee_score",
    SEAT_TYPE: "seat_type",
    BRANCH_ALLOTTED: "branch_allotted",
    CAP_ROUND: "cap_round",
    LATERAL_ENTRY: "lateral_entry",
    ENTRANCE_SCORE: "entrance_score",
    PASSPORT_NUMBER: "passport_number",
    PASSPORT_VALID_UPTO: "passport_valid_upto",
    VISA_NUMBER: "visa_number",
    FSIS_NUMBER: "fsis_number",
    PERMIT_VALID_UPTO: "permit_valid_upto",
    BANK_ACCOUNT_NUMBER: "bank_account_number",
    BANK_IFSC_CODE: "bank_ifsc_code",
    BANK_NAME: "bank_name",
    BANK_BRANCH: "bank_branch",
    BANK_MICR_CODE: "bank_micr_code",
    CAREER_CHOICE: "career_choice",
    ALUMNI_INSTITUTE: "alumni_institute",
    EXPERIENCE_DETAILS: "experience_details",
    AWARDS_PARTICIPATION: "awards_participation",
    SIBLING_IN_SCHOOL: "sibling_in_school",
    TRANSPORT_REQUIRED: "transport_required",
    REFERRAL_CODE: "referral_code",
    DISCOUNT_CODE: "discount_code",
    BIRTH_CERTIFICATE: "birth_certificate",
    STUDENT_AADHAR: "student_aadhar",
    PARENT_AADHAR: "parent_aadhar",
    PROOF_OF_RESIDENCE: "proof_of_residence",
    TRANSFER_CERTIFICATE: "transfer_certificate",
    PREVIOUS_ACADEMIC_RECORDS: "previous_academic_records",
    PASSPORT_SIZE_PHOTO: "passport_size_photo",
    SIGNATURE: "signature",
    MEDICAL_CERTIFICATE: "medical_certificate",
    CASTE_CERTIFICATE: "caste_certificate",
    INCOME_CERTIFICATE: "income_certificate",
    "10TH_MARKSHEET": "10th_marksheet",
    "12TH_MARKSHEET": "12th_marksheet",
    CET_JEE_SCORECARD: "cet_jee_scorecard",
    ALLOTMENT_LETTER: "allotment_letter",
    ELIGIBILITY_FORM: "eligibility_form",
    MIGRATION_CERTIFICATE: "migration_certificate",
    GAP_CERTIFICATE: "gap_certificate",
    DOMICILE_CERTIFICATE: "domicile_certificate",
    NATIONALITY_CERTIFICATE: "nationality_certificate",
    NON_CREAMY_LAYER_CERTIFICATE: "non_creamy_layer_certificate",
    EWS_CERTIFICATE: "ews_certificate",
    ANTI_RAGGING_AFFIDAVIT: "anti_ragging_affidavit",
    DIPLOMA_MARKSHEET: "diploma_marksheet",
    CHARACTER_CERTIFICATE: "character_certificate",
    CASTE_VALIDITY_CERTIFICATE: "caste_validity_certificate",
    PHYSICALLY_HANDICAPPED_CERTIFICATE: "physically_handicapped_certificate",
    FREEDOM_FIGHTER_CERTIFICATE: "freedom_fighter_certificate",
    DEFENCE_CERTIFICATE: "defence_certificate",
    RATION_CARD: "ration_card",
    HOSTEL_CERTIFICATE: "hostel_certificate",
    BANK_SEEDING_FORM: "bank_seeding_form",
    ATTENDANCE_CERTIFICATE: "attendance_certificate",
    DEATH_CERTIFICATE: "death_certificate",
    SMALL_LAND_HOLDER_CERTIFICATE: "small_land_holder_certificate",
    LABOUR_CERTIFICATE: "labour_certificate",
    SERVICE_CERTIFICATE: "service_certificate",
    FEE_RECEIPT: "fee_receipt",
    OTHER: "other",
};
