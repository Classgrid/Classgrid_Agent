// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient as api } from "@/lib/apiClient";

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
  grantCredits: (userId: string, amount: number, options?: { sendEmail?: boolean; startDate?: string; endDate?: string }) => api.post(`/api/super-admin/ai-usage/users/${userId}/grant`, { amount, ...options }).then(res => res.data),
  grantOrgCredits: (orgId: string, amount: number, options?: { sendEmail?: boolean; startDate?: string; endDate?: string }) => api.post(`/api/super-admin/ai-usage/orgs/${orgId}/grant`, { amount, ...options }).then(res => res.data),
  extendCredits: (userId: string, endDate: string) => api.put(`/api/super-admin/ai-usage/users/${userId}/credits/extend`, { endDate }).then(res => res.data),
  deleteUserData: (userId: string) => api.delete(`/api/super-admin/ai-usage/users/${userId}/data`).then(res => res.data),
  updateOrgLimits: (orgId: string, data: { pro_pool_limit: number, free_weekly_limit_per_user: number, image_generation_limit?: number, whatsapp_scheduling_limit?: number }) => api.put(`/api/super-admin/ai-usage/orgs/${orgId}/limits`, data).then(res => res.data),
  
  // Security OTP
  requestSecurityCode: (action: string, orgId?: string) => api.post(`/api/super-admin/ai-usage/security-code/request`, { action, orgId }).then(res => res.data),
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

export const useAiUserDetail = (userId: string) => useQuery({
  queryKey: ["ai-usage-user", userId],
  queryFn: () => aiUsageApi.getUserDetail(userId),
  refetchInterval: 30000,
  refetchIntervalInBackground: true,
  enabled: !!userId,
});

export const useBlockAiUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, isBlocked }: { userId: string, isBlocked: boolean }) => aiUsageApi.blockUser(userId, isBlocked),
    onSuccess: (_, { userId }) => {
      toast.success("Action completed successfully.");
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
      toast.success("Action completed successfully.");
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
      toast.success("Action completed successfully.");
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
      toast.success("Action completed successfully.");
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

export const useUpdateOrgAiLimits = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: string, data: { pro_pool_limit: number, free_weekly_limit_per_user: number, image_generation_limit?: number, whatsapp_scheduling_limit?: number } }) => aiUsageApi.updateOrgLimits(orgId, data),
    onSuccess: (_, { orgId }) => {
      toast.success("Organization AI limits updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["ai-usage-org", orgId] });
      queryClient.invalidateQueries({ queryKey: ["ai-usage-orgs"] });
    },
    onError: (error) => toast.error("Failed to update limits. " + error.message),
  });
};

export const useRequestSecurityCode = () => {
  return useMutation({
    mutationFn: ({ action, orgId }: { action: string, orgId?: string }) => aiUsageApi.requestSecurityCode(action, orgId),
    onSuccess: () => {
      toast.success("Security code sent to your email.");
    },
    onError: (error) => toast.error("Failed to request security code. " + error.message),
  });
};

export const useVerifySecurityCode = () => {
  return useMutation({
    mutationFn: ({ code, action, orgId }: { code: string, action: string, orgId?: string }) => aiUsageApi.verifySecurityCode(code, action, orgId),
    onError: (error: any) => toast.error(error.response?.data?.error || "Invalid or expired security code."),
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
