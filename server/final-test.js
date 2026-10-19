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
    console.log("Fetching all models...");
    
    const fRes = await fetch("https://bedrock.us-east-1.amazonaws.com/foundation-models", {
        headers: { "x-api-key": key, "Authorization": `Bearer ${key}` }
    });
    const fData = await fRes.json();
    const models = fData.modelSummaries.map(m => m.modelId);
    
    console.log(`Found ${models.length} total models. Testing which ones return 200 OK...`);
    
    const realEligible = [];
    
    for (const m of models) {
        try {
            const res = await fetch(`https://bedrock-runtime.us-east-1.amazonaws.com/model/${m}/converse`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-api-key": key, "Authorization": `Bearer ${key}` },
                body: JSON.stringify({ messages: [{ role: "user", content: [{ text: "hi" }] }] })
            });
            if (res.ok) {
                realEligible.push(m);
                console.log(`✅ ELIGIBLE: ${m}`);
            }
        } catch (e) { }
    }
    
    console.log("\n--- FINAL LIST ---");
    realEligible.forEach(m => console.log(m));
}
main();
