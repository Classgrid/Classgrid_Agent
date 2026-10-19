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
const mongoose = require('mongoose');

mongoose.connect('mongodb://classgrid-admin:27iwqvVnbpqq6RD5@ac-hs4letd-shard-00-00.sa5ww0z.mongodb.net:27017,ac-hs4letd-shard-00-01.sa5ww0z.mongodb.net:27017,ac-hs4letd-shard-00-02.sa5ww0z.mongodb.net:27017/classgrid?ssl=true&replicaSet=atlas-t4g7k9-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Classgrid')
.then(async () => {
    try {
        const DemoRequest = (await import('./src/models/DemoRequest.js')).default;
        
        // Find PCCOE Demo Request (Suvarna Patil)
        const pccoeLead = await DemoRequest.findOne({ institutionName: { $regex: 'pccoe', $options: 'i' }, adminName: { $regex: 'suvarna', $options: 'i' } });
        
        if (!pccoeLead) {
            console.log("Could not find PCCOE request for Suvarna Patil.");
            process.exit(1);
        }

        // Set to Aug 16, 2026, 7:00 PM IST
        // 7 PM IST = 19:00 IST = 13:30 UTC
        const scheduledDate = new Date("2026-08-16T13:30:00.000Z");

        pccoeLead.status = "demo_scheduled";
        pccoeLead.provider = "zoom";
        pccoeLead.scheduledAt = scheduledDate;
        pccoeLead.meetingUrl = "https://zoom.us/j/1234567890?pwd=placeholder";
        pccoeLead.timezone = "Asia/Kolkata";
        
        // As per the marketing route scheme
        pccoeLead.meetingStatus = "scheduled";
        pccoeLead.meetingProvider = "zoom";
        pccoeLead.meetingScheduledAt = scheduledDate;
        
        await pccoeLead.save();

        console.log("Successfully scheduled demo meeting for PCCOE (Suvarna Patil):", {
            scheduledAt: pccoeLead.scheduledAt,
            status: pccoeLead.status,
            meetingUrl: pccoeLead.meetingUrl
        });
    } catch (e) {
        console.error("Error:", e);
    }
    process.exit(0);
});
