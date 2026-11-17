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
import User from "../../models/User.js";
import AiCreditTransaction from "../../models/AiCreditTransaction.js";
import AdminAuditLog from "../../models/AdminAuditLog.js";
import { primarySupabaseClient as supabase } from "../../config/supabaseClient.js";
import mongoose from "mongoose";
import GlobalAiConfig from "../../models/GlobalAiConfig.js";
import Organization from "../../models/Organization.js";
import PlanConfig, { PLAN_KEYS, ensurePlanRows } from "../../models/PlanConfig.js";
import { planKeyOf, planOf, planTable } from "../../services/plan-limits.service.js";
import { freeWindow, tokenWindowEnd } from "../../services/ai-credits.service.js";
import { callTimesSince, planNumber, DAY_MS, WEEK_MS, MONTH_MS } from "../../services/call-limits.service.js";
import { finishedAccountsMatch } from "../../utils/chat-onboarding.js";
import { planOverviewFor, usageHistoryFor } from "../ai-plan-overview.controller.js";

// The paid plans (everything but Free). "In force" below is the same rule as planKeyOf: the plan's status is active
// or past_due (or not set), and it has no end date or the end date is still ahead.
const PAID_KEYS = PLAN_KEYS.filter((k) => k !== "free");
const HEX_ID = /^[a-f0-9]{24}$/i;
const iso = (d) => {
    if (!d) return null;
    const t = new Date(d);
    return Number.isNaN(t.getTime()) ? null : t.toISOString();
};
const capitalised = (k) => (k ? String(k).charAt(0).toUpperCase() + String(k).slice(1) : "");
// Classgrid staff (super admins and @classgrid.in emails) get no plan from planOf, so the page marks them
const isStaff = (user) => user?.role === "super_admin" || String(user?.email || "").toLowerCase().endsWith("@classgrid.in");
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// The plan gifts and ends for one user, newest first, from the admin audit log (setUserPlan writes them).
// The log keeps its time in `timestamp` (AdminAuditLog has no createdAt), so the rows are sorted and dated by it.
// Gifts made before the log was kept (before 2026-11-17) are not in it: when the current plan is a gift and no log
// row matches it, one row is made from what the plan itself saved (set_by, note), marked saved_on_plan.
export async function planHistoryFor(userId, currentPlan = null) {
    const rows = await AdminAuditLog.find({ targetType: "user", targetId: String(userId), action: { $in: ["user.plan_gift", "user.plan_end"] } })
        .sort({ timestamp: -1 }).limit(50).select("action actorName metadata timestamp").lean();
    const list = rows.map((r) => ({
        at: iso(r.timestamp), action: r.action === "user.plan_gift" ? "gift" : "end",
        plan: r.metadata?.plan || "free", expires_at: iso(r.metadata?.expires_at),
        reason: r.metadata?.reason || "", by: r.metadata?.set_by || r.actorName || "",
        saved_on_plan: false,
    }));
    const p = currentPlan || {};
    if (p.billing === "granted" && p.id && p.id !== "free") {
        // The log row is written just after the plan is saved, so a row for this gift is at or after its start
        // (a minute of slack for clocks); an older row for the same plan belongs to an earlier gift
        const startedMs = p.started_at ? new Date(p.started_at).getTime() : 0;
        const logged = list.some((r) => r.action === "gift" && r.plan === p.id && (!startedMs || !r.at || new Date(r.at).getTime() >= startedMs - 60000));
        if (!logged) {
            list.push({ at: iso(p.started_at), action: "gift", plan: p.id, expires_at: iso(p.expires_at), reason: p.note || "", by: p.set_by || "", saved_on_plan: true });
            // Newest first again (a row with no date goes last)
            list.sort((a, b) => (b.at ? Date.parse(b.at) : -Infinity) - (a.at ? Date.parse(a.at) : -Infinity));
        }
    }
    return list;
}

// ── The people list (GET /api/super-admin/ai-usage/people) ──

// Plan filter values the page sends, and the "how" filter (bought or gifted)
export const PLAN_FILTERS = ["all", "free", "pro", "max", "enterprise", "paid"];
export const HOW_FILTERS = ["all", "bought", "gifted"];

// The plan stored on the account and still in force now (see PAID_KEYS above)
function planInForce(idMatch, now) {
    return {
        "plan.id": idMatch,
        $and: [
            { $or: [{ "plan.status": { $exists: false } }, { "plan.status": null }, { "plan.status": { $in: ["active", "past_due"] } }] },
            { $or: [{ "plan.expires_at": { $exists: false } }, { "plan.expires_at": null }, { "plan.expires_at": { $gt: now } }] },
        ],
    };
}

/** The Mongo filter for the people list, or { error } for a filter value the page does not know.
 * Everyone who finished signing up and is not deleted (the same rule as Global Users), then the search and the plan. */
export function peopleFilter({ q, plan, how } = {}, now = new Date()) {
    const planValue = plan === undefined || plan === "" ? "all" : plan;
    const howValue = how === undefined || how === "" ? "all" : how;
    if (typeof planValue !== "string" || !PLAN_FILTERS.includes(planValue)) return { error: "Unknown plan filter." };
    if (typeof howValue !== "string" || !HOW_FILTERS.includes(howValue)) return { error: "Unknown filter." };

    // finishedAccountsMatch is itself a $nor, so it goes inside $and next to the other parts
    const and = [finishedAccountsMatch(), { status: { $ne: "deleted" } }];

    const text = typeof q === "string" ? q.trim().slice(0, 100) : "";
    if (text) {
        const re = new RegExp(escapeRegex(text), "i");
        const or = [{ name: re }, { email: re }];
        if (HEX_ID.test(text)) or.push({ _id: new mongoose.Types.ObjectId(text) });
        and.push({ $or: or });
    }

    if (planValue === "free") {
        // Free is everyone without a paid plan in force (no plan, an ended plan, or a cancelled one); "how" means
        // nothing here
        and.push({ $nor: [planInForce({ $in: PAID_KEYS }, now)] });
    } else if (planValue !== "all" || howValue !== "all") {
        // A paid plan, or "all" with a how filter (bought or gifted are only paid plans)
        const idMatch = planValue === "all" || planValue === "paid" ? { $in: PAID_KEYS } : planValue;
        and.push(planInForce(idMatch, now));
        if (howValue === "gifted") and.push({ "plan.billing": "granted" });
        if (howValue === "bought") and.push({ "plan.billing": { $ne: "granted" } });
    }
    return { $and: and };
}

/** page (1 or more) and limit (1 to 100, default 25) from the query. A page past the end just comes back empty. */
export function pageParams(query = {}) {
    const p = parseInt(query.page, 10);
    const l = parseInt(query.limit, 10);
    const page = Number.isFinite(p) && p >= 1 ? Math.min(p, 100000) : 1;
    const limit = Number.isFinite(l) ? Math.min(100, Math.max(1, l)) : 25;
    return { page, limit };
}

/** One row of the people list. ctx: { now (ms), plans (the plan table's rows by key), window: { limit, end } }, where
 * window is the person's session from freeWindow and end is tokenWindowEnd of it (0 = not started). */
export function personRow(user, ctx = {}) {
    const now = ctx.now ?? Date.now();
    const nameOf = (k) => ctx.plans?.[k]?.name || capitalised(k);
    const stored = user?.plan || {};
    const key = planKeyOf(user);
    const paid = key !== "free";
    // A paid plan still saved on the account but no longer in force (it ran out, or was cancelled or marked expired).
    // Its end date is shown only when it is really past; a cancelled plan's future date is not when it ended.
    const endMs = stored.expires_at ? new Date(stored.expires_at).getTime() : NaN;
    const ended = !paid && PAID_KEYS.includes(stored.id)
        ? { key: stored.id, name: nameOf(stored.id), at: Number.isFinite(endMs) && endMs <= now ? iso(stored.expires_at) : null }
        : null;
    const end = Number(ctx.window?.end) || 0;
    const over = now >= end; // (the window ran out, or never started)
    const rawLimit = ctx.window?.limit;
    return {
        id: String(user._id),
        name: user.name || "",
        email: user.email || "",
        photo: user.profilePicture || user.platformLogo || null,
        staff: isStaff(user),
        blocked: user.ai_tokens?.is_ai_blocked === true,
        plan: {
            key,
            name: nameOf(key),
            how: !paid ? "free" : stored.billing === "granted" ? "gifted" : "bought",
            billing: stored.billing || "none",
            started_at: paid ? iso(stored.started_at) : null,
            expires_at: paid ? iso(stored.expires_at) : null,
            ended,
        },
        session: {
            used: over ? 0 : Number(user.ai_tokens?.used_this_week) || 0,
            limit: rawLimit === Infinity ? -1 : Number(rawLimit) || 0,
            resetAt: over ? null : iso(end),
        },
    };
}

const PEOPLE_FIELDS = "name email role profilePicture platformLogo plan organization_id createdAt ai_tokens.used_this_week ai_tokens.window_start ai_tokens.week_reset_date ai_tokens.custom_limits_enabled ai_tokens.free_weekly_limit ai_tokens.is_ai_blocked";
// The fallback session settings freeWindow reads while plans are off (and for Classgrid staff)
const WINDOW_CONFIG_FIELDS = "global_user_weekly_limit classgrid_custom_limits_enabled classgrid_user_weekly_limit global_token_reset_value global_token_reset_unit classgrid_token_reset_value classgrid_token_reset_unit";

// Everyone who finished signing up, one page at a time, newest first, with their plan in force and their session use.
// At most 100 rows a page; besides the page and its count there are two small reads (the session settings and the
// page's organizations, needed by freeWindow only while plans are off) and the cached plan table.
export const listPeople = async (req, res) => {
    const now = new Date();
    const query = req.query || {};
    const filter = peopleFilter(query, now);
    if (filter.error) return res.status(400).json({ success: false, error: filter.error });
    const { page, limit } = pageParams(query);
    try {
        const [users, total, config, table] = await Promise.all([
            User.find(filter).select(PEOPLE_FIELDS).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            User.countDocuments(filter),
            GlobalAiConfig.findOne({ key: "singleton" }).select(WINDOW_CONFIG_FIELDS).lean(),
            planTable(),
        ]);
        const orgIds = [...new Set(users.map((u) => (u.organization_id ? String(u.organization_id) : "")).filter(Boolean))];
        const orgs = orgIds.length ? await Organization.find({ _id: { $in: orgIds } }).select("ai_config").lean() : [];
        const orgById = new Map(orgs.map((o) => [String(o._id), o]));
        const nowMs = now.getTime();
        const data = await Promise.all(users.map(async (u) => {
            const orgId = u.organization_id || null;
            const w = await freeWindow(u, orgId ? orgById.get(String(orgId)) || null : null, config || {}, orgId);
            const end = tokenWindowEnd(u.ai_tokens, w.periodMs, nowMs);
            return personRow(u, { now: nowMs, plans: table?.plans || {}, window: { limit: w.limit, end } });
        }));
        res.json({ success: true, data, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)), asOf: now.toISOString() });
    } catch (error) {
        console.error("People list error:", error);
        res.status(500).json({ success: false, error: "Could not read the people list." });
    }
};

// ── The plans summary (GET /api/super-admin/ai-usage/plans/summary) ──

/** One aggregate over everyone who finished signing up: how many are on each plan in force, bought or gifted, how
 * many paid plans end within 7 days, and how many are Classgrid staff */
export function summaryPipeline(now = new Date()) {
    const soon = new Date(now.getTime() + 7 * DAY_MS);
    return [
        { $match: { $and: [finishedAccountsMatch(), { status: { $ne: "deleted" } }] } },
        {
            $project: {
                inForce: {
                    $and: [
                        { $in: [{ $ifNull: ["$plan.id", "free"] }, PAID_KEYS] },
                        { $in: [{ $ifNull: ["$plan.status", "active"] }, ["active", "past_due"]] },
                        { $or: [{ $eq: [{ $ifNull: ["$plan.expires_at", null] }, null] }, { $gt: ["$plan.expires_at", now] }] },
                    ],
                },
                id: "$plan.id",
                granted: { $eq: ["$plan.billing", "granted"] },
                exp: "$plan.expires_at",
                staff: { $or: [{ $eq: ["$role", "super_admin"] }, { $regexMatch: { input: { $ifNull: ["$email", ""] }, regex: /@classgrid\.in$/i } }] },
            },
        },
        {
            $group: {
                _id: { key: { $cond: ["$inForce", "$id", "free"] }, how: { $cond: ["$inForce", { $cond: ["$granted", "gifted", "bought"] }, "free"] } },
                people: { $sum: 1 },
                endingSoon: { $sum: { $cond: [{ $and: ["$inForce", { $ne: [{ $ifNull: ["$exp", null] }, null] }, { $lte: ["$exp", soon] }] }, 1, 0] } },
                staff: { $sum: { $cond: ["$staff", 1, 0] } },
            },
        },
    ];
}

/** The summary from the aggregate's groups and the plan rows (in their sort order). Every plan row is listed, even
 * with nobody on it; Free has no bought, gifted or ending counts. */
export function summaryFromGroups(groups = [], planRows = [], enabled = false) {
    const counts = new Map();
    const countFor = (key) => {
        if (!counts.has(key)) counts.set(key, { people: 0, bought: 0, gifted: 0, endingSoon: 0 });
        return counts.get(key);
    };
    let total = 0;
    let staff = 0;
    for (const g of groups) {
        const key = g?._id?.key || "free";
        const n = Number(g?.people) || 0;
        const c = countFor(key);
        c.people += n;
        if (key !== "free") {
            if (g._id?.how === "gifted") c.gifted += n;
            else if (g._id?.how === "bought") c.bought += n;
            c.endingSoon += Number(g?.endingSoon) || 0;
        }
        total += n;
        staff += Number(g?.staff) || 0;
    }
    const row = (key, r = {}) => {
        const c = counts.get(key) || { people: 0, bought: 0, gifted: 0, endingSoon: 0 };
        return {
            key, name: r.name || capitalised(key), sort: Number(r.sort) || 0, coming_soon: r.coming_soon === true, is_public: r.is_public !== false,
            people: c.people, bought: c.bought, gifted: c.gifted, endingSoon: c.endingSoon,
        };
    };
    const plans = planRows.map((r) => row(r.key, r));
    // (a plan someone is on but with no row in the table still counts, so the numbers add up to the total)
    for (const key of counts.keys()) if (!plans.some((p) => p.key === key)) plans.push(row(key));
    return { enabled: enabled === true, total, staff, plans };
}

export const getPlansSummary = async (req, res) => {
    try {
        const now = new Date();
        await ensurePlanRows(); // (as getPlans does, so every plan has its row)
        const [groups, planRows, config] = await Promise.all([
            User.aggregate(summaryPipeline(now)),
            PlanConfig.find({}).sort({ sort: 1 }).lean(),
            GlobalAiConfig.findOne({ key: "singleton" }).select("plans_enabled").lean(),
        ]);
        res.json({ success: true, ...summaryFromGroups(groups, planRows, config?.plans_enabled === true), asOf: now.toISOString() });
    } catch (error) {
        console.error("Plans summary error:", error);
        res.status(500).json({ success: false, error: "Could not read the plans summary." });
    }
};

// ── The person page's extra parts (getUserAiDetail) ──

/** One plan payment or top-up, as the person page lists it */
export function paymentRow(t) {
    const kind = t?.type === "plan" ? "plan" : "topup";
    return {
        id: String(t._id),
        at: iso(t.paymentTime || t.createdAt),
        kind,
        plan_key: kind === "plan" ? t.plan_key || null : null,
        plan_term: kind === "plan" && (t.plan_term === "month" || t.plan_term === "year") ? t.plan_term : null,
        amount_inr: Number(t.amount_inr) || 0,
        credits_added: Number(t.credits_added) || 0,
        status: t.status || "",
        period_start: kind === "plan" ? iso(t.plan_period_start) : null,
        period_end: kind === "plan" ? iso(t.plan_period_end) : null,
        payment_id: t.razorpay_payment_id || null,
    };
}

/** Answered WhatsApp calls in the last 24 hours, 7 days and 30 days, against the plan's limits (null = no limit;
 * with no plan, none of these limits apply). The fixed cap on answered calls a day in whatsapp-call.service.js is not
 * exported, so it is not shown. `times`: the calls' start times in ms. */
export function callCountsFrom(times = [], plan = null, now = Date.now()) {
    const count = (ms) => times.filter((t) => Number(t) > now - ms).length;
    return {
        day: { used: count(DAY_MS), limit: plan ? planNumber(plan.calls_per_day) : null },
        week: { used: count(WEEK_MS), limit: plan ? planNumber(plan.calls_per_week) : null },
        month: { used: count(MONTH_MS), limit: plan ? planNumber(plan.calls_per_month) : null },
    };
}

// Read only; null when the call records cannot be read, so the rest of the page still loads
async function callCountsFor(user, now = Date.now()) {
    try {
        const times = await callTimesSince(user._id, now - MONTH_MS);
        const plan = await planOf(user);
        return callCountsFrom(times, plan, now);
    } catch (e) {
        console.error("Call counts for the super admin failed:", e.message);
        return null;
    }
}

// The user's usage history for the super admin's user page (GET /api/super-admin/ai-usage/users/:userId/usage-history),
// the same answer as the user's own Usage page (?days=14&page=1&limit=15)
export const getUserUsageHistory = async (req, res) => {
    try {
        const { userId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ success: false, error: "Invalid user ID" });
        res.json(await usageHistoryFor(userId, req.query));
    } catch (error) {
        console.error("User usage history error:", error);
        res.status(500).json({ success: false, error: "Failed to read the usage history" });
    }
};

// PHASE 8: Super Admin AI Usage - Users Controller

export const listUsersInOrg = async (req, res) => {
    try {
        const { orgId } = req.params;
        let query = {};
        
        if (orgId === "classgrid") {
            query = { $or: [{ organization_id: null }, { organization_id: { $exists: false } }] };
        } else {
            if (!mongoose.Types.ObjectId.isValid(orgId)) {
                return res.status(400).json({ success: false, error: "Invalid organization ID" });
            }
            query = { organization_id: orgId };
        }

        // (the whole list comes in one answer, so the page's search filters it on the screen; "plan" for the plan column)
        const users = await User.find(query)
            .select("name email role ai_tokens organization_id profilePicture platformLogo avatarUrl picture photoUrl plan")
            .lean();

        const userIds = users.map(u => u._id);
        const latestTransactions = await AiCreditTransaction.aggregate([
            { $match: { userId: { $in: userIds }, type: { $in: ["topup", "grant"] }, status: "success" } },
            { $sort: { createdAt: -1 } },
            { $group: { _id: "$userId", latestTopUp: { $first: "$credits_added" }, date: { $first: "$createdAt" } } }
        ]);

        const topUpMap = {};
        latestTransactions.forEach(t => {
            topUpMap[t._id.toString()] = { amount: t.latestTopUp, date: t.date };
        });

        // Group users by role
        const roles = {};
        users.forEach(user => {
            const role = user.role || "unknown";
            if (!roles[role]) {
                roles[role] = {
                    roleName: role,
                    userCount: 0,
                    totalUsage: 0,
                    users: []
                };
            }
            roles[role].userCount += 1;
            roles[role].totalUsage += (user.ai_tokens?.total_ai_tokens_used || 0);
            
            const finalProfilePicture = user.profilePicture || user.platformLogo || user.photoUrl || user.avatarUrl || user.picture || null;
            
            roles[role].users.push({
                id: user._id,
                name: user.name,
                email: user.email,
                role: role,
                profilePicture: finalProfilePicture,
                totalUsage: user.ai_tokens?.total_ai_tokens_used || 0,
                isBlocked: user.ai_tokens?.is_ai_blocked || false,
                plan: user.plan && user.plan.id ? user.plan : { id: "free", status: "active", billing: "none" },
                planKey: planKeyOf(user), // the plan in force now (an ended or cancelled plan is Free)
                recentTopUp: topUpMap[user._id.toString()] ? topUpMap[user._id.toString()].amount : null
            });
        });

        res.status(200).json({ success: true, data: Object.values(roles) });

    } catch (error) {
        console.error("List Users in Org Error:", error);
        res.status(500).json({ success: false, error: "Failed to list users" });
    }
};

export const getUserAiDetail = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, error: "Invalid user ID" });
        }

        const user = await User.findById(userId)
            .select("name email role ai_tokens organization_id profilePicture platformLogo createdAt lastLoginAt ai_image_free_weekly_used ai_image_reset_date plan student_verification")
            .populate("organization_id", "name")
            .lean();

        if (!user) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        const topupHistory = await AiCreditTransaction.find({ userId: userId, type: "topup" })
            .sort({ createdAt: -1 })
            .lean();

        const promotionHistory = await AiCreditTransaction.find({ 
            userId: userId, 
            type: { $in: ["grant", "pause", "resume", "extend", "revoke"] } 
        })
            .sort({ createdAt: -1 })
            .lean();

        let totalActive = 0;
        promotionHistory.forEach(g => {
            const s = (g.status || '').toLowerCase();
            if (g.type === "grant" && (s === "success" || s === "active" || s === "pending")) {
                totalActive += (g.credits_added || 0);
            }
        });
        
        const used = (user.ai_tokens?.total_promotion_credits_granted || 0) - (user.ai_tokens?.promotion_credits_balance || 0);
        const correctedBalance = Math.max(0, totalActive - Math.max(0, used));
        
        if (
            user.ai_tokens?.promotion_credits_balance !== correctedBalance || 
            user.ai_tokens?.total_promotion_credits_granted !== totalActive
        ) {
            await User.findByIdAndUpdate(userId, {
                $set: {
                    "ai_tokens.promotion_credits_balance": correctedBalance,
                    "ai_tokens.total_promotion_credits_granted": totalActive
                }
            });
            if (!user.ai_tokens) user.ai_tokens = {};
            user.ai_tokens.promotion_credits_balance = correctedBalance;
            user.ai_tokens.total_promotion_credits_granted = totalActive;
        }

        let totalChats = 0;
        if (user.email) {
            const { count, error: countError } = await supabase
                .from('ai_chat_sessions')
                .select('*', { count: 'exact', head: true })
                .eq('user_email', user.email);
            
            if (!countError) totalChats = count || 0;
        }

        let orgPool = null;
        let effectiveFreeLimit = 100000;
        
        try {
            const GlobalAiConfig = (await import("../../models/GlobalAiConfig.js")).default;
            const globalConfig = await GlobalAiConfig.findOne({ key: "singleton" }).select("global_user_weekly_limit classgrid_custom_limits_enabled classgrid_user_weekly_limit").lean() || {};
            
            effectiveFreeLimit = globalConfig.global_user_weekly_limit || 0;

            if (user.organization_id && user.organization_id._id) {
                const Organization = (await import("../../models/Organization.js")).default;
                const org = await Organization.findById(user.organization_id._id).select("ai_config").lean();
                if (org && org.ai_config) {
                    if (org.ai_config.custom_limits_enabled && org.ai_config.free_weekly_limit_per_user !== undefined && org.ai_config.free_weekly_limit_per_user !== null) {
                        effectiveFreeLimit = org.ai_config.free_weekly_limit_per_user;
                    }
                    
                    if (user.role === 'org_admin' || user.role === 'Owner') {
                        orgPool = {
                            limit: org.ai_config.pro_pool_limit || 0,
                            used: org.ai_config.pro_pool_used || 0
                        };
                    }
                }
            } else {
                if (globalConfig.classgrid_custom_limits_enabled && globalConfig.classgrid_user_weekly_limit !== undefined && globalConfig.classgrid_user_weekly_limit !== null) {
                    effectiveFreeLimit = globalConfig.classgrid_user_weekly_limit;
                }
            }

        } catch (e) {
            console.error("Error fetching configs:", e);
        }

        // The person's own session limit set by hand, read before the line below overwrites free_weekly_limit with the
        // effective limit. It wins over the plan's session limit (freeWindow), so the page says so.
        const customWindowLimit = user.ai_tokens?.custom_limits_enabled === true && user.ai_tokens.free_weekly_limit !== undefined && user.ai_tokens.free_weekly_limit !== null
            ? Number(user.ai_tokens.free_weekly_limit)
            : null;

        if (user.ai_tokens) {
            if (user.ai_tokens.custom_limits_enabled && user.ai_tokens.free_weekly_limit !== undefined && user.ai_tokens.free_weekly_limit !== null) {
                effectiveFreeLimit = user.ai_tokens.free_weekly_limit;
            }
            user.ai_tokens.free_weekly_limit = effectiveFreeLimit;
        }

        let limitTimers = null;
        try {
            const GlobalAiConfig = (await import("../../models/GlobalAiConfig.js")).default;
            const Organization = (await import("../../models/Organization.js")).default;
            const { resolveFeatureLimit, resolveResetPeriod, checkWhatsappLimit } = await import("../../services/ai-feature-limits.js");
            const { tokenWindowEnd } = await import("../../services/ai-credits.service.js");
            const timerConfig = await GlobalAiConfig.findOne({ key: "singleton" }).lean();
            const timerOrgId = user.organization_id?._id || null;
            const timerOrg = timerOrgId ? await Organization.findById(timerOrgId).select("ai_config").lean() : null;
            const nowMs = Date.now();
            const timer = (used, limit, savedDate, periodMs) => {
                const savedMs = savedDate ? new Date(savedDate).getTime() : 0;
                if (!savedMs || nowMs >= savedMs || savedMs - nowMs > periodMs) return { used: 0, limit, resetAt: null };
                return { used, limit, resetAt: new Date(Math.min(savedMs, nowMs + periodMs)) };
            };
            const wa = await checkWhatsappLimit({ _id: user._id, organization_id: timerOrgId });
            limitTimers = {
                tokens: (() => {
                    const periodMs = resolveResetPeriod("tokens", timerOrg, timerConfig, timerOrgId).ms;
                    const endMs = tokenWindowEnd(user.ai_tokens, periodMs, nowMs);
                    return nowMs >= endMs ? { used: 0, limit: effectiveFreeLimit, resetAt: null } : { used: user.ai_tokens?.used_this_week || 0, limit: effectiveFreeLimit, resetAt: new Date(endMs) };
                })(),
                image: timer(user.ai_image_free_weekly_used || 0, resolveFeatureLimit("image", timerOrg, timerConfig, timerOrgId), user.ai_image_reset_date, resolveResetPeriod("image", timerOrg, timerConfig, timerOrgId).ms),
                whatsapp: { used: wa.used, limit: wa.limit, resetAt: wa.resetAt },
            };
        } catch (e) {
            console.error("Error fetching limit timers:", e);
        }

        // The plan and every usage bar exactly as the user sees them (Settings > Usage), the plan gifts with reasons,
        // the plan payments and top-ups (newest 50, by the {userId, createdAt} index) and the WhatsApp calls made
        const [overview, planHistory, payments, callCounts] = await Promise.all([
            planOverviewFor(userId).catch((e) => { console.error("Plan overview for the super admin failed:", e.message); return null; }),
            planHistoryFor(userId, user.plan).catch((e) => { console.error("Plan history failed:", e.message); return []; }),
            AiCreditTransaction.find({ userId, type: { $in: ["plan", "topup"] } })
                .sort({ createdAt: -1 }).limit(50)
                .select("type plan_key plan_term amount_inr credits_added status plan_period_start plan_period_end razorpay_payment_id paymentTime createdAt")
                .lean()
                .then((rows) => rows.map(paymentRow))
                .catch((e) => { console.error("Payments for the super admin failed:", e.message); return []; }),
            callCountsFor(user),
        ]);

        res.status(200).json({
            success: true,
            data: {
                id: user._id,
                overview,
                planHistory,
                limitTimers,
                name: user.name,
                email: user.email,
                role: user.role,
                // The plan (the Plan card) and the student verification (never the code itself)
                plan: user.plan && user.plan.id ? user.plan : { id: "free", status: "active", billing: "none" },
                student: user.student_verification?.verified_at ? {
                    email: user.student_verification.email || null, method: user.student_verification.method || "email",
                    verified_at: user.student_verification.verified_at, expires_at: user.student_verification.expires_at || null,
                } : null,
                profilePicture: user.profilePicture || null,
                // Added for the Plans & Usage person page (the fields above stay for the older parts of the site)
                photo: user.profilePicture || user.platformLogo || null,
                staff: isStaff(user),
                planKey: planKeyOf(user),
                joinedAt: iso(user.createdAt),
                lastLoginAt: iso(user.lastLoginAt),
                customWindowLimit,
                payments,
                callCounts,
                orgName: user.organization_id?.name || "Classgrid (Platform Team)",
                isBlocked: user.ai_tokens?.is_ai_blocked || false,
                totalUsage: user.ai_tokens?.total_ai_tokens_used || 0,
                balance: user.ai_tokens?.ai_credits_balance || 0,
                ai_tokens: user.ai_tokens,
                orgPool: orgPool,
                totalChats,
                topupHistory: topupHistory.map(t => ({
                    id: t._id,
                    amount_inr: t.amount_inr,
                    credits_added: t.credits_added,
                    status: t.status,
                    date: t.createdAt
                })),
                promotionHistory: (function() {
                    const history = promotionHistory.map(t => ({
                        id: t._id,
                        type: t.type,
                        credits_added: t.credits_added,
                        status: t.status,
                        date: t.createdAt,
                        metadata: t.metadata || {}
                    }));
                    
                    // If they have granted credits but no 'grant' transaction in the history yet (e.g. legacy data)
                    if (user.ai_tokens?.total_promotion_credits_granted > 0 && !history.some(h => h.type === 'grant')) {
                        history.push({
                            id: 'legacy_grant',
                            type: 'grant',
                            credits_added: user.ai_tokens.total_promotion_credits_granted,
                            status: 'success',
                            date: user.ai_tokens.promotion_credits_start_date || new Date().toISOString(),
                            metadata: {}
                        });
                        history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    }
                    return history;
                })()
            }
        });
    } catch (error) {
        console.error("Get User AI Detail Error:", error);
        res.status(500).json({ success: false, error: "Failed to fetch user details" });
    }
};
