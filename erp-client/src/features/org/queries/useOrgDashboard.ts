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

export interface OrgDashboardOverview {
  totalFaculty: number;
  totalStudents: number;
  totalClassrooms: number;
  totalMemberships: number;
  structureMetric: number;
  structureMetricLabel: string;
}

export interface DemographicsData {
  name: string;
  value: number;
  color: string;
}

export interface BranchDistributionData {
  branch: string;
  students: number;
}

export interface EnrollmentTrendData {
  month: string;
  newUsers: number;
}

export interface OrgDashboardAnalytics {
  demographics: {
    male?: number;
    female?: number;
    other?: number;
  };
  branchDistribution: BranchDistributionData[];
  enrollmentTrends: EnrollmentTrendData[];
}

export function useOrgDashboardOverview() {
  return useQuery({
    queryKey: ["org-admin", "dashboard", "overview"],
    queryFn: async () => {
      const { data } = await apiClient.get<OrgDashboardOverview>("/api/org-admin/dashboard/metrics");
      return data;
    },
  });
}

export interface OrgDashboardMetrics {
  totalFaculty: number;
  totalStudents: number;
  totalClassrooms: number;
  totalMemberships: number;
  structureMetric: number;
  structureMetricLabel: string;
}

export function useOrgDashboardMetrics() {
  return useQuery({
    queryKey: ["org-admin", "dashboard", "metrics"],
    queryFn: async () => {
      const { data } = await apiClient.get<OrgDashboardMetrics>("/api/org-admin/dashboard/metrics");
      return data;
    },
  });
}

export function useOrgDashboardAnalytics() {
  return useQuery({
    queryKey: ["org-admin", "dashboard", "analytics"],
    queryFn: async () => {
      const { data } = await apiClient.get<OrgDashboardAnalytics>("/api/org-admin/dashboard/analytics");
      return data;
    },
  });
}

export interface OrgDashboardActivityItem {
  _id: string;
  type: string;
  action: string;
  message: string;
  user_id: { _id: string; name: string } | string;
  createdAt: string;
}

export function useOrgDashboardActivity() {
  return useQuery({
    queryKey: ["org-admin", "dashboard", "activity"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ activities: OrgDashboardActivityItem[] }>("/api/org-admin/dashboard/activity");
      return data;
    },
  });
}

export interface OrgDashboardUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  profile_completed: boolean;
  prn?: string;
  branch?: string;
  batch?: string;
  department?: string;
  createdAt: string;
}

export interface OrgDashboardUsersResponse {
  users: OrgDashboardUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UseOrgDashboardUsersOptions {
  page?: number;
  limit?: number;
  role?: string;
  search?: string;
  batch?: string;
  branch?: string;
}

export function useOrgDashboardUsers(options: UseOrgDashboardUsersOptions = {}) {
  return useQuery({
    queryKey: ["org-admin", "dashboard", "users", options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options.page) params.append("page", options.page.toString());
      if (options.limit) params.append("limit", options.limit.toString());
      if (options.role) params.append("role", options.role);
      if (options.search) params.append("search", options.search);
      if (options.batch) params.append("batch", options.batch);
      if (options.branch) params.append("branch", options.branch);
      
      const queryString = params.toString();
      const url = `/api/org-admin/dashboard/users${queryString ? `?${queryString}` : ""}`;
      
      const { data } = await apiClient.get<OrgDashboardUsersResponse>(url);
      return data;
    },
  });
}

export interface OrgDashboardClassroom {
  _id: string;
  name: string;
  classCode: string;
  subject: string;
  teacher?: {
    name: string;
    email: string;
  };
  memberCount: number;
  createdAt: string;
}

export interface OrgDashboardClassroomsResponse {
  classrooms: OrgDashboardClassroom[];
}

export function useOrgDashboardClassrooms() {
  return useQuery({
    queryKey: ["org-admin", "dashboard", "classrooms"],
    queryFn: async () => {
      const { data } = await apiClient.get<OrgDashboardClassroomsResponse>("/api/org-admin/dashboard/classrooms");
      return data;
    },
  });
}
