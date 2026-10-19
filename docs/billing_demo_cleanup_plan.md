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

# Billing Demo Mode Cleanup Plan

Once Razorpay completes their architecture review and approves the flow, follow these steps to remove the demo mode so that `billing.classgrid.in` returns to production mode (only accessible via real dashboard links).

## Step 1: Disable Environment Variables (Fastest Method)
You do not need to delete any code immediately. Simply disable the feature flags in your Vercel dashboard.

**In Vercel (Client App):**
1. Go to your `classgrid-client` project settings > Environment Variables.
2. Change `VITE_BILLING_DEMO_MODE` to `false`.
3. Redeploy the client. The "Try Demo" card will disappear from the landing page.

**In Vercel (Server App):**
1. Go to your `classgrid-server` project settings > Environment Variables.
2. Change `BILLING_DEMO_ENABLED` to `false`.
3. Redeploy the server. The `/api/billing/demo/*` endpoints will return 403 Forbidden.

*Any active demo sessions will automatically expire based on their MongoDB TTL (48 hours).*

---

## Step 2: Code Cleanup (Optional, for clean codebase)
If you want to completely remove the demo code from the repository after approval:

### 1. Remove the Demo Route File
Delete `server/src/routes/billing-demo.routes.js`.

### 2. Remove the Route Registration
In `server/api/index.js`, remove:
```javascript
import billingDemoRoutes from "../src/routes/billing-demo.routes.js";
app.use("/api/billing/demo", billingDemoRoutes);
```

### 3. Clean up the Frontend
In `client/src/features/billing-portal/pages/BillingLandingPage.tsx`:
1. Delete the `DemoCard` component.
2. Delete `const DEMO_ENABLED = ...`.
3. Remove `{DEMO_ENABLED && <DemoCard />}` from the JSX.
4. Remove the `CopyButton` component.

### 4. Clean up Environment Variables
Remove `VITE_BILLING_DEMO_MODE` from `client/.env.local` and `BILLING_DEMO_ENABLED` from `server/.env`.
