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

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if the file uses <Input and doesn't already import it
    if (content.includes('<Input') && !content.includes('import { Input }')) {
        let lines = content.split('\n');
        let buttonImportIndex = lines.findIndex(line => line.includes('import { Button }'));
        let lastImportIndex = -1;
        
        for (let i = lines.length - 1; i >= 0; i--) {
            if (lines[i].trim().startsWith('import ')) {
                lastImportIndex = i;
                break;
            }
        }
        
        let targetIndex = buttonImportIndex !== -1 ? buttonImportIndex + 1 : (lastImportIndex !== -1 ? lastImportIndex + 1 : 0);
        lines.splice(targetIndex, 0, 'import { Input } from "@/components/marketing_ui/input";');
        
        fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
        console.log(`Added Input import to: ${filePath}`);
    }
}

function traverseDir(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !fullPath.includes('node_modules')) {
            traverseDir(fullPath);
        } else if (fullPath.endsWith('.tsx')) {
            processFile(fullPath);
        }
    }
}

traverseDir(path.join(__dirname, 'src'));
