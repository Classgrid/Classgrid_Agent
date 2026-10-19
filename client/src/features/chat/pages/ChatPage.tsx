// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
/*
 * =========================================================================================
 * ðŸš¨ CRITICAL AI & SYSTEM RULE ðŸš¨
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
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * ðŸš¨ CRITICAL AI AND SYSTEM RULES ðŸš¨
 * 1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
 * 2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
 * 3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 */

/*
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * ðŸš¨ NAMING CONVENTION RULE ðŸš¨
 * 1. "CLASSGRID PLATFORM" is strictly the REPO NAME.
 * 2. "CLASSGRID ERP" is the actual PRODUCT NAME.
 * 3. NEVER use "Classgrid Platform" anywhere in the frontend UI or user-facing text.
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 */

/*
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * ðŸš¨ HOSTING & ARCHITECTURE RULE ðŸš¨
 * 1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
 * 2. FRONTEND IS HOSTED ON VERCEL
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { MessageSquare, Users, Sparkles, Lock, Zap, Paperclip } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { useCurrentUser } from "@/features/auth/queries/useCurrentUser";
import {
  fetchThreads,
  fetchOrgUsers,
  findOrCreateDM,
  fetchMessages,
  sendMessage,
  markThreadRead,
  deleteMessage,
  editMessage,
  toggleReaction,
  createGroup,
  deleteChat,
  clearChat,
  bulkDeleteChats,
  bulkMuteChats,
  toggleStarMessage,
  markAllRead,
  fetchThreadPolls,
  voteThreadPoll,
  forwardMessages,
  uploadGroupPhoto,
  toggleMuteThread,
  exitGroup,
  approveMessage,
  rejectMessage,
  acknowledgeMessage,
  pinMessage,
  type ChatThread,
  type ChatMessage,
  type OrgUser,
  type Poll,
} from "../services/chatApi";
import { getCachedMessages, setCachedMessages } from "../services/chatCache";
import { useUserChannel, useThreadChannel, useOrgChannel } from "../hooks/useRealtimeChat";
import { useOnlineUsers } from "../context/PresenceContext";
import { useChatBlocks } from "../hooks/useChatBlocks";
import { BlockedContactsView } from "../components/BlockedContactsView";

import { ChatSidebar } from "../components/ChatSidebar";
import { ChatHeader } from "../components/ChatHeader";
import { ChatConversation } from "../components/ChatConversation";
import { AnimatePresence } from "framer-motion";
import { ChatInput } from "../components/ChatInput";
import { NewChatSidebar } from "../components/NewChatSidebar";
import { GroupCreateSidebar } from "../components/GroupCreateSidebar";
import { CreatePollModal } from "../components/CreatePollModal";
import { DeleteMessageModal } from "../components/DeleteMessageModal";
import { DisappearingMessagesModal } from "../components/DisappearingMessagesModal";
import { PinDurationModal } from "../components/PinDurationModal";
import { lazy, Suspense } from "react";
const GroupSettingsModal = lazy(() => import("../components/GroupSettingsModal").then(module => ({ default: module.GroupSettingsModal })));
import { ForwardMessageModal } from "../components/ForwardMessageModal";
const SharedProfilePage = lazy(() => import("@/features/shared/pages/SharedProfilePage").then(m => ({ default: m.SharedProfilePage })));
import FilePreviewModal from "@/app/support/components/FilePreviewModal";
import { SelectionActionBar } from "../components/SelectionActionBar";
import { ViewPollVotesModal } from "../components/ViewPollVotesModal";
import { StarredMessagesView } from "../components/StarredMessagesView";
import { ScheduledMessagesView } from "../components/ScheduledMessagesView";
import { DangerConfirmDialog } from "@/components/marketing_ui/danger-confirm-dialog";
import { UploadProvider } from "../context/UploadContext";

function ChatPageInner() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const currentUserId = currentUser?._id;

  // -- State: Threads & Sidebar --
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThread, setActiveThread] = useState<ChatThread | null>(null);
  const [threadsLoading, setThreadsLoading] = useState(true);

  // -- State: Messages (Active Thread) --
  const messageCache = useRef<Record<string, ChatMessage[]>>({});
  const fetchAbortController = useRef<AbortController | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [pinningMessageId, setPinningMessageId] = useState<string | null>(null);
  const [isPinning, setIsPinning] = useState(false);

  // -- State: Modals & Org Users --
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [viewingMedia, setViewingMedia] = useState<any | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [viewVotesPollId, setViewVotesPollId] = useState<string | null>(null);
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [chatSideView, setChatSideView] = useState<'none' | 'starred' | 'scheduled'>('none');
  const [isDisappearingModalOpen, setIsDisappearingModalOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [messagesToDelete, setMessagesToDelete] = useState<ChatMessage[]>([]);
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [polls, setPolls] = useState<Poll[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, { timeout: NodeJS.Timeout, type: 'typing'|'recording'|'uploading' }>>({});
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    warningMessage: string;
    actionLabel: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    description: "",
    warningMessage: "",
    actionLabel: "Confirm",
    onConfirm: () => {}
  });

  const activeTypingUsers = Object.entries(typingUsers).map(([id, data]) => ({
    id,
    type: data.type
  }));
  const onlineUsers = useOnlineUsers();

  // -- Deep link: ?threadId=... (e.g. from a bell notification) opens that chat once threads are loaded --
  const [searchParams, setSearchParams] = useSearchParams();
  const linkedThreadId = searchParams.get("threadId");
  useEffect(() => {
    if (!linkedThreadId || threads.length === 0) return;
    const target = threads.find((t) => t.id === linkedThreadId);
    if (target) setActiveThread(target);
    const next = new URLSearchParams(searchParams);
    next.delete("threadId");
    setSearchParams(next, { replace: true });
  }, [linkedThreadId, threads]);

  // -- Blocking (live over the user's WebSocket channel) --
  const [showBlocked, setShowBlocked] = useState(false);
  const { blocked, blockedIds, hiddenIds, block, unblock } = useChatBlocks(currentUserId, (e) => {
    // Someone blocked/unblocked me: reload so their profile details are masked/unmasked at once
    if (e.by === "them") { loadOrgUsers(); loadThreads(); }
  });
  // Nobody on either side of a block sees the other online
  const visibleOnlineUsers = useMemo(
    () => (hiddenIds.size ? new Set([...onlineUsers].filter((id) => !hiddenIds.has(id))) : onlineUsers),
    [onlineUsers, hiddenIds]
  );
  const activeDmPartnerId = activeThread?.type === "dm" ? activeThread.otherUserId || null : null;
  const isActiveDmBlocked = !!activeDmPartnerId && blockedIds.has(activeDmPartnerId);

  // -- Load Initial Data --
  useEffect(() => {
    if (!currentUserId) return;
    loadThreads();
    loadOrgUsers();
  }, [currentUserId]);

  const confirmDeleteMessages = async (msgIds: string[], type: 'me' | 'everyone') => {
    if (!activeThread) return;
    
    // Optimistic update
    setMessages(prev => prev.map(m => {
      if (msgIds.includes(m.id)) {
        if (type === 'everyone') {
          return { ...m, is_deleted: true, message: "This message was deleted" };
        } else {
          return null; // hide it for me
        }
      }
      return m;
    }).filter(Boolean) as ChatMessage[]);

    const failedIds: string[] = [];
    for (const msgId of msgIds) {
      try {
        await deleteMessage(activeThread.id, msgId, type);
      } catch (err: any) {
        failedIds.push(msgId);
      }
    }

    if (failedIds.length > 0) {
      if (type === 'everyone') {
        // Rollback optimistic update for failed messages â€” restore them
        setMessages(prev => prev.map(m => {
          if (failedIds.includes(m.id)) {
            return { ...m, is_deleted: false, message: m.message }; 
          }
          return m;
        }));
        // Refetch to get accurate server state
        if (activeThread) {
          try {
            const freshMsgs = await fetchMessages(activeThread.id);
            if (Array.isArray(freshMsgs)) setMessages(freshMsgs);
          } catch { /* ignore refetch error */ }
        }
        toast.error(
          `${failedIds.length} message(s) could not be deleted for everyone (already seen). They remain visible.`
        );
      } else {
        toast.error("Failed to delete some messages");
      }
    }
  };

  const handleClearChat = async () => {
    if (!activeThread) return;
    try {
      await clearChat(activeThread.id);
      setMessages([]);
      toast.success("Chat cleared");
    } catch (err) {
      toast.error("Failed to clear chat");
    }
  };

  const handleDeleteChat = async () => {
    if (!activeThread) return;
    try {
      await deleteChat(activeThread.id);
      const threadId = activeThread.id;
      setActiveThread(null);
      setThreads(threads.filter(t => t.id !== threadId));
      toast.success("Chat deleted");
    } catch (err) {
      toast.error("Failed to delete chat");
    }
  };

  const handleForwardMessages = async (targetThreadIds: string[]) => {
    try {
      if (selectedMessageIds.size === 0) return;
      const res = await forwardMessages(Array.from(selectedMessageIds), targetThreadIds);
      if (res.success) {
        toast.success(`Messages forwarded to ${targetThreadIds.length} ${targetThreadIds.length === 1 ? 'chat' : 'chats'}`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to forward messages");
    }
  };

  const handleVotePoll = async (pollId: string, optionId: string) => {
    if (!activeThread) return;
    try {
      // Optimistically update the UI immediately
      setPolls(prev => prev.map(p => {
        if (p.id !== pollId) return p;
        let newMyVotes = [...p.myVotes];
        const newVoteCounts = { ...p.voteCounts };
        
        if (p.allow_multiple) {
          if (newMyVotes.includes(optionId)) {
            newMyVotes = newMyVotes.filter(id => id !== optionId);
            newVoteCounts[optionId] = Math.max(0, (newVoteCounts[optionId] || 0) - 1);
          } else {
            newMyVotes.push(optionId);
            newVoteCounts[optionId] = (newVoteCounts[optionId] || 0) + 1;
          }
        } else {
          if (newMyVotes.length > 0) {
            const oldVote = newMyVotes[0];
            if (oldVote !== optionId) {
              // User changed their vote
              newVoteCounts[oldVote] = Math.max(0, (newVoteCounts[oldVote] || 0) - 1);
              newVoteCounts[optionId] = (newVoteCounts[optionId] || 0) + 1;
              newMyVotes = [optionId];
            } else {
              // User un-voted
              newVoteCounts[oldVote] = Math.max(0, (newVoteCounts[oldVote] || 0) - 1);
              newMyVotes = [];
            }
          } else {
            // New vote
            newVoteCounts[optionId] = (newVoteCounts[optionId] || 0) + 1;
            newMyVotes = [optionId];
          }
        }
        return { ...p, myVotes: newMyVotes, voteCounts: newVoteCounts, totalVotes: Object.values(newVoteCounts).reduce((a, b) => a + b, 0) };
      }));

      // Fire and forget the API call to make it instantly responsive
      voteThreadPoll(activeThread.id, pollId, optionId).catch(() => {
        toast.error("Failed to sync vote");
      });
    } catch (err) {
      console.error(err);
    }
  };

  const loadPolls = async (threadId: string) => {
    try {
      const threadPolls = await fetchThreadPolls(threadId);
      setPolls(threadPolls);
    } catch (err) {
      console.error("Failed to load polls", err);
    }
  };

  useEffect(() => {
    if (activeThread) {
      // Defer polls loading so message fetch gets network priority
      const timer = setTimeout(() => loadPolls(activeThread.id), 200);
      return () => clearTimeout(timer);
    } else {
      setPolls([]);
    }
  }, [activeThread]);

  const loadThreads = async () => {
    try {
      const data = await fetchThreads(activeFilter);
      setThreads(data);
      return data;
    } catch (err) {
      toast.error("Failed to load chat threads");
      return [];
    } finally {
      setThreadsLoading(false);
    }
  };

  useEffect(() => {
    loadThreads();
  }, [activeFilter]);

  // View Profile finds the person in the contacts list. Opened before the list has loaded, the profile waits for
  // it (a skeleton shows); if the list is loaded but the person isn't in it, the list is loaded once more.
  const profileRetriedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!profileUserId || usersLoading || orgUsers.some((u) => u._id === profileUserId)) return;
    if (profileRetriedFor.current !== profileUserId) {
      profileRetriedFor.current = profileUserId;
      loadOrgUsers();
    } else {
      toast.error("Couldn't load this profile. Please try again.");
      setProfileUserId(null);
    }
  }, [profileUserId, orgUsers, usersLoading]);

  const loadOrgUsers = async () => {
    setUsersLoading(true);
    try {
      const data = await fetchOrgUsers();
      setOrgUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setUsersLoading(false);
    }
  };

  // -- Load Messages when Thread Selected --
  // Which chat the messages on screen belong to. Right after switching chats the screen still has the old chat's
  // messages for a moment; they must never be saved under the new chat.
  const messagesThreadRef = useRef<string | null>(null);
  const activeThreadIdRef = useRef<string | null>(null);
  activeThreadIdRef.current = activeThread?.id || null;
  const serverLoadedRef = useRef<string | null>(null); // the chat whose newest messages came from the server
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!activeThread || messagesLoading || messagesThreadRef.current !== activeThread.id) return;
    messageCache.current[activeThread.id] = messages;
    // Everything loaded for this chat is also saved in the browser (a moment later, not on every change)
    if (currentUserId) {
      const threadId = activeThread.id;
      const toSave = messages.filter((m) => !String(m.id).startsWith("temp-"));
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => { setCachedMessages(String(currentUserId), threadId, toSave); }, 500);
    }
  }, [messages, activeThread, messagesLoading, currentUserId]);

  useEffect(() => {
    // When switching away from a thread, cancel any pending fetch
    return () => {
      if (fetchAbortController.current) {
        fetchAbortController.current.abort();
        fetchAbortController.current = null;
      }
    };
  }, [activeThread?.id]);

  useEffect(() => {
    if (activeThread) {
      setTypingUsers({});
      
      // Instantly show cached messages if we have them, without loading spinner
      const threadId = activeThread.id;
      messagesThreadRef.current = threadId;
      serverLoadedRef.current = null;
      if (messageCache.current[threadId]) {
        setMessages(messageCache.current[threadId]);
        setMessagesLoading(false);
      } else {
        setMessages([]); // Clear previous chat instantly
        setMessagesLoading(true); // skeleton until the saved copy or the server answers
        // Saved in this browser from an earlier visit: show it at once (unless the server already answered)
        if (currentUserId) {
          getCachedMessages<ChatMessage>(String(currentUserId), threadId).then((saved) => {
            if (!saved || activeThreadIdRef.current !== threadId || serverLoadedRef.current === threadId) return;
            messageCache.current[threadId] = saved;
            setMessages(saved);
            setMessagesLoading(false);
          });
        }
      }

      loadMessages(activeThread.id);
      
      // Defer read receipt so it doesn't compete with message fetch for network bandwidth
      setTimeout(() => markThreadRead(activeThread.id).catch(console.error), 100);
      
      // Clear unread count locally immediately
      setThreads((prev) =>
        prev.map((t) => (t.id === activeThread.id ? { ...t, unread: 0 } : t))
      );
    } else {
      setMessages([]);
      setReplyTo(null);
    }
  }, [activeThread]);

  const loadMessages = async (threadId: string, before?: string) => {
    // If not paginating, abort any ongoing requests to prevent race conditions
    if (!before) {
      if (fetchAbortController.current) {
        fetchAbortController.current.abort();
      }
      fetchAbortController.current = new AbortController();
    }

    try {
      const msgs = await fetchMessages(threadId, before, !before ? fetchAbortController.current?.signal : undefined);
      
      // Guard: Only update if the user hasn't switched to another thread
      if (activeThread && activeThread.id === threadId) {
        if (before) {
          setMessages((prev) => {
            const newMsgs = [...msgs, ...prev];
            messageCache.current[threadId] = newMsgs;
            return newMsgs;
          });
        } else {
          serverLoadedRef.current = threadId;
          messagesThreadRef.current = threadId;
          setMessages(msgs);
          messageCache.current[threadId] = msgs;
        }
        setHasMoreMessages(msgs.length === 50); // Hardcoded limit from backend
      }
    } catch (err: any) {
      // Ignore abort errors
      if (err?.name === 'CanceledError' || err?.message === 'canceled') return;
      toast.error("Failed to load messages");
    } finally {
      if (!before && activeThread && activeThread.id === threadId) {
        setMessagesLoading(false);
      }
    }
  };

  const handleLoadMore = useCallback(() => {
    if (!activeThread || !hasMoreMessages || messages.length === 0) return;
    const oldestMessage = messages[0];
    loadMessages(activeThread.id, oldestMessage.created_at);
  }, [activeThread, hasMoreMessages, messages]);

  // -- Send Message --
  const handleSendMessage = async (text: string, files: File[], options?: { scheduledFor?: string; isSilent?: boolean; priority?: string; expiresAt?: string }) => {
    if (!activeThread || !currentUserId) return;
    if (!text.trim() && files.length === 0) return;
    
    const hasMedia = files.length > 0;

    // If scheduled message
    if (options?.scheduledFor) {
      setIsSending(true);
      try {
        const replyData = replyTo
          ? { id: replyTo.id, sender_name: replyTo.sender_name, message: replyTo.message }
          : null;
        await sendMessage(activeThread.id, text, files, replyData, options);
        setReplyTo(null);
        toast.success("Message scheduled successfully!");
      } catch (err: any) {
        toast.error(err.response?.data?.error || "Failed to schedule message");
      } finally {
        setIsSending(false);
      }
      return;
    }

    // No longer block the UI for media uploads
    const tempId = `temp-${Date.now()}`;
    const tempMessage: ChatMessage = {
      id: tempId,
      thread_id: activeThread.id,
      sender_id: currentUserId,
      sender_name: currentUser?.name || "Me",
      user_avatar: currentUser?.profilePicture || null,
      message: text,
      reply_to: replyTo ? { id: replyTo.id, sender_name: replyTo.sender_name, message: replyTo.message } : null,
      is_deleted: false,
      created_at: new Date().toISOString(),
      attachments: files.map((f, i) => ({
        id: `temp-att-${i}`,
        message_id: tempId,
        file_url: URL.createObjectURL(f),
        file_name: f.name,
        file_type: f.type,
        file_size: f.size
      })),
      reactions: {},
      isSending: files.length > 0,
      _clientKey: tempId
    } as any;

    setMessages((prev) => [...prev, tempMessage]);
    setReplyTo(null);

    // My own chat list shows the new last message at once (the server's update arrives a moment later)
    const sentThreadId = activeThread.id;
    const firstFile = files[0];
    const filePreview = !firstFile ? "" : files.length > 1 ? `[FILE] ${files.length} files`
      : firstFile.type.startsWith("image/") ? `[IMAGE] ${text.trim() || "Photo"}`
      : firstFile.type.startsWith("video/") ? `[VIDEO] ${text.trim() || "Video"}`
      : firstFile.type.startsWith("audio/") ? `[AUDIO] ${text.trim() || "Voice message"}`
      : firstFile.type === "application/pdf" ? `[PDF] ${text.trim() || firstFile.name}`
      : `[FILE] ${text.trim() || firstFile.name}`;
    setThreads((prev) => {
      const existing = prev.find((t) => t.id === sentThreadId);
      if (!existing) return prev;
      const updated = { ...existing, lastMessage: filePreview || text, lastMessageAt: tempMessage.created_at };
      return [updated, ...prev.filter((t) => t.id !== sentThreadId)];
    });

    try {
      const replyData = replyTo
        ? { id: replyTo.id, sender_name: replyTo.sender_name, message: replyTo.message }
        : null;
      
      const sentMessage = await sendMessage(
        activeThread.id, 
        text, 
        files, 
        replyData, 
        options,
        (pct) => {
          setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, uploadProgress: pct } : m)));
        }
      );
      setMessages((prev) => {
        if (prev.some(m => m.id === sentMessage.id)) {
          return prev.filter(m => m.id !== tempId);
        }
        return prev.map((m) => (m.id === tempId ? { ...sentMessage, _clientKey: tempId } : m));
      });
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || "Failed to send message";
      toast.error(errorMessage);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, isSending: false, isError: true } : m))
      );
    } finally {
      // No longer reset global isSending for media
    }
  };

  // -- Actions --
  const handleSelectUserDM = async (userId: string) => {
    try {
      const { thread } = await findOrCreateDM(userId);
      let target = threads.find((t) => t.id === thread.id);
      
      if (!target) {
        // Optimistically construct the thread object
        const otherUser = orgUsers.find(u => u._id === userId);
        target = {
          ...thread,
          name: otherUser?.name || "Loading...",
          avatar: otherUser?.profilePicture,
          unread: 0,
        } as ChatThread;
        
        // Add to threads list immediately to bypass the 15+ second loadThreads bottleneck
        setThreads(prev => {
          if (prev.some(t => t.id === thread.id)) return prev;
          return [target, ...prev];
        });
      }
      
      setActiveThread(target);
    } catch (err) {
      toast.error("Failed to start chat");
    }
  };

  const handleCreateGroup = async (name: string, description: string, memberIds: string[], photo?: File | null, settings?: { messageTtl?: number; permissions?: any }) => {
    try {
      // Flatten permissions into settings payload
      const payload = {
        ...settings?.permissions,
        message_ttl: settings?.messageTtl
      };
      const response = await createGroup(name, description, memberIds, payload);
      const group = response.group;
      const thread = response.thread;
      
      if (group?.id && photo) {
        try {
          await uploadGroupPhoto(group.id, photo);
        } catch (photoErr: any) {
          console.error('Photo upload failed:', photoErr);
          toast.error("Group created, but photo upload failed (might be too large).");
        }
      }

      // Construct new group object optimistically
      const newGroupThread = {
        ...thread,
        name: group.name,
        groupId: group.id,
        avatar: photo ? URL.createObjectURL(photo) : undefined,
        unread: 0,
      } as unknown as ChatThread;

      setThreads(prev => {
        if (prev.some(t => t.id === thread.id)) {
          return prev.map(t => t.id === thread.id ? { ...t, ...newGroupThread } : t);
        }
        return [newGroupThread, ...prev];
      });
      
      if (thread && group) {
        setActiveThread(newGroupThread);
      }
      setIsGroupModalOpen(false);
      toast.success("Group created successfully!");
    } catch (err: any) {
      console.error('Group creation failed:', err);
      const serverMsg = err?.error || err?.message || err?.response?.data?.error || err?.response?.data?.message;
      toast.error(serverMsg || "Failed to create group");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      setThreads((prev) => prev.map((t) => ({ ...t, unread: 0 })));
      toast.success("All chats marked as read");
    } catch (err) {
      toast.error("Failed to mark all as read");
    }
  };

  const handleBulkDelete = async (threadIds: string[]) => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete Chats",
      description: `Are you sure you want to delete ${threadIds.length} chats?`,
      warningMessage: "This action cannot be undone.",
      actionLabel: "Delete",
      onConfirm: async () => {
        try {
          await bulkDeleteChats(threadIds);
          setThreads(prev => prev.filter(t => !threadIds.includes(t.id)));
          if (activeThread && threadIds.includes(activeThread.id)) {
            setActiveThread(null);
          }
          toast.success(`${threadIds.length} chats deleted`);
        } catch (err) {
          toast.error("Failed to delete chats");
        }
      }
    });
  };

  const handleBulkMute = async (threadIds: string[]) => {
    if (threadIds.length === 0) return;
    try {
      await bulkMuteChats(threadIds);
      // Let websocket sync updates
      setSelectedMessageIds(new Set());
      setIsSelectionMode(false);
      toast.success(`${threadIds.length} chat(s) muted`);
    } catch (err) {
      toast.error("Failed to mute chats");
    }
  };

  const handleBulkClear = async (threadIds: string[]) => {
    if (threadIds.length === 0) return;
    try {
      for (const id of threadIds) {
        await clearChat(id);
      }
      setSelectedMessageIds(new Set());
      setIsSelectionMode(false);
      // Let websocket sync updates or manually refresh
      loadThreads();
      toast.success(`${threadIds.length} chat(s) cleared`);
    } catch (err) {
      toast.error("Failed to clear chats");
    }
  };

  const handlePinMessage = async (msgId: string, isPinned: boolean) => {
    if (isPinned) {
      setPinningMessageId(msgId);
    } else {
      try {
        if (!activeThread) return;
        await pinMessage(activeThread.id, msgId, false);
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_pinned: false, pinned_until: null } : m));
      } catch (error) {
        toast.error("Failed to unpin message");
      }
    }
  };

  const submitPin = async (durationHours: number) => {
    if (!pinningMessageId || !activeThread) return;
    setIsPinning(true);
    try {
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() + durationHours);
      
      await pinMessage(activeThread.id, pinningMessageId, true, durationHours);
      setMessages(prev => prev.map(m => m.id === pinningMessageId 
        ? { ...m, is_pinned: true, pinned_until: expirationDate.toISOString() } 
        : { ...m, is_pinned: false, pinned_until: null }
      ));
      setPinningMessageId(null);
    } catch (error) {
      toast.error("Failed to pin message");
    } finally {
      setIsPinning(false);
    }
  };

  const handleStarMessage = async (messageId: string) => {
    try {
      const res = await toggleStarMessage(messageId);
      // Optimistic update
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_starred: res.isStarred } : m));
      toast.success(res.isStarred ? "Message starred" : "Message unstarred");
    } catch (err) {
      toast.error("Failed to star message");
    }
  };

  // -- Realtime Handlers --
  
  // 0. Org-wide updates (e.g. new public groups)
  useOrgChannel(currentUser?.organization_id || null, {
    onExploreGroupsUpdated: () => {
      queryClient.invalidateQueries({ queryKey: ["explore-groups"] });
    }
  });

  // 1. Sidebar Updates (via User channel)
  useUserChannel(currentUserId || null, { onThreadUpdated: (payload) => {
    if (payload.action === 'new_group') {
      // Only reload threads if we don't already have it
      setThreads(prev => {
        if (prev.some(t => t.id === payload.threadId)) return prev;
        loadThreads();
        return prev;
      });
      return;
    }

    if (payload.action === 'group_updated') {
      if (payload.groupId) {
        queryClient.invalidateQueries({ queryKey: ["group-info", String(payload.groupId)] });
      }
      setThreads(prev => prev.map(t => {
        if (t.groupId === payload.groupId) {
          return {
            ...t,
            name: payload.name || t.name,
            description: payload.description || t.description,
            avatar: payload.avatar_url || t.avatar
          };
        }
        return t;
      }));
      // We don't strictly need to update activeThread here since the thread channel also gets this,
      // but doing it here guarantees it's updated.
      if (activeThread?.groupId === payload.groupId) {
         setActiveThread(prev => prev ? {
             ...prev,
             name: payload.name || prev.name,
             description: payload.description || prev.description,
             avatar: payload.avatar_url || prev.avatar
         } : prev);
      }
      return;
    }

    if (payload.threadId && payload.message) {
      // Reorder sidebar and update last message
      setThreads((prev) => {
        const existing = prev.find(t => t.id === payload.threadId);
        if (!existing) {
          // If a brand new thread was created and we just got a message for it, we should probably full-reload the threads
          loadThreads();
          return prev;
        }

        const isCurrentlyViewing = activeThread?.id === payload.threadId;
        const msg = payload.message as ChatMessage;

        let preview = msg.message || "";
        if (msg.is_deleted) {
          preview = "This message was deleted";
        } else if (msg.message?.startsWith("[POLL]")) {
          // If the backend sent a poll message, keep it. Wait, the frontend message is actually "Created a poll: ...", but for the preview we want "[POLL] ...".
          // If the message is a poll, the frontend doesn't have msg.poll. The backend sends message text "Created a poll: question".
          if (msg.message.startsWith("Created a poll: ")) {
            preview = "[POLL] " + msg.message.replace("Created a poll: ", "");
          }
        } else if (msg.attachments && msg.attachments.length > 0) {
          if (msg.attachments.length === 1) {
            const att = msg.attachments[0];
            const mime = att.file_type || "";
            let prefix = "[FILE]";
            let defaultText = att.file_name || "Document";
            if (mime.startsWith("image/")) { prefix = "[IMAGE]"; defaultText = "Photo"; }
            else if (mime.startsWith("video/")) { prefix = "[VIDEO]"; defaultText = "Video"; }
            else if (mime.startsWith("audio/")) { prefix = "[AUDIO]"; defaultText = (mime.includes("webm") || mime.includes("ogg")) ? "Voice message" : "Audio"; }
            else if (mime === "application/pdf") { prefix = "[PDF]"; }
            else if (mime.includes("word") || mime.includes("document")) { prefix = "[DOC]"; }
            
            preview = msg.message ? `${prefix} ${msg.message.trim()}` : `${prefix} ${defaultText}`;
          } else {
            preview = `[FILE] ${msg.attachments.length} files`;
          }
        }

        const updated = {
          ...existing,
          lastMessage: preview,
          lastMessageAt: msg.created_at,
          unread: isCurrentlyViewing ? 0 : existing.unread + 1,
        };

        const others = prev.filter(t => t.id !== payload.threadId);
        return [updated, ...others]; // Move to top
      });

      // If viewing the thread, mark read
      if (activeThread?.id === payload.threadId) {
         markThreadRead(payload.threadId).catch(() => {});
      }
    }
  },
  onThreadDeleted: (payload) => {
    setThreads((prev) => prev.filter(t => t.id !== payload.threadId));
    if (activeThread?.id === payload.threadId) {
      setActiveThread(null);
      // The specific message is handled by the thread channel's onThreadDeleted
    }
  }});

  // 2. Active Thread Updates (via Thread channel)
  const { sendTyping } = useThreadChannel(activeThread?.id || null, currentUserId || null, {
    onNewMessage: (payload: any) => {
      // Security/Sanity Check: Make sure the message actually belongs to this thread!
      // This prevents ghost messages if the Socket is accidentally still subscribed to multiple threads.
      if (activeThread && payload.thread_id !== activeThread.id) {
        return;
      }
      if (payload.sender_id && blockedIds.has(payload.sender_id)) return;
      setMessages((prev) => {
        // If we already have this message (e.g. from optimistic UI), don't duplicate it.
        if (prev.some((msg) => msg.id === payload.id)) {
          return prev;
        }

        // Anti-Flash & Double Bubble Fix:
        // If this message is from US, find our optimistic 'temp' message and replace it!
        if (payload.sender_id === currentUserId) {
          const tempMsgIndex = prev.findIndex(msg => 
            msg.id.toString().startsWith('temp-') && 
            msg.message === payload.message
          );
          
          if (tempMsgIndex !== -1) {
            const next = [...prev];
            next[tempMsgIndex] = { ...payload, _clientKey: (prev[tempMsgIndex] as any)._clientKey || prev[tempMsgIndex].id };
            return next;
          }
        }

        return [...prev, payload];
      });
      // Immediately clear their typing/uploading indicator once their message arrives
      setTypingUsers((prev) => {
        const next = { ...prev };
        if (next[payload.sender_id]) {
          clearTimeout(next[payload.sender_id].timeout);
          delete next[payload.sender_id];
        }
        return next;
      });
    },
    onMessageDeleted: (payload: any) => {
      const ids: string[] = payload?.messageIds || (payload?.messageId ? [payload.messageId] : []);
      if (ids.length === 0) return;
      setMessages((prev) => {
        const next = prev.map((m) => (ids.includes(m.id) ? { ...m, is_deleted: true, message: "This message was deleted" } : m));
        if (next.length > 0 && ids.includes(next[next.length - 1].id) && activeThread) {
          setThreads(tPrev => tPrev.map(t => t.id === activeThread.id ? { ...t, lastMessage: "This message was deleted" } : t));
        }
        return next;
      });
    },
    onReactionUpdate: ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
      );
    },
    onReadReceipt: ({ userId, lastReadAt }) => {
      if (userId !== currentUserId && !hiddenIds.has(userId)) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.sender_id === currentUserId && new Date(m.created_at) <= new Date(lastReadAt)) {
              return { ...m, isSeen: true };
            }
            return m;
          })
        );
      }
    },
    onTyping: (data) => {
      if (data.userId === currentUserId || hiddenIds.has(data.userId)) return;
      setTypingUsers((prev) => {
        const next = { ...prev };
        if (!data.isTyping) {
          if (next[data.userId]) clearTimeout(next[data.userId].timeout);
          delete next[data.userId];
        } else {
          if (next[data.userId]) clearTimeout(next[data.userId].timeout);
          const timeout = setTimeout(() => {
            setTypingUsers((p) => {
              const pNext = { ...p };
              delete pNext[data.userId];
              return pNext;
            });
          }, data.activityType === 'uploading' ? 180000 : data.activityType === 'recording' ? 60000 : 3000);
          next[data.userId] = { timeout, type: data.activityType || 'typing' };
        }
        return next;
      });
    },
    onNewPoll: (data) => {
      setPolls((prev) => [data.poll, ...prev]);
    },
    onPollVote: (data) => {
      setPolls((prev) => prev.map(p => {
        if (p.id === data.pollId) {
           return { ...p, voteCounts: data.voteCounts, totalVoters: data.totalVoters };
        }
        return p;
      }));
    },
    onThreadUpdated: (payload) => {
      if (payload.allow_replies !== undefined) {
         setActiveThread(prev => prev ? { ...prev, allowReplies: payload.allow_replies } : null);
      }
      if (payload.groupId) {
         // A group change happened (e.g. member added/removed, info changed, photo updated)
         queryClient.invalidateQueries({ queryKey: ["group-info", String(payload.groupId)] });
         
         // Update threads array for sidebar
         if (payload.name || payload.description || payload.avatar_url || payload.banner_url) {
           setThreads(prev => prev.map(t => {
             if (t.groupId === payload.groupId) {
               return {
                 ...t,
                 name: payload.name || t.name,
                 description: payload.description || t.description,
                 avatar: payload.avatar_url || t.avatar
               };
             }
             return t;
           }));
           
           // Update active thread
           setActiveThread(prev => prev && prev.groupId === payload.groupId ? {
             ...prev,
             name: payload.name || prev.name,
             description: payload.description || prev.description,
             avatar: payload.avatar_url || prev.avatar
           } : prev);
         }

         if (payload.action === 'member_removed' && payload.removedUserId === currentUserId) {
           setActiveThread(null);
           toast.info("You were removed from this group.");
         }
      }
    },
    onThreadDeleted: (payload) => {
      setThreads(prev => prev.filter(t => t.id !== payload.threadId));
      if (activeThread?.id === payload.threadId) {
        setActiveThread(null);
        if (payload.action === 'left_group') {
          toast.info("You left the group.");
        } else if (payload.action === 'removed_from_group') {
          toast.info("You were removed from this group.");
        } else {
          toast.info("This chat was deleted.");
        }
      }
    },
    onMessageUpdated: (data) => {
      setMessages((prev) => prev.map(m => m.id === data.id ? { ...m, ...data } : m));
    },
    onMessageAcknowledged: (data) => {
      setMessages((prev) => prev.map(m => m.id === data.messageId ? { ...m, has_acknowledged: true } : m));
    }
  });

  const handleApprove = async (msgId: string) => {
    if (!activeThread) return;
    try {
      await approveMessage(activeThread.id, msgId);
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: 'approved' } : m));
      toast.success("Message approved");
    } catch (err) {
      toast.error("Failed to approve message");
    }
  };

  const handleReject = async (msgId: string) => {
    if (!activeThread) return;
    try {
      await rejectMessage(activeThread.id, msgId);
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: 'rejected' } : m));
      toast.success("Message rejected");
    } catch (err) {
      toast.error("Failed to reject message");
    }
  };

  const handleAcknowledge = async (msgId: string) => {
    if (!activeThread) return;
    try {
      await acknowledgeMessage(activeThread.id, msgId);
      setMessages(prev => prev.map(m => {
        if (m.id === msgId) {
           return { ...m, has_acknowledged: true };
        }
        return m;
      }));
      toast.success("Message acknowledged");
    } catch (err) {
      toast.error("Failed to acknowledge message");
    }
  };

  const isOrgAdmin = ['super_admin', 'org_admin', 'hod', 'principal', 'vice_principal', 'exam_controller', 'fee_manager', 'admission_head'].includes(currentUser?.role || '');
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isFaculty = ['faculty', 'teacher', 'hod', 'principal', 'vice_principal'].includes(currentUser?.role || '');
  const isAdmin = activeThread?.myRole === 'admin' || isSuperAdmin;

  const isInputDisabled = activeThread?.type === "group" && (
    (activeThread.sendMessagesPolicy === "admin_only" && !isAdmin) ||
    (activeThread.sendMessagesPolicy === "admin_faculty" && !isAdmin && !isFaculty)
  );

  // -- Layout --
  return (
    <div className="flex h-full w-full bg-background relative overflow-hidden min-h-0">
      {/* Sidebar - hidden on mobile if thread is active */}
      <div 
        className={`${
          activeThread || showBlocked ? "hidden md:flex" : "flex"
        } w-full md:w-[350px] lg:w-[400px] h-full flex-col min-h-0 border-r border-border bg-card shrink-0 relative overflow-hidden`}
      >
        <ChatSidebar
          threads={threads}
          activeThreadId={activeThread?.id || null}
          onSelectThread={(t) => { setActiveThread(t); setIsSending(false); setReplyTo(null); }}
          onNewChat={() => setIsUserModalOpen(true)}
          onNewGroup={() => setIsGroupModalOpen(true)}
          onMarkAllRead={handleMarkAllRead}
          onBulkDelete={handleBulkDelete}
          onBulkMute={handleBulkMute}
          onBulkClear={handleBulkClear}
          onOpenStarredMessages={() => setChatSideView('starred')}
          isLoading={threadsLoading}
          onlineUsers={visibleOnlineUsers}
          onOpenBlockedContacts={() => setShowBlocked(true)}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />

        <AnimatePresence>
          {isUserModalOpen && (
            <NewChatSidebar
              onClose={() => setIsUserModalOpen(false)}
              users={orgUsers}
              currentUserId={currentUserId!}
              onSelectUser={handleSelectUserDM}
              isLoading={usersLoading}
              onNewGroup={() => {
                setIsUserModalOpen(false);
                setIsGroupModalOpen(true);
              }}
            />
          )}
          {isGroupModalOpen && (
            <GroupCreateSidebar
              onClose={() => setIsGroupModalOpen(false)}
              onBack={() => {
                setIsGroupModalOpen(false);
                setIsUserModalOpen(true);
              }}
              users={orgUsers}
              currentUserId={currentUserId!}
              onCreateGroup={handleCreateGroup}
              isLoading={usersLoading}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Main Conversation Panel */}
      <div className={`${!activeThread && !showBlocked ? "hidden lg:flex" : "flex"} flex-1 flex-col min-w-0 min-h-0 h-full overflow-hidden bg-background relative`}>
        {showBlocked && (
          <BlockedContactsView blocked={blocked} onUnblock={unblock} onClose={() => setShowBlocked(false)} />
        )}
        {activeThread ? (
          <>
            <ChatHeader
              thread={activeThread}
              onlineUsers={visibleOnlineUsers}
              isBlocked={isActiveDmBlocked}
              onToggleBlock={activeDmPartnerId ? () => {
                const name = activeThread.name || "this contact";
                if (isActiveDmBlocked) { unblock(activeDmPartnerId, name); return; }
                setConfirmDialog({
                  isOpen: true,
                  title: `Block ${name}?`,
                  description: "They won't see when you're online or your profile updates, and messages they send won't reach you.",
                  warningMessage: "They won't be told that you blocked them. You can unblock anytime from Blocked contacts.",
                  actionLabel: "Block",
                  onConfirm: () => block({ id: activeDmPartnerId, name: activeThread.name || "", email: "", profilePicture: activeThread.avatar || null }),
                });
              } : undefined}
              typingUsers={activeTypingUsers}
              orgUsers={orgUsers}
              searchQuery={chatSearchQuery}
              onSearchChange={setChatSearchQuery}
              isSearchOpen={isSearchOpen}
              onOpenSearch={() => setIsSearchOpen(!isSearchOpen)}
              onBack={() => setActiveThread(null)}
              onAvatarClick={() => {
                if (activeThread.avatar) {
                  setViewingMedia(activeThread.avatar);
                } else {
                  toast.info("No profile picture available");
                }
              }}
              isMuted={activeThread.isMuted}
              onMuteThread={async () => {
                try {
                  const res = await toggleMuteThread(activeThread.id);
                  setActiveThread((prev) => prev ? { ...prev, isMuted: res.isMuted } : null);
                  setThreads((prev) => prev.map((t) => (t.id === activeThread.id ? { ...t, isMuted: res.isMuted } : t)));
                  toast.success(res.isMuted ? "Notifications muted" : "Notifications unmuted");
                } catch (err) {
                  toast.error("Failed to toggle mute");
                }
              }}
              onShowInfo={() => {
                if (activeThread.type === "group" && activeThread.groupId) {
                  setIsGroupSettingsOpen(true);
                } else if (activeThread.type === "dm") {
                  if (activeThread.otherUserId) {
                    setProfileUserId(activeThread.otherUserId);
                  }
                }
              }}
              onClearChat={handleClearChat}
              onDeleteChat={handleDeleteChat}
              onLeaveGroup={() => {
                if (!activeThread?.groupId) return;
                setConfirmDialog({
                  isOpen: true,
                  title: "Leave Group",
                  description: "Are you sure you want to leave this group?",
                  warningMessage: "You will no longer receive messages from this group.",
                  actionLabel: "Leave",
                  onConfirm: () => {
                    exitGroup(activeThread.groupId!).then(() => {
                      toast.success("You left the group");
                      setActiveThread(null);
                      setChatSideView('none');
                      if (window.innerWidth < 1024) { }
                      loadThreads();
                    }).catch((e: any) => toast.error(e?.response?.data?.error || "Failed to leave group"));
                  }
                });
              }}
              onAddMember={() => {
                setIsAddMemberOpen(true);
                setIsGroupSettingsOpen(true);
              }}
              onOpenStarredMessages={() => setChatSideView('starred')}
              onOpenScheduledMessages={() => setChatSideView('scheduled')}
              onOpenDisappearingModal={() => setIsDisappearingModalOpen(true)}
              onEnterSelectionMode={() => setIsSelectionMode(true)}
            />
            
            {/* Pinned Messages Banner */}
            {(() => {
              const now = new Date().getTime();
              const pinnedMessages = messages.filter(m => {
                if (!m.is_pinned || m.is_deleted) return false;
                if (m.pinned_until && new Date(m.pinned_until).getTime() < now) return false;
                return true;
              });
              
              if (pinnedMessages.length === 0) return null;
              const topPinned = pinnedMessages[pinnedMessages.length - 1]; // most recent
              
              return (
                <div 
                  onClick={() => {
                    const el = document.getElementById(`msg-${topPinned.id}`);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      el.classList.add('bg-amber-500/10', 'dark:bg-amber-500/20', 'transition-colors', 'duration-500', 'rounded-lg');
                      setTimeout(() => {
                        el.classList.remove('bg-amber-500/10', 'dark:bg-amber-500/20');
                      }, 2000);
                    }
                  }}
                  className="flex items-center gap-3 px-4 py-2 bg-card border-b border-border/50 cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <div className="text-amber-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="17" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-500">Pinned Message</span>
                    <span className="text-[13px] text-foreground truncate">
                      {topPinned.message 
                        ? new DOMParser().parseFromString(String(topPinned.message), 'text/html').body.textContent?.trim() || "Message" 
                        : "Attachment"}
                    </span>
                  </div>
                </div>
              );
            })()}

            <ChatConversation
              thread={activeThread}
              messages={messages}
              searchQuery={chatSearchQuery}
              currentUserId={currentUserId!}
              isLoading={messagesLoading}
              hasMore={hasMoreMessages}
              onLoadMore={handleLoadMore}
              onReply={setReplyTo}
              canReply={!isInputDisabled}
              onStar={handleStarMessage}
              onPin={handlePinMessage}
              onDelete={(id) => {
                const msg = messages.find(m => m.id === id);
                if (msg) setMessagesToDelete([msg]);
              }}
              onEdit={async (id, text) => {
                try {
                  await editMessage(activeThread.id, id, text);
                  setMessages(prev => prev.map(m => m.id === id ? { ...m, message: text } : m));
                } catch {
                  toast.error("Failed to edit");
                }
              }}
              onReact={async (id, emoji) => {
                // Optimistic UI Update
                setMessages(prev => prev.map(m => {
                  if (m.id === id) {
                    const currentReacts = { ...(m.reactions || {}) };
                    let users = currentReacts[emoji] ? [...currentReacts[emoji]] : [];
                    const myReactIdx = users.findIndex(u => u.id === currentUserId);
                    if (myReactIdx > -1) {
                      users.splice(myReactIdx, 1);
                    } else {
                      users.push({ id: currentUserId!, name: 'You' });
                    }
                    if (users.length === 0) {
                      delete currentReacts[emoji];
                    } else {
                      currentReacts[emoji] = users;
                    }
                    return { ...m, reactions: currentReacts };
                  }
                  return m;
                }));

                try {
                  const newReacts = await toggleReaction(activeThread.id, id, emoji);
                  // Sync exact state from server in background
                  setMessages(prev => prev.map(m => m.id === id ? { ...m, reactions: newReacts } : m));
                } catch {
                  toast.error("Failed to react");
                }
              }}
              onUserClick={(userId) => setProfileUserId(userId)}
              orgUsers={orgUsers}
              onViewMedia={(attachment) => setViewingMedia(attachment)}
              typingUsers={activeTypingUsers}
              polls={polls}
              onVotePoll={handleVotePoll}
              onViewVotes={(pollId) => setViewVotesPollId(pollId)}
              onForward={(id) => {
                setSelectedMessageIds(new Set([id]));
                setIsForwardModalOpen(true);
              }}
              isSelectionMode={isSelectionMode}
              selectedMessageIds={selectedMessageIds}
              onToggleMessageSelection={(id) => {
                setIsSelectionMode(true);
                setSelectedMessageIds(prev => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                });
              }}
              amIAdmin={activeThread.myRole === 'admin'}
              onApprove={handleApprove}
              onReject={handleReject}
              onAcknowledge={handleAcknowledge}
            />

            {isSelectionMode ? (
              <SelectionActionBar
                selectedCount={selectedMessageIds.size}
                onCancel={() => {
                  setIsSelectionMode(false);
                  setSelectedMessageIds(new Set());
                }}
                onAction={async (action) => {
                  if (selectedMessageIds.size === 0) return;
                  if (action === "delete") {
                    const msgs = messages.filter(m => selectedMessageIds.has(m.id));
                    setMessagesToDelete(msgs);
                    // The modal will clear selection on close or confirm
                    setSelectedMessageIds(new Set());
                    setIsSelectionMode(false);
                  } else if (action === "star") {
                    for (const msgId of Array.from(selectedMessageIds)) {
                      handleStarMessage(msgId);
                    }
                    setIsSelectionMode(false);
                    setSelectedMessageIds(new Set());
                  } else if (action === "copy") {
                    const texts = messages.filter(m => selectedMessageIds.has(m.id)).map(m => m.message).filter(Boolean);
                    navigator.clipboard.writeText(texts.join("\n"));
                    toast.success("Messages copied to clipboard");
                  } else if (action === "forward") {
                    setIsForwardModalOpen(true);
                  } else {
                    toast.info(`${action} is not fully implemented yet`);
                  }
                }}
              />
            ) : isActiveDmBlocked ? (
              <div className="p-4 bg-background border-t border-border flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                You blocked this contact.
                <button
                  onClick={() => activeDmPartnerId && unblock(activeDmPartnerId, activeThread?.name)}
                  className="font-medium text-foreground underline underline-offset-2 hover:opacity-80"
                >
                  Unblock
                </button>
              </div>
            ) : isInputDisabled ? (
              <div className="p-4 bg-background border-t border-border flex items-center justify-center text-sm text-muted-foreground">
                Only {activeThread?.sendMessagesPolicy === 'admin_faculty' ? 'admins and faculty' : 'admins'} can send messages
              </div>
            ) : (
              <ChatInput
                onSendMessage={handleSendMessage}
                isSending={isSending}
                replyTo={replyTo}
                onCancelReply={() => setReplyTo(null)}
                onTyping={(isTyping, type) => {
                  // No typing indicator to anyone on either side of a block
                  if (activeDmPartnerId && hiddenIds.has(activeDmPartnerId)) return;
                  sendTyping && sendTyping(isTyping, type);
                }}
                onOpenPollModal={() => setIsPollModalOpen(true)}
                canSchedule={true}
                currentUserId={currentUserId}
                orgUsers={orgUsers}
                thread={activeThread}
              />
            )}

            {/* Side Views (Sliding Over Chat Content) */}
            <div 
              className={`absolute inset-0 top-[60px] bg-background z-30 transition-transform duration-300 ease-in-out ${
                chatSideView !== 'none' ? 'translate-x-0' : '-translate-x-full'
              }`}
            >
              {chatSideView === 'starred' && (
                <StarredMessagesView onClose={() => setChatSideView('none')} threadId={activeThread.id} />
              )}
              {chatSideView === 'scheduled' && (
                <ScheduledMessagesView onClose={() => setChatSideView('none')} threadId={activeThread.id} />
              )}
            </div>
          </>
        ) : (
          <div className="hidden lg:flex flex-1 flex-col items-center justify-center text-center p-8 bg-background relative overflow-hidden">
            <style>{`
              @keyframes cg-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
              @keyframes cg-grid-in { from { opacity: 0; } to { opacity: 1; } }
            `}</style>
            {/* Dot grid (a nod to "grid"), fading out from the centre */}
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none text-black/[0.22] dark:text-white/[0.3] motion-safe:animate-[cg-grid-in_1.2s_ease-out]"
              style={{
                backgroundImage: "radial-gradient(currentColor 1.5px, transparent 1.5px)",
                backgroundSize: "24px 24px",
                maskImage: "radial-gradient(ellipse at center, black 25%, transparent 72%)",
                WebkitMaskImage: "radial-gradient(ellipse at center, black 25%, transparent 72%)",
              }}
            />

            <div className="relative flex flex-col items-center">
              {/* Classgrid grid logo in black (white in dark mode) on a softly floating tile */}
              <div className="motion-safe:animate-[cg-float_6s_ease-in-out_infinite]">
                <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-black/10 bg-background shadow-[0_12px_40px_-12px_rgba(0,0,0,0.25)] dark:border-white/15 dark:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.9)]">
                  <img src="/logo.png" alt="Classgrid" className="h-14 w-14 object-contain brightness-0 dark:invert" draggable={false} />
                </div>
              </div>

              <h2 className="mt-8 text-[26px] font-semibold tracking-tight text-foreground">
                Pick up where you left off
              </h2>
              <p className="mt-3 max-w-[400px] text-[15px] leading-relaxed text-muted-foreground">
                Choose a conversation on the left, or start a new one. Everything stays in sync on every device.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
                {[
                  { icon: Zap, label: "Instant" },
                  { icon: Paperclip, label: "Files & media" },
                  { icon: Users, label: "Groups" },
                ].map(({ icon: Icon, label }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-background px-3.5 py-1.5 text-[13px] font-medium text-foreground dark:border-white/15"
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Message Modal */}
      {messagesToDelete.length > 0 && (
        <DeleteMessageModal
          messages={messagesToDelete}
          isOpen={messagesToDelete.length > 0}
          onClose={() => setMessagesToDelete([])}
          onDelete={confirmDeleteMessages}
          currentUserId={currentUserId!}
        />
      )}
      {pinningMessageId && (
        <PinDurationModal
          onClose={() => setPinningMessageId(null)}
          onSave={submitPin}
          isPending={isPinning}
        />
      )}

      {/* Modals */}
      {isGroupSettingsOpen && activeThread?.type === "group" && activeThread.groupId && (
        <Suspense fallback={null}>
          <GroupSettingsModal 
            groupId={activeThread.groupId} 
            onClose={() => {
              setIsGroupSettingsOpen(false);
              setIsAddMemberOpen(false);
            }}
            onLeaveGroup={() => {
              setIsGroupSettingsOpen(false);
              setActiveThread(null);
            }}
            initialShowAddMember={isAddMemberOpen}
            onUserClick={(userId) => setProfileUserId(userId)}
          />
        </Suspense>
      )}

      {isPollModalOpen && activeThread && (
        <CreatePollModal
          threadId={activeThread.id}
          onClose={() => setIsPollModalOpen(false)}
        />
      )}

      {isDisappearingModalOpen && activeThread && (
        <DisappearingMessagesModal
          threadId={activeThread.id}
          currentTtl={activeThread.messageTtl || 0}
          onSaved={(ttl) => {
            setActiveThread((prev) => prev ? { ...prev, messageTtl: ttl } : null);
            setThreads((prev) => prev.map((t) => t.id === activeThread.id ? { ...t, messageTtl: ttl } : t));
          }}
          onClose={() => setIsDisappearingModalOpen(false)}
        />
      )}

      <ForwardMessageModal
        isOpen={isForwardModalOpen}
        onClose={() => setIsForwardModalOpen(false)}
        threads={threads}
        selectedMessageIds={Array.from(selectedMessageIds)}
        onForward={handleForwardMessages}
      />

      {viewVotesPollId && activeThread && (
        <ViewPollVotesModal
          isOpen={true}
          onClose={() => setViewVotesPollId(null)}
          poll={polls.find(p => p.id === viewVotesPollId) || null}
          threadOrGroupId={activeThread.id}
          isGroup={activeThread.type === 'group'}
          orgUsers={orgUsers}
        />
      )}

      {!!viewingMedia && (
        <FilePreviewModal 
          file={
            typeof viewingMedia === "string"
              ? { src: viewingMedia, name: "Photo" }
              : { src: viewingMedia.file_url, name: viewingMedia.file_name, mimeType: viewingMedia.file_type }
          } 
          onClose={() => setViewingMedia(null)} 
        />
      )}
      
      {/* Full Screen Shared Profile View */}
      {!!profileUserId && (() => {
        const selectedUserForProfile = orgUsers.find(u => u._id === profileUserId);
        // Contacts still loading: the profile's shape as a skeleton (it opens as soon as they arrive)
        if (!selectedUserForProfile) return (
          <div className="absolute inset-0 z-50 bg-background overflow-y-auto animate-in fade-in duration-200">
            <Skeleton className="h-40 w-full rounded-none" />
            <div className="px-6 -mt-12 flex flex-col gap-3">
              <Skeleton className="w-24 h-24 rounded-full border-4 border-background" />
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-72 max-w-full mt-2" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </div>
          </div>
        );
        return (
          <div className="absolute inset-0 z-50 bg-background overflow-y-auto animate-in fade-in duration-200">
            <Suspense fallback={null}>
              <SharedProfilePage 
                publicUser={{
                  _id: selectedUserForProfile._id,
                  name: selectedUserForProfile.name,
                  phoneNumber: selectedUserForProfile.phoneNumber || "",
                  email: selectedUserForProfile.email,
                  role: selectedUserForProfile.role,
                  profilePicture: selectedUserForProfile.profilePicture || selectedUserForProfile.photoURL || "",
                  profileBanner: selectedUserForProfile.profileBanner || "",
                  prn: selectedUserForProfile.prn,
                  bio: selectedUserForProfile.bio,
                  organization_name: selectedUserForProfile.organization_name,
                  organization_logo: selectedUserForProfile.organization_logo,
                  metadata: selectedUserForProfile.metadata,
                  forumUsername: selectedUserForProfile.forumUsername,
                  lastLoginAt: selectedUserForProfile.lastLoginAt,
                  hobby: (selectedUserForProfile as any).hobby || null,
                }}
                onClose={() => setProfileUserId(null)} 
              />
            </Suspense>
          </div>
        );
      })()}

      <DangerConfirmDialog
        open={confirmDialog.isOpen}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, isOpen: open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        warningMessage={confirmDialog.warningMessage}
        actionLabel={confirmDialog.actionLabel}
        onConfirm={() => {
          confirmDialog.onConfirm();
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }}
      />
    </div>
  );
}

export function ChatPage() {
  return (
    <UploadProvider>
      <ChatPageInner />
    </UploadProvider>
  );
}
