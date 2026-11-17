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

import PaymentFailure from "../../models/PaymentFailure.js";
import PaymentAttempt from "../../models/PaymentAttempt.js";
import PaymentTransaction from "../../models/PaymentTransaction.js";
import WebhookEvent from "../../models/WebhookEvent.js";
import User from "../../models/User.js";
import BillingExportJob from "../../models/BillingExportJob.js";
import BillingAuditLog from "../../models/BillingAuditLog.js";
import razorpayService from "../../services/razorpay.service.js";
import { dispatchNotification } from "../../services/notification.service.js";
// Read only, for the Classgrid AI failed payments pages (the /ai routes at the end of this file):
// - PlatformTransaction is the one row the Razorpay webhook always writes for a failed payment.
// - PaymentOrder tells an AI checkout ("ai_" receipt) apart from other orders when Razorpay's notes are missing.
// - AiCreditTransaction is the ledger of successful plan and AI credit payments, used for "paid later".
// - PlanConfig gives the plan names the super admin set. Nothing here writes to any of them.
import mongoose from "mongoose";
import PlatformTransaction from "../../models/PlatformTransaction.js";
import PaymentOrder from "../../models/PaymentOrder.js";
import AiCreditTransaction from "../../models/AiCreditTransaction.js";
import PlanConfig from "../../models/PlanConfig.js";

const PLATFORM_ASSIGNEE_ROLES = ["super_admin", "co_super_admin"];
const ORGANIZATION_ADMIN_ROLES = ["org_admin", "principal", "fee_manager"];

function auditContext(req) {
    return {
        actorId: req.user?._id || null,
        ipAddress: req.ip || null,
        requestId: req.id || req.headers["x-request-id"] || null,
    };
}

async function recordFailureAudit(req, failure, action, oldState, newState, reason = null) {
    return BillingAuditLog.create({
        ...auditContext(req),
        organizationId: failure.organizationId?._id || failure.organizationId,
        entityType: "PaymentFailure",
        entityId: failure._id,
        action,
        reason,
        oldState,
        newState,
    });
}

function serializeFailure(document) {
    const failure = typeof document?.toObject === "function" ? document.toObject() : document;
    if (!failure) return failure;
    return {
        ...failure,
        notes: (failure.internalNotes || []).map((note) => ({
            id: note._id,
            authorId: note.authorId,
            text: note.text,
            timestamp: note.createdAt,
        })),
        recoveryAttempts: failure.recoveryAttempts || [],
        rawPayload: {
            errorCode: failure.errorCode || null,
            errorDescription: failure.errorDescription || null,
            errorSource: failure.errorSource || null,
            errorStep: failure.errorStep || null,
            errorReason: failure.errorReason || null,
        },
    };
}

async function providerForOrder(order) {
    if (order.merchantType === "CLASSGRID") {
        return razorpayService.getPlatformInstance();
    }
    const merchantOrganizationId = order.merchantOrganizationId || order.organizationId;
    if (!merchantOrganizationId) throw new Error("Merchant organization is missing");
    return razorpayService.getInstance(merchantOrganizationId, "fees");
}

async function loadFailure(failureId) {
    return PaymentFailure.findById(failureId)
        .populate("organizationId paymentOrderId paymentAttemptId assignedTo");
}

export const listFailedPayments = async (req, res) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 50, 200);
        const page = Math.max(Number(req.query.page) || 1, 1);
        const filter = {};
        if (req.query.status === "RESOLVED") filter.resolved = true;
        if (req.query.status === "UNRESOLVED") filter.resolved = { $ne: true };
        if (req.query.failureStage) filter.failureStage = req.query.failureStage;
        if (req.query.responsibility) filter.responsibility = req.query.responsibility;
        if (req.query.organizationId) filter.organizationId = req.query.organizationId;

        const [failures, total] = await Promise.all([
            PaymentFailure.find(filter)
                .populate("organizationId paymentOrderId paymentAttemptId assignedTo")
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            PaymentFailure.countDocuments(filter),
        ]);
        res.json({
            success: true,
            data: failures.map(serializeFailure),
            pagination: { page, limit, total },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getFailureOverview = async (_req, res) => {
    try {
        const failures = await PaymentFailure.aggregate([
            { $match: { resolved: { $ne: true } } },
            {
                $lookup: {
                    from: "paymentorders",
                    localField: "paymentOrderId",
                    foreignField: "_id",
                    as: "paymentOrder",
                },
            },
            { $unwind: { path: "$paymentOrder", preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: null,
                    failedPaymentsCount: { $sum: 1 },
                    revenueAtRiskPaise: { $sum: { $ifNull: ["$paymentOrder.amountPaise", 0] } },
                    uniqueOrgs: { $addToSet: "$organizationId" },
                },
            },
        ]);
        const stats = failures[0] || { failedPaymentsCount: 0, revenueAtRiskPaise: 0, uniqueOrgs: [] };
        res.json({
            success: true,
            data: {
                failedPayments: stats.failedPaymentsCount,
                revenueAtRiskPaise: stats.revenueAtRiskPaise,
                affectedOrgs: stats.uniqueOrgs.length,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getFailedPayment = async (req, res) => {
    try {
        const failure = await loadFailure(req.params.failureId);
        if (!failure) return res.status(404).json({ success: false, message: "Failure record not found" });
        res.json({ success: true, data: serializeFailure(failure) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const generatePaymentLink = async (req, res) => {
    try {
        const failure = await loadFailure(req.params.failureId);
        if (!failure) return res.status(404).json({ success: false, message: "Failure not found" });
        if (!failure.retryEligibility || failure.resolved) {
            return res.status(409).json({ success: false, message: "This failure is not eligible for a new payment link" });
        }

        const order = failure.paymentOrderId;
        const amountPaise = Number(order?.amountPaise);
        if (!Number.isSafeInteger(amountPaise) || amountPaise < 1) {
            return res.status(409).json({ success: false, message: "The stored payment order has an invalid amount" });
        }
        if (req.body.amountPaise !== undefined && Number(req.body.amountPaise) !== amountPaise) {
            return res.status(409).json({
                success: false,
                message: "A recovery link must use the original stored order amount",
            });
        }

        const expiryHours = Number(req.body.expiryHours || 24);
        if (!Number.isInteger(expiryHours) || expiryHours < 1 || expiryHours > 168) {
            return res.status(400).json({ success: false, message: "expiryHours must be an integer between 1 and 168" });
        }

        const provider = await providerForOrder(order);
        const organization = failure.organizationId;
        const email = organization?.billing_settings?.invoice_email || organization?.email || "";
        const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
        const paymentLink = await provider.paymentLink.create({
            amount: amountPaise,
            currency: String(order.currency || "INR").toUpperCase(),
            description: `Payment recovery for order ${order.receiptId}`,
            customer: {
                name: organization?.name || organization?.sidebar_name || "Organization billing contact",
                ...(email ? { email } : {}),
            },
            notify: { sms: false, email: Boolean(email) },
            reminder_enable: true,
            expire_by: Math.floor(expiresAt.getTime() / 1000),
            notes: {
                failure_id: failure._id.toString(),
                payment_order_id: order._id.toString(),
            },
        });
        if (!paymentLink?.short_url || !paymentLink?.id) {
            throw new Error("Provider did not return a payment link");
        }

        const attempt = await PaymentAttempt.create({
            paymentOrderId: order._id,
            organizationId: organization._id,
            stage: "TOKEN_CREATED",
            amountPaise,
            createdBy: req.user?._id,
        });
        failure.recoveryAttempts.push({
            action: "PAYMENT_LINK_CREATED",
            status: "SUCCESS",
            note: `Secure provider link created; expires ${expiresAt.toISOString()}`,
            actorId: req.user?._id,
        });
        await failure.save();
        await recordFailureAudit(
            req,
            failure,
            "PAYMENT_LINK_CREATED",
            { retryEligibility: true },
            { attemptId: attempt._id, providerPaymentLinkId: paymentLink.id, expiresAt },
            String(req.body.reason || "Payment recovery requested").slice(0, 500),
        );

        res.status(201).json({
            success: true,
            data: { link: paymentLink.short_url, expiresAt, attemptId: attempt._id },
        });
    } catch (error) {
        const status = /not configured|Razorpay|Provider/i.test(error.message) ? 503 : 400;
        res.status(status).json({ success: false, message: error.message });
    }
};

export const retryWebhook = async (req, res) => {
    try {
        const failure = await loadFailure(req.params.failureId);
        if (!failure) return res.status(404).json({ success: false, message: "Failure not found" });
        const providerPaymentId = failure.paymentAttemptId?.providerPaymentId;
        if (!providerPaymentId) {
            return res.status(409).json({ success: false, message: "This failure has no provider payment ID" });
        }
        const webhook = await WebhookEvent.findOne({
            processingStatus: "FAILED",
            $or: [
                { "payload.payload.payment.entity.id": providerPaymentId },
                { "payload.payload.refund.entity.payment_id": providerPaymentId },
            ],
        }).sort({ receivedAt: -1 });
        if (!webhook) {
            return res.status(404).json({ success: false, message: "No failed webhook was found for this payment" });
        }

        webhook.processingStatus = "PENDING";
        webhook.retryCount += 1;
        webhook.lastError = null;
        await webhook.save();
        failure.recoveryAttempts.push({
            action: "WEBHOOK_RETRY_QUEUED",
            status: "QUEUED",
            note: `Webhook ${webhook.providerEventId} queued for retry`,
            actorId: req.user?._id,
        });
        await failure.save();
        await recordFailureAudit(
            req,
            failure,
            "WEBHOOK_RETRY_QUEUED",
            { webhookStatus: "FAILED" },
            { webhookId: webhook._id, webhookStatus: "PENDING", retryCount: webhook.retryCount },
        );
        res.status(202).json({ success: true, data: { webhookId: webhook._id, status: webhook.processingStatus } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const recheckProvider = async (req, res) => {
    try {
        const failure = await loadFailure(req.params.failureId);
        if (!failure) return res.status(404).json({ success: false, message: "Failure not found" });
        const order = failure.paymentOrderId;
        const provider = await providerForOrder(order);
        let payment = null;
        if (failure.paymentAttemptId?.providerPaymentId) {
            payment = await provider.payments.fetch(failure.paymentAttemptId.providerPaymentId);
        } else {
            const response = await provider.orders.fetchPayments(order.providerOrderId);
            payment = [...(response?.items || [])].sort((a, b) => Number(b.created_at) - Number(a.created_at))[0] || null;
        }
        if (!payment) {
            return res.status(404).json({ success: false, message: "Provider has no payment attempt for this order" });
        }
        if (payment.order_id !== order.providerOrderId ||
            Number(payment.amount) !== Number(order.amountPaise) ||
            String(payment.currency || "").toUpperCase() !== String(order.currency || "INR").toUpperCase()) {
            return res.status(409).json({ success: false, message: "Provider payment does not match the stored order" });
        }

        const localTransaction = await PaymentTransaction.findOne({ providerPaymentId: payment.id });
        const providerStatus = String(payment.status || "").toUpperCase();
        const reconciled = providerStatus === "CAPTURED" && localTransaction?.status === "CAPTURED";
        if (reconciled) {
            failure.resolved = true;
            failure.resolvedAt = new Date();
            failure.resolution = "Provider and local ledger both confirm the captured payment";
        }
        failure.recoveryAttempts.push({
            action: "PROVIDER_RECHECKED",
            status: reconciled ? "SUCCESS" : providerStatus === "CAPTURED" ? "REQUIRES_RECONCILIATION" : "SUCCESS",
            note: `Provider status: ${providerStatus}; local ledger: ${localTransaction?.status || "MISSING"}`,
            actorId: req.user?._id,
        });
        await failure.save();
        await recordFailureAudit(
            req,
            failure,
            "PROVIDER_RECHECKED",
            null,
            { providerStatus, localTransactionStatus: localTransaction?.status || null, reconciled },
        );
        res.json({
            success: true,
            data: { providerStatus, localTransactionStatus: localTransaction?.status || null, reconciled },
        });
    } catch (error) {
        const status = /not configured|Razorpay|Provider/i.test(error.message) ? 503 : 400;
        res.status(status).json({ success: false, message: error.message });
    }
};

export const notifyOrganization = async (req, res) => {
    try {
        const message = String(req.body.message || "").trim();
        if (message.length < 10 || message.length > 1000) {
            return res.status(400).json({ success: false, message: "message must contain 10 to 1000 characters" });
        }
        const failure = await loadFailure(req.params.failureId);
        if (!failure) return res.status(404).json({ success: false, message: "Failure not found" });
        const organizationId = failure.organizationId?._id || failure.organizationId;
        const recipients = await User.find({
            organization_id: organizationId,
            status: "active",
            $or: [
                { role: { $in: ORGANIZATION_ADMIN_ROLES } },
                { additional_roles: { $in: ORGANIZATION_ADMIN_ROLES } },
            ],
        }).select("_id").lean();
        if (!recipients.length) {
            return res.status(409).json({ success: false, message: "No active organization administrator was found" });
        }

        const deliveries = await Promise.all(recipients.map((recipient) =>
            dispatchNotification({
                recipientId: recipient._id,
                orgId: organizationId,
                type: "fee_payment",
                title: "Billing payment requires attention",
                message,
                link: "/admin/billing",
                relatedId: failure._id.toString(),
                sendPush: true,
                sendEmail: true,
            })
        ));
        const delivered = deliveries.filter(Boolean).length;
        if (!delivered) {
            return res.status(502).json({ success: false, message: "The notification service did not accept any delivery" });
        }

        failure.userNotified = true;
        failure.organizationNotifiedAt = new Date();
        failure.recoveryAttempts.push({
            action: "ORGANIZATION_NOTIFIED",
            status: "SUCCESS",
            note: `Notification queued for ${delivered} organization administrator(s)`,
            actorId: req.user?._id,
        });
        await failure.save();
        await recordFailureAudit(
            req,
            failure,
            "ORGANIZATION_NOTIFIED",
            { userNotified: false },
            { userNotified: true, recipientCount: delivered },
        );
        res.status(202).json({ success: true, data: { recipientCount: delivered } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const exportDiagnostic = async (req, res) => {
    try {
        const failure = await PaymentFailure.findById(req.params.failureId).select("_id organizationId");
        if (!failure) return res.status(404).json({ success: false, message: "Failure not found" });
        const job = await BillingExportJob.create({
            exportType: "FAILED_PAYMENT_DIAGNOSTIC",
            format: "JSON",
            filters: {
                failureId: failure._id.toString(),
                includeRedactedPayload: req.body.includeRedactedPayload === true,
            },
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            requestedBy: req.user._id,
        });
        await recordFailureAudit(
            req,
            failure,
            "DIAGNOSTIC_EXPORT_QUEUED",
            null,
            { jobId: job._id, includeRedactedPayload: job.filters.includeRedactedPayload },
        );
        res.status(202).json({ success: true, data: job, message: "Diagnostic export queued" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const assignFailure = async (req, res) => {
    try {
        const assigneeId = req.body.userId;
        const assignee = await User.findOne({
            _id: assigneeId,
            status: "active",
            role: { $in: PLATFORM_ASSIGNEE_ROLES },
        }).select("_id");
        if (!assignee) {
            return res.status(400).json({ success: false, message: "Assignee must be an active platform administrator" });
        }
        const failure = await PaymentFailure.findById(req.params.failureId);
        if (!failure) return res.status(404).json({ success: false, message: "Failure not found" });
        const previousAssignee = failure.assignedTo;
        failure.assignedTo = assignee._id;
        failure.recoveryAttempts.push({
            action: "FAILURE_ASSIGNED",
            status: "SUCCESS",
            note: `Assigned to platform administrator ${assignee._id}`,
            actorId: req.user?._id,
        });
        await failure.save();
        await recordFailureAudit(
            req,
            failure,
            "ASSIGNED",
            { assignedTo: previousAssignee },
            { assignedTo: assignee._id },
        );
        res.json({ success: true, data: serializeFailure(failure) });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const addFailureNote = async (req, res) => {
    try {
        const note = String(req.body.note || "").trim();
        if (!note || note.length > 2000) {
            return res.status(400).json({ success: false, message: "note is required and must not exceed 2000 characters" });
        }
        const failure = await PaymentFailure.findById(req.params.failureId);
        if (!failure) return res.status(404).json({ success: false, message: "Failure not found" });
        failure.internalNotes.push({ authorId: req.user._id, text: note });
        await failure.save();
        await recordFailureAudit(
            req,
            failure,
            "INTERNAL_NOTE_ADDED",
            null,
            { noteId: failure.internalNotes.at(-1)?._id },
        );
        res.status(201).json({ success: true, data: serializeFailure(failure) });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const resolveFailure = async (req, res) => {
    try {
        const resolution = String(req.body.resolution || "").trim();
        if (resolution.length < 5 || resolution.length > 1000) {
            return res.status(400).json({ success: false, message: "resolution must contain 5 to 1000 characters" });
        }
        const failure = await PaymentFailure.findById(req.params.failureId);
        if (!failure) return res.status(404).json({ success: false, message: "Failure not found" });
        const oldState = { resolved: failure.resolved, resolution: failure.resolution };
        failure.resolved = true;
        failure.resolvedAt = new Date();
        failure.resolution = resolution;
        failure.recoveryAttempts.push({
            action: "FAILURE_RESOLVED",
            status: "SUCCESS",
            note: resolution,
            actorId: req.user?._id,
        });
        await failure.save();
        await recordFailureAudit(
            req,
            failure,
            "RESOLVED",
            oldState,
            { resolved: true, resolution, resolvedAt: failure.resolvedAt },
            resolution,
        );
        res.json({ success: true, data: serializeFailure(failure) });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// ═════════════════════════════════════════════════════════════════════════════════════════
// CLASSGRID AI FAILED PAYMENTS (GET /ai, /ai/summary, /ai/:id)
// The super admin's Failed Payments pages: plans and AI credits that failed on Razorpay. Everything below only reads.
// Why it is built this way:
// - The failed row (PlatformTransaction, status "failed") is always written by the webhook, but it does not keep what
//   the person tried to buy. That lives only in Razorpay's notes, inside the saved webhook message (WebhookEvent), so
//   the two are joined by the Razorpay payment id.
// - Rows whose notes name another payment type (the shut-down ERP's fees, invoices, canteen ...) are left out.
// - "Paid later" is read from the AiCreditTransaction ledger. PlatformTransaction cannot be used for that, because the
//   webhook's plan purchase row ("ai_plan" payment flow) is not in that model's enum and is never saved.
// ═════════════════════════════════════════════════════════════════════════════════════════

// The list and summary look at the newest 1,000 failed rows at most, so one request stays small and fast.
const SCAN_CAP = 1000;
const AI_PLAN_KEYS = ["pro", "max", "enterprise"];
const REASON_KEYS = ["cancelled", "timed_out", "insufficient_funds", "otp_pin", "declined", "limit", "risk", "upi", "technical", "other"];
const PLAN_FILTERS = ["all", "pro", "max", "enterprise", "credits", "unknown"];
const OUTCOME_FILTERS = ["all", "paid_later", "not_paid"];
const METHOD_KEYS = ["upi", "card", "netbanking", "wallet", "emi"];
// The webhook types of Classgrid AI checkouts (ai-credits-topup.controller.js startPlatformPayment)
const AI_PLAN_TYPE = "AI_PLAN";
const AI_TOPUP_TYPE = "AI_TOPUP";
const FAILED_ROW_FIELDS = "amount currency razorpayOrderId razorpayPaymentId note userName userEmail userMobile userId paymentMethod paymentTime createdAt";
const SUCCESS_FIELDS = "userId type plan_key plan_term amount_inr razorpay_payment_id razorpay_order_id paymentTime createdAt";
// A same-checkout success can be saved a moment before the failure's own row when Razorpay's messages arrive out of
// order, so the ledger is read from a little earlier than the oldest failure; the matching rules below still decide.
const SUCCESS_LOOKBACK_MS = 60 * 60 * 1000;
// Live Razorpay checks on the detail page give up after 5 seconds, so a slow Razorpay never holds the page.
const RAZORPAY_TIMEOUT_MS = 5000;

// Reason groups, tested in this order; the first match wins
const REASON_RULES = [
    ["insufficient_funds", ["insufficient"]],
    ["cancelled", ["cancel"]],
    ["otp_pin", ["otp", "pin", "authentication", "3ds"]],
    ["limit", ["limit"]],
    ["risk", ["risk", "fraud", "blocked"]],
    ["upi", ["vpa", "upi", "collect"]],
    ["timed_out", ["timed_out", "timeout", "session_expired"]],
    ["technical", ["technical", "server", "gateway", "network", "unavailable"]],
    ["declined", ["declin", "reject", "do_not_honour", "expired", "card"]],
];

function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function badRequest(res, code, message) {
    return res.status(400).json({ success: false, code, message });
}

function toIso(value) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

// A non-empty string, or null. The webhook's redaction leaves "[REDACTED]" in some fields, which is not a real value,
// and the saved note says "undefined" when Razorpay sent no description.
function cleanText(value) {
    if (value === undefined || value === null || typeof value === "object") return null;
    const text = String(value).trim();
    if (!text || text === "[REDACTED]" || text === "undefined" || text === "null") return null;
    return text;
}

// The webhook saves the note as "FAILED: <error_code> — <error_description>"; this reads both parts back, so a row
// whose webhook message was not saved still has Razorpay's words.
export function parseFailureNote(note) {
    const text = typeof note === "string" ? note : "";
    const body = text.startsWith("FAILED: ") ? text.slice("FAILED: ".length) : "";
    if (!body) return { code: null, description: null };
    const split = body.indexOf(" — ");
    if (split === -1) return { code: cleanText(body), description: null };
    return { code: cleanText(body.slice(0, split)), description: cleanText(body.slice(split + " — ".length)) };
}

// Razorpay's error_reason is tested first; only when it is empty is the description tested
export function reasonKeyFor(rawReason, description) {
    const raw = cleanText(rawReason);
    const text = (raw || cleanText(description) || "").toLowerCase();
    if (!text) return "other";
    for (const [key, words] of REASON_RULES) {
        if (words.some((word) => text.includes(word))) return key;
    }
    return "other";
}

export function whoFor(errorSource) {
    const source = (cleanText(errorSource) || "").toLowerCase();
    if (source === "customer") return "person";
    if (source === "issuer" || source === "bank") return "bank";
    if (source === "gateway" || source === "internal") return "razorpay";
    if (source === "business") return "classgrid";
    return null;
}

export function methodFor(storedMethod, entityMethod) {
    const method = (cleanText(storedMethod) || cleanText(entityMethod) || "").toLowerCase();
    if (!method) return null;
    return METHOD_KEYS.includes(method) ? method : "other";
}

// The super admin's name for a plan; if the PlanConfig row is missing, the key with a capital first letter
function planNameFor(planKey, planNames) {
    if (!planKey) return null;
    return planNames.get(planKey) || planKey.charAt(0).toUpperCase() + planKey.slice(1);
}

// What the person tried to buy, from Razorpay's notes. null = not a Classgrid AI payment (left out of the pages).
export function purchaseFor(notes, paymentOrder, planNames = new Map()) {
    const safeNotes = notes && typeof notes === "object" ? notes : {};
    const type = cleanText(safeNotes.type) || cleanText(safeNotes.payment_type);
    const student = safeNotes.plan_student === "1";
    if (type === AI_PLAN_TYPE) {
        const planKey = AI_PLAN_KEYS.includes(safeNotes.plan_key) ? safeNotes.plan_key : null;
        return {
            kind: "plan",
            planKey,
            planName: planNameFor(planKey, planNames),
            term: safeNotes.plan_term === "year" ? "year" : "month",
            student,
        };
    }
    if (type === AI_TOPUP_TYPE) return { kind: "credits", planKey: null, planName: null, term: null, student };
    // Any other named type is a payment of the shut-down ERP
    if (type) return null;
    // No notes: keep it only when the order was made by a Classgrid AI checkout ("ai_" receipt)
    if (String(paymentOrder?.receiptId || "").startsWith("ai_")) {
        return { kind: "unknown", planKey: null, planName: null, term: null, student };
    }
    return null;
}

function successTerm(success) {
    if (success.type !== "plan") return null;
    return success.plan_term === "year" ? "year" : "month";
}

function successPlanKey(success) {
    return success.type === "plan" && AI_PLAN_KEYS.includes(success.plan_key) ? success.plan_key : null;
}

// The successes that can count for one failure: the same person paying at or after it, or the same checkout (order)
function candidatesFor(failure, successes) {
    const failedAtMs = failure._createdAt.getTime();
    return successes.filter((success) => {
        if (failure._orderId && success.razorpay_order_id === failure._orderId) return true;
        if (!failure.person.userId || String(success.userId) !== failure.person.userId) return false;
        return new Date(success.createdAt).getTime() >= failedAtMs;
    });
}

// Did they buy the same thing afterwards? Buying a different plan does not count (it shows in "Their payments since").
export function paidLaterFor(failure, successes, planNames = new Map()) {
    const candidates = candidatesFor(failure, successes);
    const { purchase } = failure;
    let found = null;
    let match = null;
    if (purchase.kind === "plan") {
        if (purchase.planKey) {
            found = candidates.find((s) => s.type === "plan" && s.plan_key === purchase.planKey && successTerm(s) === purchase.term);
            if (found) match = "same";
            else {
                found = candidates.find((s) => s.type === "plan" && s.plan_key === purchase.planKey);
                if (found) match = "other_term";
            }
        }
    } else if (purchase.kind === "credits") {
        found = candidates.find((s) => s.type === "topup");
        if (found) match = "credits";
    } else if (failure._orderId) {
        // Not known what they tried to buy: only a success in the very same checkout counts, never a guess by amount
        found = candidates.find((s) => s.razorpay_order_id === failure._orderId && (s.type === "plan" || s.type === "topup"));
        if (found) match = found.type === "plan" ? "same" : "credits";
    }
    if (!found) return null;
    const planKey = successPlanKey(found);
    return {
        at: toIso(found.paymentTime || found.createdAt),
        amountInr: Number(found.amount_inr) || 0,
        paymentId: found.razorpay_payment_id,
        sameTry: Boolean(failure._orderId) && found.razorpay_order_id === failure._orderId,
        match,
        planKey,
        planName: planNameFor(planKey, planNames),
        term: successTerm(found),
    };
}

// The newest saved webhook message for each payment id. There is no index for this query (the model file is not ours
// to change), so it is one scan of a small collection per request, with a time limit.
async function loadWebhookEntities(paymentIds) {
    const newest = new Map();
    if (!paymentIds.length) return new Map();
    const events = await WebhookEvent.find({
        provider: "RAZORPAY",
        eventType: "payment.failed",
        "payload.payload.payment.entity.id": { $in: paymentIds },
    })
        .select("payload.payload.payment.entity receivedAt")
        .lean()
        .maxTimeMS(8000);
    for (const event of events) {
        const entity = event?.payload?.payload?.payment?.entity;
        if (!entity?.id) continue;
        const receivedAt = new Date(event.receivedAt || 0).getTime();
        const current = newest.get(entity.id);
        if (!current || receivedAt > current.receivedAt) newest.set(entity.id, { entity, receivedAt });
    }
    return new Map([...newest].map(([paymentId, value]) => [paymentId, value.entity]));
}

async function loadPaymentOrders(orderIds) {
    if (!orderIds.length) return new Map();
    const orders = await PaymentOrder.find({ providerOrderId: { $in: orderIds } })
        .select("providerOrderId receiptId createdBy")
        .lean();
    return new Map(orders.map((order) => [order.providerOrderId, order]));
}

async function loadPlanRows() {
    const rows = await PlanConfig.find({}).select("key name sort").lean();
    return rows.sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0));
}

function uniqueStrings(values) {
    return [...new Set(values.filter(Boolean).map(String))];
}

// Turns failed rows into FailedPaymentItems (plus a few internal "_" fields that publicItem strips). Rows that are not
// Classgrid AI payments are dropped. entityOverrides: payment entities read live from Razorpay (detail page only),
// by PlatformTransaction id; a saved webhook message always wins over them.
async function buildAiFailureItems(rows, { entityOverrides = new Map(), planRows = null } = {}) {
    const paymentIds = uniqueStrings(rows.map((row) => row.razorpayPaymentId));
    const orderIds = uniqueStrings(rows.map((row) => row.razorpayOrderId));
    const [entities, orders, plans] = await Promise.all([
        loadWebhookEntities(paymentIds),
        loadPaymentOrders(orderIds),
        planRows ? Promise.resolve(planRows) : loadPlanRows(),
    ]);
    const planNames = new Map(plans.map((plan) => [plan.key, plan.name]));

    const drafts = [];
    for (const row of rows) {
        const rowId = String(row._id);
        const savedEntity = row.razorpayPaymentId ? entities.get(row.razorpayPaymentId) : null;
        const entity = savedEntity || entityOverrides.get(rowId) || {};
        const order = row.razorpayOrderId ? orders.get(row.razorpayOrderId) : null;
        const purchase = purchaseFor(entity.notes, order, planNames);
        if (!purchase) continue;
        const parsedNote = parseFailureNote(row.note);
        drafts.push({
            row,
            entity,
            purchase,
            parsedNote,
            description: cleanText(entity.error_description) || parsedNote.description,
            // The payer: the user id from the notes (saved on the row), else whoever started the checkout
            userId: row.userId ? String(row.userId) : order?.createdBy ? String(order.createdBy) : null,
        });
    }

    const userIds = uniqueStrings(drafts.map((draft) => draft.userId)).filter((userId) => mongoose.isValidObjectId(userId));
    let users = [];
    let successes = [];
    if (userIds.length) {
        const oldest = drafts.reduce((min, draft) => Math.min(min, new Date(draft.row.createdAt).getTime()), Date.now());
        [users, successes] = await Promise.all([
            User.find({ _id: { $in: userIds } }).select("name email profilePicture plan").lean(),
            AiCreditTransaction.find({
                userId: { $in: userIds },
                status: "success",
                type: { $in: ["plan", "topup"] },
                createdAt: { $gte: new Date(oldest - SUCCESS_LOOKBACK_MS) },
            })
                .select(SUCCESS_FIELDS)
                .sort({ createdAt: 1 })
                .limit(5000)
                .lean(),
        ]);
    }
    const usersById = new Map(users.map((user) => [String(user._id), user]));

    const items = drafts.map((draft) => {
        const { row, entity, purchase } = draft;
        const user = draft.userId ? usersById.get(draft.userId) : null;
        // The webhook saves "Unknown" when it had no name; that is not a name
        const storedName = row.userName === "Unknown" ? "" : cleanText(row.userName) || "";
        const item = {
            id: String(row._id),
            failedAt: toIso(row.paymentTime || row.createdAt),
            amountInr: Number(row.amount) || 0,
            currency: cleanText(entity.currency) || "INR",
            person: {
                userId: draft.userId,
                name: cleanText(user?.name) || storedName,
                email: cleanText(user?.email) || cleanText(row.userEmail) || cleanText(entity.email) || "",
                phone: cleanText(row.userMobile) || cleanText(entity.contact) || "",
                profilePicture: cleanText(user?.profilePicture),
                accountExists: Boolean(user),
            },
            purchase,
            reason: {
                key: reasonKeyFor(entity.error_reason, draft.description),
                razorpayText: draft.description,
                who: whoFor(entity.error_source),
            },
            method: methodFor(row.paymentMethod, entity.method),
            paidLater: null,
            _createdAt: new Date(row.createdAt),
            _orderId: row.razorpayOrderId || null,
            _draft: draft,
            _user: user || null,
        };
        item.paidLater = paidLaterFor(item, successes, planNames);
        return item;
    });

    return { items, successes, plans, planNames };
}

// Drops the internal "_" fields before an item goes to the website
function publicItem(item) {
    const { _createdAt, _orderId, _draft, _user, ...rest } = item;
    return rest;
}

// The one shared loader of the list and the summary: newest failed rows first, at most SCAN_CAP of them
export async function loadAiFailures({ match }) {
    const rows = await PlatformTransaction.find(match)
        .sort({ createdAt: -1 })
        .limit(SCAN_CAP + 1)
        .select(FAILED_ROW_FIELDS)
        .lean();
    const capped = rows.length > SCAN_CAP;
    // The same Razorpay payment saved twice (a webhook delivered twice) is one failure; the newest copy is kept
    const seen = new Set();
    const unique = [];
    for (const row of rows.slice(0, SCAN_CAP)) {
        if (row.razorpayPaymentId) {
            if (seen.has(row.razorpayPaymentId)) continue;
            seen.add(row.razorpayPaymentId);
        }
        unique.push(row);
    }
    const built = await buildAiFailureItems(unique);
    return { ...built, capped };
}

// "YYYY-MM-DD" read as an India day. Returns a Date, or null when the text is not a real date.
export function parseIndiaDay(text, endOfDay) {
    if (typeof text !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
    const [year, month, day] = text.split("-").map(Number);
    // Date accepts days like 2026-02-31 and rolls them over into March; this check refuses them
    const check = new Date(Date.UTC(year, month - 1, day));
    if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
    const date = new Date(`${text}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+05:30`);
    return Number.isNaN(date.getTime()) ? null : date;
}

// A query value as one trimmed string; "" when absent, null when it is repeated (an array) or an object
function queryText(value) {
    if (value === undefined) return "";
    return typeof value === "string" ? value.trim() : null;
}

// Reads and checks the list's query parameters. Returns { error: { code, message } } or { filters }.
export function readListQuery(query = {}) {
    const pageNumber = Number(query.page);
    const page = query.page !== undefined && Number.isInteger(pageNumber) && pageNumber >= 1 ? pageNumber : 1;
    const limitNumber = Number(query.limit);
    const limit = query.limit !== undefined && Number.isInteger(limitNumber) ? Math.min(Math.max(limitNumber, 1), 100) : 20;

    const search = (queryText(query.search) || "").slice(0, 100);

    const reasonText = queryText(query.reason);
    const reason = reasonText || "all";
    if (reasonText === null || (reason !== "all" && !REASON_KEYS.includes(reason))) {
        return { error: { code: "INVALID_REASON", message: "This reason is not one of the choices" } };
    }
    const planText = queryText(query.plan);
    const plan = planText || "all";
    if (planText === null || !PLAN_FILTERS.includes(plan)) {
        return { error: { code: "INVALID_PLAN", message: "This plan is not one of the choices" } };
    }
    const outcomeText = queryText(query.outcome);
    const outcome = outcomeText || "all";
    if (outcomeText === null || !OUTCOME_FILTERS.includes(outcome)) {
        return { error: { code: "INVALID_OUTCOME", message: "This paid later choice is not one of the choices" } };
    }

    const fromText = queryText(query.from);
    const toText = queryText(query.to);
    const from = fromText ? parseIndiaDay(fromText, false) : null;
    const to = toText ? parseIndiaDay(toText, true) : null;
    if (fromText === null || toText === null || (fromText && !from) || (toText && !to)) {
        return { error: { code: "INVALID_DATE", message: "Dates must look like 2026-11-17" } };
    }
    if (from && to && from.getTime() > to.getTime()) {
        return { error: { code: "INVALID_DATE", message: "The start date is after the end date" } };
    }
    return { filters: { page, limit, search, reason, plan, outcome, from, to } };
}

// The database part of the filters: failed rows, the date range (on createdAt) and the search
export function buildFailedMatch({ search = "", from = null, to = null } = {}) {
    const match = { status: "failed" };
    if (from || to) {
        match.createdAt = {};
        if (from) match.createdAt.$gte = from;
        if (to) match.createdAt.$lte = to;
    }
    if (search) {
        const pattern = new RegExp(escapeRegex(search), "i");
        match.$or = [
            { userName: pattern },
            { userEmail: pattern },
            { razorpayPaymentId: pattern },
            { razorpayOrderId: pattern },
        ];
    }
    return match;
}

// The filters that need Razorpay's notes or the ledger, so they run on the built items
export function filterItems(items, { reason = "all", plan = "all", outcome = "all" } = {}) {
    return items.filter((item) => {
        if (reason !== "all" && item.reason.key !== reason) return false;
        if (plan === "credits" || plan === "unknown") {
            if (item.purchase.kind !== plan) return false;
        } else if (plan !== "all") {
            if (item.purchase.kind !== "plan" || item.purchase.planKey !== plan) return false;
        }
        if (outcome === "paid_later" && !item.paidLater) return false;
        if (outcome === "not_paid" && item.paidLater) return false;
        return true;
    });
}

export const listAiFailedPayments = async (req, res) => {
    const { error, filters } = readListQuery(req.query);
    if (error) return badRequest(res, error.code, error.message);
    try {
        const { items, capped } = await loadAiFailures({ match: buildFailedMatch(filters) });
        const matching = filterItems(items, filters);
        const total = matching.length;
        const start = (filters.page - 1) * filters.limit;
        res.json({
            success: true,
            data: matching.slice(start, start + filters.limit).map(publicItem),
            pagination: {
                page: filters.page,
                limit: filters.limit,
                total,
                totalPages: Math.max(1, Math.ceil(total / filters.limit)),
            },
            capped,
        });
    } catch (err) {
        console.error("[FailedPayments]", err);
        res.status(500).json({ success: false, message: "Could not load failed payments" });
    }
};

// The summary numbers, from items already built (newest first)
export function summarizeItems(items, now = Date.now()) {
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
    const people = new Set();
    const notBought = new Map();
    let last30DaysCount = 0;
    let paidLaterCount = 0;
    let lastFailedAt = null;
    let lastFailedMs = -Infinity;
    for (const item of items) {
        const failedAtMs = item.failedAt ? new Date(item.failedAt).getTime() : NaN;
        if (failedAtMs >= monthAgo) last30DaysCount += 1;
        if (failedAtMs > lastFailedMs) {
            lastFailedMs = failedAtMs;
            lastFailedAt = item.failedAt;
        }
        const personKey = item.person.userId || (item.person.email ? item.person.email.toLowerCase() : "") || item.id;
        people.add(personKey);
        if (item.paidLater) {
            paidLaterCount += 1;
            continue;
        }
        // Several tries for the same thing by the same person are one thing not bought. Items are newest first, so the
        // first one seen in a group is the newest, and only its amount is counted (retries are not counted twice).
        const groupKey = [personKey, item.purchase.kind, item.purchase.planKey || "", item.purchase.term || ""].join("|");
        if (!notBought.has(groupKey)) notBought.set(groupKey, item.amountInr);
    }
    const notBoughtAmount = [...notBought.values()].reduce((sum, amount) => sum + amount, 0);
    return {
        failedCount: items.length,
        last30DaysCount,
        peopleCount: people.size,
        paidLaterCount,
        notBoughtYet: { count: notBought.size, amountInr: Math.round(notBoughtAmount * 100) / 100 },
        lastFailedAt,
    };
}

export const getAiFailedPaymentsSummary = async (_req, res) => {
    try {
        const { items, plans, capped } = await loadAiFailures({ match: buildFailedMatch() });
        res.json({
            success: true,
            data: {
                ...summarizeItems(items),
                // The plans a person can buy (not Free), for the website's "What they tried to buy" filter
                plans: plans
                    .filter((plan) => AI_PLAN_KEYS.includes(plan.key))
                    .map((plan) => ({ key: plan.key, name: plan.name || planNameFor(plan.key, new Map()) })),
                capped,
            },
        });
    } catch (err) {
        console.error("[FailedPayments]", err);
        res.status(500).json({ success: false, message: "Could not load the summary" });
    }
};

// One Razorpay call that gives up after RAZORPAY_TIMEOUT_MS; any error (no keys, network, not found) gives null
async function razorpayWithTimeout(call) {
    let timer = null;
    try {
        const timeout = new Promise((resolve) => {
            timer = setTimeout(() => resolve(null), RAZORPAY_TIMEOUT_MS);
        });
        return await Promise.race([Promise.resolve().then(call), timeout]);
    } catch {
        return null;
    } finally {
        if (timer) clearTimeout(timer);
    }
}

// Only for the detail page, and only when the webhook message was not saved: read the payment (and, if its notes are
// empty, the order's notes) from Razorpay now. The list and summary never do this, so they stay fast.
async function readPaymentFromRazorpay(row) {
    let instance = null;
    try {
        instance = razorpayService.getPlatformInstance();
    } catch {
        // The platform Razorpay keys are not set: the page shows what was saved
        return { entity: null, checked: false };
    }
    let entity = null;
    let checked = false;
    if (row.razorpayPaymentId) {
        const payment = await razorpayWithTimeout(() => instance.payments.fetch(row.razorpayPaymentId));
        if (payment && typeof payment === "object") {
            entity = { ...payment };
            checked = true;
        }
    }
    const hasNotes = entity?.notes && typeof entity.notes === "object" && Object.keys(entity.notes).length > 0;
    const orderId = row.razorpayOrderId || entity?.order_id;
    if (!hasNotes && orderId) {
        const order = await razorpayWithTimeout(() => instance.orders.fetch(orderId));
        if (order && typeof order === "object") {
            checked = true;
            entity = { ...(entity || {}), notes: order.notes && typeof order.notes === "object" ? order.notes : {} };
        }
    }
    return { entity, checked };
}

function laterPaymentFrom(success, planNames) {
    const planKey = successPlanKey(success);
    return {
        at: toIso(success.paymentTime || success.createdAt),
        amountInr: Number(success.amount_inr) || 0,
        kind: success.type === "plan" ? "plan" : "credits",
        planKey,
        planName: planNameFor(planKey, planNames),
        term: successTerm(success),
        paymentId: success.razorpay_payment_id,
    };
}

function readFailedRows(userId, excludeId) {
    return PlatformTransaction.find({ status: "failed", userId, _id: { $ne: excludeId } })
        .sort({ createdAt: -1 })
        .limit(30)
        .select(FAILED_ROW_FIELDS)
        .lean();
}

export const getAiFailedPayment = async (req, res) => {
    // Lower case, because the built items carry ids as MongoDB writes them; a link typed in capitals would otherwise
    // load the row and still answer "not found"
    const id = String(req.params.id || "").toLowerCase();
    // The shared billing check runs where this router is mounted, so it never sees :id; the id is checked here
    if (!/^[0-9a-f]{24}$/.test(id)) {
        return badRequest(res, "INVALID_IDENTIFIER", "This link is not valid");
    }
    const notFound = () => res.status(404).json({ success: false, code: "NOT_FOUND", message: "Failed payment not found" });
    try {
        const row = await PlatformTransaction.findOne({ _id: id, status: "failed" }).select(FAILED_ROW_FIELDS).lean();
        if (!row) return notFound();

        // Is the webhook message saved? If not, read the payment from Razorpay now (with a time limit)
        const saved = row.razorpayPaymentId ? await loadWebhookEntities([row.razorpayPaymentId]) : new Map();
        const webhookSaved = saved.has(row.razorpayPaymentId);
        let checkedWithRazorpay = false;
        const entityOverrides = new Map();
        if (!webhookSaved) {
            const live = await readPaymentFromRazorpay(row);
            checkedWithRazorpay = live.checked;
            if (live.entity) entityOverrides.set(id, live.entity);
        }

        // Their other failed payments are built together with this one, so every lookup runs once
        const ownUserId = row.userId ? String(row.userId) : null;
        const others = ownUserId ? await readFailedRows(row.userId, row._id) : [];
        const { items, successes, plans, planNames } = await buildAiFailureItems([row, ...others], { entityOverrides });
        const item = items.find((candidate) => candidate.id === id);
        // Not a Classgrid AI payment (a payment of the shut-down ERP), so not shown
        if (!item) return notFound();

        // When the person is known only through the checkout's order (PaymentOrder.createdBy), their other tries are
        // read by that id (their successes were already read by it in buildAiFailureItems)
        let otherItems = items.filter((candidate) => candidate.id !== id);
        if (!ownUserId && item.person.userId && mongoose.isValidObjectId(item.person.userId)) {
            const moreRows = await readFailedRows(item.person.userId, row._id);
            otherItems = (await buildAiFailureItems(moreRows, { planRows: plans })).items;
        }

        // The same Razorpay payment saved twice is not "another" try
        const seenPayments = new Set(row.razorpayPaymentId ? [row.razorpayPaymentId] : []);
        const otherTries = [];
        for (const other of [...otherItems].sort((a, b) => b._createdAt - a._createdAt)) {
            const paymentId = other._draft.row.razorpayPaymentId;
            if (paymentId) {
                if (seenPayments.has(paymentId)) continue;
                seenPayments.add(paymentId);
            }
            otherTries.push({
                id: other.id,
                failedAt: other.failedAt,
                amountInr: other.amountInr,
                purchase: other.purchase,
                reasonKey: other.reason.key,
                paidLater: Boolean(other.paidLater),
            });
            if (otherTries.length === 10) break;
        }

        // Every successful AI payment by them since this failure (any plan or credits), oldest first
        const failedAtMs = item._createdAt.getTime();
        const laterPayments = item.person.userId
            ? successes
                .filter((s) => String(s.userId) === item.person.userId && new Date(s.createdAt).getTime() >= failedAtMs)
                .slice(0, 5)
                .map((s) => laterPaymentFrom(s, planNames))
            : [];

        const entity = item._draft.entity || {};
        const card = entity.card && typeof entity.card === "object" ? entity.card : {};
        const user = item._user;
        const planId = ["free", ...AI_PLAN_KEYS].includes(user?.plan?.id) ? user.plan.id : "free";

        res.json({
            success: true,
            data: {
                ...publicItem(item),
                recordedAt: toIso(row.createdAt),
                payment: {
                    razorpayPaymentId: row.razorpayPaymentId || null,
                    razorpayOrderId: row.razorpayOrderId || null,
                    emailUsed: cleanText(entity.email) || cleanText(row.userEmail),
                    phoneUsed: cleanText(entity.contact) || cleanText(row.userMobile),
                    bank: cleanText(entity.bank),
                    wallet: cleanText(entity.wallet),
                    cardNetwork: cleanText(card.network),
                    cardLast4: cleanText(card.last4),
                },
                // Razorpay's own error fields; the code and description fall back to the saved note when the message
                // is missing, because the note holds Razorpay's words too
                razorpay: {
                    errorCode: cleanText(entity.error_code) || item._draft.parsedNote.code,
                    errorDescription: cleanText(entity.error_description) || item._draft.parsedNote.description,
                    errorSource: cleanText(entity.error_source),
                    errorStep: cleanText(entity.error_step),
                    errorReason: cleanText(entity.error_reason),
                },
                // The plan they have today (no account = null)
                currentPlan: user
                    ? {
                        id: planId,
                        name: planNames.get(planId) || planNameFor(planId, new Map()),
                        status: user.plan?.status || "active",
                        billing: user.plan?.billing || "none",
                        expiresAt: toIso(user.plan?.expires_at),
                    }
                    : null,
                otherTries,
                laterPayments,
                sources: { webhookSaved, checkedWithRazorpay },
            },
        });
    } catch (err) {
        console.error("[FailedPayments]", err);
        res.status(500).json({ success: false, message: "Could not load this payment" });
    }
};
