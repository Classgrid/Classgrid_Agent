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

import { apiClient } from "@/lib/apiClient";

export interface Note {
  _id: string;
  title: string;
  content: string;
  textContent: string;
  tags: string[];
  category: string;
  icon: string;
  status: string;
  visibility: string;
  isPinned: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteVersion {
  _id: string;
  noteId: string;
  title: string;
  content: string;
  textContent: string;
  tags: string[];
  category: string;
  icon: string;
  status: string;
  visibility: string;
  updatedBy: string;
  createdAt: string;
}

export interface NoteStats {
  total: number;
  pinned: number;
  private: number;
  shared: number;
}

export interface GetNotesParams {
  date?: string; // ISO string for specific date
  tag?: string;
  category?: string;
  visibility?: string;
  status?: string;
  search?: string;
}

export const notesApi = {
  getStats: async (): Promise<NoteStats> => {
    const { data } = await apiClient.get<{ success: boolean; stats: NoteStats }>("/api/super-admin/storage/notes/stats");
    return data.stats;
  },

  getVersions: async (noteId: string): Promise<NoteVersion[]> => {
    const { data } = await apiClient.get<{ success: boolean; versions: NoteVersion[] }>(`/api/super-admin/storage/notes/${noteId}/versions`);
    return data.versions;
  },

  getNotes: async (params?: GetNotesParams): Promise<Note[]> => {
    const { data } = await apiClient.get<{ success: boolean; notes: Note[] }>("/api/super-admin/storage/notes", { params });
    return data.notes;
  },

  createNote: async (noteData: Partial<Note>): Promise<Note> => {
    const { data } = await apiClient.post<{ success: boolean; note: Note }>("/api/super-admin/storage/notes", noteData);
    return data.note;
  },

  updateNote: async (id: string, noteData: Partial<Note>): Promise<Note> => {
    const { data } = await apiClient.put<{ success: boolean; note: Note }>(`/api/super-admin/storage/notes/${id}`, noteData);
    return data.note;
  },

  deleteNote: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/super-admin/storage/notes/${id}`);
  },

  togglePin: async (id: string): Promise<Note> => {
    const { data } = await apiClient.patch<{ success: boolean; note: Note }>(`/api/super-admin/storage/notes/${id}/pin`);
    return data.note;
  },
};
