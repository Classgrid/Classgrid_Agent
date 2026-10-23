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

/**
 * fraud-logs.routes.js
 * 
 * GET /api/superadmin/fraud-logs
 * Returns all transactions that were blocked by the Fraud Detection Engine.
 * These are stored as PlatformTransactions with status="failed" and
 * note containing "BLOCKED BY FRAUD ENGINE".
 * 
 * Access: SuperAdmin only
 */

import express from "express";
import { isAuthenticated } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/rbac.middleware.js";
import PlatformTransaction from "../models/PlatformTransaction.js";
import Organization from "../models/Organization.js";

const router = express.Router();
router.use(isAuthenticated, requireRole("super_admin"));

// GET /api/superadmin/fraud-logs
router.get("/", async (req, res) => {
    try {
        const { page = 1, limit = 25, search = "" } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        // Find all transactions blocked by the fraud engine
        const baseQuery = {
            status: "failed",
            note: { $regex: "BLOCKED BY FRAUD ENGINE", $options: "i" },
        };

        if (search) {
            baseQuery.$or = [
                { razorpayPaymentId: { $regex: search, $options: "i" } },
                { note: { $regex: search, $options: "i" } },
            ];
        }

        const [logs, total] = await Promise.all([
            PlatformTransaction.find(baseQuery)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            PlatformTransaction.countDocuments(baseQuery),
        ]);

        // Enrich with org names
        const orgIds = [...new Set(logs.map(l => l.organizationId).filter(Boolean))];
        const orgs = await Organization.find({ _id: { $in: orgIds } }).select("name").lean();
        const orgMap = Object.fromEntries(orgs.map(o => [o._id.toString(), o.name]));

        // Parse the fraud details out of the note field
        const enriched = logs.map(log => {
            const note = log.note || "";
            // Parse: "BLOCKED BY FRAUD ENGINE | Score: 0.9 | Reason: VPN/Proxy detected..."
            const scoreMatch = note.match(/Score:\s*([\d.]+)/);
            const reasonMatch = note.match(/Reason:\s*(.+)$/);

            return {
                id: log._id,
                paymentId: log.razorpayPaymentId || "—",
                orderId: log.razorpayOrderId || "—",
                amount: log.amount,
                currency: log.currency || "INR",
                fraudScore: scoreMatch ? parseFloat(scoreMatch[1]) : null,
                reason: reasonMatch ? reasonMatch[1] : "Unknown",
                organizationId: log.organizationId,
                organizationName: orgMap[log.organizationId?.toString()] || "Unknown",
                blockedAt: log.createdAt,
                note: log.note,
            };
        });

        return res.json({
            success: true,
            data: enriched,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
            summary: {
                totalBlocked: total,
                totalAmountBlocked: logs.reduce((sum, l) => sum + (l.amount || 0), 0),
            },
        });
    } catch (error) {
        console.error("[Fraud Logs API]", error);
        return res.status(500).json({ success: false, error: "Failed to fetch fraud logs" });
    }
});

export default router;
