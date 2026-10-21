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
const file = 'c:/CLASSGRIDPLATFORM/classgrid_platoform-desktop-/client/src/features/superadmin/components/ai-usage/AiUserDetailPanel.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /render:\s*\(_:\s*any,\s*row:\s*any\)\s*=>\s*\(\s*<span[^>]*>\s*\{row\.status\.toUpperCase\(\)\}\s*<\/span>\s*\)/;

const replacement = `render: (_: any, row: any) => {
        let displayStatus = row.status?.toLowerCase() || '';
        let colorClass = 'bg-muted text-muted-foreground';

        if (displayStatus === 'success' || displayStatus === 'active') {
            const now = new Date().getTime();
            const endDateStr = userDetail?.ai_tokens?.ai_credits_end_date;
            
            if (endDateStr && new Date(endDateStr).getTime() < now) {
                displayStatus = 'Expired';
                colorClass = 'bg-red-500/10 text-red-600';
            } else {
                displayStatus = 'Active';
                colorClass = 'bg-emerald-500/10 text-emerald-600';
            }
        } else if (displayStatus === 'failed') {
            displayStatus = 'Failed';
            colorClass = 'bg-red-500/10 text-red-600';
        }

        return (
          <span className={\`inline-flex px-2 py-0.5 rounded-full text-xs font-medium \${colorClass}\`}>
            {displayStatus}
          </span>
        );
      }`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(file, content);
    console.log("Replaced successfully in AiUserDetailPanel.tsx");
} else {
    console.log("Regex did not match");
}
