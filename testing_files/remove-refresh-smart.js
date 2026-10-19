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

const dir = 'c:\\CLASSGRIDPLATFORM\\classgrid_platoform-desktop-\\client\\src\\features\\superadmin';
const pagesDir = path.join(dir, 'pages');
const billingDir = path.join(dir, 'billing', 'pages');

function processDir(directory) {
  const files = fs.readdirSync(directory).filter(f => f.endsWith('.tsx'));
  let totalRemoved = 0;

  for (const file of files) {
    const filePath = path.join(directory, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes('RefreshButton')) {
      // Remove import
      content = content.replace(/import\s+\{\s*RefreshButton\s*\}\s+from\s+["']@\/components\/marketing_ui\/refresh-button["'];?\r?\n?/g, '');
      
      // Remove component: match <RefreshButton and then handle `{...}` blocks to safely skip `>` inside them
      // This regex matches `<RefreshButton`, then any number of (non-bracket/non-gt characters OR `{...}` blocks), then `/>`
      content = content.replace(/<RefreshButton(?:[^>{}]|\{[^}]*\})*\/>/g, '');
      
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${file}`);
      totalRemoved++;
    }
  }
  return totalRemoved;
}

let total = processDir(pagesDir);
if (fs.existsSync(billingDir)) {
    total += processDir(billingDir);
}

console.log(`Total files updated: ${total}`);
