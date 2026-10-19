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

# Implement Day 22: Enterprise HR Module (Biometric + Payroll)

This plan outlines the architecture and backend implementation for the Enterprise HR Module as defined in the master plan for Day 22. This module integrates physical turnstile biometric scanners with Classgrid and calculates automated faculty payroll.

## User Review Required

> [!IMPORTANT]  
> Please review the `Organization` schema modifications and the proposed `biometricId` addition to the `User` model. Also, review the formula proposed for payroll calculations.

## Proposed Changes

---

### Database Models

#### [MODIFY] `server/src/models/Organization.js`
Add `hr_config` to store biometric API configurations per organization.
- `hr_config.biometric_api_key`: The token the biometric device sends.
- `hr_config.biometric_secret_hash`: The secret used for HMAC payload signing for advanced security.
- `hr_config.whitelisted_ips`: Array of trusted IP addresses from the institution.
- `hr_config.payroll_config`: Base configuration such as salary modes (hourly vs monthly), default working hours.

#### [MODIFY] `server/src/models/User.js`
- Add `biometricId` for matching the biometric device pushes. We will use this alongside `prn` as fallbacks.
- Add `payroll_config` (hourly_rate, base_salary, employment_type).

#### [NEW] `server/src/models/FacultyBiometricLog.js`
Stores raw logs coming from the turnstile scanners.
- `organization_id`, `faculty_id`
- `timestamp`: Date object.
- `log_type`: "IN" | "OUT"
- `device_id`: String identifying the specific scanner.
- `deduplication_hash`: To prevent multiple rapid "IN"s within the same minute.

#### [NEW] `server/src/models/FacultyPayroll.js`
Monthly payroll snapshot and calculation record.
- `organization_id`, `faculty_id`
- `month`: e.g., "2026-04"
- `total_working_days`, `present_days`, `absent_days`, `leaves_taken`
- `gross_salary`, `deductions`, `net_salary`
- `status`: "draft" | "locked" | "paid"

---

### Backend Services & Routes

#### [NEW] `server/src/routes/hr.routes.js` (or `external.routes.js`)
We will create a specific router for external webhooks that bypasses the standard JWT and uses IP rules.
- `POST /api/external/faculty/attendance`: 
  - Validates `x-api-key`.
  - Checks if `req.ip` is in `hr_config.whitelisted_ips`.
  - Maps incoming `biometricId` to the Faculty `User`.
  - Logs the event to `FacultyBiometricLog`.
  - Handles deduplication logic using a Redis-backed or DB-backed hash (e.g. `SHA256(facultyId + minute)`).

#### [NEW] `server/src/routes/payroll.routes.js`
- `POST /api/payroll/calculate`: Runs the payroll calculation engine for a given month.
- `GET /api/payroll/summary`: Gets org-wide payroll summary.
- `GET /api/payroll/faculty/:facultyId`: Gets individual payslips.

#### [NEW] `server/src/services/payroll.service.js`
The engine that groups `FacultyBiometricLog` entries by day to find the earliest "IN" and latest "OUT", calculates hours worked, factors in `leave_requests`, and generates `FacultyPayroll` documents.

## Open Questions

> [!WARNING]  
> 1. Which biometric manufacturer protocol should we emulate for the webhook structure (e.g., eSSL, Matrix, ZKTeco)? We will use a standard JSON format for the webhook for now: `{ biometricId, timestamp, type, deviceId }`.
> 2. For Payroll calculation, should weekends be considered as "Paid Leaves" or non-working days for hourly faculty?

## Verification Plan

### Automated Tests
- Test IP blocking on `/api/external/faculty/attendance` with mocked IP addresses.
- Test missing/invalid `x-api-key` rejections.
- Trigger 5 rapid POST requests mimicking a turnstile double-scan and ensure only 1 log is recorded via `deduplication_hash`.
- Run the payroll service for a mocked month and verify net salary.

### Manual Verification
- Send a cURL POST request locally simulating the turnstile.
- Verify the log shows up correctly in MongoDB.
