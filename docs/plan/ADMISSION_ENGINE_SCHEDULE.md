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

# 🎓 ADMISSION ENGINE — Day-by-Day Build Schedule (Day 11 to 21)

**Module 21: The Admission Engine**
**Reference Docs:** `CLASSGRID_ADMISSION_PLAN.md` + `CLASSGRID_CET_ADMISSION_PLAN.md` + `CLASSGRID_SCHOOL_ADMISSION_PLAN.md`

> This continues directly from the Master Implementation Plan (which ends at Day 10).
> The Admission Engine is the single most complex module, and takes Day 11 through Day 21.

---

## 📅 DAY 11: Foundation — Unified Schema & Identity Split ✅
**Goal:** All database schemas created to support Engineering (CET), Coaching, Schools, and Jr. Colleges simultaneously.

- [x] Extend `Organization.js` with full `admission_config` subdocument (portal open/close, workflow stages, fee policies).
- [x] Create `AdmissionApplication.model.js` — The core applicant record.
  - Base fields: current_stage, stage_history, documents, merit_score, waitlist data.
  - Engineering fields: `imported_en_no`, `cet_category`, `rla_status`, `seat_type`.
  - Non-Engineering fields: `previous_school_board`, `merit_score`, `preferred_stream`.
- [x] Create `CETAllotment.model.js` — Read-only CET PDF storage (Engineering CAP rounds).
- [x] Create `SeatConfig.model.js` — Track dynamic availability per stream/course.
- [x] Create Supabase migration SQL for `admission_applications` (Row Level Security enabled).
- [x] Postman Verification: Org creation + structure_type config switch works.

---

## 📅 DAY 12: Workflow Engine & Dynamic Form Builder ✅
**Goal:** The config-driven transitions AND dynamic field loading per board.

- [x] Build `admission-workflow.service.js` — State machine (`canTransition`, `isComplete`).
- [x] Create presets: Coaching, School, Jr. College, Engineering.
- [x] Build `admission-form-builder.service.js` — Dynamic field switch logic:
  - If Jr College → Demand 10th Marks, Board Type (SSC/CBSE), Stream.
  - If Coaching → Demand Target Exam (JEE/NEET).
- [x] Build `admission-config.controller.js` — CRUD for configuring workflow stages.
- [x] API: `POST /api/admission/config/preset` → One-click layout injection.
- [x] Postman Verification: Form structure updates dynamically.

---

## 📅 DAY 13: Non-CET Auth (School/Coaching/JC) — Phone OTP Focus ✅
**Goal:** The direct application flow used by 80% of organizations (Data source = Student).

- [x] Connect existing `firebaseAuth.js` to admission routes (Phone OTP verification).
- [x] Build `POST /api/admission/direct/verify-phone` — Firebase token validation.
- [x] Build `AdmissionOTP.model.js` — Fallback tracking.
- [x] Build Duplicate Detection (`duplicate-detector.service.js`): Checks Phone + Name + DOB.
- [x] API: `POST /api/admission/direct/save-draft` (Partial submission).
- [x] API: `POST /api/admission/direct/submit` (Final submission).
- [x] Postman Verification: Phone OTP auth generates session → submits application → no duplicates allowed.

---

## 📅 DAY 14: CET Engine (Engineering) — The PDF Pipeline ✅
**Goal:** The DTE Maharashtra Govt flow (Data source = Govt PDF).

- [x] Build EN checksum validation logic (`validateENNumber` - MOD-11 Algorithm).
- [x] Build `POST /api/admission/cet/import` — Parse Excel/CSV → bulk insert into `CETAllotment`.
- [x] Build `POST /api/admission/cet/validate-en` — Verify EN against imported list.
- [x] Build `POST /api/admission/cet/send-otp` → Verification email delivery via Brevo.
- [x] Build `POST /api/admission/cet/verify-otp` → Generate admission session JWT.
- [x] Apply 3-OTP/hour rate limiting.
- [x] Postman Verification: CET import → EN lookup → OTP verification → Token generated.

---

## 📅 DAY 15: Document Processing & Merit Engine ✅
**Goal:** Handle all S3 uploads, document verification, and the multi-board Normalization Engine.

- [x] Build generic Document Upload endpoints (utilizing Supabase Storage buckets).
- [x] Build `document-validity.service.js` — Check if caste/income certificates are expired.
- [x] Build `merit-engine.service.js` — Normalization multiplier logic (SSC/CBSE/ICSE/IB/NIOS + CGPA conversion).
- [x] Build `POST /api/admission/direct/generate-merit` — Produce normalized list.
- [x] Build `GET /api/admission/direct/merit-list` — Admin dashboard data (paginated).
- [x] Build Application Print Data endpoint (`/print/application/:id`).
- [x] Postman Verification: Submit docs → Run merit normalizer → Result sorted correctly.

---

## 📅 DAY 16: PRN, Allocation & Offline Walk-ins ✅
**Goal:** Final identity generation and handling the "Desk Enrollment" edge case.

- [x] Build `prn-generator.service.js` — Template-based `{YEAR}{BRANCH}{SERIAL:4}`.
- [x] Build `division-allocator.service.js` — Alphabetical / Merit / Random methods.
- [x] API: `POST /api/admission/desk-enroll` — Admin fast-path instant enrollment (No OTP, Cash/Cheque override).
- [x] API: `POST /api/admission/applications/merge` — Merging duplicates manually.
- [x] API: `POST /api/admission/allocate-divisions` — Run division allocation algorithm.
- [x] API: `POST /api/admission/generate-prns` — Batch PRN generation.
- [x] Postman Verification: 20 students → Run division allocator → 2 divisions of 10 created.

---

## 📅 DAY 17: Fees, Scholarships & Waitlist Management ✅
**Goal:** Payment flow and automated queue promotion.

- [x] Connect existing Razorpay / Fee system (flag `is_admission_fee`).
- [x] Build Scholarship mapping (TFWS, EBC) → Dynamic fee deduction.
- [x] API: `POST /api/admission/scholarship/bulk-import` (CSV bulk waiver).
- [x] Build Waitlist System in `admission-workflow.service.js`.
- [x] API: `POST /api/admission/promote-waitlist` (Manual override).
- [x] Build Withdrawal + Refund Logic (`refund_percentage` lookup).
- [x] Postman Verification: Student in WL-1 → Paid student withdraws → WL-1 Promotes → Fee discounted via TFWS.

---

## 📅 DAY 18: Cron Jobs, Govt Exports & DTE Compliance ✅
**Goal:** Automated deadline drops and mandatory government reporting.

- [x] Build Cron: `admission-deadline-checker.cron.js` (Lapse unpaid seats, abandon stale applications).
- [x] Build RLA Reporting flow for Engineering: `POST /api/admission/cet/:en/report`.
- [x] Enforce Logic: Block fee generation IF RLA_Status !== "reported" (Gate in workflow service).
- [x] Build CAP Upgrade Flow — `PATCH /api/admission/cet/:en/mark-upgraded` (Release Seat + Auto-Promote Waitlist).
- [x] Build Government Exporters:
  - `GET /api/admission/export/dte` (Maharashtra format)
  - `GET /api/admission/export/saral` (School format)
- [x] Postman Verification: Run cron manually → Lapsed seat transitions correctly.

---

## 📅 DAY 19: Notification Dispatcher & Official Enrollment ✅
**Goal:** Connect AWS SNS + Brevo + FCM and create final User accounts.

- [x] Build `admission-notification.service.js` — Unified dispatcher (Email + SMS + Push).
- [x] Map all 10 triggers (Applied, Under Review, Verified, Rejected, Merit Published, Selected, Waitlisted, Fee Pending, Enrolled, Withdrawn).
- [x] Integrate AWS SNS API with budget tracker alert (`GET /api/admission/sms-budget`).
- [x] Build `POST /api/admission/enroll` — The Final Step.
  - Takes Application → Creates `User` account.
  - Sets PRN, Roll Number, connects to Organization.
  - Triggers Credential Bridge (Email password explicitly via OTP channel).
- [x] Build `POST /api/admission/notify` — Admin manual notification dispatch.
- [x] Postman Verification: Advance to Enrolled → User table populated → Welcome SMS fired.

---

## 📅 DAY 20: Parent Tracking Portal & Analytics ✅
**Goal:** Public visibility and Admin macro-dashboards.

- [x] Build `POST /api/admission/parent/login` — Parent Phone OTP access (Firebase).
- [x] Build `GET /api/admission/parent/status/:applicationId` — Clean, limited readout for parents.
- [x] Build `GET /api/admission/parent/documents/:applicationId` — Receipt/Letter downloads.
- [x] Handle Multi-Child: (Parents with multiple siblings — auto-detected by phone).
- [x] Build Analytics: `GET /api/admission/analytics` (Funnel: Applied → Verified → Enrolled + daily trends).
- [x] Build Engineering Dash: `GET /api/admission/cet/dashboard` (CAP Round stats, branch fill rates, RLA breakdown).
- [x] Final Code Freeze & Integration Tests.

---

## 📅 DAY 21: ACAP Operations, Live Spotlight & Crowd Management ✅
**Goal:** High-frequency, real-time systems governing Spot, Institutional, and Management rounds after CAP 4 ends.

- [x] Build ACAP Online Registration: `POST /api/admission/acap/register` — Time-bound portals for Spot / Institutional / Management.
- [x] Build the Triple-Path ACAP Engine via `POST /api/admission/acap/generate-merit`:
  - **Spot Round Path:** Generates Provisional & Final Merit lists. Honors all category-based scholarships (TFWS/EBC).
  - **Institutional Quota Path:** Generates distinct Provisional & Final Merit lists. Auto-disables all scholarships (full fees only).
  - **Management Quota Path:** Silent, fully isolated admin filling process. Divorced from public merit lists to maintain security/privacy. No scholarships.
- [x] Build Gate Verification & Token Hook: `POST /api/admission/acap/verify-gate` — Verify student on Final Merit List before issuing `boarding_token` for auditorium entry.
- [x] Real-Time Seat Matrix: Already in `seat-matrix.service.js` — atomic OCC allocation + Socket.IO broadcast.
- [x] Build Real-Time Merit API: `GET /api/admission/merit-list/live` — Optimized, 5-second cacheable projector endpoint.
- [x] **Omnichannel Live Sync (Web + App):** `ADMISSION_LIVE_UPDATE` socket events broadcast to `org_{id}_admission` room — consumed by projectors, mobile app, and public website.
- [x] Stress-test readiness: 5-second `Cache-Control` header + lightweight JSON payload (~200 candidates max per poll).
