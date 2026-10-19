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
import { config } from 'dotenv';
config();

import { handleToolCall } from './src/mcp/tools.js';

async function testSandbox() {
    console.log("🚀 Demonstrating Sandbox Environment Variable Access...");

    const pythonCode = `
import os
print("=== LIVE SANDBOX DEMONSTRATION ===")
print("Can I access the MongoDB URI?", os.environ.get("MONGO_URI", "NOT FOUND")[:30] + "...")
print("Can I access the Razorpay Secret?", os.environ.get("RAZORPAY_KEY_SECRET", "NOT FOUND")[:5] + "...")
print("Can I access the AWS SES Password?", os.environ.get("AWS_SES_SMTP_PASS", "NOT FOUND")[:5] + "...")
print("==================================")
`;

    const result = await handleToolCall('run_code', {
        language: 'python',
        code: pythonCode
    }, {
        sessionId: 'demo-test-123',
        userEmail: 'demo@classgrid.in'
    });

    console.log("\n✅ RESULT FROM SANDBOX:");
    console.log(result.content[0].text);
}

testSandbox().catch(console.error);
