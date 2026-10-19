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

# Organization Roles & Dashboard Mapping

**CRITICAL RULE:** We do NOT have 100 different dashboards. The platform has exactly **10 Core Dashboards**. Every single granular role (like Principal, HOD, Admission Clerk) simply loads one of these 10 dashboards.

### The 10 Core Dashboards
1. **Org Admin Dashboard**
2. **Admissions Dashboard**
3. **Fees Dashboard**
4. **Examination Dashboard**
5. **Library Dashboard**
6. **Attendance Dashboard**
7. **HR & Payroll Dashboard**
8. **Hostel & Transport Dashboard**
9. **Faculty Dashboard**
10. **Student Dashboard**

---

## 1. School (`school`)

**1. Org Admin Dashboard**
- `org_admin` (Organization Admin)
- `principal` (Principal)
- `vice_principal` (Vice Principal)
- `coordinator` (Academic Coordinator)

**2. Admissions Dashboard**
- `admission_head` (Admissions Department Head)
- `admission_verifier` (Admission Verifier)
- `admission_counselor` (Admission Counselor)
- `admission_clerk` (Admission Clerk)

**3. Fees Dashboard**
- `fee_manager` (Fees & Accounts Manager)

**4. Examination Dashboard**
- `exam_controller` (Examination Controller)

**5. Library Dashboard**
- `library_manager` (Library Manager)
- `library_admin` (Library Admin)

**6. Attendance Dashboard**
- `attendance_admin` (Attendance Admin)

**7. HR & Payroll Dashboard**
- `hr_admin` (HR & Payroll Admin)

**8. Hostel & Transport Dashboard**
- `transport_manager` (Transport Manager)
- `hostel_manager` (Hostel Manager)

**9. Faculty Dashboard**
- `teacher` / `faculty` (Teacher)
- `counselor` (Student Counselor)

**10. Student Dashboard**
- `student` (Student)

---

## 2. Junior College (`junior_college`)

**1. Org Admin Dashboard**
- `org_admin` (Organization Admin)
- `principal` (Principal)
- `vice_principal` (Vice Principal)
- `hod` (Head of Department)
- `coordinator` (Academic Coordinator)

**2. Admissions Dashboard**
- `admission_head` (Admissions Department Head)
- `admission_verifier` (Admission Verifier)
- `admission_counselor` (Admission Counselor)
- `admission_clerk` (Admission Clerk)

**3. Fees Dashboard**
- `fee_manager` (Fees & Accounts Manager)

**4. Examination Dashboard**
- `exam_controller` (Examination Controller)

**5. Library Dashboard**
- `library_manager` (Library Manager)
- `library_admin` (Library Admin)

**6. Attendance Dashboard**
- `attendance_admin` (Attendance Admin)

**7. HR & Payroll Dashboard**
- `hr_admin` (HR & Payroll Admin)

**8. Hostel & Transport Dashboard**
- `transport_manager` (Transport Manager)
- `hostel_manager` (Hostel Manager)

**9. Faculty Dashboard**
- `teacher` / `faculty` (Lecturer)
- `counselor` (Student Counselor)

**10. Student Dashboard**
- `student` (Student)

---

## 3. Engineering & Diploma (`engineering` / `diploma`)

**1. Org Admin Dashboard**
- `org_admin` (Organization Admin)
- `principal` (Principal)
- `vice_principal` (Vice Principal)
- `hod` (Head of Department)
- `coordinator` (Academic Coordinator)
- `tpo_officer` (Training & Placement Officer)

**2. Admissions Dashboard**
- `admission_head` (Admissions Department Head)
- `admission_verifier` (Admission Verifier)
- `admission_counselor` (Admission Counselor)
- `admission_clerk` (Admission Clerk)

**3. Fees Dashboard**
- `fee_manager` (Fees & Accounts Manager)

**4. Examination Dashboard**
- `exam_controller` (Examination Controller)

**5. Library Dashboard**
- `library_manager` (Library Manager)
- `library_admin` (Library Admin)

**6. Attendance Dashboard**
- `attendance_admin` (Attendance Admin)

**7. HR & Payroll Dashboard**
- `hr_admin` (HR & Payroll Admin)

**8. Hostel & Transport Dashboard**
- `transport_manager` (Transport Manager)
- `hostel_manager` (Hostel Manager)

**9. Faculty Dashboard**
- `teacher` / `faculty` (Faculty)
- `counselor` (Student Counselor)

**10. Student Dashboard**
- `student` (Student)

---

## 4. Coaching Institute (`coaching`)

**1. Org Admin Dashboard**
- `org_admin` (Organization Admin)
- `hod` (Head of Department)
- `coordinator` (Academic Coordinator)

**2. Admissions Dashboard**
- `admission_head` (Admissions Department Head)
- `admission_counselor` (Admission Counselor)
- `admission_clerk` (Admission Clerk)

**3. Fees Dashboard**
- `fee_manager` (Fees & Accounts Manager)

**4. Attendance Dashboard**
- `attendance_admin` (Attendance Admin)

**5. HR & Payroll Dashboard**
- `hr_admin` (HR & Payroll Admin)

**6. Faculty Dashboard**
- `teacher` / `faculty` (Mentor)
- `counselor` (Student Counselor)

**7. Student Dashboard**
- `student` (Student)
