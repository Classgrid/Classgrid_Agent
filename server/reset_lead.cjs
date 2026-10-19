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

async function resetLead() {
    try {
        await mongoose.connect('mongodb://classgrid-admin:27iwqvVnbpqq6RD5@ac-hs4letd-shard-00-00.sa5ww0z.mongodb.net:27017,ac-hs4letd-shard-00-01.sa5ww0z.mongodb.net:27017,ac-hs4letd-shard-00-02.sa5ww0z.mongodb.net:27017/classgrid?ssl=true&replicaSet=atlas-t4g7k9-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Classgrid');
        
        const DemoRequest = (await import('./src/models/DemoRequest.js')).default;
        const leadId = "6a61f6a2f8b7d5e04ecbddec";
        
        const lead = await DemoRequest.findById(leadId);
        if (lead) {
            lead.status = "new"; // Reset status so we can schedule again
            lead.meetingStatus = null;
            lead.meetingProvider = null;
            lead.meetingScheduledAt = null;
            lead.meetingUrl = null;
            await lead.save();
            console.log("Lead reset successfully.");
        } else {
            console.log("Lead not found.");
        }
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

resetLead();
