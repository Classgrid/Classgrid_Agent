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

# Isometric Stack Section Copy

Source component reviewed:

`C:\Users\nikhi\OneDrive\Documents\classgrid_marketting\components\sections\IsometricStackSection.tsx`

## What The Component Actually Needs

The component uses one hardcoded array named `PHASES`.

Each phase has this exact shape:

```ts
{
  title: "Line one.\nLine two.",
  body: "One short paragraph.",
  bullets: [
    "Bullet one",
    "Bullet two",
    "Bullet three",
  ],
}
```

The title is split on `\n`, so each title should be two clean lines. The layout has a left text panel around 460px wide and a carousel height of 360px, so keep each body to one sentence and use 3 to 4 bullets.

`LayersSvg.tsx` does not expose editable text labels as props. The practical copy replacement is the `PHASES` array in `IsometricStackSection.tsx`.

## Recommended Section Kicker

Current:

```txt
THE CLASSGRID ERP STACK
```

Keep it. It fits the section well.

## Recommended Headline And Subheadline

**Headline:**

```txt
The connected ERP stack behind every modern campus
```

**Subheadline:**

```txt
ClassGrid unifies admissions, academics, fees, exams, communication, compliance, and AI automation into one live operating system for schools, colleges, and coaching institutes.
```

## Recommended PHASES Content

Use this content to replace the current `PHASES` copy.

```ts
const PHASES = [
  {
    title: "One campus core.\nEvery user connected.",
    body: "ClassGrid gives each institution an isolated workspace where admins, faculty, students, and parents work from the same live campus record.",
    bullets: [
      "Tenant workspaces for schools, colleges, junior colleges, and coaching institutes",
      "Role-based access for owners, principals, HODs, faculty, students, and parents",
      "Organization hierarchy for branches, standards, divisions, batches, and courses",
      "Audit logs and system controls across sensitive workflows",
    ],
  },
  {
    title: "Admissions that match.\nYour institution type.",
    body: "The admission engine supports real tracks for schools, junior colleges, engineering, diploma, coaching, and custom workflows.",
    bullets: [
      "Phone OTP, EN-number OTP, portal, desk, and CET entry modes",
      "Document verification, duplicate checks, edit locks, and stage history",
      "Merit generation for percentage, Best-of-5, FCFS, and MHT-CET ranking",
      "RLA, CAP upgrades, PRN generation, seat matrix, and DTE/SARAL/AICTE exports",
    ],
  },
  {
    title: "Academics run from.\nOne daily operating layer.",
    body: "Timetable, attendance, classroom activity, assignments, and teacher planning stay connected instead of living in separate registers.",
    bullets: [
      "Conflict-aware timetable for lectures, labs, tutorials, and extra classes",
      "GPS, device, code, and paste-detection checks for smart attendance",
      "Classroom hub for announcements, assignments, materials, and discussions",
      "Faculty planner, academic calendar, holidays, and daily schedule synthesis",
    ],
  },
  {
    title: "Fees and services.\nSynced to the student record.",
    body: "ClassGrid connects admissions, fee ledgers, online payments, offline receipts, and campus services around one student account.",
    bullets: [
      "Fee structures, components, student ledgers, installments, and overdue status",
      "Institution-owned Razorpay keys with webhook verification and receipts",
      "Offline cash, cheque, NEFT, and online payments in one ledger",
      "Library, canteen, certificate, and student access workflows tied to ERP status",
    ],
  },
  {
    title: "Exams, results.\nAnd compliance ready.",
    body: "Assessment data flows into marks, results, certificates, and accreditation outputs without rebuilding reports from scratch.",
    bullets: [
      "Online exams, quizzes, AI proctoring, negative marking, and grading flows",
      "Marks, result records, student performance analytics, and academic history",
      "Certificate engine with templates, student data injection, and QR verification",
      "NAAC/NBA, CO attainment, DTE, SARAL, AICTE, and State Board exports",
    ],
  },
  {
    title: "Communication and AI.\nAcross the full stack.",
    body: "Every important campus event can trigger dashboards, alerts, analytics, and AI-assisted actions from the same platform.",
    bullets: [
      "Email, SMS, Firebase push notifications, chat, forums, and support CRM",
      "Command Center, Super Analytics, activity logs, and system health views",
      "AI RAG engine, AI study assistant, AI quiz maker, notes AI, and audit AI",
      "Real-time updates through Socket.io, Redis, Firebase, and connected services",
    ],
  },
];
```

## Short Layer Names

If you later add visible labels to the SVG layers, use these compact names:

```txt
Campus Core
Admissions Engine
Academic Operations
Fees & Services
Exams & Compliance
Communication & AI
```

## Why This Fits Better

This copy matches the actual component structure and the real ClassGrid product areas:

- Admissions strategies: school, junior college, engineering, diploma, coaching, custom
- Admission workflows: OTP, documents, merit, RLA, CAP upgrade, PRN, seat matrix, exports
- Academic modules: timetable, attendance, classroom, assignments, faculty planner
- Finance modules: fee structures, student ledgers, Razorpay, offline payments
- Compliance modules: certificates, results, NAAC/NBA, DTE, SARAL, AICTE, State Board
- Intelligence modules: notifications, chat, analytics, Command Center, AI engines
