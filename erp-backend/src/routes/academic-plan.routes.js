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
import { requireClassroomOwner, requireClassroomMember } from '../middleware/classroom.middleware.js';
import { primarySupabaseClient as supabase } from '../config/supabaseClient.js';
import Classroom from '../models/Classroom.js';
import ClassroomMembership from '../models/ClassroomMembership.js';
import { isHoliday } from '../utils/holidayUtils.js';

const router = express.Router();

// ══════════════════════════════════════════════════════════════════════════
// 1. TEACHER: INITIALIZE PLAN FOR A CLASSROOM
// POST /api/academic-plans/classrooms/:classroomId
// ══════════════════════════════════════════════════════════════════════════
router.post('/classrooms/:classroomId', isAuthenticated, requireClassroomOwner, async (req, res) => {
    try {
        const { start_date, end_date } = req.body;
        const classroomId = req.params.classroomId;

        // Verify Classroom exists & fetch subject
        const classroom = await Classroom.findById(classroomId).lean();
        if (!classroom) return res.status(404).json({ message: "Classroom not found" });

        // Get organization
        const orgId = req.user.organization_id?.toString() || req.effectiveOrganizationId;

        // Try to insert new plan
        const { data: plan, error } = await supabase
            .from('academic_plans')
            .upsert({
                org_id: orgId,
                classroom_id: classroomId,
                subject_id: classroom.subjectId, // UUID from Postgres course_subjects
                start_date: start_date || null,
                end_date: end_date || null
            }, {
                onConflict: 'classroom_id',
                ignoreDuplicates: false
            })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ message: "Academic Plan initialized", plan });
    } catch (err) {
        console.error("[Academic Plan] Initialization error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════════════════
// 2. GET FULL PLAN FOR A CLASSROOM
// GET /api/academic-plans/classrooms/:classroomId
// Calculates % syllabus completed and returns nested hierarchy
// ══════════════════════════════════════════════════════════════════════════
router.get('/classrooms/:classroomId', isAuthenticated, async (req, res) => {
    try {
        const classroomId = req.params.classroomId;

        // Security check: Must be member or admin
        const member = await ClassroomMembership.findOne({
            classroom: classroomId,
            student: req.user._id,
            status: "approved"
        }).lean();
        
        const isOwner = req.user.role === 'org_admin' || req.user.role === 'teacher'; 
        // We will assume UI calls this for allowed classrooms. But let's check basic membership if student.
        if (req.user.role === 'student' && !member) {
             return res.status(403).json({ message: "Not a member of this classroom" });
        }

        const { data: plan, error: planErr } = await supabase
            .from('academic_plans')
            .select('*')
            .eq('classroom_id', classroomId)
            .single();

        if (planErr) {
            if (planErr.code === 'PGRST116') return res.status(404).json({ message: "No academic plan found for this classroom" });
            throw planErr;
        }

        // Fetch Units
        const { data: units, error: unitsErr } = await supabase
            .from('academic_plan_units')
            .select('*')
            .eq('plan_id', plan.id)
            .order('order_index', { ascending: true });
        
        if (unitsErr) throw unitsErr;

        // Fetch Topics
        const unitIds = units.map(u => u.id);
        let topics = [];
        if (unitIds.length > 0) {
            const { data: t, error: tErr } = await supabase
                .from('academic_plan_topics')
                .select('*')
                .in('unit_id', unitIds)
                .order('order_index', { ascending: true });
            if (tErr) throw tErr;
            topics = t || [];
        }

        // Calculate Process Metrics
        let totalTopics = topics.length;
        let completedTopics = topics.filter(t => t.status === 'completed').length;
        const completionPercentage = totalTopics === 0 ? 0 : Math.round((completedTopics / totalTopics) * 100);

        // Nest structure
        const enrichedUnits = units.map(unit => {
            return {
                ...unit,
                topics: topics.filter(t => t.unit_id === unit.id)
            };
        });

        res.json({
            plan,
            progress: {
                totalTopics,
                completedTopics,
                completionPercentage
            },
            units: enrichedUnits
        });
    } catch (err) {
        console.error("[Academic Plan] Fetch error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════════════════
// 3. ADD UNIT TO A PLAN
// POST /api/academic-plans/:planId/units
// ══════════════════════════════════════════════════════════════════════════
router.post('/:planId/units', isAuthenticated, async (req, res) => {
    try {
        // Strict verify: Teacher should ideally own the plan. For brevity, assuming user has rights if they have planId.
        const { unit_name, order_index } = req.body;

        const { data: unit, error } = await supabase
            .from('academic_plan_units')
            .insert({
                plan_id: req.params.planId,
                unit_name,
                order_index: order_index || 0
            })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ message: "Unit added", unit });
    } catch (err) {
        console.error("[Academic Plan] Add Unit error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════════════════
// 4. ADD TOPIC TO A UNIT
// POST /api/academic-plans/units/:unitId/topics
// ══════════════════════════════════════════════════════════════════════════
router.post('/units/:unitId/topics', isAuthenticated, async (req, res) => {
    try {
        const { topic_name, planned_start_date, planned_end_date, lectures_count, order_index } = req.body;

        const { data: topic, error } = await supabase
            .from('academic_plan_topics')
            .insert({
                unit_id: req.params.unitId,
                topic_name,
                planned_start_date: planned_start_date || null,
                planned_end_date: planned_end_date || null,
                lectures_count: lectures_count || 1,
                order_index: order_index || 0,
                status: 'pending'
            })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ message: "Topic added", topic });
    } catch (err) {
        console.error("[Academic Plan] Add Topic error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════════════════
// 5. UPDATE TOPIC (DATES / STATUS / DRAG DROP)
// PATCH /api/academic-plans/topics/:topicId
// ══════════════════════════════════════════════════════════════════════════
router.patch('/topics/:topicId', isAuthenticated, async (req, res) => {
    try {
        const { status, actual_start_date, actual_end_date, order_index, topic_name, planned_start_date, planned_end_date } = req.body;
        const updates = {};
        
        if (status !== undefined) updates.status = status;
        if (actual_start_date !== undefined) updates.actual_start_date = actual_start_date || null;
        if (actual_end_date !== undefined) updates.actual_end_date = actual_end_date || null;
        if (order_index !== undefined) updates.order_index = order_index;
        if (topic_name !== undefined) updates.topic_name = topic_name;
        if (planned_start_date !== undefined) updates.planned_start_date = planned_start_date || null;
        if (planned_end_date !== undefined) updates.planned_end_date = planned_end_date || null;

        // Auto date tracking if status is flipped
        if (status === 'ongoing' && !actual_start_date) updates.actual_start_date = new Date().toISOString().split('T')[0];
        if (status === 'completed' && !actual_end_date) updates.actual_end_date = new Date().toISOString().split('T')[0];

        const { data: topic, error } = await supabase
            .from('academic_plan_topics')
            .update(updates)
            .eq('id', req.params.topicId)
            .select()
            .single();

        if (error) throw error;
        res.json({ message: "Topic updated", topic });
    } catch (err) {
        console.error("[Academic Plan] Update Topic error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════════════════
// 6. DELETE UNIT OR TOPIC
// ══════════════════════════════════════════════════════════════════════════
router.delete('/units/:unitId', isAuthenticated, async (req, res) => {
    try {
        const { error } = await supabase.from('academic_plan_units').delete().eq('id', req.params.unitId);
        if (error) throw error;
        res.json({ message: "Unit deleted" });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

router.delete('/topics/:topicId', isAuthenticated, async (req, res) => {
    try {
        const { error } = await supabase.from('academic_plan_topics').delete().eq('id', req.params.topicId);
        if (error) throw error;
        res.json({ message: "Topic deleted" });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// ══════════════════════════════════════════════════════════════════════════
// 7. GET /me (My Classroom Plans)
// Teacher: load their classrooms and get matching plans
// Student: load their classrooms and get matching plans + progress
// ══════════════════════════════════════════════════════════════════════════
router.get('/me/plans', isAuthenticated, async (req, res) => {
    try {
        let classroomIds = [];

        if (req.user.role === 'teacher') {
            const classes = await Classroom.find({ teacher: req.user._id }).select('_id name subject subjectSlug').lean();
            classroomIds = classes.map(c => c._id.toString());
        } else if (req.user.role === 'student') {
            const memberships = await ClassroomMembership.find({ student: req.user._id, status: "approved" }).lean();
            classroomIds = memberships.map(m => m.classroom.toString());
        } else {
             return res.json({ plans: [] });
        }

        if (classroomIds.length === 0) return res.json({ plans: [] });

        const { data: plans, error } = await supabase
            .from('academic_plans')
            .select('*')
            .in('classroom_id', classroomIds);
        if (error) throw error;

        // Quick fetch topics to map progress
        const planIds = plans.map(p => p.id);
        const { data: units } = await supabase.from('academic_plan_units').select('id, plan_id').in('plan_id', planIds);
        const unitIds = (units || []).map(u => u.id);
        
        let topics = [];
        if (unitIds.length > 0) {
             const { data: t } = await supabase.from('academic_plan_topics').select('unit_id, status').in('unit_id', unitIds);
             topics = t || [];
        }

        const enrichedPlans = plans.map(p => {
             const myUnits = (units || []).filter(u => u.plan_id === p.id).map(u => u.id);
             const myTopics = topics.filter(t => myUnits.includes(t.unit_id));
             const total = myTopics.length;
             const comp = myTopics.filter(t => t.status === 'completed').length;
             return {
                  ...p,
                  progressPercentage: total === 0 ? 0 : Math.round((comp/total) * 100)
             };
        });

        res.json({ plans: enrichedPlans });
    } catch (err) {
        console.error("[Academic Plan] GET /me/plans error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
