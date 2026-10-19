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
const file = path.join(__dirname, 'src', 'services', 'email-templates.service.js');
let content = fs.readFileSync(file, 'utf8');

// Replace the HTML paragraph wrapping the text
content = content.replace(/<p[^>]*>\s*Need help\? Raise a ticket on our Support Portal:?\s*(<a[^>]*>[^<]*<\/a>|https:\/\/classgrid\.in\/support)\.?\s*<\/p>/gi, '');

// Replace any bare text occurrences
content = content.replace(/Need help\? Raise a ticket on our Support Portal:?\s*(<a[^>]*>[^<]*<\/a>|https:\/\/classgrid\.in\/support)/gi, '');

// One more fallback for just the prefix
content = content.replace(/Need help\? Raise a ticket on our Support Portal:?/gi, '');

fs.writeFileSync(file, content);
console.log('Removed Raise a Ticket text from email-templates.service.js');
