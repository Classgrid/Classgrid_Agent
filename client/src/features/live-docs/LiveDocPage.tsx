// Live doc page (chat.classgrid.in/docs/<id>): read, edit, comment, share, export and see older versions
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { ArrowLeft, Check, Download, Edit3, History, Link2, Lock, MessageSquare, Sparkles, Users, X } from "lucide-react";
import { Button } from "@/components/marketing_ui/button";
import { Spinner } from "@/components/marketing_ui/spinner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/marketing_ui/dropdown-menu";
import { useCurrentUser } from "@/features/auth/queries/useCurrentUser";
import { cn } from "@/lib/utils";
import * as api from "./liveDocsApi";
import type { LiveDoc, LiveDocComment } from "./liveDocsApi";

const POLL_MS = 10000;
const ago = (d: string) => { try { return formatDistanceToNow(new Date(d), { addSuffix: true }); } catch { return ""; } };

function DocMarkdown({ text }: { text: string }) {
  return (
    <article className="prose dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-sky-600 dark:prose-a:text-sky-400 prose-pre:bg-muted prose-pre:text-foreground prose-table:text-sm prose-img:rounded-xl">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{ a: ({ node: _n, ...p }) => <a {...p} target="_blank" rel="noreferrer" /> }}
      >
        {text || "*This doc is empty.*"}
      </ReactMarkdown>
    </article>
  );
}

export function LiveDocPage() {
  const { id = "" } = useParams();
  const { data: me } = useCurrentUser();
  const [doc, setDoc] = useState<LiveDoc | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [aiNote, setAiNote] = useState(""); // "Updated by the AI"
  const [changedWhileEditing, setChangedWhileEditing] = useState(false);
  const [titleEdit, setTitleEdit] = useState<string | null>(null);
  const [oldVersion, setOldVersion] = useState<{ id: string; at: string; by: string; markdown: string } | null>(null);
  const [panelOpen, setPanelOpen] = useState(false); // comments panel on small screens
  const [composer, setComposer] = useState<{ quote: string; text: string } | null>(null);
  const [pick, setPick] = useState<{ quote: string; top: number; left: number } | null>(null);
  const articleRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<LiveDoc | null>(null);
  const editingRef = useRef(false);
  docRef.current = doc;
  editingRef.current = editing;

  const dirty = editing && !!doc && draft !== doc.markdown;

  const load = useCallback(async () => {
    try {
      const r = await api.getDoc(id);
      if (r.doc) { setDoc(r.doc); document.title = `${r.doc.title} · Classgrid`; }
    } catch (e: any) {
      setError(api.errorText(e, "This doc was not found, or you don't have access to it."));
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Checks for changes (the AI or someone else) every few seconds
  useEffect(() => {
    const t = setInterval(async () => {
      const cur = docRef.current;
      if (!cur || document.hidden) return;
      try {
        const r = await api.getDoc(id, cur.updatedAt);
        if (r.unchanged || !r.doc) return;
        const next = r.doc;
        const textChanged = next.rev !== cur.rev;
        if (editingRef.current) {
          // Keep the user's typing; only take the new comments and title
          setDoc({ ...next, markdown: cur.markdown, rev: cur.rev });
          if (textChanged) setChangedWhileEditing(true);
        } else {
          setDoc(next);
          if (textChanged && next.lastBy === "ai") setAiNote("Updated by the AI");
        }
      } catch { /* try again next time */ }
    }, POLL_MS);
    return () => clearInterval(t);
  }, [id]);

  useEffect(() => { if (!aiNote) return; const t = setTimeout(() => setAiNote(""), 6000); return () => clearTimeout(t); }, [aiNote]);

  // Unsaved changes: ask before closing the tab
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const startEdit = () => { if (!doc) return; setOldVersion(null); setDraft(doc.markdown); setChangedWhileEditing(false); setEditing(true); setPick(null); };
  const cancelEdit = () => { if (dirty && !window.confirm("Leave without saving your changes?")) return; setEditing(false); setChangedWhileEditing(false); load(); };

  const save = async (force = false) => {
    if (!doc) return;
    setSaving(true);
    try {
      const next = await api.saveDoc(doc.id, { markdown: draft, rev: doc.rev, force });
      setDoc(next);
      setEditing(false);
      setChangedWhileEditing(false);
      toast.success("Saved");
    } catch (e: any) {
      if (e?.response?.status === 409) {
        if (window.confirm("The AI changed this doc while you were editing. Save your version anyway? (The other version stays in the history.)")) { setSaving(false); return save(true); }
      } else toast.error(api.errorText(e, "Couldn't save. Please try again."));
    } finally { setSaving(false); }
  };

  const saveTitle = async () => {
    if (!doc || titleEdit === null) return;
    const t = titleEdit.trim();
    setTitleEdit(null);
    if (!t || t === doc.title) return;
    try { const next = await api.saveDoc(doc.id, { title: t }); setDoc((d) => (d ? { ...d, title: next.title, updatedAt: next.updatedAt } : d)); document.title = `${next.title} · Classgrid`; }
    catch (e) { toast.error(api.errorText(e, "Couldn't rename the doc.")); }
  };

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(`${window.location.origin}/docs/${id}`); toast.success("Link copied"); }
    catch { toast.error("Couldn't copy the link."); }
  };

  const changeVisibility = async (v: LiveDoc["visibility"]) => {
    if (!doc) return;
    try { const vis = await api.setVisibility(doc.id, v); setDoc({ ...doc, visibility: vis }); toast.success(vis === "link" ? "Anyone signed in with the link can now view and comment" : "Only you can open this doc now"); }
    catch (e) { toast.error(api.errorText(e)); }
  };

  const download = async (format: "docx" | "pdf") => {
    if (!doc) return;
    const t = toast.loading(format === "pdf" ? "Making the PDF..." : "Making the Word file...");
    try { await api.exportDoc(doc.id, format, doc.title); toast.success("Downloaded", { id: t }); }
    catch { toast.error("Couldn't make the file. Please try again.", { id: t }); }
  };

  const viewVersion = async (vid: string) => {
    if (!doc) return;
    if (editing && dirty && !window.confirm("Leave without saving your changes?")) return;
    try { setEditing(false); setOldVersion(await api.getVersion(doc.id, vid)); window.scrollTo({ top: 0 }); }
    catch (e) { toast.error(api.errorText(e)); }
  };

  const restoreVersion = async () => {
    if (!doc || !oldVersion) return;
    try { const next = await api.saveDoc(doc.id, { markdown: oldVersion.markdown, force: true }); setDoc(next); setOldVersion(null); toast.success("Version restored"); }
    catch (e) { toast.error(api.errorText(e)); }
  };

  // Selecting text in the doc shows a small "Comment" button
  const onSelect = () => {
    setTimeout(() => {
      const sel = window.getSelection();
      const text = sel?.toString().trim() || "";
      if (!sel || !text || sel.rangeCount === 0 || !articleRef.current?.contains(sel.anchorNode)) { setPick(null); return; }
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      setPick({ quote: text.slice(0, 2000), top: Math.max(8, rect.top - 40), left: Math.min(window.innerWidth - 120, rect.left + rect.width / 2 - 45) });
    }, 0);
  };
  useEffect(() => {
    if (!pick) return;
    const hide = () => setPick(null);
    window.addEventListener("scroll", hide, true);
    return () => window.removeEventListener("scroll", hide, true);
  }, [pick]);

  const startComment = () => { if (!pick) return; setComposer({ quote: pick.quote, text: "" }); setPick(null); setPanelOpen(true); window.getSelection()?.removeAllRanges(); };

  const sendComment = async () => {
    if (!doc || !composer?.text.trim()) return;
    try { setDoc(await api.addComment(doc.id, composer.text.trim(), composer.quote)); setComposer(null); }
    catch (e) { toast.error(api.errorText(e, "Couldn't add the comment.")); }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" asChild><Link to="/agent">Back to chat</Link></Button>
      </div>
    );
  }
  if (!doc) return <div className="min-h-screen bg-background flex items-center justify-center"><Spinner className="size-6" /></div>;

  const openComments = doc.comments.filter((c) => !c.resolved);
  const resolved = doc.comments.filter((c) => c.resolved);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Title bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center gap-2 px-3 sm:px-5 h-14">
          <Link to="/agent" onClick={(e) => { if (dirty && !window.confirm("Leave without saving your changes?")) e.preventDefault(); }} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent" title="Back to chat">
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0 flex-1">
            {titleEdit !== null ? (
              <input
                autoFocus
                value={titleEdit}
                maxLength={200}
                onChange={(e) => setTitleEdit(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") setTitleEdit(null); }}
                className="w-full max-w-md bg-transparent border border-border rounded-md px-2 py-1 text-[15px] font-semibold outline-none focus:ring-1 focus:ring-ring"
              />
            ) : (
              <button
                type="button"
                disabled={!doc.isOwner}
                onClick={() => setTitleEdit(doc.title)}
                title={doc.isOwner ? "Rename" : undefined}
                className={cn("block max-w-full truncate text-left text-[15px] font-semibold", doc.isOwner && "hover:underline underline-offset-4")}
              >
                {doc.title}
              </button>
            )}
            <div className="text-xs text-muted-foreground truncate">
              {aiNote ? <span className="inline-flex items-center gap-1 text-foreground"><Sparkles className="size-3" />{aiNote}</span>
                : `${doc.isOwner ? "Edited" : `By ${doc.ownerName || "someone"} · edited`} ${ago(doc.updatedAt)}${doc.lastBy === "ai" ? " by the AI" : ""}`}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="px-2.5 font-medium" title="Version history"><History className="size-4 sm:mr-1.5" /><span className="hidden sm:inline">History</span></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 max-h-80 overflow-y-auto">
                <DropdownMenuLabel>Versions</DropdownMenuLabel>
                {doc.versions.length === 0 && <div className="px-2 py-1.5 text-sm text-muted-foreground">No versions yet</div>}
                {doc.versions.map((v, i) => (
                  <DropdownMenuItem key={v.id} onSelect={() => (i === 0 ? setOldVersion(null) : viewVersion(v.id))} className="flex items-center justify-between gap-2">
                    <span className="truncate">{format(new Date(v.at), "d MMM, h:mm a")}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{i === 0 ? "Current" : v.by === "ai" ? "by AI" : "by you"}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="px-2.5 font-medium" title="Export"><Download className="size-4 sm:mr-1.5" /><span className="hidden sm:inline">Export</span></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => download("docx")}>Word (.docx)</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => download("pdf")}>PDF</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="px-3 font-medium">{doc.visibility === "link" ? <Users className="size-4 sm:mr-1.5" /> : <Lock className="size-4 sm:mr-1.5" />}<span className="hidden sm:inline">Share</span></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuItem onSelect={copyLink}><Link2 className="size-4 mr-2" />Copy link</DropdownMenuItem>
                {doc.isOwner && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Who can open it</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => changeVisibility("private")} className="items-start">
                      <Lock className="size-4 mr-2 mt-0.5" />
                      <span className="flex-1"><span className="block">Only me</span></span>
                      {doc.visibility === "private" && <Check className="size-4" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => changeVisibility("link")} className="items-start">
                      <Users className="size-4 mr-2 mt-0.5" />
                      <span className="flex-1"><span className="block">Anyone with the link</span><span className="block text-xs text-muted-foreground">They sign in, then can read and comment</span></span>
                      {doc.visibility === "link" && <Check className="size-4" />}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {doc.isOwner && !editing && (
              <Button size="sm" className="px-3" onClick={startEdit}><Edit3 className="size-4 sm:mr-1.5" /><span className="hidden sm:inline">Edit</span></Button>
            )}
            <Button variant="ghost" size="sm" className="px-2.5 lg:hidden" onClick={() => setPanelOpen(!panelOpen)} title="Comments">
              <MessageSquare className="size-4" />{openComments.length > 0 && <span className="ml-1 text-xs">{openComments.length}</span>}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* The doc */}
        <main className="flex-1 min-w-0">
          <div className="mx-auto max-w-3xl px-4 sm:px-8 py-8 pb-32">
            {oldVersion && (
              <div className="mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm">
                <History className="size-4 text-muted-foreground" />
                <span className="flex-1">Older version from {format(new Date(oldVersion.at), "d MMM, h:mm a")} ({oldVersion.by === "ai" ? "by the AI" : "by you"})</span>
                {doc.isOwner && <Button size="sm" className="h-8 px-3" onClick={restoreVersion}>Restore this version</Button>}
                <Button size="sm" variant="outline" className="h-8 px-3" onClick={() => setOldVersion(null)}>Back to current</Button>
              </div>
            )}

            {editing ? (
              <div className="flex flex-col gap-3">
                {changedWhileEditing && (
                  <div className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm">The AI changed this doc while you were editing. When you save, you can choose to keep your version.</div>
                )}
                <textarea
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  spellCheck
                  className="min-h-[70vh] w-full resize-y rounded-lg border border-border bg-background p-4 font-mono text-[13.5px] leading-6 outline-none focus:ring-1 focus:ring-ring"
                />
                <div className="flex items-center gap-2">
                  <Button size="sm" className="px-4" onClick={() => save()} disabled={saving || !dirty}>{saving ? <Spinner className="size-4" /> : "Save"}</Button>
                  <Button size="sm" variant="outline" className="px-4" onClick={cancelEdit} disabled={saving}>Cancel</Button>
                  <span className="text-xs text-muted-foreground">{dirty ? "Unsaved changes" : "No changes"} · Markdown</span>
                </div>
              </div>
            ) : (
              <div ref={articleRef} onMouseUp={onSelect} onKeyUp={onSelect}>
                <DocMarkdown text={oldVersion ? oldVersion.markdown : doc.markdown} />
              </div>
            )}
          </div>
        </main>

        {/* Comments */}
        <aside className={cn(
          "w-80 shrink-0 border-l border-border bg-background flex-col",
          "lg:flex lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)]",
          panelOpen ? "flex fixed right-0 top-14 bottom-0 z-20 shadow-xl max-w-[calc(100vw-2rem)]" : "hidden",
        )}>
          <div className="flex items-center justify-between px-4 h-11 border-b border-border">
            <span className="text-sm font-semibold">Comments{openComments.length > 0 ? ` (${openComments.length})` : ""}</span>
            <button type="button" className="lg:hidden p-1 rounded-md text-muted-foreground hover:text-foreground" onClick={() => setPanelOpen(false)}><X className="size-4" /></button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
            {composer && (
              <div className="rounded-lg border border-border p-3 space-y-2">
                {composer.quote && <div className="border-l-2 border-border pl-2 text-xs text-muted-foreground line-clamp-3">{composer.quote}</div>}
                <textarea
                  autoFocus
                  value={composer.text}
                  onChange={(e) => setComposer({ ...composer, text: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendComment(); }}
                  placeholder="Add a comment"
                  rows={3}
                  className="w-full resize-none rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
                />
                <div className="flex gap-2">
                  <Button size="sm" className="h-8 px-3" onClick={sendComment} disabled={!composer.text.trim()}>Comment</Button>
                  <Button size="sm" variant="ghost" className="h-8 px-3" onClick={() => setComposer(null)}>Cancel</Button>
                </div>
              </div>
            )}
            {openComments.length === 0 && !composer && (
              <p className="text-sm text-muted-foreground px-1 py-2">No comments yet. Select some text in the doc to comment on it.</p>
            )}
            {openComments.map((c) => <CommentCard key={c.id} c={c} doc={doc} meId={me?._id} onDoc={setDoc} />)}
            {resolved.length > 0 && (
              <details className="pt-2">
                <summary className="cursor-pointer text-xs text-muted-foreground px-1 select-none">Resolved ({resolved.length})</summary>
                <div className="space-y-3 mt-3 opacity-70">{resolved.map((c) => <CommentCard key={c.id} c={c} doc={doc} meId={me?._id} onDoc={setDoc} />)}</div>
              </details>
            )}
          </div>
          <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">Tip: ask Classgrid AI in the chat to answer these comments or change the doc.</div>
        </aside>
      </div>

      {pick && !editing && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={startComment}
          style={{ top: pick.top, left: pick.left }}
          className="fixed z-40 inline-flex items-center gap-1.5 rounded-md border border-zinc-800 dark:border-white/10 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 px-3 h-8 text-xs font-semibold shadow-lg"
        >
          <MessageSquare className="size-3.5" />Comment
        </button>
      )}
    </div>
  );
}

function CommentCard({ c, doc, meId, onDoc }: { c: LiveDocComment; doc: LiveDoc; meId?: string; onDoc: (d: LiveDoc) => void }) {
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const canResolve = doc.isOwner || (!!meId && String(meId) === c.userId);

  const send = async () => {
    if (!reply.trim()) return;
    setBusy(true);
    try { onDoc(await api.addReply(doc.id, c.id, reply.trim())); setReply(""); }
    catch (e) { toast.error(api.errorText(e, "Couldn't send the reply.")); }
    finally { setBusy(false); }
  };
  const toggle = async () => {
    setBusy(true);
    try { onDoc(await api.resolveComment(doc.id, c.id, !c.resolved)); }
    catch (e) { toast.error(api.errorText(e)); }
    finally { setBusy(false); }
  };

  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium truncate">{c.name || "Someone"}</span>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[11px] text-muted-foreground">{ago(c.at)}</span>
          {canResolve && (
            <button type="button" onClick={toggle} disabled={busy} title={c.resolved ? "Reopen" : "Resolve"} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent">
              {c.resolved ? <X className="size-3.5" /> : <Check className="size-3.5" />}
            </button>
          )}
        </div>
      </div>
      {c.quote && <div className="border-l-2 border-border pl-2 text-xs text-muted-foreground line-clamp-3">{c.quote}</div>}
      <p className="text-sm whitespace-pre-wrap break-words">{c.text}</p>
      {c.replies.map((r, i) => (
        <div key={i} className="ml-2 border-l border-border pl-2.5">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-medium">{r.name || "Someone"}</span>
            {r.byAI && <span className="inline-flex items-center gap-0.5 rounded bg-muted px-1 py-0.5 text-[10px] font-medium text-muted-foreground"><Sparkles className="size-2.5" />AI</span>}
            <span className="text-muted-foreground">{ago(r.at)}</span>
          </div>
          <p className="text-sm whitespace-pre-wrap break-words mt-0.5">{r.text}</p>
        </div>
      ))}
      {!c.resolved && (
        <div className="flex items-end gap-2 pt-1">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Reply"
            rows={1}
            className="flex-1 min-w-0 resize-none rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
          {reply.trim() && <Button size="sm" className="h-8 px-3" onClick={send} disabled={busy}>Reply</Button>}
        </div>
      )}
    </div>
  );
}

export default LiveDocPage;
