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
import { primarySupabaseClient as supabase } from '../config/supabaseClient.js';

const router = express.Router();

const getOrgId = (user) => user?.organization_id || user?.org_id || user?.organization?._id || user?.organization;

// 🔥 In-memory teacher cache (fix #4 — avoid MongoDB fetch every request)
const TEACHER_CACHE = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getTeacherMap(teacherIds) {
    if (!teacherIds.length) return {};
    const now = Date.now();
    const uncached = teacherIds.filter(id => {
        const entry = TEACHER_CACHE.get(id);
        return !entry || (now - entry.ts) > CACHE_TTL;
    });
    if (uncached.length > 0) {
        const User = (await import('../models/User.js')).default;
        const docs = await User.find({ _id: { $in: uncached } })
            .select('name profilePicture department email').lean();
        docs.forEach(t => {
            TEACHER_CACHE.set(t._id.toString(), { data: t, ts: now });
        });
    }
    const map = {};
    teacherIds.forEach(id => {
        const entry = TEACHER_CACHE.get(id);
        if (entry) map[id] = entry.data;
    });
    return map;
}

// Role priority for sorting (fix #1)
const ROLE_PRIORITY = { subject_teacher: 1, assistant_teacher: 2, class_teacher: 3 };

// ── CREATE COURSE ───────────────────────────────────────────────────────
router.post('/', isAuthenticated, requireRole('org_admin', 'faculty'), async (req, res) => {
    try {
        const { name, type, description, year, standard, course_name, branch, total_semesters } = req.body;
        if (!name) return res.status(400).json({ message: 'Course name is required' });

        const org_id = getOrgId(req.user);

        const { data: course, error } = await supabase.from('courses').insert({
            org_id, name, type: type || 'COLLEGE', description,
            year, standard, course_name, branch,
            total_semesters: total_semesters || 2,
            created_by: req.user._id.toString(),
        }).select().single();

        if (error) {
            if (error.code === '23505') return res.status(400).json({ message: 'A course with this name already exists' });
            throw error;
        }

        res.status(201).json({ message: 'Course created!', course });
    } catch (err) {
        console.error('[Course] Create error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ── LIST COURSES ────────────────────────────────────────────────────────
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const org_id = getOrgId(req.user);
        const { data, error } = await supabase.from('courses')
            .select('*')
            .eq('org_id', org_id)
            .eq('status', 'active')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Enrich with subject count per course
        const courseIds = (data || []).map(c => c.id);
        let subjectCounts = {};
        if (courseIds.length > 0) {
            const { data: subjects } = await supabase.from('course_subjects')
                .select('course_id')
                .in('course_id', courseIds);
            (subjects || []).forEach(s => {
                subjectCounts[s.course_id] = (subjectCounts[s.course_id] || 0) + 1;
            });
        }

        const enriched = (data || []).map(c => ({
            ...c,
            subject_count: subjectCounts[c.id] || 0,
        }));

        res.json({ courses: enriched });
    } catch (err) {
        console.error('[Course] List error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ── GET COURSE DETAIL + SUBJECTS ────────────────────────────────────────
router.get('/:id', isAuthenticated, async (req, res) => {
    try {
        const [{ data: course, error: cErr }, { data: subjects, error: sErr }] = await Promise.all([
            supabase.from('courses').select('*').eq('id', req.params.id).single(),
            supabase.from('course_subjects').select('*').eq('course_id', req.params.id).order('semester').order('subject_name'),
        ]);

        if (cErr) throw cErr;
        if (sErr) throw sErr;

        // Group subjects by semester for college
        const bySemester = {};
        (subjects || []).forEach(s => {
            const sem = s.semester || 0;
            if (!bySemester[sem]) bySemester[sem] = [];
            bySemester[sem].push(s);
        });

        res.json({ course, subjects: subjects || [], bySemester });
    } catch (err) {
        console.error('[Course] Detail error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ── UPDATE COURSE ───────────────────────────────────────────────────────
router.put('/:id', isAuthenticated, requireRole('org_admin', 'faculty'), async (req, res) => {
    try {
        const { name, description, year, standard, course_name, branch, total_semesters } = req.body;
        const { data, error } = await supabase.from('courses')
            .update({ name, description, year, standard, course_name, branch, total_semesters })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        res.json({ message: 'Course updated!', course: data });
    } catch (err) {
        console.error('[Course] Update error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ── DELETE COURSE ───────────────────────────────────────────────────────
router.delete('/:id', isAuthenticated, requireRole('org_admin'), async (req, res) => {
    try {
        const { error } = await supabase.from('courses').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ message: 'Course deleted' });
    } catch (err) {
        console.error('[Course] Delete error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ══════════════════════════════════════════════════════════════════════════
// SUBJECTS CRUD
// ══════════════════════════════════════════════════════════════════════════

// ── ADD SUBJECT TO COURSE ───────────────────────────────────────────────
router.post('/:id/subjects', isAuthenticated, requireRole('org_admin', 'faculty'), async (req, res) => {
    try {
        const { subject_name, subject_code, semester, credit_hours, subject_type, syllabus_url, resources } = req.body;
        if (!subject_name) return res.status(400).json({ message: 'Subject name is required' });

        const org_id = getOrgId(req.user);

        const { data, error } = await supabase.from('course_subjects').insert({
            course_id: req.params.id,
            org_id,
            subject_name,
            subject_code: subject_code || null,
            semester: semester || null,
            credit_hours: credit_hours || null,
            subject_type: subject_type || 'theory',
            syllabus_url: syllabus_url || null,
            resources: resources || [],
        }).select().single();

        if (error) {
            if (error.code === '23505') return res.status(400).json({ message: 'This subject already exists in this semester' });
            throw error;
        }

        res.status(201).json({ message: 'Subject added!', subject: data });
    } catch (err) {
        console.error('[Course] Add subject error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ── UPDATE SUBJECT ──────────────────────────────────────────────────────
router.put('/subjects/:subjectId', isAuthenticated, requireRole('org_admin', 'faculty'), async (req, res) => {
    try {
        const { subject_name, subject_code, semester, credit_hours, subject_type, syllabus_url, resources } = req.body;
        const { data, error } = await supabase.from('course_subjects')
            .update({ subject_name, subject_code, semester, credit_hours, subject_type, syllabus_url, resources })
            .eq('id', req.params.subjectId)
            .select()
            .single();

        if (error) throw error;
        res.json({ message: 'Subject updated!', subject: data });
    } catch (err) {
        console.error('[Course] Update subject error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ── DELETE SUBJECT ──────────────────────────────────────────────────────
router.delete('/subjects/:subjectId', isAuthenticated, requireRole('org_admin', 'faculty'), async (req, res) => {
    try {
        const { error } = await supabase.from('course_subjects').delete().eq('id', req.params.subjectId);
        if (error) throw error;
        res.json({ message: 'Subject removed' });
    } catch (err) {
        console.error('[Course] Delete subject error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ══════════════════════════════════════════════════════════════════════════
// STUDENT VIEW
// ══════════════════════════════════════════════════════════════════════════

// ── GET MY COURSES (Student) ────────────────────────────────────────────
router.get('/student/my-courses', isAuthenticated, async (req, res) => {
    try {
        const org_id = getOrgId(req.user);

        const { data: courses, error } = await supabase.from('courses')
            .select('*')
            .eq('org_id', org_id)
            .eq('status', 'active')
            .order('name');

        if (error) throw error;

        const courseIds = (courses || []).map(c => c.id);
        let allSubjects = [];
        let allAssignments = [];

        if (courseIds.length > 0) {
            const [{ data: subs }, { data: assigns }] = await Promise.all([
                supabase.from('course_subjects')
                    .select('*')
                    .in('course_id', courseIds)
                    .order('semester')
                    .order('subject_name'),
                supabase.from('faculty_assignments')
                    .select('*')
                    .eq('org_id', org_id)
            ]);
            allSubjects = subs || [];
            allAssignments = assigns || [];
        }

        // 🔥 Cached MongoDB JOIN
        const teacherIds = [...new Set(allAssignments.map(a => a.teacher_id).filter(Boolean))];
        const teacherMap = await getTeacherMap(teacherIds);

        // 🔥 Fix #2: Get class_teacher assignments per division
        const classTeachers = allAssignments.filter(a => a.role === 'class_teacher');

        const enriched = (courses || []).map(c => ({
            ...c,
            // Fix #2: class teachers for this org
            class_teachers: classTeachers.map(ct => ({
                division_id: ct.division_id,
                teacher_name: teacherMap[ct.teacher_id]?.name || 'Unknown',
                teacher_pic: teacherMap[ct.teacher_id]?.profilePicture || '',
            })),
            subjects: allSubjects.filter(s => s.course_id === c.id).map(s => ({
                ...s,
                teachers: allAssignments
                    .filter(a => a.subject_id === s.id)
                    // Fix #1: Sort by role priority (Main first, Assistant second)
                    .sort((a, b) => (ROLE_PRIORITY[a.role] || 9) - (ROLE_PRIORITY[b.role] || 9))
                    .map(a => ({
                        ...a,
                        teacher_name: teacherMap[a.teacher_id]?.name || 'Unknown',
                        teacher_pic: teacherMap[a.teacher_id]?.profilePicture || '',
                    }))
            })),
        }));

        res.json({ courses: enriched });
    } catch (err) {
        console.error('[Course] Student courses error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});


// ══════════════════════════════════════════════════════════════════════════
// FACULTY ASSIGNMENTS — WHO teaches WHAT, WHERE
// ══════════════════════════════════════════════════════════════════════════

// ── ASSIGN FACULTY TO SUBJECT+DIVISION ─────────────────────────────────
router.post('/:id/assign-faculty', isAuthenticated, requireRole('org_admin'), async (req, res) => {
    try {
        const courseId = req.params.id;
        const org_id = getOrgId(req.user);
        const { teacher_id, subject_id, division_id, role } = req.body;

        if (!teacher_id || !role) return res.status(400).json({ message: 'teacher_id and role are required' });
        if (!['class_teacher', 'subject_teacher', 'assistant_teacher'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role. Must be: class_teacher, subject_teacher, or assistant_teacher' });
        }

        // ── Validation: subject belongs to this course ──
        if (subject_id) {
            const { data: sub } = await supabase.from('course_subjects')
                .select('id').eq('id', subject_id).eq('course_id', courseId).single();
            if (!sub) return res.status(400).json({ message: 'This subject does not belong to this course' });
        }

        // For class_teacher, subject_id can be null (they're assigned to the division, not a subject)
        if (role === 'class_teacher' && subject_id) {
            return res.status(400).json({ message: 'Class teacher is assigned to a division, not a subject. Leave subject_id empty.' });
        }
        if (role !== 'class_teacher' && !subject_id) {
            return res.status(400).json({ message: 'Subject teacher and assistant must have a subject_id' });
        }

        // 🔥 Fix #3: Block same teacher assigned to same subject+division with ANY role
        if (subject_id) {
            const { data: existing } = await supabase.from('faculty_assignments')
                .select('id, role')
                .eq('teacher_id', teacher_id)
                .eq('subject_id', subject_id)
                .eq('division_id', division_id || '')
                .maybeSingle();
            if (existing) {
                return res.status(400).json({ message: `This teacher is already assigned as ${existing.role.replace('_', ' ')} for this subject/division. Remove the existing assignment first.` });
            }
        }

        const { data, error } = await supabase.from('faculty_assignments').insert({
            org_id,
            teacher_id,
            subject_id: subject_id || null,
            division_id: division_id || null,
            role
        }).select().single();

        if (error) {
            if (error.code === '23505') {
                if (error.message?.includes('one_class_teacher_per_division')) {
                    return res.status(400).json({ message: 'This division already has a class teacher assigned!' });
                }
                return res.status(400).json({ message: 'This teacher is already assigned to this subject/division with this role' });
            }
            throw error;
        }

        res.status(201).json({ message: 'Faculty assigned!', assignment: data });
    } catch (err) {
        console.error('[Course] Assign faculty error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ── REMOVE FACULTY ASSIGNMENT ──────────────────────────────────────────
router.delete('/faculty-assignment/:assignmentId', isAuthenticated, requireRole('org_admin'), async (req, res) => {
    try {
        const { error } = await supabase.from('faculty_assignments')
            .delete().eq('id', req.params.assignmentId);
        if (error) throw error;
        res.json({ message: 'Assignment removed' });
    } catch (err) {
        console.error('[Course] Remove assignment error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ── GET ALL ASSIGNMENTS FOR A COURSE (Admin view) ──────────────────────
router.get('/:id/faculty', isAuthenticated, async (req, res) => {
    try {
        const courseId = req.params.id;

        // Get subject IDs belonging to this course
        const { data: subjects } = await supabase.from('course_subjects')
            .select('id').eq('course_id', courseId);
        const subjectIds = (subjects || []).map(s => s.id);

        // Get all assignments for these subjects + class_teacher (subject_id = null)
        const org_id = getOrgId(req.user);
        const { data: assignments, error } = await supabase.from('faculty_assignments')
            .select('*')
            .eq('org_id', org_id);

        if (error) throw error;

        // Filter: only assignments for this course's subjects OR class_teacher for this org
        const filtered = (assignments || []).filter(a =>
            a.subject_id === null || subjectIds.includes(a.subject_id)
        );

        // 🔥 Cached MongoDB JOIN
        const teacherIds = [...new Set(filtered.map(a => a.teacher_id))];
        const teacherMap = await getTeacherMap(teacherIds);

        // Also get subject names
        const { data: allSubs } = await supabase.from('course_subjects')
            .select('id, subject_name, subject_code')
            .eq('course_id', courseId);
        const subMap = {};
        (allSubs || []).forEach(s => { subMap[s.id] = s; });

        // Fix #1: Sort by role priority
        const enriched = filtered
            .sort((a, b) => (ROLE_PRIORITY[a.role] || 9) - (ROLE_PRIORITY[b.role] || 9))
            .map(a => ({
                ...a,
                teacher_name: teacherMap[a.teacher_id]?.name || 'Unknown',
                teacher_email: teacherMap[a.teacher_id]?.email || '',
                teacher_pic: teacherMap[a.teacher_id]?.profilePicture || '',
                teacher_dept: teacherMap[a.teacher_id]?.department || '',
                subject_name: a.subject_id ? (subMap[a.subject_id]?.subject_name || '—') : '—',
                subject_code: a.subject_id ? (subMap[a.subject_id]?.subject_code || '') : '',
            }));

        res.json({ assignments: enriched });
    } catch (err) {
        console.error('[Course] Get faculty error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ── FACULTY SELF-VIEW: "What do I teach?" ──────────────────────────────
router.get('/faculty/my-subjects', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const org_id = getOrgId(req.user);

        const { data: assignments, error } = await supabase.from('faculty_assignments')
            .select('*')
            .eq('teacher_id', userId)
            .eq('org_id', org_id);

        if (error) throw error;

        // Get subject details
        const subjectIds = (assignments || []).map(a => a.subject_id).filter(Boolean);
        let subMap = {};
        if (subjectIds.length > 0) {
            const { data: subs } = await supabase.from('course_subjects')
                .select('id, subject_name, subject_code, course_id, semester, subject_type')
                .in('id', subjectIds);
            (subs || []).forEach(s => { subMap[s.id] = s; });
        }

        // Get division names if available
        const divisionIds = (assignments || []).map(a => a.division_id).filter(Boolean);
        let divMap = {};
        if (divisionIds.length > 0) {
            const { data: divs } = await supabase.from('divisions')
                .select('id, name')
                .in('id', divisionIds);
            (divs || []).forEach(d => { divMap[d.id] = d; });
        }

        const enriched = (assignments || []).map(a => ({
            ...a,
            subject_name: a.subject_id ? (subMap[a.subject_id]?.subject_name || '—') : '—',
            subject_code: a.subject_id ? (subMap[a.subject_id]?.subject_code || '') : '',
            subject_type: a.subject_id ? (subMap[a.subject_id]?.subject_type || '') : '',
            division_name: a.division_id ? (divMap[a.division_id]?.name || '—') : 'All',
        }));

        res.json({ assignments: enriched });
    } catch (err) {
        console.error('[Course] Faculty my-subjects error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});


// ── LIST FACULTY (for dropdown when assigning) ─────────────────────────
router.get('/org/faculty-list', isAuthenticated, requireRole('org_admin'), async (req, res) => {
    try {
        const User = (await import('../models/User.js')).default;
        const orgId = req.user.organization_id || req.user.organization?._id || req.user.organization;
        
        const faculty = await User.find({
            organization_id: orgId,
            role: { $in: ['faculty', 'teacher', 'org_admin'] }
        }).select('name email profilePicture department').lean();

        res.json({ faculty: faculty.map(f => ({ ...f, _id: f._id.toString() })) });
    } catch (err) {
        console.error('[Course] Faculty list error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});


// ══════════════════════════════════════════════════════════════════════════
// BULK ASSIGN (Fix #5 — assign multiple subjects at once)
// ══════════════════════════════════════════════════════════════════════════
router.post('/:id/bulk-assign-faculty', isAuthenticated, requireRole('org_admin'), async (req, res) => {
    try {
        const courseId = req.params.id;
        const org_id = getOrgId(req.user);
        const { teacher_id, division_id, subject_ids, role } = req.body;

        if (!teacher_id || !role || !Array.isArray(subject_ids) || subject_ids.length === 0) {
            return res.status(400).json({ message: 'teacher_id, role, and subject_ids[] are required' });
        }
        if (!['subject_teacher', 'assistant_teacher'].includes(role)) {
            return res.status(400).json({ message: 'Bulk assign only supports subject_teacher and assistant_teacher' });
        }

        // Validate all subjects belong to this course
        const { data: validSubs } = await supabase.from('course_subjects')
            .select('id').eq('course_id', courseId).in('id', subject_ids);
        const validIds = (validSubs || []).map(s => s.id);
        const invalid = subject_ids.filter(id => !validIds.includes(id));
        if (invalid.length > 0) {
            return res.status(400).json({ message: `${invalid.length} subject(s) don't belong to this course` });
        }

        // Check for existing assignments (fix #3)
        const { data: existing } = await supabase.from('faculty_assignments')
            .select('subject_id')
            .eq('teacher_id', teacher_id)
            .in('subject_id', subject_ids);
        const existingSubIds = (existing || []).map(e => e.subject_id);
        const newSubIds = subject_ids.filter(id => !existingSubIds.includes(id));

        if (newSubIds.length === 0) {
            return res.status(400).json({ message: 'This teacher is already assigned to all selected subjects' });
        }

        const rows = newSubIds.map(sid => ({
            org_id, teacher_id, subject_id: sid,
            division_id: division_id || null, role
        }));

        const { data, error } = await supabase.from('faculty_assignments')
            .insert(rows).select();

        if (error) throw error;

        const skipped = subject_ids.length - newSubIds.length;
        res.status(201).json({
            message: `Assigned ${newSubIds.length} subject(s)${skipped ? ` (${skipped} skipped — already assigned)` : ''}!`,
            assignments: data
        });
    } catch (err) {
        console.error('[Course] Bulk assign error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});


// ══════════════════════════════════════════════════════════════════════════
// 🔥 AUTO CLASSROOM GENERATOR
// For every subject_teacher assignment → create a Classroom in MongoDB
// Only subject_teacher creates classroom. NOT class_teacher. NOT assistant.
// ══════════════════════════════════════════════════════════════════════════
router.post('/:id/generate-classrooms', isAuthenticated, requireRole('org_admin'), async (req, res) => {
    try {
        const courseId = req.params.id;
        const org_id = getOrgId(req.user);

        // Get course info
        const { data: course } = await supabase.from('courses')
            .select('*').eq('id', courseId).single();
        if (!course) return res.status(404).json({ message: 'Course not found' });

        // Get all subject_teacher assignments for this course
        const { data: subjects } = await supabase.from('course_subjects')
            .select('id, subject_name, subject_code, semester, subject_type')
            .eq('course_id', courseId);
        const subjectIds = (subjects || []).map(s => s.id);

        const { data: assignments } = await supabase.from('faculty_assignments')
            .select('*')
            .eq('org_id', org_id)
            .eq('role', 'subject_teacher')
            .in('subject_id', subjectIds);

        if (!assignments || assignments.length === 0) {
            return res.status(400).json({ message: 'No subject_teacher assignments found. Assign faculty first!' });
        }

        // Get division names
        const divisionIds = [...new Set((assignments || []).map(a => a.division_id).filter(Boolean))];
        let divMap = {};
        if (divisionIds.length > 0) {
            const { data: divs } = await supabase.from('divisions')
                .select('id, name').in('id', divisionIds);
            (divs || []).forEach(d => { divMap[d.id] = d.name; });
        }

        // Subject map
        const subMap = {};
        (subjects || []).forEach(s => { subMap[s.id] = s; });

        // Teacher info from cache
        const teacherIds = [...new Set(assignments.map(a => a.teacher_id))];
        const teacherMap = await getTeacherMap(teacherIds);

        // Import Classroom model
        const Classroom = (await import('../models/Classroom.js')).default;

        let created = 0;
        let skipped = 0;
        const results = [];

        for (const a of assignments) {
            const sub = subMap[a.subject_id];
            const divName = a.division_id ? (divMap[a.division_id] || 'Unknown') : 'All';
            const teacherName = teacherMap[a.teacher_id]?.name || 'Teacher';

            // Check if classroom already exists for this exact combo
            const existing = await Classroom.findOne({
                subject_id: a.subject_id,
                division_id: a.division_id || null,
                teacher: a.teacher_id,
                organization_id: org_id
            });

            if (existing) {
                skipped++;
                continue;
            }

            // Build classroom name: "FY-COMP-A Maths - Rahul"
            const classroomName = `${divName} ${sub?.subject_name || 'Subject'} - ${teacherName}`;

            const classroom = await Classroom.create({
                name: classroomName,
                description: `Auto-generated from Course Module: ${course.name}`,
                subject: (sub?.subject_name || 'general').toLowerCase(),
                subjectSlug: (sub?.subject_name || 'general').toLowerCase().replace(/\s+/g, '-'),
                teacher: a.teacher_id,
                organization_id: org_id,
                course_type: course.type || 'COLLEGE',
                year: course.year || null,
                branch: course.branch || null,
                semester: sub?.semester || null,
                standard: course.standard || null,
                division: divName !== 'All' ? divName : null,
                division_id: a.division_id || null,
                subject_id: a.subject_id,
                settings: { allowJoinRequests: true },
            });

            created++;
            results.push({ name: classroom.name, classCode: classroom.classCode });
        }

        res.status(201).json({
            message: `🎉 Generated ${created} classroom(s)${skipped ? `, ${skipped} already existed` : ''}!`,
            created,
            skipped,
            classrooms: results
        });
    } catch (err) {
        console.error('[Course] Generate classrooms error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});


export default router;
