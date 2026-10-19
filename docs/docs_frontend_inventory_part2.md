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

# Classgrid Detailed Page Inventory (Part 2 of 3)

This document contains the detailed 2-3 line breakdown for pages 102 to 226, covering Examination, Library, Attendance, HR, Hostel, and the massive Faculty Console.

---

## 5. 📝 EXAMINATION DEPARTMENT (25 Pages)
**102. `/dept/exams/dashboard`**
Real-time control center for ongoing exams. Shows how many students are currently taking active online exams and processing status of offline marks.

**103. `/dept/exams/schedule`**
Master timetable view for all term exams. Allows officers to drag-and-drop exams to avoid overlap for students with backlogs.

**104. `/dept/exams/create`**
Setup wizard for a new exam block (e.g., "Mid-Term 2026"). Defines the date range, allowed branches, and max marks.

**105. `/dept/exams/manage/[id]`**
Deep dive into a specific exam block. Officers map specific subjects to specific days and set rules for passing criteria.

**106. `/dept/exams/online`**
Dashboard specifically for computer-based MCQ testing. Shows active server load, cheating flagged events, and completion rates.

**107. `/dept/exams/online/create`**
Builder for online tests. Allows importing questions from the Question Bank and setting time limits and browser-lockdown rules.

**108. `/dept/exams/hall-tickets`**
Bulk generation tool for admit cards. Automatically excludes students with fee dues or attendance shortages from receiving a ticket.

**109. `/dept/exams/marks`**
Centralized marks entry hub. Lists all subjects and shows which faculty members have completed grading vs who is pending.

**110. `/dept/exams/marks/[examId]/[subjectId]`**
The actual spreadsheet-like grid for entering marks. Optimized for fast numeric keyboard entry with auto-save functionality.

**111. `/dept/exams/marks/bulk`**
CSV/Excel import tool. Allows faculty to grade papers offline, fill out a template, and upload thousands of marks instantly.

**112. `/dept/exams/results`**
The heavy computation engine. One click calculates SGPA/CGPA across all students based on the entered marks and grading scale.

**113. `/dept/exams/results/publish`**
Release control. Pushes the calculated results to the Student Dashboard and triggers push notifications that "Results are out!".

**114. `/dept/exams/grades`**
Transcript generator. Renders official, university-format grade sheets ready for batch printing and physical stamping.

**115. `/dept/exams/internal`**
Continuous assessment tracker. Aggregates assignments, quizzes, and vivas into a final "Internal Mark" to merge with the final exam.

**116. `/dept/exams/questions`**
Master institutional Question Bank. Categorizes thousands of questions by subject, unit, difficulty, and cognitive level (Bloom's Taxonomy).

**117. `/dept/exams/questions/add`**
Rich content editor for questions. Supports complex LaTeX math equations, code blocks, and image uploads for diagrams.

**118. `/dept/exams/ai-paper`**
AI-driven paper assembly. The officer selects a subject and difficulty curve, and the AI drafts a balanced 100-mark paper instantly from the bank.

**119. `/dept/exams/past-papers`**
Digital archive of previous years' papers. Categorized securely so students can access them for revision through their portal.

**120. `/dept/exams/analytics`**
Post-exam autopsy. Charts showing subject-wise pass percentages, identifying abnormally hard papers or grading discrepancies.

**121. `/dept/exams/export`**
University compliance export. Formats the final results into the exact proprietary format required by the state university for affiliation.

**122. `/dept/exams/toppers`**
Merit list generator. Automatically identifies rank holders for the entire batch, branch-wise, and subject-wise for award ceremonies.

**123. `/dept/exams/revaluation`**
Workflow for photocopy and re-checking requests. Tracks student payments for revaluation and assigns the paper to a new blind reviewer.

**124. `/dept/exams/seating`**
Physical exam arrangement logic. Auto-assigns roll numbers to specific benches in specific rooms, ensuring students from the same class don't sit together.

**125. `/dept/exams/invigilation`**
Faculty duty roster. Distributes exam supervision duties evenly among staff and tracks their acceptance of the schedule.

**126. `/dept/exams/settings`**
The mathematical core. Where admins define the grading scale (e.g., 90-100 = O, 80-89 = A+) and formula for CGPA calculation.

---

## 6. 📚 LIBRARY DEPARTMENT (14 Pages)
**127. `/dept/library/dashboard`**
Librarian's home screen. Shows real-time counts of books currently issued, books due today, and total fines collected.

**128. `/dept/library/books`**
Master catalog database. Lists every physical asset with filters for author, publisher, and genre.

**129. `/dept/library/add`**
Rapid intake form. Connects to the Google Books API so scanning an ISBN auto-fills the cover, author, and description.

**130. `/dept/library/books/[id]`**
Asset detail view. Shows the physical location (Rack/Shelf) and tracks the condition and history of every barcode copy.

**131. `/dept/library/search`**
Advanced OPAC (Online Public Access Catalog). The interface students use on library kiosks to find if a book is available.

**132. `/dept/library/issue`**
Lightning-fast checkout POS. The librarian scans the student ID barcode, then the book barcode, instantly associating them.

**133. `/dept/library/return`**
Check-in POS. Scanning the returned book instantly clears it from the student's account and calculates any late fines owed.

**134. `/dept/library/overdue`**
Defaulters list. Automatically generates a list of students holding overdue books and allows sending bulk email reminders.

**135. `/dept/library/history`**
Audit log. Searchable database of every book ever issued, useful for resolving disputes about returned assets.

**136. `/dept/library/ebooks`**
Digital repository. Manages uploaded PDFs of open-source textbooks or purchased institutional digital copies.

**137. `/dept/library/journals`**
Periodical tracker. Manages recurring subscriptions to physical magazines or digital access links to IEEE/JSTOR.

**138. `/dept/library/notes`**
Curated institutional notes. The librarian's view to approve and categorize study materials uploaded by top faculty for all to access.

**139. `/dept/library/analytics`**
Usage reporting. Identifies the most popular books and authors to help guide next year's purchasing budget.

**140. `/dept/library/stock`**
Annual physical verification tool. A mobile-friendly interface for scanning every book on the shelf to identify missing inventory.

---

## 7. 📋 ATTENDANCE DEPARTMENT (12 Pages)
**141. `/dept/attendance/dashboard`**
Institution-wide daily pulse. A heatmap showing which branches or specific classes have unusually low attendance today.

**142. `/dept/attendance/mark`**
Centralized override tool. Allows the attendance clerk to manually mark students present if the faculty forgot to do it via the app.

**143. `/dept/attendance/daily`**
The daily absentee log. A generated list of every student who didn't show up to campus, used by counselors for follow-ups.

**144. `/dept/attendance/monthly`**
Aggregated roll call sheet. The classic matrix view (Student names on Y-axis, Days of month on X-axis) summarizing the period.

**145. `/dept/attendance/low`**
The critical defaulters list. Automatically flags students falling below the mandatory university threshold (e.g., 75%).

**146. `/dept/attendance/notify`**
Automated parent communication. One-click blast to send SMS warnings to the guardians of students on the defaulter list.

**147. `/dept/attendance/classwise`**
Comparative analytics. Bar charts comparing the average attendance of Class A vs Class B, identifying engagement trends.

**148. `/dept/attendance/analytics`**
Long-term trend analysis. Tracks attendance drop-offs over the semester, typically identifying slumps before exam weeks.

**149. `/dept/attendance/export`**
Official register generation. Exports data into the exact visual format of traditional physical attendance registers for auditing.

**150. `/dept/attendance/saral`**
Government sync format. Outputs attendance metrics specifically formatted for upload to state education portals.

**151. `/dept/attendance/leaves`**
Medical/Leave approval queue. Where coordinators verify doctor's notes and grant official "Excused" absence status to students.

**152. `/dept/attendance/settings`**
Calculation configuration. Defines which days are official working days and links to the holiday calendar to ensure accurate percentages.

---

## 8. 📆 HR & PAYROLL DEPARTMENT (15 Pages)
**153. `/dept/hr/dashboard`**
HR overview. Quick glances at staff headcount, pending leave approvals, and the processing status of this month's payroll.

**154. `/dept/hr/staff`**
The employee directory. A comprehensive list of all teaching and non-teaching staff with filters for department and tenure.

**155. `/dept/hr/staff/[id]`**
The digital personnel file. Stores the employee's contract, KYC documents, promotion history, and salary increment timeline.

**156. `/dept/hr/add-staff`**
Employee onboarding flow. Provisions their platform login, sets their role permissions, and inputs their bank details for payroll.

**157. `/dept/hr/departments`**
Organizational structure mapping. Defines the hierarchy (e.g., HOD -> Professor -> Assistant Professor) for reporting lines.

**158. `/dept/hr/leave-requests`**
The approval inbox. Managers review incoming Casual/Sick/Maternity leave requests from staff and approve or reject them.

**159. `/dept/hr/leave-policy`**
Rules engine. Defines how many days of each leave type an employee gets annually, and whether unused leaves carry over.

**160. `/dept/hr/leave-balance`**
Ledger of employee time off. Tracks exactly how many days of leave each staff member has consumed vs their remaining quota.

**161. `/dept/hr/holidays`**
Master holiday calendar. Centralized definition of institutional closures (Diwali, Christmas) that affects both attendance and payroll.

**162. `/dept/hr/payroll`**
The monthly processing run. Calculates gross pay, subtracts unpaid leaves, applies taxes, and generates the final net payout list.

**163. `/dept/hr/payslips`**
Document generation. Automatically creates branded PDF payslips for all staff and emails them securely.

**164. `/dept/hr/payroll-reports`**
Statutory financial exports. Generates Provident Fund (PF), Professional Tax (PT), and the exact format required by the bank for bulk NEFT transfers.

**165. `/dept/hr/attendance`**
Biometric machine sync. Imports punch-in/punch-out logs from campus hardware to calculate late marks and half-days.

**166. `/dept/hr/appraisal`**
Performance review tracker. Stores annual feedback from HODs and students to help HR determine salary increments.

**167. `/dept/hr/settings`**
Salary structure configuration. Defines the formulas for basic pay, HRA, DA, and standard deductions across different pay grades.

---

## 9. 🏠 HOSTEL & TRANSPORT (14 Pages)
**168. `/dept/hostel/dashboard`**
Warden's overview. Shows total current occupancy, pending room requests, and active maintenance complaints.

**169. `/dept/hostel/rooms`**
Visual building matrix. A grid showing all blocks, floors, and rooms, color-coded by occupancy (Full, Partial, Vacant).

**170. `/dept/hostel/residents`**
Hostel directory. List of all students currently living on campus, mapped to their specific room and bed number.

**171. `/dept/hostel/allocation`**
Room assignment interface. Workflow for matching new students to available beds based on preferences (e.g., AC/Non-AC, 2-sharing).

**172. `/dept/hostel/complaints`**
Maintenance ticketing. Students log issues (e.g., "Broken fan") and the warden tracks resolution by the plumbing/electrical staff.

**173. `/dept/hostel/mess`**
Dietary management. Publishes the weekly food menu to the student app and collects daily feedback on food quality.

**174. `/dept/hostel/passes`**
Gate pass workflow. Students apply for weekend leave, warden approves, and security guards verify the QR code at the gate.

**175. `/dept/transport/dashboard`**
Fleet manager's view. Shows active bus routes, total subscribed passengers, and pending transport fees.

**176. `/dept/transport/routes`**
Map interface. Defines the stops and pickup timings for every bus route servicing the institution.

**177. `/dept/transport/vehicles`**
Asset tracking. Logs the bus numbers, driver details, insurance expiry dates, and routine maintenance schedules.

**178. `/dept/transport/passengers`**
Subscription list. Tracks which students and staff are assigned to which specific bus route and stop.

**179. `/dept/transport/attendance`**
Boarding logs. Interface for the bus conductor to take attendance on a tablet, ensuring no student is left behind.

**180. `/dept/transport/fees`**
Collection tracker. Specialized fee view tracking transport-specific payments separately from tuition fees.

**181. `/dept/transport/tracking`**
GPS Dashboard. Real-time map showing the live location of all buses (Future integration feature).

---

## 10. 👨‍🏫 FACULTY DASHBOARD (45 Pages)
**182. `/classrooms`**
The Faculty Home Page. A social-media-style timeline feed of recent activity across all their assigned classes.

**183. `/work`**
The core navigation hub. A visual grid of 25+ app-like icons providing access to all teaching and management tools.

**184. `/tools`**
Daily organizer. Shows the teacher's schedule for the day, upcoming assignment deadlines, and pending tasks.

**185. `/chat`**
Internal communication hub. Allows direct messaging with colleagues and monitored group chats with students.

**186. `/chat/[channelId]`**
Specific chat thread view. Supports file attachments, emojis, and read receipts.

**187. `/notifications`**
Alert center. Push notifications for new org announcements, chat messages, or when an exam grading deadline approaches.

**188. `/forum`**
Q&A discussion boards. Teachers can moderate questions asked by students across their subjects.

**189. `/forum/post/[id]`**
Specific forum thread. Allows teachers to endorse the "correct" answer to a complex academic question.

**190. `/classgrid-ai`**
The AI Co-pilot. Teachers use this to generate lesson plans, draft emails, or create interactive quiz questions.

**191. `/drive`**
Personal cloud storage. A Dropbox-like interface where teachers store their presentations and notes before sharing them.

**192. `/virtual-id`**
Digital ID card. Displays a barcode that teachers can use to check out library books or scan into the biometric system via their phone.

**193. `/join-requests`**
Classroom security. If a class is private, the teacher must manually approve students requesting to join the digital space.

**194. `/whats-new`**
Platform updates. A feed showing new features released by the Classgrid engineering team.

**195. `/organization`**
Institution directory. Allows a teacher to easily find the phone number of the IT admin or HR manager.

**196. `/platform-feedback`**
Bug reporting tool. Directly sends issues (e.g., "Page is loading slow") to the Super Admin support inbox.

**197. `/marketplace`**
The Notes store. Where faculty can upload their premium, high-quality study materials and set a price for students to buy.

**198. `/marketplace/upload`**
Listing creation. Interface for uploading PDFs, setting the price, and writing a description for the marketplace.

**199. `/faculty/my-class`**
Class Teacher view. If assigned as a mentor, this shows the comprehensive list of their specific students for pastoral care.

**200. `/faculty/my-roles`**
Responsibilities overview. Shows additional duties assigned by HR (e.g., "Cultural Committee Head" or "Lab In-Charge").

**201. `/assignments`**
Master assignment list. Shows all homework published by the teacher across all their subjects.

**202. `/assignments/new`**
Creation interface. Allows attaching PDFs from Drive, setting due dates, and enabling strict late-submission blocking.

**203. `/assignments/[id]`**
The grading interface. The teacher views submitted files, inputs a grade, and provides textual feedback to the student.

**204. `/modules/internal-test`**
Test management. Where teachers define smaller class tests (unit tests) that aren't handled by the main Exam Dept.

**205. `/modules/internal-test/new`**
Test setup. Defining the date, topic, and total marks for the upcoming class test.

**206. `/modules/internal-test/[id]`**
Marks entry grid. A fast interface to enter the scores for the internal test for the whole class.

**207. `/modules/academic-planning`**
Syllabus tracking. Teachers check off topics as they teach them, automatically updating the "% Completed" progress bar for admins.

**208. `/modules/certificate`**
Approval workflow. Teachers approve or reject student requests for Bonafide certificates before they go to the admin office.

**209. `/modules/attendance`**
Daily roll call tool. Optimized for mobile: a fast, swipe-based interface to mark students present/absent during a lecture.

**210. `/modules/leave`**
Self-service HR tool. The teacher applies for casual or sick leave, viewing their remaining balance before submitting.

**211. `/modules/events`**
Event participation. View upcoming campus seminars and RSVP to reserve a seat.

**212. `/results`**
Class performance analysis. Teachers view how their students performed in the final university exams to identify weak areas.

**213. `/modules/feedback`**
Performance review view. Teachers read anonymous feedback submitted by their students at the end of the semester.

**214. `/modules/timetable`**
The weekly schedule. A visual grid of all their lectures, labs, and free periods for the week.

**215. `/modules/examination`**
Duty roster. Tells the teacher which room they are assigned to invigilate during the final exam weeks.

**216. `/modules/quiz-manager`**
Interactive learning tool. Teachers manage short, fun MCQ quizzes used to gamify classroom learning.

**217. `/modules/quiz-manager/new`**
Quiz builder. Interface to add questions, correct answers, and time limits for a live quiz.

**218. `/modules/holidays`**
Reference calendar. Checking upcoming institutional holidays to plan assignments around them.

**219. `/modules/go-live`**
Virtual Classroom hub. One-click generation of a Google Meet/Zoom link that is instantly broadcast to all students in the class.

**220. `/exam/online/builder`**
Secure test creation. Building high-stakes online exams that lock down the student's browser.

**221. `/exam/grading`**
Subjective evaluation interface. A specialized split-screen UI for reading long-form essay answers typed by students during online exams.

**222. `/faculty/analytics`**
Personal insights. A private dashboard showing the teacher their own attendance rate, average student grades, and feedback trends.

**223. `/canteen`**
Food ordering. Browsing the cafeteria menu and pre-ordering lunch to skip the queue.

**224. `/profile`**
Public persona. Managing how their qualifications, bio, and profile picture appear to students in the directory.

**225. `/profile/edit`**
Updating contact info, uploading new certifications, and managing their digital resume.

**226. `/settings`**
App preferences. Managing push notification settings and changing passwords.
