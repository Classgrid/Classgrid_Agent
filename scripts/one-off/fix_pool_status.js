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

// 1. Fix backend pool status
const backendFile = 'c:/CLASSGRIDPLATFORM/classgrid_platoform-desktop-/server/src/controllers/ai-credits.controller.js';
let backendContent = fs.readFileSync(backendFile, 'utf8');

const backendRegex = /\/\/ Determine correct status\s*if \(promoBalance <= 0 && totalPromoGranted > 0\) \{/;
const backendReplacement = `// Determine correct status
        const promoRevoked = tokens.promotion_credits_revoked || false;
        
        if (promoRevoked) {
            promoStatus = "Revoked";
            promoBalance = 0;
        } else if (promoBalance <= 0 && totalPromoGranted > 0) {`;

if (backendRegex.test(backendContent)) {
    backendContent = backendContent.replace(backendRegex, backendReplacement);
    fs.writeFileSync(backendFile, backendContent);
    console.log("Fixed ai-credits.controller.js");
} else {
    console.log("Failed to match ai-credits.controller.js");
}

// 2. Hide progress bar for revoked/expired pools in UI
const uiFile = 'c:/CLASSGRIDPLATFORM/classgrid_platoform-desktop-/client/src/components/ai/components/credits/AiCreditsPanel.tsx';
let uiContent = fs.readFileSync(uiFile, 'utf8');

const uiRegex = /\{issuedAmount > 0 && \(/;
const uiReplacement = `{issuedAmount > 0 && pool.status !== 'Revoked' && pool.status !== 'Expired' && (`;

if (uiRegex.test(uiContent)) {
    uiContent = uiContent.replace(uiRegex, uiReplacement);
    fs.writeFileSync(uiFile, uiContent);
    console.log("Fixed AiCreditsPanel.tsx progress bar visibility");
} else {
    console.log("Failed to match AiCreditsPanel.tsx");
}
