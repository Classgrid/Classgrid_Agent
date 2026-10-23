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
/*
 * Per-token rate limit for the remote MCP server: a fixed one-minute window counted in Redis
 * (INCR + EXPIRE, shared by every PM2 worker), with an in-memory fallback when Redis is not ready or fails.
 */

const WINDOW_MS = 60 * 1000;
const MAX_MEMORY_KEYS = 10000;

/**
 * Returns hit(key, max) -> Promise<{ allowed, count, retryAfterSec }>.
 * getRedis returns the ioredis client or null (injected so tests use a mock).
 */
export function createMcpRateLimiter({ getRedis = () => null, now = () => Date.now() } = {}) {
    const memory = new Map(); // `${key}:${window}` -> count

    const memoryHit = (bucket, windowEnd) => {
        if (memory.size >= MAX_MEMORY_KEYS) {
            // Old windows are worthless; drop everything not in the current window
            const suffix = `:${windowEnd}`;
            for (const k of memory.keys()) if (!k.endsWith(suffix)) memory.delete(k);
            if (memory.size >= MAX_MEMORY_KEYS) memory.clear();
        }
        const count = (memory.get(bucket) || 0) + 1;
        memory.set(bucket, count);
        return count;
    };

    return async function hit(key, max) {
        const t = now();
        const windowStart = Math.floor(t / WINDOW_MS) * WINDOW_MS;
        const windowEnd = windowStart + WINDOW_MS;
        const bucket = `mcp:rl:${key}:${windowEnd}`;
        const retryAfterSec = Math.max(1, Math.ceil((windowEnd - t) / 1000));

        let count = null;
        const redis = getRedis();
        if (redis && redis.status === "ready") {
            try {
                count = await redis.incr(bucket);
                if (count === 1) await redis.pexpire(bucket, WINDOW_MS + 5000);
            } catch {
                count = null;
            }
        }
        if (count === null) count = memoryHit(bucket, windowEnd);
        return { allowed: count <= max, count, retryAfterSec };
    };
}
