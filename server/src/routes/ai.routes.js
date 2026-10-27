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
import { isAuthenticated, requireRole, requireChatOnboarding } from "../middleware/auth.middleware.js";
import { 
    indexMaterial, 
    chatWithSyllabus, 
    getMyPersona 
} from "../controllers/ai.controller.js";
import { streamAskAi, clientToolResult, getChatSessions, getChatSession, getChatSessionMessages, uploadChatImage, updateChatSession, deleteChatSession, shareChatSession, reopenChatSession, createPublicShare, getPublicShare, submitAiFeedback, getAgentReviews, updateAgentReviewStatus, processAgentReviewsCron, deleteAgentReview, bulkDeleteAgentReviews, generateImage, getMyGeneratedImages, deleteGeneratedImage, getMyUsage, getOrgUsage, getSkills, createSkill, updateSkill, deleteSkill, getPreferences, updatePreferences } from "../controllers/ai-chat.controller.js";

import { getFavicon } from "../controllers/ai-favicon.controller.js";
import { getMarket } from "../controllers/ai-widgets.controller.js";
import aiTopUpRoutes from "./ai-credits-topup.routes.js";
import aiCreditsRoutes from "./ai-credits.routes.js";


const router = express.Router();

// ── SYLLABUS RAG ───────────────────────────────────────────

// Index a material (Admin/Teacher only)
router.post("/index-material", isAuthenticated, requireRole("teacher", "super-admin"), indexMaterial);

// Chat with indexed syllabus
router.post("/syllabus-chat", isAuthenticated, requireChatOnboarding, chatWithSyllabus);

// ── STUDENT PERSONA ────────────────────────────────────────

// Get personalized AI insights
router.get("/my-persona", isAuthenticated, getMyPersona);

// ── GLOBAL AI ASSISTANT ────────────────────────────────────

// Global AI Panel SSE Chat
router.post("/ask", isAuthenticated, requireChatOnboarding, streamAskAi);
// A caller's result for a tool it runs on its own side (clientTools on /ask, used by benchmark harnesses)
router.post("/client-tool-result", isAuthenticated, clientToolResult);
router.post("/feedback", isAuthenticated, submitAiFeedback);
router.get("/agent-reviews", isAuthenticated, getAgentReviews);
router.put("/agent-reviews/:id/status", isAuthenticated, updateAgentReviewStatus);
router.delete("/agent-reviews/:id", isAuthenticated, deleteAgentReview);
router.post("/agent-reviews/bulk-delete", isAuthenticated, bulkDeleteAgentReviews);
router.get("/cron-process-reviews", processAgentReviewsCron);

// Image Generation
router.post("/generate-image", isAuthenticated, requireChatOnboarding, generateImage);
router.get("/my-images", isAuthenticated, getMyGeneratedImages);
router.delete("/my-images/:id", isAuthenticated, deleteGeneratedImage);

// AI Skills
router.get("/skills", isAuthenticated, getSkills);
router.post("/skills", isAuthenticated, createSkill);
router.put("/skills/:id", isAuthenticated, updateSkill);
router.delete("/skills/:id", isAuthenticated, deleteSkill);

// AI Preferences
router.get("/preferences", isAuthenticated, getPreferences);
router.put("/preferences", isAuthenticated, updatePreferences);

// Premium model access (model picker lock for Claude Fable 5.1)
router.get("/model-access", isAuthenticated, async (req, res) => {
    try {
        const { fableAccess } = await import("../services/model-access.service.js");
        res.json({ fable: await fableAccess(req.user) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Token Usage Tracking
router.get("/my-usage", isAuthenticated, getMyUsage);
router.get("/org-usage", isAuthenticated, getOrgUsage);

// Profile "Token activity" heatmap: the user's tokens per day (India time), from/to as YYYY-MM-DD
router.get("/my-token-activity", isAuthenticated, async (req, res) => {
    try {
        const mongoose = (await import("mongoose")).default;
        const AiUsageLog = (await import("../models/AiUsageLog.js")).default;
        const DAY_MS = 24 * 60 * 60 * 1000;
        const isDay = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
        const istDayStart = (s) => new Date(`${s}T00:00:00+05:30`);

        const todayIst = new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const to = isDay(req.query.to) ? req.query.to : todayIst;
        let from = isDay(req.query.from) ? req.query.from : new Date(istDayStart(to).getTime() - 364 * DAY_MS + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);

        let start = istDayStart(from);
        const end = new Date(istDayStart(to).getTime() + DAY_MS);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
            return res.status(400).json({ error: "Invalid date range" });
        }
        // Keep one lookup to at most ~3 years so a huge range can't load the database
        const maxSpan = 1100 * DAY_MS;
        if (end - start > maxSpan) start = new Date(end.getTime() - maxSpan);

        const rows = await AiUsageLog.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(String(req.user.id)), createdAt: { $gte: start, $lt: end } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } },
                    tokens: { $sum: "$totalTokens" },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        res.json({
            from: new Date(start.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10),
            to,
            days: rows.map((r) => ({ date: r._id, tokens: r.tokens })),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Chat History & Sessions
router.get("/sessions", isAuthenticated, getChatSessions);
router.get("/sessions/:id", isAuthenticated, getChatSession);
router.get("/sessions/:id/messages", isAuthenticated, getChatSessionMessages);
router.put("/sessions/:id", isAuthenticated, updateChatSession);
router.delete("/sessions/:id", isAuthenticated, deleteChatSession);
router.post("/sessions/:id/share", isAuthenticated, shareChatSession);
router.post("/sessions/:id/reopen", isAuthenticated, reopenChatSession); // super_admin only (checked in controller)
router.post("/sessions/:id/public-share", isAuthenticated, createPublicShare);

// Site icons for the AI's source chips (public: loaded by <img>, no token)
router.get("/favicon", getFavicon);
// Stock / currency price for the chat's market card (public, cached; no user data)
router.get("/market", getMarket);

// Public shared chat viewer (NO auth required)
router.get("/shared/:shareId", getPublicShare);

// R2 Image Upload for Chat
router.post("/upload", isAuthenticated, requireChatOnboarding, uploadChatImage);

// Top-up Routes
router.use("/topup", aiTopUpRoutes);
// Credits Routes
router.use("/credits", aiCreditsRoutes);

export default router;
