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
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    const key = process.env.BEDROCK_API_KEY;
    const modelId = "us.anthropic.claude-3-5-sonnet-20241022-v2:0";
    
    console.log("Testing with x-api-key on model:", modelId);
    
    try {
        const res = await fetch(`https://bedrock-runtime.us-east-1.amazonaws.com/model/${modelId}/converse`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": key
            },
            body: JSON.stringify({
                messages: [{ role: "user", content: [{ text: "hi" }] }]
            })
        });
        
        const text = await res.text();
        console.log("Status:", res.status);
        console.log("Response:", text);
    } catch (e) {
        console.error(e);
    }
}
main();
