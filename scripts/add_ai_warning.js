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

const warning = `/*
 * =========================================================================================
 * STRICT SECURITY POLICY & FINAL WARNING:
 * NO AI, NO HUMAN, NO GOD WILL EVER AGAIN ADD SPARKLES, ADD A SIDEBAR, OR ADD ANY KIND OF 
 * FLOATING AI TO THIS CODEBASE. WE ONLY USE FULL SCREEN CHAT GPT-LIKE AI.
 * =========================================================================================
 * 
 * CORRECT DESIGN DRAWING (AS REQUESTED):
 * 
 * +---------------------------------------------------+
 * |  Main Sidebar |          What do you want to know?|
 * |  (NO AGENT    |                                   |
 * |   MENU HERE)  |          [  Input Box  ]          |
 * |               |                                   |
 * |               |                                   |
 * |               |   <-- NO FLOATING SPARKLES HERE   |
 * +---------------------------------------------------+
 * 
 * THIS IS THE ONLY ALLOWED DESIGN. DO NOT DEVIATE.
 * =========================================================================================
 */\n\n`;

function addWarning(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        addWarning(fullPath);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // If it already has the old warning, replace it with the new one
      if (content.includes('STRICT SECURITY POLICY & FINAL WARNING:') && !content.includes('CORRECT DESIGN DRAWING')) {
        content = content.replace(/\/\*\n \* =========================================================================================\n \* STRICT SECURITY POLICY & FINAL WARNING:[\s\S]*?WE ONLY USE FULL SCREEN CHAT GPT-LIKE AI\.\n \* =========================================================================================\n \*\//, '');
      }

      if (!content.includes('CORRECT DESIGN DRAWING (AS REQUESTED)')) {
        fs.writeFileSync(fullPath, warning + content.trimStart(), 'utf8');
      }
    }
  }
}

addWarning(path.join(__dirname, '../client/src'));
addWarning(path.join(__dirname, '../server/src'));
addWarning(path.join(__dirname, '../server/controllers'));
addWarning(path.join(__dirname, '../server/routes'));
addWarning(path.join(__dirname, '../server/services'));

console.log('Updated warning with ASCII design added to all files!');
