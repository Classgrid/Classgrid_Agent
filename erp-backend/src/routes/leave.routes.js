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
import Classroom from "../models/Classroom.js";
import ClassroomMembership from "../models/ClassroomMembership.js";
import User from "../models/User.js";
import { primarySupabaseClient as supabase } from "../config/supabaseClient.js";
import { dispatchNotification } from "../services/notification.service.js";

const router = express.Router();

// ── Helper: populate MongoDB refs ───────────────────────────────────────────
async function populateLeaveRequests(requests) {
    if (!requests || requests.length === 0) return [];
    const classIds = [...new Set(requests.filter(r => r.classroom_id).map(r => r.classroom_id))];
    const studentIds = [...new Set(requests.map(r => r.student_id))];

    const [classrooms, students] = await Promise.all([
        Classroom.find({ _id: { $in: classIds } }).select("name subject").lean(),
        User.find({ _id: { $in: studentIds } }).select("name profilePicture email prn").lean()
    ]);

    const classMap = {};
    classrooms.forEach(c => classMap[c._id.toString()] = c);
    const studentMap = {};
    students.forEach(s => studentMap[s._id.toString()] = s);

    return requests.map(r => ({
        id: r.id,
        _id: r.id,
        doc_no: r.doc_no,
        classroom: classMap[r.classroom_id] || { name: 'General' },
        student: studentMap[r.student_id] || { name: 'Student' },
        leave_type: r.leave_type || 'casual',
        day_type: r.day_type || 'full',
        from_date: r.from_date || r.date,
        to_date: r.to_date || r.date,
        total_days: r.total_days || 1,
        reason: r.reason,
        auto_message: r.auto_message,
        attachment_url: r.attachment_url,
        status: r.status,
        teacher_notes: r.teacher_notes,
        created_at: r.created_at,
    }));
}

// ── STUDENT: Apply Normal / Casual / Sick / Long Leave ──────────────────────
router.post("/request", isAuthenticated, async (req, res) => {
    try {
        const {
            classroomId, from_date, to_date, leave_type = 'casual',
            day_type = 'full', reason, attachment_url, total_days
        } = req.body;

        if (!from_date) return res.status(400).json({ message: "From date is required" });

        let teacher_id = null;
        if (classroomId) {
            const classroom = await Classroom.findById(classroomId).lean();
            if (classroom) teacher_id = classroom.teacher?.toString();
        }

        const { data, error } = await supabase
            .from('leave_requests')
            .insert({
                student_id: req.user._id.toString(),
                classroom_id: classroomId || null,
                teacher_id,
                date: new Date(from_date).toISOString(),
                from_date,
                to_date: to_date || from_date,
                leave_type,
                day_type,
                total_days: total_days || 1,
                reason: reason || '',
                attachment_url: attachment_url || null,
                status: 'pending',
            })
            .select()
            .single();

        if (error) throw error;

        // Notify teacher via central service
        if (teacher_id) {
            await dispatchNotification({
                recipientId: teacher_id,
                type: 'request_approved', // Use existing mapping or 'system'
                title: `📩 Leave Request — ${req.user.name}`,
                message: `${req.user.name} has applied for ${leave_type} leave from ${from_date} to ${to_date || from_date}.`,
                link: '/modules/leave',
            }).catch(e => console.error('[Leave] Notif error:', e.message));
        }

        res.status(201).json({ message: "Leave request submitted", leaveRequest: data });
    } catch (err) {
        console.error("Leave request error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ── STUDENT: Quick Leave (no approval needed) ───────────────────────────────
router.post("/quick", isAuthenticated, async (req, res) => {
    try {
        const { date, day_type = 'full', classroomId } = req.body;
        if (!date) return res.status(400).json({ message: "Date is required" });

        // Auto-generate message
        const dayLabel = day_type === 'full'
            ? `on ${new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`
            : `the ${day_type === 'first_half' ? 'first' : 'second'} half on ${new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`;
        const auto_message = `Ma'am/Sir, I will not be able to attend class ${day_type === 'full' ? dayLabel : dayLabel}.`;

        let teacher_id = null;
        if (classroomId) {
            const classroom = await Classroom.findById(classroomId).lean();
            if (classroom) teacher_id = classroom.teacher?.toString();
        }

        const { data, error } = await supabase
            .from('leave_requests')
            .insert({
                student_id: req.user._id.toString(),
                classroom_id: classroomId || null,
                teacher_id,
                date: new Date(date).toISOString(),
                from_date: date,
                to_date: date,
                leave_type: 'quick',
                day_type,
                total_days: day_type === 'full' ? 1 : 0.5,
                reason: auto_message,
                auto_message,
                status: 'quick', // no approval needed
            })
            .select()
            .single();

        if (error) throw error;

        // Notify teacher (informational)
        if (teacher_id) {
            await Notification.create({
                recipient: teacher_id,
                type: 'quick_leave',
                title: `⚡ Quick Leave — ${req.user.name}`,
                message: auto_message,
                link: '/modules/leave',
            }).catch(e => console.error('[QuickLeave] Notif error:', e.message));
        }

        res.status(201).json({ message: "Quick leave marked successfully", leaveRequest: data });
    } catch (err) {
        console.error("Quick leave error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ── STUDENT: My Leave Requests ──────────────────────────────────────────────
router.get("/me", isAuthenticated, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('leave_requests')
            .select('*')
            .eq('student_id', req.user._id.toString())
            .order('created_at', { ascending: false });

        if (error) throw error;
        const requests = await populateLeaveRequests(data);
        res.json({ requests });
    } catch (err) {
        console.error("Fetch student leaves error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ── TEACHER: All Leave Requests for My Classes ──────────────────────────────
router.get("/teacher", isAuthenticated, requireRole("faculty", "org_admin"), async (req, res) => {
    try {
        const { status } = req.query;
        let query = supabase
            .from('leave_requests')
            .select('*')
            .eq('teacher_id', req.user._id.toString())
            .order('created_at', { ascending: false });

        if (status && status !== 'all') query = query.eq('status', status);

        const { data, error } = await query;
        if (error) throw error;
        const requests = await populateLeaveRequests(data);
        res.json({ requests });
    } catch (err) {
        console.error("Fetch teacher leaves error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ── TEACHER: Approve / Reject ───────────────────────────────────────────────
router.put("/:requestId/status", isAuthenticated, requireRole("faculty", "org_admin"), async (req, res) => {
    try {
        const { status, teacherNote } = req.body;
        if (!["approved", "rejected"].includes(status))
            return res.status(400).json({ message: "Invalid status" });

        const { data: updatedReq, error } = await supabase
            .from('leave_requests')
            .update({ status, teacher_notes: teacherNote || null, updated_at: new Date().toISOString() })
            .eq('id', req.params.requestId)
            .eq('teacher_id', req.user._id.toString())
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116')
                return res.status(403).json({ message: "Not found or not authorized" });
            throw error;
        }

        // Notify student via central service
        await dispatchNotification({
            recipientId: updatedReq.student_id,
            type: status === 'approved' ? 'request_approved' : 'request_rejected',
            title: `🏠 Leave ${status === 'approved' ? 'Approved ✅' : 'Rejected ❌'}`,
            message: `Your ${updatedReq.leave_type || 'leave'} request has been ${status}.${teacherNote ? ` Note: ${teacherNote}` : ''}`,
            link: '/modules/leave',
        }).catch(e => console.error('[Leave] Notif error:', e.message));

        res.json({ message: `Leave ${status}`, leaveRequest: updatedReq });
    } catch (err) {
        console.error("Update leave status error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ── STUDENT: Cancel Pending Leave ───────────────────────────────────────────
router.delete("/:requestId", isAuthenticated, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('leave_requests')
            .delete()
            .eq('id', req.params.requestId)
            .eq('student_id', req.user._id.toString())
            .in('status', ['pending'])
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116')
                return res.status(400).json({ message: "Cannot cancel this leave request" });
            throw error;
        }
        res.json({ message: "Leave request cancelled" });
    } catch (err) {
        console.error("Cancel leave error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ── STUDENT: Leave Summary (balance + breakdown) ────────────────────────────
router.get("/summary", isAuthenticated, async (req, res) => {
    try {
        const studentId = req.user._id.toString();

        const { data: allLeaves, error } = await supabase
            .from('leave_requests')
            .select('status, leave_type, total_days, from_date')
            .eq('student_id', studentId);

        if (error) throw error;
        const leaves = allLeaves || [];

        // Type-wise breakdown
        const typeBreakdown = {};
        leaves.forEach(l => {
            const type = l.leave_type || 'casual';
            if (!typeBreakdown[type]) typeBreakdown[type] = { total: 0, approved: 0, rejected: 0, pending: 0, daysOff: 0 };
            typeBreakdown[type].total++;
            if (l.status === 'approved' || l.status === 'quick') {
                typeBreakdown[type].approved++;
                typeBreakdown[type].daysOff += (l.total_days || 1);
            } else if (l.status === 'rejected') {
                typeBreakdown[type].rejected++;
            } else if (l.status === 'pending') {
                typeBreakdown[type].pending++;
            }
        });

        // Monthly usage (for graph)
        const monthlyUsage = {};
        leaves
            .filter(l => l.status === 'approved' || l.status === 'quick')
            .forEach(l => {
                const month = l.from_date ? l.from_date.substring(0, 7) : 'unknown';
                monthlyUsage[month] = (monthlyUsage[month] || 0) + (l.total_days || 1);
            });

        const totalDaysUsed = leaves
            .filter(l => l.status === 'approved' || l.status === 'quick')
            .reduce((sum, l) => sum + (l.total_days || 1), 0);

        res.json({
            totalRequests: leaves.length,
            totalDaysUsed,
            pendingCount: leaves.filter(l => l.status === 'pending').length,
            typeBreakdown,
            monthlyUsage
        });
    } catch (err) {
        console.error("Leave summary error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ── TEACHER: Weekly Calendar View ───────────────────────────────────────────
// Shows which students are on leave for each day of the current/given week
router.get("/calendar", isAuthenticated, requireRole("faculty", "org_admin"), async (req, res) => {
    try {
        const teacherId = req.user._id.toString();
        const { weekStart } = req.query; // ?weekStart=2026-04-07 (Monday)

        // Default to current week's Monday
        const now = new Date();
        const monday = weekStart 
            ? new Date(weekStart) 
            : new Date(now.setDate(now.getDate() - now.getDay() + 1));
        monday.setHours(0, 0, 0, 0);

        const sunday = new Date(monday);
        sunday.setDate(sunday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        // Fetch all approved/quick leaves overlapping this week
        const { data: weekLeaves, error } = await supabase
            .from('leave_requests')
            .select('*')
            .eq('teacher_id', teacherId)
            .in('status', ['approved', 'quick'])
            .lte('from_date', sunday.toISOString().split('T')[0])
            .gte('to_date', monday.toISOString().split('T')[0])
            .order('from_date', { ascending: true });

        if (error) throw error;

        // Populate student names
        const studentIds = [...new Set((weekLeaves || []).map(l => l.student_id))];
        const students = await User.find({ _id: { $in: studentIds } }).select('name prn').lean();
        const studentMap = {};
        students.forEach(s => { studentMap[s._id.toString()] = s; });

        // Build day-by-day calendar (7 days)
        const calendar = [];
        for (let d = 0; d < 7; d++) {
            const dayDate = new Date(monday);
            dayDate.setDate(dayDate.getDate() + d);
            const dayStr = dayDate.toISOString().split('T')[0];
            const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'long' });

            // Find leaves active on this day
            const absentees = (weekLeaves || []).filter(l => {
                return l.from_date <= dayStr && l.to_date >= dayStr;
            }).map(l => ({
                studentName: studentMap[l.student_id]?.name || 'Unknown',
                prn: studentMap[l.student_id]?.prn || '',
                leaveType: l.leave_type,
                dayType: l.day_type,
                reason: l.reason
            }));

            calendar.push({
                date: dayStr,
                day: dayName,
                absentCount: absentees.length,
                absentees
            });
        }

        res.json({
            weekStart: monday.toISOString().split('T')[0],
            weekEnd: sunday.toISOString().split('T')[0],
            calendar
        });
    } catch (err) {
        console.error("Leave calendar error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
