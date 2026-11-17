// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
// The plan's coding agent runs per month (coding_runs_per_month) and, for runs with a Claude model, the premium runs
// per month (premium_runs_per_month). Until 2026-11-17 both were only shown on the plan card and stopped nobody.
//
// One run = one message sent in a Project Mode chat (a cloud project or a folder on the person's own computer).
// A premium run = a run where the person picked a Claude model by name.
// Counted per account (the user id, so every email of an account shares one count) by India month, in Redis with
// the other plan counters (plan-usage.service.js keys). -1 = no limit, 0 = not included in the plan.
// A run is taken with one atomic INCR and given back when it is over the limit, so two messages sent at the same
// moment can never both pass on the last run. A count that cannot be read never blocks (the same rule as the other
// counters): Redis being down must not stop every project.
import redis from "../config/redis.js";
import { monthKey, nextMonthText } from "./plan-usage.service.js";

const KEY = (userId, kind) => `plan:${kind}:${userId}:${monthKey()}`;
const KEEP_S = 40 * 24 * 3600;

const capOf = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : -1;
};

/** Takes one from a monthly count. Returns { ok, used } (ok false = the count was already at the limit). */
async function take(userId, kind, cap) {
    const key = KEY(userId, kind);
    const used = await redis.incr(key);
    if (used === 1) await redis.expire(key, KEEP_S);
    if (used > cap) {
        await redis.decr(key);
        return { ok: false, used: used - 1 };
    }
    return { ok: true, used };
}

/** Gives back one taken by `take` (the run was refused for another reason) */
const giveBack = (userId, kind) => redis.decr(KEY(userId, kind)).catch(() => {});

/**
 * May this account start one more coding agent run now? When it may, the run is counted here.
 * plan: the person's plan row (null = plans off or a staff account: no limit).
 * Returns { allowed: true } or { allowed: false, code, error }.
 */
export async function takeCodingRun(userId, plan, { premium = false } = {}) {
    if (!plan || !userId) return { allowed: true };
    const id = String(userId);
    const runs = capOf(plan.coding_runs_per_month);
    const premiumRuns = capOf(plan.premium_runs_per_month);
    try {
        if (runs === 0) {
            return { allowed: false, code: "coding_runs_not_included", error: `Projects are not included in the ${plan.name} plan. Upgrade your plan to use the coding agent in a project.` };
        }
        if (premium && premiumRuns === 0) {
            return { allowed: false, code: "premium_runs_not_included", error: `Claude models can't be used in projects on the ${plan.name} plan. Pick another model, or upgrade your plan.` };
        }
        let tookRun = false;
        if (runs > 0) {
            const t = await take(id, "codingrun", runs);
            if (!t.ok) {
                return { allowed: false, code: "coding_runs_cap_reached", error: `You've used the ${runs} coding agent runs a month of your ${plan.name} plan. They refill on ${nextMonthText()}. Upgrade your plan for more.` };
            }
            tookRun = true;
        }
        if (premium && premiumRuns > 0) {
            const t = await take(id, "premiumrun", premiumRuns);
            if (!t.ok) {
                if (tookRun) await giveBack(id, "codingrun");
                return { allowed: false, code: "premium_runs_cap_reached", error: `You've used the ${premiumRuns} project runs with Claude a month of your ${plan.name} plan. They refill on ${nextMonthText()}. Pick another model, or upgrade your plan.` };
            }
        }
        return { allowed: true };
    } catch (e) {
        console.warn("[coding runs] could not count:", e.message);
        return { allowed: true };
    }
}

/** How many runs the account has used this month, for the Usage page: { runs, premium } */
export async function codingRunsUsed(userId) {
    try {
        const id = String(userId);
        const [runs, premium] = await redis.mget(KEY(id, "codingrun"), KEY(id, "premiumrun"));
        return { runs: Number(runs) || 0, premium: Number(premium) || 0 };
    } catch {
        return { runs: 0, premium: 0 };
    }
}
