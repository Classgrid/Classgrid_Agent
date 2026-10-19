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

const file = 'client/src/features/shared/components/SuperAdminProfileView.tsx';
let content = fs.readFileSync(file, 'utf8');

const htmlToInject = `
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Age</label>
            <input 
              type="number"
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed placeholder:text-muted-foreground/30 disabled:text-foreground disabled:bg-muted/10" 
              value={formData["age"] || ""} 
              onChange={e => handleInputChange("age", e.target.value)} 
              disabled={!isEditing} 
              placeholder="e.g. 24" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Role</label>
            <Select 
              value={formData["job_role"] || ""} 
              onValueChange={val => handleInputChange("job_role", val)}
              disabled={!isEditing}
            >
              <SelectTrigger className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm transition-all outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:text-foreground disabled:bg-muted/10" size="default">
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => {
                  const Icon = r.icon;
                  return (
                    <SelectItem key={r.value} value={r.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <span>{r.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>`;

if (!content.includes('label>Age</label>')) {
  content = content.replace(
    '</label>\n            <textarea',
    '</label>\n            <textarea'
  ).replace(
    '</div>\n          <div className="space-y-1.5 md:col-span-2">\n            <label className="text-sm font-medium text-foreground">Bio</label>',
    '</div>' + htmlToInject + '\n          <div className="space-y-1.5 md:col-span-2">\n            <label className="text-sm font-medium text-foreground">Bio</label>'
  );
  
  // also fixing if CRLF
  content = content.replace(
    '</div>\r\n          <div className="space-y-1.5 md:col-span-2">\r\n            <label className="text-sm font-medium text-foreground">Bio</label>',
    '</div>\r\n' + htmlToInject + '\r\n          <div className="space-y-1.5 md:col-span-2">\r\n            <label className="text-sm font-medium text-foreground">Bio</label>'
  );

  fs.writeFileSync(file, content);
  console.log("Injected correctly");
} else {
  console.log("Already has it");
}
