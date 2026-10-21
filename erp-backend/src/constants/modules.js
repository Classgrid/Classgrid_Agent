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

export const PLATFORM_MODULES = [
  {
    category: "Academic",
    items: [
      { id: "attendance_system", label: "Attendance System", defaultEnabled: true },
      { id: "digital_classroom_management", label: "Digital Classroom Management", defaultEnabled: true },
      { id: "automated_timetable", label: "Automated Timetable", defaultEnabled: true },
      { id: "academic_planning_tools", label: "Academic Planning Tools", defaultEnabled: false },
      { id: "homework_assignment", label: "Homework (Assignment)", defaultEnabled: true },
      { id: "student_notes_sharing", label: "Student Notes Sharing", defaultEnabled: false },
      { id: "teacher_planner", label: "Teacher Planner", defaultEnabled: false },
      { id: "subject_management", label: "Subject Management", defaultEnabled: true },
      { id: "course_management", label: "Course Management", defaultEnabled: true }
    ]
  },
  {
    category: "Assessment",
    items: [
      { id: "online_exam_platform", label: "Online Exam Platform", defaultEnabled: false },
      { id: "examination_management", label: "Examination Management", defaultEnabled: true },
      { id: "interactive_quiz_systems", label: "Interactive Quiz Systems", defaultEnabled: false },
      { id: "grade_entry_results", label: "Grade Entry & Results", defaultEnabled: true },
      { id: "internal_assessment_tools", label: "Internal Assessment Tools", defaultEnabled: true },
      { id: "competitive_exam_conduction", label: "CET/JEE/NEET Exam Conduction", defaultEnabled: false },
      { id: "past_paper_mock_tests", label: "Past Paper & Mock Tests", defaultEnabled: false },
      { id: "ai_powered_viva", label: "AI-Powered Viva", defaultEnabled: false },
      { id: "test_series_management", label: "Test Series Management", defaultEnabled: false }
    ]
  },
  {
    category: "Management",
    items: [
      { id: "admission_management", label: "Admission Management", defaultEnabled: true },
      { id: "fee_collection_system", label: "Fee Collection System", defaultEnabled: true },
      { id: "staff_leave_payroll", label: "Staff Leave & Payroll", defaultEnabled: true },
      { id: "canteen_management", label: "Canteen Management", defaultEnabled: false },
      { id: "digital_library_management", label: "Digital Library Management", defaultEnabled: false },
      { id: "alumni_network", label: "Alumni Network", defaultEnabled: false }
    ]
  },
  {
    category: "Advanced",
    items: [
      { id: "ai_assistant", label: "AI Assistant", defaultEnabled: false },
      { id: "advanced_analytics", label: "Advanced Analytics", defaultEnabled: false },
      { id: "compliance_audit_trails", label: "Compliance Audit Trails", defaultEnabled: false },
      { id: "institution_website", label: "Institution Website", defaultEnabled: false },
      { id: "digital_certificates", label: "Digital Certificates", defaultEnabled: false },
      { id: "holiday_management", label: "Holiday Management", defaultEnabled: false },
      { id: "digital_id_cards", label: "Digital ID Cards", defaultEnabled: false },
      { id: "events_management", label: "Events Management", defaultEnabled: false },
      { id: "feedback_system", label: "Feedback System", defaultEnabled: false }
    ]
  }
];
