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
import TeacherPlan from '../models/TeacherPlan.js';
import Classroom from '../models/Classroom.js';

const router = express.Router();

router.use(isAuthenticated, attachInstitutionProfile({ required: false }));

router.get('/institution-profile', attachInstitutionProfile(), (req, res) => {
    res.json({
        institution_profile: req.institutionProfile,
        staff_assignment_profile: req.institutionProfile.staffAssignmentProfile,
        academic_session_profile: req.institutionProfile.academicSessionProfile,
    });
});

// ═══════════════════════════════════════════════════════════════
// PLAN CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/teacher-planner/plan
 * Create or update a daily/weekly plan for a classroom.
 * Uses upsert: same classroom + week/date = update, different = create.
 */
router.post('/plan', isAuthenticated, requireRole('faculty', 'org_admin'), async (req, res) => {
    try {
        const { classroomId, weekNumber, year, planningType, date, goals, topicsCovered, homeworkAssigned, notes } = req.body;
        const teacherId = req.user._id;
        const orgId = req.user.organization_id;

        if (!classroomId) {
            return res.status(400).json({ message: "classroomId is required" });
        }

        // Verify teacher owns this classroom (unless org_admin)
        if (req.user.role !== 'org_admin') {
            const classroom = await Classroom.findOne({ _id: classroomId, teacher: teacherId });
            if (!classroom) {
                return res.status(403).json({ message: "You are not authorized to plan for this classroom" });
            }
        }

        // Build upsert query based on plan type
        const query = planningType === 'daily'
            ? { classroomId, planningType: 'daily', date: new Date(date) }
            : { classroomId, planningType: 'weekly', weekNumber: weekNumber || getWeekNumber(new Date()), year: year || new Date().getFullYear() };

        const plan = await TeacherPlan.findOneAndUpdate(
            query,
            {
                teacher: teacherId,
                organizationId: orgId,
                classroomId,
                weekNumber: weekNumber || getWeekNumber(new Date()),
                year: year || new Date().getFullYear(),
                planningType: planningType || 'weekly',
                date: date ? new Date(date) : undefined,
                goals: goals || [],
                topicsCovered: topicsCovered || [],
                homeworkAssigned: homeworkAssigned || false,
                notes: notes || ''
            },
            { upsert: true, returnDocument: 'after' }
        );

        res.status(200).json({ message: "Plan saved successfully", plan });
    } catch (err) {
        console.error("[Planner] POST Error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * GET /api/teacher-planner/me
 * Teacher's own plans across all their classrooms.
 * Supports: ?year=2026&weekNumber=15
 */
router.get('/me', isAuthenticated, requireRole('faculty', 'org_admin'), async (req, res) => {
    try {
        const teacherId = req.user._id;
        const { year, weekNumber } = req.query;

        const filter = { teacher: teacherId };
        if (year) filter.year = parseInt(year);
        if (weekNumber) filter.weekNumber = parseInt(weekNumber);

        const plans = await TeacherPlan.find(filter)
            .populate('classroomId', 'name subject')
            .sort({ date: -1, createdAt: -1 })
            .lean();

        // Group by classroom for dashboard view
        const byClassroom = {};
        plans.forEach(p => {
            const cId = p.classroomId?._id?.toString() || 'unknown';
            if (!byClassroom[cId]) {
                byClassroom[cId] = {
                    classroom: p.classroomId || { name: 'Unknown' },
                    plans: []
                };
            }
            byClassroom[cId].plans.push(p);
        });

        res.json({
            totalPlans: plans.length,
            classrooms: Object.values(byClassroom)
        });
    } catch (err) {
        console.error("[Planner] GET /me Error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * GET /api/teacher-planner/classroom/:classroomId
 * Get all plans for a specific classroom, optionally filtered by year/week.
 */
router.get('/classroom/:classroomId', isAuthenticated, async (req, res) => {
    try {
        const { year, weekNumber, planningType } = req.query;
        const filter = { classroomId: req.params.classroomId };
        if (year) filter.year = parseInt(year);
        if (weekNumber) filter.weekNumber = parseInt(weekNumber);
        if (planningType) filter.planningType = planningType;

        const plans = await TeacherPlan.find(filter).sort({ date: -1, createdAt: -1 }).lean();

        // Compute goal completion stats
        let totalGoals = 0;
        let completedGoals = 0;
        plans.forEach(p => {
            (p.goals || []).forEach(g => {
                totalGoals++;
                if (g.isCompleted || g.status === 'completed') completedGoals++;
            });
        });

        res.json({
            plans,
            stats: {
                totalPlans: plans.length,
                totalGoals,
                completedGoals,
                completionRate: totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0
            }
        });
    } catch (err) {
        console.error("[Planner] GET /classroom Error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * GET /api/teacher-planner/today
 * Quick shortcut: Get today's daily plan for all teacher's classrooms.
 * Used for the "What's on today?" widget.
 */
router.get('/today', isAuthenticated, requireRole('faculty', 'org_admin'), async (req, res) => {
    try {
        const teacherId = req.user._id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayPlans = await TeacherPlan.find({
            teacher: teacherId,
            planningType: 'daily',
            date: { $gte: today, $lt: tomorrow }
        })
            .populate('classroomId', 'name subject')
            .lean();

        // Also fetch current week's weekly plan if no daily plans exist
        const currentWeek = getWeekNumber(new Date());
        const currentYear = new Date().getFullYear();

        const weeklyPlans = await TeacherPlan.find({
            teacher: teacherId,
            planningType: 'weekly',
            weekNumber: currentWeek,
            year: currentYear
        })
            .populate('classroomId', 'name subject')
            .lean();

        res.json({
            date: today.toISOString().split('T')[0],
            weekNumber: currentWeek,
            dailyPlans: todayPlans,
            weeklyPlans
        });
    } catch (err) {
        console.error("[Planner] GET /today Error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ═══════════════════════════════════════════════════════════════
// GOAL MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * PATCH /api/teacher-planner/plan/:planId/goals/:goalId
 * Toggle goal completion status
 */
router.patch('/plan/:planId/goals/:goalId', isAuthenticated, async (req, res) => {
    try {
        const { isCompleted, status } = req.body;
        const plan = await TeacherPlan.findOne({ _id: req.params.planId });
        if (!plan) return res.status(404).json({ message: "Plan not found" });

        const goal = plan.goals.id(req.params.goalId);
        if (!goal) return res.status(404).json({ message: "Goal not found" });

        if (isCompleted !== undefined) goal.isCompleted = isCompleted;
        if (status !== undefined) goal.status = status;
        // Auto-sync: if marking completed via status, also set isCompleted
        if (status === 'completed') goal.isCompleted = true;

        await plan.save();
        res.json({ message: "Goal updated", plan });
    } catch (err) {
        console.error("[Planner] PATCH goal Error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * DELETE /api/teacher-planner/plan/:planId
 * Delete a plan entirely
 */
router.delete('/plan/:planId', isAuthenticated, requireRole('faculty', 'org_admin'), async (req, res) => {
    try {
        const plan = await TeacherPlan.findOneAndDelete({
            _id: req.params.planId,
            teacher: req.user._id
        });
        if (!plan) return res.status(404).json({ message: "Plan not found or not yours" });
        res.json({ message: "Plan deleted" });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});


// ═══════════════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════════════

/** ISO 8601 week number */
function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

export default router;
