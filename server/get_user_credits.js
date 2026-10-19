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
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: "./server/.env" });

async function checkUser() {
    await mongoose.connect(process.env.MONGODB_URI);
    const AiCreditTransaction = (await import("./server/src/models/AiCreditTransaction.js")).default;
    const User = (await import("./server/src/models/User.js")).default;
    
    // get the latest topup
    const txn = await AiCreditTransaction.findOne().sort({ createdAt: -1 }).lean();
    console.log("Latest Txn:", txn);
    
    if (txn) {
        const user = await User.findById(txn.userId).lean();
        console.log("User Tokens:", user.ai_tokens);
    }
    
    process.exit(0);
}

checkUser().catch(console.error);
