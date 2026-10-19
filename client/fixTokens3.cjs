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
const file = 'c:/CLASSGRIDPLATFORM/classgrid_platoform-desktop-/client/src/features/superadmin/components/ai-usage/AiUserDetailPanel.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/Total Tokens Consumed/g, 'Total Credits Consumed');
content = content.replace(/Lifetime token consumption/g, 'Lifetime credit consumption');
content = content.replace(/tokens/g, 'Credits');
content = content.replace(/Tokens/g, 'Credits');

fs.writeFileSync(file, content);
console.log('done fixing terminology');
