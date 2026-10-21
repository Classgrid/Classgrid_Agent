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

import crypto from "crypto";
import Transaction from "../../models/Transaction.js";
import Invoice from "../../models/Invoice.js";
import { updateInvoiceAfterPayment } from "./invoicing.service.js";
import razorpayService from "../razorpay.service.js";

// ══════════════════════════════════════════════════════════════════════════════
// PAYMENT GATEWAY SERVICE — Handles real money processing via Razorpay.
// Creates orders, verifies webhook signatures, records manual payments,
// and automatically reconciles invoices after every successful transaction.
// ══════════════════════════════════════════════════════════════════════════════

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";

/**
 * Creates a Razorpay payment order for a specific invoice.
 * Saves a pending Transaction immediately so we can track it through the webhook lifecycle.
 *
 * @param {string} invoiceId - The Invoice._id to pay against.
 * @param {string} orgId     - Tenant isolation.
 * @returns {Promise<Object>} The order details and the pending Transaction.
 */
export async function createPaymentOrder(invoiceId, orgId) {
    if (!invoiceId || !orgId) {
        throw new Error("invoiceId and orgId are required.");
    }

    try {
        // 1. Fetch the invoice and validate it
        const invoice = await Invoice.findOne({
            _id: invoiceId,
            organization_id: orgId
        }).lean();

        if (!invoice) {
            throw new Error("Invoice not found or unauthorized.");
        }

        if (invoice.status === "paid") {
            throw new Error("This invoice has already been fully paid.");
        }

        if (invoice.remaining_amount <= 0) {
            throw new Error("No remaining balance on this invoice.");
        }

        // 2. Create a Razorpay Order
        const orderPayload = await razorpayService.createOrder(
            orgId.toString(),
            invoice.remaining_amount,
            "INR",
            invoiceId.toString(),
            "fees",
            {
                invoice_id: invoiceId.toString(),
                student_id: invoice.student_id?.toString() || ""
            }
        );

        // 3. Save a pending Transaction to track this payment attempt
        const transaction = await Transaction.create({
            organization_id: orgId,
            invoice_id: invoiceId,
            student_id: invoice.student_id,
            amount: invoice.remaining_amount,
            payment_method: "razorpay",
            gateway_order_id: orderPayload.id,
            gateway_payment_id: null,
            status: "pending"
        });

        return {
            order: orderPayload,
            transaction: transaction.toObject()
        };
    } catch (error) {
        throw new Error(`Failed to create payment order: ${error.message}`);
    }
}

/**
 * Verifies a Razorpay webhook/callback signature using HMAC-SHA256.
 * If the signature is valid, marks the Transaction as 'success' and
 * automatically reconciles the parent Invoice via updateInvoiceAfterPayment().
 *
 * @param {string} razorpayOrderId   - The Razorpay order ID from the callback.
 * @param {string} razorpayPaymentId - The Razorpay payment ID from the callback.
 * @param {string} razorpaySignature - The signature to verify.
 * @returns {Promise<Object>} The updated Transaction and reconciled Invoice.
 */
export async function verifyPaymentWebhook(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        throw new Error("razorpayOrderId, razorpayPaymentId, and razorpaySignature are all required.");
    }

    try {
        // 1. Verify signature using HMAC-SHA256
        const expectedSignature = crypto
            .createHmac("sha256", RAZORPAY_KEY_SECRET)
            .update(`${razorpayOrderId}|${razorpayPaymentId}`)
            .digest("hex");

        if (expectedSignature !== razorpaySignature) {
            throw new Error("Payment signature verification failed. Potential tampering detected.");
        }

        // 2. Find the pending transaction by gateway_order_id
        const transaction = await Transaction.findOne({
            gateway_order_id: razorpayOrderId,
            status: "pending"
        });

        if (!transaction) {
            throw new Error("No pending transaction found for this order. It may have already been processed.");
        }

        // 3. Mark transaction as successful
        transaction.gateway_payment_id = razorpayPaymentId;
        transaction.status = "success";
        await transaction.save();

        // 4. Automatically reconcile the parent invoice
        const updatedInvoice = await updateInvoiceAfterPayment(
            transaction.invoice_id.toString(),
            transaction.amount,
            transaction.organization_id.toString()
        );

        return {
            transaction: transaction.toObject(),
            invoice: updatedInvoice
        };
    } catch (error) {
        // If verification fails, mark the transaction as failed for audit trail
        if (razorpayOrderId) {
            await Transaction.findOneAndUpdate(
                { gateway_order_id: razorpayOrderId, status: "pending" },
                { status: "failed" }
            ).catch(() => {}); // Silent fail on cleanup
        }
        throw new Error(`Payment verification failed: ${error.message}`);
    }
}

/**
 * Records a manual (offline) payment — cash or bank transfer.
 * Creates a Transaction with status 'success' immediately and reconciles the invoice.
 *
 * @param {string} invoiceId     - The Invoice._id.
 * @param {number} amount        - The amount received.
 * @param {string} paymentMethod - 'cash' or 'bank_transfer'.
 * @param {string} adminId       - The admin/faculty who recorded the payment.
 * @param {string} orgId         - Tenant isolation.
 * @returns {Promise<Object>} The Transaction and reconciled Invoice.
 */
export async function recordManualPayment(invoiceId, amount, paymentMethod, adminId, orgId) {
    if (!invoiceId || !amount || !paymentMethod || !orgId) {
        throw new Error("invoiceId, amount, paymentMethod, and orgId are all required.");
    }

    if (amount <= 0) {
        throw new Error("Payment amount must be a positive number.");
    }

    if (!["cash", "bank_transfer"].includes(paymentMethod)) {
        throw new Error("Manual payment method must be 'cash' or 'bank_transfer'.");
    }

    try {
        // 1. Fetch the invoice to get the student_id and validate
        const invoice = await Invoice.findOne({
            _id: invoiceId,
            organization_id: orgId
        }).lean();

        if (!invoice) {
            throw new Error("Invoice not found or unauthorized.");
        }

        if (invoice.status === "paid") {
            throw new Error("This invoice has already been fully paid.");
        }

        if (amount > invoice.remaining_amount) {
            throw new Error(
                `Payment of ₹${amount} exceeds remaining balance of ₹${invoice.remaining_amount}.`
            );
        }

        // 2. Create a successful transaction immediately (no gateway involved)
        const manualReceiptId = `manual_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

        const transaction = await Transaction.create({
            organization_id: orgId,
            invoice_id: invoiceId,
            student_id: invoice.student_id,
            amount,
            payment_method: paymentMethod,
            gateway_order_id: manualReceiptId,
            gateway_payment_id: `recorded_by_${adminId}`,
            status: "success"
        });

        // 3. Reconcile the invoice
        const updatedInvoice = await updateInvoiceAfterPayment(invoiceId, amount, orgId);

        return {
            transaction: transaction.toObject(),
            invoice: updatedInvoice
        };
    } catch (error) {
        throw new Error(`Failed to record manual payment: ${error.message}`);
    }
}

/**
 * Returns all payment transactions for a specific invoice — the complete receipt trail.
 *
 * @param {string} invoiceId - The Invoice._id.
 * @param {string} orgId     - Tenant isolation.
 * @returns {Promise<Array>} List of Transaction documents.
 */
export async function getTransactionHistory(invoiceId, orgId) {
    if (!invoiceId || !orgId) {
        throw new Error("invoiceId and orgId are required.");
    }

    try {
        return await Transaction.find({
            invoice_id: invoiceId,
            organization_id: orgId
        })
            .sort({ createdAt: -1 })
            .lean();
    } catch (error) {
        throw new Error(`Failed to fetch transaction history: ${error.message}`);
    }
}
