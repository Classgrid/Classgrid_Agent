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
let content = fs.readFileSync('src/app/router.tsx', 'utf-8');

// Replace imports
content = content.replace(
  'import { InstitutionAdminLoginPage } from "@/features/auth/pages/InstitutionAdminLoginPage";\nimport { InstitutionUserLoginPage } from "@/features/auth/pages/InstitutionUserLoginPage";\nimport { PlatformLoginPage } from "@/features/auth/pages/PlatformLoginPage";',
  'import { MainLoginPage } from "@/features/auth/pages/MainLoginPage";'
);
content = content.replace(
  'import { InstitutionAdminLoginPage } from "@/features/auth/pages/InstitutionAdminLoginPage";\r\nimport { InstitutionUserLoginPage } from "@/features/auth/pages/InstitutionUserLoginPage";\r\nimport { PlatformLoginPage } from "@/features/auth/pages/PlatformLoginPage";',
  'import { MainLoginPage } from "@/features/auth/pages/MainLoginPage";'
);

// Remove Test UI Routes
content = content.replace(
  /\{\/\* ── TEST UI ROUTE ── \*\/\}\r?\n\s*<Route path="\/test-forgot-password" element=\{<TestForgotPassword \/>\} \/>\r?\n\s*<Route path="\/test-super-admin" element=\{<TestSuperAdmin \/>\} \/>\r?\n\s*<Route path="\/test-reset-password" element=\{<TestResetPassword \/>\} \/>\r?\n/,
  ''
);

// Replace Dynamic Auth Routes
const oldRoutes = `<Route \r
        path="/login" \r
        element={isSuperAdmin ? <PlatformLoginPage /> : <InstitutionUserLoginPage />} \r
      />\r
      <Route path="/auth/user" element={<InstitutionUserLoginPage />} />\r
      <Route path="/student/login" element={<InstitutionUserLoginPage preferredRole="student" />} />\r
      <Route path="/faculty/login" element={<InstitutionUserLoginPage preferredRole="teacher" />} />\r
      <Route path="/admin-login" element={<InstitutionAdminLoginPage />} />\r
      <Route path="/admin/login" element={<InstitutionAdminLoginPage />} />\r
      <Route path="/org/login" element={<InstitutionAdminLoginPage />} />\r
      <Route path="/auth/admin" element={<InstitutionAdminLoginPage />} />\r
      <Route path="/superadmin" element={<PlatformLoginPage />} />\r
      <Route path="/superadmin/login" element={<PlatformLoginPage />} />`.replace(/\r/g, '');

const newRoutes = `<Route \r
        path="/login" \r
        element={isSuperAdmin ? <TestSuperAdmin /> : <MainLoginPage />} \r
      />\r
      <Route path="/auth/user" element={<MainLoginPage />} />\r
      <Route path="/student/login" element={<MainLoginPage preferredRole="student" />} />\r
      <Route path="/faculty/login" element={<MainLoginPage preferredRole="teacher" />} />\r
      <Route path="/admin-login" element={<MainLoginPage preferredRole="org_admin" />} />\r
      <Route path="/admin/login" element={<MainLoginPage preferredRole="org_admin" />} />\r
      <Route path="/org/login" element={<MainLoginPage preferredRole="org_admin" />} />\r
      <Route path="/auth/admin" element={<MainLoginPage preferredRole="org_admin" />} />\r
      <Route path="/superadmin" element={<TestSuperAdmin />} />\r
      <Route path="/superadmin/login" element={<TestSuperAdmin />} />`.replace(/\r/g, '');

// Convert content line endings for match
const oldContent = content;
content = content.replace(/\r\n/g, '\n');
content = content.replace(oldRoutes, newRoutes);
content = content.replace(/\n/g, '\r\n'); // restore CRLF

if (content === oldContent) {
    console.log("No changes made. Check the regex or string matching!");
}

fs.writeFileSync('src/app/router.tsx', content);
console.log('Router updated successfully');
