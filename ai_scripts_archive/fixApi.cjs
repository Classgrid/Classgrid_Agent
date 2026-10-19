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
console.log("Fixed superAdminBillingApi.ts");
