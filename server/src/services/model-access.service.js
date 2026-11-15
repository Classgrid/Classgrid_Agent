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
// Premium model access: Claude Fable (the most expensive family: Fable 5.1, Fable 5.2 and later ones) comes with the
// plan only (the plans that give Fable a share: Pro and Max today). There is no top-up unlock any more (owner,
// 2026-11-15: "Fable comes with the Pro and Max plans, not with Rs 299"). Super admins and Classgrid team accounts
// (@classgrid.in) can always use it.
import GlobalAiConfig from "../models/GlobalAiConfig.js";

// Models the super admin turned off in Model manager (AI Usage & Credits -> Models). Nobody can use them,
// staff included. Read from the global AI settings and kept for 30 seconds.
let disabledCache = { list: [], at: 0 };
export async function disabledModels() {
    if (Date.now() - disabledCache.at < 30 * 1000) return disabledCache.list;
    const cfg = await GlobalAiConfig.findOne({ key: "singleton" }).select("disabled_models").lean().catch(() => null);
    disabledCache = { list: Array.isArray(cfg?.disabled_models) ? cfg.disabled_models : [], at: Date.now() };
    return disabledCache.list;
}
export function forgetDisabledModels() { disabledCache.at = 0; }

export const FABLE_MODEL = "claude-fable-5-2"; // the newest Fable (5.2 since 2026-11-14: $8/$40 instead of $10/$50)

// Claude Fable is a family, not one model (owner, 2026-11-15): Fable 5.1 and Fable 5.2 are both picked by name and
// share one plan share and one weekly Fable count (Fable 5.5 and later join the same family)
export const isFableModel = (model) => typeof model === "string" && /^claude-fable-/.test(model);

// Whether a plan's models_allowed lets a person pick a model (empty = every model). A plan that lists any Fable
// includes the whole Fable family, so a plan saved before a new Fable came out includes it too.
export function planAllowsModel(modelsAllowed, model) {
    const list = Array.isArray(modelsAllowed) ? modelsAllowed : [];
    if (!list.length || list.includes(model)) return true;
    return isFableModel(model) && list.some(isFableModel);
}

function isExempt(user) {
    return user?.role === "super_admin" || String(user?.email || "").toLowerCase().endsWith("@classgrid.in");
}

/**
 * Fable outside the plan: only the exempt accounts. A plan that gives Fable a share unlocks it (GET
 * /api/ai/model-access and POST /api/ai/ask check the plan). toppedUpInr / requiredInr stay 0 for older apps.
 * @returns {{ unlocked: boolean, exempt: boolean, toppedUpInr: number, requiredInr: number }}
 */
export async function fableAccess(user) {
    const exempt = isExempt(user);
    return { unlocked: exempt, exempt, toppedUpInr: 0, requiredInr: 0 };
}
