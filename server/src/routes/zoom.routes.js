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
import { isAuthenticated, requireRole } from "../middleware/auth.middleware.js";
import User from "../models/User.js";
import Classroom from "../models/Classroom.js";
import connectDB from "../../config/db.js";
import { primarySupabaseClient as supabase } from "../config/supabaseClient.js";

const router = express.Router();

// Helper to generate Basic Auth string for Zoom OAuth
const getZoomBasicAuth = () => {
    return Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString('base64');
};

// ─────────────────────────────────────────────
// 1. GENERATE OAUTH URL (Redirect User to Zoom)
// ─────────────────────────────────────────────
router.get("/connect", isAuthenticated, (req, res) => {
    const clientId = process.env.ZOOM_CLIENT_ID;
    const redirectUri = encodeURIComponent(process.env.ZOOM_REDIRECT_URI);
    
    const returnTo = req.query.returnTo || req.headers.referer || req.headers.origin || process.env.FRONTEND_URL;
    const isPopup = req.query.popup === 'true';
    const statePayload = Buffer.from(JSON.stringify({ 
        userId: req.user._id.toString(),
        returnTo,
        isPopup
    })).toString('base64');

    const url = `https://zoom.us/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${statePayload}`;
    res.json({ url });
});

// ─────────────────────────────────────────────
// 2. HANDLE OAUTH CALLBACK
// ─────────────────────────────────────────────
router.get("/callback", async (req, res) => {
    let returnTo = null;
    let isPopup = false;
    try {
        await connectDB();
        
        console.log("🔍 ZOOM CALLBACK HIT. Query params:", req.query);

        const { code, state } = req.query;

        let userId;
        if (state) {
            try {
                const decodedState = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
                userId = decodedState.userId;
                if (decodedState.returnTo) returnTo = decodedState.returnTo;
                if (decodedState.isPopup) isPopup = true;
            } catch (e) {
                userId = state; // Fallback: old format was just userId
            }
        }

        if (!returnTo) returnTo = req.headers.referer || req.headers.origin;

        const { error, error_description } = req.query;
        if (error) {
            console.error("Zoom OAuth Error:", error, error_description);
            if (userId) {
                const user = await User.findById(userId);
                if (user) {
                    user.metadata = user.metadata || {};
                    user.metadata.integration_errors = user.metadata.integration_errors || {};
                    user.metadata.integration_errors.zoom = error_description || error;
                    user.markModified('metadata');
                    await user.save();
                }
            }
            if (isPopup) {
                return res.send(`
                    <!DOCTYPE html>
                    <html><head><title>Error</title></head>
                    <body style="background:#0a0a0a; color:#fff; display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif;">
                      <h2>Error authenticating.</h2>
                      <script>
                        const payload = { type: 'integration_error', provider: 'zoom' };
                        if (window.opener) { window.opener.postMessage(payload, '*'); }
                        localStorage.setItem('integration_callback', JSON.stringify({ ...payload, timestamp: Date.now() }));
                        window.close();
                        setTimeout(() => { document.body.innerHTML = '<h2>Authentication failed. You can safely close this window.</h2>'; }, 1000);
                      </script>
                    </body></html>
                `);
            }
            return returnTo 
                ? res.redirect(`${returnTo}?integration_error=zoom_${error}`)
                : res.status(400).json({ error });
        }

        if (!code || !userId) {
            console.error("❌ Zoom Callback Missing code or state. Query was:", req.query);
            if (isPopup) {
                return res.send(`
                    <!DOCTYPE html>
                    <html><head><title>Error</title></head>
                    <body style="background:#0a0a0a; color:#fff; display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif;">
                      <h2>Error authenticating.</h2>
                      <script>
                        const payload = { type: 'integration_error', provider: 'zoom' };
                        if (window.opener) { window.opener.postMessage(payload, '*'); }
                        localStorage.setItem('integration_callback', JSON.stringify({ ...payload, timestamp: Date.now() }));
                        window.close();
                        setTimeout(() => { document.body.innerHTML = '<h2>Authentication failed. You can safely close this window.</h2>'; }, 1000);
                      </script>
                    </body></html>
                `);
            }
            return returnTo 
                ? res.redirect(`${returnTo}?integration_error=zoom_missing_params`)
                : res.status(400).json({ error: "Missing code or state" });
        }

        // Exchange code for tokens
        const tokenResponse = await fetch("https://zoom.us/oauth/token", {
            method: "POST",
            headers: {
                "Authorization": `Basic ${getZoomBasicAuth()}`,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code: code,
                redirect_uri: process.env.ZOOM_REDIRECT_URI
            })
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            throw new Error(`Zoom API Error: ${tokenData.error} - ${tokenData.error_description}`);
        }

        const user = await User.findById(userId);
        if (!user) {
            if (isPopup) {
                return res.send(`
                    <!DOCTYPE html>
                    <html><head><title>Error</title></head>
                    <body style="background:#0a0a0a; color:#fff; display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif;">
                      <h2>User not found.</h2>
                      <script>
                        const payload = { type: 'integration_error', provider: 'zoom' };
                        if (window.opener) { window.opener.postMessage(payload, '*'); }
                        localStorage.setItem('integration_callback', JSON.stringify({ ...payload, timestamp: Date.now() }));
                        window.close();
                        setTimeout(() => { document.body.innerHTML = '<h2>Authentication failed. You can safely close this window.</h2>'; }, 1000);
                      </script>
                    </body></html>
                `);
            }
            return returnTo 
                ? res.redirect(`${returnTo}?integration_error=user_not_found`)
                : res.status(404).json({ error: "User not found" });
        }

        user.zoom_access_token = tokenData.access_token;
        
        try {
            const userRes = await fetch("https://api.zoom.us/v2/users/me", {
                headers: { "Authorization": `Bearer ${tokenData.access_token}` }
            });
            const zUser = await userRes.json();
            if (zUser) {
                user.zoom_email = zUser.email || null;
                user.zoom_name = (zUser.first_name || '') + ' ' + (zUser.last_name || '');
                user.zoom_name = user.zoom_name.trim();
            }
        } catch (e) {
            console.error("Failed to fetch Zoom profile:", e);
        }
        if (tokenData.refresh_token) {
            user.zoom_refresh_token = tokenData.refresh_token; 
        }
        if (tokenData.expires_in) {
            user.zoom_token_expiry = new Date(Date.now() + tokenData.expires_in * 1000);
        }

        // Clear any previous errors on success
        user.metadata = user.metadata || {};
        if (user.metadata.integration_errors && user.metadata.integration_errors.zoom) {
            delete user.metadata.integration_errors.zoom;
            user.markModified('metadata');
        }

        await user.save();

        if (isPopup) {
            return res.send(`
                <!DOCTYPE html>
                <html><head><title>Authenticating...</title></head>
                <body style="background:#0a0a0a; color:#fff; display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif;">
                  <h2>Authenticating...</h2>
                  <script>
                    const payload = { type: 'integration_success', provider: 'zoom' };
                    if (window.opener) { window.opener.postMessage(payload, '*'); }
                    localStorage.setItem('integration_callback', JSON.stringify({ ...payload, timestamp: Date.now() }));
                    window.close();
                    setTimeout(() => { document.body.innerHTML = '<h2>Authentication complete. You can safely close this window.</h2>'; }, 1000);
                  </script>
                </body></html>
            `);
        }

        const redirectUrl = new URL(returnTo);
        redirectUrl.searchParams.set('integration_success', 'zoom');
        res.redirect(redirectUrl.toString());
    } catch (err) {
        console.error("Zoom Callback Detailed Error:", err);
        
        let isPopup = false;
        if (req.query.state) {
            try {
                const decodedState = JSON.parse(Buffer.from(req.query.state, 'base64').toString('utf8'));
                if (decodedState.isPopup) isPopup = true;
            } catch (e) {}
        }
        
        if (isPopup) {
            return res.send(`
                <!DOCTYPE html>
                <html><head><title>Error</title></head>
                <body style="background:#0a0a0a; color:#fff; display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif;">
                  <h2>Error authenticating.</h2>
                  <script>
                    const payload = { type: 'integration_error', provider: 'zoom' };
                    if (window.opener) { window.opener.postMessage(payload, '*'); }
                    localStorage.setItem('integration_callback', JSON.stringify({ ...payload, timestamp: Date.now() }));
                    window.close();
                    setTimeout(() => { document.body.innerHTML = '<h2>Authentication failed. You can safely close this window.</h2>'; }, 1000);
                  </script>
                </body></html>
            `);
        }
        
        if (returnTo) {
            res.redirect(`${returnTo}?integration_error=zoom`);
        } else {
            res.status(500).json({ error: "Zoom connection failed", message: err.message });
        }
    }
});

// Helper Function: Check and refresh Zoom token if expired
const getValidZoomToken = async (userId) => {
    const user = await User.findById(userId);
    if (!user || !user.zoom_access_token) {
        throw new Error("Zoom not connected");
    }

    // Check if within 5 minutes of expiring
    if (user.zoom_token_expiry && new Date(user.zoom_token_expiry.getTime() - 5 * 60000) < new Date()) {
        // Token is expired or about to expire, refresh it
        const tokenResponse = await fetch("https://zoom.us/oauth/token", {
            method: "POST",
            headers: {
                "Authorization": `Basic ${getZoomBasicAuth()}`,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: user.zoom_refresh_token
            })
        });

        const tokenData = await tokenResponse.json();
        
        if (tokenData.error) {
            // Refresh token invalid/revoked
            user.zoom_access_token = null;
            user.zoom_refresh_token = null;
            user.zoom_token_expiry = null;
            await user.save();
            throw new Error("Zoom refresh token expired. Please reconnect.");
        }

        user.zoom_access_token = tokenData.access_token;
        user.zoom_refresh_token = tokenData.refresh_token; 
        user.zoom_token_expiry = new Date(Date.now() + tokenData.expires_in * 1000);
        await user.save();
    }

    return user.zoom_access_token;
};

// ─────────────────────────────────────────────
// 3. SCHEDULE ZOOM MEETING (Teacher Only)
// ─────────────────────────────────────────────
router.post("/meet", isAuthenticated, requireRole("faculty", "org_admin"), async (req, res) => {
    try {
        await connectDB();
        const { classroomId, topic, startTime, durationMinutes } = req.body;

        const classroom = await Classroom.findById(classroomId);
        if (!classroom) return res.status(404).json({ message: "Classroom not found" });

        const accessToken = await getValidZoomToken(req.user._id);

        const startDate = new Date(startTime);

        // Call Zoom API to create meeting
        const meetingResponse = await fetch("https://api.zoom.us/v2/users/me/meetings", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                topic: `ClassGrid Live: ${classroom.name || classroom.subject} - ${topic}`,
                type: 2, // 2 = Scheduled meeting
                start_time: startDate.toISOString(),
                duration: durationMinutes,
                timezone: "Asia/Kolkata",
                settings: {
                    host_video: true,
                    participant_video: false,
                    join_before_host: false,
                    mute_upon_entry: true,
                    waiting_room: true
                }
            })
        });

        const zoomMeeting = await meetingResponse.json();

        if (zoomMeeting.code === 124) {
            // Invalid access token
            throw new Error("Zoom token invalid. Please reconnect your Zoom account.");
        }

        if (!zoomMeeting.join_url) {
            throw new Error("Zoom API did not return a Join Link. Error: " + JSON.stringify(zoomMeeting));
        }

        // Save to our Local Postgres Database
        const { data: meeting, error: meetError } = await supabase
            .from('meetings')
            .insert([{
                classroom_id: classroomId,
                teacher_id: req.user._id.toString(),
                provider: "zoom",
                topic: topic,
                join_url: zoomMeeting.join_url,
                start_time: startDate.toISOString(),
                duration: durationMinutes,
                calendar_event_id: zoomMeeting.id.toString()
            }])
            .select()
            .single();

        if (meetError) {
             console.error("Supabase insert error:", meetError);
             throw new Error("Failed to save Zoom meeting track in database.");
        }

        // 📧 Fetch all approved student emails (used for Calendar + notifications)
        const { default: ClassroomMembership } = await import("../models/ClassroomMembership.js");
        const members = await ClassroomMembership.find({ classroom: classroomId, status: "approved" }).select("student").lean();
        const memberIds = members.map(m => m.student);
        const memberUsers = await User.find({ _id: { $in: memberIds } }).select("_id email pushNotifications").lean();

        // 📅 Create a Google Calendar event alongside the Zoom meeting (if teacher has Google connected)
        let calendarSynced = false;
        if (req.user.google_access_token && req.user.google_refresh_token) {
            try {
                const { google } = await import("googleapis");
                const oauth2Client = new google.auth.OAuth2(
                    process.env.GOOGLE_CLIENT_ID,
                    process.env.GOOGLE_CLIENT_SECRET,
                    `${process.env.BACKEND_URL}/api/calendar/callback`
                );
                oauth2Client.setCredentials({
                    access_token: req.user.google_access_token,
                    refresh_token: req.user.google_refresh_token,
                    expiry_date: req.user.google_token_expiry ? req.user.google_token_expiry.getTime() : null
                });

                const calendar = google.calendar({ version: "v3", auth: oauth2Client });
                const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

                const attendees = memberUsers
                    .filter(u => u.email)
                    .map(u => ({ email: u.email }));

                const calEvent = {
                    summary: `ClassGrid Live: ${classroom.name || classroom.subject} - ${topic}`,
                    description: `Zoom Live Session for ${topic}\n\nJoin Zoom: ${zoomMeeting.join_url}\nJoin via ClassGrid: ${process.env.FRONTEND_URL}/classroom/${classroomId}/liveclass`,
                    start: { dateTime: startDate.toISOString(), timeZone: "Asia/Kolkata" },
                    end: { dateTime: endDate.toISOString(), timeZone: "Asia/Kolkata" },
                    attendees: attendees.length > 0 ? attendees : undefined,
                    guestsCanModify: false,
                    guestsCanInviteOthers: false,
                };

                await calendar.events.insert({
                    calendarId: "primary",
                    resource: calEvent,
                    sendUpdates: "all" // Students get phone notifications!
                });

                calendarSynced = true;
                console.log(`✅ [Zoom] Calendar event created with ${attendees.length} attendees`);
            } catch (calErr) {
                // Calendar sync is a bonus — don't block the Zoom meeting if it fails
                console.error("[Zoom] Calendar sync failed (non-blocking):", calErr.message);
            }
        }

        // 🔔 Notify students via Supabase (reuse already-fetched memberUsers)
        try {
            const notifications = [];
            for (const u of memberUsers) {
                if (u.pushNotifications?.global !== false) {
                    notifications.push({
                        recipient_id: u._id.toString(),
                        type: "meeting_reminder",
                        title: "📅 Live Class Scheduled",
                        message: `A new live class "${topic}" is scheduled in ${classroom.name || 'your classroom'}.${calendarSynced ? ' Check your Google Calendar for the invite!' : ''}`,
                        link: `/view-classroom?id=${classroomId}#liveclass`,
                        classroom_id: classroomId,
                        related_id: meeting.id.toString()
                    });
                }
            }
            
            if (notifications.length > 0) {
                await supabase.from('notifications').insert(notifications);
            }
        } catch (notifErr) {
            console.error("[Zoom] Notification error:", notifErr.message);
        }

        res.json({ message: "Meeting scheduled", meeting: { ...meeting, _id: meeting.id } });

    } catch (err) {
        console.error("Schedule zoom error:", err);
        res.status(500).json({ message: "Failed to schedule Zoom Meeting", error: err.message });
    }
});

// ─────────────────────────────────────────────
// 4. CANCEL ZOOM MEETING
// ─────────────────────────────────────────────
router.delete("/meet/:id", isAuthenticated, requireRole("faculty", "org_admin"), async (req, res) => {
    try {
        await connectDB();
        const meetingId = req.params.id;

        // Fetch the meeting to get the Zoom Meeting ID (calendar_event_id)
        const { data: meeting, error: fetchError } = await supabase
            .from('meetings')
            .select('*')
            .eq('id', meetingId)
            .single();

        if (fetchError || !meeting) {
            return res.status(404).json({ message: "Meeting not found in database." });
        }

        // Check ownership (only the teacher who created it can delete it)
        if (meeting.teacher_id !== req.user._id.toString() && req.user.role !== 'org_admin') {
            return res.status(403).json({ message: "Not authorized to delete this meeting." });
        }

        const accessToken = await getValidZoomToken(req.user._id);

        // Call Zoom API to delete meeting
        if (meeting.calendar_event_id) {
            const deleteResponse = await fetch(`https://api.zoom.us/v2/meetings/${meeting.calendar_event_id}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${accessToken}`
                }
            });

            if (!deleteResponse.ok) {
                const errData = await deleteResponse.text();
                // We won't block the database deletion if Zoom says it's already deleted (404)
                if (deleteResponse.status !== 404) {
                    console.error("Zoom API deletion error:", errData);
                    // Decide if you want to throw here, but usually it's better to continue and delete from local DB
                }
            }
        }

        // Delete from our Local Postgres Database
        const { error: deleteError } = await supabase
            .from('meetings')
            .delete()
            .eq('id', meetingId);

        if (deleteError) {
             console.error("Supabase delete error:", deleteError);
             throw new Error("Failed to remove meeting from local database.");
        }

        res.json({ message: "Meeting cancelled successfully" });

    } catch (err) {
        console.error("Cancel zoom error:", err);
        res.status(500).json({ message: "Failed to cancel Zoom Meeting", error: err.message });
    }
});

// ─────────────────────────────────────────────
// 5. DISCONNECT ZOOM
// ─────────────────────────────────────────────
router.post("/disconnect", isAuthenticated, async (req, res) => {
    try {
        await connectDB();
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Optionally call Zoom's token revocation endpoint here

        user.zoom_access_token = null;
        user.zoom_refresh_token = null;
        user.zoom_token_expiry = null;
        await user.save();

        res.json({ message: "Zoom disconnected" });
    } catch (err) {
        console.error("Disconnect error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
