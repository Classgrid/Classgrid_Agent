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

export const RESET_UNITS = { second: 1000, minute: 60 * 1000, hour: 60 * 60 * 1000, day: 24 * 60 * 60 * 1000, week: WEEK_MS, month: 30 * 24 * 60 * 60 * 1000 };
export const DEFAULT_RESET_PERIOD = { value: 7, unit: "day" };

const PERIOD_FIELDS = {
    tokens: { global: "global_token_reset", org: "token_reset", classgrid: "classgrid_token_reset", classgridForPublicOrg: false },
    image: { global: "global_image_reset", org: "image_reset", classgrid: "classgrid_image_reset", classgridForPublicOrg: true },
    whatsapp: { global: "global_whatsapp_reset", org: "whatsapp_reset", classgrid: "classgrid_whatsapp_reset", classgridForPublicOrg: true },
};
export const RESET_PERIOD_FEATURES = Object.keys(PERIOD_FIELDS);

export const MAX_RESET_PERIOD_MS = 366 * 24 * 60 * 60 * 1000;

export function isValidResetPeriod(value, unit) {
    return Number.isInteger(value) && value >= 1 && Object.prototype.hasOwnProperty.call(RESET_UNITS, unit)
        && value * RESET_UNITS[unit] <= MAX_RESET_PERIOD_MS;
}

const readPeriod = (src, prefix) => {
    const value = src?.[`${prefix}_value`];
    const unit = src?.[`${prefix}_unit`];
    return isValidResetPeriod(value, unit) ? { value, unit } : null;
};

export function resolveResetPeriod(feature, org, globalConfig, orgId = org?._id) {
    const f = PERIOD_FIELDS[feature];
    let period = readPeriod(globalConfig, f.global) || DEFAULT_RESET_PERIOD;
    const classgridPeriod = globalConfig?.classgrid_custom_limits_enabled ? readPeriod(globalConfig, f.classgrid) : null;
    const orgPeriod = org?.ai_config?.custom_limits_enabled ? readPeriod(org.ai_config, f.org) : null;
    if (feature === "tokens") {
        if (org) {
            if (orgPeriod) period = orgPeriod;
        } else if (!orgId && classgridPeriod) {
            period = classgridPeriod;
        }
    } else {
        const isPublicChatOrg = f.classgridForPublicOrg && String(orgId || org?._id || "") === CHAT_PUBLIC_ORG_ID;
        if (org && orgPeriod) {
            period = orgPeriod;
        } else if ((!orgId || isPublicChatOrg) && classgridPeriod) {
            period = classgridPeriod;
        }
    }
    return { value: period.value, unit: period.unit, ms: period.value * RESET_UNITS[period.unit], label: formatResetPeriod(period) };
}

export function resetPeriodMs(feature, org, globalConfig, orgId = org?._id) {
    return resolveResetPeriod(feature, org, globalConfig, orgId).ms;
}

export function formatPeriodLength(period) {
    const p = period || DEFAULT_RESET_PERIOD;
    if (p.unit === "week" || p.unit === "month") return `${p.value} ${p.unit}${p.value === 1 ? "" : "s"}`;
    let seconds = Math.round((p.value * RESET_UNITS[p.unit]) / 1000);
    const parts = [];
    for (const [name, size] of [["day", 86400], ["hour", 3600], ["minute", 60], ["second", 1]]) {
        const n = Math.floor(seconds / size);
        seconds -= n * size;
        if (n > 0) parts.push(`${n} ${name}${n === 1 ? "" : "s"}`);
    }
    return parts.join(" ") || `${p.value} ${p.unit}${p.value === 1 ? "" : "s"}`;
}

export function formatResetTime(date) {
    const at = new Date(date);
    const msLeft = Math.max(0, at.getTime() - Date.now());
    const minutes = Math.ceil(msLeft / 60000);
    const left = minutes < 1 ? "in less than a minute" : `in ${formatPeriodLength({ value: minutes, unit: "minute" })}`;
    const clock = at.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", day: "numeric", month: "short" });
    return `${left} (at ${clock} IST)`;
}

export function formatResetPeriod(period) {
    return `every ${formatPeriodLength(period)}`;
}

export function parseResetPeriodInput(body, bodyPrefix) {
    const rawValue = body?.[`${bodyPrefix}_value`];
    const rawUnit = body?.[`${bodyPrefix}_unit`];
    if (rawValue === undefined && rawUnit === undefined) return { set: null, error: null };
    const value = typeof rawValue === "string" && rawValue.trim() !== "" ? Number(rawValue) : rawValue;
    if (!isValidResetPeriod(value, rawUnit)) {
        return { set: null, error: `${bodyPrefix}: value must be a whole number of at least 1, unit one of ${Object.keys(RESET_UNITS).join(", ")}, and the total at most 366 days.` };
    }
    return { set: { value, unit: rawUnit }, error: null };
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
        if (direct > 0 && periodMs > EIGHT_DAYS_S * 1000) await redis.expire(key, Math.ceil(periodMs / 1000) + 24 * 60 * 60);
    } catch (e) { /* Redis down: count only the scheduled ones */ }

    const used = scheduled + direct + upcoming;
    const allowed = used < limit;

    let resetText = null;
    let resetAt = null;
    if (used > 0) {
        let oldestMs = Infinity;
        const oldestScheduled = await AiSchedule.findOne({
            user_id: user._id,
            createdAt: { $gte: since },
            status: { $in: ["pending", "sent"] },
            repeat: { $nin: ["daily", "weekly", "custom"] },
            whatsapp_failed: { $ne: true },
            whatsapp_phone_number: { $exists: true, $ne: "" },
            whatsapp_message: { $exists: true, $ne: "" },
        }).sort({ createdAt: 1 }).select("createdAt").lean().catch(() => null);
        if (oldestScheduled?.createdAt) oldestMs = new Date(oldestScheduled.createdAt).getTime();
        try {
            const first = await redis.zrange(directSendKey(user._id), 0, 0, "WITHSCORES");
            if (first?.length === 2) oldestMs = Math.min(oldestMs, Number(first[1]));
        } catch (e) { }
        resetAt = new Date(Number.isFinite(oldestMs) ? oldestMs + periodMs : Date.now() + periodMs);
        if (!allowed) resetText = formatResetTime(resetAt);
    }
    return { allowed, limit, used, periodMs, periodText: formatPeriodLength(period), resetText, resetAt };
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

/** Markdown from the AI → WhatsApp formatting (*bold*, _italic_, ~strike~, plain links). Simple regexes only. */
export function toWhatsappText(text) {
    return String(text || "")
        .replace(/!\[([^\]\n]*)\]\(([^)\s]+)\)/g, (_, alt, url) => (alt ? `${alt}: ${url}` : url))
        .replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (_, label, url) => (label === url ? url : `${label}: ${url}`))
        .replace(/\*\*([^*\n]+)\*\*/g, "*$1*")
        .replace(/__([^_\n]+)__/g, "*$1*")
        .replace(/~~([^~\n]+)~~/g, "~$1~")
        .replace(/^#{1,6}[ \t]+(.+)$/gm, "*$1*");
}

/** WhatsApp text messages can be at most 4096 characters: split at paragraph breaks (then lines, then hard). */
export function splitWhatsappText(text, max = 4000) {
    const parts = [];
    let rest = String(text || "");
    while (rest.length > max) {
        let cut = rest.lastIndexOf("\n\n", max);
        if (cut < max / 2) cut = rest.lastIndexOf("\n", max);
        if (cut < max / 2) cut = max;
        parts.push(rest.slice(0, cut).trimEnd());
        rest = rest.slice(cut).trimStart();
    }
    if (rest) parts.push(rest);
    return parts;
}

/** The AI's private thinking is never sent to the user: <think>/<thinking> blocks, an opening tag that was never
 *  closed (cut to the end) and a closing tag with no opening tag (everything before it is cut). */
export function stripThinking(text) {
    let t = String(text || "").replace(/<(thinking|think)>[\s\S]*?<\/\1>/gi, "");
    t = t.replace(/<(thinking|think)>[\s\S]*$/i, "");
    const close = t.search(/<\/(thinking|think)>/i);
    if (close !== -1) t = t.slice(t.indexOf(">", close) + 1);
    return t.trim();
}
