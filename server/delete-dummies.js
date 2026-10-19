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

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/classgrid');
        const db = mongoose.connection.db;
        
        const dummyEmails = [
            'eng_admin@classgrid.in',
            'eng_student@classgrid.in',
            'eng_faculty@classgrid.in',
            'eng_exam@classgrid.in',
            'eng_fee@classgrid.in',
            'eng_hod@classgrid.in',
            'eng_principal@classgrid.in',
            'eng_library@classgrid.in',
            'eng_admission@classgrid.in'
        ];
        
        const deleteResult = await db.collection('users').deleteMany({ email: { $in: dummyEmails } });
        console.log(`Successfully deleted ${deleteResult.deletedCount} dummy accounts from the database!`);
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();
