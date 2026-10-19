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
  'className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mb-2"',
  'className="w-full mb-2" variant="primary"'
);

content = content.replace(
  'className="w-full text-emerald-700 border-emerald-200 hover:bg-emerald-100"',
  'className="w-full"'
);

content = content.replace(
  '{regenerateMutation.isPending ? "Generating..." : "Generate New Activation Link"}',
  '{regenerateMutation.isPending ? "Sending..." : "Resend Activation Link"}'
);

fs.writeFileSync('client/src/features/superadmin/pages/LeadDetailsPage.tsx', content, 'utf8');
console.log('Fixed button styles');
