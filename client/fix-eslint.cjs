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

// Replace the base no-unused-vars rule with the typescript specific one
content = content.replace(
  /'no-unused-vars': \['error', \{ varsIgnorePattern: '\^\[A-Z_\]', argsIgnorePattern: '\^\[A-Z_\]', caughtErrorsIgnorePattern: '\^\[A-Z_\]' \}\],/g,
  "'no-unused-vars': 'off',\n      '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^[A-Z_]', caughtErrorsIgnorePattern: '^[A-Z_]' }],"
);

fs.writeFileSync('eslint.config.js', content);
console.log("ESLint config updated for TypeScript");
