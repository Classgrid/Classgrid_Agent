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
// Weekly limits for the AI's extra features (WhatsApp messages, image generations), resolved the same way
// as the free token limit (resolveWeeklyLimit): global limit -> the org's own limit when the org has custom
// limits on, or the Classgrid limit for users without an org. The super admin dashboard shows this same
// value, so what the dashboard says is what the chat enforces.
import redis from "../config/redis.js";
import { CHAT_PUBLIC_ORG_ID } from "../utils/chat-onboarding.js";

const FIELDS = {
    whatsapp: { global: "global_whatsapp_scheduling_limit", org: "whatsapp_scheduling_limit", classgrid: "classgrid_whatsapp_scheduling_limit", fallback: 10 },
    image: { global: "global_image_weekly_limit", org: "image_generation_limit", classgrid: "classgrid_image_weekly_limit", fallback: 20 },
    // Free WhatsApp call minutes (owner, 2026-11-14): within them a call costs the user no tokens; past them a call
    // is charged per turn like the chat, and a user with no tokens is cut off when the free minutes end
    calls: { global: "global_call_minutes_limit", org: "call_minutes_limit", classgrid: "classgrid_call_minutes_limit", fallback: 150 },
};

const isSet = (v) => v !== undefined && v !== null;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// The plan's own field for each feature (plans on: services/plan-limits.service.js gives the plan row)
const PLAN_LIMIT_FIELDS = { image: "images_per_period", whatsapp: "whatsapp_per_period", calls: "call_minutes_per_period" };
const PLAN_PERIOD_FIELDS = { image: "images_reset", whatsapp: "whatsapp_reset", calls: "call_reset" };

export function resolveFeatureLimit(feature, org, globalConfig, orgId = org?._id, plan = null) {
    // With plans on, the plan's number (a super admin's per-org custom limit still wins; -1 = unlimited)
    if (plan && PLAN_LIMIT_FIELDS[feature]) { // (plans on: the plan's number, never an org's old custom limit)
        const v = Number(plan[PLAN_LIMIT_FIELDS[feature]]);
        return v === -1 ? Infinity : (Number.isFinite(v) ? v : 0);
    }
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
    calls: { global: "global_call_reset", org: "call_reset", classgrid: "classgrid_call_reset", classgridForPublicOrg: true },
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

export function resolveResetPeriod(feature, org, globalConfig, orgId = org?._id, plan = null) {
    if (plan && PLAN_PERIOD_FIELDS[feature]) {
        const pp = readPeriod(plan, PLAN_PERIOD_FIELDS[feature]);
        if (pp) return { value: pp.value, unit: pp.unit, ms: pp.value * RESET_UNITS[pp.unit], label: formatResetPeriod(pp) };
    }
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
export async function checkWhatsappLimit(user, { includeUpcomingRepeats = false, readOnly = false } = {}) {
    const [{ default: GlobalAiConfig }, { default: Organization }, { default: AiSchedule }, { default: WhatsappDirectSend }] = await Promise.all([
        import("../models/GlobalAiConfig.js"),
        import("../models/Organization.js"),
        import("../models/AiSchedule.js"),
        import("../models/WhatsappDirectSend.js"),
    ]);
    const globalConfig = await GlobalAiConfig.findOne({ key: "singleton" }).lean();
    const orgId = user.organization_id || null;
    const org = orgId ? await Organization.findById(orgId).select("ai_config").lean() : null;
    const { planOf } = await import("./plan-limits.service.js");
    const plan = await planOf(user);
    const limit = resolveFeatureLimit("whatsapp", org, globalConfig, orgId, plan);
    const period = resolveResetPeriod("whatsapp", org, globalConfig, orgId, plan);
    const periodMs = period.ms;
    // The plan's per-day limit as well (plans on; -1 = none)
    const dayLimit = plan && Number(plan.whatsapp_per_day) >= 0 ? Number(plan.whatsapp_per_day) : null;

    // Only messages still waiting to go out or actually sent count; failed or undelivered ones don't.
    const since = new Date(Date.now() - periodMs);
    // A schedule whose messages are kept as their own rows (it was sent and then set to go out again, or deleted:
    // keepSentWhatsappCounted and countWhatsappResend below) is not counted a second time by its schedule row
    const kept = await keptScheduleIds(user._id);
    const notKept = kept.length ? { _id: { $nin: kept } } : {};
    const scheduled = await AiSchedule.countDocuments({
        user_id: user._id,
        createdAt: { $gte: since },
        status: { $in: ["pending", "sent"] },
        repeat: { $nin: ["daily", "weekly", "custom"] },
        whatsapp_failed: { $ne: true },
        whatsapp_phone_number: { $exists: true, $ne: "" },
        whatsapp_message: { $exists: true, $ne: "" },
        ...notKept,
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
    } catch (e) { /* Redis down: the database's count below */ }
    // The database keeps every direct send too (models/WhatsappDirectSend.js, since 2026-11-21): with Redis away, or
    // after it lost its data, the count is still whole. The larger of the two counts, so sends from before that day,
    // which only Redis has, still count.
    direct = Math.max(direct, await WhatsappDirectSend.countDocuments({ userId: user._id, at: { $gte: since } }).catch(() => 0));

    let used = scheduled + direct + upcoming;
    let allowed = used < limit;
    let shownLimit = limit;
    if (allowed && dayLimit !== null) {
        const daySince = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const dayScheduled = await AiSchedule.countDocuments({
            user_id: user._id, createdAt: { $gte: daySince }, status: { $in: ["pending", "sent"] },
            repeat: { $nin: ["daily", "weekly", "custom"] }, whatsapp_failed: { $ne: true },
            whatsapp_phone_number: { $exists: true, $ne: "" }, whatsapp_message: { $exists: true, $ne: "" },
            ...notKept,
        });
        let dayDirect = 0;
        try { dayDirect = await redis.zcount(directSendKey(user._id), Date.now() - 24 * 60 * 60 * 1000, "+inf"); } catch (e) { /* Redis down: the database's count below */ }
        dayDirect = Math.max(dayDirect, await WhatsappDirectSend.countDocuments({ userId: user._id, at: { $gte: daySince } }).catch(() => 0));
        if (dayScheduled + dayDirect >= dayLimit) { allowed = false; used = dayScheduled + dayDirect; shownLimit = dayLimit; }
    }

    // Past the number: a single message (not a repeat) is paid from top-up credits (extra-usage.service.js); the
    // credits are taken here, right before the send or the schedule row is made
    let extraCredits = 0;
    let extraOffer = "";
    if (!allowed) {
        const { canPayExtra, chargeExtra, extraOfferText } = await import("./extra-usage.service.js");
        const extra = await canPayExtra(user, "whatsapp");
        if (extra.allowed && !includeUpcomingRepeats && !readOnly) {
            extraCredits = await chargeExtra(user, "whatsapp", 1, extra.price);
            allowed = true;
        } else {
            extraOffer = extraOfferText("whatsapp", extra.price, plan?.key);
        }
    }

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
            ...notKept,
        }).sort({ createdAt: 1 }).select("createdAt").lean().catch(() => null);
        if (oldestScheduled?.createdAt) oldestMs = new Date(oldestScheduled.createdAt).getTime();
        try {
            const first = await redis.zrange(directSendKey(user._id), 0, 0, "WITHSCORES");
            if (first?.length === 2) oldestMs = Math.min(oldestMs, Number(first[1]));
        } catch (e) { }
        const oldestDirect = await WhatsappDirectSend.findOne({ userId: user._id, at: { $gte: since } }).sort({ at: 1 }).select("at").lean().catch(() => null);
        if (oldestDirect?.at) oldestMs = Math.min(oldestMs, new Date(oldestDirect.at).getTime());
        resetAt = new Date(Number.isFinite(oldestMs) ? oldestMs + periodMs : Date.now() + periodMs);
        if (!allowed) resetText = formatResetTime(resetAt);
    }
    return { allowed, limit: shownLimit, used, periodMs, periodText: shownLimit === limit ? formatPeriodLength(period) : "24 hours", resetText, resetAt, extraCredits, extraOffer };
}

const messageOwnerKey = (messageId) => `ai:wa-msg:${messageId}`;
const EIGHT_DAYS_S = 8 * 24 * 60 * 60;
const DIRECT_SEND_KEEP_MS = 370 * 24 * 60 * 60 * 1000; // (a limit's reset period can be up to 366 days)

/**
 * Counts one WhatsApp message sent right away (not scheduled) toward the user's weekly limit. With Meta's
 * message id, a later "failed" delivery report (handleWhatsappStatusUpdates) takes it off the count again.
 */
export async function recordDirectWhatsappSend(userId, messageId) {
    const now = Date.now();
    const ref = messageId ? `wamid:${messageId}` : `${now}-${Math.random().toString(36).slice(2, 8)}`;
    // The database first: its row is what still counts the send when Redis is away or lost its data
    try {
        const { default: WhatsappDirectSend } = await import("../models/WhatsappDirectSend.js");
        await WhatsappDirectSend.create({ userId, ref, at: new Date(now), expiresAt: new Date(now + DIRECT_SEND_KEEP_MS) });
    } catch (e) {
        if (e?.code !== 11000) console.error("[WhatsApp] a direct send could not be counted in the database:", e.message);
    }
    try {
        const key = directSendKey(userId);
        await redis.zadd(key, now, ref);
        if ((await redis.ttl(key)) < EIGHT_DAYS_S) await redis.expire(key, EIGHT_DAYS_S);
        if (messageId) await redis.set(messageOwnerKey(messageId), String(userId), "EX", EIGHT_DAYS_S);
    } catch (e) { /* Redis down: the database's row counts the send */ }
}

// ── One-time WhatsApp schedules that are sent again, or deleted after they went out (2026-11-21, owner: "fix all") ──
// A one-time schedule is counted by its own schedule row, for one period from the day it was made. Two holes:
//   1. A schedule that had already gone out could be given a new time. It went back to "pending" and the worker sent
//      the same message again, but it was still one counted row (and none at all once the row was older than the
//      period). One schedule could send any number of messages.
//   2. Deleting a schedule after it went out removed its row, so the sent message dropped out of the count.
// Now: the moment such a schedule is deleted or set to go out again, its messages are written down as rows of their
// own in WhatsappDirectSend (the rows a message sent right away gets, with a copy in the Redis list), and from then on
// the schedule row itself is not counted (keptScheduleIds), so no message is counted twice. The rows:
//   "sched:<schedule id>:<sent time>"  a message that went out. The first message of a schedule keeps the date the
//                                      count already used for it, the day the schedule was made, so keeping it
//                                      changes nothing for the person. A later one keeps the date it was booked.
//   "sched:<schedule id>:now"          the message booked to go out again, dated the moment it was booked (the way a
//                                      new schedule counts from the day it is made, not from the day it goes out).
// A message that fails stops counting, as every failed message does (keptScheduleIds, handleWhatsappStatusUpdates).
const sentRef = (scheduleId, sentMs) => `sched:${scheduleId}:${sentMs}`;
const bookedRef = (scheduleId) => `sched:${scheduleId}:now`;
const timeOf = (date) => { const t = date ? new Date(date).getTime() : NaN; return Number.isFinite(t) ? t : null; };

/** A schedule that sends one WhatsApp message, one time (each run of a repeat is counted when it goes out) */
export function sendsOneTimeWhatsapp(schedule) {
    return !!(schedule && schedule.whatsapp_phone_number && schedule.whatsapp_message)
        && !["daily", "weekly", "custom"].includes(schedule.repeat);
}

// One kept row, in the database and in Redis' list. False when the row was already there (the same message asked
// for twice). A database error is thrown: the caller must not go on as if the message was counted.
async function addKeptRow(userId, ref, at) {
    const { default: WhatsappDirectSend } = await import("../models/WhatsappDirectSend.js");
    try {
        await WhatsappDirectSend.create({ userId, ref, at, expiresAt: new Date(Date.now() + DIRECT_SEND_KEEP_MS) });
    } catch (e) {
        if (e?.code === 11000) return false;
        throw e;
    }
    try {
        const key = directSendKey(userId);
        await redis.zadd(key, at.getTime(), ref);
        if ((await redis.ttl(key)) < EIGHT_DAYS_S) await redis.expire(key, EIGHT_DAYS_S);
    } catch (e) { /* Redis down: the database's row counts the message */ }
    return true;
}

// Takes one kept row off the count (database and Redis). False when there was no such row.
async function removeKeptRow(ref) {
    const { default: WhatsappDirectSend } = await import("../models/WhatsappDirectSend.js");
    const row = await WhatsappDirectSend.findOneAndDelete({ ref }).lean();
    if (!row) return false;
    try { await redis.zrem(directSendKey(row.userId), ref); } catch (e) { /* Redis down: its copy leaves by age */ }
    return true;
}

// The booked message went out: its row keeps its date and gets the name of a sent message
async function renameKeptRow(userId, from, to) {
    const { default: WhatsappDirectSend } = await import("../models/WhatsappDirectSend.js");
    try {
        await WhatsappDirectSend.updateOne({ ref: from }, { $set: { ref: to } });
    } catch (e) {
        if (e?.code !== 11000) throw e;
        await removeKeptRow(from); // (the sent message already has its row: the booked one was the same message)
        return;
    }
    try {
        const key = directSendKey(userId);
        const score = await redis.zscore(key, from);
        if (score !== null && score !== undefined) {
            await redis.zadd(key, Number(score), to);
            await redis.zrem(key, from);
        }
    } catch (e) { /* Redis down: the database's row counts the message */ }
}

// The ids of the person's schedules whose messages are kept as rows of their own: checkWhatsappLimit leaves their
// schedule rows out. Also here: a schedule whose booked message went out and failed (the worker, or Meta's delivery
// report, marked the schedule) loses that message's row, so the failed message is not counted.
async function keptScheduleIds(userId) {
    let rows = [];
    try {
        const { default: WhatsappDirectSend } = await import("../models/WhatsappDirectSend.js");
        rows = await WhatsappDirectSend.find({ userId, ref: /^sched:/ }).select("ref").lean();
    } catch (e) { return []; } // (the direct count can't be read either then; nothing is counted twice)
    const ids = new Set();
    const booked = [];
    for (const row of rows || []) {
        const m = /^sched:([a-f0-9]{24}):(.+)$/i.exec(String(row?.ref || ""));
        if (!m) continue;
        ids.add(m[1]);
        if (m[2] === "now") booked.push(m[1]);
    }
    if (booked.length > 0) {
        try {
            const { default: AiSchedule } = await import("../models/AiSchedule.js");
            const failed = await AiSchedule.find({ _id: { $in: booked }, status: "sent", whatsapp_failed: true }).select("_id").lean();
            for (const f of failed || []) await removeKeptRow(bookedRef(f._id));
        } catch (e) { /* the row stays counted until the next check */ }
    }
    return [...ids];
}

// (userId: the person the rows are counted for; a schedule row with no owner id was never counted itself)
async function keepSent(schedule, userId) {
    if (!schedule?._id || !userId || !sendsOneTimeWhatsapp(schedule)) return false;
    if (schedule.status !== "sent" || schedule.whatsapp_failed === true) return false;
    const id = String(schedule._id);
    if (!/^[a-f0-9]{24}$/i.test(id)) return false;
    const { default: WhatsappDirectSend } = await import("../models/WhatsappDirectSend.js");
    const madeMs = timeOf(schedule.createdAt);
    const sentMs = timeOf(schedule.sent_at) ?? timeOf(schedule.updatedAt) ?? madeMs ?? Date.now();
    const rows = await WhatsappDirectSend.find({ userId, ref: new RegExp(`^sched:${id}:`) }).select("ref").lean();
    const refs = new Set((rows || []).map((r) => r.ref));
    const ref = sentRef(id, sentMs);
    if (refs.has(ref)) return false; // this message is already kept
    if (refs.has(bookedRef(id))) {
        // It went out as a booked re-send and was counted from the moment it was booked
        await renameKeptRow(userId, bookedRef(id), ref);
        return true;
    }
    if (!schedule.user_id) return false;
    // Its first message: until now the schedule row counted it, from the day the schedule was made
    return addKeptRow(userId, ref, new Date(refs.size === 0 && madeMs !== null ? madeMs : sentMs));
}

/**
 * Keeps the WhatsApp message a one-time schedule already sent in the person's count, whatever happens to the
 * schedule next. Call it before the schedule is deleted (countWhatsappResend calls it before a schedule goes out
 * again). Nothing is added for a schedule that never went out, one whose WhatsApp failed, one with no WhatsApp
 * message, or a repeat (each of its runs is recorded when it goes out). Asking twice for the same message adds one
 * row. Returns true when a row was written.
 */
export async function keepSentWhatsappCounted(schedule) {
    return keepSent(schedule, schedule?.user_id);
}

/**
 * A one-time WhatsApp schedule that is not waiting any more (it went out, or its WhatsApp failed) is about to be set
 * back to "pending", so the worker will send its message again. That is one more message: it is checked against the
 * person's limit the way a new schedule is (past the number it is paid from credits, or refused), the message that
 * went out before stays counted, and the new one is counted from this moment.
 * Returns null when there is nothing to count (no WhatsApp message, a repeat, or still pending), else what
 * checkWhatsappLimit gave: with `allowed` false nothing was counted and the caller must not change the schedule.
 * When allowed, the schedule's whatsapp_failed mark is cleared for the caller to save with the new time (the worker
 * never clears it on a one-time schedule, and it has to tell whether the message going out now failed).
 */
export async function countWhatsappResend(schedule, user) {
    if (!schedule?._id || !user?._id || !sendsOneTimeWhatsapp(schedule) || schedule.status === "pending") return null;
    const wa = await checkWhatsappLimit(user);
    if (!wa.allowed) return wa;
    const userId = schedule.user_id || user._id;
    if (schedule.status === "sent" && schedule.whatsapp_failed !== true) await keepSent(schedule, userId);
    else await removeKeptRow(bookedRef(schedule._id)); // (its last message failed: nothing of that one stays counted)
    await addKeptRow(userId, bookedRef(schedule._id), new Date());
    schedule.whatsapp_failed = false;
    return wa;
}

/**
 * Gives back the place of a message countWhatsappResend booked that will not go out: its schedule was deleted while
 * still waiting, or the new time could not be saved. The messages the schedule sent before stay counted.
 */
export async function freeWhatsappResend(schedule) {
    if (!schedule?._id || !sendsOneTimeWhatsapp(schedule)) return false;
    return removeKeptRow(bookedRef(schedule._id));
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
    const { default: WhatsappDirectSend } = await import("../models/WhatsappDirectSend.js");
    for (const s of failed) {
        try {
            const userId = await redis.get(messageOwnerKey(s.id));
            if (userId) await redis.zrem(directSendKey(userId), `wamid:${s.id}`);
        } catch (e) { /* Redis down: its copy stays; the database's row is taken off below */ }
        await WhatsappDirectSend.deleteOne({ ref: `wamid:${s.id}` }).catch(() => {});
        const error_message = `WhatsApp delivery failed: ${JSON.stringify(s.errors || []).slice(0, 300)}`;
        // A one-time schedule that was set to go out again (2026-11-21, countWhatsappResend above) is "pending" and
        // still carries the id of the message it sent before: the failed one is that earlier message. Its kept row
        // stops counting. The schedule is not marked failed: the worker never clears that mark on a one-time
        // schedule, so it would stay on the message that has yet to go out and take that one off the count too.
        const waiting = await AiSchedule.findOne({ whatsapp_message_id: s.id, status: "pending", repeat: { $nin: ["daily", "weekly", "custom"] } })
            .select("_id sent_at").lean().catch(() => null);
        if (waiting) {
            const sentMs = timeOf(waiting.sent_at);
            if (sentMs !== null) await removeKeptRow(sentRef(waiting._id, sentMs)).catch(() => {});
            await AiSchedule.updateOne({ _id: waiting._id }, { error_message }).catch(() => {});
        } else {
            await AiSchedule.updateOne({ whatsapp_message_id: s.id }, { whatsapp_failed: true, error_message }).catch(() => {});
        }
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
