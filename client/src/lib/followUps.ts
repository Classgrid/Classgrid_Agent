// A message sent while the AI is still working (owner, 2026-11-24, with recordings of two other apps and ours:
// "while it is working I send a message and it takes it in and goes on; ours queues 12 messages and answers them
// one by one"). Desktop app, Classgrid Code and the extension only; the website keeps the queue.
//
// Settings → General → Input box → Queued messages:
//   Queue             as before: the message waits in the "N queued" box and is sent when the answer has ended.
//   Send immediately  the message shows in the chat at once and is posted to the running answer (the server's "say"
//                     command, server/src/utils/user-notes.js). The AI reads it with its next step and goes on; the
//                     chat then draws it at that place in the answer. A message the AI did not get to (it was
//                     writing its final answer) goes out when the answer ends, together with every other message
//                     that waited, as ONE message: several messages get one answer.
// Files and pasted text go with it (owner, 2026-11-27: "remove the queue for uploads too"). A message with code
// comments, a file still uploading, or a "/" command takes the queue.
import { useEffect, useState } from "react";
import { fetchWithRescue } from "@/lib/rescue";
import type { SentNote } from "./followUpParts";

export * from "./followUpParts";

export type FollowUpMode = "queue" | "now";
const KEY = "classgrid:followUpMode";
const CHANGED = "classgrid:followUpMode";

/** The app can post to a running answer (it drives the answer's steps: desktop app, Classgrid Code, the extension) */
export const canSendWhileWorking = (): boolean => typeof (window as any)?.classgridDesktop?.runTool === "function";

const saved = (): FollowUpMode => {
  try { return localStorage.getItem(KEY) === "now" ? "now" : "queue"; } catch { return "queue"; }
};

/** What happens to a message sent while the AI works. Always "queue" where the app cannot post to a running answer. */
export const followUpMode = (): FollowUpMode => (canSendWhileWorking() ? saved() : "queue");

export function setFollowUpMode(mode: FollowUpMode): void {
  try { localStorage.setItem(KEY, mode === "now" ? "now" : "queue"); } catch { /* kept for this window only */ }
  try { window.dispatchEvent(new CustomEvent(CHANGED, { detail: mode })); } catch { /* no window */ }
}

/** The setting, kept in step across the settings page, the chat and other windows */
export function useFollowUpMode(): [FollowUpMode, (mode: FollowUpMode) => void] {
  const [mode, setMode] = useState<FollowUpMode>(followUpMode);
  useEffect(() => {
    const read = () => setMode(followUpMode());
    window.addEventListener(CHANGED, read);
    window.addEventListener("storage", read);
    return () => { window.removeEventListener(CHANGED, read); window.removeEventListener("storage", read); };
  }, []);
  return [mode, (next) => { setFollowUpMode(next); setMode(canSendWhileWorking() ? next : "queue"); }];
}

/**
 * Posts a message to the running answer. True: the server has it (it goes to the AI with its next step). False: the
 * answer is gone or cannot take it; the app keeps the message and sends it when the answer has ended.
 * Posted until it gets through (the server takes the same id only once), so a short internet drop loses nothing.
 */
export async function sayToAnswer(apiBase: string, turnId: string, note: SentNote): Promise<boolean> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const r = await fetchWithRescue(`${apiBase}/api/ai/turn/${turnId}/cmd`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: "say", id: note.id, text: note.text, ...(note.files?.length ? { files: note.files } : {}), ...(note.pasted?.length ? { pasted: note.pasted } : {}) }),
      });
      if (r.ok) return true;
      if (r.status === 400 || r.status === 404) return false;
    } catch { /* offline: try again */ }
    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
  }
  return false;
}
