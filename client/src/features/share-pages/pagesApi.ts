// Published pages API (/api/pages on the server): the page, its comments, and its sharing (the same sharing a live
// doc has: features/live-docs/shareApi.ts).
import { apiClient } from "@/lib/apiClient";
import type { DocReader, DocRole } from "@/features/live-docs/liveDocsApi";
import type { Thread } from "@/features/live-docs/DocComments";
import { shareCalls, type Shared } from "@/features/live-docs/shareApi";

/** A published page as the signed-in person is sent it. */
export type PageDoc = Shared & {
  /** The whole page (left out of the answers that only change who it is shared with). */
  html: string;
  versions: number;
  link: string;
  views: number;
  pinned: boolean;
  /** What this person asked the owner for and is still waiting on, or null. */
  asked: DocRole | null;
  comments: Thread[];
  createdAt: string;
  updatedAt: string;
};

const base = (id: string) => `/api/pages/${encodeURIComponent(id)}`;
const part = encodeURIComponent;

export const getPage = async (id: string, known?: string) =>
  (await apiClient.get<{ unchanged?: boolean; page?: PageDoc; reading?: DocReader[] }>(base(id), { params: known ? { known } : undefined })).data;

export const renamePage = async (id: string, title: string) => { await apiClient.patch(base(id), { title }); };

export const deletePage = async (id: string) => { await apiClient.delete(base(id)); };

/** A comment on the page (`quote`: the words of the page it is on). Answers the new comment's id and the page. */
export const addComment = async (id: string, text: string, quote: string) => {
  const data = (await apiClient.post<{ comment: { id: string }; page: PageDoc }>(`${base(id)}/comments`, { text, quote })).data;
  return { commentId: data.comment.id, page: data.page };
};

export const addReply = async (id: string, commentId: string, text: string) =>
  (await apiClient.post<{ page: PageDoc }>(`${base(id)}/comments`, { text, replyTo: commentId })).data.page;

export const resolveComment = async (id: string, commentId: string, resolved: boolean) =>
  (await apiClient.patch<{ page: PageDoc }>(`${base(id)}/comments/${part(commentId)}`, { resolved })).data.page;

/** Removes a comment with its replies (its writer, or an editor of the page). */
export const deleteComment = async (id: string, commentId: string) =>
  (await apiClient.delete<{ page: PageDoc }>(`${base(id)}/comments/${part(commentId)}`)).data.page;

/** The sharing calls of /api/pages, for the Share box. */
export const PAGE_SHARE = shareCalls<PageDoc>("page", "/api/pages", "page", "p");
