// Studio Mode: comments and quotes on lines of code (from the Files tab), kept per chat until the next message is sent.
// The Files tab adds them, the bar above the chat input lists them, and the sent question gets them as plain text.
import { useSyncExternalStore } from "react";
import { fetchWithRescue } from "@/lib/rescue";

const backendUrl = import.meta.env.VITE_API_URL || "https://api.classgrid.in";

export type CodeNote = {
  id: string;
  kind: "comment" | "quote";
  path: string;
  startLine: number;
  endLine: number;
  text: string; // the comment (empty for a quote)
  code: string; // the lines it is on, as they were when it was added
  createdAt: number;
  projectId?: string; // the Studio project the file is in (comments are also saved there)
};
// What a sent message keeps of each one (its chip in the chat)
export type CodeNoteChip = Pick<CodeNote, "kind" | "path" | "startLine" | "endLine" | "text">;

export const CODE_NOTES_EVENT = "classgrid:studio-code-notes";
const KEY = "cg_studio_code_notes:";

let chatId = "new";
let notes: CodeNote[] = read(chatId);

function read(id: string): CodeNote[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY + id) || "[]");
    return Array.isArray(list) ? list.filter((n) => n && typeof n.path === "string" && typeof n.startLine === "number") : [];
  } catch { return []; }
}
function save() {
  try {
    if (notes.length) localStorage.setItem(KEY + chatId, JSON.stringify(notes));
    else localStorage.removeItem(KEY + chatId);
  } catch { /* storage blocked */ }
}
function set(next: CodeNote[]) {
  notes = next;
  save();
  window.dispatchEvent(new CustomEvent(CODE_NOTES_EVENT));
}

// The open Studio chat (the chat panel tells it; a chat without an id yet is "new")
export function setCodeNotesChat(id: string | null | undefined) {
  const next = id || "new";
  if (next === chatId) return;
  chatId = next;
  notes = read(next);
  window.dispatchEvent(new CustomEvent(CODE_NOTES_EVENT));
}

export const getCodeNotes = () => notes;

// Every comment (not quotes) is also written to the project's .classgrid/code-comments.md; a failure (e.g. the
// project's code is not open right now) changes nothing in the chat
export const CODE_COMMENTS_SAVED_EVENT = "classgrid:studio-code-comments-saved";
function record(n: CodeNote, action: "added" | "edited" | "deleted") {
  if (n.kind !== "comment" || !n.projectId) return;
  const projectId = n.projectId;
  fetchWithRescue(`${backendUrl}/api/ide/projects/${projectId}/code-comments`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: n.path, startLine: n.startLine, endLine: n.endLine, comment: n.text, code: n.code, action }),
  })
    .then((res) => { if (res.ok) window.dispatchEvent(new CustomEvent(CODE_COMMENTS_SAVED_EVENT, { detail: { projectId } })); })
    .catch(() => { /* kept in the chat only */ });
}

export function addCodeNote(note: Omit<CodeNote, "id" | "createdAt">) {
  // The same lines quoted twice: one chip
  if (note.kind === "quote" && notes.some((n) => n.kind === "quote" && n.path === note.path && n.startLine === note.startLine && n.endLine === note.endLine)) return;
  const added: CodeNote = { ...note, id: Math.random().toString(36).slice(2, 10), createdAt: Date.now() };
  set([...notes, added]);
  record(added, "added");
}
export function updateCodeNote(id: string, text: string) {
  const old = notes.find((n) => n.id === id);
  if (!old || old.text === text) return;
  set(notes.map((n) => (n.id === id ? { ...n, text } : n)));
  record({ ...old, text }, "edited");
}
export function removeCodeNote(id: string) {
  const old = notes.find((n) => n.id === id);
  set(notes.filter((n) => n.id !== id));
  if (old) record(old, "deleted");
}
export const clearCodeNotes = () => { if (notes.length) set([]); };

export function subscribeCodeNotes(fn: () => void) {
  window.addEventListener(CODE_NOTES_EVENT, fn);
  return () => window.removeEventListener(CODE_NOTES_EVENT, fn);
}
export const useCodeNotes = () => useSyncExternalStore(subscribeCodeNotes, getCodeNotes, getCodeNotes);

export const lineLabel = (n: { startLine: number; endLine: number }) => (n.endLine > n.startLine ? `L${n.startLine}-${n.endLine}` : `L${n.startLine}`);
export const toChip = ({ kind, path, startLine, endLine, text }: CodeNote): CodeNoteChip => ({ kind, path, startLine, endLine, text });

const fenced = (code: string) => {
  const fence = code.includes("```") ? "````" : "```";
  return `${fence}\n${code}\n${fence}`;
};

// The comments and quotes as the plain text added to the question sent to the AI
export function codeNotesText(list: CodeNote[]): string {
  const comments = list.filter((n) => n.kind === "comment");
  const quotes = list.filter((n) => n.kind === "quote");
  const parts: string[] = [];
  if (comments.length) parts.push(`Comments on code:\n${comments.map((n) => `- ${n.path} ${lineLabel(n)}: ${n.text}\n${fenced(n.code)}`).join("\n")}`);
  if (quotes.length) parts.push(`Quoted code:\n${quotes.map((n) => `- ${n.path} ${lineLabel(n)}\n${fenced(n.code)}`).join("\n")}`);
  return parts.join("\n");
}

// A sent question read back from the chat history: the typed text, and the chips of its comments and quotes
const HEADERS = ["Comments on code:\n", "Quoted code:\n"];
export function splitCodeNotes(content: string): { text: string; chips: CodeNoteChip[] } | null {
  let at = HEADERS.some((h) => content.startsWith(h)) ? 0 : -1;
  if (at < 0) {
    for (const h of HEADERS) {
      const i = content.indexOf(`\n\n${h}`);
      if (i >= 0 && (at < 0 || i < at)) at = i;
    }
  }
  if (at < 0) return null;
  const chips: CodeNoteChip[] = [];
  let kind: CodeNote["kind"] = "comment";
  let fence: string | null = null;
  for (const line of content.slice(at).split("\n")) {
    if (fence) { if (line === fence) fence = null; continue; }
    if (line.startsWith("```")) { fence = line.startsWith("````") ? "````" : "```"; continue; }
    if (line === "Comments on code:") { kind = "comment"; continue; }
    if (line === "Quoted code:") { kind = "quote"; continue; }
    const m = line.startsWith("- ") ? /^- (.+?) L(\d+)(?:-(\d+))?(?::\s?(.*))?$/.exec(line) : null;
    if (m) {
      const startLine = Number(m[2]);
      chips.push({ kind, path: m[1]!, startLine, endLine: m[3] ? Number(m[3]) : startLine, text: m[4] || "" });
    } else if (kind === "comment" && chips.length) {
      chips[chips.length - 1]!.text += `\n${line}`; // a comment written on several lines
    }
  }
  return chips.length ? { text: content.slice(0, at).trim(), chips } : null;
}
