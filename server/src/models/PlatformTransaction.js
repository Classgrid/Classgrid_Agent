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

/**
 * PlatformTransaction — records every payment event related to platform billing
 * (Org subscriptions paid via Razorpay or manually approved by Super Admin).
 * Separate from per-org FeeTransaction which tracks student fee payments.
 */
const platformTransactionSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: false,
    },
    organizationName: { type: String, default: "" }, // denormalized for fast reads
    paymentFlow: { type: String, enum: ["subscription", "ai_topup", "other"], default: "subscription" },
    userName: { type: String, default: "" },
    userEmail: { type: String, default: "" },
    userMobile: { type: String, default: "" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    userRole: { type: String, default: "" },
    paymentMethod: { type: String, default: "" },
    networkIp: { type: String, default: "" },
    vpnConnected: { type: Boolean, default: false },
    country: { type: String, default: "" },
    networkId: { type: String, default: "" },
    paymentTime: { type: Date, default: null },

    // Who processed this (super_admin user or "system" for automated)
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Payment source
    type: {
      type: String,
      enum: ["razorpay", "manual", "refund", "credit", "adjustment"],
      default: "razorpay",
    },

    // Amount in INR (paise for Razorpay, rupees for manual)
    amount: { type: Number, required: true }, // always stored in rupees
    currency: { type: String, default: "INR" },

    status: {
      type: String,
      enum: ["success", "failed", "refunded", "pending"],
      default: "success",
    },

    // Razorpay specific
    razorpayOrderId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },

    // Plan that was activated by this payment
    planActivated: { type: String, enum: ["demo", "active"], default: "active" },

    // Refund details (if this is a refund transaction)
    refundOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformTransaction",
      default: null,
    },
    refundReason: { type: String, default: null },
    refundedAt: { type: Date, default: null },

    // Human-readable note (set by Super Admin)
    note: { type: String, default: "" },

    // New subscription expiry after this payment
    newExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

platformTransactionSchema.index({ organizationId: 1, createdAt: -1 });
platformTransactionSchema.index({ status: 1, createdAt: -1 });
platformTransactionSchema.index({ razorpayPaymentId: 1 }, { sparse: true });

export default mongoose.models.PlatformTransaction ||
  mongoose.model("PlatformTransaction", platformTransactionSchema);
