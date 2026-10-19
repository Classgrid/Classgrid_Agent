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

  // Fix 1: Add variant="outline" to the attachment buttons
  content = content.replace(
    /key=\{`msg-att-\$\{aIdx\}`\}\s+onClick=\{\(\) =>\s+setPreviewFile\(\{ name: fileName, src: fileUrl \}\)\s+\}\s+className="group flex/g,
    'key={`msg-att-${aIdx}`}\n                                  variant="outline"\n                                  onClick={() =>\n                                    setPreviewFile({ name: fileName, src: fileUrl })\n                                  }\n                                  className="group flex'
  );
  
  // Fix 2: Replace raw Refresh button with RefreshButton
  const rawButtonRegex = /<Button\s+onClick=\{\(\) => refetch\(\)\}\s+disabled=\{isFetching\}\s+className="ml-auto inline-flex items-center gap-1\.5 px-3 py-1\.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500\/10 hover:bg-emerald-500\/20 rounded-full transition-colors disabled:opacity-50"\s+>\s+\{isFetching \? \(\s+<Spinner className="w-3\.5 h-3\.5" \/>\s+\) : \(\s+<RefreshCw className="w-3\.5 h-3\.5" \/>\s+\)\}\s+\{isFetching \? "Refreshing\.\.\." : "Refresh"\}\s+<\/Button>/g;
  
  content = content.replace(rawButtonRegex, '<RefreshButton\n            onClick={() => refetch()}\n            isFetching={isFetching}\n            className="ml-auto rounded-full border-none bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"\n          />');
  
  fs.writeFileSync(file, content);
}
console.log('Done');
