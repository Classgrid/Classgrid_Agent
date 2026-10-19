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
const file = 'c:/CLASSGRIDPLATFORM/classgrid_platoform-desktop-/client/src/components/ai/components/credits/AiUpgradePanel.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /if\s*\(\s*response\s*&&\s*response\.checkout_url\s*\)\s*\{\s*window\.location\.href\s*=\s*response\.checkout_url;\s*\}/;

const replacement = `if (response && response.checkout_url) {
        try {
          const urlObj = new URL(response.checkout_url);
          const theme = document.documentElement.classList.contains("dark") ? "dark" : "light";
          urlObj.searchParams.set("theme", theme);
          window.location.href = urlObj.toString();
        } catch (e) {
          window.location.href = response.checkout_url;
        }
      }`;

content = content.replace(regex, replacement);
fs.writeFileSync(file, content);
console.log("Updated AiUpgradePanel.tsx successfully.");
