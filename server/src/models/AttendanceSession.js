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
import { v4 as uuidv4 } from "uuid";

/**
 * AttendanceSession — one per lecture per classroom.
 * Faculty starts it, students mark attendance using code + GPS.
 */
const attendanceSessionSchema = new mongoose.Schema(
    {
    organization_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true
    },
        classroom: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Classroom",
            required: true,
        },
        faculty: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        codeHash: {
            type: String,
            default: null, // bcrypt hash of the attendance code (null for manual sessions)
        },

        // ── Session window ───────────────────────────────────────
        startsAt: {
            type: Date,
            default: Date.now,
        },
        expiresAt: {
            type: Date,
            default: null, // null for manual sessions
        },
        // Teacher-selected duration in seconds (default 90s for live, 0 for manual)
        durationSeconds: {
            type: Number,
            default: 90,
            min: 0,
            max: 600,
        },

        // ── Single-use session token (returned to frontend) ──────
        // Prevents raw API attacks — mark must supply this token
        sessionToken: {
            type: String,
            default: () => uuidv4(),
        },

        // ── Teacher GPS anchor ───────────────────────────────────
        teacherLat: {
            type: Number,
            default: null,
        },
        teacherLng: {
            type: Number,
            default: null,
        },

        // ── Configurable radius (default 25m, test in real classroom first) ──
        radiusMeters: {
            type: Number,
            default: 25,
        },

        status: {
            type: String,
            enum: ["active", "expired", "completed"],
            default: "active",
        },
        mode: {
            type: String,
            enum: ["live", "manual"],
            default: "live",
        },
        presentCount: {
            type: Number,
            default: 0,
        },

        // ── Source metadata (for auto-attendance from Zoom, etc.) ──
        meta: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
            // Shape: { zoomMeetingId, source: 'zoom_auto'|'manual', topic }
        },
    },
    { timestamps: true }
);

// Fast lookup: active sessions for a classroom
attendanceSessionSchema.index({ classroom: 1, status: 1 });
attendanceSessionSchema.index({ classroom: 1, createdAt: -1 });
// expireStale() queries: { classroom, status, expiresAt }
attendanceSessionSchema.index({ classroom: 1, status: 1, expiresAt: 1 });
// Token lookup for mark validation
attendanceSessionSchema.index({ sessionToken: 1 }, { sparse: true });

export default mongoose.models.AttendanceSession ||
    mongoose.model("AttendanceSession", attendanceSessionSchema);
