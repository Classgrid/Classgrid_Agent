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
const env = fs.readFileSync('.env', 'utf8');
const match = env.match(/AGENT_SSH_KEY="(.*?)"/s);
if (match) {
    const key = match[1].replace(/\\n/g, '\n');
    fs.writeFileSync('sandbox.pem', key);
    console.log('Wrote sandbox.pem');
} else {
    console.log('AGENT_SSH_KEY not found in .env');
}
