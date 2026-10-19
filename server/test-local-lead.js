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
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: "./server/.env" });

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || "mongodb+srv://classgrid:UeE6B0K8R5b5WwG8@cluster0.e6t1l.mongodb.net/classgrid?retryWrites=true&w=majority&appName=Cluster0");
        console.log("Connected to MongoDB.");

        const DemoRequest = (await import("./server/src/models/DemoRequest.js")).default;
        
        // Find latest demo lead
        const lead = await DemoRequest.findOne().sort({ createdAt: -1 });
        if (!lead) {
            console.log("No leads found.");
            process.exit(0);
        }

        console.log("Latest lead status:", lead.status, "meetingStatus:", lead.meetingStatus, "assignedTo:", lead.assignedTo);
        
        // Simulate assign
        lead.assignedTo = new mongoose.Types.ObjectId();
        if (lead.status === "new" || lead.status === "pending") {
            lead.status = "contacted";
        }
        await lead.save();
        console.log("After assign - status:", lead.status, "assignedTo:", lead.assignedTo);

        // Simulate reschedule
        lead.meetingStatus = "rescheduled";
        lead.assignedTo = null;
        await lead.save();
        console.log("After reschedule - meetingStatus:", lead.meetingStatus, "assignedTo:", lead.assignedTo);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
