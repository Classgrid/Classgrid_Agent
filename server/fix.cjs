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
let code = fs.readFileSync('c:/CLASSGRIDPLATFORM/classgrid_platoform-desktop-/server/src/controllers/ai-chat.controller.js', 'utf8');

// The corrupted block starts at 'github_wo2. If they choose Classgrid...' and ends around '...CONNECTED.`);\r\n' or similar.
// Since the checkmarks (✓) were corrupted as well (A'A,AA?...), we will just regex out the whole corrupted section.
const corruptedRegex = /allowedConnectorNames\.add\('github_wo2[\s\S]*?Claude[^`]*?CONNECTED\.\`\);/g;

const replacement = `allowedConnectorNames.add('github_workspace_connector');
                    } else {
                        disconnectedLinks.push(\`[GitHub](/api/auth/github/connect)\`);
                    }

                    if (vercelConnected) {
                        const vercelName = latestUser.vercel_name ? \` (Name: \${latestUser.vercel_name})\` : '';
                        const vercelEmail = latestUser.vercel_email ? \`(Connected as: \${latestUser.vercel_email}\${vercelName}) \` : '';
                        activeDescriptions.push(\`- **Vercel & Website Deployment**: ✓ CONNECTED. \${vercelEmail}\\n  (See the WEBSITE DEPLOYMENT INSTRUCTIONS below for exactly how to build and deploy sites.)\`);
                    } else {
                        disconnectedLinks.push(\`[Vercel](/api/auth/vercel/connect)\`);
                    }

                    if (whatsappConnected) activeDescriptions.push(\`- **WhatsApp Business**: ✓ CONFIGURED (Server). Use 'whatsapp_business_connector' to send texts.\`);
                    if (cursorConnected) activeDescriptions.push(\`- **Cursor IDE**: ✓ CONNECTED.\`);
                    if (chatgptConnected) activeDescriptions.push(\`- **ChatGPT**: ✓ CONNECTED.\`);
                    if (claudeConnected) activeDescriptions.push(\`- **Claude**: ✓ CONNECTED.\`);`;

if (code.match(corruptedRegex)) {
    code = code.replace(corruptedRegex, replacement);
    console.log("Fixed the corrupted block!");
} else {
    console.log("Could not find the corrupted block.");
}

fs.writeFileSync('c:/CLASSGRIDPLATFORM/classgrid_platoform-desktop-/server/src/controllers/ai-chat.controller.js', code);
