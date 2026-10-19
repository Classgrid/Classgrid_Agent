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
const file = 'c:/CLASSGRIDPLATFORM/classgrid_platoform-desktop-/client/src/features/superadmin/pages/AiUsageDashboardPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace {formatNumber(row.remaining)} / {formatNumber(row.granted)}
// with {formatNumber(row.used)} / {formatNumber(row.granted)}

content = content.replace(
  /\{formatNumber\(row\.remaining\)\}\s*\/\s*\{formatNumber\(row\.granted\)\}/g,
  `{formatNumber(row.used)} / {formatNumber(row.granted)}`
);

fs.writeFileSync(file, content);
console.log("Updated active granted credits display format.");
