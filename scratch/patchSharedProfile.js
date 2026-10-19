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
const p = 'client/src/features/shared/pages/SharedProfilePage.tsx';
let c = fs.readFileSync(p, 'utf8');

if (!c.includes('import { PublicChatProfileView }')) {
  c = c.replace(
    'import { SuperAdminProfileView } from "../components/SuperAdminProfileView";',
    'import { SuperAdminProfileView } from "../components/SuperAdminProfileView";\nimport { PublicChatProfileView } from "../../public-chat/components/PublicChatProfileView";'
  );
}

const target = '<SuperAdminProfileView profileData={profileData?.user || {}} />';
if (c.includes(target) && !c.includes('<PublicChatProfileView')) {
  // We want to insert the PublicChatProfileView logic before the SuperAdminProfileView logic
  const replaceStr = `{(window.location.hostname.startsWith("chat.") || form.role === "public_chat") ? (
                    <PublicChatProfileView profileData={profileData?.user || {}} />
                  ) : (form.role === "super_admin" || form.role === "Super Admin") ? (
                    <SuperAdminProfileView profileData={profileData?.user || {}} />
                  )`;
                  
  const oldCondition = `{(form.role === "super_admin" || form.role === "Super Admin") ? (\n                    <SuperAdminProfileView profileData={profileData?.user || {}} />\n                  )`;
  
  c = c.replace(oldCondition, replaceStr);
  fs.writeFileSync(p, c);
  console.log('Done SharedProfilePage.tsx');
} else {
  console.log('SharedProfilePage target not found or already patched');
}
