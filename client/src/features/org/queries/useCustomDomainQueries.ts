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

export interface CustomDomainConfig {
    domain: string | null;
    status: "pending_verification" | "verified" | "verified_with_conflicts" | "active" | "failed";
    verification_token: string | null;
    txt_verified: boolean;
    cname_verified: boolean;
    ssl_provisioned: boolean;
    allow_classgrid_url?: boolean;
    is_enabled?: boolean;
    verified_at: string | null;
    created_at: string | null;
}

export interface CustomDomainsResponse {
    custom_domain: CustomDomainConfig | null;
    erp_domain: CustomDomainConfig | null;
    purchased_modules?: any;
}

export function useUpdateCustomDomainSettings() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ domainType, settings }: { domainType: "custom_domain" | "erp_domain", settings: { allow_classgrid_url?: boolean, is_enabled?: boolean } }) => {
            const { data } = await apiClient.patch<{ success: boolean; message: string; custom_domain: CustomDomainConfig, erp_domain: CustomDomainConfig }>("/api/org-admin/custom-domain/settings", { ...settings, domainType });
            return data;
        },
        onSuccess: (data) => {
            queryClient.setQueryData(["org-custom-domain"], (old: any) => ({
                ...old,
                custom_domain: data.custom_domain,
                erp_domain: data.erp_domain
            }));
            queryClient.invalidateQueries({ queryKey: ["org-branding"] });
        },
    });
}

export function useCustomDomain() {
    return useQuery({
        queryKey: ["org-custom-domain"],
        queryFn: async () => {
            try {
                const { data } = await apiClient.get<CustomDomainsResponse>("/api/org-admin/custom-domain");
                return data;
            } catch (err: any) {
                if (err.response?.status === 403) return null; // Module not enabled
                throw err;
            }
        },
        retry: false,
    });
}

export function useRegisterCustomDomain() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ domainType, domain }: { domainType: "custom_domain" | "erp_domain", domain: string }) => {
            const { data } = await apiClient.post<{ success: boolean; message: string; custom_domain: CustomDomainConfig, erp_domain: CustomDomainConfig }>("/api/org-admin/custom-domain", { domain, domainType });
            return data;
        },
        onSuccess: (data) => {
            queryClient.setQueryData(["org-custom-domain"], (old: any) => ({
                ...old,
                custom_domain: data.custom_domain,
                erp_domain: data.erp_domain
            }));
            queryClient.invalidateQueries({ queryKey: ["org-branding"] });
        },
    });
}

export function useChangeCustomDomain() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ domainType, domain }: { domainType: "custom_domain" | "erp_domain", domain: string }) => {
            const { data } = await apiClient.patch<{
                success: boolean;
                message: string;
                custom_domain: CustomDomainConfig;
                erp_domain: CustomDomainConfig;
            }>("/api/org-admin/custom-domain", { domain, domainType });
            return data;
        },
        onSuccess: (data) => {
            queryClient.setQueryData(["org-custom-domain"], (old: CustomDomainsResponse | undefined) => ({
                ...old,
                custom_domain: data.custom_domain,
                erp_domain: data.erp_domain,
            }));
            queryClient.invalidateQueries({ queryKey: ["org-branding"] });
        },
    });
}

export function useVerifyCustomDomain() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ domainType }: { domainType: "custom_domain" | "erp_domain" }) => {
            const { data } = await apiClient.post<{ success: boolean; isFullyVerified: boolean; hasConflicts?: boolean; conflictingRecords?: string[]; message: string; custom_domain: CustomDomainConfig, erp_domain: CustomDomainConfig }>("/api/org-admin/custom-domain/verify", { domainType });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["org-custom-domain"] });
            queryClient.invalidateQueries({ queryKey: ["org-branding"] });
        },
    });
}

export function useRemoveCustomDomain() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ domainType }: { domainType: "custom_domain" | "erp_domain" }) => {
            const { data } = await apiClient.delete<{ success: boolean; message: string }>("/api/org-admin/custom-domain", {
                data: { domainType } // Axios sends body for DELETE in `data` property
            });
            return { ...data, domainType };
        },
        onSuccess: (data) => {
            queryClient.setQueryData(["org-custom-domain"], (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    [data.domainType]: {
                        domain: null,
                        status: "pending_verification",
                        verification_token: null,
                        txt_verified: false,
                        cname_verified: false,
                        ssl_provisioned: false,
                        allow_classgrid_url: true,
                        is_enabled: true
                    }
                };
            });
            queryClient.invalidateQueries({ queryKey: ["org-branding"] });
        },
    });
}
