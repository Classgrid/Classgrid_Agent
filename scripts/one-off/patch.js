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
let content = fs.readFileSync('server/src/controllers/super-admin/ai-credits-admin.controller.js', 'utf8');

content = content.replace(/res\.status\(200\)\.json\(\{\s*success:\s*true,\s*message:([^}]+)\}\);/g, (match, p1) => {
    return `const io = req.app.get("io");
        if (io) {
            io.to("superadmin:ai_usage").emit("ai_usage_updated");
        }
        ${match}`;
});

fs.writeFileSync('server/src/controllers/super-admin/ai-credits-admin.controller.js', content);
console.log("Patched successfully!");
