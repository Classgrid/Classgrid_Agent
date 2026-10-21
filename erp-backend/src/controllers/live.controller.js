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

import { generateRtcToken, generateRtmToken } from "../services/agora.service.js";
import * as recordingService from "../services/agora-recording.service.js";
import Classroom from "../models/Classroom.js";
import GoLive from "../models/GoLive.js";

/**
 * POST /api/live/start
 * Host starts a classroom meeting
 */
export const startMeeting = async (req, res) => {
    try {
        const { classroomId, title, subject, chapter } = req.body;
        const userId = req.user._id;
        const orgId = req.user.organizationId;

        // Check if user is teacher of this classroom
        const classroom = await Classroom.findOne({ _id: classroomId, teacher: userId });
        if (!classroom) return res.status(403).json({ error: "Only the teacher can start a meeting" });

        const channelName = `class_${classroomId}_${Date.now()}`;
        
        const meeting = await GoLive.create({
            orgId,
            classroom: classroomId,
            subject,
            chapter,
            host: userId,
            title: title || `${classroom.name} Live`,
            channelName,
            status: "active"
        });

        const token = generateRtcToken(channelName, userId.toString(), "publisher");

        res.json({ success: true, meeting, token });
    } catch (err) {
        res.status(500).json({ error: "Failed to start meeting" });
    }
};

/**
 * POST /api/live/join/:meetingId
 */
export const joinMeeting = async (req, res) => {
    try {
        const { meetingId } = req.params;
        const userId = req.user._id;

        const meeting = await GoLive.findById(meetingId);
        if (!meeting || meeting.status !== "active") {
            return res.status(404).json({ error: "Meeting not active" });
        }

        // Add to participants if not already there
        await GoLive.findByIdAndUpdate(meetingId, {
            $addToSet: { participants: { user: userId, joinedAt: new Date() } }
        });

        const token = generateRtcToken(meeting.channelName, userId.toString(), "publisher");

        res.json({ success: true, token, channelName: meeting.channelName });
    } catch (err) {
        res.status(500).json({ error: "Failed to join meeting" });
    }
};

/**
 * POST /api/live/generate-token
 * Legacy/Direct token generation for P2P calls
 */
export const getAgoraToken = async (req, res) => {
    try {
        const { channelName, uid, role } = req.body;

        if (!channelName) {
            return res.status(400).json({ error: "Channel name is required" });
        }

        const token = generateRtcToken(channelName, uid, role);

        res.json({
            success: true,
            token,
            appId: process.env.AGORA_APP_ID || "PLACEHOLDER_APP_ID",
            channelName,
            uid
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to generate video token", details: err.message });
    }
};

/**
 * POST /api/live/generate-rtm-token
 * Required for signaling and chat
 */
export const getRtmToken = async (req, res) => {
    try {
        const { uid } = req.body;
        const finalUid = uid || req.user._id.toString();

        const token = generateRtmToken(finalUid);

        res.json({
            success: true,
            token,
            appId: process.env.AGORA_APP_ID || "PLACEHOLDER_APP_ID",
            uid: finalUid
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to generate messaging token", details: err.message });
    }
};

/**
 * POST /api/live/end/:meetingId
 */
export const endMeeting = async (req, res) => {
    try {
        const { meetingId } = req.params;
        const userId = req.user._id;

        const meeting = await GoLive.findOneAndUpdate(
            { _id: meetingId, host: userId },
            { status: "ended", endTime: new Date() },
            { returnDocument: 'after' }
        );

        if (!meeting) return res.status(403).json({ error: "Only the host can end the meeting" });

        res.json({ success: true, message: "Meeting ended" });
    } catch (err) {
        res.status(500).json({ error: "Failed to end meeting" });
    }
};

/**
 * GET /api/live/history/:classroomId
 */
export const getMeetingHistory = async (req, res) => {
    try {
        const { classroomId } = req.params;
        const history = await GoLive.find({ classroom: classroomId })
            .sort({ startTime: -1 })
            .populate("host", "name email")
            .lean();

        res.json({ success: true, history });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch meeting history" });
    }
};

/**
 * POST /api/live/meeting/:meetingId/start-recording
 */
export const startRecording = async (req, res) => {
    try {
        const { meetingId } = req.params;
        const userId = req.user._id;

        const meeting = await GoLive.findOne({ _id: meetingId, host: userId });
        if (!meeting) return res.status(403).json({ error: "Only the host can start recording" });

        if (meeting.recordingStatus === "started") {
            return res.status(400).json({ error: "Recording already started" });
        }

        // 1. Acquire Resource ID
        const resourceId = await recordingService.acquireResourceId(meeting.channelName, 999); // 999 is a dedicated recorder UID

        // 2. Generate token for the recorder
        const token = generateRtcToken(meeting.channelName, 999, "publisher");

        // 3. Start Recording
        // Storage config should ideally come from Org settings or ENV
        const storageConfig = {
            region: 14, // 14 corresponds to AWS ap-south-1 (Mumbai) in Agora API
            bucket: process.env.S3_BUCKET_NAME || "classgrid-recordings",
            accessKey: process.env.AWS_ACCESS_KEY_ID || "",
            secretKey: process.env.AWS_SECRET_ACCESS_KEY || "",
            fileNamePrefix: ["recordings", meeting.orgId, meeting.classroom.toString()]
        };

        const result = await recordingService.startRecording(resourceId, meeting.channelName, 999, token, storageConfig);

        meeting.recordingStatus = "started";
        meeting.agoraResourceId = resourceId;
        meeting.agoraSid = result.sid;
        await meeting.save();

        res.json({ success: true, message: "Recording started", sid: result.sid });
    } catch (err) {
        console.error("[Live] Start Recording Error:", err);
        res.status(500).json({ error: "Failed to start recording", details: err.message });
    }
};

/**
 * POST /api/live/meeting/:meetingId/stop-recording
 */
export const stopRecording = async (req, res) => {
    try {
        const { meetingId } = req.params;
        const userId = req.user._id;

        const meeting = await GoLive.findOne({ _id: meetingId, host: userId });
        if (!meeting) return res.status(403).json({ error: "Only the host can stop recording" });

        if (meeting.recordingStatus !== "started") {
            return res.status(400).json({ error: "No active recording" });
        }

        const result = await recordingService.stopRecording(
            meeting.agoraResourceId,
            meeting.agoraSid,
            meeting.channelName,
            999
        );

        meeting.recordingStatus = "completed";
        // Agora returns file details in serverResponse
        if (result.serverResponse?.extensionServiceState?.[0]?.payload?.files) {
            // This is a complex mapping, usually we'd wait for a webhook or poll
            // For now, we'll mark as completed and let the frontend query the URL
        }

        await meeting.save();

        res.json({ success: true, message: "Recording stopped", details: result });
    } catch (err) {
        console.error("[Live] Stop Recording Error:", err);
        res.status(500).json({ error: "Failed to stop recording", details: err.message });
    }
};

/**
 * PUT /api/live/:meetingId
 * Allows teacher to edit the GoLive session details, including moving the recorded video to a different Chapter/Playlist.
 */
export const updateGoLiveDetails = async (req, res) => {
    try {
        const { meetingId } = req.params;
        const { title, subject, chapter, status } = req.body;
        const userId = req.user._id;

        const updates = {};
        if (title) updates.title = title;
        if (subject) updates.subject = subject;
        if (chapter) updates.chapter = chapter;
        if (status) updates.status = status;

        const meeting = await GoLive.findOneAndUpdate(
            { _id: meetingId, host: userId },
            { $set: updates },
            { returnDocument: 'after' }
        );

        if (!meeting) return res.status(403).json({ error: "Only the host can edit the live session recording details" });

        res.json({ success: true, message: "Go Live playlist details updated successfully", meeting });
    } catch (err) {
        res.status(500).json({ error: "Failed to update Go Live details" });
    }
};
