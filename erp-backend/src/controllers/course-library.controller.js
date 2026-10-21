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

import CourseVideo from "../models/CourseVideo.js";
import CoursePlaylist from "../models/CoursePlaylist.js";
import VideoProgress from "../models/VideoProgress.js";

/**
 * course-library.controller.js
 * MODULE 23: YouTube Course Library — Full CRUD + Analytics
 */

// ─── YouTube ID Extractor ───────────────────────────────────────────
function extractYouTubeId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
        /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

// ═══════════════════════════════════════════════════════════════════
// PLAYLIST CRUD
// ═══════════════════════════════════════════════════════════════════

/** POST /api/course-library/playlists */
export const createPlaylist = async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const { classroom_id, title, description } = req.body;

        if (!classroom_id || !title) {
            return res.status(400).json({ error: "classroom_id and title are required." });
        }

        // Auto-increment sort_order
        const lastPlaylist = await CoursePlaylist.findOne({ classroom_id })
            .sort({ sort_order: -1 }).select("sort_order").lean();

        const playlist = await CoursePlaylist.create({
            organization_id: orgId,
            classroom_id,
            title,
            description: description || "",
            sort_order: (lastPlaylist?.sort_order || 0) + 1,
            created_by: req.user._id,
        });

        res.status(201).json({ success: true, playlist });
    } catch (err) {
        res.status(500).json({ error: "Failed to create playlist", details: err.message });
    }
};

/** GET /api/course-library/playlists/:classroomId */
export const getPlaylists = async (req, res) => {
    try {
        const { classroomId } = req.params;

        const playlists = await CoursePlaylist.find({ classroom_id: classroomId })
            .sort({ sort_order: 1 })
            .lean();

        // Attach video count per playlist
        const playlistIds = playlists.map(p => p._id);
        const videoCounts = await CourseVideo.aggregate([
            { $match: { playlist_id: { $in: playlistIds } } },
            { $group: { _id: "$playlist_id", count: { $sum: 1 } } }
        ]);

        const countMap = {};
        videoCounts.forEach(v => { countMap[v._id.toString()] = v.count; });

        const enriched = playlists.map(p => ({
            ...p,
            videoCount: countMap[p._id.toString()] || 0
        }));

        res.json({ success: true, playlists: enriched });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch playlists", details: err.message });
    }
};

/** PUT /api/course-library/playlists/:id */
export const updatePlaylist = async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const { id } = req.params;
        const { title, description, is_published, sort_order } = req.body;

        const playlist = await CoursePlaylist.findOneAndUpdate(
            { _id: id, organization_id: orgId },
            { $set: { title, description, is_published, sort_order } },
            { returnDocument: 'after', runValidators: true }
        );

        if (!playlist) return res.status(404).json({ error: "Playlist not found" });
        res.json({ success: true, playlist });
    } catch (err) {
        res.status(500).json({ error: "Failed to update playlist", details: err.message });
    }
};

/** DELETE /api/course-library/playlists/:id */
export const deletePlaylist = async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const { id } = req.params;

        // Also remove all videos in this playlist
        await CourseVideo.deleteMany({ playlist_id: id, organization_id: orgId });
        const playlist = await CoursePlaylist.findOneAndDelete({ _id: id, organization_id: orgId });

        if (!playlist) return res.status(404).json({ error: "Playlist not found" });
        res.json({ success: true, message: `Playlist "${playlist.title}" and its videos deleted.` });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete playlist", details: err.message });
    }
};

// ═══════════════════════════════════════════════════════════════════
// VIDEO CRUD
// ═══════════════════════════════════════════════════════════════════

/** POST /api/course-library/videos */
export const addVideo = async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const {
            classroom_id, youtube_url, title, description,
            playlist_id, chapter, is_mandatory, duration_seconds, channel_name
        } = req.body;

        if (!classroom_id || !title) {
            return res.status(400).json({ error: "classroom_id and title are required." });
        }

        const source = req.body.video_source_type || "youtube";
        let ytId = null;

        if (source === "youtube") {
            if (!youtube_url) return res.status(400).json({ error: "youtube_url is required for YouTube videos." });
            ytId = extractYouTubeId(youtube_url);
            if (!ytId) return res.status(400).json({ error: "Invalid YouTube URL." });
        } else if (source === "s3") {
            if (!req.body.s3_video_url) return res.status(400).json({ error: "s3_video_url is required for S3 uploads." });
        }

        // Check for duplicate (by youtube_id for yt, or s3_video_url for s3)
        const duplicateQuery = source === "youtube" ? { classroom_id, youtube_id: ytId } : { classroom_id, s3_video_url: req.body.s3_video_url };
        const existing = await CourseVideo.findOne(duplicateQuery);
        if (existing) {
            return res.status(409).json({ error: "This video already exists in this classroom." });
        }

        // Auto-sort within playlist
        let sort_order = 0;
        if (playlist_id) {
            const lastVideo = await CourseVideo.findOne({ playlist_id })
                .sort({ sort_order: -1 }).select("sort_order").lean();
            sort_order = (lastVideo?.sort_order || 0) + 1;
        }

        const video = await CourseVideo.create({
            organization_id: orgId,
            classroom_id,
            title,
            description: description || "",
            video_source_type: source,
            youtube_url: source === "youtube" ? youtube_url : "",
            youtube_id: ytId || "",
            s3_video_url: source === "s3" ? req.body.s3_video_url : "",
            s3_object_key: source === "s3" ? req.body.s3_object_key : "",
            file_size_bytes: req.body.file_size_bytes || 0,
            thumbnail_url: source === "youtube" ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : (req.body.thumbnail_url || ""),
            duration_seconds: duration_seconds || 0,
            channel_name: channel_name || "",
            playlist_id: playlist_id || null,
            sort_order,
            chapter: chapter || "",
            is_mandatory: is_mandatory || false,
            added_by: req.user._id,
        });

        res.status(201).json({ success: true, video });
    } catch (err) {
        res.status(500).json({ error: "Failed to add video", details: err.message });
    }
};

/** GET /api/course-library/videos/:classroomId */
export const getVideos = async (req, res) => {
    try {
        const { classroomId } = req.params;
        const userId = req.user._id;

        const videos = await CourseVideo.find({ classroom_id: classroomId })
            .sort({ playlist_id: 1, sort_order: 1 })
            .lean();

        // Attach user's watch progress
        const videoIds = videos.map(v => v._id);
        const progress = await VideoProgress.find({
            user: userId,
            materialId: { $in: videoIds.map(id => id.toString()) }
        }).lean();

        const progressMap = {};
        progress.forEach(p => { progressMap[p.materialId] = p; });

        const enriched = videos.map(v => ({
            ...v,
            userProgress: progressMap[v._id.toString()] || null,
            percentageWatched: progressMap[v._id.toString()]?.percentageWatched || 0,
            isCompleted: progressMap[v._id.toString()]?.isCompleted || false,
        }));

        res.json({ success: true, videos: enriched });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch videos", details: err.message });
    }
};

/** PUT /api/course-library/videos/:id */
export const updateVideo = async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const { id } = req.params;
        const updates = req.body;

        // Prevent tampering
        delete updates.organization_id;
        delete updates.youtube_id;
        delete updates._id;

        // If youtube_url changed and it's a youtube video, re-extract ID
        if (updates.youtube_url && updates.video_source_type !== "s3") {
            const newId = extractYouTubeId(updates.youtube_url);
            if (!newId) return res.status(400).json({ error: "Invalid YouTube URL." });
            updates.youtube_id = newId;
            updates.thumbnail_url = `https://img.youtube.com/vi/${newId}/hqdefault.jpg`;
            updates.video_source_type = "youtube";
        }

        const video = await CourseVideo.findOneAndUpdate(
            { _id: id, organization_id: orgId },
            { $set: updates },
            { returnDocument: 'after', runValidators: true }
        );

        if (!video) return res.status(404).json({ error: "Video not found" });
        res.json({ success: true, video });
    } catch (err) {
        res.status(500).json({ error: "Failed to update video", details: err.message });
    }
};

/** DELETE /api/course-library/videos/:id */
export const deleteVideo = async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const { id } = req.params;

        const video = await CourseVideo.findOneAndDelete({ _id: id, organization_id: orgId });
        if (!video) return res.status(404).json({ error: "Video not found" });

        // Clean up progress records
        await VideoProgress.deleteMany({ materialId: id.toString() });

        res.json({ success: true, message: `Video "${video.title}" deleted.` });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete video", details: err.message });
    }
};

// ═══════════════════════════════════════════════════════════════════
// CLASSROOM LIBRARY ANALYTICS (Faculty/Admin)
// ═══════════════════════════════════════════════════════════════════

/** GET /api/course-library/analytics/:classroomId */
export const getLibraryAnalytics = async (req, res) => {
    try {
        const { classroomId } = req.params;

        const totalVideos = await CourseVideo.countDocuments({ classroom_id: classroomId });
        const mandatoryVideos = await CourseVideo.countDocuments({ classroom_id: classroomId, is_mandatory: true });

        // Aggregate completion rates across all students
        const completionStats = await VideoProgress.aggregate([
            { $match: { classroom: classroomId } },
            {
                $group: {
                    _id: "$user",
                    avgCompletion: { $avg: "$percentageWatched" },
                    completedCount: { $sum: { $cond: ["$isCompleted", 1, 0] } },
                    totalWatched: { $sum: 1 }
                }
            }
        ]);

        const avgStudentCompletion = completionStats.length > 0
            ? completionStats.reduce((sum, s) => sum + s.avgCompletion, 0) / completionStats.length
            : 0;

        // Most watched videos
        const topVideos = await CourseVideo.find({ classroom_id: classroomId })
            .sort({ total_views: -1 })
            .limit(5)
            .select("title youtube_id total_views avg_completion_rate")
            .lean();

        res.json({
            success: true,
            analytics: {
                totalVideos,
                mandatoryVideos,
                uniqueStudentsEngaged: completionStats.length,
                avgStudentCompletion: Math.round(avgStudentCompletion),
                topVideos,
            }
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch library analytics", details: err.message });
    }
};

/** POST /api/course-library/videos/bulk-add */
export const bulkAddVideos = async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const { classroom_id, playlist_id, videos } = req.body;

        if (!classroom_id || !Array.isArray(videos) || videos.length === 0) {
            return res.status(400).json({ error: "classroom_id and videos array required." });
        }

        if (videos.length > 50) {
            return res.status(400).json({ error: "Maximum 50 videos per bulk add." });
        }

        const docs = [];
        for (let i = 0; i < videos.length; i++) {
            const v = videos[i];
            const ytId = extractYouTubeId(v.youtube_url);
            if (!ytId) continue; // Skip invalid URLs

            docs.push({
                organization_id: orgId,
                classroom_id,
                title: v.title || `Video ${i + 1}`,
                description: v.description || "",
                youtube_url: v.youtube_url,
                youtube_id: ytId,
                thumbnail_url: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
                duration_seconds: v.duration_seconds || 0,
                playlist_id: playlist_id || null,
                sort_order: i,
                chapter: v.chapter || "",
                is_mandatory: v.is_mandatory || false,
                added_by: req.user._id,
            });
        }

        const result = await CourseVideo.insertMany(docs, { ordered: false });
        res.status(201).json({ success: true, imported: result.length, skipped: videos.length - result.length });
    } catch (err) {
        // Handle duplicate key errors gracefully
        if (err.code === 11000) {
            return res.status(409).json({
                error: "Some videos already exist in this classroom.",
                details: err.message
            });
        }
        res.status(500).json({ error: "Bulk add failed", details: err.message });
    }
};
