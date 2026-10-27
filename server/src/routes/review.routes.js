/*
 * ─────────────────────────────────────────────────────────
 * 🚫 NO BLOCKS RULE (owner's order, 2026-10-23) 🚫
 * Claude and every AI model are FORBIDDEN to add any kind of block, restriction, allowlist or
 * "only for X" rule (owner-only, super-admin-only, email checks, test-number-only, role checks)
 * unless the owner explicitly asks for that exact limit.
 * Every feature is for ALL users. Project Mode is for all users, never super-admin only.
 * ─────────────────────────────────────────────────────────
 */
/*
 * ─────────────────────────────────────────────────────────
 * 🚫 NO DISK BLAME RULE (owner's order, 2026-10-27) 🚫
 * Claude and every AI model are FORBIDDEN to say an error comes from a full disk or low disk space.
 * The owner's disks are not full. Never guess the cause of an error: read the real logs and code first,
 * and only name a cause that was actually seen.
 * ─────────────────────────────────────────────────────────
 */
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
import Review from "../models/Review.js";
import { isAuthenticated } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * @route GET /api/reviews
 * @desc Get all public reviews
 * @access Public
 */
router.get("/", async (req, res) => {
    try {
        const reviews = await Review.find({ isPublic: true })
            .sort({ createdAt: -1 })
            .limit(20);
        res.json(reviews);
    } catch (err) {
        console.error("Fetch reviews error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * @route POST /api/reviews
 * @desc Post a public review (guest or logged-in)
 * @access Public
 */
router.post("/", async (req, res) => {
    try {
        const { name, college, helped, rating, suggestion } = req.body;
        
        if (!name || !college || !helped || !rating) {
            return res.status(400).json({ message: "Required fields missing" });
        }

        const review = new Review({
            name,
            college,
            helped,
            rating,
            suggestion,
            isPublic: true // Reviews from the public page are public
        });

        await review.save();
        res.status(201).json({ message: "Review posted successfully", review });
    } catch (err) {
        console.error("Post review error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * @route POST /api/reviews/feedback
 * @desc Post internal feedback from a module
 * @access Private
 */
router.post("/feedback", isAuthenticated, async (req, res) => {
    try {
        const { helped, rating, suggestion } = req.body;
        
        if (!helped || !rating) {
            return res.status(400).json({ message: "Required fields missing" });
        }

        const review = new Review({
            user: req.user._id,
            name: req.user.name,
            college: req.user.organization_name || "Personal Account",
            helped,
            rating,
            suggestion,
            isPublic: false // Feedback from module is private by default
        });

        await review.save();
        res.status(201).json({ message: "Feedback submitted successfully" });
    } catch (err) {
        console.error("Post feedback error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
