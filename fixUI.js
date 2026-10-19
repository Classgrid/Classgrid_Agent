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
// 1. Fix super-admin.routes.js
const routesPath = 'c:/CLASSGRIDPLATFORM/classgrid_platoform-desktop-/server/src/routes/super-admin.routes.js';
let routes = fs.readFileSync(routesPath, 'utf8');
routes = routes.replace(
  'if (status && status !== "ALL") filter.status = status;',
  'if (status && status !== "ALL") { filter.status = status; } else { filter.status = { $ne: "failed" }; }'
);
fs.writeFileSync(routesPath, routes);

// 2. Clone TransactionDetailsPage to FailedPaymentDetailsPage
const txPagePath = 'c:/CLASSGRIDPLATFORM/classgrid_platoform-desktop-/client/src/features/superadmin/billing/pages/TransactionDetailsPage.tsx';
const failedPagePath = 'c:/CLASSGRIDPLATFORM/classgrid_platoform-desktop-/client/src/features/superadmin/billing/pages/FailedPaymentDetailsPage.tsx';
let txPage = fs.readFileSync(txPagePath, 'utf8');
txPage = txPage.replace(/TransactionDetailsPage/g, 'FailedPaymentDetailsPage');
txPage = txPage.replace(/label: "Transactions", href: "\/super-admin\/billing\/transactions"/g, 'label: "Failed Payments", href: "/super-admin/billing/failed-payments"');
txPage = txPage.replace(/<h1 className="text-2xl font-bold tracking-tight text-foreground">Transaction Details<\/h1>/g, '<h1 className="text-2xl font-bold tracking-tight text-foreground">Failed Payment Details</h1>');
fs.writeFileSync(failedPagePath, txPage);
console.log('Successfully duplicated UI and updated routes filter.');
