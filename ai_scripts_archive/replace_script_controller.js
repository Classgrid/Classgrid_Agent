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

const target = "whatsappConnected = !!(process.env.WHATSAPP_PHONE_ID && process.env.WHATSAPP_ACCESS_TOKEN);";
const replacement = "whatsappConnected = connectedMcps.includes('whatsapp');";

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('server/src/controllers/ai-chat.controller.js', code);
    console.log('REPLACED');
} else {
    console.log('NOT FOUND');
}
