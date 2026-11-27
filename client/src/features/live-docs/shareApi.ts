// Sharing is the same for a live doc and for a published page (owner, 2026-11-16): people added by email with a
// role, access requests, general access and the link. This is the part of the two that the Share box, the "private"
// screen and the Report box work with, and the server calls behind them (/api/docs/<id> and /api/pages/<id> have
// the same sharing routes).
import type { LucideIcon } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import type { DocPerson, DocRequest, DocRole, InviteResult } from "./liveDocsApi";

/** What is shared: "doc" or "page" (the word shown to people). */
export type SharedKind = "doc" | "page";
/** The word a box uses for what it is about: a doc, a page, or a video (a page of kind "video"). */
export type ItemNoun = SharedKind | "video";

/** The fields of a live doc or a published page that sharing works with. */
export type Shared = {
  id: string;
  title: string;
  visibility: "private" | "link";
  linkRole: DocRole;
  isOwner: boolean;
  role: "owner" | DocRole;
  can: { comment: boolean; edit: boolean; share: boolean; manage: boolean };
  ownerName: string;
  ownerPhoto: string;
  people?: DocPerson[];
  requests?: DocRequest[];
};

export type ShareCalls<T extends Shared> = {
  kind: SharedKind;
  /** The link people are sent. */
  link: (id: string) => string;
  setAccess: (id: string, body: { visibility?: Shared["visibility"]; linkRole?: DocRole }) => Promise<T>;
  invitePeople: (id: string, emails: string, role: DocRole) => Promise<{ item: T; results: InviteResult[] }>;
  setPersonRole: (id: string, personId: string, role: DocRole) => Promise<T>;
  /** Answers null when it was this person themselves and they can't open it any more. */
  removePerson: (id: string, personId: string) => Promise<T | null>;
  makeOwner: (id: string, personId: string) => Promise<T>;
  requestAccess: (id: string, wants?: DocRole) => Promise<"pending" | "open">;
  answerRequest: (id: string, requestId: string, action: "approve" | "decline", role?: DocRole) => Promise<T>;
  setPinned: (id: string, pinned: boolean) => Promise<boolean>;
  duplicate: (id: string) => Promise<{ id: string; title: string }>;
  report: (id: string, reason: string, description: string) => Promise<void>;
  reportComment: (id: string, commentId: string, reason: string, description: string) => Promise<void>;
  /** The screen is being closed: this person is no longer shown as having it open. */
  leave: (id: string) => void;
};

/**
 * The sharing calls of /api/docs or /api/pages. `key`: the name the server sends the doc or page under
 * ("doc", "page").
 */
export function shareCalls<T extends Shared>(kind: SharedKind, root: string, key: string, site: string): ShareCalls<T> {
  const base = (id: string) => `${root}/${encodeURIComponent(id)}`;
  const one = (data: unknown) => (data as Record<string, T>)[key] as T;
  const part = encodeURIComponent;
  return {
    kind,
    link: (id) => `https://chat.classgrid.in/${site}/${id}`,
    setAccess: async (id, body) => one((await apiClient.patch(`${base(id)}/visibility`, body)).data),
    invitePeople: async (id, emails, role) => {
      const data = (await apiClient.post(`${base(id)}/members`, { emails, role })).data as { results: InviteResult[] };
      return { item: one(data), results: data.results || [] };
    },
    setPersonRole: async (id, personId, role) => one((await apiClient.patch(`${base(id)}/members/${part(personId)}`, { role })).data),
    removePerson: async (id, personId) => one((await apiClient.delete(`${base(id)}/members/${part(personId)}`)).data) || null,
    makeOwner: async (id, personId) => one((await apiClient.patch(`${base(id)}/members/${part(personId)}`, { role: "owner" })).data),
    requestAccess: async (id, wants = "viewer") => ((await apiClient.post(`${base(id)}/access-requests`, { wants })).data as { status: "pending" | "open" }).status,
    answerRequest: async (id, requestId, action, role) => one((await apiClient.post(`${base(id)}/access-requests/${part(requestId)}`, { action, role })).data),
    setPinned: async (id, pinned) => ((await apiClient.post(`${base(id)}/pin`, { pinned })).data as { pinned: boolean }).pinned,
    duplicate: async (id) => (await apiClient.post(`${base(id)}/duplicate`, {})).data as { id: string; title: string },
    report: async (id, reason, description) => { await apiClient.post(`${base(id)}/report`, { reason, description }); },
    reportComment: async (id, commentId, reason, description) => { await apiClient.post(`${base(id)}/comments/${part(commentId)}/report`, { reason, description }); },
    leave: (id) => {
      try {
        const token = localStorage.getItem("token");
        const api = String(apiClient.defaults.baseURL || "/").replace(/\/+$/, "");
        void fetch(`${api}${base(id)}/leave`, {
          method: "POST",
          keepalive: true,
          credentials: "include",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: "{}",
        }).catch(() => {});
      } catch { /* they stop being shown by themselves in half a minute */ }
    },
  };
}

/** One way to download the doc or page as a file, for the Share box's Export tab. */
export type ExportChoice = {
  id: string;
  name: string;
  about: string;
  icon: LucideIcon;
  run: () => Promise<void>;
  /** What the person is told when it is done ("Downloaded." when left out; "" for nothing). */
  done?: string;
};

/** Saves text or a file the browser already holds under `name`. */
export function saveFile(content: Blob | string, name: string, type = "text/plain") {
  const file = typeof content === "string" ? new Blob([content], { type }) : content;
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/** A title as a file name (no characters a file name can't have). */
export const fileName = (title: string, fallback = "document") => (title || fallback).replace(/[\\/:*?"<>|]+/g, " ").trim() || fallback;
