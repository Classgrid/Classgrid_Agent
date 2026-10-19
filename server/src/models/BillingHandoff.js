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

const billingHandoffSchema = new mongoose.Schema(
    {
        // Stores a SHA-256 hash. The raw bearer token is returned once.
        token: { type: String, required: true, unique: true, select: false },
        email: { type: String, required: true }, // The email the OTP is sent to
        otp: { type: String, required: true, select: false }, // bcrypt hash
        organization_id: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
        paymentOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "PaymentOrder", required: true },
        paymentAttemptId: { type: mongoose.Schema.Types.ObjectId, ref: "PaymentAttempt", required: true },
        referenceId: { type: mongoose.Schema.Types.ObjectId, required: true },
        referenceModel: {
            type: String,
            required: true,
            enum: ["Invoice", "SaasInvoice", "FeeRecord", "CanteenOrder"],
        },
        
        // Razorpay details generated prior to handoff
        razorpay_order_id: { type: String, required: true },
        amountPaise: {
            type: Number,
            required: true,
            min: 1,
            validate: { validator: Number.isSafeInteger, message: "{VALUE} is not an integer paise value" },
        },
        currency: { type: String, default: "INR" },
        razorpay_key_id: { type: String, required: true }, // So frontend knows which key to use
        
        // Context
        payment_type: { type: String, required: true, enum: ["saas_invoice", "fee_payment", "admission_fee", "canteen_order", "AI_TOPUP"] },
        return_url: { type: String, required: true }, // Where to redirect after success
        
        // Additional context (e.g., studentId, invoiceId, etc.) stored as a flexible object if needed
        context: { type: mongoose.Schema.Types.Mixed },
        
        // Browser/Environment Fingerprinting (Next-level security)
        clientIp: { type: String, required: true },
        userAgent: { type: String, required: true },
        
        verified: { type: Boolean, default: false },
        attempts: { type: Number, default: 0 },
        lockoutUntil: { type: Date },
        otpVerifiedAt: { type: Date, default: null },
        consumedAt: { type: Date, default: null },
        resendCount: { type: Number, default: 0 },
        lastOtpSentAt: { type: Date, default: Date.now },
        expiresAt: { type: Date, required: true },
    },
    { timestamps: true }
);

billingHandoffSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.BillingHandoff || mongoose.model("BillingHandoff", billingHandoffSchema);
