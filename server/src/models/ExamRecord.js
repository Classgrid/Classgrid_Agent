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

const examRecordSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200,
        },

        classroom: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Classroom",
            required: true,
        },

        teacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        organization_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },

        examType: {
            type: String,
            enum: ["unit_test", "assignment", "midterm", "final", "practical", "other"],
            default: "other",
        },

        // Anti-Cheat: Question Pooling Configuration
        isQuestionBankEnabled: {
            type: Boolean,
            default: false
        },

        // Multi-subject support: expanded for sections, timing, and pooling
        subjects: [{
            subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "OrgSubject", default: null },
            subjectName: { type: String, required: true },
            maxMarks: { type: Number, required: true, min: 1 },
            
            // Pooling & Timing (Day 17.5 Additions)
            questionsToPick: { type: Number, default: 0 }, // If 0, use all questions in bank
            timeLimitMinutes: { type: Number, default: 0 }, // 0 = no time limit for this section
            
            // The Question Bank for this specific subject
            questionBank: [{
                questionId: { type: String }, // For tracking if needed
                questionText: { type: String, required: true },
                options: [String],
                correctAnswer: { type: String },
                explanation: { type: String },
                marks: { type: Number, default: 1 },
                difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" }
            }]
        }],

        // Total marks across all subjects (computed sum)
        totalMarks: {
            type: Number,
            required: true,
            min: 1,
        },

        passingMarks: {
            type: Number,
            default: 0,
        },

        // Uploaded file metadata
        uploadedFile: {
            originalName: { type: String, default: "" },
            uploadedAt: { type: Date, default: Date.now },
        },

        // Mapping stats from Excel processing
        mappingStats: {
            totalRows: { type: Number, default: 0 },
            matched: { type: Number, default: 0 },
            unmatched: { type: Number, default: 0 },
            skipped: { type: Number, default: 0 },
        },

        // Pre-computed analytics (updated on confirm + mark edits)
        analytics: {
            classAverage: { type: Number, default: 0 },
            classMedian: { type: Number, default: 0 },
            highest: { type: Number, default: 0 },
            lowest: { type: Number, default: 0 },
            passCount: { type: Number, default: 0 },
            failCount: { type: Number, default: 0 },
            passPercentage: { type: Number, default: 0 },
            standardDeviation: { type: Number, default: 0 },
            gradeDistribution: {
                A: { type: Number, default: 0 },
                B: { type: Number, default: 0 },
                C: { type: Number, default: 0 },
                D: { type: Number, default: 0 },
                F: { type: Number, default: 0 },
            },
        },

        status: {
            type: String,
            enum: ["draft", "verified", "published", "locked", "processing", "active", "archived"],
            default: "draft",
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for fast queries
examRecordSchema.index({ classroom: 1, createdAt: -1 });
examRecordSchema.index({ teacher: 1 });
examRecordSchema.index({ organization_id: 1 });
examRecordSchema.index({ classroom: 1, title: 1 }); // duplicate detection

export default mongoose.model("ExamRecord", examRecordSchema);
