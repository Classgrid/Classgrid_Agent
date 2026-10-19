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

const dir = 'c:\\CLASSGRIDPLATFORM\\classgrid_platoform-desktop-\\client\\src\\features\\superadmin\\pages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

const importRegex = /import\s+\{\s*RefreshButton\s*\}\s+from\s+["']@\/components\/marketing_ui\/refresh-button["'];?\r?\n?/g;
const componentRegex = /<RefreshButton[^>]*\/>/g;

let totalRemoved = 0;

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('RefreshButton')) {
    content = content.replace(importRegex, '');
    content = content.replace(componentRegex, '');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
    totalRemoved++;
  }
}

console.log(`Total files updated: ${totalRemoved}`);
