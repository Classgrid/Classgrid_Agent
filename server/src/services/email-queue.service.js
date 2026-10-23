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
 * Classgrid — Email Queue Service
 *
 * MongoDB-backed email job queue with:
 *  - Atomic job locking (pending → processing via findOneAndUpdate)
 *  - Exponential backoff retry (2^attempt * 30s, max 3 attempts)
 *  - 8-second execution time guard (Vercel Hobby 10s limit)
 *  - Batch size capped at 10 jobs per run
 */

import EmailJob from "../models/EmailJob.js";
import { sendEmail } from "./aws-ses.service.js";
import { asyncContext } from "../utils/async-context.js";
import accessLogger from "../config/logger.js";

const MAX_BATCH_SIZE = 10;
const MAX_RUNTIME_MS = 8000; // 8 seconds — leave 2s buffer for Vercel's 10s limit
const BACKOFF_BASE_MS = 30_000; // 30 seconds

// ─────────────────────────────────────────────────
// ENQUEUE: Create a single email job
// ─────────────────────────────────────────────────
export async function enqueueEmail({
    to,
    subject,
    html,
    text = "",
    type = "other",
    channel = null,
    userId = null,
    classroomId = null,
    organizationId = null,
}) {
    try {
        const context = asyncContext.getStore();
        let effectiveUserId = userId || context?.userId || null;
        if (effectiveUserId && typeof effectiveUserId === 'string' && !/^[0-9a-fA-F]{24}$/.test(effectiveUserId)) effectiveUserId = null;

        let effectiveOrgId = organizationId || context?.orgId || null;
        if (effectiveOrgId && typeof effectiveOrgId === 'string' && !/^[0-9a-fA-F]{24}$/.test(effectiveOrgId)) effectiveOrgId = null;

        const job = await EmailJob.create({
            to,
            subject,
            html,
            text,
            type,
            channel,
            userId: effectiveUserId,
            classroomId,
            organizationId: effectiveOrgId,
            status: "pending",
            attempts: 0,
            nextRetryAt: new Date(),
        });
        console.log(`[EmailQueue] Job created: ${job._id} → ${to} (${type})`);
        return job;
    } catch (err) {
        console.error("[EmailQueue] Failed to enqueue email:", {
            to,
            type,
            error: err.message,
        });
        return null;
    }
}

// ─────────────────────────────────────────────────
// ENQUEUE BULK: Create multiple email jobs at once
// ─────────────────────────────────────────────────
export async function enqueueBulkEmails(payloads) {
    if (!payloads || !payloads.length) return [];

    try {
        const context = asyncContext.getStore();
        
        const docs = payloads.map((p) => {
            let eUserId = p.userId || context?.userId || null;
            if (eUserId && typeof eUserId === 'string' && !/^[0-9a-fA-F]{24}$/.test(eUserId)) eUserId = null;

            let eOrgId = p.organizationId || context?.orgId || null;
            if (eOrgId && typeof eOrgId === 'string' && !/^[0-9a-fA-F]{24}$/.test(eOrgId)) eOrgId = null;

            return {
                to: p.to,
                subject: p.subject,
                html: p.html,
                text: p.text || "",
                type: p.type || "other",
                channel: p.channel || null,
                userId: eUserId,
                classroomId: p.classroomId || null,
                organizationId: eOrgId,
                status: "pending",
                attempts: 0,
                nextRetryAt: new Date(),
            };
        });

        const jobs = await EmailJob.insertMany(docs, { ordered: false });
        console.log(
            `[EmailQueue] Bulk enqueued ${jobs.length} jobs (type: ${payloads[0]?.type || "other"})`
        );
        return jobs;
    } catch (err) {
        console.error("[EmailQueue] Bulk enqueue failed:", {
            count: payloads.length,
            error: err.message,
        });
        return [];
    }
}

// ─────────────────────────────────────────────────
// PROCESS: Worker that sends pending emails
// Called by cron endpoint every ~1 minute
// ─────────────────────────────────────────────────
export async function processEmailQueue(batchSize = MAX_BATCH_SIZE) {
    const startTime = Date.now();
    const effectiveBatch = Math.min(batchSize, MAX_BATCH_SIZE);
    const stats = { fetched: 0, sent: 0, failed: 0, skipped: 0, durationMs: 0 };

    try {
        accessLogger.info(`[EmailQueue] Processing started (batchSize=${effectiveBatch})`, {
            provider: 'email_queue',
            event: 'processing_start',
            batchSize: effectiveBatch
        });

        for (let i = 0; i < effectiveBatch; i++) {
            // ── Time guard: stop if approaching Vercel limit ──
            const elapsed = Date.now() - startTime;
            if (elapsed >= MAX_RUNTIME_MS) {
                console.log(
                    `[EmailQueue] Time guard hit at ${elapsed}ms — stopping after ${stats.sent + stats.failed} jobs`
                );
                break;
            }

            // ── Atomic lock: pending → processing ────────────
            const job = await EmailJob.findOneAndUpdate(
                {
                    status: { $in: ["pending", "failed"] },
                    nextRetryAt: { $lte: new Date() },
                    attempts: { $lt: 3 },
                },
                {
                    $set: { status: "processing" },
                    $inc: { attempts: 1 },
                },
                {
                    sort: { nextRetryAt: 1 }, // oldest first
                    returnDocument: "after",
                }
            );

            if (!job) {
                // No more jobs to process
                break;
            }

            stats.fetched++;

            try {
                // ── Send the email ────────────────────────────
                await sendEmail({
                    to: job.to,
                    subject: job.subject,
                    html: job.html,
                    text: job.text,
                    channel: job.channel || undefined,
                    userId: job.userId || undefined,
                    organizationId: job.organizationId || undefined,
                });

                // ── Mark as sent ─────────────────────────────
                await EmailJob.updateOne(
                    { _id: job._id },
                    {
                        $set: {
                            status: "sent",
                            processedAt: new Date(),
                            error: null,
                        },
                    }
                );
                stats.sent++;
                accessLogger.info(
                    `[EmailQueue] ✅ Sent: ${job._id} → ${job.to} (attempt ${job.attempts})`,
                    {
                        provider: 'email_queue',
                        event: 'sent',
                        jobId: job._id?.toString(),
                        to: job.to,
                        attempt: job.attempts,
                        userId: job.userId ? job.userId.toString() : undefined,
                        orgId: job.organizationId ? job.organizationId.toString() : undefined
                    }
                );
            } catch (sendErr) {
                // ── Handle send failure ───────────────────────
                const isLastAttempt = job.attempts >= job.maxAttempts;
                const nextStatus = isLastAttempt ? "failed" : "pending";
                const backoffMs = Math.pow(2, job.attempts) * BACKOFF_BASE_MS;
                const nextRetry = isLastAttempt
                    ? job.nextRetryAt
                    : new Date(Date.now() + backoffMs);

                await EmailJob.updateOne(
                    { _id: job._id },
                    {
                        $set: {
                            status: nextStatus,
                            error: sendErr.message || "Unknown error",
                            nextRetryAt: nextRetry,
                        },
                    }
                );

                stats.failed++;
                accessLogger.error(
                    `[EmailQueue] ❌ Failed: ${job._id} → ${job.to} (attempt ${job.attempts}/${job.maxAttempts})`,
                    {
                        provider: 'email_queue',
                        event: 'failed',
                        jobId: job._id?.toString(),
                        to: job.to,
                        attempt: job.attempts,
                        error: sendErr.message,
                        nextStatus,
                        nextRetry: nextRetry.toISOString(),
                        userId: job.userId ? job.userId.toString() : undefined,
                        orgId: job.organizationId ? job.organizationId.toString() : undefined
                    }
                );
            }
        }
    } catch (err) {
        console.error("[EmailQueue] Worker error:", err.message);
    }

    stats.durationMs = Date.now() - startTime;
    accessLogger.info(
        `[EmailQueue] Processing complete: fetched=${stats.fetched} sent=${stats.sent} failed=${stats.failed} duration=${stats.durationMs}ms`,
        {
            provider: 'email_queue',
            event: 'processing_complete',
            durationMs: stats.durationMs,
            fetched: stats.fetched,
            sent: stats.sent,
            failed: stats.failed
        }
    );
    return stats;
}

// ─────────────────────────────────────────────────
// RESEND: Reset a failed job back to pending
// ─────────────────────────────────────────────────
export async function resendEmailJob(jobId) {
    const job = await EmailJob.findOneAndUpdate(
        { _id: jobId, status: "failed" },
        {
            $set: {
                status: "pending",
                attempts: 0,
                error: null,
                nextRetryAt: new Date(),
            },
        },
        { returnDocument: "after" }
    );

    if (job) {
        console.log(`[EmailQueue] Job ${jobId} reset to pending for resend`);
    }
    return job;
}

// ─────────────────────────────────────────────────
// RESEND BY CLASSROOM: Reset all failed jobs for a classroom+type
// ─────────────────────────────────────────────────
export async function resendClassroomEmails(classroomId, type = null) {
    const filter = { classroomId, status: "failed" };
    if (type) filter.type = type;

    const result = await EmailJob.updateMany(filter, {
        $set: {
            status: "pending",
            attempts: 0,
            error: null,
            nextRetryAt: new Date(),
        },
    });

    console.log(
        `[EmailQueue] Reset ${result.modifiedCount} failed jobs for classroom ${classroomId}`
    );
    return result.modifiedCount;
}

// ─────────────────────────────────────────────────
// STATS: Get email delivery statistics
// ─────────────────────────────────────────────────
export async function getEmailStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [total, sent, failed, pending, todaySent, todayFailed] =
        await Promise.all([
            EmailJob.countDocuments(),
            EmailJob.countDocuments({ status: "sent" }),
            EmailJob.countDocuments({ status: "failed" }),
            EmailJob.countDocuments({
                status: { $in: ["pending", "processing"] },
            }),
            EmailJob.countDocuments({
                status: "sent",
                processedAt: { $gte: todayStart },
            }),
            EmailJob.countDocuments({
                status: "failed",
                updatedAt: { $gte: todayStart },
            }),
        ]);

    const successRate =
        sent + failed > 0
            ? Math.round((sent / (sent + failed)) * 100 * 10) / 10
            : 100;

    return {
        total,
        sent,
        failed,
        pending,
        successRate,
        today: { sent: todaySent, failed: todayFailed },
    };
}

// ─────────────────────────────────────────────────
// LOGS: Paginated email job list
// ─────────────────────────────────────────────────
export async function getEmailLogs({
    page = 1,
    limit = 50,
    status = null,
    classroomId = null,
    type = null,
} = {}) {
    const filter = {};
    if (status) filter.status = status;
    if (classroomId) filter.classroomId = classroomId;
    if (type) filter.type = type;

    const skip = (page - 1) * limit;

    const [jobs, totalCount] = await Promise.all([
        EmailJob.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select("-html -text") // Exclude heavy fields from list view
            .lean(),
        EmailJob.countDocuments(filter),
    ]);

    return {
        jobs,
        totalCount,
        page,
        totalPages: Math.ceil(totalCount / limit),
    };
}
