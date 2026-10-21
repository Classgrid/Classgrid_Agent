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

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

// Matches the exact shape returned by GET /api/results/student/me
export type SubjectDetail = {
  subject_id: string;
  subject_code: string;
  subject_name: string;
  course_type: "THEORY" | "LAB" | "ELECTIVE";
  max_marks: number;
  credits: number;
  marks_obtained: number;
  internal_marks: number | null;
  external_marks: number | null;
  is_absent: boolean;
  grade: string;
  grade_points: number;
  earn_credits: number;
  pass_marks: number;
};

export type StudentResult = {
  id: string;
  scheme_id: string;
  org_id: string;
  student_id: string;
  total_marks: number;
  max_total_marks: number;
  percentage: number;
  grade: string;
  grade_points: number;
  sgpa: number | null;
  cgpa: number | null;
  percentage_equivalent: number | null;
  earn_credits: number | null;
  total_credits: number | null;
  status: string;
  scheme_rank: number;
  result_detail: SubjectDetail[];
  generated_at: string;
  version: number;
  result_schemes: {
    id: string;
    name: string;
    academic_year: string;
    semester: string;
    status: string;
    rules_json: {
      mode: "college" | "school";
      [key: string]: any;
    };
  };
};

export type StudentResultsResponse = {
  results: StudentResult[];
  student: {
    name: string;
    prn: string;
    email: string;
  };
};

export type CgpaResponse = {
  cgpa: number | null;
  percentage_equivalent: number | null;
  total_semesters: number;
  semesters: {
    scheme_id: string;
    scheme_name: string;
    semester: string;
    academic_year: string;
    sgpa: number | null;
    credits: number | null;
    earn_credits: number | null;
  }[];
};

/**
 * Fetches the logged-in student's published results.
 * Connects to: GET /api/results/student/me
 */
export function useStudentResults() {
  return useQuery<StudentResultsResponse>({
    queryKey: ["student-results"],
    queryFn: async () => {
      const { data } = await apiClient.get<StudentResultsResponse>("/api/results/student/me");
      return data;
    },
  });
}

/**
 * Fetches cumulative CGPA across all published semesters.
 * Connects to: GET /api/results/student/:studentId/cgpa
 */
export function useStudentCgpa(studentId: string) {
  return useQuery({
    queryKey: ["student-cgpa", studentId],
    queryFn: () => apiClient.get<CgpaResponse>(`/api/results/student/${studentId}/cgpa`).then(res => res.data),
    enabled: !!studentId,
  });
}
