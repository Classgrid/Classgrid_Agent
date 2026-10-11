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
 * 2. "CLASSGRID ERP" is the actual PRODUCT NAME.
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

import authRoutes from "../src/routes/auth.routes.js";
import vercelAuthRoutes from "../src/routes/auth.vercel.routes.js";
import userRoutes from "../src/routes/user.routes.js";
import chatRoutes from "../src/routes/chat.routes.js";
import notesRoutes from "../src/routes/notes.routes.js";
import classroomRoutes from "../src/routes/classroom.routes.js";
import activityRoutes from "../src/routes/activity.routes.js";
import messagingRoutes from "../src/routes/messaging.routes.js";
import classroomChatRoutes from "../src/routes/classroom_chat.routes.js";
import notificationRoutes from "../src/routes/notification.routes.js";
import commentsRoutes from "../src/routes/comments.routes.js";
import orgChatRoutes from "../src/routes/org_chat.routes.js";
import organizationRoutes from "../src/routes/organization.routes.js";
import orgAdminRoutes from "../src/routes/org.routes.js";
import adminRoutes from "../src/routes/admin.routes.js";
import digestRoutes from "../src/routes/digest.routes.js";
import attendanceDashboardRoutes from "../src/routes/attendance_dashboard.routes.js";
import attendanceRoutes from "../src/routes/attendance.routes.js";
import cronRoutes from "../src/routes/cron.routes.js";
import demoRoutes from "../src/routes/demo.routes.js";
import quizRoutes from "../src/routes/quiz.routes.js";
import marksRoutes from "../src/routes/marks.routes.js";
import assignmentRoutes from "../src/routes/assignment.routes.js";
import leaveRoutes from "../src/routes/leave.routes.js";
import meetRoutes from "../src/routes/meet.routes.js";
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
import timetableRoutes from "../src/routes/timetable.routes.js";
import academicRoutes from "../src/routes/academic.routes.js";
import webhookRoutes from "../src/routes/webhook.routes.js";
import threadChatRoutes from "../src/routes/thread_chat.routes.js";
import groupChatRoutes from "../src/routes/group_chat.routes.js";
import advancedQuizRoutes from "../src/routes/advanced_quiz.routes.js";
import pendingActionsRoutes from "../src/routes/pendingActions.routes.js";
import googleRoutes from "../src/routes/google.routes.js";
import holidaysRoutes from "../src/routes/holidays.routes.js";
import studentRoutes from "../src/routes/student.routes.js";
import facultyRoutes from "../src/routes/faculty.routes.js";
import studentProfileRoutes from "../src/routes/student-profile.routes.js";
import libraryRoutes from "../src/routes/library.routes.js";
import resultRoutes from "../src/routes/result.routes.js";
import examRoutes from "../src/routes/exam.routes.js";
import feedbackRoutes from "../src/routes/feedback.routes.js";
import courseRoutes from "../src/routes/course.routes.js";
import alumniRoutes from "../src/routes/alumni.routes.js";
import examinationsRoutes from '../src/routes/examinations.routes.js';
import internalTestsRoutes from "../src/routes/internal-tests.routes.js";
import eventsRoutes from "../src/routes/events.routes.js";
import academicPlanRoutes from "../src/routes/academic-plan.routes.js";
import crmRoutes from "../src/routes/crm.routes.js";
import certificateRoutes from "../src/routes/certificate.routes.js";
import feesRoutes from "../src/routes/fees.routes.js";
import pushRoutes from "../src/routes/push.routes.js";
import webPushRoutes from "../src/routes/web-push.routes.js";
import hierarchyRoutes from "../src/routes/hierarchy.routes.js";
import admissionRoutes from "../src/routes/admission.routes.js";
import onlineExamRoutes from "../src/routes/online-exam.routes.js";
import vivaRoutes from "../src/routes/viva.routes.js";
import analyticsRoutes from "../src/routes/analytics.routes.js";
import feeRecordRoutes from "../src/routes/fee-records.routes.js";
import teacherPlannerRoutes from "../src/routes/teacher-planner.routes.js";
import videoRoutes from "../src/routes/video.routes.js";
import liveRoutes from "../src/routes/live.routes.js";
import callRoutes from "../src/routes/call.routes.js";
import aiRoutes from "../src/routes/ai.routes.js";
import aiCreditsRoutes from "../src/routes/ai-credits.routes.js";
import aiCreditsTopupRoutes from "../src/routes/ai-credits-topup.routes.js";
import aiLibraryRoutes from "../src/routes/ai-library.routes.js";
import aiScheduleRoutes from "../src/routes/ai-schedule.routes.js";
import voiceRoutes from "../src/routes/voice.routes.js";
import marketplaceRoutes from "../src/routes/marketplace.routes.js";
import auditRoutes from "../src/routes/audit.routes.js";
import externalRoutes from "../src/routes/external.routes.js";
import payrollRoutes from "../src/routes/payroll.routes.js";
import canteenRoutes from "../src/routes/canteen.routes.js";
import courseLibraryRoutes from "../src/routes/course-library.routes.js";
import pastPaperRoutes from "../src/routes/past-paper.routes.js";
import superAdminRoutes from "../src/routes/super-admin.routes.js";
import storageRoutes from "../src/routes/storage.routes.js";
import personalNotesRoutes from "../src/routes/personal-notes.routes.js";
import forumRoutes from "../src/routes/forum.routes.js";
import supportRoutes from "../src/routes/support.routes.js";
import changelogRoutes from "../src/routes/changelog.routes.js";
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
import { publicTenantRouter, orgWebsiteRouter, superAdminWebsiteRouter } from "../src/routes/org-website.routes.js";
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

      // Allow any *.classgrid.in subdomain (tenant portals)
      const isClassgridSubdomain = /^https:\/\/[a-z0-9-]+\.classgrid\.in$/.test(origin);
      const isLocalSubdomain = /^http:\/\/[a-z0-9-]+\.localhost(:\d+)?$/.test(origin);
      const isLocalhostDev = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

      if (allowedStatic.includes(origin) || isClassgridSubdomain || isLocalSubdomain || isLocalhostDev) {
        return callback(null, true);
      }

      // For white-labeled custom domains (e.g. erp.mycollege.edu), we must allow the origin dynamically.
      // Since we use Bearer tokens for auth, reflecting any https:// origin is safe.
      if (origin.startsWith("https://")) {
        return callback(null, true);
      }

      callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true
  });

app.use((req, res, next) => (isOAuthProviderPath(req.path) ? next() : apiCors(req, res, next)));

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
app.use("/api/notes", notesRoutes);
app.use("/api/classrooms", classroomRoutes);
app.use("/api/classroom", classroomRoutes); // Fix: Alias for singular access
app.use("/api/activity", activityRoutes);
app.use("/api/messages", messagingRoutes);
app.use("/api/classroom-chat", classroomChatRoutes);
app.use("/api/comments", commentsRoutes);
app.use("/api/org-chat", orgChatRoutes);
app.use("/api/organization", organizationRoutes);
app.use("/api/org", organizationRoutes);
app.use("/api/org-admin", orgAdminRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/demo", demoRoutes);
app.use("/api/digest", digestRoutes);
app.use("/api/attendance", attendanceDashboardRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/examinations", examinationsRoutes);
app.use("/api/cron", cronRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/marks", marksRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/platform-feedback", feedbackRoutes); // Added for frontend consistency
app.use("/api/courses", courseRoutes);
app.use("/api/meet", meetRoutes);
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
app.use("/api/timetable", timetableRoutes);
app.use("/api/academic", academicRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/billing/handoff", billingHandoffRoutes);
app.use("/api/billing/checkout", billingCheckoutRoutes);
app.use("/api/billing/demo", billingDemoRoutes);

// Razorpay centralized webhook (billing.classgrid.in)
import razorpayWebhookRoutes from "../src/routes/razorpay-webhook.routes.js";
app.use("/api/webhooks", razorpayWebhookRoutes);
app.use("/api/threads", threadChatRoutes);
app.use("/api/group-chat", groupChatRoutes);
app.use("/api/advanced-quiz", advancedQuizRoutes);
app.use("/api/pending-actions", pendingActionsRoutes);
app.use("/api/google", googleRoutes);
app.use("/api/holidays", holidaysRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/faculty", facultyRoutes);
app.use("/api/student-profile", studentProfileRoutes);
app.use("/api/library", libraryRoutes);
app.use("/api/results", resultRoutes);
app.use("/api/alumni", alumniRoutes);
app.use("/api/internal-tests", internalTestsRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/academic-plans", academicPlanRoutes);
app.use("/api/crm", crmRoutes);

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
app.use("/api/certificates", certificateRoutes);
app.use("/api/fees", feesRoutes);
app.use("/api/push", pushRoutes);
app.use("/api/web-push", webPushRoutes);
app.use("/api/hierarchy", hierarchyRoutes);
app.use("/api/admission", admissionRoutes);
app.use("/api/online-exam", onlineExamRoutes);
app.use("/api/viva", vivaRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/fee-records", feeRecordRoutes);
app.use("/api/teacher-planner", teacherPlannerRoutes);
app.use("/api/video", videoRoutes);
app.use("/api/live", liveRoutes);
app.use("/api/call", callRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/ai/credits", aiCreditsRoutes);
app.use("/api/ai/topup", aiCreditsTopupRoutes);
app.use("/api/ai/library", aiLibraryRoutes);
app.use("/api/ai/schedules", aiScheduleRoutes);
app.use("/api/ai-integrations", aiIntegrationsRoutes);
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/voice", voiceRoutes);
app.use("/api/marketplace", marketplaceRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/external", externalRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/canteen", canteenRoutes);
app.use("/api/course-library", courseLibraryRoutes);
app.use("/api/past-papers", pastPaperRoutes);
app.use("/api/super-admin/storage", storageRoutes);
app.use("/api/super-admin/storage/notes", personalNotesRoutes);
app.use("/api/super-admin", superAdminRoutes);
app.use("/api/forum", forumRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/changelog", changelogRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/build", buildRoutes);
app.use("/api/dropdowns", dropdownRoutes);
app.use("/api/public/tenant", publicTenantRouter);   // GET /api/public/tenant/resolve?slug=...
app.use("/api/org-website", orgWebsiteRouter);       // Org admin CMS endpoints
app.use("/api/super-admin", superAdminWebsiteRouter);// Super admin: list all websites

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
