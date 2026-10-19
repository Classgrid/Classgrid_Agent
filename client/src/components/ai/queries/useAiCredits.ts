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
import { apiClient as api } from "@/lib/apiClient";

export const aiCreditsApi = {
  getMyBalance: () => api.get("/api/ai/credits/balance").then(res => res.data.data),
  getMyHistory: () => api.get("/api/ai/credits/history").then(res => res.data.data),
  initiateTopUp: (amount_inr: number) => api.post("/api/ai/topup/initiate", { amount_inr }).then(res => res.data.data),
};

export const useMyAiBalance = () => useQuery({
  queryKey: ["my-ai-balance"],
  queryFn: aiCreditsApi.getMyBalance,
});

export const useMyAiHistory = () => useQuery({
  queryKey: ["my-ai-history"],
  queryFn: aiCreditsApi.getMyHistory,
});

export const useInitiateAiTopUp = () => {
  return useMutation({
    mutationFn: (amount_inr: number) => aiCreditsApi.initiateTopUp(amount_inr),
  });
};
