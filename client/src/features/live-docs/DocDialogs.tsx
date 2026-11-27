// The small boxes of a live doc and of a published page: Delete, Rename, Report, and the screen for one this person
// can't open ("This doc is private", with Request access). They have the look of the chat's own boxes (docLook.ts);
// Delete is the website's own delete box (DangerConfirmDialog), the same one that deletes a chat.
import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/marketing_ui/dialog";
import { DangerConfirmDialog } from "@/components/marketing_ui/danger-confirm-dialog";
import { cn } from "@/lib/utils";
import { errorText } from "./liveDocsApi";
import type { ItemNoun, SharedKind } from "./shareApi";
import { boxAbout, boxBtnMain, boxBtnPlain, boxCls, boxFoot, boxHead, boxInput, boxOverlay, boxTitle } from "./docLook";

export function DeleteDocDialog({ kind = "doc", title, open, onClose, onDelete }: { kind?: ItemNoun; title: string; open: boolean; onClose: () => void; onDelete: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <DangerConfirmDialog
      open={open}
      onOpenChange={(next) => { if (!next && !busy) onClose(); }}
      title={`Delete ${kind}`}
      description={<><span className="font-medium text-foreground [overflow-wrap:anywhere]">{title}</span> will be deleted with its comments{kind === "doc" ? " and its older versions" : kind === "page" ? " and its saved data" : ""}. Everyone it is shared with loses it too. This cannot be undone.</>}
      warningMessage={`This ${kind} will be permanently deleted.`}
      actionLabel={`Delete ${kind}`}
      isLoading={busy}
      onConfirm={async () => { setBusy(true); try { await onDelete(); } finally { setBusy(false); } }}
    />
  );
}

/** A new name for the doc or page (the chat's own Rename box). The name shows at once; `onSave` saves it behind. */
export function RenameDocDialog(props: { kind?: ItemNoun; title: string; open: boolean; onClose: () => void; onSave: (title: string) => void }) {
  return (
    <Dialog open={props.open} onOpenChange={(next) => { if (!next) props.onClose(); }}>
      <DialogContent showCloseButton={false} overlayClassName={boxOverlay} className={cn("sm:max-w-[22rem]", boxCls)}>
        <RenameBox {...props} />
      </DialogContent>
    </Dialog>
  );
}
// (inside the box, so each time it opens it starts from the name as it is now)
function RenameBox({ kind = "doc", title, onClose, onSave }: { kind?: ItemNoun; title: string; onClose: () => void; onSave: (title: string) => void }) {
  const [text, setText] = useState(title);
  const save = () => {
    const t = text.trim();
    if (!t) return;
    onClose();
    if (t !== title) onSave(t);
  };
  return (
    <>
        <div className={boxHead}>
          <DialogTitle className={boxTitle}>Rename {kind}</DialogTitle>
          <DialogDescription className={boxAbout}>The new name shows for everyone who has this {kind}.</DialogDescription>
        </div>
        <div className="px-5 pb-5">
          <input
            autoFocus
            data-no-ring
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") save(); }}
            maxLength={200}
            aria-label={`Name of the ${kind}`}
            className={boxInput}
          />
        </div>
        <div className={boxFoot}>
          <button type="button" onClick={onClose} className={boxBtnPlain}>Cancel</button>
          <button type="button" onClick={save} disabled={!text.trim()} className={boxBtnMain}>Save</button>
        </div>
    </>
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

/** Reports the doc or page, or (with `comment`) one comment on it, to the Classgrid team. `send` makes the report. */
export function ReportDocDialog({ kind = "doc", comment, open, onClose, send, say }: {
  kind?: ItemNoun;
  comment?: { id: string; name: string; text: string } | null;
  open: boolean;
  onClose: () => void;
  send: (reason: string, more: string) => Promise<void>;
  say: (text: string, bad?: boolean) => void;
}) {
  const [reason, setReason] = useState("");
  const [more, setMore] = useState("");
  // The box closes at once and the report is sent behind it; if sending fails the person is told
  const report = () => {
    const picked = reason;
    const added = more.trim();
    setReason("");
    setMore("");
    onClose();
    send(picked, added)
      .then(() => say("Reported. The Classgrid team will look at it."))
      .catch((e) => say(errorText(e, "The report could not be sent. Please try again."), true));
  };
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent showCloseButton={false} overlayClassName={boxOverlay} className={cn("flex max-h-[min(90vh,680px)] flex-col sm:max-w-[26rem]", boxCls)}>
        <div className={boxHead}>
          <DialogTitle className={boxTitle}>{comment ? "Report comment" : `Report ${kind}`}</DialogTitle>
          <DialogDescription className={boxAbout}>
            {comment ? `You are reporting a comment by ${comment.name || "someone"}. The Classgrid team is told; they are not told who reported it.` : `What is wrong with it? The Classgrid team is told. The owner is not told who reported it.`}
          </DialogDescription>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
          {comment && <div className="mb-3 rounded-md bg-black/[0.04] px-3 py-2 text-[13px] leading-5 [overflow-wrap:anywhere] dark:bg-white/[0.06]">{comment.text}</div>}
          <div role="radiogroup" aria-label="What is wrong" className="-mx-2">
            {REASONS.map((r) => (
              <button
                key={r.value}
                type="button"
                role="radio"
                aria-checked={reason === r.value}
                onClick={() => setReason(r.value)}
                className={cn("flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.05]", reason === r.value && "bg-black/[0.04] dark:bg-white/[0.05]")}
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
            data-no-ring
            className={cn(boxInput, "mt-3 h-auto resize-none py-2 leading-5")}
          />
        </div>
        <div className={cn(boxFoot, "shrink-0")}>
          <button type="button" onClick={onClose} className={boxBtnPlain}>Cancel</button>
          <button type="button" onClick={report} disabled={!reason} className={boxBtnMain}>Send report</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * A doc or page this person can't open: they can ask its owner for access. Nothing about it is shown (not its
 * title, not its owner). `asked`: they already asked, and the owner has not answered yet. The request shows as sent
 * at once and is sent behind it.
 */
export function PrivateDoc({ kind = "doc", asked, email, compact, ask }: { kind?: SharedKind; asked: boolean; email?: string; compact?: boolean; ask: () => Promise<unknown> }) {
  const [sent, setSent] = useState(asked);
  const [problem, setProblem] = useState("");
  const request = () => {
    setSent(true);
    setProblem("");
    ask().catch((e) => { setSent(false); setProblem(errorText(e, "The request could not be sent. Please try again.")); });
  };
  return (
    <div className={cn("flex flex-col items-center justify-center gap-0 bg-background px-6 text-center text-foreground", compact ? "h-full" : "min-h-dvh")}>
      <span className="inline-flex size-14 items-center justify-center rounded-xl border border-black/10 bg-black/[0.02] dark:border-white/[0.08] dark:bg-[#1a1a1a]">
        <Lock className="size-6" strokeWidth={1.6} />
      </span>
      <h1 className="mt-5 text-[20px] font-medium leading-7">{sent ? "Request sent" : `This ${kind} is private`}</h1>
      <p className="mt-1.5 max-w-sm text-[14px] leading-6 text-muted-foreground">
        {sent ? "The owner was sent an email. You will get an email when they let you in." : "You can ask its owner for access."}
      </p>
      {problem && <p className="mt-3 max-w-sm text-[13px] text-red-600 dark:text-red-400">{problem}</p>}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Link to="/agent" className={boxBtnPlain}>Back to chat</Link>
        {!sent && <button type="button" className={boxBtnMain} onClick={request}>Request access</button>}
      </div>
      {email && <p className="mt-6 text-[13px] text-muted-foreground">Signed in as <span className="font-medium text-foreground [overflow-wrap:anywhere]">{email}</span></p>}
    </div>
  );
}
