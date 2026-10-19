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
let content = fs.readFileSync('server/src/controllers/super-admin/ai-credits-admin.controller.js', 'utf8');

const regex = /let\s*expireDateStr\s*=\s*"No expiration";\s*if\s*\(endDate\)\s*\{\s*const\s*d\s*=\s*new\s*Date\(endDate\);\s*expireDateStr\s*=\s*d\.toLocaleDateString\('en-US',\s*\{\s*month:\s*'short',\s*day:\s*'numeric',\s*year:\s*'numeric'\s*\}\);\s*\}/g;

const replacement = `const d = new Date(endDate);
                const expireDateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });`;

content = content.replace(regex, replacement);
fs.writeFileSync('server/src/controllers/super-admin/ai-credits-admin.controller.js', content);
console.log("Replaced email expiration strings.");
