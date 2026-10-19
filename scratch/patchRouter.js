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
const p = 'client/src/app/router.tsx';
let c = fs.readFileSync(p, 'utf8');

const target = '<Route element={<DynamicRoleLayout />}>\n          {/* Website CMS */}';
const replacement = `<Route element={<DynamicRoleLayout />}>
          {/* PUBLIC CHAT DASHBOARD */}
          <Route path="/agent" element={<SharedChatPage />} />
          <Route path="/chat/history" element={<SharedChatPage />} />
          <Route path="/requests" element={<SupportTicketsPage />} />
          <Route path="/drive" element={<StorageFilesPage />} />
          <Route path="/agent/profile" element={<SharedProfilePage />} />
          <Route path="/agent/settings" element={<SharedSettingsPage />} />

          {/* Website CMS */}`;

if (c.includes(target)) {
  c = c.replace(target, replacement);
  fs.writeFileSync(p, c);
  console.log('Done');
} else {
  console.log('Not found');
}
