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
import AssignmentSubmission from "../models/AssignmentSubmission.js";
import Meeting from "../models/Meeting.js";
import Classroom from "../models/Classroom.js";

/**
 * Calculates core overview metrics, schedule, and announcements for the faculty dashboard.
 * @param {string} facultyId - The Faculty (User) ID
 * @param {string} orgId - The Organization ID
 * @param {object} profile - The institution profile (for 4x2 rule evaluation)
 * @returns {Promise<object>}
 */
export const getFacultyDashboardSummary = async (facultyId, orgId, profile = {}) => {
  try {
    // 1. Context: Find all classrooms owned/managed by this faculty member
    // This inherently supports 4x2 DNA because 'Classroom' maps to divisions/batches seamlessly
    const myClassrooms = await Classroom.find({ 
        teacher: facultyId, 
        organization_id: orgId 
    }).select('_id');
    
    const classroomIds = myClassrooms.map(c => c._id);

    // 2. Schedule: Fetch Today's Lectures
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const today = days[new Date().getDay()];

    const schedule = await Timetable.find({
      organization: orgId,
      day: today,
      $or: [
        { classroom: { $in: classroomIds } }, // Lectures assigned to their classrooms
        { user: facultyId } // Personal timetables specifically assigned to them
      ]
    })
    .sort({ startTime: 1 })
    .lean();
    
    const todayLectures = schedule.length;

    // 3. Pending Grading: Count submissions for their assignments that need review
    const myAssignments = await Assignment.find({ 
        teacher: facultyId, 
        organization_id: orgId 
    }).select('_id');
    
    const assignmentIds = myAssignments.map(a => a._id);
    
    const pendingGrading = await AssignmentSubmission.countDocuments({
      assignment: { $in: assignmentIds },
      status: "submitted",
      grade: null // Null indicates it hasn't been graded yet
    });

    // 4. Upcoming Meetings: Count meetings scheduled for today or the future
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const upcomingMeetings = await Meeting.countDocuments({
      teacher: facultyId,
      organization_id: orgId,
      start_time: { $gte: startOfToday }
    });

    // 5. Recent Announcements
    // Faculty are staff, they typically see all active announcements
    const announcements = await OrganizationAnnouncement.find({
      organization_id: orgId,
      status: "published"
    })
    .sort({ createdAt: -1 })
    .limit(3)
    .lean();

    // 6. Build Final Payload
    return {
      metrics: {
        todayLectures,
        pendingGrading,
        upcomingMeetings,
      },
      schedule,
      announcements
    };
  } catch (error) {
    console.error("[faculty-dashboard.service] Error calculating dashboard summary:", error);
    throw new Error("Failed to calculate faculty dashboard summary.");
  }
};
