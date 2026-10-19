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

// Add import
if (!code.includes('FraudLogsPage')) {
  code = code.replace(
    'import FailedPaymentsPage from "@/features/superadmin/billing/pages/FailedPaymentsPage";',
    'import FailedPaymentsPage from "@/features/superadmin/billing/pages/FailedPaymentsPage";\nimport FraudLogsPage from "@/features/superadmin/billing/pages/FraudLogsPage";'
  );
}

// Add route
if (!code.includes('<Route path="fraud-logs"')) {
  code = code.replace(
    '<Route path="failed-payments/:id" element={<FailedPaymentDetailsPage />} />',
    '<Route path="failed-payments/:id" element={<FailedPaymentDetailsPage />} />\n            <Route path="fraud-logs" element={<FraudLogsPage />} />'
  );
}

fs.writeFileSync('client/src/app/router.tsx', code);
console.log("Updated router.tsx for FraudLogsPage");
