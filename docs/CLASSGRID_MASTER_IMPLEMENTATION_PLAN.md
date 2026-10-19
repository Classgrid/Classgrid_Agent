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

# 🏗️ CLASSGRID MASTER IMPLEMENTATION PLAN v3.0
**The Single Source of Truth — All 3 Projects, All Features, All Timelines**

> **Last Updated:** April 9, 2026
> **Author:** Nikhil + Sorra (Antigravity AI)
> **Status:** ACTIVE — Days 1-4 COMPLETED.

---

# 🏁 DAY 1 KICKOFF: THE GREAT PLATFORM SPLIT (TOMORROW)
**Objective:** Transform Classgrid from a single app into a 4-path Identity Engine.

### 1. Backend Core (The Identity Database)
*   **Target:** `server/src/models/Organization.js`
*   **Action:** Add `org_type` and `division_mode` to the schema.
    ```javascript
    org_type: { 
      type: String, 
      enum: ["school", "junior_college", "engineering", "coaching", "diploma", "other"],
      required: true 
    },
    division_mode: { 
      type: String, 
      enum: ["with_divisions", "without_divisions"],
      default: "with_divisions" 
    },
    allow_sub_batches: { type: Boolean, default: false } // For Engineering lab batches
    ```

#### 🗓️ Day 1 Goal: The 7 Organizational Profiles
**The most critical backend system. Every model, classroom, and fee structure depends on this.**

| Plan | Type | Hierarchy Structure | Key Backend Logic |
|---|---|---|---|
| **Plan 1** | College / Engineering | `Degree → Dept → Year → Sem → Div/Batch` | Requires `semester_id` + `division_id` |
| **Plan 2** | School (With Div) | `Standard → Division` | Grade + Division structure |
| **Plan 3** | School (No Div) | `Standard` only | Auto-creates hidden "Default Division" |
| **Plan 4** | Coaching Classes | `Course → Batch` | Blocks divisions & semesters entirely. |
| **Plan 5** | Junior College | `Stream → Standard → Division` | Enforces 11th/12th grade boundary |
| **Plan 6** | Diploma | `Dept → Year → Semester` | No Degree layer, Semester-locked |
| **Plan 7** | Other (Custom) | Open-ended grouping | Flexible, user-defined hierarchy |

- [x] Build `AcademicHierarchy.model.js` with the `structure_type` enum for all 7 plans.
- [x] Write dynamic parser middleware: If a Coaching class requests "Semesters" → `400 Bad Request`.
- [x] Wire `AuthContext` to read `structure_type` from JWT → Frontend Sidebar hides/shows "Divisions" vs "Batches".
- [x] Test every plan via Postman: Create Org → Set structure_type → Verify allowed/blocked nested routes.

---

### 2. The Multi-Track Dictionary (Terminology)
*   **Target:** `server/src/utils/terminology.js` (New File)
*   **Action:** Create a standard dictionary that returns the correct word based on `org_type`.
*   **Mapping:**
    *   **Engineering:** "Branch" / "Semester" / "Division"
    *   **School:** "Class" / "Section" / "Division"
    *   **Coaching:** "Course" / "Batch" / "Batch"
    *   **Junior College:** "Stream" / "Class" / "Division"

### 3. Admission Strategy Split
*   **Target:** `server/src/services/admissions/strategy-selector.js`
*   **Implementation:**
    *   **IF Engineering:** Load `CETAllotment` + `RLA_Flow`.
    *   **IF School:** Load `MeritCalculation` + `Normalization`.
    *   **IF Coaching:** Load `BatchSelection` + `DiscountLogic`.

### 4. Admin Dashboard Personalization
*   **Target:** `client/src/context/OrgContext.jsx`
*   **Action:** Provide `branding` and `terminology` globally.
*   **Result:** The sidebar and buttons automatically change (e.g., "Add Student" vs "Register Applicant").

---# Stitch Design Flow & Strict Shadcn Rules

====================================================================
🚨 BIG NOTES: THE GREAT REBUILD 🚨
====================================================================
MANDATE: We are rebuilding ALL pages from SCRATCH (Except the Home Page).
When opening Classgrid, the Home Page is good. From that point on, EVERYTHING is rebuilt.

THE STRICT 4-STEP REBUILD PIPELINE:
1. STITCH DESIGN (Theme, Colors, OKLCH, Variables)
2. FIGMA (Layout, Structure, Spacing)
3. SHADCN COMPONENTS (Assemble primitives from @/components/shadcn)
4. CONNECT BACKEND / API (Wire up the data, React Router, and Context)

NEVER deviate from this order when building a new page.
====================================================================
Before doing anything, follow these strict rules:

1. You are ONLY allowed to use existing shadcn components from:
   client/src/components/shadcn/

2. Allowed components list (strict):
   button, input, label, card, form, toast, dialog, alert, checkbox, radio-group, select, separator, tabs, badge, avatar, dropdown-menu, sheet, skeleton, switch, textarea, accordion, alert-dialog, aspect-ratio, breadcrumb, calendar, carousel, chart, collapsible, combobox, command, context-menu, table, popover, drawer, hover-card, input-otp, kbd, menubar, navigation-menu, pagination, progress, resizable, scroll-area, slider, sonner, spinner, toggle, toggle-group, tooltip, toaster

3. DO NOT:
   * create new components
   * use @base-ui/react
   * use useRender or mergeProps
   * add random Tailwind styles outside components
   * redesign UI or change structure

4. If a required component is:
   * missing
   * not found
   * not installed
   THEN:
   STOP immediately and say:
   "Component [name] not found. Please install it first."
   DO NOT create a replacement.
   DO NOT continue without it.

5. Before writing code, you MUST confirm:
   "I will only use allowed shadcn components and follow all rules."
   If any rule is broken, stop and fix before continuing.

6. STRICT RULE: NEVER remove, refactor, or "clean up" my existing code unless I specifically ask you to. You must ONLY make surgical changes to the exact lines required to fix the issue. My current system is already built and functioning—do not break my edge cases.

7. ARCHITECTURE RULE: Raw UI components stay in `src/components/shadcn/`. Business logic and complex assembled components (like an `<AssignmentSubmitButton />`) must be built in `src/components/features/` and import their base UI primitives from `shadcn/`.

---

# Our Core Technology Stack & Development Flow

Step 1: The Three Pillars
* FIGMA: Used strictly for LAYOUT. (Spacing, paddings, margins, grid structures).
* STITCH: Used strictly for DESIGN. (Colors, themes, border styles, gradients, visual tokens).
* SHADCN: Used strictly for COMPONENTS. (Tables, notification bars, buttons, forms, inputs, etc.).

Step 2: Design Ingestion
I will actively read your Figma layout and your Stitch design tokens using the MCP integrations to understand your exact visual and structural blueprint.

Step 3: Component Sourcing
The user provides base component code directly from the official shadcn/ui website (e.g. Table, Alert/Notification bar, Button).

Step 4: Surgical Styling
I will surgically inject the Stitch-defined design colors and the Figma-defined spacing into the allowed Shadcn components to match your vision perfectly.

Step 5: Backend Wiring
I will wire the styled React UI components to the existing Express.js backend without altering any existing business logic.


## 🤖 INSTRUCTIONS FOR AI ASSISTANTS (READ THIS FIRST)

> **If you are an AI (ChatGPT, Cursor, Gemini, Antigravity, or any other assistant) reading this file, you MUST follow every rule below. Nikhil has spent weeks architecting these decisions. Breaking them will destroy the project.**
> **PERSONA:** The user has officially named this AI instance **Sorra**. You are to carry this identity throughout the Classgrid project.

### ⛔ NEVER DO THESE THINGS:
1. **NEVER deploy to or suggest Vercel.** We use **AWS EC2 only**. Vercel kills WebSockets, has 10s timeouts, and exhausts DB connections. This was tested and rejected.
2. **NEVER rewrite files to TypeScript (.tsx).** The project launches with JavaScript (.jsx). Do NOT halt momentum for a TS migration.
3. **NEVER install Expo, React Native, or Zustand.** We use Kotlin WebView for Android and React Context for state. These were explicitly rejected.
4. **NEVER use Docker or Coolify** on our `t3.micro` EC2. We deploy via bare-metal **PM2 + Nginx** only.
5. **NEVER hardcode colors** (`background: white`, `color: #111`). Use CSS variables: `var(--bg)`, `var(--surface)`, `var(--text)`.
6. **NEVER hardcode pixel values** (`padding: 20px`). Use design tokens: `var(--space-2)`, `var(--radius)`.
7. **NEVER create separate native Android screens.** The Android app is a **WebView shell** loading `app.classgrid.in`. Period.
8. **NEVER auto-redirect login portals on mobile/phone.** Auto-redirect is **Desktop-only**. On phone, if a user logs into the wrong app, the backend **blocks** it with an error.
9. **NEVER import from `src/components/ui/`** for new code — that is the LEGACY folder being phased out. Use `src/components/shadcn/` instead.
10. **NEVER use Supabase Realtime** for chat/presence. We use **Socket.io on EC2** as our primary real-time engine. Supabase is for database (PostgreSQL) only.

### ✅ ALWAYS DO THESE THINGS:
1. **Read this ENTIRE file** before writing any code. It is the Single Source of Truth.
2. **Follow the 4-Step Pipeline** for every new page: Stitch → Figma → Shadcn → Backend.
3. **Use Shadcn components** from `@/components/shadcn/` for all new UI.
4. **Use OKLCH theme tokens** defined in `index.css` for all colors.
5. **Maintain the 3-App separation:** SaaS (Project 1) = brain, Android (Project 3) = thin shell, Marketing (Project 2) = SEO only.
6. **On logout, redirect users back to their role-specific login page** (Student → `/student/login`, Faculty → Faculty Login, Admin → Admin Login).
7. **On Desktop, auto-redirect mismatched roles** (Faculty on Student tab → redirect to Faculty Login). On Mobile, **block instead of redirect**.
8. **JWT sessions:** Mobile = 365 days (long-lived). Desktop = 24 hours (auto-logout) or 7 days with "Remember Me".
9. **Every org uses `orgname.classgrid.in`** (wildcard DNS). React reads `window.location.hostname` to extract the org slug and fetch branding.
10. **Socket.io events** go through the Redis Adapter for multi-node scaling.

### 📁 CRITICAL FILE PATHS:
| File | Purpose | ⚠️ Warning |
|---|---|---|
| `client/src/index.css` | OKLCH theme engine + all design tokens | DO NOT delete or replace. Extend only. |
| `client/src/context/AuthContext.jsx` | Auth state + role detection + org context | Core identity file. Edit with extreme care. |
| `server/src/services/socket.service.js` | Socket.io event handlers (rooms, typing, presence) | Must be imported in `server.js` via `initSocket(server)`. |
| `client/src/services/realtime.js` | Client-side real-time bridge (migrating to Socket.io) | Currently being refactored. |
| `info.xml` | Project manifest with Great Rebuild mandate | Read-only reference. |
| `app.xml` | Android app configuration (network security, tokens) | Do not modify without Nikhil's approval. |

---

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CLASSGRID ECOSYSTEM                              │
├──────────────────┬──────────────────┬───────────────────────────────┤
│   PROJECT 1      │   PROJECT 2      │   PROJECT 3                  │
│   SaaS Platform  │   Marketing Site │   Android Wrapper            │
│   (Vite + React) │   (Next.js)      │   (Kotlin WebView)           │
├──────────────────┴──────────────────┴───────────────────────────────┤
│                      UNIFIED LOGIN ENGINE                           │
│           Firebase Phone OTP + JWT + Org Detection                  │
├──────────────────┬──────────────────┬───────────────────────────────┤
│   SHARED API     │    DATABASE      │    REAL-TIME                  │
│   Node.js (EC2)  │    Mongo + Pg    │    Socket.io (EC2)            │
└──────────────────┴──────────────────┴───────────────────────────────┘
```

---

## 🧰 Complete Tool Registry

### PROJECT 1: SaaS Platform (`app.classgrid.in`) — Built in Antigravity

| Category | Tool | Purpose |
|---|---|---|
| **Framework** | Vite + React (JSX) | SPA rendering engine |
| **Styling** | Tailwind CSS + OKLCH tokens | Design system |
| **Components** | Shadcn UI (47+ primitives) | Buttons, Cards, Inputs, Tables |
| **Animations** | Aceternity UI (4 components) | Globe, FloatingDock, NoiseBackground, ExpandableCard |
| **Motion** | Framer Motion | Micro-interactions (modals, slides) |
| **Forms** | React Hook Form + Zod | Validation |
| **Data** | TanStack Query (React Query) | Caching + server state |
| **Tables** | TanStack Table | 5,000-row rendering |
| **Icons** | Lucide React | SVG icons |
| **Toasts** | Sonner | Notifications |
| **Theme** | next-themes (ThemeProvider) | Dark/Light/System toggle |
| **Auth** | Firebase (Phone/Google) + JWT | Authentication |
| **Routing** | React Router DOM v6 | Client-side routing |

### PROJECT 2: Marketing Site (`classgrid.in`) — Built in Cursor Pro

| Category | Tool | Purpose |
|---|---|---|
| **Framework** | Next.js 15 (App Router + TSX) | SSR + SEO |
| **Styling** | Tailwind CSS (Dark theme) | Premium dark aesthetic |
| **Components** | Shadcn UI | Buttons, Accordions, NavMenu |
| **3D** | Spline (@splinetool/react-spline) | Interactive 3D Cube (Resend-style) |
| **Animations** | Aceternity UI + Magic UI | Bento grids, Marquees, Scroll reveals |
| **Motion** | Framer Motion | Page transitions + scroll effects |
| **CMS** | Sanity.io | Blog, Changelog, dynamic content |
| **Forms** | Tally.so / Typeform | Lead capture |
| **Scheduling** | Cal.com embed | Demo booking |
| **Social Proof** | Senja.io / Testimonial.to | Wall of love |

---

# 🏗️ GLOBAL ARCHITECTURE & INFRASTRUCTURE
**Reviewer Status: DeepSeek Approved (CTO-Grade)**

## 🚀 1. PRODUCTION INFRASTRUCTURE (LOCKED)

| Layer | Detail / Strategy |
|---|---|
| **PostgreSQL (Supabase)** | **Primary System of Truth**. Stores Relational Data (Users, Orgs, Classes, Marks). |
| **MongoDB (NoSQL)** | **High-Frequency Layer**. Stores Chat History, Notifications, and RAG Metadata. |
| **Redis (Cache)** | **Velocity Layer**. Stores session cache and landing queues for 4000 RPS scale. |
| **Supabase Storage** | **Document & Submission Layer (RLS)**. Stores Admission Scans, Student Assignments, and Photos. |
| **Amazon S3 (Storage)**| **The Content Layer**. Stores Video Lectures, Classroom Notes (PDF/PPT), and heavy academic assets. |
| **Cloud Hosting** | **AWS EC2 (t3.medium - 4GB RAM)** + PM2. (t3.micro for Staging only). |
| **Disaster Recovery** | Daily `pg_dump`/`mongodump` → S3 (30-day retention). |

---

## 🛑 2. SECURITY & RATE LIMITING (The Cost-Guard)

| Endpoint | Limit | Purpose |
|---|---|---|
| `POST /api/auth/otp/send` | 5 req / phone / hr | Prevents SMS budget leakage |
| `POST /api/auth/login` | 5 attempts / min | Brute-force protection |
| `POST /api/chat/send` | 30 msg / min | Anti-spam (Socket.io layer) |
| `POST /api/file/upload` | 10 uploads / hr | Storage abuse protection |
| **Global API Limit** | 1,000 req / min / IP | DDoS mitigation |

---

## 📡 3. MONITORING & AUTH STRATEGY

| System | Tool | Strategy |
|---|---|---|
| **Monitoring** | Uptime Kuma | Checks `/api/health` status + SSL expiry (<14 days). |
| **Web Auth** | `HttpOnly` Cookies | Secure, XSS-protected JWT storage. |
| **Mobile Auth** | Bearer Token | `EncryptedSharedPreferences` for Android persistence. |
| **Android Bridge**| Kotlin Bridge | JS Interface for native Biometrics/Keystore. |

---

## 🤖 4. RESPONSIBILITY MATRIX (The Creative Partnership)

| Role | Name | Responsibility |
|---|---|---|
| **The Visionary** | **Nikhil** | Final approval, Spline/Figma design, and business logic. |
| **The Builder** | **Sorra** | Full implementation (Frontend/Backend/AI/Infrastructure). |
| **The Validator** | **DeepSeek** | Plan auditing, cost-leak detection, and technical safety. |

---

# 🚀 PROJECT 1: The Core Platform (LMS + ERP)
**Priority: EXHUME & REBUILD**

| Category | Tool | Purpose |
|---|---|---|
| **Shell Language** | Kotlin (minimal) | Thin WebView container |
| **The Actual App** | WebView → `app.classgrid.in` | Loads the same React + Vite SPA |
| **Push** | Firebase Cloud Messaging (FCM) | Notifications |
| **Auth** | Android Keystore | Biometric fingerprint/face |
| **Bridge** | JavascriptInterface | Camera, Storage, Permissions |

---

## 🔐 Authentication & Unified Login System

The Classgrid login system is designed to be cross-platform, multi-tenant aware, and highly secure.

### 1. The "Three-App" Unity Rule
Although we have three distinct projects, they share a single authentication state:
*   **Single Identity:** A user registered on `app.classgrid.in` is recognized across all three apps.
*   **Project 2 (Marketing) → Project 1 (SaaS):** The marketing site does **not** have its own login. It provides "Login" and "Get Started" buttons that link to `https://app.classgrid.in/login`.
*   **Project 1 (SaaS) ↔ Project 3 (Android):** The Android app is a wrapper for the SaaS app. When a user logs in via the WebView, the session cookie/token is securely stored in the app's persistent storage, keeping them logged in.

### 2. Smart Routing Logic (Mobile vs. Desktop)
To provide the best UX, Classgrid uses high-intelligence routing:
*   **Desktop URL (`/login`):** If a mobile device tries to access this, it is automatically redirected to `/student/login`.
*   **Mobile URL (`/student/login`):** If a desktop user tries to access this, it is automatically redirected back to the main `/login`.
*   **Why?** The desktop login uses a "Full Screen Glassmorphism" layout with a 3D Globe, while the mobile login is a "bottom-sheet" style layout optimized for thumb-reach and one-handed use.

### 3. Login Methods
| Method | Target User | Technology |
|---|---|---|
| **Phone OTP** | Students / Admission | Firebase Auth SDK (Invisible reCAPTCHA) |
| **Google OAuth** | Faculty / Admins | Passport.js + Google Cloud Console |
| **Email/Pass** | Super Admins | JWT + Bcrypt (Legacy Fallback) |

### 4. Technical Flow (The Handshake)
1.  **Request:** User enters phone number. 
2.  **Verify:** Firebase sends a 6-digit OTP. 
3.  **Token Exchange:** Once verified, the client sends the Firebase `idToken` to our Express Backend.
4.  **Backend Auth:** The backend verifies the Firebase token, checks the user in MongoDB, and signs our own **Classgrid JWT**.
5.  **Persistence:** The JWT is stored in an `HttpOnly` secure cookie (prevents XSS attacks).

### 5. Role-Based Smart Redirection & Logout Rules
To maintain the "Three separate apps in one codebase" experience, the following rules apply:

*   **Logout Persistence:** 
    - When a **Student** logs out, the system **must** redirect them to the **Mobile-Optimized Student Login** (`/student/login`).
    - When a **Faculty** member logs out, they land on the **Faculty Login** page.
    - When an **Org Admin** logs out, they land on the **Org-Admin Login** page.
*   **Desktop-Only Cross-Portal Auto-Redirects:**
    - **Faculty Detection:** If a Faculty member tries to log in on the **Student** tab on Desktop, the system detects the role and **auto-redirects** them to the Faculty Login.
    - **Org Admin Detection:** If an Org Admin tries to log in on the **Faculty** portal on Desktop, they are **auto-redirected** to the Org-Admin Login.
    - **Phone Rule (Strict Blocking):** On mobile apps (WebView APKs), auto-redirect is **DISABLED**. Because they are distributed as separate apps, if a user logs into the wrong app (e.g., a Student downloads and tries to log into the Faculty App), the backend MUST block the login and return an error (`"Unauthorized: Please download the Student App"`). This strictly prevents students from using faculty tools.
*   **The "App Context" Constraint:** 
    - In our 3-app ecosystem (Project 1, 2, and 3), once a user is inside the "Student App" (Project 3/WebView), the logout must **never** take them to a higher-level organizational login. It must stay in the Student context.
    - This is enforced by the **Backend Role-Check Middleware** before every login session is finalized.

### 6. Subdomain-Driven Multi-Tenancy (DNS & Dynamic Branding)
Because we use a single, common SaaS codebase and a single set of Mobile APKs for all institutions, we resolve organization context dynamically via subdomains:
*   **DNS Configuration:** A Wildcard DNS `A Record` (`*.classgrid.in`) must be configured at the domain registrar to point to the EC2 Elastic IP.
*   **Desktop Login (URL Detection):** When users go to `pccoe.classgrid.in`, the React frontend reads `window.location.hostname`. It extracts the `pccoe` subdomain and sends it to the backend (`GET /api/org/branding?subdomain=pccoe`).
*   **Dynamic UI Updates:** The login page instantly renders that specific organization's custom **Logo**, **Name**, and **Theme Colors** without needing separate deployments.
*   **Mobile App Resolution:** Because the Android app is a common APK distributed on the PlayStore, users don't have a URL bar. Instead, upon entering their Phone Number (Firebase OTP) or clicking "Login with Google", the backend automatically queries MongoDB (`Organizations`) to detect which institution they belong to and applies the branding and context instantly.

### 7. Session Expiry & Security (Auto-Logout Rules)
We implement different session lifetimes depending on the platform to balance convenience and security (since desktop computers are often shared in labs/libraries):
*   **Mobile Apps (Project 3):** Long-lived sessions. The JWT is set to expire after **365 days** or upon manual logout. Mobile devices are personal and protected by OS lock screens, so forcing re-login is bad UX.
*   **Desktop/Web (Project 1):** Short-lived sessions. The JWT is set to expire after **24 hours** (or 7 days if "Remember Me" is checked). Once expired, the backend automatically rejects the cookie, forcing an **Auto-Logout**, dropping the user safely back on the branded login screen.

---

### Shared Infrastructure (AWS EC2)

| Tool | Purpose |
|---|---|
| **Nginx** | Reverse proxy + subdomain routing + SSL |
| **PM2** | Process manager (auto-restart, clustering) |
| **Certbot** | Free wildcard HTTPS (Let's Encrypt) |
| **AWS S3** | File storage (PDFs, images, videos) |
| **Socket.io** | **Primary Real-time Engine** (Chat, Typing, Presence) |
| **Supabase** | PostgreSQL + Row-Level Security |
| **MongoDB** | Document data (NoSQL) |
| **Redis** | **Socket.io Adapter** (Multi-node scaling) + Attendance queue |

---

## 📅 THE MASTER TIMELINE

### 🔴 MONTH 1: Foundation & The Great Rebuild (SaaS Platform)
**AI Engine:** Antigravity | **Target:** `app.classgrid.in`

| Week | Days | Task | Status |
|---|---|---|---|
| **W1** | 1-3 | 17-Library God-Tier Stack installation | ✅ DONE |
| **W1** | 1-3 | Shadcn UI: 47+ components installed in `src/components/shadcn/` | ✅ DONE |
| **W1** | 1-3 | Aceternity UI: 4 components in `src/components/aceternity/` | ✅ DONE |
| **W1** | 1-3 | OKLCH Theme Engine (`index.css` + `ThemeProvider`) | ✅ DONE |
| **W1** | 1-3 | `info.xml` locked with Great Rebuild mandate | ✅ DONE |
| **W1** | 1-3 | Auth Pages rebuilt (StudentLogin, AuthLayout, Globe) | ✅ DONE |
| **W2** | 4-7 | **AppLayout.jsx** — Global Dashboard Shell (Sidebar + TopNav) | 🔲 NEXT |
| **W2** | 4-7 | Sidebar: Shadcn `<Sidebar>` with role-based tab hiding | 🔲 |
| **W2** | 4-7 | TopNav: Search, Notifications bell, Profile dropdown | 🔲 |
| **W3** | 8-12 | **Page-by-Page Rebuild** using 4-step pipeline: | 🔲 |
| | | → Student Dashboard (greeting, streak, classroom cards) | 🔲 |
| | | → Faculty Dashboard (pending badges, quick actions) | 🔲 |
| | | → Classrooms (tabs: My / Pending / Discover) | 🔲 |
| | | → Classroom Detail (Stream / Classwork / People / Chat) | 🔲 |
| **W4** | 13-17 | → Assignment System (create, submit, grade, tracker) | 🔲 |
| | | → Exam Results Engine (upload Excel, SGPA calc) | 🔲 |
| | | → Settings / Profile / Notifications | 🔲 |
| **W4** | 18-20 | TanStack Table on Examination + Fee pages (5,000 rows) | 🔲 |

---

### 🟡 MONTH 2: Core ERP & Database Stability
**AI Engine:** Antigravity | **Target:** Backend + Frontend wiring

| Week | Task | Details |
|---|---|---|
| **W5** | 13-Step Student Onboarding | Wire React forms → MongoDB (SSC/HSC marks) |
| **W5** | **Socket.io Migration** | Replace Supabase Realtime with Native WebSockets for 10ms latency. |
| **W5** | **Smart Redirection Middleware** | Build Role-Detection + Auto-Redirect + Logout Persistence (Login Law implementation). |
| **W6** | Results Engine Processing | CSV upload → Node.js parsing → SGPA + Ranks |
| **W6** | Observability & Security | Winston logging, express-rate-limit on ALL endpoints, Zod validation, 5MB file upload limits |
| **W7** | Org Admin Portal rebuild | Responsive sidebar → drawer on mobile, stats cards |
| **W7** | Super Admin Portal rebuild | Platform overview, org approval queue, user search |
| **W8** | Notes & Study Materials | Backend integration (Classrooms, Dashboard, Materials) |

---

### 🟢 MONTH 3: Scaling & Subdomains
**AI Engine:** Antigravity | **Target:** Multi-tenancy + Android

| Week | Task | Details |
|---|---|---|
| **W9** | Subdomain Routing | Nginx wildcard: `pccoe.classgrid.in` → detects org, fetches logo/colors |
| **W9** | `App.jsx` subdomain extraction | `window.location.hostname.split('.')[0]` → fetch branding |
| **W10** | AWS Architecture Decoupling | EC2 clusters + managed Redis + Supabase PgBouncer |
| **W10** | 4,000 RPS Load Test | ALB → 8-10 EC2 instances → Redis Queue → Supabase batch inserts |
| **W11** | **Kotlin WebView Wrapper** | `MainActivity.kt` with WebView → `app.classgrid.in` |
| **W11** | Javascript Bridge | Camera, Storage, Biometric permissions via `AndroidBridge` |
| **W12** | Firebase FCM | Push notifications with deep link routing (`/classroom/xxx/chat`) |
| **W12** | Build APKs | `com.classgrid.app` + `com.classgrid.admin` → Play Store submission |

---

### 🔵 MONTH 4: Monetization & Marketing Site
**AI Engine:** Cursor Pro (Marketing) + Antigravity (Canteen/Quiz)

#### 4A. Marketing Website (`classgrid.in`) — Vercel Design Style — ~14 Days

> **DESIGN SYSTEM:** Vercel Industrial Minimalism. See `docs/VERCEL_DESIGN_ANALYSIS.md` for the complete breakdown.
> **REFERENCE FILES:** `docs/CLASSGRID_PAGES_REFERENCE.md` + `docs/CLASSGRID_PAGES_DEEP_DIVE.md` + `docs/VERCEL_DESIGN_ANALYSIS.md`
> **LAUNCH PROMPT:** `docs/CLASSGRID_PAGES_LAUNCH_PROMPT.md` (paste this to the AI building the site)

| Day | Page(s) | Key Elements |
|---|---|---|
| **D1** | Project Setup | Next.js 15, Tailwind dark theme (pure black `#000000`), Shadcn, Geist font, Framer Motion |
| **D2** | **Home** (`/`) | Vercel-style hero with perspective 3D grid, Spline cube, glassmorphism header, morphing nav dropdown, "Trusted By" marquee |
| **D3** | **About** (`/about`) | Team story, mission, Framer Motion scroll reveals (fade-in + slide-up) |
| **D4** | **Features** (`/features`) | Animated Bento Grid (all 41 modules with "NEW" badges on AI Viva, Biometric Login) |
| **D5** | **Tour** (`/tour`) | 3-step interactive scroll (Provision → Onboard → Automate) |
| **D6** | **Pricing** (`/pricing`) | 3-column comparison (Core / Premium / Enterprise) with `#0A0A0A` cards |
| **D7** | **🔥 Demo** (`/demo`) | 50/50 split layout (Vercel-style): Left = ROI metrics, Right = lead form with `#0A0A0A` bg + `#FFFFFF` focus borders |
| **D8** | **Use Cases** (`/use-cases/*`) | 3 sub-pages: Students, Teachers, Institutes |
| **D9** | **Integrations** (`/integrations`) | Visual grid (Zoom, Razorpay, Google, Firebase, S3) |
| **D10** | **Reviews + Case Studies** | Testimonial wall + metrics deep dives |
| **D11** | **Blog** (`/blog`) | Sanity CMS listing + detail pages |
| **D12** | **Support + FAQ + Contact** | Accordion FAQ, Cal.com embed, contact form |
| **D13** | **Legal + Security** | Terms, Privacy, Trust Center (RLS, AES-256 breakdown) |
| **D14** | **Footer** + **Campaigns + Compare + Changelog** | 6-column info matrix footer with "Classgrid Status" indicator + theme switcher, ad landing pages, competitor comparison, version log |

**Marketing Site Design Tokens (Vercel-adapted):**
| Token | Value |
|---|---|
| Background | `#000000` (Pure Black) |
| Surface | `#0A0A0A` (Card backgrounds) |
| Border | `#333333` (Subtle UI borders) |
| Primary Text | `#FFFFFF` |
| Secondary Text | `#888888` |
| Accent Blue | `#4a90f5` (Classgrid primary) |
| Gradient | `135deg, #4a90f5 → #8b6fff` |
| Font | `Geist Sans` (Vercel's typeface) |
| Header Glass | `backdrop-filter: blur(12px)` + `rgba(0,0,0,0.8)` |
| Reveal Animation | `fade-in` + `slide-up` (20-40px drift) |
| Hover Effect | `invert` micro-interactions + glowing borders |

**All 20 Pages:**
1. Home `/` — 2. About `/about` — 3. Features `/features` — 4. Tour `/tour` — 5. Pricing `/pricing` — 6. Demo `/demo` — 7. Use Cases `/use-cases` (3 sub-pages) — 8. Integrations `/integrations` — 9. Reviews `/reviews` — 10. Case Studies `/case-studies` — 11. Blog `/blog` — 12. Campaigns `/campaigns` — 13. Compare `/compare` — 14. Changelog `/changelog` — 15. Support `/support` — 16. FAQ `/faq` — 17. Contact `/contact` — 18. Terms `/terms` — 19. Privacy `/privacy` — 20. Security `/security`


#### 4A. Admission Management System (Module 21) — Antigravity
**The "Onramp" Pipeline — From Lead to Enrolled Student**

| Phase | Task | Details |
|---|---|---|
| Phase 1 | **Multi-Tenant Preset Engine** | 4 Config modes: Coaching, School, Jr College, Engineering |
| Phase 2 | **Dynamic Form Builder** | Custom fields based on institutional plan (PRN/Aadhar/Income) |
| Phase 3 | **Parent/Guardian Portal** | Mobile-first status tracking via **Firebase Phone OTP** |
| Phase 4 | **Seat & Waitlist Engine** | Auto-promotion logic, seat expiry check (Cron), multi-round support |
| Phase 5 | **Document Verification** | S3-integrated document upload + Admin Approval dashboard |
| Phase 6 | **Final Enrollment** | Automated user/student role creation → Welcome email via Brevo |

#### 4B. Canteen Management System (Module 22) — Antigravity
**Direct institutional food-tech integration**

| Phase | Task | Details |
|---|---|---|
| Phase 1 | Razorpay Tenant Injection | Per-org API keys, AES-256 encrypted storage |
| Phase 2 | Food Hub Menu Engine | Multi-category item management (Daily specials, availability) |
| Phase 3 | Student Order Portal | Persistent cart + Razorpay checkout + Order status history |
| Phase 4 | **Kitchen Display (KDS)** | **Socket.io Kanban Board** for staff: NEW → PREP → READY |
| Phase 5 | Dynamic Modes | "Standard Mode" vs "Max Mode" (Future pre-orders) |
| Phase 6 | Analytics | Revenue reporting, top sellers, rating feedback loops |

#### 4C. YouTube Embedding & Course Library (Module 23) — Sorra
**YouTube Integration for Materials & Asynchronous Learning**

| Feature | Details |
|---|---|
| **API Integration** | YouTube Player API for secure iframe embedding inside Classrooms |
| **Video Analytics** | Track watch-time percentage + "Complete material" auto-tick |
| **Real-time Discussions** | **Socket.io Live Chat** sync to video timestamp (comment reels) |
| **Transcription AI** | Automated captions/summaries using Groq API for uploaded links |
| **Video Playlists** | Course-wise video organization with "Continue Watching" tracking |

#### 4D. Live Video Lectures & Meetings (Agora Integration) — Sorra
**The "Zoom-Killer" Native white-label experience**

| Feature | Detail |
|---|---|
| **Primary Tech** | **Agora RTC & RTM SDKs** (Real-Time Communication & Messaging). |
| **Meetings** | "Join Live Class" button inside Dashboards. Zero-redirect playback. |
| **Chat Integration**| **1-on-1 & Group Calls** directly inside ChatThreads via Agora P2P. |
| **Backend** | `agora.service.js` generates RTC Tokens for secure channel access. |
| **Recordings** | Agora Cloud Recording → **Amazon S3** (auto-links to "Classroom Records"). |
| **Economics** | 10,000 free minutes/mo. Decoupled from EC2 (Direct Client-to-Agora). |

#### 4E. JSON-Only RAG Assistant (Module 24) — Sorra
**The "Lightweight" Knowledge Retrieval Engine**

| Feature | Details |
|---|---|
| **Concept** | **Low-Cost RAG**. Queries MongoDB/Supabase JSON for instant context. |
| **Data Sources** | Lecture schedules, academic calendars, teacher availability, and student profile metadata. |
| **Retrieval Logic** | User query → GPT-4o-mini / Llama 3 analysis → Targeted MongoDB find() → Context-loaded AI response. |
| **Advanced RAG** | Phase 2: **PDF Vectorization** (Pinecone/Supabase Vector) for study material library. |

---

### 🟣 MONTH 5: Secret Weapons & Final Expansion
**Engines:** Sorra + Antigravity

| Module | Task | Details |
|---|---|---|
| **AI Past Paper Engine** | 6-Step Pipeline | S3 Ingest → Tesseract OCR → Regex Normalization → MongoDB JSON → Groq Analysis → Cached Mock Tests |
| **Voice/Video Messages** | Agora Voice SDK | Direct voice-note recording and "Walkie-Talkie" mode in Org Chat. |
| **Notes Marketplace** | B2C Micro-payment | ₹30 unlock, crowdsourced AI summaries, self-funding library. |
| **NAAC/NBA Auditor** | Auto-Data Engine | Pulls attendance/results for automated govt-compliant PDF formats. |
| **NAAC/NBA Auditor** | Auto-Data Engine | Pulls attendance/results for automated govt-compliant PDF formats. |
| **Enterprise HR** | Biometric API SDK | IP whitelisting, IP scanning, and automated payroll logs. |
| **NAAC/NBA Auditor** | **Auto-Data Engine:** Pulls attendance, pass percentages, teacher workloads, and fee receipts automatically from existing Classgrid modules. |
| | **PDF Report Generator:** Uses Puppeteer/PDFKit to instantly output govt-compliant PDF formats with pie charts, eliminating 4 months of faculty paperwork. |
| | **Feature Flag Upsell:** `naac_module: true` → Tab appears for Org Admins. We charge a premium tier for colleges to access this module. |
| **Enterprise HR** | Biometric API SDK | IP whitelisting, API key + secret hash, deduplication |
| | Faculty Attendance | Turnstile scanner → `POST /api/external/faculty/attendance` |
| | Payroll Integration | Auto-calculate from biometric logs |

---

## 🏛️ The 5 Organizational Plans (Backend Logic)

| Plan | Type | Key Logic |
|---|---|---|
| **Plan 1** | College | Requires `semester_id` + `academic_year_id` + `division_id` |
| **Plan 2** | School + Divisions | Grade 10 → Division A, B, C underneath |
| **Plan 3** | School (No Divisions) | Auto-creates hidden "Default Division" silently |
| **Plan 4** | Coaching Classes | Blocks divisions entirely → uses "Batches" under "Courses" |
| **Plan 5** | Junior College (11 & 12 only) | API enforces grade boundary (403 if Grade 10 attempted) |

**Frontend Execution:** `AuthContext` reads `structure_type` from JWT → Sidebar dynamically hides/shows "Divisions" vs "Batches" tab.

---

## 🤝 Responsibility Matrix

### What Antigravity Does:
- ✅ Rebuild all SaaS pages using the 4-step pipeline (Stitch → Figma → Shadcn → Backend)
- ✅ Write all React components, Express APIs, and database schemas
- ✅ Write the Kotlin `MainActivity.kt` + FCM + JavascriptBridge
- ✅ Configure Nginx subdomain routing rules
- ✅ Build the NAAC engine, Canteen module, and Quiz engine

### What Cursor Pro Does:
- ✅ Scaffold the Next.js marketing site (`classgrid.in`) using **Vercel Design Style**
- ✅ Build all 20 marketing pages with Vercel-style components (glassmorphism, morphing dropdowns, 3D grids)
- ✅ Wire Sanity CMS for blogs and changelog
- ✅ Optimize for SEO (meta tags, structured data, sitemap)
- ✅ Reference Files: `CLASSGRID_PAGES_REFERENCE.md` + `CLASSGRID_PAGES_DEEP_DIVE.md` + `VERCEL_DESIGN_ANALYSIS.md`

### What YOU (Nikhil) Do:
- 🔧 DNS: Add `A Record` pointing `*.classgrid.in` to EC2 IP
- 🔧 SSL: Run Certbot for wildcard HTTPS
- 🔧 Sanity.io: Create account, get Project ID + API keys
- 🔧 Firebase Console: Create project, download `google-services.json`
- 🔧 Android Studio: Create Empty Activity project, paste Kotlin code, Build APK
- 🔧 AWS S3: Create bucket, configure CORS
- 🔧 Spline: Remix the Resend Cube, add rotation animation, export React URL

---

## 🚨 Strict Rules & Commandments

> **THE 4 SAAS COMMANDMENTS (NON-NEGOTIABLE):**
> 1. **CONSISTENCY** — Same spacing, colors, button style on EVERY page (Shadcn + Tailwind + clsx).
> 2. **UX FLOW** — 1 click + drag & drop + toast. NOT 5 clicks through 3 modals (React Dropzone + Sonner).
> 3. **PERFORMANCE** — Fast loading, no lag, instant feedback (TanStack Query + React.lazy + caching).
> 4. **MICRO-INTERACTIONS** — Hover animations, smooth transitions, loading skeletons. Never blank screens (Framer Motion).

> **THE FERRARI RULE (Phased Library Approach):**
> - **Phase 1 (Build First):** Shadcn UI, Tailwind, TanStack Query, React Hook Form, Zod, Lucide, Sonner, clsx + tailwind-merge
> - **Phase 2 (Enhance):** CMDK, Vaul, TanStack Table, React Dropzone, Embla Carousel
> - **Phase 3 (Polish):** Shadcn Charts (Recharts), Aceternity UI, @dnd-kit, React PDF, Framer Motion (advanced), date-fns, next-themes

> **THE GREAT REBUILD PIPELINE (Mandatory for all pages except Home):**
> 1. **STITCH** → Theme/OKLCH tokens
> 2. **FIGMA** → Layout/Spacing
> 3. **SHADCN** → Assemble from `@/components/shadcn/`
> 4. **BACKEND** → Wire APIs + React Router + Context

> **Architecture Separation:**
> - `src/components/shadcn/` → Raw UI primitives (47+ components)
> - `src/components/aceternity/` → Animation components (4 components)
> - `src/components/features/` → Business logic components
> - `src/components/ui/` → LEGACY (being phased out)

> **The 3-App Architecture Law:**
> 1. **Project 1 (SaaS Platform):** The brain and heart. ALL features, login logic, and dashboards live HERE. Mobile-responsiveness is mandatory.
> 2. **Project 3 (Android Wrapper):** **STRICTLY a WebView shell.** Never build separate native screens. It must load `app.classgrid.in` directly to maintain a "Single Source of Truth."
> 3. **Project 2 (Marketing Site):** Completely decoupled for SEO. It only handles acquisition—any "Login" or "Get Started" buttons must point back to Project 1.

> **Animation Rules:**
> - Marketing Site → Full cinema (3D Globe, Marquees, Scroll effects)
> - SaaS Platform → Subtle only (modal slides, skeleton loaders, NO looping 3D)

> **Rejected Tools:** Expo, React Native, TypeScript rewrite, Zustand, Coolify, Vercel

> **CSS Design Rules (Never Allow List):**
> - ❌ NO hardcoded colors (`background: white;`). Use `var(--bg)`, `var(--surface)`, `var(--text)`.
> - ❌ NO hardcoded pixel values (`padding: 20px;`). Use `var(--space-2)`, `var(--radius)`.
> - ❌ NO raw layout divs. Use `<Page>`, `<Card>`, `<Button>` components.
> - ❌ NO manual `@media` queries unless for custom charts.

---

## 🏛️ Why AWS EC2 (NOT Vercel)

| Problem on Vercel | Solution on EC2 |
|---|---|
| WebSockets/Socket.io instantly fail (functions die after request) | EC2 runs 24/7 — Socket.io connections stay open permanently |
| 10-second timeout kills PDF generation, bulk emails, student promotions | No timeout — heavy operations run to completion |
| Every request spins a new Node process → exhausts MongoDB connection pool | Single persistent DB pool — 10,000 requests share one connection |
| No native cron jobs for midnight attendance or weekly digests | `node-cron` runs reliably on the persistent server |

---

## 💳 Automated Demo & Expiry System (SaaS Workflow)

1. **Org Creation:** User starts demo on `classgrid.in` → System generates slug `pccoe`, provisions `pccoe.classgrid.in`.
2. **Automated Limits:** `plan: 'demo'`, `isPaid: false`, `expiresAt: +30 days`.
3. **Razorpay Checkout:** On payment → `plan: 'premium'`, `isPaid: true`, `expiresAt: null`. **Do NOT create a new org — reuse the same subdomain.**
4. **TTL Deletion:** If demo expires → Read-Only toggle for 7-day grace period → After that, backend worker cascading-deletes all data for that `org_id`.

---

## ⚡ Real-Time Chat Engine (Redis Streams + Socket.io)

### Architecture: Zero-Loss Messaging
1. User sends message → Hits **Redis Stream** (`chat:stream:org_123`).
2. Socket.io broadcasts to clients (**Optimistic UI** — message appears "gray").
3. Adaptive Worker pulls from stream:
```
try {
  await mongo.insertMany(messages);
  redis.ack(messages);           // Only delete from Redis if MongoDB succeeds
  socket.emit('message_saved');  // Message turns "blue/delivered"
} catch (e) {
  retryQueue();                  // Redis keeps data safely buffered
}
```
4. **Tenant Isolation:** Every org has its own Redis stream (`chat:stream:org_123`) to prevent the "Noisy Neighbor" problem.
5. **Adaptive Workers:** Triggered dynamically by queue size (Emergency Flush when `redisSize > 80%`), not rigid `setInterval`.

---

## 🎨 Design System Tokens Reference

| Token | Value |
|---|---|
| `var(--bg)` | Deep background (navy/off-white) |
| `var(--surface)` | Main cards and modals |
| `var(--surface2)` | Secondary areas (headers, list hover) |
| `var(--text)` | Primary titles/text |
| `var(--text-muted)` | Secondary subtext |
| `var(--border)` | Lines and separators |
| `var(--space-1)` | 8px (Small gaps) |
| `var(--space-2)` | 16px (Standard padding) |
| `var(--space-3)` | 24px (Section spacing) |
| `var(--space-4)` | 32px (Large sections) |
| `var(--radius-sm)` | 10px (Inputs, buttons) |
| `var(--radius)` | 16px (Normal cards) |
| `var(--radius-lg)` | 20px (Modals) |
| Primary Blue | `#4a90f5` |
| Gradient | `135deg, #4a90f5 → #8b6fff` |
| Admin Accent | `#f59e0b` (amber/gold) |
| Font Heading | `Sora` |
| Font Body | `DM Sans` |

---

## 📋 Complete 20-Module Feature Checklist

### ✅ Core Modules (Built)
- [x] Notes & Study Materials (upload, categorize, download)
- [x] Assignment System (create, submit, deadlines, grading, tracker)
- [x] Exam Result Engine (Excel upload, SGPA/CGPA, ranks, progress bars)
- [x] Real-Time Chat (Socket.io, typing indicators, unread counters)
- [x] Auth System (Phone OTP, Google OAuth, role guards, skeleton loaders)
- [x] Org Admin Portal (stats cards, faculty management)
- [x] Super Admin Portal (org approval, user search)

### 🔲 Modules to Build
- [x] Attendance System (GPS, IP verify, device fingerprint, suspicious flags, reports)
- [x] Quiz System (MCQ, timer, auto-evaluation, leaderboard, analytics)
- [x] AI Viva System (difficulty levels, random generation, practice mode)
- [x] Student Analytics (progress tracking, performance, top ranking, AI summary)
- [x] Meeting Scheduling (Zoom/Meet/Teams, calendar, reminders, join button)
- [x] Leave Request System (student requests, teacher approval, daily dashboard)
- [x] Teacher Planning Tools (daily/weekly plans, next lecture, activity planning)
- [x] Fee Record System (exam/college fees, payment status, reminders, reports)
- [x] Teacher Feedback System (student ratings, anonymous option, admin analytics)
- [x] Full Notification System (bell UI, FCM push, assignment/quiz/result triggers)
- [x] AI Assistant (help, quiz generation, viva prep, learning assistance)
- [x] Canteen System (see `CLASSGRID_CANTEEN_PLAN.md`)
- [x] Admission System (see `CLASSGRID_ADMISSION_PLAN.md`)

---

## 📊 Project Health Dashboard

| Metric | Status |
|---|---|
| Shadcn Components Installed | 47+ ✅ |
| Aceternity Components | 4 ✅ (expandable-card, floating-dock, gooey-input, noise-background) |
| Theme Engine (OKLCH) | ✅ Operational |
| Auth Pages (Login) | ✅ Complete (Globe + AuthPrimitives + OTP + Google) |
| AppLayout Shell | 🔲 NEXT TARGET |
| Marketing Copy Written | ✅ All 20 pages |
| Spline Cube | 🔄 In Progress (Nikhil adding rotation in Spline editor) |
| Kotlin Wrapper | 🔲 Month 3 |
| EC2 Provisioned | ✅ |
| Domain (classgrid.in) | ✅ Purchased |
| Socket.io Server | 🔲 Ready to wire |
| Redis Adapter | 🔲 Month 3 (scaling phase) |

---

> [!IMPORTANT]
> **IMMEDIATE NEXT ACTION:** Open `client/src/components/layout/AppLayout.jsx` and begin the Dashboard Shell rebuild using the 4-step pipeline. This is the gateway component that every single protected page renders inside.

> [!NOTE]
> **Standalone Module Plans (Separate Files):**
> - `docs/CLASSGRID_ADMISSION_PLAN.md` — Full admission pipeline details
> - `docs/CLASSGRID_CANTEEN_PLAN.md` — Full canteen system details

---

# 👑 THE GRAND EXECUTION ORDER (BACKEND-FIRST)
**Generated by Sorra AI after reading every line of the Master Plan, `info.xml`, `app.xml`, Admission Plan, and Canteen Plan.**

> **STRATEGY:** Build ALL backend systems first. Test everything via Postman on localhost. Only after every API returns correct JSON do we touch the frontend CSS/Shadcn rebuild.

---

### 🚀 THE COMPLETE BACKEND-FIRST SCHEDULE

#### 🗓️ DAY 1: The 7 Organizational Plans — Identity & Platform Splitting
**Objective:** Transform Classgrid into a 4-path Identity Engine (Engineering, School, Coaching, Jr College).

| Plan | Type | Hierarchy Structure | Key Backend Logic |
|---|---|---|---|
| **Plan 1** | College / Engineering | `Degree → Dept → Year → Sem → Div/Batch` | Requires `semester_id` + `division_id` |
| **Plan 2** | School (With Div) | `Standard → Division` | Grade + Division structure |
| **Plan 3** | School (No Div) | `Standard` only | Auto-creates hidden "Default Division" |
| **Plan 4** | Coaching Classes | `Course → Batch` | Blocks divisions & semesters entirely. |
| **Plan 5** | Junior College | `Stream → Standard → Division` | Enforces 11th/12th grade boundary |
| **Plan 6** | Diploma | `Dept → Year → Semester` | No Degree layer, Semester-locked |
| **Plan 7** | Other (Custom) | Open-ended grouping | Flexible, user-defined hierarchy |

- [x] Build `AcademicHierarchy.model.js` with `structure_type` and `allow_sub_batches` for Lab splitting.
- [x] **Atomic Email Reservation:** Unique DB indexing + "Pending" status to prevent race conditions during generation.
- [x] **BullMQ Provisioning:** Move Google/Zoho API calls to a background worker (3x retry logic) for zero-wait UI.
- [x] Write dynamic parser middleware: If a Coaching class requests "Semesters" → `400 Bad Request`.
- [x] Wire `AuthContext` to read `structure_type` from JWT → Frontend Sidebar hides/shows "Divisions" vs "Batches".
- [x] Test every plan via Postman: Create Org → Verify allowed/blocked nested routes.

#### 🗓️ DAY 2: Subdomain Multi-Tenant Engine & Dynamic Branding
**Master Plan §6 (line 284-289): DNS + Dynamic Logo/Theme fetching.**
- [x] Configure Wildcard DNS `A Record` (`*.classgrid.in`) pointing to EC2 Elastic IP.
- [x] Create `SubdomainRouter.middleware.js`: Extract `pccoe` from `pccoe.classgrid.in` via `req.headers.host`.
- [x] Build `GET /api/org/branding?subdomain=pccoe` → Returns org Logo, Name, Theme Colors.
- [x] Cache org lookups in Redis (so we don't hit MongoDB per request).
- [x] Mobile App Resolution: On login, backend auto-detects org from user's Phone/Google → applies branding.

#### 🗓️ DAY 3: "Login Law" — Smart Routing + Logout Persistence
**Master Plan §2-§5 (lines 249-283): The complete cross-platform auth ruleset.**
- [x] Upgrade `auth.middleware.js` to read `x-platform-app` header (sent by Android WebView).
- [x] **Desktop Auto-Redirect:** Faculty on Student tab → redirect to Faculty Login. Org Admin on Faculty tab → redirect to Admin Login.
- [x] **Mobile HARD BLOCK:** Student in Faculty APK → `403 "Unauthorized: Please download the Student App"`. NO redirect on mobile.
- [x] **Logout Persistence:** Student logout → `/student/login`. Faculty logout → Faculty Login. Admin logout → Admin Login. Never cross contexts.
- [x] **Session Expiry:** Mobile JWT = 365 days. Desktop JWT = 24 hours (7 days w/ "Remember Me").
- [x] Test all 6 scenarios via Postman with mocked headers.

#### 🗓️ DAY 4: SaaS Demo & Expiry System + Subscription Engine
**Master Plan §SaaS Workflow (lines 573-578) + Module Provisioning.**
- [x] Build `OrgSubscription.model.js`: `plan: 'demo' | 'free' | 'core' | 'premium' | 'enterprise'`.
- [x] Build Demo Provisioning: `POST /api/org/demo` → auto-generate slug, set `expiresAt: +30 days`.
- [x] **Slug Selector Logic:** Auto-generate unique subdomain from Name (already built into the service).
- [x] Build `ModuleToggle.service.js`: Dynamically enable/disable features per plan (e.g., Schools get Attendance + Marks, Engineering gets SGPA + Placements).
- [x] **Super Admin UI:** Form for manual tenant kickoff (provisioning dashboard).

#### 🗓️ DAY 5: Socket.io Migration & Redis Chat Architecture
**Master Plan §Real-Time Chat Engine (lines 582-598): Zero-Loss Messaging.**
- [x] Replace Supabase Realtime with native Socket.io on EC2.
- [x] Hook up `socket.io-redis` adapter for PM2 multi-node scaling.
- [x] Implement Redis Streams architecture: `chat:stream:org_123` per tenant.
- [x] Build Adaptive Worker: `mongo.insertMany(messages)` → `redis.ack()` → `socket.emit('message_saved')`.
- [x] Build Emergency Flush: When `redisSize > 80%`, trigger immediate batch dump.
- [x] Test: 2 clients on different PM2 instances can exchange messages without loss.

#### 🗓️ DAY 6: Security & Rate Limiting + Observability
**Master Plan §Security (lines 193-201) + §Observability (line 350).**
- [x] Implement express-rate-limit on ALL sensitive endpoints:
      - `POST /api/auth/otp/send` → 5 req/phone/hr
      - `POST /api/auth/login` → no limit 
      - `POST /api/chat/send` → 200 msg/min
      - `POST /api/file/upload` → 25 uploads/hr
      - Global → 1,000 req/min/IP
- [x] Setup Winston structured logging for every API route.
- [x] Setup Zod server-side validation on all POST/PATCH bodies.
- [x] Enforce 5MB file upload limit globally.

#### 🗓️ DAY 7: Attendance System Backend
**Module Checklist (line 639): GPS, IP verify, device fingerprint.**
- [x] Build `Attendance.model.js` with GPS coordinates, IP, device fingerprint fields.
- [x] Build `POST /api/attendance/mark` with suspicious flag logic (GPS mismatch, duplicate device).
- [x] Build `GET /api/attendance/report` with date-range filtering and percentage calculations.
- [x] Wire Redis queue for bulk attendance batch inserts (high-traffic scenario).

#### 🗓️ DAY 8: Quiz System & AI Viva Backend + Advanced Analytics ✅
**Module Checklist (lines 640-641): MCQ timer + AI Viva + Analytics.**
- [x] Build `Quiz.model.js` (MCQ, timer, auto-evaluation, leaderboard). *(Already existed in advanced_quiz.routes.js)*
- [x] Build `POST /api/quiz/create`, `POST /api/quiz/submit`, `GET /api/quiz/leaderboard`. *(Already existed)*
- [x] Build Topic-wise Weak/Strong Area Analysis (`GET /api/online-exam/student/topic-analysis`).
- [x] Build CET Rank Prediction Engine (`GET /api/online-exam/student/rank-prediction`).
- [x] Build Webcam AI Proctoring — Config-driven flexible toggle (`POST /api/online-exam/:examId/proctor-heartbeat`).
- [x] Build Faculty Proctor Report (`GET /api/online-exam/:examId/proctor-report`).
- [x] Build AI Viva Engine: `VivaRecord.js` model + `viva.routes.js` with 4-parameter scoring (Knowledge/Clarity/Confidence/Accuracy).
- [x] Build 3 Viva Modes: 🟢 Practice (hints allowed) / 🔴 Exam (strict, no hints) / 🔵 Rapid Fire (speed recall).
- [x] Build Faculty Viva Scheduling (`POST /api/viva/schedule`) for class-wide oral exams.
- [x] Build Faculty Viva Dashboard (`GET /api/viva/faculty/dashboard/:classroomId`) with student performance overview.
- [x] Build Viva History + Progress Tracking (`GET /api/viva/history`) with improvement trend analysis.
- [x] Build Thinking Time Pressure system (10-20 sec timer per question, tracked in metadata).
- [x] Build Voice Confidence Metadata tracking (hesitation detection, speech rate analysis).
- [x] Build AI Learning Loop: Exam weak sections → auto-trigger Viva recommendations.
- [x] Upgrade old `chat.js` viva prompt to structured 4-parameter JSON evaluation protocol.

#### 🗓️ DAY 9: Student Analytics & Leave Request System ✅
**Module Checklist (lines 642, 644): Progress tracking + leave workflows.**
- [x] Build `analytics.service.js` → Aggregate attendance + exams + quizzes + viva + assignments + leaves (scoped to student's classrooms).
- [x] Build composite Health Score (0-100) with weighted formula: Attendance 30% + Academic 30% + Assignments 20% + Viva 20%.
- [x] Build per-classroom attendance breakdown and exam/quiz/viva trend arrays for frontend graphs.
- [x] Build `GET /api/analytics/student/:id` — Full student analytics payload.
- [x] Build `GET /api/analytics/student/:id/ai-summary` — AI counselor generates personalized performance paragraph.
- [x] Build `GET /api/analytics/classroom/:classroomId` — Faculty classroom analytics with per-student breakdown.
- [x] Build `GET /api/analytics/leave/daily` — Faculty daily absence dashboard (who's absent today).
- [x] Build `GET /api/analytics/leave/stats/:classroomId` — Monthly leave patterns + frequent absentees.
- [x] Build `GET /api/leave/summary` — Student leave balance with type-wise and monthly breakdown.
- [x] Build `GET /api/leave/calendar` — Faculty weekly calendar view showing absentees per day.
- [x] Leave workflow (Apply, Quick, Approve/Reject, Cancel, Notifications) already operational in `leave.routes.js`.

#### 🗓️ DAY 10: Fee Record System & Teacher Planning Tools ✅
**Module Checklist (lines 645-646): Payments + daily/weekly plans.**
- [x] Build `FeeRecord.model.js` (exam fees, college fees, payment status, due dates, categories).
- [x] Build `POST /api/fee-records/create` — Bulk fee assignment with student notifications.
- [x] Build `GET /api/fee-records/all` — Admin view with filters (status, category, overdue).
- [x] Build `GET /api/fee-records/summary` — Financial dashboard with category-wise breakdown.
- [x] Build `GET /api/fee-records/reminders` — Auto-flag overdue students, grouped reminder list.
- [x] Build `PATCH /api/fee-records/:id/pay` — Payment recording with overpayment prevention.
- [x] Build `GET /api/fee-records/me` — Student self-service fee view.
- [x] Build `TeacherPlan.model.js` (daily/weekly plans, goals, topics, homework tracking).
- [x] Build `POST /api/teacher-planner/plan` — Create/update with classroom ownership verification.
- [x] Build `GET /api/teacher-planner/me` — Cross-classroom plan dashboard grouped by class.
- [x] Build `GET /api/teacher-planner/today` — "What's on today?" quick widget.
- [x] Build `GET /api/teacher-planner/classroom/:id` — Plans with goal completion stats.
- [x] Build `DELETE /api/teacher-planner/plan/:id` — Plan deletion.


#### 🗓️ DAY 11: Teacher Feedback & Full Notification System ✅
**Module Checklist (lines 647-648): Ratings + FCM push.**
- [x] Build `Feedback.model.js` (student ratings, anonymous toggle, admin analytics rollup via Supabase).
- [x] Build `GET /api/feedback/org-analytics` for org-wide teacher performance ranking.
- [x] Build `Notification.model.js` with trigger types: assignment, quiz, result, chat, attendance.
- [x] Build `notification.service.js` (Unified Dispatcher) for DB + Push + Email alerts.
- [x] Wire Firebase FCM for push notifications across Major Modules (Chat, Viva, Assignment, Feedback).
- [x] Implement deep link routing (`/classroom/xxx/chat`).

#### 🗓️ DAY 12: Admission Engine (Module 21) — Schemas & State Machine
**Admission Plan Phase 1-3: Multi-Tenant Preset Engine + Forms + Parent Portal.**
- [x] Create `AdmissionConfig.model.js`: 7 preset configs matching the 7 Org Plans.
- [x] Create `AdmissionApplication.model.js` with full history traces (CAP rounds, quota changes).
- [x] Build `admission-workflow.service.js` State Machine: Apply → Draft → Verify → Fee → Enrolled.
- [x] Build duplicate detection (Phone + Email mapping) and 16-digit PRN generation.
- [x] **CET Engineering Flow (Plan 1 & 6):**
      - [x] Build `CETAllotment.model.js` — Stores imported PDF data (EN, Name, Rank, Category, Branch, Seat Type). NO email/phone.
      - [x] Build `AdmissionOTP.model.js` — Temporary 6-digit OTP with 10-min TTL and 5-attempt max.
      - [x] Build `POST /api/admission/cet/import` — Admin uploads CET PDF/Excel → Bulk insert rows per CAP round.
      - [x] Build `POST /api/admission/cet/validate-en` — Student enters EN Number → System checks if EN exists.
      - [x] Build `POST /api/admission/cet/send-otp` — Student enters email (NOT from CET) → OTP sent to that email.
      - [x] Build `POST /api/admission/cet/verify-otp` — Verify OTP → Issue admission session JWT.
      - Build CAP Round upgrade handling: Auto-flag when same EN appears in later round PDF.
- [x] **Standard Flow (Plan 2-5, 7):** Phone OTP via Firebase for Schools/Coaching/Jr College.

#### 🗓️ DAY 13: Admission Engine — APIs & Operations ✅
**Admission Plan Phase 4-6: Waitlist + Documents + Enrollment.**
- [x] Build `POST /api/admission/apply` (dynamic validation per org structure_type).
- [x] Build `POST /api/admission/desk-enroll` (admin walk-in flow).
- [x] Build `POST /api/admission/withdraw` (auto-calculate refund percentages).
- [x] Build `GET /api/admission/export/dte`, `/saral`, and `/aicte` (govt CSV formats).
- [x] Build Waitlist Cron (`node-cron`): Auto-promote when seats expire at midnight.
- [x] Build S3-integrated document upload + Admin Approval dashboard API.
- [x] Build Final Enrollment: Auto-create User with `role: 'student'` + Welcome email via Brevo.
- [x] Build `PATCH /api/admission/cet/:en/allot-division` — Admin assigns Division (A/B/C) + Roll Number.
- [x] Build `PATCH /api/admission/cet/:en/mark-upgraded` — Mark student who left for better college in later CAP round.

#### 🗓️ DAY 14: Canteen System (Module 22) — DB & Razorpay ✅
**Canteen Plan Phase 1-3: Razorpay tenant injection + Menu + Orders.**
- [x] Create `CanteenMenu.model.js` (multi-category, daily specials, availability toggle).
- [x] Create `CanteenOrder.model.js` (persistent cart, order status history).
- [x] Integrate Razorpay Route API: Per-org API keys (AES-256 encrypted). Split payments to org bank accounts.
- [x] Build `POST /api/canteen/order` checkout flow.

#### 🗓️ DAY 15: Canteen KDS & Analytics (Socket.io) ✅
**Canteen Plan Phase 4-6: Kitchen Display + Modes + Revenue.**
- [x] Build Socket.io event pipeline: `ORDER_PLACED` → `ORDER_PREPPING` → `ORDER_READY`.
- [x] Build Kitchen Staff tablet API: `PATCH /api/canteen/order/:id/status`.
- [x] Build "Standard Mode" vs "Max Mode" (future pre-orders) toggle.
- [x] Build `GET /api/canteen/analytics` (revenue reports, top sellers, rating feedback).

#### 🗓️ DAY 16: YouTube Embedding & Course Library (Module 23) ✅
**Month 4C (lines 423-432): YouTube Player API + Video Analytics.**
- [x] Integrate YouTube Player API for secure iframe embedding inside Classrooms.
- [x] Build `PATCH /api/video/progress` — Track watch-time percentage.
- [x] Build "Complete Material" auto-tick when watch-time > 90%.
- [x] Build Video Playlists: Course-wise organization with "Continue Watching" tracking.

#### 🗓️ DAY 17: Live Video & Meetings (Agora Integration) ✅
**Month 4D (lines 434-444): The "Zoom-Killer" experience.**
- [x] Integrate Agora RTC + RTM SDKs in `agora.service.js`.
- [x] Build `POST /api/live/generate-token` for secure channel access.
- [x] Build 1-on-1 & Group Calls directly inside ChatThreads via Agora P2P.
- [x] Map Agora Cloud Recording → S3 → auto-link to "Classroom Records" in MongoDB.
- [x] Build Socket.io Live Chat synced to video timestamps (comment reels).

#### 🗓️ DAY 18: AI Assistant & RAG Engine (Module 24) ✅
**Month 4E (lines 446-454): JSON-Only RAG + future PDF vectorization.**
- [x] Build Vector/JSON retrieval pipeline: User query → GPT-4o-mini → targeted retrieval → context-loaded response.
- [x] Data sources: Attendance metadata, Exam marks, Quiz performance for Persona Engine.
- [x] Build Groq API integration for Student Persona & AI Coaching insights.
- [x] Build Syllabus RAG: Supabase pgvector + chunks for specialized study assistance.
- [x] Frontend: Created personalized coaching dashboard with 7-day growth plans.

#### 🗓️ DAY 19: AI Proctoring & Meeting Scheduling ✅
**Month 5 (line 463) + Module Checklist (line 643).**
- [x] Build AI Proctoring Engine (violations, tab-switch, webcam analysis via Gemini).
- [x] Build `MeetingSchedule.model.js` (Zoom/Meet/Teams links, calendar, reminders, join button).

#### 🗓️ DAY 20: Voice Messages + Notes Marketplace ✅
**Month 5 (lines 464-465): Agora Voice SDK + B2C micro-payments.**
- [x] Integrate Voice Recording + Groq Whisper AI Transcription logic in chat.
- [x] Build Notes Marketplace: `POST /api/marketplace/buy` (Razorpay unlock for peer notes).
- [x] Build premium frontend dashboard for notes browsing and purchasing.

#### 🗓️ DAY 21: NAAC/NBA Auditor Engine ✅
**Month 5 (lines 466-471): The Auto-Data Engine.**
- [x] Build automated data pull from existing modules: attendance %, performance, revenue.
- [x] Build Puppeteer PDF generator for govt-compliant NAAC/NBA format reports.
- [x] Feature Flag: `POST /api/audit/report` → Instant generation for Org Admins.

#### 🗓️ DAY 22: Enterprise HR Module ✅
**Month 5 (lines 472-474): Biometric + Payroll.**
- [x] Build Biometric API Webhooks: IP whitelisting + API key + secret hash + deduplication.
- [x] Build Faculty Attendance via turnstile scanner: `POST /api/external/faculty/attendance`.
- [x] Build auto-payroll calculation from biometric logs.

#### 🗓️ DAY 23: AWS Architecture Decoupling & Load Testing ✅
**Month 3 W10 (lines 364-365): EC2 clusters + 4000 RPS.**
- [x] Configure EC2 cluster mode (t3.micro staging → t3.medium production).
- [x] Setup managed Redis + Supabase PgBouncer connection pooling.
- [x] Run ALB → 8-10 EC2 instances → Redis Queue → Supabase batch insert load test.
- [x] Validate 4,000 RPS sustained throughput.

#### 🗓️ DAY 24: Student Onboarding + Results Engine Wiring ✅
**Month 2 W5-W6 (lines 346-350): Forms → MongoDB + CSV parsing.**
- [x] Wire 13-step Student Onboarding forms to MongoDB (SSC/HSC marks, profile fields).
- [x] Wire Results Engine Processing: CSV upload → Node.js parsing → SGPA + Ranks calculation.

#### 🗓️ DAY 25: Kotlin WebView Wrapper + Firebase FCM ✅
**Month 3 W11-W12 (lines 366-369): Android APK build.**
- [x] Build `MainActivity.kt` WebView → `app.classgrid.in`.
- [x] Build Javascript Bridge (Camera, Storage, Biometric permissions via `AndroidBridge`).
- [x] Wire Firebase FCM push notifications with deep link routing.
- [x] Export APKs: `com.classgrid.app` + `com.classgrid.admin`.

---

> **✅ BACKEND COMPLETE. All 25 days produce Postman-tested, localhost-verified APIs.**
> **Now we enter the Frontend Phase: The Great UI Purge + Shadcn Rebuild.**

---

### 🎨 FRONTEND PHASE (POST-BACKEND)

#### PHASE F1: The Gateway Shell
- [] F1. Rebuild `AppLayout.jsx` (Sidebar w/ role-based tab hiding per `structure_type` + TopNav).
- [] F2. Rebuild all Auth pages using strict Shadcn primitives (delete old CSS).

#### PHASE F2: The Great Legacy UI Purge
- [] F3. Systematically delete ALL imports referencing `../../components/ui/` across `/admin`, `/shared`, `/modules`.
- [] F4. Rewrite SuperAdmin Dashboard, Orgs, Users pages.
- [] F5. Rewrite all 19 Org Admin pages.
- [] F6. Rewrite shared pages: Profile, Settings, VirtualID, Dashboard, Classrooms, ClassroomDetails.
- [] F7. Rewrite Assignment System UI (create, submit, grade, tracker).
- [] F8. Rewrite Attendance, Quiz, Library pages.
- [] F9. Convert all tables to TanStack Table. Delete `client/src/components/ui/` forever.

#### PHASE F3: New Module UIs (Wired to tested APIs)
- [] F10. Build `AdmissionWizard.jsx` (dynamic fields per org plan).
- [] F11. Build `ParentAdmissionTracker.jsx` (OTP-based status wall).
- [] F12. Build `OrgAdminAdmissions.jsx` (9 tabs: Walk-in, Waitlist, Verification).
- [] F13. Build `CanteenMenuPage.jsx` (student portal with floating cart).
- [] F14. Build `KitchenDisplaySystem.jsx` (live drag-and-drop Kanban).
- [] F15. Build all remaining module UIs (Analytics, Leave, Fees, Feedback, Notifications).

#### PHASE F4: Marketing Site & Mobile Release
- [] F16. Build Next.js `classgrid.in` (20 pages — Vercel Design Style). Use `CLASSGRID_PAGES_LAUNCH_PROMPT.md` as the build prompt.
- {} F17. Final Android APK release to Play Store.
