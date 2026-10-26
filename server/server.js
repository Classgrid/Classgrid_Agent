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
// Trigger deployment check - Oct 4
// trigger
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
// ─────────────────────────────────────────────────────────
// 🎤 STEP 0: Override console BEFORE any imports
//    so that EVERY SINGLE log is captured into the database
// ─────────────────────────────────────────────────────────
process.env.AWS_SUPPRESS_NODE_VERSION_WARNING = "1";
process.env.AWS_SDK_JS_SUPPRESS_MAINTENANCE_MODE_MESSAGE = "1";

import util from "util";
import "./env.js"; // 🔥 Load env first so MONGODB_URI is available
import accessLogger from "./src/config/logger.js";


const origLog = console.log;
const origError = console.error;
const origWarn = console.warn;
const origInfo = console.info;

// Send to BOTH: Winston (→ MongoDB) AND original stdout
console.log = (...args) => { const msg = util.format(...args); origLog(msg); accessLogger.info(msg); };
console.error = (...args) => { const msg = util.format(...args); origError(msg); accessLogger.error(msg); };
console.warn = (...args) => { const msg = util.format(...args); origWarn(msg); accessLogger.warn(msg); };
console.info = (...args) => { const msg = util.format(...args); origInfo(msg); accessLogger.info(msg); };

// 🔥 ENV is loaded at the top now

import app from "./api/index.js";
import http from "http";

// 👷 Start Background Workers
// Local dev (`npm run dev` in client sets CG_LOCAL_DEV=1) skips them: the live server stays the only one running schedules, emails and cron jobs
if (process.env.CG_LOCAL_DEV !== "1") await import("./src/workers/index.js");

const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer(app);

// ─────────────────────────────────────────────────────────
// 🛡️  Global crash guards — prevent one bad request from
//     killing the entire Node.js process.
//     Logs errors but keeps the server alive.
// ─────────────────────────────────────────────────────────
process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception — server kept alive:", err.message);
  console.error(err.stack);
  // Do NOT call process.exit() — let it keep running
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Promise Rejection — server kept alive:");
  console.error("Promise:", promise);
  console.error("Reason:", reason);
  // Persist to SystemLog so AlertsPage shows real data
  import("./src/controllers/super-admin.controller.js")
    .then(({ captureError }) => captureError(
      reason instanceof Error ? reason : new Error(String(reason)),
      "unhandledRejection"
    ))
    .catch(() => { /* best-effort */ });
  // Do NOT call process.exit() — let it keep running
});

// ─────────────────────────────────────────────────────────
// 🚀  Start Server (Native Socket.io via Redis Adapter)
// ─────────────────────────────────────────────────────────
import { initSocket } from "./src/services/socket.service.js";
import { initLeadStream } from "./src/services/lead-stream.service.js";

// Initialize socket on our HTTP server
const ioInstance = initSocket(server);
app.set("io", ioInstance);

// Initialize MongoDB Change Streams for real-time updates
initLeadStream();

server.listen(PORT, () => {
  console.log(`🔥 Server running at http://localhost:${PORT} (Socket.io Native)`);
  // WhatsApp call tasks stopped by a restart are continued (main server only, never on local dev)
  if (process.env.CG_LOCAL_DEV !== "1") {
    import("./src/services/whatsapp-call.service.js").then((m) => m.startCallJobResumer()).catch((e) => console.error("[WA call] task resumer failed to start:", e.message));
    // Long Agent tasks: the 5-minute alarm that wakes sleeping tasks (time, tokens back, restart, 48 h end)
    import("./src/services/agent-task.service.js").then((m) => m.startAgentTaskAlarm()).catch((e) => console.error("[agent task] alarm failed to start:", e.message));
    // Emails to Classgrid AI's own inbox (agent@classgrid.in): checked every 45 seconds, handled like WhatsApp messages
    import("./src/services/agent-task.service.js").then((m) => m.startAgentEmailWatcher()).catch((e) => console.error("[agent task] email watcher failed to start:", e.message));
  }
});

// ─────────────────────────────────────────────────────────
// 🛑 Graceful Shutdown for Zero-Downtime Deployments (PM2)
// ─────────────────────────────────────────────────────────
import mongoose from "mongoose";
import redis from "./src/config/redis.js";

process.on('SIGINT', () => {
  console.log('🛑 PM2 SIGINT received: Gracefully shutting down HTTP server...');

  // Close the server first so we stop accepting new requests
  server.close(async () => {
    try {
      console.log('⏳ HTTP server closed. Disconnecting databases...');

      // Close MongoDB connection
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close(false);
        console.log('✅ MongoDB disconnected.');
      }

      // Close Redis connection
      if (redis.status === 'ready') {
        await redis.quit();
        console.log('✅ Redis disconnected.');
      }

      console.log('✅ All active connections finished. Exiting safely.');
      process.exit(0);
    } catch (err) {
      console.error('❌ Error during graceful shutdown:', err);
      process.exit(1);
    }
  });

  // Failsafe timeout: Force exit after 28 seconds if graceful shutdown hangs
  setTimeout(() => {
    console.error('❌ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 28000);
});
// Force deploy

// redeploy trigger 3

// deploy test: main restarts first, rescue after
// deploy test 1
// deploy test 2
// deploy test 3
// deploy test 4
// deploy test 5
// redeploy: code restored to cbb3de8

// redeploy trigger
// redeploy trigger 2
