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
import redis from "../config/redis.js";

// GET /api/ai/favicon?domain=example.com — the site icon shown on the AI's source chips.
// Fetched once from DuckDuckGo (Google as backup) and cached, so users' browsers only talk to Classgrid.
// Only these two fixed hosts are ever contacted; the domain is just a validated path/query value.

const DOMAIN_RE = /^(?=.{1,253}$)(?:(?!-)[a-z0-9-]{1,63}(?<!-)\.)+[a-z]{2,63}$/;
const CACHE_SECONDS = 60 * 60 * 24 * 7;
const MISS_SECONDS = 60 * 60 * 24;
const MAX_BYTES = 100 * 1024;
// No SVG: an SVG served from the API origin could run script if opened directly.
const ALLOWED_TYPES = new Set(["image/png", "image/x-icon", "image/vnd.microsoft.icon", "image/jpeg", "image/gif", "image/webp"]);

function sendIcon(res, type, buf) {
    res.set("Content-Type", type);
    res.set("Cache-Control", `public, max-age=${CACHE_SECONDS}, immutable`);
    res.set("Cross-Origin-Resource-Policy", "cross-origin"); // shown on chat.classgrid.in etc.
    res.set("X-Content-Type-Options", "nosniff");
    res.set("Content-Security-Policy", "default-src 'none'");
    return res.send(buf);
}

export const getFavicon = async (req, res) => {
    const domain = String(req.query.domain || "").trim().toLowerCase().replace(/^www\./, "");
    if (!DOMAIN_RE.test(domain)) return res.status(400).end();

    const key = `ai:favicon:${domain}`;
    try {
        const cached = await redis.get(key).catch(() => null);
        if (cached) {
            const { type, data } = JSON.parse(cached);
            return data ? sendIcon(res, type, Buffer.from(data, "base64")) : res.status(404).end();
        }

        const candidates = [
            `https://icons.duckduckgo.com/ip3/${domain}.ico`,
            `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`,
        ];
        for (const url of candidates) {
            const r = await fetch(url, { signal: AbortSignal.timeout(4000) }).catch(() => null);
            if (!r || !r.ok) continue;
            const type = (r.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
            if (!ALLOWED_TYPES.has(type)) continue;
            const buf = Buffer.from(await r.arrayBuffer());
            if (!buf.length || buf.length > MAX_BYTES) continue;
            redis.set(key, JSON.stringify({ type, data: buf.toString("base64") }), "EX", CACHE_SECONDS).catch(() => {});
            return sendIcon(res, type, buf);
        }

        redis.set(key, JSON.stringify({ type: null, data: null }), "EX", MISS_SECONDS).catch(() => {});
        return res.status(404).end();
    } catch {
        return res.status(404).end();
    }
};
