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
import Attendance from "../../models/Attendance.js";

// ══════════════════════════════════════════════════════════════════════════════
// ATTENDANCE ANALYTICS SERVICE — Heavy-lifting aggregation engine.
// Computes percentages, parses master arrays, and generates fast reports.
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Calculates a specific student's attendance percentage across a date range.
 * Uses a highly optimized MongoDB Aggregation Pipeline to pierce the embedded arrays.
 *
 * @param {string} studentId   - The student's User._id.
 * @param {string} hierarchyId - The 4x2 DNA node (AcademicHierarchy._id).
 * @param {string|Date} startDate - Start of the analytical window.
 * @param {string|Date} endDate   - End of the analytical window.
 * @param {string} orgId       - Tenant isolation.
 * @returns {Promise<Object>}  The computed attendance stats and percentage.
 */
export async function getStudentAttendancePercentage(studentId, hierarchyId, startDate, endDate, orgId) {
    if (!studentId || !hierarchyId || !startDate || !endDate || !orgId) {
        throw new Error("studentId, hierarchyId, startDate, endDate, and orgId are required.");
    }

    try {
        const pipeline = [
            // 1. Isolate the exact master registers we care about (utilizes composite index)
            {
                $match: {
                    organization_id: new mongoose.Types.ObjectId(orgId),
                    hierarchy_id: new mongoose.Types.ObjectId(hierarchyId),
                    date: { $gte: new Date(startDate), $lte: new Date(endDate) }
                }
            },
            // 2. Deconstruct the master array to evaluate individual students
            {
                $unwind: "$student_records"
            },
            // 3. Filter down to ONLY the requested student
            {
                $match: {
                    "student_records.student_id": new mongoose.Types.ObjectId(studentId)
                }
            },
            // 4. Group by their status ('present', 'absent', 'leave', 'late') and count
            {
                $group: {
                    _id: "$student_records.status",
                    count: { $sum: 1 }
                }
            }
        ];

        const aggregatedResults = await Attendance.aggregate(pipeline);

        // Reduce the raw MongoDB group output into a clean JSON map
        const stats = {
            present: 0,
            absent: 0,
            leave: 0,
            late: 0,
            total: 0
        };

        aggregatedResults.forEach(item => {
            const status = item._id;
            stats[status] = item.count;
            stats.total += item.count;
        });

        // Calculate percentage (Present + Late usually counts as attended, customize as needed)
        const attendedDays = stats.present + stats.late;
        const percentage = stats.total > 0 ? (attendedDays / stats.total) * 100 : 0;

        return {
            student_id: studentId,
            ...stats,
            percentage: Math.round(percentage * 100) / 100
        };
    } catch (error) {
        throw new Error(`Failed to calculate student attendance: ${error.message}`);
    }
}

/**
 * Returns a fast snapshot of a specific day's attendance for the Admin/Faculty dashboard.
 * Extracts the pre-computed totals and specifically isolates missing students.
 *
 * @param {string} hierarchyId - The 4x2 DNA node (AcademicHierarchy._id).
 * @param {string|Date} date   - The date of the attendance.
 * @param {string} orgId       - Tenant isolation.
 * @returns {Promise<Object>}  The pre-computed stats and an array of absentees.
 */
export async function getBatchAttendanceReport(hierarchyId, date, orgId) {
    if (!hierarchyId || !date || !orgId) {
        throw new Error("hierarchyId, date, and orgId are required.");
    }

    try {
        const parsedDate = new Date(date);

        // Fetch the master document and populate the student details
        const register = await Attendance.findOne({
            organization_id: orgId,
            hierarchy_id: hierarchyId,
            date: parsedDate
        })
        .populate("student_records.student_id", "name prn roll_no profilePicture")
        .lean();

        if (!register) {
            return {
                stats: { total: 0, present: 0, absent: 0, leave: 0, late: 0 },
                absentees: [],
                message: "No attendance register found for this date."
            };
        }

        // Isolate the students who did not attend
        const absentees = register.student_records
            .filter(record => record.status === "absent" || record.status === "leave")
            .map(record => ({
                student_id: record.student_id._id,
                name: record.student_id.name,
                prn: record.student_id.prn || record.student_id.roll_no,
                profilePicture: record.student_id.profilePicture,
                status: record.status,
                remarks: record.remarks
            }));

        return {
            date: register.date,
            session_type: register.session_type,
            stats: register.stats,
            absentees: absentees
        };
    } catch (error) {
        throw new Error(`Failed to fetch batch attendance report: ${error.message}`);
    }
}
