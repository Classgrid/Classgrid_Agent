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

let pageContent = fs.readFileSync('client/src/features/superadmin/pages/OrganizationsPage.tsx', 'utf8');

pageContent = pageContent.replace(
  /render:\s*\(_val:\s*any,\s*row:\s*any\)\s*=>\s*\(\s*<div>\s*<div className="font-medium text-foreground">\{row.ownerName \|\| "Owner not set"\}<\/div>\s*<div className="text-xs text-muted-foreground">\{row.ownerEmail \|\| "No owner email"\}<\/div>\s*<\/div>\s*\)/,
  'render: (_val: any, row: any) => (\n        <div className="flex flex-col min-w-0 max-w-[150px]">\n          <div className="font-medium text-foreground truncate">{row.ownerName || "Owner not set"}</div>\n          <div className="text-xs text-muted-foreground truncate" title={row.ownerEmail}>{row.ownerEmail || "No owner email"}</div>\n        </div>\n      )'
);

fs.writeFileSync('client/src/features/superadmin/pages/OrganizationsPage.tsx', pageContent, 'utf8');
console.log('Fixed OrganizationsPage UI text overlap');
