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

let content = fs.readFileSync('eslint.config.js', 'utf8');

content = content.replace(
  /files: \['src\/components\/marketing_ui\/\*\*\/\*\.\{js,jsx,ts,tsx\}'\]/,
  "files: ['src/components/marketing_ui/**/*.{js,jsx,ts,tsx}', 'src/features/auth/pages/**/*.{js,jsx,ts,tsx}']"
);

fs.writeFileSync('eslint.config.js', content);
console.log('Updated ESLint config!');
