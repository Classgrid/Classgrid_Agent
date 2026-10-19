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
let content = fs.readFileSync('client/src/features/superadmin/pages/LeadDetailsPage.tsx', 'utf8');

content = content.replace(
  "window.open(`/superadmin/detail/${provisionedData?.orgId || provisionedData?.orgName || 'unknown'}`, '_self')",
  "window.open(`/superadmin/detail/${lead?.provisionedOrganizationId || provisionedData?.orgId || provisionedData?.orgName || 'unknown'}`, '_self')"
);

fs.writeFileSync('client/src/features/superadmin/pages/LeadDetailsPage.tsx', content, 'utf8');
console.log('Fixed View Organization Details link');
