// A video the AI made, as an artifact (a published page of kind "video"), full screen at chat.classgrid.in/p/<id>
// and in Studio's right pane. SharePageView.tsx loads the page and keeps it up to date, and owns its Share box,
// menus and small boxes; this is the screen itself (owner, 2026-11-27, from the screens he recorded):
//   top bar     X, the title, comments, Share, the three dots (the page's own menu)
//   the video   its poster until it plays
//   controls    back to start, loop, play or pause, download; then "0:21 / 2:09", sound, Comment, three dots
//   the strip   one tile per scene, as wide as the scene is long (its picture dimmed, short title and length), the
//               playhead, a mark at each comment's time; a click on a tile goes there, and it scrolls with the video
//   comments    with Comment on, a click on the video pins a comment at that time and place, a drag draws a box, and
//               a drag on the strip (or a click at the start and one at the end) picks a stretch of time. Each comment
//               is a small card ("The left sidebar · 0:21"); a click on it goes to its time and shows its box.
// Comments are the page's own (the same list, replies, resolve and report), saved with POST /api/pages/:id/comments
// with their time, stretch and box.
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Check, Copy, Download, EllipsisVertical, Flag, Maximize2, MessageCircle, MoreHorizontal, Pause, Pencil, Pin, Play,
  RefreshCw, Repeat, RotateCcw, Share, Trash2, Volume2, VolumeX, X,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/marketing_ui/dropdown-menu";
import { ClassgridLogoIcon } from "@/components/layout/ClassgridLogoIcon";
import { cn } from "@/lib/utils";
import { errorText } from "@/features/live-docs/liveDocsApi";
import type { DocReader } from "@/features/live-docs/liveDocsApi";
import { PersonPhoto, ReadersRow } from "@/features/live-docs/DocPeople";
import { CommentBox, CommentsPanel, type CommentFilter, type Composer, type Me, type Thread } from "@/features/live-docs/DocComments";
import type { ShareTab } from "@/features/live-docs/ShareDialog";
import { barButton, barIcon, menuCard, menuDanger, menuIcon, menuItem, menuNote, menuSep } from "@/features/live-docs/docLook";
import * as api from "./pagesApi";
import type { PageComment, PageDoc, VideoArea } from "./pagesApi";
import { boxFrom, fitSize, formatClock, formatLength, formatSpan, stripLayout, tileAt, timeToX, xToTime } from "./videoMath";
import { downloadVideo, videoCommentAsk } from "./videoTools";

const HINT = "Tap to comment. Drag, or tap start and end, for an area or a stretch of time";
// (the comment buttons while comments are on: the same as a page's)
const COMMENTS_ON = "bg-sky-500/15 text-sky-600 hover:bg-sky-500/20 hover:text-sky-600 dark:text-sky-400 dark:hover:bg-sky-500/20 dark:hover:text-sky-400";
const SPEEDS = [0.5, 1, 1.5, 2];
const SEEK_STEP = 5;
// (how long a comment with no stretch stays shown on the video after its time)
const SHOW_FOR = 3;
// (a drag shorter than this, in pixels, is a tap)
const DRAG_PX = 8;
const BOX_WIDTH = 340;
// (a comment card's picture: as wide as the card, with the video's own shape, never taller than this)
const CARD_WIDTH = 144;
const CARD_PICTURE_MAX = 96;
// Where a thing is on the video or the strip, as CSS variables the classes read (PLACE: --x and --y; SIZE: --w, --h)
const vars = (v: { x?: number | string; y?: number | string; w?: number | string; h?: number | string }) => {
  const css = (n: number | string) => (typeof n === "number" ? `${n}px` : n);
  const out: Record<string, string> = {};
  if (v.x !== undefined) out["--x"] = css(v.x);
  if (v.y !== undefined) out["--y"] = css(v.y);
  if (v.w !== undefined) out["--w"] = css(v.w);
  if (v.h !== undefined) out["--h"] = css(v.h);
  return out as CSSProperties;
};
const pct = (n: number) => `${n * 100}%`;
const PLACE = "left-[var(--x)] top-[var(--y)]";
const SIZE = "w-[var(--w)] h-[var(--h)]";
const ago = (d: string) => { try { return formatDistanceToNow(new Date(d), { addSuffix: true }); } catch { return ""; } };

type Mark = { time: number; timeEnd: number | null; area: VideoArea | null };
type VideoComposer = Composer & { mark: Mark };
type Timed = PageComment & { time: number };
type Say = (text: string, bad?: boolean) => void;

const isTimed = (c: PageComment): c is Timed => typeof c.time === "number" && Number.isFinite(c.time);
// (a box with some size; a tapped point has none)
const isBox = (a: VideoArea | null | undefined) => !!a && a.w >= 0.01 && a.h >= 0.01;
// (the comment box near a place on the screen, inside the window)
const boxAt = (x: number, y: number) => {
  const width = Math.min(BOX_WIDTH, window.innerWidth - 24);
  return {
    top: Math.max(56, Math.min(y + 12, window.innerHeight - 190)),
    left: Math.max(12, Math.min(window.innerWidth - width - 12, x - width / 2)),
  };
};
// (keys typed into a box, or in a menu or a box over the viewer, are theirs)
const keyIsElsewhere = (e: KeyboardEvent) => {
  const el = e.target as HTMLElement | null;
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return true;
  return !!el.closest("[role=menu], [role=dialog], [role=alertdialog], [role=listbox]");
};

export function VideoArtifactView({
  page, readers, me, inStudio, blocked, onClose, onShare, onPin, onRename, onDuplicate, onRefresh, onReport, onDelete,
  onAskToComment, onReportComment, onAsk, change, keep, say, children,
}: {
  page: PageDoc;
  readers: DocReader[];
  me: Me;
  inStudio: boolean;
  /** A box (Share, Delete, Rename, Report) is open over the viewer: its keys are its own. */
  blocked: boolean;
  /** X, and Esc with comments off. */
  onClose: () => void;
  onShare: (tab: ShareTab) => void;
  onPin: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onRefresh: () => void;
  onReport: () => void;
  onDelete: () => void;
  onAskToComment: () => void;
  onReportComment: (comment: Thread) => void;
  /** Sends a comment to Classgrid AI (the message that asks it to answer the comment). */
  onAsk: (ask: string) => void;
  /** Changes the comments on the screen at once (before, or without, the server). */
  change: (next: (comments: Thread[]) => Thread[]) => void;
  /** The page as the server answered it. */
  keep: (page: PageDoc) => void;
  say: Say;
  /** The message bar and the boxes that open over it (Share, Delete, Rename, Report). */
  children?: ReactNode;
}) {
  const video = page.video!;
  const videoRef = useRef<HTMLVideoElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const stripInner = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const userScrolled = useRef(0);
  const dragRef = useRef<{ kind: "video" | "strip"; x0: number; y0: number; moved: boolean } | null>(null);

  const [t, setT] = useState(0);
  const [duration, setDuration] = useState(video.seconds || 0);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(false);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [failed, setFailed] = useState(false);
  const [commentMode, setCommentMode] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [filter, setFilter] = useState<CommentFilter>("open");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [composer, setComposer] = useState<VideoComposer | null>(null);
  // (a box being drawn on the video, each corner 0 to 1 of the frame)
  const [drawing, setDrawing] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  // (a stretch being picked on the strip, in pixels of the strip; or the start picked with a first click)
  const [picking, setPicking] = useState<{ x0: number; x1: number } | null>(null);
  const [pendingStart, setPendingStart] = useState<number | null>(null);
  const [stage, setStage] = useState({ width: 0, height: 0 });
  const [natural, setNatural] = useState({ width: video.width, height: video.height });
  const [stripWidth, setStripWidth] = useState(0);

  const seconds = duration || video.seconds || 0;
  const canComment = page.can.comment;

  // The video's size on the screen: as big as fits, with its own shape (so a box on it is a box on the frame)
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    // (the room inside its padding)
    const measure = () => {
      const css = getComputedStyle(el);
      const w = el.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight);
      const h = el.clientHeight - parseFloat(css.paddingTop) - parseFloat(css.paddingBottom);
      setStage({ width: Math.max(0, w || 0), height: Math.max(0, h || 0) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const measure = () => setStripWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const frame = fitSize(stage.width, stage.height, natural.width, natural.height);

  const wide = stripWidth >= 768;
  const layout = useMemo(
    () => stripLayout(video.scenes, seconds, { perSecond: wide ? 6 : 3, minWidth: wide ? 32 : 24, gap: 4, fitWidth: Math.max(0, stripWidth - 24) }),
    [video.scenes, seconds, wide, stripWidth],
  );
  const current = tileAt(layout, t);

  // While it plays, the time moves every frame (the video's own time event is only a few times a second)
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      const v = videoRef.current;
      if (v) setT(v.currentTime);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  useEffect(() => { const v = videoRef.current; if (v) v.loop = loop; }, [loop]);
  useEffect(() => { const v = videoRef.current; if (v) v.muted = muted; }, [muted]);
  useEffect(() => { const v = videoRef.current; if (v) v.playbackRate = speed; }, [speed]);

  // The strip follows the playhead (it stays put for a few seconds after the person scrolls it)
  const playheadX = timeToX(layout, t);
  useEffect(() => {
    const el = stripRef.current;
    if (!el || Date.now() - userScrolled.current < 2500) return;
    const target = Math.max(0, playheadX + 12 - el.clientWidth * 0.4);
    if (Math.abs(el.scrollLeft - target) > 1) el.scrollLeft = target;
  }, [playheadX]);

  const seek = useCallback((time: number) => {
    const v = videoRef.current;
    const to = Math.max(0, Math.min(seconds || Infinity, time));
    if (v) v.currentTime = to;
    setT(to);
  }, [seconds]);

  const play = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      if (v.ended || (seconds && v.currentTime >= seconds - 0.05)) v.currentTime = 0;
      void v.play().catch(() => {});
    } else v.pause();
  }, [seconds]);
  const pause = () => videoRef.current?.pause();

  const stopCommenting = useCallback(() => {
    setCommentMode(false); setComposer(null); setDrawing(null); setPicking(null); setPendingStart(null);
  }, []);

  // Keys: space plays and pauses, the arrows go 5 seconds back and on, Esc turns comments off, then closes
  // (in Studio the chat is beside it: there the keys are the video's only while something in it has the focus)
  const keys = useRef({ play, seek, t, composer, commentMode, onClose, stopCommenting, blocked, inStudio });
  keys.current = { play, seek, t, composer, commentMode, onClose, stopCommenting, blocked, inStudio };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = keys.current;
      if (k.blocked || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || keyIsElsewhere(e)) return;
      if (k.inStudio && !rootRef.current?.contains(document.activeElement)) return;
      if (e.key === " " || e.code === "Space") { e.preventDefault(); k.play(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); k.seek(k.t - SEEK_STEP); }
      else if (e.key === "ArrowRight") { e.preventDefault(); k.seek(k.t + SEEK_STEP); }
      else if (e.key === "Escape") {
        if (document.fullscreenElement) return;
        e.preventDefault();
        if (k.composer || k.commentMode) k.stopCommenting();
        else k.onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // The comment box closes on a click outside it
  useEffect(() => {
    if (!composer) return;
    const outside = (e: MouseEvent) => { if (!composerRef.current?.contains(e.target as Node)) setComposer(null); };
    const timer = setTimeout(() => document.addEventListener("mousedown", outside), 0);
    return () => { clearTimeout(timer); document.removeEventListener("mousedown", outside); };
  }, [composer]);

  const openComposer = (picked: Mark, x: number, y: number) => {
    // (the server checks times against the video's own length, which the player can see as a little longer)
    const last = video.seconds || seconds;
    const inside = (n: number) => Math.round(Math.max(0, Math.min(last, n)) * 1000) / 1000;
    const time = inside(picked.time);
    const end = picked.timeEnd === null ? null : inside(picked.timeEnd);
    const mark: Mark = { time, timeEnd: end !== null && end > time ? end : null, area: picked.area };
    pause();
    seek(time);
    setComposer({ quote: "", text: "", toAI: false, mark, ...boxAt(x, y) });
  };

  // Shown at once, saved behind; taken back if saving fails
  const sendComment = () => {
    if (!composer?.text.trim()) return;
    const text = composer.text.trim();
    const { mark, toAI } = composer;
    const temp: PageComment = {
      id: `new-${Date.now()}`, userId: me?.id || "", name: me?.name || "You", photo: me?.photo || "", text, quote: "",
      at: new Date().toISOString(), resolved: false, replies: [], ...mark,
    };
    change((all) => [...all, temp]);
    setComposer(null);
    setFilter((f) => (f === "resolved" ? "open" : f));
    api.addComment(page.id, text, "", mark).then((r) => {
      keep(r.page);
      if (toAI) onAsk(videoCommentAsk(page, { id: r.commentId, text, ...mark }));
    }).catch((e) => {
      change((all) => all.filter((c) => c.id !== temp.id));
      say(errorText(e, "The comment could not be added."), true);
    });
  };

  // ── On the video: a click pins a comment at this time and place, a drag draws a box ──
  const framePoint = (e: ReactPointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: r.width ? (e.clientX - r.left) / r.width : 0, y: r.height ? (e.clientY - r.top) / r.height : 0 };
  };
  const videoDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!commentMode || !canComment || e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = framePoint(e);
    dragRef.current = { kind: "video", x0: e.clientX, y0: e.clientY, moved: false };
    setDrawing({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
  };
  const videoMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.kind !== "video") return;
    if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > DRAG_PX) d.moved = true;
    const p = framePoint(e);
    setDrawing((now) => (now ? { ...now, x1: p.x, y1: p.y } : now));
  };
  const videoUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.kind !== "video") return;
    dragRef.current = null;
    const p = framePoint(e);
    const start = drawing || { x0: p.x, y0: p.y };
    setDrawing(null);
    const area = d.moved ? boxFrom(start.x0, start.y0, p.x, p.y) : boxFrom(p.x, p.y, p.x, p.y);
    const time = videoRef.current?.currentTime ?? t;
    openComposer({ time, timeEnd: null, area }, e.clientX, e.clientY);
  };

  // ── On the strip: a drag (or a click at the start and one at the end) picks a stretch of time ──
  const stripX = (clientX: number) => clientX - (stripInner.current?.getBoundingClientRect().left || 0);
  const stripDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    userScrolled.current = Date.now();
    if (!commentMode || !canComment || e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const x = stripX(e.clientX);
    dragRef.current = { kind: "strip", x0: e.clientX, y0: e.clientY, moved: false };
    setPicking({ x0: x, x1: x });
  };
  const stripMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.kind !== "strip") return;
    if (Math.abs(e.clientX - d.x0) > DRAG_PX) d.moved = true;
    const x = stripX(e.clientX);
    setPicking((now) => (now ? { ...now, x1: x } : now));
  };
  const stripUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.kind !== "strip") return;
    dragRef.current = null;
    const x = stripX(e.clientX);
    const x0 = picking?.x0 ?? x;
    setPicking(null);
    const y = (stripRef.current?.getBoundingClientRect().top || e.clientY) - 200;
    if (d.moved) {
      const a = xToTime(layout, Math.min(x0, x));
      const b = xToTime(layout, Math.max(x0, x));
      setPendingStart(null);
      openComposer({ time: a, timeEnd: b - a >= 0.3 ? b : null, area: null }, e.clientX, y);
      return;
    }
    const at = xToTime(layout, x);
    if (pendingStart === null) { setPendingStart(at); seek(at); return; }
    const a = Math.min(pendingStart, at);
    const b = Math.max(pendingStart, at);
    setPendingStart(null);
    openComposer({ time: a, timeEnd: b - a >= 0.3 ? b : null, area: null }, e.clientX, y);
  };

  // ── The comments ──
  const timed = useMemo(() => page.comments.filter((c): c is Timed => !c.resolved && isTimed(c)).sort((a, b) => a.time - b.time), [page.comments]);
  const openCount = page.comments.filter((c) => !c.resolved).length;
  const onVideo = timed.filter((c) => c.area && (c.id === activeId || (t >= c.time - 0.05 && t <= (c.timeEnd ?? c.time + SHOW_FOR))));
  const thumbAt = (time: number) => tileAt(layout, time)?.thumb || video.poster;
  // (the card's picture has the video's shape, so a box drawn on the video is in the same place on it; a tall video
  // gets a narrower picture in the middle of the card)
  const shape = natural.width > 0 && natural.height > 0 ? natural.width / natural.height : 16 / 9;
  const pictureHeight = Math.round(Math.min(CARD_PICTURE_MAX, CARD_WIDTH / shape));
  const pictureWidth = Math.round(Math.min(CARD_WIDTH, pictureHeight * shape));

  const goTo = useCallback((c: PageComment) => {
    setActiveId(c.id);
    if (isTimed(c)) { videoRef.current?.pause(); seek(c.time); }
  }, [seek]);
  const showInList = (c: PageComment) => {
    goTo(c);
    setPanelOpen(true);
    setFilter((f) => (f === "resolved" ? "open" : f));
    setTimeout(() => document.getElementById(`doc-comment-${c.id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 60);
  };

  // The list of comments (the page's own, each with its time); a click on a comment in it goes to its time
  const meKey = me ? `${me.id}|${me.name}|${me.photo}` : "";
  const panel = useMemo(() => {
    if (!panelOpen) return null;
    return (
      <CommentsPanel
        comments={page.comments}
        filter={filter}
        onFilter={setFilter}
        canComment={page.can.comment}
        canEdit={page.can.edit}
        me={me}
        active={activeId}
        onActive={setActiveId}
        floating
        onClose={() => { setPanelOpen(false); setActiveId(null); }}
        calls={{
          reply: (cid, text) => api.addReply(page.id, cid, text).then(keep),
          resolve: (cid, resolved) => api.resolveComment(page.id, cid, resolved).then(keep),
          remove: (cid) => api.deleteComment(page.id, cid).then(keep),
        }}
        change={change}
        onReport={onReportComment}
        say={say}
        hint="Turn on Comment, then tap the video to comment on that moment."
        onPick={goTo}
      />
    );
    // (me is compared by its fields: a new object with the same person needs no new list)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelOpen, page.comments, page.id, page.can.comment, page.can.edit, filter, activeId, meKey, keep, change, onReportComment, say, goTo]);

  const toggleFullScreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void rootRef.current?.requestFullscreen?.().catch(() => {});
  };
  const download = () => { void downloadVideo(video.url, page.title).catch((e) => say(errorText(e, "The video could not be downloaded."), true)); };

  const selection = composer?.mark ?? null;
  const pickBand = picking && Math.abs(picking.x1 - picking.x0) > 2
    ? { left: Math.min(picking.x0, picking.x1), width: Math.abs(picking.x1 - picking.x0) }
    : selection && selection.timeEnd !== null
      ? { left: timeToX(layout, selection.time), width: Math.max(2, timeToX(layout, selection.timeEnd) - timeToX(layout, selection.time)) }
      : null;
  const drawn = drawing && (Math.abs(drawing.x1 - drawing.x0) > 0.005 || Math.abs(drawing.y1 - drawing.y0) > 0.005)
    ? boxFrom(drawing.x0, drawing.y0, drawing.x1, drawing.y1)
    : selection?.area ?? null;

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      onPointerDown={(e) => {
        // (a box opened from here is outside it on the page: a click in the box keeps its own focus)
        const root = rootRef.current;
        if (root && root.contains(e.target as Node) && !root.contains(document.activeElement)) root.focus({ preventScroll: true });
      }}
      className={cn("relative flex flex-col overflow-hidden bg-background text-foreground outline-none", inStudio ? "h-full min-h-0" : "h-dvh")}
    >
      {/* Top bar */}
      <header className="z-30 flex h-14 shrink-0 items-center gap-1 px-2 sm:px-3">
        <button type="button" onClick={onClose} className={barIcon} title="Close" aria-label="Close">
          <X className="h-5 w-5" />
        </button>
        <h1 className="min-w-0 flex-1 truncate px-1.5 text-[15px] font-semibold" title={page.title}>{page.title}</h1>
        <div className="hidden sm:block"><ReadersRow readers={readers} max={inStudio ? 3 : 4} /></div>
        {/* Comment: the same as the Comment button under the video (one who can only read opens the list) */}
        <button
          type="button"
          onClick={() => {
            if (canComment) { if (commentMode) stopCommenting(); else setCommentMode(true); }
            else { setPanelOpen((on) => !on); setActiveId(null); }
          }}
          aria-pressed={canComment ? commentMode : panelOpen}
          title={canComment ? "Comment" : panelOpen ? "Hide comments" : "Show comments"}
          aria-label={canComment ? "Comment" : panelOpen ? "Hide comments" : "Show comments"}
          className={cn(barIcon, "relative", (canComment ? commentMode : panelOpen) && COMMENTS_ON)}
        >
          <MessageCircle className="h-[18px] w-[18px]" fill={(canComment ? commentMode : panelOpen) ? "currentColor" : "none"} />
          {openCount > 0 && !(canComment ? commentMode : panelOpen) && <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold text-background">{openCount}</span>}
        </button>
        <button type="button" onClick={() => onShare("share")} className={cn(barIcon, "relative")} aria-label="Share" title="Share">
          <Share className="h-[18px] w-[18px]" />
          {page.can.share && (page.requests || []).length > 0 && <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-background bg-sky-500" />}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={barIcon} title="More" aria-label="More">
              <EllipsisVertical className="h-[18px] w-[18px]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={6} className={`w-[230px] ${menuCard}`}>
            <div className={menuNote}>
              {!page.isOwner && <div>By {page.ownerName || "someone"}</div>}
              <div>Updated {ago(page.updatedAt)}</div>
              <div>{page.views} {page.views === 1 ? "view" : "views"}{page.versions > 1 ? ` · Version ${page.versions}` : ""}</div>
            </div>
            <DropdownMenuItem className={menuItem} onClick={() => onShare("share")}>
              <Share className={menuIcon} strokeWidth={2} /> Share
            </DropdownMenuItem>
            <DropdownMenuItem className={menuItem} onClick={() => onShare("export")}>
              <Download className={menuIcon} strokeWidth={2} /> Export
            </DropdownMenuItem>
            <DropdownMenuItem className={menuItem} onClick={() => { setPanelOpen((on) => !on); setActiveId(null); }}>
              <MessageCircle className={menuIcon} strokeWidth={2} /> {panelOpen ? "Hide comments" : "Show comments"}{openCount > 0 && !panelOpen ? ` (${openCount})` : ""}
            </DropdownMenuItem>
            <DropdownMenuSeparator className={menuSep} />
            <DropdownMenuItem className={menuItem} onClick={onPin}>
              <Pin className={menuIcon} strokeWidth={2} /> {page.pinned ? "Unpin" : "Pin"}
            </DropdownMenuItem>
            {page.can.edit && (
              <DropdownMenuItem className={menuItem} onClick={onRename}>
                <Pencil className={menuIcon} strokeWidth={2} /> Rename video
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className={menuItem} onClick={onDuplicate}>
              <Copy className={menuIcon} strokeWidth={2} /> Duplicate video
            </DropdownMenuItem>
            <DropdownMenuItem className={menuItem} onClick={onRefresh}>
              <RefreshCw className={menuIcon} strokeWidth={2} /> Refresh
            </DropdownMenuItem>
            {(!page.isOwner || page.can.manage) && <DropdownMenuSeparator className={menuSep} />}
            {!page.isOwner && (
              <DropdownMenuItem className={menuItem} onClick={onReport}>
                <Flag className={menuIcon} strokeWidth={2} /> Report video
              </DropdownMenuItem>
            )}
            {page.can.manage && (
              <DropdownMenuItem className={menuDanger} onClick={onDelete}>
                <Trash2 className="w-4 h-4" strokeWidth={2} /> Delete video
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* The video, with the comments on it, and the comment cards under it */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div ref={stageRef} className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2 py-2 sm:px-4">
          {failed ? (
            <p className="max-w-sm px-4 text-center text-[14px] text-muted-foreground">{"This video can't be played here. You can still download it."}</p>
          ) : (
            <div className={cn("relative overflow-hidden rounded-md bg-black", frame.width > 0 && SIZE)} style={vars({ w: frame.width, h: frame.height })}>
              <video
                ref={videoRef}
                key={video.url}
                src={video.url}
                poster={video.poster || undefined}
                preload="metadata"
                playsInline
                className="block h-full w-full"
                onLoadedMetadata={(e) => {
                  const v = e.currentTarget;
                  if (Number.isFinite(v.duration) && v.duration > 0) setDuration(v.duration);
                  if (v.videoWidth && v.videoHeight) setNatural({ width: v.videoWidth, height: v.videoHeight });
                  v.loop = loop; v.muted = muted; v.playbackRate = speed;
                }}
                onTimeUpdate={(e) => { if (e.currentTarget.paused) setT(e.currentTarget.currentTime); }}
                onSeeked={(e) => setT(e.currentTarget.currentTime)}
                onPlay={() => setPlaying(true)}
                onPause={(e) => { setPlaying(false); setT(e.currentTarget.currentTime); }}
                onEnded={(e) => { setPlaying(false); setT(e.currentTarget.currentTime); }}
                onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
                onError={() => setFailed(true)}
              />

              {/* A click on the video plays and pauses it; with Comment on, it pins a comment, and a drag draws a box */}
              <div
                className={cn("absolute inset-0", commentMode && canComment ? "cursor-crosshair touch-none" : "cursor-pointer")}
                onClick={() => { if (!commentMode) play(); }}
                onPointerDown={videoDown}
                onPointerMove={videoMove}
                onPointerUp={videoUp}
                onPointerCancel={() => { dragRef.current = null; setDrawing(null); }}
              />

              {/* The comments at this time that are on a part of the frame */}
              {onVideo.map((c) => {
                const a = c.area!;
                const label = c.name || "Someone";
                const common = cn("absolute z-10", commentMode ? "pointer-events-none" : "cursor-pointer");
                const open = (e: ReactMouseEvent) => { e.stopPropagation(); if (!commentMode) showInList(c); };
                return isBox(a) ? (
                  <button
                    key={c.id}
                    type="button"
                    onClick={open}
                    title={`Comment by ${label}`}
                    aria-label={`Comment by ${label}`}
                    style={vars({ x: pct(a.x), y: pct(a.y), w: pct(a.w), h: pct(a.h) })}
                    className={cn(common, PLACE, SIZE, "rounded-md border-2 border-sky-400 bg-sky-400/10", c.id === activeId && "bg-sky-400/20 ring-2 ring-sky-400/40")}
                  >
                    <span className="absolute -top-px left-0 inline-flex max-w-full -translate-y-full items-center gap-1 rounded-t-md bg-sky-500 px-1.5 py-0.5 text-[11.5px] font-medium text-white">
                      <span className="truncate">{c.text}</span>
                    </span>
                  </button>
                ) : (
                  <button
                    key={c.id}
                    type="button"
                    onClick={open}
                    title={`Comment by ${label}`}
                    aria-label={`Comment by ${label}`}
                    style={vars({ x: pct(a.x), y: pct(a.y) })}
                    className={cn(common, PLACE, "-translate-y-full inline-flex rounded-full rounded-bl-[3px] bg-background p-px shadow-md ring-1 ring-black/15 dark:ring-white/20", c.id === activeId && "scale-125")}
                  >
                    {c.byAI
                      ? <span className="inline-flex size-5 items-center justify-center rounded-full bg-foreground text-background"><ClassgridLogoIcon size={14} /></span>
                      : <PersonPhoto name={label} photo={c.photo} size="xs" className="size-5 text-[9px]" />}
                  </button>
                );
              })}

              {/* The box being drawn, or the place of the comment being written */}
              {drawn && (isBox(drawn)
                ? <div className={cn("pointer-events-none absolute z-10 rounded-md border-2 border-dashed border-sky-400 bg-sky-400/15", PLACE, SIZE)} style={vars({ x: pct(drawn.x), y: pct(drawn.y), w: pct(drawn.w), h: pct(drawn.h) })} />
                : <div className={cn("pointer-events-none absolute z-10 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-sky-500 shadow", PLACE)} style={vars({ x: pct(drawn.x), y: pct(drawn.y) })} />)}

              {commentMode && canComment && (
                <div className="pointer-events-none absolute inset-x-2 top-2 z-20 rounded-md bg-black/65 px-3 py-1.5 text-center text-[12.5px] font-medium leading-[17px] text-white">
                  {HINT}
                </div>
              )}
            </div>
          )}

          {panel}
        </div>

        {/* The comments as small cards ("The left sidebar · 0:21"): a click goes to the comment's time */}
        {timed.length > 0 && (
          <div className="shrink-0 overflow-x-auto px-3 pb-1 [scrollbar-width:none]">
            <div className="flex gap-2">
              {timed.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => goTo(c)}
                  onDoubleClick={() => showInList(c)}
                  title={`${c.text} · ${formatSpan(c.time, c.timeEnd)}`}
                  className={cn(
                    "w-36 shrink-0 cursor-pointer overflow-hidden rounded-lg border bg-black/[0.03] text-left transition-colors dark:bg-white/[0.04]",
                    c.id === activeId ? "border-sky-500/70" : "border-black/10 hover:border-black/25 dark:border-white/10 dark:hover:border-white/25",
                  )}
                >
                  <span className="flex h-[var(--h)] w-full justify-center bg-black/80" style={vars({ w: pictureWidth, h: pictureHeight })}>
                    <span className="relative block h-full w-[var(--w)] overflow-hidden">
                      {thumbAt(c.time) && <img src={thumbAt(c.time)} alt="" loading="lazy" className="h-full w-full object-cover opacity-60" />}
                      {c.area && isBox(c.area) && (
                        <span className={cn("absolute rounded-[3px] border border-sky-400", PLACE, SIZE)} style={vars({ x: pct(c.area.x), y: pct(c.area.y), w: pct(c.area.w), h: pct(c.area.h) })} />
                      )}
                    </span>
                  </span>
                  <span className="flex min-w-0 items-center px-2 py-1 text-[12px] leading-4 text-muted-foreground">
                    <span className="min-w-0 truncate">{c.text}</span>
                    <span className="shrink-0 whitespace-pre text-foreground/80"> · {formatSpan(c.time, c.timeEnd)}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Controls: back to start, loop, play or pause, download */}
      <div className="mx-auto grid w-full max-w-5xl shrink-0 grid-cols-3 items-center border-t border-border/50 px-2 py-1.5 sm:px-3">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => seek(0)} className={barIcon} title="Back to start" aria-label="Back to start">
            <RotateCcw className="h-[18px] w-[18px]" />
          </button>
          <button type="button" onClick={() => setLoop((on) => !on)} aria-pressed={loop} className={cn(barIcon, loop && COMMENTS_ON)} title={loop ? "Loop is on" : "Loop is off"} aria-label="Loop">
            <Repeat className="h-[18px] w-[18px]" />
          </button>
        </div>
        <div className="flex justify-center">
          <button type="button" onClick={play} className={cn(barIcon, "h-10 w-10 text-foreground")} title={playing ? "Pause" : "Play"} aria-label={playing ? "Pause" : "Play"}>
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
        </div>
        <div className="flex justify-end">
          <button type="button" onClick={download} className={barIcon} title="Download MP4" aria-label="Download MP4">
            <Download className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>

      {/* The time, sound, Comment, more */}
      <div className="mx-auto flex w-full max-w-5xl shrink-0 items-center gap-1 px-3 pb-1 sm:px-4">
        <span className="flex-1 text-[13px] tabular-nums text-muted-foreground">
          <span className="text-foreground">{formatClock(t)}</span> / {formatClock(seconds)}
        </span>
        <button type="button" onClick={() => setMuted((m) => !m)} className={barIcon} title={muted ? "Sound on" : "Sound off"} aria-label={muted ? "Sound on" : "Sound off"}>
          {muted ? <VolumeX className="h-[18px] w-[18px]" /> : <Volume2 className="h-[18px] w-[18px]" />}
        </button>
        {canComment ? (
          <button
            type="button"
            onClick={() => (commentMode ? stopCommenting() : setCommentMode(true))}
            aria-pressed={commentMode}
            className={cn(barButton, "border", commentMode ? cn(COMMENTS_ON, "border-sky-500/60") : "border-transparent")}
          >
            <MessageCircle className="h-4 w-4" />Comment
          </button>
        ) : (
          <button type="button" onClick={onAskToComment} disabled={!!page.asked} title={page.asked ? "The owner has not answered yet" : "Ask the owner to let you comment"} className={barButton}>
            {page.asked ? "Request sent" : "Ask to comment"}
          </button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={barIcon} title="More" aria-label="More video options">
              <MoreHorizontal className="h-[18px] w-[18px]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" sideOffset={6} className={`w-[190px] ${menuCard}`}>
            <div className={menuNote}>Speed</div>
            {SPEEDS.map((s) => (
              <DropdownMenuItem key={s} className={`${menuItem} justify-between`} onClick={() => setSpeed(s)}>
                {s === 1 ? "Normal" : `${s}x`}
                {speed === s && <Check className={menuIcon} strokeWidth={2} />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className={menuSep} />
            <DropdownMenuItem className={menuItem} onClick={toggleFullScreen}>
              <Maximize2 className={menuIcon} strokeWidth={2} /> Full screen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* The scenes: a click on one goes to it; with Comment on, a drag picks a stretch of time */}
      <div
        ref={stripRef}
        onWheel={() => { userScrolled.current = Date.now(); }}
        onTouchStart={() => { userScrolled.current = Date.now(); }}
        className="shrink-0 overflow-x-auto px-3 pb-3 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div
          ref={stripInner}
          onPointerDown={stripDown}
          onPointerMove={stripMove}
          onPointerUp={stripUp}
          onPointerCancel={() => { dragRef.current = null; setPicking(null); }}
          className={cn("relative h-[60px] w-[var(--w)]", commentMode && canComment && "cursor-col-resize touch-none")}
          style={vars({ w: layout.width })}
        >
          {/* A mark at each comment's time (a bar for a stretch) */}
          {timed.map((c) => {
            const left = timeToX(layout, c.time);
            const width = c.timeEnd != null && c.timeEnd > c.time ? Math.max(6, timeToX(layout, c.timeEnd) - left) : 6;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => goTo(c)}
                title={`${c.text} · ${formatSpan(c.time, c.timeEnd)}`}
                aria-label={`Comment at ${formatSpan(c.time, c.timeEnd)}`}
                style={vars({ x: left - (width === 6 ? 3 : 0), w: width })}
                className={cn("absolute top-0 left-[var(--x)] w-[var(--w)] h-1.5 cursor-pointer rounded-full", c.id === activeId ? "bg-sky-500" : "bg-sky-500/60 hover:bg-sky-500", commentMode && "pointer-events-none")}
              />
            );
          })}

          {layout.tiles.map((tile) => {
            const here = current?.index === tile.index;
            const label = tile.title || page.title;
            return (
              <button
                key={tile.index}
                type="button"
                onClick={() => { if (!commentMode) seek(tile.start); }}
                title={`${label} · ${formatLength(tile.end - tile.start)}`}
                aria-label={`${label}, ${formatLength(tile.end - tile.start)}`}
                style={vars({ x: tile.left, w: tile.width })}
                className={cn(
                  "absolute bottom-0 top-2.5 left-[var(--x)] w-[var(--w)] overflow-hidden rounded-lg bg-slate-200 text-left dark:bg-white/[0.06]",
                  commentMode ? "pointer-events-none" : "cursor-pointer",
                  here ? "ring-2 ring-inset ring-foreground/70" : "ring-1 ring-inset ring-black/5 dark:ring-white/10",
                )}
              >
                {tile.thumb && <img src={tile.thumb} alt="" loading="lazy" draggable={false} className="absolute inset-0 h-full w-full object-cover opacity-30 dark:opacity-35" />}
                <span className="relative flex h-full min-w-0 flex-col justify-center px-2 text-[12px] leading-[15px]">
                  <span className="truncate font-medium text-foreground">{label}</span>
                  <span className="truncate text-muted-foreground">{formatLength(tile.end - tile.start)}</span>
                </span>
              </button>
            );
          })}

          {/* The stretch being picked, or of the comment being written */}
          {pickBand && <div className="pointer-events-none absolute bottom-0 top-2.5 left-[var(--x)] w-[var(--w)] z-10 rounded-md border-2 border-sky-400 bg-sky-400/20" style={vars({ x: pickBand.left, w: pickBand.width })} />}
          {pendingStart !== null && <div className="pointer-events-none absolute bottom-0 top-1 left-[var(--x)] z-10 w-0.5 rounded-full bg-sky-400" style={vars({ x: timeToX(layout, pendingStart) - 1 })} />}

          {/* The playhead */}
          <div className="pointer-events-none absolute bottom-0 top-1 left-[var(--x)] z-20 w-0.5 rounded-full bg-sky-500 ring-1 ring-black/15" style={vars({ x: playheadX - 1 })} />
        </div>
      </div>

      {composer && (
        <CommentBox key={`${composer.top}:${composer.left}`} boxRef={composerRef} composer={composer} onChange={(next) => setComposer((now) => (now ? { ...now, ...next } : now))} onSend={sendComment} onClose={() => setComposer(null)} />
      )}

      {children}
    </div>
  );
}

export default VideoArtifactView;
