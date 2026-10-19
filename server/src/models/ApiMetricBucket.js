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

import mongoose from "mongoose";

// ═══════════════════════════════════════════════════════════
//  ApiMetrics — In-memory aggregated request tracking
//  Strategy: Buffer in-process, flush to DB every 60s.
//  Per-route stats are aggregated (not per-request docs) to
//  avoid write pressure at scale.
// ═══════════════════════════════════════════════════════════

const ApiMetricBucketSchema = new mongoose.Schema({
    // e.g. "GET /api/auth/me"
    route: { type: String, required: true },
    method: { type: String, required: true },
    // Hour-level bucketing — one doc per route per hour
    bucket: { type: Date, required: true },   // rounded to hour
    totalRequests: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },   // 2xx
    clientErrCount: { type: Number, default: 0 },   // 4xx
    serverErrCount: { type: Number, default: 0 },   // 5xx
    totalRespTimeMs: { type: Number, default: 0 }, // sum — divide by totalRequests for avg
    // Rolling last-10 failures (capped array)
    recentFailures: [{
        statusCode: Number,
        errorMessage: String,
        timestamp: Date,
        orgId: String,
    }],
    lastFailureAt: { type: Date },
    updatedAt: { type: Date, default: Date.now },
}, { timestamps: false });

ApiMetricBucketSchema.index({ route: 1, method: 1, bucket: -1 });
ApiMetricBucketSchema.index({ bucket: -1 });

export default mongoose.models.ApiMetricBucket || mongoose.model("ApiMetricBucket", ApiMetricBucketSchema);
