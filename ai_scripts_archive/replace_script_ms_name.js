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
let code = fs.readFileSync('server/src/controllers/ai-chat.controller.js', 'utf8');

const target = "const msEmail = latestUser.microsoft_email ? `(Connected as: ${latestUser.microsoft_email}) ` : '';";
const replacement = "const msName = latestUser.microsoft_name ? ` (Name: ${latestUser.microsoft_name})` : '';\n                        const msEmail = latestUser.microsoft_email ? `(Connected as: ${latestUser.microsoft_email}${msName}) ` : '';";

const target2 = "CRITICAL: You must NEVER hallucinate, guess, or shorten the user's connected Microsoft email address. You must strictly use the exact email address provided above.";
const replacement2 = "CRITICAL: You must NEVER hallucinate, guess, or shorten the user's connected Microsoft email address or Name. You must strictly use the exact email address and Name provided above. When addressing the user regarding Microsoft, use their Microsoft Name, do NOT just say their email address.";

if (code.includes(target) && code.includes(target2)) {
    code = code.replace(target, replacement);
    code = code.replace(target2, replacement2);
    fs.writeFileSync('server/src/controllers/ai-chat.controller.js', code);
    console.log('REPLACED');
} else {
    console.log('NOT FOUND');
}
