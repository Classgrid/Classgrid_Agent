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

import express from "express";
import { isAuthenticated, requireRole } from "../middleware/auth.middleware.js";
import { attachInstitutionProfile } from "../middleware/institution-profile.middleware.js";
import {
    createExamController,
    getFacultyExamsController,
    getStudentExamsController,
    getExamByIdController,
    updateExamController,
    deleteExamController,
    getExamsByOrganizationController,
    submitStudentGradeController,
    bulkSubmitGradesController,
    getExamResultsController,
    getStudentResultsFeedController,
    generateStudentReportCardController,
    generateBatchReportController
} from "../controllers/examination.controller.js";

const router = express.Router();

// Apply these to all routes in this file (must be logged in, must load the DNA profile)
router.use(isAuthenticated, attachInstitutionProfile({ required: false }));

// ══════════════════════════════════════════════════════════════════════════════
// EXAM CORE ROUTES
// ══════════════════════════════════════════════════════════════════════════════

// Admin / Faculty: Create a new exam
router.post("/create", requireRole(["faculty", "org_admin"]), createExamController);

// Admin / Faculty: Get exams created by the logged-in faculty
router.get("/faculty", requireRole(["faculty", "org_admin"]), getFacultyExamsController);

// Student: Get feed of exams targeted at their hierarchy nodes (Uses POST to accept array in body)
router.post("/student", requireRole("student"), getStudentExamsController);

// Admin: Get all exams for the organization (Bento Grid Dashboard)
router.get("/org", requireRole("org_admin"), getExamsByOrganizationController);

// All Authenticated: Get a specific exam by ID
router.get("/exam/:examId", getExamByIdController);

// Admin / Faculty: Update an exam (must be creator, must be draft/scheduled)
router.put("/exam/:examId", requireRole(["faculty", "org_admin"]), updateExamController);

// Admin / Faculty: Delete an exam (must be creator, must be draft)
router.delete("/exam/:examId", requireRole(["faculty", "org_admin"]), deleteExamController);

// ══════════════════════════════════════════════════════════════════════════════
// GRADING ENGINE ROUTES
// ══════════════════════════════════════════════════════════════════════════════

// Admin / Faculty: Bulk submit grades for a batch
router.post("/exam/:examId/grade/bulk", requireRole(["faculty", "org_admin"]), bulkSubmitGradesController);

// Admin / Faculty: Submit/update grade for a single student
router.post("/exam/:examId/grade/:studentId", requireRole(["faculty", "org_admin"]), submitStudentGradeController);

// Admin / Faculty: View the completed gradebook for an exam
router.get("/exam/:examId/results", requireRole(["faculty", "org_admin"]), getExamResultsController);

// All Authenticated: View a student's graded exams feed
router.get("/student/:studentId/results", getStudentResultsFeedController);

// ══════════════════════════════════════════════════════════════════════════════
// REPORT CARD ENGINE ROUTES
// ══════════════════════════════════════════════════════════════════════════════

// All Authenticated: Generate cumulative report card for a student in a specific term/hierarchy
router.get("/report-card/student/:studentId/hierarchy/:hierarchyId", generateStudentReportCardController);

// Admin / Faculty: Generate the master batch report (Toppers, Failures, Averages)
router.get("/report-card/batch/:hierarchyId", requireRole(["faculty", "org_admin"]), generateBatchReportController);

export default router;
