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
  
  if (!content.includes(' Link ')) {
    content = content.replace(
      /import { useParams, useNavigate, useLocation } from "react-router-dom";/,
      'import { useParams, useNavigate, useLocation, Link } from "react-router-dom";'
    );
    fs.writeFileSync(filePath, content);
  }
}
