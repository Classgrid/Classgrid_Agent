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

import Timetable from "../models/Timetable.js";
import OrganizationAnnouncement from "../models/OrganizationAnnouncement.js";
import Assignment from "../models/Assignment.js";
import ClassroomMembership from "../models/ClassroomMembership.js";

/**
 * Calculates core overview metrics, schedule, and announcements for the student dashboard.
 * @param {string} studentId - The Student (User) ID
 * @param {string} orgId - The Organization ID
 * @param {object} profile - The institution profile (for 4x2 rule evaluation)
 * @returns {Promise<object>}
 */
export const getStudentDashboardSummary = async (studentId, orgId, profile = {}) => {
  try {
    // 1. Get all approved classrooms for this student
    const memberships = await ClassroomMembership.find({
      student: studentId,
      status: "approved"
    }).select("classroom");

    const classroomIds = memberships.map(m => m.classroom);

    // 2. Fetch Pending Assignments
    const now = new Date();
    const pendingAssignmentsCount = await Assignment.countDocuments({
      organization_id: orgId,
      classroom: { $in: classroomIds },
      status: "published",
      dueDate: { $gte: now }
    });

    // 3. Fetch Today's Schedule
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const today = days[now.getDay()];

    const schedule = await Timetable.find({
      organization: orgId,
      classroom: { $in: classroomIds },
      day: today
    })
    .sort({ startTime: 1 })
    .lean(); // Use lean for faster execution

    // 4. Fetch Recent Announcements
    // Announcements targeted to "all" OR targeted specifically to this student's classrooms
    const announcements = await OrganizationAnnouncement.find({
      organization_id: orgId,
      status: "published",
      $or: [
        { target_type: "all" },
        { target_type: "specific", target_classrooms: { $in: classroomIds } }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(3)
    .lean();

    // 5. Build Final Payload
    return {
      metrics: {
        attendancePercentage: 92, // TODO: Wire up real attendance collection when available
        pendingAssignments: pendingAssignmentsCount,
      },
      schedule,
      announcements
    };
  } catch (error) {
    console.error("[student-dashboard.service] Error calculating dashboard summary:", error);
    throw new Error("Failed to calculate student dashboard summary.");
  }
};
