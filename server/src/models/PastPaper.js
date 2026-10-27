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

/**
 * PastPaper — Stores extracted question papers with year/subject metadata.
 * Used by the AI Past Paper Analysis Engine for multi-year pattern detection.
 * 
 * Flow: Image Upload → Cloudflare Vision OCR → Questions extracted → Stored here
 *       → Analysis engine queries across years → Repeated questions, topic frequency
 */
const pastPaperSchema = new mongoose.Schema(
    {
        // Which classroom/org this paper belongs to
        classroom: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Classroom",
            required: true,
        },
        organization_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        // Paper metadata
        title: { type: String, required: true, trim: true },
        subject: { type: String, required: true, trim: true, lowercase: true },
        examType: {
            type: String,
            enum: ["unit_test", "midterm", "final", "practical", "board", "university", "competitive", "other"],
            default: "university",
        },
        year: { type: Number, required: true },   // e.g. 2024, 2023, 2022
        month: { type: String, default: "" },       // e.g. "May", "December"
        semester: { type: Number, default: null },
        branch: { type: String, default: "" },
        university: { type: String, default: "" },  // e.g. "SPPU", "Mumbai University"

        // Extracted questions from Cloudflare Vision OCR
        questions: [{
            questionText: { type: String, required: true },
            // Normalized version for similarity matching (lowercase, no whitespace)
            normalizedText: { type: String, default: "" },
            options: [String],
            correctAnswer: { type: String, default: "" },
            marks: { type: Number, default: 0 },
            topic: { type: String, default: "" },         // AI-detected topic
            difficulty: { type: String, enum: ["easy", "medium", "hard", "unknown"], default: "unknown" },
            questionType: { type: String, enum: ["mcq", "short", "long", "numerical", "diagram", "other"], default: "other" },
        }],

        totalQuestions: { type: Number, default: 0 },
        totalMarks: { type: Number, default: 0 },

        // Source file info
        sourceFile: {
            originalName: { type: String, default: "" },
            fileUrl: { type: String, default: "" },       // Supabase storage URL
            mimeType: { type: String, default: "" },
        },

        // Processing status
        status: {
            type: String,
            enum: ["processing", "extracted", "analyzed", "failed"],
            default: "processing",
        },

        // AI-generated analysis (cached)
        analysis: {
            topTopics: [{ topic: String, count: Number, percentage: Number }],
            difficultyDistribution: {
                easy: { type: Number, default: 0 },
                medium: { type: Number, default: 0 },
                hard: { type: Number, default: 0 },
            },
            questionTypeDistribution: {
                mcq: { type: Number, default: 0 },
                short: { type: Number, default: 0 },
                long: { type: Number, default: 0 },
                numerical: { type: Number, default: 0 },
            },
        },
    },
    { timestamps: true }
);

// Fast lookups by classroom + subject + year (multi-year analysis)
pastPaperSchema.index({ classroom: 1, subject: 1, year: -1 });
pastPaperSchema.index({ organization_id: 1, subject: 1, year: -1 });
// Text index for question similarity search
pastPaperSchema.index({ "questions.normalizedText": 1 });

export default mongoose.model("PastPaper", pastPaperSchema);
