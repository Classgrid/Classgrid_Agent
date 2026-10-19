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
const file = 'client/src/features/public-chat/components/PublicChatProfileView.tsx';
let content = fs.readFileSync(file, 'utf8');

const replacement = `<div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Age</label>
            <input type="number" className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed placeholder:text-muted-foreground/30 disabled:text-foreground disabled:bg-muted/10" value={formData["age"] || ""} onChange={e => handleInputChange("age", e.target.value)} disabled={!isEditing} placeholder="e.g. 25" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Job Role</label>
            <input className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed placeholder:text-muted-foreground/30 disabled:text-foreground disabled:bg-muted/10" value={formData["job_role"] || ""} onChange={e => handleInputChange("job_role", e.target.value)} disabled={!isEditing} placeholder="e.g. Software Engineer" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Date of Birth</label>`;

// Split by "Date of Birth</label>" line and replace
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('Date of Birth</label>')) {
    // we want to replace the line before it as well
    lines[i-1] = replacement.replace('<div className="space-y-1.5">\n            <label className="text-sm font-medium text-foreground">Date of Birth</label>', '');
    // actually, let's just do a simple array splice
    lines.splice(i-1, 2, replacement);
    break;
  }
}

fs.writeFileSync(file, lines.join('\n'));
console.log('PublicChatProfileView.tsx UI fields updated via JS');
