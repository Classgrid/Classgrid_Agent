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
 * 2. "CLASSGRID ERP" is the actual PRODUCT NAME.
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

// ===================================================================
// classroomApi.ts — ALL API calls matching classroom.routes.js exactly
// ===================================================================
// Uses apiClient (Axios) — same pattern as useMyClassrooms.ts
// Every function maps 1:1 to a backend route.
// ===================================================================

import { apiClient } from '@/lib/apiClient';
import { isMainDown, toRescueUrl } from '@/lib/rescue';
import type {
  Classroom,
  ClassroomsListResponse,
  ClassroomMembersResponse,
  ClassroomRequestsResponse,
  ClassroomContentResponse,
  JoinByCodeResponse,
  TerminologyResponse,
  HierarchyTreeResponse,
  HierarchyNode,
} from '../types/classroom.types';

export const classroomApi = {
  // ── LIST ──
  // GET /api/classrooms — My classrooms (role-aware: faculty sees owned, student sees joined)
  listMyClassrooms: async () => {
    const { data } = await apiClient.get<ClassroomsListResponse>('/api/classrooms');
    return data;
  },

  // GET /api/classrooms/discover — Browse open classrooms in my org (students)
  discoverClassrooms: async (params?: { search?: string; subject?: string }) => {
    const { data } = await apiClient.get<ClassroomsListResponse>('/api/classrooms/discover', { params });
    return data;
  },

  // GET /api/classrooms/my-organization — All org classrooms
  getOrgClassrooms: async () => {
    const { data } = await apiClient.get<ClassroomsListResponse>('/api/classrooms/my-organization');
    return data;
  },

  // ── DETAIL ──
  // GET /api/classrooms/:id — Single classroom details
  getClassroomById: async (id: string) => {
    const { data } = await apiClient.get<{ classroom: Classroom }>(`/api/classrooms/${id}`);
    return data;
  },

  // ── CREATE / UPDATE / DELETE ──
  // POST /api/classrooms — Create classroom (faculty only)
  createClassroom: async (payload: Record<string, unknown>) => {
    const { data } = await apiClient.post<{ message: string; classroom: Classroom }>('/api/classrooms', payload);
    return data;
  },

  // PUT /api/classrooms/:id — Update classroom info
  updateClassroom: async (id: string, payload: Record<string, unknown>) => {
    const { data } = await apiClient.put(`/api/classrooms/${id}`, payload);
    return data;
  },

  // DELETE /api/classrooms/:id — Delete classroom
  deleteClassroom: async (id: string) => {
    const { data } = await apiClient.delete(`/api/classrooms/${id}`);
    return data;
  },

  // PUT /api/classrooms/:id/cover — Upload cover image
  uploadCover: async (id: string, formData: FormData) => {
    const { data } = await apiClient.put<{ message: string; coverImage: string }>(
      `/api/classrooms/${id}/cover`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data;
  },

  // ── JOIN ──
  // POST /api/classrooms/join-by-code — Student joins via 10-char code (auto-approve)
  joinByCode: async (classCode: string, requestMessage?: string) => {
    const { data } = await apiClient.post<JoinByCodeResponse>('/api/classrooms/join-by-code', {
      classCode,
      requestMessage,
    });
    return data;
  },

  // POST /api/classrooms/:id/join — Student requests to join (requires approval)
  requestToJoin: async (id: string, requestMessage?: string) => {
    const { data } = await apiClient.post(`/api/classrooms/${id}/join`, { requestMessage });
    return data;
  },

  // ── MEMBERS ──
  // GET /api/classrooms/:id/members — List classroom members
  getMembers: async (id: string) => {
    const { data } = await apiClient.get<ClassroomMembersResponse>(`/api/classrooms/${id}/members`);
    return data;
  },

  // GET /api/classrooms/:id/students — Get student list with full profiles
  getStudents: async (id: string) => {
    const { data } = await apiClient.get(`/api/classrooms/${id}/students`);
    return data;
  },

  // DELETE /api/classrooms/:id/members/:userId — Remove a student
  removeMember: async (classroomId: string, userId: string) => {
    const { data } = await apiClient.delete(`/api/classrooms/${classroomId}/members/${userId}`);
    return data;
  },

  // ── JOIN REQUESTS ──
  // GET /api/classrooms/:id/requests — Faculty: view pending join requests for one classroom
  getRequests: async (id: string) => {
    const { data } = await apiClient.get<ClassroomRequestsResponse>(`/api/classrooms/${id}/requests`);
    return data;
  },

  // GET /api/classrooms/all-requests — Faculty: all pending requests across ALL classrooms
  getAllRequests: async () => {
    const { data } = await apiClient.get<ClassroomRequestsResponse>('/api/classrooms/all-requests');
    return data;
  },

  // GET /api/classrooms/my-requests — Student: my pending requests
  getMyRequests: async () => {
    const { data } = await apiClient.get<ClassroomRequestsResponse>('/api/classrooms/my-requests');
    return data;
  },

  // PUT /api/classrooms/:id/requests/:requestId — Approve/reject single request
  respondToRequest: async (classroomId: string, requestId: string, action: 'approved' | 'rejected') => {
    const { data } = await apiClient.put(`/api/classrooms/${classroomId}/requests/${requestId}`, { action });
    return data;
  },

  // PUT /api/classrooms/:id/requests-bulk — Bulk approve/reject
  bulkRespondToRequests: async (classroomId: string, requestIds: string[], action: 'approved' | 'rejected') => {
    const { data } = await apiClient.put(`/api/classrooms/${classroomId}/requests-bulk`, { requestIds, action });
    return data;
  },

  // ── CONTENT (Materials, Announcements, Quizzes) ──
  // POST /api/classrooms/:id/content/:type — Add content
  addContent: async (classroomId: string, type: 'announcement' | 'material' | 'quiz', payload: Record<string, unknown>) => {
    const { data } = await apiClient.post(`/api/classrooms/${classroomId}/content/${type}`, payload);
    return data;
  },

  // GET /api/classrooms/:id/content/:type — Get content by type
  getContent: async (classroomId: string, type: 'announcement' | 'material' | 'quiz') => {
    const { data } = await apiClient.get<ClassroomContentResponse>(`/api/classrooms/${classroomId}/content/${type}`);
    return data;
  },

  // PUT /api/classrooms/:id/content/:type/:contentId — Update content
  updateContent: async (classroomId: string, type: string, contentId: string, payload: Record<string, unknown>) => {
    const { data } = await apiClient.put(`/api/classrooms/${classroomId}/content/${type}/${contentId}`, payload);
    return data;
  },

  // DELETE /api/classrooms/:id/content/:type/:contentId — Delete content
  deleteContent: async (classroomId: string, type: string, contentId: string) => {
    const { data } = await apiClient.delete(`/api/classrooms/${classroomId}/content/${type}/${contentId}`);
    return data;
  },

  // POST /api/classrooms/:id/notify — Send notification to all students
  sendNotification: async (classroomId: string, payload: { title: string; message: string; type?: string; link?: string }) => {
    const { data } = await apiClient.post(`/api/classrooms/${classroomId}/notify`, payload);
    return data;
  },

  // PUT /api/classrooms/:id/content/materials/:contentId/replace — Replace a PDF file
  replaceMaterial: async (classroomId: string, contentId: string, formData: FormData) => {
    const { data } = await apiClient.put(
      `/api/classrooms/${classroomId}/content/materials/${contentId}/replace`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data;
  },

  // POST /api/classrooms/:id/content/materials/:contentId/summarize — AI-summarize a PDF
  summarizeMaterial: async (classroomId: string, contentId: string) => {
    const { data } = await apiClient.post(`/api/classrooms/${classroomId}/content/materials/${contentId}/summarize`);
    return data;
  },

  // POST /api/classrooms/hf-summarize — AI text summarization
  summarizeText: async (text: string, title?: string) => {
    const { data } = await apiClient.post<{ summary: string }>('/api/classrooms/hf-summarize', { text, title });
    return data;
  },

  // ── UPLOADS ──
  // POST /api/classrooms/:id/upload-urls — Get presigned upload URLs
  getUploadUrls: async (classroomId: string, files: { filename: string; contentType: string }[]) => {
    const { data } = await apiClient.post(`/api/classrooms/${classroomId}/upload-urls`, { files });
    return data;
  },

  // ── NOTIFICATIONS ──
  // POST /api/classrooms/:id/notify — Send push notification to students
  notifyStudents: async (classroomId: string, payload: { title: string; message: string }) => {
    const { data } = await apiClient.post(`/api/classrooms/${classroomId}/notify`, payload);
    return data;
  },

  // ── MEETINGS ──
  // GET /api/classrooms/:id/meetings — Get classroom meetings
  getMeetings: async (classroomId: string) => {
    const { data } = await apiClient.get(`/api/classrooms/${classroomId}/meetings`);
    return data;
  },

  // ── PROXY ──
  // GET /api/classrooms/proxy/pdf?url=... — Proxy PDF for CORS
  getProxyPdfUrl: (fileUrl: string) => {
    const base = apiClient.defaults.baseURL || '';
    const url = `${base}/api/classrooms/proxy/pdf?url=${encodeURIComponent(fileUrl)}`;
    return isMainDown() ? toRescueUrl(url) : url;
  },
};

// ── HIERARCHY API (from hierarchy.routes.js) ──
export const hierarchyApi = {
  // GET /api/hierarchy/tree — Full nested hierarchy tree for the org
  getTree: async () => {
    const { data } = await apiClient.get<HierarchyTreeResponse>('/api/hierarchy/tree');
    return data;
  },

  // GET /api/hierarchy/terminology — Get org-specific UI labels
  getTerminology: async () => {
    const { data } = await apiClient.get<TerminologyResponse>('/api/hierarchy/terminology');
    return data;
  },

  // GET /api/hierarchy/children/:parentId — Direct children of a node
  getChildren: async (parentId: string) => {
    const { data } = await apiClient.get<{ children: HierarchyNode[] }>(`/api/hierarchy/children/${parentId}`);
    return data;
  },
};
