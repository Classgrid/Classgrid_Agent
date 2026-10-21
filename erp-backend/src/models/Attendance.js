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

// ══════════════════════════════════════════════════════════════════════════════
// MASTER ATTENDANCE REGISTER — Highly Optimized Schema
// DO NOT create individual documents per student! This schema stores the entire
// class roster for a single day/session in one document to prevent DB bloat.
// ══════════════════════════════════════════════════════════════════════════════

const attendanceSchema = new mongoose.Schema(
    {
        organization_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        // Target 4x2 DNA node (e.g. Division A, Semester 3, or Morning Batch)
        hierarchy_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AcademicHierarchy",
            required: true,
        },
        // The faculty member who submitted this register
        faculty_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        // Optional subject link if this is subject-wise attendance (college)
        // If null, it assumes day-wise attendance (school)
        subject_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "OrgSubject",
            default: null,
        },
        date: {
            type: Date,
            required: true,
        },
        // Indicates if this was a half-day or full-day (mostly for schools)
        session_type: {
            type: String,
            enum: ["full_day", "morning", "afternoon", "lecture"],
            default: "full_day",
        },
        // The core array holding 60+ students. Drastically reduces document count.
        student_records: [
            {
                student_id: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                    required: true,
                },
                status: {
                    type: String,
                    enum: ["present", "absent", "leave", "late"],
                    required: true,
                },
                // Optional remarks (e.g. "Arrived 20 mins late")
                remarks: {
                    type: String,
                    default: "",
                    trim: true,
                    maxlength: 200,
                }
            }
        ],
        // Pre-computed stats for ultra-fast dashboard queries
        stats: {
            total: { type: Number, default: 0 },
            present: { type: Number, default: 0 },
            absent: { type: Number, default: 0 },
            leave: { type: Number, default: 0 },
            late: { type: Number, default: 0 }
        }
    },
    {
        timestamps: true,
    }
);

// Ultra-fast querying for the Daily Attendance Dashboards
// Prevents duplicate registers for the same class on the same day/session
attendanceSchema.index(
    { organization_id: 1, hierarchy_id: 1, date: 1, session_type: 1, subject_id: 1 }, 
    { unique: true }
);

// Fast lookups by faculty to view their submitted registers
attendanceSchema.index({ faculty_id: 1, date: -1 });

// Note: To find a specific student's attendance history, we query:
// { "student_records.student_id": studentId }
attendanceSchema.index({ "student_records.student_id": 1, date: -1 });

export default mongoose.model("Attendance", attendanceSchema);
