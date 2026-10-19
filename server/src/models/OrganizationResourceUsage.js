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

const organizationResourceUsageSchema = new mongoose.Schema(
    {
        orgId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            index: true,
        },
        provider: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            index: true,
        },
        providerLabel: {
            type: String,
            required: true,
            trim: true,
        },
        resourceType: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        metricKey: {
            type: String,
            required: true,
            trim: true,
        },
        metricLabel: {
            type: String,
            required: true,
            trim: true,
        },
        usageAmount: {
            type: Number,
            default: null,
        },
        unit: {
            type: String,
            default: "count",
            trim: true,
        },
        costAmount: {
            type: Number,
            default: null,
        },
        currency: {
            type: String,
            default: "INR",
            trim: true,
            uppercase: true,
        },
        quality: {
            type: String,
            enum: ["actual", "partial", "estimated", "manual", "unavailable"],
            default: "actual",
        },
        source: {
            type: String,
            required: true,
            trim: true,
        },
        periodStart: {
            type: Date,
            default: null,
            index: true,
        },
        periodEnd: {
            type: Date,
            default: null,
        },
        lastSyncedAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
        metadata: {
            type: Map,
            of: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
    }
);

organizationResourceUsageSchema.index({ orgId: 1, provider: 1, metricKey: 1, periodStart: 1 });

export default mongoose.models.OrganizationResourceUsage ||
    mongoose.model("OrganizationResourceUsage", organizationResourceUsageSchema);
