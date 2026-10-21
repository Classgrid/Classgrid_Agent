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

import EmailReservation from '../models/EmailReservation.js';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,
});
connection.on('error', (err) => console.warn('[EmailService] Redis error:', err.message));

// Reuse the same queue name as the worker
const provisioningQueue = new Queue('EmailProvisioningQueue', { connection });
provisioningQueue.on('error', (err) => console.warn('[EmailService] Queue error:', err.message));

/**
 * Reserve an institutional email address and enqueue a provisioning job.
 * @param {Object} params
 * @param {string} params.organizationId
 * @param {string} params.email - The requested email (e.g., student@pccoe.classgrid.in)
 * @param {string} params.provider - google_workspace | zoho | internal
 * @param {string} params.intendedUserId - User ID this email is for
 * @param {string} params.password - Initial password for the new email
 */
export const reserveAndProvisionEmail = async ({
  organizationId,
  email,
  provider = 'internal',
  intendedUserId = null,
  password = null
}) => {
  try {
    // 1. Atomic Reservation in MongoDB
    // The unique index on `reserved_email` in EmailReservation model 
    // ensures two users never get the same email during a race condition.
    const reservation = new EmailReservation({
      organization_id: organizationId,
      reserved_email: email.toLowerCase().trim(),
      intended_user: intendedUserId,
      provider,
      status: 'pending'
    });

    await reservation.save();

    // 2. Enqueue Background Provisioning Job
    await provisioningQueue.add(
      'provision-email',
      {
        reservationId: reservation._id,
        provider,
        requestedEmail: email,
        password: password,
        organizationId: organizationId
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000 // 5s, 10s, 20s
        }
      }
    );

    return { success: true, reservationId: reservation._id };
  } catch (error) {
    if (error.code === 11000) {
      throw new Error('This email address has already been reserved or exists.');
    }
    console.error('Email reservation error:', error.message);
    throw error;
  }
};

export default { reserveAndProvisionEmail };
