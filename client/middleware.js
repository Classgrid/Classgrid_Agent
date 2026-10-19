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
 * Vercel Edge Middleware — Zero-Flash Tenant Branding
 *
 * Intercepts HTML page requests on Vercel, resolves the tenant from
 * the hostname via the Classgrid API, and injects org-specific
 * <title> and favicon into the HTML before the browser sees it.
 *
 * Flow:
 *   Browser → Vercel Edge → middleware.js → resolve tenant (cached)
 *   → string-replace embedded HTML template → browser sees org branding from byte 1
 *
 * Key design decisions:
 *   - HTML template is embedded at BUILD TIME (branding-shell.js), not fetched at runtime
 *   - No internal fetch = no recursion risk, no dependency on x-middleware-subrequest
 *   - LRU cache per edge instance (5min TTL, max 500 entries)
 *   - XSS-safe HTML escaping + favicon URL allowlist validation
 *   - Distinct failure handling (404 vs timeout vs error)
 *   - window.__CLASSGRID_TENANT__ bootstrap for instant React access
 */

import { INDEX_HTML } from "./branding-shell.js";

const API_BASE = "https://api.classgrid.in";

// ─── System Subdomains (always show Classgrid branding) ────────────
const SYSTEM_SUBDOMAINS = new Set([
  "www", "app", "admin", "api", "dev", "staging", "mail", "superadmin", "chat"
]);

// ─── Per-Instance Branding Cache ───────────────────────────────────
// Note: This is per edge region / per lambda instance, NOT global.
// At scale, consider Vercel Edge Config or KV for global shared cache.
const brandingCache = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute (reduced from 5 mins for faster branding updates)
const MAX_CACHE_SIZE = 500;

// ─── Host Classification ──────────────────────────────────────────
function isMainPlatformHost(hostname) {
  const clean = hostname.split(":")[0].toLowerCase();
  if (clean === "classgrid.in" || clean === "localhost" || clean === "127.0.0.1") return true;
  if (clean.endsWith(".classgrid.in")) {
    const prefix = clean.slice(0, -".classgrid.in".length);
    if (SYSTEM_SUBDOMAINS.has(prefix)) return true;
  }
  return false;
}

function extractSlug(hostname) {
  const clean = hostname.split(":")[0].toLowerCase();
  if (clean.endsWith(".classgrid.in")) {
    const prefix = clean.slice(0, -".classgrid.in".length);
    if (prefix && !prefix.includes(".") && !SYSTEM_SUBDOMAINS.has(prefix)) {
      return prefix;
    }
  }
  return null;
}

// ─── XSS-Safe HTML Escaping ───────────────────────────────────────
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── Favicon URL Validation ──────────────────────────────────────
// Favicons are <img> resources — they cannot execute JavaScript.
// We validate: must be HTTPS or relative path, and must not use
// dangerous URI schemes. The value is also HTML-escaped before injection.
function isSafeFaviconUrl(url) {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (trimmed.startsWith("/")) return true; // Relative paths are safe
  try {
    const parsed = new URL(trimmed);
    // Only allow https: — block javascript:, data:, blob:, etc.
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// ─── Branding Fetcher with Cache ──────────────────────────────────
async function fetchBranding(hostname) {
  // Check cache
  const cached = brandingCache.get(hostname);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }

  try {
    const slug = extractSlug(hostname);
    const query = slug
      ? `slug=${encodeURIComponent(slug)}`
      : `domain=${encodeURIComponent(hostname)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // 3s timeout

    const res = await fetch(
      `${API_BASE}/api/public/auth-branding?type=institution&${query}`,
      {
        headers: { "Accept": "application/json" },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    // Tenant not found — cache the miss so we don't keep hitting the API
    if (res.status === 404) {
      const miss = { found: false, title: null, favicon: null };
      setCachedResult(hostname, miss);
      return miss;
    }

    if (!res.ok) return null; // Server error — don't cache, retry next time

    const data = await res.json();
    if (!data.success || !data.branding) return null;

    const b = data.branding;
    const result = {
      found: true,
      title: b.siteTitle || b.shortName || b.name || null,
      favicon: b.faviconUrl && isSafeFaviconUrl(b.faviconUrl) ? b.faviconUrl : null,
    };

    setCachedResult(hostname, result);
    return result;
  } catch (err) {
    // AbortError = timeout — don't cache, serve default
    if (err.name === "AbortError") {
      console.error("[Middleware] API timeout for:", hostname);
      return null;
    }
    console.error("[Middleware] Branding fetch failed:", err.message);
    return null;
  }
}

function setCachedResult(key, result) {
  if (brandingCache.size >= MAX_CACHE_SIZE) {
    const firstKey = brandingCache.keys().next().value;
    brandingCache.delete(firstKey);
  }
  brandingCache.set(key, { result, timestamp: Date.now() });
}

// ─── Matcher Configuration ────────────────────────────────────────
// Only match navigation/document requests and favicon.ico. Exclude ALL other static assets.
export const config = {
  matcher: [
    "/((?!_next|_vercel|assets|logos|fonts|images|site\\.webmanifest|robots\\.txt|sitemap|sw\\.js|workbox).*)",
  ],
};

// ─── Middleware Handler ───────────────────────────────────────────
export default async function middleware(request) {
  const url = new URL(request.url);
  const hostname = request.headers.get("host") || url.hostname;

  // Skip static asset requests (except favicon.ico)
  const lastSegment = url.pathname.split("/").pop() || "";
  if (lastSegment.includes(".") && url.pathname !== "/favicon.ico") {
    const ext = lastSegment.split(".").pop()?.toLowerCase();
    const staticExtensions = new Set([
      "js", "css", "png", "jpg", "jpeg", "gif", "svg", "woff", "woff2",
      "ttf", "eot", "webp", "avif", "mp4", "webm", "map", "json", "xml", "txt",
      "pdf", "zip", "gz", "br"
    ]);
    if (ext && staticExtensions.has(ext)) {
      return; // Let Vercel serve static files normally
    }
  }

  // Main platform hosts get default branding
  if (isMainPlatformHost(hostname)) {
    return; // Serve index.html or /favicon.ico as-is
  }

  // Intercept background requests for /favicon.ico on tenant domains
  if (url.pathname === "/favicon.ico") {
    const branding = await fetchBranding(hostname);
    if (branding && branding.favicon) {
      // Redirect the browser's background request to the custom AWS CDN logo!
      return Response.redirect(branding.favicon, 302);
    }
    // If no custom branding, return 404 to stop the browser from finding the Classgrid one
    return new Response(null, { status: 404 });
  }

  // If build-time HTML embed isn't available, serve default
  if (!INDEX_HTML) {
    return;
  }

  // Fetch tenant branding (LRU cached, ~0ms on hit, ~50-200ms on miss)
  const branding = await fetchBranding(hostname);

  // No branding data or tenant not found — serve default Classgrid HTML
  if (!branding || !branding.found || (!branding.title && !branding.favicon)) {
    return;
  }

  // ─── Inject Branding into Embedded HTML Template ─────────────
  let html = INDEX_HTML;

  if (branding.title) {
    const safeTitle = escapeHtml(branding.title);
    html = html.replace(/<title>.*?<\/title>/, `<title>${safeTitle}</title>`);
  }

  if (branding.favicon) {
    const safeFavicon = escapeHtml(branding.favicon);
    html = html.replace(
      /<link id="favicon-link"[^>]*>/,
      `<link id="favicon-link" rel="icon" href="${safeFavicon}" />`
    );
  }

  // Remove PWA manifest for tenant domains (it's Classgrid-specific)
  html = html.replace(/<link rel="manifest"[^>]*>/, "");

  // Inject bootstrap payload so React knows the tenant instantly
  // (no need for a separate API call on first paint)
  const bootstrap = `<script>window.__CLASSGRID_TENANT__=${JSON.stringify({
    title: branding.title,
    favicon: branding.favicon,
  })};</script>`;
  html = html.replace("</head>", `${bootstrap}\n</head>`);

  // Return modified HTML with anti-cache headers
  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-cache, no-store, max-age=0",
      "vary": "Host",
    },
  });
}
