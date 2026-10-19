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

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.js') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let updated = content.replace(/new\s+Groq\(\{\s*apiKey:\s*process\.env\.GROQ_API_KEY\s*\}\)/g, 
                "new Groq({ apiKey: process.env.GROQ_API_KEY || 'missing-key' })");
            
            // Also handle multi-line cases if any
            updated = updated.replace(/new\s+Groq\(\{\s*\n\s*apiKey:\s*process\.env\.GROQ_API_KEY,?\s*\n\s*\}\)/g, 
                "new Groq({\n  apiKey: process.env.GROQ_API_KEY || 'missing-key',\n})");
                
            if (content !== updated) {
                fs.writeFileSync(fullPath, updated, 'utf8');
                console.log('Fixed ' + fullPath);
            }
        }
    }
}

processDir('./src');
