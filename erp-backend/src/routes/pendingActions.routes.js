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
import Assignment from "../models/Assignment.js";
import AssignmentSubmission from "../models/AssignmentSubmission.js";
import ClassroomMembership from "../models/ClassroomMembership.js";
import Classroom from "../models/Classroom.js";
import Quiz from "../models/Quiz.js";
import NoteView from "../models/NoteView.js";
import Meeting from "../models/Meeting.js";
import AttendanceSession from "../models/AttendanceSession.js";
import AttendanceRecord from "../models/AttendanceRecord.js";
import ExamRecord from "../models/ExamRecord.js";
import StudentMark from "../models/StudentMark.js";
import { studentNotesClient, primarySupabaseClient } from "../config/supabaseClient.js";

const router = express.Router();

// ─────────────────────────────────────────────
// GET /api/pending-actions
// Returns all incomplete tasks for the logged-in student
// Only shows items that are at least 5 hours old
// ─────────────────────────────────────────────
router.get("/", isAuthenticated, async (req, res) => {
    try {
        const userId = req.user._id;
        const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);

        const isStudent = !["faculty", "teacher", "org_admin"].includes(req.user.role);

        if (isStudent) {
            // ==========================================
            // STUDENT LOGIC: Incomplete Tasks
            // ==========================================
            // 1. Get all classrooms this student belongs to
            const memberships = await ClassroomMembership.find({
                student: userId,
                status: "approved",
            }).lean();

            const classroomIds = memberships.map(m => m.classroom);
            if (classroomIds.length === 0) {
                return res.json({ actions: [] });
            }

            // Get classroom details for context labels
            const classrooms = await Classroom.find({ _id: { $in: classroomIds } })
                .select("_id name subject teacher")
                .populate("teacher", "name")
                .lean();
            const classroomMap = {};
            classrooms.forEach(c => {
                classroomMap[c._id.toString()] = c;
            });

            // Run all 6 queries in parallel
            const [pendingAssignments, pendingQuizzes, pendingNotes, pendingAttendance, pendingLeave, pendingResults] = await Promise.all([
                // ── A: Unsubmitted Assignments ──
                (async () => {
                    const assignments = await Assignment.find({
                        classroom: { $in: classroomIds },
                        status: "published",
                        createdAt: { $lte: fiveHoursAgo },
                    }).lean();

                    if (assignments.length === 0) return [];

                    // Get all submissions by this student for these assignments
                    const submittedIds = new Set(
                        (await AssignmentSubmission.find({
                            assignment: { $in: assignments.map(a => a._id) },
                            student: userId,
                        }).select("assignment").lean())
                        .map(s => s.assignment.toString())
                    );

                    return assignments
                        .filter(a => !submittedIds.has(a._id.toString()))
                        .map(a => {
                            const cls = classroomMap[a.classroom.toString()];
                            return {
                                type: "assignment",
                                id: a._id.toString(),
                                title: a.title,
                                context: cls?.name || cls?.subject || "Classroom",
                                deadline: a.dueDate,
                                createdAt: a.createdAt,
                                ctaLabel: "Submit",
                                ctaRoute: `/assignment/${a._id}`,
                            };
                        });
                })(),

                // ── B: Unattempted Quizzes ──
                (async () => {
                    // Find quizzes that were created for notes in student's classrooms
                    // Quiz.noteId maps to Supabase note IDs, and Quiz.createdBy is the teacher
                    const quizzes = await Quiz.find({
                        createdAt: { $lte: fiveHoursAgo },
                    }).lean();

                    if (quizzes.length === 0) return [];

                    // Filter to quizzes this student hasn't attempted
                    // We assume quizzes created recently are active
                    return quizzes
                        .filter(q => !q.attempts?.some(a => a.studentId?.toString() === userId.toString()))
                        .map(q => {
                            return {
                                type: "quiz",
                                id: q._id.toString(),
                                title: q.noteTitle || "Quiz",
                                context: "Quiz",
                                deadline: null,
                                createdAt: q.createdAt,
                                ctaLabel: "Start",
                                ctaRoute: `/quiz/${q.noteId}`,
                            };
                        });
                })(),

                // ── C: Unviewed Notes (from Supabase) ──
                (async () => {
                    try {
                        const orgId = req.user.organization_id;
                        if (!orgId) return [];

                        const { data: notes, error } = await studentNotesClient
                            .from("student_notes")
                            .select("id, title, uploaded_by, organization_id, created_at, uploader_role")
                            .eq("organization_id", orgId.toString())
                            .eq("status", "approved")
                            .lte("created_at", fiveHoursAgo.toISOString())
                            .order("created_at", { ascending: false })
                            .limit(50);

                        if (error || !notes || notes.length === 0) return [];

                        // Get all note IDs this student has viewed
                        const viewedNoteIds = new Set(
                            (await NoteView.find({
                                studentId: userId,
                                noteId: { $in: notes.map(n => n.id.toString()) },
                            }).select("noteId").lean())
                            .map(v => v.noteId)
                        );

                        return notes
                            .filter(n => !viewedNoteIds.has(n.id.toString()))
                            .map(n => ({
                                type: "note",
                                id: n.id.toString(),
                                title: n.title,
                                context: `Uploaded by ${n.uploaded_by || "Faculty"}`,
                                facultyName: n.uploaded_by || "Faculty",
                                deadline: null,
                                createdAt: n.created_at,
                                ctaLabel: "View",
                                ctaRoute: `/notes`,
                            }));
                    } catch (err) {
                        console.error("Pending notes query error:", err.message);
                        return [];
                    }
                })(),

                // ── D: Missed Attendance Sessions (last 7 days) ──
                (async () => {
                    try {
                        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                        const sessions = await AttendanceSession.find({
                            classroom: { $in: classroomIds },
                            status: "expired",
                            createdAt: { $gte: sevenDaysAgo },
                        }).lean();

                        if (sessions.length === 0) return [];

                        // Get this student's attendance records for those sessions
                        const records = await AttendanceRecord.find({
                            student: userId,
                            session: { $in: sessions.map(s => s._id) },
                        }).select("session").lean();
                        const markedSet = new Set(records.map(r => r.session.toString()));

                        return sessions
                            .filter(s => !markedSet.has(s._id.toString()))
                            .slice(0, 5) // Limit to 5 most recent
                            .map(s => {
                                const cls = classroomMap[s.classroom.toString()];
                                return {
                                    type: "attendance_missed",
                                    id: `att_${s._id.toString()}`,
                                    title: `Missed Attendance`,
                                    context: `${cls?.name || "Classroom"} • ${new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
                                    deadline: null,
                                    createdAt: s.createdAt,
                                    ctaLabel: "View",
                                    ctaRoute: `/classroom/${s.classroom}?tab=attendance`,
                                };
                            });
                    } catch (err) {
                        console.error("Pending attendance error:", err.message);
                        return [];
                    }
                })(),

                // ── E: Pending Leave Requests (student's own) ──
                (async () => {
                    try {
                        const { data: leaveReqs, error } = await primarySupabaseClient
                            .from('leave_requests')
                            .select('id, classroom_id, date, reason, status, created_at')
                            .eq('student_id', userId.toString())
                            .eq('status', 'pending')
                            .order('created_at', { ascending: false })
                            .limit(5);

                        if (error || !leaveReqs || leaveReqs.length === 0) return [];

                        return leaveReqs.map(lr => {
                            const cls = classroomMap[lr.classroom_id];
                            return {
                                type: "leave_pending",
                                id: `leave_${lr.id}`,
                                title: `Leave Request Pending`,
                                context: `${cls?.name || "Classroom"} • ${new Date(lr.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
                                deadline: null,
                                createdAt: lr.created_at,
                                ctaLabel: "View",
                                ctaRoute: `/modules/leave`,
                            };
                        });
                    } catch (err) {
                        console.error("Pending leave error:", err.message);
                        return [];
                    }
                })(),

                // ── F: Unviewed Exam Results ──
                (async () => {
                    try {
                        // Find recent exam results for this student
                        const marks = await StudentMark.find({
                            student: userId,
                            classroom: { $in: classroomIds },
                            viewedByStudent: { $ne: true },
                        })
                            .populate("examRecord", "title createdAt status")
                            .sort({ createdAt: -1 })
                            .limit(5)
                            .lean();

                        return marks
                            .filter(m => m.examRecord && ["active", "published", "locked"].includes(m.examRecord.status))
                            .map(m => {
                                const cls = classroomMap[m.classroom.toString()];
                                return {
                                    type: "result",
                                    id: `result_${m._id.toString()}`,
                                    title: `Result: ${m.examRecord.title}`,
                                    context: `${cls?.name || "Classroom"} • Grade: ${m.grade}`,
                                    deadline: null,
                                    createdAt: m.examRecord.createdAt,
                                    ctaLabel: "View",
                                    ctaRoute: `/results`,
                                };
                            });
                    } catch (err) {
                        console.error("Pending results error:", err.message);
                        return [];
                    }
                })(),
            ]);

            // Merge and sort: items with deadlines first (soonest), then by createdAt (oldest first)
            const allActions = [...pendingAssignments, ...pendingQuizzes, ...pendingNotes, ...pendingAttendance, ...pendingLeave, ...pendingResults];
            allActions.sort((a, b) => {
                // Deadline items first
                if (a.deadline && !b.deadline) return -1;
                if (!a.deadline && b.deadline) return 1;
                if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline);
                // Then by createdAt (newest first for activity items)
                return new Date(b.createdAt) - new Date(a.createdAt);
            });

            return res.json({ actions: allActions });

        } else {
            // ==========================================
            // FACULTY LOGIC: Engagement Tracking
            // ==========================================
            
            // Get all classrooms taught by this user
            const classrooms = await Classroom.find({ teacher: userId }).select("_id name").lean();
            const classroomIds = classrooms.map(c => c._id);
            const classroomMap = {};
            classrooms.forEach(c => { classroomMap[c._id.toString()] = c; });

            if (classroomIds.length === 0) {
                return res.json({ actions: [] });
            }

            // Also get total students per classroom to calculate ratios
            const studentCounts = await ClassroomMembership.aggregate([
                { $match: { classroom: { $in: classroomIds }, status: "approved" } },
                { $group: { _id: "$classroom", count: { $sum: 1 } } }
            ]);
            const studentCountMap = {};
            studentCounts.forEach(c => { studentCountMap[c._id.toString()] = c.count; });

            const [facultyAssignments, facultyQuizzes, upcomingClasses, facultyLeave, facultyAttendance] = await Promise.all([
                // ── A: Assignments Engagement & Review Tasks ──
                (async () => {
                    try {
                        const assignments = await Assignment.find({ classroom: { $in: classroomIds } })
                            .sort({ createdAt: -1 })
                            .limit(20)
                            .lean();

                    if (assignments.length === 0) return [];

                    // Get submissions for these assignments
                    const submissions = await AssignmentSubmission.find({
                        assignment: { $in: assignments.map(a => a._id) }
                    }).select("assignment status").lean();

                    const metrics = {};
                    assignments.forEach(a => {
                        metrics[a._id.toString()] = { totalStr: studentCountMap[a.classroom.toString()] || 0, submitted: 0, pendingReview: 0 };
                    });

                    submissions.forEach(s => {
                        const aid = s.assignment.toString();
                        if (metrics[aid]) {
                            metrics[aid].submitted++;
                            if (s.status === "submitted") {
                                metrics[aid].pendingReview++; // Assuming 'submitted' means ungraded/needs review
                            }
                        }
                    });

                    const actions = [];
                    assignments.forEach(a => {
                        const aid = a._id.toString();
                        const cls = classroomMap[a.classroom.toString()];
                        const m = metrics[aid];
                        const submissionPct = m.totalStr > 0 ? (m.submitted / m.totalStr) : 1;
                        const isPastDue = a.dueDate && new Date(a.dueDate) < new Date();
                        const isDueSoon = a.dueDate && new Date(a.dueDate) < new Date(Date.now() + 24 * 60 * 60 * 1000);

                        // Trigger 1: Low engagement (less than 100% submission)
                        if (m.submitted < m.totalStr && m.totalStr > 0) {
                            actions.push({
                                type: "assignment_stats",
                                id: `engagement_${aid}`,
                                title: a.title,
                                context: `${cls?.name || "Classroom"} • ${m.submitted}/${m.totalStr} Submitted`,
                                deadline: a.dueDate,
                                createdAt: a.createdAt,
                                ctaLabel: "View Submissions",
                                ctaRoute: `/classroom/${a.classroom}/assignments/${a._id}`,
                            });
                        }

                        // Trigger 2: Needs Review (ungraded submissions exist)
                        if (m.pendingReview > 0) {
                            actions.push({
                                type: "review_task",
                                id: `review_${aid}`,
                                title: `Grade: ${a.title}`,
                                context: `${cls?.name || "Classroom"} • ${m.pendingReview} pending review`,
                                deadline: null,
                                createdAt: a.createdAt,
                                ctaLabel: "Review Now",
                                ctaRoute: `/classroom/${a.classroom}/assignments/${a._id}`,
                            });
                        }

                        // Trigger 3: Low participation alert (<50% submitted AND due date is past/very soon)
                        if (submissionPct < 0.5 && m.totalStr >= 3 && (isPastDue || isDueSoon)) {
                            actions.push({
                                type: "low_participation",
                                id: `lowpart_${aid}`,
                                title: `⚠️ Low Participation: ${a.title}`,
                                context: `${cls?.name || "Classroom"} • Only ${Math.round(submissionPct * 100)}% submitted`,
                                deadline: a.dueDate,
                                createdAt: a.createdAt,
                                ctaLabel: "View",
                                ctaRoute: `/classroom/${a.classroom}/assignments/${a._id}`,
                            });
                        }
                    });
                    return actions;
                    } catch (err) {
                        console.error('Faculty assignment metrics err:', err.message);
                        return [];
                    }
                })(),

                // ── B: Quizzes Engagement ──
                (async () => {
                    try {
                        // Quizzes created by this faculty
                        const quizzes = await Quiz.find({ createdBy: userId })
                            .sort({ createdAt: -1 })
                            .limit(20)
                            .lean();

                    if (quizzes.length === 0) return [];

                    return quizzes.map(q => {
                        // We do not have a hard link to classroom for quizzes directly in Quiz model,
                        // but we can just show total unique attempt count vs an arbitrary estimate 
                        // or just the raw count.
                        const uniqueStudents = new Set((q.attempts || []).map(a => a.studentId?.toString())).size;
                        
                        return {
                            type: "quiz_stats",
                            id: `quiz_${q._id.toString()}`,
                            title: q.noteTitle || "Quiz",
                            context: `${uniqueStudents} unique student attempts`,
                            deadline: null,
                            createdAt: q.createdAt,
                            ctaLabel: "View Attempts",
                            ctaRoute: `/quiz/analytics/${q._id}`, // Adjust analytics route if different
                        };
                    });
                    } catch (err) {
                        console.error('Faculty quizzes metrics err:', err.message);
                        return [];
                    }
                })()

                // ── C: Upcoming Classes (next 7 days) ──
                // Shows the next meeting scheduled by this teacher so they can start class
                , (async () => {
                    try {
                        const now = new Date();
                        const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

                    const meetings = await Meeting.find({
                        teacher: userId,
                        classroom: { $in: classroomIds },
                        start_time: { $gte: now, $lte: sevenDaysLater },
                    })
                        .sort({ start_time: 1 })
                        .limit(5)
                        .lean();

                    return meetings.map(m => {
                        const cls = classroomMap[m.classroom.toString()];
                        const startStr = new Date(m.start_time).toLocaleString("en-US", {
                            weekday: "short", month: "short", day: "numeric",
                            hour: "numeric", minute: "2-digit", hour12: true,
                        });
                        return {
                            type: "upcoming_class",
                            id: `meeting_${m._id.toString()}`,
                            title: m.topic || "Upcoming Class",
                            context: `${cls?.name || "Classroom"} • ${startStr}`,
                            deadline: m.start_time,
                            createdAt: m.createdAt,
                            ctaLabel: "Start Class",
                            ctaRoute: m.join_url,
                            isExternalRoute: true,
                        };
                    });
                    } catch (err) {
                        console.error('Faculty upcoming classes err:', err.message);
                        return [];
                    }
                })()

                // ── D: Pending Leave Requests (for faculty to review) ──
                , (async () => {
                    try {
                        const { data: leaveReqs, error } = await primarySupabaseClient
                            .from('leave_requests')
                            .select('id, classroom_id, student_id, date, reason, status, created_at')
                            .eq('teacher_id', userId.toString())
                            .eq('status', 'pending')
                            .order('created_at', { ascending: false })
                            .limit(10);

                        if (error || !leaveReqs || leaveReqs.length === 0) return [];

                        return leaveReqs.map(lr => {
                            const cls = classroomMap[lr.classroom_id];
                            return {
                                type: "leave_review",
                                id: `leave_${lr.id}`,
                                title: `Leave Request to Review`,
                                context: `${cls?.name || "Classroom"} • ${new Date(lr.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
                                deadline: null,
                                createdAt: lr.created_at,
                                ctaLabel: "Review",
                                ctaRoute: `/modules/leave`,
                            };
                        });
                    } catch (err) {
                        console.error("Faculty pending leave error:", err.message);
                        return [];
                    }
                })()

                // ── E: Recent Attendance Sessions Summary ──
                , (async () => {
                    try {
                        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                        const recentSessions = await AttendanceSession.find({
                            classroom: { $in: classroomIds },
                            faculty: userId,
                            status: "expired",
                            createdAt: { $gte: oneDayAgo },
                        }).sort({ createdAt: -1 }).limit(5).lean();

                        return recentSessions.map(s => {
                            const cls = classroomMap[s.classroom.toString()];
                            const totalStudents = studentCountMap[s.classroom.toString()] || 0;
                            return {
                                type: "attendance_summary",
                                id: `att_${s._id.toString()}`,
                                title: `Attendance: ${s.presentCount || 0}/${totalStudents} Present`,
                                context: `${cls?.name || "Classroom"} • ${new Date(s.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`,
                                deadline: null,
                                createdAt: s.createdAt,
                                ctaLabel: "Details",
                                ctaRoute: `/classroom/${s.classroom}?tab=attendance`,
                            };
                        });
                    } catch (err) {
                        console.error("Faculty attendance summary error:", err.message);
                        return [];
                    }
                })()
            ]);

            const allActions = [...facultyAssignments, ...facultyQuizzes, ...upcomingClasses, ...facultyLeave, ...facultyAttendance];
            // Meetings (upcoming classes) go first, then sort by most urgent/recent
            allActions.sort((a, b) => {
                // Upcoming class items always float to top
                if (a.type === "upcoming_class" && b.type !== "upcoming_class") return -1;
                if (b.type === "upcoming_class" && a.type !== "upcoming_class") return 1;
                // Leave review tasks high priority
                if (a.type === "leave_review" && b.type !== "leave_review") return -1;
                if (b.type === "leave_review" && a.type !== "leave_review") return 1;
                // Low participation alerts
                if (a.type === "low_participation" && b.type !== "low_participation") return -1;
                if (b.type === "low_participation" && a.type !== "low_participation") return 1;
                // Review tasks
                if (a.type === "review_task" && b.type !== "review_task") return -1;
                if (b.type === "review_task" && a.type !== "review_task") return 1;
                // Everything else by createdAt desc
                return new Date(b.createdAt) - new Date(a.createdAt);
            });

            return res.json({ actions: allActions });
        }

    } catch (err) {
        console.error("Pending actions error:", err);
        res.status(500).json({ message: "Server error loading pending actions" });
    }
});

export default router;
