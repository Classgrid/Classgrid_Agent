# Classgrid ERP — Full Repo Summary

> **Status: SHUT DOWN (paused, not deleted).** The ERP is no longer the product and is not built, mounted, started, or deployed. Classgrid now ships only its AI agent. The ERP code lives here so it can be moved back if ever needed.

---

## 1. What it was

A full school/college management system (ERP) covering the entire academic lifecycle end-to-end. It was a multi-tenant SaaS where each organization (school, junior college, engineering college, or coaching institute) got its own branded subdomain and a role-based dashboard for every stakeholder.

The ERP was the original Classgrid product. It has since been replaced by the AI agent, and every dashboard other than `chat.classgrid.in` and the super admin dashboard is banned from being built, fixed, tested, or even discussed.

---

## 2. Where it lives

| Folder | Was | Purpose |
|---|---|---|
| `erp-backend/` | `server/` | Node.js API + workers/crons + services |
| `erp-client/` | `client/` | React + TypeScript frontend (dashboards, portals, CMS) |

Files keep their original paths (`erp-backend/src/...` = `server/src/...`, `erp-client/src/...` = `client/src/...`) and their `@/...` imports, so any page or route can be moved back as-is if it is ever needed again. Nothing here is built or runs in production.

---

## 3. Backend (`erp-backend/`)

### Stack
Node.js, Express, MongoDB (Mongoose), Supabase (for memberships), Agora (live classes/recording), Razorpay (fees webhook), Google (quiz/notes AI).

### Controllers (`src/controllers/`) — 16 files
- **Admissions:** `admission-broadcast`, `admission-config`, `admission-operations`
- **Academic:** `attendance`, `examination`, `course-library`, `video`
- **Money & people:** `fee`, `payroll`, `canteen`
- **Dashboards:** `faculty-dashboard`, `student-dashboard`
- **Other:** `demo`, `external`, `live`, `org-website`

### Routes (`src/routes/`) — 50 files
`academic-plan`, `academic`, `activity`, `admission`, `advanced_quiz`, `alumni`, `analytics`, `assignment`, `attendance`, `attendance_dashboard`, `canteen`, `certificate`, `classroom_chat`, `comments`, `course-library`, `course`, `crm`, `demo`, `events`, `exam`, `examination`, `examinations`, `external`, `faculty`, `fee-records`, `feedback`, `fees`, `holidays`, `internal-tests`, `leave`, `library`, `live`, `marketplace`, `marks`, `meet`, `messaging`, `notes`, `online-exam`, `org-website`, `past-paper`, `payroll`, `pendingActions`, `quiz`, `result`, `student`, `teacher-planner`, `timetable`, `video`, `viva`.

### Models (`src/models/`) — 17 files
`Attendance`, `AttendanceAppeal`, `CreditNoteLineItem`, `EmailReservation`, `FacultyBiometricLog`, `FacultyPayroll`, `FeeCategory`, `FeeComponent`, `OrganizationRequest`, `Plan`, `PlatformModule`, `ResultAuditLog`, `SchoolReportCard`, `SubscriptionSchedule`, `TeacherPlan`, `Transaction`, `VideoProgress`.

### Workers / Crons (`src/workers/`) — 6 files
`admission-deadline-checker.cron`, `attendance.worker`, `email-provisioning.worker`, `monthly-invoice.worker`, `organization-usage-daily.worker`, `promotion-scheduler.cron`.

### Services (`src/services/`) — grouped by domain
- **Admissions:** `admission-automation`, `admission-form-builder`, `document-validity`, `merit-engine`, `workflow`, plus a `strategy/` folder
- **AI:** `ocr-quiz`, `past-paper-analysis`, `proctor`
- **Analytics:** `analytics`, `rank-prediction`, `topic-strength`
- **Attendance:** `attendance-analytics`, `attendance-core`, `leave-workflow`
- **Billing:** `BillingEligibilityService`, `BillingUsageService`, `PaymentAllocationService`, `SettlementReconciliationService`
- **Examination:** `exam-core`, `grading-engine`, `report-card`
- **Fees:** `fee-structure`, `invoicing`, `payment-gateway`
- **Profile:** `profile-strategy-selector`
- **Standalone:** `agora-recording`, `email-reservation`, `faculty-dashboard`, `gps`, `marks`, `notes-ai`, `payroll`, `quiz-ai`, `quiz-google`, `student-dashboard`, `tenant-service`

### Middleware (`src/middleware/`) — 7 files
`admission-auth`, `admission-roles`, `admission-track`, `biometricAuth`, `hierarchy-integrity`, `plan-validator`, `plan`.

### Utils, Config, Constants, Scripts
- **Utils:** `billingDateUtils`, `holidayUtils`, `meritEngine`, `moneyUtils`
- **Config:** `billingEnums`, `billingErrorCodes`
- **Constants:** `modules.js` — the full `PLATFORM_MODULES` catalog (Academic, Assessment, Management, Advanced) with per-module `defaultEnabled` flags
- **Scripts:** `billingSecurityAudit`, `generate-sample-pdf`, `migrate_memberships_to_supabase`, and admission email proof senders (`send-admission-email-proof`, `send-eng-final-v3`, `send-engineering-proof-v2`, `send-fyjc-email-proof`)

### Tenant service (`services/tenant-service/`)
A standalone `index.js` used for tenant provisioning/isolation.

---

## 4. Frontend (`erp-client/`)

### Stack
React + TypeScript, with a feature-first folder structure (`src/features/`).

### Features (`src/features/`) — 21 modules
`admission-portal`, `admissions`, `attendance`, `auth`, `classrooms`, `exams`, `faculty`, `fees`, `hostel`, `hr`, `library`, `org`, `org-admin`, `results`, `student`, `superadmin`, `support`, `system`, `website_cms`.

Each feature follows the same pattern: `api.ts` / `queries/` (data fetching), `pages/` (routes), `components/` (UI), `types.ts` (types), and sometimes `services/`, `hooks/`, `constants/`.

### Admissions (the deepest module)
Dedicated dashboards per institution type — School, Junior College, Engineering, College, and Coaching — plus:
- **Portal:** `CandidatePortalPage`, `ParentTrackerPage`, `PublicApplicationForm`, `AdmissionsDashboard`
- **Ops:** `AllApplicationsPage`, `ApplicationDetailsPage`, `NewApplicationPage`, `EnrollmentPage`, `DocumentVerificationPage`, `MeritListPage`, `VacancyTrackerPage`, `LeadTrackingPage`
- **Config & comms:** `FormBuilderPage`, `FeeStructurePage`, `ScheduleRoundsPage`, `BulkSmsPage`, `CommunicationPage`, `CAPUpgradePage`, `CETImportPage`, `CETReportsPage`, `RLAReportingPage`, `ExportDataPage`, `AdmissionAnalyticsPage`

### Classrooms
Full Google-Classroom-style module: stream, materials, quizzes, chat, announcements, join requests, hierarchy selector, AI tab, PDF viewer, cover upload — with its own `hooks/`, `queries/`, `services/`, and `types/`.

### Auth
Multi-tenant login/onboarding: `AdminLoginRouter`, `UserLoginRouter`, `ClassgridSubdomainAdminLoginPage`, `ClassgridSubdomainUserLoginPage`, `CustomDomainAdminLoginPage`, `CustomDomainUserLoginPage`, `EnterOrganizationCodePage`, `NewRoleWelcomePage`, `OnboardingWizardPage`.

### Other dashboards
`attendance`, `exams`, `fees`, `faculty`, `results`, `student`, `hostel`, `hr`, `library`, `org`, `org-admin`, `superadmin`, `support`, `system`, `website_cms` — each with per-institution-type variants (School / Junior College / Engineering / College / Coaching).

### Data
`src/data/full_erp_data.json` — master lists (cast, religion, blood group, university, board, etc.) used across forms.

### Layout
`src/components/layout/OrgAdminLayout.tsx` — the org admin shell, which carries the "ERP SHUT DOWN" banner.

---

## 5. Platform modules catalog (`modules.js`)

The ERP exposed a configurable module system, grouped into four categories:

- **Academic:** Attendance, Digital Classroom, Automated Timetable, Academic Planning, Homework/Assignment, Student Notes, Teacher Planner, Subject Management, Course Management
- **Assessment:** Online Exam, Examination Management, Interactive Quiz, Grade Entry & Results, Internal Assessment, CET/JEE/NEET Conduction, Past Paper & Mock Tests, AI-Powered Viva, Test Series
- **Management:** Admission, Fee Collection, Staff Leave & Payroll, Canteen, Digital Library, Alumni Network
- **Advanced:** AI Assistant, Advanced Analytics, Compliance Audit Trails, Institution Website, Digital Certificates, Holiday Management, Digital ID Cards, Events Management, Feedback System

Each module carried a `defaultEnabled` flag, so organizations could toggle features on/off.

---

## 6. Why it was moved out

The ERP was split out of `server/` and `client/` so the live products (`chat.classgrid.in` and the super admin dashboard) only load and build what they actually use. Keeping the dead ERP code in the live build path would bloat the bundle and the server's module graph. Nothing here runs in production.

---

## 7. What stayed behind

ERP code the live server still needs was **not** moved here — it stayed in `server/`:
- Models read by the AI tools
- The admission controller used by the Razorpay webhook

So the shutdown is a clean split: only genuinely dead code was relocated, while anything still referenced by the live products remained in place.

---

## 8. Golden rules embedded in the code

The ERP files carry hard platform rules that still apply repo-wide:

1. **ERP is shut down** — never build, fix, test, or talk about ERP features. Only `chat.classgrid.in` and the super admin dashboard are live.
2. **No frontend GitHub Actions** — never create YAML that builds/deploys the frontend to EC2. Frontend is 100% Vercel; EC2 is backend only.
3. **Organization type is immutable** — no dropdown or option to change it, frontend or backend, ever.
4. **Never delete environment variables** — production-first, no touching keys.
5. **Localhost testing is banned** — no AI ever works locally.
6. **Naming** — "Classgrid Platform" is the repo name; `chat.classgrid.in` (Classgrid AI) is the product. Never use "Classgrid Platform" in user-facing UI.
7. **Hosting** — backend on AWS EC2 at `api.classgrid.in`, frontend on Vercel.