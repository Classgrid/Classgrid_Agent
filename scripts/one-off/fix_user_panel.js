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

const regex = /\} else if \(lowerStatus === 'success' \|\| lowerStatus === 'active'\) \{\s*displayStatus = 'Active';\s*colorClass = 'bg-emerald-500\/10 text-emerald-600';\s*\}/;

const replacement = `} else if (lowerStatus === 'success' || lowerStatus === 'active') {
                              const now = new Date().getTime();
                              const isTopup = txn.type === "topup";
                              const endDateStr = isTopup ? balanceData?.ai_credits_end_date : balanceData?.promotion_credits_end_date;
                              
                              if (endDateStr && new Date(endDateStr).getTime() < now) {
                                  displayStatus = 'Expired';
                                  colorClass = 'bg-red-500/10 text-red-600';
                              } else {
                                  displayStatus = 'Active';
                                  colorClass = 'bg-emerald-500/10 text-emerald-600';
                              }
                            }`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(file, content);
    console.log("Fixed AiCreditsPanel.tsx");
} else {
    console.log("Regex did not match");
}
