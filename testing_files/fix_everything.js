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
/*
 * ─────────────────────────────────────────────────────────
 * 🚨 CRITICAL AI AND SYSTEM RULES 🚨
 * 1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
 * 2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
 * 3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 NAMING CONVENTION RULE 🚨
 * 1. "CLASSGRID PLATFORM" is strictly the REPO NAME.
 * 2. chat.classgrid.in (Classgrid AI) is the actual PRODUCT. The ERP is shut down.
 * 3. NEVER use "Classgrid Platform" anywhere in the frontend UI or user-facing text.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 HOSTING & ARCHITECTURE RULE 🚨
 * 1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
 * 2. FRONTEND IS HOSTED ON VERCEL
 * ─────────────────────────────────────────────────────────
 */
const fs = require('fs');

// Fix lead-conversion.service.js
let leadContent = fs.readFileSync('server/src/services/lead-conversion.service.js', 'utf8');

const prefix = `import crypto from "crypto";
import mongoose from "mongoose";

import DemoRequest from "../models/DemoRequest.js";
import User from "../models/User.js";
import { provisionDemoOrg } from "./provisioning.service.js";
import { enqueueEmail } from "./email-queue.service.js";
import { sendEmail } from "./aws-ses.service.js";
import { getPlanLimits } from "./module-toggle.service.js";
import { trackOnboardingEvent } from "./onboarding-event.service.js";
import {
  getConsolidatedApprovalEmailHtml,
  getConsolidatedApprovalEmailPlainText,
} from "./email-templates.service.js";

export const generateActivationCredentials = () => {
  const rawActivationToken = crypto.randomBytes(32).toString("hex");
  const hashedActivationToken = crypto
    .createHash("sha256")
    .update(rawActivationToken)
    .digest("hex");

  const activationCode = String(Math.floor(100000 + Math.random() * 900000));
  const activationCodeHash = crypto
`;

leadContent = prefix + leadContent;

leadContent = leadContent.replace(
  /await enqueueEmail\(\{[\s\S]*?to: lead\.adminEmail,[\s\S]*?subject,[\s\S]*?html: getConsolidatedApprovalEmailHtml/,
  `await sendEmail({
        to: lead.adminEmail,
        subject,
        fromName: "Nikhil Shinde | Classgrid CEO",
        fromEmail: "nikhil.shinde@classgrid.in",
        html: getConsolidatedApprovalEmailHtml`
);

leadContent = leadContent.replace(
  /type: "demo_provisioning_onboarding",[\s\S]*?channel: "notification",[\s\S]*?userId: admin\._id,[\s\S]*?organizationId: organization\._id,[\s\S]*?\}\);/g,
  `userId: admin._id,
        organizationId: organization._id,
      });`
);

fs.writeFileSync('server/src/services/lead-conversion.service.js', leadContent);


// Fix OnboardingWizardPage.tsx
let onboardContent = fs.readFileSync('client/src/features/auth/pages/OnboardingWizardPage.tsx', 'utf8');

// Hide back button on step 1
onboardContent = onboardContent.replace(
  /currentStep > 0 && \(\n\s*<Button\n\s*variant="outline"\n\s*onClick=\{handleBack\}/,
  `currentStep > 1 && (
                      <Button
                        variant="outline"
                        onClick={handleBack}`
);

// Completely block UI if no token to fix "Why are you showing this on live site" issue.
// Add early return if !token
onboardContent = onboardContent.replace(
  /const \[isVerifyingOrgEmail, setIsVerifyingOrgEmail\] = useState\(false\);/,
  `const [isVerifyingOrgEmail, setIsVerifyingOrgEmail] = useState(false);\n\n  if (!token) {\n    return (\n      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">\n        <div className="max-w-md w-full bg-card rounded-2xl shadow-xl border border-border p-8 text-center">\n          <div className="size-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">\n            <ShieldCheck className="size-8" />\n          </div>\n          <h2 className="text-2xl font-bold text-foreground mb-4">Invalid Activation Link</h2>\n          <p className="text-muted-foreground mb-8">This onboarding link is invalid or has expired. Please use the secure activation link sent to your email.</p>\n          <Button className="w-full h-12 text-base font-semibold" onClick={() => window.location.href = 'https://classgrid.in'}>Return to Homepage</Button>\n        </div>\n      </div>\n    );\n  }`
);

fs.writeFileSync('client/src/features/auth/pages/OnboardingWizardPage.tsx', onboardContent);

console.log('Fixed both files successfully.');
