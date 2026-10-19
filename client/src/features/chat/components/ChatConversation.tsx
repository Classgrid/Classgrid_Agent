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
// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
/*
 * =========================================================================================
 * 🚨 CRITICAL AI & SYSTEM RULE 🚨
 * NO FRONTEND GITHUB ACTIONS: NEVER create yaml files that build/deploy the frontend to EC2.
 * The frontend is hosted 100% on Vercel. EC2 is only for the backend.
 * =========================================================================================
 */

/*
 * =========================================================================================
 * STRICT SECURITY POLICY:
 * NO ONE CAN EVER CHANGE THE ORGANIZATION TYPE FROM THE FRONTEND OR BACKEND.
 * NEVER ADD A DROPDOWN OR OPTION TO CHANGE IT ANYWHERE IN THE CODEBASE.
 * NO MEANS NO. THIS IS A FIXED PLATFORM RULE.
 * =========================================================================================
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 CRITICAL AI AND SYSTEM RULES 🚨
 * 1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
 * 2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
 * 3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 NAMING CONVENTION RULE 🚨
 * 1. "CLASSGRID PLATFORM" is strictly the REPO NAME.
 * 2. chat.classgrid.in (Classgrid AI) is the actual PRODUCT. The ERP is shut down.
 * 3. NEVER use "Classgrid Platform" anywhere in the frontend UI or user-facing text.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 HOSTING & ARCHITECTURE RULE 🚨
 * 1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
 * 2. FRONTEND IS HOSTED ON VERCEL
 * ─────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Spinner } from "@/components/marketing_ui/spinner";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { ChatBubble } from "./ChatBubble";
import type { ChatMessage, ChatThread, OrgUser, Poll } from "../services/chatApi";

interface ChatConversationProps {
  thread: ChatThread;
  messages: ChatMessage[];
  currentUserId: string;
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onReply: (msg: ChatMessage) => void;
  onDelete: (msgId: string) => void;
  onEdit: (msgId: string, newText: string) => void;
  onReact: (msgId: string, emoji: string) => void;
  onUserClick?: (userId: string) => void;
  typingUsers?: { id: string; type: 'typing' | 'recording' | 'uploading' }[];
  orgUsers?: OrgUser[];
  onViewMedia?: (attachment: any) => void;
  polls?: Poll[];
  onVotePoll?: (pollId: string, optionId: string) => void;
  onViewVotes?: (pollId: string) => void;
  onStar?: (msgId: string) => void;
  canReply?: boolean;
  onForward?: (msgId: string) => void;
  searchQuery?: string;
  isSelectionMode?: boolean;
  selectedMessageIds?: Set<string>;
  onToggleMessageSelection?: (msgId: string) => void;
  amIAdmin?: boolean;
  onApprove?: (msgId: string) => void;
  onReject?: (msgId: string) => void;
  onAcknowledge?: (msgId: string) => void;
  onPin?: (msgId: string, isPinned: boolean) => void;
}

export function ChatConversation({
  thread,
  messages,
  currentUserId,
  isLoading,
  hasMore,
  onLoadMore,
  onReply,
  onDelete,
  onEdit,
  onReact,
  onUserClick,
  typingUsers = [],
  orgUsers = [],
  onViewMedia,
  polls = [],
  onVotePoll,
  onViewVotes,
  onStar,
  canReply = true,
  onForward,
  searchQuery = "",
  isSelectionMode = false,
  selectedMessageIds = new Set(),
  onToggleMessageSelection,
  amIAdmin = false,
  onApprove,
  onReject,
  onAcknowledge,
  onPin,
}: ChatConversationProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const prevHeightRef = useRef<number>(0);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Handle scroll events to detect if we're near bottom or hit top (for pagination)
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    
    // Check if near bottom
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const nearBottom = distanceFromBottom < 100;
    isNearBottomRef.current = nearBottom;
    setShowScrollBottom(!nearBottom);

    if (nearBottom) {
      setUnreadCount(0);
    }

    // Hit top -> load more
    if (scrollTop === 0 && hasMore && !isLoading) {
      prevHeightRef.current = scrollHeight;
      onLoadMore();
    }
  }, [hasMore, isLoading, onLoadMore]);

  // Maintain scroll position when new older messages are loaded
  useEffect(() => {
    if (!scrollRef.current || prevHeightRef.current === 0) return;
    
    const newHeight = scrollRef.current.scrollHeight;
    if (newHeight > prevHeightRef.current) {
      scrollRef.current.scrollTop = newHeight - prevHeightRef.current;
      prevHeightRef.current = 0;
    }
  }, [messages.length]);

  const firstLoadRef = useRef(true);

  // Reset firstLoad when we switch threads
  useEffect(() => {
    firstLoadRef.current = true;
  }, [thread?.id]);

  // Scroll to bottom on first load or when new messages arrive (if already at bottom)
  useEffect(() => {
    if (scrollRef.current) {
      if (isNearBottomRef.current) {
        const behavior = firstLoadRef.current ? "auto" : "smooth";
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: behavior
        });
        
        // Use requestAnimationFrame for a double-check on first load in case images push it down
        if (firstLoadRef.current) {
           requestAnimationFrame(() => {
             if (scrollRef.current) {
               scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "auto" });
             }
           });
        }
        firstLoadRef.current = false;
      } else {
        // We received a new message but we are not at the bottom
        // Increment unread count if it's a new message (we could be more precise but this is a good heuristic)
        setUnreadCount(prev => prev + 1);
      }
    }
  }, [messages.length, typingUsers.length]);

  // Use ResizeObserver to detect when images/media finish loading and expand the content height
  useEffect(() => {
    if (!contentRef.current || !scrollRef.current) return;
    const observer = new ResizeObserver(() => {
      if (isNearBottomRef.current && scrollRef.current) {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "auto"
        });
      }
    });
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, []);

  // Filter messages by search query
  const filteredMessages = searchQuery.trim() 
    ? messages.filter(msg => msg.message?.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  // Group messages by date
  const groupedMessages: { date: string; messages: ChatMessage[] }[] = [];
  let currentDate = "";

  filteredMessages.forEach((msg) => {
    const msgDate = new Date(msg.created_at).toLocaleDateString();
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groupedMessages.push({ date: msgDate, messages: [] });
    }
    groupedMessages[groupedMessages.length - 1].messages.push(msg);
  });

  return (
    <div className="relative flex-1 min-h-0 overflow-hidden flex flex-col">
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto p-4 bg-muted/20 custom-scrollbar flex flex-col"
      >
        <div ref={contentRef} className="flex flex-col mt-auto justify-end">
          {/* First load of a chat with nothing to show yet: message bubbles as placeholders */}
          {isLoading && messages.length === 0 && (
            <div className="flex flex-col gap-4 py-2">
              {[
                { mine: false, w: "w-48" }, { mine: false, w: "w-64" }, { mine: true, w: "w-40" },
                { mine: false, w: "w-56" }, { mine: true, w: "w-72" }, { mine: true, w: "w-32" }, { mine: false, w: "w-44" },
              ].map((b, i) => (
                <div key={i} className={`flex items-end gap-2 ${b.mine ? "justify-end" : "justify-start"}`}>
                  {!b.mine && <Skeleton className="w-8 h-8 rounded-full shrink-0" />}
                  <Skeleton className={`h-10 ${b.w} max-w-[70%] rounded-2xl`} />
                </div>
              ))}
            </div>
          )}

          {/* Loading indicator at top */}
          {isLoading && hasMore && messages.length > 0 && (
            <div className="flex justify-center py-4">
              <Spinner className="w-5 h-5 text-muted-foreground" />
            </div>
          )}

      {/* End of history */}
      {!hasMore && filteredMessages.length > 0 && !searchQuery && (
        <div className="text-center py-6 text-xs text-muted-foreground">
          This is the start of your conversation
        </div>
      )}

      {/* No Messages Found (Search) */}
      {filteredMessages.length === 0 && searchQuery && !isLoading && (
        <div className="flex-1 flex items-center justify-center text-center opacity-70 my-auto h-full min-h-[300px]">
          <h3 className="text-[15px] font-medium text-foreground">No messages found</h3>
        </div>
      )}

      {/* Empty State (No messages ever) */}
      {filteredMessages.length === 0 && !searchQuery && !isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70 my-auto h-full min-h-[300px]">
          <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">👋</span>
          </div>
          <h3 className="text-lg font-bold text-foreground">Say Hello!</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-[250px]">
            Start the conversation by sending a message below.
          </p>
        </div>
      )}

      {/* Message List */}
      <div className="mt-auto flex flex-col justify-end">
        {groupedMessages.map((group, groupIndex) => (
          <div key={group.date}>
            {/* Date Separator */}
            <div className="flex justify-center my-6">
              <span className="px-3 py-1 bg-card border border-border rounded-full text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {group.date === new Date().toLocaleDateString() ? "Today" : group.date}
              </span>
            </div>

            {/* Messages in Date Group */}
            {group.messages.map((msg, i) => {
              const isMine = msg.sender_id === currentUserId;
              
              // Only show avatar if previous message was from someone else, 
              // or if there's a large time gap (>5 mins)
              let showAvatar = true;
              if (i > 0) {
                const prev = group.messages[i - 1];
                if (prev.sender_id === msg.sender_id) {
                  const timeDiff = new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime();
                  if (timeDiff < 5 * 60 * 1000) showAvatar = false;
                }
              }

              return (
                <div
                  key={(msg as any)._clientKey || msg.id}
                  className="flex flex-col"
                >
                  <ChatBubble
                    message={msg}
                    isMine={isMine}
                    showAvatar={showAvatar}
                    currentUserId={currentUserId}
                    onReply={onReply}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    onReact={onReact}
                    onUserClick={onUserClick}
                    onViewMedia={onViewMedia}
                    poll={polls.find(p => p.message_id === msg.id)}
                    onVotePoll={onVotePoll}
                    onViewVotes={onViewVotes}
                    onStar={onStar}
                    canReply={canReply}
                    onForward={onForward}
                    isSelectionMode={isSelectionMode}
                    isSelected={selectedMessageIds.has(msg.id)}
                    onToggleSelect={() => onToggleMessageSelection?.(msg.id)}
                    isAdmin={amIAdmin}
                    onApprove={onApprove}
                    onReject={onReject}
                    onAcknowledge={onAcknowledge}
                    onPin={onPin}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Typing Indicator */}
      <AnimatePresence>
        {typingUsers.length > 0 && thread.type === 'group' && (
          <motion.div 
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            layout
            className="flex items-end gap-2 mt-4 ml-2 mb-2"
          >
          <div className="flex -space-x-2 relative z-10 shrink-0 max-w-[50%] overflow-x-auto custom-scrollbar pb-1">
            {typingUsers.map((user, index) => {
              const u = orgUsers.find(ou => ou._id === user.id);
              const fallbackName = messages.find(m => m.sender_id === user.id)?.sender_name || (thread?.type === 'dm' ? thread?.name : "Someone") || "Someone";
              const initial = u?.name?.[0]?.toUpperCase() || fallbackName?.[0]?.toUpperCase() || "?";
              return (
                <div key={user.id} className="w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center overflow-hidden z-10 relative shadow-sm shrink-0">
                  {u?.profilePicture ? (
                    <img src={u.profilePicture} className="w-full h-full object-cover" alt={u.name} />
                  ) : (
                    <span className="text-[10px] font-bold text-muted-foreground">{initial}</span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="bg-card border border-border text-foreground px-4 py-2.5 rounded-2xl rounded-bl-sm w-fit flex items-center gap-3 shadow-sm">
            <div className="flex gap-1.5 items-center h-4">
              <span className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-bounce"></span>
            </div>
            <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
              {typingUsers
                .map((user) => {
                   const u = orgUsers.find((ou) => ou._id === user.id);
                   if (u) return u.name.split(" ")[0];
                   const msg = messages.find(m => m.sender_id === user.id);
                   if (msg) return msg.sender_name.split(" ")[0];
                   return thread?.type === 'dm' ? (thread?.name || "Someone").split(" ")[0] : "Someone";
                })
                .join(", ")}{" "}
              {typingUsers.length > 1 ? "are" : "is"}{" "}
              {typingUsers[0].type === 'recording' ? 'recording audio' : 
               typingUsers[0].type === 'uploading' ? 'uploading file' : 'typing'}
            </span>
          </div>
          </motion.div>
        )}
      </AnimatePresence>
        </div>
      </div>

      {/* Floating Scroll to Bottom Button */}
      <AnimatePresence>
        {showScrollBottom && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            onClick={() => {
              scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
              setUnreadCount(0);
            }}
            className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-card border border-border shadow-md flex items-center justify-center text-foreground hover:bg-accent transition-colors z-20"
          >
            <ChevronDown className="w-5 h-5 opacity-70" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -left-1.5 min-w-[20px] h-5 rounded-full bg-[#00a884] text-white text-[11px] font-bold flex items-center justify-center px-1 shadow-sm border-2 border-card">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
