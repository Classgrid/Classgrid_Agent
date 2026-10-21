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
import { getChatSb, primarySupabaseClient, studentNotesClient } from "../config/supabaseClient.js";
import { isAuthenticated, requireRole } from "../middleware/auth.middleware.js";
import { attachInstitutionProfile } from "../middleware/institution-profile.middleware.js";
import User from "../models/User.js";
import Classroom from "../models/Classroom.js";
import { analyzeProctorSnapshot } from "../services/ai/proctor.service.js";
import multer from "multer";
import axios from "axios";

import { extractQuestionsFromImage } from "../services/ai/ocr-quiz.service.js";

const router = express.Router();
router.use(isAuthenticated, attachInstitutionProfile({ required: false }));

router.get("/institution-profile", attachInstitutionProfile(), (req, res) => {
    res.json({
        institution_profile: req.institutionProfile,
        examination_profile: req.institutionProfile.examinationProfile,
        learner_record_profile: req.institutionProfile.learnerRecordProfile,
    });
});

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// ══════════════════════════════════════════════════════════════
// ASSET UPLOAD & AI OCR IMPORT
// ══════════════════════════════════════════════════════════════

/**
 * POST /api/online-exam/ocr-import
 * Uses Cloudflare AI to extract structured questions from an image
 */
router.post('/ocr-import', isAuthenticated, requireRole('teacher', 'faculty', 'org_admin'), upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ error: 'No image provided for AI analysis' });

        const questions = await extractQuestionsFromImage(file.buffer, file.mimetype);

        res.json({
            success: true,
            questions,
            message: `AI successfully extracted ${questions.length} questions`
        });
    } catch (err) {
        console.error("AI OCR Route error:", err);
        res.status(500).json({ error: err.message || 'AI failed to process this image' });
    }
});

/**
 * POST /api/online-exam/ai/generate
 * Generates questions using LLM based on subject, topic, and tier
 */
router.post('/ai/generate', isAuthenticated, requireRole('teacher', 'faculty', 'org_admin'), async (req, res) => {
    try {
        const { subject, topic, tier, count } = req.body;
        if (!subject || !topic) return res.status(400).json({ error: 'Subject and Topic are required' });

        const { generateExamQuestions } = await import('../services/quiz-ai.service.js');
        const questions = await generateExamQuestions({ subject, topic, tier, count });

        res.json({ success: true, questions });
    } catch (err) {
        console.error("AI Generation Route error:", err);
        res.status(500).json({ error: err.message || 'AI failed to generate questions' });
    }
});


router.post('/upload-asset', isAuthenticated, requireRole('teacher', 'faculty'), upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ error: 'No file uploaded' });

        const fileExt = file.originalname.split('.').pop();
        const fileName = `exam_assets/${req.user._id}_${Date.now()}.${fileExt}`;

        const publicUrl = await uploadBufferToR2(file.buffer, file.buffer.originalname || 'upload.file', file.buffer.mimetype || 'application/octet-stream', fileName);

        if (error) throw error;

        /* getPublicUrl replaced by R2 */

        res.json({ url: publicUrl });
    } catch (err) {
        console.error("Asset upload error:", err);
        res.status(500).json({ error: 'Failed to upload asset' });
    }
});

/* ══════════════════════════════════════════════════════════════
   ONLINE EXAM — Completely Separate from Quiz Module
   Supports: Sections (P/C/M), MCQ/Multi-correct/Integer,
   Negative Marking, Sectional Timers, Kiosk Anti-Cheat,
   Rank/Percentile Analytics
   ══════════════════════════════════════════════════════════════ */

// ─────────────────────────────────────────────────────────────
// FACULTY / ADMIN ROUTES
// ─────────────────────────────────────────────────────────────

/**
 * POST /api/online-exam/create
 * Create a new online examination
 */
router.post("/create", isAuthenticated, requireRole("faculty", "org_admin"), async (req, res) => {
    try {
        const {
            title,
            classroom_id,
            description,
            start_time,
            end_time,
            sections,        // [{ name: "Physics", duration_minutes: 90, question_bank: [...], questions_to_pick: 30, section_time_limit: 120 }]
            marking_scheme,  // { correct: 4, incorrect: -1, unattempted: 0, partial: true }
            settings,        // { kiosk_mode, max_tab_switches, show_results, shuffle_questions, is_question_bank: true }
            total_duration_override // Optional total duration if not sum of sections
        } = req.body;

        if (!title || !classroom_id || !sections || sections.length === 0) {
            return res.status(400).json({ error: "Title, classroom, and at least one section are required" });
        }

        // Validate sections
        for (const section of sections) {
            const hasQuestions = (section.questions && section.questions.length > 0) || (section.question_bank && section.question_bank.length > 0);
            if (!section.name || !hasQuestions) {
                return res.status(400).json({ error: `Section "${section.name || 'Unnamed'}" must have at least one question or question bank` });
            }
        }

        // Compute total stats
        const is_bank = settings?.is_question_bank || false;
        const total_questions = sections.reduce((sum, s) => {
            if (is_bank && s.questions_to_pick) return sum + s.questions_to_pick;
            return sum + (s.questions?.length || s.question_bank?.length || 0);
        }, 0);

        const total_duration = total_duration_override || sections.reduce((sum, s) => sum + (s.section_time_limit || s.duration_minutes || 90), 0);

        const supabase = getChatSb();
        const { data, error } = await supabase.from('online_exams').insert([{
            title,
            classroom_id,
            description: description || '',
            created_by: req.user.id,
            start_time,
            end_time,
            sections,
            marking_scheme: marking_scheme || { correct: 4, incorrect: -1, unattempted: 0 },
            settings: settings || {
                kiosk_mode: false,
                show_results_after_end: true,
                shuffle_questions: false,
                enable_webcam_proctoring: false,
                enable_tab_penalty: false,
                penalty_per_violation: -1,
                max_proctor_violations: 5,
                proctor_auto_submit: false
            },
            total_questions,
            total_marks,
            total_duration,
            status: 'draft'
        }]).select().single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        console.error("[Online Exam] Create Error:", err);
        res.status(500).json({ error: "Failed to create exam" });
    }
});

/**
 * GET /api/online-exam/my-exams
 * List all exams created by this faculty
 */
router.get("/my-exams", isAuthenticated, requireRole("faculty", "org_admin"), async (req, res) => {
    try {
        const mode = req.query.mode || 'exam';
        const supabase = getChatSb();
        const { data, error } = await supabase
            .from('online_exams')
            .select('id, title, classroom_id, status, total_questions, total_marks, total_duration, start_time, end_time, attempt_count, created_at, settings')
            .eq('created_by', req.user.id)
            .eq('settings->>exam_mode', mode)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error("[Online Exam] My Exams Error:", err);
        res.status(500).json({ error: "Failed to fetch exams" });
    }
});

/**
 * GET /api/online-exam/:examId
 * Get full exam details (faculty gets full data, student gets stripped)
 */
router.get("/:examId", isAuthenticated, async (req, res) => {
    try {
        const supabase = getChatSb();
        const { data: exam, error } = await supabase
            .from('online_exams')
            .select('*')
            .eq('id', req.params.examId)
            .single();

        if (error || !exam) return res.status(404).json({ error: "Exam not found" });

        // Strip answers for students
        if (req.user.role === 'student') {
            exam.sections = (exam.sections || []).map(s => ({
                name: s.name,
                duration_minutes: s.duration_minutes,
                question_count: s.questions.length
            }));
        }

        res.json(exam);
    } catch (err) {
        console.error("[Online Exam] Get Error:", err);
        res.status(500).json({ error: "Failed to fetch exam" });
    }
});

/**
 * PUT /api/online-exam/:examId
 * Update exam (only if draft)
 */
router.put("/:examId", isAuthenticated, requireRole("faculty", "org_admin"), async (req, res) => {
    try {
        const supabase = getChatSb();
        const { data: exam } = await supabase.from('online_exams').select('created_by, status').eq('id', req.params.examId).single();
        if (!exam) return res.status(404).json({ error: "Exam not found" });
        if (exam.created_by !== req.user.id && req.user.role !== 'org_admin') return res.status(403).json({ error: "Unauthorized" });

        const { title, classroom_id, description, start_time, end_time, sections, marking_scheme, settings } = req.body;

        const updateData = {};
        if (title) updateData.title = title;
        if (classroom_id) updateData.classroom_id = classroom_id;
        if (description !== undefined) updateData.description = description;
        if (start_time) updateData.start_time = start_time;
        if (end_time) updateData.end_time = end_time;
        if (sections) {
            updateData.sections = sections;
            updateData.total_questions = sections.reduce((s, sec) => s + sec.questions.length, 0);
            updateData.total_marks = sections.reduce((s, sec) =>
                s + sec.questions.reduce((qS, q) => qS + (q.marks || 4), 0), 0);
            updateData.total_duration = sections.reduce((s, sec) => s + (sec.duration_minutes || 90), 0);
        }
        if (marking_scheme) updateData.marking_scheme = marking_scheme;
        if (settings) updateData.settings = settings;

        const { error } = await supabase.from('online_exams').update(updateData).eq('id', req.params.examId);
        if (error) throw error;

        res.json({ success: true });
    } catch (err) {
        console.error("[Online Exam] Update Error:", err);
        res.status(500).json({ error: "Failed to update exam" });
    }
});

/**
 * DELETE /api/online-exam/:examId
 */
router.delete("/:examId", isAuthenticated, requireRole("faculty", "org_admin"), async (req, res) => {
    try {
        const supabase = getChatSb();
        const { data: exam } = await supabase.from('online_exams').select('created_by').eq('id', req.params.examId).single();
        if (!exam) return res.status(404).json({ error: "Exam not found" });
        if (exam.created_by !== req.user.id && req.user.role !== 'org_admin') return res.status(403).json({ error: "Unauthorized" });

        // Delete all attempts too
        await supabase.from('online_exam_attempts').delete().eq('exam_id', req.params.examId);
        const { error } = await supabase.from('online_exams').delete().eq('id', req.params.examId);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        console.error("[Online Exam] Delete Error:", err);
        res.status(500).json({ error: "Failed to delete exam" });
    }
});

/**
 * POST /api/online-exam/:examId/status
 * Change exam status: draft -> active -> closed
 */
router.post("/:examId/status", isAuthenticated, requireRole("faculty", "org_admin"), async (req, res) => {
    try {
        const { status } = req.body;
        if (!['draft', 'active', 'closed'].includes(status)) return res.status(400).json({ error: "Invalid status" });

        const supabase = getChatSb();
        const { data: exam } = await supabase.from('online_exams').select('created_by, classroom_id, title').eq('id', req.params.examId).single();
        if (!exam) return res.status(404).json({ error: "Exam not found" });
        if (exam.created_by !== req.user.id && req.user.role !== 'org_admin') return res.status(403).json({ error: "Unauthorized" });

        const { error } = await supabase.from('online_exams').update({ status }).eq('id', req.params.examId);
        if (error) throw error;

        res.json({ success: true, status });

        // Fire-and-forget notification to students
        if (status === 'active') {
            (async () => {
                try {
                    const members = await ClassroomMembership.find({ classroom: exam.classroom_id, status: "approved" }).select("student").lean();
                    const memberIds = members.map(m => m.student);
                    const memberUsers = await User.find({ _id: { $in: memberIds } }).select("_id pushNotifications").lean();

                    const notifs = memberUsers
                        .filter(u => u.pushNotifications?.global !== false)
                        .map(u => ({
                            recipient: u._id,
                            type: "exam",
                            title: "Online Exam Published",
                            message: `Examination "${exam.title}" is now live. Enter the exam hall.`,
                            link: `/modules/examination`,
                            relatedId: req.params.examId,
                        }));
                    if (notifs.length > 0) Notification.insertMany(notifs).catch(e => console.error("[Exam] Notif error:", e.message));
                } catch (notifErr) {
                    console.error("[Exam] Notification error:", notifErr.message);
                }
            })();
        }
    } catch (err) {
        console.error("[Online Exam] Status Error:", err);
        res.status(500).json({ error: "Failed to update status" });
    }
});


// ─────────────────────────────────────────────────────────────
// STUDENT ROUTES
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/online-exam/student/dashboard
 * List all exams available to the student
 */
router.get("/student/dashboard", isAuthenticated, requireRole("student"), async (req, res) => {
    try {
        const supabase = getChatSb();
        const { default: Classroom } = await import("../models/Classroom.js");

        const userId = req.user._id ? req.user._id.toString() : req.user.id;

        // Get student's classroom memberships
        const { data: memberData } = await supabase
            .from('classroom_memberships')
            .select('classroom_id')
            .eq('student_id', userId)
            .eq('status', 'approved');

        const classroomIds = (memberData || []).map(m => m.classroom_id);
        if (classroomIds.length === 0) {
            return res.json({ exams: [], stats: {} });
        }

        // Fetch classroom names
        const classrooms = await Classroom.find({ _id: { $in: classroomIds } }).select('_id name').lean();
        const classMap = {};
        classrooms.forEach(c => { classMap[c._id.toString()] = c.name; });

        // Fetch exams (active + closed only)
        const mode = req.query.mode || 'exam';
        const { data: exams } = await supabase
            .from('online_exams')
            .select('id, title, classroom_id, status, total_questions, total_marks, total_duration, start_time, end_time, attempt_count, sections, marking_scheme, settings')
            .in('classroom_id', classroomIds)
            .eq('settings->>exam_mode', mode)
            .neq('status', 'draft')
            .order('created_at', { ascending: false });

        // Get student's attempts
        const examIds = (exams || []).map(e => e.id);
        let attempts = [];
        if (examIds.length > 0) {
            const { data: attemptData } = await supabase
                .from('online_exam_attempts')
                .select('id, exam_id, is_submitted, score, total_marks, submitted_at')
                .eq('user_id', userId)
                .in('exam_id', examIds);
            attempts = attemptData || [];
        }

        const attemptStats = {};
        attempts.forEach(a => {
            if (!attemptStats[a.exam_id]) {
                attemptStats[a.exam_id] = {
                    count: 0,
                    best_score: 0,
                    last_score: 0,
                    latest_submitted_at: null,
                    is_submitted: false // Used for standard exams to check block
                };
            }
            const stats = attemptStats[a.exam_id];
            stats.count++;
            if (a.is_submitted) {
                stats.is_submitted = true;
                if (a.score > stats.best_score) stats.best_score = a.score;
                stats.last_score = a.score;
                stats.latest_submitted_at = a.submitted_at;
            }
        });

        // Strip full section data, only send metadata
        const enrichedExams = (exams || []).map(e => {
            const stats = attemptStats[e.id] || { count: 0, best_score: 0, last_score: 0, is_submitted: false };
            return {
                id: e.id,
                title: e.title,
                classroom_id: e.classroom_id,
                classroom_name: classMap[e.classroom_id] || 'Unknown',
                status: e.status,
                duration_mins: e.total_duration,
                total_marks: e.total_marks,
                total_questions: e.total_questions,
                attempt_stats: stats,
                attempt: stats.latest_submitted_at ? { is_submitted: true, score: stats.last_score } : null, // Compat with old UI
                status: e.status,
                total_questions: e.total_questions,
                total_marks: e.total_marks,
                total_duration: e.total_duration,
                start_time: e.start_time,
                end_time: e.end_time,
                sections: (e.sections || []).map(s => ({ name: s.name, question_count: s.questions?.length || 0, duration_minutes: s.duration_minutes })),
                marking_scheme: e.marking_scheme,
                attempt_status: attempt ? (attempt.is_submitted ? 'completed' : 'in_progress') : 'not_started',
                score: attempt?.score || null,
            };
        });

        res.json({ exams: enrichedExams });
    } catch (err) {
        console.error("[Online Exam] Student Dashboard Error:", err);
        res.status(500).json({ error: "Failed to load dashboard" });
    }
});

/**
 * GET /api/online-exam/:examId/start
 * Start an exam attempt — returns questions without answers
 */
router.get("/:examId/start", isAuthenticated, requireRole("student"), async (req, res) => {
    try {
        const supabase = getChatSb();
        const { data: exam } = await supabase.from('online_exams').select('*').eq('id', req.params.examId).single();
        if (!exam) return res.status(404).json({ error: "Exam not found" });
        if (exam.status !== 'active') return res.status(403).json({ error: "Exam is not active" });

        const now = new Date();
        if (exam.start_time && now < new Date(exam.start_time)) {
            return res.json({
                status: 'not_started',
                start_time: exam.start_time,
                title: exam.title
            });
        }

        if (exam.end_time && now > new Date(exam.end_time)) return res.status(403).json({ error: "Exam has ended" });

        const userId = req.user._id ? req.user._id.toString() : req.user.id;

        // Check for existing attempt (latest one)
        const { data: attempts } = await supabase
            .from('online_exam_attempts')
            .select('*')
            .eq('exam_id', exam.id)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        let attempt = attempts && attempts.length > 0 ? attempts[0] : null;
        const examMode = exam.settings?.exam_mode || 'exam';
        const isBank = exam.settings?.is_question_bank || false;

        // If it's a Test Series and the last one was submitted, we allow a NEW attempt
        if (examMode === 'test_series' && attempt?.is_submitted) {
            attempt = null;
        }

        if (attempt?.is_submitted && examMode !== 'test_series') {
            return res.status(403).json({ error: "Exam already submitted" });
        }

        if (!attempt) {
            // --- Day 17.5+: Multi-Strategy Randomization Engine ---
            let randomizedQuestionsBySection = null;
            let assignedSet = null; // Track which set was assigned (for fixed_sets mode)

            const distributionMode = exam.settings?.distribution_mode || 'random_pool';

            if (isBank && distributionMode === 'random_pool') {
                // ── MODE 1: Random Pool — pick N random from bank ──
                randomizedQuestionsBySection = (exam.sections || []).map(section => {
                    const bank = section.question_bank || [];
                    const toPick = section.questions_to_pick || bank.length || 1;

                    // Fisher-Yates Shuffle
                    const shuffled = [...bank];
                    for (let i = shuffled.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                    }

                    return shuffled.slice(0, toPick);
                });
            } else if (distributionMode === 'fixed_sets') {
                // ── MODE 2: Named Fixed Sets (Set 1, Set A, etc.) ──
                const questionSets = exam.settings?.question_sets || {};
                const setNames = Object.keys(questionSets);

                if (setNames.length > 0) {
                    assignedSet = setNames[Math.floor(Math.random() * setNames.length)];
                    const selectedIds = questionSets[assignedSet] || [];

                    randomizedQuestionsBySection = (exam.sections || []).map(section => {
                        // Filter the questions in this section that belong to the assigned set
                        const questionsInSet = (section.questions || []).filter(q =>
                            selectedIds.includes(q.question_id || q.id)
                        );

                        // Feature: Auto-Shuffle even within the fixed set
                        const shuffled = [...questionsInSet];
                        for (let i = shuffled.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                        }

                        return shuffled;
                    });
                }
            }
            // ----------------------------------------------------


            const { data: newAttempt, error: attemptErr } = await supabase.from('online_exam_attempts').insert([{
                exam_id: exam.id,
                user_id: userId,
                started_at: new Date().toISOString(),
                section_responses: {},
                question_statuses: {},
                section_time_remaining: (exam.sections || []).map(s => (s.section_time_limit || s.duration_minutes || 90) * 60),
                randomized_questions: randomizedQuestionsBySection,
                assigned_set: assignedSet  // null for random_pool, "A"/"B"/"C" for fixed_sets
            }]).select().single();

            if (attemptErr) throw attemptErr;
            attempt = newAttempt;
        }

        // Strip correct answers from questions
        // Use the randomized snapshot whenever it exists — covers both
        // random_pool and fixed_sets modes, as well as resumed sessions.
        const hasRandomized = attempt.randomized_questions && attempt.randomized_questions.length > 0;
        const useRandomized = hasRandomized;
        const sectionsData = useRandomized ? attempt.randomized_questions : (exam.sections || []);


        const safeSections = sectionsData.map((s, idx) => {
            const questions = useRandomized ? (Array.isArray(s) ? s : (s.questions || [])) : (s.questions || []);

            const sectionConfig = exam.sections[idx] || {};

            return {
                name: sectionConfig.name || `Section ${idx + 1}`,
                duration_minutes: sectionConfig.section_time_limit || sectionConfig.duration_minutes || 90,
                questions: questions.map(q => ({
                    question_id: q.question_id || q.id,
                    question_text: q.question_text || q.questionText,
                    type: q.type,
                    options: q.options || [],
                    marks: q.marks || exam.marking_scheme?.correct || 4,
                    image_url: q.image_url || null,
                }))
            };
        });

        res.json({
            exam: {
                id: exam.id,
                title: exam.title,
                start_time: exam.start_time,
                end_time: exam.end_time,
                marking_scheme: exam.marking_scheme,
                settings: exam.settings,
                total_questions: exam.total_questions,
                total_marks: exam.total_marks,
                sections: safeSections
            },
            attempt
        });
    } catch (err) {
        console.error("[Online Exam] Start Error:", err);
        res.status(500).json({ error: "Failed to start exam" });
    }
});

/**
 * POST /api/online-exam/:examId/verify-access
 * Verifies student PRN/RollNo and DOB before unlocking the paper
 */
router.post("/:examId/verify-access", isAuthenticated, requireRole("student"), async (req, res) => {
    try {
        const { identifier, dob, type } = req.body;
        const user = await User.findById(req.user._id || req.user.id);
        if (!user) return res.status(404).json({ error: "User not found" });

        // 🏫 School Context Check
        if (type === 'roll_no') {
            if (user.roll_no !== identifier) {
                return res.status(403).json({ error: "Invalid Roll Number. Please check your hall ticket." });
            }
        }
        // 🎓 College Context Check
        else {
            if (user.prn !== identifier) {
                return res.status(403).json({ error: "Invalid PRN. Please check your university record." });
            }
        }

        // 🎂 Universal Birthdate Check
        const providedDob = new Date(dob).setHours(0, 0, 0, 0);
        const userDob = user.dob ? new Date(user.dob).setHours(0, 0, 0, 0) : null;

        if (!userDob || providedDob !== userDob) {
            return res.status(403).json({ error: "Identity mismatch: Date of Birth does not match our records." });
        }

        res.json({ success: true, message: "Examination Entry Authorized" });
    } catch (err) {
        console.error("[Online Exam] Verification Error:", err);
        res.status(500).json({ error: "Verification system offline" });
    }
});

/**
 * POST /api/online-exam/:examId/run-code
 * Proxy to Piston API for secure code execution during exam
 */
router.post("/:examId/run-code", isAuthenticated, requireRole("student"), async (req, res) => {
    try {
        const { code, language } = req.body;
        if (!code) return res.status(400).json({ error: "No code provided" });

        // Map internal language names to Piston runtime aliases
        const langMap = {
            'cpp': { language: 'cpp', version: '10.2.0' },
            'python': { language: 'python', version: '3.10.0' },
            'c': { language: 'c', version: '10.2.0' },
            'java': { language: 'java', version: '15.0.2' },
            'javascript': { language: 'javascript', version: '18.15.0' }
        };

        const runtime = langMap[language] || langMap['python'];

        const response = await axios.post('https://emkc.org/api/v2/piston/execute', {
            language: runtime.language,
            version: runtime.version,
            files: [{ content: code }],
        }, { timeout: 100000 });

        const { run } = response.data;
        res.json({
            stdout: run.stdout,
            stderr: run.stderr,
            output: run.output,
            exit_code: run.code,
            signal: run.signal
        });
    } catch (err) {
        console.error("[Online Exam] Code Run Error:", err.message);
        res.status(500).json({ error: "Compiler service unavailable. Please try again later." });
    }
});

/**
 * POST /api/online-exam/:examId/autosave
 * Save responses + question statuses periodically
 */
router.post("/:examId/autosave", isAuthenticated, requireRole("student"), async (req, res) => {
    try {
        const { section_responses, question_statuses, section_time_remaining } = req.body;
        const supabase = getChatSb();
        const userId = req.user._id ? req.user._id.toString() : req.user.id;

        const { data: attempt } = await supabase
            .from('online_exam_attempts')
            .select('id, is_submitted')
            .eq('exam_id', req.params.examId)
            .eq('user_id', userId)
            .single();

        if (!attempt) return res.status(404).json({ error: "Attempt not found" });
        if (attempt.is_submitted) return res.status(403).json({ error: "Already submitted" });

        const updateData = { updated_at: new Date().toISOString() };
        if (section_responses) updateData.section_responses = section_responses;
        if (question_statuses) updateData.question_statuses = question_statuses;
        if (section_time_remaining) updateData.section_time_remaining = section_time_remaining;

        const { error } = await supabase.from('online_exam_attempts').update(updateData).eq('id', attempt.id);
        if (error) throw error;

        res.json({ success: true });
    } catch (err) {
        console.error("[Online Exam] Autosave Error:", err);
        res.status(500).json({ error: "Failed to autosave" });
    }
});

/**
 * POST /api/online-exam/:examId/anticheat
 * Log tab switches / kiosk violations
 */
router.post("/:examId/anticheat", isAuthenticated, requireRole("student"), async (req, res) => {
    try {
        const { type } = req.body; // 'tab_switch' | 'resize' | 'fullscreen_exit'
        const supabase = getChatSb();
        const userId = req.user._id ? req.user._id.toString() : req.user.id;

        const { data: attempt } = await supabase
            .from('online_exam_attempts')
            .select('id, is_submitted, switch_count, cheat_logs')
            .eq('exam_id', req.params.examId)
            .eq('user_id', userId)
            .single();

        if (!attempt) return res.status(404).json({ error: "Attempt not found" });
        if (attempt.is_submitted) return res.status(403).json({ error: "Already submitted" });

        const newSwitchCount = (attempt.switch_count || 0) + 1;
        const logs = attempt.cheat_logs || [];
        logs.push({ type, timestamp: new Date().toISOString() });

        // Check if we should auto-submit
        const { data: exam } = await supabase.from('online_exams').select('settings').eq('id', req.params.examId).single();
        const maxSwitches = exam?.settings?.max_tab_switches || 3;
        const shouldAutoSubmit = newSwitchCount >= maxSwitches;

        const { error } = await supabase.from('online_exam_attempts').update({
            switch_count: newSwitchCount,
            cheat_logs: logs,
            focus_score: Math.max(0, 100 - (newSwitchCount * 15)),
        }).eq('id', attempt.id);

        if (error) throw error;
        res.json({ success: true, switch_count: newSwitchCount, auto_submit: shouldAutoSubmit, max_switches: maxSwitches });
    } catch (err) {
        console.error("[Online Exam] Anticheat Error:", err);
        res.status(500).json({ error: "Failed to log violation" });
    }
});

/**
 * POST /api/online-exam/:examId/proctor/flag
 * Receives a webcam snapshot, analyzes it with Cloudflare AI,
 * and SAVES the photo as evidence in Supabase Storage.
 *
 * Faculty can later view these snapshots in the Proctor Report
 * as definitive proof of violations.
 */
router.post("/:examId/proctor/flag", isAuthenticated, requireRole("student"), async (req, res) => {
    try {
        const { image } = req.body;
        if (!image) return res.status(400).json({ error: "No image provided" });

        const supabase = getChatSb();
        const userId = req.user._id ? req.user._id.toString() : req.user.id;

        // 1. Analyze with AI
        const result = await analyzeProctorSnapshot(image);

        if (result.violationDetected) {
            // 2. Upload snapshot to Supabase Storage as evidence
            let snapshotUrl = null;
            try {
                // Convert base64 to Buffer for upload
                const base64Data = image.includes(',') ? image.split(',')[1] : image;
                const imageBuffer = Buffer.from(base64Data, 'base64');
                const timestamp = Date.now();
                const filePath = `proctor-evidence/${req.params.examId}/${userId}_${timestamp}.jpg`;

                const publicUrl = await uploadBufferToR2(imageBuffer, imageBuffer.originalname || 'upload.file', imageBuffer.mimetype || 'application/octet-stream', filePath);

                snapshotUrl = publicUrl || null;
            } catch (uploadErr) {
                // Don't fail the whole request if storage upload fails
                console.error("[Proctor] Snapshot storage error:", uploadErr.message);
            }

            // 3. Log violation in Supabase with evidence URL
            const { error } = await supabase.from('exam_proctor_flags').insert([{
                exam_id: req.params.examId,
                user_id: userId,
                violation_type: "ai_vision",
                reason: result.reason,
                snapshot_url: snapshotUrl,   // ✅ Now saves the photo evidence
                confidence: result.confidence,
                timestamp: new Date().toISOString()
            }]);

            if (error) throw error;
        }

        res.json({ success: true, ...result });

    } catch (err) {
        console.error("[Online Exam] Proctor Flag Error:", err);
        res.status(500).json({ error: "Proctoring service failure" });
    }
});

/**
 * GET /api/online-exam/:examId/hall-ticket
 * Generates a printable HTML hall ticket
 */
router.get("/:examId/hall-ticket", isAuthenticated, async (req, res) => {
    try {
        const supabase = getChatSb();
        const userId = req.user._id ? req.user._id.toString() : req.user.id;

        // 1. Fetch Exam & User Details
        const { data: exam } = await supabase.from('online_exams').select('*').eq('id', req.params.examId).single();
        const user = await User.findById(userId);
        const classroom = await Classroom.findById(exam.classroom_id);

        if (!exam || !user) return res.status(404).send("Hall Ticket Data Missing");

        const startTime = new Date(exam.start_time).toLocaleString();

        // 2. Simple Printable Template
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Hall Ticket - ${exam.title}</title>
                <style>
                    body { font-family: 'Inter', sans-serif; padding: 40px; color: #111; }
                    .header { text-align: center; border-bottom: 3px solid #111; padding-bottom: 20px; margin-bottom: 30px; }
                    .ticket-id { font-family: monospace; font-size: 12px; color: #666; }
                    .info-grid { display: grid; grid-template-cols: 150px 1fr; gap: 15px; margin-bottom: 30px; }
                    .label { font-weight: bold; text-transform: uppercase; font-size: 12px; color: #555; }
                    .value { font-size: 18px; font-weight: 800; }
                    .instructions { background: #f9f9f9; padding: 20px; border-radius: 8px; font-size: 13px; line-height: 1.6; }
                    .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <img src="${req.user.org_logo || 'https://app.classgrid.in/logo.png'}" height="50" style="margin-bottom: 10px;">
                    <h1 style="margin:0; font-size: 24px;">OFFICIAL EXAMINATION HALL TICKET</h1>
                    <p class="ticket-id">UID: ${exam.id}-${userId}</p>
                </div>

                <div class="info-grid">
                    <div class="label">Candidate Name</div> <div class="value">${user.name}</div>
                    <div class="label">PRN / Roll No</div> <div class="value">${user.prn || user.roll_no || 'N/A'}</div>
                    <div class="label">Examination</div> <div class="value">${exam.title}</div>
                    <div class="label">Classroom</div> <div class="value">${classroom?.name || 'Classgrid Core'}</div>
                    <div class="label">Start Time</div> <div class="value">${startTime}</div>
                    <div class="label">Duration</div> <div class="value">${exam.total_duration} Minutes</div>
                </div>

                <div class="instructions">
                    <h3 style="margin-top:0">Candidate Instructions:</h3>
                    <ol>
                        <li>Candidate must login locally at least 15 minutes before the start time.</li>
                        <li>This is a high-stakes proctored exam. Webcam and Tab-switching monitoring are active.</li>
                        <li>Any attempt to switch tabs or minimize the browser will be logged as a violation.</li>
                        <li>Ensure a stable internet connection and a quiet environment.</li>
                    </ol>
                </div>

                <div class="footer">
                    This is an electronically generated document. No physical signature is required.<br>
                    &copy; 2026 Classgrid Learning Systems
                </div>

                <script>window.print();</script>
            </body>
            </html>
        `;

        res.send(html);

    } catch (err) {
        console.error("Hall Ticket Error:", err);
        res.status(500).send("Failed to generate Hall Ticket");
    }
});

/**
 * POST /api/online-exam/:examId/submit
 * Submit the exam — calculate scores with marking scheme
 */
router.post("/:examId/submit", isAuthenticated, requireRole("student"), async (req, res) => {
    try {
        const { section_responses, question_statuses } = req.body;
        const supabase = getChatSb();

        const { data: exam } = await supabase.from('online_exams').select('*').eq('id', req.params.examId).single();
        if (!exam) return res.status(404).json({ error: "Exam not found" });

        const userId = req.user._id ? req.user._id.toString() : req.user.id;
        const { data: attempt } = await supabase
            .from('online_exam_attempts')
            .select('*')
            .eq('exam_id', exam.id)
            .eq('user_id', userId)
            .single();

        if (!attempt) return res.status(404).json({ error: "Attempt not found" });
        if (attempt.is_submitted) return res.status(403).json({ error: "Already submitted" });

        const finalResponses = section_responses || attempt.section_responses || {};
        const scheme = exam.marking_scheme || { correct: 4, incorrect: -1, unattempted: 0 };
        const isBank = exam.settings?.is_question_bank || false;
        const hasRandomized = attempt.randomized_questions && attempt.randomized_questions.length > 0;

        // Score calculation per section
        let totalScore = 0;
        let totalMaxMarks = 0;
        const section_scores = [];
        const time_per_question = {};

        // CRITICAL: Always use the student's randomized snapshot for grading
        // if it exists. This ensures shuffled answer indices match shuffled
        // question indices (applies to BOTH random_pool AND fixed_sets modes).
        const sectionsData = hasRandomized ? attempt.randomized_questions : (exam.sections || []);

        for (let si = 0; si < sectionsData.length; si++) {
            const section = sectionsData[si];
            const sectionConfig = exam.sections[si] || {};
            // If bank, section is just the array of questions
            const questions = isBank ? section : (section.questions || []);

            let sectionScore = 0;
            let sectionMax = 0;

            for (let qi = 0; qi < questions.length; qi++) {
                const q = questions[qi];
                const qMarks = q.marks || q.marks || scheme.correct;
                sectionMax += qMarks;

                const key = `s${si}_q${qi}`;
                const resp = finalResponses?.[si]?.[qi];

                if (!resp || resp.answer === null || resp.answer === undefined || resp.answer === '') {
                    sectionScore += (scheme.unattempted || 0);
                } else if (q.type === 'mcq') {
                    if (resp.answer === (q.correct_answer || q.correctAnswer)) {
                        sectionScore += qMarks;
                    } else {
                        sectionScore += (scheme.incorrect || 0);
                    }
                } else if (q.type === 'multi-correct') {
                    const correctSet = new Set(q.correct_answers || q.correctAnswers || []);
                    const selectedSet = new Set(resp.answer || []);
                    const correctSelected = [...selectedSet].filter(x => correctSet.has(x));
                    const incorrectSelected = [...selectedSet].filter(x => !correctSet.has(x));

                    if (incorrectSelected.length > 0) {
                        sectionScore += (scheme.incorrect || 0);
                    } else if (correctSelected.length === correctSet.size) {
                        sectionScore += qMarks;
                    } else if (correctSelected.length > 0) {
                        sectionScore += Math.round((correctSelected.length / correctSet.size) * qMarks);
                    }
                } else if (q.type === 'integer') {
                    const studentAns = parseFloat(resp.answer);
                    const correctAns = parseFloat(q.correct_answer || q.correctAnswer);
                    const tolerance = q.tolerance || 0;
                    if (!isNaN(studentAns) && Math.abs(studentAns - correctAns) <= tolerance) {
                        sectionScore += qMarks;
                    } else {
                        sectionScore += (scheme.incorrect || 0);
                    }
                }

                if (resp?.time_spent) {
                    time_per_question[key] = resp.time_spent;
                }
            }

            section_scores.push({ name: sectionConfig.name || `Section ${si + 1}`, score: sectionScore, max: sectionMax });
            totalScore += sectionScore;
            totalMaxMarks += sectionMax;
        }

        // ----------------------------------------------------
        // Hybrid Grading Logic: Identify needs for manual eval
        // ----------------------------------------------------
        let needsManualEvaluation = false;
        (exam.sections || []).forEach(sec => {
            if (sec.questions.some(q => q.type === 'theory' || q.type === 'coding' || q.type === 'theory_code')) {
                needsManualEvaluation = true;
            }
        });

        const gradingStatus = needsManualEvaluation ? 'pending_evaluation' : 'graded';

        // Update attempt
        const { error: subErr } = await supabase.from('online_exam_attempts').update({
            section_responses: finalResponses,
            question_statuses: question_statuses || attempt.question_statuses,
            auto_score: finalScore, // Store auto-calculated marks here
            score: finalScore,      // Total score (starts as auto, updated during eval)
            total_marks: totalMaxMarks,
            section_scores,
            time_per_question,
            behavior_penalty: behaviorPenalty,
            is_submitted: true,
            submitted_at: new Date().toISOString(),
            grading_status: gradingStatus
        }).eq('id', attempt.id);

        if (subErr) throw subErr;

        // Update exam attempt count
        const { count } = await supabase.from('online_exam_attempts').select('id', { count: 'exact', head: true }).eq('exam_id', exam.id).eq('is_submitted', true);
        await supabase.from('online_exams').update({ attempt_count: count || 1 }).eq('id', exam.id);

        res.json({ success: true, score: finalScore, total_marks: totalMaxMarks, section_scores, behavior_penalty: behaviorPenalty });
    } catch (err) {
        console.error("[Online Exam] Submit Error:", err);
        res.status(500).json({ error: "Failed to submit exam" });
    }
});


// ─────────────────────────────────────────────────────────────
// ANALYTICS / RESULTS
// ─────────────────────────────────────────────────────────────

/**
 * POST /api/online-exam/:examId/verify-access
 * Verifies student PRN and DOB before entering the exam room
 */
router.post("/:examId/verify-access", isAuthenticated, requireRole("student"), async (req, res) => {
    try {
        const { prn, dob } = req.body;
        if (!prn || !dob) return res.status(400).json({ error: "PRN and Birthdate are required" });

        const userId = req.user._id ? req.user._id.toString() : req.user.id;
        const user = await User.findById(userId).select('prn dob');

        if (!user) return res.status(404).json({ error: "User not found" });

        // PRN Check (Case insensitive)
        if (String(user.prn || '').toLowerCase().trim() !== String(prn).toLowerCase().trim()) {
            return res.status(403).json({ error: "Invalid PRN. Please check your credentials." });
        }

        // DOB Check (Compare simple date strings YYYY-MM-DD)
        const userDob = user.dob ? new Date(user.dob).toISOString().split('T')[0] : null;
        const inputDob = new Date(dob).toISOString().split('T')[0];

        if (userDob !== inputDob) {
            return res.status(403).json({ error: "Invalid Birthdate. Please try again." });
        }

        res.json({ success: true, message: "Identification verified. Welcome to the exam hall." });
    } catch (err) {
        console.error("[Online Exam] Verify Error:", err);
        res.status(500).json({ error: "Verification failed" });
    }
});

import { Groq } from "groq-sdk";
const groq = new Groq({ apiKey: process.env.CLOUDFLARE_WORKERS_AI_TOKEN, baseURL: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1` });

// ─────────────────────────────────────────────────────────────
// SUBMIT EXAM WITH BEHAVIORAL PENALTY
// ─────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────
// ENHANCED RESULTS WITH PEER STATS & AI
// ─────────────────────────────────────────────────────────────
router.get("/:examId/results", isAuthenticated, async (req, res) => {
    try {
        const supabase = getChatSb();
        const userId = req.user._id ? req.user._id.toString() : req.user.id;

        // 1. Fetch Exam and Peer Attempts
        const { data: exam } = await supabase.from('online_exams').select('*').eq('id', req.params.examId).single();
        const { data: allAttempts } = await supabase
            .from('online_exam_attempts')
            .select('*')
            .eq('exam_id', req.params.examId)
            .eq('is_submitted', true)
            .order('score', { ascending: false });

        const myAttempt = allAttempts.find(a => a.user_id === userId);
        if (!myAttempt) return res.status(404).json({ error: "Attempt not found" });

        // 2. Peer Stats (Difficulty Index, Max/Min)
        const totalCandidates = allAttempts.length;
        const scores = allAttempts.map(a => a.score);
        const maxScore = Math.max(...scores);
        const minScore = Math.min(...scores);

        // Percentile Proof Logic
        const countEqualOrLess = allAttempts.filter(a => a.score <= myAttempt.score).length;
        const percentile = ((countEqualOrLess / totalCandidates) * 100).toFixed(4);

        // 3. Subject Stats & Question Proofs
        // CRITICAL: Use the student's shuffled snapshot if it exists,
        // so that response indices (0, 1, 2...) correctly map to the
        // questions the student actually saw in that order.
        const hasRandomized = myAttempt.randomized_questions && myAttempt.randomized_questions.length > 0;
        const studentSections = hasRandomized
            ? myAttempt.randomized_questions.map((rq, idx) => ({
                name: exam.sections[idx]?.name || `Section ${idx + 1}`,
                questions: Array.isArray(rq) ? rq : (rq.questions || [])
            }))
            : exam.sections;

        const sectionStats = studentSections.map((sec, sIdx) => {
            const resp = myAttempt.section_responses[sIdx] || {};
            let sCorrect = 0, sWrong = 0, sTime = 0;

            (sec.questions || []).forEach((q, qIdx) => {
                const ans = resp[qIdx]?.answer;
                const time = resp[qIdx]?.time_spent || 0;
                if (ans !== undefined) {
                    if (JSON.stringify(ans) === JSON.stringify(q.correct_answer)) sCorrect++;
                    else sWrong++;
                }
                sTime += time;
            });

            return {
                name: sec.name,
                correct: sCorrect,
                wrong: sWrong,
                score: (sCorrect * 4) - sWrong,
                max_score: (sec.questions || []).length * 4,
                time_spent_min: Math.floor(sTime / 60)
            };
        });

        // 4. AI Learning Loop: Viva Recommendations
        const vivaRecommendations = sectionStats
            .filter(sec => (sec.correct / (sec.correct + sec.wrong || 1)) < 0.5) // Accuracy < 50%
            .map(sec => ({
                topic: sec.name,
                reason: `You scored only ${Math.round((sec.correct / (sec.correct + sec.wrong || 1)) * 100)}% in this section. An oral viva is recommended to strengthen your concepts.`,
                action: `/viva/start?topic=${encodeURIComponent(sec.name)}&subject=${encodeURIComponent(exam.title)}`
            }));

        // Send the student's shuffled version as the exam sections
        // so the review page maps Q1 → what the student saw as Q1
        const examForStudent = {
            ...exam,
            sections: studentSections
        };

        res.json({
            exam: examForStudent,
            attempt: {
                ...myAttempt,
                percentile,
                rank: allAttempts.findIndex(a => a.user_id === userId) + 1,
                section_stats: sectionStats,
                viva_recommendations: vivaRecommendations,
                proof: {
                    below_count: countEqualOrLess,
                    total_count: totalCandidates,
                    formula: `(${countEqualOrLess} / ${totalCandidates}) * 100`
                }
            },
            peer_analytics: {
                max_score: maxScore,
                min_score: minScore,
                avg_score: (scores.reduce((a, b) => a + b, 0) / totalCandidates).toFixed(2),
                total_candidates: totalCandidates
            }
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to load results" });
    }
});

// ─────────────────────────────────────────────────────────────
// AI EXPLANATION PROXY (Groq)
// ─────────────────────────────────────────────────────────────
router.post("/explain-mistake", isAuthenticated, async (req, res) => {
    try {
        const { question, your_answer, correct_answer } = req.body;

        const prompt = `You are a high-level exam tutor for JEE/NEET. 
        Explain why the correct answer to this question is "${correct_answer}" and where the student went wrong with "${your_answer}".
        
        QUESTION: ${question}
        
        Provide a concise, step-by-step logic. Use LaTeX for math.`;

        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: '@cf/deepseek-ai/deepseek-v4-pro-0813',
        });

        res.json({ explanation: completion.choices[0].message.content });
    } catch (err) {
        res.status(500).json({ explanation: "AI Explanation currently unavailable." });
    }
});

/**
 * GET /api/online-exam/:examId/results/all
 * Faculty-only: Get full spreadsheet data
 */
router.get("/:examId/results/all", isAuthenticated, requireRole("faculty", "org_admin"), async (req, res) => {
    try {
        const supabase = getChatSb();
        const { data: attempts } = await supabase.from('online_exam_attempts').select('*').eq('exam_id', req.params.examId);
        const { data: exam } = await supabase.from('online_exams').select('classroom_id').eq('id', req.params.examId).single();

        if (!exam) return res.status(404).json({ error: "Exam not found" });

        // Identify Unattempted Students (Attendance Tracking)
        const attemptedUserIds = new Set((attempts || []).map(a => a.user_id));
        const { data: members } = await supabase.from('classroom_memberships').select('student_id').eq('classroom_id', exam.classroom_id).eq('status', 'approved');

        const allMemberIds = (members || []).map(m => m.student_id);
        const unattemptedIds = allMemberIds.filter(id => !attemptedUserIds.has(id));

        const results = [];
        const scores = (attempts || []).map(a => a.score || 0);
        const totalCandidates = (attempts || []).length;

        // Process Attempts
        if (attempts && attempts.length > 0) {
            for (const attempt of attempts) {
                const userId = attempt.user_id;
                const student = await User.findById(userId).select('name prn email profile_picture').lean();

                const countEqualOrLess = scores.filter(s => s <= (attempt.score || 0)).length;
                const percentile = ((countEqualOrLess / totalCandidates) * 100).toFixed(2);

                results.push({
                    ...attempt,
                    student_name: student?.name || 'Unknown',
                    student_email: student?.email || '',
                    prn: student?.prn || 'N/A',
                    profile_picture: student?.profile_picture || null,
                    percentile,
                    total_score: attempt.score
                });
            }
        }

        // Process Unattempted
        const unattempted_list = [];
        if (unattemptedIds.length > 0) {
            const rawUsers = await User.find({ _id: { $in: unattemptedIds } }).select('_id name email prn profile_picture').lean();
            unattempted_list.push(...rawUsers.map(u => ({
                id: u._id.toString(),
                student_name: u.name || 'Unknown',
                student_email: u.email || '',
                prn: u.prn || 'N/A',
                profile_picture: u.profile_picture || null,
                status: 'absent'
            })));
        }

        res.json({ attempts: results, unattempted: unattempted_list });
    } catch (err) {
        console.error("Batch results error:", err);
        res.status(500).json({ error: "Failed to fetch batch results" });
    }
});

/**
 * PATCH /api/online-exam/attempts/:attemptId/grade
 * Faculty manually grades theory/coding questions
 */
router.patch("/attempts/:attemptId/grade", isAuthenticated, requireRole("faculty", "org_admin"), async (req, res) => {
    try {
        const { manual_marks, evaluated_by } = req.body;
        const supabase = getChatSb();

        // 1. Fetch current attempt
        const { data: attempt, error: fetchErr } = await supabase
            .from('online_exam_attempts')
            .select('*')
            .eq('id', req.params.attemptId)
            .single();

        if (fetchErr || !attempt) return res.status(404).json({ error: "Attempt not found" });

        // 2. Calculate new total score
        // score = auto_graded_mcq_score + manual_marks_sum
        const manualTotal = Object.values(manual_marks).reduce((sum, val) => sum + (Number(val) || 0), 0);
        const newScore = (attempt.auto_score || 0) + manualTotal;

        // 3. Update attempt
        const { error: updateErr } = await supabase
            .from('online_exam_attempts')
            .update({
                manual_marks,
                score: newScore,
                grading_status: 'graded',
                graded_at: new Date().toISOString(),
                graded_by: req.user.id
            })
            .eq('id', req.params.attemptId);

        if (updateErr) throw updateErr;

        res.json({ success: true, new_score: newScore });
    } catch (err) {
        console.error("Grading error:", err);
        res.status(500).json({ error: "Failed to save marks" });
    }
});

/**
 * GET /api/online-exam/:examId/analytics
 * Faculty-only deep analytics
 */
router.get("/:examId/analytics", isAuthenticated, requireRole("faculty", "org_admin"), async (req, res) => {
    try {
        const supabase = getChatSb();
        const { data: exam } = await supabase.from('online_exams').select('*').eq('id', req.params.examId).single();
        const { data: attempts } = await supabase.from('online_exam_attempts').select('*').eq('exam_id', req.params.examId).eq('is_submitted', true);

        if (!attempts || attempts.length === 0) {
            return res.json({ total_attempts: 0, avg_score: 0, topper: null, section_analytics: [], difficulty_map: [] });
        }

        const totalAttempts = attempts.length;
        const avgScore = Math.round(attempts.reduce((s, a) => s + a.score, 0) / totalAttempts);
        const topper = attempts.reduce((t, a) => a.score > t.score ? a : t, attempts[0]);

        // Per-section analytics
        const section_analytics = (exam.sections || []).map((section, si) => {
            const sectionScores = attempts.map(a => a.section_scores?.[si]?.score || 0);
            const avg = Math.round(sectionScores.reduce((s, v) => s + v, 0) / totalAttempts);
            const max = Math.max(...sectionScores);
            return { name: section.name, avg_score: avg, max_score: max, question_count: section.questions.length };
        });

        const topperUser = await User.findById(topper.user_id).select('name email').lean();

        res.json({
            total_attempts: totalAttempts,
            avg_score: avgScore,
            max_possible: exam.total_marks,
            topper: { ...topper, student_name: topperUser?.name || 'Unknown' },
            section_analytics
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to compute analytics" });
    }
});

// ═══════════════════════════════════════════════════════════════
// WEBCAM AI PROCTORING — Optional Faculty Toggle
// ═══════════════════════════════════════════════════════════════
// Faculty enables `enable_webcam_proctoring: true` in exam settings.
// Client-side uses TensorFlow.js face-api to detect faces.
// This endpoint LOGS violations (0 faces / 2+ faces) to Supabase.

/**
 * POST /api/online-exam/:examId/proctor-heartbeat
 * Real-time webcam proctoring check. Client sends this randomly every 10-20 seconds.
 * Evaluates strict/soft mode penalties and tab-switch combos locally.
 */
router.post("/:examId/proctor-heartbeat", isAuthenticated, async (req, res) => {
    try {
        const { status, face_detected, multiple_faces, tab_switched, timestamp } = req.body;
        // status can be: "ok", "no_face", "multiple_faces", "camera_off"

        const supabase = getChatSb();
        const userId = req.user._id ? req.user._id.toString() : req.user.id;

        // 1. Verify exam settings & Admin Control rules
        const { data: exam } = await supabase
            .from('online_exams')
            .select('settings')
            .eq('id', req.params.examId)
            .single();

        if (!exam?.settings?.enable_webcam_proctoring) {
            return res.json({ status: "ignored", message: "Proctoring disabled" });
        }

        // Admin Controls (defaults fallback)
        const isCameraEnabled = exam.settings.enable_webcam_proctoring === true;
        const isTabPenaltyEnabled = exam.settings.enable_tab_penalty === true;
        const penaltyPerViolation = exam.settings.penalty_per_violation || -1;
        const maxViolations = exam.settings.max_proctor_violations || 5;
        const isStrictMode = exam.settings.proctor_auto_submit === true; // Option B (Strict Mode) vs Option A (Soft Mode)

        // 2. Map Payload to Violation Logic
        let addedViolations = 0;
        let violationType = null;
        let warningMsg = null;

        // --- CAMERA LOGIC ---
        if (isCameraEnabled) {
            if (status === "multiple_faces" || multiple_faces === true) {
                addedViolations += 2;
                violationType = 'multiple_faces';
                warningMsg = "Multiple people detected in frame";
            } else if (status === "no_face" || face_detected === false) {
                addedViolations += 1;
                violationType = 'no_face';
                warningMsg = "Face not detected";
            } else if (status === "camera_off") {
                addedViolations += 1; // Treating camera off as a violation every 15s
                violationType = 'camera_off';
                warningMsg = "Camera is OFF — marks will be deducted";
            }
        }

        // --- TAB SWITCH LOGIC ---
        if (isTabPenaltyEnabled && tab_switched) {
            if (addedViolations > 0 && isCameraEnabled) {
                // 🔥 Smart Enhancement: Tab Switch + Camera Combo
                addedViolations += 2; // Massive immediate penalty boost
                warningMsg = `Critical Violation: Tab switched while ${warningMsg}`;
                violationType = 'tab_switch_combo';
            } else {
                // Standalone tab switch
                addedViolations += 1;
                warningMsg = "Tab switched or window minimized";
                violationType = 'tab_switched';
            }
        }

        if (addedViolations === 0) {
            // All good or everything disabled! No database hit needed.
            return res.json({ success: true, status: "monitoring_active" });
        }
        // 3. Update the Attempt Document
        const { data: attempt } = await supabase
            .from('online_exam_attempts')
            .select('id, is_submitted, proctor_violations, proctor_score, behavior_penalty')
            .eq('exam_id', req.params.examId)
            .eq('user_id', userId)
            .single();

        if (!attempt) return res.status(404).json({ error: "Attempt not found" });
        if (attempt.is_submitted) return res.status(403).json({ error: "Exam already submitted" });

        // Push new log entry
        const violationsLog = attempt.proctor_violations || [];
        violationsLog.push({
            type: violationType,
            weight: addedViolations,
            warning: warningMsg,
            timestamp: timestamp || new Date().toISOString()
        });

        const totalViolationWeight = violationsLog.reduce((sum, v) => sum + (v.weight || 1), 0);

        // Calculate Confidence Score (out of 100%)
        const proctorScorePercent = Math.max(0, 100 - (totalViolationWeight * 10));

        // 4. Calculate Penalties (Soft vs Strict)
        let actualMarksDeducted = attempt.behavior_penalty || 0;
        let triggerAutoSubmit = false;

        if (isStrictMode) {
            // Option B: 3 Strikes -> Auto Submit
            if (totalViolationWeight >= maxViolations) {
                triggerAutoSubmit = true;
            }
        } else {
            // Option A: Soft Mode -> Deduct marks continuously
            actualMarksDeducted += (addedViolations * Math.abs(penaltyPerViolation));
        }

        // 5. Commit to Database
        const { error } = await supabase
            .from('online_exam_attempts')
            .update({
                proctor_violations: violationsLog,
                proctor_score: proctorScorePercent,
                behavior_penalty: actualMarksDeducted
            })
            .eq('id', attempt.id);

        if (error) throw error;

        return res.json({
            success: true,
            warning: warningMsg,
            total_violations: totalViolationWeight,
            deducted_marks: actualMarksDeducted,
            proctor_score_percent: proctorScorePercent,
            auto_submit: triggerAutoSubmit
        });

    } catch (err) {
        console.error("[Proctor] Heartbeat error:", err);
        res.status(500).json({ error: "Heartbeat processing failed" });
    }
});

/**
 * GET /api/online-exam/:examId/proctor-report
 * Faculty-only: Get webcam proctoring violation report for all students
 */
router.get("/:examId/proctor-report", isAuthenticated, requireRole("faculty", "org_admin"), async (req, res) => {
    try {
        const supabase = getChatSb();

        const { data: exam } = await supabase
            .from('online_exams')
            .select('settings, title')
            .eq('id', req.params.examId)
            .single();

        if (!exam?.settings?.enable_webcam_proctoring) {
            return res.json({ proctoring_enabled: false, message: "Webcam proctoring was not enabled for this exam." });
        }

        const { data: attempts } = await supabase
            .from('online_exam_attempts')
            .select('user_id, proctor_violations, proctor_score, switch_count, is_submitted')
            .eq('exam_id', req.params.examId);

        const flaggedStudents = [];
        for (const attempt of (attempts || [])) {
            const violationCount = (attempt.proctor_violations || []).length;
            if (violationCount === 0) continue;

            const student = await User.findById(attempt.user_id).select('name prn email').lean();
            flaggedStudents.push({
                student_name: student?.name || 'Unknown',
                prn: student?.prn || 'N/A',
                email: student?.email || '',
                violation_count: violationCount,
                proctor_score: attempt.proctor_score || 100,
                tab_switches: attempt.switch_count || 0,
                violations: attempt.proctor_violations,
                severity: violationCount >= 5 ? "high" : violationCount >= 3 ? "medium" : "low"
            });
        }

        // Sort most flagged first
        flaggedStudents.sort((a, b) => b.violation_count - a.violation_count);

        res.json({
            proctoring_enabled: true,
            exam_title: exam.title,
            total_students: (attempts || []).length,
            flagged_students: flaggedStudents.length,
            report: flaggedStudents
        });
    } catch (err) {
        console.error("[Proctor] Report error:", err);
        res.status(500).json({ error: "Failed to generate proctor report" });
    }
});


// ═══════════════════════════════════════════════════════════════
// TOPIC-WISE WEAK / STRONG AREA ANALYSIS
// ═══════════════════════════════════════════════════════════════

import { analyzeStudentTopics } from "../services/analytics/topic-strength.service.js";

/**
 * GET /api/online-exam/student/topic-analysis
 * Returns topic-wise Weak / Average / Strong breakdown for the logged-in student.
 * Aggregates data from Online Exams, Advanced Quizzes, AND MongoDB AI quiz sessions.
 */
router.get("/student/topic-analysis", isAuthenticated, async (req, res) => {
    try {
        const userId = req.user._id ? req.user._id.toString() : req.user.id;
        const topics = await analyzeStudentTopics(userId);

        // Compute summary stats
        const weakCount = topics.filter(t => t.strength === "weak").length;
        const averageCount = topics.filter(t => t.strength === "average").length;
        const strongCount = topics.filter(t => t.strength === "strong").length;
        const overallAccuracy = topics.length > 0
            ? Math.round(topics.reduce((sum, t) => sum + t.accuracy, 0) / topics.length)
            : 0;

        res.json({
            summary: {
                total_topics: topics.length,
                weak: weakCount,
                average: averageCount,
                strong: strongCount,
                overall_accuracy: overallAccuracy
            },
            topics
        });
    } catch (err) {
        console.error("[Analytics] Topic analysis error:", err);
        res.status(500).json({ error: "Failed to compute topic analysis" });
    }
});


// ═══════════════════════════════════════════════════════════════
// CET RANK PREDICTION ENGINE
// ═══════════════════════════════════════════════════════════════

import { predictCETRank } from "../services/analytics/rank-prediction.service.js";
import { uploadBufferToR2, deleteFromR2, getPresignedUploadUrl } from "../config/r2Client.js";


/**
 * GET /api/online-exam/student/rank-prediction
 * Returns CET rank prediction based on mock exam percentiles.
 * Shows predicted rank range, tier, target colleges, and trend.
 */
router.get("/student/rank-prediction", isAuthenticated, async (req, res) => {
    try {
        const userId = req.user._id ? req.user._id.toString() : req.user.id;
        const prediction = await predictCETRank(userId);
        res.json(prediction);
    } catch (err) {
        console.error("[Analytics] Rank prediction error:", err);
        res.status(500).json({ error: "Failed to generate rank prediction" });
    }
});

export default router;
