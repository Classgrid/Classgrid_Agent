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
import fs from 'fs';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

async function testWhisper() {
    try {
        const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
        const cfToken = process.env.CLOUDFLARE_WORKERS_AI_TOKEN;
        
        // Use the exact model the user mentioned
        const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/@cf/openai/whisper`;
        
        const testAudio = fs.readFileSync('scratch/test.mp3');
        const audioBytes = Array.from(testAudio.slice(0, 1024 * 1024)); // raw bytes

        const response = await fetch(cfUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${cfToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ audio: audioBytes })
        });
        
        console.log("Status with JSON Array:", response.status);
        console.log("Response with JSON Array:", await response.text());

    } catch (err) {
        console.error(err);
    }
}
testWhisper();
