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

// 1. Fix backend duplicate declarations
let emailTemplatesPath = 'server/src/services/email-templates.service.js';
let emailCode = fs.readFileSync(emailTemplatesPath, 'utf8');

// Find the first export of erpBaseTemplate at line 2673 and getFailedPaymentEmailHtml
// We can just find the second occurrence of "export const erpBaseTemplate = " and delete from there to the end.
const splitToken = 'export const erpBaseTemplate = ({ content, title = "Notification", orgName = "Institution" }) => {';
const parts = emailCode.split(splitToken);
if (parts.length > 2) {
    // Keep the first two parts (which covers up to the first export)
    // Actually, wait, there's `const erpBaseTemplate` (non-exported) earlier in the file.
    // So parts[0] is everything before the first export, parts[1] is everything between first and second export.
    emailCode = parts[0] + splitToken + parts[1];
    // This will strip off the second export and everything after it.
    // Wait, is there anything ELSE after the second export that we need?
    // Let's check what's at the very end of the file.
    // The second export of `erpBaseTemplate` starts at 2800, then `getFailedPaymentEmailHtml` starts at 2908, ending at 2926.
    // So if we just truncate at the second export, we remove the duplicates safely.
    // Let's ensure we don't chop off something important. The file ended at 2926. 
    // parts[1] contains `getFailedPaymentEmailHtml` which is the FIRST export of it.
    // So truncating is safe.
    fs.writeFileSync(emailTemplatesPath, emailCode);
    console.log("Fixed email-templates.service.js");
}

// Also let's fix `const erpBaseTemplate` vs `export const erpBaseTemplate`
// Actually `const erpBaseTemplate` is at line 2375. It might throw "Identifier has already been declared" if it's in the same scope.
// Let's replace `const erpBaseTemplate =` with `const erpBaseTemplateInternal =` at 2375.
emailCode = fs.readFileSync(emailTemplatesPath, 'utf8');
emailCode = emailCode.replace(
    'const erpBaseTemplate = ({ content, title = "Notification", orgName = "Institution" }) => {',
    'const erpBaseTemplateInternal = ({ content, title = "Notification", orgName = "Institution" }) => {'
);
emailCode = emailCode.replace(
    'return erpBaseTemplate({ content, title: "Payment Failed", orgName });',
    'return erpBaseTemplate({ content, title: "Payment Failed", orgName });' // Actually, let's just let the exported one be used.
);
fs.writeFileSync(emailTemplatesPath, emailCode);

// 2. Fix frontend FinanceComponents.tsx import
let financeComponentsPath = 'client/src/features/superadmin/billing/components/finance/FinanceComponents.tsx';
if (fs.existsSync(financeComponentsPath)) {
    let financeCode = fs.readFileSync(financeComponentsPath, 'utf8');
    financeCode = financeCode.replace('RevenueModuleTable,\n} from \'./RevenueComponents\';', '} from \'./RevenueComponents\';');
    financeCode = financeCode.replace('  RevenueModuleTable,\r\n} from \'./RevenueComponents\';', '} from \'./RevenueComponents\';');
    fs.writeFileSync(financeComponentsPath, financeCode);
    console.log("Fixed FinanceComponents.tsx");
}

// 3. Fix frontend RevenuePage.tsx
let revenuePagePath = 'client/src/features/superadmin/billing/pages/RevenuePage.tsx';
if (fs.existsSync(revenuePagePath)) {
    let revenueCode = fs.readFileSync(revenuePagePath, 'utf8');
    revenueCode = revenueCode.replace("{activeTab === 'modules' && <RevenueModuleTable />}\r\n", "");
    revenueCode = revenueCode.replace("{activeTab === 'modules' && <RevenueModuleTable />}\n", "");
    revenueCode = revenueCode.replace("{activeTab === 'modules' && <RevenueModuleTable />}", "");
    fs.writeFileSync(revenuePagePath, revenueCode);
    console.log("Fixed RevenuePage.tsx");
}

