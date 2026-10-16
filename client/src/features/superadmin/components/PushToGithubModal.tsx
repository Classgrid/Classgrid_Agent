import React, { useState, useEffect, useRef } from "react";
import { Github, GitBranch, GitCommit, UploadCloud, X, Sparkles } from "lucide-react";
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

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || isPushing) return;
    await onPush(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape" && !isPushing) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={() => {
        if (!isPushing) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-background shadow-2xl p-6 flex flex-col gap-5 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-secondary flex items-center justify-center shrink-0 border border-border/50">
              <Github className="size-5 text-foreground" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-base font-semibold text-foreground tracking-tight flex items-center gap-2">
                Push to GitHub
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={repoName || projectName}>
                  {repoName || projectName}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <GitBranch className="size-2.5" /> main
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPushing}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
            title="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="commit-msg" className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <GitCommit className="size-3.5 text-muted-foreground" />
                Commit message
              </label>
              <span className="text-[11px] text-muted-foreground font-mono">
                {message.length} chars
              </span>
            </div>
            <textarea
              id="commit-msg"
              ref={textareaRef}
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isPushing}
              placeholder="What did you change? (e.g. Add hero section and responsive layout)"
              className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground/40 transition-all resize-none font-sans"
            />
          </div>

          {/* Quick Suggestion Chips */}
          <div className="flex flex-wrap gap-1.5">
            {COMMIT_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={isPushing}
                onClick={() => setMessage(suggestion)}
                className={cn(
                  "text-[11px] px-2.5 py-1 rounded-full border border-border/70 text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-colors text-left",
                  message === suggestion && "bg-secondary text-foreground border-foreground/30 font-medium"
                )}
              >
                {suggestion}
              </button>
            ))}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-border mt-1">
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              Press <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-secondary border border-border">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-secondary border border-border">Enter</kbd>
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isPushing}
                className="px-4 py-2 rounded-full border border-border text-sm text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!message.trim() || isPushing}
                className="flex items-center gap-2 px-5 py-2 rounded-full font-medium text-sm bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {isPushing ? (
                  <>
                    <Spinner className="size-4" />
                    Pushing…
                  </>
                ) : (
                  <>
                    <UploadCloud className="size-4" />
                    Push changes
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
