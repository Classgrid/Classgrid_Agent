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

async function createAndBookDemo() {
    try {
        await mongoose.connect('mongodb://classgrid-admin:27iwqvVnbpqq6RD5@ac-hs4letd-shard-00-00.sa5ww0z.mongodb.net:27017,ac-hs4letd-shard-00-01.sa5ww0z.mongodb.net:27017,ac-hs4letd-shard-00-02.sa5ww0z.mongodb.net:27017/classgrid?ssl=true&replicaSet=atlas-t4g7k9-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Classgrid');
        
        const DemoRequest = (await import('./src/models/DemoRequest.js')).default;
        
        // 1. Create a dummy demo request in MongoDB to get a valid lead ID
        const lead = new DemoRequest({
            institutionName: "Dummy Test Institute",
            orgType: "other",
            adminName: "Test User",
            adminEmail: "test@example.com",
            adminPhone: "1234567890",
            state: "MH",
            district: "Pune",
            taluka: "Haveli",
            cityVillage: "Pune",
            city: "Pune",
            status: "new",
            isEmailVerified: true // Important: skip OTP verification
        });
        
        await lead.save();
        console.log("Created temp lead ID:", lead._id.toString());

        // 2. Hit the live production API to generate the meeting URL
        const res = await fetch(`https://classgrid.in/api/request-demo/${lead._id.toString()}/meeting-booked`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `demo_session=${lead._id.toString()}`
            },
            body: JSON.stringify({
                scheduledAt: "2026-08-16T13:30:00.000Z", // Aug 16 at 7 PM IST
                platform: "google_meet"
            })
        });

        const data = await res.json();
        
        if (data.ok) {
            console.log("Successfully generated Meeting URL:", data.meetingUrl);
        } else {
            console.log("Live API Response Error:", data);
        }
        
    } catch (e) {
        console.error("Error:", e);
    } finally {
        process.exit(0);
    }
}

createAndBookDemo();
