// Right-side comments panel of a share page: read, add, reply to and resolve comments.
import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, CornerDownRight, MessageSquare, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/marketing_ui/button";
import { Textarea } from "@/components/marketing_ui/textarea";
import { Spinner } from "@/components/marketing_ui/spinner";
import { apiClient } from "@/lib/apiClient";
import { cn } from "@/lib/utils";

export type PageComment = { id: string; userId: string | null; name: string; email: string; text: string; at: string; resolved: boolean; replyTo: string | null; byAi: boolean };

function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function Initial({ name }: { name: string }) {
  return (
    <div className="h-7 w-7 rounded-full shrink-0 flex items-center justify-center bg-muted text-muted-foreground text-[12px] font-medium">
      {(name || "?").trim().charAt(0).toUpperCase()}
    </div>
  );
}

function CommentItem({ c, canResolve, busy, onResolve, onReply, reply }: {
  c: PageComment; canResolve: boolean; busy: boolean; onResolve?: () => void; onReply?: () => void; reply?: boolean;
}) {
  const name = c.byAi ? "Classgrid AI" : c.name || c.email || "Someone";
  return (
    <div className={cn("flex items-start gap-2.5", reply && "pl-6")}>
      {reply ? <CornerDownRight className="h-3.5 w-3.5 mt-1.5 shrink-0 text-muted-foreground" /> : <Initial name={name} />}
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-foreground truncate">{name}</div>
        {!c.byAi && c.email && <div className="text-[11px] text-muted-foreground truncate">{c.email}</div>}
        <div className="text-[13px] text-foreground/90 whitespace-pre-wrap break-words mt-1">{c.text}</div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
          <span>{timeAgo(c.at)}</span>
          {onReply && <button type="button" onClick={onReply} className="hover:text-foreground cursor-pointer">Reply</button>}
          {canResolve && onResolve && (
            <button type="button" onClick={onResolve} disabled={busy} className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer disabled:opacity-50">
              {busy ? <Spinner className="size-3" /> : c.resolved ? <RotateCcw className="h-3 w-3" /> : <Check className="h-3 w-3" />}
              {c.resolved ? "Reopen" : "Resolve"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function PageCommentsPanel({ pageId, comments, isOwner, myId, onChanged, onClose }: {
  pageId: string; comments: PageComment[]; isOwner: boolean; myId: string; onChanged: () => void; onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<PageComment | null>(null);
  const [sending, setSending] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);

  const { threads, resolvedCount } = useMemo(() => {
    const ids = new Set(comments.map((c) => c.id));
    const top = comments.filter((c) => !c.replyTo || !ids.has(c.replyTo));
    const replies = new Map<string, PageComment[]>();
    for (const c of comments) if (c.replyTo && ids.has(c.replyTo)) replies.set(c.replyTo, [...(replies.get(c.replyTo) || []), c]);
    return {
      threads: top.filter((c) => showResolved || !c.resolved).map((c) => ({ c, replies: replies.get(c.id) || [] })),
      resolvedCount: top.filter((c) => c.resolved).length,
    };
  }, [comments, showResolved]);

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setSending(true);
    try {
      await apiClient.post(`/api/pages/${pageId}/comments`, { text: t, replyTo: replyTo?.id || null });
      setText("");
      setReplyTo(null);
      onChanged();
    } catch (err: any) {
      toast.error(err?.message || "Could not add the comment.");
    } finally {
      setSending(false);
    }
  };

  const toggleResolved = async (c: PageComment) => {
    setBusyId(c.id);
    try {
      await apiClient.patch(`/api/pages/${pageId}/comments/${c.id}`, { resolved: !c.resolved });
      onChanged();
    } catch (err: any) {
      toast.error(err?.message || "Could not change the comment.");
    } finally {
      setBusyId(null);
    }
  };

  const canResolve = (c: PageComment) => isOwner || (!!c.userId && c.userId === myId);

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 380, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: "spring", bounce: 0, duration: 0.3 }}
      className="shrink-0 h-full bg-background border-l border-border/50 flex flex-col overflow-hidden shadow-xl z-50 max-sm:fixed max-sm:inset-0 max-sm:!w-full max-sm:z-[130] max-sm:border-l-0"
    >
      <div className="shrink-0 flex items-center justify-between px-4 h-14 border-b border-border/50">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <MessageSquare className="h-4 w-4" />
          Comments
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 shrink-0 ml-2 text-muted-foreground hover:text-foreground" aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto w-full sm:w-[380px] p-4 flex flex-col gap-4">
        {threads.length === 0 ? (
          <div className="text-xs text-muted-foreground">{resolvedCount ? "No open comments." : "No comments yet. Be the first to add one."}</div>
        ) : (
          threads.map(({ c, replies }) => (
            <div key={c.id} className={cn("flex flex-col gap-2.5 p-3 rounded-lg border border-border/50", c.resolved && "opacity-60")}>
              <CommentItem c={c} canResolve={canResolve(c)} busy={busyId === c.id} onResolve={() => toggleResolved(c)} onReply={() => setReplyTo(c)} />
              {replies.map((r) => <CommentItem key={r.id} c={r} canResolve={false} busy={false} reply />)}
            </div>
          ))
        )}
        {resolvedCount > 0 && (
          <button type="button" onClick={() => setShowResolved((s) => !s)} className="self-start text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 cursor-pointer">
            {showResolved ? "Hide resolved" : `Show resolved (${resolvedCount})`}
          </button>
        )}
      </div>

      <form
        className="shrink-0 border-t border-border/50 p-3 flex flex-col gap-2"
        onSubmit={(e) => { e.preventDefault(); send(); }}
      >
        {replyTo && (
          <div className="flex items-center justify-between gap-2 text-[12px] text-muted-foreground">
            <span className="truncate">Replying to {replyTo.byAi ? "Classgrid AI" : replyTo.name || replyTo.email}</span>
            <button type="button" onClick={() => setReplyTo(null)} className="hover:text-foreground cursor-pointer" aria-label="Cancel reply"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } }}
          placeholder="Add a comment"
          maxLength={5000}
          rows={3}
          className="min-h-[80px] text-sm resize-none focus-visible:ring-foreground/20"
          aria-label="Add a comment"
        />
        <Button type="submit" size="sm" className="self-end" disabled={!text.trim() || sending}>
          {sending && <Spinner className="size-4 mr-2" />}
          {replyTo ? "Reply" : "Comment"}
        </Button>
      </form>
    </motion.div>
  );
}
