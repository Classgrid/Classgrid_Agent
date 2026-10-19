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

# Classgrid Full Frontend Master Audit & Execution Chronology

## 🚀 CHRONOLOGY: Where & How to Start

Before building feature pages, the foundation must be laid down in this exact order to prevent refactoring:

### **Phase 1: Architecture & Foundation (Start Here)**
1. **Global CSS & Theme:** Setup `index.css` with Agora Console colors (`#0f0f0f` bg, `#171717` surface, `#2a2a2a` borders, square corners).
2. **Auth & Routing Guards:** Create `<ProtectedRoute>`, `<RoleGuard>`, and integrate with `useSWR` session state.
3. **Core Layout Shells:** 
   - `<DashboardSidebar>` (Dynamic, config-driven)
   - `<MobileTopBar>` and `<MobileBottomNav>`
   - `<UserCardDropdown>`
4. **Shared UI Components:** 
   - `<DataTable>` (search, pagination, export)
   - `<StatCard>`, `<PageHeader>`, `<Modal>`

### **Phase 2: Core Dashboards (The Shells)**
5. Build the **Super Admin** Dashboard Layout & Navigation.
6. Build the **Org Admin** Dashboard Layout & Navigation.
7. Build the **Faculty & Student** `/work` grid layout.
8. Scaffold the **Department-Specific** sidebars (Admissions, Fees, Exams, HR).

### **Phase 3: Department-by-Department Execution (Feature Build)**
*Build each department iteratively (List view -> Create form -> Detail view).*
9. **Batch 1:** Admissions Department
10. **Batch 2:** Fees & Accounts
11. **Batch 3:** Examination & Results
12. **Batch 4:** HR & Payroll
13. **Batch 5:** Attendance & Timetable
14. **Batch 6:** Library, Hostel, Transport
15. **Batch 7:** Core Faculty & Student interactive modules (AI, Chat, Marketplace).

---

## 📂 EXHAUSTIVE PAGE INVENTORY (300+ PAGES)

### 1. 🔥 SUPER ADMIN DASHBOARD
**Route Prefix:** `/superadmin`
1. `/superadmin/dashboard` (Main stats, MRR)
2. `/superadmin/analytics` (Platform growth graphs)
3. `/superadmin/alerts` (System health, API errors)
4. `/superadmin/orgs` (List all tenants)
5. `/superadmin/orgs/new` (Provision new tenant)
6. `/superadmin/orgs/[id]` (Tenant details)
7. `/superadmin/orgs/[id]/edit` (Edit tenant config)
8. `/superadmin/orgs/[id]/billing` (Tenant billing history)
9. `/superadmin/orgs/[id]/limits` (Tenant feature limits)
10. `/superadmin/leads` (Demo requests list)
11. `/superadmin/leads/[id]` (Lead details & conversion)
12. `/superadmin/billing` (Master revenue dashboard)
13. `/superadmin/billing/invoices` (Platform invoices)
14. `/superadmin/billing/plans` (Subscription plan builder)
15. `/superadmin/users` (Global user search)
16. `/superadmin/users/[id]` (User override & impersonation)
17. `/superadmin/audit` (Global security logs)
18. `/superadmin/announcements` (Create platform broadcast)
19. `/superadmin/changelog` (Manage release notes)
20. `/superadmin/config` (System toggles, maintenance mode)
21. `/superadmin/config/integrations` (AWS, Brevo, Razorpay keys)
22. `/superadmin/support` (L3 Ticket inbox)
23. `/superadmin/support/[id]` (Ticket resolution thread)
24. `/superadmin/feedback` (Feature request board)
25. `/superadmin/reviews` (NPS tracking)
26. `/superadmin/ai-prompts` (Master system prompts tuning)
27. `/superadmin/backups` (DB snapshot monitor)
28. `/superadmin/admins` (Internal staff access)

### 2. 🏫 ORG ADMIN DASHBOARD
**Route Prefix:** `/org`
29. `/org/dashboard` (Master stats overview)
30. `/org/announcements` (Org-wide notices)
31. `/org/announcements/new` (Create notice)
32. `/org/students` (Master student list)
33. `/org/students/[id]` (Student 360 profile)
34. `/org/faculty` (Master faculty list)
35. `/org/faculty/[id]` (Faculty 360 profile)
36. `/org/classrooms` (Class grid)
37. `/org/classrooms/new` (Create class)
38. `/org/classrooms/[id]` (Class details, assignments, members)
39. `/org/timetable` (Master schedule)
40. `/org/timetable/conflicts` (Conflict resolution view)
41. `/org/calendar` (Academic calendar map)
42. `/org/curriculum` (Program structures)
43. `/org/curriculum/new` (Add syllabus)
44. `/org/compliance/nba-naac` (Accreditation dashboard)
45. `/org/compliance/nba-naac/criteria-[id]` (Criteria upload)
46. `/org/compliance/reports` (Statutory PDF generator)
47. `/org/audit` (Org-level activity logs)
48. `/org/events` (Event planner)
49. `/org/events/[id]` (Event RSVPs)
50. `/org/alumni` (Alumni database)
51. `/org/feedback` (Course/Faculty feedback analytics)
52. `/org/chat` (Monitor channels)
53. `/org/ai` (AI usage tracking)
54. `/org/analytics` (BI charts)
55. `/org/website` (Public site CMS)
56. `/org/certificates` (Bulk issuance)
57. `/org/settings` (Master org config)
58. `/org/settings/branches` (Manage branches/departments)
59. `/org/settings/academic-years` (Manage sessions)
*(Plus read-only dashboard views for all departments below)*

### 3. 🎓 ADMISSION DEPARTMENT
**Route Prefix:** `/dept/admissions`
60. `/dept/admissions/dashboard` (Funnel overview)
61. `/dept/admissions/applications` (List view)
62. `/dept/admissions/applications/new` (Manual entry)
63. `/dept/admissions/applications/[id]` (Application details)
64. `/dept/admissions/applications/[id]/edit`
65. `/dept/admissions/documents` (Verification queue)
66. `/dept/admissions/documents/[id]` (Approval screen)
67. `/dept/admissions/merit` (Merit list generator)
68. `/dept/admissions/merit/publish` (Publish to students)
69. `/dept/admissions/enroll` (Final PRN generation)
70. `/dept/admissions/config` (General settings)
71. `/dept/admissions/fees` (Admission fee maps)
72. `/dept/admissions/schedule` (Round dates)
73. `/dept/admissions/form-builder` (Custom fields)
74. `/dept/admissions/analytics` (Demographic charts)
75. `/dept/admissions/export` (Custom CSV exports)
76. `/dept/admissions/cet-dte` (Govt format reports)
77. `/dept/admissions/crm` (Lead tracker)
78. `/dept/admissions/crm/[id]` (Lead follow-up)
79. `/dept/admissions/comm` (Email/SMS logs)
80. `/dept/admissions/bulk` (Mass communication)

### 4. 💰 FEES & ACCOUNTS DEPARTMENT
**Route Prefix:** `/dept/fees`
81. `/dept/fees/dashboard` (Collection summary)
82. `/dept/fees/collect` (Cash/Cheque POS)
83. `/dept/fees/transactions` (Master ledger)
84. `/dept/fees/transactions/[id]` (Transaction detail)
85. `/dept/fees/refunds` (Refund processing)
86. `/dept/fees/defaulters` (Pending dues list)
87. `/dept/fees/defaulters/notify` (Send reminders)
88. `/dept/fees/receipts` (Receipt printer queue)
89. `/dept/fees/structure` (Master fee heads)
90. `/dept/fees/structure/new` (Add fee head)
91. `/dept/fees/installments` (Payment plans)
92. `/dept/fees/scholarships` (Waivers)
93. `/dept/fees/late-rules` (Penalty logic)
94. `/dept/fees/analytics` (Revenue graphs)
95. `/dept/fees/export` (Tally/ERP export)
96. `/dept/fees/summary` (Class-wise totals)
97. `/dept/fees/reconciliation` (Gateway sync)
98. `/dept/fees/challan` (Bank challan generator)
99. `/dept/fees/invoices` (Bulk invoice tool)
100. `/dept/fees/fines` (Disciplinary fines)
101. `/dept/fees/settings` (Tax & gateway config)

### 5. 📝 EXAMINATION DEPARTMENT
**Route Prefix:** `/dept/exams`
102. `/dept/exams/dashboard` (Exam calendar)
103. `/dept/exams/schedule` (Master timetable)
104. `/dept/exams/create` (Define new exam)
105. `/dept/exams/manage/[id]` (Exam subjects/rules)
106. `/dept/exams/online` (Online MCQ dashboard)
107. `/dept/exams/online/create`
108. `/dept/exams/hall-tickets` (Generation tool)
109. `/dept/exams/marks` (Marks entry list)
110. `/dept/exams/marks/[examId]/[subjectId]` (Entry grid)
111. `/dept/exams/marks/bulk` (Excel upload)
112. `/dept/exams/results` (Calculation engine)
113. `/dept/exams/results/publish` (Publishing tool)
114. `/dept/exams/grades` (Transcript generator)
115. `/dept/exams/internal` (Continuous assessment)
116. `/dept/exams/questions` (Question bank)
117. `/dept/exams/questions/add` (Rich text editor)
118. `/dept/exams/ai-paper` (AI Generator)
119. `/dept/exams/past-papers` (Archive)
120. `/dept/exams/analytics` (Pass/Fail metrics)
121. `/dept/exams/export` (University formats)
122. `/dept/exams/toppers` (Merit lists)
123. `/dept/exams/revaluation` (Requests)
124. `/dept/exams/seating` (Arrangement logic)
125. `/dept/exams/invigilation` (Duty roster)
126. `/dept/exams/settings` (Grading scales)

### 6. 📚 LIBRARY DEPARTMENT
**Route Prefix:** `/dept/library`
127. `/dept/library/dashboard` (Circulation stats)
128. `/dept/library/books` (Master catalog)
129. `/dept/library/add` (Add book / ISBN scan)
130. `/dept/library/books/[id]` (Book copies/history)
131. `/dept/library/search` (OPAC search)
132. `/dept/library/issue` (Barcode checkout)
133. `/dept/library/return` (Barcode check-in)
134. `/dept/library/overdue` (Fines)
135. `/dept/library/history` (User reading logs)
136. `/dept/library/ebooks` (Digital library)
137. `/dept/library/journals` (Subscriptions)
138. `/dept/library/notes` (Org notes repo)
139. `/dept/library/analytics` (Usage metrics)
140. `/dept/library/stock` (Verification)

### 7. 📋 ATTENDANCE DEPARTMENT
**Route Prefix:** `/dept/attendance`
141. `/dept/attendance/dashboard` (Today's overview)
142. `/dept/attendance/mark` (Central marking)
143. `/dept/attendance/daily` (Absentee logs)
144. `/dept/attendance/monthly` (Aggregated reports)
145. `/dept/attendance/low` (Defaulters)
146. `/dept/attendance/notify` (Parent comms)
147. `/dept/attendance/classwise` (Heatmap)
148. `/dept/attendance/analytics` (Trends)
149. `/dept/attendance/export` (Registers)
150. `/dept/attendance/saral` (Compliance)
151. `/dept/attendance/leaves` (Approval queue)
152. `/dept/attendance/settings` (Working days config)

### 8. 📆 HR & PAYROLL DEPARTMENT
**Route Prefix:** `/dept/hr`
153. `/dept/hr/dashboard` (Staff headcount)
154. `/dept/hr/staff` (Directory)
155. `/dept/hr/staff/[id]` (Profile & Docs)
156. `/dept/hr/add-staff` (Onboarding)
157. `/dept/hr/departments` (Hierarchy)
158. `/dept/hr/leave-requests` (Approvals)
159. `/dept/hr/leave-policy` (Quotas)
160. `/dept/hr/leave-balance` (Tracking)
161. `/dept/hr/holidays` (Calendar)
162. `/dept/hr/payroll` (Processing run)
163. `/dept/hr/payslips` (Generation)
164. `/dept/hr/payroll-reports` (TDS, PF)
165. `/dept/hr/attendance` (Biometric logs)
166. `/dept/hr/appraisal` (Reviews)
167. `/dept/hr/settings` (Salary components)

### 9. 🏠 HOSTEL & TRANSPORT
**Route Prefix:** `/dept/hostel` & `/dept/transport`
168. `/dept/hostel/dashboard` (Occupancy)
169. `/dept/hostel/rooms` (Matrix)
170. `/dept/hostel/residents` (Directory)
171. `/dept/hostel/allocation` (Assignment)
172. `/dept/hostel/complaints` (Ticketing)
173. `/dept/hostel/mess` (Menu)
174. `/dept/hostel/passes` (Gate pass)
175. `/dept/transport/dashboard` (Fleet)
176. `/dept/transport/routes` (Mapping)
177. `/dept/transport/vehicles` (Maintenance)
178. `/dept/transport/passengers` (Subscribers)
179. `/dept/transport/attendance` (Boarding logs)
180. `/dept/transport/fees` (Collection)
181. `/dept/transport/tracking` (GPS)

### 10. 👨‍🏫 FACULTY DASHBOARD (Teacher View)
**Route Prefix:** Mixed (`/`, `/faculty`, `/modules`)
182. `/classrooms` (Home timeline)
183. `/work` (The 25-module Grid)
184. `/tools` (Schedule)
185. `/chat` (Messaging)
186. `/chat/[channelId]`
187. `/notifications` (Alerts)
188. `/forum` (Q&A)
189. `/forum/post/[id]`
190. `/classgrid-ai` (AI Assistant)
191. `/drive` (File storage)
192. `/virtual-id` (Digital ID card)
193. `/join-requests` (Classroom approvals)
194. `/whats-new` (Updates)
195. `/organization` (Directory)
196. `/platform-feedback` (Report bugs)
197. `/marketplace` (Notes store)
198. `/marketplace/upload`
199. `/faculty/my-class` (Student list)
200. `/faculty/my-roles` (Responsibilities)
201. `/assignments` (List)
202. `/assignments/new` (Create)
203. `/assignments/[id]` (Details/Grading)
204. `/modules/internal-test` (List)
205. `/modules/internal-test/new`
206. `/modules/internal-test/[id]` (Marks entry)
207. `/modules/academic-planning` (Syllabus tracking)
208. `/modules/certificate` (Approve requests)
209. `/modules/attendance` (Mark daily attendance)
210. `/modules/leave` (Apply for leave)
211. `/modules/events` (RSVP)
212. `/results` (Class performance)
213. `/modules/feedback` (View received feedback)
214. `/modules/timetable` (Weekly view)
215. `/modules/examination` (Invigilation schedule)
216. `/modules/quiz-manager` (List)
217. `/modules/quiz-manager/new`
218. `/modules/holidays` (Calendar)
219. `/modules/go-live` (Virtual classroom)
220. `/exam/online/builder` (MCQ builder)
221. `/exam/grading` (Subjective grading)
222. `/faculty/analytics` (Personal metrics)
223. `/canteen` (Order food)
224. `/profile` (Self profile)
225. `/profile/edit`
226. `/settings` (Preferences)

### 11. 🎓 STUDENT DASHBOARD
**Route Prefix:** Mixed (`/`, `/student`, `/modules`)
227. `/classrooms` (Home feed)
228. `/work` (The 23-module Grid)
229. `/tools` (Daily lectures)
230. `/chat` (Peer messaging)
231. `/chat/[channelId]`
232. `/notifications`
233. `/forum` (Discussions)
234. `/forum/post/new`
235. `/classgrid-ai` (Viva practice / Tutor)
236. `/virtual-id` (Digital ID)
237. `/marketplace` (Buy notes)
238. `/marketplace/item/[id]`
239. `/my-requests` (Track requests)
240. `/whats-new`
241. `/organization`
242. `/platform-feedback`
243. `/student/my-class` (Classmates)
244. `/assignments` (To-do list)
245. `/assignments/[id]` (Submit assignment)
246. `/modules/internal-test` (Upcoming & Marks)
247. `/modules/academic-planning` (Syllabus progress)
248. `/org/curriculum` (Degree structure)
249. `/modules/certificate` (Request documents)
250. `/modules/attendance` (Own attendance %)
251. `/modules/leave` (Apply sick leave)
252. `/modules/events` (Campus events)
253. `/results` (Mark-sheets)
254. `/modules/feedback` (Submit anonymous feedback)
255. `/modules/timetable` (Weekly schedule)
256. `/modules/examination` (Hall Ticket & Seating)
257. `/student/quizzes` (Attempt quiz)
258. `/student/quizzes/[id]` (Quiz interface)
259. `/modules/holidays`
260. `/modules/hostel` (Out-pass & Mess)
261. `/student/library` (Search & Due dates)
262. `/modules/fees` (Pay online)
263. `/modules/fees/receipt/[id]` (Download receipt)
264. `/canteen` (Pre-order food)
265. `/student/alumni` (Connect)
266. `/profile` (Own profile)
267. `/profile/onboarding` (13-step setup)
268. `/settings` (Password/Notifications)

### 12. 🔐 AUTHENTICATION & PUBLIC
**Route Prefix:** `/auth` & `/public`
269. `/auth/login`
270. `/auth/register` (For Orgs)
271. `/auth/forgot-password`
272. `/auth/reset-password`
273. `/auth/verify-email`
274. `/public/certificate-verify` (QR Code scanner)
275. `/public/careers`
276. `/public/admission-portal` (External student application)
277. `/public/admission-portal/status`
278. `/public/fee-payment` (Guest checkout)
279. `/public/alumni-register`
280. `/404` (Not Found)
281. `/403` (Forbidden)
282. `/500` (Server Error)

### 13. ⚙️ COMMON SHARED PAGES & MODALS (Renders across roles)
283. `ImageCropperModal`
284. `PDFViewerPage`
285. `DocumentUploaderComponent`
286. `PaymentGatewayCheckout`
287. `SuccessStateOverlay`
288. `ErrorStateOverlay`
289. `EmptyStatePlaceholder`
290. `RichTextEditorComponent`
291. `MathEquationEditor`
292. `CSVImportMappingWizard`
293. `PrintableInvoiceTemplate`
294. `PrintableHallTicketTemplate`
295. `PrintableGradeSheetTemplate`
296. `PrintableIDCardTemplate`
297. `QRScannerModal`
298. `VideoPlayerComponent` (For recorded lectures)
299. `AudioRecorderModal` (For AI Viva)
300. `RoleSwitcherView` (For multi-role users)

*(Total uniquely addressable frontend routes/views: **300**)*

---

## 📅 Classgrid Frontend Rebuild Master Timeline (6 Weeks)
*Est. Total Time: ~42 Days*

| Order | Phase / Module | Scope | Key Deliverables | Est. Time |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Foundation & Architecture** | 18 Views | `index.css` Agora tokens, `<DashboardSidebar>`, `<TopBar>`, Auth Guards, `<DataTable>`, Master Layouts | **3 Days** |
| **2** | **Auth & Public Portals** | 14 Pages | Login, Org Registration, Public Verification, External Admission Portal | **2 Days** |
| **3** | **Admissions Department** | 21 Pages | Lead Pipeline, Document Verification, Merit Lists, Form Builder, Enrollment | **3 Days** |
| **4** | **Fees & Accounts** | 21 Pages | POS Collection terminal, Master Ledger, Razorpay Sync, Fines, Invoices | **3 Days** |
| **5** | **Super & Org Admin Core** | 59 Pages | Tenant Management, Billing, Accreditation (NBA/NAAC), Master Directories | **7 Days** |
| **6** | **Examination & Results** | 25 Pages | Online MCQ Engine, Grade Sheets, Hall Tickets, Revaluations | **4 Days** |
| **7** | **HR & Attendance** | 27 Pages | Staff Directory, Leave Workflows, Payroll Runs, Class-wise Absentee tracking | **4 Days** |
| **8** | **Library, Hostel, Transport** | 28 Pages | Book Circulation, Mess Menus, Room Allocation, Bus Routes | **4 Days** |
| **9** | **Faculty Console** | 45 Pages | `/work` Grid, Grading Assignments, Virtual Classrooms, Lesson Planning | **6 Days** |
| **10** | **Student Console** | 42 Pages | AI Viva Practice, Notes Marketplace, Fee Payments, Viewing Results | **6 Days** |
