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
import bcrypt from "bcryptjs";
import crypto from "crypto";
import multer from "multer";
import { isAuthenticated } from "../middleware/auth.middleware.js";
import { attachInstitutionProfile } from "../middleware/institution-profile.middleware.js";
import { requireClassroomMember, requireClassroomOwner } from "../middleware/classroom.middleware.js";
import { requirePlan } from "../middleware/plan.middleware.js";
import AttendanceSession from "../models/AttendanceSession.js";
import AttendanceRecord from "../models/AttendanceRecord.js";
import AttendanceAppeal from "../models/AttendanceAppeal.js";
import ClassroomMembership from "../models/ClassroomMembership.js";
import Notification from "../models/Notification.js";
import Classroom from "../models/Classroom.js";
import User from "../models/User.js";
import AdminAuditLog from "../models/AdminAuditLog.js";
import { getChatSb } from "../config/supabaseClient.js";
import { sendAttendanceStartedEmails, sendAbsenceNotificationEmails } from "../services/notification-email.service.js";
import { checkRadius, isValidCoords } from "../services/gps.service.js";
import { isHoliday } from "../utils/holidayUtils.js";
import connectDB from "../../config/db.js";
import { attendanceQueue } from "../workers/attendance.worker.js";
import { dispatchNotification, bulkDispatchNotification } from "../services/notification.service.js";
import { uploadBufferToR2, deleteFromR2, getPresignedUploadUrl } from "../config/r2Client.js";

// Phase 7 Controller Imports
import { requireRole } from "../middleware/auth.middleware.js";
import {
    submitDailyAttendanceController,
    getAttendanceRegisterController,
    getStudentAttendancePercentageController,
    getBatchAttendanceReportController,
    applyLeaveController,
    getPendingLeaveRequestsController,
    getStudentLeaveHistoryController,
    processLeaveController
} from "../controllers/attendance.controller.js";

const router = express.Router();

router.use(isAuthenticated, attachInstitutionProfile({ required: false }));

router.get("/institution-profile", attachInstitutionProfile(), (req, res) => {
    res.json({
        institution_profile: req.institutionProfile,
        attendance_profile: req.institutionProfile.attendanceProfile,
        learner_record_profile: req.institutionProfile.learnerRecordProfile,
    });
});

// ─────────────────────────────────────────────────────────────
// 🔐 ATTENDANCE MODE
// "testing" = Phase 1: log everything, never block on GPS
// "strict"  = Phase 2: enforce GPS radius, block far students
// Change via Vercel env var: ATTENDANCE_MODE=strict
// ─────────────────────────────────────────────────────────────
const ATTENDANCE_MODE = process.env.ATTENDANCE_MODE || "testing";
const IS_STRICT = ATTENDANCE_MODE === "strict";

/**
 * Auto-expire sessions that have passed their expiresAt time.
 * Fires absence notification emails for each newly expired session.
 */
async function expireStale(classroomId) {
    const staleSessions = await AttendanceSession.find({
        classroom: classroomId,
        status: "active",
        expiresAt: { $lte: new Date() },
    }).lean();

    if (!staleSessions.length) return;

    await AttendanceSession.updateMany(
        { _id: { $in: staleSessions.map(s => s._id) } },
        { $set: { status: "expired" } }
    );

    // Notify students that session expired (if they were absent)
    try {
        for (const session of staleSessions) {
            const members = await ClassroomMembership.find({ classroom: session.classroom, status: "approved" }).select("student").lean();
            const studentIds = members.map(m => m.student.toString());
            
            // Find who marked attendance
            const presentRecords = await AttendanceRecord.find({ session: session._id }).select("student").lean();
            const presentIds = new Set(presentRecords.map(r => r.student.toString()));
            
            // Absent students
            const absentIds = studentIds.filter(id => !presentIds.has(id));
            
            if (absentIds.length > 0) {
                await bulkDispatchNotification({
                    recipientIds: absentIds,
                    type: "attendance_ended",
                    title: "⚠️ Attendance Missed",
                    message: `You were marked absent for the session in classroom ${session.classroom}. Click to appeal if this is an error.`,
                    link: `/modules/attendance`,
                    relatedId: session._id.toString()
                });
            }
        }
    } catch (err) {
        console.error("[Attendance] Expiry notif error:", err.message);
    }

    // Fire-and-forget: send absence emails in parallel
    Promise.allSettled(
        staleSessions.map(async (session) => {
            try {
                const classroom = await Classroom.findById(session.classroom).select("name").lean();
                if (classroom) await sendAbsenceNotificationEmails({ classroom, session });
            } catch (err) {
                console.error("[Attendance] Absence email error:", err.message);
            }
        })
    ).catch(() => {});
}

/**
 * Build a device fingerprint from request headers.
 * Same approach as the trusted-devices system in User model.
 */
function buildFingerprint(req) {
    const raw = `${req.headers["user-agent"] || ""}:${req.ip || ""}`;
    return crypto.createHash("sha256").update(raw).digest("hex");
}

// ─────────────────────────────────────────────
// GET /my-overview — Student's cross-classroom attendance
// ─────────────────────────────────────────────
router.get(
    "/my-overview",
    isAuthenticated,
    async (req, res) => {
        try {
            await connectDB();
            const userId = req.user._id;

            let startDate, endDate;
            if (req.query.startDate && req.query.endDate) {
                startDate = new Date(req.query.startDate);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(req.query.endDate);
                endDate.setHours(23, 59, 59, 999);
            } else {
                const month = parseInt(req.query.month) || new Date().getMonth() + 1;
                const year = parseInt(req.query.year) || new Date().getFullYear();
                startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
                endDate = new Date(year, month, 0, 23, 59, 59, 999);
            }

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                return res.status(400).json({ message: "Invalid date parameters" });
            }

            const membershipFilter = { student: userId, status: "approved" };
            if (req.query.classroom) membershipFilter.classroom = req.query.classroom;

            const memberships = await ClassroomMembership.find(membershipFilter).select("classroom").lean();
            if (!memberships.length) {
                return res.json({
                    startDate, endDate,
                    overall: { totalSessions: 0, present: 0, absent: 0, percentage: 0 },
                    classrooms: [],
                });
            }

            const classroomIds = memberships.map(m => m.classroom);
            const classroomDocs = await Classroom.find({ _id: { $in: classroomIds } }).select("name subject").lean();
            const classroomMap = Object.fromEntries(classroomDocs.map(c => [c._id.toString(), { name: c.name, subject: c.subject }]));

            const sessionAgg = await AttendanceSession.aggregate([
                { $match: { classroom: { $in: classroomIds }, createdAt: { $gte: startDate, $lte: endDate } } },
                { $group: { _id: "$classroom", totalSessions: { $sum: 1 } } },
            ]);
            const sessionMap = Object.fromEntries(sessionAgg.map(s => [s._id.toString(), s.totalSessions]));

            const presentAgg = await AttendanceRecord.aggregate([
                { $match: { student: userId, classroom: { $in: classroomIds }, createdAt: { $gte: startDate, $lte: endDate } } },
                { $group: { _id: "$classroom", present: { $sum: 1 } } },
            ]);
            const presentMap = Object.fromEntries(presentAgg.map(p => [p._id.toString(), p.present]));

            let overallTotal = 0;
            let overallPresent = 0;

            const classrooms = classroomIds.map(cid => {
                const id = cid.toString();
                const total = sessionMap[id] || 0;
                const present = presentMap[id] || 0;
                const absent = total - present;
                const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
                overallTotal += total;
                overallPresent += present;
                return { classroomId: id, name: classroomMap[id]?.name || "Unknown", subject: classroomMap[id]?.subject || "", totalSessions: total, present, absent, percentage, isDefaulter: total > 0 && percentage < 75 };
            }).filter(c => c.totalSessions > 0).sort((a, b) => a.percentage - b.percentage);

            const overallAbsent = overallTotal - overallPresent;
            const overallPercentage = overallTotal > 0 ? Math.round((overallPresent / overallTotal) * 100) : 0;

            res.json({ startDate, endDate, overall: { totalSessions: overallTotal, present: overallPresent, absent: overallAbsent, percentage: overallPercentage, isDefaulter: overallTotal > 0 && overallPercentage < 75 }, classrooms });
        } catch (err) {
            console.error("[Attendance] my-overview error:", err);
            res.status(500).json({ message: "Server error" });
        }
    }
);

// ─────────────────────────────────────────────
// GET /session/:sessionId/detail — Single session detail (faculty)
// ─────────────────────────────────────────────
router.get(
    "/session/:sessionId/detail",
    isAuthenticated,
    async (req, res) => {
        try {
            await connectDB();
            const session = await AttendanceSession.findById(req.params.sessionId).lean();
            if (!session) return res.status(404).json({ message: "Session not found" });

            const classroom = await Classroom.findById(session.classroom).select("name subject teacher").lean();
            if (!classroom || classroom.teacher?.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: "Not authorized" });
            }

            const memberships = await ClassroomMembership.find({ classroom: session.classroom, status: "approved" }).select("student").lean();
            const studentIds = memberships.map(m => m.student);
            const students = await User.find({ _id: { $in: studentIds } }).select("name email prn").lean();

            const records = await AttendanceRecord.find({ session: session._id })
                .select("student markedAt status pasteDetected distanceMeters suspicionReasons deviceFingerprint")
                .lean();

            const recordMap = Object.fromEntries(records.map(r => [r.student.toString(), r]));

            const studentList = students.map(s => {
                const record = recordMap[s._id.toString()];
                return {
                    studentId: s._id,
                    prn: s.prn || "—",
                    name: s.name,
                    email: s.email,
                    status: record ? record.status : "absent",
                    markedAt: record?.markedAt || null,
                    suspicious: record?.status === "present_suspicious",
                    suspicionReasons: record?.suspicionReasons || [],
                    distanceMeters: record?.distanceMeters || null,
                    deviceFingerprint: record?.deviceFingerprint || null,
                };
            }).sort((a, b) => {
                if (a.status !== b.status) return a.status === "absent" ? -1 : 1;
                return (a.prn || "").localeCompare(b.prn || "");
            });

            const presentCount = studentList.filter(s => s.status !== "absent").length;
            const suspiciousCount = studentList.filter(s => s.suspicious).length;
            const absentCount = studentList.filter(s => s.status === "absent").length;

            res.json({
                session: {
                    id: session._id,
                    createdAt: session.createdAt,
                    startsAt: session.startsAt,
                    expiresAt: session.expiresAt,
                    status: session.status,
                    durationSeconds: session.durationSeconds,
                    hasGPS: !!(session.teacherLat && session.teacherLng),
                    radiusMeters: session.radiusMeters,
                    mode: ATTENDANCE_MODE,
                    meta: session.meta || null,
                },
                classroom: { id: classroom._id, name: classroom.name, subject: classroom.subject || "" },
                summary: { total: studentList.length, present: presentCount, absent: absentCount, suspicious: suspiciousCount },
                students: studentList,
            });
        } catch (err) {
            console.error("[Attendance] Session detail error:", err);
            res.status(500).json({ message: "Server error" });
        }
    }
);

// ─────────────────────────────────────────────
// GET /my-detailed — Student's per-session records
// ─────────────────────────────────────────────
router.get(
    "/my-detailed",
    isAuthenticated,
    async (req, res) => {
        try {
            await connectDB();
            const userId = req.user._id;
            let startDate, endDate;
            const now = new Date();
            const filter = req.query.filter;

            if (filter === "week") {
                startDate = new Date(now); startDate.setDate(now.getDate() - 7); startDate.setHours(0, 0, 0, 0);
                endDate = new Date(now); endDate.setHours(23, 59, 59, 999);
            } else if (req.query.semester) {
                const sem = parseInt(req.query.semester);
                const y = parseInt(req.query.year) || now.getFullYear();
                if (sem === 1) { startDate = new Date(y, 5, 1, 0, 0, 0, 0); endDate = new Date(y, 10, 30, 23, 59, 59, 999); }
                else { startDate = new Date(y, 11, 1, 0, 0, 0, 0); endDate = new Date(y + 1, 4, 31, 23, 59, 59, 999); }
            } else {
                const month = parseInt(req.query.month) || now.getMonth() + 1;
                const year = parseInt(req.query.year) || now.getFullYear();
                startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
                endDate = new Date(year, month, 0, 23, 59, 59, 999);
            }

            const membershipFilter = { student: userId, status: "approved" };
            if (req.query.classroom) membershipFilter.classroom = req.query.classroom;
            const memberships = await ClassroomMembership.find(membershipFilter).select("classroom").lean();
            const classroomIds = memberships.map(m => m.classroom);

            if (!classroomIds.length) return res.json({ classrooms: [] });

            const classroomDocs = await Classroom.find({ _id: { $in: classroomIds } }).select("name subject").lean();
            const classroomMap = Object.fromEntries(classroomDocs.map(c => [c._id.toString(), c]));

            const sessions = await AttendanceSession.find({ classroom: { $in: classroomIds }, createdAt: { $gte: startDate, $lte: endDate } }).sort({ createdAt: -1 }).lean();
            const sessionIds = sessions.map(s => s._id);
            const records = await AttendanceRecord.find({ student: userId, session: { $in: sessionIds } }).select("session status").lean();
            const presentSessionSet = new Set(records.map(r => r.session.toString()));

            const grouped = {};
            for (const s of sessions) {
                const cid = s.classroom.toString();
                if (!grouped[cid]) grouped[cid] = [];
                grouped[cid].push({ sessionId: s._id, date: s.createdAt, status: presentSessionSet.has(s._id.toString()) ? "present" : "absent" });
            }

            const classrooms = Object.entries(grouped).map(([cid, sessions]) => ({
                classroomId: cid, name: classroomMap[cid]?.name || "Unknown", subject: classroomMap[cid]?.subject || "",
                sessions, total: sessions.length, present: sessions.filter(s => s.status === "present").length, absent: sessions.filter(s => s.status === "absent").length,
            }));

            res.json({ startDate, endDate, classrooms });
        } catch (err) {
            console.error("[Attendance] my-detailed error:", err);
            res.status(500).json({ message: "Server error" });
        }
    }
);

// ─────────────────────────────────────────────
// POST /:classroomId/start — Faculty starts attendance
// NEW: accepts teacherLat, teacherLng, durationSeconds
// ─────────────────────────────────────────────
router.post(
    "/:classroomId/start",
    isAuthenticated,
    requireClassroomOwner,
    async (req, res) => {
        try {
            await connectDB();
            const { code, teacherLat, teacherLng, durationSeconds, radiusMeters } = req.body;
            const classroomId = req.params.classroomId;

            // 🔒 Holiday guard — block attendance on holidays
            const orgId = req.user.organization_id?.toString() || req.effectiveOrganizationId;
            if (orgId) {
                const todayStr = new Date().toISOString().split("T")[0];
                const holidayCheck = await isHoliday(todayStr, orgId);
                if (holidayCheck.isHoliday) {
                    return res.status(403).json({
                        message: `Today is a holiday (${holidayCheck.holiday?.title || "Holiday"}). Attendance cannot be started on holidays.`,
                        code: "HOLIDAY_BLOCKED",
                    });
                }
            }

            if (!code || code.length < 3 || code.length > 30) {
                return res.status(400).json({ message: "Code must be 3–30 characters" });
            }

            // Validate duration (30–600 seconds)
            const duration = Math.min(Math.max(parseInt(durationSeconds) || 90, 30), 600);
            const radius = Math.min(Math.max(parseInt(radiusMeters) || 40, 10), 100);

            // Validate GPS if provided
            const hasGPS = isValidCoords(teacherLat, teacherLng);
            if (!hasGPS || (teacherLat === 0 && teacherLng === 0)) {
                return res.status(400).json({ message: "Valid Teacher GPS location is required to start an attendance session." });
            }

            // Expire stale sessions in background (don't block response)
            expireStale(classroomId).catch(e => console.error("[Attendance] expireStale bg error:", e.message));

            // Check for existing active session
            const existing = await AttendanceSession.findOne({ classroom: classroomId, status: "active" });
            if (existing) {
                return res.status(409).json({
                    message: "An attendance session is already active",
                    session: { id: existing._id, expiresAt: existing.expiresAt, presentCount: existing.presentCount },
                });
            }

            const codeHash = await bcrypt.hash(code.toLowerCase().trim(), 4); // Low rounds — attendance codes are ephemeral (90s), not passwords
            const now = new Date();

            const session = await AttendanceSession.create({
                classroom: classroomId,
                faculty: req.user._id,
                codeHash,
                startsAt: now,
                expiresAt: new Date(now.getTime() + duration * 1000),
                durationSeconds: duration,
                status: "active",
                presentCount: 0,
                // GPS fields
                teacherLat: hasGPS ? parseFloat(teacherLat) : null,
                teacherLng: hasGPS ? parseFloat(teacherLng) : null,
                radiusMeters: radius,
                // sessionToken is auto-generated by model default (UUID)
            });

            // 🔔 Notify students via central service (Push + Internal + Email)
            try {
                const members = await ClassroomMembership.find({ classroom: classroomId, status: "approved" }).select("student").lean();
                const studentIds = members.map(m => m.student.toString());
                
                if (studentIds.length > 0) {
                    await bulkDispatchNotification({
                        recipientIds: studentIds,
                        type: "attendance",
                        title: "📍 Attendance Started",
                        message: `Attendance is live for ${req.classroom?.name || "your class"}! Mark now (${duration}s window).`,
                        link: `/modules/attendance/mark?id=${session._id}`,
                        relatedId: session._id.toString(),
                    });
                }

                // Also trigger emails via existing service (optional: could be integrated into central service too)
                sendAttendanceStartedEmails({ classroom: req.classroom, faculty: req.user }).catch(e => console.error("[Attendance] Email error:", e.message));
            } catch (notifErr) {
                console.error("[Attendance] Notification error:", notifErr.message);
            }

            res.status(201).json({
                message: "Attendance session started",
                session: {
                    id: session._id,
                    startsAt: session.startsAt,
                    expiresAt: session.expiresAt,
                    durationSeconds: duration,
                    sessionToken: session.sessionToken,
                    requiresGPS: hasGPS,
                    radiusMeters: radius,
                    mode: ATTENDANCE_MODE,
                },
            });
        } catch (err) {
            console.error("[Attendance] Start error:", err);
            res.status(500).json({ message: "Server error starting attendance" });
        }
    }
);

// ─────────────────────────────────────────────
// POST /:classroomId/quick-mark — Faculty manually marks attendance by ticking students
// Creates a manual session (no code, no GPS, no duration)
// ─────────────────────────────────────────────
router.post(
    "/:classroomId/quick-mark",
    isAuthenticated,
    requireClassroomOwner,
    async (req, res) => {
        try {
            await connectDB();
            const { studentIds, sessionDate } = req.body;
            const classroomId = req.params.classroomId;

            // 🔒 Holiday guard — block quick-mark on holidays
            const orgId = req.user.organization_id?.toString() || req.effectiveOrganizationId;
            if (orgId) {
                const checkDate = sessionDate ? new Date(sessionDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
                const holidayCheck = await isHoliday(checkDate, orgId);
                if (holidayCheck.isHoliday) {
                    return res.status(403).json({
                        message: `${holidayCheck.holiday?.title || "Holiday"} falls on this date. Attendance cannot be marked on holidays.`,
                        code: "HOLIDAY_BLOCKED",
                    });
                }
            }

            if (!Array.isArray(studentIds) || studentIds.length === 0) {
                return res.status(400).json({ message: "At least one student must be selected" });
            }

            // Verify all students are approved members
            const validMembers = await ClassroomMembership.find({
                classroom: classroomId,
                student: { $in: studentIds },
                status: "approved"
            }).select("student").lean();
            const validIds = validMembers.map(m => m.student.toString());

            if (validIds.length === 0) {
                return res.status(400).json({ message: "No valid classroom members found" });
            }

            const now = new Date();
            // Use provided sessionDate or default to now
            const classDate = sessionDate ? new Date(sessionDate) : now;

            // Create manual session (immediately completed)
            const session = await AttendanceSession.create({
                classroom: classroomId,
                faculty: req.user._id,
                codeHash: null,
                startsAt: classDate,
                expiresAt: classDate,
                durationSeconds: 0,
                status: "expired",
                mode: "manual",
                presentCount: validIds.length,
                meta: { source: "manual" },
            });

            // Bulk-insert attendance records
            const records = validIds.map(sid => ({
                session: session._id,
                classroom: classroomId,
                student: sid,
                status: "present",
                markedAt: now,
            }));
            await AttendanceRecord.insertMany(records);

            res.status(201).json({
                message: `Attendance marked for ${validIds.length} students`,
                session: { id: session._id, presentCount: validIds.length }
            });
        } catch (err) {
            console.error("[Quick Mark] Error:", err);
            res.status(500).json({ message: "Server error" });
        }
    }
);

// ─────────────────────────────────────────────
// POST /:classroomId/stop — Faculty manually stops an active session early
// ─────────────────────────────────────────────
router.post(
    "/:classroomId/stop",
    isAuthenticated,
    requireClassroomOwner,
    async (req, res) => {
        try {
            await connectDB();
            const classroomId = req.params.classroomId;

            const session = await AttendanceSession.findOne({
                classroom: classroomId,
                status: "active"
            });

            if (!session) {
                return res.status(404).json({ message: "No active attendance session found to stop." });
            }

            session.status = "expired";
            session.expiresAt = new Date(); // Expire immediately
            await session.save();

            // Fire-and-forget: Send "ended" + "missed" notifications
            (async () => {
                try {
                    const classroom = await Classroom.findById(classroomId).select("name").lean();
                    const clsName = classroom?.name || "your class";
                    const members = await ClassroomMembership.find({ classroom: classroomId, status: "approved" }).select("student").lean();
                    const memberIds = members.map(m => m.student);
                    const records = await AttendanceRecord.find({ session: session._id }).select("student").lean();
                    const presentSet = new Set(records.map(r => r.student.toString()));

                    const notifs = memberIds.map(sid => {
                        const isPresent = presentSet.has(sid.toString());
                        return {
                            recipient: sid,
                            type: "attendance_ended",
                            title: isPresent ? "Attendance Recorded" : "Attendance Missed",
                            message: isPresent
                                ? `Your attendance for ${clsName} has been recorded.`
                                : `You missed attendance for ${clsName}. Contact your teacher for assistance.`,
                            link: `/classroom/${classroomId}?tab=attendance`,
                            relatedId: session._id.toString(),
                        };
                    });
                    if (notifs.length > 0) {
                        Notification.insertMany(notifs).catch(e => console.error("[Attendance] Stop notif error:", e.message));
                    }
                } catch (e) {
                    console.error("[Attendance] Stop notification error:", e.message);
                }
            })();

            res.json({ message: "Attendance session stopped successfully." });
        } catch (err) {
            console.error("[Attendance] Stop error:", err);
            res.status(500).json({ message: "Server error stopping attendance" });
        }
    }
);

// ─────────────────────────────────────────────
// POST /:classroomId/mark — Student marks attendance
// NEW: GPS validation, sessionToken check, paste/typing detection
// ─────────────────────────────────────────────
router.post(
    "/:classroomId/mark",
    isAuthenticated,
    requireClassroomMember,
    async (req, res) => {
        try {
            await connectDB();
            const {
                code,
                sessionToken,
                studentLat,
                studentLng,
                pasteDetected,
                deviceFingerprint,
            } = req.body;
            const classroomId = req.params.classroomId;

            if (!code) return res.status(400).json({ message: "Attendance code is required" });
            if (!sessionToken) return res.status(400).json({ message: "Session token is required" });

            // Find active session — validate by both classroom AND sessionToken
            const session = await AttendanceSession.findOne({
                classroom: classroomId,
                status: "active",
                sessionToken,
            });

            if (!session) {
                // Could be wrong token or no active session — same safe message
                return res.status(404).json({ message: "No active attendance session found. It may have expired or your link is invalid." });
            }

            // Server-side expiry check
            if (new Date() > new Date(session.expiresAt)) {
                session.status = "expired";
                await session.save();
                return res.status(410).json({ message: "Attendance session has expired" });
            }

            // Verify code
            const isMatch = await bcrypt.compare(code.toLowerCase().trim(), session.codeHash);
            if (!isMatch) {
                return res.status(401).json({ message: "Incorrect attendance code" });
            }

            // ── GPS Validation ─────────────────────────────────────
            let distanceMeters = null;
            let gpsFlag = false;
            const hasTeacherGPS = isValidCoords(session.teacherLat, session.teacherLng);
            const hasStudentGPS = isValidCoords(studentLat, studentLng);

            if (hasTeacherGPS) {
                if (!hasStudentGPS) {
                    // Student didn't send GPS but session requires it
                    if (IS_STRICT) {
                        return res.status(403).json({ message: "GPS location is required to mark attendance. Please enable location access." });
                    }
                    // Phase 1: allow but flag
                    gpsFlag = true;
                    console.warn(`[Attendance] GPS required but not provided by student ${req.user._id} in session ${session._id}`);
                } else {
                    const gpsResult = checkRadius(
                        { lat: session.teacherLat, lng: session.teacherLng },
                        { lat: parseFloat(studentLat), lng: parseFloat(studentLng) },
                        session.radiusMeters
                    );
                    distanceMeters = gpsResult.distanceMeters;

                    if (!gpsResult.withinRadius) {
                        console.warn(`[Attendance] Student ${req.user._id} is ${distanceMeters}m away (limit ${session.radiusMeters}m)`);
                        if (IS_STRICT) {
                            return res.status(403).json({
                                message: `You are too far from the classroom (${Math.round(distanceMeters)}m). Must be within ${session.radiusMeters}m.`,
                                distanceMeters,
                            });
                        }
                        gpsFlag = true;
                    }
                }
            }

            // ── Fraud Detection ────────────────────────────────────
            const suspicionReasons = [];

            let deviceFlag = false;
            // Only flag if the student has a bound device and they use a different one
            if (req.user.deviceFingerprint && deviceFingerprint && req.user.deviceFingerprint !== deviceFingerprint) {
                deviceFlag = true;
                console.warn(`[Attendance] Device mismatch for student ${req.user._id}. Expected: ${req.user.deviceFingerprint}, Got: ${deviceFingerprint}`);
            }

            // Only run if fingerprint is a real non-null string (guard against null-matching all null records)
            if (deviceFingerprint && typeof deviceFingerprint === 'string' && deviceFingerprint.length >= 10) {
                // Check if *any* other student already marked attendance in this session using this EXACT device
                const siblingRecord = await AttendanceRecord.findOne({
                    session: session._id,
                    deviceFingerprint: deviceFingerprint,
                    student: { $ne: req.user._id }
                });

                if (siblingRecord) {
                    // BLOCK: One device = one account. Do not allow proxy attendance.
                    // Retroactively flag the previous student who used this device too
                    await AttendanceRecord.updateMany(
                        {
                            session: session._id,
                            deviceFingerprint: deviceFingerprint,
                            student: { $ne: req.user._id }
                        },
                        {
                            $set: { status: "present_suspicious" },
                            $addToSet: { suspicionReasons: "multiple_accounts_same_device" }
                        }
                    );

                    // Log to audit
                    try {
                        await AdminAuditLog.create({
                            action: "attendance_proxy_blocked",
                            actorId: req.user._id,
                            actorName: req.user.name,
                            actorRole: req.user.role,
                            targetType: "AttendanceSession",
                            targetId: session._id,
                            organization_id: req.user.organization_id || null,
                            metadata: {
                                blockedStudentId: req.user._id,
                                previousStudentId: siblingRecord.student,
                                deviceFingerprint,
                                classroomId,
                                sessionId: session._id,
                                reason: "Same device used by multiple accounts",
                            },
                        });
                    } catch (auditErr) {
                        console.error("[Attendance] Proxy block audit error:", auditErr.message);
                    }

                    return res.status(403).json({
                        message: "Attendance blocked: This device has already been used by another student in this session. One device, one account.",
                        blocked: true,
                        reason: "multiple_accounts_same_device",
                    });
                }
            }

            if (pasteDetected) suspicionReasons.push("paste_detected");
            if (gpsFlag) suspicionReasons.push(hasStudentGPS ? "gps_far" : "gps_not_provided");
            if (deviceFlag) suspicionReasons.push("device_mismatch");

            const isSuspicious = suspicionReasons.length > 0;
            const status = isSuspicious ? "present_suspicious" : "present";

            // ── Queue the attendance record for DB writing ─────────
            // Offloads the 60s window DB spike to BullMQ worker
            
            await attendanceQueue.add("mark_attendance", {
                session_id: session._id,
                classroom_id: classroomId,
                student_id: req.user._id,
                student_name: req.user.name,
                role: req.user.role,
                org_id: req.user.organization_id || null,
                studentLat: hasStudentGPS ? parseFloat(studentLat) : null,
                studentLng: hasStudentGPS ? parseFloat(studentLng) : null,
                distanceMeters,
                pasteDetected: !!pasteDetected,
                deviceFingerprint,
                expectedDevice: req.user.deviceFingerprint,
                ipAddress: req.ip || req.headers['x-forwarded-for'],
                suspicionReasons,
                isSuspicious,
                status
            }, {
                jobId: `${session._id}_${req.user._id}`, // Prevents duplicate queueing for the same student/session
                removeOnComplete: true,
                removeOnFail: false
            });

            res.json({
                message: "Attendance queued successfully!",
                markedAt: new Date(),
                status,
                distanceMeters,
            });
        } catch (err) {
            console.error("[Attendance] Mark error:", err);
            res.status(500).json({ message: "Server error marking attendance" });
        }
    }
);

// ─────────────────────────────────────────────
// GET /:classroomId/report — Faculty attendance report with date-range
// ─────────────────────────────────────────────
router.get(
    "/:classroomId/report",
    isAuthenticated,
    requireClassroomOwner,
    async (req, res) => {
        try {
            await connectDB();
            const classroomId = req.params.classroomId;
            
            let startDate, endDate;
            if (req.query.startDate && req.query.endDate) {
                startDate = new Date(req.query.startDate);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(req.query.endDate);
                endDate.setHours(23, 59, 59, 999);
            } else {
                endDate = new Date();
                startDate = new Date();
                startDate.setDate(endDate.getDate() - 30);
                startDate.setHours(0, 0, 0, 0);
            }

            const sessions = await AttendanceSession.find({
                classroom: classroomId,
                createdAt: { $gte: startDate, $lte: endDate }
            }).select('_id createdAt durationSeconds presentCount status').lean();

            const totalSessions = sessions.length;
            const sessionIds = sessions.map(s => s._id);

            const memberships = await ClassroomMembership.find({
                classroom: classroomId,
                status: "approved"
            }).select('student').lean();
            const studentIds = memberships.map(m => m.student);

            const students = await User.find({ _id: { $in: studentIds } }).select("name email prn").lean();
            const attendanceRecords = await AttendanceRecord.find({
                session: { $in: sessionIds }
            }).select('student session status').lean();

            const studentMap = {};
            students.forEach(s => {
                studentMap[s._id.toString()] = {
                    studentId: s._id,
                    name: s.name,
                    prn: s.prn || "—",
                    email: s.email,
                    presentCount: 0,
                    suspiciousCount: 0,
                    absentCount: 0,
                    percentage: 0
                };
            });

            attendanceRecords.forEach(record => {
                const sid = record.student.toString();
                if (studentMap[sid]) {
                    if (record.status === "present" || record.status === "present_suspicious") {
                        studentMap[sid].presentCount += 1;
                        if (record.status === "present_suspicious") {
                            studentMap[sid].suspiciousCount += 1;
                        }
                    }
                }
            });

            const studentList = Object.values(studentMap).map(student => {
                student.absentCount = totalSessions - student.presentCount;
                student.percentage = totalSessions > 0 ? Math.round((student.presentCount / totalSessions) * 100) : 0;
                return student;
            }).sort((a, b) => a.percentage - b.percentage);

            res.json({
                startDate,
                endDate,
                totalSessions,
                students: studentList
            });
        } catch (err) {
            console.error("[Attendance] Report error:", err);
            res.status(500).json({ message: "Server error generating report" });
        }
    }
);

// ─────────────────────────────────────────────
// GET /:classroomId/active — Check active session
// NEW: returns sessionToken + requiresGPS to frontend
// ─────────────────────────────────────────────
router.get(
    "/:classroomId/active",
    isAuthenticated,
    requirePlan("PRO"),
    requireClassroomMember,
    async (req, res) => {
        try {
            await connectDB();
            await expireStale(req.params.classroomId);

            const session = await AttendanceSession.findOne({
                classroom: req.params.classroomId,
                status: "active",
            }).lean();

            if (!session) return res.json({ active: false });

            let alreadyMarked = false;
            if (req.user.role === "student") {
                const record = await AttendanceRecord.findOne({ session: session._id, student: req.user._id }).lean();
                alreadyMarked = !!record;
            }

            res.json({
                active: true,
                session: {
                    id: session._id,
                    startsAt: session.startsAt,
                    expiresAt: session.expiresAt,
                    durationSeconds: session.durationSeconds,
                    presentCount: session.presentCount,
                    alreadyMarked,
                    // Send token to frontend so mark request can include it
                    sessionToken: session.sessionToken,
                    // Tell frontend whether to request GPS permission
                    requiresGPS: !!(session.teacherLat && session.teacherLng),
                    teacherLat: session.teacherLat,
                    teacherLng: session.teacherLng,
                },
            });
        } catch (err) {
            console.error("[Attendance] Active check error:", err);
            res.status(500).json({ message: "Server error" });
        }
    }
);

// ─────────────────────────────────────────────
// GET /:classroomId/suspicious — Suspicious records (faculty)
// NEW: view all flagged students for a classroom
// ─────────────────────────────────────────────
router.get(
    "/:classroomId/suspicious",
    isAuthenticated,
    requirePlan("PRO"),
    requireClassroomOwner,
    async (req, res) => {
        try {
            await connectDB();
            const classroomId = req.params.classroomId;
            const page = parseInt(req.query.page) || 1;
            const limit = 30;

            const records = await AttendanceRecord.find({
                classroom: classroomId,
                status: "present_suspicious",
            })
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate("student", "name email prn")
                .populate("session", "startsAt expiresAt")
                .lean();

            const total = await AttendanceRecord.countDocuments({ classroom: classroomId, status: "present_suspicious" });

            res.json({
                records: records.map(r => ({
                    recordId: r._id,
                    student: { id: r.student?._id, name: r.student?.name, email: r.student?.email, prn: r.student?.prn || "—" },
                    session: { id: r.session?._id, startsAt: r.session?.startsAt },
                    markedAt: r.markedAt,
                    suspicionReasons: r.suspicionReasons,
                    distanceMeters: r.distanceMeters,
                    pasteDetected: r.pasteDetected,
                    typingDurationMs: r.typingDurationMs,
                })),
                total,
                page,
                pages: Math.ceil(total / limit),
                mode: ATTENDANCE_MODE,
            });
        } catch (err) {
            console.error("[Attendance] Suspicious records error:", err);
            res.status(500).json({ message: "Server error" });
        }
    }
);

// ─────────────────────────────────────────────
// POST /:classroomId/manual-override — Faculty marks/unmarks a student
// NEW: teacher can correct attendance + audit log is written
// ─────────────────────────────────────────────
router.post(
    "/:classroomId/manual-override",
    isAuthenticated,
    requirePlan("PRO"),
    requireClassroomOwner,
    async (req, res) => {
        try {
            await connectDB();
            const { sessionId, studentId, action } = req.body;
            // action: "mark_present" | "mark_absent"

            if (!sessionId || !studentId || !["mark_present", "mark_absent"].includes(action)) {
                return res.status(400).json({ message: "sessionId, studentId, and action (mark_present|mark_absent) are required" });
            }

            const session = await AttendanceSession.findById(sessionId).lean();
            if (!session || session.classroom.toString() !== req.params.classroomId) {
                return res.status(404).json({ message: "Session not found for this classroom" });
            }

            const student = await User.findById(studentId).select("name email").lean();
            if (!student) return res.status(404).json({ message: "Student not found" });

            let result;

            if (action === "mark_present") {
                // Check if record already exists before upserting
                const existingRecord = await AttendanceRecord.findOne({ session: sessionId, student: studentId });

                result = await AttendanceRecord.findOneAndUpdate(
                    { session: sessionId, student: studentId },
                    {
                        $setOnInsert: { classroom: req.params.classroomId, markedAt: new Date() },
                        $set: { status: "present", suspicionReasons: [], pasteDetected: false },
                    },
                    { upsert: true, returnDocument: "after" }
                );
                // Only increment presentCount if this was a NEW record (not updating an existing one)
                if (!existingRecord) {
                    await AttendanceSession.findByIdAndUpdate(sessionId, { $inc: { presentCount: 1 } });
                }
            } else {
                // mark_absent: delete the record and decrement presentCount
                const deletedRecord = await AttendanceRecord.findOneAndDelete({ session: sessionId, student: studentId });
                result = null;
                // Only decrement if a record actually existed and was deleted
                if (deletedRecord) {
                    await AttendanceSession.findByIdAndUpdate(sessionId, { $inc: { presentCount: -1 } });
                }
            }

            // Audit log every manual override
            try {
                await AdminAuditLog.create({
                    action: "attendance_manual_override",
                    actorId: req.user._id,
                    actorName: req.user.name,
                    actorRole: req.user.role,
                    targetType: "AttendanceRecord",
                    targetId: sessionId,
                    organization_id: req.user.organization_id || null,
                    metadata: {
                        overrideAction: action,
                        studentId,
                        studentName: student.name,
                        sessionId,
                        classroomId: req.params.classroomId,
                        overriddenBy: req.user._id,
                        overriddenAt: new Date(),
                    },
                });
            } catch (auditErr) {
                console.error("[Attendance] Override audit error (non-critical):", auditErr.message);
            }

            res.json({
                message: action === "mark_present"
                    ? `${student.name} marked as present`
                    : `${student.name} marked as absent`,
                action,
                student: { id: student._id, name: student.name },
            });
        } catch (err) {
            console.error("[Attendance] Manual override error:", err);
            res.status(500).json({ message: "Server error" });
        }
    }
);

// ─────────────────────────────────────────────
// GET /:classroomId/sessions — Past sessions (faculty)
// ─────────────────────────────────────────────
router.get(
    "/:classroomId/sessions",
    isAuthenticated,
    requirePlan("PRO"),
    requireClassroomOwner,
    async (req, res) => {
        try {
            await connectDB();
            await expireStale(req.params.classroomId);

            const page = parseInt(req.query.page) || 1;
            const limit = 20;
            const now = new Date();
            const query = { classroom: req.params.classroomId };
            const filter = req.query.filter;

            if (filter === "week") {
                const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7); weekStart.setHours(0, 0, 0, 0);
                query.createdAt = { $gte: weekStart, $lte: now };
            } else if (filter === "month" || req.query.month) {
                const month = parseInt(req.query.month) || now.getMonth() + 1;
                const year = parseInt(req.query.year) || now.getFullYear();
                query.createdAt = { $gte: new Date(year, month - 1, 1, 0, 0, 0, 0), $lte: new Date(year, month, 0, 23, 59, 59, 999) };
            } else if (filter === "semester" || req.query.semester) {
                const sem = parseInt(req.query.semester) || 1;
                const y = parseInt(req.query.year) || now.getFullYear();
                if (sem === 1) { query.createdAt = { $gte: new Date(y, 5, 1, 0, 0, 0, 0), $lte: new Date(y, 10, 30, 23, 59, 59, 999) }; }
                else { query.createdAt = { $gte: new Date(y, 11, 1, 0, 0, 0, 0), $lte: new Date(y + 1, 4, 31, 23, 59, 59, 999) }; }
            }

            const sessions = await AttendanceSession.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean();
            const total = await AttendanceSession.countDocuments(query);

            res.json({ sessions, total, page, pages: Math.ceil(total / limit) });
        } catch (err) {
            console.error("[Attendance] Sessions list error:", err);
            res.status(500).json({ message: "Server error" });
        }
    }
);

// ─────────────────────────────────────────────
// GET /:classroomId/report — Monthly report (faculty)
// ─────────────────────────────────────────────
router.get(
    "/:classroomId/report",
    isAuthenticated,
    requireClassroomOwner,
    async (req, res) => {
        try {
            await connectDB();
            const classroomId = req.params.classroomId;
            const month = parseInt(req.query.month) || new Date().getMonth() + 1;
            const year = parseInt(req.query.year) || new Date().getFullYear();
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59, 999);

            const sessions = await AttendanceSession.find({ classroom: classroomId, createdAt: { $gte: startDate, $lte: endDate } }).select("_id createdAt presentCount").lean();
            const totalSessions = sessions.length;
            const sessionIds = sessions.map(s => s._id);

            const members = await ClassroomMembership.find({ classroom: classroomId, status: "approved" }).populate("student", "name email").lean();

            const records = await AttendanceRecord.aggregate([
                { $match: { session: { $in: sessionIds } } },
                { $group: { _id: "$student", present: { $sum: 1 }, suspicious: { $sum: { $cond: [{ $eq: ["$status", "present_suspicious"] }, 1, 0] } } } },
            ]);

            const presentMap = {};
            records.forEach(r => { presentMap[r._id.toString()] = { present: r.present, suspicious: r.suspicious }; });

            const studentReport = members.map(m => {
                const data = presentMap[m.student._id.toString()] || { present: 0, suspicious: 0 };
                const absent = totalSessions - data.present;
                const percentage = totalSessions > 0 ? Math.round((data.present / totalSessions) * 100) : 0;
                return { studentId: m.student._id, name: m.student.name, email: m.student.email, present: data.present, suspiciousCount: data.suspicious, absent, percentage, isDefaulter: percentage < 75 };
            }).sort((a, b) => a.percentage - b.percentage);

            const defaulters = studentReport.filter(s => s.isDefaulter);

            res.json({ month, year, totalSessions, totalStudents: members.length, defaulterCount: defaulters.length, students: studentReport, defaulters });
        } catch (err) {
            console.error("[Attendance] Report error:", err);
            res.status(500).json({ message: "Server error" });
        }
    }
);

// ─────────────────────────────────────────────
// GET /:classroomId/my-attendance — Student's own stats
// ─────────────────────────────────────────────
router.get(
    "/:classroomId/my-attendance",
    isAuthenticated,
    requireClassroomMember,
    async (req, res) => {
        try {
            await connectDB();
            const classroomId = req.params.classroomId;
            const month = parseInt(req.query.month) || new Date().getMonth() + 1;
            const year = parseInt(req.query.year) || new Date().getFullYear();
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59, 999);

            const totalSessions = await AttendanceSession.countDocuments({ classroom: classroomId, createdAt: { $gte: startDate, $lte: endDate } });
            const presentCount = await AttendanceRecord.countDocuments({ classroom: classroomId, student: req.user._id, createdAt: { $gte: startDate, $lte: endDate } });

            const absent = totalSessions - presentCount;
            const percentage = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;

            res.json({ month, year, totalSessions, present: presentCount, absent, percentage, isDefaulter: percentage < 75 });
        } catch (err) {
            console.error("[Attendance] My-attendance error:", err);
            res.status(500).json({ message: "Server error" });
        }
    }
);

// ─────────────────────────────────────────────────────────────
// ATTENDANCE APPEALS
// ─────────────────────────────────────────────────────────────

const appealUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (_req, file, cb) => {
        const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error("Only JPEG, PNG, WebP, and PDF files are allowed"));
    },
});

// POST /appeal — Student creates an appeal
router.post(
    "/appeal",
    isAuthenticated,
    (req, res, next) => {
        appealUpload.single("proof")(req, res, (err) => {
            if (err) {
                if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
                    return res.status(400).json({ message: "File must be under 2MB" });
                }
                return res.status(400).json({ message: err.message || "Upload error" });
            }
            next();
        });
    },
    async (req, res) => {
        try {
            await connectDB();
            const userId = req.user._id;
            const { sessionId, reason } = req.body;

            if (!sessionId || !reason?.trim()) {
                return res.status(400).json({ message: "sessionId and reason are required" });
            }
            if (reason.length > 1000) {
                return res.status(400).json({ message: "Reason must be under 1000 characters" });
            }

            // 1. Session must exist
            const session = await AttendanceSession.findById(sessionId).lean();
            if (!session) return res.status(404).json({ message: "Session not found" });

            // 2. Student must be in the classroom
            const membership = await ClassroomMembership.findOne({
                classroom: session.classroom,
                student: userId,
                status: "approved"
            }).lean();
            if (!membership) return res.status(403).json({ message: "You are not in this classroom" });

            // 3. Must be absent (no attendance record) for this session
            const existingRecord = await AttendanceRecord.findOne({
                session: sessionId,
                student: userId,
            }).lean();
            if (existingRecord) {
                return res.status(400).json({ message: "You are already marked present for this session" });
            }

            // 4. No duplicate appeal
            const existingAppeal = await AttendanceAppeal.findOne({
                session: sessionId,
                student: userId,
            }).lean();
            if (existingAppeal) {
                return res.status(409).json({ message: "You have already submitted an appeal for this session" });
            }

            // 5. Within 72h of session creation
            const hoursSinceSession = (Date.now() - new Date(session.createdAt).getTime()) / (1000 * 60 * 60);
            if (hoursSinceSession > 72) {
                return res.status(400).json({ message: "Appeals must be submitted within 72 hours of the session" });
            }

            // 6. Upload file to Supabase if provided
            let attachmentUrl = null;
            if (req.file) {
                const sb = getChatSb();
                const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
                const storagePath = `appeals/${sessionId}/${Date.now()}_${safeName}`;

                const publicUrl = await uploadBufferToR2(req.file.buffer, req.file.buffer.originalname || 'upload.file', req.file.buffer.mimetype || 'application/octet-stream', storagePath);
                /* Error handled inside R2 */

                /* getPublicUrl replaced by R2 */
                attachmentUrl = publicUrl;
            }

            // 7. Create appeal
            const appeal = await AttendanceAppeal.create({
                session: sessionId,
                classroom: session.classroom,
                student: userId,
                reason: reason.trim(),
                attachmentUrl,
            });

            res.status(201).json({ message: "Appeal submitted successfully", appeal });
        } catch (err) {
            console.error("[Attendance] Appeal create error:", err);
            if (err.code === 11000) {
                return res.status(409).json({ message: "Duplicate appeal" });
            }
            res.status(500).json({ message: "Server error" });
        }
    }
);

// GET /appeals — Faculty fetches appeals for a classroom
router.get(
    "/appeals",
    isAuthenticated,
    async (req, res) => {
        try {
            await connectDB();
            const { classroomId, status } = req.query;
            if (!classroomId) return res.status(400).json({ message: "classroomId is required" });

            // Verify faculty owns this classroom
            const classroom = await Classroom.findById(classroomId).lean();
            if (!classroom) return res.status(404).json({ message: "Classroom not found" });
            if (classroom.teacher?.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: "Not your classroom" });
            }

            const filter = { classroom: classroomId };
            if (status && ["pending", "approved", "rejected"].includes(status)) {
                filter.status = status;
            }

            const appeals = await AttendanceAppeal.find(filter)
                .populate("student", "name email profilePicture prn")
                .populate("session", "createdAt durationSeconds mode meta")
                .populate("reviewedBy", "name")
                .sort({ createdAt: -1 })
                .lean();

            // Attach classroom name to each appeal for display
            const classroomName = classroom.name || "";
            const enriched = appeals.map((a) => ({
                ...a,
                classroomName,
            }));

            res.json({ appeals: enriched });
        } catch (err) {
            console.error("[Attendance] Appeals list error:", err);
            res.status(500).json({ message: "Server error" });
        }
    }
);

// PATCH /appeal/:id — Faculty approves or rejects
router.patch(
    "/appeal/:id",
    isAuthenticated,
    async (req, res) => {
        try {
            await connectDB();
            const { action, comment } = req.body;
            if (!["approve", "reject"].includes(action)) {
                return res.status(400).json({ message: "action must be 'approve' or 'reject'" });
            }

            const appeal = await AttendanceAppeal.findById(req.params.id);
            if (!appeal) return res.status(404).json({ message: "Appeal not found" });
            if (appeal.status !== "pending") {
                return res.status(400).json({ message: "This appeal has already been reviewed" });
            }

            // Verify faculty owns the classroom
            const classroom = await Classroom.findById(appeal.classroom).lean();
            if (!classroom || classroom.teacher?.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: "Not authorized" });
            }

            // Update appeal
            appeal.status = action === "approve" ? "approved" : "rejected";
            appeal.facultyComment = comment || null;
            appeal.reviewedBy = req.user._id;
            appeal.reviewedAt = new Date();
            await appeal.save();

            // If approved, create attendance record (mark student present)
            if (action === "approve") {
                await AttendanceRecord.findOneAndUpdate(
                    { session: appeal.session, student: appeal.student },
                    {
                        session: appeal.session,
                        student: appeal.student,
                        classroom: appeal.classroom,
                        status: "present",
                        markedAt: new Date(),
                        meta: { source: "appeal", appealId: appeal._id },
                    },
                    { upsert: true, returnDocument: 'after' }
                );

                // Update session present count
                const count = await AttendanceRecord.countDocuments({ session: appeal.session });
                await AttendanceSession.updateOne(
                    { _id: appeal.session },
                    { $set: { presentCount: count } }
                );
            }

            // Send notification to student via central service
            try {
                await dispatchNotification({
                    recipientId: appeal.student.toString(),
                    type: "attendance",
                    title: action === "approve" ? "✅ Appeal Approved" : "❌ Appeal Rejected",
                    message: action === "approve"
                        ? `Your attendance appeal for ${classroom.name} has been approved. You are now marked present.`
                        : `Your attendance appeal for ${classroom.name} has been rejected.${comment ? ` Reason: ${comment}` : ""}`,
                    link: `/modules/attendance`,
                });
            } catch (notifErr) {
                console.error("[Attendance] Appeal Notif error:", notifErr.message);
            }

            res.json({ message: `Appeal ${appeal.status}`, appeal });
        } catch (err) {
            console.error("[Attendance] Appeal review error:", err);
            res.status(500).json({ message: "Server error" });
        }
    }
);

// GET /my-appeals — Student fetches own appeals
router.get(
    "/my-appeals",
    isAuthenticated,
    async (req, res) => {
        try {
            await connectDB();
            const userId = req.user._id;

            const appeals = await AttendanceAppeal.find({ student: userId })
                .populate("session", "createdAt classroom")
                .populate("reviewedBy", "name")
                .sort({ createdAt: -1 })
                .lean();

            // Build a quick lookup map: sessionId -> appeal
            const bySession = {};
            appeals.forEach((a) => {
                bySession[a.session?._id?.toString()] = {
                    _id: a._id,
                    status: a.status,
                    reason: a.reason,
                    facultyComment: a.facultyComment,
                    reviewedAt: a.reviewedAt,
                    reviewedBy: a.reviewedBy?.name || null,
                    createdAt: a.createdAt,
                };
            });

            res.json({ appeals, bySession });
        } catch (err) {
            console.error("[Attendance] My appeals error:", err);
            res.status(500).json({ message: "Server error" });
        }
    }
);

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 7: NEW DASHBOARD ROUTES (4x2 DNA Architecture)
// ══════════════════════════════════════════════════════════════════════════════

// Admin / Faculty: Submit the daily master attendance register
router.post('/dashboard/submit', requireRole(['faculty', 'org_admin']), submitDailyAttendanceController);

// Admin / Faculty: View a specific day's submitted attendance register
router.get('/dashboard/register/:hierarchyId', requireRole(['faculty', 'org_admin']), getAttendanceRegisterController);

// All Authenticated: Get a student's calculated attendance percentage
router.get('/analytics/student/:studentId/hierarchy/:hierarchyId', getStudentAttendancePercentageController);

// Admin / Faculty: Get the pre-calculated stats and absentees for a batch
router.get('/analytics/batch/:hierarchyId', requireRole(['faculty', 'org_admin']), getBatchAttendanceReportController);

// Student: Apply for a leave of absence
router.post('/leave/apply', requireRole('student'), applyLeaveController);

// Admin / Faculty: Get all pending leave requests for their specific batch
router.get('/leave/pending/:hierarchyId', requireRole(['faculty', 'org_admin']), getPendingLeaveRequestsController);

// All Authenticated: View a student's leave history (Student sees own, Admin sees any)
router.get('/leave/history/:studentId?', getStudentLeaveHistoryController);

// Admin / Faculty: Approve or reject a leave request
router.post('/leave/process/:leaveRequestId', requireRole(['faculty', 'org_admin']), processLeaveController);

export default router;
