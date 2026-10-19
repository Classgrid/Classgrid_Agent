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
const file = 'src/features/billing-portal/pages/CheckoutPage.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'import { Spinner } from "@/components/marketing_ui/spinner";',
  'import { Spinner } from "@/components/marketing_ui/spinner";\nimport { NotFoundPage } from "@/features/system/pages/NotFoundPage";'
);

content = content.replace(
  /if \(step === "invalid"\) \{[\s\S]*?\}\s*if \(step === "failed"\)/g,
  'if (step === "invalid") {\n    return <NotFoundPage />;\n  }\n\n  if (step === "failed")'
);

fs.writeFileSync(file, content);
console.log("Replacement successful!");
