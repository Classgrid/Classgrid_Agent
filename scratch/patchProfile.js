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

content = content.replace(
  '"whatsapp_number": m?.["whatsapp_number"] || "",',
  '"whatsapp_number": m?.["whatsapp_number"] || "",\n        "age": m?.["age"] || "",\n        "job_role": m?.["job_role"] || "",'
);

content = content.replace(
  '"whatsapp_number": formData["whatsapp_number"] || "",',
  '"whatsapp_number": formData["whatsapp_number"] || "",\n          "age": formData["age"] || "",\n          "job_role": formData["job_role"] || "",'
);

content = content.replace(
  '<div className="space-y-1.5">\n            <label className="text-sm font-medium text-foreground">Date of Birth</label>',
  '<div className="space-y-1.5">\n            <label className="text-sm font-medium text-foreground">Age</label>\n            <input type="number" className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed placeholder:text-muted-foreground/30 disabled:text-foreground disabled:bg-muted/10" value={formData["age"] || ""} onChange={e => handleInputChange("age", e.target.value)} disabled={!isEditing} placeholder="e.g. 25" />\n          </div>\n          <div className="space-y-1.5">\n            <label className="text-sm font-medium text-foreground">Job Role</label>\n            <input className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed placeholder:text-muted-foreground/30 disabled:text-foreground disabled:bg-muted/10" value={formData["job_role"] || ""} onChange={e => handleInputChange("job_role", e.target.value)} disabled={!isEditing} placeholder="e.g. Software Engineer" />\n          </div>\n          <div className="space-y-1.5">\n            <label className="text-sm font-medium text-foreground">Date of Birth</label>'
);

fs.writeFileSync(file, content);
console.log('PublicChatProfileView.tsx updated');
