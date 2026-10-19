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
let code = fs.readFileSync('client/src/app/router.tsx', 'utf8');

// Add imports if they don't exist
if (!code.includes('TransactionDetailsPage')) {
  code = code.replace(
    'import TransactionsPage from "@/features/superadmin/billing/pages/TransactionsPage";',
    'import TransactionsPage from "@/features/superadmin/billing/pages/TransactionsPage";\nimport TransactionDetailsPage from "@/features/superadmin/billing/pages/TransactionDetailsPage";'
  );
}

if (!code.includes('FailedPaymentDetailsPage"')) {
  code = code.replace(
    'import FailedPaymentsPage from "@/features/superadmin/billing/pages/FailedPaymentsPage";',
    'import FailedPaymentsPage from "@/features/superadmin/billing/pages/FailedPaymentsPage";\nimport FailedPaymentDetailsPage from "@/features/superadmin/billing/pages/FailedPaymentDetailsPage";'
  );
}

// Add routes
if (!code.includes('<Route path="transactions/:id"')) {
  code = code.replace(
    '<Route path="transactions" element={<TransactionsPage />} />',
    '<Route path="transactions" element={<TransactionsPage />} />\n            <Route path="transactions/:id" element={<TransactionDetailsPage />} />'
  );
}

if (!code.includes('<Route path="failed-payments/:id"')) {
  code = code.replace(
    '<Route path="failed-payments" element={<FailedPaymentsPage />} />',
    '<Route path="failed-payments" element={<FailedPaymentsPage />} />\n            <Route path="failed-payments/:id" element={<FailedPaymentDetailsPage />} />'
  );
}

fs.writeFileSync('client/src/app/router.tsx', code);
console.log("Updated router.tsx");
