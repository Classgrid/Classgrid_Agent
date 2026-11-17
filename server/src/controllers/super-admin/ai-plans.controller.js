// Super admin: the plan table (Free, Pro, Max, Enterprise) and a user's plan set by hand (owner, 2026-11-14: every
// number is editable here, nothing fixed in code).
import GlobalAiConfig from "../../models/GlobalAiConfig.js";
import PlanConfig, { PLAN_KEYS, RESET_UNIT_ENUM, ensurePlanRows } from "../../models/PlanConfig.js";
import User from "../../models/User.js";
import AiCreditTransaction from "../../models/AiCreditTransaction.js";
import AdminAuditLog from "../../models/AdminAuditLog.js";
import { forgetPlans } from "../../services/plan-limits.service.js";

const NUMBER_FIELDS = [
    "sort", "price_inr_monthly", "price_inr_yearly", "student_price_inr_monthly", "student_price_inr_yearly",
    "tokens_per_window", "window_reset_value", "tokens_per_week", "chats_per_window", "chats_per_week",
    "claude_credits_per_week", "fable_share_percent", "context_tokens", "helpers_per_chat",
    "images_per_period", "images_reset_value", "voice_replies_per_day", "voice_input_minutes_per_day",
    "call_minutes_per_period", "call_reset_value", "calls_per_day", "call_max_minutes",
    "calls_per_week", "calls_per_month", "call_tasks_per_call", "call_tasks_at_once", "call_task_max_minutes",
    "whatsapp_per_day", "whatsapp_per_period", "whatsapp_reset_value",
    "projects_max", "coding_runs_per_month", "premium_runs_per_month", "sandbox_hours_per_month", "sandbox_sessions",
    "uploads_per_window", "upload_max_mb", "library_storage_mb", "devices_max",
];
const UNIT_FIELDS = ["window_reset_unit", "images_reset_unit", "call_reset_unit", "whatsapp_reset_unit"];
const TEXT_FIELDS = ["name", "tagline", "default_model", "support_level"];
const BOOL_FIELDS = ["is_public", "coming_soon", "priority"];
const LIST_FIELDS = ["models_allowed", "thinking_modes", "features_text"];

export const getPlans = async (req, res) => {
    try {
        await ensurePlanRows();
        const [config, plans] = await Promise.all([
            GlobalAiConfig.findOne({ key: "singleton" }).select("plans_enabled").lean(),
            PlanConfig.find({}).sort({ sort: 1 }).lean(),
        ]);
        res.json({ success: true, enabled: config?.plans_enabled === true, plans });
    } catch (error) {
        console.error("[getPlans]", error);
        res.status(500).json({ success: false, message: "Server error reading the plans." });
    }
};

export const updatePlan = async (req, res) => {
    try {
        const key = String(req.params.key || "");
        if (!PLAN_KEYS.includes(key)) return res.status(404).json({ success: false, message: "No such plan." });
        const body = req.body || {};
        const set = {};
        for (const f of NUMBER_FIELDS) {
            if (body[f] === undefined) continue;
            const n = Number(body[f]);
            if (!Number.isFinite(n) || n < -1) return res.status(400).json({ success: false, message: `${f} must be a number (-1 = unlimited, 0 = not included).` });
            if (f.endsWith("_reset_value") && n < 1) return res.status(400).json({ success: false, message: `${f} must be at least 1.` });
            if (f === "fable_share_percent" && (n < 0 || n > 100)) return res.status(400).json({ success: false, message: "fable_share_percent must be 0 to 100." });
            set[f] = f.endsWith("_reset_value") ? Math.round(n) : n;
        }
        for (const f of UNIT_FIELDS) {
            if (body[f] === undefined) continue;
            if (!RESET_UNIT_ENUM.includes(body[f])) return res.status(400).json({ success: false, message: `${f} must be one of ${RESET_UNIT_ENUM.join(", ")}.` });
            set[f] = body[f];
        }
        for (const f of TEXT_FIELDS) if (typeof body[f] === "string") set[f] = body[f].trim().slice(0, 200);
        for (const f of BOOL_FIELDS) if (body[f] !== undefined) set[f] = body[f] === true;
        for (const f of LIST_FIELDS) {
            if (body[f] === undefined) continue;
            if (!Array.isArray(body[f])) return res.status(400).json({ success: false, message: `${f} must be a list.` });
            set[f] = body[f].map((s) => String(s).trim()).filter(Boolean).slice(0, 100);
        }
        if (set.thinking_modes && set.thinking_modes.some((m) => !["fast", "normal", "deep"].includes(m))) return res.status(400).json({ success: false, message: "thinking_modes may hold fast, normal, deep." });
        const plan = await PlanConfig.findOneAndUpdate({ key }, { $set: set }, { new: true, upsert: true, setDefaultsOnInsert: true }).lean();
        forgetPlans();
        const io = req.app.get("io");
        if (io) io.emit("ai_token_update");
        res.json({ success: true, plan });
    } catch (error) {
        console.error("[updatePlan]", error);
        res.status(500).json({ success: false, message: "Server error saving the plan." });
    }
};

export const setPlansEnabled = async (req, res) => {
    try {
        const enabled = req.body?.enabled === true;
        let config = await GlobalAiConfig.findOne({ key: "singleton" });
        if (!config) config = new GlobalAiConfig({ key: "singleton" });
        config.plans_enabled = enabled;
        await config.save();
        forgetPlans();
        const io = req.app.get("io");
        if (io) io.emit("ai_token_update");
        res.json({ success: true, enabled });
    } catch (error) {
        console.error("[setPlansEnabled]", error);
        res.status(500).json({ success: false, message: "Server error saving the switch." });
    }
};

// The periods a super admin can gift a plan for (Plans & Usage > a user > Gift a plan), in months
export const GIFT_MONTHS = [1, 3, 6, 12];

// When a gifted plan ends: `months` (1, 3, 6 or 12 from now) or `expires_at` (a date). Neither: no end (null).
// { error } when the period is not one of these or the date is not in the future.
export function giftEndDate(body = {}, now = new Date()) {
    if (body.months !== undefined && body.months !== null && body.months !== "") {
        const months = Number(body.months);
        if (!GIFT_MONTHS.includes(months)) return { error: "The period must be 1, 3, 6 or 12 months." };
        const end = new Date(now);
        end.setMonth(end.getMonth() + months);
        return { expiresAt: end };
    }
    if (body.expires_at) {
        const end = new Date(body.expires_at);
        if (Number.isNaN(end.getTime())) return { error: "The end date is not a date." };
        if (end.getTime() <= now.getTime()) return { error: "The end date must be in the future." };
        return { expiresAt: end };
    }
    return { expiresAt: null };
}

// A user's plan, set by hand: a gift (Pro or Max, with a reason), or back to Free. The reason is required for a paid
// plan; it is saved on the plan (plan.note) and in the admin audit log (AdminAuditLog, "user.plan_gift" or
// "user.plan_end"), which the user's page lists as the plan history. expires_at / months empty = no end.
export const setUserPlan = async (req, res) => {
    try {
        const { userId } = req.params;
        const planId = String(req.body?.planId || "free");
        if (!PLAN_KEYS.includes(planId)) return res.status(400).json({ success: false, message: "No such plan." });
        const reason = String(req.body?.reason ?? req.body?.note ?? "").trim().slice(0, 300);
        if (planId !== "free" && !reason) return res.status(400).json({ success: false, message: "Write why you are giving this plan." });
        const { expiresAt, error } = planId === "free" ? { expiresAt: null } : giftEndDate(req.body || {});
        if (error) return res.status(400).json({ success: false, message: error });
        const user = await User.findById(userId).select("plan email name");
        if (!user) return res.status(404).json({ success: false, message: "User not found." });
        const before = user.plan ? { id: user.plan.id, status: user.plan.status, billing: user.plan.billing, started_at: user.plan.started_at, expires_at: user.plan.expires_at } : null;
        user.plan = {
            id: planId,
            status: "active",
            billing: planId === "free" ? "none" : "granted",
            started_at: new Date(),
            expires_at: expiresAt,
            cancel_at_period_end: false,
            source: "admin",
            set_by: req.user?.email || "",
            note: reason,
        };
        await user.save();
        const io = req.app.get("io");
        if (io) { io.to(String(userId)).emit("ai_token_update"); io.to(String(userId)).emit("plan_update", { plan: planId }); } // (a user's socket room is their id, socket.service.js)
        res.json({ success: true, plan: user.plan });
        // The audit log (after the reply, so a failed log never fails the save)
        AdminAuditLog.create({
            actorId: req.user?._id,
            actorName: req.user?.name || req.user?.email || "Super admin",
            actorRole: "super_admin",
            action: planId === "free" ? "user.plan_end" : "user.plan_gift",
            targetId: String(user._id),
            targetName: user.email || user.name || "",
            targetType: "user",
            previousState: before,
            metadata: { plan: planId, expires_at: expiresAt, reason, set_by: req.user?.email || "" },
            ip: req.ip || "",
            userAgent: req.headers?.["user-agent"] || "",
        }).catch((e) => console.error("[setUserPlan] audit log failed:", e.message));
        // After the reply, so the email never holds up or fails the save: "You're on the Classgrid Pro plan"
        if (planId !== "free") planSetEmail(user, planId).catch((e) => console.error("[setUserPlan] plan email failed:", e.message));
    } catch (error) {
        console.error("[setUserPlan]", error);
        res.status(500).json({ success: false, message: "Server error setting the plan." });
    }
};

// The email for a plan set by a super admin: the plan's name, its dates, and its features_text lines, read live from
// the plan table (as the webhook's receipt does). Nothing for Free, without an email address, or without a plan row.
export async function planSetEmail(user, planId) {
    if (!user?.email || planId === "free") return;
    const planRow = await PlanConfig.findOne({ key: planId }).lean();
    const { getPlanSetEmail } = await import("../../services/email-templates.service.js");
    const mail = getPlanSetEmail({ userName: user.name, plan: planRow, start: user.plan?.started_at || new Date(), end: user.plan?.expires_at || null });
    if (!mail) return;
    const { sendEmail } = await import("../../services/aws-ses.service.js");
    await sendEmail({ to: user.email, subject: mail.subject, html: mail.html, text: mail.text, fromName: "Classgrid", userId: user._id });
}

// Everyone on a paid plan (Pro, Max, Enterprise: bought or granted), newest first, and the plan payments
export const listSubscribers = async (req, res) => {
    try {
        const [users, payments] = await Promise.all([
            User.find({ "plan.id": { $in: PLAN_KEYS.filter((k) => k !== "free") } }).select("email name role plan").sort({ "plan.started_at": -1 }).limit(500).lean(),
            AiCreditTransaction.find({ type: "plan" }).select("userEmail userName plan_key plan_term amount_inr status razorpay_payment_id plan_period_start plan_period_end paymentTime createdAt").sort({ createdAt: -1 }).limit(300).lean(),
        ]);
        res.json({ success: true, users, payments });
    } catch (error) {
        console.error("[listSubscribers]", error);
        res.status(500).json({ success: false, message: "Server error reading the subscribers." });
    }
};
