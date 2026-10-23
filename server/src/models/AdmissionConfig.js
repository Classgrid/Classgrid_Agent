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

const admissionConfigSchema = new mongoose.Schema(
    {
        organization_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            unique: true,
        },
        // Strategy: "cet_engineering", "merit_based", "fcfs" (First Come First Serve), "rla"
        strategy_type: {
            type: String,
            required: true,
            enum: ["cet_engineering", "merit_based", "fcfs", "rla", "manual"],
        },
        // ── Form Engine Configuration ──────────────────────────────────────────
        // Defines the deep structure of the admission application form.
        application_config: {
            personal_details: { type: Boolean, default: true },
            parent_details: { type: Boolean, default: true },
            address_details: { type: Boolean, default: true },
            academic_history: { type: Boolean, default: true },
            allow_edits_until: { type: String, default: "verified" }, // Form locks after this stage
        },

        // Dynamic, generic field engine definitions.
        custom_fields: [{
            field_id: { type: String, required: true },
            label: { type: String, required: true },
            type: { type: String, enum: ["text", "number", "select", "file", "phone", "email", "date"], required: true },
            is_required: { type: Boolean, default: false },
            options: [String], // for select types
            validation_regex: String,
            category: { type: String, enum: ["personal", "academic", "document", "other"], default: "other" }
        }],

        // ── Workflow Engine Configuration ──────────────────────────────────────
        // The ordered list of stages a candidate goes through.
        workflow_stages: {
            type: [String],
            default: ["applied", "under_verification", "waitlisted", "fee_pending", "enrolled"]
        },

        // Stage 1: Document Verification Config
        verification_config: {
            requires_admin_approval: { type: Boolean, default: true },
            allow_reupload_on_rejection: { type: Boolean, default: true },
            auto_verify_digital_docs: { type: Boolean, default: false },
            required_documents: { type: [String], default: ["photo", "lc", "marksheet"] }
        },

        // Stage 2: Merit & Selection Config
        merit_config: {
            merit_list_mode: { type: String, enum: ["category_wise", "combined"], default: "combined" },
            subject_computation_mode: { type: String, enum: ["best_of_5", "all_subjects"], default: "best_of_5" },
            best_of_5_mandatory_language: { type: Boolean, default: true },
            language_subjects: {
                type: [String],
                default: ["Marathi", "Hindi", "English", "Urdu", "Telugu", "Kannada", "First Language", "Second Language", "Third Language"]
            }
        },

        selection_config: {
            auto_promote_waitlist: { type: Boolean, default: false },
            waitlist_timeout_days: { type: Number, default: 3 }, // Days before waitlist offer lapses
        },

        // Stage 3: Fee Config
        fee_config: {
            fee_type: { type: String, enum: ["fixed", "category_based", "scholarship_adjusted"], default: "fixed" },
            base_fee_amount: { type: Number, default: 0 },
            allow_installments: { type: Boolean, default: false },
            payment_gateway: { type: String, enum: ["razorpay", "cash_only", "stripe"], default: "razorpay" }
        },

        // Stage 4: Enrollment Config
        enrollment_config: {
            auto_generate_prn: { type: Boolean, default: true },
            auto_create_user_account: { type: Boolean, default: true },
            division_allocation_mode: { type: String, enum: ["manual", "auto_alphabetical", "auto_merit"], default: "manual" },
        },
    },
    { timestamps: true }
);

export default mongoose.models.AdmissionConfig || mongoose.model("AdmissionConfig", admissionConfigSchema);
