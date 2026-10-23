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
 * =========================================================================================
 * 🚨 CRITICAL AI & SYSTEM RULE 🚨
 * NO FRONTEND GITHUB ACTIONS: NEVER create yaml files that build/deploy the frontend to EC2.
 * The frontend is hosted 100% on Vercel. EC2 is only for the backend.
 * =========================================================================================
 */

/*
 * =========================================================================================
 * STRICT SECURITY POLICY:
 * NO ONE CAN EVER CHANGE THE ORGANIZATION TYPE FROM THE FRONTEND OR BACKEND.
 * NEVER ADD A DROPDOWN OR OPTION TO CHANGE IT ANYWHERE IN THE CODEBASE.
 * NO MEANS NO. THIS IS A FIXED PLATFORM RULE.
 * =========================================================================================
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 CRITICAL AI AND SYSTEM RULES 🚨
 * 1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
 * 2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
 * 3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 NAMING CONVENTION RULE 🚨
 * 1. "CLASSGRID PLATFORM" is strictly the REPO NAME.
 * 2. chat.classgrid.in (Classgrid AI) is the actual PRODUCT. The ERP is shut down.
 * 3. NEVER use "Classgrid Platform" anywhere in the frontend UI or user-facing text.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 HOSTING & ARCHITECTURE RULE 🚨
 * 1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
 * 2. FRONTEND IS HOSTED ON VERCEL
 * ─────────────────────────────────────────────────────────
 */

/**
 * subdomain-router.middleware.js
 * 
 * MODULE 22: Multi-Tenant Subdomain Router
 * 
 * Extracts the organization (tenant) slug from the URL subdomain,
 * resolves it to a full Organization document with LRU caching,
 * and injects `req.tenantSlug` + `req.tenantOrg` for downstream use.
 * 
 * Supports: {subdomain}.classgrid.in, {subdomain}.localhost:3000
 * Ignores: www, app, admin, api, dev, staging
 */

import Organization from "../models/Organization.js";

// ─── In-Memory LRU Cache (TTL: 5 minutes) ───────────────────────────
const TENANT_CACHE = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 200;

function getCachedTenant(slug) {
    const entry = TENANT_CACHE.get(slug);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
        TENANT_CACHE.delete(slug);
        return null;
    }
    return entry.org;
}

function setCachedTenant(slug, org) {
    // Evict oldest if at capacity
    if (TENANT_CACHE.size >= MAX_CACHE_SIZE) {
        const firstKey = TENANT_CACHE.keys().next().value;
        TENANT_CACHE.delete(firstKey);
    }
    TENANT_CACHE.set(slug, { org, timestamp: Date.now() });
}

/** Forcefully clear a single tenant from cache (call after subdomain change) */
export function invalidateTenantCache(slug) {
    TENANT_CACHE.delete(slug?.toLowerCase());
}

/** Clear entire tenant cache */
export function clearTenantCache() {
    TENANT_CACHE.clear();
}

// ─── System Subdomains (Never Resolve) ───────────────────────────────
const SYSTEM_SUBDOMAINS = new Set([
    "localhost", "127", "www", "app", "admin", "api", "dev", "staging", "mail", "ftp"
]);

// ─── Subdomain Extraction ────────────────────────────────────────────
function extractSlugFromHost(host) {
    if (!host) return null;

    const cleanHost = host.split(":")[0].toLowerCase(); // Remove port
    let candidate = null;

    if (cleanHost.endsWith(".classgrid.in")) {
        const prefix = cleanHost.slice(0, -".classgrid.in".length);
        if (prefix && !prefix.includes(".")) candidate = prefix;
    } else if (cleanHost.endsWith(".localhost")) {
        const prefix = cleanHost.slice(0, -".localhost".length);
        if (prefix && !prefix.includes(".")) candidate = prefix;
    }

    if (candidate && !SYSTEM_SUBDOMAINS.has(candidate)) return candidate;

    return null;
}

function isSystemHost(host) {
    if (!host) return true;
    return host === "classgrid.in"
        || host === "localhost"
        || host === "127.0.0.1"
        || (SYSTEM_SUBDOMAINS.has(host.split(".")[0]) && host.endsWith(".classgrid.in"));
}

function activeDomainQuery(field, host) {
    return {
        [`${field}.domain`]: host,
        [`${field}.status`]: { $in: ["verified", "active"] },
        [`${field}.is_enabled`]: { $ne: false },
    };
}

// ─── Phase 1: Extract Subdomain (runs on EVERY request) ─────────────
export const extractSubdomain = (req, res, next) => {
    const host = req.headers.host || "";
    req.tenantHost = host.split(":")[0].toLowerCase();
    req.tenantSlug = extractSlugFromHost(host) || null;
    next();
};

// ─── Phase 2: Resolve Tenant (runs on routes that NEED org context) ──
// Use this as middleware on tenant-scoped API routes:
//   router.use(resolveTenant);
//   router.get("/menu", getMenu);
export const resolveTenant = async (req, res, next) => {
    try {
        const slug = req.tenantSlug;
        
        // External domains are resolved by their full hostname. Only Classgrid's
        // own one-label tenant hostnames are interpreted as organization slugs.
        if (!slug && isSystemHost(req.tenantHost)) {
            // No subdomain detected and not a valid custom domain candidate
            // Let downstream auth middleware handle org resolution via JWT
            return next();
        }

        // 1. Check cache (use host as primary key for custom domains)
        const cacheKey = req.tenantHost || slug;
        const cached = getCachedTenant(cacheKey);
        if (cached) {
            req.tenantOrg = cached;
            return next();
        }

        // 2. DB lookup (match a tenant slug or an active exact external hostname)
        const query = [];
        if (slug) query.push({ subdomain: slug });
        if (req.tenantHost && !isSystemHost(req.tenantHost)) {
            query.push(activeDomainQuery("custom_domain", req.tenantHost));
            query.push(activeDomainQuery("erp_domain", req.tenantHost));
        }

        const org = await Organization.findOne({ $or: query })
            .select("_id name subdomain org_type structure_type admission_config subscription_tier logo_url")
            .lean();

        if (!org) {
            // Subdomain exists but no org found — NOT a critical error for API calls
            // The request may still be authenticated via JWT with org_id
            return next();
        }

        // 3. Cache and attach
        setCachedTenant(cacheKey, org);
        req.tenantOrg = org;
        next();
    } catch (err) {
        console.error("[SubdomainRouter] Tenant resolution failed:", err.message);
        next(); // Don't block the request — downstream auth will handle
    }
};

// ─── Public Tenant Info (for unauthenticated portal pages) ───────────
// GET /api/tenant/info — Returns public-safe org info based on subdomain
export const getPublicTenantInfo = async (req, res) => {
    try {
        const slug = req.tenantSlug || req.query.slug;
        const host = req.headers.host ? req.headers.host.split(":")[0].toLowerCase() : null;
        
        // Check cache first (use host if it's a direct API call without slug, else slug)
        const cacheKey = host && !req.query.slug ? host : (slug || host);
        let org = cacheKey ? getCachedTenant(cacheKey) : null;

        if (!org) {
            const query = [];
            if (slug) query.push({ subdomain: slug });
            if (host && !isSystemHost(host)) {
                query.push(activeDomainQuery("custom_domain", host));
                query.push(activeDomainQuery("erp_domain", host));
            }

            if (query.length === 0) {
                return res.status(400).json({ error: "No subdomain, slug, or host provided." });
            }

            org = await Organization.findOne({ $or: query })
                .select("_id name subdomain org_type structure_type logo_url tagline admission_config.is_portal_open")
                .lean();

            if (org) setCachedTenant(cacheKey, org);
        }

        if (!org) {
            return res.status(404).json({ error: "Organization not found." });
        }

        res.json({
            success: true,
            tenant: {
                id: org._id,
                tenantId: org._id,
                name: org.name,
                subdomain: org.subdomain,
                org_type: org.org_type,
                orgType: org.org_type,
                structure_type: org.structure_type,
                logo_url: org.logo_url,
                tagline: org.tagline,
                admission_portal_open: org.admission_config?.is_portal_open || false,
            }
        });
    } catch (err) {
        console.error("[SubdomainRouter] Public tenant info error:", err.message);
        res.status(500).json({ error: "Failed to fetch tenant info." });
    }
};

export default extractSubdomain;
