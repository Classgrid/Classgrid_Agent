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

export type OrgJoinCodes = {
  tenantId: string;
  organizationCode: string;
  honorCode: string;
  orgType: string;
};

export type OrgTerminology = {
  structure_type: string;
  org_type: string;
  terminology: {
    org_label: string;
    top_level: string;
    course: string;
    year: string;
    period: string;
    division: string;
    sub_batch: string | null;
    student_id: string;
    student_id_long: string;
    teacher: string;
    classroom: string;
    assignment_label: string;
    exam_label: string;
    hierarchy: string[];
    [key: string]: unknown;
  };
};

export type OrgTerminologyEntry = {
  planNumber: number;
  planName: string;
  structureType: string;
  hierarchyLevels: string[];
  hierarchyExamples: string[];
  terminology: OrgTerminology["terminology"];
};

export type AllTerminologyResponse = {
  comparisonCols: string[];
  comparisonConcepts: string[];
  allTerminology: Record<string, OrgTerminologyEntry>;
};

/** Fetch this org's codes + type from /api/org-admin/join-codes */
export function useOrgJoinCodes() {
  return useQuery({
    queryKey: ["org-admin", "join-codes"],
    queryFn: async () => {
      const { data } = await apiClient.get<OrgJoinCodes>("/api/org-admin/join-codes");
      return data;
    },
  });
}

/** Fetch this org's own terminology from /api/hierarchy/terminology */
export function useOrgTerminology() {
  return useQuery({
    queryKey: ["hierarchy", "terminology"],
    queryFn: async () => {
      const { data } = await apiClient.get<OrgTerminology>("/api/hierarchy/terminology");
      return data;
    },
  });
}

/** Fetch all org types' terminology + plan metadata from /api/hierarchy/terminology/all */
export function useAllTerminology() {
  return useQuery({
    queryKey: ["hierarchy", "terminology", "all"],
    queryFn: async () => {
      const { data } = await apiClient.get<AllTerminologyResponse>("/api/hierarchy/terminology/all");
      return data;
    },
  });
}
