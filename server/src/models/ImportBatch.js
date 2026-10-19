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
 * ImportBatch — Tracks every bulk import operation for rollback capability.
 * 
 * When an admin uploads an Excel/CSV of students or faculty, a batch record
 * is created. All User documents created from that import are tagged with
 * the batch_id. This enables:
 *   1. "Undo Import" — delete all records from a specific batch
 *   2. "View Import History" — see what was imported and when
 *   3. "Dry Run" — preview import results before committing
 */
const importBatchSchema = new mongoose.Schema(
    {
        organization_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        imported_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        // What type of data was imported
        import_type: {
            type: String,
            enum: ["students", "faculty", "cet_allotments", "fee_structure", "academic_hierarchy"],
            required: true,
        },
        // Original filename uploaded
        source_filename: {
            type: String,
            default: "",
        },
        // Import execution status
        status: {
            type: String,
            enum: ["dry_run", "committed", "rolled_back", "partial"],
            default: "committed",
        },
        // Counts
        total_rows: { type: Number, default: 0 },
        success_count: { type: Number, default: 0 },
        failed_count: { type: Number, default: 0 },
        duplicate_count: { type: Number, default: 0 },

        // IDs of all records created by this import (for rollback)
        created_record_ids: [{
            type: mongoose.Schema.Types.ObjectId,
        }],

        // Failed rows stored for error CSV download
        failed_rows: [{
            row_number: Number,
            data: mongoose.Schema.Types.Mixed,
            error: String,
        }],

        // Duplicate detections
        duplicate_rows: [{
            row_number: Number,
            data: mongoose.Schema.Types.Mixed,
            existing_record_id: mongoose.Schema.Types.ObjectId,
            conflict_field: String, // e.g., "email", "phone", "prn"
        }],

        // Rollback metadata
        rolled_back_at: { type: Date, default: null },
        rolled_back_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    { timestamps: true }
);

importBatchSchema.index({ organization_id: 1, createdAt: -1 });
importBatchSchema.index({ status: 1 });

export default mongoose.models.ImportBatch ||
    mongoose.model("ImportBatch", importBatchSchema);
