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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient as api } from "@/lib/apiClient";
import { CODE_TTL_MINUTES } from "@/lib/codeLifetime";
import type { UsageHistory, PlanOverview } from "@/features/shared/queries/usePlanOverview";
import type { UserPlan } from "@/features/superadmin/components/ai-usage/planText";

export type ResetUnit = "second" | "minute" | "hour" | "day" | "week" | "month";
export type ResetPeriod = { value: number; unit: ResetUnit; ms?: number; label?: string };

export type OrgAiLimitsPayload = {
  pro_pool_limit?: number;
  free_weekly_limit_per_user?: number;
  image_generation_limit?: number;
  whatsapp_scheduling_limit?: number;
  custom_limits_enabled?: boolean;
  token_reset_value?: number;
  token_reset_unit?: ResetUnit;
  image_reset_value?: number;
  image_reset_unit?: ResetUnit;
  whatsapp_reset_value?: number;
  whatsapp_reset_unit?: ResetUnit;
};

// API endpoints
export const aiUsageApi = {
  getGlobalStats: (orgId?: string, month?: number, year?: number) => {
    let url = `/api/super-admin/ai-usage/global/stats?`;
    if (orgId) url += `orgId=${orgId}&`;
    if (month) url += `month=${month}&`;
    if (year) url += `year=${year}&`;
    return api.get(url).then(res => res.data.data);
  },
  getModelBreakdown: (params: { from: string; to: string; orgId?: string }) =>
    api.get("/api/super-admin/ai-usage/global/models", { params }).then(res => res.data.data as ModelBreakdown),
  
  getOrgs: () => api.get("/api/super-admin/ai-usage/orgs").then(res => res.data.data),
  getOrgDetail: (orgId: string) => api.get(`/api/super-admin/ai-usage/orgs/${orgId}/detail`).then(res => res.data.data),
  
  getOrgUsers: (orgId: string) => api.get(`/api/super-admin/ai-usage/orgs/${orgId}/users`).then(res => res.data.data),
  getUserDetail: (userId: string) => api.get(`/api/super-admin/ai-usage/users/${userId}/detail`).then(res => res.data.data),

  blockUser: (userId: string, isBlocked: boolean) => api.put(`/api/super-admin/ai-usage/users/${userId}/block`, { isBlocked }).then(res => res.data),
  blockOrg: (orgId: string, isBlocked: boolean) => api.put(`/api/super-admin/ai-usage/orgs/${orgId}/block`, { isBlocked }).then(res => res.data),
  resetUserUsage: (userId: string) => api.post(`/api/super-admin/ai-usage/users/${userId}/reset`).then(res => res.data),
  resetOrgUsage: (orgId: string) => api.post(`/api/super-admin/ai-usage/orgs/${orgId}/reset`).then(res => res.data),
  // (the security code goes with the reset itself: the server checks it and uses it up in the same request)
  resetPlanUsage: (plan: string, code: string) => api.post(`/api/super-admin/ai-usage/plans/${encodeURIComponent(plan)}/reset`, { code }).then(res => res.data as { success: boolean; people: number }),
  grantCredits: (userId: string, amount: number, options?: { sendEmail?: boolean; startDate?: string; endDate?: string }) => api.post(`/api/super-admin/ai-usage/users/${userId}/grant`, { amount, ...options }).then(res => res.data),
  grantOrgCredits: (orgId: string, amount: number, options?: { sendEmail?: boolean; startDate?: string; endDate?: string }) => api.post(`/api/super-admin/ai-usage/orgs/${orgId}/grant`, { amount, ...options }).then(res => res.data),
  extendCredits: (userId: string, endDate: string) => api.put(`/api/super-admin/ai-usage/users/${userId}/credits/extend`, { endDate }).then(res => res.data),
  deleteUserData: (userId: string) => api.delete(`/api/super-admin/ai-usage/users/${userId}/data`).then(res => res.data),
  updateOrgLimits: (orgId: string, data: OrgAiLimitsPayload) => api.put(`/api/super-admin/ai-usage/orgs/${orgId}/limits`, data).then(res => res.data),
  
  // Security OTP
  requestSecurityCode: (action: string, orgId?: string, plan?: string) => api.post(`/api/super-admin/ai-usage/security-code/request`, { action, orgId, plan }).then(res => res.data),
  verifySecurityCode: (code: string, action: string, orgId?: string) => api.post(`/api/super-admin/ai-usage/security-code/verify`, { code, action, orgId }).then(res => res.data),
};

export const useGlobalAiStats = (orgId?: string, month?: number, year?: number) => useQuery({
  queryKey: ["ai-usage-global", orgId, month, year],
  queryFn: () => aiUsageApi.getGlobalStats(orgId, month, year),
  refetchInterval: 30000,
  refetchIntervalInBackground: true,
});

export type ModelUsageTotals = { requests: number; tokens: number; costUSD: number };
export type ModelBreakdown = {
  from: string;
  to: string;
  bucket: "hour" | "day";
  models: (ModelUsageTotals & { model: string; success: number; failed: number })[];
  timeline: { bucket: string; models: Record<string, ModelUsageTotals> }[];
};

export const useAiModelBreakdown = (params: { from: string; to: string; orgId?: string }) => useQuery({
  queryKey: ["ai-usage-models", params.from, params.to, params.orgId],
  queryFn: () => aiUsageApi.getModelBreakdown(params),
});

export const useAiUsageOrgs = () => useQuery({
  queryKey: ["ai-usage-orgs"],
  queryFn: aiUsageApi.getOrgs,
  refetchInterval: 30000,
  refetchIntervalInBackground: true,
});

export const useAiOrgDetail = (orgId: string) => useQuery({
  queryKey: ["ai-usage-org", orgId],
  queryFn: () => aiUsageApi.getOrgDetail(orgId),
  refetchInterval: 30000,
  refetchIntervalInBackground: true,
  enabled: !!orgId,
});

export const useAiOrgUsers = (orgId: string) => useQuery({
  queryKey: ["ai-usage-org-users", orgId],
  queryFn: () => aiUsageApi.getOrgUsers(orgId),
  enabled: !!orgId,
  refetchInterval: 30000,
  refetchIntervalInBackground: true,
});

/** A person's page on Plans & Usage (GET /users/:id/detail). The socket refreshes it on every change, so the minute
 * timer is only a safety net, and it stops while the tab is hidden. A wrong or unknown id (400, 404) is not retried. */
export const useAiUserDetail = (userId: string) => useQuery({
  queryKey: ["ai-usage-user", userId],
  queryFn: async () => (await aiUsageApi.getUserDetail(userId)) as UserDetail,
  refetchInterval: 60_000,
  refetchIntervalInBackground: false,
  enabled: !!userId,
  retry: (count, error) => {
    const status = (error as { response?: { status?: number } })?.response?.status;
    return status !== 400 && status !== 404 && count < 2;
  },
});

export const useBlockAiUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, isBlocked }: { userId: string, isBlocked: boolean }) => aiUsageApi.blockUser(userId, isBlocked),
    onSuccess: (_, { userId }) => {
      toast.success("Action completed.");
      queryClient.invalidateQueries({ queryKey: ["ai-usage-user", userId] });
      queryClient.invalidateQueries({ queryKey: ["ai-usage-org-users"] });
    },
    onError: (error) => toast.error("Action failed. " + error.message),
  });
};

export const useBlockAiOrg = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, isBlocked }: { orgId: string, isBlocked: boolean }) => aiUsageApi.blockOrg(orgId, isBlocked),
    onSuccess: (_, { orgId }) => {
      toast.success("Action completed.");
      queryClient.invalidateQueries({ queryKey: ["ai-usage-org", orgId] });
      queryClient.invalidateQueries({ queryKey: ["ai-usage-orgs"] });
    },
    onError: (error) => toast.error("Action failed. " + error.message),
  });
};

export const useGrantAiCredits = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, amount, options }: { userId: string, amount: number, options?: { sendEmail?: boolean; startDate?: string; endDate?: string } }) => aiUsageApi.grantCredits(userId, amount, options),
    onSuccess: (_, { userId }) => {
      toast.success("Action completed.");
      queryClient.invalidateQueries({ queryKey: ["ai-usage-user", userId] });
    },
    onError: (error) => toast.error("Action failed. " + error.message),
  });
};

export const useGrantOrgAiCredits = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, amount, options }: { orgId: string, amount: number, options?: { sendEmail?: boolean; startDate?: string; endDate?: string } }) => aiUsageApi.grantOrgCredits(orgId, amount, options),
    onSuccess: (_, { orgId }) => {
      toast.success("Action completed.");
      queryClient.invalidateQueries({ queryKey: ["ai-usage-orgs"] });
      queryClient.invalidateQueries({ queryKey: ["ai-usage-org", orgId] });
    },
    onError: (error) => toast.error("Action failed. " + error.message),
  });
};

export const useResetUserUsage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => aiUsageApi.resetUserUsage(userId),
    onSuccess: (_, userId) => {
      toast.success("User usage limit has been reset to 0.");
      queryClient.invalidateQueries({ queryKey: ["ai-usage-user", userId] });
    },
    onError: (error) => toast.error("Failed to reset limit. " + error.message),
  });
};

export const useResetOrgUsage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orgId: string) => aiUsageApi.resetOrgUsage(orgId),
    onSuccess: (_, orgId) => {
      toast.success("Organization usage has been reset.");
      queryClient.invalidateQueries({ queryKey: ["ai-usage-org", orgId] });
      queryClient.invalidateQueries({ queryKey: ["ai-usage-orgs"] });
    },
    onError: (error) => toast.error("Failed to reset limit. " + error.message),
  });
};

/** Everyone on one plan back to 0 (Plans & Usage > a plan > Reset Plan Usage) */
export const useResetPlanUsage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ plan, code }: { plan: string; code: string }) => aiUsageApi.resetPlanUsage(plan, code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-people"] });
      queryClient.invalidateQueries({ queryKey: ["ai-usage-user"] });
      queryClient.invalidateQueries({ queryKey: ["ai-plans-summary"] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || "Failed to reset the plan's usage."),
  });
};

export const useUpdateOrgAiLimits = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: string, data: OrgAiLimitsPayload }) => aiUsageApi.updateOrgLimits(orgId, data),
    onSuccess: (_, { orgId }) => {
      toast.success("Organization AI limits updated.");
      queryClient.invalidateQueries({ queryKey: ["ai-usage-org", orgId] });
      queryClient.invalidateQueries({ queryKey: ["ai-usage-orgs"] });
    },
    onError: (error) => toast.error("Failed to update limits. " + error.message),
  });
};

export const useRequestSecurityCode = () => {
  return useMutation({
    mutationFn: ({ action, orgId, plan }: { action: string, orgId?: string, plan?: string }) => aiUsageApi.requestSecurityCode(action, orgId, plan),
    onSuccess: () => {
      toast.success(`Security code sent to your email. It works for ${CODE_TTL_MINUTES} minutes.`);
    },
    onError: (error) => toast.error("Failed to request security code. " + error.message),
  });
};

export const useVerifySecurityCode = () => {
  return useMutation({
    mutationFn: ({ code, action, orgId }: { code: string, action: string, orgId?: string }) => aiUsageApi.verifySecurityCode(code, action, orgId),
    // (apiClient hands back the server's answer itself, so its `error` is read too: "Too many wrong tries. Ask for a
    // new code." showed as "Invalid or expired security code." before, 2026-11-25)
    onError: (error: any) => toast.error(error.response?.data?.error || error?.error || "Invalid or expired security code."),
  });
};

export const useGlobalGrantedCredits = () => {
  return useQuery({
    queryKey: ['global-granted-credits'],
    queryFn: async () => {
      const { apiClient } = await import('@/lib/apiClient');
      const res = await apiClient.get('/api/super-admin/ai-usage/global/granted-credits');
      return res.data?.data || [];
    },
    staleTime: 60000,
  });
};

// ── Plans (the plan table edited in Plans & Billing) ──
export type PlanRow = {
  key: string; name: string; sort?: number; coming_soon?: boolean; is_public?: boolean; tagline?: string;
  price_inr_monthly?: number; tokens_per_window?: number; window_reset_value?: number; window_reset_unit?: string; tokens_per_week?: number;
  claude_credits_per_week?: number; images_per_period?: number; images_reset_value?: number; images_reset_unit?: string;
  call_minutes_per_period?: number; call_reset_value?: number; call_reset_unit?: string;
  [field: string]: unknown;
};

/** The plan table and the plans on/off switch (GET /api/super-admin/ai-plans; the same query Plans & Billing uses) */
export const useAiPlans = () => useQuery({
  queryKey: ["aiPlans"],
  queryFn: async () => (await api.get("/api/super-admin/ai-plans")).data as { enabled: boolean; plans: PlanRow[] },
  staleTime: 30_000,
});

/** The plans that can be gifted: every paid plan in the plan table that can be bought (not Free, not coming soon) */
export const giftablePlans = (plans?: PlanRow[]) =>
  (plans || []).filter((p) => p.key !== "free" && !p.coming_soon).slice().sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

/** A plan's name from the plan table ("pro" -> "Pro") */
export const planNameOf = (plans: PlanRow[] | undefined, key?: string | null) => {
  const k = key || "free";
  return plans?.find((p) => p.key === k)?.name || k.charAt(0).toUpperCase() + k.slice(1);
};

export type GiftPlanInput = { userIds: string[]; planId: string; months?: number; expiresAt?: string; reason: string };

/** Gives a plan to one or more users (PUT /users/:id/plan, setUserPlan: it saves the reason and emails the user) */
export const useGiftPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userIds, planId, months, expiresAt, reason }: GiftPlanInput) => {
      for (const id of userIds) {
        await api.put(`/api/super-admin/ai-usage/users/${id}/plan`, { planId, reason, ...(months ? { months } : {}), ...(expiresAt ? { expires_at: expiresAt } : {}) });
      }
      return userIds.length;
    },
    onSettled: () => invalidatePlanQueries(queryClient),
  });
};

/** Every list that shows a person's plan: their page, the people list, the plan counts and Plans & Billing's list.
 * Used after a plan is gifted or ended. */
export const PLAN_QUERY_KEYS = [["ai-usage-user"], ["ai-people"], ["ai-plans-summary"], ["ai-plan-subscribers"]] as const;
export function invalidatePlanQueries(queryClient: ReturnType<typeof useQueryClient>) {
  for (const queryKey of PLAN_QUERY_KEYS) queryClient.invalidateQueries({ queryKey: [...queryKey] });
}

// ── Plans & Usage: the plan counts, the people list and one person (the server's /people, /plans/summary, /detail) ──

/** One row of the people list (GET /people). session.limit: -1 no limit, 0 not included. */
export type PersonRow = {
  id: string; name: string; email: string; photo: string | null; staff: boolean; blocked: boolean;
  plan: {
    key: "free" | "pro" | "max" | "enterprise" | string; name: string; how: "free" | "bought" | "gifted"; billing: string;
    started_at: string | null; expires_at: string | null;
    ended: { key: string; name: string; at: string | null } | null;
  };
  session: { used: number; limit: number; resetAt: string | null };
};
export type PeoplePage = { success: boolean; data: PersonRow[]; total: number; page: number; limit: number; pages: number; asOf: string };
export type PeopleFilters = { q: string; plan: string; how: string; page: number; limit?: number };

/** The people list, one page at a time. The page on screen stays while the next one loads. */
export const usePeople = ({ q, plan, how, page, limit = 25 }: PeopleFilters) => useQuery({
  queryKey: ["ai-people", { q, plan, how, page, limit }],
  queryFn: async () => (await api.get("/api/super-admin/ai-usage/people", { params: { q, plan, how, page, limit } })).data as PeoplePage,
  placeholderData: (prev) => prev,
  staleTime: 15_000,
});

export type PlanCount = { key: string; name: string; sort: number; coming_soon: boolean; is_public: boolean; people: number; bought: number; gifted: number; endingSoon: number };
export type PlansSummaryData = { success: boolean; enabled: boolean; total: number; staff: number; asOf: string; plans: PlanCount[] };

/** How many people are on each plan, bought or gifted (GET /plans/summary) */
export const usePlansSummary = () => useQuery({
  queryKey: ["ai-plans-summary"],
  queryFn: async () => (await api.get("/api/super-admin/ai-usage/plans/summary")).data as PlansSummaryData,
  staleTime: 30_000,
});

export type PlanHistoryRow = { at: string | null; action: "gift" | "end"; plan: string; expires_at: string | null; reason: string; by: string; saved_on_plan: boolean };
export type Payment = {
  id: string; at: string; kind: "plan" | "topup"; plan_key: string | null; plan_term: "month" | "year" | null; amount_inr: number;
  credits_added: number; status: string; period_start: string | null; period_end: string | null; payment_id: string | null;
};
export type CallCount = { used: number; limit: number | null };
export type CreditEvent = { id: string; type: string; credits_added: number; status: string; date: string; metadata: Record<string, any> };
export type StudentInfo = { email?: string | null; method?: string; verified_at?: string; expires_at?: string | null } | null;

/** One person, as GET /users/:id/detail sends it */
export type UserDetail = {
  id: string; name?: string; email: string; role?: string;
  photo: string | null; staff: boolean; planKey: string; joinedAt: string | null; lastLoginAt: string | null; customWindowLimit: number | null;
  overview: PlanOverview | null; planHistory: PlanHistoryRow[];
  plan: UserPlan; student: StudentInfo; profilePicture: string | null;
  isBlocked: boolean; totalUsage: number; balance: number; totalChats: number;
  ai_tokens?: {
    ai_credits_balance?: number; promotion_credits_balance?: number; total_promotion_credits_granted?: number;
    promotion_credits_end_date?: string | null; promotion_credits_paused?: boolean; [field: string]: unknown;
  };
  topupHistory: { id: string; amount_inr: number; credits_added: number; status: string; date: string }[];
  promotionHistory: CreditEvent[];
  payments: Payment[];
  callCounts: { day: CallCount; week: CallCount; month: CallCount } | null;
};

/** Blocks or unblocks one person's AI (the page shows its own message) */
export const useSetAiBlocked = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, isBlocked }: { userId: string; isBlocked: boolean }) => aiUsageApi.blockUser(userId, isBlocked),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-usage-user"] });
      queryClient.invalidateQueries({ queryKey: ["ai-people"] });
    },
  });
};

/** Sets a person's session credits and pictures used back to 0 (the page shows its own message) */
export const useClearSessionUse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => aiUsageApi.resetUserUsage(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-usage-user"] });
      queryClient.invalidateQueries({ queryKey: ["ai-people"] });
    },
  });
};

/** A user's usage history, the same as their own Settings > Usage page */
export const useUserUsageHistory = (userId: string, days = 14, page = 1) => useQuery({
  queryKey: ["ai-usage-user-history", userId, days, page],
  queryFn: async () => (await api.get(`/api/super-admin/ai-usage/users/${userId}/usage-history`, { params: { days, page, limit: 15 } })).data as UsageHistory,
  enabled: !!userId,
  staleTime: 30_000,
  placeholderData: (prev) => prev,
});
