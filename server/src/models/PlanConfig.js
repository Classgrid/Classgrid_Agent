// The plans: Free, Pro, Max, Enterprise (owner, 2026-11-14). Every number here is a super admin setting, nothing is fixed
// in code: the values below are only the first fill of the table, the super admin's AI Usage page edits them at any
// time. -1 means unlimited, 0 means not included. Plans apply only while GlobalAiConfig.plans_enabled is on.
import mongoose from "mongoose";

export const PLAN_KEYS = ["free", "pro", "max", "enterprise"];
export const RESET_UNIT_ENUM = ["second", "minute", "hour", "day", "week", "month"];

const planConfigSchema = new mongoose.Schema(
    {
        key: { type: String, enum: PLAN_KEYS, required: true, unique: true },
        name: { type: String, required: true },
        tagline: { type: String, default: "" },
        sort: { type: Number, default: 0 },
        is_public: { type: Boolean, default: true }, // shown on the pricing page
        coming_soon: { type: Boolean, default: false },

        // Prices (rupees, GST included; 0 = free; -1 = contact us)
        price_inr_monthly: { type: Number, default: 0 },
        price_inr_yearly: { type: Number, default: 0 },
        student_price_inr_monthly: { type: Number, default: 0 },
        student_price_inr_yearly: { type: Number, default: 0 },

        // AI credits: a short window plus a weekly ceiling
        tokens_per_window: { type: Number, default: 0 },
        window_reset_value: { type: Number, default: 5 },
        window_reset_unit: { type: String, enum: RESET_UNIT_ENUM, default: "hour" },
        tokens_per_week: { type: Number, default: 0 },
        // New chats a user may start (every model): a chat itself has no message limit (owner, 2026-11-14)
        chats_per_window: { type: Number, default: 0 },
        chats_per_week: { type: Number, default: 0 },
        // Claude: a weekly credit pool, with Fable allowed up to a share of it
        claude_credits_per_week: { type: Number, default: 0 },
        fable_share_percent: { type: Number, default: 0 },

        // Models and thinking
        models_allowed: { type: [String], default: [] },
        default_model: { type: String, default: "auto" },
        thinking_modes: { type: [String], default: ["fast", "normal"] },
        context_tokens: { type: Number, default: 32000 },
        helpers_per_chat: { type: Number, default: 1 },

        // Images
        images_per_period: { type: Number, default: 0 },
        images_reset_value: { type: Number, default: 1 },
        images_reset_unit: { type: String, enum: RESET_UNIT_ENUM, default: "week" },
        // Voice
        voice_replies_per_day: { type: Number, default: 0 },
        voice_input_minutes_per_day: { type: Number, default: 0 },
        // WhatsApp calls
        call_minutes_per_period: { type: Number, default: 0 },
        call_reset_value: { type: Number, default: 1 },
        call_reset_unit: { type: String, enum: RESET_UNIT_ENUM, default: "month" },
        calls_per_day: { type: Number, default: 0 },
        call_max_minutes: { type: Number, default: 5 },
        // WhatsApp scheduled messages
        whatsapp_per_day: { type: Number, default: 0 },
        whatsapp_per_period: { type: Number, default: 0 },
        whatsapp_reset_value: { type: Number, default: 1 },
        whatsapp_reset_unit: { type: String, enum: RESET_UNIT_ENUM, default: "month" },

        // Projects and coding
        projects_max: { type: Number, default: 0 },
        coding_runs_per_month: { type: Number, default: 0 },
        premium_runs_per_month: { type: Number, default: 0 },
        sandbox_hours_per_month: { type: Number, default: 0 },
        sandbox_sessions: { type: Number, default: 1 },

        // Files and devices
        uploads_per_window: { type: Number, default: 0 },
        upload_max_mb: { type: Number, default: 10 },
        library_storage_mb: { type: Number, default: 600 },
        devices_max: { type: Number, default: 2 },

        priority: { type: Boolean, default: false },
        support_level: { type: String, default: "community" },
        features_text: { type: [String], default: [] }, // the lines shown on the pricing page
    },
    { timestamps: true }
);

const FREE_MODELS = ["auto", "@cf/deepseek-ai/deepseek-v4.1-flash-1017", "@cf/zai-org/glm-5.3-flash", "claude-haiku-5-5", "@cf/google/gemma-4-26b-a4b-it", "@cf/zai-org/glm-4.7-flash", "@cf/openai/gpt-oss-20b", "@cf/meta/llama-4-scout-17b-16e-instruct"];
const PRO_MODELS = [...FREE_MODELS, "claude-sonnet-5-5", "claude-opus-5-5", "claude-fable-5-2", "@cf/zai-org/glm-5.3", "@cf/openai/gpt-oss-120b", "@cf/qwen/qwen3.8-27b", "@cf/mistralai/mistral-small-3.1-24b-instruct"];

// The first fill of the table (the proposal of 2026-11-14); the super admin changes any of it at any time
export const DEFAULT_PLANS = [
    {
        key: "free", name: "Free", tagline: "Classgrid AI for everyone", sort: 0,
        price_inr_monthly: 0, price_inr_yearly: 0, student_price_inr_monthly: 0, student_price_inr_yearly: 0,
        tokens_per_window: 100000, window_reset_value: 5, window_reset_unit: "hour", tokens_per_week: 400000,
        chats_per_window: 40, chats_per_week: 150,
        claude_credits_per_week: 0, fable_share_percent: 0,
        models_allowed: FREE_MODELS, default_model: "auto", thinking_modes: ["fast", "normal"], context_tokens: 32000, helpers_per_chat: 1,
        images_per_period: 4, images_reset_value: 1, images_reset_unit: "week",
        voice_replies_per_day: 20, voice_input_minutes_per_day: 15,
        call_minutes_per_period: 30, call_reset_value: 1, call_reset_unit: "month", calls_per_day: 3, call_max_minutes: 5,
        whatsapp_per_day: 10, whatsapp_per_period: 100, whatsapp_reset_value: 1, whatsapp_reset_unit: "month",
        projects_max: 3, coding_runs_per_month: 30, premium_runs_per_month: 0, sandbox_hours_per_month: 3, sandbox_sessions: 1,
        uploads_per_window: 3, upload_max_mb: 10, library_storage_mb: 600, devices_max: 2,
        priority: false, support_level: "community",
        features_text: ["40 chats every 5 hours, no limit inside a chat", "Claude models: no", "4 images and photo edits a week", "20 voice replies a day", "30 free WhatsApp call minutes a month", "3 projects, unlimited on your own PC", "Grids, Schedule, Library, Calls, desktop and Android apps"],
    },
    {
        key: "pro", name: "Pro", tagline: "Claude, pictures, calls and projects for one person", sort: 1,
        price_inr_monthly: 499, price_inr_yearly: 3999, student_price_inr_monthly: 299, student_price_inr_yearly: 2499,
        tokens_per_window: 400000, window_reset_value: 5, window_reset_unit: "hour", tokens_per_week: 1500000,
        chats_per_window: 2000, chats_per_week: -1,
        claude_credits_per_week: 500000, fable_share_percent: 20,
        models_allowed: PRO_MODELS, default_model: "auto", thinking_modes: ["fast", "normal", "deep"], context_tokens: 128000, helpers_per_chat: 3,
        images_per_period: 100, images_reset_value: 1, images_reset_unit: "month",
        voice_replies_per_day: 150, voice_input_minutes_per_day: 120,
        call_minutes_per_period: 150, call_reset_value: 1, call_reset_unit: "month", calls_per_day: 10, call_max_minutes: 10,
        whatsapp_per_day: 100, whatsapp_per_period: 600, whatsapp_reset_value: 1, whatsapp_reset_unit: "month",
        projects_max: 25, coding_runs_per_month: 500, premium_runs_per_month: 30, sandbox_hours_per_month: 30, sandbox_sessions: 1,
        uploads_per_window: 50, upload_max_mb: 50, library_storage_mb: 5120, devices_max: 5,
        priority: false, support_level: "email",
        features_text: ["2,000 chats every 5 hours, no limit inside a chat", "Claude models: yes (Sonnet, Opus, and a share of Fable)", "100 images and photo edits a month", "150 free WhatsApp call minutes a month", "25 projects, 500 coding runs, 30 cloud sandbox hours", "Deep thinking, 128K context, 3 helpers per chat"],
    },
    {
        key: "max", name: "Max", tagline: "Five times Pro, with Claude Fable", sort: 2,
        price_inr_monthly: 1999, price_inr_yearly: 14999, student_price_inr_monthly: 1499, student_price_inr_yearly: 10999,
        tokens_per_window: 1000000, window_reset_value: 5, window_reset_unit: "hour", tokens_per_week: 4000000,
        chats_per_window: -1, chats_per_week: -1,
        claude_credits_per_week: 2500000, fable_share_percent: 50,
        models_allowed: PRO_MODELS, default_model: "auto", thinking_modes: ["fast", "normal", "deep"], context_tokens: 400000, helpers_per_chat: 5,
        images_per_period: 300, images_reset_value: 1, images_reset_unit: "month",
        voice_replies_per_day: 500, voice_input_minutes_per_day: 300,
        call_minutes_per_period: 400, call_reset_value: 1, call_reset_unit: "month", calls_per_day: 30, call_max_minutes: 15,
        whatsapp_per_day: 300, whatsapp_per_period: 2000, whatsapp_reset_value: 1, whatsapp_reset_unit: "month",
        projects_max: -1, coding_runs_per_month: 1500, premium_runs_per_month: 100, sandbox_hours_per_month: 100, sandbox_sessions: 2,
        uploads_per_window: 150, upload_max_mb: 200, library_storage_mb: 20480, devices_max: 10,
        priority: true, support_level: "priority email",
        features_text: ["Unlimited chats, no limit inside a chat", "Claude models: 5x the usage of Pro", "Claude Fable up to half of your weekly credits", "300 images and photo edits a month", "400 free WhatsApp call minutes a month, 15-minute calls", "Unlimited projects, 1,500 coding runs, 100 sandbox hours", "400K context, 5 helpers per chat, priority at peak"],
    },
    {
        key: "enterprise", name: "Enterprise", tagline: "Classgrid AI for schools, colleges and coaching institutes. Not an ERP.", sort: 3, coming_soon: true,
        price_inr_monthly: -1, price_inr_yearly: -1, student_price_inr_monthly: -1, student_price_inr_yearly: -1,
        tokens_per_window: 1000000, window_reset_value: 5, window_reset_unit: "hour", tokens_per_week: 3000000,
        chats_per_window: 1000, chats_per_week: 6000,
        claude_credits_per_week: 2000000, fable_share_percent: 100,
        models_allowed: PRO_MODELS, default_model: "auto", thinking_modes: ["fast", "normal", "deep"], context_tokens: 200000, helpers_per_chat: 5,
        images_per_period: 60, images_reset_value: 1, images_reset_unit: "month",
        voice_replies_per_day: 150, voice_input_minutes_per_day: 120,
        call_minutes_per_period: 100, call_reset_value: 1, call_reset_unit: "month", calls_per_day: 50, call_max_minutes: 15,
        whatsapp_per_day: 100, whatsapp_per_period: 5000, whatsapp_reset_value: 1, whatsapp_reset_unit: "month",
        projects_max: -1, coding_runs_per_month: 300, premium_runs_per_month: 15, sandbox_hours_per_month: 25, sandbox_sessions: 1,
        uploads_per_window: 150, upload_max_mb: 200, library_storage_mb: 5120, devices_max: 10,
        priority: true, support_level: "named contact",
        features_text: ["Classgrid AI for every student and teacher, not an ERP", "Priced per seat, billed yearly, from 50 seats", "One shared AI credit pool for the whole institution", "Admin controls, roles, branding and SSO", "A named contact and a 45-day free pilot"],
    },
];

const PlanConfig = mongoose.models.PlanConfig || mongoose.model("PlanConfig", planConfigSchema);

/** Makes sure every plan has its row (a missing one gets the first fill above; existing rows are never changed) */
export async function ensurePlanRows() {
    for (const plan of DEFAULT_PLANS) {
        await PlanConfig.updateOne({ key: plan.key }, { $setOnInsert: plan }, { upsert: true });
    }
}

export default PlanConfig;
