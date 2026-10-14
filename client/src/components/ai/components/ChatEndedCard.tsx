import React from "react";
import { MessageSquareOff, Plus } from "lucide-react";

/**
 * Shown in place of the composer once a chat has been ended by the end_conversation tool.
 * The session is read-only from here on; the backend answers /api/ai/ask with CHAT_ENDED.
 */
export function ChatEndedCard({ onNewChat, reason }: { onNewChat: () => void; reason?: string | null }) {
  const byUser = reason === "user_requested";
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto mb-3 w-full max-w-3xl rounded-2xl border border-border bg-muted/40 px-4 py-4 text-center"
    >
      <div className="flex items-center justify-center gap-2 text-sm font-medium text-foreground">
        <MessageSquareOff className="h-4 w-4 text-muted-foreground" />
        <span>Chat ended</span>
      </div>
      <p className="mt-1 text-[13px] text-muted-foreground">
        {byUser
          ? "This conversation was ended at your request. You can still read it, but no new messages can be sent here."
          : "Classgrid AI can't continue this conversation. You can still read it, but no new messages can be sent here."}
      </p>
      <button
        type="button"
        onClick={onNewChat}
        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-1.5 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
      >
        <Plus className="h-3.5 w-3.5" />
        Start a new chat
      </button>
    </div>
  );
}
