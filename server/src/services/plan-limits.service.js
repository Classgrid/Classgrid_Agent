// Plans (owner, 2026-11-14): which plan a user is on and what that plan allows. Everything comes from the PlanConfig
// rows the super admin edits; this module only reads them (cached for a few seconds) and applies the switch
// GlobalAiConfig.plans_enabled: while it is off, nothing here changes any limit.
import GlobalAiConfig from "../models/GlobalAiConfig.js";
import PlanConfig, { DEFAULT_PLANS, PLAN_KEYS, ensurePlanRows } from "../models/PlanConfig.js";

const CACHE_MS = 15000;
let cache = { at: 0, enabled: false, plans: {} };

/** { enabled, plans: { free, pro, max, enterprise } } (plain objects) */
export async function planTable() {
    if (Date.now() - cache.at < CACHE_MS) return cache;
    try {
        const [config, rows] = await Promise.all([
            GlobalAiConfig.findOne({ key: "singleton" }).select("plans_enabled").lean(),
            PlanConfig.find({}).lean(),
        ]);
        let list = rows;
        if (list.length < PLAN_KEYS.length) { await ensurePlanRows(); list = await PlanConfig.find({}).lean(); }
        const plans = {};
        for (const p of list) plans[p.key] = p;
        for (const d of DEFAULT_PLANS) if (!plans[d.key]) plans[d.key] = d; // (never without a row, even if Mongo hiccups)
        cache = { at: Date.now(), enabled: config?.plans_enabled === true, plans };
    } catch (e) {
        console.warn("[plans] could not read the plan table:", e.message);
        cache = { ...cache, at: Date.now() };
    }
    return cache;
}
export const forgetPlans = () => { cache = { ...cache, at: 0 }; };
export const plansEnabled = async () => (await planTable()).enabled;

/** The plan key a user is on: their plan while it is active and not expired, else "free" */
export function planKeyOf(user) {
    const p = user?.plan;
    if (!p?.id || !PLAN_KEYS.includes(p.id) || p.id === "free") return "free";
    if (p.status && !["active", "past_due"].includes(p.status)) return "free";
    if (p.expires_at && new Date(p.expires_at).getTime() < Date.now()) return "free";
    return p.id;
}

/** The plan row for a user (null while plans are off) */
export async function planOf(user) {
    const t = await planTable();
    if (!t.enabled) return null;
    return t.plans[planKeyOf(user)] || t.plans.free || null;
}

/** One limit of the user's plan, or `fallback` while plans are off. -1 means unlimited. */
export async function planLimit(user, field, fallback = undefined) {
    const plan = await planOf(user);
    if (!plan) return fallback;
    const v = plan[field];
    return v === undefined || v === null ? fallback : v;
}

export const isUnlimited = (v) => Number(v) === -1;
