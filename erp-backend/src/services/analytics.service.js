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

import AttendanceRecord from "../models/AttendanceRecord.js";
import AttendanceSession from "../models/AttendanceSession.js";
import Assignment from "../models/Assignment.js";
import AssignmentSubmission from "../models/AssignmentSubmission.js";
import Classroom from "../models/Classroom.js";
import VivaRecord from "../models/VivaRecord.js";
import { primarySupabaseClient as supabase } from "../config/supabaseClient.js";
import mongoose from "mongoose";

/**
 * Aggregates complete analytics for a student across all their classrooms.
 * Used by GET /api/analytics/student/:id
 *
 * @param {string} studentId  MongoDB/Clerk user ID
 * @returns {object}          Full analytics payload
 */
export async function getStudentAggregatedAnalytics(studentId) {
    const studentObjectId = new mongoose.Types.ObjectId(studentId);

    // ─── 0. Resolve student's classrooms ────────────────────────────
    const { data: memberRows } = await supabase
        .from('classroom_memberships')
        .select('classroom_id')
        .eq('student_id', studentId)
        .eq('status', 'approved');

    const classroomIds = (memberRows || []).map(m => m.classroom_id);
    const classroomObjectIds = classroomIds.map(id => {
        try { return new mongoose.Types.ObjectId(id); } catch { return null; }
    }).filter(Boolean);

    // Fetch classroom names for per-subject breakdown
    const classrooms = await Classroom.find({ _id: { $in: classroomObjectIds } })
        .select('_id name subject')
        .lean();
    const classMap = {};
    classrooms.forEach(c => { classMap[c._id.toString()] = c; });

    // ─── 1. Attendance — scoped to student's classrooms ─────────────
    const totalSessions = await AttendanceSession.countDocuments({
        classroom: { $in: classroomObjectIds }
    });
    const attendedRecords = await AttendanceRecord.find({
        student: studentObjectId,
        classroom: { $in: classroomObjectIds }
    }).select('classroom status').lean();

    const attendedSessions = attendedRecords.filter(r => r.status === 'present').length;
    const suspiciousSessions = attendedRecords.filter(r => r.status === 'present_suspicious').length;
    const attendancePercentage = totalSessions > 0 ? Math.round((attendedSessions / totalSessions) * 100) : 0;

    // Per-classroom attendance breakdown
    const attendanceByClass = {};
    for (const cId of classroomIds) {
        const cObjId = classroomObjectIds.find(o => o.toString() === cId);
        if (!cObjId) continue;
        const classSessions = await AttendanceSession.countDocuments({ classroom: cObjId });
        const classPresent = attendedRecords.filter(r => r.classroom.toString() === cId && r.status === 'present').length;
        attendanceByClass[cId] = {
            name: classMap[cId]?.name || 'Unknown',
            subject: classMap[cId]?.subject || '',
            totalSessions: classSessions,
            attended: classPresent,
            percentage: classSessions > 0 ? Math.round((classPresent / classSessions) * 100) : 0
        };
    }

    // ─── 2. Assignments — scoped to student's classrooms ────────────
    const totalAssignments = await Assignment.countDocuments({ classroom: { $in: classroomObjectIds } });
    const submittedAssignments = await AssignmentSubmission.countDocuments({ student: studentObjectId });
    const pendingAssignments = totalAssignments - submittedAssignments;
    const assignmentCompletionRate = totalAssignments > 0
        ? Math.round((submittedAssignments / totalAssignments) * 100)
        : 0;

    // ─── 3. Exams + Quizzes from Supabase ───────────────────────────
    const { data: examAttempts } = await supabase
        .from('online_exam_attempts')
        .select('score, total_marks, is_submitted, exam_id, submitted_at')
        .eq('user_id', studentId)
        .eq('is_submitted', true);

    const { data: quizAttempts } = await supabase
        .from('quiz_attempts')
        .select('score, total_marks, is_submitted, quiz_id, submitted_at')
        .eq('user_id', studentId)
        .eq('is_submitted', true);

    const allAttempts = [...(examAttempts || []), ...(quizAttempts || [])];
    const totalPossibleMarks = allAttempts.reduce((sum, a) => sum + (a.total_marks || 100), 0);
    const totalScoredMarks = allAttempts.reduce((sum, a) => sum + (a.score || 0), 0);
    const averageAcademicScore = totalPossibleMarks > 0
        ? Math.round((totalScoredMarks / totalPossibleMarks) * 100)
        : 0;

    // Exam score trend (latest 10, oldest first for graph plotting)
    const examTrend = (examAttempts || [])
        .sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at))
        .slice(-10)
        .map(a => ({
            date: a.submitted_at,
            score: a.score,
            total: a.total_marks || 100,
            percentage: Math.round(((a.score || 0) / (a.total_marks || 100)) * 100)
        }));

    const quizTrend = (quizAttempts || [])
        .sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at))
        .slice(-10)
        .map(a => ({
            date: a.submitted_at,
            score: a.score,
            total: a.total_marks || 100,
            percentage: Math.round(((a.score || 0) / (a.total_marks || 100)) * 100)
        }));

    // ─── 4. Viva Performance ────────────────────────────────────────
    const vivaSessions = await VivaRecord.find({ userId: studentId })
        .sort({ createdAt: -1 })
        .select('totalScore parameters weakAreas strongAreas topic mode createdAt metadata')
        .lean();

    const avgVivaScore = vivaSessions.length > 0
        ? Math.round((vivaSessions.reduce((sum, v) => sum + v.totalScore, 0) / vivaSessions.length) * 10) / 10
        : 0;

    // Viva parameter averages
    const vivaParamAvg = { knowledge: 0, clarity: 0, confidence: 0, accuracy: 0 };
    if (vivaSessions.length > 0) {
        vivaSessions.forEach(v => {
            vivaParamAvg.knowledge += (v.parameters?.knowledge || 0);
            vivaParamAvg.clarity += (v.parameters?.clarity || 0);
            vivaParamAvg.confidence += (v.parameters?.confidence || 0);
            vivaParamAvg.accuracy += (v.parameters?.accuracy || 0);
        });
        const count = vivaSessions.length;
        vivaParamAvg.knowledge = Math.round((vivaParamAvg.knowledge / count) * 10) / 10;
        vivaParamAvg.clarity = Math.round((vivaParamAvg.clarity / count) * 10) / 10;
        vivaParamAvg.confidence = Math.round((vivaParamAvg.confidence / count) * 10) / 10;
        vivaParamAvg.accuracy = Math.round((vivaParamAvg.accuracy / count) * 10) / 10;
    }

    // Viva score trend (oldest first for graph)
    const vivaTrend = vivaSessions
        .slice()
        .reverse()
        .map(v => ({
            date: v.createdAt,
            topic: v.topic,
            score: v.totalScore,
            mode: v.mode,
            thinkingTimeAvg: v.metadata?.thinkingTimeAvg || null
        }));

    // ─── 5. Weak/Strong Areas (aggregated from viva + exam topics) ──
    const weakFrequency = {};
    const strongFrequency = {};
    vivaSessions.forEach(v => {
        (v.weakAreas || []).forEach(a => { weakFrequency[a] = (weakFrequency[a] || 0) + 1; });
        (v.strongAreas || []).forEach(a => { strongFrequency[a] = (strongFrequency[a] || 0) + 1; });
    });

    const topWeakAreas = Object.entries(weakFrequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([area, count]) => ({ area, frequency: count }));

    const topStrongAreas = Object.entries(strongFrequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([area, count]) => ({ area, frequency: count }));

    // ─── 6. Leave Stats from Supabase ───────────────────────────────
    const { data: leaveData } = await supabase
        .from('leave_requests')
        .select('status, leave_type, total_days')
        .eq('student_id', studentId);

    const leaves = leaveData || [];
    const leaveStats = {
        total: leaves.length,
        approved: leaves.filter(l => l.status === 'approved').length,
        rejected: leaves.filter(l => l.status === 'rejected').length,
        pending: leaves.filter(l => l.status === 'pending').length,
        totalDaysOff: leaves
            .filter(l => l.status === 'approved' || l.status === 'quick')
            .reduce((sum, l) => sum + (l.total_days || 1), 0)
    };

    // ─── 7. Overall Health Score (0-100 composite) ──────────────────
    // Weighted: Attendance 30% + Academic 30% + Assignments 20% + Viva 20%
    const vivaScoreNormalized = (avgVivaScore / 5) * 100;
    const healthScore = Math.round(
        (attendancePercentage * 0.3) +
        (averageAcademicScore * 0.3) +
        (assignmentCompletionRate * 0.2) +
        (vivaScoreNormalized * 0.2)
    );

    return {
        studentId,
        healthScore,
        overview: {
            attendance: attendancePercentage,
            assignmentCompletion: assignmentCompletionRate,
            academicPerformance: averageAcademicScore,
            vivaScore: avgVivaScore,
            vivaParameterAverages: vivaParamAvg
        },
        counts: {
            totalClassrooms: classroomIds.length,
            totalSessions,
            attendedSessions,
            suspiciousSessions,
            totalAssignments,
            assignmentsSubmitted: submittedAssignments,
            pendingAssignments,
            examsTaken: (examAttempts || []).length,
            quizzesTaken: (quizAttempts || []).length,
            vivaSessions: vivaSessions.length
        },
        trends: {
            examScores: examTrend,
            quizScores: quizTrend,
            vivaScores: vivaTrend
        },
        insights: {
            weakAreas: topWeakAreas,
            strongAreas: topStrongAreas
        },
        attendanceByClassroom: attendanceByClass,
        leaveStats
    };
}

/**
 * Aggregates performance analytics for a faculty member.
 * Includes feedback ratings, attendance delivery, and classroom health.
 */
export async function getFacultyAggregatedAnalytics(facultyId, orgId) {
    // 1. Resolve faculty's classrooms
    const classrooms = await Classroom.find({ faculty: facultyId, organization: orgId })
        .select("_id name subject")
        .lean();
    const classroomIds = classrooms.map(c => c._id.toString());

    // 2. Attendance stats (Sessions conducted)
    const sessions = await AttendanceSession.find({ classroom: { $in: classroomIds } }).select("presentCount status").lean();
    const totalSessions = sessions.length;
    const totalPresentMarked = sessions.reduce((sum, s) => sum + (s.presentCount || 0), 0);

    // 3. Feedback Stats from Supabase
    const { data: feedbackAnalytics } = await supabase
        .from("feedback_analytics")
        .select("avg_rating, total_responses, performance_tag, ai_insights")
        .eq("teacher_id", facultyId)
        .eq("org_id", orgId);

    const avgRating = feedbackAnalytics?.length > 0
        ? parseFloat((feedbackAnalytics.reduce((sum, a) => sum + a.avg_rating, 0) / feedbackAnalytics.length).toFixed(2))
        : 0;
    
    const totalFeedbackResponses = feedbackAnalytics?.reduce((sum, a) => sum + a.total_responses, 0) || 0;

    // 4. Leave Stats (Student requests for this teacher)
    const { data: leaveRequests } = await supabase
        .from("leave_requests")
        .select("status")
        .eq("teacher_id", facultyId);

    const leaveStats = {
        pending: leaveRequests?.filter(l => l.status === "pending").length || 0,
        approved: leaveRequests?.filter(l => l.status === "approved").length || 0,
    };

    return {
        facultyId,
        metrics: {
            avgRating,
            totalFeedbackResponses,
            totalSessionsConducted: totalSessions,
            avgStudentTurnout: totalSessions > 0 ? Math.round(totalPresentMarked / totalSessions) : 0,
        },
        classrooms: classrooms.map(c => ({
            id: c._id,
            name: c.name,
            subject: c.subject,
        })),
        leaveStats,
        feedbackPerformance: feedbackAnalytics?.[0]?.performance_tag || "N/A",
        aiInsights: feedbackAnalytics?.[0]?.ai_insights || null
    };
}
