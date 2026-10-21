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
const file = 'c:/CLASSGRIDPLATFORM/classgrid_platoform-desktop-/server/src/controllers/ai-chat.controller.js';
let content = fs.readFileSync(file, 'utf8');

const regex = /let promoBalance = userTokens\.ai_tokens\.promotion_credits_balance \|\| 0;\s*if \(userTokens\.ai_tokens\.promotion_credits_end_date && new Date\(userTokens\.ai_tokens\.promotion_credits_end_date\)\.getTime\(\) < now\) \{\s*promoBalance = 0; \/\/ Expired\s*\}/;

const replacement = `let promoBalance = userTokens.ai_tokens.promotion_credits_balance || 0;
            if (userTokens.ai_tokens.promotion_credits_end_date && new Date(userTokens.ai_tokens.promotion_credits_end_date).getTime() < now) {
                promoBalance = 0; // Expired
            } else if (userTokens.ai_tokens.promotion_credits_revoked) {
                promoBalance = 0; // Revoked
            } else if (userTokens.ai_tokens.promotion_credits_paused) {
                promoBalance = 0; // Paused
            }`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(file, content);
    console.log("Fixed ai-chat.controller.js getMyUsage");
} else {
    console.log("Regex did not match");
}
