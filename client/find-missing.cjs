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
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      if (!file.includes('node_modules') && !file.includes('dist')) results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.jsx')) results.push(file);
    }
  });
  return results;
}
const allFiles = walk('src');
for(const f of allFiles) {
  const content = fs.readFileSync(f, 'utf8');
  if (/<Button[\s>]/.test(content)) {
    if (!/import\s+.*?Button.*?\s+from\s+['"].*?button['"]/.test(content) && !content.includes('import { Button }') && !content.includes('import {Button}') && !content.includes('import { Button,')) {
      console.log('Missing import in:', f);
    }
  }
}
