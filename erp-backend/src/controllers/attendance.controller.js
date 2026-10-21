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
 * NO FROfdfNTEND GITHUB ACTIONS: NEVER create yaml files that build/deploy the frontend to EC2.
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

import * as coreService from "../services/attendance/attendance-core.service.js";
import * as analyticsService from "../services/attendance/attendance-analytics.service.js";
import * as leaveWorkflowService from "../services/attendance/leave-workflow.service.js";

// ══════════════════════════════════════════════════════════════════════════════
// ATTENDANCE CONTROLLER — The "Traffic Cop"
// Strictly extracts data from Express (req) and formats the response (res).
// No business logic or database queries allowed here.
// ══════════════════════════════════════════════════════════════════════════════

// ── CORE ATTENDANCE INGESTION ────────────────────────────────────────────────

export async function submitDailyAttendanceController(req, res) {
    try {
        const orgId = req.user.organization_id;
        const facultyId = req.user._id;
        const { hierarchyId, date, sessionType, studentRecordsArray } = req.body;

        const result = await coreService.submitDailyAttendance(
            hierarchyId,
            date,
            sessionType,
            studentRecordsArray,
            facultyId,
            orgId
        );
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message });
    }
}

export async function getAttendanceRegisterController(req, res) {
    try {
        const orgId = req.user.organization_id;
        const { hierarchyId } = req.params;
        const { date, sessionType } = req.query;

        const result = await coreService.getAttendanceRegister(hierarchyId, date, sessionType, orgId);
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message });
    }
}

// ── ATTENDANCE ANALYTICS ──────────────────────────────────────────────────────

export async function getStudentAttendancePercentageController(req, res) {
    try {
        const orgId = req.user.organization_id;
        const { studentId, hierarchyId } = req.params;
        const { startDate, endDate } = req.query;

        const result = await analyticsService.getStudentAttendancePercentage(
            studentId,
            hierarchyId,
            startDate,
            endDate,
            orgId
        );
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message });
    }
}

export async function getBatchAttendanceReportController(req, res) {
    try {
        const orgId = req.user.organization_id;
        const { hierarchyId } = req.params;
        const { date } = req.query;

        const result = await analyticsService.getBatchAttendanceReport(hierarchyId, date, orgId);
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message });
    }
}

// ── LEAVE WORKFLOW ────────────────────────────────────────────────────────────

export async function applyLeaveController(req, res) {
    try {
        const orgId = req.user.organization_id;
        const studentId = req.user._id;
        const { hierarchyId, startDate, endDate, reason } = req.body;

        const result = await leaveWorkflowService.applyForLeave(
            studentId,
            hierarchyId,
            orgId,
            startDate,
            endDate,
            reason
        );
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message });
    }
}

export async function getPendingLeaveRequestsController(req, res) {
    try {
        const orgId = req.user.organization_id;
        const { hierarchyId } = req.params;

        const result = await leaveWorkflowService.getPendingLeaveRequests(hierarchyId, orgId);
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message });
    }
}

export async function getStudentLeaveHistoryController(req, res) {
    try {
        const orgId = req.user.organization_id;
        const studentId = req.params.studentId || req.user._id;

        const result = await leaveWorkflowService.getStudentLeaveHistory(studentId, orgId);
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message });
    }
}

export async function processLeaveController(req, res) {
    try {
        const orgId = req.user.organization_id;
        const approvedBy = req.user._id;
        const { leaveRequestId } = req.params;
        const { status, remarks } = req.body;

        const result = await leaveWorkflowService.processLeaveRequest(
            leaveRequestId,
            status,
            approvedBy,
            remarks,
            orgId
        );
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message });
    }
}
