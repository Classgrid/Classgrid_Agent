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
import express from "express";
import { isAuthenticated } from "../middleware/auth.middleware.js";
import { createTopupOrder } from "../controllers/ai-credits-topup.controller.js";
import { generalLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

/**
 * PHASE 13: Top-Up Routes
 * Mounted at: /api/ai/topup
 */

// Initiates the top-up process and hands off to billing.classgrid.in
router.post("/initiate", generalLimiter, isAuthenticated, createTopupOrder);

// The plan mentions verifyTopupPayment, but the actual fulfillment is via razorpay-webhook.routes.js
// We expose this as a polling endpoint for the frontend to check if their top-up succeeded.
router.get("/verify/:orderId", generalLimiter, isAuthenticated, async (req, res) => {
    // In our architecture, the webhook handles credit additions.
    // This endpoint can check the AiCreditTransaction table to see if it was fulfilled.
    try {
        const AiCreditTransaction = (await import("../models/AiCreditTransaction.js")).default;
        const txn = await AiCreditTransaction.findOne({ 
            userId: req.user._id, 
            razorpay_order_id: req.params.orderId 
        });
        if (!txn) {
            return res.status(404).json({ success: false, status: "pending" });
        }
        res.status(200).json({ success: true, status: txn.status, credits_added: txn.credits_added });
    } catch (err) {
        res.status(500).json({ success: false, error: "Failed to verify payment status" });
    }
});

export default router;
