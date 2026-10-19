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

# 📋 Classgrid Master Frontend Checklist

This is the source of truth for the 280+ pages required for the Classgrid Platform. 
**Status Legend:** `[ ]` Not Started | `[/]` UI Built | `[x]` Fully Functional (API Connected)

---

## 1. 🔥 SUPER ADMIN (Platform Owner)
*Route Prefix: `/superadmin` | Desktop Only*

- [ ] `Dashboard` (Bento Grid Overview)
- [ ] `Analytics` (Platform Growth & Usage)
- [ ] `All Organizations` (Table: Search, Filter, Status)
- [ ] `Onboard New Org` (Multi-step Wizard)
- [ ] `Demo Leads` (CRM style lead tracking)
- [ ] `Plans & Billing` (Subscription Management)
- [ ] `Users & Roles` (Platform-level permissions)
- [ ] `Audit Logs` (Global security tracking)
- [ ] `Announcements` (Platform-wide broadcasts)
- [ ] `Changelog` (Product update feed)
- [ ] `System Config` (Environment variables, Global flags)
- [ ] `Support Tickets` (Ticketing system)
- [ ] `Feedback & Reviews` (NPS and User feedback)
- [ ] `Profile Settings`

---

## 2. 🏫 ORG ADMIN (Institutional Owner)
*Route Prefix: `/org` | Desktop Only*

### Overview
- [ ] `Dashboard` (Org-level Bento Grid)
- [ ] `Announcements` (Internal school notices)

### Academics
- [ ] `Student Directory` (All student records)
- [ ] `Faculty Directory` (All staff records)
- [ ] `Classroom Management` (Building, Rooms, Capacity)
- [ ] `Timetable Master` (Master schedule view)
- [ ] `Academic Calendar` (Holidays, Terms, Events)
- [ ] `Curriculum Management` (Syllabus, Course codes)

### Management
- [ ] `Admission Overview` (Pipeline tracking)
- [ ] `Fees Overview` (Collections & Defaulters)
- [ ] `Examination Master` (Scheduling & Status)
- [ ] `Result Master` (Approval & Publication)
- [ ] `Attendance Overview` (Global statistics)
- [ ] `Leave Management` (Approval workflows)

### Compliance & Tools
- [ ] `NBA / NAAC Compliance` (Criteria tracking)
- [ ] `SARAL / DTE Reports` (Govt exports)
- [ ] `Audit Trail` (Org-specific logs)
- [ ] `Classgrid AI` (Institutional AI features)
- [ ] `College Website` (CMS for public portal)

---

## 3. 🎓 ADMISSION DEPARTMENT
*Route Prefix: `/dept/admissions` | Desktop Only*

- [ ] `Admission Dashboard`
- [ ] `All Applications` (Table with filters)
- [ ] `New Application Form` (Manual entry)
- [ ] `Document Verification` (Side-by-side view)
- [ ] `Merit List Generator`
- [ ] `Seat Allotment / Enrollment`
- [ ] `Admission Config` (Rounds, Dates, Eligibility)
- [ ] `Fee Structure Config`
- [ ] `Admission Form Builder` (Drag & drop)
- [ ] `Lead Tracking (CRM)`
- [ ] `Bulk Communication` (WhatsApp/SMS)
- [ ] `CET / DTE Compliance`

---

## 4. 💰 FEES & ACCOUNTS DEPARTMENT
*Route Prefix: `/dept/fees` | Desktop Only*

- [ ] `Fees Dashboard`
- [ ] `Collect Payment` (POS style entry)
- [ ] `Transaction History`
- [ ] `Defaulters List` (Auto-generated)
- [ ] `Fee Receipts` (PDF generation)
- [ ] `Fee Structure Management`
- [ ] `Installment Plans`
- [ ] `Scholarships & Waivers`
- [ ] `Late Fee Rules`
- [ ] `Bank Reconciliation`

---

## 5. 📝 EXAMINATION DEPARTMENT
*Route Prefix: `/dept/exams` | Desktop Only*

- [ ] `Exam Dashboard`
- [ ] `Exam Scheduling`
- [ ] `Create New Exam` (Subject mapping)
- [ ] `Hall Ticket Generation`
- [ ] `Marks Entry Portal`
- [ ] `Result Processing` (Normalization/Grades)
- [ ] `Question Bank`
- [ ] `AI Paper Generator`
- [ ] `Past Papers Repository`

---

## 6. 👨‍🏫 FACULTY CONSOLE
*Desktop & Mobile App*

- [ ] `Home / Classrooms` (Assigned subjects)
- [ ] `Work / Modules` (Grid of 25+ modules)
- [ ] `My Schedule` (Daily/Weekly view)
- [ ] `Attendance Marker` (QR/List based)
- [ ] `Assignment Manager` (Post & Grade)
- [ ] `Curriculum Tracker` (Completion %)
- [ ] `Internal Test Manager`
- [ ] `Leave Requests` (Apply & Track)
- [ ] `Message Center` (Student/Parent chat)
- [ ] `Profile & Professional Portfolio`
- [ ] `Classgrid AI Assistant`

---

## 7. 🎓 STUDENT PORTAL
*Desktop & Mobile App*

- [ ] `Student Home` (Next class, To-do list)
- [ ] `Work / Modules` (Grid of 23+ modules)
- [ ] `Timetable`
- [ ] `Attendance Tracker` (My percentage)
- [ ] `Assignment Submission`
- [ ] `Fee Payment Portal`
- [ ] `Result / Marksheets`
- [ ] `Examination Schedule`
- [ ] `Library Account` (Books held)
- [ ] `Hostel Dashboard` (Rent, Complaints)
- [ ] `Placement Portal` (Jobs & Resume)
- [ ] `Digital ID Card`

---

## 8. 🏠 OTHER DEPARTMENTS (Support)
*Desktop Only*

- [ ] `HR & Payroll` (Salary, Staffing)
- [ ] `Library Management` (Stock, Issue/Return)
- [ ] `Hostel Management` (Rooms, Mess)
- [ ] `Transport Management` (Buses, Routes)
- [ ] `Canteen Management` (Menu, Inventory)
- [ ] `Inventory / Stores` (Equipment tracking)

---

## 9. ⚙️ SYSTEM & SHARED
- [ ] `Login Page` (Multi-role login)
- [ ] `Forgot Password / OTP`
- [ ] `Global Search` (Command Palette)
- [ ] `User Settings & Security`
- [ ] `Not Found (404) Page`
- [ ] `Maintenance Mode Page`
