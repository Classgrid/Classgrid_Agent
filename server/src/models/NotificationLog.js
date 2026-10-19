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

const notificationLogSchema = new mongoose.Schema(
    {
        organizationId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: "Organization",
            required: false // AI email deliveries may not belong to an organization
        },
        userId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: "User",
            required: false // May be null if sent to a parent/guest without a formal user ID
        },
        templateId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: "NotificationTemplate"
        },
        type: { 
            type: String, 
            enum: ["EMAIL", "SMS"], 
            required: true 
        },
        recipient: { 
            type: String, 
            required: true 
        },
        status: { 
            type: String, 
            enum: ["PENDING", "SENT", "DELIVERED", "FAILED", "BOUNCED", "COMPLAINED"],
            default: "PENDING"
        },
        providerMessageId: { 
            type: String 
        },
        failureReason: { 
            type: String 
        },
        metadata: { 
            type: mongoose.Schema.Types.Mixed 
        },
        idempotencyKey: {
            type: String,
            unique: true,
            sparse: true
        },
        retryCount: {
            type: Number,
            default: 0
        }
    },
    { timestamps: true }
);

// Indexes for fast querying in the super admin dashboard
notificationLogSchema.index({ organizationId: 1, createdAt: -1 });
notificationLogSchema.index({ status: 1 });
notificationLogSchema.index({ recipient: 1 });

const NotificationLog = mongoose.model("NotificationLog", notificationLogSchema);

export default NotificationLog;
