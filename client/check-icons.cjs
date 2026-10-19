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
const sidebarStr = fs.readFileSync('src/config/sidebar.ts', 'utf8');
const match = sidebarStr.match(/import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"]/);
const icons = match[1].split(',').map(i => i.trim()).filter(Boolean);
const lucide = require('lucide-react');
icons.forEach(icon => {
  const val = lucide[icon];
  if (typeof val === 'object' && !val.$$typeof) console.log('PLAIN OBJECT: ' + icon);
});
