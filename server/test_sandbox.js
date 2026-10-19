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
async function testSandbox() {
    const sandboxUrl = 'https://autumn-sky-3042.nikhil-shinde-6b9.workers.dev';
    
    console.log("Testing Cloudflare Sandbox Execution...");
    try {
        const response = await fetch(sandboxUrl, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer classgrid-super-secret-key-2026'
            },
            body: JSON.stringify({ 
                action: 'run_code', 
                language: 'python', 
                code: 'print("Testing 123... The AI Sandbox is ALIVE!")' 
            })
        });
        
        const result = await response.json();
        console.log("Sandbox Response:");
        console.log(result);
    } catch (e) {
        console.error("Test failed:", e);
    }
}

testSandbox();
