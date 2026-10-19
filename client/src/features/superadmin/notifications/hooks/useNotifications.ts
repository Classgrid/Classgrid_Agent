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

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { superAdminNotificationApi, NotificationTemplate, NotificationLog } from '../services/superAdminNotificationApi';
import { toast } from 'sonner';

// ----------------------------------------------------------------------
// TEMPLATES
// ----------------------------------------------------------------------

export const useNotificationTemplates = () => {
    return useQuery({
        queryKey: ['notification-templates'],
        queryFn: () => superAdminNotificationApi.getTemplates(),
    });
};

export const useNotificationTemplate = (id: string) => {
    return useQuery({
        queryKey: ['notification-template', id],
        queryFn: () => superAdminNotificationApi.getTemplate(id),
        enabled: !!id,
    });
};

export const useCreateNotificationTemplate = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Partial<NotificationTemplate>) => superAdminNotificationApi.createTemplate(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
            toast.success("Template created successfully");
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || "Failed to create template");
        }
    });
};

export const useUpdateNotificationTemplate = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<NotificationTemplate> }) => superAdminNotificationApi.updateTemplate(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
            queryClient.invalidateQueries({ queryKey: ['notification-template', variables.id] });
            toast.success("Template updated successfully");
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || "Failed to update template");
        }
    });
};

export const usePreviewNotificationTemplate = () => {
    return useMutation({
        mutationFn: (data: { htmlBody?: string; textBody?: string; subject?: string; data: any }) => superAdminNotificationApi.previewTemplate(data),
    });
};

// ----------------------------------------------------------------------
// LOGS
// ----------------------------------------------------------------------

export const useNotificationLogs = (filters: { orgId?: string; status?: string; type?: string; limit?: number; page?: number }) => {
    return useQuery({
        queryKey: ['notification-logs', filters],
        queryFn: () => superAdminNotificationApi.getLogs(filters),
    });
};

export const useNotificationLogDetails = (id: string) => {
    return useQuery({
        queryKey: ['notification-log', id],
        queryFn: () => superAdminNotificationApi.getLogDetails(id),
        enabled: !!id,
    });
};
