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
async function triggerLiveAPI() {
    const leadId = "6a61f6a2f8b7d5e04ecbddec"; // PCCOE Suvarna Patil
    try {
        const res = await fetch(`https://classgrid.in/api/request-demo/${leadId}/meeting-booked`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `demo_session=${leadId}`
            },
            body: JSON.stringify({
                scheduledAt: "2026-08-16T13:30:00.000Z", // Aug 16 at 7 PM IST
                platform: "google_meet"
            })
        });

        const data = await res.json();
        console.log("Live API Response:", data);
    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

triggerLiveAPI();
