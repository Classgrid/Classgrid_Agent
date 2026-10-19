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
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PlatformTransaction from './src/models/PlatformTransaction.js';
import PaymentFailure from './src/models/PaymentFailure.js';

dotenv.config();

const MONGODB_URI = process.env.MONGO_URI;

mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
}).then(async () => {
    console.log("Connected to MongoDB. Deleting all backend transactions and failed payments...");

    const txRes = await PlatformTransaction.deleteMany({});
    console.log(`Deleted ${txRes.deletedCount} transactions from PlatformTransaction collection.`);

    const failRes = await PaymentFailure.deleteMany({});
    console.log(`Deleted ${failRes.deletedCount} failed payments from PaymentFailure collection.`);

    console.log("Deletion complete.");
    process.exit(0);
}).catch(err => {
    console.error("Database connection failed", err);
    process.exit(1);
});
