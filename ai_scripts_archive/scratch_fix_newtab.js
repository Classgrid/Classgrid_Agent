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
const path = require('path');

const filePath = path.join('client', 'src', 'features', 'superadmin', 'pages', 'AgentReviewsPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  /<Button[\s\n\r]*variant="link"[\s\n\r]*className="p-0 h-auto text-blue-600 hover:text-blue-800 flex items-center cursor-pointer"[\s\n\r]*onClick=\{[\s\S]*?\([\s\S]*?\}\}?>/m,
  '<Button \n                        variant="link" \n                        className="p-0 h-auto text-blue-600 hover:text-blue-800 flex items-center cursor-pointer" \n                        onClick={() => window.open(trimmedUrl, \'_blank\')}\n                      >'
);

fs.writeFileSync(filePath, content);
console.log('Successfully applied new tab fix');
