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

const files = [
  'src/features/superadmin/pages/SupportTicketsPage.tsx',
  'src/features/superadmin/pages/ClassgridTalkPage.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Fix Eye Button
  content = content.replace(
    /<Button\s+onClick=\{\(\) =>\s+setPreviewFile\(\{/g,
    '<Button\n                                    variant="ghost"\n                                    size="icon"\n                                    onClick={() =>\n                                      setPreviewFile({'
  );
  
  // Fix Copy Button
  content = content.replace(
    /<Button\s+onClick=\{\(\) => \{\s+navigator\.clipboard\.writeText\(copyValue\);\s+toast\.success\("Merge URL copied to clipboard"\);\s+\}\}\s+className="p-1 rounded/g,
    '<Button\n              variant="ghost"\n              size="icon"\n              onClick={() => {\n                navigator.clipboard.writeText(copyValue);\n                toast.success("Merge URL copied to clipboard");\n              }}\n              className="w-6 h-6 p-0 rounded'
  );
  
  // Fix "Assign me" buttons which don't have variants
  content = content.replace(
    /<Button\s+onClick=\{\(e\) => \{\s+e\.stopPropagation\(\);\s+setAssigningTicketId\(ticket\._id\);\s+updateTicket\.mutate\(/g,
    '<Button\n                              variant="ghost"\n                              onClick={(e) => {\n                                e.stopPropagation();\n                                setAssigningTicketId(ticket._id);\n                                updateTicket.mutate('
  );
  content = content.replace(
    /<Button\s+onClick=\{\(\) => \{\s+updateTicket\.mutate\(\s+\{\s+id: selectedTicket\._id, assignedTo: currentUser\._id \},/g,
    '<Button\n                            variant="ghost"\n                            onClick={() => {\n                              updateTicket.mutate(\n                                { id: selectedTicket._id, assignedTo: currentUser._id },'
  );

  fs.writeFileSync(file, content);
}

console.log("Fixed buttons");
