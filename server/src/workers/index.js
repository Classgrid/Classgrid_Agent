// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
/*
 * =========================================================================================
 * 🚨 CRITICAL AI & SYSTEM RULE 🚨
 * NO FRONTEND GITHUB ACTIONS: NEVER create yaml files that build/deploy the frontend to EC2.
 * The frontend is hosted 100% on Vercel. EC2 is only for the backend.
 * =========================================================================================
 */

/*
 * =========================================================================================
 * STRICT SECURITY POLICY:
 * NO ONE CAN EVER CHANGE THE ORGANIZATION TYPE FROM THE FRONTEND OR BACKEND.
 * NEVER ADD A DROPDOWN OR OPTION TO CHANGE IT ANYWHERE IN THE CODEBASE.
 * NO MEANS NO. THIS IS A FIXED PLATFORM RULE.
 * =========================================================================================
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
 * 2. "CLASSGRID ERP" is the actual PRODUCT NAME.
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

import './email-provisioning.worker.js';
// import './alarmWorker.js'; // Retired build-robot watchdog (N2): its alarms posted hidden "continue building" chat messages

// Import other workers here as they are created
import './chat-persistence.worker.js';
import './attendance.worker.js';
import './ai-schedule.worker.js';
import { initCronJobs } from './cleanup.worker.js';

import { initAdmissionCronJobs } from './admission-deadline-checker.cron.js';
import { initPromotionSchedulerCron } from './promotion-scheduler.cron.js';
import { initScheduledNotificationWorker } from './scheduled-notification.worker.js';
import { initOrganizationUsageDailyWorker } from './organization-usage-daily.worker.js';
import { initMonthlyInvoiceWorker } from './monthly-invoice.worker.js';
import { initBillingExportWorker } from './billing-export.worker.js';
import { initMarketingEmailWorker } from './marketing-email-blast.worker.js';
import { initCronLinkJobs } from './cron-links.worker.js';

initCronJobs();
initAdmissionCronJobs();
initPromotionSchedulerCron();
initScheduledNotificationWorker();
initOrganizationUsageDailyWorker();
initMonthlyInvoiceWorker();
initBillingExportWorker();
initMarketingEmailWorker();
initCronLinkJobs(); // agent review emails, ticket auto-close, expired messages (were cron-job.org links)
// import './analytics.worker.js';

console.log('👷 Background Workers Initialized');
