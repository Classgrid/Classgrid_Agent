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
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, 'server/.env') });

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const AiUsageLog = (await import('../../server/src/models/AiUsageLog.js')).default;
    const logs = await AiUsageLog.find({ promptTokens: 0, totalTokens: { $gt: 0 } });
    console.log('Found logs with 0 prompt but >0 total:', logs.length);
    
    let updated = 0;
    for (let log of logs) {
        // approximate 20% prompt, 80% completion for historical data
        let pTokens = Math.floor(log.totalTokens * 0.2);
        let cTokens = log.totalTokens - pTokens;
        
        log.promptTokens = pTokens;
        log.completionTokens = cTokens;
        await log.save();
        updated++;
    }
    console.log('Updated:', updated);
    process.exit(0);
}).catch(console.error);
