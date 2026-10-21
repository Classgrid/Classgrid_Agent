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

import VideoProgress from "../models/VideoProgress.js";
import Classroom from "../models/Classroom.js";

/**
 * PATCH /api/video/progress
 * Updates the watch-time for a specific video and auto-marks completion if > 90%.
 */
export const updateVideoProgress = async (req, res) => {
    try {
        const { 
            classroomId, 
            materialId, 
            youtubeId, 
            currentTime, 
            duration 
        } = req.body;
        const userId = req.user._id;

        const percentage = duration > 0 ? (currentTime / duration) * 100 : 0;
        const isCompleted = percentage >= 90;

        const progress = await VideoProgress.findOneAndUpdate(
            { user: userId, materialId },
            {
                user: userId,
                classroom: classroomId,
                materialId,
                youtubeId,
                watchTimeSeconds: currentTime,
                totalDurationSeconds: duration,
                percentageWatched: Math.round(percentage),
                isCompleted: isCompleted, // Don't flip back to false if they re-watch
                lastAccessed: new Date()
            },
            { upsert: true, returnDocument: 'after' }
        );

        // If completed, check if we need to trigger any classroom hooks (e.g., unlocking next chapter)
        if (isCompleted) {
            // Future: Emit 'MATERIAL_COMPLETED' event for real-time analytics
        }

        res.json({
            success: true,
            percentage: progress.percentageWatched,
            isCompleted: progress.isCompleted
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to sync video progress" });
    }
};

/**
 * GET /api/video/progress/:classroomId
 * Retrieves progress for all videos in a classroom for the current user.
 */
export const getClassroomVideoAnalytics = async (req, res) => {
    try {
        const { classroomId } = req.params;
        const userId = req.user._id;

        const analytics = await VideoProgress.find({ 
            user: userId, 
            classroom: classroomId 
        }).lean();

        res.json({ success: true, analytics });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch video analytics" });
    }
};

/**
 * GET /api/video/continue-watching
 * Returns the latest 5 partially watched videos (percentage < 90).
 */
export const getContinueWatching = async (req, res) => {
    try {
        const userId = req.user._id;

        const continueList = await VideoProgress.find({
            user: userId,
            isCompleted: false,
            percentageWatched: { $gt: 0 }
        })
        .sort({ lastAccessed: -1 })
        .limit(5)
        .lean();

        res.json({ success: true, continueList });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch continue-watching list" });
    }
};
