// Live docs API (/api/docs on the server)
import { apiClient } from "@/lib/apiClient";

export type LiveDocReply = { name: string; text: string; at: string; byAI: boolean };
export type LiveDocComment = { id: string; userId: string; name: string; text: string; quote: string; at: string; resolved: boolean; replies: LiveDocReply[] };
export type LiveDocVersion = { id: string; at: string; by: "user" | "ai" };
export type LiveDoc = {
  id: string;
  title: string;
  markdown: string;
  visibility: "private" | "link";
  rev: number;
  lastBy: "user" | "ai";
  isOwner: boolean;
  ownerName: string;
  comments: LiveDocComment[];
  versions: LiveDocVersion[];
  createdAt: string;
  updatedAt: string;
};

const base = (id: string) => `/api/docs/${encodeURIComponent(id)}`;

export const getDoc = async (id: string, known?: string) =>
  (await apiClient.get<{ unchanged?: boolean; doc?: LiveDoc }>(base(id), { params: known ? { known } : undefined })).data;

export const saveDoc = async (id: string, body: { title?: string; markdown?: string; rev?: number; force?: boolean }) =>
  (await apiClient.put<{ doc: LiveDoc }>(base(id), body)).data.doc;

export const setVisibility = async (id: string, visibility: LiveDoc["visibility"]) =>
  (await apiClient.patch<{ visibility: LiveDoc["visibility"] }>(`${base(id)}/visibility`, { visibility })).data.visibility;

export const getVersion = async (id: string, vid: string) =>
  (await apiClient.get<{ version: LiveDocVersion & { markdown: string } }>(`${base(id)}/versions/${encodeURIComponent(vid)}`)).data.version;

export const addComment = async (id: string, text: string, quote: string) =>
  (await apiClient.post<{ doc: LiveDoc }>(`${base(id)}/comments`, { text, quote })).data.doc;

export const addReply = async (id: string, cid: string, text: string) =>
  (await apiClient.post<{ doc: LiveDoc }>(`${base(id)}/comments/${encodeURIComponent(cid)}/replies`, { text })).data.doc;

export const resolveComment = async (id: string, cid: string, resolved: boolean) =>
  (await apiClient.patch<{ doc: LiveDoc }>(`${base(id)}/comments/${encodeURIComponent(cid)}`, { resolved })).data.doc;

// Downloads the Word or PDF file
export async function exportDoc(id: string, format: "docx" | "pdf", title: string) {
  const res = await apiClient.get(`${base(id)}/export`, { params: { format }, responseType: "blob", timeout: 120000 });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(title || "document").replace(/[\\/:*?"<>|]+/g, " ").trim() || "document"}.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export const errorText = (e: any, fallback = "Something went wrong. Please try again.") =>
  String(e?.response?.data?.message || fallback);
