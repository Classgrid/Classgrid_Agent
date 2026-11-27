// Published pages API (/api/pages on the server): the page, its comments, and its sharing (the same sharing a live
// doc has: features/live-docs/shareApi.ts).
import { apiClient } from "@/lib/apiClient";
import type { DocReader, DocRole } from "@/features/live-docs/liveDocsApi";
import type { Thread } from "@/features/live-docs/DocComments";
import { shareCalls, type Shared } from "@/features/live-docs/shareApi";

/** A box drawn on a video, each 0 to 1 of the frame (a tapped point has no width and height). */
export type VideoArea = { x: number; y: number; w: number; h: number };
/** Where a comment on a video is: its time (seconds), the end of a stretch of time, and a box on the frame. */
export type VideoMark = { time?: number | null; timeEnd?: number | null; area?: VideoArea | null };
/** A comment on a page; on a video it can also have a time and a box. */
export type PageComment = Thread & VideoMark;
/** One scene of a video, for the strip under it (times in seconds; `thumb`: a picture of its start). */
export type VideoScene = { title: string; start: number; end: number; thumb: string };
/** The video of a video artifact (a page of kind "video"). */
export type PageVideo = {
  url: string;
  poster: string;
  stills?: string[];
  seconds: number;
  width: number;
  height: number;
  fps?: number;
  scenes: VideoScene[];
};

/** A published page as the signed-in person is sent it. */
export type PageDoc = Shared & {
  /** "video": a video the AI made (`video`), with no HTML. Pages from before videos have no kind. */
  kind?: "page" | "video";
  video?: PageVideo | null;
  /** The whole page (left out of the answers that only change who it is shared with). */
  html: string;
  versions: number;
  link: string;
  views: number;
  pinned: boolean;
  /** What this person asked the owner for and is still waiting on, or null. */
  asked: DocRole | null;
  comments: PageComment[];
  createdAt: string;
  updatedAt: string;
};

const base = (id: string) => `/api/pages/${encodeURIComponent(id)}`;
const part = encodeURIComponent;

export const getPage = async (id: string, known?: string) =>
  (await apiClient.get<{ unchanged?: boolean; page?: PageDoc; reading?: DocReader[] }>(base(id), { params: known ? { known } : undefined })).data;

export const renamePage = async (id: string, title: string) => { await apiClient.patch(base(id), { title }); };

export const deletePage = async (id: string) => { await apiClient.delete(base(id)); };

/**
 * A comment on the page (`quote`: the words of the page it is on; `mark`: on a video, its time, stretch and box).
 * Answers the new comment's id and the page.
 */
export const addComment = async (id: string, text: string, quote: string, mark?: { time: number; timeEnd: number | null; area: VideoArea | null }) => {
  const data = (await apiClient.post<{ comment: { id: string }; page: PageDoc }>(`${base(id)}/comments`, { text, quote, ...mark })).data;
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
