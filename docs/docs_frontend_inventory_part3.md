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

# Classgrid Detailed Page Inventory (Part 3 of 3)

This document contains the detailed 2-3 line breakdown for pages 227 to 300, covering the Student Dashboard, Authentication, Public Portals, and Global Shared Components.

---

## 11. 🎓 STUDENT DASHBOARD (42 Pages)
**227. `/classrooms`**
The Student Home Feed. An engaging timeline showing announcements from their teachers, newly posted assignments, and upcoming deadlines.

**228. `/work`**
The core navigation hub. A visual grid of 23 app-like icons (similar to the Faculty view) providing access to all their academic tools.

**229. `/tools`**
Daily organizer. A clean view showing the student's lectures for the day, which room they are in, and any assignments due by midnight.

**230. `/chat`**
Peer messaging hub. Allows direct messaging with classmates and participating in official group chats monitored by teachers.

**231. `/chat/[channelId]`**
Specific chat thread view. Used to discuss group projects or ask peers for help with homework.

**232. `/notifications`**
Alert center. Crucial push notifications for result declarations, fee deadlines, or rescheduled lectures.

**233. `/forum`**
Academic discussion boards. Where students ask public questions about subjects and receive answers from peers or faculty.

**234. `/forum/post/new`**
Question submission form. Allows attaching screenshots of difficult math problems or code snippets to ask for help.

**235. `/classgrid-ai`**
The AI Tutor. A powerful interface where students can practice Viva questions via voice or ask the AI to explain complex concepts from the syllabus.

**236. `/virtual-id`**
Digital ID card. Displays a scannable barcode and their photo, acting as a valid entry pass if they forget their physical ID card.

**237. `/marketplace`**
The Notes Store. Where students can browse, purchase, and instantly download premium study materials uploaded by top faculty.

**238. `/marketplace/item/[id]`**
Product page for notes. Shows a preview of the document, user reviews, and a Razorpay checkout button to buy it.

**239. `/my-requests`**
Request tracker. Shows the approval status of things they applied for, like a Bonafide certificate or an out-pass.

**240. `/whats-new`**
Platform updates. Keeps students informed about new features in the Classgrid app.

**241. `/organization`**
Institution directory. Helps new students figure out who the HODs are and how to contact the administrative office.

**242. `/platform-feedback`**
App bug reporting. Allows students to send technical issues directly to the Classgrid dev team.

**243. `/student/my-class`**
Classmates directory. Shows a list of everyone in their specific division/batch to foster networking.

**244. `/assignments`**
The To-Do List. A Kanban-style view showing assignments categorized as "Pending", "Submitted", and "Graded".

**245. `/assignments/[id]`**
Submission interface. Where the student uploads their PDF/Word document homework and views the teacher's grading feedback.

**246. `/modules/internal-test`**
Unit test tracker. Shows the schedule for upcoming class tests and the marks obtained in previous ones.

**247. `/modules/academic-planning`**
Syllabus progress viewer. Allows students to see exactly how much of the syllabus has been covered by the teacher so far.

**248. `/org/curriculum`**
Degree structure. A reference guide showing all the subjects they will study across their entire 4-year degree.

**249. `/modules/certificate`**
Document request form. A self-service portal to apply for official college letters (e.g., for a bank loan or railway concession).

**250. `/modules/attendance`**
Attendance tracker. A critical dashboard showing their current attendance percentage, alerting them if they are falling below the 75% threshold.

**251. `/modules/leave`**
Leave application. Where a student submits a medical certificate and requests an official excused absence.

**252. `/modules/events`**
Campus life hub. Browsing upcoming cultural fests, hackathons, and guest lectures to RSVP.

**253. `/results`**
The Mark-sheet Viewer. A highly anticipated page where students check their final semester SGPA and download their digital transcripts.

**254. `/modules/feedback`**
Anonymous survey tool. At the end of the semester, students use this to rate their teachers' effectiveness.

**255. `/modules/timetable`**
The weekly schedule. A visual grid of all their lectures and lab sessions for the week.

**256. `/modules/examination`**
Exam prep hub. Where they download their official Hall Ticket and check their seating arrangement (Room/Bench No.) before an exam.

**257. `/student/quizzes`**
Live learning tool. Where they join active, gamified MCQ quizzes launched by the teacher during a lecture.

**258. `/student/quizzes/[id]`**
The active quiz interface. A fast-paced UI with a countdown timer for answering questions.

**259. `/modules/holidays`**
Reference calendar. Checking upcoming institutional holidays to plan vacations.

**260. `/modules/hostel`**
Residential hub. Where hostel students view the mess menu, apply for weekend gate passes, or report maintenance issues.

**261. `/student/library`**
OPAC interface. Searching the library catalog to see if a textbook is available, and checking the due dates of books they've borrowed.

**262. `/modules/fees`**
Financial portal. Shows exactly how much tuition fee is pending and provides an online payment gateway to clear dues.

**263. `/modules/fees/receipt/[id]`**
Receipt downloader. Generates PDF receipts for past payments required for tax or educational loan purposes.

**264. `/canteen`**
Food pre-ordering. Browsing the cafeteria menu and paying online so their lunch is ready to pick up between classes.

**265. `/student/alumni`**
Networking hub. Connecting with graduated seniors who are working at companies they want to apply to.

**266. `/profile`**
Personal profile. Viewing their academic record, uploaded KYC documents, and basic info.

**267. `/profile/onboarding`**
The 13-step setup. The initial, gamified flow a student goes through when logging in for the very first time to complete their profile.

**268. `/settings`**
App preferences. Managing push notification settings, dark mode preferences, and changing passwords.

---

## 12. 🔐 AUTHENTICATION & PUBLIC (14 Pages)
**269. `/auth/login`**
The main entry point. Handles email/password and Google OAuth logins for all 8000+ users.

**270. `/auth/register`**
Self-serve onboarding. Where new institutions sign up for a Classgrid trial account.

**271. `/auth/forgot-password`**
Recovery flow. Requests a password reset link via email.

**272. `/auth/reset-password`**
The secure page where the user inputs their new password using the emailed token.

**273. `/auth/verify-email`**
Security checkpoint. Forces users to verify their email address before accessing the platform.

**274. `/public/certificate-verify`**
QR Code scanner page. An open page where employers can scan a QR code on a student's certificate to verify it is genuine.

**275. `/public/careers`**
Classgrid's corporate hiring page.

**276. `/public/admission-portal`**
External student application. The branded portal where high school students apply to join the college.

**277. `/public/admission-portal/status`**
Tracking page. Where applicants log in to see if their admission was approved or rejected.

**278. `/public/fee-payment`**
Guest checkout. An unauthenticated page where parents can pay fees directly by just entering the student's PRN.

**279. `/public/alumni-register`**
Registration page. For old students who graduated before Classgrid was installed to create their alumni profile.

**280. `/404`**
"Not Found" error page. Friendly UI for broken links.

**281. `/403`**
"Forbidden" error page. Shown when a student tries to access an Admin URL.

**282. `/500`**
"Server Error" page. The fallback UI if the API goes down.

---

## 13. ⚙️ COMMON SHARED PAGES & MODALS (18 Complex Views)
*These are not single URLs, but massive full-screen components that act like pages and must be built globally.*

**283. `ImageCropperModal`**
UI for cropping profile pictures or signatures to the exact aspect ratio required before upload.

**284. `PDFViewerPage`**
Built-in document reader. Prevents students from having to download PDFs to read assignments or notes.

**285. `DocumentUploaderComponent`**
Robust upload widget. Handles drag-and-drop, progress bars, and file size/type validation.

**286. `PaymentGatewayCheckout`**
The secure overlay integrating Razorpay/Stripe UI for fee collection.

**287. `SuccessStateOverlay`**
Animated full-screen success checkmark shown after major actions (like submitting an exam).

**288. `ErrorStateOverlay`**
Animated failure UI explaining why an action was blocked.

**289. `EmptyStatePlaceholder`**
Beautiful graphics shown when a table or list has no data (e.g., "No assignments due today!").

**290. `RichTextEditorComponent`**
The WYSIWYG editor used everywhere from drafting notices to asking forum questions.

**291. `MathEquationEditor`**
A specialized LaTeX visual editor used by faculty to write complex math equations in exam questions.

**292. `CSVImportMappingWizard`**
A 3-step UI that allows admins to upload an Excel file and map its columns to database fields.

**293. `PrintableInvoiceTemplate`**
A hidden, print-optimized HTML structure for rendering tax invoices.

**294. `PrintableHallTicketTemplate`**
A print-optimized layout that fits exactly 2 admit cards on an A4 sheet.

**295. `PrintableGradeSheetTemplate`**
A highly complex HTML table structure mimicking the exact physical layout of university mark-sheets.

**296. `PrintableIDCardTemplate`**
A specialized layout for batch-printing physical PVC ID cards.

**297. `QRScannerModal`**
A component that accesses the device camera to scan barcodes for library books or ID cards.

**298. `VideoPlayerComponent`**
Custom video player for recorded lectures, preventing right-click downloads.

**299. `AudioRecorderModal`**
A specialized interface used in the AI Viva module, recording the student's voice and showing audio waveforms.

**300. `RoleSwitcherView`**
An overlay for users who hold multiple roles (e.g., a Faculty member who is also a parent/student), allowing them to instantly swap dashboards.
