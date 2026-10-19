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
import BillingHandoff from "../models/BillingHandoff.js";
import PaymentOrder from "../models/PaymentOrder.js";
import PaymentAttempt from "../models/PaymentAttempt.js";
import PaymentTransaction from "../models/PaymentTransaction.js";
import BillingAuditLog from "../models/BillingAuditLog.js";
import Invoice from "../models/Invoice.js";
import SaasInvoice from "../models/SaasInvoice.js";
import FeeRecord from "../models/FeeRecord.js";
import CanteenOrder from "../models/CanteenOrder.js";
import { PAYMENT_ATTEMPT_STAGE } from "../utils/billing.utils.js";

function conflict(message, code = "PAYMENT_STATE_CONFLICT") {
    const error = new Error(message);
    error.statusCode = 409;
    error.code = code;
    return error;
}

function assertAmount(actual, expected) {
    if (!Number.isSafeInteger(actual) || actual !== expected) {
        throw conflict("Provider amount does not match the payable amount", "PAYMENT_AMOUNT_MISMATCH");
    }
}

async function applyReferencePayment(handoff, payment, session) {
    const amountPaise = handoff.amountPaise;
    const organizationId = handoff.organization_id;

    if (handoff.payment_type === "AI_TOPUP") { return { type: "AiTopUp", amountPaise }; } if (handoff.referenceModel === "Invoice") {
        const invoice = await Invoice.findOne({ _id: handoff.referenceId, organizationId }).session(session);
        if (!invoice) throw conflict("Invoice no longer exists");
        const due = invoice.amountDuePaise ?? (invoice.totalAmountPaise - (invoice.amountPaidPaise || 0));
        if (invoice.status === "PAID" && due === 0) return invoice;
        assertAmount(amountPaise, due);
        invoice.amountPaidPaise = (invoice.amountPaidPaise || 0) + amountPaise;
        invoice.amountDuePaise = 0;
        invoice.status = "PAID";
        invoice.isLocked = true;
        await invoice.save({ session });
        return invoice;
    }

    if (handoff.referenceModel === "SaasInvoice") {
        const invoice = await SaasInvoice.findOne({ _id: handoff.referenceId, organizationId }).session(session);
        if (!invoice) throw conflict("SaaS invoice no longer exists");
        if (invoice.status === "paid") return invoice;
        assertAmount(amountPaise, invoice.totalAmountPaise);
        invoice.status = "paid";
        invoice.razorpay.orderId = handoff.razorpay_order_id;
        invoice.razorpay.paymentId = payment.id;
        invoice.razorpay.paymentMethod = payment.method || null;
        invoice.razorpay.paidAt = new Date();
        await invoice.save({ session });
        return invoice;
    }

    if (handoff.referenceModel === "FeeRecord") {
        const fee = await FeeRecord.findOne({ _id: handoff.referenceId, organizationId }).session(session);
        if (!fee) throw conflict("Fee record no longer exists");
        const due = fee.amountPaise - (fee.paidAmountPaise || 0);
        if (fee.status === "paid" && due === 0) return fee;
        assertAmount(amountPaise, due);
        fee.paidAmountPaise = (fee.paidAmountPaise || 0) + amountPaise;
        fee.status = fee.paidAmountPaise >= fee.amountPaise ? "paid" : "partially_paid";
        fee.paymentReference = payment.id;
        fee.paidAt = new Date();
        await fee.save({ session });
        return fee;
    }

    if (handoff.referenceModel === "CanteenOrder") {
        const order = await CanteenOrder.findOne({ _id: handoff.referenceId, orgId: organizationId }).session(session);
        if (!order) throw conflict("Canteen order no longer exists");
        if (order.paymentStatus === "SUCCESS") return order;
        const orderAmountPaise = order.totalAmountPaise ?? Math.round(Number(order.totalAmount) * 100);
        assertAmount(amountPaise, orderAmountPaise);
        order.paymentStatus = "SUCCESS";
        order.status = "NEW";
        order.transactionId = payment.id;
        await order.save({ session });
        return order;
    }

    if (handoff.referenceModel === "AiTopUp") {
        return { type: "AiTopUp", amountPaise };
    }

    throw conflict("Unsupported payable model");
}

export async function finalizeCapturedPayment({ handoffId, providerPayment, requestContext = {} }) {
    const session = await mongoose.startSession();
    let result;
    try {
        await session.withTransaction(async () => {
            const handoff = await BillingHandoff.findOneAndUpdate(
                {
                    _id: handoffId,
                    verified: false,
                    consumedAt: null,
                    otpVerifiedAt: { $ne: null },
                    expiresAt: { $gt: new Date() },
                },
                { $set: { verified: true, consumedAt: new Date() } },
                { returnDocument: 'after', session }
            ).select("+token +otp");
            if (!handoff) throw conflict("Payment session was already consumed or expired", "PAYMENT_SESSION_CONSUMED");

            const order = await PaymentOrder.findById(handoff.paymentOrderId).session(session);
            const attempt = await PaymentAttempt.findById(handoff.paymentAttemptId).session(session);
            if (!order || !attempt) throw conflict("Internal payment order is missing");
            if (order.providerOrderId !== providerPayment.order_id || order.providerOrderId !== handoff.razorpay_order_id) {
                throw conflict("Provider order does not match the checkout session", "PAYMENT_ORDER_MISMATCH");
            }
            assertAmount(providerPayment.amount, order.amountPaise);
            if (String(providerPayment.currency || "").toUpperCase() !== String(order.currency).toUpperCase()) {
                throw conflict("Provider currency does not match the checkout session", "PAYMENT_CURRENCY_MISMATCH");
            }
            if (providerPayment.status !== "captured") {
                throw conflict("Payment is not captured by the provider", "PAYMENT_NOT_CAPTURED");
            }

            const transaction = await PaymentTransaction.findOneAndUpdate(
                { providerPaymentId: providerPayment.id },
                {
                    $setOnInsert: {
                        paymentAttemptId: attempt._id,
                        paymentOrderId: order._id,
                        organizationId: order.organizationId,
                        paymentFlow: order.paymentFlow,
                        merchantType: order.merchantType,
                        merchantOrganizationId: order.merchantOrganizationId,
                        providerPaymentId: providerPayment.id,
                        amountCapturedPaise: providerPayment.amount,
                        currency: providerPayment.currency || order.currency,
                        method: String(providerPayment.method || "UNKNOWN").toUpperCase(),
                        feePaise: Number.isSafeInteger(providerPayment.fee) ? providerPayment.fee : 0,
                        taxPaise: Number.isSafeInteger(providerPayment.tax) ? providerPayment.tax : 0,
                        bankReference: providerPayment.acquirer_data?.rrn || providerPayment.acquirer_data?.bank_transaction_id || null,
                        cardInfo: providerPayment.card
                            ? {
                                network: providerPayment.card.network,
                                last4: providerPayment.card.last4,
                                issuer: providerPayment.card.issuer,
                            }
                            : undefined,
                        international: Boolean(providerPayment.international),
                        status: "CAPTURED",
                        capturedAt: providerPayment.created_at
                            ? new Date(providerPayment.created_at * 1000)
                            : new Date(),
                    },
                },
                { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true, session }
            );

            order.status = "PAID";
            await order.save({ session });
            attempt.stage = PAYMENT_ATTEMPT_STAGE.CAPTURED;
            attempt.providerPaymentId = providerPayment.id;
            attempt.method = providerPayment.method || null;
            await attempt.save({ session });
            const reference = await applyReferencePayment(handoff, providerPayment, session);

            await BillingAuditLog.create([{
                actorId: order.createdBy || null,
                organizationId: order.organizationId,
                entityType: "PaymentTransaction",
                entityId: transaction._id,
                action: "CAPTURED",
                reason: "Provider-verified checkout payment",
                ipAddress: requestContext.ip || null,
                requestId: requestContext.requestId || null,
                oldState: { orderStatus: "CREATED", attemptStage: PAYMENT_ATTEMPT_STAGE.OTP_VERIFIED },
                newState: {
                    orderStatus: order.status,
                    attemptStage: attempt.stage,
                    providerPaymentId: transaction.providerPaymentId,
                    amountCapturedPaise: transaction.amountCapturedPaise,
                },
            }], { session });

            result = { handoff, order, attempt, transaction, reference };
        });
        return result;
    } finally {
        await session.endSession();
    }
}

