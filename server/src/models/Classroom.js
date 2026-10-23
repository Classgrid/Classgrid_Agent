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
import crypto from "crypto";

const classroomSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },

        description: {
            type: String,
            default: "",
            maxlength: 500,
        },

        subject: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },

        // Unique class code for students to join (e.g., "CHEM-A3X9")
        classCode: {
            type: String,
            uppercase: true,
        },

        // Owner teacher
        teacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        // Organization Isolation
        organization_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            index: true,
        },

        // ── ERP STRUCTURED FIELDS (Added during Upgrade) ──
        course_type: {
            type: String,
            enum: ['SCHOOL', 'COLLEGE', 'JUNIOR_COLLEGE', 'ENGINEERING', 'COACHING', 'DIPLOMA'],
            default: 'COLLEGE',
        },
        academic_year: { type: String }, // e.g., 2025-2026
        term: { type: String }, // e.g., Term 2 / after Diwali
        stream: { type: String }, // Junior college: Science, Commerce, Arts
        year: { type: String },
        branch: { type: String },
        semester: { type: Number },
        standard: { type: String },
        division: { type: String }, // e.g., 'A', 'B'
        division_id: { type: String }, // Supabase UUID
        sub_batch: { type: String }, // e.g., J2 under Division J
        sub_batch_id: { type: String },
        subject_id: { type: String }, // Supabase course_subjects UUID
        class_teacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        assistant_teacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        mentor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        is_entrance_batch: {
            type: Boolean,
            default: false,
        },
        entrance_exam: { type: String }, // JEE, NEET, MHT_CET, etc.
        entrance_course: { type: String },

        // Cover image / banner
        coverImage: {
            type: String,
            default: "",
        },

        // Settings
        settings: {
            allowJoinRequests: {
                type: Boolean,
                default: true,
            },
            isArchived: {
                type: Boolean,
                default: false,
            },
        },

        // Cached counts for fast reads
        memberCount: {
            type: Number,
            default: 0,
        },

        // Supabase subject_slug mapping (for backward compatibility)
        subjectSlug: {
            type: String,
        },

        // 📧 Email cooldown tracking (serverless-safe)
        lastEmailSentAt: { type: Date, default: null },
        lastEmailType: { type: String, default: null },
    },
    {
        timestamps: true,
    }
);

// Auto-generate class code before saving
classroomSchema.pre("save", function () {
    if (!this.classCode) {
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const numbers = "0123456789";
        let code = "";

        for (let i = 0; i < 4; i++) {
            code += letters[Math.floor(Math.random() * letters.length)];
        }

        for (let i = 0; i < 6; i++) {
            code += numbers[Math.floor(Math.random() * numbers.length)];
        }

        this.classCode = code;
    }
});

// Indexes for scalability
classroomSchema.index({ teacher: 1, createdAt: -1 });
classroomSchema.index({ classCode: 1 }, { unique: true });
classroomSchema.index({ subjectSlug: 1 });
classroomSchema.index({ organization_id: 1, course_type: 1, academic_year: 1 });
classroomSchema.index({ organization_id: 1, stream: 1, standard: 1, division: 1, sub_batch: 1 });

export default mongoose.model("Classroom", classroomSchema);
