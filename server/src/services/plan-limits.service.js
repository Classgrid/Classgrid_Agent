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

/** The plan row for a user (null while plans are off, and null for Classgrid staff: super admins and @classgrid.in
 * accounts keep the dashboard's global limits, no plan gate applies to them) */
export async function planOf(user) {
    const t = await planTable();
    if (!t.enabled) return null;
    if (user?.role === "super_admin" || String(user?.email || "").toLowerCase().endsWith("@classgrid.in")) return null;
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

// ── Uploads (owner, 2026-11-14: the plan's upload limits are enforced) ──
// Every upload (the chat's attach button and the Library page) asks this first. Plans off, or Classgrid staff: no limit.
// Checks, in order: the largest file (upload_max_mb), the files uploaded in the plan's session window
// (uploads_per_window, counted from the Library's uploaded files) and the Library's storage (library_storage_mb, every
// file in the Library, uploaded or made by the AI, as Settings > Usage counts it). -1 = unlimited, 0 = not included.
const UNIT_MS = { minute: 60 * 1000, hour: 60 * 60 * 1000, day: 24 * 60 * 60 * 1000, week: 7 * 24 * 60 * 60 * 1000, month: 30 * 24 * 60 * 60 * 1000 };
const mbText = (mb) => (mb >= 1024 ? `${Math.round((mb / 1024) * 10) / 10} GB` : `${Math.round(mb)} MB`);
function untilText(ms) {
    const m = Math.max(1, Math.round(ms / 60000));
    if (m < 60) return `in ${m} min`;
    const h = Math.floor(m / 60);
    return h < 48 ? `in ${h} h ${m % 60} min` : `in ${Math.round(h / 24)} days`;
}
export async function checkUploadAllowed(user, sizeBytes) {
    const plan = await planOf(user).catch(() => null);
    if (!plan) return { ok: true };
    const size = Math.max(0, Number(sizeBytes) || 0);
    const refuse = (error) => ({ ok: false, status: 413, error, code: "plan_limit", plan: plan.key });
    // 1. One file's size
    const maxMb = Number(plan.upload_max_mb);
    if (!isUnlimited(maxMb) && Number.isFinite(maxMb) && maxMb >= 0 && size > maxMb * 1024 * 1024) {
        return refuse(`This file is bigger than the ${plan.upload_max_mb} MB per upload of your ${plan.name} plan. Upgrade your plan, or pick a smaller file.`);
    }
    const { default: AiLibraryFile } = await import("../models/AiLibraryFile.js");
    const userId = user?._id;
    if (!userId) return { ok: true };
    // 2. Files uploaded in the plan's session window
    const perWindow = Number(plan.uploads_per_window);
    if (!isUnlimited(perWindow) && Number.isFinite(perWindow) && perWindow >= 0) {
        const windowMs = Math.max(1, Number(plan.window_reset_value) || 5) * (UNIT_MS[plan.window_reset_unit] || UNIT_MS.hour);
        const since = new Date(Date.now() - windowMs);
        const recent = await AiLibraryFile.find({ user_id: userId, source: "uploaded", created_at: { $gte: since } })
            .sort({ created_at: 1 }).limit(Math.max(1, perWindow)).select("created_at").lean().catch(() => []);
        const recentCount = await AiLibraryFile.countDocuments({ user_id: userId, source: "uploaded", created_at: { $gte: since } }).catch(() => 0);
        if (recentCount >= perWindow) {
            if (perWindow === 0) return refuse(`Uploading files is not part of your ${plan.name} plan. Upgrade your plan to upload files.`);
            const oldest = recent[0]?.created_at ? new Date(recent[0].created_at).getTime() : Date.now();
            const period = `${Number(plan.window_reset_value) || 5} ${plan.window_reset_unit || "hour"}${(Number(plan.window_reset_value) || 5) === 1 ? "" : "s"}`;
            return refuse(`You can upload ${perWindow} file${perWindow === 1 ? "" : "s"} every ${period} on your ${plan.name} plan. You can upload again ${untilText(oldest + windowMs - Date.now())}, or upgrade your plan for more.`);
        }
    }
    // 3. The Library's storage
    const capMb = Number(plan.library_storage_mb);
    if (!isUnlimited(capMb) && Number.isFinite(capMb) && capMb >= 0) {
        const [row] = await AiLibraryFile.aggregate([{ $match: { user_id: userId } }, { $group: { _id: null, bytes: { $sum: "$size_bytes" } } }]).catch(() => []);
        const usedBytes = row?.bytes || 0;
        if (usedBytes + size > capMb * 1024 * 1024) {
            return refuse(`Your Library is full: ${mbText(usedBytes / (1024 * 1024))} of ${mbText(capMb)} on your ${plan.name} plan. Delete files in the Library, or upgrade your plan for more space.`);
        }
    }
    return { ok: true };
}
