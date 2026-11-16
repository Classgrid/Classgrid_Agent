// A live doc and the chat beside it (owner, 2026-11-16: "for all use Studio mode", next to the screen where a doc
// sits beside the chat and is changed by asking). In Studio a doc opens as a tab of the right pane; the chat on the
// left is told which doc is open, so "make this shorter" or a comment sent to the AI is about that doc.
//
//   openDocInStudio(id)     another part of the page asks Studio to show a doc (Studio listens for OPEN_DOC_EVENT)
//   setOpenDoc / getOpenDoc the doc tab that is in front (the chat reads it when a message is sent)
//   docContextLine          the line added to the message for the AI; splitDocContext takes it off again when the
//                           message is shown, and gives the doc so the chat can show it as a small chip
import { useSyncExternalStore } from "react";

export type OpenDoc = { id: string; title: string };

export const OPEN_DOC_EVENT = "classgrid:open-live-doc";
export const openDocInStudio = (id: string) => window.dispatchEvent(new CustomEvent(OPEN_DOC_EVENT, { detail: { id } }));

/** Whether this screen is Studio (where a doc opens beside the chat). */
export const onStudio = () => window.location.pathname.split("/").includes("studio");

/**
 * The address that opens Studio with this doc beside the chat (and, with `ask`, sends that message to the AI).
 * From a chat in Agent mode it is the same chat, opened in Studio; from anywhere else a new chat.
 */
export function studioDocPath(id: string, ask?: string) {
  const path = window.location.pathname;
  const root = path.startsWith("/superadmin") ? "/superadmin/studio" : "/c/studio";
  const chat = /^\/(?:superadmin\/agent|c\/agent|agent)\/([0-9a-f-]{16,})(?:\/|$)/i.exec(path)?.[1];
  const query = new URLSearchParams({ doc: id });
  if (ask) query.set("ask", ask);
  return `${root}${chat ? `/${chat}` : ""}?${query.toString()}`;
}

let open: OpenDoc | null = null;
const listeners = new Set<() => void>();
export const getOpenDoc = () => open;
export function setOpenDoc(next: OpenDoc | null) {
  if (open?.id === next?.id && open?.title === next?.title) return;
  open = next;
  listeners.forEach((listener) => listener());
}
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
export const useOpenDoc = () => useSyncExternalStore(subscribe, getOpenDoc, getOpenDoc);

const LINK = "https://chat.classgrid.in/docs/";
const cleanTitle = (title: string) => title.replace(/["\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 200) || "Untitled";

/** What the AI is told about the doc beside the chat. */
export const docContextLine = (doc: OpenDoc) => `*(Live doc open beside this chat: "${cleanTitle(doc.title)}" ${LINK}${doc.id} . "This doc" means it.)*`;

const CONTEXT = /\n*\*\(Live doc open beside this chat: "([^"]*)" https:\/\/chat\.classgrid\.in\/docs\/([0-9a-f]{24}) \. "This doc" means it\.\)\*\s*$/i;

/** A sent message without its doc line, and the doc the line named. */
export function splitDocContext(text: string): { text: string; doc: OpenDoc | null } {
  const found = CONTEXT.exec(text);
  if (!found) return { text, doc: null };
  return { text: text.slice(0, found.index).trimEnd(), doc: { id: found[2]!.toLowerCase(), title: found[1] || "Untitled" } };
}

/** The message that asks the AI to answer one comment on a doc. */
export const commentAsk = (doc: OpenDoc, comment: { id: string; text: string; quote: string }) =>
  [
    `Answer my comment on the doc "${cleanTitle(doc.title)}" (${LINK}${doc.id}), comment_id ${comment.id}.`,
    comment.quote ? `It is about this part: "${comment.quote.replace(/\s+/g, " ").trim().slice(0, 400)}"` : "",
    `My comment: ${comment.text}`,
    "Read the doc, make the change if I asked for one, then reply under the comment.",
  ].filter(Boolean).join("\n");
