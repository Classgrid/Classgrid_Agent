// Classgrid Code's AI panel: the right side box (the switch after X in its top line). For now two lists, like
// Studio's: the files the AI changed in this chat (click opens the file in the editor) and the files you uploaded.
import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FileDiff, Paperclip } from "lucide-react";
import { OPEN_PROJECT_FILE_EVENT } from "./stepper/ProjectToolSteps";
import type { ChatMessage } from "./AskAiPanel";

const CHANGE_TOOLS = new Set(["write_project_file", "edit_project_file"]);
const baseName = (p: string) => p.split(/[\\/]/).filter(Boolean).pop() || p;

export function EditorChatSidePanel({ messages, uploads }: { messages: ChatMessage[]; uploads: { url: string; name: string; mimeType: string }[] }) {
  const [open, setOpen] = useState({ changed: true, uploads: true });

  // Every file the AI wrote or edited in this chat, newest first, with how many times
  const changed = useMemo(() => {
    const count = new Map<string, number>();
    for (const m of messages) for (const s of m.steps || []) {
      if (s.type !== "tool" || !CHANGE_TOOLS.has(s.tool) || s.status === "error") continue;
      const path = String(s.args?.path || "").trim();
      if (path) count.set(path, (count.get(path) || 0) + 1);
    }
    return [...count.entries()].reverse();
  }, [messages]);

  const section = (key: "changed" | "uploads", label: string, n: number) => (
    <button type="button" onClick={() => setOpen((o) => ({ ...o, [key]: !o[key] }))} className="flex items-center gap-2 w-full px-3 py-2 text-[13px] text-muted-foreground hover:text-foreground">
      <span>{label}</span>
      <span className="min-w-5 h-5 px-1.5 rounded bg-muted text-[11px] flex items-center justify-center">{n}</span>
      {open[key] ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
    </button>
  );

  return (
    <div className="flex-1 min-h-0 overflow-y-auto py-2">
      {section("changed", "Files Changed", changed.length)}
      {open.changed && (
        <div className="px-1.5 pb-2">
          {!changed.length && <p className="px-3 py-1 text-[12.5px] text-muted-foreground">No file changes</p>}
          {changed.map(([path, times]) => (
            <button
              key={path}
              type="button"
              title={path}
              onClick={() => window.dispatchEvent(new CustomEvent(OPEN_PROJECT_FILE_EVENT, { detail: { path } }))}
              className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-left text-[13px] hover:bg-muted transition-colors"
            >
              <FileDiff className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{baseName(path)}</span>
              <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{times > 1 ? `${times}×` : ""}</span>
            </button>
          ))}
        </div>
      )}
      {section("uploads", "Uploads", uploads.length)}
      {open.uploads && (
        <div className="px-1.5 pb-2">
          {!uploads.length && <p className="px-3 py-1 text-[12.5px] text-muted-foreground">No uploads</p>}
          {uploads.map((f, i) => (
            <a
              key={`${f.url}-${i}`}
              href={/^https?:/i.test(f.url) ? f.url : undefined}
              target="_blank"
              rel="noreferrer"
              title={f.name}
              className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-[13px] hover:bg-muted transition-colors"
            >
              {f.mimeType.startsWith("image/") && f.url
                ? <img src={f.url} alt="" className="size-5 shrink-0 rounded object-cover" />
                : <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />}
              <span className="truncate">{f.name}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
