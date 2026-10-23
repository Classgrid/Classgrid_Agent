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

/**
 * AcademicHierarchy — The universal academic node model.
 * 
 * Replaces the old flat "branches" / "batches" arrays on Organization.
 * Every level in the hierarchy is a node in this collection,
 * linked via parent_id to form a tree.
 * 
 * Examples by structure_type:
 * 
 * Engineering (Plan 1):
 *   Degree("B.Tech") → Department("Computer") → Year("FY") → Semester("Sem 1") → Division("A") → SubBatch("A1")
 * 
 * School with Divisions (Plan 2):
 *   Standard("Class 10") → Division("A")
 * 
 * School without Divisions (Plan 3):
 *   Standard("Class 10") → Division("Default")  [auto-created, hidden in UI]
 * 
 * Coaching (Plan 4):
 *   Course("JEE Advanced") → Batch("Morning Batch")
 * 
 * Junior College (Plan 5):
 *   Stream("Science") → Standard("11th") → Division("A")
 * 
 * Diploma (Plan 6):
 *   Department("Mechanical") → Year("FY") → Semester("Sem 1")
 * 
 * Custom (Plan 7):
 *   Group("Level 1") → SubGroup("Group A")
 */

const academicHierarchySchema = new mongoose.Schema(
    {
        organization_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            index: true,
        },

        // The type of this node in the hierarchy tree
        level_type: {
            type: String,
            enum: [
                "degree",       // Engineering: B.Tech, M.Tech
                "department",   // Engineering/Diploma: Computer, IT, Mechanical
                "year",         // FY, SY, TY, Final Year
                "semester",     // Sem 1, Sem 2, ... Sem 8
                "division",     // A, B, C, D
                "sub_batch",    // A1, A2 (lab splitting under a division)
                "standard",     // School/Jr College: Class 1, Class 10, 11th, 12th
                "stream",       // Jr College: Science, Commerce, Arts
                "course",       // Coaching: JEE Advanced, NEET, MHT-CET
                "batch",        // Coaching: Morning, Evening, Weekend
                "group",        // Custom: any grouping
                "sub_group",    // Custom: nested grouping
            ],
            required: true,
        },

        // Display name: "Computer Engineering", "Division A", "Sem 1", etc.
        name: {
            type: String,
            required: true,
            trim: true,
        },

        // Short code for timetables, reports: "CE", "A", "S1"
        code: {
            type: String,
            trim: true,
            default: "",
        },

        // Parent node — null means this is a root node (top of the tree)
        parent_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AcademicHierarchy",
            default: null,
            index: true,
        },

        // Ordering within siblings (for display sorting)
        sort_order: {
            type: Number,
            default: 0,
        },

        // For sub_batch nodes: marks this as a lab/practical splitting node
        is_sub_batch: {
            type: Boolean,
            default: false,
        },

        // Sub-batch capacity (how many students per lab batch)
        sub_batch_capacity: {
            type: Number,
            default: null,
        },

        // Whether this node is active (soft-delete support)
        is_active: {
            type: Boolean,
            default: true,
        },

        // Academic year association (for year/semester nodes)
        academic_year: {
            type: String,
            default: null,  // e.g. "2025-26"
        },

        // Metadata: number of students currently in this node (denormalized for dashboards)
        student_count: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Compound indexes for fast hierarchy traversal
academicHierarchySchema.index({ organization_id: 1, level_type: 1 });
academicHierarchySchema.index({ organization_id: 1, parent_id: 1 });
// Prevent duplicate names at the same level under the same parent
academicHierarchySchema.index(
    { organization_id: 1, parent_id: 1, name: 1 },
    { unique: true }
);

export default mongoose.models.AcademicHierarchy ||
    mongoose.model("AcademicHierarchy", academicHierarchySchema);
