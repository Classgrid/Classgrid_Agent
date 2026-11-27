// Published pages and video artifacts (/api/pages on the server) as the chat card and the Docs list read them.
// A video the AI makes (make_video) is a published page with kind "video", at the same address as any page:
// chat.classgrid.in/p/<id>. Pages made before videos existed have no kind and are kind "page".
import { useEffect, useSyncExternalStore } from "react";
import { apiClient } from "@/lib/apiClient";
import type { DocRole } from "./liveDocsApi";

export type PageKind = "page" | "video";
/** What the card and the list need of a video: the MP4, its first picture and its length. */
export type VideoBrief = { url: string; poster: string; seconds: number };

/** A published page or a video in the Docs list. */
export type PageRow = {
  id: string;
  title: string;
  kind: PageKind;
  video: VideoBrief | null;
  visibility: "private" | "link";
  role: "owner" | DocRole;
  shared: boolean;
  ownerName: string;
  ownerPhoto: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

// (what the server sends, read field by field)
type Raw = Record<string, unknown>;
const record = (value: unknown): Raw => (value && typeof value === "object" ? (value as Raw) : {});
const text = (value: unknown) => (typeof value === "string" ? value : "");
const kindOf = (raw: Raw): PageKind => (raw.kind === "video" ? "video" : "page");
function videoOf(raw: Raw): VideoBrief | null {
  if (kindOf(raw) !== "video") return null;
  const v = record(raw.video);
  const seconds = Number(v.seconds);
  return { url: text(v.url), poster: text(v.poster), seconds: Number.isFinite(seconds) && seconds > 0 ? seconds : 0 };
}
const ROLES = new Set(["owner", "viewer", "commenter", "editor"]);
function rowOf(raw: Raw, mine: boolean): PageRow {
  const role = text(raw.role);
  return {
    id: text(raw.id),
    title: text(raw.title),
    kind: kindOf(raw),
    video: videoOf(raw),
    visibility: raw.visibility === "link" ? "link" : "private",
    role: ROLES.has(role) ? (role as PageRow["role"]) : mine ? "owner" : "viewer",
    shared: !!raw.shared,
    ownerName: text(raw.ownerName),
    ownerPhoto: text(raw.ownerPhoto),
    pinned: !!raw.pinned,
    createdAt: text(raw.createdAt),
    updatedAt: text(raw.updatedAt) || text(raw.createdAt),
  };
}

/** The person's own pages and videos, and the ones shared with them by name. */
export async function listPages(): Promise<{ mine: PageRow[]; shared: PageRow[] }> {
  const data = (await apiClient.get<{ pages?: unknown[]; shared?: unknown[] }>("/api/pages")).data || {};
  const rows = (list: unknown, mine: boolean) => (Array.isArray(list) ? list : []).map((raw) => rowOf(record(raw), mine)).filter((r) => r.id);
  return { mine: rows(data.pages, true), shared: rows(data.shared, false) };
}

/** "45s", or "2:09" from a minute up. */
export function lengthText(seconds: number) {
  const s = Math.round(seconds);
  if (!(s > 0)) return "";
  if (s < 60) return `${s}s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${rest}` : `${m}:${rest}`;
}

/** The page id of a link to a published page (https://chat.classgrid.in/p/<id>, or /p/<id> on this site), or null. */
export function pageIdOf(href: string | undefined | null): string | null {
  if (!href) return null;
  const relative = /^\/p\/([0-9a-f]{24})(?:[/?#]|$)/i.exec(href);
  if (relative) return relative[1]!.toLowerCase();
  let u: URL;
  try { u = new URL(href); } catch { return null; }
  const here = typeof window !== "undefined" ? window.location.host : "";
  if (!/^https?:$/.test(u.protocol) || (u.host !== "chat.classgrid.in" && u.host !== here)) return null;
  const found = /^\/p\/([0-9a-f]{24})\/?$/i.exec(u.pathname);
  return found ? found[1]!.toLowerCase() : null;
}

// ── One page at a time, for the chat card ──

/** What the chat card shows of a published page. */
export type ArtifactInfo = { kind: PageKind; title: string; video: VideoBrief | null };
/**
 * info: undefined while it was never read or is being read the first time; null when it could not be read (the link
 * then stays as it is). video: an answer's own make_video step said this page is a video, so the card (not the plain
 * link) is drawn while it loads.
 */
export type ArtifactEntry = { info: ArtifactInfo | null | undefined; at: number; video: boolean };

const entries = new Map<string, ArtifactEntry>();
const listeners = new Set<() => void>();
const tell = () => listeners.forEach((listener) => listener());
// (a card shown again after this long reads the page again, so a video changed at the same link shows its new
// title and length; the old ones stay on the card until the new ones come)
const FRESH_MS = 30_000;
// (the card reads only what it draws, with `card=1`: the server sends the kind, title and the video's poster and
// length, and does not count a view, tie an email invite to this account or mark the person as reading)

async function fetchArtifact(id: string) {
  const before = entries.get(id);
  entries.set(id, { info: before?.info, at: Date.now(), video: !!before?.video });
  let info: ArtifactInfo | null;
  try {
    const data = record((await apiClient.get(`/api/pages/${encodeURIComponent(id)}`, { params: { card: 1 } })).data);
    const page = data.page && typeof data.page === "object" ? record(data.page) : null;
    info = page ? { kind: kindOf(page), title: text(page.title), video: videoOf(page) } : null;
  } catch {
    info = null;
  }
  // (a page that was read before keeps what it showed when reading it again fails)
  const now = entries.get(id);
  entries.set(id, { info: info ?? before?.info ?? null, at: Date.now(), video: !!now?.video || info?.kind === "video" });
  tell();
}

// The make_video steps already taken into account (step id and page id): a new one for a page read before means a
// new version of the video at the same link, so the page is read again.
const stepsSeen = new Set<string>();

function want(id: string, videoStep?: string) {
  const entry = entries.get(id);
  if (videoStep && !stepsSeen.has(`${videoStep}:${id}`)) {
    stepsSeen.add(`${videoStep}:${id}`);
    if (entry) {
      entry.video = true;
      // (read before: read again now; still being read the first time: that read is already new enough)
      if (entry.info !== undefined) { void fetchArtifact(id); return; }
    }
  }
  if (!entry) {
    if (videoStep) entries.set(id, { info: undefined, at: 0, video: true });
    void fetchArtifact(id);
  } else if (entry.info !== undefined && Date.now() - entry.at > FRESH_MS) {
    void fetchArtifact(id);
  }
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

/**
 * The published page behind a /p/<id> link, read once per id and shared by every card of it. `videoStep`: the id of
 * this answer's make_video step that made this page (see videoStepsOf), when there is one.
 */
export function useArtifact(id: string, videoStep?: string): ArtifactEntry | undefined {
  const entry = useSyncExternalStore(subscribe, () => entries.get(id));
  useEffect(() => { want(id, videoStep); }, [id, videoStep]);
  return entry;
}

// make_video answers with the video's page on its own line: "Artifact: https://chat.classgrid.in/p/<id>"
const ARTIFACT_LINE = /^\s*Artifact:\s*https:\/\/chat\.classgrid\.in\/p\/([0-9a-f]{24})(?![0-9a-z])/gim;

/** The pages an answer's own make_video steps made, as page id -> the step's id. */
export function videoStepsOf(steps: readonly unknown[] | undefined): Map<string, string> {
  const made = new Map<string, string>();
  for (const raw of steps || []) {
    const step = record(raw);
    if (step.type !== "tool" || step.tool !== "make_video" || typeof step.result !== "string") continue;
    for (const found of step.result.matchAll(ARTIFACT_LINE)) made.set(found[1]!.toLowerCase(), text(step.id) || text(step.call) || step.result);
  }
  return made;
}

/** The same, as one line: it changes only when a make_video step of the answer names a page. */
export const videoStepsKey = (steps: readonly unknown[] | undefined) =>
  [...videoStepsOf(steps)].map(([page, step]) => `${page}=${step}`).join(",");
