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

import mongoose from "mongoose";
import PaymentTransaction from "../../models/PaymentTransaction.js";
import PaymentRefund from "../../models/PaymentRefund.js";
import PaymentOrder from "../../models/PaymentOrder.js";
import WebhookEvent from "../../models/WebhookEvent.js";
import BillingAuditLog from "../../models/BillingAuditLog.js";
import Organization from "../../models/Organization.js";
import razorpayService from "../../services/razorpay.service.js";

function auditContext(req) {
    return {
        actorId: req.user?._id || null,
        ipAddress: req.ip || null,
        requestId: req.id || req.headers["x-request-id"] || null,
    };
}

async function recordAudit(req, transaction, action, oldState, newState, reason = null, session = null) {
    const entry = {
        ...auditContext(req),
        organizationId: transaction.organizationId || null,
        entityType: "PaymentTransaction",
        entityId: transaction._id,
        action,
        reason,
        oldState,
        newState,
    };
    if (session) return BillingAuditLog.create([entry], { session });
    return BillingAuditLog.create(entry);
}

async function providerFor(transaction) {
    if (transaction.merchantType === "CLASSGRID") {
        return razorpayService.getPlatformInstance();
    }
    const merchantOrganizationId = transaction.merchantOrganizationId || transaction.organizationId;
    if (!merchantOrganizationId) throw new Error("Merchant organization is missing");
    return razorpayService.getInstance(merchantOrganizationId, "fees");
}

async function fetchAndValidateProviderPayment(transaction) {
    if (!transaction.providerPaymentId) throw new Error("Provider payment ID is missing");
    const provider = await providerFor(transaction);
    const payment = await provider.payments.fetch(transaction.providerPaymentId);
    const order = await PaymentOrder.findById(transaction.paymentOrderId).lean();

    if (!payment || payment.id !== transaction.providerPaymentId) {
        throw new Error("Provider returned a different payment");
    }
    if (order?.providerOrderId && payment.order_id !== order.providerOrderId) {
        throw new Error("Provider order does not match the stored order");
    }
    if (Number(payment.amount) !== transaction.amountCapturedPaise) {
        throw new Error("Provider amount does not match the stored transaction");
    }
    if (String(payment.currency || "").toUpperCase() !== String(transaction.currency || "INR").toUpperCase()) {
        throw new Error("Provider currency does not match the stored transaction");
    }
    return payment;
}

export const listTransactions = async (req, res) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 50, 200);
        const page = Math.max(Number(req.query.page) || 1, 1);
        const filter = {};
        if (req.query.status) filter.status = req.query.status;
        if (req.query.paymentFlow) filter.paymentFlow = req.query.paymentFlow;
        if (req.query.organizationId) filter.organizationId = req.query.organizationId;
        if (req.query.method) filter.method = req.query.method;
        if (req.query.settlementStatus) filter.settlementStatus = req.query.settlementStatus;
        if (req.query.startDate || req.query.endDate) {
            filter.capturedAt = {};
            if (req.query.startDate) {
                const startDate = new Date(req.query.startDate);
                if (Number.isNaN(startDate.getTime())) {
                    return res.status(400).json({ success: false, message: "startDate must be a valid date" });
                }
                filter.capturedAt.$gte = startDate;
            }
            if (req.query.endDate) {
                const endDate = new Date(req.query.endDate);
                if (Number.isNaN(endDate.getTime())) {
                    return res.status(400).json({ success: false, message: "endDate must be a valid date" });
                }
                endDate.setHours(23, 59, 59, 999);
                filter.capturedAt.$lte = endDate;
            }
        }
        if (req.query.organizationType) {
            const organizations = await Organization.find({ org_type: req.query.organizationType }).select("_id").lean();
            const organizationIds = organizations.map((organization) => organization._id);
            filter.organizationId = filter.organizationId
                ? { $in: organizationIds.filter((id) => String(id) === String(req.query.organizationId)) }
                : { $in: organizationIds };
        }
        if (req.query.refundStatus) {
            const refundFilter = req.query.refundStatus === "NONE"
                ? {}
                : { status: req.query.refundStatus };
            const transactionIds = await PaymentRefund.distinct("paymentTransactionId", refundFilter);
            filter._id = req.query.refundStatus === "NONE"
                ? { $nin: transactionIds }
                : { $in: transactionIds };
        }
        if (req.query.search) {
            const safeSearch = String(req.query.search).trim().slice(0, 100);
            const escaped = safeSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const organizations = await Organization.find({
                $or: [
                    { name: { $regex: escaped, $options: "i" } },
                    { sidebar_name: { $regex: escaped, $options: "i" } },
                ],
            }).select("_id").limit(100).lean();
            const searchConditions = [
                { providerPaymentId: { $regex: escaped, $options: "i" } },
                { organizationId: { $in: organizations.map((organization) => organization._id) } },
            ];
            if (mongoose.isValidObjectId(safeSearch)) searchConditions.push({ _id: safeSearch });
            filter.$or = searchConditions;
        }

        const [items, total] = await Promise.all([
            PaymentTransaction.find(filter)
                .populate("organizationId paymentOrderId")
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            PaymentTransaction.countDocuments(filter),
        ]);
        res.json({ success: true, data: items, pagination: { page, limit, total } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getTransaction = async (req, res) => {
    try {
        const transaction = await PaymentTransaction.findById(req.params.transactionId)
            .populate("organizationId paymentOrderId paymentAttemptId");
        if (!transaction) return res.status(404).json({ success: false, message: "Transaction not found" });
        res.json({ success: true, data: transaction });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const recheckTransaction = async (req, res) => {
    try {
        const transaction = await PaymentTransaction.findById(req.params.transactionId);
        if (!transaction) return res.status(404).json({ success: false, message: "Transaction not found" });

        const oldState = { status: transaction.status };
        const payment = await fetchAndValidateProviderPayment(transaction);
        const providerStatus = String(payment.status || "").toLowerCase();

        if (providerStatus === "captured" && transaction.status === "FAILED") {
            transaction.status = "CAPTURED";
            transaction.capturedAt = payment.created_at
                ? new Date(payment.created_at * 1000)
                : transaction.capturedAt;
            await transaction.save();
        } else if (providerStatus === "failed" && transaction.status === "CAPTURED") {
            return res.status(409).json({
                success: false,
                message: "Provider reports failed but the local transaction is captured; manual investigation is required",
            });
        }

        await recordAudit(
            req,
            transaction,
            "PROVIDER_RECHECKED",
            oldState,
            { status: transaction.status, providerStatus },
            req.body.reason || null
        );
        res.json({ success: true, data: transaction, providerStatus });
    } catch (error) {
        const status = /not configured|Provider|match|missing/i.test(error.message) ? 409 : 502;
        res.status(status).json({ success: false, message: error.message });
    }
};

export const createRefund = async (req, res) => {
    try {
        const transaction = await PaymentTransaction.findById(req.params.transactionId);
        if (!transaction) return res.status(404).json({ success: false, message: "Transaction not found" });
        if (!transaction.providerPaymentId) {
            return res.status(409).json({ success: false, message: "This transaction has no provider payment to refund" });
        }
        if (!["CAPTURED", "PARTIALLY_REFUNDED"].includes(transaction.status)) {
            return res.status(409).json({ success: false, message: `Cannot refund a ${transaction.status} transaction` });
        }

        const amountPaise = Number(req.body.amountPaise);
        if (!Number.isSafeInteger(amountPaise) || amountPaise < 1) {
            return res.status(400).json({ success: false, message: "amountPaise must be a positive integer" });
        }
        if (!String(req.body.reason || "").trim()) {
            return res.status(400).json({ success: false, message: "A refund reason is required" });
        }

        const totals = await PaymentRefund.aggregate([
            {
                $match: {
                    paymentTransactionId: transaction._id,
                    status: { $in: ["PENDING", "PROCESSED"] },
                },
            },
            { $group: { _id: null, amountPaise: { $sum: "$amountPaise" } } },
        ]);
        const alreadyRefundedPaise = totals[0]?.amountPaise || 0;
        const remainingPaise = transaction.amountCapturedPaise - alreadyRefundedPaise;
        if (amountPaise > remainingPaise) {
            return res.status(400).json({
                success: false,
                message: `Refund exceeds the remaining refundable amount of ${remainingPaise} paise`,
            });
        }

        const provider = await providerFor(transaction);
        const providerRefund = await provider.payments.refund(transaction.providerPaymentId, {
            amount: amountPaise,
            receipt: `refund_${transaction._id}_${Date.now()}`.slice(0, 40),
            notes: {
                reason: String(req.body.reason).trim().slice(0, 200),
                transaction_id: transaction._id.toString(),
            },
        });
        if (!providerRefund?.id) throw new Error("Provider did not return a refund ID");

        const refundStatus = providerRefund.status === "processed" ? "PROCESSED" : "PENDING";
        const session = await mongoose.startSession();
        let refund;
        try {
            await session.withTransaction(async () => {
                [refund] = await PaymentRefund.create([{
                    paymentTransactionId: transaction._id,
                    organizationId: transaction.organizationId,
                    providerRefundId: providerRefund.id,
                    amountPaise,
                    currency: transaction.currency,
                    reason: String(req.body.reason).trim(),
                    status: refundStatus,
                    speedRequested: providerRefund.speed_requested || "normal",
                    speedProcessed: providerRefund.speed_processed || "normal",
                    receipt: providerRefund.receipt || null,
                    processedAt: refundStatus === "PROCESSED" ? new Date() : null,
                    createdBy: req.user._id,
                }], { session });

                if (refundStatus === "PROCESSED") {
                    const processedTotal = alreadyRefundedPaise + amountPaise;
                    transaction.status = processedTotal >= transaction.amountCapturedPaise
                        ? "REFUNDED"
                        : "PARTIALLY_REFUNDED";
                    await transaction.save({ session });
                }
                await recordAudit(
                    req,
                    transaction,
                    "REFUND_REQUESTED",
                    { status: "CAPTURED", refundedPaise: alreadyRefundedPaise },
                    { status: transaction.status, refundId: refund._id, amountPaise, providerStatus: providerRefund.status },
                    String(req.body.reason).trim(),
                    session
                );
            });
        } finally {
            await session.endSession();
        }

        res.status(201).json({ success: true, data: refund });
    } catch (error) {
        const status = /not configured|Provider|Razorpay/i.test(error.message) ? 502 : 400;
        res.status(status).json({ success: false, message: error.message });
    }
};

export const reconcileTransaction = async (req, res) => recheckTransaction(req, res);

export const getTransactionWebhooks = async (req, res) => {
    try {
        const transaction = await PaymentTransaction.findById(req.params.transactionId);
        if (!transaction) return res.status(404).json({ success: false, message: "Transaction not found" });
        const webhooks = await WebhookEvent.find({
            $or: [
                { "payload.payload.payment.entity.id": transaction.providerPaymentId },
                { "payload.payload.refund.entity.payment_id": transaction.providerPaymentId },
            ],
        }).sort({ receivedAt: -1 });
        res.json({ success: true, data: webhooks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getTransactionTimeline = async (req, res) => {
    try {
        const transaction = await PaymentTransaction.findById(req.params.transactionId);
        if (!transaction) return res.status(404).json({ success: false, message: "Transaction not found" });
        const [refunds, webhooks] = await Promise.all([
            PaymentRefund.find({ paymentTransactionId: transaction._id }),
            WebhookEvent.find({
                $or: [
                    { "payload.payload.payment.entity.id": transaction.providerPaymentId },
                    { "payload.payload.refund.entity.payment_id": transaction.providerPaymentId },
                ],
            }),
        ]);
        const timeline = [
            {
                id: `tx_init_${transaction._id}`,
                status: "CAPTURED",
                timestamp: transaction.capturedAt || transaction.createdAt,
                note: `Transaction captured for ${transaction.paymentFlow}`,
            },
            ...refunds.map((refund) => ({
                id: refund._id.toString(),
                status: `REFUND_${refund.status}`,
                timestamp: refund.processedAt || refund.createdAt,
                note: `Refund of ${refund.amountPaise} paise. Reason: ${refund.reason || "Not provided"}`,
            })),
            ...webhooks.map((webhook) => ({
                id: webhook._id.toString(),
                status: `WEBHOOK_${String(webhook.eventType || webhook.event || "UNKNOWN").toUpperCase().replace(/\./g, "_")}`,
                timestamp: webhook.receivedAt || webhook.createdAt,
                note: "Received Razorpay webhook",
            })),
        ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        res.json({ success: true, data: timeline });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
