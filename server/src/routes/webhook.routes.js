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

import express from "express";
import crypto from "crypto";
import connectDB from "../../config/db.js";
import User from "../models/User.js";
import Classroom from "../models/Classroom.js";
import AttendanceSession from "../models/AttendanceSession.js";
import AttendanceRecord from "../models/AttendanceRecord.js";
import { primarySupabaseClient as supabase, getChatSb } from "../config/supabaseClient.js";

const router = express.Router();

// ─────────────────────────────────────────────
// ZOOM WEBHOOK HANDLER
// Handles: endpoint.url_validation, meeting.started,
//          meeting.participant_joined, meeting.participant_left,
//          meeting.ended
// ─────────────────────────────────────────────

// Verify Zoom webhook signature
function verifyZoomWebhook(req) {
    const signature = req.headers['x-zm-signature'];
    const timestamp = req.headers['x-zm-request-timestamp'];
    const secretToken = process.env.ZOOM_WEBHOOK_SECRET_TOKEN;

    if (!signature || !timestamp || !secretToken) return false;

    const message = `v0:${timestamp}:${JSON.stringify(req.body)}`;
    const hashForVerify = crypto.createHmac('sha256', secretToken).update(message).digest('hex');
    const expectedSig = `v0=${hashForVerify}`;

    return signature === expectedSig;
}

// In-memory store for participant join times (per meeting)
// Key: `${zoomMeetingId}:${participantEmail}` → { joinedAt, totalMinutes }
const participantTracker = new Map();

router.post("/zoom", express.json(), async (req, res) => {
    try {
        const body = req.body;

        // ── Step 1: Zoom URL Validation Challenge ──
        if (body.event === "endpoint.url_validation") {
            const plainToken = body.payload?.plainToken;
            const secretToken = process.env.ZOOM_WEBHOOK_SECRET_TOKEN;
            const hashForValidate = crypto.createHmac('sha256', secretToken).update(plainToken).digest('hex');
            return res.json({
                plainToken,
                encryptedToken: hashForValidate
            });
        }

        // ── Step 2: Verify webhook signature ──
        if (!verifyZoomWebhook(req)) {
            console.warn("[Webhook] Invalid Zoom signature");
            return res.status(401).json({ message: "Invalid signature" });
        }

        const event = body.event;
        const payload = body.payload?.object;

        if (!payload) return res.status(200).json({ received: true });

        const zoomMeetingId = payload.id?.toString();

        console.log(`[Zoom Webhook] Event: ${event}, Meeting ID: ${zoomMeetingId}`);

        await connectDB();

        switch (event) {

            // ═══════════════════════════════════════════
            // MEETING STARTED — Create an auto-attendance session
            // ═══════════════════════════════════════════
            case "meeting.started": {
                // Find the meeting in our Supabase meetings table
                const { data: meeting } = await supabase
                    .from('meetings')
                    .select('*')
                    .eq('calendar_event_id', zoomMeetingId)
                    .eq('provider', 'zoom')
                    .single();

                if (!meeting) {
                    console.log(`[Zoom Webhook] No matching meeting for Zoom ID ${zoomMeetingId}`);
                    break;
                }

                // Check if an auto-attendance session already exists for this meeting
                const existingSession = await AttendanceSession.findOne({
                    classroom: meeting.classroom_id,
                    'meta.zoomMeetingId': zoomMeetingId
                });

                if (existingSession) {
                    console.log(`[Zoom Webhook] Session already exists for meeting ${zoomMeetingId}`);
                    break;
                }

                // Create auto-attendance session (no PIN code needed — Zoom handles identity)
                const durationSec = (meeting.duration || 60) * 60; // meeting duration in seconds
                const session = new AttendanceSession({
                    classroom: meeting.classroom_id,
                    faculty: meeting.teacher_id,
                    codeHash: `zoom-auto-${zoomMeetingId}`, // Not used for verification, just a required field
                    startsAt: new Date(),
                    expiresAt: new Date(Date.now() + durationSec * 1000 + 30 * 60 * 1000), // duration + 30min buffer
                    durationSeconds: durationSec,
                    status: "active",
                    presentCount: 0,
                });

                // Store Zoom metadata for matching
                session.set('meta', {
                    zoomMeetingId,
                    source: 'zoom_auto',
                    topic: meeting.topic,
                });

                await session.save();
                console.log(`✅ [Zoom Auto-Attendance] Session created for classroom ${meeting.classroom_id}`);
                break;
            }

            // ═══════════════════════════════════════════
            // PARTICIPANT JOINED — Track join timestamp
            // ═══════════════════════════════════════════
            case "meeting.participant_joined": {
                const participant = payload.participant;
                const email = participant?.email?.toLowerCase();
                const joinKey = `${zoomMeetingId}:${email || participant?.user_name}`;

                // Track the join time
                if (!participantTracker.has(joinKey)) {
                    participantTracker.set(joinKey, {
                        joinedAt: new Date(),
                        email,
                        userName: participant?.user_name,
                        totalMinutes: 0,
                        lastJoin: new Date()
                    });
                } else {
                    // Rejoin — update lastJoin
                    const tracker = participantTracker.get(joinKey);
                    tracker.lastJoin = new Date();
                    participantTracker.set(joinKey, tracker);
                }

                console.log(`📥 [Zoom] ${email || participant?.user_name} joined meeting ${zoomMeetingId}`);
                break;
            }

            // ═══════════════════════════════════════════
            // PARTICIPANT LEFT — Calculate time spent
            // ═══════════════════════════════════════════
            case "meeting.participant_left": {
                const participant = payload.participant;
                const email = participant?.email?.toLowerCase();
                const joinKey = `${zoomMeetingId}:${email || participant?.user_name}`;

                if (participantTracker.has(joinKey)) {
                    const tracker = participantTracker.get(joinKey);
                    const minutesThisSegment = (Date.now() - tracker.lastJoin.getTime()) / 60000;
                    tracker.totalMinutes += minutesThisSegment;
                    participantTracker.set(joinKey, tracker);

                    console.log(`📤 [Zoom] ${email || participant?.user_name} left. Time in class: ${tracker.totalMinutes.toFixed(1)} min`);
                }
                break;
            }

            // ═══════════════════════════════════════════
            // MEETING ENDED — Finalize attendance records
            // ═══════════════════════════════════════════
            case "meeting.ended": {
                // Find our meeting
                const { data: meeting } = await supabase
                    .from('meetings')
                    .select('*')
                    .eq('calendar_event_id', zoomMeetingId)
                    .eq('provider', 'zoom')
                    .single();

                if (!meeting) break;

                // Find the auto-attendance session
                const session = await AttendanceSession.findOne({
                    classroom: meeting.classroom_id,
                    'meta.zoomMeetingId': zoomMeetingId,
                    status: "active"
                });

                if (!session) {
                    console.log(`[Zoom Webhook] No active session found for meeting ${zoomMeetingId}`);
                    break;
                }

                // Collect all participants who joined this meeting
                const meetingDuration = meeting.duration || 60; // in minutes
                let presentCount = 0;

                for (const [key, tracker] of participantTracker.entries()) {
                    if (!key.startsWith(`${zoomMeetingId}:`)) continue;

                    // If they're still "in" (didn't get a left event), calculate remaining time
                    if (tracker.lastJoin) {
                        const minutesSinceLastJoin = (Date.now() - tracker.lastJoin.getTime()) / 60000;
                        tracker.totalMinutes += minutesSinceLastJoin;
                    }

                    const email = tracker.email;
                    if (!email) {
                        // Can't match without email
                        participantTracker.delete(key);
                        continue;
                    }

                    // Find the student in our database by email
                    const student = await User.findOne({ email: email.toLowerCase() }).select("_id").lean();
                    if (!student) {
                        participantTracker.delete(key);
                        continue;
                    }

                    // Determine status based on time in class
                    const timePercent = (tracker.totalMinutes / meetingDuration) * 100;
                    let status = "present";
                    const suspicionReasons = [];

                    if (timePercent < 30) {
                        // Less than 30% of the class — mark as suspicious (basically absent)
                        status = "present_suspicious";
                        suspicionReasons.push("zoom_time_low");
                    }

                    // Check if they joined late (more than 10 minutes after start)
                    const sessionStart = session.startsAt || session.createdAt;
                    const joinDelay = (tracker.joinedAt.getTime() - sessionStart.getTime()) / 60000;
                    if (joinDelay > 10) {
                        suspicionReasons.push("zoom_joined_late");
                    }

                    // Create or update attendance record
                    try {
                        await AttendanceRecord.findOneAndUpdate(
                            { session: session._id, student: student._id },
                            {
                                $set: {
                                    session: session._id,
                                    classroom: meeting.classroom_id,
                                    student: student._id,
                                    markedAt: tracker.joinedAt,
                                    status,
                                    suspicionReasons,
                                    // Store time-in-class data in device fingerprint field (reused for metadata)
                                    deviceFingerprint: `zoom-auto|${tracker.totalMinutes.toFixed(1)}min|${timePercent.toFixed(0)}%`,
                                }
                            },
                            { upsert: true, returnDocument: 'after' }
                        );
                        presentCount++;
                    } catch (recordErr) {
                        console.error(`[Zoom Auto-Att] Error creating record for ${email}:`, recordErr.message);
                    }

                    // Clean up tracker
                    participantTracker.delete(key);
                }

                // Update session
                session.status = "expired";
                session.presentCount = presentCount;
                await session.save();

                console.log(`✅ [Zoom Auto-Attendance] Meeting ended. ${presentCount} students marked present.`);

                // 🔔 Notify teacher
                try {
                    await supabase.from('notifications').insert({
                        recipient_id: meeting.teacher_id,
                        type: "attendance_completed",
                        title: "📊 Zoom Auto-Attendance Complete",
                        message: `${presentCount} students auto-marked for "${meeting.topic}". Only Zoom meetings support auto-attendance.`,
                        link: `/classroom/${meeting.classroom_id}/attendance`,
                        classroom_id: meeting.classroom_id,
                    });
                } catch (notifErr) {
                    console.error("[Zoom Auto-Att] Notification error:", notifErr.message);
                }

                break;
            }

            default:
                console.log(`[Zoom Webhook] Unhandled event: ${event}`);
        }

        res.status(200).json({ received: true });
    } catch (err) {
        console.error("[Zoom Webhook] Error:", err);
        res.status(200).json({ received: true }); // Always 200 to prevent Zoom retries
    }
});

export default router;

// ─────────────────────────────────────────────
// RAZORPAY WEBHOOK HANDLER
// Handles: payment.authorized, payment.captured,
//          payment.failed, order.paid, refund.created
// Endpoint: POST /api/webhooks/razorpay
// ─────────────────────────────────────────────

import razorpayWebhookRouter from "./razorpay-webhook.routes.js";
export { razorpayWebhookRouter };
