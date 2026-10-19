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

const lines = c.split(/\r?\n/);
let found = false;
const newLines = lines.filter(line => {
  if (line.includes('import { PublicChatLoginPage } from "@/features/public-chat/pages/PublicChatLoginPage";')) {
    if (!found) {
      found = true;
      return true; // Keep the first one
    }
    return false; // Remove the second one
  }
  return true;
});

fs.writeFileSync(p, newLines.join('\n'));
console.log('Done cleaning imports');
