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

const studentMarkSchema = new mongoose.Schema(
    {
        examRecord: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ExamRecord",
            required: true,
        },

        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

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

        // Snapshot of PRN used during matching (for audit trail)
        prn: {
            type: String,
            default: "",
        },

        // Exam seat number is per exam/result, not a global student field
        seatNo: {
            type: String,
            default: "",
            trim: true,
        },

        // Per-subject marks breakdown
        subjectMarks: [{
            subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "OrgSubject", default: null },
            subjectName: { type: String, required: true },
            marksObtained: { type: Number, required: true, min: 0 },
            maxMarks: { type: Number, required: true, min: 1 },
            courseCredit: { type: Number, default: 0, min: 0 },
            creditEarned: { type: Number, default: 0, min: 0 },
            gradePoint: { type: Number, default: null },
            isBacklog: { type: Boolean, default: false },
            passedInReExam: { type: Boolean, default: false },
            ordinance: { type: String, default: "" },
        }],

        // Total marks obtained (sum of all subjectMarks.marksObtained)
        marksObtained: {
            type: Number,
            required: true,
            min: 0,
        },

        // Total max marks (sum of all subjectMarks.maxMarks)
        totalMarks: {
            type: Number,
            required: true,
            min: 1,
        },

        percentage: {
            type: Number,
            default: 0,
        },

        grade: {
            type: String,
            default: "F",
        },

        cgpa: {
            type: Number,
            default: null,
        },

        totalCredits: {
            type: Number,
            default: null,
        },

        totalCreditEarned: {
            type: Number,
            default: null,
        },

        totalCreditIntoGradePoint: {
            type: Number,
            default: null,
        },

        rank: {
            type: Number,
            default: 0,
        },

        isPassed: {
            type: Boolean,
            default: false,
        },

        remarks: {
            type: String,
            default: "",
            maxlength: 500,
        },

        version: {
            type: Number,
            default: 1,
        },

        history: [{
            _id: false,
            updatedAt: { type: Date, default: Date.now },
            updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            subjectMarks: Array,
            marksObtained: Number,
            percentage: Number,
            grade: String,
            cgpa: Number,
            seatNo: String,
            totalCredits: Number,
            totalCreditEarned: Number,
            totalCreditIntoGradePoint: Number,
            isPassed: Boolean
        }],
    },
    {
        timestamps: true,
    }
);

// Unique: one mark per student per exam (prevents duplicates)
studentMarkSchema.index({ examRecord: 1, student: 1 }, { unique: true });

// Fast queries for student dashboard
studentMarkSchema.index({ student: 1, createdAt: -1 });

// Fast queries for classroom analytics
studentMarkSchema.index({ classroom: 1, examRecord: 1 });

// Org isolation
studentMarkSchema.index({ organization_id: 1 });

export default mongoose.model("StudentMark", studentMarkSchema);
