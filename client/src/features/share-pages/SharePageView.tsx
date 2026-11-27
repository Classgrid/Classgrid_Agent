// A page the AI published: the page itself in a sandboxed frame, with the same top bar, Share box, comments and
// menus a live doc has (owner, 2026-11-16: the page was "still the old look"; it is the screen he recorded).
// One view for two places, like a live doc:
//   - the page's own address, chat.classgrid.in/p/<id> (SharePagePage.tsx)
//   - a tab of Studio's right pane, beside the chat (inStudio): the chat is told which page is open, and a comment
//     sent to Classgrid AI goes to that chat
// What a person can do follows their role on the page (the server says: page.can).
// Comments: the comment button turns comments on; then a click on any part of the page, or picked words, opens the
// comment box right there. Each open comment is pinned on the page with its writer's photo. The app can't look
// inside the frame, so a small script in the page tells it where things are (bridge.ts).
// A video the AI made is a page too (kind "video"): it is loaded, shared, pinned, reported and deleted here the same
// way, and shown full screen with its scenes and time-pinned comments (VideoArtifactView.tsx).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Check, ChevronDown, Copy, Download, Film, Flag, Globe2, Home, Maximize2, MessageCircle, Pencil, Pin, Printer, RefreshCw, Share, Trash2 } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/marketing_ui/dropdown-menu";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { apiClient } from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/features/auth/queries/useCurrentUser";
import { ClassgridLogoIcon } from "@/components/layout/ClassgridLogoIcon";
import { errorText, privateAnswer } from "@/features/live-docs/liveDocsApi";
import type { DocReader } from "@/features/live-docs/liveDocsApi";
import { PersonPhoto, ReadersRow } from "@/features/live-docs/DocPeople";
import { ShareDialog, type ShareTab } from "@/features/live-docs/ShareDialog";
import { DeleteDocDialog, PrivateDoc, RenameDocDialog, ReportDocDialog } from "@/features/live-docs/DocDialogs";
import { CommentBox, CommentsPanel, NoticeBar, type CommentFilter, type Composer, type Thread } from "@/features/live-docs/DocComments";
import { commentAsk, openDocInStudio, setOpenDoc, studioDocPath } from "@/features/live-docs/docContext";
import { fileName, saveFile, type ExportChoice } from "@/features/live-docs/shareApi";
import { barButton, barIcon, boxBtnPlain, menuCard, menuDanger, menuIcon, menuItem, menuNote, menuSep } from "@/features/live-docs/docLook";
import * as api from "./pagesApi";
import type { PageDoc } from "./pagesApi";
import { readBridgeRequest, readPageNote, withPageScripts, type PageMark } from "./bridge";
import { VideoArtifactView } from "./VideoArtifactView";
import { downloadVideo } from "./videoTools";

const POLL_MS = 10000;
const MAX_PENDING = 20;
const BOX_WIDTH = 340;
const ago = (d: string) => { try { return formatDistanceToNow(new Date(d), { addSuffix: true }); } catch { return ""; } };
// (the comment button while comments are on)
const COMMENTS_ON = "bg-sky-500/15 text-sky-600 hover:bg-sky-500/20 hover:text-sky-600 dark:text-sky-400 dark:hover:bg-sky-500/20 dark:hover:text-sky-400";
// (the desktop app has no page of its own for a published page: there it is always beside the chat)
const ON_WEBSITE = import.meta.env.VITE_DESKTOP !== "1";
type Notice = { text: string; bad: boolean; n: number };

export function SharePageView({ id, inStudio = false, front = true, onGone, onTitle }: {
  id: string;
  /** Shown in Studio's right pane, beside the chat. */
  inStudio?: boolean;
  /** In Studio: this page's tab is the one in front (the chat is told about the page in front). */
  front?: boolean;
  /** In Studio: the page was deleted, or can't be opened: its tab can go. */
  onGone?: () => void;
  /** In Studio: the page's title, for its tab. */
  onTitle?: (title: string) => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: me } = useCurrentUser();
  const [page, setPage] = useState<PageDoc | null>(null);
  const [readers, setReaders] = useState<DocReader[]>([]);
  const [error, setError] = useState("");
  const [locked, setLocked] = useState<{ asked: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [commentsOn, setCommentsOn] = useState(false);
  const [filter, setFilter] = useState<CommentFilter>("open");
  const [pick, setPick] = useState<{ quote: string; top: number; left: number } | null>(null);
  const [composer, setComposer] = useState<Composer | null>(null);
  const [activeComment, setActiveComment] = useState<string | null>(null);
  const [marks, setMarks] = useState<PageMark[]>([]);
  const [share, setShare] = useState<{ open: boolean; tab: ShareTab }>({ open: false, tab: "share" });
  const [deleting, setDeleting] = useState(false);
  const [reporting, setReporting] = useState<{ comment: { id: string; name: string; text: string } | null } | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<PageDoc | null>(null);
  const pending = useRef(0);
  const noticeCount = useRef(0);
  pageRef.current = page;

  const say = useCallback((text: string, bad = false) => setNotice({ text, bad, n: ++noticeCount.current }), []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice((now) => (now?.n === notice.n ? null : now)), notice.bad ? 7000 : 4000);
    return () => clearTimeout(t);
  }, [notice]);

  // (an answer that only changes who the page is shared with comes without the page's HTML: the one on screen stays)
  const keep = useCallback((next: PageDoc) => setPage((now) => (now ? { ...next, html: next.html ?? now.html } : next)), []);

  const load = useCallback(async () => {
    try {
      const r = await api.getPage(id);
      if (r.page) { setPage(r.page); setLocked(null); setError(""); if (!inStudio) document.title = `${r.page.title} · Classgrid`; }
      if (r.reading) setReaders(r.reading);
      return r.page || null;
    } catch (e) {
      const priv = privateAnswer(e);
      if (priv) setLocked({ asked: priv.requested });
      else setError(errorText(e, "This page can't be opened. It may have been deleted."));
      setPage(null);
      return null;
    } finally { setLoading(false); }
  }, [id, inStudio]);

  useEffect(() => {
    setPage(null); setLocked(null); setError(""); setLoading(true); setComposer(null); setPick(null); setMarks([]);
    void load().then((first) => {
      if (!first) return;
      // Coming from the "Review request" email: the share box opens on the requests
      if (!inStudio && new URLSearchParams(window.location.search).get("share") && first.can.share) setShare({ open: true, tab: "share" });
    });
    return () => api.PAGE_SHARE.leave(id);
  }, [id, inStudio, load]);

  // Studio: the chat beside the page is told which page is in front
  const pageId = page?.id;
  const pageTitle = page?.title;
  useEffect(() => {
    if (!inStudio || !front || !pageId) return;
    setOpenDoc({ id: pageId, title: pageTitle || "", kind: "page" });
    return () => setOpenDoc(null);
  }, [inStudio, front, pageId, pageTitle]);
  const tellTitle = useRef(onTitle);
  tellTitle.current = onTitle;
  useEffect(() => { if (pageTitle) tellTitle.current?.(pageTitle); }, [pageTitle]);

  // Checks for changes (the AI published it again, a new comment) and who has it open, every few seconds
  useEffect(() => {
    const t = setInterval(async () => {
      const cur = pageRef.current;
      if (!cur || document.hidden) return;
      try {
        const r = await api.getPage(id, cur.updatedAt);
        if (r.reading) setReaders(r.reading);
        if (r.page) setPage(r.page);
      } catch (e) {
        // (the owner made it private, or took this person off it)
        const priv = privateAnswer(e);
        if (priv) { setLocked({ asked: priv.requested }); setPage(null); }
      }
    }, POLL_MS);
    return () => clearInterval(t);
  }, [id]);

  const html = page?.html;
  const srcDoc = useMemo(() => (html ? withPageScripts(html) : ""), [html]);
  const canComment = !!page?.can.comment;

  // The page is told whether comments are on and which words the open comments are on
  const openMarks = useMemo(() => (page?.comments || []).filter((c) => !c.resolved && c.quote).map((c) => ({ id: c.id, quote: c.quote })), [page?.comments]);
  const tellFrame = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage({ __cg: "comments", on: commentsOn && canComment, marks: openMarks, active: activeComment }, "*");
  }, [commentsOn, canComment, openMarks, activeComment]);
  useEffect(() => { tellFrame(); }, [tellFrame]);

  // A place on the page (as the page's frame gives it) as a place for the comment box on the screen
  const boxAt = (x: number, y: number) => {
    const frame = rootRef.current?.getBoundingClientRect() || { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight, width: window.innerWidth };
    const width = Math.min(BOX_WIDTH, frame.width - 24);
    return { top: Math.max(frame.top + 56, Math.min(y + 12, frame.bottom - 170)), left: Math.max(frame.left + 12, Math.min(frame.right - width - 12, x - width / 2)) };
  };
  const placeBox = useRef(boxAt);
  placeBox.current = boxAt;

  // Messages from the page: its saved data (window.classgrid.data: checked here, then sent to the API), and where
  // the person clicked or which words they picked, for a comment
  useEffect(() => {
    if (!id) return;
    const onMessage = async (e: MessageEvent) => {
      const frame = frameRef.current?.contentWindow;
      if (!frame || e.source !== frame) return;
      const note = readPageNote(e.data);
      if (note) {
        const rect = frameRef.current!.getBoundingClientRect();
        const may = !!pageRef.current?.can.comment;
        if (note.kind === "marks") setMarks(note.items);
        else if (note.kind === "pick") {
          if (!may) return;
          const { quote, x, y } = note.at;
          setPick(null);
          setComposer((now) => ({ quote, text: now?.quote === quote ? now.text : "", toAI: now?.toAI ?? false, ...placeBox.current(rect.left + x, rect.top + y) }));
        } else if (!note.at.quote) {
          // (a click on the page with nothing picked: the "Comment" button and an empty comment box go)
          setPick(null);
          setComposer((now) => (now && !now.text.trim() ? null : now));
        } else if (may) {
          const root = rootRef.current?.getBoundingClientRect() || { left: 0, top: 0, right: window.innerWidth };
          setPick({ quote: note.at.quote, top: Math.max(root.top + 52, rect.top + note.at.y - 40), left: Math.max(root.left + 8, Math.min(root.right - 120, rect.left + note.at.x - 52)) });
        }
        return;
      }
      const checked = readBridgeRequest(e.data);
      if (!checked) return;
      const reqId = (e.data as { id: number }).id;
      const reply = (msg: { ok: boolean; value?: unknown; error?: string }) => frame.postMessage({ __cg: "res", id: reqId, ...msg }, "*");
      if (checked.error || !checked.req) return reply({ ok: false, error: checked.error });
      if (pending.current >= MAX_PENDING) return reply({ ok: false, error: "Too many requests at once. Try again." });
      const r = checked.req;
      pending.current += 1;
      try {
        if (r.op === "list") {
          const res = await apiClient.get<{ data: Record<string, unknown> }>(`/api/pages/${id}/data`);
          reply({ ok: true, value: res.data.data });
        } else if (r.op === "get") {
          const res = await apiClient.get<{ value: unknown }>(`/api/pages/${id}/data/${r.key}`);
          reply({ ok: true, value: res.data.value });
        } else {
          await apiClient.put(`/api/pages/${id}/data/${r.key}`, { value: r.value === undefined ? null : r.value });
          reply({ ok: true, value: true });
        }
      } catch (err) {
        reply({ ok: false, error: errorText(err, "Could not save.") });
      } finally {
        pending.current -= 1;
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [id]);

  // The comment box closes on a click outside it (a click on the page itself is told by the page, above)
  useEffect(() => {
    if (!composer) return;
    const outside = (e: MouseEvent) => { if (!composerRef.current?.contains(e.target as Node)) setComposer(null); };
    const t = setTimeout(() => document.addEventListener("mousedown", outside), 0);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", outside); };
  }, [composer]);

  const withComments = (change: (comments: Thread[]) => Thread[]) => setPage((p) => (p ? { ...p, comments: change(p.comments) } : p));

  const startComment = () => {
    if (!pick) return;
    setComposer({ quote: pick.quote, text: "", toAI: false, ...boxAt(pick.left + 52, pick.top + 34) });
    setPick(null);
  };

  // Shown at once, saved behind; taken back if saving fails
  const sendComment = () => {
    if (!page || !composer?.text.trim()) return;
    const sent = { text: composer.text.trim(), quote: composer.quote };
    const toAI = composer.toAI;
    const temp: Thread = { id: `new-${Date.now()}`, userId: String(me?._id || ""), name: me?.name || "You", photo: me?.profilePicture || "", ...sent, at: new Date().toISOString(), resolved: false, replies: [] };
    withComments((all) => [...all, temp]);
    setComposer(null);
    setCommentsOn(true);
    setFilter((f) => (f === "resolved" ? "open" : f));
    api.addComment(page.id, sent.text, sent.quote).then((r) => {
      keep(r.page);
      if (!toAI) return;
      const ask = commentAsk({ id: page.id, title: page.title, kind: "page" }, { id: r.commentId, ...sent });
      if (inStudio) { window.dispatchEvent(new CustomEvent("agent:ask", { detail: { text: ask } })); say("Sent to Classgrid AI. Its answer will show under your comment."); }
      else navigate(studioDocPath(page.id, ask, "page"));
    }).catch((e) => {
      withComments((all) => all.filter((c) => c.id !== temp.id));
      say(errorText(e, "The comment could not be added."), true);
    });
  };

  const showComment = (commentId: string) => {
    setCommentsOn(true);
    setFilter((f) => (f === "resolved" ? "open" : f));
    setActiveComment(commentId);
    setTimeout(() => document.getElementById(`doc-comment-${commentId}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 60);
  };
  const showComments = (which: CommentFilter) => { setFilter(which); setCommentsOn(true); setPick(null); setComposer(null); };

  // (the new name shows at once and is saved behind it)
  const saveTitle = (title: string) => {
    if (!page) return;
    const before = page.title;
    setPage((p) => (p ? { ...p, title } : p));
    if (!inStudio) document.title = `${title} · Classgrid`;
    const noun = page.kind === "video" ? "video" : "page";
    api.renamePage(page.id, title).catch((e) => { setPage((p) => (p ? { ...p, title: before } : p)); say(errorText(e, `The ${noun} could not be renamed.`), true); });
  };

  const togglePin = () => {
    if (!page) return;
    const pinned = !page.pinned;
    setPage((p) => (p ? { ...p, pinned } : p));
    say(pinned ? "Pinned." : "Pin removed.");
    api.PAGE_SHARE.setPinned(page.id, pinned).catch((e) => { setPage((p) => (p ? { ...p, pinned: !pinned } : p)); say(errorText(e), true); });
  };

  const duplicate = async () => {
    if (!page) return;
    try {
      const copy = await api.PAGE_SHARE.duplicate(page.id);
      if (inStudio) { openDocInStudio(copy.id, "page"); say("A copy was made. It is open in a new tab."); }
      else navigate(`/p/${copy.id}`);
    } catch (e) { say(errorText(e, "A copy could not be made. Please try again."), true); }
  };

  const remove = async () => {
    if (!page) return;
    try {
      await api.deletePage(page.id);
      setDeleting(false);
      if (inStudio) onGone?.(); else navigate("/agent");
    } catch (e) { say(errorText(e, `The ${page.kind === "video" ? "video" : "page"} could not be deleted. Please try again.`), true); }
  };

  // "Ask to comment": a person who can open the page but not comment asks the owner
  const askToComment = () => {
    if (!page || page.asked) return;
    setPage((p) => (p ? { ...p, asked: "commenter" } : p));
    say("Request sent. You will be able to comment once the owner approves.");
    api.PAGE_SHARE.requestAccess(page.id, "commenter").catch((e) => { setPage((p) => (p ? { ...p, asked: null } : p)); say(errorText(e, "The request could not be sent. Please try again."), true); });
  };

  if (locked) return <PrivateDoc kind="page" asked={locked.asked} email={me?.email} compact={inStudio} ask={() => api.PAGE_SHARE.requestAccess(id)} />;
  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-4 bg-background px-4 text-center text-foreground", inStudio ? "h-full" : "min-h-dvh")}>
        <p className="max-w-sm text-[14px] text-muted-foreground">{error}</p>
        {inStudio
          ? <button type="button" className={boxBtnPlain} onClick={() => onGone?.()}>Close this tab</button>
          : <Link to="/agent" className={boxBtnPlain}>Back to chat</Link>}
      </div>
    );
  }
  if (loading || !page) {
    return (
      <div className={cn("flex w-full flex-col bg-background", inStudio ? "h-full" : "h-dvh")} aria-busy="true">
        <div className="flex h-12 shrink-0 items-center gap-3 border-b border-border/50 px-3">
          <Skeleton className="h-6 w-6 rounded-md" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex flex-1 flex-col gap-3 p-6">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  const openComments = page.comments.filter((c) => !c.resolved);
  const waiting = page.can.share ? (page.requests || []).length : 0;
  const frameBox = frameRef.current;
  const shownMarks = marks.filter((m) => m.x >= 0 && m.y >= 0 && (!frameBox || (m.x <= frameBox.clientWidth && m.y <= frameBox.clientHeight)));
  const exports: ExportChoice[] = [
    { id: "html", name: "Web page", about: "One .html file that opens in any browser", icon: Globe2, run: async () => saveFile(page.html, `${fileName(page.title, "page")}.html`, "text/html") },
    {
      id: "print", name: "PDF or print", about: "Opens your browser's print box, where you can save the page as a PDF", icon: Printer, done: "",
      run: async () => { setShare((s) => ({ ...s, open: false })); setTimeout(() => frameRef.current?.contentWindow?.postMessage({ __cg: "print" }, "*"), 250); },
    },
  ];
  const isVideo = page.kind === "video";
  // (the word the boxes use: a video's own words, a page's as they always were)
  const noun = isVideo ? "video" : "page";
  const videoUrl = page.video?.url;
  const videoExports: ExportChoice[] = videoUrl
    ? [{ id: "mp4", name: "Download MP4", about: "The video as one .mp4 file that plays anywhere", icon: Film, run: () => downloadVideo(videoUrl, page.title) }]
    : [];
  // (the video's X and Esc: back to the screen of the app it was opened from, like the chat card; a fresh tab or a
  // link opened from outside has nothing of the app's to go back to, so the chat opens; in Studio its tab closes)
  const closeVideo = () => {
    if (inStudio) { onGone?.(); return; }
    // (the router's own place in this tab's history: 0 is the first screen of the app in this tab)
    const idx = (window.history.state as { idx?: unknown } | null)?.idx;
    const inApp = location.key !== "default" && (typeof idx !== "number" || idx > 0);
    if (inApp) navigate(-1);
    else navigate("/agent");
  };
  // A comment on the video sent to Classgrid AI: in Studio to the chat beside it; else Studio opens with the message
  const askAboutVideo = (ask: string) => {
    if (inStudio) { window.dispatchEvent(new CustomEvent("agent:ask", { detail: { text: ask } })); say("Sent to Classgrid AI. Its answer will show under your comment."); }
    else navigate(studioDocPath(page.id, ask, "page"));
  };

  // The message bar and the boxes that open over the page (and over a video)
  const boxes = (
    <>
      <NoticeBar notice={notice} />

      <ShareDialog
        item={page}
        calls={api.PAGE_SHARE}
        noun={noun}
        exports={isVideo ? videoExports : exports}
        meName={me?.name || ""}
        meEmail={me?.email || ""}
        mePhoto={me?.profilePicture || ""}
        open={share.open}
        tab={share.tab}
        onTab={(tab) => setShare({ open: true, tab })}
        onClose={() => setShare((s) => ({ ...s, open: false }))}
        onItem={keep}
        onLeft={() => { if (inStudio) onGone?.(); else navigate("/agent"); }}
        say={say}
      />
      <DeleteDocDialog kind={noun} title={page.title} open={deleting} onClose={() => setDeleting(false)} onDelete={remove} />
      <RenameDocDialog kind={noun} title={page.title} open={renaming} onClose={() => setRenaming(false)} onSave={saveTitle} />
      <ReportDocDialog
        kind={noun}
        comment={reporting?.comment}
        open={!!reporting}
        onClose={() => setReporting(null)}
        send={(reason, more) => (reporting?.comment ? api.PAGE_SHARE.reportComment(page.id, reporting.comment.id, reason, more) : api.PAGE_SHARE.report(page.id, reason, more))}
        say={say}
      />
    </>
  );

  if (isVideo) {
    if (!page.video) {
      return (
        <div className={cn("relative flex flex-col items-center justify-center gap-4 bg-background px-4 text-center text-foreground", inStudio ? "h-full" : "min-h-dvh")}>
          <p className="max-w-sm text-[14px] text-muted-foreground">{"This video can't be opened. Please try again later."}</p>
          <button type="button" className={boxBtnPlain} onClick={closeVideo}>Close</button>
          {boxes}
        </div>
      );
    }
    return (
      <VideoArtifactView
        page={page}
        readers={readers}
        me={me ? { id: String(me._id), name: me.name || "You", photo: me.profilePicture || "" } : null}
        inStudio={inStudio}
        blocked={share.open || deleting || renaming || !!reporting}
        onClose={closeVideo}
        onShare={(tab) => setShare({ open: true, tab })}
        onPin={togglePin}
        onRename={() => setRenaming(true)}
        onDuplicate={duplicate}
        onRefresh={async () => { if (await load()) say("Up to date."); }}
        onReport={() => setReporting({ comment: null })}
        onDelete={() => setDeleting(true)}
        onAskToComment={askToComment}
        onReportComment={(c) => setReporting({ comment: { id: c.id, name: c.name, text: c.text } })}
        onAsk={askAboutVideo}
        change={withComments}
        keep={keep}
        say={say}
      >
        {boxes}
      </VideoArtifactView>
    );
  }

  return (
    <div ref={rootRef} className={cn("relative flex flex-col overflow-hidden bg-background text-foreground", inStudio ? "h-full min-h-0" : "h-dvh")}>
      {/* Top bar (the same one a live doc has) */}
      <header className="z-30 shrink-0 border-b border-border/50 bg-background">
        <div className={cn("flex min-h-12 flex-wrap items-center gap-x-1 gap-y-0.5 py-2", inStudio ? "px-2" : "px-2 sm:px-3")}>
          {!inStudio && (
            <Link to="/agent" className={barIcon} title="Home" aria-label="Home">
              <Home className="h-4 w-4" />
            </Link>
          )}
          <div className="min-w-0 flex-[1_1_12rem]">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" title="Page menu" className="flex max-w-full cursor-pointer items-start gap-1 rounded-md px-2 py-1.5 text-left text-foreground transition-colors hover:bg-black/5 dark:hover:bg-white/10">
                  <span className="min-w-0 text-[14px] font-medium leading-5 [overflow-wrap:anywhere]">{page.title}</span>
                  <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" sideOffset={6} className={`w-[230px] ${menuCard}`}>
                <div className={menuNote}>
                  {!page.isOwner && <div>By {page.ownerName || "someone"}</div>}
                  <div>Updated {ago(page.updatedAt)}</div>
                  <div>{page.views} {page.views === 1 ? "view" : "views"}{page.versions > 1 ? ` · Version ${page.versions}` : ""}</div>
                </div>
                <DropdownMenuItem className={menuItem} onClick={() => setShare({ open: true, tab: "share" })}>
                  <Share className={menuIcon} strokeWidth={2} /> Share
                </DropdownMenuItem>
                <DropdownMenuItem className={menuItem} onClick={() => setShare({ open: true, tab: "export" })}>
                  <Download className={menuIcon} strokeWidth={2} /> Export
                </DropdownMenuItem>
                <DropdownMenuSeparator className={menuSep} />
                <DropdownMenuItem className={menuItem} onClick={togglePin}>
                  <Pin className={menuIcon} strokeWidth={2} /> {page.pinned ? "Unpin" : "Pin"}
                </DropdownMenuItem>
                {page.can.edit && (
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
                {(!page.isOwner || page.can.manage) && <DropdownMenuSeparator className={menuSep} />}
                {!page.isOwner && (
                  <DropdownMenuItem className={menuItem} onClick={() => setReporting({ comment: null })}>
                    <Flag className={menuIcon} strokeWidth={2} /> Report page
                  </DropdownMenuItem>
                )}
                {page.can.manage && (
                  <DropdownMenuItem className={menuDanger} onClick={() => setDeleting(true)}>
                    <Trash2 className="w-4 h-4" strokeWidth={2} /> Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
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

            {!page.can.comment && (
              <button type="button" onClick={askToComment} disabled={!!page.asked} title={page.asked ? "The owner has not answered yet" : "Ask the owner to let you comment"} className={barButton}>
                {page.asked ? "Request sent" : "Ask to comment"}
              </button>
            )}

            {!inStudio && (
              <button type="button" onClick={() => navigate(studioDocPath(page.id, undefined, "page"))} title="Open this page beside the chat and ask Classgrid AI about it" aria-label="Chat" className={barButton}>
                <ClassgridLogoIcon size={18} /><span className="hidden sm:inline">Chat</span>
              </button>
            )}

            <button type="button" onClick={() => setShare({ open: true, tab: "share" })} className={cn(barButton, "relative")} aria-label="Share" title="Share">
              <Share className="h-4 w-4" /><span className={cn("hidden", !inStudio && "sm:inline")}>Share</span>
              {waiting > 0 && <span title={`${waiting} access ${waiting === 1 ? "request" : "requests"}`} className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-background bg-sky-500" />}
            </button>

            {inStudio && ON_WEBSITE && (
              <button type="button" onClick={() => navigate(`/p/${page.id}`)} className={barIcon} title="Open the page on its own" aria-label="Open the page on its own">
                <Maximize2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* The page */}
        <div className="relative min-w-0 flex-1">
          <iframe
            ref={frameRef}
            title={page.title}
            srcDoc={srcDoc}
            onLoad={tellFrame}
            sandbox="allow-scripts allow-forms allow-popups allow-modals"
            className="h-full w-full border-0 bg-white"
          />
          {/* Each open comment's writer, pinned where the comment is */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {shownMarks.map((m) => {
              const c = page.comments.find((x) => x.id === m.id);
              if (!c) return null;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => showComment(m.id)}
                  onMouseEnter={() => setActiveComment(m.id)}
                  onMouseLeave={() => setActiveComment((now) => (now === m.id && !commentsOn ? null : now))}
                  style={{ top: Math.max(2, m.y - 14), left: Math.max(2, m.x - 2) }}
                  title={`Comment by ${c.name || "someone"}`}
                  aria-label={`Comment by ${c.name || "someone"}`}
                  className="pointer-events-auto absolute z-10 inline-flex cursor-pointer rounded-full rounded-bl-[3px] bg-white p-px shadow-md ring-1 ring-black/15 transition-transform hover:z-20 hover:scale-125 dark:bg-[#202123] dark:ring-white/20"
                >
                  {c.byAI
                    ? <span className="inline-flex size-4 items-center justify-center rounded-full bg-foreground text-background"><ClassgridLogoIcon size={12} /></span>
                    : <PersonPhoto name={c.name || "?"} photo={c.photo} size="xs" className="size-4 text-[9px]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Comments */}
        {commentsOn && (
          <CommentsPanel
            comments={page.comments}
            filter={filter}
            onFilter={setFilter}
            canComment={page.can.comment}
            canEdit={page.can.edit}
            me={me ? { id: String(me._id), name: me.name || "You", photo: me.profilePicture || "" } : null}
            active={activeComment}
            onActive={setActiveComment}
            floating={inStudio}
            onClose={() => { setCommentsOn(false); setComposer(null); setActiveComment(null); }}
            calls={{
              reply: (cid, text) => api.addReply(page.id, cid, text).then(keep),
              resolve: (cid, resolved) => api.resolveComment(page.id, cid, resolved).then(keep),
              remove: (cid) => api.deleteComment(page.id, cid).then(keep),
            }}
            change={withComments}
            onReport={(c) => setReporting({ comment: { id: c.id, name: c.name, text: c.text } })}
            say={say}
            hint="Click any part of the page, or pick some words, to comment on it."
          />
        )}
      </div>

      {/* Picked words, comments off: a small button to comment on them */}
      {pick && !composer && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={startComment}
          style={{ top: pick.top, left: pick.left }}
          className="fixed z-40 inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-foreground px-3 text-xs font-semibold text-background shadow-lg"
        >
          <MessageCircle className="size-3.5" />Comment
        </button>
      )}

      {composer && (
        <CommentBox key={`${composer.top}:${composer.left}`} boxRef={composerRef} composer={composer} onChange={setComposer} onSend={sendComment} onClose={() => setComposer(null)} />
      )}

      {boxes}
    </div>
  );
}

export default SharePageView;
