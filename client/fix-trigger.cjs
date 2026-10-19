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

let content = fs.readFileSync('src/components/layout/AppSidebar.tsx', 'utf8');

// Replace the SidebarTrigger with a slightly larger, better aligned one
content = content.replace(
  /<SidebarTrigger className="h-6 w-6 shrink-0 text-muted-foreground \\[&>svg\\]:size-4 hover:bg-accent" \/>/,
  '<SidebarTrigger className="h-8 w-8 ml-auto group-data-[collapsible=icon]:ml-0 shrink-0 text-muted-foreground [&>svg]:size-5 hover:bg-accent hover:text-foreground" />'
);

fs.writeFileSync('src/components/layout/AppSidebar.tsx', content);
console.log('Fixed SidebarTrigger styling');
