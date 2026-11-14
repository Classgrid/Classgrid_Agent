// The user's plan and every usage count in one answer (owner, 2026-11-14 evening): the AI hub's Plan and Usage
// pages read this. Plans on: the plan's numbers; plans off: the global numbers. A limit is -1 for unlimited, 0 for
// not included, null when nothing limits it. Nothing is charged or changed here (read only).
import User from "../models/User.js";
import Organization from "../models/Organization.js";
import GlobalAiConfig from "../models/GlobalAiConfig.js";
import AiLibraryFile from "../models/AiLibraryFile.js";
import IdeProject from "../models/IdeProject.js";
import AiUsageLog from "../models/AiUsageLog.js";
import { planOf, planKeyOf, plansEnabled } from "../services/plan-limits.service.js";
import { freeWindow, weekCounters, tokenWindowEnd } from "../services/ai-credits.service.js";
import { resolveFeatureLimit, resolveResetPeriod, checkWhatsappLimit, formatPeriodLength } from "../services/ai-feature-limits.js";
import { usedToday, dayKey } from "../services/plan-usage.service.js";
import { chatsStartedSince, getUserGeneratedImages } from "../services/ai-chat.service.js";

const num = (v, fallback = null) => (v === undefined || v === null || v === "" ? fallback : (Number.isFinite(Number(v)) ? Number(v) : fallback));
const lim = (v) => (v === Infinity ? -1 : num(v));
const mb = (bytes) => Math.round(((Number(bytes) || 0) / (1024 * 1024)) * 10) / 10;

// Midnight India time, tomorrow (the daily counters' restart)
function nextIstMidnight() {
    const today = dayKey(); // YYYY-MM-DD in IST
    const [y, m, d] = today.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0) - 5.5 * 3600 * 1000);
}

// Every limit of a plan, as the Plan page lists them (the super admin's fields, nothing else)
const PLAN_FIELDS = [
    "tokens_per_window", "window_reset_value", "window_reset_unit", "tokens_per_week", "chats_per_window", "chats_per_week",
    "claude_credits_per_week", "fable_share_percent", "models_allowed", "default_model", "thinking_modes", "context_tokens", "helpers_per_chat",
    "images_per_period", "images_reset_value", "images_reset_unit", "voice_replies_per_day", "voice_input_minutes_per_day",
    "call_minutes_per_period", "call_reset_value", "call_reset_unit", "calls_per_day", "call_max_minutes",
    "whatsapp_per_day", "whatsapp_per_period", "whatsapp_reset_value", "whatsapp_reset_unit",
    "projects_max", "coding_runs_per_month", "premium_runs_per_month", "sandbox_hours_per_month", "sandbox_sessions",
    "uploads_per_window", "upload_max_mb", "library_storage_mb", "devices_max", "priority", "support_level", "features_text",
    "price_inr_monthly", "price_inr_yearly", "student_price_inr_monthly", "student_price_inr_yearly", "tagline", "coming_soon",
];

export const getPlanOverview = async (req, res) => {
    try {
        const userId = req.user._id;
        const [user, config, enabled] = await Promise.all([
            User.findById(userId).lean(),
            GlobalAiConfig.findOne({ key: "singleton" }).lean().catch(() => null),
            plansEnabled().catch(() => false),
        ]);
        if (!user) return res.status(404).json({ error: "User not found" });
        const orgId = user.organization_id || null;
        const org = orgId ? await Organization.findById(orgId).select("ai_config").lean().catch(() => null) : null;
        const plan = await planOf(user).catch(() => null);
        const cfg = config || {};
        const now = Date.now();

        // Credits: the window and the weekly counters
        const window = await freeWindow(user, org, cfg, orgId);
        const windowEnd = tokenWindowEnd(user.ai_tokens, window.periodMs, now);
        const windowUsed = now >= windowEnd ? 0 : (user.ai_tokens?.used_this_week || 0);
        const week = enabled ? await weekCounters(userId, user.ai_tokens, now) : null;
        const claudeCap = plan ? num(plan.claude_credits_per_week, 0) : null;
        const fableCap = plan && claudeCap !== null && claudeCap > 0 ? Math.round(claudeCap * (num(plan.fable_share_percent, 0) / 100)) : (plan ? 0 : null);

        // Chats started
        const chatsWindowCap = plan ? num(plan.chats_per_window, 0) : null;
        const chatsWeekCap = plan ? num(plan.chats_per_week, 0) : null;
        const [chatsWindow, chatsWeek] = await Promise.all([
            chatsWindowCap !== null ? chatsStartedSince(user.email, now - window.periodMs).catch(() => 0) : 0,
            chatsWeekCap !== null ? chatsStartedSince(user.email, now - 7 * 86400000).catch(() => 0) : 0,
        ]);

        // Images this period
        const imageLimit = resolveFeatureLimit("image", org, cfg, orgId, plan);
        const imagePeriod = resolveResetPeriod("image", org, cfg, orgId, plan);
        const imageReset = user.ai_image_reset_date ? new Date(user.ai_image_reset_date) : null;
        const imagesUsed = imageReset && imageReset.getTime() > now ? (user.ai_image_free_weekly_used || 0) : 0;

        // Voice, today (India time)
        const [voiceReplies, voiceSeconds] = await Promise.all([usedToday(String(userId), "voicereply"), usedToday(String(userId), "voiceinput")]);
        const voiceReplyCap = plan ? num(plan.voice_replies_per_day, 0) : num(cfg.global_voice_replies_per_day, 20);
        const voiceInputCap = plan ? num(plan.voice_input_minutes_per_day, 0) : null;

        // WhatsApp messages this period (read only: nothing is paid here)
        const wa = await checkWhatsappLimit(user, { readOnly: true }).catch(() => null);
        const waPeriod = resolveResetPeriod("whatsapp", org, cfg, orgId, plan);

        // Calls: free minutes this period
        const callLimit = resolveFeatureLimit("calls", org, cfg, orgId, plan);
        const callPeriod = resolveResetPeriod("calls", org, cfg, orgId, plan);
        const callReset = user.ai_call_reset_date ? new Date(user.ai_call_reset_date) : null;
        const callSeconds = callReset && callReset.getTime() > now ? (user.ai_call_seconds_used || 0) : 0;

        // Projects and storage (the Library: uploaded files and generated pictures)
        const [projects, storage, generated] = await Promise.all([
            IdeProject.countDocuments({ owner: userId, location: { $ne: "local" } }).catch(() => 0),
            AiLibraryFile.aggregate([
                { $match: { user_id: user._id } },
                { $group: { _id: { $cond: [{ $eq: ["$file_type", "image"] }, "images", "files"] }, bytes: { $sum: "$size_bytes" }, count: { $sum: 1 } } },
            ]).catch(() => []),
            getUserGeneratedImages(user.email).then((l) => (Array.isArray(l) ? l.length : 0)).catch(() => 0),
        ]);
        const files = storage.find((s) => s._id === "files") || { bytes: 0, count: 0 };
        const images = storage.find((s) => s._id === "images") || { bytes: 0, count: 0 };
        const storageCap = plan ? num(plan.library_storage_mb, 0) : null;

        // Balances
        const paidOk = !(user.ai_tokens?.ai_credits_end_date && new Date(user.ai_tokens.ai_credits_end_date).getTime() < now);
        const promoOk = !(user.ai_tokens?.promotion_credits_end_date && new Date(user.ai_tokens.promotion_credits_end_date).getTime() < now);

        const mine = user.plan || {};
        const subscribed = enabled && !!plan && plan.key !== "free" && (mine.status || "active") === "active" && (!mine.expires_at || new Date(mine.expires_at).getTime() > now);
        const limits = {};
        if (plan) for (const f of PLAN_FIELDS) limits[f] = plan[f];

        res.json({
            enabled,
            plan: {
                key: enabled ? planKeyOf(user) : "free", name: plan?.name || "Free", tagline: plan?.tagline || "",
                status: mine.status || "active", billing: mine.billing || "none", started_at: mine.started_at || null, expires_at: mine.expires_at || null,
                subscribed, limits: plan ? limits : null,
            },
            balance: {
                topup: paidOk ? (user.ai_tokens?.ai_credits_balance || 0) : 0,
                promotion: promoOk ? (user.ai_tokens?.promotion_credits_balance || 0) : 0,
                credits_per_inr: num(cfg.credits_per_inr, 3000),
                extra: { image: num(cfg.extra_image_credits, 0), whatsapp: num(cfg.extra_whatsapp_credits, 0), voicereply: num(cfg.extra_voice_reply_credits, 0), voiceinput: num(cfg.extra_voice_input_credits_per_minute, 0) },
            },
            usage: {
                credits_window: { used: windowUsed, limit: lim(window.limit), resetAt: new Date(windowEnd).toISOString(), periodText: formatPeriodLength({ value: Math.max(1, Math.round(window.periodMs / 3600000)), unit: "hour" }) },
                credits_week: week ? { used: week.week_used, limit: lim(window.weekCap), resetAt: week.weekEnd } : null,
                claude_week: week ? { used: week.claude_week_used, limit: claudeCap, resetAt: week.weekEnd } : null,
                fable_week: week ? { used: week.fable_week_used, limit: fableCap, resetAt: week.weekEnd } : null,
                chats_window: chatsWindowCap !== null ? { used: chatsWindow, limit: chatsWindowCap, periodText: `${plan.window_reset_value} ${plan.window_reset_unit}${plan.window_reset_value === 1 ? "" : "s"}` } : null,
                chats_week: chatsWeekCap !== null ? { used: chatsWeek, limit: chatsWeekCap } : null,
                images: { used: imagesUsed, limit: lim(imageLimit), resetAt: imageReset && imageReset.getTime() > now ? imageReset.toISOString() : null, periodText: imagePeriod.label.replace(/^every /, "") },
                voice_replies: { used: voiceReplies, limit: voiceReplyCap, resetAt: nextIstMidnight().toISOString() },
                voice_input_minutes: voiceInputCap !== null ? { used: Math.round((voiceSeconds / 60) * 10) / 10, limit: voiceInputCap, resetAt: nextIstMidnight().toISOString() } : null,
                whatsapp: wa ? { used: wa.used, limit: lim(wa.limit), resetAt: wa.resetAt ? new Date(wa.resetAt).toISOString() : null, periodText: waPeriod.label.replace(/^every /, ""), dayLimit: plan ? num(plan.whatsapp_per_day, null) : null } : null,
                call_minutes: { used: Math.round((callSeconds / 60) * 10) / 10, limit: lim(callLimit), resetAt: callReset && callReset.getTime() > now ? callReset.toISOString() : null, periodText: callPeriod.label.replace(/^every /, ""), callsPerDay: plan ? num(plan.calls_per_day, null) : null, maxMinutes: plan ? num(plan.call_max_minutes, null) : null },
                projects: { used: projects, limit: plan ? num(plan.projects_max, 0) : null },
                storage: { usedMb: mb(files.bytes + images.bytes), limit: storageCap, files: { count: files.count, mb: mb(files.bytes) }, images: { count: images.count, mb: mb(images.bytes) }, generatedImages: generated },
            },
        });
    } catch (err) {
        console.error("[plan overview]", err);
        res.status(500).json({ error: err.message });
    }
};

// The Usage page's history (GET /api/ai/plan/usage-history?days=14): credits per day (India time) for the last days,
// the totals, and the last 50 AI requests with their model and credits (from AiUsageLog)
export const getUsageHistory = async (req, res) => {
    try {
        const days = Math.min(90, Math.max(1, parseInt(req.query.days, 10) || 14));
        const since = new Date(Date.now() - days * 86400000);
        const match = { userId: req.user._id, createdAt: { $gte: since }, success: { $ne: false } };
        const [perDay, events, totals] = await Promise.all([
            AiUsageLog.aggregate([
                { $match: match },
                { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } }, credits: { $sum: "$totalTokens" }, requests: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),
            AiUsageLog.find(match).sort({ createdAt: -1 }).limit(50).select("createdAt provider model feature totalTokens metadata").lean(),
            AiUsageLog.aggregate([{ $match: match }, { $group: { _id: null, credits: { $sum: "$totalTokens" }, requests: { $sum: 1 } } }]),
        ]);
        const byDay = new Map(perDay.map((d) => [d._id, d]));
        const list = [];
        for (let i = days - 1; i >= 0; i--) {
            const key = new Date(Date.now() - i * 86400000 + 5.5 * 3600000).toISOString().slice(0, 10);
            const d = byDay.get(key);
            list.push({ day: key, credits: d?.credits || 0, requests: d?.requests || 0 });
        }
        const what = (e) => {
            if (e.provider === "elevenlabs") return "Read aloud";
            const kind = e.metadata?.kind;
            if (kind === "image") return "Image";
            if (kind === "whatsapp") return "WhatsApp";
            if (kind === "call") return "WhatsApp call";
            return e.feature === "chat_ai" ? "Chat" : "Other";
        };
        res.json({
            days, since: since.toISOString(),
            total: { credits: totals[0]?.credits || 0, requests: totals[0]?.requests || 0 },
            perDay: list,
            events: events.map((e) => ({ at: e.createdAt, model: e.model, provider: e.provider, what: what(e), credits: e.totalTokens || 0 })),
        });
    } catch (err) {
        console.error("[usage history]", err);
        res.status(500).json({ error: err.message });
    }
};
