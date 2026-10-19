/*
 * ─────────────────────────────────────────────────────────
 * 🚨 ERP SHUT DOWN 🚨
 * The Classgrid ERP is shut down and will never work or be worked on again.
 * The org admin dashboard and every dashboard other than chat.classgrid.in and the
 * super admin dashboard are banned, and so is all ERP backend code.
 * Any issue or bug in the ERP or the org admin dashboard is banned too: do not look
 * for it, report it or fix it.
 * Do not build, fix, test or talk about ERP features. Only chat.classgrid.in and the
 * super admin dashboard are live.
 * ─────────────────────────────────────────────────────────
 */
// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
/*
 * =========================================================================================
 * 🚨 CRITICAL AI & SYSTEM RULE 🚨
 * NO FRONTEND GITHUB ACTIONS: NEVER create yaml files that build/deploy the frontend to EC2.
 * The frontend is hosted 100% on Vercel. EC2 is only for the backend.
 * =========================================================================================
 */

/*
 * =========================================================================================
 * STRICT SECURITY POLICY:
 * NO ONE CAN EVER CHANGE THE ORGANIZATION TYPE FROM THE FRONTEND OR BACKEND.
 * NEVER ADD A DROPDOWN OR OPTION TO CHANGE IT ANYWHERE IN THE CODEBASE.
 * NO MEANS NO. THIS IS A FIXED PLATFORM RULE.
 * =========================================================================================
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 CRITICAL AI AND SYSTEM RULES 🚨
 * 1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
 * 2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
 * 3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 NAMING CONVENTION RULE 🚨
 * 1. "CLASSGRID PLATFORM" is strictly the REPO NAME.
 * 2. chat.classgrid.in (Classgrid AI) is the actual PRODUCT. The ERP is shut down.
 * 3. NEVER use "Classgrid Platform" anywhere in the frontend UI or user-facing text.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 HOSTING & ARCHITECTURE RULE 🚨
 * 1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
 * 2. FRONTEND IS HOSTED ON VERCEL
 * ─────────────────────────────────────────────────────────
 */

type WorkModule = {
  label: string;
  route: string;
};

export const facultyWorkModules: WorkModule[] = [
  { label: "My Class", route: "/faculty/my-class" },
  { label: "My Roles", route: "/faculty/my-roles" },
  { label: "Assignments", route: "/assignments" },
  { label: "Internal Test", route: "/modules/internal-test" },
  { label: "Academic Planning", route: "/modules/academic-planning" },
  { label: "Curriculum", route: "/org/curriculum" },
  { label: "Certificate", route: "/modules/certificate" },
  { label: "Attendance", route: "/modules/attendance" },
  { label: "Manage Leaves", route: "/modules/leave" },
  { label: "Events", route: "/modules/events" },
  { label: "Result", route: "/results" },
  { label: "Feedback", route: "/modules/feedback" },
  { label: "My Time Table", route: "/modules/timetable" },
  { label: "Examination", route: "/modules/examination" },
  { label: "Quiz Manager", route: "/modules/quiz-manager" },
  { label: "Holidays", route: "/modules/holidays" },
  { label: "Go Live", route: "/modules/go-live" },
  { label: "Classgrid AI", route: "/modules/ai" },
  { label: "Online Exam Builder", route: "/exam/online/builder" },
  { label: "Exam Grading", route: "/exam/grading" },
  { label: "Analytics", route: "/faculty/analytics" },
  { label: "Notes Marketplace", route: "/marketplace" },
  { label: "Canteen", route: "/canteen" },
  { label: "Alumni", route: "/org/alumni" },
  { label: "Profile", route: "/profile" }
];

export const studentWorkModules: WorkModule[] = [
  { label: "My Class", route: "/student/my-class" },
  { label: "Assignments", route: "/assignments" },
  { label: "Internal Test", route: "/modules/internal-test" },
  { label: "Academic Planning", route: "/modules/academic-planning" },
  { label: "Curriculum", route: "/org/curriculum" },
  { label: "Certificate", route: "/modules/certificate" },
  { label: "Attendance", route: "/modules/attendance" },
  { label: "Apply for Leave", route: "/modules/leave" },
  { label: "Events", route: "/modules/events" },
  { label: "Result", route: "/results" },
  { label: "Feedback", route: "/modules/feedback" },
  { label: "My Time Table", route: "/modules/timetable" },
  { label: "Examination", route: "/modules/examination" },
  { label: "Quizzes", route: "/student/quizzes" },
  { label: "Holidays", route: "/modules/holidays" },
  { label: "Classgrid AI", route: "/modules/ai" },
  { label: "Hostel", route: "/modules/hostel" },
  { label: "Library", route: "/student/library" },
  { label: "Fees", route: "/modules/fees" },
  { label: "Canteen", route: "/canteen" },
  { label: "Notes Marketplace", route: "/marketplace" },
  { label: "Alumni", route: "/student/alumni" },
  { label: "Profile", route: "/profile" }
];
