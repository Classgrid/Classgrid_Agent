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

async function createInstitutionTicket() {
    try {
        await mongoose.connect('mongodb://classgrid-admin:27iwqvVnbpqq6RD5@ac-hs4letd-shard-00-00.sa5ww0z.mongodb.net:27017,ac-hs4letd-shard-00-01.sa5ww0z.mongodb.net:27017,ac-hs4letd-shard-00-02.sa5ww0z.mongodb.net:27017/classgrid?ssl=true&replicaSet=atlas-t4g7k9-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Classgrid');
        
        const User = (await import('./src/models/User.js')).default;
        const SupportTicket = (await import('./src/models/SupportTicket.js')).default;
        const SupportConversation = (await import('./src/models/SupportConversation.js')).default;
        
        // Find Neha
        const nehaUser = await User.findOne({ name: { $regex: /neha shar/i } });
        if (!nehaUser) {
            console.log("Neha Sharma not found.");
            process.exit(1);
        }
        
        console.log("Found User:", nehaUser.name, "ID:", nehaUser._id);
        
        // Clean up the wrong SupportTicket we created previously
        const deleteResult = await SupportTicket.deleteMany({ submittedBy: nehaUser._id });
        console.log(`Deleted ${deleteResult.deletedCount} wrong Classgrid Talk ticket(s).`);

        // Create the correct SupportConversation (Institution ticket)
        const conversation = new SupportConversation({
            organization_id: nehaUser.organization_id,
            createdBy: nehaUser._id,
            subject: "Help needed with institution features",
            department: "general",
            status: "open",
            priority: "normal",
            participants: [nehaUser._id],
            unreadForSuperAdmin: 1,
            messages: [{
                sender: nehaUser._id,
                senderRole: "org_admin",
                body: "Hi, I am having trouble accessing some of my institution dashboard features."
            }]
        });
        
        await conversation.save();
        console.log("Successfully created SupportConversation (Institution Ticket) for", nehaUser.name);
        console.log("Conversation ID:", conversation._id.toString());

    } catch (e) {
        console.error("Error creating institution ticket:", e);
    } finally {
        process.exit(0);
    }
}

createInstitutionTicket();
