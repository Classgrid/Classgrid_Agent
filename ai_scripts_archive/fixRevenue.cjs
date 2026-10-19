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

let f1 = fs.readFileSync('client/src/features/superadmin/billing/services/superAdminBillingApi.ts', 'utf8');
f1 = f1.replace(/export const fetchRevenueByOrg = [^;]+;/s, 'export const fetchRevenueByOrg = async (params?: any) => {\n  const response = await apiClient.get<ApiEnvelope<any[]>>(`/api/super-admin/revenue/by-organization`, { params });\n  return response.data.data;\n};');
f1 = f1.replace(/export const fetchRevenueByModule = [^;]+;/s, 'export const fetchRevenueByModule = async (params?: any) => {\n  const response = await apiClient.get<ApiEnvelope<any[]>>(`/api/super-admin/revenue/by-type`, { params });\n  return response.data.data;\n};');
fs.writeFileSync('client/src/features/superadmin/billing/services/superAdminBillingApi.ts', f1);

let f2 = fs.readFileSync('client/src/features/superadmin/billing/components/finance/RevenueComponents.tsx', 'utf8');
f2 = f2.replace(/<TabsTrigger value="modules" className="flex items-center gap-2">\r?\n\s*<Package className="w-4 h-4" \/> By Add-on Module\r?\n\s*<\/TabsTrigger>\r?\n\s*<TabsTrigger value="invoices">By Invoice<\/TabsTrigger>/, '<TabsTrigger value="types" className="flex items-center gap-2">\n          <Package className="w-4 h-4" /> By Payment Type\n        </TabsTrigger>');
f2 = f2.replace('export const RevenueModuleTable', 'export const RevenueTypeTable');
f2 = f2.replace(/<TableHead>Add-on Module<\/TableHead>\r?\n\s*<TableHead className="text-right">Active Subscriptions<\/TableHead>\r?\n\s*<TableHead className="text-right">Recognized revenue<\/TableHead>\r?\n\s*<TableHead className="text-right">% of module revenue<\/TableHead>/, '<TableHead>Payment Type</TableHead>\n              <TableHead className="text-right">Transaction Count</TableHead>\n              <TableHead className="text-right">Gross Revenue</TableHead>');
f2 = f2.replace(/<TableRow key=\{item\.moduleId\}>.*?<\/TableRow>/s, `<TableRow key={item._id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="uppercase">{item._id || 'UNKNOWN'}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">{item.transactionCount}</TableCell>
                <TableCell className="text-right font-medium text-primary">
                  <MoneyDisplay amountPaise={item.grossRevenuePaise} />
                </TableCell>
              </TableRow>`);
fs.writeFileSync('client/src/features/superadmin/billing/components/finance/RevenueComponents.tsx', f2);
console.log("Fixed Revenue Components");
