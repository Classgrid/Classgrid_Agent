// A live doc: read it, edit it, comment on it, share it, export it and see its older versions.
// One view for two places (owner, 2026-11-16):
//   - the doc's own page, chat.classgrid.in/docs/<id> (LiveDocPage.tsx)
//   - a tab of Studio's right pane, beside the chat (inStudio): the chat is told which doc is open, and a comment
//     sent to Classgrid AI goes to that chat (docContext.ts)
// What a person can do follows their role on the doc (the server says: doc.can).
// Comments: the comment button turns comments on; then a click on any part of the doc, or picked words, opens the
// comment box right there. Each open comment is pinned in the doc with its writer's photo. A comment, a reply and a
// resolve show at once and are saved behind (no spinner; owner: "like Grids"); if saving fails they are taken back.
// Messages show in a small bar at the bottom of the doc itself (the desktop app has no toasts).
// The top bar is the one the owner showed (2026-11-16): Home, the doc's name with its menu, who is here now, the
// comment button, Chat and Share. Its buttons, its menus and its boxes are the chat's own (docLook.ts).
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import "katex/dist/katex.min.css";
import { formatDistanceToNow, format } from "date-fns";
import {
  ArrowUp, Check, ChevronDown, Copy, Download, Edit3, FileCode2, FileText, FileType2, Flag, Globe2, History, Home, ListFilter, Maximize2, MessageCircle, MoreHorizontal, Pencil, Pin, RefreshCw, RotateCcw, Share, Trash2, X,
} from "lucide-react";
import { Button } from "@/components/marketing_ui/button";
import { Spinner } from "@/components/marketing_ui/spinner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from "@/components/marketing_ui/dropdown-menu";
import { useCurrentUser } from "@/features/auth/queries/useCurrentUser";
import { cn } from "@/lib/utils";
import * as api from "./liveDocsApi";
import type { DocReader, LiveDoc, LiveDocComment } from "./liveDocsApi";
import { PersonPhoto, ReadersRow } from "./DocPeople";
import { ShareDialog, type ShareTab } from "./ShareDialog";
import { DeleteDocDialog, PrivateDoc, RenameDocDialog, ReportDocDialog } from "./DocDialogs";
import { shareCalls, type ExportChoice } from "./shareApi";
import { barButton, barIcon, menuCard, menuDanger, menuIcon, menuItem, menuNote, menuSep } from "./docLook";
import { commentAsk, openDocInStudio, setOpenDoc, studioDocPath } from "./docContext";
import { MARK, MARK_ACTIVE, MARK_STYLE, blockAt, quoteRange, tint } from "./docMarks";
import { DocMarkdown, NoteText } from "./DocText";
import { DocEditor } from "./DocEditor";
import { CommentBox, CommentsPanel, NoticeBar, isNew, type CommentFilter, type Composer } from "./DocComments";
import { ClassgridLogoIcon } from "@/components/layout/ClassgridLogoIcon";

const POLL_MS = 10000;
const ago = (d: string) => { try { return formatDistanceToNow(new Date(d), { addSuffix: true }); } catch { return ""; } };

type Notice = { text: string; bad: boolean; n: number };
type PinMark = { id: string; top: number; left: number; name: string; photo: string };
// (the sharing calls of /api/docs, for the Share box)
const DOC_SHARE = shareCalls<LiveDoc>("doc", "/api/docs", "doc", "docs");
const EXPORT_ICONS = { docx: FileText, pdf: FileType2, md: FileCode2, html: Globe2 };
// (the comment button while comments are on)
const COMMENTS_ON = "bg-sky-500/15 text-sky-600 hover:bg-sky-500/20 hover:text-sky-600 dark:text-sky-400 dark:hover:bg-sky-500/20 dark:hover:text-sky-400";
// (the desktop app has no page of its own for a doc: there a doc is always beside the chat)
const ON_WEBSITE = import.meta.env.VITE_DESKTOP !== "1";
const BOX_WIDTH = 340;

export function LiveDocView({ id, inStudio = false, front = true, onGone, onTitle }: {
  id: string;
  /** Shown in Studio's right pane, beside the chat. */
  inStudio?: boolean;
  /** In Studio: this doc's tab is the one in front (the chat is told about the doc in front). */
  front?: boolean;
  /** In Studio: the doc was deleted, or can't be opened: its tab can go. */
  onGone?: () => void;
  /** In Studio: the doc's title, for its tab. */
  onTitle?: (title: string) => void;
}) {
  const navigate = useNavigate();
  const { data: me } = useCurrentUser();
  const [doc, setDoc] = useState<LiveDoc | null>(null);
  const [readers, setReaders] = useState<DocReader[]>([]);
  const [error, setError] = useState("");
  const [locked, setLocked] = useState<{ asked: boolean } | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [aiNote, setAiNote] = useState(""); // "Updated by the AI"
  const [changedWhileEditing, setChangedWhileEditing] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [oldVersion, setOldVersion] = useState<{ id: string; at: string; by: string; markdown: string } | null>(null);
  const [commentsOn, setCommentsOn] = useState(false);
  const [filter, setFilter] = useState<CommentFilter>("open");
  const [pick, setPick] = useState<{ quote: string; top: number; left: number } | null>(null);
  const [composer, setComposer] = useState<Composer | null>(null);
  const [activeComment, setActiveComment] = useState<string | null>(null);
  const [pins, setPins] = useState<PinMark[]>([]);
  const [share, setShare] = useState<{ open: boolean; tab: ShareTab }>({ open: false, tab: "share" });
  const [deleting, setDeleting] = useState(false);
  const [reporting, setReporting] = useState<{ comment: { id: string; name: string; text: string } | null } | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<LiveDoc | null>(null);
  const editingRef = useRef(false);
  const noticeCount = useRef(0);
  docRef.current = doc;
  editingRef.current = editing;

  const dirty = editing && !!doc && draft !== doc.markdown;
  const say = useCallback((text: string, bad = false) => setNotice({ text, bad, n: ++noticeCount.current }), []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice((now) => (now?.n === notice.n ? null : now)), notice.bad ? 7000 : 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const load = useCallback(async () => {
    try {
      const r = await api.getDoc(id);
      if (r.doc) { setDoc(r.doc); setLocked(null); setError(""); if (!inStudio) document.title = `${r.doc.title} · Classgrid`; }
      if (r.reading) setReaders(r.reading);
      return r.doc || null;
    } catch (e: any) {
      const priv = api.privateAnswer(e);
      if (priv) setLocked({ asked: priv.requested });
      else setError(api.errorText(e, "This doc was not found."));
      setDoc(null);
      return null;
    }
  }, [id, inStudio]);

  useEffect(() => {
    setDoc(null); setLocked(null); setError(""); setEditing(false); setOldVersion(null); setComposer(null); setPick(null); setPins([]);
    void load().then((first) => {
      if (!first) return;
      // Coming from the "Review request" email: the share box opens on the requests
      if (!inStudio && new URLSearchParams(window.location.search).get("share") && first.can.share) setShare({ open: true, tab: "share" });
    });
    return () => api.leaveDoc(id);
  }, [id, inStudio, load]);

  // Studio: the chat beside the doc is told which doc is in front
  const docId = doc?.id;
  const docTitle = doc?.title;
  useEffect(() => {
    if (!inStudio || !front || !docId) return;
    setOpenDoc({ id: docId, title: docTitle || "" });
    return () => setOpenDoc(null);
  }, [inStudio, front, docId, docTitle]);
  const tellTitle = useRef(onTitle);
  tellTitle.current = onTitle;
  useEffect(() => { if (docTitle) tellTitle.current?.(docTitle); }, [docTitle]);

  // Checks for changes (the AI or someone else) and who is reading, every few seconds
  useEffect(() => {
    const t = setInterval(async () => {
      const cur = docRef.current;
      if (!cur || document.hidden) return;
      try {
        const r = await api.getDoc(id, cur.updatedAt);
        if (r.reading) setReaders(r.reading);
        if (r.unchanged || !r.doc) return;
        const next = r.doc;
        // (a comment still on its way to the server stays on screen)
        const onTheWay = (docRef.current?.comments || []).filter((c) => isNew(c.id));
        const merged = onTheWay.length ? { ...next, comments: [...next.comments, ...onTheWay] } : next;
        const textChanged = next.rev !== cur.rev;
        if (editingRef.current) {
          // Keep the user's typing; only take the new comments, people and title
          setDoc({ ...merged, markdown: cur.markdown, rev: cur.rev });
          if (textChanged) setChangedWhileEditing(true);
        } else {
          setDoc(merged);
          if (textChanged && next.lastBy === "ai") setAiNote("Updated by the AI");
        }
      } catch (e: any) {
        // The owner took this person's access away while the doc was open
        const priv = api.privateAnswer(e);
        if (priv) { setDoc(null); setLocked({ asked: priv.requested }); }
      }
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

  // ── Where the open comments sit in the doc: a tint on their words and the writer's photo pinned beside them ──
  const shownText = oldVersion ? oldVersion.markdown : doc?.markdown;
  const openList = doc && !oldVersion && !editing ? doc.comments.filter((c) => !c.resolved) : [];
  const marksKey = openList.map((c) => `${c.id}:${c.quote.length}`).join("|");
  const placeMarks = useCallback(() => {
    const article = articleRef.current;
    const page = pageRef.current;
    const open = docRef.current && !editingRef.current ? docRef.current.comments.filter((c) => !c.resolved) : [];
    if (!article || !page || !open.length) { setPins([]); tint(MARK, []); tint(MARK_ACTIVE, []); return; }
    const frame = page.getBoundingClientRect();
    const next: PinMark[] = [];
    const ranges: Range[] = [];
    const active: Range[] = [];
    for (const c of open) {
      const range = c.quote ? quoteRange(article, c.quote) : null;
      if (!range) continue;
      (c.id === activeComment ? active : ranges).push(range);
      const rects = range.getClientRects();
      const end = rects[rects.length - 1];
      if (!end) continue;
      // (raised above the line and tucked over the last letter, so it covers none of the words after it)
      next.push({ id: c.id, name: c.name, photo: c.photo || "", top: end.top - frame.top - 11, left: Math.max(0, Math.min(frame.width - 20, end.right - frame.left - 5)) });
    }
    setPins((before) => (JSON.stringify(before) === JSON.stringify(next) ? before : next));
    tint(MARK, commentsOn ? ranges : []);
    tint(MARK_ACTIVE, active);
  }, [activeComment, commentsOn]);
  useLayoutEffect(() => {
    placeMarks();
    const article = articleRef.current;
    if (!article || typeof ResizeObserver === "undefined") return;
    const watcher = new ResizeObserver(() => placeMarks());
    watcher.observe(article);
    return () => watcher.disconnect();
  }, [placeMarks, marksKey, shownText, editing, oldVersion]);
  useEffect(() => () => { tint(MARK, []); tint(MARK_ACTIVE, []); }, []);

  const leaveEdits = () => !dirty || window.confirm("Leave without saving your changes?");
  const startEdit = () => { if (!doc) return; setOldVersion(null); setDraft(doc.markdown); setChangedWhileEditing(false); setEditing(true); setPick(null); setComposer(null); };
  const cancelEdit = () => { if (!leaveEdits()) return; setEditing(false); setChangedWhileEditing(false); void load(); };

  const save = async (force = false) => {
    if (!doc) return;
    setSaving(true);
    try {
      const next = await api.saveDoc(doc.id, { markdown: draft, rev: doc.rev, force });
      setDoc(next);
      setEditing(false);
      setChangedWhileEditing(false);
      say("Saved.");
    } catch (e: any) {
      if (api.errorStatus(e) === 409) {
        if (window.confirm("This doc was changed while you were editing. Save your version anyway? (The other version stays in the history.)")) { setSaving(false); return save(true); }
      } else say(api.errorText(e, "The doc could not be saved. Please try again."), true);
    } finally { setSaving(false); }
  };

  // (the new name shows at once and is saved behind it)
  const saveTitle = async (t: string) => {
    if (!doc || !t || t === doc.title) return;
    const before = doc.title;
    setDoc((d) => (d ? { ...d, title: t } : d));
    if (!inStudio) document.title = `${t} · Classgrid`;
    try {
      const next = await api.saveDoc(doc.id, { title: t });
      setDoc((d) => (d ? { ...d, title: next.title, updatedAt: next.updatedAt } : d));
    } catch (e) {
      setDoc((d) => (d ? { ...d, title: before } : d));
      say(api.errorText(e, "The doc could not be renamed."), true);
    }
  };

  const viewVersion = async (vid: string) => {
    if (!doc || !leaveEdits()) return;
    try { setEditing(false); setOldVersion(await api.getVersion(doc.id, vid)); scrollRef.current?.scrollTo({ top: 0 }); }
    catch (e) { say(api.errorText(e), true); }
  };

  const restoreVersion = async () => {
    if (!doc || !oldVersion) return;
    try { const next = await api.saveDoc(doc.id, { markdown: oldVersion.markdown, force: true }); setDoc(next); setOldVersion(null); say("Version restored."); }
    catch (e) { say(api.errorText(e), true); }
  };

  const togglePin = () => {
    if (!doc) return;
    const pinned = !doc.pinned;
    setDoc((d) => (d ? { ...d, pinned } : d));
    say(pinned ? "Pinned to the top of your docs." : "Pin removed.");
    api.setPinned(doc.id, pinned).catch((e) => { setDoc((d) => (d ? { ...d, pinned: !pinned } : d)); say(api.errorText(e), true); });
  };

  const duplicate = async () => {
    if (!doc || !leaveEdits()) return;
    try {
      const copy = await api.duplicateDoc(doc.id);
      if (inStudio) { openDocInStudio(copy.id); say("A copy was made. It is open in a new tab."); }
      else navigate(`/docs/${copy.id}`);
    } catch (e) { say(api.errorText(e, "A copy could not be made. Please try again."), true); }
  };

  const remove = async () => {
    if (!doc) return;
    try {
      await api.deleteDoc(doc.id);
      setDeleting(false);
      if (inStudio) onGone?.(); else navigate("/docs");
    } catch (e) { say(api.errorText(e, "The doc could not be deleted. Please try again."), true); }
  };

  // "Ask to edit": a person who can read but not edit asks the owner
  const askToEdit = () => {
    if (!doc || doc.asked === "editor") return;
    setDoc((d) => (d ? { ...d, asked: "editor" } : d));
    say("Request sent. You will be able to edit once the owner approves.");
    api.requestAccess(doc.id, "editor").catch((e) => { setDoc((d) => (d ? { ...d, asked: null } : d)); say(api.errorText(e, "The request could not be sent. Please try again."), true); });
  };

  // ── Comments ──

  /** Where the comment box goes for a spot on the screen: under it, inside the doc's own area. */
  const boxAt = (x: number, y: number) => {
    const frame = rootRef.current?.getBoundingClientRect() || { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight, width: window.innerWidth };
    const width = Math.min(BOX_WIDTH, frame.width - 24);
    return { top: Math.max(frame.top + 64, Math.min(y + 12, frame.bottom - 170)), left: Math.max(frame.left + 12, Math.min(frame.right - width - 12, x - width / 2)) };
  };

  // Picked words: with comments on, the comment box opens there; otherwise a small "Comment" button shows
  const onSelect = () => {
    setTimeout(() => {
      if (!docRef.current?.can.comment || editingRef.current) return;
      const sel = window.getSelection();
      const text = sel?.toString().trim() || "";
      if (!sel || !text || sel.rangeCount === 0 || !articleRef.current?.contains(sel.anchorNode)) { setPick(null); return; }
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      const quote = text.slice(0, 2000);
      if (commentsOn) {
        setComposer((now) => ({ quote, text: now?.quote === quote ? now.text : "", toAI: now?.toAI ?? false, ...boxAt(rect.left + rect.width / 2, rect.bottom) }));
        setPick(null);
      } else {
        const frame = rootRef.current?.getBoundingClientRect() || { left: 0, top: 0, right: window.innerWidth };
        setPick({ quote, top: Math.max(frame.top + 64, rect.top - 42), left: Math.max(frame.left + 8, Math.min(frame.right - 120, rect.left + rect.width / 2 - 52)) });
      }
    }, 0);
  };

  // Comments on: a click on any part of the doc (no words picked) comments on that part
  const onDocClick = (e: ReactMouseEvent) => {
    if (!commentsOn || !doc?.can.comment || editing || oldVersion) return;
    if (window.getSelection()?.toString().trim()) return; // (picked words are handled above)
    if ((e.target as Element).closest?.("a, button, input")) return;
    const block = articleRef.current ? blockAt(e.target, articleRef.current) : null;
    const quote = (block?.innerText || "").replace(/\s+/g, " ").trim().slice(0, 300);
    if (!quote) return;
    setComposer((now) => ({ quote, text: now?.quote === quote ? now.text : "", toAI: now?.toAI ?? false, ...boxAt(e.clientX, e.clientY) }));
  };

  useEffect(() => {
    if (!pick) return;
    const hide = () => setPick(null);
    const area = scrollRef.current;
    area?.addEventListener("scroll", hide);
    return () => area?.removeEventListener("scroll", hide);
  }, [pick]);

  // The comment box closes with Escape, or a click outside it
  useEffect(() => {
    if (!composer) return;
    const outside = (e: MouseEvent) => { if (!composerRef.current?.contains(e.target as Node)) setComposer(null); };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [!!composer]); // eslint-disable-line react-hooks/exhaustive-deps

  const startComment = () => {
    if (!pick) return;
    setComposer({ quote: pick.quote, text: "", toAI: false, ...boxAt(pick.left + 52, pick.top + 34) });
    setPick(null);
    setCommentsOn(true);
  };

  /** Puts `change` on the comments at once. */
  const withComments = (change: (comments: LiveDocComment[]) => LiveDocComment[]) => setDoc((d) => (d ? { ...d, comments: change(d.comments) } : d));

  const sendComment = () => {
    if (!doc || !composer?.text.trim()) return;
    const sent = { text: composer.text.trim(), quote: composer.quote };
    const toAI = composer.toAI;
    const temp: LiveDocComment = { id: `new-${Date.now()}`, userId: String(me?._id || ""), name: me?.name || "You", photo: me?.profilePicture || "", ...sent, at: new Date().toISOString(), resolved: false, replies: [] };
    withComments((all) => [...all, temp]);
    setComposer(null);
    setCommentsOn(true);
    setFilter((f) => (f === "resolved" ? "open" : f));
    window.getSelection()?.removeAllRanges();
    api.addComment(doc.id, sent.text, sent.quote).then((r) => {
      setDoc(r.doc);
      if (!toAI) return;
      const ask = commentAsk({ id: doc.id, title: doc.title }, { id: r.commentId, ...sent });
      if (inStudio) { window.dispatchEvent(new CustomEvent("agent:ask", { detail: { text: ask } })); say("Sent to Classgrid AI. Its answer will show under your comment."); }
      else navigate(studioDocPath(doc.id, ask));
    }).catch((e) => {
      withComments((all) => all.filter((c) => c.id !== temp.id));
      say(api.errorText(e, "The comment could not be added."), true);
    });
  };

  const showComment = (commentId: string) => {
    setCommentsOn(true);
    setFilter("open");
    setActiveComment(commentId);
    setTimeout(() => document.getElementById(`doc-comment-${commentId}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 60);
  };

  if (locked) return <PrivateDoc asked={locked.asked} email={me?.email} compact={inStudio} ask={() => api.requestAccess(id)} />;
  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-4 bg-background px-4 text-center", inStudio ? "h-full" : "min-h-dvh")}>
        <p className="text-muted-foreground">{error}</p>
        {inStudio
          ? <Button variant="outline" size="sm" onClick={() => onGone?.()}>Close this tab</Button>
          : <Button variant="outline" size="sm" asChild><Link to="/docs">Your docs</Link></Button>}
      </div>
    );
  }
  if (!doc) return <div className={cn("flex items-center justify-center bg-background", inStudio ? "h-full" : "min-h-dvh")}><Spinner className="size-6" /></div>;

  const openComments = doc.comments.filter((c) => !c.resolved);
  const waiting = doc.can.share ? (doc.requests || []).length : 0;
  const sentRequest = doc.asked === "editor";
  const exports: ExportChoice[] = api.EXPORTS.map(({ format, name, about }) => ({ id: format, name, about, icon: EXPORT_ICONS[format], run: () => api.exportDoc(doc.id, format, doc.title) }));
  const showComments = (which: CommentFilter) => { setFilter(which); setCommentsOn(true); setPick(null); setComposer(null); };

  return (
    <div ref={rootRef} className={cn("relative flex flex-col bg-background text-foreground", inStudio ? "h-full min-h-0" : "h-dvh")}>
      <style>{MARK_STYLE}</style>
      {/* Top bar */}
      <header className="z-30 shrink-0 border-b border-border/50 bg-background">
        {/* (when the name and the buttons don't fit on one line, the buttons take a line of their own) */}
        <div className={cn("flex min-h-12 flex-wrap items-center gap-x-1 gap-y-0.5 py-2", inStudio ? "px-2" : "px-2 sm:px-3")}>
          {!inStudio && (
            <Link to="/agent" onClick={(e) => { if (!leaveEdits()) e.preventDefault(); }} className={barIcon} title="Home" aria-label="Home">
              <Home className="h-4 w-4" />
            </Link>
          )}
          <div className="min-w-0 flex-[1_1_12rem]">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" title="Doc menu" className="flex max-w-full cursor-pointer items-start gap-1 rounded-md px-2 py-1.5 text-left text-foreground transition-colors hover:bg-black/5 dark:hover:bg-white/10">
                  <span className="min-w-0 text-[14px] font-medium leading-5 [overflow-wrap:anywhere]">{doc.title}</span>
                  <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" sideOffset={6} className={`w-[230px] ${menuCard}`}>
                <div className={menuNote}>
                  {!doc.isOwner && <div>By {doc.ownerName || "someone"}</div>}
                  <div>Updated {ago(doc.updatedAt)}{doc.lastBy === "ai" ? " by the AI" : ""}</div>
                  <div>{doc.views} {doc.views === 1 ? "view" : "views"}</div>
                </div>
                <DropdownMenuItem className={menuItem} onClick={() => setShare({ open: true, tab: "share" })}>
                  <Share className={menuIcon} strokeWidth={2} /> Share
                </DropdownMenuItem>
                <DropdownMenuItem className={menuItem} onClick={() => setShare({ open: true, tab: "export" })}>
                  <Download className={menuIcon} strokeWidth={2} /> Export
                </DropdownMenuItem>
                <DropdownMenuSeparator className={menuSep} />
                <DropdownMenuItem className={menuItem} onClick={togglePin}>
                  <Pin className={menuIcon} strokeWidth={2} /> {doc.pinned ? "Unpin" : "Pin"}
                </DropdownMenuItem>
                {doc.can.edit && (
                  <DropdownMenuItem className={menuItem} onClick={() => setRenaming(true)}>
                    <Pencil className={menuIcon} strokeWidth={2} /> Rename
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className={menuItem} onClick={duplicate}>
                  <Copy className={menuIcon} strokeWidth={2} /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem className={menuItem} onClick={async () => { if (await load()) say("Up to date."); }}>
                  <RefreshCw className={menuIcon} strokeWidth={2} /> Refresh
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className={menuItem}>
                    <History className={menuIcon} strokeWidth={2} /> Version history
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className={`max-h-80 w-[250px] overflow-y-auto ${menuCard}`}>
                    {doc.versions.length === 0 && <div className={menuNote}>No versions yet</div>}
                    {doc.versions.map((v, i) => (
                      <DropdownMenuItem key={v.id} className={`${menuItem} justify-between`} onClick={() => (i === 0 ? setOldVersion(null) : void viewVersion(v.id))}>
                        <span>{format(new Date(v.at), "d MMM, h:mm a")}</span>
                        <span className="shrink-0 text-[12.5px] text-slate-500 dark:text-white/60">{i === 0 ? "Current" : v.by === "ai" ? "by AI" : "by a person"}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                {!inStudio && (
                  <DropdownMenuItem className={menuItem} onClick={() => { if (leaveEdits()) navigate("/docs"); }}>
                    <FileText className={menuIcon} strokeWidth={2} /> All docs
                  </DropdownMenuItem>
                )}
                {(!doc.isOwner || doc.can.manage) && <DropdownMenuSeparator className={menuSep} />}
                {!doc.isOwner && (
                  <DropdownMenuItem className={menuItem} onClick={() => setReporting({ comment: null })}>
                    <Flag className={menuIcon} strokeWidth={2} /> Report doc
                  </DropdownMenuItem>
                )}
                {doc.can.manage && (
                  <DropdownMenuItem className={menuDanger} onClick={() => setDeleting(true)}>
                    <Trash2 className="w-4 h-4" strokeWidth={2} /> Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            {aiNote && <div className="flex items-center gap-1 px-2 text-xs leading-4 text-foreground [overflow-wrap:anywhere]"><ClassgridLogoIcon size={16} />{aiNote}</div>}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1 text-muted-foreground">
            <div className="mr-1"><ReadersRow readers={readers} max={inStudio ? 3 : 4} /></div>

            {/* Comments: the button turns them on and off; the small arrow picks which ones show */}
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => { setCommentsOn((on) => !on); setPick(null); setComposer(null); setActiveComment(null); }}
                aria-pressed={commentsOn}
                title={commentsOn ? "Hide comments" : "Show comments"}
                aria-label={commentsOn ? "Hide comments" : "Show comments"}
                className={cn(barIcon, "relative", commentsOn && COMMENTS_ON)}
              >
                <MessageCircle className="h-4 w-4" fill={commentsOn ? "currentColor" : "none"} />
                {openComments.length > 0 && !commentsOn && <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold text-background">{openComments.length}</span>}
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" title="Which comments to show" aria-label="Which comments to show" className="flex h-8 w-4 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground">
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={6} className={`w-[210px] ${menuCard}`}>
                  {(["open", "resolved", "all"] as CommentFilter[]).map((f) => (
                    <DropdownMenuItem key={f} className={`${menuItem} justify-between`} onClick={() => showComments(f)}>
                      {f === "open" ? "Open comments" : f === "resolved" ? "Resolved comments" : "All comments"}
                      {commentsOn && filter === f && <Check className={menuIcon} strokeWidth={2} />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {doc.can.edit && !editing && (
              <button type="button" onClick={startEdit} className={barButton} title="Edit the text yourself" aria-label="Edit">
                <Edit3 className="h-4 w-4" /><span className={cn("hidden", !inStudio && "md:inline")}>Edit</span>
              </button>
            )}

            {!doc.can.edit && (
              <button type="button" onClick={askToEdit} disabled={sentRequest} title={sentRequest ? "The owner has not answered yet" : "Ask the owner to let you edit"} className={barButton}>
                {sentRequest ? "Request sent" : "Ask to edit"}
              </button>
            )}

            {!inStudio && (
              <button type="button" onClick={() => { if (leaveEdits()) navigate(studioDocPath(doc.id)); }} title="Open this doc beside the chat and ask Classgrid AI about it" aria-label="Chat" className={barButton}>
                <ClassgridLogoIcon size={18} /><span className="hidden sm:inline">Chat</span>
              </button>
            )}

            <button type="button" onClick={() => setShare({ open: true, tab: "share" })} className={cn(barButton, "relative")} aria-label="Share" title="Share">
              <Share className="h-4 w-4" /><span className={cn("hidden", !inStudio && "sm:inline")}>Share</span>
              {waiting > 0 && <span title={`${waiting} access ${waiting === 1 ? "request" : "requests"}`} className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-background bg-sky-500" />}
            </button>

            {inStudio && ON_WEBSITE && (
              <button type="button" onClick={() => { if (leaveEdits()) navigate(`/docs/${doc.id}`); }} className={barIcon} title="Open the doc on its own page" aria-label="Open the doc on its own page">
                <Maximize2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* The doc */}
        <div ref={scrollRef} className="min-w-0 flex-1 overflow-y-auto">
          <div ref={pageRef} className={cn("relative mx-auto py-8 pb-32", editing && !inStudio ? "max-w-6xl" : "max-w-3xl", inStudio ? "px-5" : "px-4 sm:px-8")}>
            {waiting > 0 && !share.open && (
              <button type="button" onClick={() => setShare({ open: true, tab: "share" })} className="mb-6 flex w-full items-center gap-2.5 rounded-xl border border-border bg-muted/50 px-3.5 py-2.5 text-left text-sm hover:bg-muted">
                <span className="inline-flex size-2 shrink-0 rounded-full bg-sky-500" />
                <span className="flex-1">{waiting === 1 ? "1 person asked for access to this doc." : `${waiting} people asked for access to this doc.`}</span>
                <span className="font-medium">Review</span>
              </button>
            )}
            {oldVersion && (
              <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2 text-sm">
                <History className="size-4 text-muted-foreground" />
                <span className="flex-1">Older version from {format(new Date(oldVersion.at), "d MMM, h:mm a")} ({oldVersion.by === "ai" ? "by the AI" : "by a person"})</span>
                {doc.can.edit && <Button size="sm" className="h-8 px-3" onClick={restoreVersion}>Restore this version</Button>}
                <Button size="sm" variant="outline" className="h-8 px-3" onClick={() => setOldVersion(null)}>Back to current</Button>
              </div>
            )}

            {editing ? (
              <div className="flex flex-col gap-3">
                {changedWhileEditing && (
                  <div className="rounded-xl border border-border bg-muted/50 px-3 py-2 text-sm">This doc was changed while you were editing. When you save, you can choose to keep your version.</div>
                )}
                <DocEditor value={draft} onChange={setDraft} narrow={inStudio} />
                <div className="sticky bottom-3 z-10 flex items-center gap-2 self-start rounded-xl border border-border bg-background p-1.5 shadow-lg">
                  <Button size="sm" className="px-4" onClick={() => save()} disabled={saving || !dirty}>Save</Button>
                  <Button size="sm" variant="outline" className="px-4" onClick={cancelEdit} disabled={saving}>Cancel</Button>
                  <span className="px-2 text-xs text-muted-foreground">{saving ? "Saving" : dirty ? "Unsaved changes" : "No changes"}</span>
                </div>
              </div>
            ) : (
              <div ref={articleRef} onMouseUp={onSelect} onKeyUp={onSelect} onClick={onDocClick} className={cn(commentsOn && doc.can.comment && !oldVersion && "cursor-pointer [&_a]:cursor-pointer")}>
                <DocMarkdown text={oldVersion ? oldVersion.markdown : doc.markdown} />
              </div>
            )}

            {/* Each open comment's writer, pinned where the comment is */}
            {pins.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => showComment(p.id)}
                onMouseEnter={() => setActiveComment(p.id)}
                onMouseLeave={() => setActiveComment((now) => (now === p.id && !commentsOn ? null : now))}
                style={{ top: p.top, left: p.left }}
                title={`Comment by ${p.name || "someone"}`}
                aria-label={`Comment by ${p.name || "someone"}`}
                className="absolute z-10 inline-flex rounded-full rounded-bl-[3px] bg-background p-px shadow-md ring-1 ring-foreground/15 transition-transform hover:z-20 hover:scale-125"
              >
                <PersonPhoto name={p.name || "?"} photo={p.photo} size="xs" className="size-4 text-[9px]" />
              </button>
            ))}
          </div>
        </div>

        {/* Comments */}
        {commentsOn && (
          <CommentsPanel
            comments={doc.comments}
            filter={filter}
            onFilter={setFilter}
            canComment={doc.can.comment}
            canEdit={doc.can.edit}
            me={me ? { id: String(me._id), name: me.name || "You", photo: me.profilePicture || "" } : null}
            active={activeComment}
            onActive={setActiveComment}
            floating={inStudio}
            onClose={() => { setCommentsOn(false); setComposer(null); setActiveComment(null); }}
            calls={{
              reply: (cid, text) => api.addReply(doc.id, cid, text).then(setDoc),
              resolve: (cid, resolved) => api.resolveComment(doc.id, cid, resolved).then(setDoc),
              remove: (cid) => api.deleteComment(doc.id, cid).then(setDoc),
            }}
            change={withComments}
            onReport={(c) => setReporting({ comment: { id: c.id, name: c.name, text: c.text } })}
            say={say}
            hint="Click any part of the doc, or pick some words, to comment on it."
          />
        )}
      </div>

      {/* Picked words, comments off: a small button to comment on them */}
      {pick && !editing && !composer && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={startComment}
          style={{ top: pick.top, left: pick.left }}
          className="fixed z-40 inline-flex h-8 items-center gap-1.5 rounded-lg bg-foreground px-3 text-xs font-semibold text-background shadow-lg"
        >
          <MessageCircle className="size-3.5" />Comment
        </button>
      )}

      {composer && !editing && (
        <CommentBox key={`${composer.top}:${composer.left}`} boxRef={composerRef} composer={composer} onChange={setComposer} onSend={sendComment} onClose={() => setComposer(null)} />
      )}

      <NoticeBar notice={notice} />

      <ShareDialog
        item={doc}
        calls={DOC_SHARE}
        exports={exports}
        meName={me?.name || ""}
        meEmail={me?.email || ""}
        mePhoto={me?.profilePicture || ""}
        open={share.open}
        tab={share.tab}
        onTab={(tab) => setShare({ open: true, tab })}
        onClose={() => setShare((s) => ({ ...s, open: false }))}
        onItem={setDoc}
        onLeft={() => { if (inStudio) onGone?.(); else navigate("/docs"); }}
        say={say}
      />
      <DeleteDocDialog title={doc.title} open={deleting} onClose={() => setDeleting(false)} onDelete={remove} />
      <RenameDocDialog title={doc.title} open={renaming} onClose={() => setRenaming(false)} onSave={saveTitle} />
      <ReportDocDialog
        comment={reporting?.comment}
        open={!!reporting}
        onClose={() => setReporting(null)}
        send={(reason, more) => (reporting?.comment ? api.reportComment(doc.id, reporting.comment.id, reason, more) : api.reportDoc(doc.id, reason, more))}
        say={say}
      />
    </div>
  );
}

export default LiveDocView;
