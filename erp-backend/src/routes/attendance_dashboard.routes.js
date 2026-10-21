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
import { isAuthenticated } from "../middleware/auth.middleware.js";
import { attachInstitutionProfile } from "../middleware/institution-profile.middleware.js";
import { requireClassroomMember, requireClassroomOwner } from "../middleware/classroom.middleware.js";
import { requirePlan } from "../middleware/plan.middleware.js";
import AttendanceSession from "../models/AttendanceSession.js";
import AttendanceRecord from "../models/AttendanceRecord.js";
import ClassroomMembership from "../models/ClassroomMembership.js";
import AttendanceAppeal from "../models/AttendanceAppeal.js";
import Classroom from "../models/Classroom.js";
import User from "../models/User.js";
import connectDB from "../../config/db.js";

const router = express.Router();

router.use(isAuthenticated, attachInstitutionProfile({ required: false }));

// ── Active Sessions (for home screen banner) ──
router.get("/active-sessions", isAuthenticated, async (req, res) => {
    try {
        await connectDB();
        const userId = req.user._id;
        if (req.user.role !== "student") return res.json({ sessions: [] });

        const memberships = await ClassroomMembership.find({ student: userId, status: "approved" }).select("classroom").lean();
        const classroomIds = memberships.map(m => m.classroom);
        if (!classroomIds.length) return res.json({ sessions: [] });

        const activeSessions = await AttendanceSession.find({
            classroom: { $in: classroomIds },
            status: "active",
            expiresAt: { $gt: new Date() }
        }).lean();

        if (!activeSessions.length) return res.json({ sessions: [] });

        const classroomDocs = await Classroom.find({ _id: { $in: activeSessions.map(s => s.classroom) } })
            .select("name subject").lean();
        const classMap = Object.fromEntries(classroomDocs.map(c => [c._id.toString(), c]));

        const sessions = activeSessions.map(s => {
            const cls = classMap[s.classroom.toString()] || {};
            return {
                sessionId: s._id,
                classroomId: s.classroom,
                classroomName: cls.name || "Classroom",
                subject: cls.subject || cls.name || "",
                expiresAt: s.expiresAt,
                sessionToken: s.sessionToken,
                durationSeconds: s.durationSeconds,
            };
        });

        res.json({ sessions });
    } catch (err) {
        console.error("[Active Sessions] Error:", err.message);
        res.status(500).json({ message: "Server error" });
    }
});

// A. GET /dashboard-summary (Fast)
router.get("/dashboard-summary", isAuthenticated, async (req, res) => {
    try {
        await connectDB();
        const userId = req.user._id;
        const isStudent = req.user.role === "student";

        if (isStudent) {
            // Fast student overview
            const memberships = await ClassroomMembership.find({ student: userId, status: "approved" }).select("classroom").lean();
            if (!memberships.length) return res.json({ overallAttendance: 0, totalPresent: 0, totalAbsent: 0, currentStreak: 0, riskLevel: "Safe" });

            const classroomIds = memberships.map(m => m.classroom);
            const totalSessions = await AttendanceSession.countDocuments({ classroom: { $in: classroomIds } });
            const totalPresent = await AttendanceRecord.countDocuments({ student: userId, classroom: { $in: classroomIds } });

            const totalAbsent = Math.max(0, totalSessions - totalPresent);
            const overallAttendance = totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 100) : 0;
            
            // Calculate pseudo streak (last N sessions present)
            let currentStreak = 0;
            const recentSessions = await AttendanceSession.find({ classroom: { $in: classroomIds }, status: "expired" })
                .sort({ createdAt: -1 }).limit(10).select("_id").lean();
            if (recentSessions.length > 0) {
                const recentPresentLogs = await AttendanceRecord.find({ 
                    student: userId, 
                    session: { $in: recentSessions.map(s => s._id) } 
                }).select("session").lean();
                const presentSet = new Set(recentPresentLogs.map(r => r.session.toString()));
                for (const s of recentSessions) {
                    if (presentSet.has(s._id.toString())) currentStreak++;
                    else break;
                }
            }

            let riskLevel = "Safe";
            if (overallAttendance < 65) riskLevel = "Critical";
            else if (overallAttendance < 75) riskLevel = "Warning";

            res.json({ overallAttendance, totalPresent, totalAbsent, currentStreak, riskLevel });
        } else {
            // Quick faculty overview (total sessions created, average class attendance)
            const query = { faculty: userId };
            if (req.query.classroomId) query.classroom = req.query.classroomId;
            
            const sessions = await AttendanceSession.find(query).lean();
            const totalSessions = sessions.length;
            res.json({ totalSessions });
        }
    } catch (err) {
        console.error("[Dashboard] Summary error:", err.message, err.stack);
        res.status(500).json({ message: "Server error", detail: err.message });
    }
});

// B. GET /dashboard-trends
router.get("/dashboard-trends", isAuthenticated, async (req, res) => {
    try {
        await connectDB();
        const userId = req.user._id;
        const isStudent = req.user.role === "student";
        let timeline = [];
        let facultySessions = [];

        if (isStudent) {
            const memberships = await ClassroomMembership.find({ student: userId, status: "approved" }).select("classroom").lean();
            const classroomIds = memberships.map(m => m.classroom);
            const classDocs = await Classroom.find({ _id: { $in: classroomIds } }).select("name subject teacher").populate("teacher", "name").lean();
            const classMap = Object.fromEntries(classDocs.map(c => [c._id.toString(), c]));

            // Fetch 60 days of sessions
            const sixtyDaysAgo = new Date();
            sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
            const recentSessions = await AttendanceSession.find({ 
                classroom: { $in: classroomIds },
                createdAt: { $gte: sixtyDaysAgo }
            }).sort({ createdAt: -1 }).lean();
            
            const sessionIds = recentSessions.map(s => s._id);
            const presentRecords = await AttendanceRecord.find({ student: userId, session: { $in: sessionIds } }).select("session").lean();
            const presentSet = new Set(presentRecords.map(r => r.session.toString()));

            timeline = recentSessions.map(s => {
                const c = classMap[s.classroom.toString()];
                const isPresent = presentSet.has(s._id.toString());
                const status = s.status === 'active' ? (isPresent ? 'Present' : 'Not Yet Updated') : (isPresent ? 'Present' : 'Absent');
                
                const durSec = s.durationSeconds || 0;
                const isQuickMark = durSec === 0 || s.mode === 'manual';
                const dateStr = new Date(s.startsAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

                let dateLine;
                if (isQuickMark) {
                    // Quick Mark: don't show recording time (teacher recorded later, time is misleading)
                    dateLine = `${dateStr} | Quick Mark`;
                } else {
                    const timeStr = new Date(s.startsAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                    dateLine = `${dateStr} \u2022 ${timeStr} | ${Math.floor(durSec/60)} Min`;
                }

                return {
                    sessionId: s._id,
                    classroomId: s.classroom,
                    date: dateLine,
                    subject: c?.subject || c?.name || "Unknown",
                    teacher: c?.teacher?.name || "Faculty",
                    type: isQuickMark ? "Quick Mark" : "Session",
                    status
                };
            });
        } else {
            // Faculty: get their recent sessions across all classrooms (or filtered)
            const query = { faculty: userId };
            if (req.query.classroomId) query.classroom = req.query.classroomId;
            
            const facSessions = await AttendanceSession.find(query)
                .sort({ createdAt: -1 }).limit(20).lean();
            const classroomIds = [...new Set(facSessions.map(s => s.classroom.toString()))];
            const classDocs = await Classroom.find({ _id: { $in: classroomIds } }).select("name subject").lean();
            const classMap = Object.fromEntries(classDocs.map(c => [c._id.toString(), c]));

            // Get membership counts per classroom for attendance %
            const memberCounts = {};
            for (const cid of classroomIds) {
                memberCounts[cid] = await ClassroomMembership.countDocuments({ classroom: cid, status: "approved" });
            }

            facultySessions = facSessions.map(s => {
                const c = classMap[s.classroom.toString()];
                const total = memberCounts[s.classroom.toString()] || 1;
                const pct = Math.round(((s.presentCount || 0) / total) * 100);
                return {
                    sessionId: s._id,
                    classroomId: s.classroom,
                    classroomName: c?.subject || c?.name || "Classroom",
                    date: s.mode === 'manual' || (s.durationSeconds === 0) 
                        ? new Date(s.startsAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + " · Quick Mark"
                        : new Date(s.startsAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + " · " + new Date(s.startsAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                    presentCount: s.presentCount || 0,
                    totalStudents: total,
                    attendancePct: pct,
                    status: s.status
                };
            });
        }

        res.json({
            timeline,
            facultySessions
        });
    } catch (err) {
        console.error("[Dashboard Trends] Error:", err.message, err.stack);
        res.status(500).json({ message: "Server error", detail: err.message });
    }
});

// C. GET /dashboard-insights
router.get("/dashboard-insights", isAuthenticated, async (req, res) => {
    try {
        await connectDB();
        const userId = req.user._id;
        const isStudent = req.user.role === "student";

        if (isStudent) {
            const memberships = await ClassroomMembership.find({ student: userId, status: "approved" }).select("classroom").lean();
            const classroomIds = memberships.map(m => m.classroom);
            const totalSessions = await AttendanceSession.countDocuments({ classroom: { $in: classroomIds } });
            const totalPresent = await AttendanceRecord.countDocuments({ student: userId, classroom: { $in: classroomIds } });

            const percentage = totalSessions > 0 ? (totalPresent / totalSessions) * 100 : 0;
            let recoveryTarget = 0;
            let bunkAllowance = 0;

            if (percentage < 75 && totalSessions > 0) {
                // How many more 100% classes needed to push percentage to 75%
                // (present + x) / (total + x) = 0.75
                // p + x = 0.75t + 0.75x => 0.25x = 0.75t - p => x = 3t - 4p
                recoveryTarget = Math.max(0, Math.ceil(3 * totalSessions - 4 * totalPresent));
            } else if (percentage >= 75 && totalSessions > 0) {
                // present / (total + x) = 0.75 => x = (4p - 3t) / 3
                bunkAllowance = Math.max(0, Math.floor((4 * totalPresent - 3 * totalSessions) / 3));
            }

            res.json({
                velocity: 0,
                recoveryTarget,
                bunkAllowance,
                message: recoveryTarget > 0 ? `⚠ You need ${recoveryTarget} more classes to stay above 75%` : `You can safely miss ${bunkAllowance} classes.`
            });
        } else {
            // Faculty insights logic: velocity
            res.json({ velocityAlerts: [] });
        }
    } catch (err) {
        console.error("[Dashboard Insights] Error:", err.message, err.stack);
        res.status(500).json({ message: "Server error", detail: err.message });
    }
});

router.post("/:classroomId/bulk-override", isAuthenticated, requireClassroomOwner, async (req, res) => {
    try {
        await connectDB();
        const { sessionId, action, confirmOverwrite } = req.body;
        if (!confirmOverwrite) return res.status(400).json({ message: "Risk confirmation required." });
        if (action !== "all_present" && action !== "all_absent") return res.status(400).json({ message: "Invalid action." });

        const session = await AttendanceSession.findById(sessionId);
        if (!session || session.classroom.toString() !== req.params.classroomId) return res.status(404).json({ message: "Session not found." });

        const memberships = await ClassroomMembership.find({ classroom: req.params.classroomId, status: "approved" }).select("student").lean();
        const studentIds = memberships.map(m => m.student);

        if (action === "all_absent") {
            await AttendanceRecord.deleteMany({ session: sessionId });
            session.presentCount = 0;
            await session.save();
        } else if (action === "all_present") {
            const bulkOps = studentIds.map(sid => ({
                updateOne: {
                    filter: { session: sessionId, student: sid },
                    update: { $setOnInsert: { classroom: req.params.classroomId, markedAt: new Date(), status: "present", suspicionReasons: [] } },
                    upsert: true
                }
            }));
            await AttendanceRecord.bulkWrite(bulkOps);
            session.presentCount = studentIds.length;
            await session.save();
        }
        res.json({ message: `Successfully marked ${action === 'all_present' ? 'all present' : 'all absent'}.` });
    } catch (err) {
        console.error("[Bulk Override] Error:", err.message, err.stack);
        res.status(500).json({ message: "Server error", detail: err.message });
    }
});

// E. POST /:classroomId/appeal
router.post("/:classroomId/appeal", isAuthenticated, requireClassroomMember, async (req, res) => {
    try {
        await connectDB();
        const { sessionId, reason } = req.body;
        if (!sessionId || !reason) return res.status(400).json({ message: "Reason is required." });

        const existing = await AttendanceAppeal.findOne({ session: sessionId, student: req.user._id });
        if (existing) return res.status(409).json({ message: "You have already submitted an appeal for this session." });

        await AttendanceAppeal.create({
            session: sessionId,
            classroom: req.params.classroomId,
            student: req.user._id,
            reason
        });

        res.json({ message: "Appeal submitted successfully." });
    } catch (err) {
        console.error("[Appeal] Error:", err.message, err.stack);
        res.status(500).json({ message: "Server error", detail: err.message });
    }
});

// F. GET /:classroomId/export
router.get("/:classroomId/export", isAuthenticated, requireClassroomOwner, async (req, res) => {
    try {
        res.json({ message: "Export ready (stub)", data: [] });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// G. GET /classroom-members/:classroomId — Fetch student list for Quick Mark
router.get("/classroom-members/:classroomId", isAuthenticated, async (req, res) => {
    try {
        await connectDB();
        const members = await ClassroomMembership.find({ 
            classroom: req.params.classroomId, 
            status: "approved" 
        }).populate("student", "name email prn profilePicture").lean();
        
        const students = members
            .filter(m => m.student) // safety check
            .map(m => ({
                _id: m.student._id,
                name: m.student.name,
                email: m.student.email,
                prn: m.student.prn || null,
                avatar: m.student.profilePicture || null,
            }));
        
        res.json({ students });
    } catch (err) {
        console.error("[Classroom Members] Error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// H. GET /subject-stats — Per-subject + weekly attendance breakdown for student analytics
router.get("/subject-stats", isAuthenticated, async (req, res) => {
    try {
        await connectDB();
        const userId = req.user._id;
        if (req.user.role !== "student") return res.json({ subjects: [] });

        const memberships = await ClassroomMembership.find({ student: userId, status: "approved" })
            .select("classroom").lean();
        const classroomIds = memberships.map(m => m.classroom);
        if (!classroomIds.length) return res.json({ subjects: [], weeklyPct: 0, monthlyPct: 0 });

        const classDocs = await Classroom.find({ _id: { $in: classroomIds } })
            .select("name subject teacher").populate("teacher", "name").lean();
        const classMap = Object.fromEntries(classDocs.map(c => [c._id.toString(), c]));

        // All sessions for student's classrooms
        const allSessions = await AttendanceSession.find({ classroom: { $in: classroomIds } })
            .select("classroom createdAt status").lean();
        const sessionIds = allSessions.map(s => s._id);

        // All present records for this student
        const presentRecords = await AttendanceRecord.find({ student: userId, session: { $in: sessionIds } })
            .select("session classroom").lean();
        const presentSessionIds = new Set(presentRecords.map(r => r.session.toString()));

        // Filter sessions by period if requested
        const period = req.query.period || 'semester';
        let filteredSessions = allSessions;
        
        if (period === 'week') {
            const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
            filteredSessions = allSessions.filter(s => new Date(s.createdAt) >= weekAgo);
        } else if (period === 'month') {
            const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30);
            filteredSessions = allSessions.filter(s => new Date(s.createdAt) >= monthAgo);
        }

        // Group by classroom using filtered sessions
        const byClassroom = {};
        for (const s of filteredSessions) {
            const cid = s.classroom.toString();
            if (!byClassroom[cid]) byClassroom[cid] = { total: 0, attended: 0 };
            byClassroom[cid].total++;
            if (presentSessionIds.has(s._id.toString())) byClassroom[cid].attended++;
        }

        // Helper to calc pct for a subset
        const calcPct = (sessionsSubset, targetCid) => {
            const classSessions = sessionsSubset.filter(s => s.classroom.toString() === targetCid);
            if (!classSessions.length) return null; // No sessions, no trend
            const total = classSessions.length;
            const attended = classSessions.filter(s => presentSessionIds.has(s._id.toString())).length;
            return Math.round((attended / total) * 100);
        };

        const subjects = classDocs.map(c => {
            const cid = c._id.toString();
            const stats = byClassroom[cid] || { total: 0, attended: 0 };
            const pct = stats.total > 0 ? Math.round((stats.attended / stats.total) * 100) : 0;
            
            let currentPctForTrend = pct;
            let prevPctForTrend = 0;

            const now = new Date();
            if (period === 'week') {
                const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
                const twoWeeksAgo = new Date(now); twoWeeksAgo.setDate(now.getDate() - 14);
                const prev = allSessions.filter(s => new Date(s.createdAt) >= twoWeeksAgo && new Date(s.createdAt) < weekAgo);
                prevPctForTrend = calcPct(prev, cid);
            } else if (period === 'month') {
                const monthAgo = new Date(now); monthAgo.setDate(now.getDate() - 30);
                const twoMonthsAgo = new Date(now); twoMonthsAgo.setDate(now.getDate() - 60);
                const prev = allSessions.filter(s => new Date(s.createdAt) >= twoMonthsAgo && new Date(s.createdAt) < monthAgo);
                prevPctForTrend = calcPct(prev, cid);
            } else {
                // Semester view -> Weekly velocity
                const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
                const twoWeeksAgo = new Date(now); twoWeeksAgo.setDate(now.getDate() - 14);
                const currStr = allSessions.filter(s => new Date(s.createdAt) >= weekAgo);
                const prevStr = allSessions.filter(s => new Date(s.createdAt) >= twoWeeksAgo && new Date(s.createdAt) < weekAgo);
                currentPctForTrend = calcPct(currStr, cid);
                prevPctForTrend = calcPct(prevStr, cid);
            }

            let trend = 0;
            let trendLabel = "";
            let trendVal = 0; // The actual numerical change

            if (currentPctForTrend !== null && prevPctForTrend !== null) {
                 trendVal = currentPctForTrend - prevPctForTrend;
                 trendLabel = trendVal > 0 ? `+${trendVal}%` : trendVal < 0 ? `${trendVal}%` : "Stable";
            } else if (currentPctForTrend !== null && prevPctForTrend === null) {
                 trendLabel = "New"; // No data in previous period
                 trendVal = 1; // Positive indicator
            } else if (currentPctForTrend === null) {
                 trendLabel = "—";
                 trendVal = 0;
            }

            return {
                classroomId: cid,
                subject: c.subject || c.name,
                teacher: c.teacher?.name || "Faculty",
                total: stats.total,
                attended: stats.attended,
                absent: stats.total - stats.attended,
                pct,
                trend: trendLabel,
                trendVal: trendVal
            };
        });

        // Weekly % (sessions in last 7 days)
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        const weekSessions = allSessions.filter(s => new Date(s.createdAt) >= weekAgo);
        const weekPresent = weekSessions.filter(s => presentSessionIds.has(s._id.toString())).length;
        const weeklyPct = weekSessions.length > 0 ? Math.round((weekPresent / weekSessions.length) * 100) : 0;

        // Monthly % (sessions in last 30 days)
        const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30);
        const monthSessions = allSessions.filter(s => new Date(s.createdAt) >= monthAgo);
        const monthPresent = monthSessions.filter(s => presentSessionIds.has(s._id.toString())).length;
        const monthlyPct = monthSessions.length > 0 ? Math.round((monthPresent / monthSessions.length) * 100) : 0;

        res.json({ subjects, weeklyPct, monthlyPct, weekTotal: weekSessions.length, monthTotal: monthSessions.length });
    } catch (err) {
        console.error("[Subject Stats] Error:", err.message, err.stack);
        res.status(500).json({ message: "Server error", detail: err.message });
    }
});

export default router;
