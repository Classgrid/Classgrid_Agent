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
import LeaveRequest from "../../models/LeaveRequest.js";
import Attendance from "../../models/Attendance.js";

// ══════════════════════════════════════════════════════════════════════════════
// LEAVE WORKFLOW SERVICE
// Handles the lifecycle of student leave requests and safely synchronizes approved
// leaves with the master Attendance registers to prevent accidental absences.
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Creates a new leave request for a student.
 * 
 * @param {string} studentId   - The requesting student's User._id.
 * @param {string} hierarchyId - The 4x2 DNA node they are applying from.
 * @param {string} orgId       - Tenant isolation.
 * @param {string|Date} startDate - When the leave starts.
 * @param {string|Date} endDate   - When the leave ends.
 * @param {string} reason      - Explanation for the leave.
 * @returns {Promise<Object>}  The newly created LeaveRequest.
 */
export async function applyForLeave(studentId, hierarchyId, orgId, startDate, endDate, reason) {
    if (!studentId || !orgId || !startDate || !endDate || !reason) {
        throw new Error("studentId, orgId, startDate, endDate, and reason are required.");
    }

    try {
        const leave = new LeaveRequest({
            organization_id: orgId,
            student_id: studentId,
            hierarchy_id: hierarchyId || null,
            start_date: new Date(startDate),
            end_date: new Date(endDate),
            reason: reason,
            status: "pending"
        });

        const savedLeave = await leave.save();
        return savedLeave.toObject();
    } catch (error) {
        throw new Error(`Failed to apply for leave: ${error.message}`);
    }
}

/**
 * Fetches all pending leave requests for a specific class/batch.
 * Used by the Faculty and Admin dashboards.
 * 
 * @param {string} hierarchyId - The 4x2 DNA node.
 * @param {string} orgId       - Tenant isolation.
 * @returns {Promise<Array>}   List of pending leave requests.
 */
export async function getPendingLeaveRequests(hierarchyId, orgId) {
    if (!hierarchyId || !orgId) {
        throw new Error("hierarchyId and orgId are required.");
    }

    try {
        return await LeaveRequest.find({
            organization_id: orgId,
            hierarchy_id: hierarchyId,
            status: "pending"
        })
        .populate("student_id", "name prn roll_no profilePicture")
        .sort({ start_date: 1 })
        .lean();
    } catch (error) {
        throw new Error(`Failed to fetch pending leave requests: ${error.message}`);
    }
}

/**
 * Retrieves a student's entire history of leave applications.
 * 
 * @param {string} studentId - The student's User._id.
 * @param {string} orgId     - Tenant isolation.
 * @returns {Promise<Array>} List of historical leave requests.
 */
export async function getStudentLeaveHistory(studentId, orgId) {
    if (!studentId || !orgId) {
        throw new Error("studentId and orgId are required.");
    }

    try {
        return await LeaveRequest.find({
            organization_id: orgId,
            student_id: studentId
        })
        .sort({ createdAt: -1 })
        .lean();
    } catch (error) {
        throw new Error(`Failed to fetch student leave history: ${error.message}`);
    }
}

/**
 * The heavy lifter: Approves or rejects a leave request.
 * CRITICAL: If approved, it actively synchronizes with the master Attendance documents
 * across the requested date range, marking the student as 'leave'.
 * 
 * @param {string} leaveRequestId - The LeaveRequest._id.
 * @param {string} status         - 'approved' or 'rejected'.
 * @param {string} approvedBy     - The User._id of the Faculty/Admin approving.
 * @param {string} remarks        - Optional explanation (admin_remarks).
 * @param {string} orgId          - Tenant isolation.
 * @returns {Promise<Object>}     The updated LeaveRequest.
 */
export async function processLeaveRequest(leaveRequestId, status, approvedBy, remarks, orgId) {
    if (!leaveRequestId || !status || !approvedBy || !orgId) {
        throw new Error("leaveRequestId, status, approvedBy, and orgId are required.");
    }

    if (!["approved", "rejected"].includes(status)) {
        throw new Error("Status must be 'approved' or 'rejected'.");
    }

    try {
        const leave = await LeaveRequest.findOne({ _id: leaveRequestId, organization_id: orgId });
        
        if (!leave) {
            throw new Error("Leave request not found.");
        }
        
        if (leave.status !== "pending") {
            throw new Error(`Leave request is already ${leave.status}.`);
        }

        // 1. Update the Leave Request Status
        leave.status = status;
        leave.approved_by = approvedBy;
        leave.admin_remarks = remarks || "";
        
        await leave.save();

        // 2. Synchronize with Master Attendance Registers if Approved
        if (status === "approved" && leave.hierarchy_id) {
            let currentDate = new Date(leave.start_date);
            const endDate = new Date(leave.end_date);
            
            // Loop through each day in the date range
            while (currentDate <= endDate) {
                const targetDay = new Date(currentDate);
                
                // A) Pull the student from the array if they already exist on this day
                await Attendance.updateOne(
                    { 
                        organization_id: orgId, 
                        hierarchy_id: leave.hierarchy_id, 
                        date: targetDay, 
                        session_type: "full_day" 
                    },
                    { 
                        $pull: { student_records: { student_id: leave.student_id } } 
                    }
                );
                
                // B) Push them back as 'leave', and upsert if the master document doesn't exist yet
                await Attendance.updateOne(
                    { 
                        organization_id: orgId, 
                        hierarchy_id: leave.hierarchy_id, 
                        date: targetDay, 
                        session_type: "full_day" 
                    },
                    {
                        $push: { 
                            student_records: { 
                                student_id: leave.student_id, 
                                status: "leave", 
                                remarks: `Approved Leave: ${leave.reason.substring(0, 50)}...`
                            } 
                        },
                        // Required fields if this is a brand new master document being created
                        $setOnInsert: {
                            faculty_id: approvedBy,
                            stats: { total: 0, present: 0, absent: 0, leave: 0, late: 0 }
                        }
                    },
                    { upsert: true }
                );

                // Increment to the next day
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }

        return leave.toObject();
    } catch (error) {
        throw new Error(`Failed to process leave request: ${error.message}`);
    }
}
