import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCurrentUser } from "@/features/auth/queries/useCurrentUser";
import { useRealtimeChannel, useUserChannel } from "@/features/chat/hooks/useRealtimeChat";
import { showDesktopNotification } from "@/lib/desktopNotifications";

// A small popup on every dashboard page when a Grids message arrives: the sender's photo and name and
// "1 message" / "2 messages" with the latest text. Clicking it opens that chat. Not shown on the Grids page
// itself (the chat list shows it there) or for my own messages. Also refreshes the unread badge next to Grids.
// In the desktop app and Classgrid Code a Windows notification is shown too, when the window isn't the one being
// looked at (Settings → Notifications → Grid messages).
//
// This lives in the sidebar, so it runs on every page of the app, not only on the Grids page: a message in any of
// the user's Grids (a group chat or a 1:1) is heard wherever they are. The user's own channel says which chat has
// news; the chat's own room says who sent it and what it says.

const plainText = (html: string) => {
  try {
    return (new DOMParser().parseFromString(html, "text/html").body.textContent || "").trim();
  } catch {
    return html.replace(/<[^>]+>/g, "").trim();
  }
};

// What a message looks like in one line: its text, or what kind of file it is
const previewOf = (msg: any) => {
  const text = plainText(String(msg?.message || ""));
  const files: any[] = Array.isArray(msg?.attachments) ? msg.attachments : [];
  if (!files.length) return text || "New message";
  if (files.length > 1) return text || `${files.length} files`;
  const type = String(files[0]?.file_type || "");
  const kind = type.startsWith("image/") ? "Photo"
    : type.startsWith("video/") ? "Video"
    : type.startsWith("audio/") ? "Voice message"
    : type === "application/pdf" ? "PDF"
    : "File";
  return text || kind;
};

export function ChatMessageToasts({ chatPath }: { chatPath: string }) {
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const counts = useRef<Record<string, number>>({}); // messages per sender while their popup is open
  const myId = String(currentUser?._id || "");

  // The chat on screen: its messages are already being read, so they never pop up
  const openThread = new URLSearchParams(location.search).get("threadId") || "";
  const onGridsPage = location.pathname.startsWith(chatPath);
  const openThreadRef = useRef(openThread);
  openThreadRef.current = openThread;
  const onGridsPageRef = useRef(onGridsPage);
  onGridsPageRef.current = onGridsPage;

  // The chats the user's own channel has just said have news (a message, or a forwarded copy of one)
  const [watched, setWatched] = useState<string[]>([]);

  useUserChannel(currentUser?._id || null, {
    onThreadUpdated: (payload: any) => {
      const msg = payload?.message;
      if (!payload?.threadId || !msg) return;
      queryClient.invalidateQueries({ queryKey: ["chat-unread-count"] });

      if (String(msg.sender_id) === myId || msg.is_silent || msg.is_deleted) return;

      // Already looking at that chat: nothing to tell
      if (onGridsPageRef.current && openThreadRef.current === String(payload.threadId)) return;

      // The chat's own room says who sent it and what it says (the chat list's copy has no sender name)
      const threadId = String(payload.threadId);
      setWatched((prev) => (prev.includes(threadId) ? prev : [...prev, threadId]));
    },
  });

  // One room per chat with news, for a moment: its new message arrives with the sender's name and the text
  useRealtimeChannel(watched.length ? `thread:${watched[0]}` : null, {
    new_message: (msg: any) => {
      const threadId = String(msg?.thread_id || "");
      if (!threadId) return;
      setWatched((prev) => prev.filter((t) => t !== threadId));
      if (String(msg.sender_id) === myId || msg.is_silent || msg.is_deleted) return;
      if (onGridsPageRef.current && openThreadRef.current === threadId) return;
      announce(threadId, msg);
    },
  }, { leaveOnUnmount: false });

  // A chat whose message never came (the room was slow, or the message was sent by a helper): after a moment, tell
  // it from the chat list's copy instead, so a message is never missed
  useEffect(() => {
    if (!watched.length) return;
    const timer = setTimeout(() => {
      const threadId = String(watched[0] || "");
      if (!threadId) return;
      setWatched((prev) => prev.filter((t) => t !== threadId));
      if (onGridsPageRef.current && openThreadRef.current === threadId) return;
      announce(threadId, { sender_name: "Someone", message: "New message" });
    }, 4000);
    return () => clearTimeout(timer);
  }, [watched]);

  function announce(threadId: string, msg: any) {
    const senderId = String(msg.sender_id || "");
    const count = (counts.current[senderId] || 0) + 1;
    counts.current[senderId] = count;
    const name = msg.sender_name || "Someone";
    const preview = previewOf(msg);

    // Windows notification (desktop app and Classgrid Code): only while the window is in the background, and only
    // when the Grids page isn't the one being looked at
    if (!onGridsPageRef.current) {
      const group = msg.thread_name || msg.group_name || "";
      const title = group ? `${name} · ${group}` : name;
      showDesktopNotification("gridMessages", count > 1 ? `${count} new messages: ${preview}` : preview, title);
    }

    if (onGridsPageRef.current) return;
    const toastId = `grid-msg-${senderId}`;
    const done = () => { delete counts.current[senderId]; };

    toast.custom(
      () => (
        <button
          type="button"
          onClick={() => {
            done();
            toast.dismiss(toastId);
            navigate(`${chatPath}?threadId=${encodeURIComponent(threadId)}`);
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
  }

  return null;
}
