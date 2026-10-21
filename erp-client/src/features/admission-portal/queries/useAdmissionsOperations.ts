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

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import apiClient from "@/lib/apiClient";

export const useGeneratePRNs = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (applicationIds: string[]) => {
      const { data } = await apiClient.post("/api/admission/generate-prns", {
        application_ids: applicationIds,
      });
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "PRNs generated successfully.");
      queryClient.invalidateQueries({ queryKey: ["admissions"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to generate PRNs.");
    },
  });
};

export const useAllocateDivisions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { hierarchy_id: string; method: string; divisions: { name: string; capacity: number }[] }) => {
      const { data } = await apiClient.post("/api/admission/allocate-divisions", payload);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Divisions allocated successfully.");
      queryClient.invalidateQueries({ queryKey: ["admissions"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to allocate divisions.");
    },
  });
};

export const useDownloadGovtExport = () => {
  return useMutation({
    mutationFn: async (exportType: "dte" | "saral" | "aicte" | "state-board") => {
      // For file downloads, we expect the backend to return JSON with { csv, filename } 
      // or we handle blob. The backend seems to return JSON { csv: "...", filename: "..." }
      const { data } = await apiClient.get(`/api/admission/export/${exportType}`);
      return data;
    },
    onSuccess: (data) => {
      if (data.csv && data.filename) {
        const blob = new Blob([data.csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", data.filename);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Downloaded ${data.filename}`);
      } else {
        toast.error("Invalid export data received.");
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to download export.");
    },
  });
};
