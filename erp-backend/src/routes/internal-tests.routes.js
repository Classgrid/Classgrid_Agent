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

import express from 'express';
import { isAuthenticated, requireRole } from '../middleware/auth.middleware.js';
import { attachInstitutionProfile } from '../middleware/institution-profile.middleware.js';
import { primarySupabaseClient as supabase } from '../config/supabaseClient.js';

const router = express.Router();
router.use(isAuthenticated, attachInstitutionProfile({ required: false }));

router.get('/institution-profile', attachInstitutionProfile(), (req, res) => {
    res.json({
        institution_profile: req.institutionProfile,
        examination_profile: req.institutionProfile.examinationProfile,
        learner_record_profile: req.institutionProfile.learnerRecordProfile,
    });
});

const getOrgId = (user) => user?.organization_id || user?.org_id || user?.organization?._id || user?.organization;


// ══════════════════════════════════════════════════════════════════════════
// TEACHER: CREATE TEST
// ══════════════════════════════════════════════════════════════════════════
router.post('/', isAuthenticated, requireRole('org_admin', 'faculty', 'teacher'), async (req, res) => {
    try {
        const { test_name, subject, division_id, classroom_id, test_date, total_marks, description, question_file_url } = req.body;

        if (!test_name || !subject || !test_date || !total_marks) {
            return res.status(400).json({ message: 'test_name, subject, test_date, and total_marks are required' });
        }

        const org_id = getOrgId(req.user);

        const { data, error } = await supabase.from('internal_tests').insert({
            org_id,
            teacher_id: req.user._id.toString(),
            classroom_id: classroom_id || null,
            division_id: division_id || null,
            test_name,
            subject,
            description: description || null,
            test_date,
            total_marks: parseInt(total_marks),
            question_file_url: question_file_url || null,
            status: new Date(test_date) > new Date() ? 'upcoming' : 'completed'
        }).select().single();

        if (error) throw error;

        res.status(201).json({ message: 'Test created!', test: data });
    } catch (err) {
        console.error('[InternalTests] Create error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});


// ══════════════════════════════════════════════════════════════════════════
// TEACHER: LIST MY TESTS
// ══════════════════════════════════════════════════════════════════════════
router.get('/my-tests', isAuthenticated, requireRole('org_admin', 'faculty', 'teacher'), async (req, res) => {
    try {
        const org_id = getOrgId(req.user);
        const teacherId = req.user._id.toString();

        const { data, error } = await supabase.from('internal_tests')
            .select('*')
            .eq('org_id', org_id)
            .eq('teacher_id', teacherId)
            .order('test_date', { ascending: false });

        if (error) throw error;

        const today = new Date().toISOString().split('T')[0];
        const enriched = (data || []).map(t => ({
            ...t,
            status: t.status === 'cancelled' ? 'cancelled'
                : t.test_date < today ? 'completed'
                : t.test_date === today ? 'ongoing'
                : 'upcoming'
        }));

        res.json({ tests: enriched });
    } catch (err) {
        console.error('[InternalTests] List error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});


// ══════════════════════════════════════════════════════════════════════════
// TEACHER: GET TEST DETAIL + MARKS
// ══════════════════════════════════════════════════════════════════════════
router.get('/:id', isAuthenticated, async (req, res) => {
    try {
        const { data: test, error: tErr } = await supabase.from('internal_tests')
            .select('*').eq('id', req.params.id).single();

        if (tErr) throw tErr;
        if (!test) return res.status(404).json({ message: 'Test not found' });

        const { data: marks, error: mErr } = await supabase.from('internal_test_marks')
            .select('*').eq('test_id', req.params.id);

        if (mErr) throw mErr;

        const User = (await import('../models/User.js')).default;
        const studentIds = (marks || []).map(m => m.student_id);
        let studentMap = {};
        if (studentIds.length > 0) {
            const students = await User.find({ _id: { $in: studentIds } })
                .select('name email prn profilePicture').lean();
            students.forEach(s => { studentMap[s._id.toString()] = s; });
        }

        const enrichedMarks = (marks || []).map(m => ({
            ...m,
            student_name: studentMap[m.student_id]?.name || 'Unknown',
            student_email: studentMap[m.student_id]?.email || '',
            student_prn: studentMap[m.student_id]?.prn || '',
        }));

        res.json({ test, marks: enrichedMarks });
    } catch (err) {
        console.error('[InternalTests] Detail error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});


// ══════════════════════════════════════════════════════════════════════════
// TEACHER: UPDATE TEST
// ══════════════════════════════════════════════════════════════════════════
router.put('/:id', isAuthenticated, requireRole('org_admin', 'faculty', 'teacher'), async (req, res) => {
    try {
        const { test_name, subject, test_date, total_marks, description, question_file_url, status } = req.body;
        const updates = {};
        if (test_name !== undefined) updates.test_name = test_name;
        if (subject !== undefined) updates.subject = subject;
        if (test_date !== undefined) updates.test_date = test_date;
        if (total_marks !== undefined) updates.total_marks = parseInt(total_marks);
        if (description !== undefined) updates.description = description;
        if (question_file_url !== undefined) updates.question_file_url = question_file_url;
        if (status !== undefined) updates.status = status;

        const { data, error } = await supabase.from('internal_tests')
            .update(updates).eq('id', req.params.id).select().single();

        if (error) throw error;
        res.json({ message: 'Test updated!', test: data });
    } catch (err) {
        console.error('[InternalTests] Update error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});


// ══════════════════════════════════════════════════════════════════════════
// TEACHER: DELETE TEST
// ══════════════════════════════════════════════════════════════════════════
router.delete('/:id', isAuthenticated, requireRole('org_admin', 'faculty', 'teacher'), async (req, res) => {
    try {
        const { error } = await supabase.from('internal_tests').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ message: 'Test deleted' });
    } catch (err) {
        console.error('[InternalTests] Delete error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});


// ══════════════════════════════════════════════════════════════════════════
// TEACHER: LOAD STUDENTS FOR MARKS ENTRY
// ══════════════════════════════════════════════════════════════════════════
router.get('/:id/students', isAuthenticated, requireRole('org_admin', 'faculty', 'teacher'), async (req, res) => {
    try {
        const { data: test } = await supabase.from('internal_tests')
            .select('*').eq('id', req.params.id).single();
        if (!test) return res.status(404).json({ message: 'Test not found' });

        const User = (await import('../models/User.js')).default;
        let students = [];

        if (test.division_id) {
            const { data: divStudents } = await supabase.from('students')
                .select('user_id').eq('division_id', test.division_id);
            const userIds = (divStudents || []).map(s => s.user_id);
            if (userIds.length > 0) {
                students = await User.find({ _id: { $in: userIds } })
                    .select('name email prn profilePicture').lean();
            }
        } else if (test.classroom_id) {
            const { getChatSb } = await import('../config/supabaseClient.js');
            const { data: members } = await getChatSb()
                .from('classroom_memberships')
                .select('student_id')
                .eq('classroom_id', test.classroom_id)
                .eq('status', 'approved');
            const userIds = (members || []).map(m => m.student_id);
            if (userIds.length > 0) {
                students = await User.find({ _id: { $in: userIds } })
                    .select('name email prn profilePicture').lean();
            }
        } else {
            students = await User.find({
                organization_id: test.org_id,
                role: 'student'
            }).select('name email prn profilePicture').lean();
        }

        // Get existing marks
        const { data: existingMarks } = await supabase.from('internal_test_marks')
            .select('*').eq('test_id', req.params.id);
        const marksMap = {};
        (existingMarks || []).forEach(m => { marksMap[m.student_id] = m; });

        const enriched = students.map(s => ({
            _id: s._id.toString(),
            name: s.name,
            email: s.email,
            prn: s.prn || '',
            marks_obtained: marksMap[s._id.toString()]?.marks_obtained ?? null,
            remarks: marksMap[s._id.toString()]?.remarks || '',
            mark_id: marksMap[s._id.toString()]?.id || null,
        }));

        enriched.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        res.json({ students: enriched, total_marks: test.total_marks });
    } catch (err) {
        console.error('[InternalTests] Load students error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});


// ══════════════════════════════════════════════════════════════════════════
// TEACHER: SAVE MARKS (Bulk upsert)
// ══════════════════════════════════════════════════════════════════════════
router.post('/:id/marks', isAuthenticated, requireRole('org_admin', 'faculty', 'teacher'), async (req, res) => {
    try {
        const testId = req.params.id;
        const { marks } = req.body;

        if (!Array.isArray(marks) || marks.length === 0) {
            return res.status(400).json({ message: 'marks array is required' });
        }

        const { data: test } = await supabase.from('internal_tests')
            .select('total_marks').eq('id', testId).single();
        if (!test) return res.status(404).json({ message: 'Test not found' });

        for (const m of marks) {
            if (m.marks_obtained !== null && m.marks_obtained !== '' && m.marks_obtained !== undefined) {
                const val = parseFloat(m.marks_obtained);
                if (isNaN(val) || val < 0 || val > test.total_marks) {
                    return res.status(400).json({ message: `Invalid marks for student. Must be 0-${test.total_marks}` });
                }
            }
        }

        const teacherId = req.user._id.toString();

        const rows = marks.map(m => ({
            test_id: testId,
            student_id: m.student_id,
            marks_obtained: (m.marks_obtained !== null && m.marks_obtained !== '' && m.marks_obtained !== undefined)
                ? parseFloat(m.marks_obtained) : null,
            remarks: m.remarks || null,
            graded_by: teacherId,
            graded_at: new Date().toISOString(),
        }));

        const { data, error } = await supabase.from('internal_test_marks')
            .upsert(rows, { onConflict: 'test_id,student_id' })
            .select();

        if (error) throw error;

        await supabase.from('internal_tests')
            .update({ status: 'completed' })
            .eq('id', testId);

        res.json({ message: `Marks saved for ${rows.length} student(s)!`, marks: data });
    } catch (err) {
        console.error('[InternalTests] Save marks error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});


// ══════════════════════════════════════════════════════════════════════════
// STUDENT: VIEW MY TESTS + MARKS
// ══════════════════════════════════════════════════════════════════════════
router.get('/student/my-tests', isAuthenticated, async (req, res) => {
    try {
        const org_id = getOrgId(req.user);
        const userId = req.user._id.toString();

        const { data: tests, error } = await supabase.from('internal_tests')
            .select('*')
            .eq('org_id', org_id)
            .order('test_date', { ascending: false });

        if (error) throw error;

        const testIds = (tests || []).map(t => t.id);
        let marksMap = {};
        if (testIds.length > 0) {
            const { data: myMarks } = await supabase.from('internal_test_marks')
                .select('*')
                .eq('student_id', userId)
                .in('test_id', testIds);
            (myMarks || []).forEach(m => { marksMap[m.test_id] = m; });
        }

        const User = (await import('../models/User.js')).default;
        const teacherIds = [...new Set((tests || []).map(t => t.teacher_id))];
        let teacherMap = {};
        if (teacherIds.length > 0) {
            const teachers = await User.find({ _id: { $in: teacherIds } })
                .select('name').lean();
            teachers.forEach(t => { teacherMap[t._id.toString()] = t.name; });
        }

        const today = new Date().toISOString().split('T')[0];

        const enriched = (tests || []).map(t => ({
            ...t,
            teacher_name: teacherMap[t.teacher_id] || 'Unknown',
            my_marks: marksMap[t.id]?.marks_obtained ?? null,
            my_remarks: marksMap[t.id]?.remarks || '',
            computed_status: t.status === 'cancelled' ? 'cancelled'
                : t.test_date < today ? 'completed'
                : t.test_date === today ? 'ongoing'
                : 'upcoming'
        }));

        res.json({ tests: enriched });
    } catch (err) {
        console.error('[InternalTests] Student tests error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});


export default router;
