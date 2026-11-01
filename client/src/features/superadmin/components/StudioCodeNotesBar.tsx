// Studio Mode: the comments and quotes on code waiting above the chat input, and their small chips on a sent message
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MessageSquare, Pencil, Quote, Trash2, X } from "lucide-react";
import { FileBadge, OPEN_PROJECT_FILE_EVENT } from "@/components/ai/components/stepper/ProjectToolSteps";
import { lineLabel, removeCodeNote, updateCodeNote, useCodeNotes, type CodeNote, type CodeNoteChip } from "./studioCodeNotes";

const EASE = [0.22, 1, 0.36, 1] as const;
const baseName = (p: string) => p.split("/").pop() || p;
// Open the file at those lines in the Files tab
const openAt = (n: { path: string; startLine: number; endLine: number }) =>
  window.dispatchEvent(new CustomEvent(OPEN_PROJECT_FILE_EVENT, { detail: { path: n.path, startLine: n.startLine, endLine: n.endLine } }));

const iconBtn = "flex items-center justify-center size-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors";

export function StudioCodeNotesBar() {
  const notes = useCodeNotes();
  const comments = notes.filter((n) => n.kind === "comment");
  const quotes = notes.filter((n) => n.kind === "quote");
  // One row per file and lines
  const groups: CodeNote[][] = [];
  for (const n of comments) {
    const g = groups.find((x) => x[0]!.path === n.path && x[0]!.startLine === n.startLine && x[0]!.endLine === n.endLine);
    if (g) g.push(n); else groups.push([n]);
  }
  if (!notes.length) return null;
  return (
    <div className="px-3 pt-2.5 pb-2 border-b border-black/10 dark:border-white/[0.08] flex flex-col gap-1">
      {groups.length > 0 && (
        <>
          <div className="flex items-center gap-1.5 px-1.5 text-[12px] text-muted-foreground">
            <MessageSquare className="size-3.5" />
            {comments.length} Comment{comments.length === 1 ? "" : "s"}
          </div>
          {groups.map((g) => <CommentRow key={g[0]!.id} group={g} />)}
        </>
      )}
      {quotes.length > 0 && (
        <div className={`flex flex-wrap gap-1.5 ${groups.length ? "pt-1" : ""}`}>
          {quotes.map((q) => (
            <span key={q.id} title={`${q.path} #${lineLabel(q)}`} className="inline-flex max-w-full items-center gap-1 rounded-md border border-black/10 dark:border-white/10 bg-black/[0.04] dark:bg-white/[0.06] pl-1.5 pr-0.5 py-0.5 font-mono text-[12.5px] text-foreground">
              <button type="button" onClick={() => openAt(q)} className="flex min-w-0 items-center gap-1">
                <Quote className="size-3 shrink-0 text-muted-foreground" />
                <FileBadge path={q.path} />
                <span className="min-w-0 truncate max-w-[200px]">{baseName(q.path)}</span>
                <span className="shrink-0 text-muted-foreground">#{lineLabel(q)}</span>
              </button>
              <button
                type="button"
                onClick={() => removeCodeNote(q.id)}
                className="flex items-center justify-center size-5 rounded text-muted-foreground hover:text-foreground hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
                aria-label={`Remove quote of ${q.path} ${lineLabel(q)}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// A file and its lines; hovering shows the comments on them, each with edit and delete
function CommentRow({ group }: { group: CodeNote[] }) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const first = group[0]!;
  const open = hover || !!editing;
  const save = () => {
    if (!editing || !draft.trim()) return;
    updateCodeNote(editing, draft.trim());
    setEditing(null);
  };
  return (
    <div className="relative" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <button
        type="button"
        onClick={() => openAt(first)}
        title="Open in Files"
        className="w-full flex items-center gap-1.5 h-7 px-1.5 rounded-md text-left text-[12.5px] text-foreground/90 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] hover:text-foreground transition-colors"
      >
        <FileBadge path={first.path} />
        <span className="min-w-0 truncate font-mono">{baseName(first.path)}</span>
        <span className="shrink-0 font-mono text-muted-foreground">#{lineLabel(first)}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
            transition={{ duration: reduce ? 0 : 0.14, ease: EASE }}
            className="absolute left-0 bottom-full z-50 pb-1"
          >
            <div className="w-[300px] max-w-[80vw] max-h-[260px] overflow-y-auto rounded-lg border border-black/10 dark:border-white/[0.08] bg-white dark:bg-[#1e1e1e] shadow-2xl p-1 chat-scrollbar">
              {group.map((n) => (
                <div key={n.id} className="group/note flex flex-col gap-1 px-2 py-1.5 rounded-md">
                  <div className="flex items-center gap-1">
                    <span className="flex-1 text-[11px] font-mono text-muted-foreground">{lineLabel(n)}</span>
                    {editing !== n.id && (
                      <>
                        <button type="button" onClick={() => { setEditing(n.id); setDraft(n.text); }} className={iconBtn} title="Edit comment" aria-label="Edit comment">
                          <Pencil className="size-3" />
                        </button>
                        <button type="button" onClick={() => removeCodeNote(n.id)} className={iconBtn} title="Delete comment" aria-label="Delete comment">
                          <Trash2 className="size-3" />
                        </button>
                      </>
                    )}
                  </div>
                  {editing === n.id ? (
                    <>
                      <textarea
                        data-no-ring
                        autoFocus
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") setEditing(null);
                          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); }
                        }}
                        rows={3}
                        className="w-full resize-none rounded-md border border-black/10 dark:border-white/[0.1] bg-transparent px-2 py-1.5 text-[13px] outline-none focus:border-black/25 dark:focus:border-white/20"
                      />
                      <div className="flex justify-end gap-1.5">
                        <button type="button" onClick={() => setEditing(null)} className="h-7 px-3 rounded-md border border-border text-[12px] text-foreground hover:bg-secondary transition-colors">Cancel</button>
                        <button type="button" onClick={save} disabled={!draft.trim()} className="h-7 px-3 rounded-md border border-border text-[12px] text-foreground hover:bg-secondary transition-colors disabled:opacity-50 disabled:pointer-events-none">Save Comment</button>
                      </div>
                    </>
                  ) : (
                    <p className="text-[13px] text-foreground whitespace-pre-wrap break-words">{n.text}</p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// A sent message's comments and quotes, as small chips (the code itself only goes to the AI)
export function CodeNoteChips({ notes }: { notes: CodeNoteChip[] }) {
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {notes.map((n, i) => (
        <button
          key={i}
          type="button"
          onClick={() => openAt(n)}
          title={n.kind === "comment" ? `${n.path} #${lineLabel(n)}: ${n.text}` : `${n.path} #${lineLabel(n)}`}
          className="inline-flex max-w-full items-center gap-1 rounded-md border border-black/10 dark:border-white/10 bg-black/[0.04] dark:bg-white/[0.06] px-1.5 py-0.5 font-mono text-[12.5px] text-foreground hover:bg-black/[0.07] dark:hover:bg-white/[0.09] transition-colors"
        >
          {n.kind === "comment" ? <MessageSquare className="size-3 shrink-0 text-muted-foreground" /> : <Quote className="size-3 shrink-0 text-muted-foreground" />}
          <FileBadge path={n.path} />
          <span className="min-w-0 truncate max-w-[200px]">{baseName(n.path)}</span>
          <span className="shrink-0 text-muted-foreground">#{lineLabel(n)}</span>
        </button>
      ))}
    </div>
  );
}
