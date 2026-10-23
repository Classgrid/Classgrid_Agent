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
 * 3.df NEVER use "Classgrid Platform" anywhere in the frontend UI or user-facing text.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 HOSTING & ARCHITECTURE RULE 🚨
 * 1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
 * 2. FRONTEND IS HOSTED ON VERCEL
 * ─────────────────────────────────────────────────────────
 */
// Triggering GitHub Actions Deployment - AI Integrations (Supabase, YouTube, Sanity)
import "../env.js"; // 🔥 Load config FIRST
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import passport from "passport";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import fs from "fs";
import { getBrandingForHost, injectBranding } from "../src/services/branding-resolver.service.js";

import connectDB from "../config/db.js";
import passportConfig from "../src/services/passport.service.js";
import Organization from "../src/models/Organization.js";

import authRoutes from "../src/routes/auth.routes.js";
import vercelAuthRoutes from "../src/routes/auth.vercel.routes.js";
import userRoutes from "../src/routes/user.routes.js";
import chatRoutes from "../src/routes/chat.routes.js";
import classroomRoutes from "../src/routes/classroom.routes.js";
import notificationRoutes from "../src/routes/notification.routes.js";
import orgChatRoutes from "../src/routes/org_chat.routes.js";
import organizationRoutes from "../src/routes/organization.routes.js";
import orgAdminRoutes from "../src/routes/org.routes.js";
import adminRoutes from "../src/routes/admin.routes.js";
import digestRoutes from "../src/routes/digest.routes.js";
import cronRoutes from "../src/routes/cron.routes.js";
import { createMcpRouter, loadRemoteMcpRouter } from "../src/mcp/index.js";
import googleWorkspaceRoutes from "../src/routes/auth.google_workspace.routes.js";
import microsoftRoutes from "../src/routes/auth.microsoft.routes.js";
import notionRoutes from "../src/routes/auth.notion.routes.js";
import oauthProviderRoutes, {
  isConsentPageOrigin, buildAuthorizationServerMetadata, buildProtectedResourceMetadata
} from "../src/routes/oauth.provider.routes.js";
import zoomRoutes from "../src/routes/zoom.routes.js";
import supabaseRoutes from "../src/routes/auth.supabase.routes.js";
import sanityRoutes from "../src/routes/auth.sanity.routes.js";
import metaRoutes from "../src/routes/auth.meta.routes.js";
import reviewRoutes from "../src/routes/review.routes.js";
import webhookRoutes from "../src/routes/webhook.routes.js";
import threadChatRoutes from "../src/routes/thread_chat.routes.js";
import groupChatRoutes from "../src/routes/group_chat.routes.js";
import googleRoutes from "../src/routes/google.routes.js";
import studentProfileRoutes from "../src/routes/student-profile.routes.js";
import pushRoutes from "../src/routes/push.routes.js";
import webPushRoutes from "../src/routes/web-push.routes.js";
import hierarchyRoutes from "../src/routes/hierarchy.routes.js";
import callRoutes from "../src/routes/call.routes.js";
import aiRoutes from "../src/routes/ai.routes.js";
import aiGridRoutes from "../src/routes/ai-grid.routes.js";
import aiCreditsRoutes from "../src/routes/ai-credits.routes.js";
import aiCreditsTopupRoutes from "../src/routes/ai-credits-topup.routes.js";
import aiLibraryRoutes from "../src/routes/ai-library.routes.js";
import aiScheduleRoutes from "../src/routes/ai-schedule.routes.js";
import voiceRoutes from "../src/routes/voice.routes.js";
import auditRoutes from "../src/routes/audit.routes.js";
import superAdminRoutes from "../src/routes/super-admin.routes.js";
import storageRoutes from "../src/routes/storage.routes.js";
import personalNotesRoutes from "../src/routes/personal-notes.routes.js";
import forumRoutes from "../src/routes/forum.routes.js";
import supportRoutes from "../src/routes/support.routes.js";
import changelogRoutes from "../src/routes/changelog.routes.js";
import ideRoutes from "../src/routes/ide.routes.js";
import publicRoutes from "../src/routes/public.routes.js";
import uploadRoutes from "../src/routes/upload.routes.js";
import systemRoutes from "../src/routes/system.routes.js";
import dropdownRoutes from "../src/routes/dropdown.routes.js";
import billingHandoffRoutes from "../src/routes/billing-handoff.routes.js";
import billingDemoRoutes from "../src/routes/billing-demo.routes.js";
import billingCheckoutRoutes from "../src/routes/billing-checkout.routes.js";
import aiIntegrationsRoutes from "../src/routes/ai-integrations.routes.js";
import whatsappRoutes from "../src/routes/whatsapp.routes.js";
import buildRoutes from "../src/routes/build.routes.js";
// import "../src/workers/buildWorker.js"; // Retired build robot (N2): not started anymore, see routes/build.routes.js
import extractSubdomain, { resolveTenant, getPublicTenantInfo } from "../src/middleware/subdomain-router.middleware.js";
import { sendEmail } from "../src/services/aws-ses.service.js";
import { metricsMiddleware, startMetricsFlush } from "../src/middleware/metrics.middleware.js";
import { enforceFeatureFlags, platformAccessGate } from "../src/middleware/feature-flag.middleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

console.log("BUILD VERSION: 2026-AUDIT");
console.log("SMTP HOST:", process.env.BREVO_SMTP_HOST);
console.log("SMTP USER:", process.env.BREVO_SMTP_USER);
console.log("SMTP SENDER:", process.env.BREVO_SENDER_EMAIL);

/* ---------- DB ---------- */
connectDB().catch(err => console.error("Initial DB connect error:", err));
startMetricsFlush(); // Start buffered metrics flush loop (60s interval)

/* ---------- CONFIG ---------- */
passportConfig(); // Initialize passport strategies

// 🔐 TRUST PROXY (Required for production behind reverse proxy like Vercel/Nginx)
app.set('trust proxy', 1);

/* ---------- MIDDLEWARE ---------- */
// 🛡️ Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // Allow inline scripts and styles for typical React setups
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://www.google.com/recaptcha/", "https://www.gstatic.com/recaptcha/"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "https:", "http:"],
      frameSrc: ["'self'", "https://www.google.com/recaptcha/"],
    },
  },
  crossOriginEmbedderPolicy: false, // Prevents blocking external images/iframes generically
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }, // ALLOWS OAuth popups to communicate back to the main window
}));

// The OAuth provider (/oauth/*) gets its own, stricter CORS below; every other route keeps these rules
// unchanged (white-labeled custom ERP domains depend on them). Lower-cased because Express routing is
// case-insensitive, so "/OAUTH/..." still reaches the OAuth router.
const isOAuthProviderPath = (path) => {
  const p = String(path || "").toLowerCase();
  return p === "/oauth" || p.startsWith("/oauth/");
};

// White-labeled ERP domains (e.g. erp.mycollege.edu) are allowed only when an organization has verified them.
// The answer is kept for 5 minutes per domain, so most requests don't touch the database.
const orgDomainCache = new Map();
async function isVerifiedOrgDomain(origin) {
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

const apiCors = cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      const allowedStatic = [
        "https://api.classgrid.in",
        "https://classgrid.in",
        "http://127.0.0.1:3000",
        "https://www.classgrid.in",
        "https://superadmin.classgrid.in",
        "https://classgridplatform.vercel.app",
        "https://nikhil.quantumchem.site"
      ];

      // Allow any *.classgrid.in subdomain (tenant portals), except cdn (it serves files users upload)
      const isClassgridSubdomain = /^https:\/\/[a-z0-9-]+\.classgrid\.in$/.test(origin) && origin !== "https://cdn.classgrid.in";
      const isLocalSubdomain = /^http:\/\/[a-z0-9-]+\.localhost(:\d+)?$/.test(origin);
      const isLocalhostDev = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

      if (allowedStatic.includes(origin) || isClassgridSubdomain || isLocalSubdomain || isLocalhostDev) {
        return callback(null, true);
      }

      // White-labeled custom domains (e.g. erp.mycollege.edu): only ones an organization has verified.
      // Reflecting any https:// origin let other websites use the login cookie (SameSite=None on .classgrid.in).
      if (origin.startsWith("https://")) {
        return isVerifiedOrgDomain(origin).then((ok) => callback(ok ? null : new Error(`CORS blocked: ${origin}`), ok));
      }

      callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true
  });

// Remote MCP and its discovery files use Bearer tokens only: any website may call them, but never with the login cookie
const tokenOnlyCors = cors({ origin: "*", credentials: false });
app.use((req, res, next) => {
  if (isOAuthProviderPath(req.path)) return next();
  const p = String(req.path || "").toLowerCase();
  if (p === "/mcp" || p.startsWith("/mcp/") || p.startsWith("/.well-known/")) return tokenOnlyCors(req, res, next);
  return apiCors(req, res, next);
});

// /oauth/*: credentialed CORS only for the Classgrid consent page. The login cookie is SameSite=None on
// .classgrid.in, so reflecting any https origin here let other websites read the user's details and get
// auth codes issued. The cookie-free endpoints (token, register) stay callable from browser-based MCP
// clients, but without credentials. Anything else gets no CORS headers (the browser blocks it).
const OAUTH_PUBLIC_CORS_PATHS = new Set(["/oauth/token", "/oauth/register"]);
app.use(
  cors((req, callback) => {
    if (!isOAuthProviderPath(req.path)) return callback(null, { origin: false });
    if (isConsentPageOrigin(req.headers.origin)) return callback(null, { origin: true, credentials: true });
    if (OAUTH_PUBLIC_CORS_PATHS.has(req.path.toLowerCase())) return callback(null, { origin: "*", credentials: false });
    return callback(null, { origin: false });
  })
);

// Razorpay admission webhook needs the raw request body for signature verification.
app.use("/api/admission/payments/webhook", express.raw({ type: "application/json", limit: "2mb" }));

// Remote MCP endpoint parses its own body (1 MB cap) inside its router. Lower-cased: Express routing is case-insensitive.
const isRemoteMcpPath = (path) => {
  const p = String(path || "").toLowerCase();
  return p === "/mcp" || p.startsWith("/mcp/");
};

// Skip JSON body parsing for webhook routes that rely on raw bodies.
app.use((req, res, next) => {
  if (
    req.originalUrl.startsWith('/api/admission/payments/webhook') ||
    req.originalUrl.startsWith('/api/payments/webhook') ||
    req.originalUrl.startsWith('/api/webhooks/razorpay') ||
    isRemoteMcpPath(req.path)
  ) {
    return next();
  }
  express.json({ limit: '50mb' })(req, res, next);
});
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET)); // Use cookie parser
app.use(passport.initialize());
app.use(extractSubdomain);

import { generalLimiter } from "../src/middleware/rateLimiter.js";
import { winstonMiddleware } from "../src/config/logger.js";

// Global API Rate Limiting (1000 requests / min) — skip storage uploads (they have their own limiter)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/super-admin/storage/')) {
    return next();
  }
  generalLimiter(req, res, next);
});

// Structured Logging via Winston
app.use(winstonMiddleware);

// API Metrics Middleware (zero-overhead in-memory buffering)
app.use(metricsMiddleware);

// 📊 API Request Metering (Pay-As-You-Go billing per org)
import { apiRequestMeter } from "../src/middleware/api-request-meter.middleware.js";
app.use(apiRequestMeter);

/* ---------- CACHE CONTROL — Prevent bfcache on HTML pages ---------- */
app.use((req, res, next) => {
  // Only set no-store for HTML page requests (not for JS/CSS/image assets)
  if (!req.path.startsWith("/api") && !req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|webp|mp4|webm)$/i)) {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
  }
  next();
});

/* ---------- API ROOT STATUS INTERCEPTOR ---------- */
app.get("/", (req, res, next) => {
  const host = req.hostname || "";
  if (host === "api.classgrid.in" || host.startsWith("api.localhost") || host === "localhost") {
    return res.json({
      name: "Ultimate Classgrid API",
      version: "3.0.0",
      message: "Welcome to the Classgrid API! Documentation is available at https://classgrid.in/docs"
    });
  }
  next();
});

/* ---------- STATIC FILES ---------- */
const isProduction = process.env.NODE_ENV === "production";
const clientDistPath = path.join(__dirname, "../../client/dist");

// ─── In-Memory HTML Template (loaded once at startup, not per request) ───
let htmlTemplate = null;
if (isProduction) {
  try {
    htmlTemplate = fs.readFileSync(path.join(clientDistPath, "index.html"), "utf8");
    console.log("✅ [Branding] HTML template loaded into memory");
  } catch (err) {
    console.error("❌ [Branding] Failed to load HTML template:", err.message);
  }

  // Serve static assets (JS, CSS, images, fonts) but NOT index.html
  // index: false → prevents express.static from auto-serving index.html for "/"
  // This ensures ALL page requests go through our catch-all for tenant branding injection
  app.use((req, res, next) => {
    // Block direct /index.html requests from being served as static files
    if (req.path === "/index.html") return next();
    express.static(clientDistPath, { index: false })(req, res, next);
  });
}

// 🛡️ Enforce Feature Flags
app.use(platformAccessGate);
app.use(enforceFeatureFlags);

/* ---------- API ROUTES ---------- */
app.use("/api/auth", authRoutes);
app.use("/api/auth/vercel", vercelAuthRoutes);
app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/classroom", classroomRoutes); // Fix: Alias for singular access
app.use("/api/org-chat", orgChatRoutes);
app.use("/api/organization", organizationRoutes);
app.use("/api/org", organizationRoutes);
app.use("/api/org-admin", orgAdminRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/digest", digestRoutes);
app.use("/api/cron", cronRoutes);
import githubRoutes from "../src/routes/auth.github.routes.js";
import slackRoutes from "../src/routes/auth.slack.routes.js";

app.use("/api/google-workspace", googleWorkspaceRoutes);
app.use("/api/auth/microsoft", microsoftRoutes);
app.use("/api/auth/notion", notionRoutes);
app.use("/api/auth/github", githubRoutes);
app.use("/api/auth/slack", slackRoutes);
app.use("/api/auth/supabase", supabaseRoutes);
app.use("/api/auth/meta", metaRoutes);
app.use("/api/sanity", sanityRoutes);
app.use("/oauth", oauthProviderRoutes);
app.use("/api/system", systemRoutes);
app.use("/api/zoom", zoomRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/billing/handoff", billingHandoffRoutes);
app.use("/api/billing/checkout", billingCheckoutRoutes);
app.use("/api/billing/demo", billingDemoRoutes);

// Razorpay centralized webhook (billing.classgrid.in)
import razorpayWebhookRoutes from "../src/routes/razorpay-webhook.routes.js";
app.use("/api/webhooks", razorpayWebhookRoutes);
app.use("/api/threads", threadChatRoutes);
app.use("/api/group-chat", groupChatRoutes);
app.use("/api/google", googleRoutes);
app.use("/api/student-profile", studentProfileRoutes);

// 🚀 Mount the MCP Router: the retired shared-key SSE routes (/api/mcp/sse, /api/mcp/messages) answer 410 Gone
const mcpRouter = express.Router();
createMcpRouter(mcpRouter);
app.use("/api", mcpRouter);

// Remote MCP server for Claude / Cursor / ChatGPT: POST /mcp with a Classgrid OAuth token (src/mcp/mcp-server.js).
// Returns 404 unless MCP_ENABLED=true. Left unmounted if the tool allowlist fails its safety check.
try {
  app.use("/mcp", await loadRemoteMcpRouter());
} catch (err) {
  console.error("❌ [MCP] /mcp route NOT mounted:", err?.message || err);
}
app.use("/api/push", pushRoutes);
app.use("/api/web-push", webPushRoutes);
app.use("/api/hierarchy", hierarchyRoutes);
app.use("/api/call", callRoutes);
app.use("/api/ai/grid", aiGridRoutes); // Share Grid (shared AI chats)
app.use("/api/ai", aiRoutes);
app.use("/api/ai/credits", aiCreditsRoutes);
app.use("/api/ai/topup", aiCreditsTopupRoutes);
app.use("/api/ai/library", aiLibraryRoutes);
app.use("/api/ai/schedules", aiScheduleRoutes);
app.use("/api/ai-integrations", aiIntegrationsRoutes);
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/voice", voiceRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/super-admin/storage", storageRoutes);
app.use("/api/super-admin/storage/notes", personalNotesRoutes);
app.use("/api/super-admin", superAdminRoutes);
app.use("/api/forum", forumRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/changelog", changelogRoutes);
app.use("/api/ide", ideRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/build", buildRoutes);
app.use("/api/dropdowns", dropdownRoutes);

// 🔑 OAuth discovery for remote MCP clients (Claude, Cursor, ChatGPT). Built in oauth.provider.routes.js
// from OAUTH_ISSUER / MCP_RESOURCE_URL and the scope list in src/mcp/mcp-scopes.js.
// RFC 8414 Authorization Server Metadata (issuer must equal the origin serving it)
app.get("/.well-known/oauth-authorization-server", (req, res) => {
  res.set("Cache-Control", "public, max-age=300");
  res.json(buildAuthorizationServerMetadata());
});

// RFC 9728 Protected Resource Metadata: root and the path-specific variant for /mcp (clients try that first)
app.get(["/.well-known/oauth-protected-resource", "/.well-known/oauth-protected-resource/mcp"], (req, res) => {
  res.set("Cache-Control", "public, max-age=300");
  res.json(buildProtectedResourceMetadata());
});

// OpenAI plugin portal domain check: it fetches this token before scanning /mcp. The token is public by design
// (anyone may read it here); OPENAI_APPS_CHALLENGE in .env overrides the one from the Classgrid plugin portal.
const OPENAI_APPS_CHALLENGE_TOKEN = "51OJF0MvS_kbEWTbyM3f9o1X7Ugz2sqCctW70V4Pmtg";
app.get("/.well-known/openai-apps-challenge", (req, res) => {
  const token = String(process.env.OPENAI_APPS_CHALLENGE || OPENAI_APPS_CHALLENGE_TOKEN).trim();
  if (!token) return res.status(404).type("text/plain").send("Not found");
  res.set("Cache-Control", "no-store");
  res.type("text/plain").send(token);
});

// 🌐 MODULE 22: Public Tenant Info (Subdomain Resolution)
app.get("/api/tenant/info", getPublicTenantInfo);

/* ---------- HEALTH ---------- */
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    env: process.env.NODE_ENV || "development"
  });
});

if (!isProduction) {
  app.get("/api/email-test", async (req, res) => {
    console.log("TEST ROUTE HIT");

    try {
      const info = await sendEmail({
        to: process.env.SUPER_ADMIN_EMAIL || "support@classgrid.in",
        subject: "Direct SMTP Test",
        text: "Testing direct send",
        html: "<h1>Direct Test</h1>"
      });
      console.log("TEST DIRECT SEND INFO", info);
      res.send("Done: " + JSON.stringify(info));
    } catch (error) {
      console.error("TEST DIRECT SEND ERROR", error);
      res.status(500).send("Error: " + error.message);
    }
  });
}

/* ---------- LEGACY OAUTH CALLBACK REDIRECTS ---------- */
app.get("/api/auth/callback/google", (req, res) => {
  const qs = req.url.includes("?") ? req.url.substring(req.url.indexOf("?")) : "";
  res.redirect(307, `/api/auth/google/callback${qs}`);
});
app.get("/api/auth/callback/github", (req, res) => {
  const qs = req.url.includes("?") ? req.url.substring(req.url.indexOf("?")) : "";
  res.redirect(307, `/api/auth/github/callback${qs}`);
});
app.get("/api/auth/callback/facebook", (req, res) => {
  const qs = req.url.includes("?") ? req.url.substring(req.url.indexOf("?")) : "";
  res.redirect(307, `/api/auth/facebook/callback${qs}`);
});

app.get("/api/config", (req, res) => {
  res.json({ recaptchaSiteKey: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY });
});

/* ---------- REACT SPA ROUTING (CATCH-ALL) ---------- */
// Any route not starting with /api will be handled by React Router.
// In production, this injects tenant branding into the HTML template
// BEFORE sending it to the browser — zero flash, zero localStorage.
app.get("*", async (req, res) => {
  // API root status (api.classgrid.in or localhost)
  if (req.path === "/") {
    const host = req.hostname || "";
    if (host === "api.classgrid.in" || host.startsWith("api.localhost") || (!isProduction && host === "localhost")) {
      return res.json({
        name: "Ultimate Classgrid API",
        version: "3.0.0",
        message: "Welcome to the Classgrid API! Documentation is available at https://classgrid.in/docs"
      });
    }
  }
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "API not found" });
  }

  if (isProduction) {
    if (!htmlTemplate) {
      return res.status(500).send("React build missing.");
    }

    try {
      // Resolve tenant branding from hostname (LRU cached, ~0ms on cache hit)
      const branding = await getBrandingForHost(req.tenantHost || req.hostname);

      // Inject branding into in-memory template (deterministic string replace, ~0.1ms)
      const html = injectBranding(htmlTemplate, branding);

      // Prevent CDN/proxy from caching one tenant's HTML for another
      res.set("Cache-Control", "private, no-cache, no-store, max-age=0");
      res.set("Vary", "Host");
      res.type("html").send(html);
    } catch (err) {
      console.error("[Branding] Catch-all error:", err);
      // Fallback: send template with default Classgrid branding
      const fallback = injectBranding(htmlTemplate, {
        title: "Classgrid ERP",
        favicon: "/logos/favicon-32x32.png?v=2",
        manifest: '<link rel="manifest" href="/site.webmanifest" />',
        isMainPlatform: true,
        orgName: null,
      });
      res.set("Cache-Control", "private, no-cache, no-store, max-age=0");
      res.type("html").send(fallback);
    }
  } else {
    // In development, Vite dev server handles all client routing
    // This catch-all only runs for the Express server (port 3000)
    res.status(200).json({ name: "Classgrid API", version: "1.0.0", status: "online" });
  }
});

/* ---------- GLOBAL ERROR HANDLER ---------- */
import { captureError } from "../src/controllers/super-admin.controller.js";
app.use((err, req, res, next) => {
  console.error("🔥 [Global Error]:", err);
  captureError(err, `${req.method} ${req.originalUrl}`, req);

  // Format consistently, no stack trace
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Something went wrong",
    code: err.code || "SERVER_ERROR"
  });
});

export default app;
