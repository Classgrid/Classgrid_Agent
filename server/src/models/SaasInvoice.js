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

/**
 * Classgrid — SaasInvoice Model
 *
 * Monthly invoice generated for each organization based on their
 * actual resource usage (Pay-As-You-Go). The Org Admin pays this
 * via Razorpay from their dashboard.
 *
 * Flow:
 * 1. Nightly worker populates OrganizationUsageDaily
 * 2. On the 1st of each month, monthly-invoice.worker aggregates
 *    the previous month's daily records into one SaasInvoice
 * 3. Email is sent to the Org Admin with the invoice link
 * 4. Org Admin clicks "Pay Now" → Razorpay → webhook marks as paid
 */

import mongoose from "mongoose";

const invoiceLineItemSchema = new mongoose.Schema(
    {
        provider: {
            type: String,
            required: true,
        },
        resourceLabel: {
            type: String,
            required: true,
        },
        totalQuantity: {
            type: Number,
            required: true,
            min: 0,
        },
        unit: {
            type: String,
            required: true,
        },
        unitRatePaise: {
            type: Number,
            required: true,
            min: 0,
            validate: { validator: Number.isInteger, message: "{VALUE} is not an integer paise value" }
        },
        amountPaise: {
            type: Number,
            required: true,
            min: 0,
            validate: { validator: Number.isInteger, message: "{VALUE} is not an integer paise value" }
        },
    },
    { _id: false }
);

const saasInvoiceSchema = new mongoose.Schema(
    {
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            index: true,
        },
        invoiceNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        billingPeriod: {
            month: { type: Number, required: true, min: 1, max: 12 },
            year: { type: Number, required: true },
            startDate: { type: Date, required: true },
            endDate: { type: Date, required: true },
        },
        lineItems: {
            type: [invoiceLineItemSchema],
            default: [],
        },
        subtotalPaise: {
            type: Number,
            required: true,
            min: 0,
            validate: { validator: Number.isInteger, message: "{VALUE} is not an integer paise value" }
        },
        taxPercent: {
            type: Number,
            default: 18, // GST 18%
            min: 0,
        },
        taxAmountPaise: {
            type: Number,
            default: 0,
            min: 0,
            validate: { validator: Number.isInteger, message: "{VALUE} is not an integer paise value" }
        },
        totalAmountPaise: {
            type: Number,
            required: true,
            min: 0,
            validate: { validator: Number.isInteger, message: "{VALUE} is not an integer paise value" }
        },
        currency: {
            type: String,
            default: "INR",
            uppercase: true,
        },
        status: {
            type: String,
            enum: ["draft", "sent", "paid", "overdue", "cancelled"],
            default: "draft",
            index: true,
        },
        dueDate: {
            type: Date,
            required: true,
            index: true,
        },
        // Razorpay payment tracking
        razorpay: {
            orderId: { type: String, default: null },
            paymentId: { type: String, default: null },
            paymentMethod: { type: String, default: null },
            paidAt: { type: Date, default: null },
        },
        // Email tracking
        emailSentAt: { type: Date, default: null },
        reminderSentAt: { type: Date, default: null },
        // Notes
        notes: { type: String, default: "" },
    },
    { timestamps: true }
);

saasInvoiceSchema.index({ organizationId: 1, "billingPeriod.year": 1, "billingPeriod.month": 1 }, { unique: true });
saasInvoiceSchema.index({ status: 1, dueDate: 1 });

export default mongoose.models.SaasInvoice || mongoose.model("SaasInvoice", saasInvoiceSchema);
