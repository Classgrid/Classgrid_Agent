// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
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
 * 2. "CLASSGRID ERP" is the actual PRODUCT NAME.
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
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import PlatformModule from "../src/models/PlatformModule.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, "../.env") });

const ALL_ORGS = ["school", "coaching", "junior_college", "college"];
const NO_SCHOOL = ["coaching", "junior_college", "college"];
const ONLY_SCHOOL_AND_JR = ["school", "junior_college"];
const ONLY_COLLEGE = ["college"]; // Engineering
const NO_COLLEGE = ["school", "coaching", "junior_college"];

const modulesData = [
  // ACADEMICS
  { key: "attendance_module", label: "Attendance System", category: "Academics", applicableOrgTypes: ALL_ORGS, defaultEnabled: true },
  { key: "classroom_module", label: "Digital Classroom Management", category: "Academics", applicableOrgTypes: ALL_ORGS, defaultEnabled: true },
  { key: "timetable_module", label: "Automated Timetable", category: "Academics", applicableOrgTypes: ALL_ORGS, defaultEnabled: true },
  { key: "academic_planner_module", label: "Academic Planning Tools", category: "Academics", applicableOrgTypes: ALL_ORGS, defaultEnabled: false },
  { key: "assignment_module", label: "Homework / Assignment", category: "Academics", applicableOrgTypes: ALL_ORGS, defaultEnabled: true },
  { key: "notes_sharing_module", label: "Student Notes Sharing", category: "Academics", applicableOrgTypes: ALL_ORGS, defaultEnabled: false },
  { key: "teacher_planner_module", label: "Teacher Planner", category: "Academics", applicableOrgTypes: ALL_ORGS, defaultEnabled: false },
  { key: "subject_management_module", label: "Subject Management", category: "Academics", applicableOrgTypes: NO_COLLEGE, defaultEnabled: true },
  { key: "course_management_module", label: "Course Management", category: "Academics", applicableOrgTypes: ONLY_COLLEGE, defaultEnabled: true },

  // ASSESSMENT
  { key: "online_exam_platform_module", label: "Online Exam Platform", category: "Assessment", applicableOrgTypes: NO_SCHOOL, defaultEnabled: false },
  { key: "exam_management_module", label: "Examination Management", category: "Assessment", applicableOrgTypes: NO_SCHOOL, defaultEnabled: true },
  { key: "quiz_module", label: "Interactive Quiz Systems", category: "Assessment", applicableOrgTypes: ALL_ORGS, defaultEnabled: false },
  { key: "grade_entry_module", label: "Grade Entry & Results", category: "Assessment", applicableOrgTypes: ALL_ORGS, defaultEnabled: true },
  { key: "internal_assessment_module", label: "Internal Assessment Tools", category: "Assessment", applicableOrgTypes: ALL_ORGS, defaultEnabled: true },
  { key: "cet_exam_module", label: "CET/JEE/NEET Exam Conduction", category: "Assessment", applicableOrgTypes: ONLY_SCHOOL_AND_JR, defaultEnabled: false },
  { key: "mock_tests_module", label: "Past Paper & Mock Tests", category: "Assessment", applicableOrgTypes: ONLY_SCHOOL_AND_JR, defaultEnabled: false },

  // MANAGEMENT
  { key: "admission_module", label: "Admission Management", category: "Management", applicableOrgTypes: ALL_ORGS, defaultEnabled: true },
  { key: "fee_module", label: "Fee Collection System", category: "Management", applicableOrgTypes: ALL_ORGS, defaultEnabled: true },
  { key: "hr_module", label: "Staff Leave & Payroll", category: "Management", applicableOrgTypes: ALL_ORGS, defaultEnabled: true },
  { key: "library_module", label: "Digital Library Management", category: "Management", applicableOrgTypes: NO_SCHOOL, defaultEnabled: false },
  { key: "canteen_module", label: "Canteen Management", category: "Management", applicableOrgTypes: NO_SCHOOL, defaultEnabled: false },
  { key: "alumni_module", label: "Alumni Network", category: "Management", applicableOrgTypes: NO_SCHOOL, defaultEnabled: false },

  // ADVANCED
  { key: "ai_assistant", label: "AI Assistant", category: "Advanced", applicableOrgTypes: ALL_ORGS, defaultEnabled: false },
  { key: "analytics_module", label: "Advanced Analytics", category: "Advanced", applicableOrgTypes: ALL_ORGS, defaultEnabled: false },
  { key: "compliance_audit_module", label: "Compliance Audit Trails", category: "Advanced", applicableOrgTypes: NO_SCHOOL, defaultEnabled: false },
  { key: "website_module", label: "Institution Website", category: "Advanced", applicableOrgTypes: ALL_ORGS, defaultEnabled: false },
  { key: "certificates_module", label: "Digital Certificates", category: "Advanced", applicableOrgTypes: ALL_ORGS, defaultEnabled: false },
  { key: "holiday_module", label: "Holiday Management", category: "Advanced", applicableOrgTypes: ALL_ORGS, defaultEnabled: false },
  { key: "id_cards_module", label: "Digital ID Cards", category: "Advanced", applicableOrgTypes: ALL_ORGS, defaultEnabled: false },
  { key: "events_module", label: "Events Management", category: "Advanced", applicableOrgTypes: ALL_ORGS, defaultEnabled: false },
  { key: "feedback_module", label: "Feedback System", category: "Advanced", applicableOrgTypes: ALL_ORGS, defaultEnabled: false },

  // DASHBOARDS
  { key: "dashboard_admission", label: "Admission Management Dashboard", category: "Dashboards", applicableOrgTypes: ALL_ORGS, defaultEnabled: true },
  { key: "dashboard_fees", label: "Fee Management Dashboard", category: "Dashboards", applicableOrgTypes: ALL_ORGS, defaultEnabled: true },
  { key: "dashboard_student", label: "Student Management Dashboard", category: "Dashboards", applicableOrgTypes: ALL_ORGS, defaultEnabled: true },
  { key: "dashboard_faculty", label: "Faculty Management Dashboard", category: "Dashboards", applicableOrgTypes: ALL_ORGS, defaultEnabled: true },
  { key: "dashboard_organization", label: "Organization Management Dashboard", category: "Dashboards", applicableOrgTypes: ALL_ORGS, defaultEnabled: true },
  { key: "dashboard_hr", label: "Leave Management Dashboard", category: "Dashboards", applicableOrgTypes: ALL_ORGS, defaultEnabled: true },
  { key: "dashboard_library", label: "Library Management Dashboard", category: "Dashboards", applicableOrgTypes: NO_SCHOOL, defaultEnabled: true },
  { key: "dashboard_canteen", label: "Canteen Management Dashboard", category: "Dashboards", applicableOrgTypes: NO_SCHOOL, defaultEnabled: false },
];

async function seedModules() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error("MONGODB_URI is not set. Are you running this script with correct env setup?");
      process.exit(1);
    }
    
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    for (const mod of modulesData) {
      await PlatformModule.findOneAndUpdate(
        { key: mod.key },
        { $set: mod },
        { upsert: true, returnDocument: 'after' }
      );
    }

    console.log(`Successfully seeded ${modulesData.length} Platform Modules.`);
    process.exit(0);
  } catch (error) {
    console.error("Error seeding modules:", error);
    process.exit(1);
  }
}

seedModules();
