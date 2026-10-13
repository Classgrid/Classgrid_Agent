// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
// Weekly limits for the AI's extra features (WhatsApp messages, image generations), resolved the same way
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

const directSendKey = (userId) => `ai:wa-direct:${userId}`;

/**
 * WhatsApp messages a user has used in the last 7 days: one-time scheduled ones (not cancelled) + ones sent
 * right away + each run of a repeating schedule (those are recorded like direct sends when they go out).
 * With { includeUpcomingRepeats: true } (when a new repeat is created) the runs other active repeats will send
 * in the next 7 days count too, so several repeats can't together go over the limit.
 * Returns { allowed, limit, used }.
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

    // Only messages still waiting to go out or actually sent count; failed or undelivered ones don't.
    const since = new Date(Date.now() - WEEK_MS);
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
        for (const r of repeats) upcoming += runsWithin(r, new Date(r.scheduled_at), WEEK_MS);
    }

    let direct = 0;
    try {
        const key = directSendKey(user._id);
        await redis.zremrangebyscore(key, 0, Date.now() - WEEK_MS);
        direct = await redis.zcard(key);
    } catch (e) { /* Redis down: count only the scheduled ones */ }

    const used = scheduled + direct + upcoming;
    return { allowed: used < limit, limit, used };
}

const messageOwnerKey = (messageId) => `ai:wa-msg:${messageId}`;
const EIGHT_DAYS_S = 8 * 24 * 60 * 60;

/**
 * Counts one WhatsApp message sent right away (not scheduled) toward the user's weekly limit. With Meta's
 * message id, a later "failed" delivery report (handleWhatsappStatusUpdates) takes it off the count again.
 */
export async function recordDirectWhatsappSend(userId, messageId) {
    try {
        const key = directSendKey(userId);
        const now = Date.now();
        await redis.zadd(key, now, messageId ? `wamid:${messageId}` : `${now}-${Math.random().toString(36).slice(2, 8)}`);
        await redis.expire(key, EIGHT_DAYS_S);
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
