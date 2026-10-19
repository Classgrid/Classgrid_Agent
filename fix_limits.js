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
const file = 'c:/CLASSGRIDPLATFORM/classgrid_platoform-desktop-/client/src/features/superadmin/components/GlobalAiConfigPanel.tsx';
let content = fs.readFileSync(file, 'utf8');

// For individual Usage
content = content.replace(
  /onChange=\{\(e\) => setIndividualUsage\(Math\.max\(1000, Math\.min\(100000000, Number\(e\.target\.value\) \|\| 1000\)\)\)\}/g,
  `onChange={(e) => setIndividualUsage(Number(e.target.value))}`
);

// For Org pool
content = content.replace(
  /onChange=\{\(e\) => setOrgPool\(Math\.max\(10000, Math\.min\(100000000, Number\(e\.target\.value\) \|\| 10000\)\)\)\}/g,
  `onChange={(e) => setOrgPool(Number(e.target.value))}`
);

fs.writeFileSync(file, content);
console.log("Replaced locks in GlobalAiConfigPanel.tsx");
