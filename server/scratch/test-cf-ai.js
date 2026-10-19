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

async function test() {
    const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const cfToken = process.env.CLOUDFLARE_WORKERS_AI_TOKEN;
    const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`;
    
    try {
        console.log("Sending request to:", cfUrl);
        const imageRes = await fetch(cfUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${cfToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt: "a boy" })
        });
        
        console.log("Status:", imageRes.status);
        console.log("Headers:", imageRes.headers.get('content-type'));
        
        if (imageRes.headers.get('content-type')?.includes('application/json')) {
            const json = await imageRes.json();
            console.log("Response JSON:", JSON.stringify(json).substring(0, 500));
        } else {
            console.log("Received binary data.");
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

test();
