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
let routesContent = fs.readFileSync('server/src/routes/super-admin.routes.js', 'utf8');

routesContent = routesContent.replace(
  'import { getOrganizationDetail } from "../controllers/super-admin.controller.js";',
  'import { getOrganizationDetail, updateOrganizationStatus } from "../controllers/super-admin.controller.js";'
);

fs.writeFileSync('server/src/routes/super-admin.routes.js', routesContent, 'utf8');
console.log('Fixed import');
