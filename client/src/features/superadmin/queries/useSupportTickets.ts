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
import { useState } from "react";
import type { TicketStatus, TicketPriority } from "../services/superAdminApi";
import { supportApi } from "../services/superAdminApi";
import { toast } from "sonner";

export const TICKETS_KEY = ["super-admin", "support-tickets"] as const;

interface UseSupportTicketsProps {
  status?: string;
  priority?: string;
  type?: "inquiry" | "support";
  page?: number;
  limit?: number;
}

export function useSupportTickets(params?: UseSupportTicketsProps) {
  return useQuery({
    queryKey: [...TICKETS_KEY, params],
    queryFn: () => supportApi.getAllTickets(params),
    staleTime: 30_000,
  });
}

export function useUpdateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: {
      id: string;
      status?: TicketStatus;
      priority?: TicketPriority;
      assignedTo?: string;
    }) => supportApi.updateTicket(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: TICKETS_KEY }),
  });
}

export function useReplyToTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, message, files, sendEmail }: { id: string; message: string; files?: File[]; sendEmail?: boolean }) =>
      supportApi.replyToTicket(id, message, files, sendEmail),
    onSuccess: () => qc.invalidateQueries({ queryKey: TICKETS_KEY }),
  });
}

export function useEditTicketReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, replyId, message }: { ticketId: string; replyId: string; message: string }) =>
      supportApi.editTicketReply(ticketId, replyId, message),
    onSuccess: () => qc.invalidateQueries({ queryKey: TICKETS_KEY }),
  });
}

export function useDeleteTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => supportApi.deleteTicket(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TICKETS_KEY });
      toast.success("Support ticket deleted successfully");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to delete ticket");
    }
  });
}

export function useTicketDraft(ticketId: string | null) {
  return useQuery({
    queryKey: ["super-admin", "ticket-draft", ticketId],
    queryFn: () => ticketId ? supportApi.getTicketDraft(ticketId) : null,
    enabled: !!ticketId,
    staleTime: 0,
  });
}

export function useSaveTicketDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, draftContent }: { id: string; draftContent: string }) =>
      supportApi.saveTicketDraft(id, draftContent),
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ["super-admin", "ticket-draft", variables.id] });
    },
  });
}
