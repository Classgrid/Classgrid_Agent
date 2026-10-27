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
 * CourseVideo.js
 * MODULE 23: YouTube Embedding & Course Library
 * 
 * Stores YouTube video metadata linked to classrooms/courses.
 * Supports playlists, watch-time tracking hooks, and AI transcript stubs.
 */
const courseVideoSchema = new mongoose.Schema(
    {
        organization_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            index: true,
        },
        classroom_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Classroom",
            required: true,
            index: true,
        },
        // Video Identity
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            default: "",
            maxlength: 2000,
        },
        video_source_type: {
            type: String,
            enum: ["youtube", "s3", "agora_recording"],
            default: "youtube",
        },
        youtube_url: {
            type: String,
            default: "",
        },
        youtube_id: {
            type: String, // Extracted from URL (e.g., "dQw4w9WgXcQ")
            default: "",
            index: true,
        },
        s3_video_url: {
            type: String, // Direct MP4 or HLS stream URL from S3
            default: "",
        },
        s3_object_key: {
            type: String, // For secure presigned URL generation or deletion
            default: "",
        },
        file_size_bytes: {
            type: Number,
            default: 0,
        },
        thumbnail_url: {
            type: String,
            default: "",
        },
        // Metadata
        duration_seconds: {
            type: Number, // Total video duration in seconds
            default: 0,
        },
        channel_name: {
            type: String,
            default: "",
        },
        // Organization
        playlist_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CoursePlaylist",
            default: null,
        },
        sort_order: {
            type: Number, // Position within playlist
            default: 0,
        },
        chapter: {
            type: String, // e.g., "Unit 1: Thermodynamics"
            default: "",
        },
        // Access Control
        is_mandatory: {
            type: Boolean,
            default: false,
        },
        unlock_after: {
            type: mongoose.Schema.Types.ObjectId, // Must complete this video first
            ref: "CourseVideo",
            default: null,
        },
        // AI Features
        transcript: {
            type: String,  // Full text transcript (populated by AI service)
            default: "",
        },
        ai_summary: {
            type: String,  // AI-generated summary
            default: "",
        },
        // Upload metadata
        added_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        // Analytics (denormalized for speed)
        total_views: {
            type: Number,
            default: 0,
        },
        avg_completion_rate: {
            type: Number, // 0-100
            default: 0,
        },
    },
    { timestamps: true }
);

// Compound: One video per YouTube ID per classroom
courseVideoSchema.index({ classroom_id: 1, youtube_id: 1 }, { unique: true });
courseVideoSchema.index({ organization_id: 1, playlist_id: 1, sort_order: 1 });

export default mongoose.models.CourseVideo || mongoose.model("CourseVideo", courseVideoSchema);
