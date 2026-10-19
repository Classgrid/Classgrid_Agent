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
async function testZoom() {
    const clientId = '9BKEEoJFSImAH_H7WdSL3g';
    const clientSecret = 'YyMmH5AoFfOymmrN1jXbVFNPbNJlU2zw';

    try {
        const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const tokenRes = await fetch(`https://zoom.us/oauth/token?grant_type=client_credentials`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${authHeader}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        
        const tokenData = await tokenRes.json();
        
        const meetingRes = await fetch("https://api.zoom.us/v2/users/me/meetings", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${tokenData.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              topic: `Test Meeting`,
              type: 2,
              start_time: "2026-08-16T13:30:00Z",
              duration: 30,
              timezone: "Asia/Kolkata"
            }),
          });
          const meetingData = await meetingRes.json();
          console.log("Meeting Response:", meetingData);

    } catch (e) {
        console.error(e);
    }
}

testZoom();
