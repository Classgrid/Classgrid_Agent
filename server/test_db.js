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
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const AiCreditTransaction = (await import('./server/src/models/AiCreditTransaction.js')).default;
        const User = (await import('./server/src/models/User.js')).default;
        
        const latestTxn = await AiCreditTransaction.findOne({ type: 'topup' }).sort({ createdAt: -1 });
        if (!latestTxn) {
            console.log("No topup transactions found");
            process.exit(0);
        }
        
        console.log("Latest Txn userId:", latestTxn.userId);
        
        const user = await User.findById(latestTxn.userId);
        console.log("User AI Tokens:");
        console.dir(user?.ai_tokens, { depth: null });
        
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
