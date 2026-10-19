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

let f1 = fs.readFileSync('client/src/features/superadmin/billing/hooks/useBillingFinance.ts', 'utf8');
f1 = f1.replace(/export const useRevenueByOrg = \(\) => \{\r?\n\s*return useQuery\(\{\r?\n\s*queryKey: \['billing-revenue-org'\],\r?\n\s*queryFn: fetchRevenueByOrg,\r?\n\s*staleTime: 5 \* 60 \* 1000,\r?\n\s*\}\);\r?\n\};/, `export const useRevenueByOrg = (filters: any = {}) => {
  return useQuery({
    queryKey: ['billing-revenue-org', filters],
    queryFn: () => fetchRevenueByOrg(filters),
    staleTime: 5 * 60 * 1000,
  });
};`);

f1 = f1.replace(/export const useRevenueByModule = \(\) => \{\r?\n\s*return useQuery\(\{\r?\n\s*queryKey: \['billing-revenue-module'\],\r?\n\s*queryFn: fetchRevenueByModule,\r?\n\s*staleTime: 5 \* 60 \* 1000,\r?\n\s*\}\);\r?\n\};/, `export const useRevenueByModule = (filters: any = {}) => {
  return useQuery({
    queryKey: ['billing-revenue-module', filters],
    queryFn: () => fetchRevenueByModule(filters),
    staleTime: 5 * 60 * 1000,
  });
};`);
fs.writeFileSync('client/src/features/superadmin/billing/hooks/useBillingFinance.ts', f1);
console.log("Fixed useBillingFinance.ts");
