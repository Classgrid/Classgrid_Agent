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

const filePath = path.join(__dirname, 'src/controllers/ai-chat.controller.js');
let content = fs.readFileSync(filePath, 'utf8');
content = content.replace(/\r\n/g, '\n');

const startMarker = 'WEBSITE DEPLOYMENT INSTRUCTIONS:';
const endMarker = "sites.classgrid.in!`;";

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker, startIdx);

if (startIdx === -1 || endIdx === -1) {
    console.log("FAILED: Could not find markers. start:", startIdx, "end:", endIdx);
    process.exit(1);
}

let lineStart = content.lastIndexOf('dynamicSystemPrompt +=', startIdx);
const fullEnd = endIdx + endMarker.length;

console.log("Found block from index", lineStart, "to", fullEnd);
console.log("OLD RULE:");
console.log(content.substring(lineStart, fullEnd));
console.log("\n---\n");

const newRule = `dynamicSystemPrompt += \`\\n\\nWEBSITE DEPLOYMENT INSTRUCTIONS:
**IMPORTANT: YOU ONLY BUILD VANILLA HTML/CSS/JS SITES! DO NOT BUILD REACT OR NEXT.JS OR USE BUILD STEPS!**
**SPEED IS CRITICAL**: You MUST call the \\\`run_code\\\` tool IMMEDIATELY. Do NOT spend time planning or thinking. Start writing code to the sandbox RIGHT AWAY.
**SPLIT FILES**: ALWAYS create 3 SEPARATE small files: \\\`index.html\\\` (structure only, link to style.css and script.js), \\\`style.css\\\` (all styles), and \\\`script.js\\\` (all logic). Write each file in a SEPARATE \\\`run_code\\\` call. NEVER put everything in one giant HTML file!

When the user asks you to build or host a website, you must FIRST ask them two things (using your interactive question component tool, do NOT just ask in plain text):
1. Do they want to deploy to their own personal GitHub/Vercel OR host it instantly on Classgrid cloud?
2. What subdomain/name do they want for their site? (e.g., 'my-cool-site')

1. If they choose Personal, set isClassgridManaged: false when calling github_workspace_connector and vercel_connector. Remember to set isPrivate: false when creating the repo. When giving the live URL to the user, ALWAYS give them the primary project URL (e.g., https://<project-name>.vercel.app), NEVER give the specific commit deployment URL!
2. If they choose Classgrid, DO NOT use github_workspace_connector or vercel_connector. Deploy using a Node.js script in the sandbox:
   - Step 1: Use run_code to write all your HTML/CSS/JS files to the sandbox (e.g. /data/index.html, /data/style.css, /data/script.js).
   - Step 2: Use run_code to write a deploy.js script. Your deploy.js MUST:
     a) Install the SDK first: require('child_process').execSync('npm install @aws-sdk/client-s3');
     b) Connect to Cloudflare R2 (NOT regular AWS S3!) using this exact code:
        const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
        const s3Client = new S3Client({ region: 'auto', endpoint: \\\`https://\\\${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com\\\`, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY } });
     c) Read each file from disk using fs.readFileSync and upload with PutObjectCommand to Bucket: 'classgrid-storage' with Key prefix: 'websites/<chosen-name>/' (e.g. 'websites/my-portfolio/index.html').
     d) CRITICAL WARNING: NEVER upload to the 'sites/' prefix. You MUST upload strictly to the 'websites/' prefix or the Vercel router will 404!
   - Step 3: Run the script via execute_terminal_command: node /data/deploy.js
   - The site will instantly be live at <chosen-name>.sites.classgrid.in!\`;`;

content = content.substring(0, lineStart) + newRule + content.substring(fullEnd);
fs.writeFileSync(filePath, content, 'utf8');
console.log("SUCCESS: Restored ALL 6 missing deployment instructions + R2 connection code!");
