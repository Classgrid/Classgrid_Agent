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

import mongoose from "mongoose";
import PaymentTransaction from "../../models/PaymentTransaction.js";
import PaymentRefund from "../../models/PaymentRefund.js";
import PaymentOrder from "../../models/PaymentOrder.js";
import WebhookEvent from "../../models/WebhookEvent.js";
import BillingAuditLog from "../../models/BillingAuditLog.js";
import Organization from "../../models/Organization.js";
import razorpayService from "../../services/razorpay.service.js";
// Read only, for the Transactions pages ("every payment for Classgrid AI", listPayments and below)
import AiCreditTransaction from "../../models/AiCreditTransaction.js";
import PlatformTransaction from "../../models/PlatformTransaction.js";
import User from "../../models/User.js";
import PlanConfig from "../../models/PlanConfig.js";

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

/*
 * ─────────────────────────────────────────────────────────
 * TRANSACTIONS PAGES: every payment for Classgrid AI (2026-11-17)
 * GET /payments, GET /payments/export, GET /payments/:paymentKey
 *
 * Where the money is recorded, and why the code reads it this way:
 * - Plan purchases and credit top-ups are read from AiCreditTransaction (types "plan" and "topup"), the record the
 *   Razorpay webhook writes for every Classgrid AI purchase. Plans can only come from there: the webhook also tries to
 *   write a PlatformTransaction for a plan with paymentFlow "ai_plan", but that value is not in the model's enum, so
 *   the write fails and is swallowed. No plan sale exists in PlatformTransaction.
 * - PlatformTransaction adds what AiCreditTransaction does not have: failed payments, older payments from before
 *   plans, and refunds. It also keeps a copy of every top-up (same Razorpay payment id); those copies are dropped so a
 *   top-up is not counted twice.
 * - Refunds of plans and top-ups are found through the note on the refund row ("Refund of ₹X for payment pay_…"),
 *   because AiCreditTransaction is never marked refunded and a plan refund has no original PlatformTransaction to
 *   point at (refundOf is null).
 * Admin actions on AiCreditTransaction (grant, revoke, pause, resume, extend, refund, adjustment) are not payments and
 * are left out. Organization is never read here: these pages are about people and plans.
 * ─────────────────────────────────────────────────────────
 */

const PAYMENT_TYPES = ["plan", "topup", "other"];
const PAYMENT_PLAN_FILTERS = ["pro", "max", "enterprise"];
const PAYMENT_STATUSES = ["paid", "refunded", "failed", "pending"];
const PAYMENTS_DEFAULT_LIMIT = 25;
const PAYMENTS_MAX_LIMIT = 100;
const PAYMENTS_EXPORT_MAX = 5000;
const REFUND_MAP_MAX = 5000;
const SEARCH_MAX_CHARS = 100;
const SEARCH_MAX_USERS = 200;
const QUERY_MAX_MS = 15000;
const SIDE_LOOKUP_MAX_MS = 5000;
const LIVE_FETCH_TIMEOUT_MS = 5000;
const INDIA_TZ = "Asia/Kolkata";
const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;
const PAY_ID_RE = /^pay_[A-Za-z0-9]{6,40}$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
// The webhook writes "Refund of ₹X for payment pay_…" on every refund row; it is the only link from a plan refund
// back to the plan purchase.
const REFUND_NOTE_PAY_ID_RE = /for payment (pay_[A-Za-z0-9]+)/;
const PAID_WITH_LABELS = { upi: "UPI", card: "Card", netbanking: "Net banking", wallet: "Wallet", emi: "EMI" };
const PAYMENT_TYPES_IN_CREDITS = ["plan", "topup"];
const REFUND_ROW_FIELDS = "razorpayPaymentId amount note refundOf refundReason refundedAt createdAt";

const indiaDayKeyFormat = new Intl.DateTimeFormat("en-CA", { timeZone: INDIA_TZ, year: "numeric", month: "2-digit", day: "2-digit" });

function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function roundInr(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
}

function toIso(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

// A query value that is not a plain string (a repeated param, or ?type[$ne]=x) is treated as a wrong value, never used.
function queryText(value) {
    if (value === undefined || value === null) return "";
    if (typeof value !== "string") return null;
    return value.trim();
}

// "2026-11-17" is a day in India. The round trip check turns away days that don't exist (2026-02-31 would roll over).
function indiaDayBounds(day) {
    if (!DAY_RE.test(day)) return null;
    const start = new Date(`${day}T00:00:00.000+05:30`);
    if (Number.isNaN(start.getTime()) || indiaDayKeyFormat.format(start) !== day) return null;
    return { start, end: new Date(`${day}T23:59:59.999+05:30`) };
}

function payIdFromNote(note) {
    const match = REFUND_NOTE_PAY_ID_RE.exec(String(note || ""));
    return match ? match[1] : null;
}

// Adds a refund row to a Map<payId, {refundedInr, refunds, keys}>. The webhook writes one row on refund.created and
// another on refund.processed for the same refund, so each refund id (else each row) is counted once.
function addRefundRow(map, payId, row) {
    if (!payId) return;
    let entry = map.get(payId);
    if (!entry) {
        entry = { refundedInr: 0, refunds: [], keys: new Set() };
        map.set(payId, entry);
    }
    const key = row.razorpayPaymentId || String(row._id);
    if (entry.keys.has(key)) return;
    entry.keys.add(key);
    const amountInr = roundInr(Math.abs(Number(row.amount) || 0));
    entry.refundedInr = roundInr(entry.refundedInr + amountInr);
    entry.refunds.push({
        refundId: row.razorpayPaymentId || null,
        amountInr,
        reason: row.refundReason ? String(row.refundReason) : null,
        date: toIso(row.refundedAt || row.createdAt),
    });
}

function finishRefundMap(map) {
    for (const entry of map.values()) {
        entry.refunds.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
        delete entry.keys;
    }
    return map;
}

// Every Razorpay refund the webhook saw, keyed by the payment it refunded. Refunds are few, so one bounded read is
// enough; it uses the {status, createdAt} index.
async function loadRefundMap() {
    const refundRows = await PlatformTransaction.find({ status: "refunded", type: "refund" })
        .select(REFUND_ROW_FIELDS)
        .sort({ createdAt: -1 })
        .limit(REFUND_MAP_MAX)
        .maxTimeMS(QUERY_MAX_MS)
        .lean();

    // A refund row without "for payment pay_…" in its note can still point at its original through refundOf.
    const refundOfIds = refundRows
        .filter((row) => !payIdFromNote(row.note) && row.refundOf)
        .map((row) => row.refundOf);
    const originals = refundOfIds.length
        ? await PlatformTransaction.find({ _id: { $in: refundOfIds } })
            .select("razorpayPaymentId")
            .maxTimeMS(QUERY_MAX_MS)
            .lean()
        : [];
    const originalPayIds = new Map(originals.map((row) => [String(row._id), row.razorpayPaymentId || null]));

    const map = new Map();
    for (const row of refundRows) {
        const payId = payIdFromNote(row.note) || (row.refundOf ? originalPayIds.get(String(row.refundOf)) : null);
        addRefundRow(map, payId, row);
    }
    finishRefundMap(map);

    // Payments marked refunded on themselves (a top-up copy the webhook marked, or an older manual refund) count as
    // refunded even when no refund amount is found for them.
    const markedRefunded = await PlatformTransaction.distinct("razorpayPaymentId", {
        status: "refunded",
        type: { $ne: "refund" },
    }).maxTimeMS(QUERY_MAX_MS);

    const refundedPayIds = new Set(map.keys());
    for (const payId of markedRefunded) {
        if (payId) refundedPayIds.add(String(payId));
    }
    return { refundMap: map, refundedPayIds: [...refundedPayIds] };
}

// Checks the list and CSV filters, then builds the $match on the common row shape (see paymentsBasePipeline).
// Every check runs before the database is read.
async function buildPaymentQuery(query = {}) {
    const type = queryText(query.type);
    if (type === null || (type && !PAYMENT_TYPES.includes(type))) {
        return { error: "type must be plan, topup or other" };
    }
    const plan = queryText(query.plan);
    if (plan === null || (plan && !PAYMENT_PLAN_FILTERS.includes(plan))) {
        return { error: "plan must be pro, max or enterprise" };
    }
    const status = queryText(query.status);
    if (status === null || (status && !PAYMENT_STATUSES.includes(status))) {
        return { error: "status must be paid, refunded, failed or pending" };
    }
    const from = queryText(query.from);
    const fromBounds = from ? indiaDayBounds(from) : null;
    if (from === null || (from && !fromBounds)) {
        return { error: "from must be a date like 2026-11-17" };
    }
    const to = queryText(query.to);
    const toBounds = to ? indiaDayBounds(to) : null;
    if (to === null || (to && !toBounds)) {
        return { error: "to must be a date like 2026-11-17" };
    }
    if (fromBounds && toBounds && fromBounds.start > toBounds.end) {
        return { error: "The start date is after the end date" };
    }
    const search = (queryText(query.search) || "").slice(0, SEARCH_MAX_CHARS).trim();

    const conditions = [];
    if (type) conditions.push({ kind: type });
    if (plan) conditions.push({ kind: "plan", planKey: plan });
    if (status) conditions.push({ status });
    if (fromBounds || toBounds) {
        const date = {};
        if (fromBounds) date.$gte = fromBounds.start;
        if (toBounds) date.$lte = toBounds.end;
        conditions.push({ date });
    }

    const rx = search ? new RegExp(escapeRegex(search), "i") : null;
    const searchUsersPromise = rx
        ? User.find({ $or: [{ name: rx }, { email: rx }] })
            .select("_id")
            .limit(SEARCH_MAX_USERS)
            .maxTimeMS(QUERY_MAX_MS)
            .lean()
        : Promise.resolve([]);
    const [{ refundMap, refundedPayIds }, searchUsers] = await Promise.all([loadRefundMap(), searchUsersPromise]);

    if (rx) {
        const searchOr = [
            { userName: rx },
            { userEmail: rx },
            { paymentId: rx },
            { orderId: rx },
            { userId: { $in: searchUsers.map((user) => user._id) } },
        ];
        if (OBJECT_ID_RE.test(search)) searchOr.push({ _id: new mongoose.Types.ObjectId(search) });
        conditions.push({ $or: searchOr });
    }

    return {
        match: conditions.length ? { $and: conditions } : {},
        refundMap,
        refundedPayIds,
        error: null,
    };
}

// One row shape for both collections, then the status shown on the page. Runs on AiCreditTransaction.
function paymentsBasePipeline(refundedPayIds) {
    return [
        // Only real purchases: the other types are admin actions with made-up ids, not payments.
        { $match: { type: { $in: PAYMENT_TYPES_IN_CREDITS } } },
        {
            $project: {
                _id: 1,
                source: { $literal: "credits" },
                kind: "$type",
                paymentId: "$razorpay_payment_id",
                orderId: "$razorpay_order_id",
                amountInr: "$amount_inr",
                baseStatus: "$status",
                userId: 1,
                userName: 1,
                userEmail: 1,
                planKey: "$plan_key",
                term: "$plan_term",
                periodStart: "$plan_period_start",
                periodEnd: "$plan_period_end",
                credits: "$credits_added",
                method: "$paymentMethod",
                date: { $ifNull: ["$paymentTime", "$createdAt"] },
            },
        },
        {
            $unionWith: {
                coll: PlatformTransaction.collection.name,
                pipeline: [
                    // Refund rows are not payments; they are read into the refund map instead.
                    { $match: { type: { $ne: "refund" } } },
                    // Drop the PlatformTransaction copy of a top-up: the same payment is already in AiCreditTransaction.
                    // The join uses AiCreditTransaction's unique razorpay_payment_id index and keeps one id at most.
                    {
                        $lookup: {
                            from: AiCreditTransaction.collection.name,
                            localField: "razorpayPaymentId",
                            foreignField: "razorpay_payment_id",
                            pipeline: [{ $project: { _id: 1 } }, { $limit: 1 }],
                            as: "dup",
                        },
                    },
                    // A row with no payment id (a manual entry) is always kept: an empty id is not a copy of anything.
                    {
                        $match: {
                            $or: [
                                { dup: { $size: 0 } },
                                { razorpayPaymentId: { $in: [null, ""] } },
                            ],
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            source: { $literal: "platform" },
                            kind: { $cond: [{ $eq: ["$paymentFlow", "ai_topup"] }, "topup", "other"] },
                            paymentId: "$razorpayPaymentId",
                            orderId: "$razorpayOrderId",
                            amountInr: "$amount",
                            baseStatus: "$status",
                            userId: 1,
                            userName: 1,
                            userEmail: 1,
                            planKey: { $literal: null },
                            term: { $literal: null },
                            periodStart: { $literal: null },
                            periodEnd: { $literal: null },
                            credits: { $literal: null },
                            method: "$paymentMethod",
                            date: { $ifNull: ["$paymentTime", "$createdAt"] },
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                status: {
                    $switch: {
                        branches: [
                            { case: { $in: ["$paymentId", { $literal: refundedPayIds }] }, then: "refunded" },
                            { case: { $eq: ["$baseStatus", "refunded"] }, then: "refunded" },
                            { case: { $eq: ["$baseStatus", "failed"] }, then: "failed" },
                            { case: { $eq: ["$baseStatus", "pending"] }, then: "pending" },
                        ],
                        // success (and "active" on older credit rows) is a finished payment
                        default: "paid",
                    },
                },
            },
        },
    ];
}

// The same rule as the $switch above, for the one payment the detail page loads.
function shownStatus(baseStatus, paymentId, refundedPayIds) {
    if (paymentId && refundedPayIds.has(paymentId)) return "refunded";
    if (baseStatus === "refunded") return "refunded";
    if (baseStatus === "failed") return "failed";
    if (baseStatus === "pending") return "pending";
    return "paid";
}

// The webhook saves "Unknown" when it had no name; the page shows "No name" for that instead.
function cleanSavedName(value) {
    const name = String(value || "").trim();
    return name === "Unknown" || name === "Unknown Name" ? "" : name;
}

function capitalise(value) {
    const text = String(value || "");
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

function planName(key, plansByKey) {
    if (!key) return "Plan";
    return plansByKey.get(key)?.name || capitalise(key);
}

function sameAmount(a, b) {
    return Math.abs(Number(a) - Number(b)) < 0.005;
}

// Student price is not stored on a payment. It is known for sure only for the person's latest plan purchase
// (user.plan.note); older rows are compared with today's prices, which is wrong if the prices changed since.
function studentPriceGuess(row, user, plansByKey) {
    if (user?.plan?.last_payment_id && row.paymentId && user.plan.last_payment_id === row.paymentId) {
        return user.plan.note === "student price";
    }
    const config = plansByKey.get(row.planKey);
    if (!config || (row.term !== "month" && row.term !== "year")) return null;
    const normal = Number(row.term === "year" ? config.price_inr_yearly : config.price_inr_monthly);
    const student = Number(row.term === "year" ? config.student_price_inr_yearly : config.student_price_inr_monthly);
    const amount = Number(row.amountInr);
    if (student > 0 && sameAmount(amount, student) && !sameAmount(student, normal)) return true;
    if (normal > 0 && sameAmount(amount, normal)) return false;
    return null;
}

// Top-up copies store "upi:<vpa>" or "card:<network> <last4>"; the list shows only the method itself.
function rawMethod(method) {
    return String(method || "").split(":")[0].trim().toLowerCase() || null;
}

async function loadPlansByKey() {
    const plans = await PlanConfig.find({})
        .select("key name price_inr_monthly price_inr_yearly student_price_inr_monthly student_price_inr_yearly")
        .maxTimeMS(SIDE_LOOKUP_MAX_MS)
        .lean();
    return new Map(plans.map((plan) => [plan.key, plan]));
}

async function loadUsersById(rows) {
    const ids = [...new Set(rows
        .map((row) => (row.userId ? String(row.userId) : ""))
        .filter((id) => OBJECT_ID_RE.test(id)))];
    if (!ids.length) return new Map();
    const users = await User.find({ _id: { $in: ids } })
        .select("name email profilePicture phoneNumber status plan")
        .maxTimeMS(QUERY_MAX_MS)
        .lean();
    return new Map(users.map((user) => [String(user._id), user]));
}

// Turns one row of the common shape into the PaymentRow the website reads. No organization, role, IP or raw note.
function toPaymentRow(row, { user, plansByKey, refundInfo }) {
    const amountInr = Number(row.amountInr) || 0;
    const linkedUser = user && user.status !== "deleted" ? user : null;
    const status = row.status;

    let refundedInr = refundInfo?.refundedInr || 0;
    if (status === "refunded" && refundedInr <= 0) refundedInr = Math.abs(amountInr);
    if (amountInr > 0 && refundedInr > amountInr) refundedInr = amountInr;

    const kind = PAYMENT_TYPES.includes(row.kind) ? row.kind : "other";
    let plan = null;
    if (kind === "plan") {
        plan = {
            key: row.planKey || "",
            name: planName(row.planKey, plansByKey),
            term: row.term === "month" || row.term === "year" ? row.term : null,
            studentPrice: studentPriceGuess(row, user, plansByKey),
            periodStart: toIso(row.periodStart),
            periodEnd: toIso(row.periodEnd),
        };
    }

    const credits = kind === "topup" && row.credits !== null && row.credits !== undefined && Number.isFinite(Number(row.credits))
        ? Number(row.credits)
        : null;

    return {
        id: String(row._id),
        source: row.source === "credits" ? "credits" : "platform",
        kind,
        status,
        amountInr,
        refundedInr: roundInr(refundedInr),
        currency: "INR",
        razorpayPaymentId: row.paymentId || null,
        razorpayOrderId: row.orderId || null,
        date: toIso(row.date),
        plan,
        credits,
        method: rawMethod(row.method),
        person: {
            userId: linkedUser ? String(linkedUser._id) : null,
            name: cleanSavedName(linkedUser?.name) || cleanSavedName(row.userName) || "",
            email: String(linkedUser?.email || row.userEmail || "").trim(),
            photoUrl: linkedUser?.profilePicture ? String(linkedUser.profilePicture) : null,
            linked: Boolean(linkedUser),
        },
    };
}

async function toPaymentRows(rows, refundMap) {
    const [usersById, plansByKey] = await Promise.all([loadUsersById(rows), loadPlansByKey()]);
    return rows.map((row) => toPaymentRow(row, {
        user: row.userId ? usersById.get(String(row.userId)) : null,
        plansByKey,
        refundInfo: row.paymentId ? refundMap.get(row.paymentId) : null,
    }));
}

// validateBillingRequest already turns away page < 1 and limit outside 1–200; a limit above 100 is cut to 100 here.
function listLimit(value) {
    const limit = Number(value);
    if (value === undefined || !Number.isInteger(limit) || limit < 1) return PAYMENTS_DEFAULT_LIMIT;
    return Math.min(limit, PAYMENTS_MAX_LIMIT);
}

function listPage(value) {
    const page = Number(value);
    return Number.isInteger(page) && page >= 1 ? page : 1;
}

export const listPayments = async (req, res) => {
    try {
        const page = listPage(req.query.page);
        const limit = listLimit(req.query.limit);
        const built = await buildPaymentQuery(req.query);
        if (built.error) return res.status(400).json({ success: false, message: built.error });

        const [result] = await AiCreditTransaction.aggregate([
            ...paymentsBasePipeline(built.refundedPayIds),
            { $match: built.match },
            {
                $facet: {
                    rows: [{ $sort: { date: -1, _id: -1 } }, { $skip: (page - 1) * limit }, { $limit: limit }],
                    total: [{ $count: "n" }],
                    byStatus: [{ $group: { _id: "$status", count: { $sum: 1 }, amountInr: { $sum: "$amountInr" } } }],
                },
            },
        ]).allowDiskUse(true).option({ maxTimeMS: QUERY_MAX_MS });

        const rows = result?.rows || [];
        const total = result?.total?.[0]?.n || 0;
        const byStatus = new Map((result?.byStatus || []).map((group) => [group._id, group]));
        const data = await toPaymentRows(rows, built.refundMap);

        res.json({
            success: true,
            data,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
            summary: {
                total,
                paid: { count: byStatus.get("paid")?.count || 0, amountInr: roundInr(byStatus.get("paid")?.amountInr || 0) },
                refunded: { count: byStatus.get("refunded")?.count || 0 },
                failed: { count: byStatus.get("failed")?.count || 0 },
                pending: { count: byStatus.get("pending")?.count || 0 },
            },
        });
    } catch (error) {
        console.error("[Super Admin Payments] list failed:", error);
        res.status(500).json({ success: false, message: "Couldn't load payments." });
    }
};

// ── CSV ──────────────────────────────────────────────────

const CSV_HEADERS = [
    "Date", "Type", "Plan", "Length", "Student price", "Period from", "Period to", "Credits", "Name", "Email",
    "Amount (₹)", "Refunded (₹)", "Status", "Paid with", "Razorpay payment id", "Razorpay order id",
];

function fmtIndiaDay(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: INDIA_TZ });
}

function fmtIndiaTime(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: INDIA_TZ });
}

function csvTypeLabel(row) {
    if (row.kind === "plan") return "Plan";
    if (row.kind === "topup") return "Credit top-up";
    return row.status === "failed" ? "Payment attempt" : "Older payment";
}

function csvStatusLabel(row) {
    if (row.status === "paid") return "Paid";
    if (row.status === "refunded") {
        return row.refundedInr > 0 && row.refundedInr < row.amountInr ? "Partly refunded" : "Refunded";
    }
    if (row.status === "failed") return "Failed";
    return "Not finished";
}

function paidWithLabel(method) {
    if (!method) return "";
    return PAID_WITH_LABELS[method] || method;
}

// Every cell is quoted. A cell that starts like a formula gets a leading ' so a spreadsheet shows it as text.
function csvCell(value) {
    let text = value === null || value === undefined ? "" : String(value);
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
}

function csvLine(row) {
    const plan = row.plan;
    return [
        row.date ? `${fmtIndiaDay(row.date)}, ${fmtIndiaTime(row.date)}` : "",
        csvTypeLabel(row),
        plan ? plan.name : "",
        plan?.term === "month" ? "1 month" : plan?.term === "year" ? "1 year" : "",
        plan?.studentPrice === true ? "Yes" : plan?.studentPrice === false ? "No" : "",
        plan ? fmtIndiaDay(plan.periodStart) : "",
        plan ? fmtIndiaDay(plan.periodEnd) : "",
        row.credits === null ? "" : row.credits,
        row.person.name,
        row.person.email,
        row.amountInr,
        row.refundedInr,
        csvStatusLabel(row),
        paidWithLabel(row.method),
        row.razorpayPaymentId || "",
        row.razorpayOrderId || "",
    ].map(csvCell).join(",");
}

export const exportPayments = async (req, res) => {
    try {
        const built = await buildPaymentQuery(req.query);
        if (built.error) return res.status(400).json({ success: false, message: built.error });

        const rows = await AiCreditTransaction.aggregate([
            ...paymentsBasePipeline(built.refundedPayIds),
            { $match: built.match },
            { $sort: { date: -1, _id: -1 } },
            { $limit: PAYMENTS_EXPORT_MAX },
        ]).allowDiskUse(true).option({ maxTimeMS: QUERY_MAX_MS });

        const data = await toPaymentRows(rows, built.refundMap);
        // The BOM first so Excel reads the file as UTF-8 (the ₹ in the headers).
        const body = "\uFEFF" + [CSV_HEADERS.map(csvCell).join(","), ...data.map(csvLine)].join("\r\n") + "\r\n";
        const fileName = `classgrid-payments-${indiaDayKeyFormat.format(new Date())}.csv`;

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        res.setHeader("Cache-Control", "no-store");
        res.status(200).send(body);
    } catch (error) {
        console.error("[Super Admin Payments] CSV failed:", error);
        res.status(500).json({ success: false, message: "Couldn't make the CSV." });
    }
};

// ── One payment ─────────────────────────────────────────

function fromCreditDoc(doc) {
    return {
        _id: doc._id,
        source: "credits",
        kind: doc.type,
        paymentId: doc.razorpay_payment_id || null,
        orderId: doc.razorpay_order_id || null,
        amountInr: doc.amount_inr,
        baseStatus: doc.status,
        userId: doc.userId || null,
        userName: doc.userName,
        userEmail: doc.userEmail,
        userMobile: doc.userMobile,
        planKey: doc.plan_key || null,
        term: doc.plan_term || null,
        periodStart: doc.plan_period_start || null,
        periodEnd: doc.plan_period_end || null,
        credits: doc.credits_added,
        method: doc.paymentMethod,
        date: doc.paymentTime || doc.createdAt,
        paymentTime: doc.paymentTime || null,
        createdAt: doc.createdAt,
        note: "",
    };
}

function fromPlatformDoc(doc) {
    return {
        _id: doc._id,
        source: "platform",
        kind: doc.paymentFlow === "ai_topup" ? "topup" : "other",
        paymentId: doc.razorpayPaymentId || null,
        orderId: doc.razorpayOrderId || null,
        amountInr: doc.amount,
        baseStatus: doc.status,
        userId: doc.userId || null,
        userName: doc.userName,
        userEmail: doc.userEmail,
        userMobile: doc.userMobile,
        planKey: null,
        term: null,
        periodStart: null,
        periodEnd: null,
        credits: null,
        method: doc.paymentMethod,
        date: doc.paymentTime || doc.createdAt,
        paymentTime: doc.paymentTime || null,
        createdAt: doc.createdAt,
        note: doc.note || "",
    };
}

async function findCreditByPayId(payId) {
    if (!payId) return null;
    return AiCreditTransaction.findOne({ razorpay_payment_id: payId, type: { $in: PAYMENT_TYPES_IN_CREDITS } })
        .maxTimeMS(QUERY_MAX_MS)
        .lean();
}

// A PlatformTransaction that is only the copy of a top-up is shown as the AiCreditTransaction it copies, the same
// way the list shows it.
async function viewOfPlatformRow(platformRow) {
    const credit = await findCreditByPayId(platformRow.razorpayPaymentId);
    if (credit) return { row: fromCreditDoc(credit), platformId: platformRow._id };
    return { row: fromPlatformDoc(platformRow), platformId: platformRow._id };
}

async function resolveByPayId(payId) {
    const credit = await findCreditByPayId(payId);
    if (credit) return { row: fromCreditDoc(credit), platformId: null };
    const platformRow = await PlatformTransaction.findOne({ razorpayPaymentId: payId, type: { $ne: "refund" } })
        .sort({ createdAt: -1 })
        .maxTimeMS(QUERY_MAX_MS)
        .lean();
    return platformRow ? { row: fromPlatformDoc(platformRow), platformId: platformRow._id } : null;
}

// Old links (/super-admin/billing/transactions/<PlatformTransaction id>) keep working through this.
async function resolveByObjectId(id) {
    const credit = await AiCreditTransaction.findOne({ _id: id, type: { $in: PAYMENT_TYPES_IN_CREDITS } })
        .maxTimeMS(QUERY_MAX_MS)
        .lean();
    if (credit) return { row: fromCreditDoc(credit), platformId: null };

    const platformRow = await PlatformTransaction.findById(id).maxTimeMS(QUERY_MAX_MS).lean();
    if (!platformRow) return null;
    if (platformRow.type !== "refund") return viewOfPlatformRow(platformRow);

    // A refund row is not a payment: open the payment it refunded.
    if (platformRow.refundOf) {
        const original = await PlatformTransaction.findById(platformRow.refundOf).maxTimeMS(QUERY_MAX_MS).lean();
        if (original && original.type !== "refund") return viewOfPlatformRow(original);
    }
    const payId = payIdFromNote(platformRow.note);
    return payId ? resolveByPayId(payId) : null;
}

// The refunds of one payment: webhook refund rows name it in their note, older manual ones point at it by refundOf.
async function loadRefundsForPayment(payId, platformId) {
    const conditions = [];
    if (payId) conditions.push({ note: { $regex: `for payment ${escapeRegex(payId)}\\b` } });
    if (platformId) conditions.push({ refundOf: platformId });
    if (!conditions.length) return { info: null, refundedByRazorpay: false };

    const rows = await PlatformTransaction.find({ type: "refund", $or: conditions })
        .select(`${REFUND_ROW_FIELDS} status`)
        .sort({ createdAt: -1 })
        .limit(100)
        .maxTimeMS(QUERY_MAX_MS)
        .lean();
    const map = new Map();
    for (const row of rows) addRefundRow(map, "this", row);
    finishRefundMap(map);
    return {
        info: map.get("this") || null,
        // The list counts a payment as refunded from webhook refund rows (status "refunded"); the same rule here.
        refundedByRazorpay: rows.some((row) => row.status === "refunded"),
    };
}

function withTimeout(promise, ms) {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("Razorpay did not answer in time")), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// The live Razorpay payment, or null when Razorpay can't be reached. It is the same read fetchPlatformPayment does,
// with expand[]=card added: without it Razorpay returns no card network or last 4 digits.
async function fetchLivePayment(payId) {
    try {
        const payment = await withTimeout(
            Promise.resolve().then(() => razorpayService.getPlatformInstance().payments.fetch(payId, { "expand[]": "card" })),
            LIVE_FETCH_TIMEOUT_MS
        );
        return payment && payment.id === payId ? payment : null;
    } catch (error) {
        console.error(`[Super Admin Payments] Razorpay fetch for ${payId} failed:`, error?.message || error);
        return null;
    }
}

function cardDetail(network, last4) {
    const parts = [network ? capitalise(String(network)) : "", last4 ? `•••• ${last4}` : ""].filter(Boolean);
    return parts.length ? parts.join(" ") : null;
}

// What the payment row itself says after "upi:", "card:" or "netbanking:" (only top-up copies store it).
function detailFromStoredMethod(method) {
    const text = String(method || "");
    const colon = text.indexOf(":");
    if (colon < 0) return null;
    const kind = text.slice(0, colon).toLowerCase();
    const rest = text.slice(colon + 1).trim();
    if (!rest) return null;
    if (kind === "card") {
        const match = /^(.*?)\s*(\d{4})$/.exec(rest);
        return match ? cardDetail(match[1], match[2]) : rest;
    }
    return rest;
}

// The ledger stores "UPI", "CARD", "NET_BANKING", "WALLET"; the page uses Razorpay's own lower-case names.
function normaliseLedgerMethod(method) {
    const text = String(method || "").trim().toLowerCase().replace(/[\s_]/g, "");
    return text || null;
}

// Fills method, fee and bank reference from the ERP ledger's copy of the payment when Razorpay can't be reached.
async function ledgerDetails(payId) {
    try {
        return await PaymentTransaction.findOne({ providerPaymentId: payId })
            .select("method feePaise taxPaise bankReference vpa cardInfo")
            .maxTimeMS(SIDE_LOOKUP_MAX_MS)
            .lean();
    } catch (error) {
        console.error(`[Super Admin Payments] ledger lookup for ${payId} failed:`, error?.message || error);
        return null;
    }
}

// The plan_student note Razorpay got with the payment, from the stored webhook (not indexed; one document).
async function studentFlagFromWebhook(payId) {
    try {
        const event = await WebhookEvent.findOne({ "payload.payload.payment.entity.id": payId })
            .select("payload.payload.payment.entity.notes")
            .maxTimeMS(SIDE_LOOKUP_MAX_MS)
            .lean();
        return event?.payload?.payload?.payment?.entity?.notes?.plan_student ?? null;
    } catch (error) {
        console.error(`[Super Admin Payments] webhook lookup for ${payId} failed:`, error?.message || error);
        return null;
    }
}

export const getPayment = async (req, res) => {
    try {
        const key = String(req.params.paymentKey || "").trim();
        let resolved = null;
        if (OBJECT_ID_RE.test(key)) resolved = await resolveByObjectId(key);
        else if (PAY_ID_RE.test(key)) resolved = await resolveByPayId(key);
        if (!resolved) return res.status(404).json({ success: false, message: "We couldn't find this payment." });

        const source = resolved.row;
        const payId = source.paymentId;

        // A top-up opened by its AiCreditTransaction id still has its PlatformTransaction copy; an older manual refund
        // points at that copy by refundOf (its note names no payment), so the copy's id is needed to find it.
        let platformId = resolved.platformId;
        if (!platformId && payId) {
            const copy = await PlatformTransaction.findOne({ razorpayPaymentId: payId, type: { $ne: "refund" } })
                .select("_id")
                .maxTimeMS(QUERY_MAX_MS)
                .lean();
            platformId = copy?._id || null;
        }

        const [refunds, markedRefunded, users, plansByKey] = await Promise.all([
            loadRefundsForPayment(payId, platformId),
            payId
                ? PlatformTransaction.exists({ razorpayPaymentId: payId, type: { $ne: "refund" }, status: "refunded" }).maxTimeMS(QUERY_MAX_MS)
                : Promise.resolve(null),
            loadUsersById([source]),
            loadPlansByKey(),
        ]);

        const refundedPayIds = new Set();
        if (payId && (refunds.refundedByRazorpay || markedRefunded)) refundedPayIds.add(payId);
        source.status = shownStatus(source.baseStatus, payId, refundedPayIds);

        const user = source.userId ? users.get(String(source.userId)) || null : null;
        const row = toPaymentRow(source, { user, plansByKey, refundInfo: refunds.info });

        // Live details from Razorpay, else what was stored. Neither may fail the page.
        const live = payId && payId.startsWith("pay_") ? await fetchLivePayment(payId) : null;
        let method = row.method;
        let methodDetail = detailFromStoredMethod(source.method);
        let bankReference = null;
        let feeInr = null;
        let taxInr = null;
        let contact = null;

        if (live) {
            method = rawMethod(live.method) || method;
            if (method === "upi") methodDetail = live.vpa || live.upi?.vpa || methodDetail;
            else if (method === "card" || method === "emi") methodDetail = cardDetail(live.card?.network, live.card?.last4) || methodDetail;
            else if (method === "netbanking") methodDetail = live.bank || methodDetail;
            else if (method === "wallet") methodDetail = live.wallet || methodDetail;
            if (typeof live.fee === "number") feeInr = roundInr(live.fee / 100);
            if (typeof live.tax === "number" && feeInr !== null) taxInr = roundInr(live.tax / 100);
            bankReference = live.acquirer_data?.rrn || live.acquirer_data?.bank_transaction_id || live.bank_transaction_id || null;
            contact = live.contact ? String(live.contact) : null;
            if (row.plan) {
                const flag = live.notes?.plan_student;
                if (flag === "1") row.plan.studentPrice = true;
                else if (flag === "0") row.plan.studentPrice = false;
            }
            // Razorpay's own refunded amount is the truth when it answers.
            const refundedPaise = Number(live.amount_refunded) || 0;
            if (refundedPaise > 0) {
                row.refundedInr = roundInr(refundedPaise / 100);
                row.status = "refunded";
            }
        } else if (payId) {
            const [ledger, studentFlag] = await Promise.all([
                ledgerDetails(payId),
                row.plan && payId.startsWith("pay_") ? studentFlagFromWebhook(payId) : Promise.resolve(null),
            ]);
            if (ledger) {
                method = method || normaliseLedgerMethod(ledger.method);
                if (method === "upi" && ledger.vpa) methodDetail = ledger.vpa;
                else if ((method === "card" || method === "emi") && ledger.cardInfo) {
                    methodDetail = cardDetail(ledger.cardInfo.network, ledger.cardInfo.last4) || methodDetail;
                }
                // A stored fee of 0 means it was not recorded: Razorpay charges a fee on every captured payment.
                if (Number(ledger.feePaise) > 0) {
                    feeInr = roundInr(ledger.feePaise / 100);
                    taxInr = Number(ledger.taxPaise) > 0 ? roundInr(ledger.taxPaise / 100) : null;
                }
                bankReference = ledger.bankReference || null;
            }
            if (row.plan) {
                if (studentFlag === "1") row.plan.studentPrice = true;
                else if (studentFlag === "0") row.plan.studentPrice = false;
            }
        }
        row.method = method;

        const linkedUser = user && user.status !== "deleted" ? user : null;
        const currentPlanConfig = linkedUser?.plan?.id ? plansByKey.get(linkedUser.plan.id) : null;
        const currentPlan = linkedUser?.plan?.id && linkedUser.plan.id !== "free" && linkedUser.plan.status === "active"
            ? {
                key: linkedUser.plan.id,
                name: currentPlanConfig?.name || capitalise(linkedUser.plan.id),
                status: linkedUser.plan.status,
                expiresAt: toIso(linkedUser.plan.expires_at),
            }
            : null;

        const errorText = row.status === "failed" && source.note
            ? String(source.note).replace(/^FAILED:\s*/, "").trim() || null
            : null;

        res.json({
            success: true,
            data: {
                ...row,
                person: {
                    ...row.person,
                    phone: String(linkedUser?.phoneNumber || "").trim() || String(source.userMobile || "").trim() || contact || null,
                    currentPlan,
                },
                payment: {
                    methodLabel: method ? PAID_WITH_LABELS[method] || method : null,
                    methodDetail: methodDetail || null,
                    bankReference: bankReference ? String(bankReference) : null,
                    feeInr,
                    taxInr,
                    netInr: feeInr !== null ? roundInr(row.amountInr - feeInr) : null,
                    paidAt: toIso(source.paymentTime),
                    recordedAt: toIso(source.createdAt) || row.date,
                    errorText,
                    live: Boolean(live),
                },
                refunds: refunds.info?.refunds || [],
                // Only plans get a receipt email, sent to the email saved on the payment. Whether it arrived is not
                // recorded anywhere per payment.
                receipt: row.kind === "plan"
                    ? { sent: "plan_receipt", to: String(source.userEmail || "").trim() || null }
                    : { sent: "none", to: null },
            },
        });
    } catch (error) {
        console.error("[Super Admin Payments] detail failed:", error);
        res.status(500).json({ success: false, message: "Couldn't load this payment." });
    }
};
