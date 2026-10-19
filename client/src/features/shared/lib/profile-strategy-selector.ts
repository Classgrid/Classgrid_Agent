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

import { ERP_OPTIONS } from "./erp-options";
import {
  ERPSTUDENTADMISSIONMAINCATEGORYLIST,
  NATIONALITYLIST,
  ERPAREATYPELIST,
  BIRTHSTATELIST,
  BIRTHCOUNTRYLIST,
  ERPDOMACILELIST,
  ERPMARITALSTATUSLIST,
  ERPSCHOLARSHIPTYPELIST,
  BLOODGROUPLIST,
  ERPSUBCASTLIST,
  MINORITYTYPELIST,
  ERPRELIGIONLIST,
  ERPCASTLIST,
  GENDERLIST,
  RELATIONTYPELIST,
  BIRTHDISTRICTLIST,
  MOTHERTOUNGELIST,
  ERPUNIVERSITYLIST,
  INDIA_STATES,
  INDIA_DISTRICTS,
  INDIA_TALUKAS,
  EXSERVICEMANLIST,
  CREAMYLAYERLIST,
  PHYSICALLYHANDICAPPEDLIST,
  ISBELONGSTOMINORITYLIST,
  GOVERNMENTSCHEMELIST
} from "./erp-large-options";

export const UG_DEGREE_OPTIONS = [
  "B.A. (Bachelor of Arts)", "B.Sc. (Bachelor of Science)", "B.Com. (Bachelor of Commerce)",
  "B.E. (Bachelor of Engineering)", "B.Tech. (Bachelor of Technology)", "B.C.A. (Bachelor of Computer Applications)",
  "B.B.A. (Bachelor of Business Administration)", "B.C.S. (Bachelor of Computer Science)", "B.Sc. (IT)",
  "B.Lib.Sc. (Bachelor of Library Science)", "B.P.Ed. (Bachelor of Physical Education)",
  "B.F.A. (Bachelor of Fine Arts)", "B.Arch. (Bachelor of Architecture)", "B.Pharm. (Bachelor of Pharmacy)",
  "LL.B. (Bachelor of Laws)", "Other"
];

export const UG_SPECIALIZATION_MAP: Record<string, string[]> = {
  "B.A. (Bachelor of Arts)": ["English", "History", "Political Science", "Economics", "Psychology", "Sociology", "Geography", "Hindi / Marathi / Regional Language"],
  "B.Sc. (Bachelor of Science)": ["Physics", "Chemistry", "Mathematics", "Biology / Zoology / Botany", "Computer Science", "Electronics", "Statistics"],
  "B.Com. (Bachelor of Commerce)": ["Accounting & Finance", "Banking & Insurance", "Business Administration", "Economics"],
  "B.E. (Bachelor of Engineering)": ["Computer Engineering", "Information Technology", "Mechanical Engineering", "Civil Engineering", "Electrical Engineering", "Electronics & Telecommunication"],
  "B.Tech. (Bachelor of Technology)": ["Computer Engineering", "Information Technology", "Mechanical Engineering", "Civil Engineering", "Electrical Engineering", "Electronics & Telecommunication"],
};

export const PG_DEGREE_OPTIONS = [
  "M.A. (Master of Arts)", "M.Sc. (Master of Science)", "M.Com. (Master of Commerce)",
  "M.E. (Master of Engineering)", "M.Tech. (Master of Technology)", "M.C.A. (Master of Computer Applications)",
  "M.B.A. (Master of Business Administration)", "M.Ed. (Master of Education)", "M.Lib.Sc. (Master of Library Science)",
  "M.P.Ed. (Master of Physical Education)", "M.Phil. (Master of Philosophy)", "LL.M. (Master of Laws)", "Other"
];

export const PG_SPECIALIZATION_MAP: Record<string, string[]> = {
  "M.A. (Master of Arts)": ["English", "History", "Political Science", "Economics", "Psychology", "Sociology"],
  "M.Sc. (Master of Science)": ["Physics", "Chemistry", "Mathematics", "Biology / Zoology / Botany", "Computer Science", "Electronics"],
  "M.Com. (Master of Commerce)": ["Accounting & Finance", "Business Administration"],
  "M.Tech. (Master of Technology)": ["Computer Engineering", "Mechanical", "Civil", "Electrical", "Electronics & Telecom"],
  "M.E. (Master of Engineering)": ["Computer Engineering", "Mechanical", "Civil", "Electrical", "Electronics & Telecom"]
};

export const PHD_SPECIALIZATION_OPTIONS = [
  "Physics", "Chemistry", "Mathematics", "Computer Science", "English", "Commerce", "Education", "Engineering", "Other"
];

export const SEED_UNIVERSITIES = [
  "Savitribai Phule Pune University (SPPU)",
  "University of Mumbai",
  "Shivaji University, Kolhapur",
  "SNDT Women's University",
  "Dr. Babasaheb Ambedkar Marathwada University",
  "Rashtrasant Tukadoji Maharaj Nagpur University",
  "North Maharashtra University",
  "Symbiosis International University",
  "Amity University",
  "Other"
];

export const MASTER_PROFILE_SECTION_POOL = {

  organization_details: {
    key: "organization_details",
    label: "Organization Details",
    icon: "Building2",
    fields: [
      { key: "organization.legal_name", label: "Organization Legal Name", type: "text", required: true },
      { key: "organization.type", label: "Organization Type", type: "dropdown", options: ["School", "Coaching Institute", "Junior College", "Engineering College", "Diploma College"], required: true },
      { key: "organization.short_name", label: "Organization Short Name / Slug", type: "text", required: true },
      { key: "organization.affiliation_number", label: "Registration / Affiliation Number", type: "text" },
      { key: "organization.board", label: "Board / Affiliation", type: "dropdown", options: ["CBSE", "ICSE", "State Board", "IB", "IGCSE", "University", "None"] },
      { key: "organization.logo", label: "Organization Logo", type: "image" },
      { key: "organization.address", label: "Organization Address", type: "text", required: true },
      { key: "organization.state", label: "State", type: "dropdown", options: INDIA_STATES, required: true },
      { key: "organization.district", label: "District / City", type: "dropdown", options: INDIA_DISTRICTS, required: true },
      { key: "organization.pin_code", label: "PIN Code", type: "text", required: true },
      { key: "organization.website", label: "Website", type: "text" },
      { key: "organization.timezone", label: "Time Zone", type: "dropdown", options: ["Asia/Kolkata (IST)"], required: true },
      { key: "organization.academic_session", label: "Current Academic Session", type: "text", required: true },
    ],
  },

  staff_common_details: {
    key: "staff_common_details",
    label: "Overview",
    icon: "User",
    fields: [
      { key: "employee_id", label: "Employee ID", type: "text" },
      { key: "email", label: "Official Email", type: "text" },
      { key: "role", label: "Role", type: "text" },
      { key: "designation", label: "Designation", type: "text" },
      { key: "department", label: "Department", type: "text" },
      { key: "organization", label: "Organization / College", type: "text" },
      { key: "campus_branch", label: "Campus / Branch", type: "text" },
      { key: "employment_status", label: "Employment Status", type: "dropdown", options: ["Active", "Inactive", "Suspended"] },
      { key: "joining_date", label: "Joining Date", type: "date" },
      { key: "reporting_to", label: "Reporting To", type: "text" },
      { key: "work_location", label: "Work Location", type: "text" },
      { key: "bio", label: "Bio / About", type: "text" },
    ],
  },
  professional_details: {
    key: "professional_details",
    label: "Professional Details",
    icon: "Briefcase",
    fields: [
      { key: "highest_qualification", label: "Highest Qualification", type: "text" },
      { key: "specialization", label: "Specialization", type: "text" },
      { key: "total_work_experience", label: "Total Work Experience (Years)", type: "number" },
      { key: "teaching_experience", label: "Teaching Experience (Years)", type: "number" },
      { key: "industry_experience", label: "Industry Experience (Years)", type: "number" },
      { key: "previous_organization", label: "Previous Organization", type: "text" },
      { key: "certifications", label: "Certifications", type: "text" },
      { key: "languages_known", label: "Languages Known", type: "text" },
      { key: "technical_skills", label: "Technical Skills", type: "text" },
      { key: "coding_languages_known", label: "Coding Languages Known", type: "text" },
      { key: "tools_known", label: "Tools Known", type: "text" },
      { key: "linkedin_portfolio", label: "LinkedIn / Portfolio", type: "text" },
      { key: "achievements", label: "Achievements", type: "text" },
    ],
  },
  faculty_specific_details: {
    key: "faculty_specific_details",
    label: "Academic Details",
    icon: "GraduationCap",
    fields: [
      { key: "subjects_handled", label: "Subjects Handled", type: "text" },
      { key: "classes_assigned", label: "Classes Assigned", type: "text" },
      { key: "batches_assigned", label: "Batches Assigned", type: "text" },
      { key: "class_teacher_of", label: "Class Teacher Of", type: "text" },
      { key: "weekly_lecture_load", label: "Weekly Lecture Load", type: "text" },
      { key: "research_areas", label: "Research Areas", type: "text" },
      { key: "publications_count", label: "Publications Count", type: "number" },
      { key: "student_mentorship_count", label: "Student Mentorship Count", type: "number" },
      { key: "lab_incharge", label: "Lab Incharge", type: "text" },
      { key: "committee_roles", label: "Committee Roles", type: "text" },
    ],
  },
  org_admin_details: {
    key: "org_admin_details",
    label: "Admin Access",
    icon: "ShieldCheck",
    fields: [
      { key: "admin_level", label: "Admin Level", type: "dropdown", options: ["Principal", "HOD", "Department Head"] },
      { key: "departments_managed", label: "Departments Managed", type: "text" },
      { key: "approval_authority", label: "Approval Authority", type: "text" },
      { key: "can_approve_staff_leave", label: "Can Approve Staff Leave", type: "boolean" },
      { key: "can_approve_student_requests", label: "Can Approve Student Requests", type: "boolean" },
      { key: "can_manage_users", label: "Can Manage Users", type: "boolean" },
      { key: "can_manage_departments", label: "Can Manage Departments", type: "boolean" },
      { key: "can_view_reports", label: "Can View Reports", type: "boolean" },
      { key: "data_access_scope", label: "Data Access Scope", type: "dropdown", options: ["Own Department", "Full College"] },
      { key: "signature_authority", label: "Signature Authority", type: "text" },
      { key: "escalation_contact", label: "Escalation Contact", type: "text" },
      { key: "meeting_review_role", label: "Meeting / Review Role", type: "text" },
    ],
  },
  dept_admin_common_details: {
    key: "dept_admin_common_details",
    label: "Department Admin",
    icon: "Activity",
    fields: [
      { key: "dept_admin_type", label: "Department Admin Type", type: "dropdown", options: ["Fees", "Payroll", "Admission", "Library", "Exam", "Canteen", "Hostel", "Transport"] },
      { key: "assigned_module", label: "Assigned Module", type: "text" },
      { key: "office_location", label: "Office Location", type: "text" },
      { key: "service_hours", label: "Service Hours", type: "text" },
      { key: "process_owner", label: "Process Owner", type: "text" },
      { key: "approval_level", label: "Approval Level", type: "dropdown", options: ["Level 1", "Level 2", "Final"] },
      { key: "escalation_manager", label: "Escalation Manager", type: "text" },
      { key: "assigned_academic_year", label: "Assigned Academic Year", type: "text" },
      { key: "assigned_courses", label: "Assigned Courses", type: "text" },
      { key: "assigned_departments", label: "Assigned Departments", type: "text" },
      { key: "can_export_reports", label: "Can Export Reports", type: "boolean" },
      { key: "can_edit_records", label: "Can Edit Records", type: "boolean" },
      { key: "can_delete_records", label: "Can Delete Records", type: "boolean" },
      { key: "can_approve_requests", label: "Can Approve Requests", type: "boolean" },
    ],
  },
  fees_admin_details: {
    key: "fees_admin_details",
    label: "Fees Access",
    icon: "Wallet",
    fields: [
      { key: "fee_categories_handled", label: "Fee Categories Handled", type: "text" },
      { key: "receipt_access", label: "Receipt Access", type: "boolean" },
      { key: "payment_verification_access", label: "Payment Verification Access", type: "dropdown", options: ["UPI", "Cash", "Bank", "All"] },
      { key: "concession_approval_limit", label: "Concession Approval Limit", type: "text" },
      { key: "refund_processing_access", label: "Refund Processing Access", type: "boolean" },
      { key: "pending_fee_report_access", label: "Pending Fee Report Access", type: "boolean" },
      { key: "scholarship_fee_handling", label: "Scholarship Fee Handling", type: "boolean" },
      { key: "installment_permission_access", label: "Installment Permission Access", type: "boolean" },
    ],
  },
  payroll_admin_details: {
    key: "payroll_admin_details",
    label: "Payroll Access",
    icon: "Users",
    fields: [
      { key: "employee_types_managed", label: "Employee Types Managed", type: "dropdown", options: ["Teaching", "Non-teaching", "Both"] },
      { key: "salary_processing_role", label: "Salary Processing Role", type: "dropdown", options: ["Maker", "Checker", "Approver"] },
      { key: "payroll_month_access", label: "Payroll Month Access", type: "dropdown", options: ["Current month", "All months"] },
      { key: "leave_approval_access", label: "Leave Approval Access", type: "boolean" },
      { key: "attendance_correction_access", label: "Attendance Correction Access", type: "boolean" },
      { key: "pf_esic_handling", label: "PF / ESIC Handling", type: "boolean" },
      { key: "salary_slip_access", label: "Salary Slip Access", type: "dropdown", options: ["Generate", "View", "Both"] },
      { key: "staff_document_verification", label: "Staff Document Verification", type: "boolean" },
    ],
  },
  admission_admin_details: {
    key: "admission_admin_details",
    label: "Admission Access",
    icon: "Users",
    fields: [
      { key: "admission_year_assigned", label: "Admission Year Assigned", type: "text" },
      { key: "programs_handled", label: "Programs Handled", type: "text" },
      { key: "admission_stage", label: "Admission Stage", type: "dropdown", options: ["Enquiry", "Verification", "Final"] },
      { key: "document_verification_access", label: "Document Verification Access", type: "boolean" },
      { key: "seat_quota_access", label: "Seat Quota Access", type: "dropdown", options: ["Open", "OBC", "SC", "ST", "All"] },
      { key: "merit_list_access", label: "Merit List Access", type: "dropdown", options: ["View", "Edit", "Both"] },
      { key: "admission_approval_level", label: "Admission Approval Level", type: "dropdown", options: ["Level 1", "Final"] },
      { key: "student_onboarding_access", label: "Student Onboarding Access", type: "boolean" },
    ],
  },

  personal_details: {
    key: "personal_details",
    label: "Basic Profile",
    icon: "User",
    fields: [
      { key: "identity.first_name", label: "First Name", type: "text", required: true },
      { key: "identity.middle_name", label: "Middle Name", type: "text" },
      { key: "identity.last_name", label: "Last Name", type: "text", required: true },
      { key: "identity.date_of_birth", label: "Date of Birth", type: "date", required: true, sensitive: true },
      { key: "identity.gender", label: "Gender", type: "dropdown", options: GENDERLIST, required: true, sensitive: true },
      { key: "identity.gender_other", label: "Other Gender", type: "text", sensitive: true, dependsOn: { field: "identity.gender", value: "Other" } },
      { key: "identity.blood_group", label: "Blood Group", type: "dropdown", options: BLOODGROUPLIST, sensitive: true },
      { key: "identity.nationality", label: "Nationality", type: "dropdown", options: NATIONALITYLIST, required: true },
      { key: "identity.other_nationality", label: "Other Nationality", type: "text", dependsOn: { field: "identity.nationality", value: "Other" } },
      { key: "identity.mother_tongue", label: "Mother Tongue", type: "dropdown", options: MOTHERTOUNGELIST },
      { key: "identity.other_mother_tongue", label: "Other Mother Tongue", type: "text", dependsOn: { field: "identity.mother_tongue", value: "Other" } },
      { key: "identity.government_id_type", label: "Government ID Type", type: "dropdown", options: ["Aadhaar", "PAN", "Passport", "Voter ID", "Other Government ID"], sensitive: true },
      { key: "identity.government_id_number", label: "Government ID Number", type: "text", sensitive: true },
      { key: "identity.birth_country", label: "Birth Country", type: "dropdown", options: BIRTHCOUNTRYLIST, sensitive: true },
      { key: "identity.birth_state", label: "Birth State / Province", type: "dropdown", options: INDIA_STATES, sensitive: true },
      { key: "identity.birth_district", label: "Birth District", type: "dropdown", options: INDIA_DISTRICTS, sensitive: true },
      { key: "identity.birth_taluka", label: "Birth Taluka", type: "dropdown", options: INDIA_TALUKAS, sensitive: true },
      { key: "identity.birth_place", label: "Birth Place (City/Village)", type: "text", sensitive: true },
    ],
  },
  contact_details: {
    key: "contact_details",
    label: "Contact Details",
    icon: "Phone",
    fields: [
      // Primary Contact
      { key: "contact.personal_email", label: "Primary Email", type: "text", required: true, sensitive: true },
      { key: "contact.alternate_email", label: "Alternate Email", type: "text", sensitive: true },
      { key: "contact.mobile_number", label: "Mobile Number", type: "text", required: true, sensitive: true },
      { key: "contact.whatsapp_number", label: "WhatsApp Number", type: "text", sensitive: true },
      { key: "contact.whatsapp_same_as_mobile", label: "Same as Mobile Number", type: "checkbox", sensitive: true },

      // Official Contact (staff only)
      { key: "contact.work_email", label: "Official Email", type: "text", sensitive: true },
      { key: "contact.official_phone", label: "Official Phone", type: "text", sensitive: true },
      { key: "contact.office_extension", label: "Office Extension", type: "text", sensitive: true },

      // Permanent Address
      { key: "contact.permanent_country", label: "Permanent Country", type: "dropdown", options: BIRTHCOUNTRYLIST, required: true, sensitive: true },
      { key: "contact.permanent_state", label: "Permanent State / Province", type: "dropdown", options: INDIA_STATES, required: true, sensitive: true },
      { key: "contact.permanent_district", label: "Permanent District", type: "dropdown", options: INDIA_DISTRICTS, sensitive: true },
      { key: "contact.permanent_taluka", label: "Permanent Taluka", type: "dropdown", options: INDIA_TALUKAS, sensitive: true },
      { key: "contact.permanent_city", label: "Permanent City / Village", type: "text", required: true, sensitive: true },
      { key: "contact.permanent_address", label: "Permanent Address", type: "text", required: true, sensitive: true },
      { key: "contact.permanent_pincode", label: "Permanent Pincode", type: "text", required: true, sensitive: true },
      
      { key: "contact.same_as_permanent_address", label: "Same as Permanent Address", type: "checkbox", sensitive: true },

      // Current Address
      { key: "contact.current_country", label: "Current Country", type: "dropdown", options: BIRTHCOUNTRYLIST, required: true, sensitive: true },
      { key: "contact.current_state", label: "Current State / Province", type: "dropdown", options: INDIA_STATES, required: true, sensitive: true },
      { key: "contact.current_district", label: "Current District", type: "dropdown", options: INDIA_DISTRICTS, sensitive: true },
      { key: "contact.current_taluka", label: "Current Taluka", type: "dropdown", options: INDIA_TALUKAS, sensitive: true },
      { key: "contact.current_city", label: "Current City / Village", type: "text", required: true, sensitive: true },
      { key: "contact.current_address", label: "Current Address", type: "text", required: true, sensitive: true },
      { key: "contact.current_pincode", label: "Current Pincode", type: "text", required: true, sensitive: true },
      
      // Emergency Contact
      { key: "contact.use_parent_guardian_as_emergency", label: "Use Parent / Guardian as Emergency Contact", type: "checkbox", sensitive: true },
      { key: "contact.emergency_contact_name", label: "Emergency Contact Name", type: "text", required: true, sensitive: true },
      { key: "contact.emergency_contact_mobile", label: "Emergency Contact Mobile", type: "text", required: true, sensitive: true },
      { key: "contact.emergency_contact_relation", label: "Emergency Contact Relation", type: "dropdown", options: RELATIONTYPELIST, required: true, sensitive: true },
      { key: "contact.emergency_contact_other_relation", label: "Other Relation", type: "text", sensitive: true },
    ],
  },
  family_details: {
    key: "family_details",
    label: "Family Details",
    icon: "Users",
    fields: [
      { key: "family.father_name", label: "Father's Name", type: "text", required: true, sensitive: true },
      { key: "family.father_occupation", label: "Father's Occupation", type: "text", sensitive: true },
      { key: "family.father_mobile", label: "Father's Mobile", type: "text", sensitive: true },
      { key: "family.father_email", label: "Father's Email", type: "text", sensitive: true },
      
      { key: "family.mother_name", label: "Mother's Name", type: "text", required: true, sensitive: true },
      { key: "family.mother_occupation", label: "Mother's Occupation", type: "text", sensitive: true },
      { key: "family.mother_mobile", label: "Mother's Mobile", type: "text", sensitive: true },
      { key: "family.mother_email", label: "Mother's Email", type: "text", sensitive: true },
      
      { key: "family.has_local_guardian", label: "Do you have a local guardian?", type: "dropdown", options: ["Yes", "No"], sensitive: true },
      { key: "family.local_guardian_name", label: "Local Guardian Name", type: "text", sensitive: true },
      { key: "family.local_guardian_mobile", label: "Local Guardian Mobile", type: "text", sensitive: true },
      { key: "family.local_guardian_address", label: "Local Guardian Address", type: "text", sensitive: true },
    ],
  },
  category_minority: {
    key: "category_minority",
    label: "Category & Disability",
    icon: "ShieldCheck",
    fields: [
      { key: "religion", label: "Religion", type: "dropdown", options: ERPRELIGIONLIST, sensitive: true },
      { key: "category", label: "Category", type: "dropdown", options: ERPSTUDENTADMISSIONMAINCATEGORYLIST, sensitive: true },
      { key: "caste", label: "Caste", type: "dropdown", options: ERPCASTLIST, sensitive: true },
      { key: "sub_caste", label: "Sub Caste", type: "dropdown", options: ERPSUBCASTLIST, sensitive: true },
      { key: "creamy_layer", label: "Creamy Layer", type: "dropdown", options: CREAMYLAYERLIST, sensitive: true },
      
      { key: "belongs_to_minority", label: "Belongs to Minority", type: "dropdown", options: ISBELONGSTOMINORITYLIST, sensitive: true },
      { key: "minority_type", label: "Minority Type", type: "dropdown", options: MINORITYTYPELIST, sensitive: true },
      
      { key: "physically_handicapped", label: "Physically Handicapped", type: "dropdown", options: PHYSICALLYHANDICAPPEDLIST, sensitive: true },
      { key: "ph_type", label: "PH Type", type: "text", sensitive: true },
      { key: "ph_percentage", label: "PH Percentage", type: "number", sensitive: true },
    ]
  },
  international_student: {
    key: "international_student",
    label: "International Details",
    icon: "Globe",
    fields: [
      { key: "is_international", label: "Is International Student?", type: "boolean" },
      { key: "passport_number", label: "Passport Number", type: "text", sensitive: true },
      { key: "passport_valid_upto", label: "Passport Valid Upto", type: "date", sensitive: true },
      { key: "visa_number", label: "Visa Number", type: "text", sensitive: true },
      { key: "residential_permit_no", label: "Residential Permit Number", type: "text", sensitive: true },
      { key: "permit_issue_date", label: "Permit Issue Date", type: "date", sensitive: true },
      { key: "permit_issue_upto_date", label: "Permit Valid Upto", type: "date", sensitive: true },
    ]
  },
  academic_placement: {
    key: "academic_placement",
    label: "Admission & Academic",
    icon: "School",
    fields: [
      { key: "admission_type", label: "Admission Type", type: "dropdown", options: ["CAP", "Management", "Direct", "Lateral"] },
      { key: "admission_main_category", label: "Admission Category", type: "dropdown", options: ERPSTUDENTADMISSIONMAINCATEGORYLIST, required: true, sensitive: true },
      { key: "seat_type", label: "Seat Type", type: "dropdown", options: ["CAP", "INSTITUTIONAL", "MANAGEMENT", "SPOT"], sensitive: true },
      { key: "cap_round", label: "CAP Round", type: "text", sensitive: true },
      { key: "lateral_entry", label: "Lateral Entry", type: "boolean" },
      
      { key: "prn", label: "PRN / University Registration Number", type: "text", required: true, sensitive: true },
      { key: "degree", label: "Degree Program", type: "dropdown", options: ["B.Tech", "M.Tech", "MBA", "B.E", "B.Sc", "Ph.D"], required: true },
      { key: "branch", label: "Branch", type: "dropdown", options: ["Computer Science", "Mechanical", "Civil", "Electrical", "Electronics", "IT"], required: true },
      { key: "department", label: "Department", type: "text" },
      { key: "batch", label: "Batch (e.g. 2023-2027)", type: "text", required: true },
    ],
  },

  education_details: {
    key: "education_details",
    label: "Education Details",
    icon: "GraduationCap",
    fields: [
      { key: "10th_board", label: "10th Board", type: "text" },
      { key: "10th_percentage", label: "10th Percentage", type: "number" },
      { key: "12th_board", label: "12th Board", type: "text" },
      { key: "12th_percentage", label: "12th Percentage", type: "number" },
      { key: "pcm_percentage", label: "PCM Percentage", type: "number" },
      { key: "diploma_percentage", label: "Diploma Percentage", type: "number" },
      { key: "previous_school", label: "Previous School/College", type: "text" },
      { key: "previous_percentage", label: "Previous Percentage", type: "number" },
      { key: "en_number", label: "EN Number", type: "text" },
      { key: "cet_score", label: "CET Score", type: "number" },
      { key: "jee_score", label: "JEE Score", type: "number" },
      { key: "entrance_score", label: "Entrance Score (Custom)", type: "number" },
      { key: "eligibilityNo", label: "Eligibility Number", type: "text" },
      { key: "abc_id", label: "ABC ID", type: "text" },
      { key: "university_prn_number", label: "University PRN", type: "text" },
    ],
  },
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
      { key: "bed_degree", label: "B.Ed Degree", type: "dropdown", options: ["B.Ed Completed", "B.Ed Pursuing", "B.Ed Not Applicable"] },
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
      { key: "bed_degree", label: "B.Ed Degree", type: "dropdown", options: ["B.Ed Completed", "B.Ed Pursuing", "B.Ed Not Applicable"] },
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
      { key: "bank_account_number", label: "Account Number", type: "text", sensitive: true },
      { key: "bank_ifsc_code", label: "IFSC Code", type: "text" },
      { key: "bank_name", label: "Bank Name", type: "text" },
      { key: "bank_branch", label: "Branch Name", type: "text" },
      { key: "bank_micr_code", label: "MICR Code", type: "text" },
    ],
  },
  upload_documents: {
    key: "upload_documents",
    label: "Upload Documents",
    icon: "FileUp",
    fields: [
      { key: "doc_10th", label: "10th Marksheet", type: "file_list" },
      { key: "doc_12th", label: "12th Marksheet / Diploma", type: "file_list" },
      { key: "doc_aadhar", label: "Aadhar Card", type: "file_list" },
      { key: "doc_pan", label: "PAN Card", type: "file_list" },
      { key: "doc_lc", label: "Leaving Certificate (LC)", type: "file_list" },
      { key: "doc_caste", label: "Caste Certificate (If Applicable)", type: "file_list" },
      { key: "doc_validity", label: "Caste Validity (If Applicable)", type: "file_list" },
      { key: "doc_income", label: "Income Certificate", type: "file_list" },
      { key: "doc_domicile", label: "Domicile Certificate", type: "file_list" },
    ],
  },
  experience_details: {
    key: "experience_details",
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
  awards_participation: {
    key: "awards_participation",
    label: "Award / Participation Details",
    icon: "Trophy",
    fields: [
      { key: "awards", label: "Awards & Achievements", type: "text" },
      { key: "participation", label: "Participation Details", type: "text" },
      { key: "sports", label: "Sports", type: "text" },
      { key: "cultural_activities", label: "Cultural Activities", type: "text" },
    ],
  },
  student_activity: {
    key: "student_activity",
    label: "Student Activity",
    icon: "Activity",
    fields: [
      { key: "clubs_joined", label: "Clubs Joined", type: "text" },
      { key: "committees", label: "Committee Membership", type: "text" },
      { key: "nss_ncc", label: "NSS / NCC", type: "text" },
      { key: "internships", label: "Internships", type: "text" },
      { key: "projects", label: "Projects", type: "text" },
    ],
  },
  social_details: {
    key: "social_details",
    label: "Social Details",
    icon: "Globe",
    fields: [
      { key: "bio", label: "Bio", type: "text" },
      { key: "hobby", label: "Hobbies", type: "text" },
      { key: "linkedin_url", label: "LinkedIn", type: "url" },
      { key: "github_url", label: "GitHub", type: "url" },
        { key: "twitter_url", label: "Twitter / X", type: "url" },
        { key: "coding_profile", label: "Coding Profile (LeetCode/HackerRank)", type: "url" },
        { key: "tech_stack", label: "Your Tech Stack", type: "text" },
      { key: "instagram_url", label: "Instagram", type: "url" },
      { key: "portfolio_url", label: "Portfolio", type: "url" },
      { key: "facebook_url", label: "Facebook", type: "url" },
    ],
  },
  id_card_photos: {
    key: "id_card_photos",
    label: "ID-Card Photo & Sign Upload",
    icon: "CreditCard",
    fields: [
      { key: "profilePicture", label: "Profile Photo", type: "image" },
      { key: "profileBanner", label: "Profile Banner", type: "image" },
      { key: "signature", label: "Signature", type: "image" },
    ],
  },
  medical_details: {
    key: "medical_details",
    label: "Medical Details",
    icon: "HeartPulse",
    fields: [
      { key: "medical_conditions", label: "Medical Conditions", type: "text" },
      { key: "allergies", label: "Allergies", type: "text" },
      { key: "disability_type", label: "Disability Type", type: "text" },
      { key: "medical_insurance", label: "Medical Insurance No.", type: "text" },
    ],
  },
  skills_interest: {
    key: "skills_interest",
    label: "Person Skill & Interest",
    icon: "Sparkles",
    fields: [
      { key: "skills", label: "Skills", type: "text" },
      { key: "interests", label: "Interests", type: "text" },
      { key: "languages_known", label: "Languages Known", type: "text" },
      { key: "career_goal", label: "Career Goal", type: "text" },
    ],
  },
  anti_ragging: {
    key: "anti_ragging",
    label: "Anti-Ragging Details",
    icon: "ShieldCheck",
    fields: [
      { key: "anti_ragging_undertaking_no", label: "Anti-Ragging Undertaking No *", type: "text" },
      { key: "anti_ragging_date", label: "Undertaking Date", type: "date" },
    ],
  },
  role_assignment: {
    key: "role_assignment",
    label: "Role Assignment",
    icon: "Briefcase",
    fields: [
      { key: "identity.department", label: "Department", type: "dropdown", required: true },
      { key: "identity.designation", label: "Designation", type: "dropdown", required: true },
      { key: "identity.employee_id", label: "Employee ID", type: "text", required: true },
    ]
  },
  qualification_and_experience: {
    key: "qualification_and_experience",
    label: "Qualification & Experience",
    icon: "GraduationCap",
    fields: [
      { key: "identity.qualification", label: "Qualification", type: "dropdown", options: ["10th / SSC", "12th / HSC", "Certificate", "ITI", "Diploma", "D.Ed", "D.El.Ed", "B.Ed", "M.Ed", "B.P.Ed", "Bachelor of Arts", "Master of Arts", "Bachelor of Commerce", "Master of Commerce", "BBA", "MBA", "BCA", "MCA", "Bachelor of Science", "Master of Science", "BE", "B.Tech", "ME", "M.Tech", "B.Arch", "M.Arch", "B.Lib", "M.Lib", "LLB", "LLM", "CA", "CMA", "CS", "PhD", "Other"], required: true },
      { key: "identity.specialization", label: "Specialization", type: "dropdown", options: ["Administration", "Academic Administration", "Human Resources", "Finance", "Accounting", "Commerce", "Computer Science", "Information Technology", "Artificial Intelligence", "Data Science", "Mechanical Engineering", "Civil Engineering", "Electrical Engineering", "Electronics Engineering", "Mathematics", "Physics", "Chemistry", "Biology", "English", "Marathi", "Hindi", "Library Science", "Physical Education", "Psychology", "Counseling", "Other"] },
      { key: "experience.experience_years", label: "Experience", type: "dropdown", options: ["Fresher", "Less than 1 Year", "1–2 Years", "2–3 Years", "3–5 Years", "5–7 Years", "7–10 Years", "10–15 Years", "15–20 Years", "More than 20 Years"] },
      { key: "experience.experience_details", label: "Experience Details", type: "text" },
    ]
  },
  employment_details: {
    key: "employment_details",
    label: "Employment Details",
    icon: "Briefcase",
    fields: [
      { key: "identity.recruitment_type", label: "Employment Type", type: "dropdown", options: ["Permanent", "Probation", "Full-Time", "Part-Time", "Contract", "Temporary", "Visiting", "Guest", "Consultant", "Intern", "Volunteer", "Other"], required: true },
      { key: "identity.date_of_joining", label: "Date of Joining", type: "date", required: true },
      { key: "identity.reporting_to", label: "Reporting To", type: "dropdown" },
      { key: "experience.responsibilities", label: "Responsibilities", type: "dropdown" },
      { key: "experience.work_shift", label: "Work Shift", type: "dropdown", options: ["General Shift", "Morning Shift", "Afternoon Shift", "Evening Shift", "Night Shift", "Rotational Shift", "Flexible", "Not Applicable"] },
      { key: "identity.employment_status", label: "Employment Status", type: "dropdown", options: ["Active", "Onboarding", "On Leave", "Suspended", "Notice Period", "Inactive", "Resigned", "Retired", "Contract Completed"], required: true },
      
      { key: "identity.academic_departments_handled", label: "Academic Departments Handled", type: "text" },
      { key: "experience.subjects_taught", label: "Subjects Taught", type: "text" },
      { key: "experience.classes_taught", label: "Classes Taught", type: "text" },
      { key: "experience.grade_handled", label: "Grade Handled", type: "text" },
      { key: "experience.is_hod", label: "Is HOD?", type: "boolean" },
      { key: "experience.is_class_teacher", label: "Is Class Teacher?", type: "boolean" },
      
      { key: "identity.supervisory_roles", label: "Supervisory Roles", type: "text" },
      
      { key: "experience.contract_start_date", label: "Contract Start Date", type: "date" },
      { key: "experience.contract_end_date", label: "Contract End Date", type: "date" },
    ]
  },
  
  school_education: {
    key: "school_education",
    label: "Previous Education Details",
    icon: "GraduationCap",
    fields: [
      { key: "education.previous_school", label: "Previous School Name", type: "text", sensitive: true },
      { key: "education.previous_percentage", label: "Previous Percentage / Grade", type: "text", sensitive: true },
      { key: "education.udise_number", label: "UDISE / PEN Number", type: "text", sensitive: true },
      { key: "admission_details.admission_date", label: "Admission Date", type: "date", sensitive: true }
    ]
  },
  coaching_education: {
    key: "coaching_education",
    label: "Academic & Target Details",
    icon: "Target",
    fields: [
      { key: "education.target_exam", label: "Target Exam (e.g., JEE/NEET)", type: "text", sensitive: true },
      { key: "education.current_school", label: "Current School / College", type: "text", sensitive: true },
      { key: "education.previous_percentage", label: "Previous Exam Percentage", type: "text", sensitive: true },
      { key: "admission_details.admission_date", label: "Admission Date", type: "date", sensitive: true }
    ]
  },
  junior_college_education: {
    key: "junior_college_education",
    label: "Previous Education & Admission",
    icon: "GraduationCap",
    fields: [
      { key: "education.tenth_board", label: "10th Board", type: "text", sensitive: true },
      { key: "education.tenth_percentage", label: "10th Percentage", type: "number", sensitive: true },
      { key: "education.previous_school", label: "Previous School Name", type: "text", sensitive: true },
      { key: "education.chosen_stream", label: "Chosen Stream (Science/Commerce/Arts)", type: "text", sensitive: true },
      { key: "admission_details.admission_main_category", label: "Admission Category", type: "dropdown", options: ERPSTUDENTADMISSIONMAINCATEGORYLIST, sensitive: true },
      { key: "admission_details.admission_date", label: "Admission Date", type: "date", sensitive: true }
    ]
  },

  engineering_education: {
    key: "engineering_education",
    label: "Engineering Education & Admission",
    icon: "GraduationCap",
    fields: [
      { key: "education.tenth_board", label: "10th Board", type: "text", sensitive: true },
      { key: "education.tenth_percentage", label: "10th Percentage", type: "number", sensitive: true },
      { key: "education.twelfth_board", label: "12th Board", type: "text", sensitive: true },
      { key: "education.twelfth_percentage", label: "12th Percentage", type: "number", sensitive: true },
      { key: "education.pcm_percentage", label: "PCM Percentage", type: "number", sensitive: true },
      { key: "education.diploma_percentage", label: "Diploma Percentage", type: "number", sensitive: true },
      { key: "education.en_number", label: "EN Number", type: "text", sensitive: true },
      { key: "education.cet_score", label: "CET Score", type: "number", sensitive: true },
      { key: "education.jee_score", label: "JEE Score", type: "number", sensitive: true },
      { key: "education.university_prn_number", label: "University PRN Number", type: "text", sensitive: true },
      { key: "education.undergraduate_degree", label: "Undergraduate Degree", type: "dropdown", options: UG_DEGREE_OPTIONS },
      { key: "education.undergraduate_specialization", label: "Undergraduate Specialization", type: "dropdown" },
      { key: "admission_details.admission_main_category", label: "Admission Category", type: "dropdown", options: ERPSTUDENTADMISSIONMAINCATEGORYLIST, sensitive: true },
      { key: "admission_details.seat_type", label: "Seat Type", type: "text", sensitive: true },
      { key: "admission_details.lateral_entry", label: "Lateral Entry?", type: "boolean", sensitive: true },
      { key: "admission_details.admission_date", label: "Admission Date", type: "date", sensitive: true }
    ]
  },
  medical_and_disability: {
    key: "medical_and_disability",
    label: "Medical & Disability Details",
    icon: "HeartPulse",
    fields: [
      { key: "handicap_details.physically_handicapped", label: "Physically Handicapped?", type: "boolean", sensitive: true },
      { key: "handicap_details.ph_type", label: "PH Type", type: "text", sensitive: true },
      { key: "handicap_details.ph_percentage", label: "PH Percentage", type: "number", sensitive: true },
      { key: "medical.medical_conditions", label: "Medical Conditions", type: "text", sensitive: true },
      { key: "medical.allergies", label: "Allergies", type: "text", sensitive: true },
      { key: "medical.prescription_details", label: "Prescription Details", type: "text", sensitive: true }
    ]
  },
  passport_and_visa: {
    key: "passport_and_visa",
    label: "Passport & Visa Details",
    icon: "Plane",
    fields: [
      { key: "passport_details.passport_number", label: "Passport Number", type: "text", sensitive: true },
      { key: "passport_details.passport_valid_upto", label: "Passport Valid Upto", type: "date", sensitive: true },
      { key: "passport_details.visa_number", label: "Visa Number", type: "text", sensitive: true }
    ]
  },
  skills_and_projects: {
    key: "skills_and_projects",
    label: "Skills, Projects & Professional",
    icon: "Lightbulb",
    fields: [
      { key: "skills_interests.skills", label: "Skills", type: "text" },
      { key: "skills_interests.interests", label: "Interests", type: "text" },
      { key: "skills_interests.languages_known", label: "Languages Known", type: "text" },
      { key: "skills_interests.career_goal", label: "Career Goal", type: "text" },
      { key: "skills_interests.technical_skills", label: "Technical Skills", type: "text" },
      { key: "activity.internships", label: "Internships", type: "text" },
      { key: "activity.projects", label: "Projects", type: "text" },
      { key: "social.linkedin_url", label: "LinkedIn URL", type: "text" },
      { key: "social.github_url", label: "GitHub URL", type: "text" }
    ]
  },

  platform_metadata: {
    key: "platform_metadata",
    label: "Platform Info",
    icon: "Clock",
    fields: [
      { key: "lastLoginAt", label: "Last Seen", type: "datetime" },
      { key: "createdAt", label: "Member Since", type: "date" },
      { key: "status", label: "Account Status", type: "text" },
      { key: "verification_status", label: "Verification Status", type: "text" },
      { key: "organization_name", label: "Organization", type: "text" },
    ],
  },
  hr_payroll: {
    key: "hr_payroll",
    label: "HR & Payroll",
    icon: "Wallet",
    fields: [
      { key: "payroll_salary_mode", label: "Salary Mode", type: "dropdown", options: ["hourly", "monthly", "none"], sensitive: true },
      { key: "payroll_hourly_rate", label: "Hourly Rate", type: "number", sensitive: true },
      { key: "payroll_base_salary", label: "Base Monthly Salary", type: "number", sensitive: true },
      
    ],
  },
};

export const ORG_TYPE_LABEL_MAP = {
  engineering: {
    prn: "PRN", branch: "Branch", batch: "Batch (e.g. 2023-2027)", department: "Department",
    division: "Division", semester: "Semester", year: "Year", degree: "Degree Program",
    standard: null, stream: null, course: null,
  },
  school: {
    prn: "Roll Number", branch: null, batch: "Academic Year", department: null,
    division: "Division", semester: null, year: null, degree: null,
    standard: "Class / Standard", stream: null, course: null,
  },
  junior_college: {
    prn: "Roll Number", branch: null, batch: "Academic Year", department: null,
    division: "Division", semester: null, year: null, degree: null,
    standard: "Class (11th / 12th)", stream: "Stream", course: null,
  },
  coaching: {
    prn: "Student ID", branch: null, batch: "Batch", department: null,
    division: null, semester: null, year: null, degree: null,
    standard: null, stream: null, course: "Course / Program",
  },
  diploma: {
    prn: "PRN / Enrollment No.", branch: "Branch", batch: "Batch", department: "Department",
    division: "Division", semester: "Semester", year: "Year", degree: null,
    standard: null, stream: null, course: null,
  },
  other: {
    prn: "ID Number", branch: "Branch", batch: "Batch", department: "Department",
    division: "Division", semester: "Semester", year: "Year", degree: "Degree",
    standard: "Level", stream: "Stream", course: "Course",
  },
};

export const ROLE_PROFILE_CONFIGS = {
  student: {
    sections: ["personal_details", "contact_details", "family_details", "org_specific_education", "medical_and_disability", "upload_documents", "anti_ragging"],
    academic_placement_fields: null, 
  },
  faculty: {
    sections: ["personal_details", "contact_details", "role_assignment", "qualification_and_experience", "employment_details", "bank_details", "faculty_documents", "awards_participation", "social_details", "id_card_photos", "medical_details", "platform_metadata"],
    academic_placement_fields: null,
  },
  org_admin: {
    sections: [],
    academic_placement_fields: null,
  },
  department_admin: {
    sections: ["personal_details", "contact_details", "role_assignment", "qualification_and_experience", "employment_details", "bank_details", "staff_documents", "social_details", "id_card_photos", "medical_details", "platform_metadata"],
    academic_placement_fields: null,
  },
  fee_manager: {
    sections: ["personal_details", "contact_details", "role_assignment", "qualification_and_experience", "employment_details", "bank_details", "staff_documents", "social_details", "id_card_photos", "medical_details", "platform_metadata"],
    academic_placement_fields: null,
  },
  hr_dept: {
    sections: ["personal_details", "contact_details", "role_assignment", "qualification_and_experience", "employment_details", "bank_details", "staff_documents", "social_details", "id_card_photos", "medical_details", "platform_metadata"],
    academic_placement_fields: null,
  },
  admission_head: {
    sections: ["personal_details", "contact_details", "role_assignment", "qualification_and_experience", "employment_details", "bank_details", "staff_documents", "social_details", "id_card_photos", "medical_details", "platform_metadata"],
    academic_placement_fields: null,
  },
  admission_verifier: {
    sections: ["personal_details", "contact_details", "role_assignment", "qualification_and_experience", "employment_details", "bank_details", "staff_documents", "social_details", "id_card_photos", "medical_details", "platform_metadata"],
    academic_placement_fields: null,
  },
  admission_counselor: {
    sections: ["personal_details", "contact_details", "role_assignment", "qualification_and_experience", "employment_details", "bank_details", "staff_documents", "social_details", "id_card_photos", "medical_details", "platform_metadata"],
    academic_placement_fields: null,
  },
  admission_clerk: {
    sections: ["personal_details", "contact_details", "role_assignment", "qualification_and_experience", "employment_details", "bank_details", "staff_documents", "social_details", "id_card_photos", "medical_details", "platform_metadata"],
    academic_placement_fields: null,
  },
  hod: {
    sections: ["personal_details", "contact_details", "role_assignment", "qualification_and_experience", "employment_details", "bank_details", "admin_documents", "social_details", "id_card_photos", "medical_details", "platform_metadata"],
    academic_placement_fields: null,
  },
  principal: {
    sections: [],
    academic_placement_fields: null,
  },
  vice_principal: {
    sections: [],
    academic_placement_fields: null,
  },
  super_admin: {
    sections: ["personal_details", "contact_details", "role_assignment", "qualification_and_experience", "employment_details", "social_details", "platform_metadata"],
    academic_placement_fields: null,
  },
  exam_controller: {
    sections: ["personal_details", "contact_details", "role_assignment", "qualification_and_experience", "employment_details", "bank_details", "staff_documents", "social_details", "id_card_photos", "medical_details", "platform_metadata"],
    academic_placement_fields: null,
  },
  library_manager: {
    sections: ["personal_details", "contact_details", "role_assignment", "qualification_and_experience", "employment_details", "bank_details", "staff_documents", "social_details", "id_card_photos", "medical_details", "platform_metadata"],
    academic_placement_fields: null,
  },
  library_admin: {
    sections: ["personal_details", "contact_details", "role_assignment", "qualification_and_experience", "employment_details", "bank_details", "staff_documents", "social_details", "id_card_photos", "medical_details", "platform_metadata"],
    academic_placement_fields: null,
  },
  attendance_admin: {
    sections: ["personal_details", "contact_details", "role_assignment", "qualification_and_experience", "employment_details", "bank_details", "staff_documents", "social_details", "id_card_photos", "medical_details", "platform_metadata"],
    academic_placement_fields: null,
  },
  hostel_dept: {
    sections: ["personal_details", "contact_details", "family_details", "staff_education_details", "bank_details", "staff_documents", "staff_experience_details", "social_details", "id_card_photos", "medical_details", "staff_common_details", "professional_details", "dept_admin_common_details", "platform_metadata"],
    academic_placement_fields: null,
  },
  transport_manager: {
    sections: ["personal_details", "contact_details", "family_details", "staff_education_details", "bank_details", "transport_documents", "staff_experience_details", "social_details", "id_card_photos", "medical_details", "staff_common_details", "professional_details", "dept_admin_common_details", "platform_metadata"],
    academic_placement_fields: null,
  },
  tpo_officer: {
    sections: ["personal_details", "contact_details", "family_details", "staff_education_details", "bank_details", "staff_documents", "staff_experience_details", "social_details", "id_card_photos", "medical_details", "staff_common_details", "professional_details", "dept_admin_common_details", "platform_metadata"],
    academic_placement_fields: null,
  },
  counselor: {
    sections: ["personal_details", "contact_details", "family_details", "staff_education_details", "bank_details", "staff_documents", "staff_experience_details", "social_details", "id_card_photos", "medical_details", "staff_common_details", "professional_details", "dept_admin_common_details", "platform_metadata"],
    academic_placement_fields: null,
  },
  coordinator: {
    sections: ["personal_details", "contact_details", "family_details", "admin_education_details", "bank_details", "admin_documents", "admin_experience_details", "social_details", "id_card_photos", "medical_details", "staff_common_details", "professional_details", "dept_admin_common_details", "platform_metadata"],
    academic_placement_fields: null,
  },
};

export const VIEWER_ACCESS_MATRIX = {
  self: {
    access_level: "full", can_edit: true, hidden_sections: [], show_sensitive: true, show_settings: true,
  },
  super_admin: {
    access_level: "full", can_edit: false, hidden_sections: [], show_sensitive: true, show_settings: false,
  },
  org_admin: {
    access_level: "full", can_edit: false, hidden_sections: [], show_sensitive: true, show_settings: false,
  },
  department_admin: {
    access_level: "full", can_edit: false, hidden_sections: ["hr_payroll"], show_sensitive: true, show_settings: false,
  },
  principal: {
    access_level: "full", can_edit: false, hidden_sections: ["hr_payroll"], show_sensitive: true, show_settings: false,
  },
  vice_principal: {
    access_level: "full", can_edit: false, hidden_sections: ["hr_payroll"], show_sensitive: true, show_settings: false,
  },
  hod: {
    access_level: "professional", can_edit: false, hidden_sections: ["bank_details", "hr_payroll"], show_sensitive: false, show_settings: false,
  },
  admission_head: {
    access_level: "professional", can_edit: false, hidden_sections: ["bank_details", "hr_payroll", "medical_details"], show_sensitive: false, show_settings: false,
  },
  fee_manager: {
    access_level: "professional", can_edit: false, hidden_sections: ["hr_payroll", "medical_details"], show_sensitive: false, show_settings: false,
    section_overrides: { bank_details: { visible: true, show_sensitive: true } },
  },
  exam_controller: {
    access_level: "professional", can_edit: false, hidden_sections: ["bank_details", "hr_payroll", "family_details", "medical_details"], show_sensitive: false, show_settings: false,
  },
  library_manager: {
    access_level: "public", can_edit: false, hidden_sections: ["bank_details", "hr_payroll", "family_details", "medical_details", "education_details"], show_sensitive: false, show_settings: false,
  },
  library_admin: {
    access_level: "public", can_edit: false, hidden_sections: ["bank_details", "hr_payroll", "family_details", "medical_details", "education_details"], show_sensitive: false, show_settings: false,
  },
  attendance_admin: {
    access_level: "professional", can_edit: false, hidden_sections: ["bank_details", "hr_payroll", "family_details", "medical_details"], show_sensitive: false, show_settings: false,
  },
  hr_dept: {
    access_level: "full", can_edit: false, hidden_sections: [], show_sensitive: true, show_settings: false,
    section_overrides: { hr_payroll: { visible: true, show_sensitive: true } },
  },
  hostel_dept: {
    access_level: "professional", can_edit: false, hidden_sections: ["bank_details", "hr_payroll"], show_sensitive: false, show_settings: false,
  },
  transport_manager: {
    access_level: "professional", can_edit: false, hidden_sections: ["bank_details", "hr_payroll"], show_sensitive: false, show_settings: false,
  },
  faculty: {
    access_level: "professional", can_edit: false, hidden_sections: ["bank_details", "hr_payroll"], show_sensitive: false, show_settings: false,
  },
  student: {
    access_level: "public", can_edit: false,
    hidden_sections: ["bank_details", "hr_payroll", "family_details", "medical_details", "upload_documents", "anti_ragging"],
    show_sensitive: false, show_settings: false,
  },
};

export const ORG_DEPARTMENTS_CONFIG: Record<string, string[]> = {
  school: ["Administration", "Academics (Primary)", "Academics (Secondary)", "Admissions", "Fees & Accounts", "Examination", "Library", "HR & Payroll", "Hostel", "Transport", "Sports", "Arts & Culture"],
  junior_college: ["Administration", "Science Stream", "Commerce Stream", "Arts Stream", "Admissions", "Fees & Accounts", "Examination", "Library", "HR & Payroll", "Hostel", "Transport"],
  engineering: ["Administration", "Computer Science / IT", "Mechanical Engineering", "Civil Engineering", "Electrical Engineering", "Electronics & Communication", "Applied Sciences (First Year)", "Training & Placement", "Admissions", "Fees & Accounts", "Examination", "Library", "HR & Payroll", "Hostel", "Transport"],
  diploma: ["Administration", "Computer Science / IT", "Mechanical Engineering", "Civil Engineering", "Electrical Engineering", "Electronics & Communication", "Applied Sciences (First Year)", "Training & Placement", "Admissions", "Fees & Accounts", "Examination", "Library", "HR & Payroll", "Hostel", "Transport"],
  coaching: ["Administration", "JEE/NEET Faculty", "Foundation Batch Faculty", "Admissions", "Fees & Accounts", "HR & Payroll"],
  other: ["Administration", "Academics", "Admissions", "Fees & Accounts", "Examination", "Library", "HR & Payroll"]
};

export const DASHBOARD_DESIGNATIONS_CONFIG: Record<string, string[]> = {
  org_admin: ["Organization Admin", "Principal", "Vice Principal", "Head of Department (HOD)", "Academic Coordinator", "Training & Placement Officer"],
  admissions: ["Admissions Department Head", "Admission Verifier", "Admission Counselor", "Admission Clerk"],
  fees: ["Fees & Accounts Manager"],
  examination: ["Examination Controller"],
  library: ["Library Manager", "Library Admin"],
  attendance: ["Attendance Admin"],
  hr_payroll: ["HR & Payroll Manager"],
  hostel_transport: ["Hostel Manager", "Transport Manager"],
  faculty: ["Teacher", "Lecturer", "Faculty", "Mentor", "Student Counselor"],
  student: ["Student"]
};

export const ORG_TYPE_DESIGNATION_OVERRIDES: Record<string, Record<string, string[]>> = {
  school: { faculty: ["Teacher", "Student Counselor"] },
  junior_college: {
    org_admin: ["Organization Admin", "Principal", "Vice Principal", "Head of Department (HOD)", "Academic Coordinator"],
    faculty: ["Lecturer", "Student Counselor"]
  },
  engineering: { faculty: ["Faculty", "Student Counselor"] },
  diploma: { faculty: ["Faculty", "Student Counselor"] },
  coaching: {
    org_admin: ["Organization Admin", "Head of Department (HOD)", "Academic Coordinator"],
    faculty: ["Mentor", "Student Counselor"]
  }
};

export function getDashboardGroupForRole(role: string): string {
  if (["org_admin", "principal", "vice_principal", "hod", "tpo_officer", "coordinator"].includes(role)) return "org_admin";
  if (["admission_head", "admission_verifier", "admission_counselor", "admission_clerk"].includes(role)) return "admissions";
  if (["fee_manager"].includes(role)) return "fees";
  if (["exam_controller"].includes(role)) return "examination";
  if (["library_manager", "library_admin"].includes(role)) return "library";
  if (["attendance_admin"].includes(role)) return "attendance";
  if (["hr_dept"].includes(role)) return "hr_payroll";
  if (["hostel_dept", "transport_manager"].includes(role)) return "hostel_transport";
  if (["faculty", "teacher"].includes(role)) return "faculty";
  return "student";
}

export function getResolvedProfileStrategy({
  targetRole,
  viewerRole,
  orgType,
  structureType,
  isSelfView = false,
  context = "full",
}: {
  targetRole: string;
  viewerRole: string;
  orgType: string;
  structureType: string;
  isSelfView?: boolean;
  context?: "full" | "chat";
}) {
  const resolveBaseOrgType = (o: string, s: string) => {
    if (o) return o;
    const structureMap: Record<string, string> = {
      engineering: "engineering", engineering_with_div: "engineering", engineering_no_div: "engineering",
      school_with_div: "school", school_no_div: "school", coaching: "coaching",
      junior_college: "junior_college", junior_college_with_div: "junior_college", junior_college_no_div: "junior_college",
      diploma: "diploma", diploma_with_div: "diploma", diploma_no_div: "diploma", custom: "other",
    };
    return structureMap[s] || "other";
  };

  const baseOrgType = resolveBaseOrgType(orgType, structureType);
  const labels = ORG_TYPE_LABEL_MAP[baseOrgType as keyof typeof ORG_TYPE_LABEL_MAP] || ORG_TYPE_LABEL_MAP.other;
  const targetConfig = ROLE_PROFILE_CONFIGS[targetRole as keyof typeof ROLE_PROFILE_CONFIGS] || ROLE_PROFILE_CONFIGS.student;
  const viewerAccess = isSelfView ? VIEWER_ACCESS_MATRIX.self : (VIEWER_ACCESS_MATRIX[viewerRole as keyof typeof VIEWER_ACCESS_MATRIX] || VIEWER_ACCESS_MATRIX.student);

  const hiddenByViewer = new Set(viewerAccess.hidden_sections || []);
  const visibleSections = targetConfig.sections
    .filter(sectionKey => !hiddenByViewer.has(sectionKey))
    .map(sectionKey => {
      let resolvedSectionKey = sectionKey;
      if (sectionKey === "org_specific_education") {
        if (baseOrgType === "engineering" || baseOrgType === "diploma") resolvedSectionKey = "engineering_education";
        else if (baseOrgType === "school") resolvedSectionKey = "school_education";
        else if (baseOrgType === "coaching") resolvedSectionKey = "coaching_education";
        else if (baseOrgType === "junior_college") resolvedSectionKey = "junior_college_education";
        else resolvedSectionKey = "education_details";
      }

      const sectionDef = MASTER_PROFILE_SECTION_POOL[resolvedSectionKey as keyof typeof MASTER_PROFILE_SECTION_POOL];
      if (!sectionDef) return null;

      let fields = sectionDef.fields;
      if (sectionKey === "academic_placement" && targetConfig.academic_placement_fields) {
        const relevantKeys = targetConfig.academic_placement_fields[baseOrgType as keyof typeof targetConfig.academic_placement_fields] || [];
        fields = sectionDef.fields.filter(f => relevantKeys.includes(f.key));
      }

      fields = fields.filter(f => {
        const resolvedLabel = labels[f.key as keyof typeof labels];
        return resolvedLabel !== null;
      }).map(f => {
        const fieldClone = { ...f, label: labels[f.key as keyof typeof labels] !== undefined ? labels[f.key as keyof typeof labels] : f.label };
        
        if (fieldClone.key === "department") {
          fieldClone.type = "dropdown";
          fieldClone.options = ORG_DEPARTMENTS_CONFIG[baseOrgType] || ORG_DEPARTMENTS_CONFIG.other;
        }
        
        if (fieldClone.key === "designation") {
          fieldClone.type = "dropdown";
          const dashboardGroup = getDashboardGroupForRole(targetRole);
          const defaultDesignations = DASHBOARD_DESIGNATIONS_CONFIG[dashboardGroup] || [];
          const overrides = ORG_TYPE_DESIGNATION_OVERRIDES[baseOrgType]?.[dashboardGroup];
          fieldClone.options = overrides || defaultDesignations;
        }

        return fieldClone;
      });

      if (!viewerAccess.show_sensitive) {
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
    .filter(Boolean);

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
