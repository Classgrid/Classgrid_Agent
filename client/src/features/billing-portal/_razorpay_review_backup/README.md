<!-- CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK) -->
<!--
─────────────────────────────────────────────────────────
🚨 HOSTING & ARCHITECTURE RULE 🚨
1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
2. FRONTEND IS HOSTED ON VERCEL
─────────────────────────────────────────────────────────
-->

<!--
─────────────────────────────────────────────────────────
🚨 NAMING CONVENTION RULE 🚨
1. "CLASSGRID PLATFORM" is strictly the REPO NAME.
2. chat.classgrid.in (Classgrid AI) is the actual PRODUCT. The ERP is shut down.
3. NEVER use "Classgrid Platform" anywhere in the frontend UI or user-facing text.
─────────────────────────────────────────────────────────
-->

<!--
─────────────────────────────────────────────────────────
🚨 CRITICAL AI AND SYSTEM RULES 🚨
1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
─────────────────────────────────────────────────────────
-->

# ⚠️ Razorpay Review Backup — DO NOT DELETE

These files are the **Razorpay merchant verification versions** of the billing portal pages.
They were built specifically to pass Razorpay's 5-round manual review process.

## What is in here

| File | Purpose |
|---|---|
| `CheckoutPage.RAZORPAY_REVIEW.tsx` | Full checkout page WITH `IS_DEMO = true`, Name + Email input fields (required by Razorpay review team to test the flow manually) |
| `BillingLandingPage.RAZORPAY_REVIEW.tsx` | Full landing page WITH `DemoCard` (amber test card with fake credentials), "Platform Purpose & Operational Flow" popup modal, test credentials (OTP: 123456, Card: 4111..., UPI: success@razorpay) |

## When to restore these

If Razorpay asks for re-verification (e.g., when enabling E-Mandate, UPI AutoPay, or if account is under review):

1. Copy these files back to `../pages/`
2. Rename them (remove `.RAZORPAY_REVIEW` suffix)
3. Set `IS_DEMO = true` and `DEMO_ENABLED = true`
4. Deploy to billing.classgrid.in
5. Submit the review URL to Razorpay support

## What was removed from production

- `IS_DEMO = true` flag → name/email input fields on checkout (not needed — org admin billing details already saved in DB from their billing settings page)
- `DEMO_ENABLED = true` flag → entire DemoCard with fake test credentials
- "Platform Purpose & Operational Flow" popup modal (built to explain business model to Razorpay reviewers after 5 rejections)

## The REAL production flow (no demo stuff needed)

Org Admin (inside school dashboard) → Clicks "Pay Now" on invoice
→ Token generated → Redirect to billing.classgrid.in/checkout?token=xxx  
→ OTP sent to their saved billing email (from DB)
→ They enter OTP → Razorpay checkout opens with DB-prefilled details
→ Pay → Done

Last backed up: 2026-08-03
