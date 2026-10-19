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

# How to Start Building: Classgrid Frontend Rebuild

> **Objective:** Transition from planning/wireframing into actual React code execution. We have 225 pages mapped across 11 roles. Here is the exact, step-by-step developer roadmap to build this systematically without getting overwhelmed.

---

## STEP 1: Establish the "Agora Console" Theme (Phase 0)
Before building any pages, we must lock in the visual identity so every subsequent page looks perfect automatically.

1. **Update Tailwind Config:** 
   We need to configure `tailwind.config.js` to enforce the strict dark mode palette.
   * `background`: `#000000` (Main content area)
   * `surface`: `#111827` (Sidebar and Cards)
   * `border`: `#1f2937` or `#2a2a2a` (Sharp, clean separators)
   * `primary`: `#34d399` (Accent green)
   * Remove all heavy rounded corners (use `rounded-sm` or `rounded-none`).

2. **Global CSS:**
   Update `src/index.css` to remove legacy styles and enforce a dark background on the `<body>`.

---

## STEP 2: The Universal Sidebar Engine
The wireframes dictate that *every* role uses the exact same layout (240px Sidebar + Main Content), but with different links.

1. **Create the Nav Config (`src/config/navigation.js`)**
   Create a single JSON file that holds the sidebar arrays for all 11 roles (Super Admin, Org Admin, Faculty, Student, Fees Dept, etc.).
   
2. **Build `<DashboardSidebar />` (`src/components/layout/DashboardSidebar.jsx`)**
   Build a smart sidebar component that reads the user's role from AuthContext, fetches the correct array from `navigation.js`, and renders the links. It must handle the `User Card Dropdown` at the bottom.

3. **Build `<DashboardShell />` (`src/components/layout/DashboardShell.jsx`)**
   This is the global wrapper. It will render the Sidebar on the left, and `{children}` on the right.

---

## STEP 3: The Auth & Routing Bridge (Phase 1)
We cannot view the dashboards without logging in. We need the auth bridge to route users to their respective dashboards.

1. **Update `<AuthContext />` (`src/context/AuthContext.jsx`)**
   Ensure it properly decodes the JWT and exposes the user's `role` and `org_id`.
   
2. **Build `<ProtectedRoute />`**
   A component that wraps routes. If a user tries to access `/org/fees` but they are a Faculty member, redirect them to `/classrooms`.

3. **Build the Login Screens (`src/pages/auth/`)**
   Build clean, centered login cards for `AdminLogin`, `OrgLogin`, and `Faculty/Student Login`.

---

## STEP 4: Build the First Role (Phase 2 - Super Admin)
Once the Shell and Auth are working, pick **one role** to build out completely as a template for the rest. We start with Super Admin.

1. **The Dashboard Page (`/superadmin/dashboard`)**
   * Build the reusable `<StatsCard />` component (for the 4-column Bento grid).
   * Build the reusable `<DataTable />` component (for the Organizations table).
   
2. **Hook up the API**
   Connect `GET /api/admin/dashboard/stats` to populate the Bento grid.

---

## STEP 5: Replicate Across Departments (Phases 3-6)
Once Super Admin is done, you have all the building blocks (`StatsCard`, `DataTable`, `DashboardShell`). 

Building the **Fees Department**, **Admissions Department**, and **Org Admin** becomes incredibly fast because you are just:
1. Creating a new page file.
2. Dropping in the `<DashboardShell>`.
3. Fetching the specific API route (e.g., `GET /api/fees/analytics`).
4. Rendering the data into `<DataTable>`.

---

### 👉 Action Item: What to do right now?
**Stop planning. Start coding Phase 0.**
Let's open `client/tailwind.config.js` and `client/src/index.css` to lock in the Agora Console theme, and then build the `<DashboardShell>` component. I can write the code for these right now if you are ready!
