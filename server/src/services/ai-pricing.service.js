// The live plans and top-up values, shaped once for everyone who shows them: GET /api/public/ai-pricing (the pricing
// page on classgrid.in, the model pickers' plan tags) and Classgrid AI's own get_plans_and_usage tool
// (plan-info-tools.js). Everything comes from the super admin settings (the plan table and GlobalAiConfig), resolved the
// same way the app resolves them for a chat.classgrid.in account. No user data. Kept for a minute.
import GlobalAiConfig from "../models/GlobalAiConfig.js";
import Organization from "../models/Organization.js";
import { resolveResetPeriod } from "./ai-feature-limits.js";
import { planAllowsModel, isFableModel } from "./model-access.service.js";
import { TOPUP_MIN_INR, TOPUP_MAX_INR } from "../controllers/ai-credits-topup.controller.js";
import { CHAT_PUBLIC_ORG_ID } from "../utils/chat-onboarding.js";
import { planTable } from "./plan-limits.service.js";

const AI_PRICING_CACHE_MS = 60 * 1000;
let aiPricingCache = null;

const positiveNumber = (value) => (typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null);

/** The pricing feed (the body of GET /api/public/ai-pricing) */
export async function aiPricingData() {
  if (!aiPricingCache || aiPricingCache.expiresAt <= Date.now()) {
    const [globalConfig, chatOrg, plansNow] = await Promise.all([
      GlobalAiConfig.findOne({ key: "singleton" }).lean(),
      Organization.findById(CHAT_PUBLIC_ORG_ID).select("ai_config").lean(),
      planTable().catch(() => ({ enabled: false, plans: {} })),
    ]);
    // The plans as the super admin set them (prices, taglines, pricing-page lines); only public ones.
    // buyUrlMonthly / buyUrlYearly: where a plan's button on classgrid.in/pricing sends the visitor. The chat
    // (chat.classgrid.in) keeps the wish through sign-in, opens the plans and starts the payment on
    // billing.classgrid.in. Free: the chat itself. Not buyable (coming soon, contact us): null.
    const chatApp = String(process.env.CHAT_APP_URL || "https://chat.classgrid.in").replace(/\/$/, "");
    const buyUrl = (p, term) => (!p.coming_soon && p.key !== "free" && Number(term === "year" ? p.price_inr_yearly : p.price_inr_monthly) > 0) ? `${chatApp}/agent?buy=${encodeURIComponent(p.key)}&term=${term}&back=pricing` : null;
    const publicPlans = Object.values(plansNow.plans || {}).filter((p) => p.is_public !== false).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    // How much usage a plan has, as a multiple of the first plan that has any (Free: 1). The feed is public, so it
    // carries these and never the credit numbers themselves (owner, 2026-11-21: "don't show how many credits; show it
    // like Claude does, 5x, 20x"): -1 = unlimited, 0 = not in the plan, null = not set.
    const usageX = (field) => {
      const base = publicPlans.map((p) => Number(p[field])).find((n) => Number.isFinite(n) && n > 0);
      return (p) => {
        const n = Number(p[field]);
        if (p[field] === undefined || p[field] === null || !Number.isFinite(n)) return null;
        if (n < 0) return -1;
        if (n === 0 || !base) return 0;
        return Math.round((n / base) * 100) / 100;
      };
    };
    const sessionX = usageX("tokens_per_window"), weeklyX = usageX("tokens_per_week"), claudeX = usageX("claude_credits_per_week");
    const plans = publicPlans.map((p) => ({
      key: p.key, name: p.name, tagline: p.tagline, comingSoon: !!p.coming_soon,
      buyUrlMonthly: buyUrl(p, "month"), buyUrlYearly: buyUrl(p, "year"), startUrl: p.key === "free" ? `${chatApp}/` : null,
      // The same at the student price (the chat asks the visitor to confirm a student email first if needed)
      studentBuyUrlMonthly: (!p.coming_soon && p.key !== "free" && Number(p.student_price_inr_monthly) > 0) ? `${chatApp}/agent?buy=${encodeURIComponent(p.key)}&term=month&student=1&back=pricing` : null,
      studentBuyUrlYearly: (!p.coming_soon && p.key !== "free" && Number(p.student_price_inr_yearly) > 0) ? `${chatApp}/agent?buy=${encodeURIComponent(p.key)}&term=year&student=1&back=pricing` : null,
      priceInrMonthly: p.price_inr_monthly, priceInrYearly: p.price_inr_yearly,
      studentPriceInrMonthly: p.student_price_inr_monthly, studentPriceInrYearly: p.student_price_inr_yearly,
      features: p.features_text || [],
      // The models the plan lets a person pick (empty = every model); the picker's plan tags come from modelPlans below
      modelsAllowed: Array.isArray(p.models_allowed) ? p.models_allowed : [],
      limits: { chatsPerWindow: p.chats_per_window, chatsPerWeek: p.chats_per_week, windowHours: p.window_reset_unit === "hour" ? p.window_reset_value : null, sessionUsageX: sessionX(p), weeklyUsageX: weeklyX(p), claudeUsageX: claudeX(p), fableSharePercent: p.fable_share_percent, contextTokens: p.context_tokens, helpersPerChat: p.helpers_per_chat, imagesPerPeriod: p.images_per_period, imagesPeriod: `${p.images_reset_value} ${p.images_reset_unit}`, voiceRepliesPerDay: p.voice_replies_per_day, voiceInputMinutesPerDay: p.voice_input_minutes_per_day, callMinutesPerPeriod: p.call_minutes_per_period, callsPerDay: p.calls_per_day, callMaxMinutes: p.call_max_minutes, callsPerWeek: p.calls_per_week, callsPerMonth: p.calls_per_month, callTasksPerCall: p.call_tasks_per_call, callTasksAtOnce: p.call_tasks_at_once, callTaskMaxMinutes: p.call_task_max_minutes, whatsappPerDay: p.whatsapp_per_day, projectsMax: p.projects_max, sandboxHoursPerMonth: p.sandbox_hours_per_month, uploadMaxMb: p.upload_max_mb, filesPerMessage: p.files_per_message, uploadsPerWindow: p.uploads_per_window, libraryStorageMb: p.library_storage_mb, devicesMax: p.devices_max, support: p.support_level },
    }));
    // For every model, the plans (in plan order) that include it, by the same rules POST /api/ai/ask uses
    // (ai-chat.controller.js): the plan's models_allowed (empty = all), a Claude model only when the plan's
    // weekly Claude credits are not 0, and Claude Fable only when the plan gives Fable a share. The model
    // pickers on the website, the desktop app and the phone draw their "Pro, Max or Ultra" tags from this.
    const pickable = Object.values(plansNow.plans || {}).filter((p) => p.is_public !== false && !p.coming_soon).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    const everyModel = [...new Set([...pickable.flatMap((p) => (Array.isArray(p.models_allowed) ? p.models_allowed : [])), "claude-fable-5-1", "claude-fable-5-2"])].filter((m) => m !== "auto");
    const modelPlans = {};
    for (const model of everyModel) {
      modelPlans[model] = pickable.filter((p) => {
        if (!planAllowsModel(p.models_allowed, model)) return false;
        if (/^claude-/.test(model) && Number(p.claude_credits_per_week) === 0) return false;
        if (isFableModel(model) && !(Number(p.fable_share_percent) > 0)) return false;
        return true;
      }).map((p) => ({ key: p.key, name: p.name }));
    }
    const config = globalConfig || {};
    const org = chatOrg || null;
    const tokens = resolveResetPeriod("tokens", org, config, CHAT_PUBLIC_ORG_ID);
    const image = resolveResetPeriod("image", org, config, CHAT_PUBLIC_ORG_ID);
    const whatsapp = resolveResetPeriod("whatsapp", org, config, CHAT_PUBLIC_ORG_ID);

    aiPricingCache = {
      expiresAt: Date.now() + AI_PRICING_CACHE_MS,
      // Free limit amounts (tokens, images, WhatsApp, image token cost) stay private: only how often they reset
      data: {
        freeRefill: { value: tokens.value, unit: tokens.unit },
        imageRefill: { value: image.value, unit: image.unit },
        whatsappRefill: { value: whatsapp.value, unit: whatsapp.unit },
        creditsPerInr: positiveNumber(config.credits_per_inr),
        topupMinInr: TOPUP_MIN_INR,
        topupMaxInr: TOPUP_MAX_INR,
        creditValidityDays: 30,
        plansEnabled: plansNow.enabled === true,
        plans,
        modelPlans,
        updatedAt: new Date(config.updatedAt || Date.now()).toISOString(),
      },
    };
  }
  return aiPricingCache.data;
}
