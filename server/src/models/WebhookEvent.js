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

const webhookEventSchema = new mongoose.Schema(
    {
        provider: { // e.g. "RAZORPAY"
            type: String,
            required: true,
            uppercase: true,
        },
        providerEventId: { // e.g. "ev_abcdefgh"
            type: String,
            required: true,
        },
        eventType: { // e.g. "payment.captured", "refund.processed"
            type: String,
            required: true,
        },
        payloadHash: { // To detect if payload changed for same event ID
            type: String,
            required: true,
        },
        signatureValid: {
            type: Boolean,
            required: true,
        },
        payload: {
            type: mongoose.Schema.Types.Mixed, // The raw unparsed JSON payload
            required: true,
        },
        receivedAt: {
            type: Date,
            default: Date.now,
        },
        processedAt: {
            type: Date,
            default: null,
        },
        processingStatus: {
            type: String,
            enum: ["PENDING", "PROCESSED", "FAILED", "IGNORED"], // Ignored for events we don't care about
            default: "PENDING",
        },
        retryCount: {
            type: Number,
            default: 0,
        },
        lastError: {
            type: String,
            default: null,
        }
    },
    {
        timestamps: true,
    }
);

// Redact sensitive payload data before saving
webhookEventSchema.pre("save", function() {
    if (this.isModified("payload") && this.payload) {
        const redact = (obj) => {
            if (!obj || typeof obj !== 'object') return;
            const sensitiveKeys = ["vpa", "card_id", "card", "billing_address"];
            for (const key in obj) {
                if (typeof obj[key] === 'object') {
                    redact(obj[key]);
                } else if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
                    obj[key] = "[REDACTED]";
                }
            }
        };
        // Deep clone payload to avoid modifying the original request object reference
        const safePayload = JSON.parse(JSON.stringify(this.payload));
        redact(safePayload);
        this.payload = safePayload;
    }
});

// Deduplication index
webhookEventSchema.index({ provider: 1, providerEventId: 1 }, { unique: true });

export default mongoose.models.WebhookEvent || mongoose.model("WebhookEvent", webhookEventSchema);
