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

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { subscribersApi } from "../services/superAdminApi";

export const SUBSCRIBERS_KEY = ["super-admin", "subscribers"] as const;

export function useSubscribers(
  options?: { q?: string; status?: string; preference?: string },
  enabled = true
) {
  return useQuery({
    queryKey: [...SUBSCRIBERS_KEY, options],
    queryFn: () => subscribersApi.getBlogSubscribers(options),
    staleTime: 30_000,
    placeholderData: (previous) => previous,
    enabled,
  });
}

export function usePauseSubscriber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => subscribersApi.pause(email),
    onSuccess: () => qc.invalidateQueries({ queryKey: SUBSCRIBERS_KEY }),
  });
}

export function useResumeSubscriber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => subscribersApi.resume(email),
    onSuccess: () => qc.invalidateQueries({ queryKey: SUBSCRIBERS_KEY }),
  });
}

export function useRemoveSubscriber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => subscribersApi.remove(email),
    onMutate: async (email: string) => {
      await qc.cancelQueries({ queryKey: SUBSCRIBERS_KEY });
      const previousData = qc.getQueryData(SUBSCRIBERS_KEY);
      
      // Optimistically remove from list
      qc.setQueriesData({ queryKey: SUBSCRIBERS_KEY }, (oldData: any) => {
        if (!oldData || !oldData.data) return oldData;
        return {
          ...oldData,
          data: oldData.data.filter((sub: any) => sub.email !== email),
          total: oldData.total - 1,
        };
      });
      
      return { previousData };
    },
    onError: (err, email, context: any) => {
      qc.setQueriesData({ queryKey: SUBSCRIBERS_KEY }, context?.previousData);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: SUBSCRIBERS_KEY });
    },
  });
}

export function useUpdateSubscriberPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, preferences }: { email: string, preferences: { receives_blog?: boolean; receives_changelog?: boolean; receives_legal?: boolean } }) => 
      subscribersApi.updatePreferences(email, preferences),
    onMutate: async (variables) => {
      await qc.cancelQueries({ queryKey: SUBSCRIBERS_KEY });
      
      // Optimistically update all queries (both list and detail views)
      qc.setQueriesData({ queryKey: SUBSCRIBERS_KEY }, (oldData: any) => {
        if (!oldData || !oldData.data) return oldData;
        return {
          ...oldData,
          data: oldData.data.map((sub: any) => 
            sub.email === variables.email 
              ? { ...sub, ...variables.preferences } 
              : sub
          )
        };
      });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: SUBSCRIBERS_KEY });
    },
  });
}
