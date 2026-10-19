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
import { getConsolidatedApprovalEmailPlainText, getConsolidatedApprovalEmailHtml } from "./server/src/services/email-templates.service.js";

const plainText = getConsolidatedApprovalEmailPlainText({
  adminName: "John Doe",
  orgName: "Global Tech Institute",
  subdomain: "gti",
  activationLink: "https://onboard.classgrid.in/?token=abcdef123456",
  activationCode: "492015",
  activationDate: new Date(),
  expiryDate: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000),
  sandboxDuration: 31,
  allocatedDashboards: ["dashboard_admission", "dashboard_faculty", "dashboard_student"]
});

console.log("=== PLAIN TEXT ===");
console.log(plainText);

const htmlText = getConsolidatedApprovalEmailHtml({
  adminName: "John Doe",
  orgName: "Global Tech Institute",
  subdomain: "gti",
  activationLink: "https://onboard.classgrid.in/?token=abcdef123456",
  activationCode: "492015",
  activationDate: new Date(),
  expiryDate: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000),
  sandboxDuration: 31,
  allocatedDashboards: ["dashboard_admission", "dashboard_faculty", "dashboard_student"]
});

console.log("\n=== HTML CONTENT ===");
console.log(htmlText);
