// Super admin: the plan table (Free, Pro, Max, Enterprise) and a user's plan set by hand (owner, 2026-11-14: every
// number is editable here, nothing fixed in code).
import GlobalAiConfig from "../../models/GlobalAiConfig.js";
import PlanConfig, { PLAN_KEYS, RESET_UNIT_ENUM, ensurePlanRows } from "../../models/PlanConfig.js";
import User from "../../models/User.js";
import AiCreditTransaction from "../../models/AiCreditTransaction.js";
import { forgetPlans } from "../../services/plan-limits.service.js";

const NUMBER_FIELDS = [
    "sort", "price_inr_monthly", "price_inr_yearly", "student_price_inr_monthly", "student_price_inr_yearly",
    "tokens_per_window", "window_reset_value", "tokens_per_week", "chats_per_window", "chats_per_week",
    "claude_credits_per_week", "fable_share_percent", "context_tokens", "helpers_per_chat",
    "images_per_period", "images_reset_value", "voice_replies_per_day", "voice_input_minutes_per_day",
    "call_minutes_per_period", "call_reset_value", "calls_per_day", "call_max_minutes",
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

// A user's plan, set by hand (a gift, a test account, a refund case). expires_at empty = no end.
export const setUserPlan = async (req, res) => {
    try {
        const { userId } = req.params;
        const planId = String(req.body?.planId || "free");
        if (!PLAN_KEYS.includes(planId)) return res.status(400).json({ success: false, message: "No such plan." });
        let expiresAt = null;
        if (req.body?.expires_at) {
            expiresAt = new Date(req.body.expires_at);
            if (Number.isNaN(expiresAt.getTime())) return res.status(400).json({ success: false, message: "expires_at is not a date." });
        }
        const user = await User.findById(userId).select("plan email");
        if (!user) return res.status(404).json({ success: false, message: "User not found." });
        user.plan = {
            id: planId,
            status: "active",
            billing: planId === "free" ? "none" : "granted",
            started_at: new Date(),
            expires_at: expiresAt,
            cancel_at_period_end: false,
            source: "admin",
            set_by: req.user?.email || "",
            note: String(req.body?.note || "").slice(0, 300),
        };
        await user.save();
        const io = req.app.get("io");
        if (io) { io.to(String(userId)).emit("ai_token_update"); io.to(String(userId)).emit("plan_update", { plan: planId }); } // (a user's socket room is their id, socket.service.js)
        res.json({ success: true, plan: user.plan });
    } catch (error) {
        console.error("[setUserPlan]", error);
        res.status(500).json({ success: false, message: "Server error setting the plan." });
    }
};

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
