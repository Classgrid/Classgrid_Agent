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

let content = fs.readFileSync('client/src/features/superadmin/components/LeadTable.tsx', 'utf8');
content = content.replace(
  'text = "Provisioned";\n          color = "bg-emerald-500";\n          textColor = "text-emerald-500";',
  'text = "Sandbox";\n          color = "bg-amber-500";\n          textColor = "text-amber-600";'
);
fs.writeFileSync('client/src/features/superadmin/components/LeadTable.tsx', content, 'utf8');

let pageContent = fs.readFileSync('client/src/features/superadmin/pages/LeadsPage.tsx', 'utf8');
pageContent = pageContent.replace(
  '<option value="converted">Provisioned</option>',
  '<option value="converted">Sandbox</option>'
);
fs.writeFileSync('client/src/features/superadmin/pages/LeadsPage.tsx', pageContent, 'utf8');

console.log('Fixed UI text');
