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

import * as examCoreService from "../services/examination/exam-core.service.js";
import * as gradingEngineService from "../services/examination/grading-engine.service.js";
import * as reportCardService from "../services/examination/report-card.service.js";

// ══════════════════════════════════════════════════════════════════════════════
// EXAMINATION CONTROLLER — The "Traffic Cop"
// Strictly extracts data from Express (req) and formats the response (res).
// No business logic or database queries allowed here.
// ══════════════════════════════════════════════════════════════════════════════

// ── EXAM CORE ─────────────────────────────────────────────────────────────────

export async function createExamController(req, res) {
    try {
        const orgId = req.user.organization_id;
        const facultyId = req.user._id;
        const examData = req.body;

        const result = await examCoreService.createExam(examData, orgId, facultyId);
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message });
    }
}

export async function getFacultyExamsController(req, res) {
    try {
        const orgId = req.user.organization_id;
        const facultyId = req.user._id;
        const filters = {
            status: req.query.status,
            subject_id: req.query.subject_id
        };

        const result = await examCoreService.getExamsByFaculty(facultyId, orgId, filters);
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message });
    }
}

export async function getStudentExamsController(req, res) {
    try {
        const orgId = req.user.organization_id;
        // In a real scenario, you might derive the student's active hierarchy nodes from their profile
        // For now, assume it's passed in the query or body, or use a default array.
        // E.g., const studentHierarchyIds = req.user.hierarchy_nodes || req.body.hierarchy_ids;
        const studentHierarchyIds = req.body.hierarchy_ids || []; 
        const filters = { status: req.query.status };

        const result = await examCoreService.getExamsByStudent(studentHierarchyIds, orgId, filters);
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message });
    }
}

export async function getExamByIdController(req, res) {
    try {
        const orgId = req.user.organization_id;
        const examId = req.params.examId;

        const result = await examCoreService.getExamById(examId, orgId);
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message });
    }
}

export async function updateExamController(req, res) {
    try {
        const orgId = req.user.organization_id;
        const facultyId = req.user._id;
        const examId = req.params.examId;
        const updates = req.body;

        const result = await examCoreService.updateExam(examId, updates, orgId, facultyId);
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message });
    }
}

export async function deleteExamController(req, res) {
    try {
        const orgId = req.user.organization_id;
        const facultyId = req.user._id;
        const examId = req.params.examId;

        const result = await examCoreService.deleteExam(examId, orgId, facultyId);
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message });
    }
}

export async function getExamsByOrganizationController(req, res) {
    try {
        const orgId = req.user.organization_id;
        const filters = {
            status: req.query.status,
            hierarchy_id: req.query.hierarchy_id,
            subject_id: req.query.subject_id,
            date_from: req.query.date_from,
            date_to: req.query.date_to
        };

        const result = await examCoreService.getExamsByOrganization(orgId, filters);
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message });
    }
}

// ── GRADING ENGINE ────────────────────────────────────────────────────────────

export async function submitStudentGradeController(req, res) {
    try {
        const facultyId = req.user._id;
        const { examId, studentId } = req.params;
        const { obtainedMarks, remarks } = req.body;

        const result = await gradingEngineService.submitStudentGrade(examId, studentId, obtainedMarks, remarks, facultyId);
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message });
    }
}

export async function bulkSubmitGradesController(req, res) {
    try {
        const facultyId = req.user._id;
        const { examId } = req.params;
        const { gradesArray } = req.body; // Expects array of { studentId, obtainedMarks, remarks }

        const result = await gradingEngineService.bulkSubmitGrades(examId, gradesArray, facultyId);
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message });
    }
}

export async function getExamResultsController(req, res) {
    try {
        const orgId = req.user.organization_id;
        const { examId } = req.params;

        const result = await gradingEngineService.getExamResults(examId, orgId);
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message });
    }
}

export async function getStudentResultsFeedController(req, res) {
    try {
        const orgId = req.user.organization_id;
        // Typically the logged in student
        const studentId = req.params.studentId || req.user._id; 

        const result = await gradingEngineService.getStudentResultsFeed(studentId, orgId);
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message });
    }
}

// ── REPORT CARD ENGINE ────────────────────────────────────────────────────────

export async function generateStudentReportCardController(req, res) {
    try {
        const orgId = req.user.organization_id;
        const { studentId, hierarchyId } = req.params;

        const result = await reportCardService.generateStudentReportCard(studentId, hierarchyId, orgId);
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message });
    }
}

export async function generateBatchReportController(req, res) {
    try {
        const orgId = req.user.organization_id;
        const { hierarchyId } = req.params;

        const result = await reportCardService.generateBatchReport(hierarchyId, orgId);
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message });
    }
}
