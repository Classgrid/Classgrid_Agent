<!-- CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK) -->
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

# Classgrid Onboarding Flows (School & Coaching Focus)

Based on the strategy to focus on **Schools and Coaching Institutes** first, we are consolidating the platform's onboarding into **3 Core Flows**. 

This structure ensures that the buyer (Admin) gets a frictionless experience, while the employees (Faculty) and consumers (Students) provide the necessary compliance and HR data required by the institution.

---

## 1. The Admin Flow (The "Buyers & Leaders")
**Target Roles:** `org_admin`, `principal`, `vice_principal`, `director`

**Objective:** Get them into the dashboard as fast as possible. These are the decision-makers evaluating or setting up the software. They should experience **zero friction**. We do NOT ask them for bank details, Aadhar cards, or medical histories during initial setup.

### Admin Onboarding Steps:
1. **Verification & Security:**
   - Set up their secure password.
   - Configure their custom **Organization Portal Address** (e.g., `myschool.classgrid.in`).
2. **Profile Photo (Optional):**
   - Upload a profile picture for their dashboard avatar.
3. **Personal Details (Minimal):**
   - Full Name, Date of Birth, Gender.
4. **Contact Details:**
   - Phone Number, Email Address.
5. **Review & Submit:**
   - One-click confirmation to generate the live portal and enter the dashboard.

*(Note: If an Admin wants to add their payroll or compliance documents later, they can do so from their Account Settings inside the platform).*

---

## 2. The Faculty Flow (The "Employees")
**Target Roles:** `faculty`, `teacher`, `mentor`, `counselor`, `department_admin`, `hr_dept`

**Objective:** Automated HR Data Collection. When a school invites a teacher to the platform, the school *needs* their data for payroll and compliance. The onboarding wizard acts as a mandatory HR intake form.

### Faculty Onboarding Steps:
1. **Verification & Security:** Set up password.
2. **Profile Photo:** Official passport-size photo.
3. **Personal & Contact Details:** Full demographic and address data.
4. **Role Assignment:** Department, Designation, Employee ID.
5. **Qualification & Experience:** Highest degrees and past teaching experience.
6. **Employment Details:** Date of joining, employment type (Permanent/Contract), reporting manager.
7. **Bank Details:** Account Number, IFSC code, Branch Name (Required for Payroll module).
8. **Upload Documents:** Aadhar Card, PAN Card, Degree Certificates, Relieving letters.
9. **Medical Details:** Allergies, emergency medical conditions.
10. **Review & Submit.**

---

## 3. The Student Flow (The "Learners")
**Target Roles:** `student`

**Objective:** Academic & Admissions Compliance. Schools and Coaching institutes need deep academic histories, parental contact info, and legal compliance forms.

### Student Onboarding Steps:
1. **Verification & Security:** Set up password.
2. **Profile Photo:** Official photo for their digital ID Card.
3. **Personal & Contact Details:** Full demographics and permanent/current addresses.
4. **Family Details:** Parents' names, occupations, and emergency contact numbers.
5. **Previous Education Details:** 
   - *For Schools:* Previous school name, passing marks.
   - *For Coaching:* Target exam (JEE/NEET), 10th/12th marks.
6. **Medical & Disability:** Allergies, physical handicaps (for special accommodations).
7. **Upload Documents:** Previous marksheets, Leaving Certificates (LC), Aadhar card.
8. **Anti-Ragging / Code of Conduct:** Digital signature and undertaking agreement.
9. **Review & Submit.**

---

### Summary of the Strategy
By strictly separating these 3 flows, we achieve two critical business goals:
1. **Sales Conversion:** Principals and Owners can set up their Sandbox in 60 seconds without abandoning the form.
2. **Operational Automation:** Schools instantly digitize their HR and Admissions paperwork by forcing Faculty and Students to fill out heavy data forms before they can access their timetables.
