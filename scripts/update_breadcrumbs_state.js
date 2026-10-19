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
  'OrgHierarchyPage.tsx',
  'OrgFacultyPage.tsx',
  'OrgStudentsPage.tsx',
  'OrgFeesPage.tsx',
  'OrgAdmissionsPage.tsx'
];

const dir = 'client/src/features/superadmin/pages/';

for (const page of pages) {
  const filePath = path.join(dir, page);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Replace import to include useLocation
  content = content.replace(
    /import { useParams, useNavigate } from "react-router-dom";/,
    'import { useParams, useNavigate, useLocation } from "react-router-dom";'
  );

  // Add location hook after navigate hook
  content = content.replace(
    /const navigate = useNavigate\(\);/,
    'const navigate = useNavigate();\n  const location = useLocation();\n  const orgName = location.state?.orgName || "Organization";'
  );

  // Replace breadcrumbs to include orgName
  content = content.replace(
    /<Link to={\/superadmin\/detail\/\} className="hover:text-foreground transition-colors cursor-pointer">\s*Back to Organization\s*<\/Link>/,
    '<Link to="/superadmin/organizations" className="hover:text-foreground transition-colors cursor-pointer">Organizations</Link>\n          <span className="mx-2 text-muted-foreground/50">/</span>\n          <Link to={/superadmin/detail/} className="hover:text-foreground transition-colors cursor-pointer">{orgName}</Link>'
  );

  fs.writeFileSync(filePath, content);
}
