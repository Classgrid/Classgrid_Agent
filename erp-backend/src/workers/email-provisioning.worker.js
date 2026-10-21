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

import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import EmailReservation from '../models/EmailReservation.js';

const isDev = process.env.NODE_ENV !== 'production';

let emailProvisioningQueue = null;
let emailProvisioningWorker = null;

if (!isDev) {
    const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
      maxRetriesPerRequest: null,
    });
    connection.on('error', (err) => console.warn('[EmailWorker] Redis error:', err.message));

    emailProvisioningQueue = new Queue('EmailProvisioningQueue', { connection });
    emailProvisioningQueue.on('error', (err) => console.warn('[EmailWorker] Queue error:', err.message));

    emailProvisioningWorker = new Worker(
      'EmailProvisioningQueue',
      async (job) => {
        const { reservationId, provider, orgSubdomain, requestedEmail, password } = job.data;
        
        console.log(`[Worker] Started processing email provision for: ${requestedEmail}`);
        
        try {
          let referenceId = null;

          if (provider === 'google_workspace') {
            console.log(`[Worker] Simulated calling Google Workspace API for ${requestedEmail}...`);
            referenceId = 'google_ws_' + Date.now();
          } else if (provider === 'zoho') {
            console.log(`[Worker] Simulated calling Zoho Mail API for ${requestedEmail}...`);
            referenceId = 'zoho_' + Date.now();
          } else {
            console.log(`[Worker] Reserved ${requestedEmail} Internally...`);
            referenceId = 'internal_' + Date.now();
          }

          await new Promise(resolve => setTimeout(resolve, 2000));

          await EmailReservation.findByIdAndUpdate(reservationId, {
            status: 'provisioned',
            provider_reference_id: referenceId
          });

          console.log(`[Worker] ✅ Success provisioning ${requestedEmail} [Ref: ${referenceId}]`);
          return { success: true, referenceId };

        } catch (error) {
          console.error(`[Worker] ❌ Failed to provision ${requestedEmail}:`, error);
          await EmailReservation.findByIdAndUpdate(reservationId, {
            status: 'failed',
            error_message: error.message
          });
          throw error;
        }
      },
      { 
        connection, 
        concurrency: 5,
        limiter: {
          max: 10,
          duration: 1000
        } 
      }
    );

    emailProvisioningWorker.on('completed', (job) => {
      console.log(`Job ${job.id} has completed successfully!`);
    });

    emailProvisioningWorker.on('failed', (job, err) => {
      console.log(`Job ${job.id} has failed with error ${err.message}`);
    });

    emailProvisioningWorker.on('error', (err) => {
      console.warn(`[EmailWorker] Worker error: ${err.message}`);
    });
} else {
    console.log('👷 Email Provisioning Worker skipped (no Redis in dev)');
}

export { emailProvisioningQueue, emailProvisioningWorker };
