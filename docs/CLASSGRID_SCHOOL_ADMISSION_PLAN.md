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

# 🏫 Non-CET Admission System — Complete Backend Design
## (School + Junior College + Coaching Classes)

> **This system is used when NO CET / Govt allotment exists. Students apply directly to the institution.**
> **Applies to:** Plan 2 (School w/ Div), Plan 3 (School w/o Div), Plan 4 (Coaching), Plan 5 (Junior College)
> **Author:** Nikhil (The Visionary) + Sorra (The Builder)

---

## 🔥 Key Difference from Engineering

```
ENGINEERING (CET):                 NON-CET (School/JC/Coaching):
  Data comes from Govt PDF           Data comes from Student
  Identity = EN Number               Identity = Phone / Student ID
  Auth = EN → Email OTP              Auth = Phone OTP (Firebase)
  CET Rank decides admission         10th Marks / Merit decides
  CAP Rounds (I-IV)                  Direct admission / Waitlist
```

> 👉 **Data Source = Student (NOT Govt)**

---

## 📋 Boards Supported + Multi-Board Marks Normalization Logic

When calculating merit lists for Junior Colleges, directly comparing percentages from different boards is inaccurate (e.g., SSC marks are often strictly graded compared to CBSE). We use a **Normalization Engine**.

| Board | Full Name | Marking System | Base Conversion to % | Normalization Multiplier |
|---|---|---|---|---|
| **SSC_Maharashtra** | Maharashtra State Board | Percentage (%) | Direct use | `x 1.05` (Stricter board) |
| **SSC_Other** | Other State Boards | Percentage (%) | Direct use | `x 1.03` |
| **CBSE** | Central Board | 10-point CGPA | `CGPA × 9.5%` | `x 1.00` (Reference base) |
| **ICSE** | Indian Certificate of Secondary Ed. | Percentage (%) | Direct use | `x 1.02` |
| **IB** | International Baccalaureate | 7-point scale | IB Scale Mapping | `x 1.08` (Highly rigorous) |
| **Cambridge** | IGCSE | Grade letters | Letter Mapping | `x 1.06` |

### Board Normalization Engine

```javascript
// server/src/utils/meritEngine.js
const BOARD_MULTIPLIERS = {
  CBSE: 1.00,
  ICSE: 1.02,
  SSC_Maharashtra: 1.05,
  SSC_Other_State: 1.03,
  IB: 1.08,
  Cambridge: 1.06
};

function calculateNormalizedMerit(marks, grading_system, board) {
  let basePercentage = 0;

  // Step 1: Standardize to base percentage
  if (grading_system === 'percentage') {
    basePercentage = marks;
  } else if (grading_system === 'cgpa_10' && board === 'CBSE') {
    basePercentage = marks * 9.5;
  } else if (grading_system === 'ib_7') {
    basePercentage = (marks / 7) * 100; // Simplified
  }

  // Step 2: Apply Board Normalization Multiplier
  const multiplier = BOARD_MULTIPLIERS[board] || 1.0;
  const normalized = basePercentage * multiplier;
  
  // Cap at 100%
  return Math.min(normalized, 100).toFixed(2);
}
```

---

## 🔐 How Admission Actually Works (Two Scenarios, ONE System)

> **IMPORTANT:** Both scenarios use the EXACT SAME online admission portal. The system does NOT have a separate "admin fills form" mode. Admin only reviews and approves.

### Scenario 1: "Apply from Home" (Remote)

```
College opens admission window (specific month/dates)
        │
        ▼
Student/Parent fills form FROM HOME
        │
        ▼
┌──────────────────────────────┐
│  Step 1: Enter Phone Number   │
│  Step 2: Firebase OTP verify  │
│  Step 3: Fill admission form  │
│  Step 4: Upload documents     │
│  Step 5: Select stream/course │
│  Step 6: Submit               │
└──────────┬───────────────────┘
           │
           ▼
Admin receives application on Admission Portal
        │
        ▼
Admin reviews → Approves → CALLS THE STUDENT
        │
        ▼
Student visits college for OFFLINE procedure:
  → Bring original documents
  → Sign physical forms
  → Pay fees at counter
  → Collect admission confirmation
        │
        ▼
✅ ADMISSION COMPLETE (Online part was done at home)
```

### Scenario 2: "Walk-in at College" (On-site)

```
Parent/Student visits college physically
        │
        ▼
Admin says: "Fill our online form first"
        │
        ▼
Student goes to computer lab / uses phone
        │
        ▼
┌──────────────────────────────┐
│  Step 1: Enter Phone Number   │  ← SAME online system
│  Step 2: Firebase OTP verify  │
│  Step 3: Fill admission form  │
│  Step 4: Upload documents     │
│  Step 5: Select stream/course │
│  Step 6: Submit               │
│  Step 7: TAKE PRINTOUT 🖨️     │  ← Print the filled application
│  Step 8: Sign the printout ✍️ │
│  Step 9: Give to admin        │
└──────────┬───────────────────┘
           │
           ▼
Admin reviews on Admission Portal → Confirms
        │
        ▼
Admin gives CONFIRMED ADMISSION PRINTOUT 🖨️
        │
        ▼
Remaining is OFFLINE:
  → Verify original documents
  → Pay fees at counter
  → Collect admission receipt
        │
        ▼
✅ ADMISSION COMPLETE (Online + Offline both done at college)
```

### What Our System Handles vs What's Offline

| Step | Our System (Online) | Offline (Not in system) |
|---|---|---|
| Phone OTP | ✅ | |
| Form filling | ✅ | |
| Document upload (scans) | ✅ | |
| Application printout | ✅ (PDF generation) | |
| Admin review/approve | ✅ | |
| Confirmed admission printout | ✅ (PDF generation) | |
| Original document verification | | ✅ (Physical check) |
| Physical signatures | | ✅ (On printed form) |
| Fee payment | | ✅ (At counter / Razorpay later) |
| Admission receipt | | ✅ (College office) |

---

## 📝 Dynamic Admission Form (Per Org Type)

### 5A. SWITCH LOGIC — Which fields to show?

```javascript
// server/src/services/admission-form-builder.service.js
function getRequiredFields(org_structure_type) {
  const common = ['full_name', 'dob', 'gender', 'phone', 'address', 'photo'];
  
  switch (org_structure_type) {
    case 'school_with_division':
    case 'school_without_division':
      return [...common,
        'applying_for_standard',   // e.g., '1st', '5th', '8th'
        'previous_school',
        'leaving_certificate',
        // 10th marks NOT required for lower classes
      ];

    case 'junior_college':
      return [...common,
        'board',                   // SSC / CBSE / ICSE
        'tenth_marks',             // % or CGPA
        'tenth_marks_type',        // 'percentage' or 'cgpa'
        'tenth_passing_year',
        'tenth_school_name',
        'preferred_stream',        // Science / Commerce / Arts
        'tenth_marksheet',         // Document upload
        'leaving_certificate',     // Document upload
      ];

    case 'coaching':
      return [...common,
        'current_class',           // 8th / 9th / 10th / 11th / 12th
        'target_exam',             // JEE / NEET / CET / Boards
        'selected_course',         // JEE Batch / NEET Batch / Foundation
        'school_name',
      ];

    case 'engineering':  // Handled by CET system, not this flow
    case 'diploma':
    default:
      return common;
  }
}
```

### 5B. FORM FIELDS BY TYPE

#### School (Plan 2 & 3)

| Section | Field | Required? |
|---|---|---|
| **Personal** | Full Name, DOB, Gender, Aadhaar (opt) | ✅ |
| **Contact** | Phone (verified), Email (opt), Address | ✅ |
| **Academic** | Applying for Standard (e.g., 5th), Previous School | ✅ |
| **Documents** | Photo, Leaving Certificate | ✅ |

#### Junior College (Plan 5)

| Section | Field | Required? |
|---|---|---|
| **Personal** | Full Name, DOB, Gender, Aadhaar (opt) | ✅ |
| **Contact** | Phone (verified), Email (opt), Address | ✅ |
| **Academic** | Board (SSC/CBSE/ICSE), 10th Marks, Passing Year, School Name | ✅ |
| **Preference** | Stream: Science / Commerce / Arts | ✅ |
| **Documents** | 10th Marksheet, Leaving Certificate, Photo | ✅ |
| **Optional Docs** | Caste Certificate, Income Certificate | ❌ |

#### Coaching Classes (Plan 4)

| Section | Field | Required? |
|---|---|---|
| **Personal** | Full Name, DOB, Gender | ✅ |
| **Contact** | Phone (verified), Email (opt) | ✅ |
| **Academic** | Current Class (8th-12th), School Name | ✅ |
| **Course** | Target Exam (JEE/NEET/CET/Boards), Selected Batch | ✅ |
| **Documents** | Photo | ✅ |

---

## 📄 Document Types (Expanded)

| Document | School | Jr College | Coaching | Required? |
|---|---|---|---|---|
| **Photo** | ✅ | ✅ | ✅ | Required |
| **10th Marksheet** | ❌ | ✅ | ❌ | Jr College only |
| **Leaving Certificate (LC)** | ✅ | ✅ | ❌ | School + JC |
| **Transfer Certificate** | ✅ | ❌ | ❌ | School only |
| **Aadhaar Card** | opt | opt | opt | Optional |
| **Caste Certificate** | ❌ | opt | ❌ | Optional (for reservation) |
| **Income Certificate** | ❌ | opt | ❌ | Optional (for fee waiver) |

---

## 🪑 Seat Management & Waitlist System

```javascript
// server/src/models/SeatConfig.model.js
const SeatConfigSchema = new mongoose.Schema({
  organization_id:  { type: ObjectId, ref: 'Organization', required: true },
  admission_year:   { type: String, required: true },
  
  // ─── PER STREAM/COURSE SEATS ───
  stream_or_course: { type: String, required: true },  // e.g., 'Science', 'JEE Batch'
  total_seats:      { type: Number, required: true },
  filled_seats:     { type: Number, default: 0 },
  waitlist_count:   { type: Number, default: 0 },
  
  // ─── CATEGORY-WISE (optional) ───
  category_seats: {
    open:    { type: Number },
    obc:     { type: Number },
    sc:      { type: Number },
    st:      { type: Number },
    ews:     { type: Number },
  }
}, { timestamps: true });
```

### Waitlist Auto-Promotion Logic

```javascript
// server/src/services/waitlist.service.js
// Runs via node-cron or triggered when a seat opens

async function promoteFromWaitlist(org_id, stream, admission_year) {
  const config = await SeatConfig.findOne({ organization_id: org_id, stream_or_course: stream, admission_year });
  
  if (config.filled_seats >= config.total_seats) return; // No seats available
  
  const available = config.total_seats - config.filled_seats;
  
  // Get top waitlisted students by merit score
  const waitlisted = await SchoolAdmission.find({
    organization_id: org_id,
    status: 'waitlisted',
    preferred_stream: stream,
  }).sort({ merit_score: -1 }).limit(available);
  
  for (const student of waitlisted) {
    student.status = 'selected';
    await student.save();
    config.filled_seats += 1;
    config.waitlist_count -= 1;
    // Send SMS: "Congratulations! You have been promoted from waitlist."
  }
  
  await config.save();
}
```

---

## 📊 Admission Status Pipeline

Each student moves through these states:

```
applied → under_review → shortlisted → selected → enrolled
                      ↘ rejected
                      ↘ waitlisted → selected (auto-promoted)
                                   → expired (seat not accepted in time)
```

| Status | Meaning |
|---|---|
| `applied` | Form submitted, awaiting review |
| `under_review` | Admin is checking documents |
| `shortlisted` | On merit list, pending final selection |
| `selected` | Seat offered |
| `waitlisted` | No seats currently, in queue |
| `rejected` | Application rejected by admin |
| `enrolled` | Fully admitted, division allotted |
| `withdrawn` | Student withdrew application |
| `expired` | Selected but didn't accept seat in time |

---

## 🆔 Student ID Format

| Org Type | Format | Example |
|---|---|---|
| Junior College | `JC{YEAR}-{SEQ}` | JC2026-000123 |
| School (w/ Div) | `SCH{YEAR}-{SEQ}` | SCH2026-000045 |
| School (no Div) | `SCH{YEAR}-{SEQ}` | SCH2026-000045 |
| Coaching | `COACH{YEAR}-{SEQ}` | COACH2026-000103 |

Auto-incremented per organization per year.

---

## 🎯 Merit List Engine

### When Used:
- Junior Colleges (always for popular colleges)
- Top Schools (optional)
- NOT used for Coaching (first-come-first-served)

### Merit Calculation:

```javascript
// server/src/services/merit.service.js
function calculateMeritScore(application) {
  let baseScore = convertToPercentage(
    application.tenth_marks,
    application.tenth_marks_type,
    application.board
  );
  
  // Category bonus (if college has reservation policy)
  // This is configurable per organization
  
  return baseScore;
}
```

### Admin Merit Dashboard Features:
- View all applicants sorted by merit score
- Filter by: Board (SSC/CBSE/ICSE), Category, Stream
- Bulk approve top N students
- Export merit list as PDF/Excel
- Publish merit list (makes it publicly visible)

---

## 🔌 Complete API Endpoints

### Auth
```
POST /api/admission/direct/verify-phone      → Firebase OTP verify
```

### Form
```
POST /api/admission/direct/save-draft         → Save partial form
POST /api/admission/direct/submit             → Submit complete form
POST /api/admission/direct/upload-doc          → Upload document to S3
GET  /api/admission/direct/status             → Check application status
GET  /api/admission/direct/form-fields        → Get required fields for this org type
GET  /api/admission/direct/print/application  → 🖨️ PDF: Filled application form (student prints + signs)
GET  /api/admission/direct/print/confirmation → 🖨️ PDF: Confirmed admission letter (after admin approves)
```

### Merit
```
POST /api/admission/direct/generate-merit     → Admin generates merit list
GET  /api/admission/direct/merit-list         → View merit list
```

### Seats
```
GET  /api/admission/direct/seat-availability  → Check seats per stream
POST /api/admission/direct/promote-waitlist   → Manual waitlist promotion
```

### Admin
```
GET   /api/admission/direct/dashboard         → Overview stats
GET   /api/admission/direct/applications      → List all (filter/sort/search)
PATCH /api/admission/direct/:id/review        → Update status
PATCH /api/admission/direct/:id/allot         → Assign division + roll no
POST  /api/admission/direct/:id/enroll        → Final enrollment + create user
POST  /api/admission/direct/export            → Export as PDF/Excel
```

### Communication
```
POST /api/admission/direct/notify             → Send SMS/email to applicants
```

---

## 📱 Communication System

| Channel | Priority | Use Case |
|---|---|---|
| **SMS** | Primary | Admission confirmation, Merit result, Status updates |
| **Email** | Secondary | Document verification, Detailed letters |

---

## 🔀 Dynamic Admission Type Switch

The backend automatically routes to the correct admission system based on organization type:

```javascript
// server/src/middleware/admissionRouter.middleware.js
function routeAdmissionType(req, res, next) {
  const org = req.organization;
  
  if (['engineering', 'diploma'].includes(org.structure_type)) {
    // Route to CET-based system (EN + Email OTP)
    req.admissionType = 'cet';
  } else {
    // Route to direct system (Phone OTP)
    req.admissionType = 'direct';
  }
  
  next();
}
```
