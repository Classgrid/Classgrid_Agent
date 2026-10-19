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

import { organizationControlCenterApi } from "../services/organizationControlCenterApi";

const queryKeys = {
  profile: (orgId: string) => ["super-admin", "organization", orgId, "profile"] as const,
  detail: (orgId: string) => ["super-admin", "organization", orgId, "detail"] as const,
  insight: (orgId: string) => ["super-admin", "organization", orgId, "insight"] as const,
  usage: (orgId: string) => ["super-admin", "organization", orgId, "legacy-usage"] as const,
  email: (orgId: string) => ["super-admin", "organization", orgId, "email"] as const,
};

export function useOrganizationControlCenter(orgId: string | undefined) {
  const id = orgId ?? "";
  const enabled = Boolean(orgId);

  const profileQuery = useQuery({
    queryKey: queryKeys.profile(id),
    queryFn: () => organizationControlCenterApi.getFullProfile(id),
    enabled,
    staleTime: 30_000,
    retry: 1,
  });

  const detailQuery = useQuery({
    queryKey: queryKeys.detail(id),
    queryFn: () => organizationControlCenterApi.getDetail(id),
    enabled,
    staleTime: 30_000,
    retry: 1,
  });

  const insightQuery = useQuery({
    queryKey: queryKeys.insight(id),
    queryFn: () => organizationControlCenterApi.getInsight(id),
    enabled,
    staleTime: 30_000,
    retry: 1,
  });

  const usageQuery = useQuery({
    queryKey: queryKeys.usage(id),
    queryFn: () => organizationControlCenterApi.getLegacyUsage(id),
    enabled,
    staleTime: 30_000,
    retry: 1,
  });

  const emailQuery = useQuery({
    queryKey: queryKeys.email(id),
    queryFn: () => organizationControlCenterApi.getEmailAnalytics(id),
    enabled,
    staleTime: 30_000,
    retry: 1,
  });

  const queries = [profileQuery, detailQuery, insightQuery, usageQuery, emailQuery];
  const errorSources = [
    profileQuery.isError ? "organization profile" : null,
    detailQuery.isError ? "usage and subscription" : null,
    insightQuery.isError ? "organization insight" : null,
    usageQuery.isError ? "legacy storage usage" : null,
    emailQuery.isError ? "email analytics" : null,
  ].filter((source): source is string => source !== null);

  async function refetchAll() {
    await Promise.all(queries.map((query) => query.refetch()));
  }

  return {
    profile: profileQuery.data,
    detail: detailQuery.data,
    insight: insightQuery.data,
    legacyUsage: usageQuery.data,
    emailAnalytics: emailQuery.data,
    errorSources,
    isInitialLoading:
      !profileQuery.data &&
      !detailQuery.data &&
      (profileQuery.isPending || detailQuery.isPending),
    isRefreshing: queries.some((query) => query.isFetching),
    hasData: Boolean(profileQuery.data || detailQuery.data),
    refetchAll,
  };
}
