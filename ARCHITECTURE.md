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

# Classgrid Platform Architecture

## Deployment Stack
- **Frontend (`client/`)**: Hosted on **Vercel**. Vercel automatically builds and deploys the frontend on push to the `main` branch.
- **Backend (`server/`)**: Hosted on an **AWS EC2 instance (t3.medium)** serving `api.classgrid.in`. 

## Domain Architecture (Security & Compliance)
The platform is decoupled into three strict domain zones to ensure security and pass stringent Payment Gateway (Razorpay) compliance reviews:
1. **`classgrid.in` (Marketing Site)**: A public brochure/marketing website. No application logic or sensitive data is hosted here.
2. **`[school-name].classgrid.in` (The Product)**: The core SaaS ERP. Every onboarded institution receives a secure, isolated subdomain. This is a closed system requiring strict authentication (like a dashboard).
3. **`billing.classgrid.in` (Payment Microservice)**: A completely decoupled, isolated React portal. When an admin needs to pay their subscription invoice, they are securely redirected here with OTP verification.

## Payment & Billing Flows
Classgrid facilitates two distinct financial flows via Razorpay:

### A. B2B Flow (SaaS Subscriptions - 3-Layer Billing)
Institutions are billed monthly dynamically based on consumption. There are no fixed annual fees.
- **Layer 1 (Base Platform Fee)**: Fixed monthly maintenance cost.
- **Layer 2 (Add-on Modules)**: Institutions toggle features ON/OFF (e.g., Canteen, Admissions) and are billed only for active modules.
- **Layer 3 (Infrastructure Usage)**: Micro-billing via backend Node.js cron workers for: Cloudflare R2 (GB/day), AWS SES (emails), SNS (SMS), API requests, AI tokens (OpenAI/Groq/Gemini), and Agora live class participant-minutes.
- **Invoice Generation**: `pdf-invoice.service.js` uses Puppeteer (headless Chrome) to render the usage ledger into a high-fidelity PDF invoice.

### B. B2C/B2B2C Flow (Institution Fee Collection)
For student fee payments (tuition, exams, etc.), Classgrid uses an RBI-licensed Payment Aggregator's Sub-Merchant API.
- Institutions are onboarded as sub-merchants.
- Student payments are settled directly to the institution's bank account via the PA's escrow.
- Classgrid acts purely as a technology routing layer and never holds institutional funds.

## AI Agent Instructions
**CRITICAL**: DO NOT attempt to run `npm run build` or `vite build` inside the `client/` folder on the EC2 server. The EC2 instance has limited RAM and running the frontend build will cause a memory exhaustion crash (OOM killer). The EC2 instance is exclusively used for running the PM2 Node.js backend server.
