// Per-user counters for the plan limits that are not credits: voice replies and voice input (per day, India time),
// and cloud computer time (per month). The count is kept in MongoDB (models/PlanCount.js); Redis holds a copy for two
// minutes so a check does not wait for the database. Until 2026-11-21 the counts were in Redis alone and "a count
// that cannot be read never blocks anyone": with Redis away, or after it lost its data, these limits stopped nobody.
// Now a count Redis cannot give is read from the database.
import redis from "../config/redis.js";
import PlanCount from "../models/PlanCount.js";

const IST = "Asia/Kolkata";
export const dayKey = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: IST, year: "numeric", month: "2-digit", day: "2-digit" }).format(d); // YYYY-MM-DD
export const monthKey = (d = new Date()) => dayKey(d).slice(0, 7);

const keyDay = (userId, kind) => `plan:${kind}:${userId}:${dayKey()}`;
const keyMonth = (userId, kind) => `plan:${kind}:${userId}:${monthKey()}`;

const COPY_SECONDS = 120; // how long Redis keeps its copy of a count
const keepCopy = (key, value) => { try { Promise.resolve(redis.set(key, String(value), "EX", COPY_SECONDS)).catch(() => {}); } catch { /* Redis is away */ } };

// The count: Redis' copy when it has one, else the database's (and Redis gets a copy again)
async function readCount(key) {
    try {
        const kept = await redis.get(key);
        if (kept !== null && kept !== undefined) return Number(kept) || 0;
    } catch { /* Redis is away: the database has the count */ }
    try {
        const row = await PlanCount.findOne({ key }).select("value").lean();
        const value = Number(row?.value) || 0;
        keepCopy(key, value);
        return value;
    } catch (e) {
        // (the database is away too: nothing of the app works then; said loudly, not hidden)
        console.error("[plan-usage] a count could not be read from Redis or the database:", e.message);
        return 0;
    }
}
// Adds to the count in the database, then refreshes Redis' copy with the new number
async function addCount(key, n, keepSeconds) {
    const by = Number(n) || 0;
    if (!by) return;
    try {
        if (!(await PlanCount.exists({ key }))) {
            // (a count kept only in Redis before 2026-11-21 is carried over the first time it is added to)
            let before = 0;
            try { before = Number(await redis.get(key)) || 0; } catch { /* Redis is away */ }
            // (two answers ending at the same moment may both get here: the second finds the document made)
            await PlanCount.updateOne({ key }, { $setOnInsert: { value: before, expiresAt: new Date(Date.now() + keepSeconds * 1000) } }, { upsert: true }).catch((e) => { if (e?.code !== 11000) throw e; });
        }
        const row = await PlanCount.findOneAndUpdate({ key }, { $inc: { value: by } }, { returnDocument: "after" }).lean();
        keepCopy(key, Number(row?.value) || 0);
    } catch (e) {
        console.warn("[plan-usage] could not count:", e.message);
    }
}

export async function usedToday(userId, kind) {
    return readCount(keyDay(userId, kind));
}
export async function addToday(userId, kind, n = 1) {
    return addCount(keyDay(userId, kind), n, 3 * 24 * 3600);
}
export async function usedThisMonth(userId, kind) {
    return readCount(keyMonth(userId, kind));
}
export async function addThisMonth(userId, kind, n = 1) {
    return addCount(keyMonth(userId, kind), n, 40 * 24 * 3600);
}

/** "tomorrow" / "next month" as the user reads it (India time), for the limit messages */
export function nextDayText() {
    const d = new Date(); d.setUTCDate(d.getUTCDate() + 1);
    return new Intl.DateTimeFormat("en-IN", { timeZone: IST, day: "numeric", month: "short" }).format(d) + " at 12:00 am (India time)";
}
export function nextMonthText() {
    const d = new Date(); d.setUTCMonth(d.getUTCMonth() + 1, 1);
    return "1 " + new Intl.DateTimeFormat("en-IN", { timeZone: IST, month: "short" }).format(d);
}
