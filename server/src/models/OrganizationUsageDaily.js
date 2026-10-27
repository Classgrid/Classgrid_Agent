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

const usageLineItemSchema = new mongoose.Schema(
    {
        provider: {
            type: String,
            enum: ["cloudflare_r2", "supabase_storage", "aws_ses", "firebase_sms", "mongodb", "redis", "vercel", "ec2", "openai", "groq", "agora"],
            required: true,
            index: true,
        },
        resourceKey: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        resourceLabel: {
            type: String,
            required: true,
            trim: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: 0,
        },
        unit: {
            type: String,
            enum: ["gb_day", "email", "sms", "request", "token", "student", "minute", "byte", "count"],
            required: true,
        },
        unitRateInr: {
            type: Number,
            default: 0,
            min: 0,
        },
        amountInr: {
            type: Number,
            default: 0,
            min: 0,
        },
        rawQuantity: {
            type: Number,
            default: 0,
            min: 0,
        },
        rawUnit: {
            type: String,
            default: "",
            trim: true,
        },
        source: {
            type: String,
            required: true,
            trim: true,
        },
        sourceQuality: {
            type: String,
            enum: ["actual", "partial", "estimated", "unavailable"],
            default: "actual",
        },
        metadata: {
            type: Map,
            of: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    { _id: false }
);

const organizationUsageDailySchema = new mongoose.Schema(
    {
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            index: true,
        },
        orgSubscriptionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "OrgSubscription",
            default: null,
        },
        day: {
            type: Date,
            required: true,
            index: true,
        },
        periodStart: {
            type: Date,
            required: true,
        },
        periodEnd: {
            type: Date,
            required: true,
        },
        timezone: {
            type: String,
            default: "Asia/Kolkata",
            trim: true,
        },
        currency: {
            type: String,
            default: "INR",
            uppercase: true,
            trim: true,
        },
        lineItems: {
            type: [usageLineItemSchema],
            default: [],
            validate: {
                validator(items) {
                    return items.length > 0;
                },
                message: "OrganizationUsageDaily requires at least one usage line item.",
            },
        },
        totals: {
            storageGbDays: { type: Number, default: 0, min: 0 },
            emails: { type: Number, default: 0, min: 0 },
            sms: { type: Number, default: 0, min: 0 },
            amountInr: { type: Number, default: 0, min: 0 },
        },
        rateSnapshot: {
            pricePerGB: { type: Number, default: 0, min: 0 },
            pricePerEmail: { type: Number, default: 0, min: 0 },
            pricePerSms: { type: Number, default: 0, min: 0 },
        },
        calculationStatus: {
            type: String,
            enum: ["complete", "partial", "failed"],
            default: "complete",
            index: true,
        },
        calculationErrors: {
            type: [String],
            default: [],
        },
        calculationHash: {
            type: String,
            required: true,
            index: true,
        },
        calculatedAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
    },
    { timestamps: true }
);

organizationUsageDailySchema.index({ organizationId: 1, day: 1 }, { unique: true });
organizationUsageDailySchema.index({ day: -1, calculationStatus: 1 });

function immutableLedgerError() {
    return new Error("OrganizationUsageDaily is an immutable billing ledger. Insert correction records in a future ledger model instead of updating or deleting this record.");
}

organizationUsageDailySchema.pre(["updateOne", "updateMany", "findOneAndUpdate", "replaceOne"], function blockUpdates(next) {
    next(immutableLedgerError());
});

organizationUsageDailySchema.pre(["deleteOne", "deleteMany", "findOneAndDelete"], function blockDeletes(next) {
    next(immutableLedgerError());
});

export default mongoose.models.OrganizationUsageDaily ||
    mongoose.model("OrganizationUsageDaily", organizationUsageDailySchema);
