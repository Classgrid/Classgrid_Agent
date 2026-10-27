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
