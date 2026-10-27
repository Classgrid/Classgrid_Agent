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

import BillingExportJob from "../models/BillingExportJob.js";
import PaymentTransaction from "../models/PaymentTransaction.js";
import PaymentFailure from "../models/PaymentFailure.js";
import WebhookEvent from "../models/WebhookEvent.js";
import { uploadPrivateBufferToR2 } from "../config/r2Client.js";

const MAX_EXPORT_ROWS = 100000;
const SENSITIVE_KEY = /(authorization|password|token|secret|signature|cookie|email|contact|phone|name|address|card|vpa|ipaddress|useragent)/i;

function csvCell(value) {
    let text = value === null || value === undefined ? "" : String(value);
    if (/^[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
}

function redact(value) {
    if (Array.isArray(value)) return value.map(redact);
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [
        key,
        SENSITIVE_KEY.test(key) ? "[REDACTED]" : redact(nested),
    ]));
}

async function buildRevenueReport(filters = {}) {
    const match = {
        status: "CAPTURED",
        paymentFlow: "CLASSGRID_SUBSCRIPTION",
        merchantType: "CLASSGRID",
    };
    if (filters.startDate || filters.endDate) {
        match.capturedAt = {};
        if (filters.startDate) {
            const start = new Date(filters.startDate);
            if (Number.isNaN(start.getTime())) throw new Error("Invalid revenue export startDate");
            match.capturedAt.$gte = start;
        }
        if (filters.endDate) {
            const end = new Date(filters.endDate);
            if (Number.isNaN(end.getTime())) throw new Error("Invalid revenue export endDate");
            match.capturedAt.$lte = end;
        }
    }

    const transactions = await PaymentTransaction.find(match)
        .populate("organizationId", "name sidebar_name")
        .sort({ capturedAt: -1 })
        .limit(MAX_EXPORT_ROWS + 1)
        .lean();
    if (transactions.length > MAX_EXPORT_ROWS) {
        throw new Error(`Revenue export exceeds the ${MAX_EXPORT_ROWS} row limit`);
    }
    const header = [
        "Transaction ID", "Organization ID", "Organization", "Captured At",
        "Gross Paise", "Gateway Fee Paise", "Net Paise", "Currency", "Provider Payment ID",
    ];
    const rows = transactions.map((transaction) => {
        const organization = transaction.organizationId;
        const organizationId = organization?._id || organization;
        const gross = Number(transaction.amountCapturedPaise) || 0;
        const fee = Number(transaction.feePaise) || 0;
        return [
            transaction._id,
            organizationId,
            organization?.sidebar_name || organization?.name || "",
            transaction.capturedAt?.toISOString?.() || transaction.capturedAt || "",
            gross,
            fee,
            gross - fee,
            transaction.currency,
            transaction.providerPaymentId,
        ].map(csvCell).join(",");
    });
    return {
        buffer: Buffer.from([header.map(csvCell).join(","), ...rows].join("\r\n"), "utf8"),
        fileName: `classgrid-revenue-${new Date().toISOString().slice(0, 10)}.csv`,
        contentType: "text/csv; charset=utf-8",
    };
}

async function buildFailureDiagnostic(filters = {}) {
    const failure = await PaymentFailure.findById(filters.failureId)
        .populate("organizationId", "_id name")
        .populate("paymentOrderId")
        .populate("paymentAttemptId")
        .populate("assignedTo", "_id")
        .lean();
    if (!failure) throw new Error("Payment failure no longer exists");

    const paymentId = failure.paymentAttemptId?.providerPaymentId;
    const webhooks = paymentId
        ? await WebhookEvent.find({
            $or: [
                { "payload.payload.payment.entity.id": paymentId },
                { "payload.payload.refund.entity.payment_id": paymentId },
            ],
        }).sort({ receivedAt: -1 }).limit(50).lean()
        : [];
    const diagnostic = {
        generatedAt: new Date().toISOString(),
        failure: {
            id: failure._id,
            organizationId: failure.organizationId?._id || failure.organizationId,
            paymentOrderId: failure.paymentOrderId?._id || failure.paymentOrderId,
            paymentAttemptId: failure.paymentAttemptId?._id || failure.paymentAttemptId,
            failureStage: failure.failureStage,
            errorCode: failure.errorCode,
            errorDescription: failure.errorDescription,
            errorSource: failure.errorSource,
            errorStep: failure.errorStep,
            errorReason: failure.errorReason,
            responsibility: failure.responsibility,
            retryEligibility: failure.retryEligibility,
            resolved: failure.resolved,
            assignedTo: failure.assignedTo?._id || failure.assignedTo,
            recoveryAttempts: failure.recoveryAttempts || [],
            createdAt: failure.createdAt,
            updatedAt: failure.updatedAt,
        },
        order: failure.paymentOrderId ? {
            id: failure.paymentOrderId._id,
            paymentFlow: failure.paymentOrderId.paymentFlow,
            merchantType: failure.paymentOrderId.merchantType,
            amountPaise: failure.paymentOrderId.amountPaise,
            currency: failure.paymentOrderId.currency,
            status: failure.paymentOrderId.status,
            providerOrderId: failure.paymentOrderId.providerOrderId,
        } : null,
        attempt: failure.paymentAttemptId ? {
            id: failure.paymentAttemptId._id,
            stage: failure.paymentAttemptId.stage,
            providerPaymentId: failure.paymentAttemptId.providerPaymentId,
            method: failure.paymentAttemptId.method,
            amountPaise: failure.paymentAttemptId.amountPaise,
            createdAt: failure.paymentAttemptId.createdAt,
        } : null,
        webhooks: webhooks.map((webhook) => ({
            id: webhook._id,
            providerEventId: webhook.providerEventId,
            eventType: webhook.eventType,
            signatureValid: webhook.signatureValid,
            receivedAt: webhook.receivedAt,
            processedAt: webhook.processedAt,
            processingStatus: webhook.processingStatus,
            retryCount: webhook.retryCount,
            lastError: webhook.lastError,
            ...(filters.includeRedactedPayload ? { payload: redact(webhook.payload) } : {}),
        })),
    };
    return {
        buffer: Buffer.from(JSON.stringify(redact(diagnostic), null, 2), "utf8"),
        fileName: `payment-failure-${failure._id}-diagnostic.json`,
        contentType: "application/json; charset=utf-8",
    };
}

async function buildExport(job) {
    if (job.exportType === "REVENUE_REPORT") return buildRevenueReport(job.filters || {});
    if (job.exportType === "FAILED_PAYMENT_DIAGNOSTIC") return buildFailureDiagnostic(job.filters || {});
    throw new Error(`Unsupported billing export type: ${job.exportType}`);
}

export async function processNextBillingExportJob() {
    const job = await BillingExportJob.findOneAndUpdate(
        { status: "PENDING", expiresAt: { $gt: new Date() } },
        { $set: { status: "PROCESSING", errorDetails: null } },
        { returnDocument: 'after', sort: { createdAt: 1 } },
    );
    if (!job) return null;

    try {
        const output = await buildExport(job);
        const objectKey = `private/billing-exports/${job._id}/${output.fileName}`;
        await uploadPrivateBufferToR2(output.buffer, objectKey, output.contentType);
        job.status = "COMPLETED";
        job.storageKey = objectKey;
        job.fileName = output.fileName;
        job.contentType = output.contentType;
        job.sizeBytes = output.buffer.length;
        job.completedAt = new Date();
        await job.save();
    } catch (error) {
        job.status = "FAILED";
        job.errorDetails = String(error.message || "Billing export failed").slice(0, 1000);
        await job.save();
    }
    return job;
}

export async function processBillingExportJobs(maxJobs = 3) {
    const stats = { processed: 0, completed: 0, failed: 0 };
    for (let index = 0; index < maxJobs; index += 1) {
        const job = await processNextBillingExportJob();
        if (!job) break;
        stats.processed += 1;
        if (job.status === "COMPLETED") stats.completed += 1;
        if (job.status === "FAILED") stats.failed += 1;
    }
    await BillingExportJob.updateMany(
        { status: { $in: ["PENDING", "PROCESSING", "COMPLETED"] }, expiresAt: { $lte: new Date() } },
        { $set: { status: "EXPIRED" } },
    );
    return stats;
}
