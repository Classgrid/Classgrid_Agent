/*
 * ─────────────────────────────────────────────────────────
 * 🚨 ERP SHUT DOWN 🚨
 * The Classgrid ERP is shut down and will never work or be worked on again.
 * The org admin dashboard and every dashboard other than chat.classgrid.in and the
 * super admin dashboard are banned, and so is all ERP backend code.
 * Any issue or bug in the ERP or the org admin dashboard is banned too: do not look
 * for it, report it or fix it.
 * Do not build, fix, test or talk about ERP features. Only chat.classgrid.in and the
 * super admin dashboard are live.
 * ─────────────────────────────────────────────────────────
 */
import React from "react";

/**
 * Shown in place of the composer once a chat has been ended by the end_conversation tool.
 * The session is read-only from here on; the backend answers /api/ai/ask with a chat_ended event.
 */
export function ChatEndedCard({ onNewChat, onFeedback, reason }: { onNewChat: () => void; onFeedback: () => void; reason?: string | null }) {
  const byUser = reason === "user_requested";
  return (
    // Side by side only when the card itself is wide (not the screen): in the narrow AI side panel it stacks
    <div className="@container w-full">
    <div
      role="status"
      aria-live="polite"
      className="mx-auto w-full flex flex-col @md:flex-row @md:items-center justify-between gap-4 rounded-2xl border border-border bg-white dark:bg-[#1f1f1f] px-5 py-5"
    >
      <div className="min-w-0">
        <div className="text-[18px] font-semibold text-foreground">Chat ended</div>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Agent can't help with this. Start a new chat to continue.{" "}
          <a href="https://classgrid.in/terms" target="_blank" rel="noopener noreferrer" className="underline text-[#3b82f6] hover:opacity-80">Learn more</a>
          {" · "}
          <a href="https://classgrid.in/privacy" target="_blank" rel="noopener noreferrer" className="underline text-[#3b82f6] hover:opacity-80">Privacy</a>.
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <button
          type="button"
          onClick={onNewChat}
          className="cursor-pointer rounded-lg bg-foreground px-4 py-2 text-[14px] font-medium text-background transition-colors hover:bg-foreground/80"
        >
          Start a new chat
        </button>
        <button
          type="button"
          onClick={onFeedback}
          className="cursor-pointer rounded-lg border border-border bg-muted px-4 py-2 text-[14px] font-medium text-foreground transition-colors hover:bg-foreground/10"
        >
          Send feedback
        </button>
      </div>
    </div>
    </div>
  );
}
