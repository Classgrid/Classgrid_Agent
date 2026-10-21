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

export type StudentProfile = {
  id: string;
  user_id: string;
  name: string;
  prn?: string;
  roll_no?: string;
  division_id?: string;
  divisions?: {
    name: string;
    org_id: string;
  };
};

export type OnboardingProgress = {
  steps: Record<string, boolean>;
  completed: number;
  total: number;
  percentage: number;
};

export type StudentAnalytics = {
  healthScore: number;
  overview: {
    attendance: number;
    assignmentCompletion: number;
    academicPerformance: number;
    vivaScore: number;
    vivaParameterAverages: Record<string, number>;
  };
  counts: {
    attendedSessions: number;
    totalSessions: number;
    assignmentsSubmitted: number;
    totalAssignments: number;
    examsTaken: number;
    quizzesTaken: number;
    vivaSessions: number;
    suspiciousSessions: number;
  };
  leaveStats: {
    totalDaysOff: number;
    approved: number;
    pending: number;
  };
  insights: {
    weakAreas: Array<{ area: string }>;
    strongAreas: Array<{ area: string }>;
  };
};

export type AiSummary = {
  summary: string;
  healthScore: number;
};

export type TimetableSlot = {
  id?: string;
  _id?: string;
  day: string;
  date?: string;
  start_time: string;
  end_time: string;
  subject: string;
  teacher_name: string;
  room?: string;
  is_extra?: boolean;
};

export type TodayScheduleResponse = {
  schedule: TimetableSlot[];
  day: string;
  date: string;
};

type ApiClientError = {
  code?: string | number;
  message?: string;
  status?: string | number;
};

function getErrorCode(error: unknown) {
  if (!error || typeof error !== "object") return undefined;

  const maybeError = error as ApiClientError;
  const code = maybeError.code ?? maybeError.status;
  return code === undefined ? undefined : String(code);
}

function isRecoverableAiSummaryError(error: unknown) {
  const code = getErrorCode(error);
  if (code === "429" || code === "500" || code === "502" || code === "503" || code === "504") {
    return true;
  }

  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as ApiClientError).message ?? "")
      : "";

  return message.toLowerCase().includes("rate");
}

export function useStudentProfile() {
  return useQuery({
    queryKey: ["student-profile"],
    queryFn: async () => {
      const res = await apiClient.get<{ student: StudentProfile }>("/api/student/profile");
      return res.data.student;
    },
  });
}

export function useStudentOnboarding() {
  return useQuery({
    queryKey: ["student-onboarding-progress"],
    queryFn: async () => {
      const res = await apiClient.get<OnboardingProgress>("/api/student/onboarding-progress");
      return res.data;
    },
  });
}

export function useStudentAnalytics(studentId?: string) {
  return useQuery({
    queryKey: ["student-analytics", studentId],
    queryFn: async () => {
      const res = await apiClient.get<StudentAnalytics>(`/api/analytics/student/${studentId}`);
      return res.data;
    },
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useStudentAiSummary(studentId?: string) {
  return useQuery({
    queryKey: ["student-ai-summary", studentId],
    queryFn: async () => {
      try {
        const res = await apiClient.get<AiSummary>(`/api/analytics/student/${studentId}/ai-summary`);
        return res.data;
      } catch (error) {
        if (isRecoverableAiSummaryError(error)) {
          return null;
        }

        throw error;
      }
    },
    enabled: !!studentId,
    retry: (failureCount, error) => !isRecoverableAiSummaryError(error) && failureCount < 1,
    staleTime: 10 * 60 * 1000,
  });
}

export function useTodaySchedule() {
  return useQuery({
    queryKey: ["timetable-me-today"],
    queryFn: async () => {
      const res = await apiClient.get<TodayScheduleResponse>("/api/timetable/me/today");
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export type StudentDashboardSummary = {
  metrics: {
    attendancePercentage: number;
    pendingAssignments: number;
  };
  schedule: Array<{
    _id: string;
    subject: string;
    startTime: string;
    endTime: string;
    teacher: string;
    room: string;
    type?: string;
  }>;
  announcements: Array<{
    _id: string;
    title: string;
    createdAt: string;
    type: string;
  }>;
};

export function useStudentDashboardSummary() {
  return useQuery({
    queryKey: ["student-dashboard-summary"],
    queryFn: async () => {
      const res = await apiClient.get<{ success: boolean; data: StudentDashboardSummary }>("/api/student/dashboard/summary");
      return res.data.data;
    },
  });
}
