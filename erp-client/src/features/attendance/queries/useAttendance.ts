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
import apiClient from "../../../lib/apiClient"; // Assuming standard apiClient location based on architecture

// ══════════════════════════════════════════════════════════════════════════════
// ATTENDANCE & LEAVE ENGINE — REACT QUERY BRIDGE
// Maps to the secure Phase 7 Phase /dashboard and /analytics backend routes
// ══════════════════════════════════════════════════════════════════════════════

// ── TYPES ─────────────────────────────────────────────────────────────────────

export interface StudentRecord {
    student_id: string;
    status: 'present' | 'absent' | 'leave' | 'late';
    remarks?: string;
}

export interface SubmitAttendancePayload {
    hierarchyId: string;
    date: string;
    sessionType?: string;
    studentRecordsArray: StudentRecord[];
}

export interface ApplyLeavePayload {
    hierarchyId: string;
    startDate: string;
    endDate: string;
    reason: string;
}

export interface ProcessLeavePayload {
    leaveRequestId: string;
    status: 'approved' | 'rejected';
    remarks?: string;
}

// ── ATTENDANCE INGESTION QUERIES ──────────────────────────────────────────────

export function useSubmitDailyAttendance() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: SubmitAttendancePayload) => {
            const res = await apiClient.post("/api/attendance/dashboard/submit", payload);
            return res.data.data;
        },
        onSuccess: (_, variables) => {
            // Auto-refresh the batch reports and registers to reflect the new attendance
            queryClient.invalidateQueries({ queryKey: ["attendance-register", variables.hierarchyId] });
            queryClient.invalidateQueries({ queryKey: ["batch-attendance-report", variables.hierarchyId] });
        }
    });
}

export function useGetAttendanceRegister(hierarchyId: string, date?: string, sessionType?: string) {
    return useQuery({
        queryKey: ["attendance-register", hierarchyId, date, sessionType],
        queryFn: async () => {
            let url = `/api/attendance/dashboard/register/${hierarchyId}`;
            const params = new URLSearchParams();
            if (date) params.append("date", date);
            if (sessionType) params.append("sessionType", sessionType);
            
            if (params.toString()) {
                url += `?${params.toString()}`;
            }

            const res = await apiClient.get(url);
            return res.data.data;
        },
        enabled: !!hierarchyId
    });
}

// ── ATTENDANCE ANALYTICS QUERIES ──────────────────────────────────────────────

export function useGetStudentAttendancePercentage(studentId: string, hierarchyId: string, startDate?: string, endDate?: string) {
    return useQuery({
        queryKey: ["student-attendance-percentage", studentId, hierarchyId, startDate, endDate],
        queryFn: async () => {
            let url = `/api/attendance/analytics/student/${studentId}/hierarchy/${hierarchyId}`;
            const params = new URLSearchParams();
            if (startDate) params.append("startDate", startDate);
            if (endDate) params.append("endDate", endDate);
            
            if (params.toString()) {
                url += `?${params.toString()}`;
            }

            const res = await apiClient.get(url);
            return res.data.data;
        },
        enabled: !!studentId && !!hierarchyId
    });
}

export function useGetBatchAttendanceReport(hierarchyId: string, date?: string) {
    return useQuery({
        queryKey: ["batch-attendance-report", hierarchyId, date],
        queryFn: async () => {
            let url = `/api/attendance/analytics/batch/${hierarchyId}`;
            const params = new URLSearchParams();
            if (date) params.append("date", date);
            
            if (params.toString()) {
                url += `?${params.toString()}`;
            }

            const res = await apiClient.get(url);
            return res.data.data;
        },
        enabled: !!hierarchyId
    });
}

// ── LEAVE WORKFLOW QUERIES ────────────────────────────────────────────────────

export function useApplyForLeave() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: ApplyLeavePayload) => {
            const res = await apiClient.post("/api/attendance/leave/apply", payload);
            return res.data.data;
        },
        onSuccess: () => {
            // Refresh the student's leave history
            queryClient.invalidateQueries({ queryKey: ["student-leave-history"] });
        }
    });
}

export function useGetPendingLeaveRequests(hierarchyId: string) {
    return useQuery({
        queryKey: ["pending-leave-requests", hierarchyId],
        queryFn: async () => {
            const res = await apiClient.get(`/api/attendance/leave/pending/${hierarchyId}`);
            return res.data.data;
        },
        enabled: !!hierarchyId
    });
}

export function useGetStudentLeaveHistory(studentId?: string) {
    return useQuery({
        queryKey: ["student-leave-history", studentId],
        queryFn: async () => {
            const url = studentId 
                ? `/api/attendance/leave/history/${studentId}` 
                : `/api/attendance/leave/history`;
            const res = await apiClient.get(url);
            return res.data.data;
        }
    });
}

export function useProcessLeaveRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: ProcessLeavePayload) => {
            const { leaveRequestId, ...body } = payload;
            const res = await apiClient.post(`/api/attendance/leave/process/${leaveRequestId}`, body);
            return res.data.data;
        },
        onSuccess: () => {
            // Auto-refresh the pending leave feeds and the main batch analytics
            // since processing an approved leave actively alters the master DB registers!
            queryClient.invalidateQueries({ queryKey: ["pending-leave-requests"] });
            queryClient.invalidateQueries({ queryKey: ["batch-attendance-report"] });
            queryClient.invalidateQueries({ queryKey: ["attendance-register"] });
        }
    });
}
