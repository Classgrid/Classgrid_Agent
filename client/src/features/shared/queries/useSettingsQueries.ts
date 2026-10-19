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
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";

export type EmailPrefs = {
  global: boolean;
  announcements: boolean;
  notes: boolean;
  quizzes: boolean;
  joinApproval: boolean;
  emailOnPost: boolean;
  digestMode: "instant" | "daily" | "weekly";
};

export function useEmailPreferences(enabled: boolean = true) {
  return useQuery({
    queryKey: ["email-preferences"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ emailNotifications: EmailPrefs }>("/api/user/email-preferences");
      return data.emailNotifications;
    },
    staleTime: 10 * 60 * 1000, // 10 mins
    enabled,
  });
}

export function useUpdateEmailPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prefs: Partial<EmailPrefs>) => {
      const { data } = await apiClient.put<{ message: string; emailNotifications: EmailPrefs }>("/api/user/email-preferences", prefs);
      return data.emailNotifications;
    },
    onSuccess: (updatedPrefs) => {
      queryClient.setQueryData(["email-preferences"], updatedPrefs);
      queryClient.invalidateQueries({ queryKey: ["email-preferences"] });
      toast.success("Settings saved successfully.");
    },
    onError: () => {
      toast.error("Failed to save settings. Please try again.");
    }
  });
}

export function useSaveFcmToken() {
  return useMutation({
    mutationFn: async (token: string) => {
      const { data } = await apiClient.post("/api/user/fcm-token", { token });
      return data;
    },
  });
}

// Student Specific Queries

export function useStudentFamilyInfo() {
  return useQuery({
    queryKey: ["student-family"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ familyInfo: any }>("/api/student-profile/family");
      return data.familyInfo;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useStudentQualifications() {
  return useQuery({
    queryKey: ["student-qualifications"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ qualifications: any[] }>("/api/student-profile/qualifications");
      return data.qualifications;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useStudentDocuments() {
  return useQuery({
    queryKey: ["student-documents"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ documents: any[] }>("/api/student-profile/documents");
      return data.documents;
    },
    staleTime: 5 * 60 * 1000,
  });
}
