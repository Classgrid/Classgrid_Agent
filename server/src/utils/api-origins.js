/*
 * ─────────────────────────────────────────────────────────
 * 🚫 NO BLOCKS RULE (owner's order, 2026-10-23) 🚫
 * Claude and every AI model are FORBIDDEN to add any kind of block, restriction, allowlist or
 * "only for X" rule (owner-only, super-admin-only, email checks, test-number-only, role checks)
 * unless the owner explicitly asks for that exact limit.
 * Every feature is for ALL users. Project Mode is for all users, never super-admin only.
 * ─────────────────────────────────────────────────────────
 */
// The websites allowed to call the API with the login cookie: the API's CORS rules (api/index.js) and the routes
// that check where a cookie-only request came from (routes/user-devices.routes.js) use this one list.
import Organization from "../models/Organization.js";

const ALLOWED_STATIC = [
    "https://api.classgrid.in",
    "https://classgrid.in",
    "http://127.0.0.1:3000",
    "https://www.classgrid.in",
    "https://superadmin.classgrid.in",
    "https://classgridplatform.vercel.app",
    "https://nikhil.quantumchem.site",
];

/** Classgrid's own origins: the list above, any *.classgrid.in subdomain (tenant portals) except cdn (it serves files
 * users upload), and localhost (the desktop app's pages) */
export function isKnownApiOrigin(origin) {
    const o = String(origin || "");
    const isClassgridSubdomain = /^https:\/\/[a-z0-9-]+\.classgrid\.in$/.test(o) && o !== "https://cdn.classgrid.in";
    const isLocalSubdomain = /^http:\/\/[a-z0-9-]+\.localhost(:\d+)?$/.test(o);
    const isLocalhostDev = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);
    return ALLOWED_STATIC.includes(o) || isClassgridSubdomain || isLocalSubdomain || isLocalhostDev;
}

// White-labeled ERP domains (e.g. erp.mycollege.edu) are allowed only when an organization has verified them.
// The answer is kept for 5 minutes per domain, so most requests don't touch the database.
const orgDomainCache = new Map();
export async function isVerifiedOrgDomain(origin) {
    let host;
    try { host = new URL(origin).hostname.toLowerCase(); } catch { return false; }
    const cached = orgDomainCache.get(host);
    if (cached && Date.now() - cached.at < 5 * 60 * 1000) return cached.ok;
    try {
        const org = await Organization.findOne({
            $or: [
                { "erp_domain.domain": host, "erp_domain.status": { $in: ["verified", "active"] }, "erp_domain.is_enabled": { $ne: false } },
                { "custom_domain.domain": host, "custom_domain.status": { $in: ["verified", "active"] }, "custom_domain.is_enabled": { $ne: false } },
            ],
        }).select("_id").lean();
        orgDomainCache.set(host, { ok: !!org, at: Date.now() });
        return !!org;
    } catch {
        return cached?.ok || false; // database hiccup: keep the last answer
    }
}

/** An origin the API's CORS allows with the login cookie (a request with no origin is not a browser page's) */
export async function isAllowedApiOrigin(origin) {
    if (!origin) return true;
    if (isKnownApiOrigin(origin)) return true;
    if (String(origin).startsWith("https://")) return isVerifiedOrgDomain(origin);
    return false;
}
