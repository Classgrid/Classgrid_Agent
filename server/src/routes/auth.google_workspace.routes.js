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
import { google } from "googleapis";
import { isAuthenticated, requireRole } from "../middleware/auth.middleware.js";
import User from "../models/User.js";
import Classroom from "../models/Classroom.js";
import connectDB from "../../config/db.js";
import { primarySupabaseClient as supabase } from "../config/supabaseClient.js";

const router = express.Router();

// Helper to get OAuth2 Client
const getOAuth2Client = () => {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.BACKEND_URL}/api/google-workspace/callback`
    );
};

// ─────────────────────────────────────────────
// 1. GENERATE OAUTH URL (Redirect User to Google)
// ─────────────────────────────────────────────
router.get("/connect", isAuthenticated, (req, res) => {
    const oauth2Client = getOAuth2Client();
    const service = req.query.service || 'all';

    // One Google login is shared by Gmail, Drive, Calendar, Classroom, Meet and Forms, so ask again for the
    // ones already connected. YouTube has its own login and must never be mixed in (Google blocks the request).
    const idToService = { gmail: 'gmail', gcal: 'calendar', gdrive: 'drive', gclass: 'classroom', gmeet: 'meet', gforms: 'forms' };
    const alreadyConnected = service === 'youtube' ? [] :
        (req.user.metadata?.connected_google_services || []).map(id => idToService[id]).filter(Boolean);
    const wanted = new Set([service, ...alreadyConnected]);
    const wants = (name) => wanted.has(name);

    let scopes = [];

    if (wants('calendar') || wants('meet') || wants('all')) {
        scopes.push('https://www.googleapis.com/auth/calendar');
        scopes.push('https://www.googleapis.com/auth/calendar.events');
    }
    if (wants('classroom') || wants('all')) {
        scopes.push('https://www.googleapis.com/auth/classroom.courses.readonly');
        scopes.push('https://www.googleapis.com/auth/classroom.coursework.me.readonly');
        scopes.push('https://www.googleapis.com/auth/classroom.coursework.students');
        scopes.push('https://www.googleapis.com/auth/classroom.student-submissions.me.readonly');
        scopes.push('https://www.googleapis.com/auth/classroom.student-submissions.students.readonly');
        scopes.push('https://www.googleapis.com/auth/classroom.rosters.readonly');
        scopes.push('https://www.googleapis.com/auth/classroom.announcements.readonly'); // Required for AI to read announcements
        scopes.push('https://www.googleapis.com/auth/classroom.topics.readonly'); // Required to filter by topic
        scopes.push('https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly'); // Required for question papers/materials
        scopes.push('https://www.googleapis.com/auth/drive.readonly'); // Required to read Classroom attachments
        
        // FULL WRITE SCOPES (Added per request)
        scopes.push('https://www.googleapis.com/auth/classroom.courses');
        scopes.push('https://www.googleapis.com/auth/classroom.coursework.me');
        scopes.push('https://www.googleapis.com/auth/classroom.coursework.students');
        scopes.push('https://www.googleapis.com/auth/classroom.student-submissions.me.readonly');
        scopes.push('https://www.googleapis.com/auth/classroom.student-submissions.students.readonly');
        scopes.push('https://www.googleapis.com/auth/classroom.rosters');
        scopes.push('https://www.googleapis.com/auth/classroom.announcements');
        scopes.push('https://www.googleapis.com/auth/classroom.topics');
        scopes.push('https://www.googleapis.com/auth/classroom.courseworkmaterials');
    }

    if (wants('drive') || wants('all')) {
        scopes.push('https://www.googleapis.com/auth/drive.readonly');
        scopes.push('https://www.googleapis.com/auth/drive.file');
    }

    if (wants('gmail') || wants('all')) {
        scopes.push('https://www.googleapis.com/auth/gmail.modify');
        scopes.push('https://www.googleapis.com/auth/gmail.send');
    }

    if (wants('forms') || wants('all')) {
        scopes.push('https://www.googleapis.com/auth/forms.body');
        scopes.push('https://www.googleapis.com/auth/forms.responses.readonly');
    }

    if (service === 'youtube') {
        scopes.push('https://www.googleapis.com/auth/youtube.readonly'); // Read-only access
        scopes.push('https://www.googleapis.com/auth/youtube.upload'); // Upload videos
    }

    const returnTo = req.query.returnTo || req.headers.referer || req.headers.origin || process.env.FRONTEND_URL;
    const isPopup = req.query.popup === 'true';

    const statePayload = Buffer.from(JSON.stringify({
        userId: req.user._id.toString(),
        returnTo,
        isPopup,
        service
    })).toString('base64');

    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline', // Required to get a refresh token
        prompt: 'consent',      // Force consent screen to guarantee refresh token is provided
        scope: [...new Set(scopes)],
        state: statePayload,
        include_granted_scopes: false
    });

    res.json({ url });
});

// ─────────────────────────────────────────────
// 2. HANDLE OAUTH CALLBACK
// ─────────────────────────────────────────────
router.get("/callback", async (req, res) => {
    let returnTo = null;
    try {
        await connectDB();
        const { code, state } = req.query;

        let userId;
        let connectedService = null;
        try {
            const decodedState = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
            userId = decodedState.userId;
            returnTo = decodedState.returnTo;
            connectedService = decodedState.service;
        } catch (e) {
            // Fallback for old state format (just userId)
            userId = state;
        }

        if (!returnTo) returnTo = req.headers.referer || req.headers.origin;

        const { error } = req.query;
        if (error) {
            console.error("Google OAuth Error:", error);
            if (userId) {
                const user = await User.findById(userId);
                if (user) {
                    user.metadata = user.metadata || {};
                    user.metadata.integration_errors = user.metadata.integration_errors || {};
                    user.metadata.integration_errors.google = error;
                    user.markModified('metadata');
                    await user.save();
                }
            }
            return returnTo
                ? res.redirect(`${returnTo}?integration_error=google_${error}`)
                : res.status(400).json({ error });
        }

        if (!code || !state) {
            return returnTo
                ? res.redirect(`${returnTo}?integration_error=google_missing_params`)
                : res.status(400).json({ error: "Missing code or state" });
        }

        if (!userId) {
            return res.redirect(`${returnTo}?integration_error=user_not_found`);
        }

        const oauth2Client = getOAuth2Client();
        const { tokens } = await oauth2Client.getToken(code);

        // Update the user with the tokens
        const user = await User.findById(userId);
        if (!user) {
            return res.redirect(`${returnTo}?integration_error=user_not_found`);
        }

        if (connectedService === 'youtube') {
            user.metadata = user.metadata || {};
            user.metadata.youtube_tokens = {
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expiry_date: tokens.expiry_date
            };
            user.markModified('metadata');
        } else {
            user.google_access_token = tokens.access_token;
            if (tokens.refresh_token) {
                user.google_refresh_token = tokens.refresh_token;
            }
            if (tokens.expiry_date) {
                user.google_token_expiry = new Date(tokens.expiry_date);
            }
        }

        // Fetch user profile to get their connected Google email and name
        try {
            const oauth2Client = getOAuth2Client();
            oauth2Client.setCredentials({ access_token: tokens.access_token });
            const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
            const { data: profile } = await oauth2.userinfo.get();
            if (profile.email) user.google_email = profile.email;
            if (profile.name) user.google_name = profile.name;
        } catch (e) {
            console.error("Failed to fetch Google profile:", e.message);
        }

        // Clear any previous errors on success
        user.metadata = user.metadata || {};
        if (user.metadata.integration_errors && user.metadata.integration_errors.google) {
            delete user.metadata.integration_errors.google;
        }

        // Keep track of exactly which Google services they connected
        if (connectedService) {
            user.metadata.connected_google_services = user.metadata.connected_google_services || [];
            // Map the generic 'service' name from the URL to the exact ID used in the frontend
            const serviceToIdMap = {
                'gmail': 'gmail',
                'calendar': 'gcal',
                'drive': 'gdrive',
                'classroom': 'gclass',
                'meet': 'gmeet',
                'forms': 'gforms',
                'youtube': 'youtube',
                'all': 'all'
            };
            const mappedId = serviceToIdMap[connectedService];
            if (mappedId && mappedId !== 'all' && !user.metadata.connected_google_services.includes(mappedId)) {
                user.metadata.connected_google_services.push(mappedId);
            }
        }

        user.markModified('metadata');

        await user.save();

        let isPopup = false;
        if (state) {
            try {
                const decodedState = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
                if (decodedState.isPopup) isPopup = true;
            } catch (e) { }
        }

        if (isPopup) {
            return res.send(`
                <!DOCTYPE html>
                <html><head><title>Authenticating...</title></head>
                <body style="background:#0a0a0a; color:#fff; display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif;">
                  <h2>Authenticating...</h2>
                  <script>
                    const payload = { type: 'integration_success', provider: 'google' };
                    if (window.opener) { window.opener.postMessage(payload, '*'); }
                    localStorage.setItem('integration_callback', JSON.stringify({ ...payload, timestamp: Date.now() }));
                    window.close();
                    setTimeout(() => { document.body.innerHTML = '<h2>Authentication complete. You can safely close this window.</h2>'; }, 1000);
                  </script>
                </body></html>
            `);
        }

        // Redirect back to frontend
        const redirectUrl = new URL(returnTo);
        redirectUrl.searchParams.set('integration_success', 'google');
        res.redirect(redirectUrl.toString());
    } catch (err) {
        console.error("Google Workspace Callback Error:", err);

        let isPopup = false;
        if (req.query.state) {
            try {
                const decodedState = JSON.parse(Buffer.from(req.query.state, 'base64').toString('utf8'));
                if (decodedState.isPopup) isPopup = true;
            } catch (e) { }
        }

        if (isPopup) {
            return res.send(`
                <!DOCTYPE html>
                <html><head><title>Error</title></head>
                <body style="background:#0a0a0a; color:#fff; display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif;">
                  <h2>Error authenticating.</h2>
                  <script>
                    const payload = { type: 'integration_error', provider: 'google' };
                    if (window.opener) { window.opener.postMessage(payload, '*'); }
                    localStorage.setItem('integration_callback', JSON.stringify({ ...payload, timestamp: Date.now() }));
                    window.close();
                    setTimeout(() => { document.body.innerHTML = '<h2>Authentication failed. You can safely close this window.</h2>'; }, 1000);
                  </script>
                </body></html>
            `);
        }

        if (returnTo) {
            res.redirect(`${returnTo}?integration_error=google`);
        } else {
            res.status(500).json({ error: "Google connection failed", message: err.message });
        }
    }
});

// ─────────────────────────────────────────────
// 3. DISCONNECT ACCOUNT (Clear Tokens)
// ─────────────────────────────────────────────
router.post("/disconnect", isAuthenticated, async (req, res) => {
    try {
        await connectDB();
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: "User not found" });

        const serviceToDisconnect = req.query.service; // e.g., 'gforms', 'gmail'

        if (user.metadata && Array.isArray(user.metadata.connected_google_services) && serviceToDisconnect) {
            // Remove just this specific service
            user.metadata.connected_google_services = user.metadata.connected_google_services.filter(s => s !== serviceToDisconnect);
            user.markModified('metadata');

            // If they disconnected all Google services, we should wipe the actual tokens to be safe
            if (user.metadata.connected_google_services.length === 0) {
                user.google_access_token = undefined;
                user.google_refresh_token = undefined;
                user.google_token_expiry = undefined;
            }

            if (serviceToDisconnect === 'youtube' && user.metadata.youtube_tokens) {
                user.metadata.youtube_tokens = undefined;
            }
        } else {
            // Fallback (disconnect everything) if no specific service provided
            user.google_access_token = undefined;
            user.google_refresh_token = undefined;
            user.google_token_expiry = undefined;
            if (user.metadata) {
                if (user.metadata.connected_google_services) {
                    user.metadata.connected_google_services = [];
                }
                user.metadata.youtube_tokens = undefined;
                user.markModified('metadata');
            }
        }

        await user.save();

        res.json({ success: true, message: `Disconnected ${serviceToDisconnect || 'Google account'}` });
    } catch (err) {
        console.error("Google Disconnect Error:", err);
        res.status(500).json({ message: "Failed to disconnect Google account" });
    }
});

// 3. SCHEDULE GOOGLE MEET (Teacher Only)
// ─────────────────────────────────────────────
router.post("/meet", isAuthenticated, requireRole("faculty", "org_admin"), async (req, res) => {
    try {
        await connectDB();
        const { classroomId, topic, startTime, durationMinutes } = req.body;

        // Ensure user has connected Google Calendar
        if (!req.user.google_access_token || !req.user.google_refresh_token) {
            return res.status(403).json({ message: "Google Calendar not connected. Please connect your account first." });
        }

        const classroom = await Classroom.findById(classroomId);
        if (!classroom) return res.status(404).json({ message: "Classroom not found" });

        // Setup OAuth Client with User's keys
        const oauth2Client = getOAuth2Client();
        oauth2Client.setCredentials({
            access_token: req.user.google_access_token,
            refresh_token: req.user.google_refresh_token,
            expiry_date: req.user.google_token_expiry ? req.user.google_token_expiry.getTime() : null
        });

        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        const startDate = new Date(startTime);
        const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

        // 📧 Fetch all approved student emails to add as Calendar attendees
        const { default: ClassroomMembership } = await import("../models/ClassroomMembership.js");
        const members = await ClassroomMembership.find({ classroom: classroomId, status: "approved" }).select("student").lean();
        const memberIds = members.map(m => m.student);
        const memberUsers = await User.find({ _id: { $in: memberIds } }).select("_id email pushNotifications").lean();

        // Build attendees list for Google Calendar (students get automatic phone notifications!)
        const attendees = memberUsers
            .filter(u => u.email) // Only users with valid emails
            .map(u => ({ email: u.email }));

        // Create Calendar Event with Meet link + student attendees
        const event = {
            summary: `ClassGrid Live: ${classroom.name || classroom.subject} - ${topic}`,
            description: `Live session for ${topic}\n\nJoin via ClassGrid: ${process.env.FRONTEND_URL}/classroom/${classroomId}/liveclass`,
            start: {
                dateTime: startDate.toISOString(),
                timeZone: "Asia/Kolkata",
            },
            end: {
                dateTime: endDate.toISOString(),
                timeZone: "Asia/Kolkata",
            },
            conferenceData: {
                createRequest: {
                    requestId: `cg-meet-${Date.now()}`,
                    conferenceSolutionKey: { type: "hangoutsMeet" }
                }
            },
            // 🔔 Add students as attendees — they get Google Calendar notifications on their phones!
            attendees: attendees.length > 0 ? attendees : undefined,
            // Don't send individual invite emails (Calendar handles notifications automatically)
            guestsCanModify: false,
            guestsCanInviteOthers: false,
        };

        const response = await calendar.events.insert({
            calendarId: "primary",
            resource: event,
            conferenceDataVersion: 1, // Required to generate the Meet link
            sendUpdates: "all" // Send calendar invites to all attendees
        });

        const createdEvent = response.data;
        const meetLink = createdEvent.hangoutLink;

        if (!meetLink) {
            throw new Error("Google API did not return a Meet link");
        }

        // Save to our Local Postgres Database
        const { data: meeting, error: meetError } = await supabase
            .from('meetings')
            .insert([{
                classroom_id: classroomId,
                teacher_id: req.user._id.toString(),
                provider: "google_meet",
                topic: topic,
                join_url: meetLink,
                start_time: startDate.toISOString(),
                duration: durationMinutes,
                calendar_event_id: createdEvent.id
            }])
            .select()
            .single();

        if (meetError) {
            console.error("Supabase insert error:", meetError);
            throw new Error("Failed to save meeting track in database.");
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
                        message: `A new live class "${topic}" is scheduled in ${classroom.name || 'your classroom'}. Check your Google Calendar for the invite!`,
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
            console.error("[GoogleMeet] Notification error:", notifErr.message);
        }

        res.json({ message: "Meeting scheduled", meeting: { ...meeting, _id: meeting.id } });

    } catch (err) {
        console.error("Schedule meet error:", err);
        res.status(500).json({ message: "Failed to schedule Google Meet", error: err.message });
    }
});

// ─────────────────────────────────────────────
// 4. CANCEL GOOGLE MEET
// ─────────────────────────────────────────────
router.delete("/meet/:id", isAuthenticated, requireRole("faculty", "org_admin"), async (req, res) => {
    try {
        await connectDB();
        const meetingId = req.params.id;

        // Ensure user has connected Google Calendar
        if (!req.user.google_access_token || !req.user.google_refresh_token) {
            return res.status(403).json({ message: "Google Calendar not connected. Please connect your account first." });
        }

        // Fetch the meeting to get the Google Calendar Event ID
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

        // Call Google API to delete meeting
        if (meeting.calendar_event_id) {
            const oauth2Client = getOAuth2Client();
            oauth2Client.setCredentials({
                access_token: req.user.google_access_token,
                refresh_token: req.user.google_refresh_token,
                expiry_date: req.user.google_token_expiry ? req.user.google_token_expiry.getTime() : null
            });

            const calendar = google.calendar({ version: "v3", auth: oauth2Client });

            try {
                await calendar.events.delete({
                    calendarId: "primary",
                    eventId: meeting.calendar_event_id
                });
            } catch (calError) {
                // We won't block the database deletion if Google says it's already deleted (404)
                if (calError.code !== 404) {
                    console.error("Google API deletion error:", calError);
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
        console.error("Cancel meet error:", err);
        res.status(500).json({ message: "Failed to cancel Google Meet", error: err.message });
    }
});

export default router;
