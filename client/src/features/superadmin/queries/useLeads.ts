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

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { leadsApi } from "../services/superAdminApi";
import { toast } from "sonner";

export const LEADS_KEY = ["super-admin", "leads"] as const;

export function useLeads() {
  return useQuery({
    queryKey: LEADS_KEY,
    queryFn: () => leadsApi.getAll(),
    staleTime: 60_000,
  });
}

export function useApproveLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => leadsApi.approve(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: LEADS_KEY }),
    onError: (error: any) => {
      alert(error?.message || "Failed to approve lead. Please try again.");
    }
  });
}

export function useScheduleMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, scheduledAt, meetingUrl, provider, notes }: { id: string; scheduledAt: string; meetingUrl: string; provider?: string; notes?: string }) =>
      leadsApi.scheduleMeeting(id, { scheduledAt, meetingUrl, provider, notes } as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: LEADS_KEY }),
  });
}

export function useAssignLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => leadsApi.assign(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: LEADS_KEY }),
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { institutionName: string; adminName: string; adminEmail: string; adminPhone?: string; city?: string; orgType?: string }) =>
      leadsApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: LEADS_KEY }),
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => leadsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LEADS_KEY });
      toast.success("Lead deleted successfully");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to delete lead");
    }
  });
}

export function useRegenerateActivation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => leadsApi.regenerateActivation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: LEADS_KEY }),
  });
}

export function useUpdateLeadNotes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => leadsApi.updateMeetingNotes(id, payload),
    onMutate: async ({ id, payload }) => {
      toast.loading("Saving changes...", { id: "save-lead-update" });
      await qc.cancelQueries({ queryKey: LEADS_KEY });
      const previous = qc.getQueryData<any>(LEADS_KEY);
      
      if (previous && previous.leads) {
        qc.setQueryData<any>(LEADS_KEY, {
          ...previous,
          leads: previous.leads.map((l: any) => l._id === id ? { ...l, ...payload } : l)
        });
      }
      return { previous };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LEADS_KEY });
      toast.success("Saved successfully", { id: "save-lead-update" });
    },
    onError: (err: any, variables, context: any) => {
      if (context?.previous) {
        qc.setQueryData(LEADS_KEY, context.previous);
      }
      toast.error(err.response?.data?.message || "Failed to update lead notes");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: LEADS_KEY }),
  });
}

export function useRequestVettingApproval() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (id: string) => leadsApi.requestVettingApproval(id), onSuccess: (_, id) => { queryClient.invalidateQueries({ queryKey: LEADS_KEY }); toast.success("Approval request sent to Nikhil"); }, onError: (err: any) => { toast.error(err.response?.data?.message || "Failed to request approval"); } }); }
