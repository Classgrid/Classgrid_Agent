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

import mongoose from "mongoose";

// Profile details schema handling the 100+ fields from the 17 stepper sections
const userProfileSchema = new mongoose.Schema(
  {
    organization_id: {









        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true
    },
    user: {









      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // One profile per user
    },
    organization: {









      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    // ── Section 1: Personal Details ──────────────────────────────
    identity: {









      first_name: { type: String, default: "" },
      middle_name: { type: String, default: "" },
      last_name: { type: String, default: "" },
      date_of_birth: { type: Date, default: null },
      gender: { type: String, default: "" },
      gender_other: { type: String, default: "" },
      blood_group: { type: String, default: "" },
      nationality: { type: String, default: "Indian" },
      other_nationality: { type: String, default: "" },
      mother_tongue: { type: String, default: "" },
      other_mother_tongue: { type: String, default: "" },
      government_id_type: { type: String, default: "" },
      government_id_number: { type: String, default: "" },
      birth_country: { type: String, default: "" },
      birth_state: { type: String, default: "" },
      birth_place: { type: String, default: "" },
      profile_photo_url: { type: String, default: "" },
      
      organization_type: { type: String, default: "" },
      role_category: { type: String, default: "" },
      academic_departments_handled: { type: String, default: "" },
      
      domicile: { type: String, default: "" },
      marital_status: { type: String, default: "Single" },
      aadhar_number: { type: String, default: "" },
      pan_number: { type: String, default: "" },
      native_place: { type: String, default: "" },
      student_id: { type: String, default: "" },
      employee_id: { type: String, default: "" },
      qualification: { type: String, default: "" },
      specialization: { type: String, default: "" },
      teacher_training_certificate: { type: String, default: "" },
      tet_qualified: { type: Boolean, default: false },
      tet_score: { type: Number, default: 0 },
      recruitment_type: { type: String, default: "" },
      date_of_joining: { type: Date, default: null },
      educational_qualifications: { type: String, default: "" },
      professional_memberships: { type: String, default: "" },
      certifications: { type: String, default: "" },
      confirmation_status: { type: Boolean, default: false },
      department: { type: String, default: "" },
      designation: { type: String, default: "" },
      employee_category: { type: String, default: "" },
      date_of_retirement: { type: Date, default: null },
      pay_scale: { type: Number, default: 0 },
      reporting_to: { type: String, default: "" },
      supervisory_roles: { type: String, default: "" },
    },
    religion_details: {









      religion: { type: String, default: "" },
      caste: { type: String, default: "" },
      sub_caste: { type: String, default: "" },
      creamy_layer: { type: Boolean, default: false },
    },
    handicap_details: {









      physically_handicapped: { type: Boolean, default: false },
      ph_type: { type: String, default: "" },
      ph_percentage: { type: Number, default: 0 },
    },
    minority_details: {









      belongs_to_minority: { type: Boolean, default: false },
      minority_type: { type: String, default: "" },
    },
    passport_details: {









      passport_number: { type: String, default: "" },
      passport_valid_upto: { type: Date, default: null },
      visa_number: { type: String, default: "" },
    },
    admission_details: {









      admission_main_category: { type: String, default: "" },
      seat_type: { type: String, default: "" },
      cap_round: { type: String, default: "" },
      lateral_entry: { type: Boolean, default: false },
    },

    // ── Section 2: Contact Details ───────────────────────────────
    contact: {









      permanent_address: { type: String, default: "" },
      permanent_state: { type: String, default: "" },
      permanent_city: { type: String, default: "" },
      permanent_district: { type: String, default: "" },
      permanent_pincode: { type: String, default: "" },
      current_address: { type: String, default: "" },
      current_state: { type: String, default: "" },
      current_city: { type: String, default: "" },
      current_pincode: { type: String, default: "" },
      emergency_contact_name: { type: String, default: "" },
      emergency_contact_mobile: { type: String, default: "" },
      emergency_contact_relation: { type: String, default: "" },
      personal_email: { type: String, default: "" },
      work_email: { type: String, default: "" },
      alternate_phone: { type: String, default: "" },
      whatsapp_number: { type: String, default: "" },
      permanent_country: { type: Number, default: 0 },
      current_country: { type: Number, default: 0 },
      official_phone: { type: String, default: "" },
      office_extension: { type: String, default: "" },
      primary_contact_for: { type: String, default: "" },
    },

    // ── Section 3: Family Details ────────────────────────────────
    family: {
      father_name: { type: String, default: "" },
      father_occupation: { type: String, default: "" },
      father_income: { type: Number, default: 0 },
      father_mobile: { type: String, default: "" },
      father_email: { type: String, default: "" },
      father_education: { type: String, default: "" },
      
      mother_name: { type: String, default: "" },
      mother_occupation: { type: String, default: "" },
      mother_income: { type: Number, default: 0 },
      mother_mobile: { type: String, default: "" },
      mother_email: { type: String, default: "" },
      mother_education: { type: String, default: "" },
      
      has_local_guardian: { type: String, enum: ["Yes", "No", ""], default: "" },
      local_guardian_name: { type: String, default: "" },
      local_guardian_mobile: { type: String, default: "" },
      local_guardian_address: { type: String, default: "" },
      
      spouse_name: { type: String, default: "" },
      spouse_occupation: { type: String, default: "" },
      spouse_contact: { type: String, default: "" },
      number_of_children: { type: Number, default: 0 },
      undergraduate_degree: { type: String, default: "" },
      undergraduate_specialization: { type: String, default: "" },
      undergraduate_percentage: { type: Number, default: 0 },
      undergraduate_university: { type: String, default: "" },
      undergraduate_year: { type: Date, default: null },
      postgraduate_degree: { type: String, default: "" },
      postgraduate_specialization: { type: String, default: "" },
      postgraduate_percentage: { type: Number, default: 0 },
      postgraduate_university: { type: String, default: "" },
      postgraduate_year: { type: Date, default: null },
      b_ed_degree: { type: String, default: "" },
      b_ed_percentage: { type: Number, default: 0 },
      b_ed_university: { type: String, default: "" },
      b_ed_year: { type: Date, default: null },
      phd: { type: String, default: "" },
      phd_specialization: { type: String, default: "" },
      phd_university: { type: String, default: "" },
      phd_year: { type: Date, default: null },
      net_qualified: { type: Boolean, default: false },
      slet_qualified: { type: Boolean, default: false },
    },

    // ── Section 4: Education Details ─────────────────────────────
    education: {









      tenth_board: { type: String, default: "" }, // 10th
      tenth_percentage: { type: Number, default: 0 },
      twelfth_board: { type: String, default: "" }, // 12th
      twelfth_percentage: { type: Number, default: 0 },
      pcm_percentage: { type: Number, default: 0 },
      diploma_percentage: { type: Number, default: 0 },
      previous_school: { type: String, default: "" },
      previous_percentage: { type: Number, default: 0 },
      en_number: { type: String, default: "" },
      cet_score: { type: Number, default: 0 },
      jee_score: { type: Number, default: 0 },
      entrance_score: { type: Number, default: 0 },
      university_prn_number: { type: String, default: "" },
    },

    // ── Section 5: Bank Details ──────────────────────────────────
    bank: {









      bank_account_number: { type: String, default: "" },
      bank_ifsc_code: { type: String, default: "" },
      bank_name: { type: String, default: "" },
      bank_branch: { type: String, default: "" },
      bank_micr_code: { type: String, default: "" },
      account_holder_name: { type: Number, default: 0 },
      uan_number: { type: String, default: "" },
      pf_number: { type: String, default: "" },
      nominee_name: { type: String, default: "" },
      nominee_relation: { type: String, default: "" },
      financial_authorization: { type: String, default: "" },
    },

    // ── Section 6: Documents ─────────────────────────────────────
    documents: [{
      document_name: { type: String, required: true },
      document_type: { type: String, default: "" },
      document_number: { type: String, default: "" },
      issued_date: { type: Date, default: null },
      expiry_date: { type: Date, default: null },
      verified_status: { type: String, enum: ["Pending", "Verified", "Rejected"], default: "Pending" },
      verified_by: { type: String, default: "" },
      file_url: { type: String, required: true },
      uploaded_at: { type: Date, default: Date.now }
    }],

    // ── Section 7: Experience Details (Faculty) ──────────────────
    experience: {
      experience_years: { type: Number, default: 0 },
      experience_details: { type: String, default: "" },
      total_years_teaching: { type: Date, default: null },
      years_in_current_school: { type: Date, default: null },
      previous_schools: { type: String, default: "" },
      administrative_roles_held: { type: String, default: "" },
      board_experience: { type: String, default: "" },
      ncert_expert_panel: { type: String, default: "" },
      textbook_committee: { type: String, default: "" },
      subjects_taught: { type: String, default: "" },
      curriculum_development_experience: { type: String, default: "" },
      teacher_training_conducted: { type: String, default: "" },
      affiliation_experience: { type: String, default: "" },
      school_inspection_experience: { type: String, default: "" },
      responsibilities: { type: String, default: "" },
      work_shift: { type: String, default: "" },
      parent_teacher_meetings_conducted: { type: String, default: "" },
    },

    // ── Section 8: Awards / Participation ────────────────────────
    awards_participation: {









      awards: { type: String, default: "" },
      participation: { type: String, default: "" },
      sports: { type: String, default: "" },
      cultural_activities: { type: String, default: "" },
      best_teacher_award: { type: String, default: "" },
      national_seminar_attended: { type: String, default: "" },
      workshop_attended: { type: String, default: "" },
      publications: { type: String, default: "" },
      patents: { type: String, default: "" },
      best_principal_award: { type: String, default: "" },
      national_awards: { type: String, default: "" },
      state_awards: { type: String, default: "" },
      research_articles: { type: String, default: "" },
      workshop_conducted: { type: String, default: "" },
    },

    // ── Section 9: Student Activity ──────────────────────────────
    activity: {









      clubs_joined: { type: String, default: "" },
      committees: { type: String, default: "" },
      nss_ncc: { type: String, default: "" },
      internships: { type: String, default: "" },
      projects: { type: String, default: "" },
    },

    // ── Section 10: Social Details ───────────────────────────────
    social: {









      instagram_url: { type: String, default: "" },
      facebook_url: { type: String, default: "" },
      linkedin_url: { type: String, default: "" },
      github_url: { type: String, default: "" },
      portfolio_url: { type: String, default: "" },
      professional_blog: { type: String, default: "" },
      research_gate: { type: String, default: "" },
      google_scholar: { type: String, default: "" },
      orcid_id: { type: String, default: "" },
      educational_forum_memberships: { type: String, default: "" },
    },

    // ── Section 12: Medical Details ──────────────────────────────
    medical: {









      medical_conditions: { type: String, default: "" },
      allergies: { type: String, default: "" },
      disability_type: { type: String, default: "" },
      medical_insurance: { type: String, default: "" },
      blood_group: { type: String, default: "" },
      emergency_medical_contact: { type: String, default: "" },
      last_health_checkup_date: { type: Date, default: null },
    },

    // ── Section 13: Person Skill & Interest ──────────────────────
    skills_interests: {









      skills: { type: String, default: "" },
      interests: { type: String, default: "" },
      languages_known: { type: String, default: "" },
      career_goal: { type: String, default: "" },
      technical_skills: { type: String, default: "" },
      soft_skills: { type: String, default: "" },
      pedagogical_skills: { type: String, default: "" },
      classroom_management_skills: { type: String, default: "" },
      multi_lingual_skills: { type: String, default: "" },
      cpd_courses_completed: { type: String, default: "" },
      leadership_skills: { type: String, default: "" },
      financial_management_skills: { type: String, default: "" },
      hr_management_skills: { type: String, default: "" },
      communication_skills: { type: String, default: "" },
      negotiation_skills: { type: String, default: "" },
      technology_proficiency: { type: String, default: "" },
      data_analysis_skills: { type: Boolean, default: false },
      lms_proficiency: { type: String, default: "" },
    },

    // ── Section 14: Anti-Ragging Details ─────────────────────────
    anti_ragging: {









      anti_ragging_link: { type: String, default: "" },
      anti_ragging_date: { type: Date, default: null },
    },
    
  },
  { timestamps: true }
);

export default mongoose.models.UserProfile || mongoose.model("UserProfile", userProfileSchema);
