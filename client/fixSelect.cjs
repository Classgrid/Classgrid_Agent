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

const dashboardFile = 'c:/CLASSGRIDPLATFORM/classgrid_platoform-desktop-/client/src/features/superadmin/pages/AiUsageDashboardPage.tsx';
let content = fs.readFileSync(dashboardFile, 'utf8');

// Add ResponsiveSelect import if missing
if (!content.includes('import { ResponsiveSelect }')) {
    content = content.replace('import { Input } from "@/components/marketing_ui/input";', 'import { Input } from "@/components/marketing_ui/input";\nimport { ResponsiveSelect } from "@/components/marketing_ui/responsive-select";');
}

// Replace raw <select> with ResponsiveSelect for Org Type
content = content.replace(/<select\s+className="[^"]*"\s+value={orgTypeFilter}\s+onChange={\(e\) => setOrgTypeFilter\(e.target.value\)}\s*>/, '<ResponsiveSelect value={orgTypeFilter} onChange={(e: any) => setOrgTypeFilter(e.target.value)} className="w-full">');

// Replace raw <select> with ResponsiveSelect for Org Name
// Since the org Name dropdown didn't have an onChange in my previous script, I will add it now too!
content = content.replace(/<select\s+className="[^"]*"\s*>/, '<ResponsiveSelect value={path.orgId || "all"} onChange={(e: any) => { if (e.target.value === "all") handleNavigateUp("root"); else setPath({ orgId: e.target.value, orgName: orgs.find((o: any) => o.orgId === e.target.value)?.orgName }); }} className="w-full">');

content = content.replace(/<\/select>/g, '</ResponsiveSelect>');

fs.writeFileSync(dashboardFile, content);
console.log('Replaced raw select with ResponsiveSelect in AiUsageDashboardPage.tsx');
