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
import User from "../models/User.js";
import Organization from "../models/Organization.js";

/**
 * Service to handle mathematical logic and database interactions 
 * for AI tokens/credits across the platform.
 * 
 * NOTE: 1 Credit = 1 Token exactly.
 * Conversion: ₹100 = 500,000 Credits
 */

import GlobalAiConfig from "../models/GlobalAiConfig.js";
import AiCreditSpend from "../models/AiCreditSpend.js";
import { enqueueEmail } from "./email-queue.service.js";
import { resetPeriodMs, RESET_UNITS } from "./ai-feature-limits.js";
import { planOf, isUnlimited } from "./plan-limits.service.js";
import redis from "../config/redis.js";
import { getGrantedCreditsLowEmailHtml, getTopUpCreditsLowEmailHtml, getPlanLimitReachedEmail, getGrantedCreditsExhaustedEmailHtml, getTopUpCreditsExhaustedEmailHtml, CREDIT_EMAIL_SUBJECTS, baseTemplate } from "./email-templates.service.js";

// Automatic top-ups (Settings > Billing): once the bought credits fall below the amount the user set, one email a day
// with a one-click link that opens Billing with the top-up amount filled in. No payment method is kept, so the user
// still presses Pay; nothing is charged by itself.
const autoTopupEmail = async (user, orgId, remaining) => {
    const a = user?.ai_auto_topup;
    if (!a?.enabled || !user?.email) return;
    // Top-ups are for paid plans: a Free user gets no top-up email
    const { topupBlockedByPlan } = await import("../controllers/ai-credits-topup.controller.js");
    if (await topupBlockedByPlan(user)) return;
    const cfg = await GlobalAiConfig.findOne({ key: "singleton" }).select("credits_per_inr").lean().catch(() => null);
    const perInr = Number(cfg?.credits_per_inr) > 0 ? Number(cfg.credits_per_inr) : 3000;
    const threshold = Math.max(1, Number(a.below_inr) || 100) * perInr;
    if (remaining >= threshold) return;
    // Claimed in one step, so two answers ending at once (or two server copies) send one email
    const dayAgo = new Date(Date.now() - 24 * 3600000);
    const claimed = await User.findOneAndUpdate(
        { _id: user._id, "ai_auto_topup.enabled": true, $or: [{ "ai_auto_topup.last_notified_at": null }, { "ai_auto_topup.last_notified_at": { $lt: dayAgo } }] },
        { $set: { "ai_auto_topup.last_notified_at": new Date() } },
        { projection: { _id: 1 } }
    );
    if (!claimed) return;
    const amount = Math.max(1, Math.floor(Number(a.amount_inr) || 500));
    const chatApp = String(process.env.CHAT_APP_URL || "https://chat.classgrid.in").replace(/\/$/, "");
    const link = `${chatApp}/agent/settings?section=billing&topup=${amount}`;
    const name = String(user.name || user.first_name || "there").replace(/[<>&]/g, "");
    const inr = (v) => Number(v).toLocaleString("en-IN");
    const html = baseTemplate({
        title: "Your credits are low",
        content: `
            <h2 style="margin:0 0 12px">Your credits are low</h2>
            <p>Hi ${name}, your credit balance is ${inr(Math.max(0, Math.round(remaining)))} credits, below the ₹${inr(Number(a.below_inr) || 100)} you set for automatic top-ups.</p>
            <p>Press the button to buy ₹${inr(amount)} of credits (${inr(amount * perInr)} credits). The amount is filled in; you only confirm the payment.</p>
            <p><a href="${link}" style="display:inline-block;padding:10px 20px;background:#111111;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold">Top up ₹${inr(amount)}</a></p>
            <p style="color:#666;font-size:13px">You get this email at most once a day while automatic top-ups are on. Turn them off in Settings &rsaquo; Billing.</p>`,
    });
    await enqueueEmail({ to: user.email, subject: `Your credits are low: top up ₹${inr(amount)} in one click`, html, type: "billing_alert", userId: user._id, organizationId: orgId });
};



export const calculateCreditsFromAmount = async (amountInr) => {
    let multiplier = 0;
    try {
        const config = await GlobalAiConfig.findOne({ key: "singleton" }).lean();
        if (config && config.credits_per_inr !== undefined && config.credits_per_inr !== null) {
            multiplier = config.credits_per_inr;
        }
    } catch (err) {
        console.error("Error fetching credits_per_inr:", err);
    }
    return Math.floor(amountInr * multiplier);
};

/**
 * The free weekly limit set in the super admin dashboard, resolved the same way everywhere:
 * global limit -> org custom limit (when the org doesn't follow global) or the Classgrid limit for users
 * without an org -> the user's own custom limit. Used by the check before a request AND by the deduction
 * after it (they used to differ: the deduction read only user.ai_tokens.free_weekly_limit, default 100,000,
 * so usage stopped being counted at 100k while the check allowed the dashboard's limit).
 */
// End of the user's current token period, always from the reset timing set in the super admin dashboard right now:
// period start + current timing. Users saved before the start was recorded fall back to their saved end date, and a
// saved end further away than the current timing counts as over.
export function tokenWindowEnd(tokens, periodMs, nowMs = Date.now()) {
    const start = tokens?.window_start ? new Date(tokens.window_start).getTime() : 0;
    if (start) return start + periodMs;
    const saved = tokens?.week_reset_date ? new Date(tokens.week_reset_date).getTime() : 0;
    if (!saved || saved - nowMs > periodMs) return 0;
    return saved;
}

export function resolveWeeklyLimit(user, org, globalConfig, orgId = org?._id) {
    let weeklyLimit = globalConfig?.global_user_weekly_limit || 0;
    if (org) {
        if (org.ai_config?.custom_limits_enabled && org.ai_config.free_weekly_limit_per_user !== undefined && org.ai_config.free_weekly_limit_per_user !== null) {
            weeklyLimit = org.ai_config.free_weekly_limit_per_user;
        }
    } else if (!orgId && globalConfig?.classgrid_custom_limits_enabled && globalConfig.classgrid_user_weekly_limit !== undefined && globalConfig.classgrid_user_weekly_limit !== null) {
        weeklyLimit = globalConfig.classgrid_user_weekly_limit;
    }
    if (user?.ai_tokens?.custom_limits_enabled && user.ai_tokens.free_weekly_limit !== undefined && user.ai_tokens.free_weekly_limit !== null) {
        weeklyLimit = user.ai_tokens.free_weekly_limit;
    }
    return weeklyLimit;
}

// The free window and the weekly ceiling: with plans on, from the user's plan (tokens_per_window per window of
// window_reset_value/unit, and tokens_per_week per 7 days); with plans off, the dashboard's global / org / user limit
// and its reset period as before. A super admin's per-user custom limit always wins over the plan's window.
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export async function freeWindow(user, org, globalConfig, orgId = org?._id) {
    const plan = await planOf(user);
    if (!plan) return { limit: resolveWeeklyLimit(user, org, globalConfig, orgId), periodMs: resetPeriodMs("tokens", org, globalConfig, orgId), weekCap: null, planKey: null };
    let limit = isUnlimited(plan.tokens_per_window) ? Infinity : Number(plan.tokens_per_window) || 0;
    if (user?.ai_tokens?.custom_limits_enabled && user.ai_tokens.free_weekly_limit !== undefined && user.ai_tokens.free_weekly_limit !== null) limit = user.ai_tokens.free_weekly_limit;
    const periodMs = Math.max(1000, (Number(plan.window_reset_value) || 5) * (RESET_UNITS[plan.window_reset_unit] || RESET_UNITS.hour));
    const weekCap = isUnlimited(plan.tokens_per_week) ? Infinity : Number(plan.tokens_per_week) || 0;
    return { limit, periodMs, weekCap, planKey: plan.key };
}
// The weekly counters (credits, Claude credits, Fable credits), restarted together when their 7 days are over
export async function weekCounters(userId, tokens, nowMs = Date.now()) {
    const start = tokens?.week_start ? new Date(tokens.week_start).getTime() : 0;
    if (start && nowMs < start + WEEK_MS) {
        return { week_used: tokens?.week_used || 0, claude_week_used: tokens?.claude_week_used || 0, fable_week_used: tokens?.fable_week_used || 0, weekEnd: new Date(start + WEEK_MS) };
    }
    await User.updateOne({ _id: userId }, { $set: { "ai_tokens.week_used": 0, "ai_tokens.claude_week_used": 0, "ai_tokens.fable_week_used": 0, "ai_tokens.week_start": new Date(nowMs) } }).catch(() => {});
    return { week_used: 0, claude_week_used: 0, fable_week_used: 0, weekEnd: new Date(nowMs + WEEK_MS) };
}
const weekUsed = async (userId, tokens, nowMs = Date.now()) => (await weekCounters(userId, tokens, nowMs)).week_used;

// Which limit a person used up and when it comes back, by the same rule as hasEnoughTokens' resetAt: the plan's weekly
// limit when the week's use reached the weekly cap (back at the week's end), else the session window (back at the
// window's end). periodMs is the window's length (for "5-hour limit" while plans are off). `user` needs ai_tokens,
// plan, role and email.
export async function limitBackAt(user, orgId = user?.organization_id || null, nowMs = Date.now()) {
    const [globalConfig, org] = await Promise.all([
        GlobalAiConfig.findOne({ key: "singleton" }).select("global_user_weekly_limit classgrid_custom_limits_enabled classgrid_user_weekly_limit global_token_reset_value global_token_reset_unit classgrid_token_reset_value classgrid_token_reset_unit").lean(),
        orgId ? Organization.findById(orgId).select("ai_config").lean() : null,
    ]);
    const window = await freeWindow(user, org, globalConfig || {}, orgId);
    const week = window.weekCap === null ? null : await weekCounters(user._id, user.ai_tokens, nowMs);
    if (week && window.weekCap - week.week_used <= 0) return { which: "week", at: new Date(week.weekEnd), periodMs: window.periodMs };
    const windowEndMs = tokenWindowEnd(user.ai_tokens, window.periodMs, nowMs);
    return { which: "window", at: new Date(nowMs >= windowEndMs ? nowMs + window.periodMs : windowEndMs), periodMs: window.periodMs };
}

// The plan wording for emails and WhatsApp texts, all from the plan table: the user's plan row (null while plans are
// off, and for Classgrid staff) and the paid plans' names ("Pro", "Max") to upgrade to
export async function planWording(user) {
    const plan = await planOf(user).catch(() => null);
    let paidNames = [];
    try {
        const { planTable } = await import("./plan-limits.service.js");
        const table = await planTable();
        paidNames = ["pro", "max"].map((key) => table?.plans?.[key]?.name).filter(Boolean);
    } catch (e) {
        console.warn("[plans] could not read the plan names:", e.message);
    }
    return { plan, paidNames };
}

// One computer, one free limit (desktop app): the free tokens used by every account on the same Windows computer
// count together, so making more accounts doesn't give more free usage. Paid and granted credits are not affected.
// The app sends the computer's scrambled Windows ID; an account stays tied to its last computer for 90 days.
const DEVICE_DAYS = 90 * 24 * 3600;
const deviceOf = (userId) => `aidevice:user:${userId}`;
const deviceFree = (device) => `aidevice:free:${device}`;
export async function rememberDevice(userId, device) {
    if (!userId || !/^[a-f0-9]{64}$/.test(String(device || ""))) return;
    await redis.multi()
        .set(deviceOf(userId), device, "EX", DEVICE_DAYS)
        .sadd(`aidevice:accounts:${device}`, String(userId))
        .expire(`aidevice:accounts:${device}`, DEVICE_DAYS)
        .exec().catch(() => {});
}
// Free tokens used on this account's computer in the current period (null: no computer known)
async function deviceFreeUsed(userId) {
    const device = await redis.get(deviceOf(userId)).catch(() => null);
    if (!device) return null;
    const d = await redis.hgetall(deviceFree(device)).catch(() => null);
    return Number(d?.end) > Date.now() ? Number(d.used) || 0 : 0;
}
async function addDeviceFree(userId, tokens, periodMs) {
    const device = await redis.get(deviceOf(userId)).catch(() => null);
    if (!device || !(tokens > 0)) return;
    const key = deviceFree(device);
    const d = await redis.hgetall(key).catch(() => null);
    if (!(Number(d?.end) > Date.now())) await redis.multi().hset(key, "used", 0, "end", Date.now() + periodMs).pexpire(key, periodMs + 86400000).exec().catch(() => {});
    await redis.hincrby(key, "used", Math.round(tokens)).catch(() => {});
}

export const hasEnoughTokens = async (userId, orgId, requiredTokens = 1, { paidOnly = false } = {}) => {
    // The three reads (user, global settings, organization) are 150 ms away each; they run together, not one after
    // another (measured 2026-11-10: 450 ms -> 150 ms)
    const [user, globalConfig, org] = await Promise.all([
        User.findById(userId).select('ai_tokens role status plan'),
        GlobalAiConfig.findOne({ key: "singleton" }).select("global_user_weekly_limit global_ai_blocked free_limit_per_computer classgrid_custom_limits_enabled classgrid_user_weekly_limit global_token_reset_value global_token_reset_unit classgrid_token_reset_value classgrid_token_reset_unit global_image_reset_value global_image_reset_unit classgrid_image_reset_value classgrid_image_reset_unit").lean() || {},
        orgId ? Organization.findById(orgId).select('ai_config status').lean() : null,
    ]);
    // 1. Check if user is blocked or suspended
    if (!user) {
        return { allowed: false, reason: "User not found." };
    }
    if (user.ai_tokens?.is_ai_blocked) {
        return { allowed: false, reason: "User AI access is explicitly blocked." };
    }
    if (user.status && user.status !== "active" && user.status !== "pending") {
        return { allowed: false, reason: `User account is ${user.status}.` };
    }

    // FETCH GLOBAL CONFIG
    if (globalConfig.global_ai_blocked) {
        return { allowed: false, reason: "AI access is globally blocked by administrators." };
    }

    // Premium models (the Claude Fable family: Fable 5.1 and 5.2): paid credits only, never free weekly, promotion or org-pool tokens
    if (paidOnly) {
        let paid = user.ai_tokens?.ai_credits_balance || 0;
        if (user.ai_tokens?.ai_credits_end_date && new Date(user.ai_tokens.ai_credits_end_date).getTime() < Date.now()) paid = 0;
        if (paid >= requiredTokens) return { allowed: true, source: "personal", remaining: paid };
        return { allowed: false, reason: "Insufficient paid credits.", paidOnly: true, remaining: Math.max(0, paid) };
    }

    // --- SHARED ORG POOL & ORG CUSTOM LIMITS (STEP 2) ---
    if (orgId) {
        if (org) {
            if (org.status && org.status !== "active") {
                 return { allowed: false, reason: `Organization account is ${org.status}.` };
            }
            if (org.ai_config?.is_ai_blocked) {
                 return { allowed: false, reason: "Organization AI access is explicitly blocked." };
            }

            // Check Org Pool (if org_admin)
            if (user.role === 'org_admin') {
                const orgUsed = org.ai_config?.pro_used_this_period || 0;
                const orgLimit = org.ai_config?.pro_pool_limit || 0;
                if (orgUsed + requiredTokens <= orgLimit) {
                    return { allowed: true, source: "org_pool", remaining: orgLimit - orgUsed };
                }
            }
        }
    }

    // The window limit and its period: the user's plan when plans are on, else global -> org (or Classgrid) -> user
    // custom limit, as set in the super admin dashboard.
    const window = await freeWindow(user, org, globalConfig, orgId);
    const weeklyLimit = window.limit;

    // 2. Check free weekly limit FIRST (Always use free before touching paid/promo)
    let usedThisWeek = user.ai_tokens?.used_this_week || 0;
    // Reset follows the dashboard timing live (see tokenWindowEnd)
    const tokenPeriodMs = window.periodMs;
    const nowMs = Date.now();
    const windowEndMs = tokenWindowEnd(user.ai_tokens, tokenPeriodMs, nowMs);
    const savedResetMs = user.ai_tokens?.week_reset_date ? new Date(user.ai_tokens.week_reset_date).getTime() : 0;
    if (nowMs >= windowEndMs) {
        usedThisWeek = 0;
        const newResetDate = new Date(nowMs + tokenPeriodMs);
        // Async update DB but don't block the chat flow
        User.findByIdAndUpdate(userId, { 
            $set: { 
                "ai_tokens.used_this_week": 0,
                "ai_tokens.window_start": new Date(nowMs),
                "ai_tokens.week_reset_date": newResetDate
            }
        }).catch(e => console.error("Auto-reset error:", e));
        User.updateOne(
            { _id: userId, ai_image_reset_date: null },
            { $set: { ai_image_free_weekly_used: 0, ai_image_reset_date: new Date(nowMs + resetPeriodMs("image", org, globalConfig, orgId)) } }
        ).catch(e => console.error("Image auto-reset error:", e));
    } else if (savedResetMs !== windowEndMs) {
        // The dashboard timing changed: keep the saved end date (shown to users) in step with it
        User.updateOne({ _id: userId }, { $set: { "ai_tokens.week_reset_date": new Date(windowEndMs) } })
            .catch(e => console.error("Reset date update error:", e));
    }

    // The free limit is shared by all accounts on the same computer, when the super admin dashboard's switch is on
    // (the computer's count is kept either way, so turning the switch on later counts what was already used)
    const usedOnComputer = globalConfig.free_limit_per_computer === true ? await deviceFreeUsed(userId) : null;
    // The plan's weekly ceiling (plans on): what is left of it this week caps the window too
    const week = window.weekCap === null ? null : await weekCounters(userId, user.ai_tokens, nowMs);
    const weekLeft = week ? Math.max(0, window.weekCap - week.week_used) : Infinity;
    const freeLeft = Math.min(weeklyLimit - usedThisWeek, usedOnComputer === null ? Infinity : weeklyLimit - usedOnComputer, weekLeft);
    // The credit pools (granted / promotion and paid / top-up), without the expired ones.
    // Note: paused/revoked credits are already subtracted from balance by the per-transaction controllers
    const now = new Date().getTime();
    let promoBalance = user.ai_tokens?.promotion_credits_balance || 0;
    if (user.ai_tokens?.promotion_credits_end_date && new Date(user.ai_tokens.promotion_credits_end_date).getTime() < now) {
        promoBalance = 0; // Expired
    }
    let paidBalance = user.ai_tokens?.ai_credits_balance || 0;
    if (user.ai_tokens?.ai_credits_end_date && new Date(user.ai_tokens.ai_credits_end_date).getTime() < now) {
        paidBalance = 0; // Expired
    }
    // spendable: what one answer may use in total: the free pool, then the granted credits, then the top-up credits
    // (deductTokens spills from one into the next as each runs out). The live token check during an answer stops
    // only at this number, so an answer goes on across the pools and stops only when everything is used up.
    // planLeft (in every allowed answer below): what is left of the plan's own limits alone, the session window and
    // the week, without any credits. A Claude answer on the plan's Claude credits may use no more than this.
    const freeHeadroom = Math.max(0, freeLeft);
    const spendable = freeHeadroom + promoBalance + paidBalance;

    if (requiredTokens <= freeLeft) {
        return { allowed: true, source: "weekly_free", remaining: freeLeft, spendable, planLeft: freeHeadroom };
    }

    // 3. FIFO LOGIC: Determine which came FIRST between Top-Up (Paid) and Granted (Promotion)
    const promoStart = user.ai_tokens?.promotion_credits_start_date ? new Date(user.ai_tokens.promotion_credits_start_date).getTime() : Infinity;
    const paidStart = user.ai_tokens?.ai_credits_start_date ? new Date(user.ai_tokens.ai_credits_start_date).getTime() : Infinity;

    // Whichever was purchased/granted FIRST gets used FIRST (FIFO)
    if (promoBalance >= requiredTokens && paidBalance >= requiredTokens) {
        if (promoStart <= paidStart) {
            return { allowed: true, source: "promotion", remaining: promoBalance, spendable, planLeft: freeHeadroom };
        } else {
            return { allowed: true, source: "personal", remaining: paidBalance, spendable, planLeft: freeHeadroom };
        }
    } else if (promoBalance >= requiredTokens) {
        return { allowed: true, source: "promotion", remaining: promoBalance, spendable, planLeft: freeHeadroom };
    } else if (paidBalance >= requiredTokens) {
        return { allowed: true, source: "personal", remaining: paidBalance, spendable, planLeft: freeHeadroom };
    }

    // No single pool covers it, but the pools together may: each pool spills over into the next when it runs out
    // (see deductTokens), so the free headroom and both credit pools count together.
    if (spendable >= requiredTokens) {
        if (freeHeadroom > 0) return { allowed: true, source: "weekly_free", remaining: spendable, spendable, planLeft: freeHeadroom };
        const first = pickCreditSource(user);
        if (first) return { allowed: true, source: first, remaining: spendable, spendable, planLeft: freeHeadroom };
    }

    // When the limit comes back, for the message the person is shown: the week's end when the weekly limit is what
    // ran out, else the end of the session window (the card used to show the window's end for both)
    const windowBack = nowMs >= windowEndMs ? nowMs + tokenPeriodMs : windowEndMs;
    const resetAt = new Date(week && weekLeft <= 0 ? week.weekEnd : windowBack).toISOString();
    return { allowed: false, reason: "Insufficient tokens.", resetAt };
};


// HELPER TO TRIGGER ALERTS
const limitEmailDue = async (userId) => {
    try {
        return (await redis.set(`ai:limit-email:${userId}`, "1", "EX", 24 * 3600, "NX")) === "OK";
    } catch {
        return false;
    }
};
const triggerEmailAlerts = async (userId, orgId, type, oldBalance, currentBalance, totalLimit) => {
    try {
        const user = await User.findById(userId).select('email name first_name last_name ai_tokens ai_auto_topup role plan');
        if (!user || !user.email) return;
        if (type === 'personal') autoTopupEmail(user, orgId, currentBalance).catch((e) => console.error("[auto top-up email]", e.message));

        const userName = user.name || (user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Classgrid User');
        const threshold20 = totalLimit * 0.2;
        // Every alert names the user's plan (from the plan table; "your plan" while plans are off)
        const alert = async (subject, html, text = "") => enqueueEmail({ to: user.email, subject, html, text, type: "billing_alert", userId, organizationId: orgId });

        // Top-Up Alerts: the plan keeps working when they run out
        if (type === 'personal') {
            if (oldBalance > threshold20 && currentBalance <= threshold20 && currentBalance > 0) {
                const { plan } = await planWording(user);
                await alert(CREDIT_EMAIL_SUBJECTS.topUpLow, getTopUpCreditsLowEmailHtml(userName, plan));
            }
            if (oldBalance > 0 && currentBalance <= 0) {
                const { plan } = await planWording(user);
                await alert(CREDIT_EMAIL_SUBJECTS.topUpUsedUp, getTopUpCreditsExhaustedEmailHtml(userName, plan));
            }
        }

        // Granted Credits Alerts: the plan and any top-up credits keep working when they run out
        if (type === 'promotion') {
            if (oldBalance > threshold20 && currentBalance <= threshold20 && currentBalance > 0) {
                const { plan } = await planWording(user);
                await alert(CREDIT_EMAIL_SUBJECTS.grantedLow, getGrantedCreditsLowEmailHtml(userName, plan, user.ai_tokens?.promotion_credits_end_date || null));
            }
            if (oldBalance > 0 && currentBalance <= 0) {
                const { plan } = await planWording(user);
                await alert(CREDIT_EMAIL_SUBJECTS.grantedUsedUp, getGrantedCreditsExhaustedEmailHtml(userName, plan));
            }
        }

        // The plan's limit is used up: which limit (the session window or the week) and when it comes back
        if (type === 'free') {
            // At most once a day per person. A limit now ends at 100 percent every time it is used up (a message
            // starts whenever anything is left), so without this a person who uses up each session window would get
            // this email every few hours; before, a window reached exactly 0 only now and then. When Redis can't be
            // asked, the email is not sent.
            if (oldBalance > 0 && currentBalance <= 0 && (await limitEmailDue(userId))) {
                const [{ plan, paidNames }, back] = await Promise.all([planWording(user), limitBackAt(user, orgId)]);
                const mail = getPlanLimitReachedEmail({ userName, plan, paidNames, which: back.which, backAt: back.at, periodMs: back.periodMs });
                await alert(mail.subject, mail.html, mail.text);
            }
        }
    } catch (error) {
        console.error('Failed to trigger email alerts:', error);
    }
};

// The credit pool to charge once the free weekly pool is used up: promotion (granted) or personal (paid),
// whichever started first among those with a positive, unexpired balance. Same FIFO rule as hasEnoughTokens.
function pickCreditSource(user) {
    const now = Date.now();
    const t = user?.ai_tokens || {};
    const promoOk = (t.promotion_credits_balance || 0) > 0 && !(t.promotion_credits_end_date && new Date(t.promotion_credits_end_date).getTime() < now);
    const paidOk = (t.ai_credits_balance || 0) > 0 && !(t.ai_credits_end_date && new Date(t.ai_credits_end_date).getTime() < now);
    if (promoOk && paidOk) {
        const promoStart = t.promotion_credits_start_date ? new Date(t.promotion_credits_start_date).getTime() : Infinity;
        const paidStart = t.ai_credits_start_date ? new Date(t.ai_credits_start_date).getTime() : Infinity;
        return promoStart <= paidStart ? "promotion" : "personal";
    }
    if (promoOk) return "promotion";
    if (paidOk) return "personal";
    return null;
}

/**
 * The person's credits for use past a plan limit (owner, 2026-11-17: one shared pool; gifted credits work everywhere
 * bought ones do): gifted (promotion) and bought (top-up) together, without the expired ones. `source` is the pool
 * used first, the one that started first, as for chat; deductTokens then spills into the other when it runs out.
 * Nothing is available while the account's AI is blocked, the account is not active, or AI is blocked for everyone.
 * Returns { total, gifted, bought, source } (source null = no credits).
 */
export async function creditsAvailable(userId) {
    const none = { total: 0, gifted: 0, bought: 0, source: null };
    const [user, globalConfig] = await Promise.all([
        User.findById(userId).select("ai_tokens status").lean(),
        GlobalAiConfig.findOne({ key: "singleton" }).select("global_ai_blocked").lean(),
    ]);
    if (!user || user.ai_tokens?.is_ai_blocked || globalConfig?.global_ai_blocked) return none;
    if (user.status && user.status !== "active" && user.status !== "pending") return none;
    const t = user.ai_tokens || {};
    const now = Date.now();
    const live = (balance, end) => (end && new Date(end).getTime() < now ? 0 : Math.max(0, Number(balance) || 0));
    const gifted = live(t.promotion_credits_balance, t.promotion_credits_end_date);
    const bought = live(t.ai_credits_balance, t.ai_credits_end_date);
    return { total: gifted + bought, gifted, bought, source: pickCreditSource(user) };
}

// The record of credits really spent (models/AiCreditSpend.js): `credits` is the exact number that just left the
// balance. It is written after the balance changed and never waited for: a record that cannot be saved is logged and
// the charge stands as it is (the balance is the money; this is only the history of it).
function recordCreditSpend(userId, orgId, credits, pool, label) {
    if (!(credits > 0)) return;
    try {
        AiCreditSpend.create({
            userId, orgId: orgId || null, credits, pool,
            model: String(label?.model || "").slice(0, 120),
            what: String(label?.what || "").slice(0, 40),
            logId: label?.logId || null,
        }).catch((e) => console.error("[credit spend] could not be recorded:", e.message));
    } catch (e) {
        console.error("[credit spend] could not be recorded:", e.message);
    }
}

// A credit pool that ran out during a request: the rest goes to the other credit pool (granted <-> top-up), if it has
// anything left, so an answer is never left unpaid while the user still has credits
async function spillToOtherPool(userId, orgId, rest, from, label = null) {
    if (!(rest > 0)) return null;
    const other = from === "promotion" ? "personal" : "promotion";
    const user = await User.findById(userId).select("ai_tokens");
    const t = user?.ai_tokens || {};
    const ok = other === "promotion"
        ? (t.promotion_credits_balance || 0) > 0 && !(t.promotion_credits_end_date && new Date(t.promotion_credits_end_date).getTime() < Date.now())
        : (t.ai_credits_balance || 0) > 0 && !(t.ai_credits_end_date && new Date(t.ai_credits_end_date).getTime() < Date.now());
    if (!ok) return null;
    const spill = await deductTokens(userId, orgId, rest, other, { noSpill: true, label });
    return { to: other, tokens: rest, spill };
}

// `label` ({ model, what, logId }, optional) says what the credits pay for; it only goes into the record of credits
// spent (recordCreditSpend) and follows the charge when it spills into another pool.
export const deductTokens = async (userId, orgId, tokenAmount, source, { noSpill = false, label = null } = {}) => {
    try {
        let result = { success: false, remaining: 0, type: "unknown" };

        if (source === "personal") {
            // Read current balance FIRST, then cap the deduction. Several answers of the same user may end at the same
            // moment (desktop app, Classgrid Code and the website at once): the deduction only goes through while the
            // balance still covers it, else the balance is read again (never below zero, never charged twice)
            let user, currentBalance, actualDeduction, updatedUser = null;
            for (let attempt = 0; attempt < 4 && !updatedUser; attempt++) {
                user = await User.findById(userId).select("ai_tokens.ai_credits_balance ai_tokens.total_ai_credits_purchased");
                currentBalance = Math.max(0, user?.ai_tokens?.ai_credits_balance || 0);
                actualDeduction = Math.min(tokenAmount, currentBalance);
                if (actualDeduction <= 0) break;
                updatedUser = await User.findOneAndUpdate({ _id: userId, "ai_tokens.ai_credits_balance": { $gte: actualDeduction } }, {
                    $inc: {
                        "ai_tokens.ai_credits_balance": -actualDeduction,
                        "ai_tokens.total_ai_tokens_used": actualDeduction
                    }
                }, { returnDocument: 'after' });
            }
            if (actualDeduction <= 0 || !updatedUser) {
                const spilled = noSpill ? null : await spillToOtherPool(userId, orgId, tokenAmount, "personal", label);
                return { success: true, remaining: 0, limit: 0, type: "personal", uncharged: spilled ? (spilled.spill?.uncharged || 0) : tokenAmount, ...(spilled ? { spilledTo: spilled.to, spilledTokens: spilled.tokens, spill: spilled.spill } : {}) };
            }
            recordCreditSpend(userId, orgId, actualDeduction, "bought", label);
            result = { success: true, remaining: Math.max(0, updatedUser.ai_tokens.ai_credits_balance), limit: updatedUser.ai_tokens.ai_credits_balance + actualDeduction, type: "personal", uncharged: tokenAmount - actualDeduction };
            if (result.uncharged > 0 && !noSpill) {
                const spilled = await spillToOtherPool(userId, orgId, result.uncharged, "personal", label);
                if (spilled) Object.assign(result, { spilledTo: spilled.to, spilledTokens: spilled.tokens, spill: spilled.spill, uncharged: spilled.spill?.uncharged || 0 });
            }
            triggerEmailAlerts(userId, orgId, "personal", currentBalance, result.remaining, user?.ai_tokens?.total_ai_credits_purchased || currentBalance);

        } else if (source === "promotion") {
            // Read current balance FIRST, then cap the deduction (same guard against answers ending at the same moment)
            let user, currentBalance, actualDeduction, updatedUser = null;
            for (let attempt = 0; attempt < 4 && !updatedUser; attempt++) {
                user = await User.findById(userId).select("ai_tokens.promotion_credits_balance ai_tokens.total_promotion_credits_granted");
                currentBalance = Math.max(0, user?.ai_tokens?.promotion_credits_balance || 0);
                actualDeduction = Math.min(tokenAmount, currentBalance);
                if (actualDeduction <= 0) break;
                updatedUser = await User.findOneAndUpdate({ _id: userId, "ai_tokens.promotion_credits_balance": { $gte: actualDeduction } }, {
                    $inc: {
                        "ai_tokens.promotion_credits_balance": -actualDeduction,
                        "ai_tokens.total_ai_tokens_used": actualDeduction
                    }
                }, { returnDocument: 'after' });
            }
            if (actualDeduction <= 0 || !updatedUser) {
                const spilled = noSpill ? null : await spillToOtherPool(userId, orgId, tokenAmount, "promotion", label);
                return { success: true, remaining: 0, limit: 0, type: "promotion", uncharged: spilled ? (spilled.spill?.uncharged || 0) : tokenAmount, ...(spilled ? { spilledTo: spilled.to, spilledTokens: spilled.tokens, spill: spilled.spill } : {}) };
            }
            recordCreditSpend(userId, orgId, actualDeduction, "gifted", label);
            result = { success: true, remaining: Math.max(0, updatedUser.ai_tokens.promotion_credits_balance), limit: updatedUser.ai_tokens.promotion_credits_balance + actualDeduction, type: "promotion", uncharged: tokenAmount - actualDeduction };
            if (result.uncharged > 0 && !noSpill) {
                const spilled = await spillToOtherPool(userId, orgId, result.uncharged, "promotion", label);
                if (spilled) Object.assign(result, { spilledTo: spilled.to, spilledTokens: spilled.tokens, spill: spilled.spill, uncharged: spilled.spill?.uncharged || 0 });
            }
            triggerEmailAlerts(userId, orgId, "promotion", currentBalance, result.remaining, user?.ai_tokens?.total_promotion_credits_granted || currentBalance);

        } else if (source === "weekly_free") {
            // Free tier, with the same dashboard limit the pre-request check uses.
            const user = await User.findById(userId).select("ai_tokens plan");
            const org = orgId ? await Organization.findById(orgId).select("ai_config").lean() : null;
            const globalConfig = await GlobalAiConfig.findOne({ key: "singleton" }).select("global_user_weekly_limit free_limit_per_computer classgrid_custom_limits_enabled classgrid_user_weekly_limit global_token_reset_value global_token_reset_unit classgrid_token_reset_value classgrid_token_reset_unit").lean() || {};
            const window = await freeWindow(user, org, globalConfig, orgId);
            const weeklyLimit = window.limit;
            const currentUsed = user?.ai_tokens?.used_this_week || 0;
            // The free limit is shared by all accounts on the same computer, when the dashboard's switch is on
            const usedOnComputer = globalConfig.free_limit_per_computer === true ? await deviceFreeUsed(userId) : null;
            const weekLeft = window.weekCap === null ? Infinity : Math.max(0, window.weekCap - (await weekUsed(userId, user?.ai_tokens)));
            const headroom = Math.max(0, Math.min(weeklyLimit - currentUsed, usedOnComputer === null ? Infinity : weeklyLimit - usedOnComputer, weekLeft));
            const actualDeduction = Math.min(tokenAmount, headroom);
            const overflow = tokenAmount - actualDeduction;

            if (actualDeduction > 0) {
                const updatedUser = await User.findByIdAndUpdate(userId, {
                    $inc: {
                        "ai_tokens.used_this_week": actualDeduction,
                        "ai_tokens.week_used": actualDeduction,
                        "ai_tokens.total_ai_tokens_used": actualDeduction
                    }
                }, { returnDocument: 'after' });
                result = { success: true, remaining: Math.max(0, weeklyLimit - updatedUser.ai_tokens.used_this_week), limit: weeklyLimit, type: "free" };
                await addDeviceFree(userId, actualDeduction, window.periodMs);
                // What is left after this answer, of whichever limit is lower (the window, the computer's, or the
                // week's): the limit email goes out when any of them is used up, the weekly limit too
                triggerEmailAlerts(userId, orgId, "free", headroom, Math.max(0, headroom - actualDeduction), weeklyLimit);
            } else {
                result = { success: true, remaining: 0, limit: weeklyLimit, type: "free" };
            }

            // The free pool ran out during this request: the rest is charged to granted or paid credits
            // (whichever started first, as in hasEnoughTokens) instead of being dropped.
            if (overflow > 0) {
                const next = pickCreditSource(user);
                if (next) {
                    const spill = await deductTokens(userId, orgId, overflow, next, { label });
                    result.spilledTo = next;
                    result.spilledTokens = overflow;
                    result.spill = spill;
                    if (spill?.uncharged) result.uncharged = spill.uncharged; // the credit pool ran out too
                } else {
                    result.uncharged = overflow;
                }
            }

        } else if (source === "org_pool") {
            // For org pool: cap so pro_used_this_period never exceeds pro_pool_limit
            const Organization = (await import("../models/Organization.js")).default;
            const org = await Organization.findById(orgId).select("ai_config.pro_used_this_period ai_config.pro_pool_limit");
            const orgLimit = org?.ai_config?.pro_pool_limit || 0;
            const orgUsed = org?.ai_config?.pro_used_this_period || 0;
            const headroom = Math.max(0, orgLimit - orgUsed);
            const actualDeduction = Math.min(tokenAmount, headroom);
            if (actualDeduction <= 0) {
                return { success: true, remaining: 0, limit: orgLimit, type: "pro", uncharged: tokenAmount };
            }
            const updatedOrg = await Organization.findByIdAndUpdate(orgId, {
                $inc: {
                    "ai_config.pro_used_this_period": actualDeduction,
                    "ai_config.total_ai_tokens_used": actualDeduction
                }
            }, { returnDocument: 'after' });
            await User.findByIdAndUpdate(userId, {
                $inc: { "ai_tokens.total_ai_tokens_used": actualDeduction }
            });
            result = { success: true, remaining: Math.max(0, updatedOrg.ai_config.pro_pool_limit - updatedOrg.ai_config.pro_used_this_period), limit: updatedOrg.ai_config.pro_pool_limit, type: "pro", uncharged: tokenAmount - actualDeduction };
        }

        if (result.success) {
            import("../services/socket.service.js").then(({ getIO }) => {
                const io = getIO();
                if (io) {
                    io.to(userId.toString()).emit("ai_token_update");
                    io.to("superadmin:ai_usage").emit("ai_usage_updated");
                }
            }).catch(err => console.error("Socket error in deductTokens:", err));
        }

        return result;
    } catch (error) {
        console.error("Error deducting tokens:", error);
        return { success: false, remaining: 0, type: "unknown" };
    }
};

/**
 * A Claude or Fable use on a plan that includes Claude, charged the plan's way. Owner, 2026-11-21: "the session limit
 * and the weekly limit are for every model, Claude and any model added later; the Claude limit is only a cap inside
 * them; with the session or the week at 100 percent no model works." From 2026-11-14 until that day a Claude answer
 * counted on the plan's weekly Claude credits only, so Claude went on answering with both limits used up, and a
 * helper on a Claude model was not counted on the Claude credits at all.
 *
 * The cost goes, in this order:
 *   1. to the plan: counted on the weekly Claude credits (and Fable's share of them when `fable`), the session window
 *      and the week together, in one write, up to the smallest room of them;
 *   2. the rest to the person's credits (gifted or bought, the older first), at the same number;
 *   3. with no credits: the rest is counted on the session window and the week alone, as far as they have room (the
 *      Claude credits are over, the plan is not);
 *   4. what is left after that is not charged: every bar ends at 100 percent, and the next message is refused.
 * The account's lifetime total goes up by everything the plan paid. The computer's free count and the "limit used up"
 * email follow as for any other answer (deductTokens, weekly_free).
 * Returns { success, type: "claude_plan", onPlan, onPlanOnly, uncharged, remaining, limit, spilledTo?, spilledTokens? }.
 */
export async function chargeClaudeOnPlan(userId, orgId, cost, { fable = false, label = null } = {}) {
    const credits = Number(cost) || 0;
    const result = { success: true, type: "claude_plan", onPlan: 0, onPlanOnly: 0, uncharged: 0 };
    if (!userId || !(credits > 0)) return result;
    try {
        const [user, org, globalConfig] = await Promise.all([
            User.findById(userId).select("ai_tokens plan role email"),
            orgId ? Organization.findById(orgId).select("ai_config").lean() : null,
            GlobalAiConfig.findOne({ key: "singleton" }).select("global_user_weekly_limit free_limit_per_computer classgrid_custom_limits_enabled classgrid_user_weekly_limit global_token_reset_value global_token_reset_unit classgrid_token_reset_value classgrid_token_reset_unit").lean(),
        ]);
        if (!user) return { ...result, success: false, uncharged: credits };
        const config = globalConfig || {};
        const [plan, window, week] = await Promise.all([planOf(user), freeWindow(user, org, config, orgId), weekCounters(userId, user.ai_tokens)]);
        // What each limit still has
        const pool = plan ? Number(plan.claude_credits_per_week) : -1;
        const claudeLeft = !(pool >= 0) ? Infinity : Math.max(0, pool - week.claude_week_used);
        const fableLeft = fable && pool >= 0 ? Math.max(0, Math.round(pool * (Number(plan.fable_share_percent) || 0) / 100) - week.fable_week_used) : Infinity;
        const usedOnComputer = config.free_limit_per_computer === true ? await deviceFreeUsed(userId) : null;
        const weekLeft = window.weekCap === null ? Infinity : Math.max(0, window.weekCap - week.week_used);
        const planLeft = Math.max(0, Math.min(window.limit - (user.ai_tokens?.used_this_week || 0), usedOnComputer === null ? Infinity : window.limit - usedOnComputer, weekLeft));

        // 1. the plan: the Claude credits, the session window and the week together
        const onPlan = Math.min(credits, claudeLeft, fableLeft, planLeft);
        let rest = credits - onPlan;
        // 2. the person's credits
        const next = rest > 0 ? pickCreditSource(user) : null;
        // 3. no credits: the session window and the week alone
        const onPlanOnly = rest > 0 && !next ? Math.min(rest, planLeft - onPlan) : 0;
        const planPaid = onPlan + onPlanOnly;
        if (planPaid > 0) {
            await User.updateOne({ _id: userId }, {
                $inc: {
                    ...(onPlan > 0 ? { "ai_tokens.claude_week_used": onPlan, ...(fable ? { "ai_tokens.fable_week_used": onPlan } : {}) } : {}),
                    "ai_tokens.used_this_week": planPaid,
                    "ai_tokens.week_used": planPaid,
                    "ai_tokens.total_ai_tokens_used": planPaid,
                },
            });
            await addDeviceFree(userId, planPaid, window.periodMs);
            triggerEmailAlerts(userId, orgId, "free", planLeft, Math.max(0, planLeft - planPaid), window.limit);
        }
        Object.assign(result, { onPlan, onPlanOnly, remaining: Math.max(0, planLeft - planPaid), limit: window.limit });
        if (next) {
            const spill = await deductTokens(userId, orgId, rest, next, { label });
            Object.assign(result, { spilledTo: next, spilledTokens: rest, spill, uncharged: spill?.uncharged || 0 });
        } else {
            result.uncharged = rest - onPlanOnly;
        }
        import("../services/socket.service.js").then(({ getIO }) => {
            const io = getIO();
            if (io) {
                io.to(userId.toString()).emit("ai_token_update");
                io.to("superadmin:ai_usage").emit("ai_usage_updated");
            }
        }).catch((err) => console.error("Socket error in chargeClaudeOnPlan:", err));
        return result;
    } catch (error) {
        console.error("Error charging a Claude use to the plan:", error);
        return { ...result, success: false, uncharged: credits };
    }
}

/**
 * Takes up to `amount` off a person's gifted credits and returns what was really taken: never more than the balance
 * holds, so the balance never goes below zero. A gift that was partly spent has only its rest to give back. Before
 * 2026-11-21 Remove and Pause subtracted the whole gift whatever was left of it: a gift of 1,00,000 with 80,000 spent
 * left the balance at -80,000, which then ate the person's next gift. The balance is changed only while it still
 * covers the amount (an answer may be charging it at the same moment), else it is read again.
 */
export async function takeFromGifted(userId, amount) {
    const want = Math.max(0, Number(amount) || 0);
    for (let attempt = 0; attempt < 4 && want > 0; attempt++) {
        const row = await User.findById(userId).select("ai_tokens.promotion_credits_balance").lean();
        const take = Math.min(want, Math.max(0, Number(row?.ai_tokens?.promotion_credits_balance) || 0));
        if (!(take > 0)) return 0;
        const done = await User.findOneAndUpdate({ _id: userId, "ai_tokens.promotion_credits_balance": { $gte: take } }, { $inc: { "ai_tokens.promotion_credits_balance": -take } });
        if (done) return take;
    }
    return 0;
}
// The "gifted in all" figure follows a gift that is removed or paused, and never goes below zero either
export async function lowerGiftedTotal(userId, amount) {
    const row = await User.findById(userId).select("ai_tokens.total_promotion_credits_granted").lean();
    const total = Math.max(0, (Number(row?.ai_tokens?.total_promotion_credits_granted) || 0) - Math.max(0, Number(amount) || 0));
    await User.updateOne({ _id: userId }, { $set: { "ai_tokens.total_promotion_credits_granted": total } });
}

export const addCredits = async (userId, amountToAdd) => {
    try {
        const user = await User.findByIdAndUpdate(userId, {
            $inc: { "ai_tokens.ai_credits_balance": amountToAdd }
        }, { returnDocument: 'after' });
        
        import("../services/socket.service.js").then(({ getIO }) => {
            const io = getIO();
            if (io) {
                io.to(userId.toString()).emit("ai_token_update");
                io.to("superadmin:ai_usage").emit("ai_usage_updated");
            }
        }).catch(err => console.error("Socket error in addCredits:", err));
        
        return user;
    } catch (error) {
        console.error("Error adding credits:", error);
        return null;
    }
};

export const getImageGenerationCost = async () => {
    try {
        const config = await GlobalAiConfig.findOne({ key: "singleton" }).lean();
        if (config && config.image_generation_token_cost !== undefined && config.image_generation_token_cost !== null) {
            return config.image_generation_token_cost;
        }
    } catch (err) {
        console.error("Error fetching image_generation_token_cost:", err);
    }
    return 0;
};

