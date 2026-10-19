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

# 🌟 THE CLASSGRID MASTER TIMELINE & EXECUTION PLAN
*This document replaces the messy text dump with a strict, chronologically ordered sequence of steps to build the entire ERP from start to finish.*

> ⚠️ **BEFORE TOUCHING ANY DAY/PHASE — READ THIS:**
> 1. **CONSISTENCY** — Same spacing, same colors, same button style on EVERY page (Shadcn + Tailwind + clsx)
> 2. **UX FLOW** — 1 click + drag & drop + toast. NOT 5 clicks through 3 modals (React Dropzone + Sonner)
> 3. **PERFORMANCE** — Fast loading, no lag (TanStack Query + React.lazy + caching)
> 4. **MICRO-INTERACTIONS** — Hover animations, smooth transitions, loading skeletons (Framer Motion)
> 🔥 **Stack = Ferrari. You = Driver. Don't dump all 20 libraries at once. Build in phases. File-by-file, NO bulk scripts.**
> 📖 Full details: See `SAAS_COMMANDMENTS.md`

---

## 📅 MONTH 1: Foundation & The UI Factory
**Goal:** Clean up the "9th-grade student codebase" by centralizing all design files and establishing a professional SaaS architecture.

*   **Step 1.1 (Days 1-3): The Design Blocks & Core Toolkit**
    *   Initialize the **17-Library God-Tier Stack** required for the absolute highest-tier Enterprise UI (Phase 1):
        1. **`cobe`** — The 5kB WebGL engine powering the Aceternity 3D spinning GitHub globe.
        2. **`framer-motion`** — For buttery-smooth 60fps micro-interactions (sliding auth forms).
        3. **`sonner`** — High-end customizable stacked SaaS toast notifications.
        4. **`react-hook-form`** — For hyper-performant un-controlled input forms.
        5. **`zod`** — Instant, zero-latency schema and error validation.
        6. **`@hookform/resolvers`** — Acts as the high-speed bridge between React Hook Form and Zod.
        7. **`lucide-react`** — Ultra-crisp SVGs and responsive vector UI icons.
        8. **`clsx`** — For precise class string manipulation and logic scaling.
        9. **`tailwind-merge`** — Eliminates conflicting Tailwind CSS classes automatically.
        10. **`class-variance-authority`** — Enables scalable Shadcn variance architectures (primary, outline, ghost).
        11. **`tailwindcss-animate`** — Radix/Shadcn standard animation utilities (`animate-in`).
        12. **`@tanstack/react-query`** — For ultra-fast caching and server-state management.
        13. **`next-themes`** — The core provider for the precise Dark/Light/System theme toggling.\you  
        14. **`@radix-ui/react-checkbox`** — Fully accessible headless Radix UI checkbox primitive.
        15. **`@radix-ui/react-dialog`** — Fully accessible headless modal/dialog primitive.
        16. **`@radix-ui/react-dropdown-menu`** — Dropdowns that don't clip off the screen.
        17. **`@tanstack/react-table`** — (Prep layout) The ultimate engine for rendering 5,000-row tables without lagging the browser.
    *   Transition all custom messy components (`Tabs`, `Modal`, `Select`) over to these clean standards.
*   **Step 2.2 (Days 4-7): The Global Layout**
    *   Refactor `AppLayout.jsx` and Sidebar to utilize the full width of the screen.
*   **Step 3.3 (Days 8-15): Page-by-Page Purge**
    *   Chronologically open every single page (Dashboard -> Classrooms -> Attendance) and delete the thousands of lines of messy custom CSS, replacing them with our UI Factory blocks.
*   **Step 4.4 (Days 16-20): Core Table Performance**
    *   Implement `@tanstack/react-table` on Examination and Fee pages so the React app doesn't crash when loading 5,000 students.

---

## 📅 MONTH 2: Core ERP & Database Stability
**Goal:** Ensure the absolute core features (Attendance, Chat, Auth) actually save to the database safely without breaking.

*   **Step 2.1: The 13-Step Student Onboarding**
    *   Wire the frontend React forms to cleanly save 10th (SSC) and 12th (HSC) board marks/PCM scores to MongoDB.
*   **Step 2.2: Live Real-Time Socket Connections**
    *   Connect the UI Chat bubbles to the Redis Stream backend. Ensure messages send instantly with typing indicators.
*   **Step 2.3: Results Engine Processing**
    *   Connect the React drag-and-drop file uploader to the Node.js CSV parsing API. Ensure the system calculates SGPA and Ranks based on standard college criteria.
*   **Step 2.4: Core Observability & Security (The Missing Shields)**
    *   **Observability:** Implement \`winston\` server logging and basic monitoring dashboards to track API 500 errors.
    *   **Security:** Enforce strict Rate Limiting (\`express-rate-limit\`) on ALL endpoints, rigorous \`zod\` input sanitization, and strict file upload validation (Max 5MB PDF/IMG bounds).

---

## 📅 MONTH 3: Scaling & Subdomains
**Goal:** Prepare the platform to handle multiple schools safely without cross-contaminating their data.

*   **Step 3.1: Subdomain Routing**
    *   Implement the Nginx and React wildcard routing so that `pccoe.classgrid.in` automatically detects the user is from PCCOE and fetches their specific logo.
*   **Step 3.2: AWS Decoupling & Auto-Scaling (4,000 RPS Test)**
    *   **Kill the SPOF (Single Point of Failure):** Separate the architecture. Keep Node.js PM2 clusters on the AWS EC2 instance, but move Redis off to a Managed Redis Database, and keep all Relational user-data secured on Managed Supabase.
*   **Step 3.3: App Wrapping**
    *   Load the fully optimized React Dashboard into the Kotlin WebView Wrapper (Android) to deploy to the Google Play Store with native biometrics.

---

## 📅 MONTH 4: Monetization & B2C Engines
**Goal:** Add the highly requested bespoke modules that will separate Classgrid from all existing competitors.

*   **Step 4.1: The Canteen Sub-System**
    *   Create the dual-interface (Student App vs Canteen Vendor Tablet).
    *   Implement the QR-Code Pre-Order engine with 15-minute validity loops.
*   **Step 4.2: The Marketing Site & CMS**
    *   Build `classgrid.in` using Next.js.
    *   Connect Sanity CMS for blog posts, SEO routing, and dynamic landing pages.
*   **Step 4.3: The JEE / NEET Advanced Quiz**
    *   Build the specialized +4/-1 negative marking engine.
    *   Implement Integer value questions and percentiles specifically for Coaching Center Tenants.

---

## 📅 MONTH 5: The "Secret Weapons" (AI & Compliance)
**Goal:** Implement extreme-value features to hook large institutions.

*   **Step 5.1: The 10-Year Past Paper AI Pipeline**
    *   Implement Tesseract/PyMuPDF ingestion.
    *   Pass structured JSON through Groq (Llama 3) to predict repeated topics over 10 years and generate immediate Mock Tests.
*   **Step 5.2: Global Notes Marketplace**
    *   Create the B2C micro-payment wall (₹30 unlock). Allow students to crowdsource their AI-generated PDF summaries directly within the app.
*   **Step 5.3: The NAAC / NBA Accreditation Auditor**
    *   Build the background data engine that quietly skims Attendance, Fees, and Results.
    *   Implement Puppeteer PDF generation to export ready-to-print compliance reports for visiting inspectors.

---
### 🛠️ ARCHITECTURE REFERENCE VAULT

*(Below this line remains the deep technical rules for coding, database structures, and styling guidelines required to execute the timeline above).*

\n\n# 🌟 CLASSGRID ULTIMATE MASTER PLAN (OMNI-MERGE)

Below is the exhaustive, 100% complete collection of ALL Classgrid architectural plans, implementation checklists, structural rules, and backend module mappings. NOTHING has been summarized. All raw components from previous discussions have been forcefully concatenated here to act as the ultimate source of truth.

---

# 🚀 CLASSGRID ULTIMATE SAAS PLAN
*The Master Blueprint for a Billion-Dollar Educational ERP System*

This document serves as the absolute source of truth for the Classgrid platform. It merges the exact step-by-step implementation process, frontend design guidelines, and the backend multi-tenant architecture required to scale to 1,000+ organizations. 

**Note to Future AI Assistants**: If you are reading this file, treat this document as the supreme architectural guideline. Do not deviate from these technologies or architectural patterns without explicit permission from the user.

---

## 🏗️ PART 1: DOMAIN & ROUTING STRATEGY

### A. Subdomain Routing Matrix
| Subdomain | Tech Stack | Purpose |
| :--- | :--- | :--- |
| `classgrid.in` | **Next.js + Sanity CMS** | SEO-optimized public pages (Home, Pricing, Terms, Blog). |
| `app.classgrid.in` | **React (Vite) SPA** | Master login portal, Super Admin dashboard, and Mobile App origin. |
| `*.classgrid.in` | **React (Vite) SPA** | White-labeled tenant portal for students/parents (e.g. `pccoe.classgrid.in`). |
| `api.classgrid.in` | **Node.js + Express** | The central backend brain holding all endpoints and DB connections. |

### B. High-Level Monorepo Folder Structure
To share UI components across Marketing and the SaaS app, utilize a Monorepo using NPM/Yarn Workspaces or Turborepo:
```text
/classgrid-monorepo
 ├── /apps
 │    ├── /marketing        (Next.js App -> classgrid.in)
 │    └── /web-app          (Vite React App -> *.classgrid.in)
 ├── /packages
 │    ├── /ui               (Shared Tailwind/Lucide UI Components)
 │    └── /config           (Shared ESLint/Prettier rules)
 └── /server                (Node.js / Express API -> api.classgrid.in)
```

### C. EC2 + PM2 + Nginx Deployment (APPROVED — EC2 Already Provisioned ✅)
**Vercel is REJECTED.** All services run on a single AWS EC2 instance using PM2 and Nginx.

1. **Nginx** acts as the reverse proxy and handles subdomain routing:
   - `classgrid.in` → Serves the Next.js marketing site (static export or PM2 process).
   - `app.classgrid.in` → Serves the Vite React SPA (`dist/` folder).
   - `*.classgrid.in` → Same Vite SPA, with tenant slug extracted from subdomain.
   - `api.classgrid.in` → Proxies to the Node.js Express backend (PM2 managed).
2. **PM2** manages the Node.js backend process with auto-restart on crash and `pm2 startup` for boot persistence.
3. In the DNS provider (GoDaddy/Namecheap), add an **A Record** pointing `*.classgrid.in` to the EC2 public IP.
4. **SSL:** Use **Certbot (Let's Encrypt)** for free wildcard HTTPS certificates.

---

## ⚙️ PART 2: ARCHITECTURE & DATABASE ISOLATION

### A. Row-Level Tenancy (PostgreSQL/Supabase)
To support thousands of organizations securely, you must isolate data. Every single operational table must have an `org_id`.

```sql
-- Core Tenant Table
CREATE TABLE organizations (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,       -- e.g., 'harvard' 
    logo_url TEXT,
    theme_colors JSONB,                      -- e.g., { primary: '#FF0000' }
    plan VARCHAR(50) DEFAULT 'demo',
    is_paid BOOLEAN DEFAULT false,
    expires_at TIMESTAMP
);

-- Users (Linked to an Org)
CREATE TABLE users (
    id UUID PRIMARY KEY,
    org_id UUID REFERENCES organizations(id), -- Critical
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50)
);
```

### B. Backend Subdomain Isolation Middleware (Node.js)
```javascript
const tenantMiddleware = (req, res, next) => {
    // JWT contains the orgId of the logged-in user securely
    const { orgId } = jwt.verify(req.headers.authorization, SECRET);
    req.tenantId = orgId; 
    next();
};

app.get('/api/fees/analytics', tenantMiddleware, async (req, res) => {
    // Enforces zero data leakage -> physically impossible to fetch another school's data
    const analytics = await db.query('SELECT * FROM fees WHERE org_id = $1', [req.tenantId]);
    res.json(analytics);
});
```

---

## 🎨 PART 3: FRONTEND BRANDING & "BEST IN WORLD" DESIGN

### A. React Initialization Code (`App.jsx`)
This code runs the moment a user hits a wildcard domain before drawing the login screen:
```javascript
// 1. Extract Subdomain
const slug = window.location.hostname.split('.')[0]; 

// 2. Fetch Branding anonymously
const { data: orgData } = await axios.get(`https://api.classgrid.in/api/tenant/resolve?slug=${slug}`);

// 3. Inject Variables globally so Tailwind picks them up
document.documentElement.style.setProperty('--primary', orgData.theme_colors.primary);
```

### B. The Internal Tech Stack for Aesthetics
1. **Tailwind CSS Utility Classes**: Stop relying on large `.css` files. Build generic components injecting custom themes.
2. **Lucide Icons**: Extremely scalable, consistent SVG vector icons.
3. **Framer Motion**: Add spring-loaded physics and micro-animations to modal popups rather than instant hard-renders.

### C. UI Component Protocols
- **Cards**: Use Glassmorphism `bg-white/10 backdrop-blur-md border border-white/20`.
- **Buttons**: Provide hover and tap feedback: `hover:scale-105 active:scale-95 transition-all duration-200`.

---

## 📱 PART 4: KOTLIN MOBILE WRAPPER (ANDROID)

Instead of maintaining a separate Flutter or React Native codebase, build a **Kotlin WebView Wrapper** pointing explicitly to `app.classgrid.in`.

### A. Javascript Android Bridge Capabilities
The Kotlin code provides a bridge class down to the Chrome engine displaying your Vite app.
- **Native Hardware Access**: React can fire `window.AndroidBridge.requestCameraPermissions()` to open standard Android system prompts.
- **Biometrics**: Login states can leverage the Android Keystore to read fingerprints and face scans securely.

### B. Firebase Cloud Messaging (FCM)
The Kotlin wrapper natively intercepts FCM JSON payloads. When tapped, the native Android OS launches the WebView, parsing the Deep Link route given directly from the notification (e.g. automatically opening `/classroom/history-101/chat`).

---

## 🏢 PART 5: THE EXECUTABLE SAAS WORKFLOW

### A. Automated Demo & Expiry System
1. **Org Creation Flow**: User starts demo on `classgrid.in`. System generates the slug `pccoe`, verifies uniqueness, and provisions `pccoe.classgrid.in`.
2. **Automated Limits**: Plan is set to `demo`, `isPaid` to `false`, and `expiresAt` is set 30 days into the future.
3. **Razorpay Checkout**: If the user pays, update `plan: premium`, `isPaid: true`, and `expiresAt: null`. *Critical: Do NOT create a new org; continue using the exact same subdomain securely.*
4. **TTL Deletion**: If the demo expires, restrict access via a Read-Only toggle for a 7-day grace period. After that, a backend worker automatically performs a cascading deletion on that specific `org_id` destroying students, classes, files, and users securely.

### B. The 5 Core Organizational Structures (Backend Handling)
Because your current backend only supports "Divisions" (typical schools), we must refactor the database and API to support "Batches" for Coaching classes.

**1. The Database Schema Update**
The `organizations` table will receive a `structure_type` column (`enum: 'college', 'school', 'coaching'`). 
We will rename the current `divisions` table to a generic `groups` or `sections` table, containing a `type` column (`enum: 'division', 'batch'`). 

**2. How We Execute The 5 Active Plans:**

*   **Plan 1 (College Architecture)** 
    - API strictly requires `semester_id`, `academic_year_id`, and `division_id`.
*   **Plan 2 (School WITH Divisions)** 
    - Admin creates Grade 10. Admin then creates Division A, B, and C underneath it. API requires both `grade` and `division_id` for everything.
*   **Plan 3 (School WITH NO Divisions)** 
    - **The Tech Trick:** Admin creates Grade 10. Under the hood, the API automatically generates a hidden "Default Division" so the database schema doesn't break. 
    - **The Frontend:** React totally hides the word "Division" from the UI. When a teacher assigns homework to "Grade 10," the system automatically assigns it to the hidden default division. No extra clicks for the user.
*   **Plan 4 (Coaching Classes)** 
    - **API blocks** the `division` system entirely. Coaching centers strictly create `Batches` under a `Course` (e.g., "JEE Morning Batch 2026"). The React UI dynamically changes all "Division" text to "Batch".
*   **Plan 5 (Only 11 & 12 - Junior College)** 
    - Pure junior-college setup. 
    - **The Restriction:** The API enforces a strict grade boundary. If the admin tries to create "Grade 10" or "Grade 1", the API throws a `403 Error: Your plan only supports 11th and 12th standards.` Streams (Science/Commerce) are heavily utilized here.

**3. Frontend Execution (`AuthContext`)**
When the Org Admin logs in, the API sends `structure_type: 'coaching'`. The React sidebar dynamically reads this and hides the "Divisions" tab, rendering the "Batches" tab instead. When creating an assignment, the dropdown label changes from "Select Division" to "Select Batch".

### C. Comprehensive ERP Features Configured
1. Multi-Step Onboarding Wizards.
2. Academic Timetable with recurrence scheduling.
3. Result Engine & Exam Processing.
4. Leaves & Noticeboards (Forums).
5. Modular Realtime Chat (SWR + Socket.io + Optimistic Updates).
6. Super Admin Dashboards for platform oversight.

---

## 🚀 PART 6: PHASED MIGRATION STRATEGY

**Execution Order for the Current Working Environment:**

| Step | Objective | Action |
| :--- | :--- | :--- |
| **1.** | **100% UI Compliance** | Remove ALL raw CSS imports and replace legacy `g-page`, `g-card` with pure Tailwind components. Fix all currently broken onboarding login loops. |
| **2.** | **API Stability & Wiring** | Fix all endpoints and connect backend queries across the platform. |
| **3.** | **Vercel Monorepo Setup** | Move current Vite code into `/apps/web-app`. Turn on the Wildcard domain routing. Implement Subdomain extraction in `App.jsx`. |
| **4.** | **Next.js Promotion Pages** | Spin up Next.js locally, hook up Sanity CMS, launch `classgrid.in`. |
| **5.** | **Setup 5 Super Org Plans** | Code logic mapping the 5 pricing tier rules limiting specific navigation tabs on the Frontend via role validation. |
| **6.** | **App Wrapper Testing** | Connect the Kotlin WebView wrapper to Android Studio, generate the `.apk`, and verify native Android performance. |
| **7.** | **Month-Long Production Testing** | Dogfood logic globally. Launch public beta. |

---

## 🤝 PART 7: RESPONSIBILITY MATRIX (WHO DOES WHAT)

To successfully launch this infrastructure across multiple projects, the workload is divided between **You (The Human / DevOps Admin)** and **Me (The AI Lead Engineer)**.

### PROJECT 1: Core Web App (The Current Project)
This handles `app.classgrid.in` and all wildcard tenant subdomains (`*.classgrid.in`).
*   **What I (The AI) Will Do:**
    *   Write the React `App.jsx` routing logic to parse subdomains (e.g. extracting `pccoe`).
    *   Write the Node.js API to fetch the specific school's logos and colors and serve them to React.
    *   Clean up 100% of the CSS and fix the broken onboarding/login loops.
*   **What YOU (The Human) Must Do:**
    *   Log into your Vercel Dashboard, go to domains, and manually type in `*.classgrid.in`.
    *   Log into your Domain Registrar (GoDaddy/Cloudflare) and add the CNAME record mapping `*` to Vercel.

### PROJECT 2: Marketing Website (The Next.js Project)
This handles the SEO-optimized public pages on `classgrid.in`.
*   **What I (The AI) Will Do:**
    *   Scaffold the Next.js App Router and build beautiful Tailwind landing pages.
    *   Write the Sanity CMS data queries to pull dynamic blogs and pricing tiers.
*   **What YOU (The Human) Must Do:**
    *   Create a blank Vercel project and point the root domain `classgrid.in` to it.
    *   Create a free Sanity.io account and provide me the Project ID / API Keys so I can wire them into the Next.js code.

### PROJECT 3: Android App (The Kotlin Wrapper)
*   **What I (The AI) Will Do:**
    *   Write the `MainActivity.kt` file containing the WebView rendering engine.
    *   Write the Javascript Bridge so the Web App can request the Android Native Camera/Storage permissions.
    *   Write the Firebase Cloud Messaging (FCM) push notification receiver logic.
*   **What YOU (The Human) Must Do:**
    *   Download and open **Android Studio**.
    *   Create a "New Empty Activity Project".
    *   Paste my Kotlin code into the files.
    *   Set up a Firebase Console project, download `google-services.json`, place it in the Android Studio folder, and hit the green "Build APK" button to compile the app for the Play Store.

---

## 🌐 PART 8: NEXT.JS MARKETING SITE ARCHITECTURE (`classgrid.in`)

To ensure the public-facing promotion website ranks #1 on Google and converts institutions efficiently, the Next.js frontend will be structured exactly as follows. This is the exact blueprint for the `marketing` Next.js App Router codebase.

### PRIMARY NAVIGATION & CORE PAGES
1. **Home Page** (`/`): 
   - Hero Section: High-converting tagline + CTA (Start Demo).
   - Social Proof: Logos of existing clients/institutions.
   - Integration Highlights: Visual grid showing we connect with **Zoom, Google Meet, Razorpay, and Firebase**.
   - "What's New": A dynamic ticker or block pulling the latest feature release from Sanity CMS.
2. **About Us** (`/about`): The Classgrid Journey, team mission, and vision for democratizing educational ERP infrastructure.
3. **Features Overview** (`/features`): A deep-dive grid outlining the 10 core ERP modules (Chat, Exams, Timetable, etc) with animated screenshots.
4. **How It Works / Product Tour** (`/tour`): Step-by-step interactive scroll experience demonstrating the platform journey from Admin Setup to Student Login.
5. **Pricing & Plans** (`/pricing`): The 5 Structural Tiers broken down into beautiful comparison columns. Clear differentiation between College, School, and Coaching plans.
6. **🔥 The Demo Page** (`/demo`): **(The Most Important Page)** The highest-converting gateway. Collects the Organization Name and Type, hits our backend API, auto-provisions the `org.classgrid.in` subdomain, and drops the user instantly into a live, logged-in admin dashboard.

### AUDIENCE-SPECIFIC JOURNEYS
7. **Use Cases Hub** (`/use-cases`): 
   - `/use-cases/students`: App interface, Chat, Assignments.
   - `/use-cases/teachers`: Grading, Attendance, Timetable.
   - `/use-cases/institutes`: Super admin controls, analytics, fee collection.

### PROOF & TRUST
8. **Integrations Page** (`/integrations`): Dedicated page detailing our API capabilities and seamless hooks with **Zoom & Google Meet** (live classes), **Google Drive** (cloud storage), **Google Sheets & Calendar** (roster/schedule sync), **Supabase & MongoDB** (battle-tested backend data), **Vercel** (global edge hosting), and **Razorpay** (fee collection).
9. **Testimonials / Reviews** (`/reviews`): Video embeds and verified quotes from current Principals and Admins.
10. **Case Studies** (`/case-studies`): In-depth metrics on how Classgrid saved schools thousands of hours in administration.
11. **Security / Trust Center** (`/security`): Breakdown of our Row-Level Tenancy isolation, AES-256 encryption, and AWS/Supabase cloud security guarantees.

### CONTENT MARKETING (SANITY CMS DRIVEN)
12. **The Blog** (`/blog`):
    - **Blog Listing Page**: Grid of latest articles.
    - **Blog Detail Page**: Rich text, images, and author bios.
    - *Operational Rule: A new article MUST be published every 2-3 days via Sanity CMS to dominate SEO.*
13. **Landing Pages for Ads** (`/campaigns/:id`): Hidden UI-optimized pages strictly built for Google/Facebook Ad funnels. High conversion, low navigation.
14. **Comparison Pages** (`/compare/:competitor`): e.g., "Classgrid vs [Competitor]" detailing why our architecture and UI is wildly superior.
15. **What's New / Changelog** (`/changelog`): Running list of platform updates, bug fixes, and feature drops (synced to the Home Page ticker).

### SUPPORT & COMPLIANCE
16. **Support Center** (`/support`): Documentation and ticket submission portal.
17. **FAQ** (`/faq`): Accordion style dynamically fetched questions for institutions.
18. **Contact Us** (`/contact`): Direct sales forms and physical office locations.
19. **Terms of Service** (`/terms`): Legal SaaS agreements.
20. **Privacy Policy** (`/privacy`): Data sovereignty and GDPR/student privacy compliance.

---

## 🚀 PART 9: THE NAAC/NBA ACCREDITATION ENGINE (SECRET WEAPON)

This module plugins directly into the existing multi-tenant system. It acts as an **Automated Compliance Engine**, pulling data from across the ERP to instantly generate NAAC/NBA accreditation reports. This is the feature that allows Classgrid to directly destroy legacy competitors like vmedulife.

### 1. DATABASE DESIGN (CORE)
```sql
-- A. Criteria Structure
CREATE TABLE naac_criteria (
  id UUID PRIMARY KEY,
  name TEXT,              -- e.g. "Teaching Learning"
  weight INT              -- scoring weight
);

CREATE TABLE naac_subcriteria (
  id UUID PRIMARY KEY,
  criteria_id UUID REFERENCES naac_criteria(id),
  name TEXT               -- e.g. "Student Performance"
);

-- B. Organization Mapping (MULTI-TENANT MAGIC)
CREATE TABLE org_naac_config (
  id UUID PRIMARY KEY,
  org_id UUID,                -- Connects NAAC system to the core org
  accreditation_type TEXT,    -- 'NAAC' or 'NBA'
  cycle_year INT,             -- e.g. 2026
  status TEXT                 -- 'draft' or 'submitted'
);

-- C. Evidence & Documents
CREATE TABLE naac_documents (
  id UUID PRIMARY KEY,
  org_id UUID,
  subcriteria_id UUID,
  file_url TEXT,
  title TEXT,
  uploaded_by UUID,
  created_at TIMESTAMP
);

-- D. Metrics & Data Points (🔥 IMPORTANT)
CREATE TABLE naac_metrics (
  id UUID PRIMARY KEY,
  org_id UUID,
  subcriteria_id UUID,
  metric_key TEXT,        -- e.g. "student_pass_rate", "attendance_percent"
  value JSONB,
  year INT
);

-- E. Audit Logs (MANDATORY)
CREATE TABLE naac_audit_logs (
  id UUID PRIMARY KEY,
  org_id UUID,
  user_id UUID,
  action TEXT,
  entity TEXT,
  timestamp TIMESTAMP
);
```

### 2. BACKEND API DESIGN (Node.js)
*   `GET /api/naac/criteria` - Fetch all NAAC criteria.
*   `POST /api/naac/document` - Upload evidence to Supabase storage.
*   `GET /api/naac/metrics/auto` - **(CORE FEATURE)** Internally pulls data from attendance, results, and fees tables without manual data entry.
*   `POST /api/naac/metrics` - Save any manual fallback data.
*   `GET /api/naac/report` - Generates PDF and JSON summaries.

### 3. THE AUTO-DATA ENGINE (Your Secret Weapon)
You do not make colleges type data manually. You pull it.
*   **Student Attendance** → Automatically pulled from the `attendance` module.
*   **Pass Percentage** → Automatically pulled from the `exam` module.
*   **Fee Records** → Pulled from the `finance` module.
*   **Faculty Data** → Pulled from the `users` table.

```javascript
// Architecture Concept
async function generateMetrics(orgId) {
  return {
    attendanceAvg: await getAttendance(orgId),
    passRate: await getResults(orgId),
    feeCollection: await getFees(orgId)
  };
}
```

### 4. FRONTEND (React Structure)
**Route:** `/naac`
1. **Dashboard:** Overall Criteria progress, Score %, Missing Data alerts.
2. **Criteria View (`/naac/criteria/:id`):** View subcriteria, upload documents, view pulled metrics.
3. **Document Manager:** Bulk preview and tagging for all evidence files.
4. **Report Generator:** "Generate PDF" button with Puppeteer output previews.

### 5. REPORT GENERATION SYSTEM
Utilize **Puppeteer / PDFKit** on the Node backend.
*   Output includes criteria-wise data, beautiful pie charts (attendance, results), the indexed document list, and summary scores.

### 6. PERMISSIONS LOGIC
*   **Super Admin:** Full system access.
*   **Admin (Principal):** Upload + Edit criteria.
*   **Teacher (HOD/Faculty):** Upload evidence to assigned criteria only.
*   **Viewer (NAAC Peer Team):** Read-only mode.

### 7. SAAS FEATURE FLAGS (Monetization Strategy)
If `naac_module: true` in `org_naac_config`, the sidebar renders the NAAC tab. This allows you to charge a massive premium strictly to engineering colleges, while keeping it hidden from K-12 schools.

---

## ⚡ PART 10: REAL-TIME CHAT ENGINE & REDIS STREAMS

To survive massive traffic spikes (e.g., thousands of students in a single lecture spamming messages simultaneously), we explicitly reject basic queueing loops. The platform utilizes a Production-Grade **Redis Streams + ACK Architecture**.

### 1. Redis Streams (`XADD`) vs Simple Lists
Basic `chat_queue` lists result in data loss if the background worker crashes before transferring data to MongoDB.
Instead, we use **Redis Streams (`XADD`)**.
*   **Message Persistence**: Messages stay in the stream even if the Node.js Node crashes.
*   **Replay Capability**: If MongoDB reboots during a bulk insert, the stream simply re-sends the data.
*   **Zero Loss on Crash**: Guaranteed message delivery.

### 2. Tenant Isolation (Partitioned Queues)
To prevent the "Noisy Neighbor Problem" (where College A processing 5,000 messages creates lag for College B), every tenant has its own isolated stream:
*   `chat:stream:org_123`
*   `chat:stream:org_456`
This ensures scaling is horizontally isolated.

### 3. The Acknowledgment (ACK) System & Safe Deletion
Users do not receive a "delivered" tick until the data is resting safely on a permanent hard drive.

**Execution Flow:**
1. User sends message -> Hits **Redis (Stream)**.
2. Socket.io broadcasts the message to clients (Optimistic UI - message is "gray").
3. Continuous Adaptive Worker pulls the stream.
4. **Try/Catch Block**:
   ```javascript
   try {
     await mongo.insertMany(messages);
     redis.ack(messages); // Only delete from Redis if MongoDB succeeds
     socket.emit('message_saved', messageId); // Message turns "blue/delivered"
   } catch (e) {
     retryQueue(); 
   }
   ```
5. If MongoDB fails in the try block, the `ACK` is never sent, Redis keeps the data safely buffered, and retries 5 seconds later.

### 4. Adaptive Workers vs Fixed Intervals
Instead of a rigid 3-second `setInterval` which struggles during Vercel cold starts or massive CPU spikes, the workers are **Adaptive**. They are triggered dynamically by Queue Size (e.g., executing instantly when `redisSize > 80%` to perform an Emergency Flush).

---

## 🏢 PART 11: ENTERPRISE HR & API SDK MODULE (BIOMETRICS)

To attract massive Engineering Colleges, Classgrid offers an "Enterprise Developer API" that allows institutions to sync physical hardware (e.g., Turnstile Biometric Scanners) with the Classgrid Backend.

### 1. API Security (Critical Infrastructure)
Basic API keys are vulnerable. The platform enforces a strict handshake:
*   **API Key + Secret Hash**: `x-api-key: org_abc_key`, `x-api-secret: hashed_secret`
*   **IP Whitelisting**: The API rejects requests from IPs that do not match the physical biometric scanner's static IP.
*   **Rate Limiting**: Throttles brute-force attempts.

### 2. The Attendance Data Structure
```sql
CREATE TABLE faculty_attendance (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  faculty_id UUID REFERENCES users(id),
  timestamp TIMESTAMP,
  status TEXT,       -- enum: 'present', 'late', 'absent', 'half-day'
  source TEXT        -- enum: 'biometric', 'manual_override'
);
```

### 3. Solving Hardware Discrepancies (The Bridge)
Physical hardware scanners send internal employee codes, not our system UUIDs.
**The Bridge**:
*   Scanner sends: `{ "emp_code": "T123", "time": "07:32:10" }`
*   Node API looks up `emp_code: T123` mapped to `faculty_id`.
*   **Deduplication**: If a teacher scans twice in 5 minutes, the second scan is ignored or logged as an 'exit' based on Org policies.

### 4. Dynamic Time Boundaries (Half-Day Logic)
Every college has different late rules. The system allows Org Admins to set boundaries:
*   `before 08:00 AM` = Present
*   `08:00 AM - 09:00 AM` = Late
*   `after 09:00 AM` = Half-day

### 5. Sync Strategy
*   **Push (Primary Requirement):** The Biometric machine pushes to `POST /api/external/faculty/attendance`.
*   **Pull (Fallback):** For older hardware, a local cron script polls the scanner's local DB and syncs it to Classgrid.

### 6. The Value Proposition (HR & Payroll)
Because the biometric system logs directly to `faculty_attendance`, the Org Admin and Super Admin dashboards generate total payroll multipliers. The teacher can log into their own Faculty Dashboard and click the **"My Attendance & Leaves"** tab to see real-time updates of their payroll status directly from the gate scanner.

---

## 🚀 PART 12: FUTURE TECH STACK UPGRADES (POST-LAUNCH)

To ensure Classgrid achieves a "Billion-Dollar" premium feel and scales safely beyond the MVP phase, the following tools have been explicitly approved for integration **after** the initial V1 EC2 launch.

### A. Approved Tools to Add (The "Must Haves")
1. **Shadcn UI (Component Library):** We will transition away from raw Tailwind `<div>` structures into centralized, accessible Shadcn components (`<Button>`, `<Modal>`, `<Dropdown>`). This guarantees pixel-perfect consistency across all 1,000+ tenant dashboards and prevents systemic CSS breakages.
2. **Motion.dev (Framer Motion):** To ensure the Kotlin WebView app feels exactly like a native iOS/Android application, we will inject 60fps spring-based micro-animations (sliding drawers, bouncing buttons) across the React frontend.
3. **TanStack Query (React Query):** Crucial for mobile offline resilience. It will automatically cache API responses from the EC2 server, handle retries, and ensure the app doesn't crash if a student loses internet connection on campus.
4. **Zod (Schema Validation):** To be implemented across onboarding and payment flows to guarantee 100% type-safe form submissions before they ever hit the database.

### B. Explicitly Rejected Tools (The "Distractions")
*Do not implement these tools. They do not align with the current solo-developer velocity or architectural strategy.*
1. **Expo / React Native:** We are strictly committing to the **Kotlin WebView Wrapper (Part 4)**. We will NOT maintain a second, decoupled React Native codebase. The Kotlin bridge provides sufficient native hardware (biometric) access while allowing us to deploy UI updates to both Desktop and Mobile simultaneously via the single Vite React codebase.
2. **TypeScript Rewrite:** We will NOT halt momentum to rewrite the thousands of existing `.jsx` files into `.tsx`. The platform launches with JavaScript. (Future standalone microservices may use TS).
3. **Zustand:** Current React Context architecture is sufficient for org-level state.
4. **Coolify:** Explicitly banned for the `t3.micro` instance due to Docker's 2GB RAM overhead. We deploy strictly via Bare Metal PM2 + Nginx.

### C. UI & Animation Distribution Strategy (The Secret Sauce)
To maintain high performance on cheap student Android phones while simultaneously impressing VIP College Principals on Desktop, animations must be strictly compartmentalized.

**1. The Marketing Website (`classgrid.in`): "The Hype Machine"**
*   **Vibe:** Cinematic, cutting-edge, designed to sell to directors.
*   **Allowed Animations:** 
    *   **Aceternity UI 3D Globe:** To visualize global server coverage.
    *   **Magic UI Infinite Marquee:** To scroll through integration logos (Zoom, Razorpay, Google Meet).
    *   **Framer Motion Scroll Effects:** To smoothly fade-in feature bento grids as the user scrolls.

**2. The SaaS Platform (`app.classgrid.in` / `*.classgrid.in`): "The Work Engine"**
*   **Vibe:** Silent, ultra-fast, distraction-free (used 5+ hours a day).
*   **Allowed Animations:**
    *   **Shadcn UI (Core):** Ensures perfect visual alignment and consistency across all 50+ pages without manual Tailwind tweaking.
    *   **TanStack Query Skeletons:** Provides soft-pulsing gray blocks while fetching from MongoDB, completely eliminating "flash of unstyled content" or clunky loading spinners.
    *   **Subtle Motion.dev:** Used exclusively for micro-interactions (e.g., a "Create Class" modal sliding up at 60fps, returning immediately to static when finished). **NO looping 3D items allowed.**

---

## 🛠️ PART 13: THE MARKETING & GROWTH TOOLKIT

To rapidly build the Next.js marketing site (`classgrid.in`) with ultra-premium SaaS aesthetics, use the following approved "drop-in" tools. Do not build these components from scratch.

### A. UI & Animation Libraries (The "Lego Blocks")
1. **Aceternity UI:** For 3D Globes, glowing borders, and futuristic bento grids.
2. **Magic UI:** For Infinite Marquees (logo sliders) and animated text reveals.
3. **Shadcn UI:** For perfect buttons, inputs, and modals.
4. **Framer Motion:** The physics engine powering the React animations.

### B. Meetings & Scheduling
*Embed these directly into the UI instead of writing timezone logic.*
5. **Cal.com:** Open-source, best dark-mode embed interface.

### C. CMS & Content
6. **Sanity.io:** Headless CMS to host blog posts and update the "What's New" ticker instantly.

### D. Analytics & Tracking
7. **PostHog:** Analytics and actual video replays of user sessions.
8. **Vercel Web Analytics:** Basic traffic tracking built directly into Vercel.

### E. Forms & Lead Collection
9. **Tally.so:** Notion-like forms for "Apply for Early Access" lists.
10. **Typeform:** High-conversion, animated entry forms.

### F. Social Proof
11. **Senja.io / Testimonial.to:** Wall-of-love styling for teacher reviews.


---

# Classgrid — Final Implementation Plan v2
### React + Vite Migration | Mobile-First | 22 Days

---

## Ground Rules
- ✅ **One phase per day** — start each session with "Day X — Start"
- ✅ **Branch:** All work on `test` branch — merge to `main` only at the end
- ✅ **Phone testing:** ONLY after all phases complete
- ✅ **Browser testing:** Chrome DevTools mobile simulation during each phase
- ✅ **Freedom to add smart features** while building (if < 30 min effort)

---

## Two Android Apps

| App | Package | Entry URL | Users |
|---|---|---|---|
| Classgrid | `com.classgrid.app` | `classgrid.in/login` | Students + Faculty |
| Classgrid Admin | `com.classgrid.admin` | `classgrid.in/admin/login` | Org Admin + Super Admin |

---

## Design System

| Token | Value |
|---|---|
| Background | `#000000` |
| Surface | `#0f0f0f` |
| Surface 2 | `#141414` |
| Border | `rgba(255,255,255,0.07)` |
| Primary Blue | `#4a90f5` |
| Gradient | `135deg, #4a90f5 → #8b6fff` |
| Admin Accent | `#f59e0b` (amber/gold) |
| Text | `#ffffff` |
| Muted | `#888888` |
| Success | `#22c55e` |
| Error | `#ef4444` |
| Warning | `#f97316` |
| Font Heading | `Sora` |
| Font Body | `DM Sans` |

---

> **REMINDER: Before EACH Day below: Consistency, UX Flow, Performance, Micro-Interactions. File-by-file. No bulk scripts. See SAAS_COMMANDMENTS.md**

## Phase Schedule — 22 Days

---

### Day 1 — Phase 1: Foundation & Tooling
**Goal:** Working React app shell with proxy to Express API

- [x] Vite + React initialized in `client/`
- [x] Dependencies: react-router-dom, react-hot-toast, swr
- [x] Vite proxy → localhost:3000
- [x] Folder structure:
```
client/src/
├── pages/auth/
├── pages/student/
├── pages/faculty/
├── pages/admin/
├── pages/superadmin/
├── pages/shared/
├── components/ui/
├── components/layout/
├── context/
├── hooks/
├── services/
└── styles/
```
- [x] `api.js` — fetch wrapper with auth headers
- [x] `index.css` — design tokens, reset, global styles
- [x] `useDevice.js` — detect app vs browser, mobile vs desktop

---

### Day 2 — Phase 2: Auth System & Route Guards
**Goal:** Zero black screens. Instant optimistic loading.

- [x] `AuthContext.jsx` — reads token from localStorage instantly, verifies in background
- [x] `ProtectedRoute.jsx` — redirects if not authenticated
- [x] `RoleRoute.jsx` — blocks wrong roles
- [x] Complete React Router
- [x] `useAuth.js` hook
- [x] Skeleton loader component (replaces black screens)

---

### Day 3 — Phase 3: Mobile Login Page (Student/Faculty)
**Goal:** Beautiful zero-friction login for com.classgrid.app

- [x] Role toggle pills
- [x] OTP step slides in smoothly
- [x] Remember me (30-day token)
- [x] Google OAuth
- [x] Forgot password link
- [x] Desktop: two-column layout
- [x] No blocking loaders

---

### Day 4 — Phase 4: Admin Login Page
**Goal:** Separate entry for com.classgrid.admin

- [x] Minimal card (amber/gold accent)
- [x] Label: "Admin Portal — Classgrid"
- [x] Routes to org_admin or super_admin dashboard
- [x] No role toggle (admin only)

---

### Day 5 — Phase 5: Student Mobile Dashboard
**Goal:** The daily home screen — instant, beautiful, alive

- [x] Personalized greeting + time-based emoji
- [x] Learning streak counter 🔥
- [x] Urgent assignment alert with countdown bar
- [x] Horizontal scroll classroom cards (unique colors)
- [x] Recent activity feed
- [x] Quick action buttons
- [x] Profile → bottom sheet (not new page)
- [x] Notification bell with live badge
- [x] Bottom Navigation (5 tabs)

---

### Day 6 — Phase 6: Faculty Dashboard
**Goal:** Faculty home with management controls

- [x] Pending approval badges
- [x] "24/32 submitted" live counters on assignments
- [x] Quick actions: Create Classroom, Upload Material, Generate Quiz
- [x] Inline announcement composer
- [x] Same bottom nav as student
- [x] Student activity feed

---

### Day 7 — Phase 7: Classrooms
**Goal:** Browse, join, manage classrooms

- [x] Tabs: My Classrooms | Pending | Discover
- [x] Color-coded classroom cards
- [x] Join by class code (input at top)
- [x] Empty state with illustration
- [x] Faculty: Create Classroom floating button
- [x] Swipe-to-refresh

---

### Day 8 — Phase 8: Classroom Environment
**Goal:** Core learning page — everything in one place

- [x] Horizontal scrollable tabs: Stream | Classwork | People | Chat | AI
- [x] Stream: announcement cards with timestamps
- [x] Classwork: materials + assignment cards with deadline badges
- [x] People: member list with roles
- [x] Faculty: compose announcement inline
- [x] Bookmark posts (students can save important content)
- [x] Pinned resources at top (faculty can pin)
- [x] Read receipts on announcements (faculty sees who viewed)
- [x] Smooth tab transitions

---

### Day 9 — Phase 9: Assignment System (Core)
**Goal:** Complete assignment submit + grade system with deadline enforcement

- [x] Create assignment view
- [x] Auto-enforcement of deadlines
- [x] Student live countdown bar with time remaining
- [x] Upload file + submit
- [x] Resubmit before deadline (replaces old file)

---

### Day 10 — Phase 10: Assignment Tracker + Submission Board
**Goal:** Live submission visibility — who submitted, who didn't

- [x] View each submission
- [x] Inline grading (marks + feedback)

---

### Day 11 — Phase 11: Exam Result System (Full-Stack)
**Goal:** Build the complete result management engine from scratch (API + Frontend)

- [x] Create Mongoose Models (`Exam`, `Result`)
- [x] `POST /api/results/upload`: Parse Excel, validate PRNs, return preview
- [x] `POST /api/results/publish`: Save validated results to DB
- [x] `GET /api/results/my-results`: Student fetch route (protected by PRN)
- [x] `GET /api/results/class/:id`: Faculty fetch route (for export/analytics)
- [x] Subject-wise marks with progress bars
- [x] Admin export full class results

---

### Day 12 — Phase 12: Real-Time Chat + Notifications
**Goal:** WhatsApp-quality chat in the classroom

- [x] SocketContext for connection lifecycle
- [x] Message bubbles (yours right/blue, theirs left/grey)
- [x] Typing indicator "Rohan is typing..."
- [x] Unread message counter per classroom

---

### Day 13 — Phase 13: AI Features
**Goal:** The features that make Classgrid unique

- [ ] AI Tutor Chat: streaming response (word by word)
- [ ] Quiz Generator: topic → generates MCQs → publish
- [ ] Smart Summary: paste notes → bullet-point summary

---

### Day 14 — Phase 14: Org Admin Portal (Mobile-Fixed)
**Goal:** Fix completely broken mobile layout

- [x] Responsive sidebar → drawer on mobile
- [x] Dashboard: stats cards (2-col on phone)
- [x] Faculty Management: list + invite + roles

---

### Day 15 — Phase 15: Super Admin Portal (Mobile-Fixed)
**Goal:** Fix completely broken mobile layout

- [x] Platform overview stats
- [x] Organization approval queue
- [x] User search + management

---

### Day 16 — Phase 16: Notes & Study Materials (Backend Integration)
**Goal:** Clean resource library, real backend connection

- [x] Backend Integration (Classrooms, Dashboard, Materials)

---

### Day 17 — Phase 17: Settings, Profile & Legal
**Goal:** User management and compliance

- [x] Profile: avatar, name, email, college
- [x] Security: change password
- [x] Notifications: toggle preferences
- [x] Legal: Terms + Privacy → in-app bottom sheet modal

---

### Day 18 — Phase 18: Performance Pass & Database Architecture Shift
**Goal:** Optimize speed & migrate relational data to Supabase (keeping Auth strictly minimal in MongoDB)

- [x] Code splitting: React.lazy for every route
- [x] API caching: SWR (stale-while-revalidate)
- [x] Prefetching on hover
- [x] Implement client-side file compression (e.g., image uploads reduced to <200KB)
- [x] Implement `Google Drive link` submission option to save storage
- [x] Map ONLY Auth & Identity to MongoDB (`email`, `name`, `password`, `isVerified`, `joinedDate`, `role`)
- [x] Map ALL relational data (Classrooms, Assignments, Results, Chat) to Supabase PostgreSQL & Storage

---

### Day 19 — Phase 19: Deployment Switch
**Goal:** React goes live, replaces HTML files

- [x] `npm run build` → generates `client/dist/`
- [x] Update server.js to serve React build
- [x] Legacy URL redirects (/login.html → /login)

---

### Day 20 — Phase 20: Smart Additions & Polish
**Goal:** The extras that make it feel premium

- [x] Micro-animations everywhere
- [x] Empty states with illustrations

---

### Day 21 — Phase 21: Auth System Integration & Landing Page (index.html) Only
**Goal:** End-to-end Backend Auth + Professional landing page

- [x] Connect `Login.jsx` to real `/api/auth/login` endpoint
- [x] Connect `AdminLogin.jsx` to real `/api/auth/login` endpoint
- [x] Connect Google OAuth and OTP Device verification flow
- [x] Clean hero: headline + subheading
- [x] Two CTAs: "Download on Play Store" + "Open in Browser"

---

### Day 22 — Phase 22: QA + Merge + Android APKs
**Goal:** Everything tested, merged, ready for Play Store

- [x] Test com.classgrid.app WebView end-to-end
- [x] Build final APKs
- [x] Submit both apps to Google Play Store

---

## What Stays as Website Only (Minimal/No Redesign)

| Page | Why |
|---|---|
| Landing page (`/`) | Marketing for web visitors (Redesigned on Day 21) |
| Features (`/features`) | SEO (No redesign) |
| Terms (`/terms`) | Required by Play Store (Text only, no redesign) |
| Privacy (`/privacy`) | Required by Play Store (Text only, no redesign) |
| Contact (`/contact`) | Support (No redesign) |
| Security, Team, Sitemap | Informational (No redesign) |
| Get Started (`/get-started`) | Pricing (No redesign) |
| Org Apply (`/org-apply`) | Application form (No redesign) |

Apps load `classgrid.in/login` directly — skipping all of the above. 100% of the 22-day redesign effort is focused on the core app (classroom, results, dashboard, chat, etc.).

---

## Post-Launch (Day 23+)

| Day | Task |
|---|---|
| 23–28 | Global Layout & Responsiveness Optimization (Phone & PC perfectly scaled) |
| 29-34 | Advanced Exam Result System (trends, parent sharing, PDF reports) |
| 35–40 | First real institution onboarding |
| 41+ | User feedback → build what they ask for |
| TBD | Implement Full Notification System & Reduce Mass Emails |

---

## Future Architecture Roadmap: Notification System

*Note: This is an architecture design plan only. It will NOT be implemented during the current React rebuild phase. The goal is to ensure the backend structure can support these features later.*

### 1. In-App Notifications
- **UI Component:** Notification bell in the UI.
- **Storage:** Notifications will be stored in the database. Supported types: `announcement`, `notes`, `assignments`, `results`.
- **State Management:** Tracking of `unread` and `read` status per user.

### 2. Push Notifications
- **Third-party Integration:** Firebase Cloud Messaging (FCM) to be integrated later.
- **Event Triggers:** Automatically triggered when new announcements, notes, or assignments are uploaded.

### 3. Reduced Email Usage
- **Critical Emails Only:** Email delivery will be restricted to critical actions (e.g., OTP verification, password reset, welcome emails, account suspension).
- **Deprecation of Mass Emails:** Standard classroom updates will transition completely to in-app and push notifications, replacing the current mass email system.

---

## Complete Systems Checklist (For SPA Debugging & Integration)

### 5️⃣ Notes System
- [ ] Teacher uploads notes
- [ ] Students upload notes
- [ ] Admin approval for student notes
- [ ] Notes categorized by subject
- [ ] Download / view notes
- [ ] Notes dashboard

### 6️⃣ Assignment System
- [ ] Teacher creates assignments
- [ ] Assignment deadlines
- [ ] Students submit assignments
- [ ] File uploads
- [ ] Submission tracking
- [ ] Sent / Unsent assignment tracking
- [ ] Teacher grading

### 7️⃣ Attendance System
- [ ] Teacher takes attendance
- [ ] GPS based attendance
- [ ] IP verification
- [ ] Device fingerprint verification
- [ ] Multiple login detection
- [ ] Suspicious activity flag
- [ ] Automatic absence detection
- [ ] Attendance reports

### 8️⃣ Quiz System
- [ ] Teacher creates quiz
- [ ] Multiple choice questions
- [ ] Timer / counter
- [ ] Auto evaluation
- [ ] Quiz results
- [ ] Leaderboard
- [ ] Quiz analytics

### 9️⃣ AI Viva System
- [ ] AI asks viva questions
- [ ] Difficulty level selection
- [ ] Random question generation
- [ ] Student answers
- [ ] Practice viva system

### 🔟 Result Generation System
- [ ] Admin configures result system
- [ ] Subject registration
- [ ] Credit configuration
- [ ] Marking scheme configuration
- [ ] Teacher uploads Excel marks
- [ ] PRN based student mapping
- [ ] Result generation
- [ ] Percentage results
- [ ] SGPA / CGPA calculation
- [ ] Student result dashboard
- [ ] Rank generation

### 1️⃣1️⃣ Student Analytics
- [ ] Student progress tracking
- [ ] Performance analytics
- [ ] Top student ranking
- [ ] Academic insights
- [ ] AI student summary

### 1️⃣2️⃣ Communication System
- [ ] Announcements
- [ ] Classroom chat
- [ ] Teacher-student messaging
- [ ] In-app notifications
- [ ] Email notifications

### 1️⃣3️⃣ Meeting Scheduling System
- [ ] Schedule meetings
- [ ] Calendar integration
- [ ] Meeting reminders
- [ ] Join meeting button
- [ ] Support for: Zoom, Google Meet, Microsoft Teams, Webex, Custom meeting links

### 1️⃣4️⃣ Leave Request System
- [ ] Students request leave
- [ ] Reason for absence
- [ ] Teacher approval
- [ ] Daily leave dashboard
- [ ] Automatic daily reset

### 1️⃣5️⃣ Teacher Planning Tools
- [ ] Daily teaching plan
- [ ] Weekly plan
- [ ] Next lecture planning
- [ ] Activity planning

### 1️⃣6️⃣ Fee Record System
- [ ] Record student fees
- [ ] Exam fee records
- [ ] College fee records
- [ ] Payment status
- [ ] Next payment reminders
- [ ] Fee reports

### 1️⃣7️⃣ Teacher Feedback System
- [ ] Student feedback for teachers
- [ ] Rating system
- [ ] Semester feedback
- [ ] Anonymous feedback option
- [ ] Teacher performance analytics
- [ ] Admin feedback dashboard

### 1️⃣8️⃣ Notifications System
- [ ] Assignment notifications
- [ ] Quiz notifications
- [ ] Meeting reminders
- [ ] Result announcements
- [ ] Fee reminders
- [ ] Push notifications (mobile)

### 1️⃣9️⃣ AI Assistant
- [ ] AI help assistant
- [ ] AI quiz generation
- [ ] AI viva preparation
- [ ] Student learning assistance

### 2️⃣0️⃣ Infrastructure / Platform
- [ ] React SPA architecture
- [ ] Component based UI
- [ ] Mobile ready architecture
- [ ] Web platform
- [ ] Future mobile app support
- [ ] Supabase database
- [ ] Node backend APIs
- [ ] Email system
- [ ] Serverless hosting


---

# 🛡️ Classgrid Platform — Full Stability Audit Report
**Date:** 2026-02-23 | **Status: Fixed & Verified**

---

## ✅ Phase 1: Authentication Flow — Role-by-Role

| Role | Login E/P | Login Google | Reset PW | Force Reset | Redirect |
|------|-----------|--------------|----------|-------------|----------|
| Super Admin | ✅ `/superadmin/login` | ✅ | ✅ Fixed | N/A | `/super-admin-dashboard` |
| Org Admin | ✅ `/admin/login` | ✅ | ✅ Fixed | ✅ → `/admin/login` | `/org/:name/admin` |
| Faculty | ✅ `/login` (faculty tab) | ✅ | ✅ Fixed (no org code required) | ✅ → `/login` | `/faculty/dashboard` |
| Student | ✅ `/login` | ✅ | ✅ | N/A | `/student/dashboard` or `/classroom` |

### Bugs Fixed This Session
- **🔴 CRITICAL: `"blocked"` missing from `User.status` enum** — Any `status: "blocked"` set by admin controller was silently rejected by Mongoose. Fixed.
- **🔴 CRITICAL: `forgotPassword` blocked faculty** — Required `organization_code` for faculty, making reset impossible. Removed entirely. Reset is now email-only for ALL roles.
- **🔴 CRITICAL: `resetPassword` blocked suspended users** — Users could never recover accounts. Removed suspension check from reset endpoint (login still guards separately).
- **🔴 HIGH: New org admin not marked `isEmailVerified: true`** — `approveOrganization` created new User without this flag. Login gate at Email Verification step would block them. Fixed.
- **🔴 HIGH: `auth-check.js` logout never called backend** — httpOnly JWT cookie persisted after "logout". Now calls `POST /api/auth/logout` to clear cookie.
- **🟡 MEDIUM: `force-reset-password.html` bad redirects** — Was sending to `/org-admin-dashboard` (404) and `/dashboard` (404). Fixed to `/admin/login` and `/login`.
- **🟡 MEDIUM: Missing DB indexes** — `Organization.organizationCode`, `honorCode`, `status`, `owner_id` and `User.resetPasswordToken` had no indexes. All added.

---

## ✅ Phase 2: Route & API Audit

### All `/api/auth/*` routes
| Route | Method | Auth | Status |
|-------|--------|------|--------|
| `/api/auth/signup-init` | POST | None | ✅ |
| `/api/auth/verify-token/:token` | GET | None | ✅ |
| `/api/auth/signup-complete` | POST | None | ✅ |
| `/api/auth/login` | POST | None | ✅ Rate limited |
| `/api/auth/logout` | POST | None | ✅ |
| `/api/auth/me` | GET | JWT | ✅ |
| `/api/auth/setup-org-admin` | POST | None | ✅ |
| `/api/auth/forgot-password` | POST | None | ✅ Rate limited |
| `/api/auth/reset-password` | POST | None | ✅ Rate limited |
| `/api/auth/force-reset-password` | POST | JWT | ✅ |
| `/api/auth/google` | GET | None | ✅ |
| `/api/auth/google/callback` | GET | None | ✅ |
| `/api/auth/github/callback` | GET | None | ✅ |
| `/api/auth/facebook/callback` | GET | None | ✅ |
| `/api/auth/linkedin/callback` | GET | None | ✅ |

### All `/api/admin/*` routes
| Route | Auth | Status |
|-------|------|--------|
| GET `/api/admin/pending-organizations` | super_admin | ✅ |
| POST `/api/admin/approve-organization/:id` | super_admin | ✅ |
| POST `/api/admin/reject-organization/:id` | super_admin | ✅ |
| GET `/api/admin/all-organizations` | super_admin | ✅ Codes excluded |
| GET `/api/admin/all-users` | super_admin | ✅ |
| POST `/api/admin/suspend-organization/:id` | super_admin | ✅ |
| POST `/api/admin/block-organization/:id` | super_admin | ✅ |
| POST `/api/admin/reactivate-organization/:id` | super_admin | ✅ |
| DELETE `/api/admin/delete-organization/:id` | super_admin | ✅ |
| POST `/api/admin/update-faculty-limit/:id` | super_admin | ✅ |
| POST `/api/admin/reset-admin-password/:id` | super_admin | ✅ |

### `/api/org/*` and `/api/organization/*` routes (aliased)
| Route | Auth | Status |
|-------|------|--------|
| POST `/api/org/apply` | None | ✅ |
| POST `/api/org/verify-code` | JWT + rate limit | ✅ |
| POST `/api/org/validate` | JWT | ✅ Legacy |
| POST `/api/org/add-faculty` | org_admin/super_admin | ✅ |
| DELETE `/api/org/remove-faculty/:id` | org_admin/super_admin | ✅ |
| POST `/api/org/reset-faculty-password` | org_admin/super_admin | ✅ |
| GET `/api/org/me` | org_admin/super_admin | ✅ |
| GET `/api/org/faculties` | org_admin/super_admin | ✅ |

### No duplicate routes found ✅
### No conflicting Vercel rewrites found ✅ (single `/(.*) → /api/index.js` catch-all)

---

## ✅ Phase 3: Frontend Stability

### `localhost` in HTML files — analysis
All occurrences are **inside `getApiBase()` functions** with proper conditional checks:
```javascript
// Pattern used in ALL login pages — CORRECT ✅
if (o === 'http://localhost:3000') return 'http://localhost:3000/api';
return o + '/api';  // production: classgrid.in/api
```
These are NOT hardcoded localhost — they're local dev shortcuts that correctly fall through to `o + '/api'` in production. ✅

### `classroom.html` localhost pattern
All occurrences follow the safe pattern:
```javascript
const API_BASE = window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : window.location.origin;
```
Safe. Production always uses `window.location.origin`. ✅

### Null-check audit on event listeners
- `auth-check.js` — all DOM queries guarded with `if (element)` ✅
- Login pages — all `getElementById` results checked before calling methods ✅
- `force-reset-password.html` — form IDs always present in DOM ✅

---

## ✅ Phase 4: Environment Audit

### Backend (`src/`)
All URL generation uses the pattern:
```javascript
process.env.FRONTEND_URL?.trim() || 
    (process.env.NODE_ENV === "production" ? "https://classgrid.in" : "http://localhost:3000")
```
✅ No hardcoded production domains in email links.  
✅ `BACKEND_URL` used for OAuth callbacks in passport.service.js and googleAuth.controller.js.

### Required `.env` vars
```
MONGO_URI           ✅ Required
JWT_SECRET          ✅ Required (fallback "dev_secret" for local only)
FRONTEND_URL        ✅ https://classgrid.in
BACKEND_URL         ✅ https://classgrid.in
BREVO_API_KEY       ✅ For email
SUPER_ADMIN_EMAIL   ✅ For org approval notifications
GOOGLE_CLIENT_ID    ✅ OAuth
GOOGLE_CLIENT_SECRET ✅ OAuth
NODE_ENV            ✅ production
```

### Vercel config
- Single rewrite: `/(.*) → /api/index.js` ✅
- `includeFiles` bundles `src/**`, `config/**`, `public/**`, `env.js` ✅
- No conflicting route definitions ✅

---

## ✅ Phase 5: Organization Isolation

### Auth Middleware enforces
1. **User status** — `status !== 'active'` → 403 for all authenticated routes ✅
2. **Org status** — org inactive → 403 (super_admin bypasses) ✅
3. **Role enforcement** — `requireRole()` middleware on all admin routes ✅

### Classroom isolation
- Classrooms are filtered by `teacher` (organization-scoped faculty) in classroom routes ✅
- Students can only see classrooms they're members of ✅
- `organization_id` index on User speeds up org-scoped queries ✅

### Suspension cascades
- Suspend org → all users in that org get `status: "suspended"` ✅
- Block org → all users get `status: "suspended"` ✅  
- Reactivate org → all users get `status: "active"` ✅
- Suspended users CAN reset password (reset endpoint has no status check) ✅
- Suspended users CANNOT log in (login controller checks status) ✅

---

## ✅ Phase 6: Performance & Indexes

### Indexes in place

**User model**
- `email: 1` (unique) ✅
- `organization_id: 1` ✅
- `resetPasswordToken: 1` (sparse) ✅ **NEW — added this session**

**Organization model**  
- `organizationCode: 1` (sparse) ✅ **NEW**
- `honorCode: 1` (sparse) ✅ **NEW**
- `owner_id: 1` ✅ **NEW**
- `status: 1` ✅ **NEW**

**Classroom model** — indexed on `teacher`, `classCode` (unique), `subjectSlug` ✅  
**ClassroomMembership** — compound index `(classroom, student)` unique, `(classroom, status)`, `(student, status)` ✅  
**Message** — compound indexes on `(classroom, messageType, createdAt)` ✅  
**ActivityLog** — compound indexes for analytics queries ✅  
**Verification** — TTL index (24hr expiry) ✅

### Estimated performance
- Login: ~50-100ms (indexed email lookup + bcrypt)
- Token verify (middleware): ~30-50ms (indexed email lookup)
- Class load: ~100-200ms (indexed teacher lookup)
- AI endpoint: depends on OpenAI — typically 1-3s

---

## 🎯 System Health Summary

| Category | Status | Notes |
|----------|--------|-------|
| Auth Routes | ✅ All present & working | |
| Admin Routes | ✅ All guarded by `super_admin` role | |
| Org Routes | ✅ Rate limited, validated | |
| Password Reset | ✅ Fixed for ALL roles | No org code required |
| Logout | ✅ Clears cookie + localStorage | |
| localhost leaks | ✅ None in production | Dev-only conditionals |
| Status enum | ✅ blocked added to User schema | |
| DB Indexes | ✅ All hot-path fields indexed | |
| Org Isolation | ✅ Middleware enforced | |
| Role Isolation | ✅ requireRole on admin routes | |
| New Org Admin | ✅ isEmailVerified set on creation | |

**System is now stable and ready for production testing.**


---

# Classgrid Design Rules & Component Guidelines

**STRICT DISCIPLINE REQUIRED.** The goal of these rules is to maintain a scalable, visually consistent, auto-dark-mode-compatible, and responsive layout across the entire UI.

## ⛔ The "Never Allow" List
If a component does any of the following, it breaks the system and will be rejected.

1. **NO Hardcoded Colors**
   - ❌ `background: white;` or `background: #fff;` or `background: black;`
   - ❌ `color: #111827;` or `color: #6b7280;`
   - ✅ Use variables exclusively: `var(--bg)`, `var(--surface)`, `var(--text)`, `var(--text-muted)`.
2. **NO Hardcoded Pixel Values for Layout/Spacing**
   - ❌ `padding: 20px;` or `margin-bottom: 30px;`
   - ❌ `font-size: 14px;`
   - ❌ `border-radius: 12px;`
   - ✅ Use variables: `var(--space-2)`, `var(--space-3)`, `var(--text-sm)`, `var(--radius)`.
3. **NO Raw Layout Divs in Pages**
   - ❌ `<div className="dashboard-container">...</div>`
   - ✅ Use the Component wrappers: `<Page>`, `<Card>`, `<Button>`.
4. **NO Manual Responsive Queries (unless for custom charts/canvas)**
   - ❌ `@media (max-width: 768px) { .my-item { width: 100%; } }`
   - ✅ The system `Card`, `Grid`, and `Button` components auto-collapse and auto-expand correctly.

---

## 🏗 The "Always Use" Component List

All UI files must be structured using the `components/ui` barrel components.

```jsx
// ❌ BAD:
import '../../styles/OldPage.css';
export default function Page() {
  return (
    <div style={{ padding: '20px', background: 'white' }}>
       <h1 style={{ color: 'black' }}>Heading</h1>
       <div className="grid">...</div>
    </div>
  )
}
```

```jsx
// ✅ GOOD:
import { Page, PageHeader, Card, Grid, Button } from '../../components/ui';

export default function MyPage() {
  return (
    <Page>
      <PageHeader 
        title="Settings" 
        subtitle="Manage your profile"
        actions={<Button variant="primary">Save</Button>} 
      />
      <Grid cols={2}>
        <Card>
          <Card.Header>Card Title</Card.Header>
          <Card.Body>Card Content</Card.Body>
        </Card>
      </Grid>
    </Page>
  );
}
```

---

## 🔧 Token Reference Cheatsheet

### Backgrounds
- `var(--bg)`: The very back-most background (deep navy / off-white)
- `var(--surface)`: Main cards and modals
- `var(--surface2)`: Secondary areas (headers, list items on hover)
- `var(--surface-hover)`: Active states

### Text
- `var(--text)`: Primary titles/text
- `var(--text-muted)`: Secondary subtext
- `var(--text-dim)`: Very subtle hints / placeholders

### Borders
- `var(--border)`: All lines and separating areas
- `var(--border-hover)`: Interactive border on hover

### Spacing
- `var(--space-1)`: 8px (Small gaps)
- `var(--space-2)`: 16px (Standard padding inner)
- `var(--space-3)`: 24px (Standard section spacing)
- `var(--space-4)`: 32px (Large sections)

### Radius
- `var(--radius-sm)`: 10px (Inputs, buttons)
- `var(--radius)`: 16px (Normal cards)
- `var(--radius-lg)`: 20px (Modals)

---

## 🚧 Migration Safety Rules
When upgrading an old page to the Unified Design System:
1. Rebuild the page JSX using the standard `<Page>`, `<Card>`, `<Input>` components.
2. Verify functionality, responsiveness, and Dark/Light Mode.
3. Check the old `Module.css` file.
   - If other components still use it, leave it alone.
   - If this page was the only user, add a comment: `/* DEPRECATED: Safely delete after full org migration */` or delete the file entirely if completely safe.
4. **DO NOT MIX System CSS with Old Page CSS.** Use the new components strictly.


---

# Canteen Management System Blueprint (Module 22)

The Classgrid Canteen Module is a premium offering designed to eliminate cash-handling chaos, pre-order confusion, and queue bottlenecks during peak college lunch hours. It acts as an internal Swiggy/Zomato specifically tailored for educational institutions.

## Core Objective
To allow students to pre-order and pay for food directly via the Classgrid app, ensuring their order is ready for pickup during break time. Specifically, **payments route directly to the canteen owner's Razorpay account**, absolving Classgrid from accounting liabilities for physical goods. Canteen staff receive orders in a live, real-time Socket.io queue.

> [!IMPORTANT]
> **Tenant-Specific Payment Architecture**
> The system will require organizations to input their *own* Razorpay `KEY_ID` and `KEY_SECRET` in the Org Settings (under Canteen configuration). The payment gateway will instantiate using the *tenant's* keys, ensuring funds settle directly into the canteen owner's bank account. Classgrid will neither touch nor hold this money.

## Key Features

1. **Smart Order Aggregation (Kitchen Display):** Instead of showing 14 individual tickets for Vada Pavs scattered across a screen, the system aggregates identical items from the 'NEW' column into a bold top banner: *"🔥 Preparing Now: 14x Vada Pav, 5x Tea"*. This heavily reduces kitchen confusion.
2. **Scan-to-Order (Walk-Ins):** Students who forgot to pre-order can scan a Razorpay QR code at the canteen counter. This routes them instantly to the Classgrid Canteen Menu without navigating menus.
3. **Queue Transparency:** Students can check the app to see their position in the queue (e.g., *"3 orders ahead of yours"*).
4. **Instant Sold-Out Toggles:** Canteen staff can tap a single button to mark an item 'Out of Stock', instantly removing it from the student-facing app to prevent refunds.
5. **Student Canteen Insights:** Students have their own dashboard showing total monthly spending, order history, and the ability to rate items (1-5 stars) after purchase. If a parent asks where their allowance went, the student can just pull up the monthly expense report.
6. **Data-Driven Canteen Analytics:** Admin dashboard tracking top-selling items, highest-rated food, lowest-rated food, and overall student behavior.
7. **Two Operating Modes:** 'Live Kitchen Mode' for large canteens with staff to manage a screen, and a simple 'Digital Token Mode' (Pay & Show Receipt) for small canteens without dedicated screen staff.

---

## 1. Database Schema Additions (MongoDB)

We will introduce two new collections to handle canteen operations.

### `CanteenItem` Collection
Holds the menu for a specific organization's canteen.
- `_id`: ObjectId
- `orgId`: Reference to Organization
- `name`: String (e.g., "Vada Pav")
- `price`: Number (in INR)
- `category`: String (e.g., "Snacks", "Beverages", "Meals")
- `isAvailable`: Boolean (Toggle to mark item out of stock instantly)
- `imageUrl`: String (Optional)
- `prepTimeAvgMinutes`: Number (To estimate queue times)
- `averageRating`: Number (1-5 scale)
- `totalRatings`: Number

### `CanteenOrder` Collection
Tracks the lifecycle of an individual student's order.
- `_id`: ObjectId
- `transactionId`: String (Razorpay Payment ID / `pay_xxx`)
- `orgId`: Reference to Organization
- `studentId`: Reference to User
- `items`: Array
  - `itemId`: Reference to CanteenItem
  - `quantity`: Number
  - `priceAtPurchase`: Number (Prevents historical price changes from affecting past receipts)
  - `rating`: Number (1-5, Optional)
- `totalAmount`: Number
- `status`: Enum (`['PENDING_PAYMENT', 'NEW', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED']`)
- `paymentStatus`: Enum (`['SUCCESS', 'FAILED', 'REFUNDED']`)
- `createdAt` / `updatedAt`: Timestamps

---

## 2. API Endpoints (Node.js/Express)

**Menu Management (`/api/canteen/menu`)**
- `POST /` - Admin creates new item
- `GET /` - Fetch active menu for the org
- `PUT /:id/toggle-availability` - Fast toggle for sold-out items

**Order Lifecycle (`/api/canteen/order`)**
- `POST /create-razorpay-order` - Calculates total server-side, fetches the tenant's Razorpay keys, and generates an order ID.
- `POST /verify-payment` - Verifies the signature, marks the order `NEW`, and emits a Socket.io event to the canteen staff.
- `GET /history/student` - Student views their receipt and total monthly spending.
- `POST /:id/rate` - Student rates the items in an order (1-5 stars).
- `GET /queue/live` - Pre-fetches the day's active queue for the canteen staff dashboard.
- `PUT /:id/status` - Canteen staff updates order status (PREPARING -> READY -> DELIVERED).

---

## 3. Real-Time Engine Integration (Socket.io)

We will leverage the existing `socket.service.js` to create frictionless live updates.

**Socket Events:**
- `canteen_new_order`: Emitted by server when payment succeeds. The canteen dashboard instantly injects the new order card into the 'NEW' column with an alert sound.
- `canteen_status_update`: Emitted when staff mark an order as 'READY'. The student receives a real-time push notification 🔔 "Your order is ready for pickup at Counter A".

---

## 4. Frontend UI Pages (React)

### For Students: Mobile-First Menu Page
**Path:** `/canteen/menu`
- **Tabbed Interface:** The very top of the screen has a toggle: `[ Instant Buy ] | [ Pre-Order ]`.
    - *Instant Buy Tab:* Triggers the "Without Max" walk-up flow. Token is generated instantly for counter presentation.
    - *Pre-Order Tab:* Triggers the "Max Mode" flow. Instructs the student to pick up their food at a specific time (e.g. Lunch Break at 1:00 PM).
- A clean grid of menu items categorised nicely.
- Persistent sticky bottom bar: `Cart: ₹180 | Proceed to Pay`.
- After payment, transitions to an **Order Tracking Screen** showing live status.

### For Canteen Staff: Two Operating Modes (Dashboard Always Active)

Every canteen will have the Dashboard open to track daily revenue and incoming orders. The difference is in *how* they process the queue.

***Mode A: Without Max Mode (Instant Walk-Up)***
Designed for fast, immediate transactions directly at the counter.
- Student pays on the app while standing at the counter.
- Student shows the app generating a large, colorful unique **Token Receipt**.
    - *Token MUST show: Amount Paid, Student Name, Token Number, Item Names, Time of Razorpay payment.*
    - *Token MUST NOT show: PRN (Roll Number).*
- Staff glances at the phone, hands over the food. 
- *Crucially:* The canteen dashboard logs the money and order stats instantly, but the staff **does not need to click anything** to clear the order. It handles it automatically to keep the line moving.

***Mode B: Max Mode (Pre-Order & Tracking)***
Designed for lunch pre-orders placed 15-30 minutes *before* break time.
- Student places a ₹60 Sandwich order while in class.
- The Canteen Dashboard instantly receives the order and payment confirmation.
- The dashboard keeps this order actively pending on the screen.
- When the student physically arrives and shows their token, the staff hands them the sandwich and **manually clicks "Mark Order Completed"**.
- This ensures the canteen knows exactly who has collected their pre-paid food and who hasn't.

### For Admin & Canteen Owner: Data-Driven Analytics
**Path:** `/org/canteen-analytics`
- **Sales Analytics:** Total revenue across days, weeks, and months.
- **Top Performers:** Grid showing the most ordered items (e.g., 2,500 Vada Pavs sold this month).
- **Quality Control:** Insights tracking the highest-rated and lowest-rated items so the canteen can improve food quality based on student feedback.

---

## 5. Implementation Phases & Walkthrough

1. **Phase 1: Razorpay Tenant Injection**
   Update `payment.service.js` to accept dynamic, per-org Razorpay keys fetched from the database instead of the rigid `process.env` keys.
2. **Phase 2: Database & Menu Setup**
   Build the Mongoose models and the Admin UI to populate the initial menu items.
3. **Phase 3: The Student Cart & Checkout**
   Build the frontend cart state, wire it to the dynamic Razorpay gateway, and successfully insert a `NEW` order record.
4. **Phase 4: The Live Kitchen Display**
   Build the socket-powered Kanban board for the canteen staff and the aggregator logic.

---

## User Review Required

> [!WARNING]
> Because you want payments to go to the canteen owner, we must store their Razorpay API keys in our MongoDB database. I will encrypt these keys in the database for security using AES-256 before saving them, so even if the DB is compromised, the keys are safe. Do you agree with this approach?


---

# 🚀 The 4,000 Requests/Second AWS Blueprint

If you want to build Classgrid so that it can physically absorb **4,000 students clicking Attendance simultaneously in 1 second**, you can no longer use a single basic EC2 machine. You are entering the realm of **Enterprise DevOps**. 

To hit 4,000 RPS without crashing, you need a highly resilient, distributed architecture. 

Here is exactly how you will build your AWS infrastructure when you hit that scale:

---

## 🏗️ Phase 1: The Gateway

### 1. AWS Application Load Balancer (ALB)
*   **The Problem:** One EC2 machine will simply drop packets and freeze if 4,000 connections hit its single IP address all at once.
*   **The Solution:** You put an AWS Application Load Balancer in front. When 4,000 students connect, they hit the ALB first. The ALB acts as a traffic cop and distributes the network load flawlessly.

## 💻 Phase 2: Horizontal Scaling (EC2 Fleet)

### 2. Auto Scaling Group (ASG)
*   **The Problem:** Node.js can realistically handle about 300 to 500 API writes per second per CPU core. A single machine is not enough.
*   **The Solution:** Instead of renting one massive server (`m5.8xlarge`), you use AWS Auto Scaling. You tell AWS: *"If my CPU hits 80%, automatically boot up 3 more `t3.medium` EC2 machines and add them to the Load Balancer."* 
*   **At 4,000 RPS:** Your Load Balancer will automatically split the traffic across **8 to 10 EC2 instances** (each running PM2). This means each server only handles ~400 RPS, which it can do easily without sweating!

## 💾 Phase 3: The Data Layer bottleneck

### 3. Redis In-Memory Queue (ElastiCache / Upstash)
*   **The Problem:** Even if your 10 EC2 servers handle the 4,000 students, they will instantly fire 4,000 `INSERT` commands to Supabase (PostgreSQL). Supabase will crash, throw `Too Many Connections`, and reject the data.
*   **The Solution:** Do not talk to the database directly! Your 10 EC2 servers will instantly dump the 4,000 attendance records into a **Redis Queue** (which takes `0.001` seconds per record because it lives in RAM, not on a hard drive). 
*   A background server then reads the queue and inserts the records into Supabase in batches of 50. The students get an instant "Success!", but the database is completely protected.

### 4. Supabase PgBouncer (Connection Pooling)
*   You must upgrade your Supabase to use IPv4 PgBouncer. This acts as a middleman that manages open TCP connections, ensuring your database doesn't crash if 8 EC2 servers all try to connect simultaneously.

---

## 🛠️ The TL;DR Setup for 4,000 RPS:
1. Student clicks "Mark Present".
2. Hit **AWS Load Balancer**.
3. Load Balancer routes to one of **10 PM2-Clustered EC2 Servers**.
4. Node.js writes the status "Present" instantly to **Redis Queue**.
5. Node.js sends `200 OK` back to the student in **20 milliseconds**.
6. A background worker politely moves the data from Redis to **Supabase**.

**The Cost:** This architecture costs roughly **$200 to $400/month** on AWS. 
**The ROI:** If you are hitting 4,000 RPS, you have thousands of paying users and are easily making **$50,000+/month** in B2B SaaS revenue. You pay the $400 server bill with a smile! 😄


---


# 🏗️ CLASSGRID EXHAUSTIVE BACKEND MODULES MAP
This section outlines every single module discovered in the backend source code (`/server/src/models` and `/server/src/routes`) that is active and must be supported by the React frontend:

- **Academic & Core ERP**: Classrooms, Subjects, Timetable, Attendance, Courses, Academic Plans, Divisions/Batches.
- **Examinations & Grading**: Exams, Advanced Quizzes, Examinations, Internal Tests, Marks, Results, Result Audit Logs.
- **Finance**: Fee Categories, Fee Structures, Fee Transactions, Payment Requests, Student Fee Ledger.
- **Users & Onboarding**: Users, Roles, Student Profile, Approvals, Profile Completion, Device Verification.
- **Comms & Real-Time**: Chat (Thread, Group, Org), Messaging, Notifications, Organization Announcements, Webhooks.
- **Integrations**: Google Auth, Zoom Meets, Google Meets, Calendar Sync.
- **Premium Expansion Modules**: Alumni, Certificates, Library, Leave Requests, Holidays, Events, Feedback, Notes, Library, Comments.

---

# 📚 THE AI RAG SUPER-TUTOR & PAST PAPER ENGINE
A dual-engine AI system designed to handle heavy PDF loads (like "10 Years of Previous Year Question Papers") without incurring massive language model API costs.

### 1. JSON-Only Assistant
The core AI does NOT complexly try to read all PDFs using expensive vector databases. It strictly queries MongoDB JSON (attendance, assignments, dates, extracted text) to answer student logic (e.g., "Which assignment is due Monday?").

### 2. The Global Notes Marketplace (B2C Premium)
A direct-to-student microtransaction engine (₹20-30). A student pays ONE TIME to run a complex chemistry PDF through the AI. The AI generates "Core Notes, Difficult Questions, and Important Topics". 
- We do *not* permanently save expensive vector data. 
- Instead, the generated formatted text is cached, and the student is prompted to share it to the **"Classgrid Global Notes Platform"**, creating an infinite, self-funding crowdsourced study library where other students can unlock the same summary instantly.

### 3. Past Paper Analysis Engine (Strict 6-Step Pipeline)
To ingest 10+ years of previous year question papers (PYQs) intelligently:
1. **Ingestion:** Accept 10+ PDF question papers & store heavily in S3/Supabase Storage.
2. **Non-AI Text Extraction:** Use `PyMuPDF`/`pdfplumber` for digital PDFs, and `Tesseract OCR` for scanned PDFs. (Never send raw massive PDFs to the LLM context window).
3. **Pattern Cleaning & Structuring:** Strip headers/footers. Use regex to detect question numbers (Q1, 2.). Map to a strict JSON schema: `{ year: 2023, questions: [{ question: "...", options: ["A"], type: "MCQ" }] }`.
4. **Database Storage:** Save all structured, cleaned questions efficiently into MongoDB JSON.
5. **AI Processing:** Send *only* the structured JSON array to Groq API (Llama 3). Groq identifies repeated questions, tags topics, calculates repetition probabilities across 10 years, and generates a "Most Important Topics" predictive Mock Test.
6. **Persistent Caching:** Save the generated Mock Tests and Topic Maps. Never recompute the same 10-year batch again to save API costs.

---

- **Administration**: Org Settings, Super Admin Dashboard, Metric Buckets, Impersonation Logs, Activity Logs, Digest Emails, Cron Jobs.

---

# 🧠 THE JEE / NEET ADVANCED QUIZ ENGINE

To specifically cater to Coaching Institute tenants (Plan 4), the platform includes a highly specialized "Advanced Quiz" module that perfectly mirrors the National Testing Agency (NTA) exam patterns.

### 1. Scoring & Marking Logic
The engine allows Org Admins/Teachers to configure negative and partial marking rules:
- **Correct Answer**: `+4` points
- **Incorrect Answer**: `-1` point (Negative Marking)
- **Unattempted**: `0` points
- **Partial Marking**: Supported for multiple-select questions (e.g., `+1` per correct option chosen).

### 2. Question Types Supported
- **Single Choice MCQ**: Standard 4-option questions (Only 1 correct).
- **Multiple Choice (Multi-Select)**: Multiple options can be correct.
- **Integer / Numerical Value**: Students must type a specific numerical answer (e.g., `42.5`).
- **Match the Following**: Matrix matching logic.

### 3. Analytics & Leaderboard (Percentile Engine)
Because JEE/NEET ranks are percentile-based, the backend engine calculates:
- **Absolute Score**: e.g., `210 / 300`
- **Subject-wise Breakdown**: Physics (`80/100`), Chemistry (`90/100`), Maths (`40/100`).
- **Percentile Score**: Calculates the student's relative rank against all other participants in the batch.
- **Time Analysis**: Tracks average time spent per question to help students identify weak areas.
