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
const file = 'C:\\CLASSGRIDPLATFORM\\classgrid_platoform-desktop-\\client\\src\\features\\shared\\pages\\SharedProfilePage.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `{!isGroup && form.email && (
                      <span className="flex items-center gap-2 hover:text-foreground transition-colors"><Mail size={16} /> {form.email}</span>
                    )}`;
const replacement = `{!isGroup && form.email && (!isReadOnly || !(publicUser?.privacySettings?.hideEmail || profileData?.user?.privacySettings?.hideEmail)) && (
                      <span className="flex items-center gap-2 hover:text-foreground transition-colors"><Mail size={16} /> {form.email}</span>
                    )}`;

content = content.replace(target, replacement);

const target2 = `                  <SuperAdminProfileView profileData={profileData?.user || {}} />`;
const replacement2 = `                  <SuperAdminProfileView profileData={profileData?.user || {}} isReadOnly={isReadOnly} />`;

content = content.replace(target2, replacement2);

fs.writeFileSync(file, content);
console.log('Done');
