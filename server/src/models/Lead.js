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
 * Lead — Coaching Center Mini-CRM Pipeline
 * 
 * Tracks the journey of a potential student from initial inquiry
 * to paid enrollment. Designed specifically for coaching centers
 * where conversion tracking and follow-up reminders are critical.
 * 
 * Pipeline: inquiry → contacted → demo_given → converted → enrolled → dropped
 */
const leadSchema = new mongoose.Schema(
    {
        organization_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },

        // ── Lead Info ────────────────────────────────────────────
        student_name: { type: String, required: true, trim: true },
        parent_name: { type: String, default: "", trim: true },
        phone: { type: String, required: true, trim: true },
        alternate_phone: { type: String, default: "" },
        email: { type: String, default: "", lowercase: true, trim: true },

        // ── Pipeline Stage ───────────────────────────────────────
        stage: {
            type: String,
            enum: ["inquiry", "contacted", "demo_given", "follow_up", "converted", "enrolled", "dropped", "not_interested"],
            default: "inquiry",
        },

        // ── Source Tracking ──────────────────────────────────────
        source: {
            type: String,
            enum: ["walk_in", "phone_call", "website", "referral", "social_media", "newspaper", "other"],
            default: "walk_in",
        },
        referred_by: { type: String, default: "" },

        // ── Interest Details ─────────────────────────────────────
        interested_course: { type: String, default: "" },   // e.g., "JEE Advanced", "NEET Dropper"
        interested_batch: { type: String, default: "" },     // e.g., "Morning Batch", "Weekend"
        current_class: { type: String, default: "" },        // e.g., "12th", "Dropper"

        // ── Follow-Up Management ─────────────────────────────────
        next_follow_up: { type: Date, default: null },
        follow_up_notes: [{
            note: String,
            by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            date: { type: Date, default: Date.now },
        }],

        // ── Conversion Tracking ──────────────────────────────────
        converted_at: { type: Date, default: null },
        converted_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        admission_application_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AdmissionApplication",
            default: null,
        },
        fee_amount_quoted: { type: Number, default: 0 },
        fee_amount_paid: { type: Number, default: 0 },

        // ── Assignment ───────────────────────────────────────────
        assigned_to: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,  // The counselor/receptionist handling this lead
        },

        // ── Metadata ─────────────────────────────────────────────
        tags: [{ type: String }],  // e.g., ["urgent", "scholarship_candidate", "sibling"]
        is_deleted: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// Indexes for fast dashboard queries
leadSchema.index({ organization_id: 1, stage: 1 });
leadSchema.index({ organization_id: 1, next_follow_up: 1 });
leadSchema.index({ organization_id: 1, assigned_to: 1 });
leadSchema.index({ phone: 1, organization_id: 1 });

export default mongoose.models.Lead || mongoose.model("Lead", leadSchema);
