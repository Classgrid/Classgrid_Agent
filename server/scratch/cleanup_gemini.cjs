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

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      if (!dirFile.includes('node_modules') && !dirFile.includes('.git')) {
        filelist = walkSync(dirFile, filelist);
      }
    } else {
      if (dirFile.endsWith('.js') || dirFile.endsWith('.ts')) {
        filelist.push(dirFile);
      }
    }
  });
  return filelist;
};

const files = walkSync('./src');
let changedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace dead Gemini models
  content = content.replace(/gemini-1\.5-flash/g, 'gemini-3.5-flash');
  content = content.replace(/gemini-2\.5-flash-vision/g, 'gemini-3.5-flash');
  content = content.replace(/gemini-2\.5-flash/g, 'gemini-3.5-flash');
  
  // Replace remaining Llama
  content = content.replace(/llama3-8b-8192/g, '@cf/deepseek-ai/deepseek-v4-pro-0813');

  if (original !== content) {
    fs.writeFileSync(file, content);
    console.log('Updated', file);
    changedCount++;
  }
});
console.log('Total files changed:', changedCount);
