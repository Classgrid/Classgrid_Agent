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

// ── Cloud projects: the plan's projects_max (2026-11-21, owner: "fix all") ──
// The plan's number of projects was checked in one place only (POST /api/ide/projects). A folder project that became a
// cloud project ("Also use in the cloud", Mastero) and the projects WhatsApp tasks and calls make were never counted,
// so a person at their limit could still get more. The rule now lives here and every one of those paths asks it.
// What is counted: the person's own projects that are not a folder on their own computer (location is not "local").
// No limit: plans switched off, Classgrid staff (planOf gives no plan row) and a plan with projects_max -1.
// A database error is thrown to the caller, never read as "there is room": nothing is made when the count can't be read.

/** The words of every refusal (the sentence POST /api/ide/projects has always shown) */
export const cloudProjectLimitText = (plan) => `Your ${plan.name} plan allows ${plan.projects_max} project${Number(plan.projects_max) === 1 ? "" : "s"}. Upgrade your plan to make more, or work in a folder on your own computer.`;

/** The refusal a route sends: res.status(r.status).json(r.body). Same status, words and code everywhere. */
export const cloudProjectRefusal = (plan) => ({ status: 403, body: { error: cloudProjectLimitText(plan), code: "plan_limit", plan: plan.key } });

/** The same refusal as one plain sentence for the AI (WhatsApp tasks and calls), so it tells the person */
export const cloudProjectLimitForAi = (room) => {
    const limit = Number(room?.limit);
    return `No new project was made: the person's ${room?.plan?.name || "current"} plan allows ${limit} cloud project${limit === 1 ? "" : "s"} and they already have ${room?.have}. Tell them their plan's project limit is reached.`;
};

/**
 * Is there room for one more cloud project on this person's plan?
 * Returns { ok, limit, have, plan }: limit and have are null when nothing limits the person.
 * made: true asks the question AFTER a project was made or converted: is the person still inside the limit with it?
 */
export async function cloudProjectRoom(user, { made = false } = {}) {
    const plan = await planOf(user);
    if (!plan || isUnlimited(plan.projects_max)) return { ok: true, limit: null, have: null, plan: plan || null };
    if (!user?._id) throw new Error("the account whose projects are counted is not known");
    const limit = Number(plan.projects_max);
    const { default: IdeProject } = await import("../models/IdeProject.js");
    // (read from the main database server, so a project saved a moment ago is always in the count)
    const have = await IdeProject.countDocuments({ owner: user._id, location: { $ne: "local" } }).read("primary");
    // (the same comparison the route always made: at the limit there is no room for one more)
    return { ok: made ? !(have > limit) : !(have >= limit), limit, have, plan };
}

/**
 * Called right after a cloud project was made (or a folder project became one). Two requests sent in the same moment
 * can both pass cloudProjectRoom, because each counted before the other one saved. So the projects are counted once
 * more with the new one in: when the person is now over the limit, `undo` takes this one back and the answer is
 * { ok: false }. Why this never leaves a person over the limit: of the projects that stay, the one saved last counted
 * after all the others were saved, so it saw them all and would have been taken back. (When two arrive together for
 * the last free place, both may be taken back; the person then tries once more.)
 * `undo`: an async function that removes the project just made, or turns the converted one back.
 */
export async function confirmCloudProject(user, undo) {
    let after;
    try {
        after = await cloudProjectRoom(user, { made: true });
    } catch (e) {
        // The count can't be read: the project is not kept (nothing is ever made without the limit being checked)
        await Promise.resolve().then(() => undo()).catch((err) => console.error("[plans] a project made without its count could not be taken back:", err.message));
        throw e;
    }
    if (after.ok) return after;
    await undo();
    return { ...after, have: after.have - 1 };
}

/**
 * Makes one cloud project for this person inside their plan's limit: asks for room, makes it, then counts again
 * (confirmCloudProject). Returns { ok: true, project, ... } or { ok: false, project: null, limit, have, plan }.
 * `fields`: the project's own fields (name, logo); the owner is always this person and it is never a folder project.
 */
export async function makeCloudProject(user, fields = {}) {
    const room = await cloudProjectRoom(user);
    if (!room.ok) return { ...room, project: null };
    const { default: IdeProject } = await import("../models/IdeProject.js");
    const project = await IdeProject.create({ ...fields, owner: user._id, location: "cloud", localPath: null });
    const after = await confirmCloudProject(user, () => IdeProject.deleteOne({ _id: project._id }));
    return { ...after, project: after.ok ? project : null };
}

// ── Pictures and files in one message (owner, 2026-11-19: "6 for Free, 12 for Pro, 15 for Max; not hard-coded, in the
// super admin's plans so we can adjust it") ──
/** Used when a plan row has no value yet (the schema's default). */
export const DEFAULT_FILES_PER_MESSAGE = 6;
/**
 * How many pictures and files one message may carry: the user's plan's files_per_message. With no plan row (plans
 * switched off, Classgrid staff) no plan limits them, so they get the most any plan allows.
 */
export async function filesPerMessage(user) {
    const valueOf = (p) => { const n = Math.floor(Number(p?.files_per_message)); return Number.isFinite(n) && n > 0 ? n : null; };
    const plan = await planOf(user);
    if (plan) return valueOf(plan) ?? DEFAULT_FILES_PER_MESSAGE;
    const all = Object.values((await planTable()).plans || {}).map(valueOf).filter(Boolean);
    return all.length ? Math.max(...all) : DEFAULT_FILES_PER_MESSAGE;
}

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
// ── The Library's storage, as every screen shows it (owner, 2026-11-19: "every plan shows the same 600 MB") ──
// One answer for the Library page, Settings > Storage and the phone app: used = every file in the Library (uploaded or
// made by the AI, the same sum the upload check and Settings > Usage use), max = the user's plan (library_storage_mb).
// Plans off: the old per-user row (600 MB unless the super admin changed it). Classgrid staff, or a plan with -1:
// unlimited (max_bytes is then 1 TB, so older phone apps that need a number above 0 still show something sensible).
const UNLIMITED_BYTES = 1024 * 1024 * 1024 * 1024;
export async function libraryStorageFor(user) {
    const { default: AiLibraryFile } = await import("../models/AiLibraryFile.js");
    const userId = user?._id;
    const rows = userId
        ? await AiLibraryFile.aggregate([{ $match: { user_id: userId } }, { $group: { _id: "$source", bytes: { $sum: "$size_bytes" }, count: { $sum: 1 } } }]).catch(() => [])
        : [];
    // (a file with no source is an upload: the model's default)
    const sum = (keep) => rows.filter(keep).reduce((a, r) => ({ bytes: a.bytes + (r.bytes || 0), count: a.count + (r.count || 0) }), { bytes: 0, count: 0 });
    const generated = sum((r) => r._id === "generated");
    const uploaded = sum((r) => r._id !== "generated");
    const usedBytes = uploaded.bytes + generated.bytes;

    const [plan, enabled] = await Promise.all([planOf(user).catch(() => null), plansEnabled().catch(() => false)]);
    let maxBytes;
    let unlimited = false;
    if (plan) {
        const capMb = Number(plan.library_storage_mb);
        if (isUnlimited(capMb)) unlimited = true;
        else maxBytes = Math.max(0, Number.isFinite(capMb) ? capMb : 600) * 1024 * 1024;
    } else if (enabled) {
        unlimited = true; // (plans on, no plan row: Classgrid staff, no plan gate applies to them)
    } else {
        const { default: UserStorageQuota } = await import("../models/UserStorageQuota.js");
        const row = userId ? await UserStorageQuota.findOne({ user_id: userId }).select("max_bytes").lean().catch(() => null) : null;
        maxBytes = Number(row?.max_bytes) > 0 ? Number(row.max_bytes) : 629145600;
    }
    if (unlimited) maxBytes = UNLIMITED_BYTES;
    return {
        used_bytes: usedBytes,
        max_bytes: maxBytes,
        percentage: unlimited || !maxBytes ? 0 : Math.min(100, (usedBytes / maxBytes) * 100),
        unlimited,
        plan: plan ? { key: plan.key, name: plan.name } : null,
        uploaded,
        generated,
    };
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
