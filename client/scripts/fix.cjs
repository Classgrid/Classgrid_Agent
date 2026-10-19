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

function fixFile(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  let original = fs.readFileSync(filePath, 'utf8');
  let content = original;

  // Replace raw buttons with Button component
  content = content.replace(/<button/g, '<Button');
  content = content.replace(/<\/button>/g, '</Button>');

  // Clean up styles
  content = content.replace(/style=\{\{.*?\}\}/gs, '');

  // Fix known classNames to Shadcn variants
  content = content.replace(/className=\"inline-flex items-center justify-center rounded-md text-sm font-medium border h-9 px-4 py-2 inline-flex items-center justify-center rounded-md text-sm font-medium border h-9 px-4 py-2--ghost\"/g, 'variant=\"ghost\" size=\"icon\"');
  content = content.replace(/className=\"inline-flex items-center justify-center rounded-md text-sm font-medium border h-9 px-4 py-2 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground\"/g, 'variant=\"outline\"');
  content = content.replace(/className=\"inline-flex items-center justify-center rounded-md text-sm font-medium border h-9 px-4 py-2 bg-primary text-primary-foreground shadow\"/g, 'variant=\"default\"');
  content = content.replace(/className=\"inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2\"/g, 'variant=\"outline\"');
  content = content.replace(/className=\"inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground shadow hover:bg-primary\/90 h-9 px-4 py-2\"/g, 'variant=\"default\"');
  content = content.replace(/className=\"\"/g, ''); // empty classNames from some weird generator
  
  // Clean up inputs
  content = content.replace(/<input /g, '<Input ');
  
  // Add Input import if needed
  if (content.includes('<Input ') && !content.includes('import { Input }')) {
    if (content.includes('import { Button } from "@/components/marketing_ui/button";')) {
      content = content.replace('import { Button } from "@/components/marketing_ui/button";', 'import { Button } from "@/components/marketing_ui/button";\nimport { Input } from "@/components/marketing_ui/input";');
    } else {
      content = 'import { Input } from "@/components/marketing_ui/input";\n' + content;
    }
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Fixed', filePath);
  }
}

function walkSync(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walkSync(file));
    } else { 
      results.push(file);
    }
  });
  return results;
}

const allFiles = walkSync('src/features/superadmin');
allFiles.forEach(f => fixFile(f));
