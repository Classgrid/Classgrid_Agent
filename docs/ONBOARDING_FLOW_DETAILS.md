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

# Classgrid Onboarding Wizard: Step-by-Step Guide

This document outlines the complete, step-by-step onboarding flow for a new Organization Admin joining the Classgrid platform. It includes every single screen and every specific field requested during the onboarding process.

---

### Step 1: Welcome
**Goal:** Gather the user's primary name to personalize the rest of the flow.
* **Fields:**
  * **Full Name** (Single text input)

### Step 2: Contact Verification
**Goal:** Ensure the user has valid, verifiable contact methods.
* **Fields:**
  * **Email Address** (Requires OTP Verification sent to email)
  * **Phone Number** (Requires OTP Verification sent via SMS)

### Step 3: Profile Photo
**Goal:** Set up the user's official avatar for the platform.
* **Fields:**
  * **Upload Profile Photo** (Image upload: PDF, JPG, PNG up to 5MB)

### Step 4: Personal Identity
**Goal:** Configure the user's unique identifier within the platform.
* **Fields:**
  * **@username** (Text input, must be unique, used for mentions and profile URLs)

### Step 5: Platform Terminology
**Goal:** Configure how the platform refers to students based on the institution's customs.
* **Fields:**
  * **Student ID Terminology** (Dropdown/Selection: e.g., "Roll No", "PRN", "Student ID")

### Step 6: Organization Identity
**Goal:** Set up the initial branding for the institution's digital campus.
* **Fields:**
  * **Organization Logo** (Image upload for the institution's official logo)
  * **Portal Subdomain** (Text input: e.g., `lps.classgrid.in`)

### Step 7: Organization Details
**Goal:** Collect the legal and physical details of the institution. 

> **IMPORTANT SECURITY POLICY:**
> The **Organization Type** field selected here is permanently locked. Due to strict security policies, it can NEVER be changed by anyone (Frontend or Backend) after this step is submitted.

* **Fields:**
  * **Organization Legal Name** (Text input)
  * **Organization Type** (Dropdown: School, Coaching Institute, Junior College, Engineering College, Diploma College)
  * **Organization Short Name / Slug** (Text input)
  * **Registration / Affiliation Number** (Text input)
  * **Board / Affiliation** (Dropdown: CBSE, ICSE, State Board, IB, IGCSE, University, None)
  * **Organization Address** (Textarea, multi-line)
  * **State** (Dropdown: List of Indian States)
  * **District / City** (Dropdown: List of Districts)
  * **Taluka** (Dropdown)
  * **City** (Text input)
  * **PIN Code** (Text input)
  * **Website** (Text input)

### Step 8: Organization Verification
**Goal:** Verify the official communication channels for the institution itself (distinct from the personal admin contact in Step 2).
* **Fields:**
  * **Official Organization Email** (Requires OTP Verification)
  * **Official Organization Phone Number** (Requires OTP Verification)

### Step 9: Secure Your Account
**Goal:** Finalize the security credentials for the Admin account.
* **Fields:**
  * **Password** (Text input: Must include uppercase, lowercase, number, and special character)
  * **Confirm Password** (Text input)

### Step 10: Review & Submit
**Goal:** Final confirmation before provisioning the digital campus.
* **Fields:**
  * **Read-only summary** of all provided details
  * **Terms and Conditions Checkbox** 
  * **"Submit and Launch" Button**
