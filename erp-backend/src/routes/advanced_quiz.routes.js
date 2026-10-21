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
import { getChatSb } from "../config/supabaseClient.js";
import { isAuthenticated, requireRole } from "../middleware/auth.middleware.js";
import { requireClassroomOwner, requireClassroomMember } from "../middleware/classroom.middleware.js";
import { quizAutosaveLimiter, quizAntiCheatLimiter } from "../middleware/rateLimiter.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import ClassroomMembership from "../models/ClassroomMembership.js";
import connectDB from "../../config/db.js";
import { generateAiQuestions } from "../services/quiz-ai.service.js";
import { syncAndGradeGoogleSheet, fetchSheetData } from "../services/quiz-google.service.js";

const router = express.Router();

/**
 * Extract Google Sheet ID from a full URL or return as-is if already an ID.
 */
function extractSheetId(input) {
    if (!input) return null;
    const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : input; // If no match, assume it's already a raw ID
}

/**
 * ==========================================
 * FACULTY/ADMIN ROUTES
 * ==========================================
 */

/**
 * POST /api/advanced-quiz/create
 * Create a new quiz
 */
router.post("/create", isAuthenticated, requireRole("faculty", "org_admin"), async (req, res) => {
    try {
        const { title, type, classroom_id, start_time, end_time, questions, google_mappings, google_sheet_id, google_form_link, negative_marks, show_results_after_end } = req.body;
        
        if (!title || !type || !classroom_id) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const supabase = getChatSb();
        const { data, error } = await supabase.from('advanced_quizzes').insert([{
            title, type, classroom_id, created_by: req.user.id, start_time, end_time, 
            questions: questions || [], google_mappings: google_mappings || [], google_sheet_id: extractSheetId(google_sheet_id),
            google_form_link: google_form_link || null,
            negative_marks: negative_marks || 0, show_results_after_end: show_results_after_end !== false
        }]).select().single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        console.error("Quiz Create Error:", err);
        res.status(500).json({ error: "Failed to create quiz" });
    }
});

/**
 * POST /api/advanced-quiz/check-sheet
 * Verify that the service account can access the given Google Sheet
 */
router.post("/check-sheet", isAuthenticated, requireRole("faculty", "org_admin"), async (req, res) => {
    try {
        const { sheet_id } = req.body;
        if (!sheet_id) return res.status(400).json({ error: "Sheet ID is required" });
        
        await fetchSheetData(sheet_id);
        res.json({ success: true, message: "Sheet is accessible" });
    } catch (err) {
        console.error("Sheet Check Error:", err.message);
        res.status(400).json({ error: "Cannot access this sheet. Please share it with classgrid@classgrid-488119.iam.gserviceaccount.com as Viewer." });
    }
});

/**
 * GET /api/advanced-quiz/my-quizzes
 * Get all quizzes created by this faculty
 */
router.get("/my-quizzes", isAuthenticated, requireRole("faculty", "org_admin"), async (req, res) => {
    try {
        const supabase = getChatSb();
        const { data, error } = await supabase
            .from('advanced_quizzes')
            .select('*')
            .eq('created_by', req.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error("Get My Quizzes Error:", err);
        res.status(500).json({ error: "Failed to fetch quizzes" });
    }
});

/**
 * PUT /api/advanced-quiz/:quizId
 * Update a quiz
 */
router.put("/:quizId", isAuthenticated, requireRole("faculty", "org_admin"), async (req, res) => {
    try {
        const supabase = getChatSb();
        const { data: quiz, error: fetchErr } = await supabase.from('advanced_quizzes').select('created_by').eq('id', req.params.quizId).single();
        if (fetchErr || !quiz) return res.status(404).json({ error: "Quiz not found" });
        if (quiz.created_by !== req.user.id && req.user.role !== 'org_admin') return res.status(403).json({ error: "Unauthorized" });

        const { error } = await supabase.from('advanced_quizzes').update({ ...req.body, attempt_count: 0 }).eq('id', req.params.quizId);
        if (error) throw error;

        // Clear old attempts so students can retake the republished quiz
        await supabase.from('quiz_attempts').delete().eq('quiz_id', req.params.quizId);

        res.json({ success: true });
    } catch (err) {
        console.error("Update Quiz Error:", err);
        res.status(500).json({ error: "Failed to update quiz" });
    }
});

/**
 * DELETE /api/advanced-quiz/:quizId
 * Delete a quiz
 */
router.delete("/:quizId", isAuthenticated, requireRole("faculty", "org_admin"), async (req, res) => {
    try {
        const supabase = getChatSb();
        const { data: quiz, error: fetchErr } = await supabase.from('advanced_quizzes').select('created_by').eq('id', req.params.quizId).single();
        if (fetchErr || !quiz) return res.status(404).json({ error: "Quiz not found" });
        if (quiz.created_by !== req.user.id && req.user.role !== 'org_admin') return res.status(403).json({ error: "Unauthorized" });

        const { error } = await supabase.from('advanced_quizzes').delete().eq('id', req.params.quizId);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        console.error("Delete Quiz Error:", err);
        res.status(500).json({ error: "Failed to delete quiz" });
    }
});

/**
 * POST /api/advanced-quiz/:quizId/status
 * Update status: draft -> active -> closed
 */
router.post("/:quizId/status", isAuthenticated, requireRole("faculty", "org_admin"), async (req, res) => {
    try {
        const { status } = req.body;
        if (!['draft', 'active', 'closed'].includes(status)) return res.status(400).json({ error: "Invalid status" });

        const supabase = getChatSb();
        const { data: quiz, error: fetchErr } = await supabase.from('advanced_quizzes').select('created_by, classroom_id, title').eq('id', req.params.quizId).single();
        if (fetchErr || !quiz) return res.status(404).json({ error: "Quiz not found" });
        if (quiz.created_by !== req.user.id && req.user.role !== 'org_admin') return res.status(403).json({ error: "Unauthorized" });

        const { error } = await supabase.from('advanced_quizzes').update({ status }).eq('id', req.params.quizId);
        if (error) throw error;
        
        res.json({ success: true, status });

        // 🔔 Fire-and-forget: Notify students if quiz is activated via MongoDB (shows in bell icon)
        if (status === 'active') {
            (async () => {
                try {
                    const members = await ClassroomMembership.find({ classroom: quiz.classroom_id, status: "approved" }).select("student").lean();
                    const memberIds = members.map(m => m.student);
                    const memberUsers = await User.find({ _id: { $in: memberIds } }).select("_id pushNotifications").lean();

                    const mongoNotifs = memberUsers
                        .filter(u => u.pushNotifications?.global !== false)
                        .map(u => ({
                            recipient: u._id,
                            type: "quiz",
                            title: "New Quiz Active",
                            message: `A new quiz "${quiz.title}" is now active.`,
                            link: `/classroom/${quiz.classroom_id}?tab=quiz`,
                            relatedId: req.params.quizId,
                        }));
                    if (mongoNotifs.length > 0) {
                        Notification.insertMany(mongoNotifs).catch(e => console.error("[Quiz] Notif error:", e.message));
                    }
                } catch (notifErr) {
                    console.error("[Quiz] Notification error:", notifErr.message);
                }
            })();
        }
    } catch (err) {
        console.error("Update Status Error:", err);
        res.status(500).json({ error: "Failed to update status" });
    }
});

/**
 * ==========================================
 * SHARED ROUTES
 * ==========================================
 */

/**
 * GET /api/advanced-quiz/classroom/:classroomId
 * Get quizzes for a specific classroom
 */
router.get("/classroom/:classroomId", isAuthenticated, requireClassroomMember, async (req, res) => {
    try {
        const supabase = getChatSb();
        // Students should only see active or closed quizzes, not drafts. Faculty/Admin see all.
        let query = supabase.from('advanced_quizzes').select('id, title, type, start_time, end_time, status, negative_marks, show_results_after_end, attempt_count, google_form_link').eq('classroom_id', req.params.classroomId).order('created_at', { ascending: false });
        
        if (req.user.role === 'student') {
            query = query.neq('status', 'draft');
        }

        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error("Get Classroom Quizzes Error:", err);
        res.status(500).json({ error: "Failed to fetch classroom quizzes" });
    }
});

/**
 * GET /api/advanced-quiz/:quizId
 * Get quiz details
 */
router.get("/:quizId", isAuthenticated, async (req, res) => {
    try {
        const supabase = getChatSb();
        const { data: quiz, error } = await supabase.from('advanced_quizzes').select('*').eq('id', req.params.quizId).single();
        if (error || !quiz) return res.status(404).json({ error: "Quiz not found" });

        // Security: Remove answers & questions if student. Students fetch secure questions via /start endpoint.
        if (req.user.role === 'student' || (req.user.role === 'faculty' && quiz.created_by !== req.user.id)) {
            quiz.question_count = (quiz.questions || []).length;
            quiz.total_marks = (quiz.questions || []).reduce((sum, q) => sum + (q.marks || 1), 0);
            delete quiz.questions; 
            delete quiz.google_mappings;
            delete quiz.google_sheet_id;
        }

        res.json(quiz);
    } catch (err) {
        console.error("Get Quiz Error:", err);
        res.status(500).json({ error: "Failed to fetch quiz" });
    }
});

/**
 * POST /api/advanced-quiz/ai/generate
 * Generate AI questions
 */
router.post("/ai/generate", isAuthenticated, requireRole("faculty", "org_admin"), async (req, res) => {
    try {
        const { topic, difficulty, count } = req.body;
        if (!topic || !difficulty || !count) return res.status(400).json({ error: "Missing required fields" });
        
        const questions = await generateAiQuestions(topic, difficulty, parseInt(count));
        res.json({ questions });
    } catch (err) {
        console.error("AI Generate Error:", err);
        res.status(500).json({ error: err.message || "Failed to generate questions" });
    }
});

/**
 * POST /api/advanced-quiz/:quizId/google/sync
 * Manually sync and grade responses from the linked Google Sheet
 */
router.post("/:quizId/google/sync", isAuthenticated, requireRole("faculty", "org_admin"), async (req, res) => {
    try {
        const supabase = getChatSb();
        
        // 1. Fetch Quiz Configuration
        const { data: quiz, error: fetchErr } = await supabase.from('advanced_quizzes').select('*').eq('id', req.params.quizId).single();
        if (fetchErr || !quiz) return res.status(404).json({ error: "Quiz not found" });
        if (quiz.created_by !== req.user.id && req.user.role !== 'org_admin') return res.status(403).json({ error: "Unauthorized" });

        if (quiz.type !== 'google' || !quiz.google_sheet_id || !quiz.google_mappings) {
            return res.status(400).json({ error: "Quiz is not configured for Google Sheets integration." });
        }

        // 2. Process Sheet Data
        const processedAttempts = await syncAndGradeGoogleSheet(quiz.google_sheet_id, quiz.google_mappings, quiz.negative_marks || 0);

        if (processedAttempts.length === 0) {
            return res.json({ success: true, message: "No responses found to sync.", synchronized: 0 });
        }

        // 3. Map Emails to User IDs via MongoDB
        const emailsToFind = processedAttempts.map(p => p.email);
        const users = await User.find({ email: { $in: emailsToFind } }).select('_id email').lean();
        
        const emailToUserIdMap = new Map();
        users.forEach(u => emailToUserIdMap.set(u.email, u._id.toString()));

        let synchronizedCount = 0;

        // 4. Save Attempts to Supabase
        for (const attemptData of processedAttempts) {
            const userId = emailToUserIdMap.get(attemptData.email);
            if (!userId) continue; // Skip emails that don't match any registered user

            const { data: existingAttempt } = await supabase.from('quiz_attempts').select('id, is_submitted').eq('quiz_id', quiz.id).eq('user_id', userId).single();
            
            if (existingAttempt) {
                // Update existing record
                await supabase.from('quiz_attempts').update({
                    score: attemptData.score,
                    total_marks: attemptData.total_marks,
                    responses: attemptData.responses,
                    is_submitted: true,
                    submitted_at: new Date()
                }).eq('id', existingAttempt.id);
            } else {
                // Insert new record
                await supabase.from('quiz_attempts').insert([{
                    quiz_id: quiz.id,
                    user_id: userId,
                    score: attemptData.score,
                    total_marks: attemptData.total_marks,
                    responses: attemptData.responses,
                    is_submitted: true,
                    submitted_at: new Date()
                }]);
            }
            synchronizedCount++;
        }

        // Update Attempt count
        const { count: attemptsCount } = await supabase.from('quiz_attempts').select('id', { count: 'exact', head: true }).eq('quiz_id', quiz.id);
        await supabase.from('advanced_quizzes').update({ attempt_count: attemptsCount || synchronizedCount }).eq('id', quiz.id);

        res.json({ success: true, message: `Successfully synchronized ${synchronizedCount} attempts.`, synchronized: synchronizedCount });

    } catch (err) {
        console.error("Google Sync Error:", err);
        res.status(500).json({ error: err.message || "Failed to sync Google Sheet" });
    }
});

/**
/**
 * ==========================================
 * STUDENT ROUTES
 * ==========================================
 */

/**
 * GET /api/advanced-quiz/student/dashboard
 * Fetch all quizzes for all classrooms the student is enrolled in + attempt stats
 */
router.get("/student/dashboard", isAuthenticated, requireRole("student"), async (req, res) => {
    try {
        const supabase = getChatSb();
        const { default: Classroom } = await import("../models/Classroom.js");
        const { default: connectDB } = await import("../../config/db.js");
        await connectDB();
        
        const userId = req.user._id ? req.user._id.toString() : req.user.id;

        // 1. Get all classrooms for this student (from Supabase memberships)
        const { data: memberData, error: memErr } = await supabase
            .from('classroom_memberships')
            .select('classroom_id')
            .eq('student_id', userId)
            .eq('status', 'approved');
            
        if (memErr) throw memErr;
        
        const classroomIds = (memberData || []).map(m => m.classroom_id);
        
        if (classroomIds.length === 0) {
            return res.json({ quizzes: [], stats: { totalAttempted: 0, avgScore: 0, bestScore: 0, focusScore: 100, switchCount: 0 } });
        }

        // Fetch classroom names from MongoDB
        const classrooms = await Classroom.find({ _id: { $in: classroomIds } }).select('_id name').lean();
        const classMap = {};
        classrooms.forEach(c => { classMap[c._id.toString()] = c.name; });

        // 2. Fetch all quizzes in these classrooms
        const { data: quizzes, error: quizErr } = await supabase
            .from('advanced_quizzes')
            .select('*')
            .in('classroom_id', classroomIds)
            .order('created_at', { ascending: false });
            
        if (quizErr) throw quizErr;

        // 3. Fetch all attempts by this student for these quizzes
        const quizIds = (quizzes || []).map(q => q.id);
        let attempts = [];
        if (quizIds.length > 0) {
            const { data: attemptData, error: attErr } = await supabase
                .from('quiz_attempts')
                .select('*')
                .eq('user_id', userId)
                .in('quiz_id', quizIds);
            if (attErr) throw attErr;
            attempts = attemptData || [];
        }

        // Compute Stats
        let totalAttempted = 0;
        let totalPct = 0;
        let maxPct = 0;
        let totalSwitches = 0;
        let focusSum = 0;

        // Build a quiz map for quick lookup of total questions
        const quizMap = {};
        (quizzes || []).forEach(q => { quizMap[q.id] = q; });

        const attemptMap = {};
        attempts.forEach(a => {
            if (a.is_submitted) {
                totalAttempted++;
                
                // Calculate percentage based on quiz type
                const quiz = quizMap[a.quiz_id];
                let maxPossible = a.total_marks || (quiz?.type !== 'google' ? (quiz?.questions || []).reduce((sum, q) => sum + (q.marks || 1), 0) : 0) || quiz?.questions?.length || 0;
                let pct = maxPossible > 0 ? Math.round((a.score / maxPossible) * 100) : 0;
                
                totalPct += pct;
                if (pct > maxPct) maxPct = pct;
                
                const switches = a.cheat_logs?.filter(log => log.type === 'tab_switch' || log.type === 'blur')?.length || 0;
                totalSwitches += switches;
                
                let userFocusScore = 100 - (switches * 5);
                if (userFocusScore < 0) userFocusScore = 0;
                focusSum += userFocusScore;
            }
            attemptMap[a.quiz_id] = a;
        });

        const avgScore = totalAttempted > 0 ? Math.round(totalPct / totalAttempted) : 0;
        const avgFocusScore = totalAttempted > 0 ? Math.round(focusSum / totalAttempted) : 100;

        // Map attempts onto quizzes
        const enrichedQuizzes = (quizzes || []).map(q => {
            const attempt = attemptMap[q.id];
            return {
                ...q,
                classroom_name: classMap[q.classroom_id] || 'Unknown Classroom',
                attempt_status: attempt ? (attempt.is_submitted ? 'completed' : 'in_progress') : 'not_started',
                score: attempt?.score || null,
                attempt_id: attempt?.id || null
            };
        });

        res.json({
            quizzes: enrichedQuizzes,
            stats: {
                totalAttempted,
                avgScore,
                bestScore: maxPct,
                focusScore: avgFocusScore,
                switchCount: totalSwitches
            }
        });

    } catch (err) {
        console.error("Student Dashboard Error:", err.message || err);
        res.status(500).json({ error: "Failed to load student dashboard" });
    }
});

/**
 * GET /api/advanced-quiz/:quizId/start
 * Starts a quiz attempt. Idempotent.
 */
router.get("/:quizId/start", isAuthenticated, requireRole("student"), async (req, res) => {
    try {
        const supabase = getChatSb();
        
        // 1. Fetch quiz to ensure it's active and within time bounds
        const { data: quiz, error: quizErr } = await supabase.from('advanced_quizzes').select('*').eq('id', req.params.quizId).single();
        if (quizErr || !quiz) return res.status(404).json({ error: "Quiz not found" });

        if (quiz.status !== 'active') return res.status(403).json({ error: "Quiz is not currently active" });
        
        const now = new Date();
        if (quiz.start_time && now < new Date(quiz.start_time)) return res.status(403).json({ error: "Quiz has not started yet" });
        if (quiz.end_time && now > new Date(quiz.end_time)) return res.status(403).json({ error: "Quiz has ended" });

        const userId = req.user._id ? req.user._id.toString() : req.user.id;

        // 2. Check if attempt already exists
        const { data: existingAttempt } = await supabase.from('quiz_attempts').select('*').eq('quiz_id', quiz.id).eq('user_id', userId).single();

        let attempt = existingAttempt;

        if (!attempt) {
            // Create new attempt
            const { data: newAttempt, error: attemptErr } = await supabase.from('quiz_attempts').insert([{
                quiz_id: quiz.id,
                user_id: userId
            }]).select().single();

            if (attemptErr) throw attemptErr;
            attempt = newAttempt;
        }

        // 3. Strip correct_answer from questions
        const safeQuestions = (quiz.questions || []).map(q => ({
            question_id: q.question_id,
            question: q.question,
            options: q.options
        }));

        res.json({
            quiz: { ...quiz, questions: safeQuestions },
            attempt
        });
    } catch (err) {
        console.error("Quiz Start Error:", err);
        res.status(500).json({ error: "Failed to start quiz" });
    }
});

/**
 * POST /api/advanced-quiz/:quizId/autosave
 */
router.post("/:quizId/autosave", isAuthenticated, requireRole("student"), quizAutosaveLimiter, async (req, res) => {
    try {
        const { responses } = req.body;
        const supabase = getChatSb();

        // Validate attempt is not submitted
        const userId = req.user._id ? req.user._id.toString() : req.user.id;
        const { data: attempt, error: fetchErr } = await supabase.from('quiz_attempts').select('id, is_submitted').eq('quiz_id', req.params.quizId).eq('user_id', userId).single();
        
        if (fetchErr || !attempt) return res.status(404).json({ error: "Attempt not found" });
        if (attempt.is_submitted) return res.status(403).json({ error: "Already submitted" });

        // ── Hard Deadline Enforcement (with 2 min grace period) ──────────────────
        const { data: quizForTime } = await supabase.from('advanced_quizzes').select('end_time').eq('id', req.params.quizId).single();
        if (quizForTime?.end_time) {
            const deadline = new Date(new Date(quizForTime.end_time).getTime() + 2 * 60000); // 2 mins grace
            if (new Date() > deadline) {
                return res.status(403).json({ error: "Quiz deadline has passed. No further changes allowed." });
            }
        }

        const { error } = await supabase.from('quiz_attempts').update({ responses, updated_at: new Date() }).eq('id', attempt.id);
        if (error) throw error;

        res.json({ success: true });
    } catch (err) {
        console.error("Quiz Autosave Error:", err);
        res.status(500).json({ error: "Failed to autosave" });
    }
});

/**
 * POST /api/advanced-quiz/:quizId/anticheat
 */
router.post("/:quizId/anticheat", isAuthenticated, requireRole("student"), quizAntiCheatLimiter, async (req, res) => {
    try {
        const supabase = getChatSb();

        const userId = req.user._id ? req.user._id.toString() : req.user.id;
        const { data: attempt, error: fetchErr } = await supabase.from('quiz_attempts').select('id, is_submitted, switch_count').eq('quiz_id', req.params.quizId).eq('user_id', userId).single();
        if (fetchErr || !attempt) return res.status(404).json({ error: "Attempt not found" });
        if (attempt.is_submitted) return res.status(403).json({ error: "Already submitted" });

        const newSwitchCount = attempt.switch_count + 1;
        const newFocusScore = Math.max(0, 100 - (newSwitchCount * 10));
        
        let newStatus = 'normal';
        if (newSwitchCount >= 4) newStatus = 'review';
        else if (newSwitchCount >= 2) newStatus = 'suspicious';

        const { error } = await supabase.from('quiz_attempts').update({
            switch_count: newSwitchCount,
            focus_score: newFocusScore,
            status: newStatus
        }).eq('id', attempt.id);

        if (error) throw error;
        res.json({ success: true, focus_score: newFocusScore });
    } catch (err) {
        console.error("Quiz Anticheat Error:", err);
        res.status(500).json({ error: "Failed to report anticheat" });
    }
});

/**
 * POST /api/advanced-quiz/:quizId/submit
 */
router.post("/:quizId/submit", isAuthenticated, requireRole("student"), async (req, res) => {
    try {
        const { responses } = req.body;
        const supabase = getChatSb();

        const { data: quiz, error: quizErr } = await supabase.from('advanced_quizzes').select('*').eq('id', req.params.quizId).single();
        if (quizErr || !quiz) return res.status(404).json({ error: "Quiz not found" });

        // ── Hard Deadline Enforcement (with 2 min grace period) ──────────────────
        if (quiz.end_time) {
            const deadline = new Date(new Date(quiz.end_time).getTime() + 2 * 60000); // 2 mins grace
            if (new Date() > deadline) {
                return res.status(403).json({ error: "Quiz deadline has passed. Submissions are now closed." });
            }
        }

        const userId = req.user._id ? req.user._id.toString() : req.user.id;
        const { data: attempt, error: attErr } = await supabase.from('quiz_attempts').select('*').eq('quiz_id', quiz.id).eq('user_id', userId).single();
        if (attErr || !attempt) return res.status(404).json({ error: "Attempt not found" });
        if (attempt.is_submitted) return res.status(403).json({ error: "Already submitted" });

        // Score calculation for manual/ai quizzes
        let score = 0;
        const finalResponses = responses || attempt.responses || [];

        if (quiz.type === 'manual' || quiz.type === 'ai') {
            const questionMap = new Map((quiz.questions || []).map(q => [q.question_id, q]));
            
            finalResponses.forEach(r => {
                const q = questionMap.get(r.question_id);
                if (!q) return;
                let isCorrect = false;
                if (typeof q.correct_answer === 'number') {
                    const selectedIndex = typeof r.selected_answer === 'number' ? r.selected_answer : (q.options || []).indexOf(r.selected_answer);
                    isCorrect = selectedIndex === q.correct_answer;
                } else {
                    isCorrect = String(r.selected_answer || '').trim() === String(q.correct_answer || '').trim();
                }
                if (isCorrect) {
                    score += (q.marks || 1);
                } else if (r.selected_answer !== undefined && r.selected_answer !== null && r.selected_answer !== '') {
                    score -= (quiz.negative_marks || 0);
                }
            });
            score = Math.max(0, score); // Score floor at 0
        }
        // Google Form grading is handled manually via the sync endpoint

        // Mark as submitted
        const { error: subErr } = await supabase.from('quiz_attempts').update({
            responses: finalResponses,
            score,
            is_submitted: true,
            submitted_at: new Date()
        }).eq('id', attempt.id);

        if (subErr) throw subErr;

        // Increment quiz attempt_count
        const newCount = (quiz.attempt_count || 0) + 1;
        await supabase.from('advanced_quizzes').update({ attempt_count: newCount }).eq('id', quiz.id);

        res.json({ success: true, score });
    } catch (err) {
        console.error("Quiz Submit Error:", err);
        res.status(500).json({ error: "Failed to submit quiz" });
    }
});

/**
 * ==========================================
 * ANSWER REVIEW (Post-Quiz) 
 * ==========================================
 */

/**
 * GET /api/advanced-quiz/:quizId/review
 * Student: get question-wise answer review with AI explanations
 */
router.get("/:quizId/review", isAuthenticated, requireRole("student"), async (req, res) => {
    try {
        const supabase = getChatSb();
        const { data: quiz, error: quizErr } = await supabase.from('advanced_quizzes').select('*').eq('id', req.params.quizId).single();
        if (quizErr || !quiz) return res.status(404).json({ error: "Quiz not found" });

        // Only for manual/ai quizzes
        if (quiz.type === 'google') return res.status(400).json({ error: "Answer review not available for Google Forms quizzes" });

        // Only after end time (if show_results_after_end)
        if (quiz.show_results_after_end && quiz.end_time && new Date() < new Date(quiz.end_time)) {
            return res.status(403).json({ error: "Review available after the quiz ends" });
        }

        const userId = req.user._id ? req.user._id.toString() : req.user.id;
        const { data: attempt, error: attErr } = await supabase.from('quiz_attempts').select('*').eq('quiz_id', quiz.id).eq('user_id', userId).single();
        if (attErr || !attempt) return res.status(404).json({ error: "No attempt found" });
        if (!attempt.is_submitted) return res.status(403).json({ error: "Quiz not yet submitted" });

        const questions = quiz.questions || [];
        const responses = attempt.responses || [];
        const responseMap = new Map(responses.map(r => [r.question_id, r.selected_answer]));

        // Build review data
        const review = questions.map((q, idx) => {
            const selectedAnswer = responseMap.get(q.question_id);
            let isCorrect = false;
            if (typeof q.correct_answer === 'number') {
                const selectedIndex = typeof selectedAnswer === 'number' ? selectedAnswer : (q.options || []).indexOf(selectedAnswer);
                isCorrect = selectedIndex === q.correct_answer;
            } else {
                isCorrect = String(selectedAnswer || '').trim() === String(q.correct_answer || '').trim();
            }
            return {
                number: idx + 1,
                question: q.question,
                options: q.options,
                correct_answer: q.correct_answer,
                selected_answer: selectedAnswer ?? null,
                is_correct: isCorrect,
                marks: q.marks || 1,
                scored: isCorrect ? (q.marks || 1) : (selectedAnswer !== null && selectedAnswer !== undefined ? -(quiz.negative_marks || 0) : 0),
            };
        });

        res.json({
            quiz_title: quiz.title,
            total_score: attempt.score,
            total_questions: questions.length,
            review,
        });
    } catch (err) {
        console.error("Answer Review Error:", err);
        res.status(500).json({ error: "Failed to get review" });
    }
});

/**
 * POST /api/advanced-quiz/:quizId/explain
 * Get AI explanation for a specific question
 */
router.post("/:quizId/explain", isAuthenticated, requireRole("student"), async (req, res) => {
    try {
        const { question, options, correct_answer, selected_answer } = req.body;
        
        const Groq = (await import("groq-sdk")).default;
        const groq = new Groq({ apiKey: process.env.CLOUDFLARE_WORKERS_AI_TOKEN, baseURL: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1` });
        if (!process.env.GROQ_API_KEY) return res.status(500).json({ error: "AI not configured" });

        const correctOption = typeof correct_answer === 'number' ? options[correct_answer] : correct_answer;
        const selectedOption = typeof selected_answer === 'number' ? options[selected_answer] : (selected_answer || 'Not answered');

        const prompt = `You are a helpful teacher. A student just answered a quiz question. Explain the correct answer in 2-3 simple sentences. Be encouraging.

Question: ${question}
Options: ${options.join(', ')}
Correct Answer: ${correctOption}
Student's Answer: ${selectedOption}

Give a brief, clear explanation of WHY the correct answer is right. Keep it under 60 words.`;

        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: '@cf/deepseek-ai/deepseek-v4-pro-0813',
            max_tokens: 150,
            temperature: 0.3,
        });

        const explanation = completion.choices[0]?.message?.content || 'No explanation available.';
        res.json({ explanation });
    } catch (err) {
        console.error("AI Explain Error:", err);
        res.status(500).json({ error: "Failed to generate explanation" });
    }
});

/**
 * ==========================================
 * DASHBOARD / ANALYTICS ROUTES
 * ==========================================
 */

/**
 * GET /api/advanced-quiz/:quizId/results
 * Student: own attempt. Faculty: all attempts.
 */
router.get("/:quizId/results", isAuthenticated, async (req, res) => {
    try {
        const supabase = getChatSb();
        const { data: quiz } = await supabase.from('advanced_quizzes').select('created_by, show_results_after_end, end_time, type').eq('id', req.params.quizId).single();

        if (req.user.role === 'student') {
            // For manually-synced Google quizzes, skip the time restriction entirely —
            // faculty controls when results are visible by syncing the sheet.
            const isGoogleQuiz = quiz?.type === 'google';
            if (!isGoogleQuiz && quiz?.show_results_after_end && quiz?.end_time && new Date() < new Date(quiz.end_time)) {
                return res.status(403).json({ error: "Results available after the quiz ends" });
            }
            const userId = req.user._id ? req.user._id.toString() : req.user.id;
            const { data, error } = await supabase.from('quiz_attempts').select('*').eq('quiz_id', req.params.quizId).eq('user_id', userId).single();
            if (error) return res.status(404).json({ error: "No attempt found", details: error });
            return res.json(data);
        }

        // Faculty: Return all submitted attempts
        const { data: attempts, error } = await supabase.from('quiz_attempts')
            .select('*')
            .eq('quiz_id', req.params.quizId)
            .eq('is_submitted', true)
            .order('score', { ascending: false });
            
        if (error) throw error;
        
        if (!attempts || attempts.length === 0) {
            return res.json([]);
        }

        // Fetch User Info from MongoDB
        const { default: User } = await import("../models/User.js");
        const userIds = attempts.map(a => a.user_id);
        const users = await User.find({ _id: { $in: userIds } }).select('_id name email prn').lean();
        
        const userMap = {};
        users.forEach(u => {
            userMap[u._id.toString()] = { name: u.name, email: u.email, prn: u.prn };
        });

        const enrichedAttempts = attempts.map(a => ({
            ...a,
            student_name: userMap[a.user_id]?.name || 'Unknown Student',
            student_email: userMap[a.user_id]?.email || '',
            student_prn: userMap[a.user_id]?.prn || ''
        }));

        res.json(enrichedAttempts);
    } catch (err) {
        console.error("Results Error:", err);
        res.status(500).json({ error: "Failed to fetch results" });
    }
});

/**
 * GET /api/advanced-quiz/:quizId/analytics
 * Faculty only analytics.
 */
router.get("/:quizId/analytics", isAuthenticated, requireRole("faculty", "org_admin"), async (req, res) => {
    try {
        const supabase = getChatSb();
        const { data: quiz } = await supabase.from('advanced_quizzes').select('questions, classroom_id, type, google_mappings').eq('id', req.params.quizId).single();
        const { data: attempts } = await supabase.from('quiz_attempts').select('*').eq('quiz_id', req.params.quizId).eq('is_submitted', true);

        // 1. Identify Unattempted Students
        const submittedUserIds = new Set((attempts || []).map(a => a.user_id));
        const { data: members } = await supabase.from('classroom_memberships').select('student_id').eq('classroom_id', quiz.classroom_id).eq('status', 'approved');
        
        const allMemberIds = (members || []).map(m => m.student_id);
        const unattemptedIds = allMemberIds.filter(id => !submittedUserIds.has(id));

        let unattempted_students = [];
        if (unattemptedIds.length > 0) {
            const { default: User } = await import("../models/User.js");
            const rawUsers = await User.find({ _id: { $in: unattemptedIds } }).select('_id name email prn').lean();
            unattempted_students = rawUsers.map(u => ({
                id: u._id.toString(),
                name: u.name || 'Unknown',
                email: u.email || '',
                prn: u.prn || ''
            }));
        }

        if (!attempts || attempts.length === 0) {
            return res.json({ avg_score: 0, topper: null, hard_questions: [], total_attempts: 0, unattempted_students });
        }

        const total = attempts.length;
        const avgScore = (attempts.reduce((sum, a) => sum + a.score, 0) / total).toFixed(1);
        const topper = attempts.reduce((t, a) => a.score > t.score ? a : t, attempts[0]);

        // Hard questions: < 40% correct OR > 40% unattempted
        let questions = quiz?.questions || [];
        if (quiz?.type === 'google' && questions.length === 0) {
            questions = (quiz.google_mappings || []).map(m => ({ 
                question: m.column_name, 
                correct_answer: m.correct_answer,
                question_id: m.column_name // Using column name as a pseudo-id for uniqueness
            }));
        }

        const hardQuestions = [];
        for (const q of questions) {
            let unattemptedCount = 0;
            const correctCount = attempts.filter(a => {
                const resp = (a.responses || []).find(r => 
                    (r.question_id && r.question_id === q.question_id) || 
                    (r.column && r.column === q.question)
                );
                if (!resp || !resp.selected_answer || resp.selected_answer.toString().trim() === '') {
                    unattemptedCount++;
                    return false;
                }
                return resp.selected_answer.toString().toLowerCase().trim() === (q.correct_answer || '').toLowerCase().trim();
            }).length;
            
            const pct = (correctCount / total) * 100;
            const unattemptedPct = (unattemptedCount / total) * 100;

            if (pct < 40 || unattemptedPct > 40) {
                hardQuestions.push({ 
                    question: q.question, 
                    correct_answer: q.correct_answer, 
                    correct_percentage: pct,
                    unattempted_percentage: unattemptedPct
                });
            }
        }

        res.json({ avg_score: parseFloat(avgScore), topper, hard_questions: hardQuestions, total_attempts: total, unattempted_students });
    } catch (err) {
        console.error("Analytics Error:", err);
        res.status(500).json({ error: "Failed to compute analytics" });
    }
});

export default router;
