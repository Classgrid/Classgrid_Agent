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

// ===================================================================
// classroom.types.ts — The REAL types matching the backend exactly
// ===================================================================
// These types mirror the MongoDB models (Classroom.js, ClassroomMembership.js)
// and the backend API responses from classroom.routes.js and hierarchy.routes.js.
// NEVER hardcode labels — use Terminology from GET /api/hierarchy/terminology.
// ===================================================================

// ── Terminology (from server/src/utils/terminology.js) ──
// The response from GET /api/hierarchy/terminology
export interface Terminology {
  org_label: string;          // "College", "School", "Institute", "Junior College", "Polytechnic", "Organization"
  top_level: string;          // "Degree", "Standard", "Course", "Stream", "Department", "Group"
  course: string;             // "Branch", "Class", "Course", "Stream", "Program"
  subject: string;            // "Course" (Engineering/Diploma), "Subject" (School/Jr College), "Topic" (Coaching)
  subject_code: string;       // "Course Code", "Subject Code", "Topic Code"
  year: string | null;        // "Year", "Class", null (Coaching has none)
  period: string | null;      // "Semester", "Term", null (Coaching has none)
  division: string | null;    // "Division", "Section", null (Coaching has none)
  sub_batch: string | null;   // "Lab Batch", null
  student_id: string;         // "PRN", "Roll No", "Enrollment No", "ID"
  student_id_long: string;    // "Permanent Registration Number", etc.
  teacher: string;            // "Faculty", "Teacher", "Mentor", "Lecturer", "Instructor"
  classroom: string;          // "Classroom", "Batch", "Group"
  add_student: string;        // "Register Student", "Add Student", "Enroll Student", "Add Member"
  add_teacher: string;        // "Add Faculty", "Add Teacher", "Add Mentor", etc.
  hierarchy: string[];        // e.g. ["Degree","Department","Year","Semester","Division"]
  assignment_label: string;   // "Assignment", "Homework", "Practice Set", "Task"
  exam_label: string;         // "Examination", "Test", "Mock Test", "Assessment"
  id_card_title: string;
  student_id_card_title: string;
  forum_label: string;
  parent_comm: string;
}

// ── Hierarchy Node (from AcademicHierarchy.js) ──
export interface HierarchyNode {
  _id: string;
  level_type: string;         // e.g. "department", "year", "semester", "division"
  name: string;               // e.g. "Computer Engineering", "FY", "Division A"
  code: string;               // e.g. "CS", "FY", "A"
  parent_id: string | null;
  organization_id: string;
  sort_order: number;
  is_active: boolean;
  children: HierarchyNode[];
}

// ── Classroom (from server/src/models/Classroom.js) ──
export interface Classroom {
  _id: string;
  name: string;
  description: string;
  subject: string;
  classCode: string;
  
  teacher: {
    _id: string;
    name: string;
    email: string;
    profilePicture?: string;
    qualification?: string;
    department?: string;
    bio?: string;
  };
  
  organization_id: string;
  
  // ERP Structured Fields
  course_type: 'SCHOOL' | 'COLLEGE' | 'JUNIOR_COLLEGE' | 'ENGINEERING' | 'COACHING' | 'DIPLOMA';
  year?: string;
  branch?: string;
  semester?: number;
  standard?: string;
  division?: string;
  division_id?: string;
  subject_id?: string;
  sub_batch?: string;
  sub_batch_id?: string;
  
  coverImage: string;
  
  settings: {
    allowJoinRequests: boolean;
    maxStudents?: number;
    isArchived: boolean;
  };
  
  memberCount: number;
  subjectSlug?: string;
  
  // Student-specific (added by list endpoint)
  membershipStatus?: 'approved' | 'pending' | 'rejected';
  membershipId?: string;
  
  // Faculty-specific (added by list endpoint)
  pendingRequests?: number;
  
  createdAt: string;
  updatedAt: string;
}

// ── ClassroomMember (from GET /:id/members and GET /:id/students) ──
export interface ClassroomMember {
  _id: string;
  student: {
    _id: string;
    name: string;
    email: string;
    profilePicture?: string;
    prn?: string;
    branch?: string;
    batch?: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  respondedAt?: string;
}

// ── Join Request (from GET /:id/requests and GET /all-requests) ──
export interface JoinRequest {
  id: string;
  classroom_id: string;
  classroomName: string;
  classroomSubject: string;
  status: 'pending' | 'approved' | 'rejected';
  request_message: string;
  created_at: string;
  updated_at?: string;
  student: {
    id: string;
    name: string;
    email: string;
    prn?: string | null;
    rollNo?: string | null;
    department?: string | null;
    branch?: string | null;
    batch?: string | null;
  };
  // Student-view fields (from /my-requests)
  teacherName?: string;
}

// ── Classroom Content (from Supabase classroom_content) ──
export interface ClassroomContent {
  id: string;
  classroom_id: string;
  content_type: 'materials' | 'announcements' | 'quizzes';
  title: string;
  message?: string;
  description?: string;
  file_url?: string;
  type?: string;    // pdf, image, link
  duration?: number; // quiz duration in minutes
  created_at: string;
}

// ── API Response wrappers ──
export interface ClassroomsListResponse {
  classrooms: Classroom[];
}

export interface ClassroomDetailResponse {
  classroom: Classroom;
}

export interface ClassroomMembersResponse {
  members: ClassroomMember[];
}

export interface ClassroomRequestsResponse {
  requests: JoinRequest[];
}

export interface ClassroomContentResponse {
  data: ClassroomContent[];
}

export interface JoinByCodeResponse {
  message: string;
  classroomName: string;
  membership?: unknown;
}

export interface TerminologyResponse {
  terminology: Terminology;
  structure_type: string;
}

export interface HierarchyTreeResponse {
  tree: HierarchyNode[];
}
