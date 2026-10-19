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

const filesToFix = [
  'c:/CLASSGRIDPLATFORM/classgrid_platoform-desktop-/server/src/services/ai/proctor.service.js',
  'c:/CLASSGRIDPLATFORM/classgrid_platoform-desktop-/server/src/services/ai/ocr-quiz.service.js'
];

for (const file of filesToFix) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/const model = genAI\.getGenerativeModel\(\{ \/\* model: "gemini-3\.5-flash" \*\/ \}\);/g, 'const model = null; // genAI.getGenerativeModel({ model: "gemini-3.5-flash" });');
  fs.writeFileSync(file, content, 'utf8');
  console.log('Fixed', file);
}
