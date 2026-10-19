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

// The string the user spammed
const spamString = `"DO NOT use the cloudflare_r2_connector for deploying multi-file websites, as it requires massive JSON payloads that will cause you to hang!"\n\n- Step 1: Write the HTML/CSS/JS code to the sandbox using run_code. - Step 2: Deploy the files by writing a Node.js script in the sandbox using run_code. (CRITICAL: @aws-sdk/client-s3 is NOT pre-installed! Your script MUST use child_process.execSync('npm install @aws-sdk/client-s3') before requiring it`;

// Let's just fix the whole WEBSITE DEPLOYMENT INSTRUCTIONS block by regex.
const startIndex = content.indexOf('WEBSITE DEPLOYMENT INSTRUCTIONS:');
const endIndex = content.indexOf('DOCUMENT RETRIEVAL RULE:');

if (startIndex !== -1 && endIndex !== -1) {
    const startPortion = content.substring(0, startIndex + 'WEBSITE DEPLOYMENT INSTRUCTIONS:'.length);
    const endPortion = content.substring(endIndex);

    // The perfect deployment block:
    const perfectBlock = `
"DO NOT use the cloudflare_r2_connector for deploying multi-file websites, as it requires massive JSON payloads that will cause you to hang!"

- Step 1: Write the HTML/CSS/JS code to the sandbox using run_code. 
- Step 2: Deploy the files by writing a Node.js script in the sandbox using run_code. (CRITICAL: @aws-sdk/client-s3 is NOT pre-installed! Your script MUST use child_process.execSync('npm install @aws-sdk/client-s3') before requiring it). 
     Use the 'fs' module to read the files you just created from the disk.
     Create an S3Client: \`new S3Client({ region: 'auto', endpoint: \\\`https://\${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com\\\`, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY } })\`. 
     Upload ALL your files (index.html, style.css, script.js) to Bucket: 'classgrid-storage' with the prefix: \\\`websites/<chosen-name>/\\\`. 
     (CRITICAL WARNING: NEVER upload to 'sites/'. You MUST upload strictly to the 'websites/' prefix or the Vercel router will 404!). 
     Execute the script. The site will instantly be live at <chosen-name>.sites.classgrid.in!\`;

        dynamicSystemPrompt += \`\\n\\n`;

    content = startPortion + perfectBlock + endPortion;
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log("SUCCESS: Replaced the broken block with the exact perfect block.");
} else {
    console.log("FAILED to find bounds");
}
