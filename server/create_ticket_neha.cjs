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

async function createTicket() {
    try {
        await mongoose.connect('mongodb://classgrid-admin:27iwqvVnbpqq6RD5@ac-hs4letd-shard-00-00.sa5ww0z.mongodb.net:27017,ac-hs4letd-shard-00-01.sa5ww0z.mongodb.net:27017,ac-hs4letd-shard-00-02.sa5ww0z.mongodb.net:27017/classgrid?ssl=true&replicaSet=atlas-t4g7k9-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Classgrid');
        
        const SupportTicket = (await import('./src/models/SupportTicket.js')).default;
        
        const ticket = new SupportTicket({
            subject: "Help needed with platform access",
            message: "Hi, I am unable to access certain admin features. Can you please check my permissions?",
            category: "general",
            priority: "medium",
            status: "open",
            submitterName: "Neha Sharma",
            submitterEmail: "neha.sharma@example.com",
            submitterRole: "admin",
            institution: "Classgrid Demo School"
        });
        
        await ticket.save();
        console.log("Successfully created ticket for Neha Sharma (admin)!");
        console.log("Ticket ID:", ticket._id.toString());

    } catch (e) {
        console.error("Error creating ticket:", e);
    } finally {
        process.exit(0);
    }
}

createTicket();
