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
const files = [
    'server/src/services/domain-change-email.service.js',
    'server/test_custom_domain_direct.cjs'
];

files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    content = content.replace(/\\\$\{/g, '${');
    content = content.replace(/\\\`/g, '`'); // also fix escaped backticks if any
    fs.writeFileSync(f, content);
    console.log("Fixed " + f);
});
