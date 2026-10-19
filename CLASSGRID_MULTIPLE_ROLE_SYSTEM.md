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

# Classgrid — Multiple Role System (Complete Reference)

> **Purpose:** This document explains the complete multiple role system in Classgrid.
> Every AI session working on this codebase MUST read this first before touching anything related to roles, dashboards, onboarding, or access control.

---

## What Is the Multiple Role System?

Every person in Classgrid has **ONE main role** when their account is created. This is stored in `user.role` in the database.

They can request **ONE additional role** at any time. This is stored in `user.additional_roles[]` (array, max 1 item).

**Maximum 2 roles per person. No more. Ever.**

There are **NO restrictions** on which role they pick as additional. A principal can also be a teacher. A fee manager can also be an admission counselor. Anyone can combine any 2 roles from their org's available list.

---

## The Rules (Enforced by Backend)

1. **Max 2 roles** — `user.role` (1) + `user.additional_roles[]` (max length 1)
2. **No duplicates** — cannot request a role you already have
3. **System roles cannot be requested** — `org_admin`, `super_admin`, `student` are assigned by the system only
4. **Role must exist in your org type** — cannot request `tpo_officer` if you are in a School
5. **Tenant ID must match your org** — security check

**Backend file:** `server/src/utils/multipleRoles.js`
**Function:** `canUserRequestRole(user, requestedRole, org)` — call this before accepting any role request

---

## The 10 Dashboards (Fixed Forever)

| # | Dashboard Key | Frontend Path | Roles That Land Here |
|---|---|---|---|
| 1 | `student` | `/student/work` | `student` |
| 2 | `faculty` | `/work` | `faculty`, `counselor` |
| 3 | `org_admin` | `/org/admin/dashboard` | `org_admin`, `principal`, `vice_principal`, `hod`, `coordinator`, `tpo_officer` |
| 4 | `admissions` | `/dept/admissions/dashboard` | `admission_head`, `admission_counselor`, `admission_verifier`, `admission_clerk` |
| 5 | `examination` | `/dept/exams/dashboard` | `exam_controller` |
| 6 | `fees` | `/dept/fees/dashboard` | `fee_manager` |
| 7 | `library` | `/dept/library/dashboard` | `library_manager`, `library_admin` |
| 8 | `hostel_transport` | `/dept/transport/dashboard` | `transport_manager`, `hostel_manager` |
| 9 | `hr_payroll` | `/dept/hr/dashboard` | `hr_admin` |
| 10 | `attendance` | `/dept/attendance/dashboard` | `attendance_admin` |

**The sidebar items inside each dashboard can be shown/hidden per role later. But there will always be exactly 10 dashboards. Never more.**

---

## How the Dashboard Switcher Works

- Main role → determines which dashboard they land on after login
- If additional role maps to a **different dashboard** → **header switcher dropdown appears**
- If additional role maps to the **same dashboard** → **no switcher** (more access inside that dashboard)
- Chat, profile, notifications are always the same regardless of which dashboard

**Examples:**
- `principal` + `faculty` → SWITCHER (org_admin dashboard ↔ faculty dashboard)
- `admission_head` + `admission_clerk` → NO SWITCHER (both → admissions dashboard)
- `fee_manager` + `hr_admin` → SWITCHER (fees dashboard ↔ hr dashboard)

---

## ORG TYPE: SCHOOL — 18 Roles, 10 Dashboards

**All Roles:** `student`, `faculty`, `counselor`, `org_admin`, `principal`, `vice_principal`, `coordinator`, `exam_controller`, `fee_manager`, `library_manager`, `transport_manager`, `hostel_manager`, `admission_head`, `admission_counselor`, `admission_verifier`, `admission_clerk`, `hr_admin`, `attendance_admin`

| Dashboard | Roles In This Group | Can Add As 2nd Role |
|---|---|---|
| 1. Student | `student` | NONE |
| 2. Faculty | `faculty`, `counselor` | Any 1 role from dashboards 3-10 → switcher |
| 3. Org Admin | `org_admin`, `principal`, `vice_principal`, `coordinator` | Any 1 role from dashboards 2,4-10 → switcher |
| 4. Admissions | `admission_head`, `admission_counselor`, `admission_verifier`, `admission_clerk` | Any 1 role from dashboards 2,3,5-10 → switcher |
| 5. Examination | `exam_controller` | Any 1 role from dashboards 2,3,4,6-10 → switcher |
| 6. Fees | `fee_manager` | Any 1 role from dashboards 2,3,4,5,7-10 → switcher |
| 7. Library | `library_manager` | Any 1 role from dashboards 2,3,4,5,6,8-10 → switcher |
| 8. Transport | `transport_manager`, `hostel_manager` | Any 1 role from dashboards 2-7,9,10 → switcher |
| 9. HR | `hr_admin` | Any 1 role from dashboards 2-8,10 → switcher |
| 10. Attendance | `attendance_admin` | Any 1 role from dashboards 2-9 → switcher |

---

## ORG TYPE: JUNIOR COLLEGE — 19 Roles, 10 Dashboards

Same as School. Only difference: Dashboard 3 (Org Admin) adds `hod`.

**Org Admin group:** `org_admin`, `principal`, `vice_principal`, `hod`, `coordinator`

---

## ORG TYPE: ENGINEERING — 20 Roles, 10 Dashboards

Same as Junior College. Only difference: Dashboard 3 (Org Admin) also adds `tpo_officer`.

**Org Admin group:** `org_admin`, `principal`, `vice_principal`, `hod`, `coordinator`, `tpo_officer`

---

## ORG TYPE: DIPLOMA — 20 Roles, 10 Dashboards

**Identical to Engineering.** Same 20 roles. Same 10 dashboard groups.

---

## ORG TYPE: COACHING — 12 Roles, 7 Dashboards

**All Roles:** `student`, `faculty`, `counselor`, `org_admin`, `hod`, `coordinator`, `fee_manager`, `admission_head`, `admission_counselor`, `admission_clerk`, `hr_admin`, `attendance_admin`

| Dashboard | Roles | Supported? |
|---|---|---|
| 1. Student | `student` | ✅ |
| 2. Faculty | `faculty`, `counselor` | ✅ |
| 3. Org Admin | `org_admin`, `hod`, `coordinator` | ✅ |
| 4. Admissions | `admission_head`, `admission_counselor`, `admission_clerk` | ✅ (no verifier) |
| 5. Examination | — | ❌ NOT SUPPORTED |
| 6. Fees | `fee_manager` | ✅ |
| 7. Library | — | ❌ NOT SUPPORTED |
| 8. Transport | — | ❌ NOT SUPPORTED |
| 9. HR | `hr_admin` | ✅ |
| 10. Attendance | `attendance_admin` | ✅ |

---

## Onboarding Build Plan — Next Week

| Day | Build | Roles |
|---|---|---|
| Day 1 | Org Admin onboarding wizard | `org_admin` (all 5 org types) |
| Day 2 | Faculty onboarding | `faculty`, `counselor` |
| Day 3 | Admissions team onboarding | `admission_head`, `admission_counselor`, `admission_verifier`, `admission_clerk` |
| Day 4 | Leadership onboarding | `principal`, `vice_principal`, `hod`, `coordinator`, `tpo_officer` |
| Day 5 | Solo dept roles onboarding | `exam_controller`, `fee_manager`, `library_manager`, `transport_manager`, `hostel_manager`, `hr_admin`, `attendance_admin` |
| Day 6 | Student onboarding | `student` (PRN, class, parent, DOB, category) |

---

## Key Files

| File | Purpose |
|---|---|
| `server/src/utils/multipleRoles.js` | All rules, validation, dashboard mapping (BACKEND) |
| `server/src/utils/roles.js` | ORG_ROLE_MAPPING per org type |
| `server/src/routes/org.routes.js` | invite-staff, request-role, accept/reject routes |
| `server/src/controllers/auth.controller.js` | Login redirect, activation security |
| `server/src/models/User.js` | user.role, user.additional_roles[] |
| `client/src/lib/dashboardRoleMap.ts` | Frontend role-to-dashboard mapping |
| `client/src/components/layout/DashboardLayout.tsx` | Header dashboard switcher |
| `client/src/features/auth/pages/NewRoleWelcomePage.tsx` | Short welcome after 2nd role approved |
