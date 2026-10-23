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
 * AttendanceRecord — one per student per session.
 * Only stores PRESENT records. Absence = total sessions - present count.
 * status "present_suspicious" = marked but flagged for review.
 */
const attendanceRecordSchema = new mongoose.Schema(
    {
    organization_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true
    },
        session: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AttendanceSession",
            required: true,
        },
        classroom: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Classroom",
            required: true,
        },
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        markedAt: {
            type: Date,
            default: Date.now,
        },

        // ── Attendance validity status ───────────────────────────
        // present          → clean mark, no flags
        // present_suspicious → flagged (paste, fast typing, GPS mismatch)
        status: {
            type: String,
            enum: ["present", "present_suspicious"],
            default: "present",
        },

        // ── Student GPS at time of marking ───────────────────────
        studentLat: {
            type: Number,
            default: null,
        },
        studentLng: {
            type: Number,
            default: null,
        },
        // Calculated Haversine distance from teacher's GPS (meters)
        distanceMeters: {
            type: Number,
            default: null,
        },

        // ── Fraud signals ────────────────────────────────────────
        // Whether frontend reported a paste event on the code field
        pasteDetected: {
            type: Boolean,
            default: false,
        },
        // Time (ms) from first keypress to submit — short = suspicious
        typingDurationMs: {
            type: Number,
            default: null,
        },

        // ── Device binding ───────────────────────────────────────
        // SHA-256 of userAgent + IP (matches trustedDevices fingerprint)
        deviceFingerprint: {
            type: String,
            default: null,
        },
        
        // Raw IP Address recorded during mark
        ipAddress: {
            type: String,
            default: null,
        },

        // ── Suspicious reason(s) for audit clarity ───────────────
        // e.g. ["paste_detected", "typing_too_fast", "gps_far"]
        suspicionReasons: {
            type: [String],
            default: [],
        },
    },
    { timestamps: true }
);

// One mark per student per session (anti-cheat, DB-enforced)
attendanceRecordSchema.index({ session: 1, student: 1 }, { unique: true });

// Fast student attendance lookups
attendanceRecordSchema.index({ student: 1, classroom: 1 });
attendanceRecordSchema.index({ classroom: 1, session: 1 });

// Suspicious records lookup for faculty review
attendanceRecordSchema.index({ classroom: 1, status: 1 });

export default mongoose.models.AttendanceRecord ||
    mongoose.model("AttendanceRecord", attendanceRecordSchema);
