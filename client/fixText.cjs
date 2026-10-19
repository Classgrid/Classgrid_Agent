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
const path = 'src/features/auth/pages/';

const files = fs.readdirSync(path).filter(f => f.endsWith('LoginPage.tsx'));
files.forEach(file => {
  let content = fs.readFileSync(path + file, 'utf8');
  const target = 'className="flex h-screen flex-col items-center justify-center bg-background dark:bg-[#0f0f0f] text-white text-center"';
  const replacement = 'className="flex h-screen flex-col items-center justify-center bg-background dark:bg-[#0f0f0f] text-foreground dark:text-white text-center"';
  if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(path + file, content);
    console.log('Successfully updated ' + file);
  } else {
    console.log('Target not found in ' + file);
  }
});
