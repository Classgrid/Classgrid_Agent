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

# Backend Module Audit

Read-only source audited: `server/src/routes`, `server/src/controllers`, `server/src/models`, and `server/src/services`.

## Backend Architecture Map

```mermaid
flowchart TD
    Client["Client apps<br/>Web, mobile, public tenant pages"] --> API["Express API app<br/>server/api/index.js"]
    API --> HTTP["HTTP server + Socket.io<br/>server/server.js"]

    API --> MW["Global middleware"]
    MW --> Security["Helmet, CORS, cookie parser"]
    MW --> Auth["Passport + auth middleware<br/>role and tenant guards"]
    MW --> Ops["Rate limit, Winston logging,<br/>metrics flush, subdomain resolver"]

    MW --> Routes["Mounted /api routes"]

    subgraph Academic["Academic route layer"]
        Attendance["attendance.routes.js<br/>attendance_dashboard.routes.js"]
        Classroom["classroom.routes.js"]
        Timetable["timetable.routes.js"]
        AcademicPlan["academic-plan.routes.js"]
        Assignments["assignment.routes.js"]
        Notes["notes.routes.js"]
        TeacherPlanner["teacher-planner.routes.js"]
        Courses["course.routes.js<br/>hierarchy.routes.js"]
    end

    subgraph Assessment["Assessment route layer"]
        OnlineExam["online-exam.routes.js"]
        ExamMgmt["exam.routes.js<br/>examinations.routes.js"]
        Quiz["advanced_quiz.routes.js<br/>quiz.routes.js"]
        MarksResults["marks.routes.js<br/>result.routes.js"]
        InternalTests["internal-tests.routes.js"]
        PastPaper["past-paper.routes.js"]
        Viva["viva.routes.js"]
    end

    subgraph Management["Management route layer"]
        Admission["admission.routes.js"]
        Fees["fees.routes.js<br/>fee-records.routes.js"]
        LeavePayroll["leave.routes.js<br/>payroll.routes.js"]
        Canteen["canteen.routes.js"]
        Library["library.routes.js"]
        Alumni["alumni.routes.js"]
    end

    subgraph Advanced["Advanced and admin route layer"]
        AI["ai.routes.js<br/>thread_chat.routes.js"]
        Analytics["analytics.routes.js"]
        Audit["audit.routes.js"]
        Certificates["certificate.routes.js"]
        HolidaysEvents["holidays.routes.js<br/>events.routes.js"]
        Feedback["feedback.routes.js"]
        Website["org-website.routes.js<br/>public.routes.js"]
        AdminOrg["admin.routes.js<br/>org.routes.js<br/>super-admin.routes.js"]
    end

    Routes --> Academic
    Routes --> Assessment
    Routes --> Management
    Routes --> Advanced

    Academic --> Controllers["Controllers and inline route handlers"]
    Assessment --> Controllers
    Management --> Controllers
    Advanced --> Controllers

    Controllers --> Services["Service layer"]
    Services --> AdmissionSvc["Admissions engine<br/>workflow, merit, seats, documents"]
    Services --> AISvc["AI services<br/>embeddings, persona, quiz, proctor, audit"]
    Services --> PaySvc["Payment services<br/>Razorpay + fee flows"]
    Services --> NotifySvc["Notification/email services<br/>Brevo, push, digest"]
    Services --> RealtimeSvc["Realtime services<br/>Socket.io + Supabase broadcast"]
    Services --> StorageSvc["Storage/import/export services"]

    Controllers --> Mongo["MongoDB via Mongoose models"]
    Controllers --> Supabase["Supabase tables<br/>courses, assignments, results, exams,<br/>library, holidays, feedback, website"]
    Controllers --> Storage["Supabase Storage<br/>notes-files, assets, documents"]
    Controllers --> Vector["Supabase Vector/RPC<br/>syllabus_vectors, match_syllabus_chunks"]

    Mongo --> Models["server/src/models<br/>User, Organization, Classroom,<br/>Attendance, Admission, Fees,<br/>Canteen, Support, etc."]

    Services --> External["External providers"]
    External --> Brevo["Brevo SMTP"]
    External --> Razorpay["Razorpay"]
    External --> Firebase["Firebase push / OTP"]
    External --> AIProviders["OpenAI, Groq, Gemini OCR"]
    External --> AgoraGoogle["Agora, Google APIs"]

    HTTP --> Socket["Socket.io realtime channels"]
    API --> Workers["Background workers<br/>server/src/workers"]
    Workers --> Mongo
    Workers --> Supabase
    Workers --> NotifySvc
```

| # | Category | Module | Route file(s) | Model(s) used | Backend completion % | What is missing |
|---:|---|---|---|---|---:|---|
| 1 | Academic | Attendance System | `attendance.routes.js`, `attendance_dashboard.routes.js` | `AttendanceSession.js`, `AttendanceRecord.js`, `AttendanceAppeal.js`, `ClassroomMembership.js`, `Classroom.js`, `User.js`, `Notification.js`, `AdminAuditLog.js` | 90 | Export endpoint is stubbed. |
| 2 | Academic | Digital Classroom Management | `classroom.routes.js` | `Classroom.js`, `ClassroomMembership.js`, `ActivityLog.js`, `Notification.js`, `Organization.js`, `User.js` | 90 | No major backend gap found. |
| 3 | Academic | Automated Timetable | `timetable.routes.js` | `ClassroomMembership.js`, `User.js` | 70 | Manual CRUD exists; no auto-generator/optimizer. `Timetable.js` exists but route uses Supabase instead. |
| 4 | Academic | Academic Planning Tools | `academic-plan.routes.js` | `Classroom.js`, `ClassroomMembership.js` | 80 | Plan/unit/topic CRUD exists; no dedicated model file or progress engine. |
| 5 | Academic | Homework & Assignment | `assignment.routes.js` | `Classroom.js`, `ClassroomMembership.js`, `Notification.js`, `User.js` | 85 | Uses Supabase assignments; `Assignment.js` and `AssignmentSubmission.js` are not used here. |
| 6 | Academic | Student Notes Sharing | `notes.routes.js` | `NoteView.js`, `Quiz.js` | 85 | Upload/view/AI quiz exists; moderation/marketplace flow is split elsewhere. |
| 7 | Academic | Teacher Planner | `teacher-planner.routes.js` | `TeacherPlan.js`, `Classroom.js` | 80 | Planner CRUD exists; missing deeper recurrence/template workflow. |
| 8 | Academic | Subject Management | `course.routes.js`, `marks.routes.js` | `OrgSubject.js`, `Classroom.js`, `ClassroomMembership.js`, `ExamRecord.js`, `StudentMark.js`, `ResultAuditLog.js`, `Organization.js`, `User.js` | 75 | Subject APIs are split between courses and marks; no single subject module. |
| 9 | Academic | Course Management | `course.routes.js`, `hierarchy.routes.js` | `Classroom.js`, `User.js`, `AcademicHierarchy.js`, `Organization.js` | 88 | Strong CRUD/faculty assignment; mostly Supabase-backed, no Course model file. |
| 10 | Assessment | Online Exam Platform | `online-exam.routes.js` | `Classroom.js`, `User.js` | 90 | Full exam/attempt/proctoring flow; duplicate `verify-access` route exists. |
| 11 | Assessment | Examination Management | `exam.routes.js`, `examinations.routes.js` | None in `models/` | 78 | Two overlapping exam route systems; dashboard has approximations/fallback stats. |
| 12 | Assessment | Interactive Quiz Systems | `advanced_quiz.routes.js`, `quiz.routes.js` | `Classroom.js`, `ClassroomMembership.js`, `Notification.js`, `User.js`, `QuizSession.js` | 88 | Advanced quiz is solid; storage is mostly Supabase, not a dedicated quiz model. |
| 13 | Assessment | Grade Entry & Results | `marks.routes.js`, `result.routes.js` | `ExamRecord.js`, `StudentMark.js`, `ResultAuditLog.js`, `OrgSubject.js`, `Classroom.js`, `ClassroomMembership.js`, `Organization.js`, `User.js` | 85 | Marks/results are split across Mongo and Supabase result tables. |
| 14 | Assessment | Internal Assessment Tools | `internal-tests.routes.js` | `User.js` | 75 | Test/marks CRUD exists; no dedicated model file or advanced analytics. |
| 15 | Assessment | CET/JEE/NEET Exam Conduction | `online-exam.routes.js` | `Classroom.js`, `User.js`, `QuizSession.js` | 72 | Generic competitive exam support exists; no dedicated CET/JEE/NEET taxonomy/conduction module. |
| 16 | Assessment | Past Paper & Mock Tests | `past-paper.routes.js` | `PastPaper.js` via `past-paper-analysis.service.js` | 70 | Ingest/analyze/mock/list exists; route lacks auth/role guards. |
| 17 | Assessment | AI-Powered Viva | `viva.routes.js` | `VivaRecord.js`, `ClassroomMembership.js`, `User.js` | 85 | Initialize/evaluate/schedule/dashboard exists; still external-AI dependent. |
| 18 | Assessment | Test Series Management | `online-exam.routes.js` | `Classroom.js`, `User.js` | 70 | Implemented as `exam_mode = test_series`; no separate series/package model. |
| 19 | Management | Admission Management | `admission.routes.js` | `AdmissionApplication.js`, `AdmissionConfig.js`, `AdmissionOTP.js`, `CETAllotment.js`, `SeatConfig.js`, `AcademicHierarchy.js`, `FeeStructure.js`, `StudentFeeLedger.js`, `FeeTransaction.js`, `FeeRecord.js`, `Organization.js`, `User.js` | 95 | Very complete; mainly needs continued test hardening. |
| 20 | Management | Fee Collection System | `fees.routes.js`, `fee-records.routes.js` | `FeeRecord.js`, `Notification.js`, `Organization.js`, `User.js` | 80 | Fee logic is split; `fee.controller.js` ledger models are not mounted by routes. |
| 21 | Management | Staff Leave & Payroll | `leave.routes.js`, `payroll.routes.js` | `Classroom.js`, `ClassroomMembership.js`, `User.js`, `FacultyPayroll.js`, `FacultyBiometricLog.js` | 72 | Payroll exists; leave is mostly student/class leave, not full staff leave. |
| 22 | Management | Canteen Management | `canteen.routes.js` | `CanteenItem.js`, `CanteenOrder.js`, `Organization.js` | 90 | Menu/order/payment/queue/analytics exist; vendor/procurement not found. |
| 23 | Management | Digital Library Management | `library.routes.js` | `Notification.js`, `User.js` | 82 | Catalog/issue/return/reserve/analytics exist; no Library model file, fine payment not evident. |
| 24 | Management | Alumni Network | `alumni.routes.js` | `User.js` | 55 | Only alumni listing/status/docs/self-view; no directory, events, jobs, messaging network. |
| 25 | Advanced | AI Assistant | `ai.routes.js`, `thread_chat.routes.js` | `AttendanceRecord.js`, `QuizSession.js`, `StudentMark.js`, `User.js` | 65 | RAG/persona/chat helpers exist; route role uses `super-admin`, likely inconsistent with `super_admin`. |
| 26 | Advanced | Advanced Analytics | `analytics.routes.js`, `admin.routes.js` | `Assignment.js`, `AssignmentSubmission.js`, `AttendanceRecord.js`, `AttendanceSession.js`, `Classroom.js`, `User.js`, `VivaRecord.js` | 75 | Analytics are useful but distributed; no single advanced analytics service surface. |
| 27 | Advanced | Compliance Audit Trails | `audit.routes.js`, `admin.routes.js`, `super-admin.routes.js` | `AdminAuditLog.js`, `User.js`, `StudentMark.js`, `AttendanceSession.js`, `AttendanceRecord.js`, `FeeRecord.js`, `Timetable.js`, `Classroom.js`, `FeedbackResponse.js`, `NotePackage.js` | 75 | Compliance reports exist; immutable module-wide audit trail is partial. |
| 28 | Advanced | Digital Certificates | `certificate.routes.js` | `Classroom.js`, `ClassroomMembership.js` | 75 | Certificate CRUD/approval/analytics exists; no Certificate model, PDF/QR issuance not found. |
| 29 | Advanced | Holiday Management | `holidays.routes.js` | None in `models/` | 85 | Manual/sync/upcoming/today exists; recurrence/import depth unclear. |
| 30 | Advanced | Digital ID Cards | `org.routes.js` | `Organization.js` | 25 | Only ID card display config found; no ID card route/model/generation endpoint. |
| 31 | Advanced | Events Management | `events.routes.js` | None in `models/` | 80 | Event CRUD/list exists; no RSVP/ticketing/attendance workflow found. |
| 32 | Advanced | Feedback System | `feedback.routes.js` | `Classroom.js`, `User.js` | 88 | Forms/submissions/analytics/AI insights exist; Supabase-backed, feedback model files unused here. |
| 33 | Advanced | Institution Website | `org-website.routes.js`, `public.routes.js` | `OrgWebsiteContent.js`, `Organization.js`, `DemoRequest.js` | 85 | CMS/publish/public resolve exists; theme/media depth limited. |
| 34 | Dashboards | Admission Management Dashboard | `admission.routes.js` | `AdmissionApplication.js`, `AdmissionConfig.js`, `CETAllotment.js`, `SeatConfig.js`, `Organization.js`, `User.js` | 92 | `/analytics` and `/cet/dashboard` exist; tied to admission roles. |
| 35 | Dashboards | Fee Management Dashboard | `fees.routes.js`, `fee-records.routes.js` | `FeeRecord.js`, `Organization.js`, `User.js` | 80 | Analytics/summary exist; split fee systems reduce completeness. |
| 36 | Dashboards | Library Management Dashboard | `library.routes.js` | `Notification.js`, `User.js` | 80 | `/analytics` exists; no dedicated library model/fine payment dashboard. |
| 37 | Dashboards | Student Management Dashboard | `student.routes.js`, `student-profile.routes.js`, `org.routes.js`, `analytics.routes.js` | `User.js`, `DeviceVerification.js`, `AdmissionApplication.js`, `Organization.js`, `Classroom.js` | 65 | Student data pieces exist; no single dedicated student management dashboard route. |
| 38 | Dashboards | Faculty Management Dashboard | `org.routes.js`, `user.routes.js`, `payroll.routes.js`, `teacher-planner.routes.js` | `User.js`, `Organization.js`, `Classroom.js`, `FacultyPayroll.js`, `TeacherPlan.js` | 62 | Faculty pieces exist; no dedicated faculty dashboard aggregation route. |
| 39 | Dashboards | Organization Management Dashboard | `org.routes.js`, `admin.routes.js`, `super-admin.routes.js` | `Organization.js`, `User.js`, `Classroom.js`, `AdminAuditLog.js`, `OrganizationUsage.js`, `OrgSubscription.js`, `SystemLog.js` | 82 | Broad coverage; `/api/org-admin/dashboard` is still described as placeholder and helpdesk routes are duplicated. |
| 40 | Dashboards | Canteen Management Dashboard | `canteen.routes.js` | `CanteenItem.js`, `CanteenOrder.js`, `Organization.js` | 90 | `/analytics` and live queue exist; no major backend gap found. |
| 41 | Dashboards | Leave Management Dashboard | `leave.routes.js`, `analytics.routes.js` | `Classroom.js`, `ClassroomMembership.js`, `User.js`, `AttendanceRecord.js`, `AttendanceSession.js` | 78 | Summary/calendar/leave stats exist; staff leave is not fully covered. |
