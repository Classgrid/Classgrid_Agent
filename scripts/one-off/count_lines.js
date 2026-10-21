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
const dirs = ['C:\\CLASSGRIDPLATFORM\\classgrid_platoform-desktop-', 'C:\\V2classgrid-', 'C:\\classgrid_marketting', 'C:\\classgrid-sites', 'C:\\gridx', 'C:\\classgrid-ai-sdk'];
const exts = ['.js', '.jsx', '.ts', '.tsx', '.css', '.scss', '.html'];
const ignore = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'];

let total = 0;
function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (let f of fs.readdirSync(dir)) {
        if (ignore.includes(f)) continue;
        let full = path.join(dir, f);
        try {
            let stat = fs.statSync(full);
            if (stat.isDirectory()) walk(full);
            else if (exts.includes(path.extname(full))) {
                let content = fs.readFileSync(full, 'utf8');
                total += content.split('\n').length;
            }
        } catch(e){}
    }
}
for (let d of dirs) walk(d);
console.log(total);
