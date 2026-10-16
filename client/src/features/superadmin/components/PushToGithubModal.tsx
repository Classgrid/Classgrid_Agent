import React, { useState, useEffect, useRef } from "react";
import { GitBranch } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/marketing_ui/dialog";
import { Spinner } from "@/components/marketing_ui/spinner";
import { cn } from "@/lib/utils";

interface PushToGithubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPush: (message: string) => Promise<void>;
  projectName: string;
  repoName?: string | null;
  isPushing?: boolean;
}

const COMMIT_SUGGESTIONS = [
  "Update project code",
  "Fix bug and optimize performance",
  "Refactor components and clean up",
  "Add new feature implementation"
];

// Same look as the Delete Account box (DangerConfirmDialog): header, body and footer sections, no blur behind it
export function PushToGithubModal({
  isOpen,
  onClose,
  onPush,
  projectName,
  repoName,
  isPushing = false,
}: PushToGithubModalProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMessage("");
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const canPush = !!message.trim() && !isPushing;

  const handleSubmit = async () => {
    if (!canPush) return;
    await onPush(message.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isPushing) onClose(); }}>
      <DialogContent
        className="max-w-[calc(100%-2rem)] sm:max-w-md p-0 gap-0 border border-border shadow-2xl rounded-xl overflow-hidden bg-background flex flex-col max-h-[90dvh]"
        overlayClassName="supports-backdrop-filter:backdrop-blur-none !backdrop-blur-none"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="px-6 py-6 border-b border-border bg-muted dark:bg-black shrink-0">
          <DialogTitle className="text-xl font-semibold text-foreground tracking-tight">
            Push to GitHub
          </DialogTitle>
          <DialogDescription className="text-[15px] text-muted-foreground leading-relaxed mt-3 flex items-center gap-2 flex-wrap">
            <span className="truncate max-w-[260px]" title={repoName || projectName}>{repoName || projectName}</span>
            <span className="inline-flex items-center gap-1 text-xs font-mono px-1.5 py-0.5 rounded border border-border text-foreground">
              <GitBranch className="size-3" /> main
            </span>
          </DialogDescription>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="flex flex-col gap-4 px-6 py-6 bg-background">
            <label htmlFor="commit-msg" className="text-sm text-foreground/80">
              What did you change?
            </label>
            <textarea
              id="commit-msg"
              ref={textareaRef}
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isPushing}
              placeholder="e.g. Add hero section and responsive layout"
              className="w-full rounded-md border border-input bg-background dark:bg-black px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-all duration-200 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 resize-none"
            />
            <div className="flex flex-wrap gap-1.5">
              {COMMIT_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled={isPushing}
                  onClick={() => setMessage(suggestion)}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
                    message === suggestion && "bg-muted text-foreground"
                  )}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 flex items-center justify-between bg-muted dark:bg-black border-t border-border shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isPushing}
            className="h-10 px-4 rounded-md border border-border bg-transparent text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canPush}
            className={cn(
              "inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 transition-all duration-200",
              canPush || isPushing ? "bg-foreground text-background hover:opacity-90" : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {isPushing && <Spinner className="mr-2" />}
            {isPushing ? "Pushing…" : "Push changes"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
