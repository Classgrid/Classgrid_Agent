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
  'import { InstitutionAdminLoginPage } from "@/features/auth/pages/InstitutionAdminLoginPage";\r\nimport { InstitutionUserLoginPage } from "@/features/auth/pages/InstitutionUserLoginPage";',
  'import { MainLoginPage } from "@/features/auth/pages/MainLoginPage";'
);
content = content.replace(
  'import { InstitutionAdminLoginPage } from "@/features/auth/pages/InstitutionAdminLoginPage";\nimport { InstitutionUserLoginPage } from "@/features/auth/pages/InstitutionUserLoginPage";',
  'import { MainLoginPage } from "@/features/auth/pages/MainLoginPage";'
);

// Remove Test UI Routes block entirely and imports
content = content.replace(
  /\{\/\* ── TEST UI ROUTE ── \*\/\}\r?\n\s*<Route path="\/test-forgot-password" element=\{<TestForgotPassword \/>\} \/>\r?\n\s*<Route path="\/test-super-admin" element=\{<TestSuperAdmin \/>\} \/>\r?\n\s*<Route path="\/test-reset-password" element=\{<TestResetPassword \/>\} \/>\r?\n/,
  ''
);

content = content.replace(/import \{ TestForgotPassword \} from "@\/features\/auth\/pages\/TestForgotPassword";\r?\nimport \{ TestSuperAdmin \} from "@\/features\/auth\/pages\/TestSuperAdmin";\r?\nimport \{ TestResetPassword \} from "@\/features\/auth\/pages\/TestResetPassword";\r?\n\r?\n/, '');

// Replace old Institution classes with MainLoginPage
content = content.replace(/InstitutionUserLoginPage/g, 'MainLoginPage');
content = content.replace(/InstitutionAdminLoginPage/g, 'MainLoginPage');

fs.writeFileSync('src/app/router.tsx', content);
console.log('Router updated successfully');
