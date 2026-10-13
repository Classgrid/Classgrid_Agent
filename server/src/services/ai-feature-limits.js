// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
// Limits for the AI's extra features (WhatsApp messages, image generations), resolved the same way
// as the free token limit (resolveWeeklyLimit): global limit -> the org's own limit when the org has custom
// limits on, or the Classgrid limit for users without an org. The super admin dashboard shows this same
// value, so what the dashboard says is what the chat enforces.
import redis from "../config/redis.js";
import { CHAT_PUBLIC_ORG_ID } from "../utils/chat-onboarding.js";

const FIELDS = {
    whatsapp: { global: "global_whatsapp_scheduling_limit", org: "whatsapp_scheduling_limit", classgrid: "classgrid_whatsapp_scheduling_limit", fallback: 10 },
    image: { global: "global_image_weekly_limit", org: "image_generation_limit", classgrid: "classgrid_image_weekly_limit", fallback: 20 },
};

const isSet = (v) => v !== undefined && v !== null;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function resolveFeatureLimit(feature, org, globalConfig, orgId = org?._id) {
    const f = FIELDS[feature];
    let limit = isSet(globalConfig?.[f.global]) ? globalConfig[f.global] : f.fallback;
    const classgridLimit = globalConfig?.classgrid_custom_limits_enabled && isSet(globalConfig[f.classgrid]) ? globalConfig[f.classgrid] : null;
    // chat.classgrid.in accounts live in the public chat organization: unless that org has its own custom
    // limits, the Classgrid limit set by the super admin applies to them too (same as users without an org)
    const isPublicChatOrg = String(orgId || org?._id || "") === CHAT_PUBLIC_ORG_ID;
    if (org && org.ai_config?.custom_limits_enabled && isSet(org.ai_config[f.org])) {
        limit = org.ai_config[f.org];
    } else if ((!orgId || isPublicChatOrg) && classgridLimit !== null) {
        limit = classgridLimit;
    }
    return limit;
}

// --- Reset periods ---------------------------------------------------------------------------------------
// How often each limit starts again (chat tokens, images, WhatsApp), set by the super admin as a number + unit
// next to the limit itself, at the same three levels: global -> the org's own (custom limits on) or Classgrid.
// Nothing set = 7 days, which is how all three worked before. A month counts as 30 days.
export const RESET_UNITS = { second: 1000, minute: 60 * 1000, hour: 60 * 60 * 1000, day: 24 * 60 * 60 * 1000, week: WEEK_MS, month: 30 * 24 * 60 * 60 * 1000 };
export const DEFAULT_RESET_PERIOD = { value: 7, unit: "day" };

// Stored as <prefix>_value + <prefix>_unit (e.g. ai_config.image_reset_value / ai_config.image_reset_unit).
// classgridForPublicOrg: the public chat org falls back to the Classgrid period exactly when its LIMIT does
// (resolveFeatureLimit does that for images/WhatsApp, resolveWeeklyLimit does not for tokens).
const PERIOD_FIELDS = {
    tokens: { global: "global_token_reset", org: "token_reset", classgrid: "classgrid_token_reset", classgridForPublicOrg: false },
    image: { global: "global_image_reset", org: "image_reset", classgrid: "classgrid_image_reset", classgridForPublicOrg: true },
    whatsapp: { global: "global_whatsapp_reset", org: "whatsapp_reset", classgrid: "classgrid_whatsapp_reset", classgridForPublicOrg: true },
};
export const RESET_PERIOD_FEATURES = Object.keys(PERIOD_FIELDS);

/** A whole number 1..1000 and one of the RESET_UNITS. */
export function isValidResetPeriod(value, unit) {
    return Number.isInteger(value) && value >= 1 && value <= 1000 && Object.prototype.hasOwnProperty.call(RESET_UNITS, unit);
}

const readPeriod = (src, prefix) => {
    const value = src?.[`${prefix}_value`];
    const unit = src?.[`${prefix}_unit`];
    return isValidResetPeriod(value, unit) ? { value, unit } : null;
};

/**
 * The reset period that applies to a feature ("tokens" | "image" | "whatsapp"), picked the same way as its
 * limit. Returns { value, unit, ms, label } with label like "every 2 hours".
 */
export function resolveResetPeriod(feature, org, globalConfig, orgId = org?._id) {
    const f = PERIOD_FIELDS[feature];
    let period = readPeriod(globalConfig, f.global) || DEFAULT_RESET_PERIOD;
    const classgridPeriod = globalConfig?.classgrid_custom_limits_enabled ? readPeriod(globalConfig, f.classgrid) : null;
    const orgPeriod = org?.ai_config?.custom_limits_enabled ? readPeriod(org.ai_config, f.org) : null;
    if (feature === "tokens") {
        // same branches as resolveWeeklyLimit (ai-credits.service.js)
        if (org) {
            if (orgPeriod) period = orgPeriod;
        } else if (!orgId && classgridPeriod) {
            period = classgridPeriod;
        }
    } else {
        // same branches as resolveFeatureLimit
        const isPublicChatOrg = f.classgridForPublicOrg && String(orgId || org?._id || "") === CHAT_PUBLIC_ORG_ID;
        if (org && orgPeriod) {
            period = orgPeriod;
        } else if ((!orgId || isPublicChatOrg) && classgridPeriod) {
            period = classgridPeriod;
        }
    }
    return { value: period.value, unit: period.unit, ms: period.value * RESET_UNITS[period.unit], label: formatResetPeriod(period) };
}

/** Length of one period in ms for a feature (7 days when nothing is set). */
export function resetPeriodMs(feature, org, globalConfig, orgId = org?._id) {
    return resolveResetPeriod(feature, org, globalConfig, orgId).ms;
}

/** "2 hours", "1 day" */
export function formatPeriodLength(period) {
    const p = period || DEFAULT_RESET_PERIOD;
    return `${p.value} ${p.unit}${p.value === 1 ? "" : "s"}`;
}

/** "every 2 hours", "every 1 day" */
export function formatResetPeriod(period) {
    return `every ${formatPeriodLength(period)}`;
}

/**
 * Reads { <feature>_reset_value, <feature>_reset_unit } style fields from a request body for the admin
 * endpoints. bodyPrefix "token_reset" -> body.token_reset_value / body.token_reset_unit. Returns
 * { set: { value, unit } | null, error: string | null }; both missing = nothing to change.
 */
export function parseResetPeriodInput(body, bodyPrefix) {
    const rawValue = body?.[`${bodyPrefix}_value`];
    const rawUnit = body?.[`${bodyPrefix}_unit`];
    if (rawValue === undefined && rawUnit === undefined) return { set: null, error: null };
    const value = typeof rawValue === "string" && rawValue.trim() !== "" ? Number(rawValue) : rawValue;
    if (!isValidResetPeriod(value, rawUnit)) {
        return { set: null, error: `${bodyPrefix}: value must be a whole number from 1 to 1000 and unit one of ${Object.keys(RESET_UNITS).join(", ")}.` };
    }
    return { set: { value, unit: rawUnit }, error: null };
}

const directSendKey = (userId) => `ai:wa-direct:${userId}`;

/**
 * WhatsApp messages a user has used in the last reset period (7 days unless the super admin set another):
 * one-time scheduled ones (not cancelled) + ones sent right away + each run of a repeating schedule (those are
 * recorded like direct sends when they go out). With { includeUpcomingRepeats: true } (when a new repeat is
 * created) the runs other active repeats will send in the next period count too, so several repeats can't
 * together go over the limit.
 * Returns { allowed, limit, used, periodMs, periodText } (periodText like "7 days", for messages).
 */
export async function checkWhatsappLimit(user, { includeUpcomingRepeats = false } = {}) {
    const [{ default: GlobalAiConfig }, { default: Organization }, { default: AiSchedule }] = await Promise.all([
        import("../models/GlobalAiConfig.js"),
        import("../models/Organization.js"),
        import("../models/AiSchedule.js"),
    ]);
    const globalConfig = await GlobalAiConfig.findOne({ key: "singleton" }).lean();
    const orgId = user.organization_id || null;
    const org = orgId ? await Organization.findById(orgId).select("ai_config").lean() : null;
    const limit = resolveFeatureLimit("whatsapp", org, globalConfig, orgId);
    const period = resolveResetPeriod("whatsapp", org, globalConfig, orgId);
    const periodMs = period.ms;

    // Only messages still waiting to go out or actually sent count; failed or undelivered ones don't.
    const since = new Date(Date.now() - periodMs);
    const scheduled = await AiSchedule.countDocuments({
        user_id: user._id,
        createdAt: { $gte: since },
        status: { $in: ["pending", "sent"] },
        repeat: { $nin: ["daily", "weekly", "custom"] },
        whatsapp_failed: { $ne: true },
        whatsapp_phone_number: { $exists: true, $ne: "" },
        whatsapp_message: { $exists: true, $ne: "" },
    });

    let upcoming = 0;
    if (includeUpcomingRepeats) {
        const { runsWithin } = await import("../utils/schedule-repeat.js");
        const repeats = await AiSchedule.find({
            user_id: user._id,
            status: "pending",
            repeat: { $in: ["daily", "weekly", "custom"] },
            whatsapp_phone_number: { $exists: true, $ne: "" },
            whatsapp_message: { $exists: true, $ne: "" },
        }).select("scheduled_at repeat repeat_days repeat_until repeat_tz").lean();
        for (const r of repeats) upcoming += runsWithin(r, new Date(r.scheduled_at), periodMs);
    }

    let direct = 0;
    try {
        const key = directSendKey(user._id);
        await redis.zremrangebyscore(key, 0, Date.now() - periodMs);
        direct = await redis.zcard(key);
        // A period longer than the key's 8-day expiry would forget sends too early: keep it a day past the period
        if (direct > 0 && periodMs > EIGHT_DAYS_S * 1000) await redis.expire(key, Math.ceil(periodMs / 1000) + 24 * 60 * 60);
    } catch (e) { /* Redis down: count only the scheduled ones */ }

    const used = scheduled + direct + upcoming;
    return { allowed: used < limit, limit, used, periodMs, periodText: formatPeriodLength(period) };
}

const messageOwnerKey = (messageId) => `ai:wa-msg:${messageId}`;
const EIGHT_DAYS_S = 8 * 24 * 60 * 60;

/**
 * Counts one WhatsApp message sent right away (not scheduled) toward the user's WhatsApp limit. With Meta's
 * message id, a later "failed" delivery report (handleWhatsappStatusUpdates) takes it off the count again.
 */
export async function recordDirectWhatsappSend(userId, messageId) {
    try {
        const key = directSendKey(userId);
        const now = Date.now();
        await redis.zadd(key, now, messageId ? `wamid:${messageId}` : `${now}-${Math.random().toString(36).slice(2, 8)}`);
        // never shorten a longer expiry set by checkWhatsappLimit for a reset period over 8 days
        if ((await redis.ttl(key)) < EIGHT_DAYS_S) await redis.expire(key, EIGHT_DAYS_S);
        if (messageId) await redis.set(messageOwnerKey(messageId), String(userId), "EX", EIGHT_DAYS_S);
    } catch (e) { /* Redis down: the send is not counted */ }
}

/** 10-digit Indian numbers get the 91 country code; spaces, dashes, "+" and a leading 0 are removed. */
export function normalizeWhatsappNumber(raw) {
    let digits = String(raw || "").replace(/\D/g, "");
    if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
    if (digits.length === 10) digits = `91${digits}`;
    return digits;
}

/** Meta webhook delivery reports: a message Meta accepted but then failed to deliver stops counting. */
export async function handleWhatsappStatusUpdates(statuses) {
    const failed = (statuses || []).filter((s) => s?.status === "failed" && s.id);
    if (failed.length === 0) return;
    const { default: AiSchedule } = await import("../models/AiSchedule.js");
    for (const s of failed) {
        try {
            const userId = await redis.get(messageOwnerKey(s.id));
            if (userId) await redis.zrem(directSendKey(userId), `wamid:${s.id}`);
        } catch (e) { /* Redis down: the direct send stays counted */ }
        await AiSchedule.updateOne(
            { whatsapp_message_id: s.id },
            { whatsapp_failed: true, error_message: `WhatsApp delivery failed: ${JSON.stringify(s.errors || []).slice(0, 300)}` },
        ).catch(() => {});
        console.warn(`[WhatsApp] Delivery failed for ${s.id} to ${s.recipient_id}: ${JSON.stringify(s.errors || [])}`);
    }
}
