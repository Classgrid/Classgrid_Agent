// A live doc's small boxes: "Delete this doc?", "Report this doc", and the screen for a doc this person can't open
// ("This doc is private", with Request access).
import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/marketing_ui/dialog";
import { Button } from "@/components/marketing_ui/button";
import { Spinner } from "@/components/marketing_ui/spinner";
import { cn } from "@/lib/utils";
import * as api from "./liveDocsApi";

export function DeleteDocDialog({ title, open, onClose, onDelete }: { title: string; open: boolean; onClose: () => void; onDelete: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !busy) onClose(); }}>
      <DialogContent showCloseButton={false} className="gap-0 p-5 sm:max-w-[420px]">
        <DialogTitle className="text-[16px] font-semibold leading-6">Delete this doc?</DialogTitle>
        <DialogDescription className="mt-2 text-[13.5px] leading-5 text-muted-foreground">
          <span className="font-medium text-foreground">{title}</span> will be deleted with its comments and its older versions. Everyone it is shared with loses it too. This cannot be undone.
        </DialogDescription>
        <div className="mt-5 flex justify-end gap-2">
          <Button size="sm" variant="outline" className="h-9 px-4" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button
            size="sm"
            variant="destructive"
            className="h-9 px-4"
            disabled={busy}
            onClick={async () => { setBusy(true); try { await onDelete(); } finally { setBusy(false); } }}
          >
            {busy ? <Spinner className="size-4" /> : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const REASONS: { value: string; name: string }[] = [
  { value: "spam", name: "Spam or a scam" },
  { value: "harassment", name: "Harassment or bullying" },
  { value: "hate_speech", name: "Hate speech" },
  { value: "inappropriate", name: "Sexual or violent content" },
  { value: "misinformation", name: "False or harmful information" },
  { value: "copyright", name: "It copies someone's work" },
  { value: "other", name: "Something else" },
];

/** Reports the doc, or (with `comment`) one comment on it, to the Classgrid team. */
export function ReportDocDialog({ docId, comment, open, onClose, say }: {
  docId: string;
  comment?: { id: string; name: string; text: string } | null;
  open: boolean;
  onClose: () => void;
  say: (text: string, bad?: boolean) => void;
}) {
  const [reason, setReason] = useState("");
  const [more, setMore] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try {
      if (comment) await api.reportComment(docId, comment.id, reason, more.trim());
      else await api.reportDoc(docId, reason, more.trim());
      say("Reported. The Classgrid team will look at it.");
      setReason("");
      setMore("");
      onClose();
    } catch (e) {
      say(api.errorText(e, "The report could not be sent. Please try again."), true);
    } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !busy) onClose(); }}>
      <DialogContent showCloseButton={false} className="gap-0 p-5 sm:max-w-[440px]">
        <DialogTitle className="text-[16px] font-semibold leading-6">{comment ? "Report comment" : "Report this doc"}</DialogTitle>
        <DialogDescription className="mt-1 text-[13.5px] leading-5 text-muted-foreground">
          {comment ? `You are reporting a comment by ${comment.name || "someone"}. The Classgrid team is told; they are not told who reported it.` : "What is wrong with it? The Classgrid team is told. The doc's owner is not told who reported it."}
        </DialogDescription>
        {comment && <div className="mt-3 rounded-lg bg-muted px-3 py-2 text-[13.5px] leading-5">{comment.text}</div>}
        <div role="radiogroup" aria-label="What is wrong" className="mt-3 space-y-0.5">
          {REASONS.map((r) => (
            <button
              key={r.value}
              type="button"
              role="radio"
              aria-checked={reason === r.value}
              onClick={() => setReason(r.value)}
              className={cn("flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-[13.5px] hover:bg-accent", reason === r.value && "bg-accent")}
            >
              <span className={cn("inline-flex size-4 shrink-0 items-center justify-center rounded-full border", reason === r.value ? "border-foreground bg-foreground text-background" : "border-muted-foreground/50")}>
                {reason === r.value && <Check className="size-3" strokeWidth={3} />}
              </span>
              {r.name}
            </button>
          ))}
        </div>
        <textarea
          value={more}
          onChange={(e) => setMore(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Anything to add (optional)"
          aria-label="Anything to add"
          className="mt-3 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-[13.5px] outline-none placeholder:text-muted-foreground focus:border-foreground/40"
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button size="sm" variant="outline" className="h-9 px-4" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button size="sm" className="h-9 px-4" onClick={send} disabled={busy || !reason}>{busy ? <Spinner className="size-4" /> : "Send report"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * A doc this person can't open: they can ask its owner for access. Nothing about the doc is shown (not its title,
 * not its owner). `asked`: they already asked, and the owner has not answered yet.
 */
export function PrivateDoc({ docId, asked, email, compact }: { docId: string; asked: boolean; email?: string; compact?: boolean }) {
  const [sent, setSent] = useState(asked);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const ask = async () => {
    setBusy(true);
    setProblem("");
    try { await api.requestAccess(docId); setSent(true); }
    catch (e) { setProblem(api.errorText(e, "The request could not be sent. Please try again.")); }
    finally { setBusy(false); }
  };
  return (
    <div className={cn("flex flex-col items-center justify-center gap-0 bg-background px-6 text-center text-foreground", compact ? "h-full" : "min-h-dvh")}>
      <span className="inline-flex size-16 items-center justify-center rounded-2xl border border-border bg-muted/60">
        <Lock className="size-7" strokeWidth={1.6} />
      </span>
      <h1 className="mt-6 text-[22px] font-semibold leading-7">{sent ? "Request sent" : "This doc is private"}</h1>
      <p className="mt-2 max-w-sm text-[14.5px] leading-6 text-muted-foreground">
        {sent ? "The owner was sent an email. You will get an email when they let you in." : "You can ask its owner for access."}
      </p>
      {problem && <p className="mt-3 max-w-sm text-[13.5px] text-red-600 dark:text-red-400">{problem}</p>}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Button size="sm" variant="outline" className="h-10 px-4" asChild><Link to="/agent">Back to chat</Link></Button>
        {!sent && <Button size="sm" className="h-10 px-4" onClick={ask} disabled={busy}>{busy ? <Spinner className="size-4" /> : "Request access"}</Button>}
      </div>
      {email && <p className="mt-6 text-[13px] text-muted-foreground">Signed in as <span className="font-medium text-foreground">{email}</span></p>}
    </div>
  );
}
