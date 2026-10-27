/*
 * ─────────────────────────────────────────────────────────
 * 🚫 NO BLOCKS RULE (owner's order, 2026-10-23) 🚫
 * Claude and every AI model are FORBIDDEN to add any kind of block, restriction, allowlist or
 * "only for X" rule (owner-only, super-admin-only, email checks, test-number-only, role checks)
 * unless the owner explicitly asks for that exact limit.
 * Every feature is for ALL users. Project Mode is for all users, never super-admin only.
 * ─────────────────────────────────────────────────────────
 */
/*
 * ─────────────────────────────────────────────────────────
 * 🚫 NO DISK BLAME RULE (owner's order, 2026-10-27) 🚫
 * Claude and every AI model are FORBIDDEN to say an error comes from a full disk or low disk space.
 * The owner's disks are not full. Never guess the cause of an error: read the real logs and code first,
 * and only name a cause that was actually seen.
 * ─────────────────────────────────────────────────────────
 */
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

import mongoose from 'mongoose';

const orgSubscriptionSchema = new mongoose.Schema({
  organization_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    unique: true
  },
  plan: {
    type: String,
    enum: ['sandbox', 'demo', 'active'], // 🛑 Strict Single-Plan Enterprise Model
    default: 'demo'
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled', 'grace_period'],
    default: 'active'
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    default: () => new Date(+new Date() + 31 * 24 * 60 * 60 * 1000) // Default 31 days demo
  },
  razorpay_subscription_id: {
    type: String,
    default: null
  },
  razorpay_customer_id: {
    type: String,
    default: null
  },
  features: {
    attendance: { type: Boolean, default: true },
    examinations: { type: Boolean, default: true },
    admissions: { type: Boolean, default: true }, 
    canteen: { type: Boolean, default: true },     
    ai_viva: { type: Boolean, default: true },     
    naac_auditor: { type: Boolean, default: true } 
  },
  metadata: {
    demo_review_reminder_sent_at: { type: Date, default: null },
    demo_ending_soon_sent_at: { type: Date, default: null },
    demo_final_reminder_sent_at: { type: Date, default: null },
    demo_payment_required_sent_at: { type: Date, default: null }
  },

  // ── Billing Rates (set by Super Admin per org) ─────────────────────
  // All values are in INR. Leave at 0 until Super Admin configures them.
  billing: {
    basePricePerMonth:   { type: Number, default: 0 },   // Optional fixed monthly platform fee
    pricePerGB:          { type: Number, default: 0 },   // ₹ per GB-month; daily ledger stores GB-days
    pricePerEmail:       { type: Number, default: 0 },   // ₹ per sent email
    pricePerSms:         { type: Number, default: 0 },   // ₹ per sent SMS segment
    pricePerApiRequest:  { type: Number, default: 0 },   // ₹ per API request (EC2/Vercel)
    pricePerAiToken:     { type: Number, default: 0 },   // ₹ per AI token (OpenAI/Groq/Cloudflare)
    pricePerAgoraMinute: { type: Number, default: 0 },   // ₹ per Agora video participant-minute
    modulePrices:        { type: Map, of: Number, default: {} }, // Custom monthly price per module (INR)
  }

}, { timestamps: true });

// Index for expiry worker
orgSubscriptionSchema.index({ expiresAt: 1, status: 1 });

const OrgSubscription = mongoose.model('OrgSubscription', orgSubscriptionSchema);

export default OrgSubscription;
