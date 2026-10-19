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
const { google } = require('googleapis');
const env = require('dotenv').config({ path: 'c:\\classgrid_marketting\\Classgrid_marketting\\.env.local' });

async function createMeet() {
    try {
        const credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        
        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/calendar.events']
        });

        const calendar = google.calendar({ version: 'v3', auth });

        const event = {
            summary: 'Classgrid Demo (Generated via Service Account)',
            start: { dateTime: '2026-08-16T13:30:00Z', timeZone: 'Asia/Kolkata' },
            end: { dateTime: '2026-08-16T14:00:00Z', timeZone: 'Asia/Kolkata' },
            conferenceData: {
                createRequest: {
                    requestId: `test-${Date.now()}`,
                    conferenceSolutionKey: { type: 'hangoutsMeet' }
                }
            }
        };

        const res = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
            conferenceDataVersion: 1
        });

        console.log("Meet URL:", res.data.hangoutLink);
    } catch (e) {
        console.error("Error creating Meet:", e.message);
    }
}

createMeet();
