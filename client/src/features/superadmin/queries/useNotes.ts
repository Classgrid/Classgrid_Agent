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

import { useQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { notesApi, GetNotesParams, Note } from "../services/notesApi";

export const useNotes = (params?: GetNotesParams) => {
  return useQuery({
    queryKey: ["superadmin-notes", params],
    queryFn: () => notesApi.getNotes(params),
  });
};

export const useNoteStats = () => {
  return useQuery({
    queryKey: ["superadmin-notes-stats"],
    queryFn: () => notesApi.getStats(),
  });
};

export const useNoteVersions = (noteId: string | undefined) => {
  return useQuery({
    queryKey: ["superadmin-notes-versions", noteId],
    queryFn: () => notesApi.getVersions(noteId!),
    enabled: !!noteId,
  });
};


// Note lists are cached under ["superadmin-notes", filters]; the counts and the history have their own keys.
const NOTES_LISTS = ["superadmin-notes"];
const NOTES_STATS = ["superadmin-notes-stats"];

/** Puts a saved note into every cached list at once, so the page can open it before the lists load again. */
function putNoteInLists(queryClient: QueryClient, note: Note, { addIfMissing }: { addIfMissing: boolean }) {
  queryClient.setQueriesData<Note[]>({ queryKey: NOTES_LISTS }, (old) => {
    if (!Array.isArray(old)) return old;
    if (old.some((n) => n._id === note._id)) return old.map((n) => (n._id === note._id ? note : n));
    return addIfMissing ? [note, ...old] : old;
  });
}

export const useCreateNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noteData: Partial<Note>) => notesApi.createNote(noteData),
    onSuccess: (note) => {
      if (note) putNoteInLists(queryClient, note, { addIfMissing: true });
      queryClient.invalidateQueries({ queryKey: NOTES_LISTS });
      queryClient.invalidateQueries({ queryKey: NOTES_STATS });
    },
  });
};

export const useUpdateNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...noteData }: Partial<Note> & { id: string }) => notesApi.updateNote(id, noteData),
    onSuccess: (note, { id }) => {
      if (note) putNoteInLists(queryClient, note, { addIfMissing: false });
      queryClient.invalidateQueries({ queryKey: NOTES_LISTS });
      queryClient.invalidateQueries({ queryKey: NOTES_STATS });
      // Every save keeps the old content as a version
      queryClient.invalidateQueries({ queryKey: ["superadmin-notes-versions", id] });
    },
  });
};

export const useDeleteNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notesApi.deleteNote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTES_LISTS });
      queryClient.invalidateQueries({ queryKey: NOTES_STATS });
    },
  });
};

export const useTogglePin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notesApi.togglePin(id),
    onSuccess: (note) => {
      if (note) putNoteInLists(queryClient, note, { addIfMissing: false });
      queryClient.invalidateQueries({ queryKey: NOTES_LISTS });
      queryClient.invalidateQueries({ queryKey: NOTES_STATS });
    },
  });
};
