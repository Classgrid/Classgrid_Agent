// Live docs API (/api/docs on the server)
import { apiClient } from "@/lib/apiClient";

export type DocRole = "viewer" | "commenter" | "editor";
export type LiveDocReply = { name: string; photo?: string; text: string; at: string; byAI: boolean };
export type LiveDocComment = { id: string; userId: string; name: string; photo?: string; text: string; quote: string; at: string; resolved: boolean; replies: LiveDocReply[] };
export type LiveDocVersion = { id: string; at: string; by: "user" | "ai" };
/** A person the doc is shared with (only the owner is sent these). `joined`: they have a Classgrid account. */
export type DocPerson = { id: string; email: string; name: string; photo: string; role: DocRole; joined: boolean; me: boolean; addedAt?: string };
/** Someone who asked the owner for access. */
export type DocRequest = { id: string; email: string; name: string; photo: string; wants: DocRole; has: "owner" | DocRole | null; at: string };
/** Someone who has the doc open right now. */
export type DocReader = { id: string; name: string; photo: string; me: boolean };
export type LiveDoc = {
  id: string;
  title: string;
  markdown: string;
  visibility: "private" | "link";
  linkRole: DocRole;
  rev: number;
  lastBy: "user" | "ai";
  isOwner: boolean;
  role: "owner" | DocRole;
  can: { comment: boolean; edit: boolean; share: boolean; manage: boolean };
  ownerName: string;
  ownerPhoto: string;
  views: number;
  pinned: boolean;
  /** What this person asked the owner for and is still waiting on ("editor": they asked to edit), or null. */
  asked: DocRole | null;
  comments: LiveDocComment[];
  versions: LiveDocVersion[];
  people?: DocPerson[];
  requests?: DocRequest[];
  createdAt: string;
  updatedAt: string;
};
/** A doc in the list (no text). */
export type DocRow = {
  id: string;
  title: string;
  visibility: "private" | "link";
  role: "owner" | DocRole;
  shared: boolean;
  ownerName: string;
  ownerPhoto: string;
  pinned: boolean;
  lastBy: "user" | "ai";
  createdAt: string;
  updatedAt: string;
};
export type ExportFormat = "docx" | "pdf" | "md" | "html";
export type InviteResult = { email: string; ok?: boolean; already?: boolean; error?: string; note?: string };

const base = (id: string) => `/api/docs/${encodeURIComponent(id)}`;

export const listDocs = async () => (await apiClient.get<{ docs: DocRow[]; shared: DocRow[] }>("/api/docs")).data;

export const getDoc = async (id: string, known?: string) =>
  (await apiClient.get<{ unchanged?: boolean; doc?: LiveDoc; reading?: DocReader[] }>(base(id), { params: known ? { known } : undefined })).data;

export const saveDoc = async (id: string, body: { title?: string; markdown?: string; rev?: number; force?: boolean }) =>
  (await apiClient.put<{ doc: LiveDoc }>(base(id), body)).data.doc;

/** General access: private or anyone with the link, and what the link lets people do. */
export const setAccess = async (id: string, body: { visibility?: LiveDoc["visibility"]; linkRole?: DocRole }) =>
  (await apiClient.patch<{ doc: LiveDoc }>(`${base(id)}/visibility`, body)).data.doc;

export const deleteDoc = async (id: string) => { await apiClient.delete(base(id)); };

export const getVersion = async (id: string, vid: string) =>
  (await apiClient.get<{ version: LiveDocVersion & { markdown: string } }>(`${base(id)}/versions/${encodeURIComponent(vid)}`)).data.version;

export const addComment = async (id: string, text: string, quote: string) =>
  (await apiClient.post<{ doc: LiveDoc; commentId: string }>(`${base(id)}/comments`, { text, quote })).data;

export const addReply = async (id: string, cid: string, text: string) =>
  (await apiClient.post<{ doc: LiveDoc }>(`${base(id)}/comments/${encodeURIComponent(cid)}/replies`, { text })).data.doc;

export const resolveComment = async (id: string, cid: string, resolved: boolean) =>
  (await apiClient.patch<{ doc: LiveDoc }>(`${base(id)}/comments/${encodeURIComponent(cid)}`, { resolved })).data.doc;

/** Removes a comment with its replies (its writer, or an editor of the doc). */
export const deleteComment = async (id: string, cid: string) =>
  (await apiClient.delete<{ doc: LiveDoc }>(`${base(id)}/comments/${encodeURIComponent(cid)}`)).data.doc;

export const reportComment = async (id: string, cid: string, reason: string, description: string) => {
  await apiClient.post(`${base(id)}/comments/${encodeURIComponent(cid)}/report`, { reason, description });
};

// ── Sharing ──

export const invitePeople = async (id: string, emails: string, role: DocRole) =>
  (await apiClient.post<{ doc: LiveDoc; results: InviteResult[] }>(`${base(id)}/members`, { emails, role })).data;

export const setPersonRole = async (id: string, personId: string, role: DocRole) =>
  (await apiClient.patch<{ doc: LiveDoc }>(`${base(id)}/members/${encodeURIComponent(personId)}`, { role })).data.doc;

/** Takes a person off the doc. Answers null when it was this person themselves and they can't open it any more. */
export const removePerson = async (id: string, personId: string) =>
  (await apiClient.delete<{ doc?: LiveDoc; left?: boolean }>(`${base(id)}/members/${encodeURIComponent(personId)}`)).data.doc || null;

/** The owner hands the doc to a person it is shared with (the owner stays on it as an editor). */
export const makeOwner = async (id: string, personId: string) =>
  (await apiClient.patch<{ doc: LiveDoc }>(`${base(id)}/members/${encodeURIComponent(personId)}`, { role: "owner" })).data.doc;

/** Asks the owner for access: to open a doc this person can't open, or (wants "editor") to edit one they can read. */
export const requestAccess = async (id: string, wants: DocRole = "viewer") =>
  (await apiClient.post<{ status: "pending" | "open" }>(`${base(id)}/access-requests`, { wants })).data.status;

export const answerRequest = async (id: string, requestId: string, action: "approve" | "decline", role?: DocRole) =>
  (await apiClient.post<{ doc: LiveDoc }>(`${base(id)}/access-requests/${encodeURIComponent(requestId)}`, { action, role })).data.doc;

// ── The doc's own menu ──

export const duplicateDoc = async (id: string) => (await apiClient.post<{ id: string; title: string }>(`${base(id)}/duplicate`, {})).data;

export const setPinned = async (id: string, pinned: boolean) => (await apiClient.post<{ pinned: boolean }>(`${base(id)}/pin`, { pinned })).data.pinned;

export const reportDoc = async (id: string, reason: string, description: string) => { await apiClient.post(`${base(id)}/report`, { reason, description }); };

/** The page is being closed: this person is no longer shown as reading the doc. */
export function leaveDoc(id: string) {
  try {
    const token = localStorage.getItem("token");
    const root = String(apiClient.defaults.baseURL || "/").replace(/\/+$/, "");
    void fetch(`${root}${base(id)}/leave`, {
      method: "POST",
      keepalive: true,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: "{}",
    }).catch(() => {});
  } catch { /* they stop being shown by themselves in half a minute */ }
}

export const EXPORTS: { format: ExportFormat; name: string; about: string }[] = [
  { format: "docx", name: "Word", about: "A .docx file for Microsoft Word and Google Docs" },
  { format: "pdf", name: "PDF", about: "A file that looks the same everywhere, ready to print" },
  { format: "md", name: "Markdown", about: "A plain text .md file" },
  { format: "html", name: "Web page", about: "One .html file that opens in any browser" },
];

/**
 * Downloads the doc as a file. Throws an Error with the server's own reason when the file could not be made (the
 * answer is a file, so the reason arrives as one too and is read from it).
 */
export async function exportDoc(id: string, format: ExportFormat, title: string) {
  const res = await apiClient.get(`${base(id)}/export`, { params: { format }, responseType: "blob", timeout: 120000, validateStatus: () => true });
  const file = res.data as Blob;
  if (res.status < 200 || res.status >= 300) {
    let reason = "";
    try { reason = String(JSON.parse(await file.text())?.message || ""); } catch { /* not a message from the server */ }
    throw new Error(reason || `The file could not be made (the server answered ${res.status}). Please try again.`);
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(title || "document").replace(/[\\/:*?"<>|]+/g, " ").trim() || "document"}.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// (apiClient hands a failed request on as { ...the server's answer, message, code: "<status>" })
export const errorText = (e: any, fallback = "Something went wrong. Please try again.") =>
  String(e?.response?.data?.message || e?.message || fallback);

/** The server's status of a failed request (409: the doc changed while it was being edited). */
export const errorStatus = (e: any): number => Number(e?.response?.status || e?.code) || 0;

/** Whether the server said "you can't open this doc" (and whether this person already asked for access). */
export const privateAnswer = (e: any): { requested: boolean } | null => {
  const data = e?.response?.data ?? e;
  return data?.private === true ? { requested: !!data.requested } : null;
};
