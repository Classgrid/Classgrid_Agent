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

const path = 'server/src/routes/razorpay-webhook.routes.js';
let content = fs.readFileSync(path, 'utf8');

const startTag = '// ── FRAUD DETECTION LAYER ──';
const endTag = 'console.error("[Fraud Engine] Error during fraud check:", fraudErr.message);\n                }';

// Let's just find the start of the block and the next section start
const startIndex = content.indexOf(startTag);
if (startIndex !== -1) {
    const nextSectionStart = content.indexOf('// ── Platform SaaS Payment ──', startIndex);
    if (nextSectionStart !== -1) {
        content = content.substring(0, startIndex) + content.substring(nextSectionStart);
        fs.writeFileSync(path, content, 'utf8');
        console.log("Successfully removed fraud detection block using next section start.");
    } else {
        console.log("Could not find the start of the next section.");
    }
} else {
    console.log("Could not find the start of the fraud detection block.");
}
