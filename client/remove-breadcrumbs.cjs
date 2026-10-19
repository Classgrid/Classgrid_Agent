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
  'src/features/student/pages/StudentWorkPage.tsx',
  'src/features/faculty/pages/FacultyWorkPage.tsx',
  'src/features/superadmin/pages/SupportTicketsPage.tsx',
  'src/features/superadmin/pages/ClassgridTalkPage.tsx'
];
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/import\s*\{\s*Breadcrumb[^}]*\}\s*from\s*['"]@\/components\/marketing_ui\/breadcrumb['"];?\n?/g, '');
  content = content.replace(/<Breadcrumb>[\s\S]*?<\/Breadcrumb>/g, '');
  fs.writeFileSync(file, content);
}
