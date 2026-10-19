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

# Classgrid Detailed Page Inventory (Part 1 of 3)

This document contains the detailed 2-3 line breakdown for the first 101 pages of the platform (Super Admin, Org Admin, Admissions, and Fees).

---

## 1. 🔥 SUPER ADMIN DASHBOARD (28 Pages)
**1. `/superadmin/dashboard`**
Main landing page for platform owners. Displays high-level KPIs like total active organizations, platform MRR, and new user signups. 

**2. `/superadmin/analytics`**
Deep dive into platform growth metrics. Includes charts for daily active users (DAU), infrastructure usage, and feature adoption across all tenants.

**3. `/superadmin/alerts`**
System health monitor. Shows real-time API error rates, failed background jobs, and security breach attempts across the platform.

**4. `/superadmin/orgs`**
Master list of all registered tenants (schools/colleges). Includes search, filter by plan, and quick actions to suspend or email org admins.

**5. `/superadmin/orgs/new`**
Wizard for provisioning a new tenant. Sets up the initial database schema, default admin account, and selects the subscription plan.

**6. `/superadmin/orgs/[id]`**
Detailed 360-degree view of a specific tenant. Shows their usage metrics, active modules, key contacts, and recent audit logs.

**7. `/superadmin/orgs/[id]/edit`**
Configuration screen for a tenant. Allows super admins to manually toggle specific feature modules on/off for this specific organization.

**8. `/superadmin/orgs/[id]/billing`**
Tenant-specific billing history. Lists past invoices, current subscription status, and allows manual credit/discount application.

**9. `/superadmin/orgs/[id]/limits`**
Resource allocation limits for the tenant. Configures max storage, max SMS credits, and max AI tokens allowed per month.

**10. `/superadmin/leads`**
CRM view for inbound "Request Demo" submissions from the public website. Shows lead contact info, institution size, and status (New, Contacted, Converted).

**11. `/superadmin/leads/[id]`**
Detail page for a specific lead. Includes a rich text note area for sales calls and a one-click "Convert to Org" button.

**12. `/superadmin/billing`**
Master revenue dashboard. Aggregates all Stripe/Razorpay payments into monthly revenue run-rates and churn metrics.

**13. `/superadmin/billing/invoices`**
Global ledger of all invoices issued by Classgrid to its tenants. Includes options to resend invoices or download PDFs.

**14. `/superadmin/billing/plans`**
Subscription tier builder (e.g., Free, Pro, Enterprise). Defines the pricing, included features, and limits for each tier.

**15. `/superadmin/users`**
Global search across all 8000+ users on the platform regardless of organization. Useful for tracking down specific support requests.

**16. `/superadmin/users/[id]`**
User detail view with impersonation capability. Allows a super admin to "log in as" the user to debug specific UI issues they are facing.

**17. `/superadmin/audit`**
Immutable global security log. Tracks sensitive actions across the platform like mass deletions, role changes, and failed login spikes.

**18. `/superadmin/announcements`**
Broadcast tool to send messages to all users or specific roles (e.g., "All Faculty"). Shows as an in-app banner or push notification.

**19. `/superadmin/changelog`**
Release notes manager. Allows the team to draft, format (markdown), and publish new feature updates to the platform's "What's New" feed.

**20. `/superadmin/config`**
Master system toggles. Includes the ability to put the entire platform into "Maintenance Mode" with a custom message.

**21. `/superadmin/config/integrations`**
API key management. Secure vault to input production keys for Brevo (email), AWS S3 (storage), Razorpay, and Groq (AI).

**22. `/superadmin/support`**
L3 Support ticketing inbox. Consolidates unresolved or escalated tickets from Org Admins that require engineering attention.

**23. `/superadmin/support/[id]`**
Chat-style thread for a specific support ticket. Includes internal notes invisible to the customer and resolution status toggles.

**24. `/superadmin/feedback`**
Feature request board aggregating feedback from all users. Allows super admins to upvote, categorize, and mark requests as "Planned" or "Shipped."

**25. `/superadmin/reviews`**
Net Promoter Score (NPS) tracker. Displays historical sentiment analysis of the platform based on quarterly in-app surveys.

**26. `/superadmin/ai-prompts`**
Control panel for adjusting the system prompts used by Classgrid AI. Allows tweaking the persona for Viva generation or exam grading globally.

**27. `/superadmin/backups`**
Database snapshot monitor. Verifies that nightly Postgres/Mongo backups succeeded and shows total storage footprint.

**28. `/superadmin/admins`**
Internal team access control. Manages other Classgrid employees, assigning them specific sub-roles like "Support Agent" or "Sales."

---

## 2. 🏫 ORG ADMIN DASHBOARD (31 Pages)
**29. `/org/dashboard`**
The Principal's master view. Aggregates total students, today's overall attendance %, total fees collected, and pending admission pipeline.

**30. `/org/announcements`**
Notice board manager for the institution. Admins can view active notices and their read-receipt percentages among students/staff.

**31. `/org/announcements/new`**
Rich text editor to draft a new notice. Includes target audience selectors (e.g., "Only First Year IT Students" or "All Faculty").

**32. `/org/students`**
Master directory of all enrolled students. Includes a powerful data table with filters for branch, division, status, and fee defaulters.

**33. `/org/students/[id]`**
Complete 360-degree student profile. Shows academic history, attendance heatmap, paid/pending fees, and disciplinary records in one place.

**34. `/org/faculty`**
Master directory of all teaching and non-teaching staff. Shows their current department, assigned subjects, and employment status.

**35. `/org/faculty/[id]`**
Complete faculty profile. Displays their timetable, subjects taught, average feedback rating from students, and leave balance.

**36. `/org/classrooms`**
Grid view of all active digital classrooms (batches/divisions). Shows the assigned class teacher and total student count for each.

**37. `/org/classrooms/new`**
Form to provision a new classroom. Requires selecting the academic year, branch, semester, subject, and assigning a primary teacher.

**38. `/org/classrooms/[id]`**
Deep dive into a specific classroom. Admins can view the syllabus completion progress, recent assignments, and student roster.

**39. `/org/timetable`**
Master institutional schedule viewer. A massive grid showing what every class and every teacher is doing at any given hour.

**40. `/org/timetable/conflicts`**
Automated conflict resolution view. Flags instances where a teacher is double-booked or a room is assigned to two classes simultaneously.

**41. `/org/calendar`**
Academic calendar mapper. Visual calendar to define semester start/end dates, exam weeks, and institutional holidays.

**42. `/org/curriculum`**
Program structure definition tool. Defines the hierarchy of Degrees -> Branches -> Semesters -> Subjects required for graduation.

**43. `/org/curriculum/new`**
Interface to add a new subject to the curriculum. Defines credits, max marks for internal/external exams, and pre-requisites.

**44. `/org/compliance/nba-naac`**
Accreditation tracker dashboard. Shows progress bars for the 7 standard NAAC/NBA criteria based on data auto-aggregated from the platform.

**45. `/org/compliance/nba-naac/criteria-[id]`**
Detailed view of a specific accreditation criterion (e.g., "Teaching-Learning"). Allows uploading manual evidence PDFs to supplement platform data.

**46. `/org/compliance/reports`**
Statutory PDF generator. One-click generation of mandatory govt reports like SARAL (Maharashtra) or AICTE compliance datasets.

**47. `/org/audit`**
Institution-level activity log. Tracks when faculty delete grades, when fees are refunded, or when student records are modified.

**48. `/org/events`**
Campus event planner. Calendar view of upcoming seminars, cultural fests, and guest lectures across the institution.

**49. `/org/events/[id]`**
Event detail page. Shows the description, venue, timeline, and a list of students/staff who have RSVP'd.

**50. `/org/alumni`**
Alumni database. Directory of graduated students, their current companies, and tools to organize reunion events.

**51. `/org/feedback`**
Analytics view of course and faculty feedback. Aggregates anonymous student surveys into actionable scores and identifies low-performing areas.

**52. `/org/chat`**
Oversight of organizational communication. Allows admins to broadcast to all channels or intervene in flagged disciplinary chat issues.

**53. `/org/ai`**
AI usage monitor. Tracks how many tokens students are consuming for Viva practice and faculty for paper generation, mapping to the org's quota.

**54. `/org/analytics`**
Deep Business Intelligence charts. Custom graphs plotting year-over-year admission growth, revenue trends, and academic performance averages.

**55. `/org/website`**
Public website CMS portal. Allows admins to update the institution's public homepage banner, news ticker, and "About Us" text.

**56. `/org/certificates`**
Bulk certificate issuance tool. Interface to batch-generate and digitally sign Bonafide certificates, Leaving Certificates, and Transcripts.

**57. `/org/settings`**
Master configuration for the organization. Controls the institutional logo, primary contact details, and default timezone.

**58. `/org/settings/branches`**
Department management. Allows adding or renaming physical departments (e.g., "Computer Science", "Mechanical Engineering").

**59. `/org/settings/academic-years`**
Session manager. Controls the active academic year and allows rolling over data from the previous year to the new one.

---

## 3. 🎓 ADMISSION DEPARTMENT (21 Pages)
**60. `/dept/admissions/dashboard`**
Admission pipeline overview. Visual funnel showing the drop-off rate from "Applied" -> "Verified" -> "Merit List" -> "Enrolled".

**61. `/dept/admissions/applications`**
Data table of all inbound applications. Includes quick filters to view only "Pending Verification" or "Rejected" forms.

**62. `/dept/admissions/applications/new`**
Manual data entry form. Used by clerks to input application data for students who walk into the campus offline.

**63. `/dept/admissions/applications/[id]`**
Comprehensive view of a single application. Shows the student's background, uploaded documents, and current phase in the admission cycle.

**64. `/dept/admissions/applications/[id]/edit`**
Correction interface. Allows admission officers to fix typos or update incorrect details submitted by the applicant.

**65. `/dept/admissions/documents`**
High-speed verification queue. A split-screen UI showing the student's uploaded PDF on one side and "Approve/Reject" buttons on the other.

**66. `/dept/admissions/documents/[id]`**
Specific document review screen. Allows the officer to add a rejection reason (e.g., "Blurry image") which triggers an SMS to the student.

**67. `/dept/admissions/merit`**
Merit list generation engine. Configurable tool that ranks verified applications based on entrance scores or previous academic percentages.

**68. `/dept/admissions/merit/publish`**
Publishing interface. Moves the generated merit list to the public portal and triggers congratulatory emails to selected students.

**69. `/dept/admissions/enroll`**
Final stage of admission. Converts an "Applicant" into a "Student", generates their official PRN/Roll No, and creates their platform login.

**70. `/dept/admissions/config`**
Global admission rules. Configures minimum cut-off marks, total intake capacity per branch, and reservation quotas (e.g., Caste, Management).

**71. `/dept/admissions/fees`**
Mapping fee structures to admission types. Defines what fee template applies to a "General Category" vs "Scholarship" admission.

**72. `/dept/admissions/schedule`**
Round management. Sets the start and end dates for CAP Round 1, Round 2, and Spot rounds, automatically opening/closing the public form.

**73. `/dept/admissions/form-builder`**
Drag-and-drop builder for the public application form. Allows adding custom fields like "Do you need hostel accommodation?".

**74. `/dept/admissions/analytics`**
Demographic reporting. Pie charts showing applicant breakdown by gender, state, previous board, and category.

**75. `/dept/admissions/export`**
Custom CSV exporter. Allows selecting specific application fields to dump into a spreadsheet for offline processing.

**76. `/dept/admissions/cet-dte`**
Government compliance tool. Auto-formats the enrolled student list to exactly match the upload requirements of state admission bodies (like DTE).

**77. `/dept/admissions/crm`**
Lead tracking pipeline. A Kanban board for counselors to track prospective students who inquired but haven't applied yet.

**78. `/dept/admissions/crm/[id]`**
Lead interaction history. Logs every phone call, email, and campus visit made by the prospective student.

**79. `/dept/admissions/comm`**
Communication audit log. A table showing every automated email and SMS sent out by the admission module and its delivery status.

**80. `/dept/admissions/bulk`**
Mass communication tool. Allows sending a custom SMS blast to a specific segment (e.g., "All students pending document upload").

---

## 4. 💰 FEES & ACCOUNTS DEPARTMENT (21 Pages)
**81. `/dept/fees/dashboard`**
Financial health overview. Large metric cards showing "Total Expected", "Total Collected", and "Total Deficit" for the current academic year.

**82. `/dept/fees/collect`**
Fast Point-of-Sale (POS) terminal. Optimized for accountants to rapidly search a student, enter a cash/cheque amount, and print a receipt instantly.

**83. `/dept/fees/transactions`**
Master chronological ledger. Lists every successful and failed payment attempt across online and offline methods.

**84. `/dept/fees/transactions/[id]`**
Detailed view of a single transaction. Shows gateway payment IDs, cheque clearance status, and exact fee heads credited.

**85. `/dept/fees/refunds`**
Refund processing workflow. Interface to log returned fees for cancelled admissions or double payments, updating the master ledger.

**86. `/dept/fees/defaulters`**
Pending dues list. Automatically lists all students who have missed an installment deadline, sorted by amount owed.

**87. `/dept/fees/defaulters/notify`**
Automated reminder tool. One-click action to send "Fee Overdue" warnings via SMS and Email to the parents of all defaulters.

**88. `/dept/fees/receipts`**
Receipt printer queue. Allows accountants to batch-print thermal or A4 PDF receipts for all transactions that occurred today.

**89. `/dept/fees/structure`**
Master fee head configuration. Defines individual components like "Tuition Fee", "Library Fee", "Development Fee" and their amounts.

**90. `/dept/fees/structure/new`**
Builder to group fee heads into a master "Template" (e.g., "First Year IT - Open Category").

**91. `/dept/fees/installments`**
Payment plan manager. Allows splitting a master fee template into 2 or 3 scheduled installments with specific due dates.

**92. `/dept/fees/scholarships`**
Waiver management. Interface to apply percentage or flat-amount discounts to specific students (e.g., EBC, Freeship).

**93. `/dept/fees/late-rules`**
Penalty logic configuration. Sets rules like "Add ₹50 per day after due date" which auto-calculates on the student's payment portal.

**94. `/dept/fees/analytics`**
Revenue forecasting and graphs. Visualizes month-over-month collection trends to predict cash flow.

**95. `/dept/fees/export`**
Tally/ERP export tool. Generates specifically formatted CSVs that can be directly imported into traditional accounting software.

**96. `/dept/fees/summary`**
Class-wise aggregated reports. Shows total collection efficiency per division (e.g., "Class 10A has paid 92% of fees").

**97. `/dept/fees/reconciliation`**
Gateway sync tool. Compares Razorpay/Stripe payouts with internal records to identify discrepancies or pending settlements.

**98. `/dept/fees/challan`**
Bank challan generator. Creates printable triplicate PDFs for students who prefer to pay directly at the bank branch.

**99. `/dept/fees/invoices`**
Bulk invoice generator. Triggers the creation of official tax invoices at the start of the year for all enrolled students.

**100. `/dept/fees/fines`**
Disciplinary fine management. Allows charging ad-hoc fees to specific students for lost ID cards, broken equipment, or late library books.

**101. `/dept/fees/settings`**
Module configuration. Stores Razorpay API keys, enables/disables specific payment methods, and customizes the PDF receipt template.
