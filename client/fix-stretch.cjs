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
  'src/features/superadmin/pages/SupportTicketsPage.tsx',
  'src/features/superadmin/pages/ClassgridTalkPage.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Fix Eye Button stretching
  content = content.replace(
    /className="p-1 rounded-md hover:bg-primary\/10 text-muted-foreground hover:text-primary transition-colors"/g,
    'className="w-7 h-7 p-0 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"'
  );
  
  fs.writeFileSync(file, content);
}
console.log("Fixed eye button stretch");
