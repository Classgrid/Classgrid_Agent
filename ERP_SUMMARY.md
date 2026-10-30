# Classgrid ERP — Repo Summary

> **Status: SHUT DOWN (paused, not deleted).** The ERP is no longer the product and is not built, mounted, started, or deployed. Classgrid now ships only its AI agent. The ERP code lives here so it can be moved back if ever needed.

## What it was
A full school/college management system (ERP) covering the whole academic lifecycle: admissions, fees, attendance, exams, marks, results, timetable, library, canteen, hostel, HR/payroll, live classes, and org websites.

## Where it lives
| Folder | Was | Purpose |
|---|---|---|
| `erp-backend/` | `server/` | Node.js API + workers/crons |
| `erp-client/` | `client/` | React frontend (org admin, dashboards, CMS) |

Files keep their original paths (`erp-backend/src/...` = `server/src/...`), so anything can be moved back as-is.

## Backend (`erp-backend/src/`)
- **Stack:** Node.js, Express, MongoDB (Mongoose), Supabase.
- **Controllers** — attendance, canteen, course-library, examination, fee, faculty-dashboard, live, org-website, payroll, student-dashboard, video, admission (broadcast/config/operations).
- **Routes** (~50) — admissions, fees, attendance, exams, marks, results, timetable, library, canteen, hostel, HR/payroll, live classes, quizzes, online exams, CRM, messaging, org websites, and more.
- **Models** — Attendance, FacultyPayroll, FeeCategory, FeeComponent, Plan, PlatformModule, SchoolReportCard, Transaction, VideoProgress, and others.
- **Workers/Crons** — attendance, admission deadlines, promotions, monthly invoices, org usage, email provisioning.
- **Services** — admissions, analytics, attendance, billing, examination, fees, marks, payroll, notes-AI, quiz-AI, quiz-Google, Agora recording, GPS, tenant-service.

## Frontend (`erp-client/src/`)
- **Stack:** React + TypeScript.
- **Features** — admission-portal, admissions, attendance, auth, classrooms, exams, faculty, fees, hostel, hr, library, org, org-admin, results, student, superadmin, support, system, website_cms.
- **Data** — `full_erp_data.json` (master lists: cast, religion, blood group, university, board, etc.).

## Why it was moved out
The ERP was split out of `server/` and `client/` so the live products (chat.classgrid.in and the super admin dashboard) only load and build what they actually use. Nothing here runs in production.

## Note
ERP code the live server still needs (models read by AI tools, the admission controller used by the Razorpay webhook) stayed in `server/` — it was not moved here.