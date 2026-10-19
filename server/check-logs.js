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
import 'dotenv/config';
import mongoose from 'mongoose';
import AiUsageLog from './src/models/AiUsageLog.js';

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Get all logs for today
    const logs = await AiUsageLog.find({}).sort({createdAt: 1});
    console.log('Total Logs in DB:', logs.length);
    
    if(logs.length > 0) {
        console.log('First Log Ever:', logs[0].createdAt);
        console.log('Last Log Ever:', logs[logs.length-1].createdAt);
        
        // Let's filter for just Oct 2
        const oct2Logs = logs.filter(l => new Date(l.createdAt).getTime() >= new Date('2026-10-01T18:30:00Z').getTime());
        console.log('--- OCT 2 LOGS ---');
        console.log('Count:', oct2Logs.length);
        if (oct2Logs.length > 0) {
            console.log('First Log (Oct 2):', oct2Logs[0].createdAt);
            console.log('Last Log (Oct 2):', oct2Logs[oct2Logs.length-1].createdAt);
            
            const totalTokens = oct2Logs.reduce((sum, log) => sum + log.totalTokens, 0);
            console.log('Total Tokens (Oct 2):', totalTokens);
        }
    }
    
    process.exit(0);
}

run().catch(console.error);
