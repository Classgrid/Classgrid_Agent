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

import Attendance from "../../models/Attendance.js";

// ══════════════════════════════════════════════════════════════════════════════
// ATTENDANCE CORE SERVICE — Pure CRUD business logic for the master Attendance Register.
// Focused entirely on high-speed ingestion and retrieval.
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Submits or updates the daily attendance register for a specific classroom/batch.
 * Uses an upsert operation to prevent duplicate registers. Automatically calculates
 * and embeds the attendance statistics (present/absent counters).
 *
 * @param {string} hierarchyId         - The 4x2 DNA node (AcademicHierarchy._id).
 * @param {string|Date} date           - The date of the attendance (should be normalized to midnight).
 * @param {string} sessionType         - e.g., 'full_day', 'morning', 'lecture'.
 * @param {Array}  studentRecordsArray - Array of { student_id, status, remarks }.
 * @param {string} facultyId           - The submitting faculty User._id.
 * @param {string} orgId               - Tenant isolation.
 * @returns {Promise<Object>}          The saved master Attendance document.
 */
export async function submitDailyAttendance(
    hierarchyId,
    date,
    sessionType,
    studentRecordsArray,
    facultyId,
    orgId
) {
    if (!hierarchyId || !date || !facultyId || !orgId) {
        throw new Error("hierarchyId, date, facultyId, and orgId are required.");
    }
    
    if (!Array.isArray(studentRecordsArray)) {
        throw new Error("studentRecordsArray must be an array.");
    }

    try {
        // 1. Pre-calculate the fast-read statistics
        let total = 0;
        let present = 0;
        let absent = 0;
        let leave = 0;
        let late = 0;

        // Clean the array to ensure strict schema compliance
        const cleanRecords = studentRecordsArray.map(record => {
            if (!record.student_id || !record.status) {
                throw new Error("Each student record must have a student_id and status.");
            }

            const status = String(record.status).toLowerCase();
            total++;

            if (status === "present") present++;
            else if (status === "absent") absent++;
            else if (status === "leave") leave++;
            else if (status === "late") late++;

            return {
                student_id: record.student_id,
                status: status,
                remarks: record.remarks?.trim() || ""
            };
        });

        const stats = { total, present, absent, leave, late };
        const parsedDate = new Date(date);

        // 2. Perform the Upsert Operation
        const attendanceDoc = await Attendance.findOneAndUpdate(
            {
                organization_id: orgId,
                hierarchy_id: hierarchyId,
                date: parsedDate,
                session_type: sessionType || "full_day"
            },
            {
                faculty_id: facultyId,
                student_records: cleanRecords,
                stats: stats
            },
            {
                returnDocument: 'after',
                upsert: true,
                setDefaultsOnInsert: true,
                runValidators: true
            }
        );

        return attendanceDoc.toObject();
    } catch (error) {
        throw new Error(`Failed to submit attendance: ${error.message}`);
    }
}

/**
 * Fetches a single day's attendance register for a specific hierarchy node.
 * Useful for a teacher returning to view or edit an attendance sheet later in the day.
 *
 * @param {string} hierarchyId - The 4x2 DNA node (AcademicHierarchy._id).
 * @param {string|Date} date   - The date of the attendance.
 * @param {string} sessionType - e.g., 'full_day', 'morning', 'lecture'.
 * @param {string} orgId       - Tenant isolation.
 * @returns {Promise<Object|null>} The Attendance document or null if not found.
 */
export async function getAttendanceRegister(hierarchyId, date, sessionType, orgId) {
    if (!hierarchyId || !date || !orgId) {
        throw new Error("hierarchyId, date, and orgId are required.");
    }

    try {
        const parsedDate = new Date(date);

        const register = await Attendance.findOne({
            organization_id: orgId,
            hierarchy_id: hierarchyId,
            date: parsedDate,
            session_type: sessionType || "full_day"
        })
        .populate("student_records.student_id", "name prn roll_no profilePicture")
        .populate("faculty_id", "name")
        .lean();

        return register;
    } catch (error) {
        throw new Error(`Failed to fetch attendance register: ${error.message}`);
    }
}
