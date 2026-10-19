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
import mongoose from "mongoose";

const aiCreditTransactionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        orgId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: false,
            default: null,
        },
        amount_inr: {
            type: Number,
            required: true,
        },
        credits_added: {
            type: Number,
            required: true,
            comment: "Number of tokens added to user balance. 1 Credit = 1 Token.",
        },
        razorpay_payment_id: {
            type: String,
            required: true,
            unique: true,
            sparse: true,
        },
        razorpay_order_id: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            enum: ["topup", "grant", "refund", "adjustment", "pause", "resume", "extend", "revoke"],
            default: "topup",
        },
        status: {
            type: String,
            enum: ["success", "failed", "pending", "paused", "revoked", "expired", "active"],
            default: "pending",
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        userName: { type: String, default: "" },
        userEmail: { type: String, default: "" },
        userMobile: { type: String, default: "" },
        userRole: { type: String, default: "" },
        organizationName: { type: String, default: "" },
        paymentMethod: { type: String, default: "" },
        networkIp: { type: String, default: "" },
        vpnConnected: { type: Boolean, default: false },
        country: { type: String, default: "" },
        networkId: { type: String, default: "" },
        paymentTime: { type: Date, default: null }
    },
    {
        timestamps: true, // Auto-adds createdAt and updatedAt
        optimisticConcurrency: true,
    }
);

// Indexes for fast lookup by user and org
aiCreditTransactionSchema.index({ userId: 1, createdAt: -1 });
aiCreditTransactionSchema.index({ orgId: 1, createdAt: -1 });


export default mongoose.models.AiCreditTransaction || mongoose.model("AiCreditTransaction", aiCreditTransactionSchema);
