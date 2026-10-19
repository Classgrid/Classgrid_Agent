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
const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'src/controllers/ai-chat.controller.js');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Add encode import
if (!content.includes("gpt-tokenizer")) {
    content = content.replace(
        'import mongoose from "mongoose";',
        'import { encode } from "gpt-tokenizer";\nimport { triggerMemoryAgent } from "../services/ai-chat.service.js";\nimport mongoose from "mongoose";'
    );
}

// 2. Add triggerMemoryAgent to streamAskAi
if (!content.includes("triggerMemoryAgent(sessionId, messages)")) {
    content = content.replace(
        'const aiStream = await streamText({',
        'triggerMemoryAgent(sessionId, messages).catch(err => console.error("Memory agent trigger error:", err));\n\n            const aiStream = await streamText({'
    );
}
// Do the same for streamExecuteAgentTask
if (!content.includes("triggerMemoryAgent(sessionId, agentContext)")) {
    content = content.replace(
        'const agentStream = await streamText({',
        'triggerMemoryAgent(sessionId, agentContext).catch(err => console.error("Memory agent trigger error:", err));\n\n            const agentStream = await streamText({'
    );
}

// 3. Fix the deployment string precisely!
const startIndex = content.indexOf('WEBSITE DEPLOYMENT INSTRUCTIONS:');
const endIndex = content.indexOf('DOCUMENT RETRIEVAL RULE:');

if (startIndex !== -1 && endIndex !== -1) {
    const startPortion = content.substring(0, startIndex + 'WEBSITE DEPLOYMENT INSTRUCTIONS:\\n'.length);
    const endPortion = content.substring(endIndex);

    const perfectBlock = `"DO NOT use the cloudflare_r2_connector for deploying multi-file websites, as it requires massive JSON payloads that will cause you to hang!"

- Step 1: Write the HTML/CSS/JS code to the sandbox using run_code. - Step 2: Deploy the files by writing a Node.js script in the sandbox using run_code. (CRITICAL: @aws-sdk/client-s3 is NOT pre-installed! Your script MUST use child_process.execSync('npm install @aws-sdk/client-s3') before requiring it)\`;

        dynamicSystemPrompt += \`\\n\\n`;

    content = startPortion + perfectBlock + endPortion;
}

fs.writeFileSync(targetFile, content, 'utf8');
console.log("SUCCESS: Re-added all missing logic and perfect deployment block.");
