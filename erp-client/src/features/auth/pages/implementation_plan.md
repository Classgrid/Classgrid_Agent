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

# The Master Admin Onboarding Flow (FINAL)

Person first. Organization second. Completely separated.

---

## Phase 1: Personal Setup (The Human)

### Step 1: Welcome & Identity
- Show "Welcome to Onboarding!"
- Admin confirms/enters their **Full Name**.
- Show: "Welcome, Classgrid Admin [Name]!"

### Step 2: Personal Contact & OTP
- **Email:** Enter/confirm personal email → verify.
- **Phone:** Enter personal phone number → verify via **OTP** (AWS SNS).

### Step 3: Profile Photo
- Upload personal profile photo (dashboard avatar).

### Step 4: Personal Details + @Username
- **Date of Birth**, **Gender**, **Nationality**.
- **Designation/Title** (Principal, Director, Owner — cosmetic only, backend stays `org_admin`).
- **Preferred language**, **Timezone**.
- **@username** setup:
  - A unique handle like `@nikhil` or `@rahul_sharma`.
  - Must be unique across the **entire platform**.
  - Auto-suggest based on their name (e.g., name "Nikhil Shinde" → suggest `@nikhil_shinde`).
  - Saved to **both** the `User` model (new `username` field) AND the `forumusers` MongoDB collection.
  - This way the **same @username** works in Chat mentions AND the Discourse Forum.
- **Alternate phone/email** (optional).
- **Personal Address** (optional).

### Step 5: Security (Password)
- Set up their secure login password.
- *(Personal Setup Done!)*

---

## Phase 2: Organization Setup (The School/Institute)

### Step 6: Platform Terminology & Hierarchy (Visual)
- Show a **visual flow diagram** (inspired by the ChatGPT image) — NOT a table.
- Only show the terms for **their specific org type** (School, Coaching, or Junior College).
- Example for School: Visual flow → `Standard → Class → Section → Students → Teacher → Test`
- Each node has a small description (e.g., "Standard — Overall grade level like 1st, 2nd, 3rd").
- Also show "Other Academic Components" like **Term** and **Homework**.
- Side panel: "What these mean?" with brief definitions.
- Note: "You can customize these terms later from Settings."

### Step 7: Organization Identity & URL
- Upload **Organization Logo**.
- Set the **Custom Portal URL** (e.g., `myschool.classgrid.in`).
  - Auto-suggest available URL based on Org Name.
  - Show available options (one org can't have duplicate).

### Step 8: Organization Details (Auto-Fetched from Demo)
- **Organization Name** (pre-filled from Book a Demo lead).
- **Organization Type** (School / Coaching Institute).
- **Organization Address, City / State / PIN** (pre-filled from Demo, editable).
- **Academic year / session**.
- **Board / curriculum** — CBSE, ICSE, State Board, etc. (from `full_erp_data.json`).
- **Affiliation / registration number** (optional).
- **Organization short name / code**.
- **Default currency**, **Timezone**, **Working days / weekly calendar**.
- **Website URL** (optional, pre-filled from Demo if available).

### Step 9: Organization Official Contact & OTP
- Enter the school's **Official Phone** and **Official Email**.
- Both verified via **OTP** (AWS SNS for phone, AWS SES for email).

---

## End: Thanks & Welcome
- "Thank you! Your workspace is ready."
- Click to enter the live dashboard.

---

> **Note:** Basic Academic Structure (Classes, Sections, Departments) is **NOT** part of this onboarding. That will be a separate setup flow inside the dashboard.
