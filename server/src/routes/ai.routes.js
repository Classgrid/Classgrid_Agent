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
import { streamAskAi, clientToolResult, pcToolResult, localJobDone, turnEvents, turnCommand, getWorkingChats, getChatHelpers, getChatSessions, getChatSession, getChatSessionMessages, uploadChatImage, takeChatOnline, updateChatSession, archiveChatSession, deleteChatSession, shareChatSession, reopenChatSession, createPublicShare, getPublicShare, submitAiFeedback, getAgentReviews, updateAgentReviewStatus, processAgentReviewsCron, deleteAgentReview, bulkDeleteAgentReviews, generateImage, getMyGeneratedImages, deleteGeneratedImage, getMyUsage, getOrgUsage, getSkills, createSkill, updateSkill, deleteSkill, getPreferences, updatePreferences } from "../controllers/ai-chat.controller.js";

import { getFavicon } from "../controllers/ai-favicon.controller.js";
import { speakAnswer, listVoices } from "../controllers/ai-speak.controller.js";
import { getPlanOverview, getUsageHistory } from "../controllers/ai-plan-overview.controller.js";
import { importChatSession } from "../controllers/ai-chat-import.controller.js";
import { listStudioShots } from "../services/studio-browser-tools.js";
import { answerPermission, listBrowserSites, setBrowserSite } from "../services/permission-gate.js";
import { clearBrowserData } from "../services/studio-browser.service.js";
// DELETE /api/ai/browser-data: the online browser's logins, cookies, history and cache are removed (it starts empty)
const clearBrowserDataRoute = async (req, res) => {
  try { await clearBrowserData(String(req.user?._id || req.user?.id || "")); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: String(e?.message || e) }); }
};
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
// The desktop app's reply to a step it ran on the computer for a streaming answer (pc_tool_call), and the end of a
// background command there (the chat is woken with the result)
router.post("/pc-tool-result", isAuthenticated, pcToolResult);
router.post("/local-job-done", isAuthenticated, localJobDone);
// The desktop app comes back for a streaming answer after its internet dropped
router.get("/turn/:id/events", isAuthenticated, turnEvents);
// The desktop app driving an answer's loop: which tool calls run, in what order, or stop
router.post("/turn/:id/cmd", isAuthenticated, turnCommand);
router.post("/feedback", isAuthenticated, submitAiFeedback);
// An answer read aloud in Classgrid's voice (web app only); counted as a voice reply of the day
router.post("/speak", isAuthenticated, requireChatOnboarding, speakAnswer);
// The voices a user can pick for answers read aloud (voice mode in the phone app)
router.get("/voices", isAuthenticated, listVoices);
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

// Premium model access (model picker lock for Claude Fable) and, with plans on, the user's plan: its models, its
// Fable share and its helpers, so the picker and the app show what the plan allows
router.get("/model-access", isAuthenticated, async (req, res) => {
    try {
        const { fableAccess, disabledModels } = await import("../services/model-access.service.js");
        const { planOf } = await import("../services/plan-limits.service.js");
        const [fable, disabled, plan] = await Promise.all([fableAccess(req.user), disabledModels(), planOf(req.user).catch(() => null)]);
        const byPlan = !!plan && Number(plan.fable_share_percent) > 0;
        res.json({
            fable: byPlan ? { ...fable, unlocked: true, byPlan: true } : fable,
            disabledModels: disabled,
            plan: plan ? { key: plan.key, name: plan.name, modelsAllowed: plan.models_allowed || [], fableSharePercent: plan.fable_share_percent || 0, helpersPerChat: plan.helpers_per_chat, thinkingModes: plan.thinking_modes || [], contextTokens: plan.context_tokens } : null,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// The plans (what each gives and costs) and the user's own plan with this week's counts
router.get("/plans", isAuthenticated, async (req, res) => {
    try {
        const { planTable } = await import("../services/plan-limits.service.js");
        const t = await planTable();
        const plans = Object.values(t.plans).filter((p) => p.is_public !== false).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
            .map((p) => ({ key: p.key, name: p.name, tagline: p.tagline, coming_soon: !!p.coming_soon, price_inr_monthly: p.price_inr_monthly, price_inr_yearly: p.price_inr_yearly, student_price_inr_monthly: p.student_price_inr_monthly, student_price_inr_yearly: p.student_price_inr_yearly, features_text: p.features_text || [] }));
        res.json({ enabled: t.enabled, plans });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// The plan and every usage count, for the AI hub's Plan and Usage pages
router.get("/plan/overview", isAuthenticated, getPlanOverview);
router.get("/plan/usage-history", isAuthenticated, getUsageHistory);
router.get("/plan", isAuthenticated, async (req, res) => {
    try {
        const { planOf, planKeyOf, plansEnabled } = await import("../services/plan-limits.service.js");
        const { weekCounters } = await import("../services/ai-credits.service.js");
        const [enabled, plan] = await Promise.all([plansEnabled(), planOf(req.user)]);
        const counters = enabled ? await weekCounters(req.user._id, req.user.ai_tokens) : null;
        const mine = req.user.plan || {};
        res.json({
            enabled,
            key: enabled ? planKeyOf(req.user) : "free",
            name: plan?.name || "Free",
            status: mine.status || "active", billing: mine.billing || "none", expires_at: mine.expires_at || null, started_at: mine.started_at || null,
            limits: plan ? { tokens_per_window: plan.tokens_per_window, window_reset_value: plan.window_reset_value, window_reset_unit: plan.window_reset_unit, tokens_per_week: plan.tokens_per_week, claude_credits_per_week: plan.claude_credits_per_week, fable_share_percent: plan.fable_share_percent, images_per_period: plan.images_per_period, call_minutes_per_period: plan.call_minutes_per_period, projects_max: plan.projects_max, helpers_per_chat: plan.helpers_per_chat } : null,
            week: counters ? { used: counters.week_used, claude_used: counters.claude_week_used, fable_used: counters.fable_week_used, ends_at: counters.weekEnd } : null,
        });
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
// Desktop app: a chat saved on this computer by another account goes on under this account
router.post("/sessions/import", isAuthenticated, importChatSession);
router.get("/working", isAuthenticated, getWorkingChats);
router.get("/sessions/:id/helpers", isAuthenticated, getChatHelpers);
router.get("/sessions/:id", isAuthenticated, getChatSession);
router.get("/sessions/:id/messages", isAuthenticated, getChatSessionMessages);
router.put("/sessions/:id", isAuthenticated, updateChatSession);
router.post("/sessions/:id/archive", isAuthenticated, archiveChatSession);
router.get("/studio/shots/:sessionId", isAuthenticated, listStudioShots);
router.post("/permission/:id", isAuthenticated, answerPermission);
// Settings → Browser: websites the AI's browser always opens or never opens, and clearing the online browser's data
router.get("/browser-sites", isAuthenticated, listBrowserSites);
router.put("/browser-sites", isAuthenticated, setBrowserSite);
router.delete("/browser-data", isAuthenticated, clearBrowserDataRoute);
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
router.post("/sessions/:id/online", isAuthenticated, takeChatOnline);

// Top-up Routes
router.use("/topup", aiTopUpRoutes);
// Credits Routes
router.use("/credits", aiCreditsRoutes);

export default router;
