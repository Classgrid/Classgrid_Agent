// The user's plan and every usage count in one answer (owner, 2026-11-14 evening): the AI hub's Plan and Usage
// pages read this. Plans on: the plan's numbers; plans off: the global numbers. A limit is -1 for unlimited, 0 for
// not included, null when nothing limits it. Nothing is charged or changed here (read only).
import mongoose from "mongoose";
import User from "../models/User.js";
import Organization from "../models/Organization.js";
import GlobalAiConfig from "../models/GlobalAiConfig.js";
import AiLibraryFile from "../models/AiLibraryFile.js";
import IdeProject from "../models/IdeProject.js";
import AiUsageLog from "../models/AiUsageLog.js";
import AiCreditSpend from "../models/AiCreditSpend.js";
import { planOf, planKeyOf, plansEnabled, filesPerMessage, DEFAULT_FILES_PER_MESSAGE } from "../services/plan-limits.service.js";
import { playRefreshDue, planSourceAndTerm } from "../services/google-play-rules.js";
import { freeWindow, weekCounters, tokenWindowEnd } from "../services/ai-credits.service.js";
import { resolveFeatureLimit, resolveResetPeriod, checkWhatsappLimit, formatPeriodLength } from "../services/ai-feature-limits.js";
import { usedToday, dayKey } from "../services/plan-usage.service.js";
import { chatsStartedSince, getUserGeneratedImages } from "../services/ai-chat.service.js";

const num = (v, fallback = null) => (v === undefined || v === null || v === "" ? fallback : (Number.isFinite(Number(v)) ? Number(v) : fallback));
const lim = (v) => (v === Infinity ? -1 : num(v));
const mb = (bytes) => Math.round(((Number(bytes) || 0) / (1024 * 1024)) * 10) / 10;
// 12:00 am on the 1st of next month, India time (the monthly counters use India months)
function nextIstMonthStart(now = new Date()) {
    const ist = new Date(now.getTime() + 5.5 * 3600000);
    return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth() + 1, 1) - 5.5 * 3600000);
}

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
    "calls_per_week", "calls_per_month", "call_tasks_per_call", "call_tasks_at_once", "call_task_max_minutes",
    "whatsapp_per_day", "whatsapp_per_period", "whatsapp_reset_value", "whatsapp_reset_unit",
    "projects_max", "sandbox_hours_per_month", "sandbox_sessions",
    "uploads_per_window", "upload_max_mb", "files_per_message", "library_storage_mb", "devices_max", "priority", "support_level", "features_text",
    "price_inr_monthly", "price_inr_yearly", "student_price_inr_monthly", "student_price_inr_yearly", "tagline", "coming_soon",
];

// The overview for one user (null when there is no such user). Shared by the Usage page (GET /api/ai/plan/overview, below) and
// Classgrid AI's own get_plans_and_usage tool (services/plan-info-tools.js), so both show the same numbers
export async function planOverviewFor(userId) {
        const [user, config, enabled] = await Promise.all([
            User.findById(userId).lean(),
            GlobalAiConfig.findOne({ key: "singleton" }).lean().catch(() => null),
            plansEnabled().catch(() => false),
        ]);
        if (!user) return null;
        // A plan bought through Google Play whose end has passed or is near: asked of Google first (a renewal moves
        // the end date), at most once per 10 minutes per user; a failed or slow check leaves the plan as it is
        if (playRefreshDue(user.plan)) {
            const renewed = await import("../services/google-play.service.js").then((m) => m.refreshPlayPlan(user, { timeoutMs: 5000 })).catch(() => null);
            if (renewed) user.plan = renewed;
        }
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
        const [projects, cloudHours, storage, generated] = await Promise.all([
            IdeProject.countDocuments({ owner: userId, location: { $ne: "local" } }).catch(() => 0),
            // Hours of cloud computer this month (services/cloud-computer-limit.service.js)
            import("../services/cloud-computer-limit.service.js").then((m) => m.cloudHoursUsed(userId)).catch(() => 0),
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

        return {
            enabled,
            plan: {
                key: enabled ? planKeyOf(user) : "free", name: plan?.name || "Free", tagline: plan?.tagline || "",
                status: mine.status || "active", billing: mine.billing || "none", started_at: mine.started_at || null, expires_at: mine.expires_at || null,
                subscribed, limits: plan ? limits : null, student_price: mine.note === "student price",
                // Where the plan came from and its term, for the apps (source "google_play" | "website" | "granted" |
                // null, term "month" | "year" | null; null on Free), and the Google Play product and base plan
                ...(() => {
                    const s = planSourceAndTerm(mine, enabled ? planKeyOf(user) : "free");
                    return { source: s.source, term: s.term, play_product_id: s.product_id, play_base_plan_id: s.base_plan_id };
                })(),
                // True when it does not renew (auto-renew off: paid until expires_at, then it ends) and, for a Google
                // Play plan, Google's state of the subscription (SUBSCRIPTION_STATE_*), so the Billing page can say so
                cancel_at_period_end: !!mine.cancel_at_period_end,
                play_state: mine.billing === "play" ? (mine.play_state || null) : null,
            },
            // Pictures and files one message may carry (the chat boxes read it; services/plan-limits.service.js)
            files_per_message: await filesPerMessage(user).catch(() => DEFAULT_FILES_PER_MESSAGE),
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
                // (they start again on the 1st of the month, India time)
                cloud_hours: plan ? { used: cloudHours, limit: num(plan.sandbox_hours_per_month, -1), resetAt: nextIstMonthStart().toISOString(), atOnce: num(plan.sandbox_sessions, 1) } : null,
                storage: { usedMb: mb(files.bytes + images.bytes), limit: storageCap, files: { count: files.count, mb: mb(files.bytes) }, images: { count: images.count, mb: mb(images.bytes) }, generatedImages: generated },
            },
        };
}

export const getPlanOverview = async (req, res) => {
    try {
        const overview = await planOverviewFor(req.user._id);
        if (!overview) return res.status(404).json({ error: "User not found" });
        res.json(overview);
    } catch (err) {
        console.error("[plan overview]", err);
        res.status(500).json({ error: err.message });
    }
};

// The Usage page's history (GET /api/ai/plan/usage-history?days=14&page=1&limit=15): credits per day (India time)
// for the last days, the totals, and the rows with their model and credits, newest first, one page at a time.
//
// For the person themselves (this route) it is the credits they SPENT (owner, 2026-11-20: "a person who uses only
// their plan sees 0; a person who buys Rs. 500 of credits sees only what they spent from those credits"): the rows
// are the charges to their credits (AiCreditSpend, written by deductTokens), never what the plan covered. The plan's
// own limits are the bars at the top of the page. The record starts on 2026-11-20: nothing before it was kept.
// usageHistoryFor is shared with the super admin's user page (Plans & Usage), which asks without these options and
// shows every AI request from the usage log (AiUsageLog) with its real model.
export const getUsageHistory = async (req, res) => {
    try {
        res.json(await usageHistoryFor(req.user._id, req.query, { ownNames: true, creditsOnly: true }));
    } catch (err) {
        console.error("[usage history]", err);
        res.status(500).json({ error: err.message });
    }
};

// What a user sees as the model of a voice, speech or picture request: Classgrid's own name, never the provider's
// model (owner, 2026-11-20: the Usage page showed "Eleven V4 Turbo" for a read-aloud, which tells anyone who makes our
// voice). Chat models keep their names (the user picks those in the model picker). The super admin's user page asks
// without ownNames and keeps the real model and provider.
const PICTURE_MODEL = /image|flux|dall|imagen|stable-diffusion|sdxl/i;
function ownName(e) {
    const model = String(e.model || "");
    if (PICTURE_MODEL.test(model)) return "Classgrid Image";
    if (/scribe|whisper|deepgram\/nova/i.test(model)) return "Classgrid Speech";
    if (e.provider === "elevenlabs" || /^eleven[_-]|deepgram\/aura|melotts/i.test(model)) return "Classgrid Voice";
    return null;
}

export async function usageHistoryFor(userId, query = {}, { ownNames = false, creditsOnly = false } = {}) {
        const days = Math.min(90, Math.max(1, parseInt(query.days, 10) || 14));
        const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 15));
        const page = Math.max(1, parseInt(query.page, 10) || 1);
        const since = new Date(Date.now() - days * 86400000);
        // (an id given as text, from the super admin's page, made an ObjectId: aggregate does not cast it)
        const uid = typeof userId === "string" && mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
        // creditsOnly: the charges to the person's credits (AiCreditSpend); otherwise every AI request (AiUsageLog)
        const Rows = creditsOnly ? AiCreditSpend : AiUsageLog;
        const amount = creditsOnly ? "$credits" : "$totalTokens";
        const match = creditsOnly ? { userId: uid, createdAt: { $gte: since } } : { userId: uid, createdAt: { $gte: since }, success: { $ne: false } };
        const [perDay, events, totals, eventsTotal] = await Promise.all([
            Rows.aggregate([
                { $match: match },
                { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } }, credits: { $sum: amount }, requests: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),
            Rows.find(match).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).select(creditsOnly ? "createdAt model what credits" : "createdAt provider model feature totalTokens metadata").lean(),
            Rows.aggregate([{ $match: match }, { $group: { _id: null, credits: { $sum: amount }, requests: { $sum: 1 } } }]),
            Rows.countDocuments(match),
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
            if (e.feature === "chat_ai") return "Chat";
            // feature "other": a picture (image models), else the chat's title (a few hundred credits)
            if (PICTURE_MODEL.test(String(e.model || ""))) return "Image";
            return (e.totalTokens || 0) <= 2000 ? "Chat title" : "Chat";
        };
        const shown = (e) => {
            const own = ownNames ? ownName(e) : null;
            return own ? { model: own, provider: "classgrid" } : { model: e.model, provider: e.provider };
        };
        return {
            days, since: since.toISOString(),
            total: { credits: totals[0]?.credits || 0, requests: totals[0]?.requests || 0 },
            perDay: list,
            events: creditsOnly
                // (a charge says what it paid for itself, the label deductTokens was given; "Chat" when it has none)
                ? events.map((e) => ({ at: e.createdAt, ...shown({ model: e.model || "", provider: "" }), what: e.what || "Chat", credits: e.credits || 0 }))
                : events.map((e) => ({ at: e.createdAt, ...shown(e), what: what(e), credits: e.totalTokens || 0 })),
            page, limit, eventsTotal, pages: Math.max(1, Math.ceil(eventsTotal / limit)), asOf: new Date().toISOString(),
        };
}
