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

import axios from 'axios';
import { getAuthHeader } from '@/features/auth/services/authApi';
import { isMainDownStatus, markMainDown, toRescueUrl } from '@/lib/rescue';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const withRescue = async <T>(url: string, call: (target: string) => Promise<T>): Promise<T> => {
    try {
        return await call(url);
    } catch (err: any) {
        if (!isMainDownStatus(err?.response?.status)) throw err;
        markMainDown();
        return call(toRescueUrl(url));
    }
};

export interface NotificationTemplate {
    _id: string;
    name: string;
    type: 'EMAIL' | 'SMS';
    category: 'PAYMENT' | 'ADMISSION' | 'SAAS' | 'SYSTEM';
    subject?: string;
    htmlBody?: string;
    textBody?: string;
    requiredPlaceholders: string[];
    description?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface NotificationLog {
    _id: string;
    organizationId: { _id: string; name: string; code: string };
    userId?: string;
    templateId?: { _id: string; name: string; category: string };
    type: 'EMAIL' | 'SMS';
    recipient: string;
    status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED';
    providerMessageId?: string;
    failureReason?: string;
    metadata?: any;
    createdAt: string;
}

export const superAdminNotificationApi = {
    // -------------------------------------------------------------
    // TEMPLATES
    // -------------------------------------------------------------
    getTemplates: async (): Promise<NotificationTemplate[]> => {
        const response = await withRescue(`${API_URL}/super-admin/notifications-sys/templates`, (url) => axios.get(url, {
            headers: getAuthHeader(),
        }));
        return response.data.data;
    },

    getTemplate: async (id: string): Promise<NotificationTemplate> => {
        const response = await withRescue(`${API_URL}/super-admin/notifications-sys/templates/${id}`, (url) => axios.get(url, {
            headers: getAuthHeader(),
        }));
        return response.data.data;
    },

    createTemplate: async (data: Partial<NotificationTemplate>): Promise<NotificationTemplate> => {
        const response = await withRescue(`${API_URL}/super-admin/notifications-sys/templates`, (url) => axios.post(url, data, {
            headers: getAuthHeader(),
        }));
        return response.data.data;
    },

    updateTemplate: async (id: string, data: Partial<NotificationTemplate>): Promise<NotificationTemplate> => {
        const response = await withRescue(`${API_URL}/super-admin/notifications-sys/templates/${id}`, (url) => axios.put(url, data, {
            headers: getAuthHeader(),
        }));
        return response.data.data;
    },

    previewTemplate: async (data: { htmlBody?: string; textBody?: string; subject?: string; data: any }): Promise<{ subject: string; html: string; text: string }> => {
        const response = await withRescue(`${API_URL}/super-admin/notifications-sys/templates/preview`, (url) => axios.post(url, data, {
            headers: getAuthHeader(),
        }));
        return response.data.data;
    },

    // -------------------------------------------------------------
    // LOGS
    // -------------------------------------------------------------
    getLogs: async (params: { orgId?: string; status?: string; type?: string; limit?: number; page?: number }): Promise<{ logs: NotificationLog[]; total: number; pages: number }> => {
        const response = await withRescue(`${API_URL}/super-admin/notifications-sys/logs`, (url) => axios.get(url, {
            headers: getAuthHeader(),
            params
        }));
        return response.data.data;
    },

    getLogDetails: async (id: string): Promise<NotificationLog> => {
        const response = await withRescue(`${API_URL}/super-admin/notifications-sys/logs/${id}`, (url) => axios.get(url, {
            headers: getAuthHeader(),
        }));
        return response.data.data;
    },
};
