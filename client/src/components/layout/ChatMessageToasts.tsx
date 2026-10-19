import { useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCurrentUser } from "@/features/auth/queries/useCurrentUser";
import { useUserChannel } from "@/features/chat/hooks/useRealtimeChat";

// A small popup on every dashboard page when a Grids message arrives: the sender's photo and name and
// "1 message" / "2 messages" with the latest text. Clicking it opens that chat. Not shown on the Grids page
// itself (the chat list shows it there) or for my own messages. Also refreshes the unread badge next to Grids.

const plainText = (html: string) => {
  try {
    return (new DOMParser().parseFromString(html, "text/html").body.textContent || "").trim();
  } catch {
    return html.replace(/<[^>]+>/g, "").trim();
  }
};

export function ChatMessageToasts({ chatPath }: { chatPath: string }) {
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const counts = useRef<Record<string, number>>({}); // messages per sender while their popup is open

  useUserChannel(currentUser?._id || null, {
    onThreadUpdated: (payload: any) => {
      const msg = payload?.message;
      if (!payload?.threadId || !msg) return;
      queryClient.invalidateQueries({ queryKey: ["chat-unread-count"] });

      if (String(msg.sender_id) === String(currentUser?._id) || msg.is_silent || msg.is_deleted) return;
      if (location.pathname.startsWith(chatPath)) return;

      const senderId = String(msg.sender_id);
      const count = (counts.current[senderId] || 0) + 1;
      counts.current[senderId] = count;
      const name = msg.sender_name || "Someone";
      const preview = plainText(String(msg.message || "")) || (msg.attachments?.length ? "Sent a file" : "New message");
      const toastId = `grid-msg-${senderId}`;
      const done = () => { delete counts.current[senderId]; };

      toast.custom(
        () => (
          <button
            type="button"
            onClick={() => {
              done();
              toast.dismiss(toastId);
              navigate(`${chatPath}?threadId=${encodeURIComponent(payload.threadId)}`);
            }}
            className="flex w-[340px] max-w-[90vw] items-center gap-3 rounded-xl border border-border bg-background p-3 text-left shadow-lg hover:bg-accent/40 transition-colors"
          >
            {msg.user_avatar ? (
              <img src={msg.user_avatar} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                {name.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="flex min-w-0 flex-col">
              <span className="text-sm font-semibold text-foreground truncate">
                {count} message{count === 1 ? "" : "s"} from {name}
              </span>
              <span className="text-xs text-muted-foreground truncate">{preview}</span>
            </span>
          </button>
        ),
        { id: toastId, duration: 6000, position: "top-center", onDismiss: done, onAutoClose: done }
      );
    },
  });

  return null;
}
