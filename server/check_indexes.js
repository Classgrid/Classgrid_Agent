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
        await mongoose.connect(process.env.MONGO_URI);
        const AiCreditTransaction = (await import('./src/models/AiCreditTransaction.js')).default;
        
        const indexes = await AiCreditTransaction.collection.indexes();
        console.log("Indexes:");
        console.dir(indexes, { depth: null });
        
        const duplicates = await AiCreditTransaction.find({ type: "topup" }).sort({ createdAt: -1 }).limit(10);
        console.log("Recent Top-Ups:");
        duplicates.forEach(d => console.log(d._id, d.razorpay_payment_id, d.amount_inr, d.createdAt));
        
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
