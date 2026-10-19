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

// Add required imports
if (!content.includes('import { Input }')) {
    content = content.replace('import { Button } from "@/components/marketing_ui/button";', 'import { Button } from "@/components/marketing_ui/button";\nimport { Input } from "@/components/marketing_ui/input";\nimport { NikhilTimeCalendar } from "@/components/marketing_ui/nikhil_time_calendar";\nimport { Search, Filter, Calendar } from "lucide-react";');
}

// Add state for filters
if (!content.includes('const [searchQuery, setSearchQuery] = useState("");')) {
    content = content.replace('const [showOrgBlock, setShowOrgBlock] = useState(false);', 
    'const [showOrgBlock, setShowOrgBlock] = useState(false);\n  const [searchQuery, setSearchQuery] = useState("");\n  const [orgTypeFilter, setOrgTypeFilter] = useState("all");\n  const [dateFilter, setDateFilter] = useState<Date | undefined>();');
}

// Create the filter bar UI
const filterBar = `
  const renderFilterBar = () => {
    return (
      <div className="bg-card border border-border rounded-xl p-4 mb-6 flex flex-col md:flex-row gap-4 items-center animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="relative w-full md:w-64 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search name..." 
            className="pl-9 bg-background"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex w-full gap-4 overflow-x-auto custom-scrollbar pb-1 md:pb-0">
          <div className="min-w-[140px] flex-1">
            <select 
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={orgTypeFilter}
              onChange={(e) => setOrgTypeFilter(e.target.value)}
            >
              <option value="all">Org Type: All</option>
              <option value="school">School</option>
              <option value="college">College</option>
              <option value="university">University</option>
            </select>
          </div>
          
          <div className="min-w-[140px] flex-1">
            <select 
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="all">Org Name: All</option>
              {orgs?.map((o: any) => (
                <option key={o.orgId} value={o.orgId}>{o.orgName}</option>
              ))}
            </select>
          </div>

          <div className="shrink-0">
            <NikhilTimeCalendar 
              date={dateFilter}
              setDate={setDateFilter}
              placeholder="Select Date"
            />
          </div>
        </div>
      </div>
    );
  };
`;

if (!content.includes('const renderFilterBar = () => {')) {
    content = content.replace('const renderBreadcrumbs = () => {', filterBar + '\n  const renderBreadcrumbs = () => {');
}

// Inject the filter bar below PageHeader
content = content.replace(/<PageHeader title="AI Usage & Credits" \/>/g, '<PageHeader title="AI Usage & Credits" />\n      {renderFilterBar()}');

// Frontend filtering logic for Orgs
const orgFilteringLogic = `
  const getFilteredOrgs = () => {
    if (!orgs) return [];
    return orgs.filter((org: any) => {
      const matchesSearch = org.orgName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = orgTypeFilter === "all" || org.type === orgTypeFilter;
      return matchesSearch && matchesType;
    });
  };
`;

if (!content.includes('const getFilteredOrgs = () => {')) {
    content = content.replace('const renderLevel0Orgs = () => {', orgFilteringLogic + '\n  const renderLevel0Orgs = () => {');
}

// Update the org map to use filtered orgs
content = content.replace(/orgs\?\.map\(\(org: any\)/g, 'getFilteredOrgs().map((org: any)');

fs.writeFileSync(dashboardFile, content);
console.log('Added Filter Bar to AiUsageDashboardPage.tsx');
