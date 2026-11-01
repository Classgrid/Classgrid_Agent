// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
/*
 * VPN / proxy / Tor check for chat.classgrid.in (owner's order, 2026-11-01): when the visitor's IP is a VPN,
 * proxy, Tor exit or a high-risk address, chat.classgrid.in shows a blank page instead of the app.
 *
 * Looks the IP up on proxycheck.io (PROXYCHECK_API_KEY is optional: 100 lookups a day without it, 1,000 with
 * a free key). Each answer is kept in Redis for a day. If the lookup fails or the daily limit is used up, the
 * visitor is let in, so an outage never locks everyone out.
 */
import redis from "../config/redis.js";

const CACHE_SECONDS = 24 * 60 * 60;
const RISK_LIMIT = 66; // proxycheck.io: 66 and above = high risk (attacks, abuse)

function isPrivateIp(ip) {
    return !ip || ip === "::1" || ip.startsWith("127.") || ip.startsWith("10.") || ip.startsWith("192.168.") ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(ip) || ip.startsWith("::ffff:127.") || ip.startsWith("fc") || ip.startsWith("fd");
}

export function clientIp(req) {
    const ip = String(req.ip || req.socket?.remoteAddress || "");
    return ip.startsWith("::ffff:") ? ip.slice(7) : ip;
}

async function lookup(ip) {
    const key = process.env.PROXYCHECK_API_KEY ? `&key=${encodeURIComponent(process.env.PROXYCHECK_API_KEY)}` : "";
    const res = await fetch(`https://proxycheck.io/v2/${encodeURIComponent(ip)}?vpn=1&risk=1${key}`, { signal: AbortSignal.timeout(4000) });
    const data = await res.json();
    const row = data?.[ip];
    if (!row || (data.status !== "ok" && data.status !== "warning")) return null; // denied / error: unknown
    const type = String(row.type || "");
    const blocked = row.proxy === "yes" || /^(VPN|TOR)$/i.test(type) || Number(row.risk) >= RISK_LIMIT;
    return { blocked, type, risk: Number(row.risk) || 0 };
}

/** { blocked, reason } for this IP. Never throws; unknown means not blocked. */
export async function checkIp(ip) {
    if (isPrivateIp(ip)) return { blocked: false };
    const cacheKey = `netcheck:${ip}`;
    try {
        const cached = await redis.get(cacheKey);
        if (cached) return JSON.parse(cached);
    } catch { /* Redis down: look it up */ }
    let result;
    try {
        result = await lookup(ip);
    } catch {
        result = null;
    }
    if (!result) return { blocked: false };
    const out = { blocked: result.blocked, reason: result.blocked ? (result.type || "risk") : undefined };
    try { await redis.set(cacheKey, JSON.stringify(out), "EX", CACHE_SECONDS); } catch { /* ignore */ }
    return out;
}
