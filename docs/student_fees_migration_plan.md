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

# Student Fee Payment Migration: Razorpay → Easebuzz Sub-Merchant

## Background

After the Razorpay technical review call (Ticket #20175305), it was confirmed:

> Classgrid **cannot** use the "each org pastes their own Razorpay API keys" model for student fee payments. RBI's payer-payee transparency rules (Sept 2025) block a third-party domain from creating orders for another merchant without a Payment Aggregator (PA) license.

**Decision:** Migrate student → institution fee payments to **Easebuzz Sub-Merchant API** (or alternative sub-merchant provider like Cashfree).

- Easebuzz holds the RBI PA license (Classgrid never touches money)
- Colleges get a sub-merchant account created via API (no manual Razorpay account needed)
- Classgrid controls the entire onboarding experience (embedded KYC iframe inside dashboard)

> [!IMPORTANT]
> **Flow 1 (Admin pays Classgrid SaaS invoice via billing.classgrid.in) is UNTOUCHED.**
> Only the Student → Institution fee payment flow changes.

---

## What Changes vs. What Stays the Same

| Component | Status |
|---|---|
| `billing.classgrid.in` checkout | ✅ No change (SaaS only) |
| `billing-handoff.routes.js` | ✅ No change |
| `billing-checkout.routes.js` | ✅ No change |
| `BillingHandoff` model | ✅ No change |
| `PaymentOrder` model | ✅ No change |
| `fees.routes.js` — `/razorpay/order` | ❌ Replace with Gateway |
| `fees.routes.js` — `/razorpay/verify` | ❌ Replace with Gateway |
| `fees.routes.js` — `/razorpay/webhook` | ❌ Replace with Gateway |
| `fees.routes.js` — `/razorpay/config` | ❌ Replace with Gateway onboarding |
| `Organization.js` model | 🔶 Replace 3 Razorpay fields with Sub-Merchant fields |
| Supabase `fee_payments` table | 🔶 Add new gateway txn id columns |
| Frontend fee payment flow | 🔶 Minor change (same UX, different API call) |

---

## Architecture: Before vs. After

### Before (Rejected by Razorpay/RBI)
```
Student → billing.classgrid.in (Razorpay modal using College's key_id)
                ↓
         College's Razorpay Account
                ↓
         College's Bank Account
         
❌ RBI: "Classgrid is acting as a Payment Aggregator"
```

### After (Sub-Merchant API)
```
Student → fees page on org.classgrid.in (Checkout using College's MID)
                ↓
         PA-licensed escrow (T+1 settlement)
                ↓
         College's Bank Account

✅ PA holds license — Classgrid is just software
```

---

## Step-by-Step Migration Plan

---

### Step 1 — Register Classgrid as Partner

**Who does it:** Business team

1. Apply as a **Technology Partner / Platform Partner** (Easebuzz or Cashfree)
2. Tell them: "We are a SaaS EdTech platform. We want to use your Sub-Merchant API to onboard educational institutions and collect student fees on their behalf."
3. Get access to the **Sub-Merchant Onboarding API** docs

**What you receive:**
- `PLATFORM_KEY`
- `PLATFORM_SALT`
- Sub-Merchant Onboarding API endpoint
- Payment Initiation API endpoint

---

### Step 2 — Update `.env` / Environment Variables

**File:** `server/.env` (and Vercel env settings)

```diff
# KEEP RAZORPAY FOR SAAS:
  RAZORPAY_KEY_ID=rzp_live_...

# ADD SUB-MERCHANT CREDENTIALS:
+ GATEWAY_PLATFORM_KEY=your_platform_key_here
+ GATEWAY_PLATFORM_SALT=your_platform_salt_here
+ GATEWAY_API_URL=https://api.paymentgateway.com
```

---

### Step 3 — Update `Organization.js` Model

**File:** `server/src/models/Organization.js`

Remove the 3 per-org Razorpay fee fields and replace with sub-merchant fields:

```diff
- fees_razorpay_key_id: { type: String, default: "" },
- fees_razorpay_key_secret: { type: String, default: "" },
- fees_razorpay_webhook_secret: { type: String, default: "" },

+ gateway_merchant_id: { type: String, default: "" },
+ gateway_onboarding_status: {
+   type: String,
+   enum: ["not_started", "pending_kyc", "under_review", "active", "rejected"],
+   default: "not_started"
+ },
```

---

### Step 4 — Create `gateway.service.js`

**File:** `server/src/services/gateway.service.js` *(NEW FILE)*

```javascript
// Onboard a new sub-merchant (college)
export async function createSubMerchant({ orgName, email, mobile, pan, bankAccount, ifsc }) {
  // POST /sub-merchant/onboard
  // Returns: { sub_merchant_id, onboarding_url (for KYC iframe) }
}

// Initiate a payment for a student
export async function initiatePayment({ subMerchantId, amount, studentFeeId, studentEmail, returnUrl }) {
  // POST /payment/initiate
}

// Verify a payment after success callback
export async function verifyPayment({ txnId, amount }) {
  // POST /payment/details
}
```

---

### Step 5 — Rewrite `fees.routes.js` Payment Endpoints

**File:** `server/src/routes/fees.routes.js`

#### Replace `POST /razorpay/order` → `POST /gateway/initiate`
Create order via Gateway using the sub-merchant ID.

#### Replace `POST /razorpay/verify` → `POST /gateway/verify`
Verify hash from callback.

#### Replace `POST /razorpay/webhook` → `POST /gateway/webhook`
Server-to-server webhook.

#### Replace `PUT /razorpay/config` → `POST /gateway/onboard`
Trigger KYC onboarding to get `onboarding_url`.

---

### Step 6 — Update Supabase `fee_payments` Table

Add two columns:

```sql
ALTER TABLE fee_payments 
  ADD COLUMN gateway_txn_id TEXT,
  ADD COLUMN gateway_payment_id TEXT;
```

---

### Step 7 — Update Frontend

**Files to update:**
- Fee payment button component → call `POST /api/fees/gateway/initiate`
- Replace Razorpay checkout JS (`window.Razorpay`) with new checkout JS
- Org Admin settings page → replace "Enter Razorpay Keys" form with "Connect Gateway" button (triggers onboarding iframe)

---

### Fast-Track Alternative: UPI Intent (Phase 1)
If getting partner approval takes too long, you can launch immediately with **UPI Intent**:

1. Add `upi_vpa` to `Organization.js`.
2. Org admin saves their UPI ID (e.g. `collegefees@bank`).
3. Frontend generates `upi://pay?pa=collegefees@bank&am=1000` QR code.
4. Student pays directly from GPay/PhonePe to college.
5. Zero compliance risk, zero cost.
6. Admin manually marks fee as paid in the dashboard.
