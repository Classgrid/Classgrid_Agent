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
/*
 * ─────────────────────────────────────────────────────────
 * 🚨 CRITICAL AI AND SYSTEM RULES 🚨
 * 1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
 * 2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
 * 3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 NAMING CONVENTION RULE 🚨
 * 1. "CLASSGRID PLATFORM" is strictly the REPO NAME.
 * 2. chat.classgrid.in (Classgrid AI) is the actual PRODUCT. The ERP is shut down.
 * 3. NEVER use "Classgrid Platform" anywhere in the frontend UI or user-facing text.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 HOSTING & ARCHITECTURE RULE 🚨
 * 1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
 * 2. FRONTEND IS HOSTED ON VERCEL
 * ─────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');

function countLines(dir, extensions) {
  let totalLines = 0;
  let totalFiles = 0;

  function walk(currentDir) {
    const files = fs.readdirSync(currentDir);
    for (const file of files) {
      const fullPath = path.join(currentDir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'build') continue;
        walk(fullPath);
      } else {
        const ext = path.extname(file).toLowerCase();
        if (extensions.includes(ext)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          const lines = content.split('\n').length;
          totalLines += lines;
          totalFiles++;
        }
      }
    }
  }

  walk(dir);
  return { totalLines, totalFiles };
}

const exts = ['.js', '.ts', '.jsx', '.tsx'];
const baseDir = path.resolve(__dirname, '..');
const clientDir = path.join(baseDir, 'client/src');
const serverDir = path.join(baseDir, 'server/src');

console.log('Counting lines of code...');
try {
  const clientRes = countLines(clientDir, exts);
  console.log(`Client (client/src) : ${clientRes.totalLines.toLocaleString()} lines in ${clientRes.totalFiles} files`);
} catch (e) {
  console.error('Error reading client/src:', e.message);
}

try {
  const serverRes = countLines(serverDir, exts);
  console.log(`Server (server/src) : ${serverRes.totalLines.toLocaleString()} lines in ${serverRes.totalFiles} files`);
} catch (e) {
  console.error('Error reading server/src:', e.message);
}
