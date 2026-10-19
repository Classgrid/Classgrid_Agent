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

let f1 = fs.readFileSync('client/src/features/superadmin/billing/pages/RevenuePage.tsx', 'utf8');

// Replace imports
f1 = f1.replace('RevenueModuleTable', 'RevenueTypeTable');
f1 = f1.replace("import { RevenueExportDialog, RevenueInvoiceTable } from '../components/finance/FinanceComponents';", "import { RevenueExportDialog } from '../components/finance/FinanceComponents';\nimport { SuperadminFilterBar } from '../../components/SuperadminFilterBar';\nimport { OrganizationSelector, OrganizationTypeFilter } from '../components/shared/BillingFilterComponents';\nimport { NikhilTimeCalendar } from '@/components/marketing_ui/nikhil_time_calendar';\nimport { X } from 'lucide-react';");

// Replace component body to add state for filters
const componentStart = `const RevenuePage = () => {
  const [activeTab, setActiveTab] = useState('organizations');
  const [searchInput, setSearchInput] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [organizationType, setOrganizationType] = useState('ALL');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateType, setDateType] = useState('createdAt');

  const filters = {
    organizationId: organizationId || undefined,
    organizationType: organizationType !== 'ALL' ? organizationType : undefined,
    startDate: dateFrom ? dateFrom.toISOString() : undefined,
    endDate: dateFrom ? (() => { const e = new Date(dateFrom); e.setHours(23, 59, 59, 999); return e.toISOString(); })() : undefined,
    search: searchInput || undefined,
  };`;
f1 = f1.replace(/const RevenuePage = \(\) => \{\r?\n\s*const \[activeTab, setActiveTab\] = useState\('organizations'\);/, componentStart);

// Inject SuperadminFilterBar
const filterBar = `        <RevenueExportDialog />
      </div>

      <div className="w-full relative z-50 p-6 pb-0">
        <SuperadminFilterBar
          searchQuery={searchInput}
          onSearchChange={setSearchInput}
          searchPlaceholder="Search by organization name..."
        >
          <div className="w-full md:w-[180px] xl:w-[200px]">
            <OrganizationSelector selectedId={organizationId} onSelect={setOrganizationId} />
          </div>
          <div className="w-full md:w-[160px] xl:w-[180px]">
            <OrganizationTypeFilter value={organizationType} onChange={setOrganizationType} />
          </div>
          <div className="w-[180px] max-w-[180px] overflow-hidden relative">
            <NikhilTimeCalendar
              value={dateFrom}
              onChange={setDateFrom}
              placeholder="Select Date"
              popDirection="down"
              showTime={false}
              className="h-9 w-full pr-8"
              dateType={dateType}
              onDateTypeChange={setDateType}
            />
            {dateFrom && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setDateFrom(undefined); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-0.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-accent bg-background"
                title="Clear date"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </SuperadminFilterBar>
      </div>`;
f1 = f1.replace(/<RevenueExportDialog \/>\r?\n\s*<\/div>/, filterBar);

// Update table renders
f1 = f1.replace("{activeTab === 'organizations' && <RevenueOrganizationTable />}", "{activeTab === 'organizations' && <RevenueOrganizationTable filters={filters} />}");
f1 = f1.replace("{activeTab === 'modules' && <RevenueTypeTable />}", "{activeTab === 'types' && <RevenueTypeTable filters={filters} />}");
f1 = f1.replace(/\{activeTab === 'invoices' && <RevenueInvoiceTable \/>\}\r?\n\s*/, '');
f1 = f1.replace(/activeTab === 'modules'\r?\n\s*\? 'Revenue by Module'\r?\n\s*: 'Revenue by Invoice'/, "activeTab === 'types' ? 'Revenue by Payment Type' : ''");

fs.writeFileSync('client/src/features/superadmin/billing/pages/RevenuePage.tsx', f1);

// We must also update RevenueComponents.tsx so the tables accept `filters` and pass them to the hook.
let f2 = fs.readFileSync('client/src/features/superadmin/billing/components/finance/RevenueComponents.tsx', 'utf8');
f2 = f2.replace('export const RevenueOrganizationTable: React.FC = () => {', 'export const RevenueOrganizationTable: React.FC<{ filters?: any }> = ({ filters }) => {');
f2 = f2.replace('const { data: revenueData, isLoading, error } = useRevenueByOrg();', 'const { data: revenueData, isLoading, error } = useRevenueByOrg(filters);');
f2 = f2.replace('export const RevenueTypeTable: React.FC = () => {', 'export const RevenueTypeTable: React.FC<{ filters?: any }> = ({ filters }) => {');
f2 = f2.replace('const { data: revenueData, isLoading, error } = useRevenueByModule();', 'const { data: revenueData, isLoading, error } = useRevenueByModule(filters);');
fs.writeFileSync('client/src/features/superadmin/billing/components/finance/RevenueComponents.tsx', f2);

console.log("Fixed RevenuePage and RevenueComponents");
