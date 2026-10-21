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
import { requireClassroomOwner } from "../middleware/classroom.middleware.js";
import Classroom from "../models/Classroom.js";
import ClassroomMembership from "../models/ClassroomMembership.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { dispatchNotification, bulkDispatchNotification } from "../services/notification.service.js";
import { primarySupabaseClient as supabase } from "../config/supabaseClient.js";
import { isHoliday } from "../utils/holidayUtils.js";

const router = express.Router();

// ─────────────────────────────────────────────
// CREATE ASSIGNMENT (Teacher)
// ─────────────────────────────────────────────
router.post("/:classroomId", isAuthenticated, requireClassroomOwner, async (req, res) => {
    try {
        const { title, description, dueDate, maxPoints, attachments, blockLate } = req.body;
        const { classroomId } = req.params;

        if (!title || !dueDate) {
            return res.status(400).json({ message: "Title and due date are required" });
        }

        // 🔒 Holiday guard — warn if due date is a holiday
        const orgId = req.user.organization_id?.toString() || req.effectiveOrganizationId;
        if (orgId) {
            const todayStr = new Date().toISOString().split("T")[0];
            const holidayCheck = await isHoliday(todayStr, orgId);
            if (holidayCheck.isHoliday) {
                return res.status(403).json({
                    message: `Today is a holiday (${holidayCheck.holiday?.title || "Holiday"}). Assignments cannot be created on holidays.`,
                    code: "HOLIDAY_BLOCKED",
                });
            }
        }

        const newAssignment = {
            classroom_id: classroomId,
            teacher_id: req.user._id.toString(),
            organization_id: req.user.organization_id?.toString() || null,
            title,
            description,
            due_date: new Date(dueDate).toISOString(),
            max_points: maxPoints || 100,
            attachments: attachments || [],
            block_late: blockLate === true,
            status: "published"
        };

        console.log("[Assignments] Attempting to insert:", newAssignment);
        
        const { data: assignmentPg, error } = await supabase
            .from('assignments')
            .insert(newAssignment)
            .select()
            .single();

        console.log("[Assignments] Supabase Insert Result:", { data: assignmentPg ? 'SUCCESS' : 'NULL', error });

        if (error) throw error;
        
        console.log("[Assignments] Insert succeeded! Row ID:", assignmentPg.id);

        // 🔔 Notify students via central service (Internal + Push)
        try {
            const members = await ClassroomMembership.find({ classroom: classroomId, status: "approved" }).select("student").lean();
            const studentIds = members.map(m => m.student.toString());

            if (studentIds.length > 0) {
                await bulkDispatchNotification({
                    recipientIds: studentIds,
                    type: "assignment",
                    title: "📚 New Assignment",
                    message: `A new assignment "${title}" has been posted in ${classroomId}.`,
                    link: `/assignments`,
                    relatedId: assignmentPg.id?.toString() || "",
                });
            }
        } catch (notifErr) {
            console.error("[Assignments] Notification error:", notifErr.message);
        }

        res.status(201).json({ message: "Assignment created", assignment: { ...assignmentPg, _id: assignmentPg.id } });
    } catch (err) {
        console.error("Create assignment error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────
// GET ALL ASSIGNMENTS FOR A STUDENT OR TEACHER ACROSS ALL CLASSES
// ─────────────────────────────────────────────
router.get("/global/me", isAuthenticated, async (req, res) => {
    try {
        if (req.user.role === "student") {
            // Find all classes student is in using MongoDB
            const memberships = await ClassroomMembership.find({ student: req.user._id, status: "approved" }).lean();
            const classroomIds = memberships.map(m => m.classroom.toString());

            if (classroomIds.length === 0) return res.json({ assignments: [] });

            // Fetch assignments from Supabase
            const { data: assignmentsData, error: assignErr } = await supabase
                .from('assignments')
                .select('*')
                .in('classroom_id', classroomIds)
                .eq('status', 'published')
                .order('created_at', { ascending: false });

            if (assignErr) throw assignErr;

            const assignmentIds = assignmentsData.map(a => a.id);

            // Fetch student's submissions to know what's done
            const { data: submissionsData, error: subErr } = await supabase
                .from('assignment_submissions')
                .select('*')
                .eq('student_id', req.user._id.toString())
                .in('assignment_id', assignmentIds);

            if (subErr) throw subErr;

            const submissionMap = {};
            submissionsData?.forEach(sub => {
                submissionMap[sub.assignment_id] = sub;
            });

            // Hydrate Classrooms from Mongo
            const classrooms = await Classroom.find({ _id: { $in: classroomIds } }).select("name subject subjectSlug").lean();
            const classMap = {};
            classrooms.forEach(c => classMap[c._id.toString()] = c);

            const enriched = assignmentsData.map(a => {
                const sub = submissionMap[a.id];
                const isLate = sub && new Date(sub.submitted_at || sub.created_at) > new Date(a.due_date);
                return {
                    _id: a.id,
                    title: a.title,
                    description: a.description,
                    dueDate: a.due_date,
                    maxPoints: a.max_points,
                    attachments: a.attachments,
                    classroom: classMap[a.classroom_id] || { _id: a.classroom_id, name: 'Unknown' },
                    isSubmitted: !!sub,
                    status: sub ? (isLate ? 'late' : 'submitted') : (!sub && new Date(a.due_date) < new Date() ? 'missing' : 'pending'),
                    submission: sub ? { _id: sub.id, grade: sub.grade, status: sub.status } : null,
                    isMissing: !sub && new Date(a.due_date) < new Date(),
                    createdAt: a.created_at
                };
            });

            return res.json({ assignments: enriched });
        } else {
            // Teacher: view their own assignments across all classes
            const teacherId = req.user._id.toString();
            console.log("[Assignments GET] Teacher ID:", teacherId);
            
            const { data: assignmentsData, error: assignErr } = await supabase
                .from('assignments')
                .select('*')
                .eq('teacher_id', teacherId)
                .eq('status', 'published')
                .order('created_at', { ascending: false });

            console.log("[Assignments GET] Supabase returned:", assignmentsData?.length, "assignments, error:", assignErr);

            if (assignErr) throw assignErr;

            const assignmentIds = assignmentsData.map(a => a.id);
            const classIds = [...new Set(assignmentsData.map(a => a.classroom_id))];

            // Hydrate Classrooms from Mongo
            const classrooms = await Classroom.find({ _id: { $in: classIds } }).select("name subject subjectSlug").lean();
            const classMap = {};
            classrooms.forEach(c => classMap[c._id.toString()] = c);

            // Get submission counts for teachers in postgres
            let submissionMap = {};
            if (assignmentIds.length > 0) {
                 const { data: countData, error: countErr } = await supabase
                     .from('assignment_submissions')
                     .select('assignment_id')
                     .in('assignment_id', assignmentIds);
                     
                 if (!countErr && countData) {
                      countData.forEach(sub => {
                           submissionMap[sub.assignment_id] = (submissionMap[sub.assignment_id] || 0) + 1;
                      });
                 }
            }

            const enriched = assignmentsData.map(a => ({
                _id: a.id,
                title: a.title,
                dueDate: a.due_date,
                maxPoints: a.max_points,
                classroom: classMap[a.classroom_id] || { _id: a.classroom_id, name: 'Unknown' },
                submittedCount: submissionMap[a.id] || 0,
                createdAt: a.created_at
            }));

            return res.json({ assignments: enriched });
        }
    } catch (err) {
        console.error("Global assignments error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────
// GET A SINGLE ASSIGNMENT (Teacher or Student)
// ─────────────────────────────────────────────
router.get("/:assignmentId", isAuthenticated, async (req, res) => {
    try {
        const { data: assignmentData, error: getErr } = await supabase
            .from('assignments')
            .select('*')
            .eq('id', req.params.assignmentId)
            .single();

        if (getErr || !assignmentData) return res.status(404).json({ message: "Assignment not found" });

        // Hydrate Classroom and Teacher from Mongo
        const classroom = await Classroom.findById(assignmentData.classroom_id).select("name teacher subject").lean();
        const teacher = await User.findById(assignmentData.teacher_id).select("name email profilePicture").lean();

        const assignment = {
             _id: assignmentData.id,
             title: assignmentData.title,
             description: assignmentData.description,
             dueDate: assignmentData.due_date,
             maxPoints: assignmentData.max_points,
             attachments: assignmentData.attachments,
             classroom: classroom,
             teacher: teacher
        };

        // Verify access
        const isTeacher = assignmentData.teacher_id === req.user._id.toString();
        let isStudent = false;

        if (!isTeacher) {
            const member = await ClassroomMembership.findOne({
                classroom: assignmentData.classroom_id,
                student: req.user._id,
                status: "approved"
            }).lean();
            
            if (!member) return res.status(403).json({ message: "Not authorized to view this assignment" });
            isStudent = true;
        }

        if (isStudent) {
            const { data: submissionData } = await supabase
                .from('assignment_submissions')
                .select('*')
                .eq('assignment_id', assignmentData.id)
                .eq('student_id', req.user._id.toString())
                .single();

            const submission = submissionData ? {
                _id: submissionData.id,
                submittedFile: submissionData.submitted_file,
                grade: submissionData.grade,
                feedback: submissionData.feedback,
                status: submissionData.status,
                submittedAt: submissionData.submitted_at
            } : null;

            return res.json({ assignment, role: "student", submission });
        } else {
            // Teacher: return all students and their submissions
            const { data: submissionsData, error: subErr } = await supabase
                .from('assignment_submissions')
                .select('*')
                .eq('assignment_id', assignmentData.id);

            if (subErr) throw subErr;

            // 1. Get all students in this classroom from Mongo ClassroomMembership
            const memberships = await ClassroomMembership.find({
                classroom: assignmentData.classroom_id,
                status: "approved"
            }).lean();
            
            const studentIds = memberships.map(m => m.student);

            // 2. Hydrate Student data from Mongo
            const students = await User.find({ _id: { $in: studentIds } }).select("name email profilePicture").lean();
            const studentMap = {};
            students.forEach(s => studentMap[s._id.toString()] = s);

            // 3. Map submissions
            const submissionMap = {};
            submissionsData.forEach(s => submissionMap[s.student_id] = s);

            const submissions = students.map(student => {
                const s = submissionMap[student._id.toString()];
                if (s) {
                    const submittedAt = new Date(s.submitted_at);
                    const dueDate = new Date(assignmentData.due_date);
                    
                    let status = s.status;
                    // Compare to end-of-day of due date so same-day submissions aren't flagged as late
                    const dueDateEndOfDay = new Date(assignmentData.due_date);
                    dueDateEndOfDay.setHours(23, 59, 59, 999);
                    if (submittedAt <= dueDateEndOfDay) {
                        status = 'Submitted';
                    } else {
                        status = 'Late';
                    }

                    return {
                        _id: s.id,
                        student: student,
                        submittedFile: s.submitted_file,
                        grade: s.grade,
                        feedback: s.feedback,
                        status: status,
                        submittedAt: s.submitted_at
                    };
                } else {
                    return {
                        _id: `not_sub_${student._id}`,
                        student: student,
                        submittedFile: null,
                        grade: null,
                        feedback: null,
                        status: 'Not Submitted',
                        submittedAt: null
                    };
                }
            });

            // Sort logic: Late/Submitted first, Not Submitted last
            submissions.sort((a, b) => {
                if (a.submittedAt && !b.submittedAt) return -1;
                if (!a.submittedAt && b.submittedAt) return 1;
                if (a.submittedAt && b.submittedAt) return new Date(b.submittedAt) - new Date(a.submittedAt);
                return a.student.name.localeCompare(b.student.name);
            });

            return res.json({ assignment, role: "teacher", submissions });
        }

    } catch (err) {
        console.error("Get assignment details error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────
// SUBMIT AN ASSIGNMENT (Student)
// ─────────────────────────────────────────────
router.post("/:assignmentId/submit", isAuthenticated, async (req, res) => {
    try {
        const { data: assignment, error: getErr } = await supabase
            .from('assignments')
            .select('*')
            .eq('id', req.params.assignmentId)
            .single();

        if (getErr || !assignment) return res.status(404).json({ message: "Assignment not found" });

        // Verify student membership using Mongo
        const member = await ClassroomMembership.findOne({
            classroom: assignment.classroom_id,
            student: req.user._id,
            status: "approved"
        }).lean();

        if (!member) return res.status(403).json({ message: "Not authorized to submit to this class" });

        // Check if late submissions are blocked
        const dueDateEndOfDayCheck = new Date(assignment.due_date);
        dueDateEndOfDayCheck.setHours(23, 59, 59, 999);
        const nowCheck = new Date();
        if (assignment.block_late && nowCheck > new Date(assignment.due_date)) {
            return res.status(403).json({ message: "Submissions are closed — the deadline has passed for this assignment.", code: 'DEADLINE_CLOSED' });
        }

        // 🔒 Holiday guard — block submissions on holidays
        const orgId = req.user.organization_id?.toString() || req.effectiveOrganizationId || assignment.organization_id;
        if (orgId) {
            const todayStr = new Date().toISOString().split("T")[0];
            const holidayCheck = await isHoliday(todayStr, orgId);
            if (holidayCheck.isHoliday) {
                return res.status(403).json({
                    message: `Today is a holiday (${holidayCheck.holiday?.title || "Holiday"}). Assignment submissions are paused during holidays.`,
                    code: "HOLIDAY_BLOCKED",
                });
            }
        }

        const { originalName, fileUrl, fileType } = req.body;
        const dueDateEndOfDay = new Date(assignment.due_date);
        dueDateEndOfDay.setHours(23, 59, 59, 999);
        const isLate = assignment.due_date && new Date() > dueDateEndOfDay;
        const finalStatus = isLate ? "late" : "submitted";


        const { data: submission, error: upsertErr } = await supabase
            .from('assignment_submissions')
            .upsert({
                assignment_id: assignment.id,
                student_id: req.user._id.toString(),
                classroom_id: assignment.classroom_id,
                organization_id: assignment.organization_id,
                submitted_file: { originalName, fileUrl, fileType },
                status: finalStatus,
                submitted_at: new Date().toISOString()
            }, {
                onConflict: 'assignment_id, student_id'
            })
            .select()
            .single();

        if (upsertErr) throw upsertErr;

        res.json({ message: "Submitted successfully", submission: { ...submission, _id: submission.id } });
    } catch (err) {
        console.error("Submit assignment error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────
// UNSUBMIT AN ASSIGNMENT (Student)
// ─────────────────────────────────────────────
router.delete("/:assignmentId/unsubmit", isAuthenticated, async (req, res) => {
    try {
        const { data: assignment, error: getErr } = await supabase
            .from('assignments')
            .select('*')
            .eq('id', req.params.assignmentId)
            .single();

        if (getErr || !assignment) return res.status(404).json({ message: "Assignment not found" });

        // Verify student membership
        const member = await ClassroomMembership.findOne({
            classroom: assignment.classroom_id,
            student: req.user._id,
            status: "approved"
        }).lean();
        if (!member) return res.status(403).json({ message: "Not authorized" });

        // Check if submission exists
        const { data: existingSub, error: subErr } = await supabase
            .from('assignment_submissions')
            .select('*')
            .eq('assignment_id', assignment.id)
            .eq('student_id', req.user._id.toString())
            .single();

        if (subErr || !existingSub) return res.status(404).json({ message: "No submission found to unsubmit" });

        // Block unsubmit if already graded
        if (existingSub.grade != null) {
            return res.status(403).json({ message: "Cannot unsubmit — assignment has already been graded" });
        }

        // Delete the submission
        const { error: deleteErr } = await supabase
            .from('assignment_submissions')
            .delete()
            .eq('id', existingSub.id);

        if (deleteErr) throw deleteErr;

        res.json({ message: "Submission removed. You can resubmit before the deadline." });
    } catch (err) {
        console.error("Unsubmit assignment error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────
// GRADE AN ASSIGNMENT (Teacher)
// ─────────────────────────────────────────────
router.post("/:assignmentId/grade/:submissionId", isAuthenticated, async (req, res) => {
    try {
        const { data: assignment, error: getErr } = await supabase
            .from('assignments')
            .select('teacher_id')
            .eq('id', req.params.assignmentId)
            .single();

        if (getErr || !assignment || assignment.teacher_id !== req.user._id.toString()) {
            return res.status(403).json({ message: "Not authorized" });
        }

        const { grade, feedback } = req.body;

        const { data: submission, error: updateErr } = await supabase
            .from('assignment_submissions')
            .update({
                 grade: grade,
                 feedback: feedback || "",
                 graded_at: new Date().toISOString(),
                 status: "returned"
            })
            .eq('id', req.params.submissionId)
            .select()
            .single();

        if (updateErr) return res.status(404).json({ message: "Submission not found" });

        // 🔔 Notify the student via central service
        try {
            await dispatchNotification({
                recipientId: submission.student_id,
                type: "result",
                title: "✅ Assignment Graded",
                message: `Your assignment "${assignment.title || 'Assignment'}" has been graded: ${grade} points.`,
                link: `/assignments`,
                relatedId: submission.id?.toString() || "",
            });
        } catch (notifErr) {
            console.error("[Assignments] Grade Notification error:", notifErr.message);
        }

        res.json({ message: "Graded successfully", submission });
    } catch (err) {
        console.error("Grade submission error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────
// BULK GRADE SUBMISSIONS (Teacher)
// ─────────────────────────────────────────────
router.post("/:assignmentId/grade-bulk", isAuthenticated, async (req, res) => {
    try {
        const { data: assignment, error: getErr } = await supabase
            .from('assignments')
            .select('teacher_id, max_points')
            .eq('id', req.params.assignmentId)
            .single();

        if (getErr || !assignment || assignment.teacher_id !== req.user._id.toString()) {
            return res.status(403).json({ message: "Not authorized" });
        }

        const { grades } = req.body; // Array of { submissionId, grade, feedback }
        if (!grades || !Array.isArray(grades) || grades.length === 0) {
            return res.status(400).json({ message: "No grades provided" });
        }

        const results = [];
        const errors = [];

        for (const item of grades) {
            const grade = Math.min(Math.max(0, Number(item.grade)), assignment.max_points);
            const { data, error } = await supabase
                .from('assignment_submissions')
                .update({
                    grade: grade,
                    feedback: item.feedback || "",
                    graded_at: new Date().toISOString(),
                    status: "returned"
                })
                .eq('id', item.submissionId)
                .eq('assignment_id', req.params.assignmentId)
                .select()
                .single();

            if (error) {
                errors.push({ submissionId: item.submissionId, error: error.message });
            } else {
                results.push(data);
            }
        }

        res.json({
            message: `Graded ${results.length} submission(s)${errors.length ? `, ${errors.length} failed` : ''}`,
            results,
            errors
        });
    } catch (err) {
        console.error("Bulk grade error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────
// EDIT AN ASSIGNMENT (Teacher only)
// ─────────────────────────────────────────────
router.put("/:assignmentId", isAuthenticated, async (req, res) => {
    try {
        // Verify ownership
        const { data: existing, error: getErr } = await supabase
            .from('assignments')
            .select('teacher_id')
            .eq('id', req.params.assignmentId)
            .single();

        if (getErr || !existing) return res.status(404).json({ message: "Assignment not found" });
        if (existing.teacher_id !== req.user._id.toString()) {
            return res.status(403).json({ message: "Not authorized to edit this assignment" });
        }

        const { title, description, dueDate, maxPoints, attachments } = req.body;

        const updates = {};
        if (title !== undefined)       updates.title = title;
        if (description !== undefined) updates.description = description;
        if (dueDate !== undefined)     updates.due_date = new Date(dueDate).toISOString();
        if (maxPoints !== undefined)   updates.max_points = maxPoints;
        if (attachments !== undefined) updates.attachments = attachments;
        updates.updated_at = new Date().toISOString();

        const { data: updated, error: updateErr } = await supabase
            .from('assignments')
            .update(updates)
            .eq('id', req.params.assignmentId)
            .select()
            .single();

        if (updateErr) throw updateErr;

        res.json({ message: "Assignment updated", assignment: { ...updated, _id: updated.id } });
    } catch (err) {
        console.error("Edit assignment error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ─────────────────────────────────────────────
// DELETE AN ASSIGNMENT (Teacher only)
// ─────────────────────────────────────────────
router.delete("/:assignmentId", isAuthenticated, async (req, res) => {
    try {
        // Verify ownership
        const { data: existing, error: getErr } = await supabase
            .from('assignments')
            .select('teacher_id')
            .eq('id', req.params.assignmentId)
            .single();

        if (getErr || !existing) return res.status(404).json({ message: "Assignment not found" });
        if (existing.teacher_id !== req.user._id.toString()) {
            return res.status(403).json({ message: "Not authorized to delete this assignment" });
        }

        // Delete assignment — submissions cascade automatically via ON DELETE CASCADE
        const { error: deleteErr } = await supabase
            .from('assignments')
            .delete()
            .eq('id', req.params.assignmentId);

        if (deleteErr) throw deleteErr;

        res.json({ message: "Assignment deleted successfully" });
    } catch (err) {
        console.error("Delete assignment error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
