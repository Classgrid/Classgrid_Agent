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
import { PAYMENT_ATTEMPT_STAGE } from "../utils/billing.utils.js";

const paymentFailureSchema = new mongoose.Schema(
    {
        paymentAttemptId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PaymentAttempt",
            required: true,
        },
        paymentOrderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PaymentOrder",
            required: true,
        },
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        failureStage: {
            type: String,
            enum: Object.values(PAYMENT_ATTEMPT_STAGE),
            required: true,
        },
        errorCode: { // Gateway error code, e.g. BAD_REQUEST_ERROR
            type: String,
            default: null,
        },
        errorDescription: { // Human readable failure reason
            type: String,
            default: null,
        },
        errorSource: { // e.g. "customer", "issuer", "gateway"
            type: String,
            default: null,
        },
        errorStep: { // e.g. "payment_authentication"
            type: String,
            default: null,
        },
        errorReason: { // e.g. "invalid_otp"
            type: String,
            default: null,
        },
        responsibility: {
            type: String,
            enum: ["USER_ACTION_REQUIRED", "CLASSGRID_ERROR", "INSTITUTION_CONFIGURATION_ERROR", "RAZORPAY_ERROR", "BANK_DECLINE", "NETWORK_ERROR", "EXPIRED_SESSION", "UNKNOWN"],
            default: "UNKNOWN",
        },
        retryEligibility: {
            type: Boolean, // Can we generate a fresh link?
            default: true,
        },
        userNotified: {
            type: Boolean,
            default: false,
        },
        resolved: {
            type: Boolean,
            default: false,
        },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", // Support or Engineering owner
            default: null,
        },
        internalNotes: [{
            authorId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true,
            },
            text: {
                type: String,
                required: true,
                trim: true,
                maxlength: 2000,
            },
            createdAt: {
                type: Date,
                default: Date.now,
            },
        }],
        recoveryAttempts: [{
            action: {
                type: String,
                required: true,
                trim: true,
                maxlength: 100,
            },
            status: {
                type: String,
                enum: ["QUEUED", "SUCCESS", "FAILED", "REQUIRES_RECONCILIATION"],
                required: true,
            },
            note: {
                type: String,
                trim: true,
                maxlength: 1000,
                default: "",
            },
            actorId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                default: null,
            },
            timestamp: {
                type: Date,
                default: Date.now,
            },
        }],
        organizationNotifiedAt: {
            type: Date,
            default: null,
        },
        resolvedAt: {
            type: Date,
            default: null,
        },
        resolution: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

paymentFailureSchema.index({ failureStage: 1, createdAt: 1 });
paymentFailureSchema.index({ resolved: 1 });

export default mongoose.models.PaymentFailure || mongoose.model("PaymentFailure", paymentFailureSchema);
