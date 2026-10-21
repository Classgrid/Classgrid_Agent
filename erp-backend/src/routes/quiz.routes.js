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
import connectDB from "../../config/db.js";
import QuizSession from "../models/QuizSession.js";
import { isAuthenticated } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * POST /api/quiz/save
 * Save a completed quiz session
 */
router.post("/save", isAuthenticated, async (req, res) => {
    try {
        await connectDB();
        const userId = req.user._id || req.user.id;
        const { subject, topic, difficulty, totalQuestions, questions, score, percentage, timeTaken, classroomId } = req.body;

        if (!subject || !topic || !questions || !Array.isArray(questions)) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        const session = await QuizSession.create({
            userId,
            subject,
            topic,
            difficulty: difficulty || "medium",
            totalQuestions: totalQuestions || questions.length,
            questions,
            score: score || 0,
            percentage: percentage || 0,
            timeTaken: timeTaken || 0,
            classroomId: classroomId || "",
        });

        res.json({ success: true, message: "Quiz saved", sessionId: session._id });
    } catch (err) {
        console.error("Quiz save error:", err);
        res.status(500).json({ success: false, message: "Failed to save quiz" });
    }
});

/**
 * GET /api/quiz/history
 * Get quiz history for the logged-in user (last 20)
 */
router.get("/history", isAuthenticated, async (req, res) => {
    try {
        await connectDB();
        const userId = req.user._id || req.user.id;

        const history = await QuizSession.find({ userId })
            .sort({ completedAt: -1 })
            .limit(20)
            .select("subject topic difficulty score totalQuestions percentage timeTaken completedAt")
            .lean();

        res.json({ success: true, history });
    } catch (err) {
        console.error("Quiz history error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch quiz history" });
    }
});

export default router;
