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

# Classgrid - Complete End-to-End Onboarding Flow
### Product-grade, code-verified onboarding spec for a vertical SaaS ERP

---

## Executive Summary

This document now serves **two purposes at once**:
- It is a **code-verified reference** for how onboarding currently works across the marketing site and backend.
- It is a **target operating spec** for what "SaaS-grade onboarding" should mean inside Classgrid.

The current system is already strong because it supports:
- lead capture
- meeting scheduling
- approval and tenant provisioning
- org admin activation
- faculty and student onboarding
- trial provisioning
- hierarchy, admission, fee, and feature-flag setup

That means Classgrid is **well past MVP**. It is not a basic sign-up flow. It is a real institutional onboarding engine.

At the same time, the bar for a **10/10 SaaS onboarding system** is higher than just "many features exist". A 10/10 system is:
- consistent
- self-serve where possible
- safe to retry
- observable end to end
- easy for sales, support, and customers to reason about
- aligned with what the product story promises

---

## Current Maturity Assessment

### Current score: **7/10 SaaS maturity for a vertical ERP product**

### Why it is already strong

The existing onboarding flow solves real institution-scale problems:
- Converts a marketing lead into a live tenant with working credentials and onboarding email flows.
- Creates the organization, admin account, subscription, and join codes in one backend-controlled path.
- Supports multiple institution types with different academic structures.
- Separates org admin, faculty, and student onboarding paths instead of forcing one generic flow.
- Uses activation tokens, role checks, and transactional provisioning patterns.
- Connects onboarding to real ERP setup: hierarchy, subjects, classrooms, fees, admissions, HR, and canteen.

### Why it is not yet 10/10

The main blockers are product-operational, not ambition-related:
- Too many critical steps still depend on Super Admin action.
- Legacy plan logic and newer subscription logic still overlap.
- Some onboarding milestones exist in the schema but were not fully driven by actual events.
- A few implementation details did not fully match the story told in the document.
- The system needs stronger observability, retry safety, and customer-facing progress clarity.

---

## What Was Corrected In Code

The following onboarding issues were fixed during this pass:
- `approveLeadAndProvision()` now defines the plan before building approval email payloads.
- Approval email capacity values now come from actual plan limits instead of broken conditional logic.
- Lead conversion now passes `city` and `state` into organization provisioning.
- Faculty and student join codes are now generated as **different secure codes**.
- `tenant_created` is now marked at organization creation time.
- `first_login_completed` is now marked automatically when the org admin activates the account.
- `admission_form_configured` is now included in onboarding progress calculations.
- `OrgSubscription` now enforces a strict single-plan enterprise model (`demo` -> `active`).
- Join-code regeneration now returns separate `organizationCode` and `honorCode` values.

These fixes make the implementation closer to the product narrative and reduce onboarding-time failure risk.

---

## What "10/10" Means For This Document

This document should now be read with **two layers** in mind:

### Layer 1: Current State
This is the code-verified flow that exists now.

### Layer 2: Quality Bar
A true 10/10 onboarding system for Classgrid must satisfy these standards:
- Every major step is stateful and measurable.
- Every irreversible action is auditable.
- Every provisioning step is safe to retry.
- Every actor knows what to do next without back-channel support.
- Every email, token, code, and status transition maps cleanly to backend state.
- Every onboarding checklist item is driven by actual product events where possible, not only manual toggles.

---

## 10/10 SaaS Design Principles

These are the non-negotiable principles this onboarding flow should ultimately satisfy:

1. **Single source of truth**
   The backend state must always win over documentation, UI assumptions, or ops memory.

2. **Self-serve by default**
   Super Admin intervention should be required only for sales approval, compliance, or exception handling.

3. **Retry-safe provisioning**
   Provisioning should be idempotent so duplicate clicks, queue retries, or partial failures do not corrupt tenant state.

4. **Progress must be real**
   Onboarding completion should be derived from actual milestones such as first login, first hierarchy, first faculty import, and first student activation.

5. **Every transition should be explainable**
   A support agent or sales operator should be able to answer: what happened, when it happened, what failed, and what is blocking go-live.

6. **Security should not fight activation**
   Tokens, join codes, and role checks should be strict, but not so brittle that real customers get stuck during first setup.

7. **Institution-specific flexibility without chaos**
   School, engineering, coaching, diploma, and junior college flows should feel native without introducing inconsistent hidden rules.

---

## 10/10 SaaS Outcome Definition

A "10/10" onboarding outcome for Classgrid means:
- A lead can move from interest to live tenant with minimal manual back-and-forth.
- The principal receives one clean activation path and understands the next three actions clearly.
- The org admin can finish first setup without needing internal team intervention for routine steps.
- Faculty onboarding and student onboarding are secure but friction-aware.
- Sales, implementation, and support can see onboarding state without asking engineering.
- The product can prove where institutions drop off and which steps create the most friction.

---

## Reading Guide

Use the rest of this document in this order:
- **Phase 1-4**: commercial conversion and secure tenant activation
- **Phase 5**: org admin setup and operational configuration
- **Phase 6-7**: staff and student onboarding mechanics
- **Phase 8**: subscription/trial posture
- **Final sections**: email timeline, security summary, and 10/10 improvement checklist

---
## PHASE 1: LEAD CAPTURE (Marketing Website → Backend)

### Step 1.1: School Fills the Demo Form
**Where:** Marketing website (`classgrid_marketting/components/sections/DemoRequestForm.tsx`)
**API Hit:** `POST /api/public/request-demo`

The school principal visits `classgrid.in` and fills the "Request a Demo" form with these **required fields**:
- Institution Name
- Organization Type (School / Engineering / Coaching / Junior College)
- Admin Name (Principal's name)
- Admin Email
- Admin Phone
- State
- City
- Message (optional)

**Security:** The form is protected by **Cloudflare Turnstile** (anti-bot CAPTCHA). The backend verifies the token before accepting the submission.

### Step 1.2: What Happens Instantly After They Submit
**TWO emails are sent simultaneously** (verified from `notification-email.service.js` lines 586-601):

| # | Email Sent To | Email Type | Purpose |
|---|--------------|------------|---------|
| 1 | **You (Super Admin)** at `nikhil.shinde@classgrid.in` | `demo_lead_alert` | Alert: "New Demo Lead: ABC School" with all their details + a link to your Super Admin Dashboard |
| 2 | **The School Principal** (the person who filled the form) | `demo_lead_ack` | Acknowledgment: "Your Classgrid Demo Request Is Received" — A polished welcome email confirming their request |

### Step 1.3: Lead is Saved to Database
**Model:** `DemoRequest` (from `models/DemoRequest.js`)

The lead is stored with status: `"new"` and these fields tracked:
- `meetingStatus: "pending"`
- `status: "new"` (lifecycle: `new` → `contacted` → `closed` → `converted`)
- `convertedAt: null`
- `provisionedOrganizationId: null`

---

## PHASE 2: DEMO MEETING SCHEDULING

### Step 2.1: Self-Schedule (The School Books Their Own Meeting)
**Where:** Marketing website success page (`DemoMeetingCaptureForm.tsx`)
**API Hit:** `POST /api/public/request-demo/:id/meeting-booked`

After submitting the demo form, the school is redirected to a success page where they can **pick a meeting time slot** themselves. They provide:
- Scheduled Date/Time
- Provider (Google Meet / Zoom)
- Meeting URL
- Notes

**Security:** Protected by `DEMO_SCHEDULER_WEBHOOK_SECRET` header validation.

### Step 2.2: What Happens After Meeting is Booked
**TWO more emails are sent** (verified from `notification-email.service.js` lines 669-702):

| # | Email Sent To | Email Type | Purpose |
|---|--------------|------------|---------|
| 3 | **The School Principal** | `demo_meeting_scheduled` | "Demo Meeting Scheduled" with date, time, provider, and meeting link |
| 4 | **You (Super Admin)** | `demo_meeting_scheduled_internal` | "Lead Meeting Confirmed: ABC School" so you know to join the call |

The lead status automatically updates: `"new"` → `"contacted"`

### Step 2.3: Can You (Super Admin) Schedule the Meeting?
**YES.** From your Super Admin Dashboard (`/superadmin/leads/[id]`), you can update the meeting details and the same notification emails will fire.

---

## PHASE 3: APPROVAL & PROVISIONING (The Magic Button)

### Step 3.1: Super Admin Clicks "Approve & Provision"
**Where:** Super Admin Dashboard → Leads → Lead Detail Page
**Service:** `lead-conversion.service.js` → `approveLeadAndProvision()`

The subscription lifecycle is intentionally simple:
- `demo` — a compulsory 31-day onboarding/demo period
- `active` — the single paid production state after demo conversion

Pricing is **not decided in this document**. The product should only communicate that the organization starts on demo and then moves to the paid active state.

### Step 3.2: What the Backend Does Automatically (Atomic Transaction)
The `provisionDemoOrg()` function in `provisioning.service.js` runs inside a **MongoDB transaction** (all-or-nothing):

1. **Normalizes Org Type:** `"college"` → `"engineering"`, validates against allowed list: `school`, `junior_college`, `engineering`, `coaching`, `diploma`, `other`
2. **Resolves Structure Type:** Determines `engineering_with_div`, `school_no_div`, etc. based on org type
3. **Generates Unique Codes:**
   - `organizationCode` — Faculty join code (e.g., `CG-XK7M`)
   - `honorCode` — Student join code (e.g., `CG-P9R2`)
   - `private_code` — Legacy internal code
4. **Creates the Org Admin User Account:**
   ```
   role: "org_admin"
   status: "active"
   mustResetPassword: true    ← Forces password setup on first login
   isEmailVerified: true      ← Pre-verified (no email verification needed)
   authProvider: "manual"
   ```
5. **Creates the Organization Record:**
   - Sets `org_type`, `structure_type`, `division_mode`
   - Sets default branding colors (`#4a90f5` primary, `#8b6fff` secondary)
   - Auto-configures admission form fields based on org type
   - Sets `demoExpiresAt` = 31 days from now
6. **Creates OrgSubscription:**
   ```
   plan: "demo"
   status: "active"
   isPaid: false
   expiresAt: 31 days from now
   ```
7. **Links Admin to Organization:** Sets `organization_id` on the admin user

### Step 3.3: Generates Secure Activation Token
```javascript
const rawActivationToken = crypto.randomBytes(32).toString("hex");
// Hashed with SHA-256 before storing in DB
admin.activationToken = hashedActivationToken;
admin.activationTokenExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 MINUTES ONLY
```

### Step 3.4: The BIG Email is Sent (Email #5 — The Most Important One)
**Template:** `getConsolidatedApprovalEmailHtml()` (lines 1673-1845 of `email-templates.service.js`)

This is a **massive, professionally designed email** that contains EVERYTHING the Org Admin needs:

| Section | Content |
|---------|---------|
| 🎉 Header | "[Org Name] is now live on Classgrid" |
| 📊 Plan Info | Current subscription state, demo window, and capacity details |
| 🏫 Organization Codes | **Faculty Code** (blue, with "Do not share with students" warning) + **Student Honor Code** (green) |
| 🚀 Getting Started | Step-by-step: How to invite Faculty, How Students join |
| 🔑 Activation Button | **"Activate Admin Account"** — Single-use link, expires in 5 minutes |
| 🎛️ Dashboard Link | **"Open Org Admin Dashboard"** — Premium gradient button to bookmark |

### Step 3.5: Lead Status Updated
```javascript
lead.status = "converted";
lead.convertedAt = new Date();
lead.provisionedOrganizationId = organization._id;
lead.provisionedAdminId = admin._id;
```

---

## PHASE 4: ORG ADMIN ACCOUNT ACTIVATION

### Step 4.1: Principal Clicks "Activate Admin Account" in Email
**URL:** `https://classgrid.in/admin/activate?token=<64-char-hex-token>`
**API Hit:** `POST /api/auth/validate-activation-token`

The backend:
1. Hashes the token from the URL with SHA-256
2. Looks up `User` where `activationToken === hashedToken` AND `activationTokenExpires > now`
3. If valid → shows the "Set Password" form
4. If expired → shows "Token expired, request a new one"

### Step 4.2: Principal Sets Their Password
**API Hit:** The activation endpoint in `auth.controller.js`

```javascript
user.password = newHashedPassword;
user.activationToken = null;           // Token is destroyed (single-use)
user.activationTokenExpires = null;
user.mustResetPassword = false;        // Account is now fully activated
await user.save();
```

### Step 4.3: Principal Lands on Org Admin Dashboard
They are now logged in and redirected to `/org/dashboard` — their master control panel.

**Total Emails Sent So Far: 5**

---

## PHASE 5: ORG ADMIN INITIAL SETUP (Everything They Must Configure)

Once the Org Admin is inside the dashboard, they need to configure **8 major setup categories** before the platform is fully operational. The backend tracks their progress via the `onboarding_progress` object in the Organization model.

### ✅ Onboarding Progress Tracker (Built into the Database)
```
onboarding_progress: {
    tenant_created: true/false,
    branding_configured: true/false,
    academic_hierarchy_set: true/false,
    staff_imported: true/false,
    students_imported: true/false,
    fee_structure_configured: true/false,
    admission_form_configured: true/false,
    first_login_completed: true/false,
    completed_at: Date
}
```

---

### 5.1: 🏫 Organization Identity (`/org/settings`)

| Setting | Field in DB | Example Value |
|---------|------------|---------------|
| Institution Name | `name` | "PCCOE Pune" |
| Institution Logo | `logo_url` | S3/Supabase URL |
| Official Address | `address` | "Nigdi, Pune 411044" |
| Owner/Principal Name | `ownerName` | "Dr. Sharma" |
| Owner Email | `ownerEmail` | "principal@pccoe.edu.in" |
| Contact Number | `contactNumber` | "+919876543210" |
| Website URL | `website` | "https://pccoe.edu.in" |
| Principal's Designation | `designation` | "Director" |
| University Affiliation | `affiliation` | "Savitribai Phule Pune University" |
| Subdomain Slug | `subdomain` | "pccoe" → pccoe.classgrid.in |

---

### 5.2: 🏗️ Academic Hierarchy Structure (`/org/settings/branches`)

This is the **most critical** setup step. It defines how the entire institution is organized.

**Organization Type** (`org_type`): Determines the base hierarchy:

| Org Type | Structure Options | Hierarchy |
|----------|------------------|-----------|
| `engineering` | `engineering_with_div` / `engineering_no_div` | Degree → Dept → Year → Semester → Division/Batch |
| `school` | `school_with_div` / `school_no_div` | Standard → Division |
| `junior_college` | `junior_college_with_div` / `junior_college_no_div` | Stream → Standard → Division |
| `coaching` | `coaching` | Course → Batch (NO divisions, NO semesters) |
| `diploma` | `diploma_with_div` / `diploma_no_div` | Dept → Year → Semester → Division |

**Division Mode** (`division_mode`):
- `with_divisions`: Students are split into Division A, B, C
- `without_divisions`: Auto-creates a single "Default Division"

**Sub-Batch Support** (`allow_sub_batches`):
- Engineering/Diploma only: Splits Division A into Lab Batch A1, A2 for practical sessions

**Academic Config** (`academic_config`):

| Setting | Purpose | Options |
|---------|---------|---------|
| `identifierLabel` | What students call their ID number | "PRN" / "Roll No" / "Enrollment No" |
| `prnRequired` | Is the ID number mandatory? | true/false |
| `prnLocked` | Lock PRN after first submission? | true/false |
| `batches` | Academic admission years | ["2022-2026", "2023-2027"] |
| `branches` | Departments/Streams | ["Computer", "IT", "Mechanical"] |
| `requiredFields.prn` | Is PRN required for profile completion? | true/false |
| `requiredFields.batch` | Is batch required? | true/false |
| `requiredFields.branch` | Is branch required? | true/false |
| `idCardFields` | What shows on ID card | ["prn"] / ["rollNo"] / ["both"] |

---

### 5.3: 🎨 Branding & Theme (`/org/settings`)

| Setting | Field in DB | Default |
|---------|------------|---------|
| Primary Color | `branding.theme_colors.primary` | `#6366f1` (Indigo) |
| Secondary Color | `branding.theme_colors.secondary` | `#4f46e5` (Dark Indigo) |
| Accent Color | `branding.theme_colors.accent` | `#f43f5e` (Rose) |
| Font Preference | `branding.font_preference` | "Inter" |
| Tagline | `branding.tagline` | "" |

These colors dynamically theme the student/faculty dashboards so each institution feels like their own branded app!

---

### 5.4: 🎓 Admission Engine Configuration (`/dept/admissions/config`)

This is an ENORMOUS configuration system. Here's everything:

**Master Switches:**

| Setting | Purpose |
|---------|---------|
| `is_portal_open` | Opens/closes the public admission form |
| `is_merit_list_published` | Shows/hides merit list on public portal |
| `registration_fee` | Fee to apply (₹0 = free application) |
| `max_applications_per_student` | How many branches can a student apply to |
| `cutoff_date` | Last date to accept applications |
| `instructions` | Custom text shown to applicants |

**Seat Matrix & Reservation Policy:**
```
seat_matrix_policy: {
    enabled: true,
    categories: [
        { category_name: "OPEN", reservation_percentage: 50 },
        { category_name: "OBC", reservation_percentage: 27 },
        { category_name: "SC", reservation_percentage: 15 },
        { category_name: "ST", reservation_percentage: 7.5 }
    ],
    supernumerary_seats: {
        tfws_percent: 5,    // Tuition Fee Waiver Scheme
        ews_percent: 10     // Economically Weaker Section
    }
}
```

**Tie-Breaking Rules** (When two students have the same percentage):
```
tie_breaker_rules: [
    { priority: 1, criteria: "math_marks", order: "desc" },
    { priority: 2, criteria: "science_marks", order: "desc" },
    { priority: 3, criteria: "date_of_birth", order: "asc" }  // Older wins
]
```

**Waitlist & Deadlines:**

| Setting | Purpose | Default |
|---------|---------|---------|
| `waitlist_enabled` | Auto-create waitlist for overflow | true |
| `auto_promote_waitlist` | Auto-trigger next round when seats expire | false |
| `fee_payment_deadline_hours` | Hours to pay before admission is cancelled | 48 hours |
| `cancellation_handling` | What happens when someone cancels | "return_to_pool" or "manual_review" |

**Multi-Round Admission:**
```
admission_round: {
    current_round: 1,
    max_rounds: 3,
    round_history: [
        { round_number: 1, merit_list_published_at: Date, seats_filled: 120, seats_remaining: 30 }
    ]
}
```

**Workflow Execution Engine:**

| Setting | Purpose | Options |
|---------|---------|---------|
| `require_admin_document_verification` | Must admin manually verify PDFs before student pays? | true (Standard) / false (CET already verified) |
| `prn_generation` | When is the PRN generated? | "post_allotment_pre_fee" (Engineering CET) / "post_fee_payment" (Standard) |
| `login_credential_dispatch` | When does student get login access? | "with_allotment_email" / "post_fee_payment" |

**Document Validity:**
```
application_config: {
    document_validity_days: {
        caste_cert: 365,    // Must be less than 1 year old
        income_cert: 365,
        aadhar: null         // Never expires
    }
}
```

**Org-Type Specific Form Defaults:**

| Org Type | Default Fields Count | Default Documents |
|----------|---------------------|-------------------|
| Engineering | **99 fields** (full compliance) | Allotment letter, 12th marksheet, Aadhar, Caste cert, etc. (10 docs) |
| School | **29 fields** (lightweight) | Transfer cert, Birth cert, Aadhar, Previous records (6 docs) |
| Coaching | **21 fields** (fast-track) | Aadhar, Photo, 10th marksheet (3 docs) |
| Junior College | **70 fields** (heavy, no CET) | 10th marksheet, Transfer cert, Aadhar, Caste cert (7 docs) |
| Diploma | **30 fields** (mid-weight) | Allotment letter, 10th marksheet, Aadhar, Caste cert (5 docs) |

**Custom Form Builder** (`form_builder_config`):
- Org Admin can add **custom fields** (text, number, date, dropdown, boolean, file)
- Each field can be toggled ON/OFF independently for Admission form vs Onboarding form
- Example custom field: "Preferred Bus Route" (dropdown with options)

**Admission Strategies per Org Type:**

| Org Type | Auth Method | Ranking | Seat Types | Govt Exports |
|----------|------------|---------|------------|-------------|
| Engineering | CET EN + OTP | CAP Round | CAP, Institutional, Management, Spot | DTE CSV, AICTE CSV |
| School | Phone OTP | Merit % | General, RTE, Management | SARAL CSV |
| Coaching | Phone OTP | First-Come-First-Served | Regular, Discount, Early Bird | None |
| Junior College | Phone OTP | 10th Merit | CAP, Management, Minority | State Board CSV |
| Diploma | CET EN + OTP | CAP Round | CAP, Institutional, Management | DTE CSV |

---

### 5.5: 💰 Fee & Payment Configuration

**Per-Org Razorpay Keys** (Money goes directly to the college, NOT to Classgrid):

| Setting | Purpose |
|---------|---------|
| `fees_razorpay_key_id` | College's own Razorpay Key ID |
| `fees_razorpay_key_secret` | College's own Razorpay Secret |
| `fees_razorpay_webhook_secret` | Webhook verification for payment callbacks |

**Admission Fee Mapping:**
```
fee_config: {
    admission_fee_structure_id: ObjectId,  // Default fee template
    dynamic_fee_mapping: [
        { attribute: "TFWS", attribute_type: "seat_type", fee_structure_id: ObjectId },
        { attribute: "OBC", attribute_type: "category", fee_structure_id: ObjectId }
    ],
    refund_policy: {
        enabled: true,
        rules: [
            { days_before_start: 30, refund_percentage: 100 },
            { days_before_start: 15, refund_percentage: 50 },
            { days_before_start: 0, refund_percentage: 0 }
        ]
    },
    session_start_date: Date
}
```

---

### 5.6: 🏢 HR & Payroll Configuration (`/dept/hr`)

| Setting | Purpose | Default |
|---------|---------|---------|
| `hr_config.biometric_api_key` | Token from physical biometric device | "" |
| `hr_config.biometric_secret_hash` | HMAC payload signing secret | "" |
| `hr_config.whitelisted_ips` | Only these IPs can push attendance data | [] |
| `hr_config.payroll_config.default_salary_mode` | How salaries are calculated | "hourly" / "monthly" / "none" |
| `hr_config.payroll_config.standard_working_hours` | Daily working hours | 8 |

---

### 5.7: 🍔 Canteen Configuration (`/dept/canteen`)

| Setting | Purpose | Default |
|---------|---------|---------|
| `canteen_config.is_active` | Enable/disable canteen module | false |
| `canteen_config.operating_mode` | Standard or Max capacity | "standard" |
| `canteen_config.canteen_razorpay_key_id` | Canteen owner's Razorpay Key | "" |
| `canteen_config.canteen_razorpay_key_secret` | AES-256 encrypted before storing | "" |
| `canteen_config.canteen_razorpay_webhook_secret` | AES-256 encrypted before storing | "" |

**Note:** The canteen has its **own separate Razorpay keys** because the canteen vendor is a different business entity than the college!

---

### 5.8: 🎛️ Feature Flags (Premium Modules — Toggled by Super Admin/Sales)

These are NOT self-service. The Classgrid sales team enables these when the organization is moved to the paid active state and the required capabilities are approved operationally:

| Flag | Module | Default |
|------|--------|---------|
| `feature_flags.naac_module` | NAAC/NBA Compliance Auditor tab | false |
| `feature_flags.hr_module` | Enterprise HR + Biometric + Payroll | false |
| `feature_flags.marketplace_module` | Student Notes Marketplace | false |
| `feature_flags.admission_module` | Full Admission Engine portal | false |
| `feature_flags.canteen_module` | Canteen Management System | false |
| `feature_flags.exam_proctoring` | AI Proctoring for online exams | false |

---

### 5.9: 🔐 Security & Access Control

| Setting | Purpose |
|---------|---------|
| `allowed_domains` | Only emails from these domains can join (e.g., ["pccoe.edu.in"]) |
| `org_code_expires_at` | Auto-expire the join codes (null = never) |
| `org_code_regenerated_at` | Tracks when codes were last regenerated |
| `organizationCode` | Faculty join code (12-char alphanumeric) |
| `honorCode` | Student join code (12-char alphanumeric) |
| `private_code` | Legacy internal code |

---

### 5.10: 📊 Platform Subscription (Managed by Classgrid, not Org Admin)

| Setting | Purpose |
|---------|---------|
| `razorpayCustomerId` | Classgrid's Razorpay customer ID for this org |
| `razorpaySubscriptionId` | Active subscription ID |
| `razorpayOrderId` | Latest order ID |
| `paymentMethod` | "razorpay" or "manual" |
| `paymentAmount` | Amount paid |
| `demoExpiresAt` | When the 31-day trial expires |
| `is_promoting` | Lock flag during academic year promotion |
---

### 5.11: 🌳 CREATING THE ACTUAL ACADEMIC RECORDS (The Operational Setup)

> This is what you asked about — Divisions, Standards, Courses, Batches, Subjects, Faculty assignments, Classrooms, Timetable. These are NOT just config. These are **real database records** the Org Admin creates AFTER the config is set.

#### 📦 Model: `AcademicHierarchy` — The Universal Tree

Every academic unit (Department, Division, Standard, Batch, Course) is a **tree node** stored in one unified model. Nodes are linked via `parent_id` to form a nested hierarchy.

**Node Types Available** (`level_type` enum):

| Level Type | Used By | Example |
|-----------|---------|---------|
| `degree` | Engineering | B.Tech, M.Tech |
| `department` | Engineering, Diploma | Computer Engineering, IT, Mechanical |
| `year` | Engineering, Diploma | First Year, Second Year, Third Year |
| `semester` | Engineering, Diploma | Sem 1, Sem 2, ... Sem 8 |
| `division` | ALL (except coaching) | Division A, Division B, Division C |
| `sub_batch` | Engineering, Diploma | Lab Batch A1, A2 (under Division A) |
| `standard` | School, Junior College | Class 1, Class 10, 11th, 12th |
| `stream` | Junior College | Science, Commerce, Arts |
| `course` | **Coaching** | JEE Advanced, NEET, MHT-CET |
| `batch` | **Coaching** | Morning Batch, Evening Batch, Weekend |
| `group` | Custom | Level 1, Level 2 |
| `sub_group` | Custom | Group A, Group B |

**Each Node Has:**
```
{
    organization_id: ObjectId,
    level_type: "department",
    name: "Computer Engineering",
    code: "CE",                    // Short code for reports
    parent_id: ObjectId,           // Links to parent node
    sort_order: 0,                 // Display position
    academic_year: "2025-26",      // For year/semester nodes
    is_sub_batch: false,
    sub_batch_capacity: null,      // 30 students per lab batch
    student_count: 120,            // Denormalized for dashboards
    is_active: true                // Soft-delete support
}
```

#### 🏗️ Full Tree Examples (What Gets Created Per Org Type)

**Engineering College (B.Tech):**
```
B.Tech (degree)
├── Computer Engineering (department, code: "CE")
│   ├── First Year (year)
│   │   ├── Semester 1 (semester)
│   │   │   ├── Division A (division)
│   │   │   │   ├── Lab Batch A1 (sub_batch, capacity: 30)
│   │   │   │   └── Lab Batch A2 (sub_batch, capacity: 30)
│   │   │   └── Division B (division)
│   │   └── Semester 2 (semester)
│   ├── Second Year (year)
│   └── Third Year (year)
├── Information Technology (department, code: "IT")
├── Electronics & Telecommunication (department, code: "ENTC")
└── Mechanical Engineering (department, code: "ME")
```

**School (K-12):**
```
Class 1 (standard)
├── Section A (division)
└── Section B (division)
Class 2 (standard)
├── Section A (division)
└── Section B (division)
...
Class 10 (standard)
├── Section A (division)
└── Section B (division)
```

**Coaching Center:**
```
JEE Advanced (course)
├── Morning Batch (batch)
├── Evening Batch (batch)
└── Weekend Batch (batch)
NEET (course)
├── Morning Batch (batch)
└── Evening Batch (batch)
MHT-CET (course)
├── Morning Batch (batch)
└── Evening Batch (batch)
```

**Junior College:**
```
Science (stream)
├── 11th (standard)
│   ├── Division A (division)
│   └── Division B (division)
└── 12th (standard)
    ├── Division A (division)
    └── Division B (division)
Commerce (stream)
├── 11th (standard)
└── 12th (standard)
Arts (stream)
├── 11th (standard)
└── 12th (standard)
```

**Diploma (Polytechnic):**
```
Computer Engineering (department)
├── First Year (year)
│   ├── Semester 1 (semester)
│   │   └── Division A (division)
│   └── Semester 2 (semester)
├── Second Year (year)
└── Third Year (year)
Mechanical Engineering (department)
Civil Engineering (department)
```

#### 🔧 API Endpoints for Hierarchy CRUD

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/hierarchy/node` | Create a new node (department, division, etc.) |
| `GET` | `/api/hierarchy/tree` | Get full nested tree for the org |
| `GET` | `/api/hierarchy/tree?flat=true` | Get flat array of all nodes |
| `GET` | `/api/hierarchy/children/:parentId` | Get direct children of a node |
| `PATCH` | `/api/hierarchy/node/:nodeId` | Update name, code, sort_order |
| `DELETE` | `/api/hierarchy/node/:nodeId` | Soft-delete node + all descendants |
| `POST` | `/api/hierarchy/seed` | Auto-seed default structure (one-time, during onboarding) |
| `GET` | `/api/hierarchy/terminology` | Get the dynamic label dictionary |

#### 🧠 Auto-Seed: One-Click Default Structure

When the Org Admin first opens the hierarchy page, they can click **"Seed Default Structure"** which calls `POST /api/hierarchy/seed`. This auto-creates:

| Org Type | What Gets Auto-Created |
|----------|----------------------|
| Engineering | B.Tech → 4 Departments (CE, IT, ENTC, ME) → First Year → Sem 1 → Division A |
| School | Class 1 through Class 10 → Division A & B each |
| Coaching | JEE Advanced, NEET, MHT-CET → Morning & Evening Batches |
| Junior College | Science, Commerce, Arts → 11th & 12th → Division A & B |
| Diploma | CE, ME, Civil → First Year → Sem 1 → Division A |

#### 🔇 Auto-Division for "No Division" Plans

When `structure_type` is `school_no_div`, `engineering_no_div`, etc., the system **automatically creates a hidden "Default" division** whenever the admin creates a standard or semester node. The UI hides this division so it feels like there's no division at all.

---

### 5.12: 📚 SUBJECTS (What Students Study)

**Model:** `OrgSubject`

| Field | Type | Purpose |
|-------|------|---------|
| `organization_id` | ObjectId | Tenant isolation |
| `classroom` | ObjectId (optional) | Link to a specific classroom |
| `subjectName` | String | "Mathematics", "Data Structures", "Physics" |
| `maxMarks` | Number | Max marks for exams (default: 20) |
| `isActive` | Boolean | Soft-delete |

**Constraint:** Same subject name cannot exist twice in one organization (unique index with case-insensitive collation).

---

### 5.13: 🏫 CLASSROOMS (Where Teaching Happens)

**Model:** `Classroom`

Each classroom represents a **teaching unit** — one faculty, one subject, one set of students.

| Field | Type | Purpose |
|-------|------|---------|
| `name` | String | "Data Structures - CE Sem 3 Div A" |
| `description` | String | Optional description |
| `subject` | String | "data structures" (lowercase) |
| `classCode` | String | Auto-generated 10-char code (e.g., "ABCD012345") for students to join |
| `teacher` | ObjectId → User | The faculty who owns this classroom |
| `organization_id` | ObjectId | Tenant isolation |
| `course_type` | "SCHOOL" / "COLLEGE" | Category |
| `year` | String | "FY", "SY" |
| `branch` | String | "Computer Engineering" |
| `semester` | Number | 3 |
| `standard` | String | "Class 10" (for schools) |
| `division` | String | "A" |
| `coverImage` | String | Banner image URL |
| `settings.allowJoinRequests` | Boolean | Can students request to join? |
| `settings.maxStudents` | Number | Seat limit |
| `settings.isArchived` | Boolean | Archive old classrooms |
| `memberCount` | Number | Cached student count |

**Auto-Generated Class Code:** When a classroom is saved without a `classCode`, the system generates a unique 10-character alphanumeric code (4 letters + 6 digits).

---

### 5.14: 👤 FACULTY USER FIELDS (What Org Admin Sets Per Faculty)

**Model:** `User` (with `role: "faculty"` or `"teacher"`)

| Field | Purpose |
|-------|---------|
| `name` | Full name |
| `email` | Login email |
| `phoneNumber` | Contact number |
| `role` | Primary: "faculty", "teacher", "hod", etc. |
| `additional_roles` | Multi-role: ["hod", "faculty", "exam_controller"] |
| `department` | "Computer Engineering" |
| `qualification` | "M.Tech, PhD" |
| `subjectsAssigned` | "Data Structures, Algorithms, DBMS" |
| `bio` | 300-char bio |
| `profilePicture` | Photo URL |
| `signature` | Digital signature URL |
| `biometricId` | Physical biometric device mapping |
| `payroll_config.salary_mode` | "hourly" / "monthly" / "none" |
| `payroll_config.hourly_rate` | ₹ per hour |
| `payroll_config.base_monthly_salary` | Monthly salary |

---

### 5.15: 👩‍🎓 STUDENT USER FIELDS (What Gets Set Per Student)

**Model:** `User` (with `role: "student"`)

| Field | Purpose |
|-------|---------|
| `prn` | PRN / Roll No / Enrollment No (unique per org, immutable after first set) |
| `branch` | "Computer Engineering" |
| `batch` | "2022-2026" |
| `admission_type` | "CAP" / "Management" / "Direct" / "Lateral" |
| `category` | "Open" / "SC" / "ST" / "OBC" / "EWS" / "VJ-NT" |
| `abc_id` | Academic Bank of Credits ID |
| `anti_ragging_undertaking_no` | Anti-Ragging compliance number |
| `profile_completed` | Has student finished 13-step onboarding? |
| `dob` | Date of Birth |
| `gender` | Male / Female / Other |

---

### 5.16: 📅 TIMETABLE (Schedule Configuration)

**Model:** `Timetable`

| Field | Type | Purpose |
|-------|------|---------|
| `organization` | ObjectId | Tenant isolation |
| `classroom` | ObjectId (optional) | Link to classroom |
| `user` | ObjectId (optional) | Personal teacher schedule |
| `day` | String | "Monday" through "Sunday" |
| `startTime` | String | "09:00" (HH:MM) |
| `endTime` | String | "10:00" |
| `subject` | String | "Data Structures" |
| `room` | String | "Room 301" |
| `teacher` | String | Teacher name |
| `type` | String | "Lecture" / "Lab" / "Seminar" / "Other" |

---

### 5.17: 💰 FEE SETUP (Three-Layer Architecture)

The fee system has **3 layers**:

**Layer 1: Fee Category** (top-level grouping)
```
FeeCategory {
    name: "Academic Fees",
    organizationId: ObjectId,
    description: "All tuition-related charges"
}
```
Examples: "Academic Fees", "Infrastructure Fees", "Miscellaneous"

**Layer 2: Fee Component** (individual fee heads)
```
FeeComponent {
    name: "Tuition Fee",
    categoryId: ObjectId → FeeCategory,
    organizationId: ObjectId,
    defaultAmount: 50000
}
```
Examples: "Tuition Fee", "Library Fee", "Lab Fee", "Development Fee", "Exam Fee"

**Layer 3: Fee Structure** (template combining components)
```
FeeStructure {
    name: "FY Computer Engineering - Open Category",
    organizationId: ObjectId,
    components: [
        { componentId: ObjectId, amount: 50000 },  // Tuition
        { componentId: ObjectId, amount: 5000 },   // Library
        { componentId: ObjectId, amount: 3000 }    // Lab
    ],
    totalAmount: 58000,
    academicYear: "2025-26",
    isActive: true
}
```

---

### 5.18: 🗣️ DYNAMIC TERMINOLOGY SYSTEM (The Magic Labels)

The entire UI **adapts its language** based on org type! The backend has a `terminology.js` dictionary that sends the correct labels to the frontend:

| Label Key | Engineering | School | Coaching | Jr College | Diploma |
|-----------|------------|--------|----------|------------|---------|
| `org_label` | College | School | **Institute** | Junior College | Polytechnic |
| `top_level` | Degree | Standard | **Course** | Stream | Department |
| `course` | Branch | Class | **Course** | Stream | Branch |
| `year` | Year | Class | **null** ❌ | Standard | Year |
| `period` | Semester | Term | **null** ❌ | Term | Semester |
| `division` | Division | Section | **null** ❌ | Division | Division |
| `sub_batch` | Lab Batch | null | null | null | Lab Batch |
| `student_id` | PRN | Roll No | **Enrollment No** | Roll No | Enrollment No |
| `teacher` | Faculty | Teacher | **Mentor** | Lecturer | Faculty |
| `classroom` | Classroom | Classroom | **Batch** | Classroom | Classroom |
| `add_student` | Register Student | Add Student | **Enroll Student** | Add Student | Register Student |
| `add_teacher` | Add Faculty | Add Teacher | **Add Mentor** | Add Lecturer | Add Faculty |
| `assignment_label` | Assignment | **Homework** | **Practice Set** | Assignment | Assignment |
| `exam_label` | Examination | **Test** | **Mock Test** | Examination | Examination |
| `forum_label` | Forum & Discussion | Student & Parent Board | **Doubt Forum** | Discussion Forum | Forum & Discussion |
| `parent_comm` | Student Communication | **Parent Communication** | Student Communication | Student Communication | Student Communication |

**Notice for Coaching:** Year, Semester, and Division are all **`null`** — the system completely blocks these features! Coaching only has Course → Batch. No divisions, no semesters.

---

### Method 1: Individual Invite (From Org Admin Dashboard)
**Route:** `/org/faculty` → "Add Faculty" button
**What happens:**
1. Org Admin enters: Name, Email, Phone, Role, Department
2. Backend creates User with `mustResetPassword: true`
3. **Email #6** is sent: Faculty invitation with activation link
4. Faculty clicks link → Sets password → Enters **Faculty Organization Code** → Lands on Faculty Dashboard

### Method 2: Bulk Excel Upload (The CSVImportMappingWizard)
**Route:** `/org/faculty` → "Import from Excel" button
**What happens:**
1. Org Admin uploads `.xlsx` file with columns: Name, Email, Phone, Role, Department
2. Backend runs `import-validation.service.js` → validates all 34 roles, checks for duplicates
3. Shows preview: X valid, Y invalid, Z duplicates
4. On "Commit" → creates all accounts with `mustResetPassword: true`
5. **Bulk emails sent** to each faculty member with their activation links

---

## PHASE 7: ONBOARDING STUDENTS

### Method 1: The "Auto-Match" vs "Waitlist" Flow (Security Gate)
Because the Honor Code can be shared publicly, the backend enforces strict validation:

1. Student visits Classgrid login page.
2. Creates an account with Google OAuth or Email/Password.
3. Enters the **Student Honor Code** to link to the Organization.
4. **Mandatory Profiling:** The student enters the **13-Step Profile Onboarding** (`/profile/onboarding`). They submit their PRN, Name, DOB, and academic details.
5. **Backend Verification Engine:** 
   - **Scenario A (Instant Onboarding):** The backend checks if the Admission Department uploaded an Excel/CSV file containing this student's data (`import-validation.service.js`). If the submitted `PRN`, `DOB`, and `Name` **match exactly** with the pre-seeded DB record, the student is instantly granted `verification_status: 'verified'` and the full ERP opens immediately.
   - **Scenario B (Waitlist):** If the data does **NOT** match the Excel file (e.g. typos, or they are an imposter, or no Excel was uploaded), the backend forces `verification_status: 'pending'`. The student is trapped on the Waitlist.
6. **Waitlist State:** While on the waitlist, the student cannot access classrooms, exams, or the fee portal.
7. **Admin Approval:** The Org Admin must manually review the waitlisted student's ID card and click "Approve" to unlock the ERP.

### Method 2: Faculty Creates Classroom → Shares Classroom Code
1. Faculty creates a new Classroom from their dashboard
2. System generates a unique **Classroom Code**
3. Faculty shares this code in class
4. Students enter the code → Auto-linked to Organization AND Classroom

### Method 3: Bulk Import by Org Admin
1. Same Excel upload flow as Faculty
2. Backend creates student accounts with `role: "student"` and `mustResetPassword: true`
3. Each student receives activation email

### Method 4: Admission Module Auto-Enrollment
1. When admission is approved via `/dept/admissions/enroll`
2. System auto-creates student account
3. Generates PRN/Roll Number
4. Sends welcome email with activation link

## PHASE 8: PAYMENT & SUBSCRIPTION

### Current State (Code-Verified):
- All organizations start on the **"demo" plan** → `isPaid: false`, expires in **31 days**
- The demo gives them full access to set up the system and onboard their users.
- *Note: Pricing is intentionally not defined in this document yet. The current product story is: compulsory 31-day demo first, then one paid active state.*

---

## COMPLETE EMAIL TIMELINE (Per Organization)

| # | When | To Whom | Email Subject |
|---|------|---------|---------------|
| 1 | Demo form submitted | **Super Admin** | "New Demo Lead: [School Name]" |
| 2 | Demo form submitted | **School Principal** | "Your Classgrid Demo Request Is Received" |
| 3 | Meeting booked | **School Principal** | "Demo Meeting Scheduled" |
| 4 | Meeting booked | **Super Admin** | "Lead Meeting Confirmed: [School Name]" |
| 5 | Approved & Provisioned | **School Principal** | "Activate Your Classgrid Admin Account" (THE BIG EMAIL with codes + activation link) |
| 6+ | Faculty invited | **Each Faculty** | Faculty invitation with activation link |
| 7+ | Plan expiring | **Org Admin** | "Plan Expiring Soon / Expired" |

---

## SECURITY ARCHITECTURE SUMMARY

| Layer | Mechanism |
|-------|-----------|
| Anti-Bot | Cloudflare Turnstile on demo form |
| Token Security | SHA-256 hashed activation tokens, 5-minute expiry, single-use |
| Password | `mustResetPassword: true` flag blocks API access until password is set |
| Role Guard | `requirePasswordSet` middleware blocks org_admin if `mustResetPassword === true` |
| Webhook Auth | `DEMO_SCHEDULER_WEBHOOK_SECRET` header for meeting callbacks |
| Database | MongoDB transactions for atomic org provisioning (all-or-nothing) |


---

## 10/10 SaaS Gap Checklist

The system becomes truly best-in-class when the following are complete:

### Product and ops
- Self-serve scheduling, activation, and initial setup require less sales intervention.
- The onboarding UI clearly shows the next best action for org admins.
- Sales, implementation, and support share the same onboarding status view.
- Demo-to-paid conversion logic is separated cleanly from technical provisioning logic.

### Engineering and platform
- Provisioning is idempotent and safe to retry.
- Email dispatch failures cannot leave provisioning in an unclear state.
- Join-code regeneration is fully audited and rotation-aware.
- Every critical onboarding action emits structured audit events.
- Subscription state, feature flags, and plan limits are resolved from one canonical source.

### Analytics and observability
- Time-to-first-login is tracked.
- Time-to-first-hierarchy-created is tracked.
- Time-to-first-faculty-import is tracked.
- Time-to-first-student-verified is tracked.
- Trial-to-setup completion and setup-to-usage conversion are measurable.
- Failed provisioning attempts are visible without log-diving.

### Customer experience
- The org admin can always tell what is done, what is blocked, and what is next.
- The setup checklist is driven by real actions, not only manual toggles.
- Error states explain recovery steps clearly.
- Invitation emails, activation emails, and setup screens use one consistent product language.

---

## Recommended Next Build Order

If the goal is to move this from **7/10 to 10/10**, this is the highest-value build order:

1. **Canonical onboarding state machine**
   Create one backend-owned status model for lead -> meeting -> approved -> provisioned -> activated -> setup_in_progress -> go_live_ready.

2. **Idempotent provisioning and retry protection**
   Ensure duplicate approve clicks, queue retries, or partial email failures cannot create ambiguous org state.

3. **Customer-facing onboarding checklist powered by real events**
   Auto-complete steps from actual actions like activation, hierarchy seed, faculty import, fee setup, and first verified student.

4. **Unified subscription and feature-resolution layer**
   Remove remaining overlap between legacy plan behavior, `OrgSubscription`, and feature flags.

5. **Operational dashboards and conversion analytics**
   Measure where schools drop off, how long activation takes, and which step most often delays go-live.

6. **Exception handling and support tooling**
   Add internal tools for resend activation, reprovision safely, rotate codes safely, and explain blocked onboarding states instantly.

---

## Final Verdict

Classgrid already has the bones of a serious vertical SaaS onboarding engine.

What makes it promising is not just the number of steps. It is that the onboarding is tied to **real tenant creation, real academic structure, real role flows, and real ERP readiness**.

What will make it truly **10/10** is discipline:
- one source of truth
- fewer manual dependencies
- stronger state tracking
- better retry safety
- better visibility
- and a customer journey that feels as polished as the backend is ambitious

That is the standard this document should now be used to enforce.
