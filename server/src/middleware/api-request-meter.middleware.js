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
 * Classgrid — API Request Metering Middleware
 *
 * Tracks the number of API requests per organization per day.
 * Uses an in-memory counter that flushes to MongoDB every 60 seconds
 * to avoid hammering the database on every single request.
 *
 * The nightly usage-metering worker reads these counters to build
 * the daily usage ledger for Pay-As-You-Go billing.
 */

import mongoose from "mongoose";

// ── In-memory counters ────────────────────────────────────────────
// Shape: Map<orgId, { requests: number, bytesIn: number, bytesOut: number }>
const orgCounters = new Map();
let flushTimer = null;

// ── Mongoose model for persisted daily API metrics ────────────────
const apiMetricBucketSchema = new mongoose.Schema(
    {
        organization_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            index: true,
        },
        day: {
            type: Date,
            required: true,
            index: true,
        },
        requests: {
            type: Number,
            default: 0,
            min: 0,
        },
        bytesIn: {
            type: Number,
            default: 0,
            min: 0,
        },
        bytesOut: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    { timestamps: true }
);

apiMetricBucketSchema.index({ organization_id: 1, day: 1 }, { unique: true });

const ApiMetricBucket =
    mongoose.models.ApiMetricBucket ||
    mongoose.model("ApiMetricBucket", apiMetricBucketSchema);

// ── Helper: get start of today (UTC) ──────────────────────────────
function startOfUtcDay() {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// ── Flush counters to MongoDB ─────────────────────────────────────
async function flushCounters() {
    if (orgCounters.size === 0) return;

    const day = startOfUtcDay();
    const batch = new Map(orgCounters);
    orgCounters.clear();

    const bulkOps = [];
    for (const [orgId, counter] of batch.entries()) {
        bulkOps.push({
            updateOne: {
                filter: {
                    organization_id: new mongoose.Types.ObjectId(orgId),
                    day,
                },
                update: {
                    $inc: {
                        requests: counter.requests,
                        bytesIn: counter.bytesIn,
                        bytesOut: counter.bytesOut,
                    },
                },
                upsert: true,
            },
        });
    }

    if (bulkOps.length > 0) {
        try {
            await ApiMetricBucket.bulkWrite(bulkOps, { ordered: false });
        } catch (err) {
            console.error("[ApiMeter] flush error:", err.message);
            // Put the failed counters back so we don't lose data
            for (const [orgId, counter] of batch.entries()) {
                const existing = orgCounters.get(orgId) || { requests: 0, bytesIn: 0, bytesOut: 0 };
                existing.requests += counter.requests;
                existing.bytesIn += counter.bytesIn;
                existing.bytesOut += counter.bytesOut;
                orgCounters.set(orgId, existing);
            }
        }
    }
}

// ── Express Middleware ─────────────────────────────────────────────
export function apiRequestMeter(req, res, next) {
    // Skip cron, health, and public routes
    if (
        req.path.startsWith("/api/cron") ||
        req.path === "/api/health" ||
        req.path === "/api/status"
    ) {
        return next();
    }

    // Extract organization_id from the authenticated user (set by auth middleware)
    const orgId =
        req.effectiveOrganizationId ||
        (req.effectiveOrganizationId || req.user?.organization_id)?.toString() ||
        req.user?.organizationId?.toString?.() ||
        req.headers["x-org-id"];

    if (!orgId || !mongoose.Types.ObjectId.isValid(orgId)) {
        return next();
    }

    // Count the request
    const counter = orgCounters.get(orgId) || { requests: 0, bytesIn: 0, bytesOut: 0 };
    counter.requests += 1;
    counter.bytesIn += Number(req.headers["content-length"] || 0);
    orgCounters.set(orgId, counter);

    // Track response size when the response finishes
    const originalEnd = res.end;
    res.end = function (chunk, encoding) {
        if (chunk) {
            const existing = orgCounters.get(orgId);
            if (existing) {
                existing.bytesOut += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk, encoding);
            }
        }
        return originalEnd.call(this, chunk, encoding);
    };

    // Start the flush timer if not already running
    if (!flushTimer) {
        flushTimer = setInterval(() => {
            flushCounters().catch((err) =>
                console.error("[ApiMeter] periodic flush error:", err.message)
            );
        }, 60_000); // Flush every 60 seconds
        flushTimer.unref(); // Don't keep the process alive just for this
    }

    next();
}

// ── Export for the metering service to read ────────────────────────
export { ApiMetricBucket };

// ── Graceful shutdown: flush remaining counters ───────────────────
process.on("SIGTERM", () => flushCounters());
process.on("SIGINT", () => flushCounters());
