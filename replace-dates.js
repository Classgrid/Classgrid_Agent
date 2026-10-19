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

const regex = /if\s*\(startDate\)\s*\{\s*updateObj\.\$set\["ai_tokens\.promotion_credits_start_date"\]\s*=\s*new\s*Date\(startDate\);\s*\}\s*else\s*\{\s*updateObj\.\$set\["ai_tokens\.promotion_credits_start_date"\]\s*=\s*new\s*Date\(\);\s*\}\s*if\s*\(endDate\)\s*\{\s*updateObj\.\$set\["ai_tokens\.promotion_credits_end_date"\]\s*=\s*new\s*Date\(endDate\);\s*\}\s*else\s*\{\s*(?:\/\/[^\n]*\n\s*)*updateObj\.\$set\["ai_tokens\.promotion_credits_end_date"\]\s*=\s*null;\s*\}/g;

const replacement = `if (!startDate || !endDate) {
            return res.status(400).json({ success: false, error: "Both start date and expiry date are strictly required." });
        }
        
        updateObj.$set["ai_tokens.promotion_credits_start_date"] = new Date(startDate);
        updateObj.$set["ai_tokens.promotion_credits_end_date"] = new Date(endDate);`;

content = content.replace(regex, replacement);
fs.writeFileSync('server/src/controllers/super-admin/ai-credits-admin.controller.js', content);
console.log("Replaced backend successfully.");
