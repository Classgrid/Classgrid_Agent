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
import { getStudentAggregatedAnalytics } from "../services/analytics.service.js";
import Classroom from "../models/Classroom.js";
import User from "../models/User.js";
import { primarySupabaseClient as supabase } from "../config/supabaseClient.js";
import Groq from "groq-sdk";

const router = express.Router();
const groq = new Groq({ apiKey: process.env.CLOUDFLARE_WORKERS_AI_TOKEN, baseURL: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1` });

// ═══════════════════════════════════════════════════════════════
// STUDENT ANALYTICS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/analytics/student/:id
 * Full aggregated performance dashboard for one student.
 * Students can only view their own data. Faculty/Admin can view any.
 */
router.get("/student/:id", isAuthenticated, async (req, res) => {
    try {
        const studentId = req.params.id;
        const requesterId = req.user._id ? req.user._id.toString() : req.user.id;

        // ACL: students can only see their own analytics
        if (req.user.role === 'student' && requesterId !== studentId) {
            return res.status(403).json({ error: "Access denied" });
        }

        const analytics = await getStudentAggregatedAnalytics(studentId);
        res.json(analytics);
    } catch (err) {
        console.error("[Analytics] Student Error:", err);
        res.status(500).json({ error: "Failed to fetch student analytics" });
    }
});

/**
 * GET /api/analytics/student/:id/ai-summary
 * AI-generated one-paragraph performance summary.
 * Uses Groq LLaMA 3.3 as a virtual academic counselor.
 */
router.get("/student/:id/ai-summary", isAuthenticated, async (req, res) => {
    try {
        const studentId = req.params.id;
        const analytics = await getStudentAggregatedAnalytics(studentId);

        // Fetch student name for personalization
        const student = await User.findById(studentId).select('name').lean();
        const firstName = (student?.name || 'Student').split(' ')[0];

        const prompt = `You are an expert academic counselor for the Classgrid education platform.
Analyze the following student data for ${firstName} and provide a professional, encouraging performance summary.

STUDENT METRICS:
- Health Score (composite): ${analytics.healthScore}/100
- Attendance: ${analytics.overview.attendance}% (${analytics.counts.attendedSessions}/${analytics.counts.totalSessions} sessions)
- Assignment Completion: ${analytics.overview.assignmentCompletion}% (${analytics.counts.assignmentsSubmitted}/${analytics.counts.totalAssignments} submitted)
- Academic Exam Score: ${analytics.overview.academicPerformance}% across ${analytics.counts.examsTaken} exams and ${analytics.counts.quizzesTaken} quizzes
- AI Viva Score: ${analytics.overview.vivaScore}/5 across ${analytics.counts.vivaSessions} sessions
- Viva Parameters: Knowledge ${analytics.overview.vivaParameterAverages.knowledge}/5, Clarity ${analytics.overview.vivaParameterAverages.clarity}/5, Confidence ${analytics.overview.vivaParameterAverages.confidence}/5, Accuracy ${analytics.overview.vivaParameterAverages.accuracy}/5
- Leaves Taken: ${analytics.leaveStats.totalDaysOff} days (${analytics.leaveStats.approved} approved, ${analytics.leaveStats.pending} pending)
- Persistent Weak Areas: ${analytics.insights.weakAreas.map(w => w.area).join(", ") || "None identified yet"}
- Strong Areas: ${analytics.insights.strongAreas.map(s => s.area).join(", ") || "None identified yet"}
- Suspicious Attendance Flags: ${analytics.counts.suspiciousSessions}

INSTRUCTIONS:
1. Address the student by first name warmly.
2. Start with their overall Health Score and what it means.
3. Identify their SINGLE biggest strength and SINGLE biggest concern.
4. If attendance is below 75%, flag it as a regulatory risk (Indian university rules).
5. If they have suspicious attendance flags, mention it diplomatically.
6. Provide ONE specific, actionable study tip for the upcoming week.
7. End with an encouraging sentence.
8. Use clean emojis. Keep the entire response under 200 words.`;

        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: '@cf/deepseek-ai/deepseek-v4-pro-0813',
            temperature: 0.7,
            max_tokens: 400
        });

        const summary = completion.choices[0].message.content;
        res.json({ summary, healthScore: analytics.healthScore });
    } catch (err) {
        console.error("[Analytics] AI Summary Error:", err);
        res.status(500).json({ error: "Failed to generate AI performance summary" });
    }
});


// ═══════════════════════════════════════════════════════════════
// FACULTY / CLASSROOM ANALYTICS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/analytics/classroom/:classroomId
 * Classroom-level analytics for faculty.
 * Shows overall class performance, attendance averages, top/bottom students.
 */
router.get("/classroom/:classroomId", isAuthenticated, requireRole("faculty", "org_admin"), async (req, res) => {
    try {
        const { classroomId } = req.params;

        // 1. Get all students in this classroom
        const { data: members } = await supabase
            .from('classroom_memberships')
            .select('student_id')
            .eq('classroom_id', classroomId)
            .eq('status', 'approved');

        const studentIds = (members || []).map(m => m.student_id);
        if (studentIds.length === 0) {
            return res.json({ totalStudents: 0, classAvg: {}, students: [] });
        }

        // 2. Get student names from MongoDB
        const students = await User.find({ _id: { $in: studentIds } })
            .select('name email prn profilePicture')
            .lean();
        const studentMap = {};
        students.forEach(s => { studentMap[s._id.toString()] = s; });

        // 3. Get exam attempts for this classroom's exams
        const { data: exams } = await supabase
            .from('online_exams')
            .select('id')
            .eq('classroom_id', classroomId);
        const examIds = (exams || []).map(e => e.id);

        let examAttempts = [];
        if (examIds.length > 0) {
            const { data } = await supabase
                .from('online_exam_attempts')
                .select('user_id, score, total_marks, is_submitted')
                .in('exam_id', examIds)
                .eq('is_submitted', true);
            examAttempts = data || [];
        }

        // 4. Get quiz attempts for this classroom's quizzes
        const { data: quizzes } = await supabase
            .from('advanced_quizzes')
            .select('id')
            .eq('classroom_id', classroomId);
        const quizIds = (quizzes || []).map(q => q.id);

        let quizAttemptsList = [];
        if (quizIds.length > 0) {
            const { data } = await supabase
                .from('quiz_attempts')
                .select('user_id, score, total_marks, is_submitted')
                .in('quiz_id', quizIds)
                .eq('is_submitted', true);
            quizAttemptsList = data || [];
        }

        // 5. Get attendance data
        const classObjId = new (await import('mongoose')).default.Types.ObjectId(classroomId);
        const { default: AttendanceSession } = await import("../models/AttendanceSession.js");
        const { default: AttendanceRecord } = await import("../models/AttendanceRecord.js");

        const totalSessions = await AttendanceSession.countDocuments({ classroom: classObjId });
        const allRecords = await AttendanceRecord.find({ classroom: classObjId })
            .select('student status')
            .lean();

        // 6. Build per-student summary
        const studentSummaries = studentIds.map(sid => {
            const info = studentMap[sid] || { name: 'Unknown' };

            // Attendance for this student
            const presentCount = allRecords.filter(r => r.student.toString() === sid && r.status === 'present').length;
            const attPct = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;

            // Exam scores for this student
            const studentExams = examAttempts.filter(a => a.user_id === sid);
            const examAvg = studentExams.length > 0
                ? Math.round(studentExams.reduce((sum, a) => sum + ((a.score / (a.total_marks || 100)) * 100), 0) / studentExams.length)
                : null;

            // Quiz scores for this student
            const studentQuizzes = quizAttemptsList.filter(a => a.user_id === sid);
            const quizAvg = studentQuizzes.length > 0
                ? Math.round(studentQuizzes.reduce((sum, a) => sum + ((a.score / (a.total_marks || 100)) * 100), 0) / studentQuizzes.length)
                : null;

            return {
                userId: sid,
                name: info.name,
                prn: info.prn || 'N/A',
                email: info.email || '',
                attendance: attPct,
                examAvg,
                quizAvg,
                examsTaken: studentExams.length,
                quizzesTaken: studentQuizzes.length
            };
        });

        // Sort by attendance (lowest first — faculty needs to see at-risk students)
        studentSummaries.sort((a, b) => a.attendance - b.attendance);

        // Class averages
        const validAttendances = studentSummaries.map(s => s.attendance);
        const validExamAvgs = studentSummaries.filter(s => s.examAvg !== null).map(s => s.examAvg);
        const validQuizAvgs = studentSummaries.filter(s => s.quizAvg !== null).map(s => s.quizAvg);

        const classAvg = {
            attendance: validAttendances.length > 0 ? Math.round(validAttendances.reduce((a, b) => a + b, 0) / validAttendances.length) : 0,
            examScore: validExamAvgs.length > 0 ? Math.round(validExamAvgs.reduce((a, b) => a + b, 0) / validExamAvgs.length) : 0,
            quizScore: validQuizAvgs.length > 0 ? Math.round(validQuizAvgs.reduce((a, b) => a + b, 0) / validQuizAvgs.length) : 0
        };

        res.json({
            totalStudents: studentIds.length,
            totalSessions,
            totalExams: examIds.length,
            totalQuizzes: quizIds.length,
            classAvg,
            students: studentSummaries
        });
    } catch (err) {
        console.error("[Analytics] Classroom Error:", err);
        res.status(500).json({ error: "Failed to fetch classroom analytics" });
    }
});


// ═══════════════════════════════════════════════════════════════
// LEAVE DAILY OVERVIEW
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/analytics/leave/daily
 * Faculty dashboard: Shows today's leave status across all their classrooms.
 * Who is absent today? Who has pending requests?
 */
router.get("/leave/daily", isAuthenticated, requireRole("faculty", "org_admin"), async (req, res) => {
    try {
        const teacherId = req.user._id ? req.user._id.toString() : req.user.id;
        const { date } = req.query; // Optional: ?date=2026-04-11
        const targetDate = date || new Date().toISOString().split('T')[0];

        // 1. Get all leaves for today assigned to this teacher
        const { data: todayLeaves, error } = await supabase
            .from('leave_requests')
            .select('*')
            .eq('teacher_id', teacherId)
            .lte('from_date', targetDate)
            .gte('to_date', targetDate)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // 2. Populate student names
        const studentIds = [...new Set((todayLeaves || []).map(l => l.student_id))];
        const students = await User.find({ _id: { $in: studentIds } })
            .select('name prn email profilePicture')
            .lean();
        const studentMap = {};
        students.forEach(s => { studentMap[s._id.toString()] = s; });

        // 3. Get pending requests (any date, not just today)
        const { data: pendingRequests } = await supabase
            .from('leave_requests')
            .select('*')
            .eq('teacher_id', teacherId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        // Populate pending student names
        const pendingStudentIds = [...new Set((pendingRequests || []).map(l => l.student_id))];
        const pendingStudents = await User.find({ _id: { $in: pendingStudentIds } })
            .select('name prn')
            .lean();
        pendingStudents.forEach(s => {
            if (!studentMap[s._id.toString()]) studentMap[s._id.toString()] = s;
        });

        const enrichLeave = (leave) => ({
            ...leave,
            student: studentMap[leave.student_id] || { name: 'Unknown' }
        });

        // 4. Summary
        const approvedToday = (todayLeaves || []).filter(l => l.status === 'approved' || l.status === 'quick');
        const absentCount = approvedToday.length;

        res.json({
            date: targetDate,
            summary: {
                absentToday: absentCount,
                pendingRequests: (pendingRequests || []).length,
                totalLeavesToday: (todayLeaves || []).length
            },
            absentStudents: approvedToday.map(enrichLeave),
            pendingApprovals: (pendingRequests || []).map(enrichLeave),
            allLeavesToday: (todayLeaves || []).map(enrichLeave)
        });
    } catch (err) {
        console.error("[Analytics] Leave Daily Error:", err);
        res.status(500).json({ error: "Failed to fetch daily leave overview" });
    }
});

/**
 * GET /api/analytics/leave/stats/:classroomId
 * Leave statistics for a specific classroom — monthly patterns, frequent absentees.
 */
router.get("/leave/stats/:classroomId", isAuthenticated, requireRole("faculty", "org_admin"), async (req, res) => {
    try {
        const { classroomId } = req.params;

        // Get all leaves for this classroom
        const { data: leaves } = await supabase
            .from('leave_requests')
            .select('student_id, status, leave_type, from_date, total_days')
            .eq('classroom_id', classroomId)
            .order('from_date', { ascending: false });

        if (!leaves || leaves.length === 0) {
            return res.json({ totalLeaves: 0, frequentAbsentees: [], monthlyBreakdown: {} });
        }

        // Frequent absentees
        const studentLeaveCounts = {};
        leaves.forEach(l => {
            if (l.status === 'approved' || l.status === 'quick') {
                studentLeaveCounts[l.student_id] = (studentLeaveCounts[l.student_id] || 0) + (l.total_days || 1);
            }
        });

        const topAbsentees = Object.entries(studentLeaveCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10);

        // Fetch names for top absentees
        const absenteeIds = topAbsentees.map(([id]) => id);
        const absStudents = await User.find({ _id: { $in: absenteeIds } })
            .select('name prn')
            .lean();
        const absMap = {};
        absStudents.forEach(s => { absMap[s._id.toString()] = s; });

        const frequentAbsentees = topAbsentees.map(([id, days]) => ({
            userId: id,
            name: absMap[id]?.name || 'Unknown',
            prn: absMap[id]?.prn || 'N/A',
            totalDaysOff: days
        }));

        // Monthly breakdown
        const monthlyBreakdown = {};
        leaves.forEach(l => {
            const month = l.from_date ? l.from_date.substring(0, 7) : 'unknown'; // YYYY-MM
            if (!monthlyBreakdown[month]) monthlyBreakdown[month] = { total: 0, approved: 0, rejected: 0 };
            monthlyBreakdown[month].total++;
            if (l.status === 'approved' || l.status === 'quick') monthlyBreakdown[month].approved++;
            if (l.status === 'rejected') monthlyBreakdown[month].rejected++;
        });

        res.json({
            totalLeaves: leaves.length,
            frequentAbsentees,
            monthlyBreakdown
        });
    } catch (err) {
        console.error("[Analytics] Leave Stats Error:", err);
        res.status(500).json({ error: "Failed to fetch leave statistics" });
    }
});

export default router;
