// The comments of a live doc and of a published page: the panel at the side (which comments show, and each one
// with its replies), the comment box that opens where the person clicked, and the small bar messages show in.
// A comment, a reply and a resolve show at once and are saved behind (no spinner; owner: "like Grids"); if saving
// fails they are taken back and the person is told. Menus and buttons are the chat's own (docLook.ts).
import { useRef, useState, type Ref } from "react";
import { ArrowUp, Check, Flag, ListFilter, MoreHorizontal, RotateCcw, Trash2, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/marketing_ui/dropdown-menu";
import RichChatInput from "@/components/ai/components/RichChatInput";
import { ClassgridLogoIcon } from "@/components/layout/ClassgridLogoIcon";
import { cn } from "@/lib/utils";
import { formatSpan } from "@/features/share-pages/videoMath";
import { errorText } from "./liveDocsApi";
import type { LiveDocComment } from "./liveDocsApi";
import { PersonPhoto } from "./DocPeople";
import { NoteText } from "./DocText";
import { barIcon, menuCard, menuDanger, menuIcon, menuItem } from "./docLook";

/**
 * A comment with its replies (`byAI`: Classgrid AI wrote it). A comment on a video also has the time it is on
 * (`time`, and `timeEnd` for a stretch of time), in seconds.
 */
export type Thread = LiveDocComment & { byAI?: boolean; time?: number | null; timeEnd?: number | null };
export type CommentFilter = "open" | "resolved" | "all";
export type Me = { id: string; name: string; photo: string } | null;
type Say = (text: string, bad?: boolean) => void;
/** Saving, behind what is already shown. Each answers when the server has it (the screen then has the saved comments). */
export type CommentCalls = {
  reply: (commentId: string, text: string) => Promise<unknown>;
  resolve: (commentId: string, resolved: boolean) => Promise<unknown>;
  remove: (commentId: string) => Promise<unknown>;
};

export const shortAgo = (d: string) => {
  const s = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 1000));
  if (!Number.isFinite(s) || s < 45) return "now";
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  return `${Math.round(s / 86400)}d`;
};
/** The words a comment is on, for a small line: all of them when short, else up to a whole word (never dots). */
export const shortQuote = (quote: string) => {
  const text = quote.replace(/\s+/g, " ").trim();
  if (text.length <= 160) return text;
  const head = text.slice(0, 160);
  return head.slice(0, Math.max(head.lastIndexOf(" "), 80));
};
// (a comment shown before the server has saved it)
export const isNew = (id: string) => id.startsWith("new-");
const AiMark = ({ small }: { small?: boolean }) => (
  <span className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-foreground text-background", small ? "size-5" : "size-6")}><ClassgridLogoIcon size={small ? 16 : 18} /></span>
);

/** The comments at the side. `floating`: always a card over the page (Studio, a published page); else a column on a wide screen. */
export function CommentsPanel({ comments, filter, onFilter, canComment, canEdit, me, active, onActive, floating, onClose, calls, change, onReport, say, hint, onPick }: {
  comments: Thread[];
  filter: CommentFilter;
  onFilter: (filter: CommentFilter) => void;
  canComment: boolean;
  canEdit: boolean;
  me: Me;
  active: string | null;
  onActive: (id: string | null) => void;
  floating?: boolean;
  onClose: () => void;
  calls: CommentCalls;
  /** Changes the comments on the screen at once (before, or without, the server). */
  change: (next: (comments: Thread[]) => Thread[]) => void;
  onReport: (comment: Thread) => void;
  say: Say;
  /** How a comment is added, for the empty panel. */
  hint: string;
  /** A video: a click on a comment (or on its time) goes to the time it is on. */
  onPick?: (comment: Thread) => void;
}) {
  const open = comments.filter((c) => !c.resolved);
  const resolved = comments.filter((c) => c.resolved);
  const shown = filter === "all" ? comments : filter === "resolved" ? resolved : open;
  return (
    <aside
      aria-label="Comments"
      className={cn(
        "absolute right-3 top-3 z-20 flex max-h-[calc(100%-1.5rem)] w-80 max-w-[calc(100%-1.5rem)] flex-col rounded-2xl border border-slate-200 bg-background shadow-2xl dark:border-white/10",
        !floating && "xl:static xl:max-h-none xl:max-w-none xl:shrink-0 xl:rounded-none xl:border-0 xl:border-l xl:border-border/50 xl:shadow-none",
      )}
    >
      <div className="flex h-12 shrink-0 items-center gap-1 pl-4 pr-2">
        <span className="flex-1 text-[14px] font-medium">{filter === "resolved" ? "Resolved comments" : filter === "all" ? "All comments" : "Comments"}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={barIcon} title="Which comments to show" aria-label="Which comments to show in the list"><ListFilter className="h-4 w-4" /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={6} className={`w-[180px] ${menuCard}`}>
            {(["open", "resolved", "all"] as CommentFilter[]).map((f) => (
              <DropdownMenuItem key={f} onClick={() => onFilter(f)} className={`${menuItem} justify-between`}>
                {f === "open" ? "Open" : f === "resolved" ? "Resolved" : "All"}
                {filter === f && <Check className={menuIcon} strokeWidth={2} />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <button type="button" className={barIcon} onClick={onClose} title="Hide comments" aria-label="Close comments"><X className="h-4 w-4" /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {shown.length === 0 && (
          <div className="px-3 pb-6 pt-4 text-center">
            {filter === "open" && resolved.length > 0 ? (
              <p className="text-[13.5px] text-muted-foreground">
                No open comments. <button type="button" onClick={() => onFilter("resolved")} className="cursor-pointer underline underline-offset-2 hover:text-foreground">Show {resolved.length} resolved</button>
              </p>
            ) : (
              <>
                <p className="text-[14px] font-medium text-muted-foreground">{filter === "resolved" ? "No resolved comments" : "No comments yet"}</p>
                {filter !== "resolved" && <p className="mt-1 text-[12.5px] leading-5 text-muted-foreground">{canComment ? hint : "Your role lets you read the comments, not add one."}</p>}
              </>
            )}
          </div>
        )}
        {shown.map((c) => (
          <CommentCard
            key={c.id}
            c={c}
            canComment={canComment}
            canEdit={canEdit}
            me={me}
            active={active === c.id}
            onActive={(on) => onActive(on ? c.id : active === c.id ? null : active)}
            calls={calls}
            change={change}
            onReport={() => onReport(c)}
            say={say}
            onPick={onPick ? () => onPick(c) : undefined}
          />
        ))}
      </div>
    </aside>
  );
}

function CommentCard({ c, canComment, canEdit, me, active, onActive, calls, change, onReport, say, onPick }: {
  c: Thread;
  canComment: boolean;
  canEdit: boolean;
  me: Me;
  active: boolean;
  onActive: (on: boolean) => void;
  calls: CommentCalls;
  change: (next: (comments: Thread[]) => Thread[]) => void;
  onReport: () => void;
  say: Say;
  onPick?: () => void;
}) {
  const [reply, setReply] = useState("");
  const saved = !isNew(c.id);
  const mine = !!me && me.id === c.userId && !c.byAI;
  const canResolve = saved && (canEdit || (canComment && mine));
  const canDelete = saved && (canEdit || mine);
  const mend = (next: (comment: Thread) => Thread) => change((all) => all.map((x) => (x.id === c.id ? next(x) : x)));

  // Shown at once, saved behind; taken back if saving fails
  const send = () => {
    const text = reply.trim();
    if (!text || !saved) return;
    const before = c.replies;
    mend((x) => ({ ...x, replies: [...x.replies, { name: me?.name || "You", photo: me?.photo || "", text, at: new Date().toISOString(), byAI: false }] }));
    setReply("");
    calls.reply(c.id, text).catch((e) => { mend((x) => ({ ...x, replies: before })); setReply(text); say(errorText(e, "The reply could not be sent."), true); });
  };
  const toggle = () => {
    const resolved = !c.resolved;
    mend((x) => ({ ...x, resolved }));
    calls.resolve(c.id, resolved).catch((e) => { mend((x) => ({ ...x, resolved: !resolved })); say(errorText(e), true); });
  };
  const remove = () => {
    let taken: Thread[] = [];
    change((all) => { taken = all; return all.filter((x) => x.id !== c.id); });
    calls.remove(c.id).catch((e) => { change(() => taken); say(errorText(e, "The comment could not be deleted."), true); });
  };
  // (a comment on a video: the time it is on, "0:21" or "0:12 to 0:20")
  const at = typeof c.time === "number" && Number.isFinite(c.time) ? formatSpan(c.time, c.timeEnd) : "";
  // (a click on the comment itself, not on one of its buttons, menus or the reply box)
  const pick = (e: { target: EventTarget }) => {
    const el = e.target as HTMLElement;
    if (!onPick || el.closest("button, a, input, textarea, [contenteditable=true], [role=menu], [role=menuitem]")) return;
    onPick();
  };
  const small = "inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground opacity-0 transition-colors hover:bg-black/5 hover:text-foreground focus-visible:opacity-100 group-hover/comment:opacity-100 dark:hover:bg-white/10";

  return (
    <div
      id={`doc-comment-${c.id}`}
      onMouseEnter={() => onActive(true)}
      onMouseLeave={() => onActive(false)}
      onClick={onPick ? pick : undefined}
      className={cn("group/comment space-y-1.5 rounded-xl px-2.5 py-2.5 transition-colors", active ? "bg-slate-100 dark:bg-white/[0.07]" : "hover:bg-slate-100/70 dark:hover:bg-white/[0.04]", c.resolved && "opacity-70", onPick && "cursor-pointer")}
    >
      <div className="flex items-center gap-2">
        {c.byAI ? <AiMark /> : <PersonPhoto name={c.name || "Someone"} photo={c.photo} size="sm" />}
        <span className="min-w-0 break-words text-[13.5px] font-semibold leading-4">{c.name || "Someone"}</span>
        <span className="shrink-0 text-[12px] text-muted-foreground">{shortAgo(c.at)}</span>
        {at && (onPick
          ? <button type="button" onClick={onPick} title={`Go to ${at}`} aria-label={`Go to ${at}`} className="shrink-0 cursor-pointer whitespace-pre text-[12px] text-muted-foreground hover:text-foreground">· {at}</button>
          : <span className="shrink-0 whitespace-pre text-[12px] text-muted-foreground">· {at}</span>)}
        <span className="flex-1" />
        {c.resolved && <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white" title="Resolved"><Check className="size-3" strokeWidth={3} /></span>}
        {canResolve && !c.resolved && (
          <button type="button" onClick={toggle} title="Resolve" aria-label="Resolve" className={small}>
            <Check className="size-4" />
          </button>
        )}
        {saved && (canResolve || canDelete || !mine) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" title="More" aria-label="More" className={cn(small, "data-[popup-open]:opacity-100")}>
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={6} className={`w-[200px] ${menuCard}`}>
              {canResolve && (
                <DropdownMenuItem className={menuItem} onClick={toggle}>
                  {c.resolved ? <RotateCcw className={menuIcon} strokeWidth={2} /> : <Check className={menuIcon} strokeWidth={2} />} {c.resolved ? "Reopen" : "Resolve"}
                </DropdownMenuItem>
              )}
              {!mine && (
                <DropdownMenuItem className={menuItem} onClick={onReport}>
                  <Flag className={menuIcon} strokeWidth={2} /> Report comment
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem className={menuDanger} onClick={remove}>
                  <Trash2 className="w-4 h-4" strokeWidth={2} /> Delete thread
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {c.quote && <div className="border-l-2 border-sky-500/60 pl-2 text-[12.5px] leading-[18px] text-muted-foreground">{shortQuote(c.quote)}</div>}
      <NoteText text={c.text} />
      {c.replies.map((r, i) => (
        <div key={i} className="pt-1">
          <div className="flex items-center gap-1.5">
            {r.byAI ? <AiMark small /> : <PersonPhoto name={r.name || "Someone"} photo={r.photo} size="xs" />}
            <span className="min-w-0 break-words text-[13px] font-semibold leading-4">{r.name || "Someone"}</span>
            <span className="shrink-0 text-[12px] text-muted-foreground">{shortAgo(r.at)}</span>
          </div>
          <div className="mt-0.5 pl-[26px]"><NoteText text={r.text} /></div>
        </div>
      ))}
      {!c.resolved && canComment && saved && (
        <div className="flex items-end gap-2 pt-1">
          <RichChatInput
            value={reply}
            onChange={(e) => setReply(String(e.target.value || "").slice(0, 5000))}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Reply"
            className="max-h-32 !min-h-[34px] min-w-0 flex-1 overflow-y-auto rounded-md border border-black/10 bg-white px-2.5 py-1.5 text-[13.5px] leading-5 text-foreground outline-none focus:border-black/30 dark:border-white/[0.08] dark:bg-[#161616] dark:focus:border-white/25"
          />
          {reply.trim() && (
            <button type="button" onClick={send} title="Send the reply" aria-label="Send the reply" className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-foreground text-background">
              <ArrowUp className="size-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export type Composer = { quote: string; text: string; top: number; left: number; toAI: boolean };

/** The comment box, where the click or the picked words are. */
export function CommentBox({ composer, onChange, onSend, onClose, boxRef }: {
  composer: Composer;
  onChange: (next: Composer) => void;
  onSend: () => void;
  onClose: () => void;
  boxRef?: Ref<HTMLDivElement>;
}) {
  // (the cursor goes into the box once, when it opens: give the box a new key to open it somewhere else)
  const focused = useRef(false);
  return (
    <div
      ref={boxRef}
      role="dialog"
      aria-label="Add a comment"
      style={{ top: composer.top, left: composer.left }}
      className="fixed z-40 w-[min(340px,calc(100vw-24px))] rounded-2xl border border-sky-500/50 bg-white p-3.5 text-slate-700 shadow-2xl ring-4 ring-sky-500/10 dark:bg-[#202123] dark:text-[#ececf1]"
    >
      {composer.quote && <div className="border-l-2 border-sky-500/60 pl-2 text-[12.5px] leading-[18px] text-muted-foreground">{shortQuote(composer.quote)}</div>}
      {composer.toAI && <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-sky-500/15 px-1.5 py-0.5 text-[12.5px] font-medium text-sky-600 dark:text-sky-400"><ClassgridLogoIcon size={14} />Classgrid AI</span>}
      <RichChatInput
        ref={(el: { focus?: () => void } | null) => { if (el && !focused.current) { focused.current = true; setTimeout(() => el.focus?.(), 0); } }}
        value={composer.text}
        onChange={(e) => onChange({ ...composer, text: String(e.target.value || "").slice(0, 5000) })}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }
          if (e.key === "Escape") onClose();
        }}
        placeholder="Add a comment"
        className="mt-2 max-h-40 min-h-[44px] w-full overflow-y-auto bg-transparent text-[14.5px] leading-[21px] text-foreground outline-none"
      />
      <div className="mt-1.5 flex items-center gap-2">
        <button
          type="button"
          role="checkbox"
          aria-checked={composer.toAI}
          onClick={() => onChange({ ...composer, toAI: !composer.toAI })}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left text-[13.5px]"
        >
          <span className={cn("inline-flex size-[18px] shrink-0 items-center justify-center rounded-[6px] border", composer.toAI ? "border-sky-500 bg-sky-500 text-white" : "border-muted-foreground/60")}>
            {composer.toAI && <Check className="size-3" strokeWidth={3} />}
          </span>
          <span>Send to Classgrid AI</span>
        </button>
        <button
          type="button"
          onClick={onSend}
          disabled={!composer.text.trim()}
          title="Add the comment"
          aria-label="Add the comment"
          className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-foreground text-background transition-opacity disabled:cursor-default disabled:opacity-30"
        >
          <ArrowUp className="size-4" />
        </button>
      </div>
    </div>
  );
}

/** A message at the bottom of the doc or page (the desktop app has no toasts). */
export function NoticeBar({ notice }: { notice: { text: string; bad: boolean } | null }) {
  if (!notice) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-5 z-50 flex justify-center px-4">
      <div role="status" className={cn("pointer-events-auto max-w-md rounded-xl border px-4 py-2.5 text-[13.5px] leading-5 shadow-lg", notice.bad ? "border-red-500/40 bg-background text-red-600 dark:text-red-400" : "border-transparent bg-foreground text-background")}>
        {notice.text}
      </div>
    </div>
  );
}
