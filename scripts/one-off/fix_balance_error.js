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
const file = 'c:/CLASSGRIDPLATFORM/classgrid_platoform-desktop-/client/src/components/ai/components/credits/AiCreditsPanel.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /balanceData\?\.ai_credits_end_date : balanceData\?\.promotion_credits_end_date/g;

const replacement = `balance?.ai_credits_end_date : balance?.promotion_credits_end_date`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(file, content);
    console.log("Fixed AiCreditsPanel.tsx balanceData reference error");
} else {
    console.log("Regex did not match");
}
