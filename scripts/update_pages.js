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

const pages = [
  'OrgFacultyPage.tsx',
  'OrgStudentsPage.tsx',
  'OrgFeesPage.tsx',
  'OrgAdmissionsPage.tsx'
];

const dir = 'client/src/features/superadmin/pages/';

for (const page of pages) {
  const filePath = path.join(dir, page);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Replace Spinner import with Skeleton and Link
  content = content.replace(
    /import { Spinner } from "@\/components\/marketing_ui\/spinner";/,
    'import { Skeleton } from "@/components/marketing_ui/skeleton";\nimport { Link } from "react-router-dom";'
  );
  
  // Also fix Link import if missing in OrgHierarchyPage.tsx later

  // Replace Spinner rendering with Skeleton
  content = content.replace(
    /if \(loading\) \{\s*return \(\s*<div className="flex h-\[400px\] items-center justify-center">\s*<Spinner size="lg" \/>\s*<\/div>\s*\);\s*\}/,
    'if (loading) {\n    return (\n      <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">\n        <Skeleton className="h-20 w-full rounded-xl" />\n        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">\n          <Skeleton className="h-32 rounded-xl" />\n          <Skeleton className="h-32 rounded-xl" />\n          <Skeleton className="h-32 rounded-xl" />\n          <Skeleton className="h-32 rounded-xl" />\n        </div>\n        <Skeleton className="h-[400px] w-full rounded-xl" />\n      </div>\n    );\n  }'
  );

  // Replace the Header section back button with Breadcrumbs
  // We'll use regex to find the Header comment and replace up to the title
  const headerRegex = /\{\/\* Header \*\/\}\s*<div className="flex items-center gap-4">\s*<Button variant="ghost" onClick=\{\(\) => navigate\(-1\)\} className="h-8 w-8 p-0">\s*<ChevronLeft className="h-5 w-5" \/>\s*<\/Button>\s*<div>\s*<h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">/m;
  
  // Extract Title from the original (it's hardcoded for each page, we'll just match and replace)
  let titleMatch = content.match(/<h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">\s*<[a-zA-Z]+ className="h-6 w-6 text-primary" \/>\s*([^<]+)\s*<\/h1>/);
  
  if (titleMatch) {
    const title = titleMatch[1].trim();
    
    content = content.replace(headerRegex, {\/* Header *\/}
      <div className="flex flex-col gap-1">
        <div className="text-sm font-medium text-muted-foreground mb-1">
          <Link to={\/superadmin/detail/\\} className="hover:text-foreground transition-colors cursor-pointer">
            Super Admin Dashboard
          </Link>
          <span className="mx-2 text-muted-foreground/50">/</span>
          <span className="text-foreground"></span>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">);
  }

  fs.writeFileSync(filePath, content);
}
