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
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      walk(path.join(dir, file), fileList);
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
        fileList.push(path.join(dir, file));
      }
    }
  }
  return fileList;
}

const allFiles = walk(srcDir);

let modifiedCount = 0;

for (const file of allFiles) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Skip if it doesn't have a native select tag, or if it's the component itself
  if (!content.includes('<select') || file.includes('native-select') || file.includes('responsive-select') || file.includes('marketing_ui')) {
    continue;
  }

  const originalContent = content;

  // Replace <select ...> with <ResponsiveSelect ...>
  content = content.replace(/<select\b/g, '<ResponsiveSelect');
  content = content.replace(/<\/select>/g, '</ResponsiveSelect>');

  if (content !== originalContent) {
    // Add import statement at the top (after other imports)
    const importStatement = `import { ResponsiveSelect } from "@/components/marketing_ui/responsive-select";\n`;
    
    // Find the last import statement to insert after it, or just insert at the top
    if (!content.includes('ResponsiveSelect')) {
        const lines = content.split('\n');
        let lastImportIndex = -1;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim().startsWith('import ')) {
            lastImportIndex = i;
          }
        }
        
        if (lastImportIndex !== -1) {
          lines.splice(lastImportIndex + 1, 0, importStatement);
          content = lines.join('\n');
        } else {
          content = importStatement + content;
        }
    }

    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${path.relative(srcDir, file)}`);
    modifiedCount++;
  }
}

console.log(`Replaced native selects in ${modifiedCount} files.`);
