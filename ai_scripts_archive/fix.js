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
const file = 'c:/CLASSGRIDPLATFORM/classgrid_platoform-desktop-/server/src/controllers/ai-chat.controller.js';
let lines = fs.readFileSync(file, 'utf-8').split('\n');
lines[1087] = "                        activeDescriptions.push(`- **Vercel & Website Deployment**: ✓ CONNECTED. ${vercelEmail}\\n  **HOW TO DEPLOY WEBSITES (CRITICAL)**:\\n  1. **Instant Cloudflare R2 (Preferred)**: If the user asks to build and host a website, use the \\`cloudflare_r2_connector\\` with operation \\`upload_website\\`. Generate a unique \\`siteId\\` (e.g. \\`school-demo-123\\`). It instantly goes live at https://<siteId>.sites.classgrid.in!\\n  2. **GitHub + Vercel (Advanced)**: For full apps (Next.js, etc), use \\`github_workspace_connector\\` to create repo/push code, then use \\`vercel_connector\\` (operation \\`create_project\\`) to link and deploy it. Set \\`isClassgridManaged: true\\` for both to use the master Classgrid accounts!`);";
fs.writeFileSync(file, lines.join('\n'), 'utf-8');
console.log('Replaced successfully');
