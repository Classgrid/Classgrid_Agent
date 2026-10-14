import React from "react";

/**
 * Shown in place of the composer once a chat has been ended by the end_conversation tool.
 * The session is read-only from here on; the backend answers /api/ai/ask with a chat_ended event.
 */
export function ChatEndedCard({ onNewChat, onFeedback, onReopen, reason }: { onNewChat: () => void; onFeedback: () => void; onReopen?: () => void; reason?: string | null }) {
  const byUser = reason === "user_requested";
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border bg-white dark:bg-[#1f1f1f] px-5 py-5"
    >
      <div className="min-w-0">
        <div className="text-[18px] font-semibold text-foreground">Chat ended</div>
        <p className="mt-1 text-[14px] text-muted-foreground">
          {byUser
            ? "You ended this chat. Start a new chat to continue."
            : "Classgrid AI can't help with this. Start a new chat to continue."}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {onReopen && (
          <button
            type="button"
            onClick={onReopen}
            className="rounded-lg px-4 py-2 text-[14px] font-medium text-foreground hover:bg-muted transition-colors"
          >
            Reopen chat
          </button>
        )}
        <button
          type="button"
          onClick={onNewChat}
          className="rounded-lg bg-foreground px-4 py-2 text-[14px] font-medium text-background transition-opacity hover:opacity-90"
        >
          Start a new chat
        </button>
        <button
          type="button"
          onClick={onFeedback}
          className="rounded-lg bg-muted px-4 py-2 text-[14px] font-medium text-foreground transition-colors hover:bg-muted/70"
        >
          Send feedback
        </button>
      </div>
    </div>
  );
}
