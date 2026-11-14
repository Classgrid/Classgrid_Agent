// Per-user counters for the plan limits that are not credits: voice replies and voice input (per day, India time),
// coding runs and cloud sandbox time (per month). Kept in Redis; a count that cannot be read never blocks anyone.
import redis from "../config/redis.js";

const IST = "Asia/Kolkata";
export const dayKey = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: IST, year: "numeric", month: "2-digit", day: "2-digit" }).format(d); // YYYY-MM-DD
export const monthKey = (d = new Date()) => dayKey(d).slice(0, 7);

const keyDay = (userId, kind) => `plan:${kind}:${userId}:${dayKey()}`;
const keyMonth = (userId, kind) => `plan:${kind}:${userId}:${monthKey()}`;

export async function usedToday(userId, kind) {
    try { return Number(await redis.get(keyDay(userId, kind))) || 0; } catch { return 0; }
}
export async function addToday(userId, kind, n = 1) {
    try { const k = keyDay(userId, kind); await redis.incrbyfloat(k, n); await redis.expire(k, 3 * 24 * 3600); } catch (e) { console.warn("[plan-usage] could not count:", e.message); }
}
export async function usedThisMonth(userId, kind) {
    try { return Number(await redis.get(keyMonth(userId, kind))) || 0; } catch { return 0; }
}
export async function addThisMonth(userId, kind, n = 1) {
    try { const k = keyMonth(userId, kind); await redis.incrbyfloat(k, n); await redis.expire(k, 40 * 24 * 3600); } catch (e) { console.warn("[plan-usage] could not count:", e.message); }
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
