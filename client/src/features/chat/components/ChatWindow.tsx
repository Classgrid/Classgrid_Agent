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

import { useLayoutEffect, useRef, useMemo, useEffect, useState } from "react";
import { useQueryClient, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Spinner } from "@/components/marketing_ui/spinner";
import { ChatBubble } from "./ChatBubble";
import { ChatInput } from "./ChatInput";
import { fetchMessages, sendMessage, sendMessageWithAttachments, deleteMessage, bulkDeleteMessages, editMessage, toggleReaction, markThreadRead, fetchGroupInfo, fetchGroupPolls, votePoll, pinMessage, approveMessage, rejectMessage, acknowledgeMessage, toggleThreadReplies, type ChatMessage, type ChatThread, type Poll } from "../services/chatApi";
import { useThreadChannel } from "../hooks/useRealtimeChat";
import { lazy, Suspense } from "react";
const GroupSettingsModal = lazy(() => import("./GroupSettingsModal").then(module => ({ default: module.GroupSettingsModal })));
import { CreatePollModal } from "./CreatePollModal";
import { DeleteMessageModal } from "./DeleteMessageModal";
import { SearchMessagesSidebar } from "./SearchMessagesSidebar";
import { StarredMessagesView } from "./StarredMessagesView";
import { ScheduledMessagesView } from "./ScheduledMessagesView";
import { PinDurationModal } from "./PinDurationModal";
import { toast } from "sonner";
import { useUploadContext } from "../context/UploadContext";
import { RefreshCw } from "lucide-react";

interface ChatWindowProps {
  thread: ChatThread;
  currentUserId: string;
  orgUsers?: OrgUser[];
}

export function ChatWindow({ thread, currentUserId, orgUsers }: ChatWindowProps) {
  const threadId = thread.id;
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevHeightRef = useRef<number>(0);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const isFirstLoad = useRef(true);

  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreatePollOpen, setIsCreatePollOpen] = useState(false);
  const [isStarredMessagesOpen, setIsStarredMessagesOpen] = useState(false);
  const [isScheduledMessagesOpen, setIsScheduledMessagesOpen] = useState(false);
  const [pinningMessageId, setPinningMessageId] = useState<string | null>(null);
  const [isPinning, setIsPinning] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<ChatMessage | null>(null);

  // Fetch group info to get permissions and role
  const { data: groupInfo } = useQuery({
    queryKey: ["group-info", thread.groupId],
    queryFn: () => fetchGroupInfo(thread.groupId!),
    enabled: !!thread.groupId && thread.type === "group",
  });

  const isAnnouncementMode = groupInfo?.group?.permissions?.send_messages === "admin_only" || thread.sendMessagesPolicy === "admin_only";
  const amIMember = groupInfo?.myRole === "member";
  const isInputDisabled = (isAnnouncementMode || thread.allowReplies === false) && amIMember;
  let disabledReason = isInputDisabled ? "Only admins can send messages." : undefined;

  if (thread.allowReplies === false && amIMember) {
    disabledReason = "Replies are disabled for this thread. Only admins can send messages.";
  }

  // Fetch group polls if group
  const { data: polls } = useQuery({
    queryKey: ["group-polls", thread.groupId],
    queryFn: () => fetchGroupPolls(thread.groupId!),
    enabled: !!thread.groupId && thread.type === "group",
  });

  const [typingUsers, setTypingUsers] = useState<Record<string, { timeout: NodeJS.Timeout, type: string }>>({});
  const [isSending, setIsSending] = useState(false);

  const channelRef = useThreadChannel(threadId, currentUserId, {
    onNewMessage: (payload) => {
      // Instantly append to React Query cache without refetching
      queryClient.setQueryData(["chat-messages", threadId], (oldData: any) => {
        if (!oldData || !oldData.pages) return oldData;
        const newPages = [...oldData.pages];
        if (newPages.length > 0) {
          // Check if message already exists (optimistic update protection)
          const exists = newPages.some(page => page.some((m: ChatMessage) => m.id === payload.id));
          if (!exists) {
            newPages[0] = [...newPages[0], payload]; // append to the end of the newest page
          }
        }
        return { ...oldData, pages: newPages };
      });

      // Clear typing indicator for this user
      if (payload.sender_id !== currentUserId) {
        setTypingUsers(prev => {
          const next = new Set(prev);
          next.delete(payload.sender_id);
          return next;
        });
      }

      // Auto-scroll to bottom if near bottom
      if (isNearBottom && scrollRef.current) {
        setTimeout(() => {
          if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }, 100);
      }
    },
    onTyping: (payload) => {
      if (payload.userId !== currentUserId) {
        setTypingUsers(prev => {
          const next = { ...prev };

          if (payload.isTyping === false) {
            if (next[payload.userId]?.timeout) {
              clearTimeout(next[payload.userId].timeout);
            }
            delete next[payload.userId];
          } else {
            if (next[payload.userId]?.timeout) {
              clearTimeout(next[payload.userId].timeout);
            }
            // Give recording 1 hour before auto-clear, uploading 1 minute, typing 3 seconds
            const duration = payload.activityType === 'recording' ? 3600000 : payload.activityType === 'uploading' ? 60000 : 3000;
            const timeout = setTimeout(() => {
              setTypingUsers(current => {
                const updated = { ...current };
                delete updated[payload.userId];
                return updated;
              });
            }, duration);

            next[payload.userId] = { timeout, type: payload.activityType || 'typing' };
          }

          return next;
        });
      }
    },
    onMessageDeleted: (payload) => {
      // Handle both single delete and bulk delete events
      const deletedIds: string[] = payload.messageIds || (payload.messageId ? [payload.messageId] : []);
      if (deletedIds.length === 0) return;

      queryClient.setQueryData(["chat-messages", threadId], (oldData: any) => {
        if (!oldData || !oldData.pages) return oldData;
        const idSet = new Set(deletedIds);
        const newPages = oldData.pages.map((page: ChatMessage[]) =>
          page.map(m => idSet.has(m.id) ? { ...m, is_deleted: true, message: 'This message was deleted' } : m)
        );
        return { ...oldData, pages: newPages };
      });
    },
    onReactionUpdate: (payload) => {
      queryClient.setQueryData(["chat-messages", threadId], (oldData: any) => {
        if (!oldData || !oldData.pages) return oldData;
        const newPages = oldData.pages.map((page: ChatMessage[]) =>
          page.map(m => m.id === payload.messageId ? { ...m, reactions: payload.reactions } : m)
        );
        return { ...oldData, pages: newPages };
      });
    },
    onReadReceipt: (payload) => {
      if (payload.userId !== currentUserId) {
        queryClient.setQueryData(["chat-messages", threadId], (oldData: any) => {
          if (!oldData || !oldData.pages) return oldData;
          const newPages = oldData.pages.map((page: ChatMessage[]) =>
            page.map(m => {
              if (m.sender_id === currentUserId && !m.isSeen && new Date(m.created_at) <= new Date(payload.lastReadAt)) {
                return { ...m, isSeen: true };
              }
              return m;
            })
          );
          return { ...oldData, pages: newPages };
        });
      }
    },
    onNewPoll: (payload) => {
      if (thread.groupId) {
        queryClient.setQueryData(["group-polls", thread.groupId], (oldPolls: Poll[] = []) => {
          return [payload.poll, ...oldPolls];
        });
      }
    },
    onPollVote: (payload) => {
      if (thread.groupId) {
        queryClient.setQueryData(["group-polls", thread.groupId], (oldPolls: Poll[] = []) => {
          return oldPolls.map(p =>
            p.id === payload.pollId
              ? { ...p, voteCounts: payload.voteCounts, totalVoters: payload.totalVoters }
              : p
          );
        });
      }
    }
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError
  } = useInfiniteQuery({
    queryKey: ["chat-messages", threadId],
    queryFn: ({ pageParam }) => fetchMessages(threadId, pageParam as string | undefined),
    getNextPageParam: (lastPage) => {
      // The backend returns messages in chronological order (oldest first in the array)
      // The limit is 50 per page. If we receive 50, we assume there might be more.
      // The 'before' cursor should be the created_at of the oldest message in this batch (index 0).
      if (lastPage.length === 50) {
        return lastPage[0].created_at;
      }
      return undefined;
    },
    initialPageParam: undefined,
  });

  // Flatten and reverse pages to get true chronological order for the entire history
  const allMessages = useMemo(() => {
    if (!data) return [];
    // Pages are fetched: [page1(newest), page2(older), ...]
    // Reverse to: [page2(older), page1(newest)]
    // FlatMap gives: [oldest...newest] overall
    return [...data.pages].reverse().flatMap((page) => page);
  }, [data]);

  // Handle scroll events for infinite loading and near-bottom detection
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;

    // Check if near bottom
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setIsNearBottom(distanceFromBottom < 150); // increased threshold slightly

    // Hit top -> load more older messages
    if (scrollTop === 0 && hasNextPage && !isFetchingNextPage) {
      prevHeightRef.current = scrollHeight;
      fetchNextPage();
    }
  };

  const { uploads, startUpload, retryUpload, clearUpload } = useUploadContext();
  const threadUploads = uploads[threadId] || [];

  const handleSendMessage = async (text: string, files: File[], options?: { scheduledFor?: string; isSilent?: boolean; priority?: string; expiresAt?: string }) => {
    if (!text.trim() && files.length === 0) return;

    // Scheduled messages: no optimistic UI, just send normally
    if (options?.scheduledFor) {
      if (files.length > 0) setIsSending(true);
      try {
        await sendMessage(threadId, text, files, replyTo, options);
        setReplyTo(null);
        alert("Message scheduled successfully!");
      } catch (error) {
        console.error("Failed to schedule message", error);
        alert("Failed to schedule message.");
      } finally {
        setIsSending(false);
      }
      return;
    }

    // Text-only: optimistic update + instant send (no upload manager needed)
    if (files.length === 0) {
      const tempId = `temp-${Date.now()}`;
      const now = new Date().toISOString();
      const tempMessage: ChatMessage = {
        id: tempId, thread_id: threadId, sender_id: currentUserId,
        sender_name: "You", user_avatar: null, message: text,
        reply_to: replyTo ? { id: replyTo.id, sender_name: replyTo.sender_name, message: replyTo.message } : null,
        is_deleted: false, created_at: now, attachments: [], reactions: {},
        _clientKey: tempId
      } as any;
      queryClient.setQueryData(["chat-messages", threadId], (oldData: any) => {
        if (!oldData?.pages) return oldData;
        const newPages = [...oldData.pages];
        if (newPages.length > 0) newPages[0] = [tempMessage, ...newPages[0]];
        return { ...oldData, pages: newPages };
      });
      try {
        const sentMsg = await sendMessage(threadId, text, [], replyTo, options);
        setReplyTo(null);
        queryClient.setQueryData(["chat-messages", threadId], (oldData: any) => {
          if (!oldData?.pages) return oldData;
          return { ...oldData, pages: oldData.pages.map((page: ChatMessage[]) => page.map(m => m.id === tempId ? { ...sentMsg, _clientKey: tempId } : m)) };
        });
        if (scrollRef.current) setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, 50);
      } catch (error) {
        queryClient.setQueryData(["chat-messages", threadId], (oldData: any) => {
          if (!oldData?.pages) return oldData;
          return { ...oldData, pages: oldData.pages.map((page: ChatMessage[]) => page.filter(m => m.id !== tempId)) };
        });
        toast.error("Failed to send message");
      }
      return;
    }

    // File upload: use global UploadContext so upload persists when switching chats!
    const tempId = `temp-${Date.now()}`;
    const now = new Date().toISOString();
    const savedReplyTo = replyTo;
    setReplyTo(null);

    // Optimistic message in chat with local object URLs for instant preview
    const tempMessage: ChatMessage = {
      id: tempId, thread_id: threadId, sender_id: currentUserId,
      sender_name: "You", user_avatar: null, message: text,
      reply_to: savedReplyTo ? { id: savedReplyTo.id, sender_name: savedReplyTo.sender_name, message: savedReplyTo.message } : null,
      is_deleted: false, created_at: now,
      attachments: files.map((f, i) => ({
        id: `temp-att-${i}`, message_id: tempId,
        file_url: URL.createObjectURL(f),
        file_name: f.name, file_type: f.type, file_size: f.size
      })),
      reactions: {},
      _uploading: true, // flag so ChatBubble can show progress
    } as any;

    queryClient.setQueryData(["chat-messages", threadId], (oldData: any) => {
      if (!oldData?.pages) return oldData;
      const newPages = [...oldData.pages];
      if (newPages.length > 0) newPages[0] = [tempMessage, ...newPages[0]];
      return { ...oldData, pages: newPages };
    });

    if (scrollRef.current) setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, 50);

    // Hand off to global upload manager — continues even if user switches chats
    startUpload(
      threadId, tempId, files, text, savedReplyTo, options,
      // onDone — called when all files are uploaded
      async (preuploadedAttachments) => {
        try {
          const sentMsg = await sendMessageWithAttachments(threadId, text, preuploadedAttachments, savedReplyTo, options);
          // Replace temp message with real server message
          queryClient.setQueryData(["chat-messages", threadId], (oldData: any) => {
            if (!oldData?.pages) return oldData;
            return { ...oldData, pages: oldData.pages.map((page: ChatMessage[]) => page.map(m => m.id === tempId ? sentMsg : m)) };
          });
          clearUpload(threadId, tempId);
        } catch (err) {
          toast.error("Upload succeeded but failed to save message. Please retry.");
        }
      },
      // onFail — called when upload fails
      (failedTempId, errMsg) => {
        // Mark the optimistic message as failed (keeps it visible with a Retry button)
        queryClient.setQueryData(["chat-messages", threadId], (oldData: any) => {
          if (!oldData?.pages) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page: ChatMessage[]) =>
              page.map(m => m.id === failedTempId ? { ...m, _uploadFailed: true, _uploading: false } as any : m)
            )
          };
        });
      }
    );
  };

  const handleDeleteMessage = (msgId: string) => {
    const msg = allMessages.find((m) => m.id === msgId);
    if (msg) {
      setMessageToDelete(msg);
    }
  };

  const confirmDeleteMessage = async (msgIds: string[], type: 'me' | 'everyone') => {
    // Optimistic update — INSTANT UI response (no waiting for API)
    queryClient.setQueryData(["chat-messages", threadId], (oldData: any) => {
      if (!oldData || !oldData.pages) return oldData;
      const newPages = oldData.pages.map((page: ChatMessage[]) =>
        page.map(m => {
          if (msgIds.includes(m.id)) {
            // Both "delete for me" and "delete for everyone" show placeholder instantly
            return { ...m, is_deleted: true, message: 'This message was deleted', attachments: [] };
          }
          return m;
        })
      );
      return { ...oldData, pages: newPages };
    });

    // Show success toast immediately (optimistic)
    toast.success(msgIds.length === 1 ? "Message deleted" : `${msgIds.length} messages deleted`);

    try {
      const result = await bulkDeleteMessages(threadId, msgIds, type);
      if (result.failed > 0 && type === 'everyone') {
        queryClient.invalidateQueries({ queryKey: ["chat-messages", threadId] });
        toast.error(`${result.failed} message(s) could not be deleted for everyone (already seen).`);
      }
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 404) {
        console.warn("Messages already deleted from database");
        return;
      }
      console.error("Failed to delete message(s)", error);
      queryClient.invalidateQueries({ queryKey: ["chat-messages", threadId] });
      toast.error("Failed to delete some messages");
    }
  };

  const handleEditMessage = async (msgId: string, newText: string) => {
    // Optimistic update
    queryClient.setQueryData(["chat-messages", threadId], (oldData: any) => {
      if (!oldData || !oldData.pages) return oldData;
      const newPages = oldData.pages.map((page: ChatMessage[]) =>
        page.map(m => m.id === msgId ? { ...m, message: newText, is_edited: true } : m)
      );
      return { ...oldData, pages: newPages };
    });
    try {
      await editMessage(threadId, msgId, newText);
    } catch (error) {
      console.error("Failed to edit message", error);
    }
  };

  const handleReact = async (msgId: string, emoji: string) => {
    try {
      const newReactions = await toggleReaction(threadId, msgId, emoji);
      queryClient.setQueryData(["chat-messages", threadId], (oldData: any) => {
        if (!oldData || !oldData.pages) return oldData;
        const newPages = oldData.pages.map((page: ChatMessage[]) =>
          page.map(m => m.id === msgId ? { ...m, reactions: newReactions } : m)
        );
        return { ...oldData, pages: newPages };
      });
    } catch (error) {
      console.error("Failed to toggle reaction", error);
    }
  };

  const handleVotePoll = async (pollId: string, optionId: string) => {
    if (!thread.groupId) return;
    try {
      // The websocket will broadcast the updated vote counts and replace them in the cache.
      // But we call votePoll to register the vote in the DB.
      await votePoll(thread.groupId, pollId, optionId);

      // Optimistic update for UI responsiveness
      queryClient.setQueryData(["group-polls", thread.groupId], (oldPolls: Poll[] = []) => {
        return oldPolls.map(p => {
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
            // Remove previous vote if any
            if (newMyVotes.length > 0) {
              const oldVote = newMyVotes[0];
              if (oldVote !== optionId) {
                newVoteCounts[oldVote] = Math.max(0, (newVoteCounts[oldVote] || 0) - 1);
              }
            }
            newMyVotes = [optionId];
            if (!p.myVotes.includes(optionId)) {
              newVoteCounts[optionId] = (newVoteCounts[optionId] || 0) + 1;
            }
          }

          // Total voters might be slightly off during optimistic update if it's their first vote ever, 
          // but the websocket will correct it instantly.

          return {
            ...p,
            myVotes: newMyVotes,
            voteCounts: newVoteCounts
          };
        });
      });

    } catch (error) {
      console.error("Failed to vote", error);
    }
  };

  const handlePinMessage = async (msgId: string, isPinned: boolean) => {
    if (isPinned) {
      setPinningMessageId(msgId);
    } else {
      try {
        await pinMessage(threadId, msgId, false);
        queryClient.setQueryData(["chat-messages", threadId], (oldData: any) => {
          if (!oldData || !oldData.pages) return oldData;
          const newPages = oldData.pages.map((page: ChatMessage[]) =>
            page.map(m => m.id === msgId ? { ...m, is_pinned: false, pinned_until: null } : m)
          );
          return { ...oldData, pages: newPages };
        });
      } catch (error) {
        console.error("Failed to unpin message", error);
      }
    }
  };

  const submitPin = async (durationHours: number) => {
    if (!pinningMessageId) return;
    setIsPinning(true);
    try {
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() + durationHours);

      await pinMessage(threadId, pinningMessageId, true, durationHours);
      queryClient.setQueryData(["chat-messages", threadId], (oldData: any) => {
        if (!oldData || !oldData.pages) return oldData;
        const newPages = oldData.pages.map((page: ChatMessage[]) =>
          page.map(m => m.id === pinningMessageId
            ? { ...m, is_pinned: true, pinned_until: expirationDate.toISOString() }
            : { ...m, is_pinned: false, pinned_until: null }
          )
        );
        return { ...oldData, pages: newPages };
      });
      setPinningMessageId(null);
    } catch (error) {
      console.error("Failed to pin message", error);
    } finally {
      setIsPinning(false);
    }
  };

  const handleApproveMessage = async (msgId: string) => {
    try {
      await approveMessage(threadId, msgId);
      queryClient.setQueryData(["chat-messages", threadId], (oldData: any) => {
        if (!oldData || !oldData.pages) return oldData;
        const newPages = oldData.pages.map((page: ChatMessage[]) =>
          page.map(m => m.id === msgId ? { ...m, status: 'approved' } : m)
        );
        return { ...oldData, pages: newPages };
      });
    } catch (error) {
      console.error("Failed to approve message", error);
    }
  };

  const handleRejectMessage = async (msgId: string) => {
    try {
      await rejectMessage(threadId, msgId);
      queryClient.setQueryData(["chat-messages", threadId], (oldData: any) => {
        if (!oldData || !oldData.pages) return oldData;
        const newPages = oldData.pages.map((page: ChatMessage[]) =>
          page.map(m => m.id === msgId ? { ...m, status: 'rejected' } : m)
        );
        return { ...oldData, pages: newPages };
      });
    } catch (error) {
      console.error("Failed to reject message", error);
    }
  };

  const handleAcknowledgeMessage = async (msgId: string) => {
    try {
      await acknowledgeMessage(threadId, msgId);
      queryClient.setQueryData(["chat-messages", threadId], (oldData: any) => {
        if (!oldData || !oldData.pages) return oldData;
        const newPages = oldData.pages.map((page: ChatMessage[]) =>
          page.map(m => m.id === msgId ? {
            ...m,
            acknowledgements: [...(m.acknowledgements || []), { user_id: currentUserId, user_name: 'You' }]
          } : m)
        );
        return { ...oldData, pages: newPages };
      });
    } catch (error) {
      console.error("Failed to acknowledge message", error);
    }
  };

  const handleToggleReplies = async () => {
    try {
      const newAllowReplies = thread.allowReplies === false ? true : false;
      await toggleThreadReplies(threadId, newAllowReplies);
      queryClient.setQueryData(["chat-threads", "list"], (oldData: any) => {
        if (!oldData || !oldData.threads) return oldData;
        const newThreads = oldData.threads.map((t: ChatThread) =>
          t.id === threadId ? { ...t, allowReplies: newAllowReplies } : t
        );
        return { ...oldData, threads: newThreads };
      });
      // Also update active thread if stored
      queryClient.setQueryData(["active-thread"], (old: any) => {
        if (old && old.id === threadId) {
          return { ...old, allowReplies: newAllowReplies };
        }
        return old;
      });
    } catch (error) {
      console.error("Failed to toggle replies", error);
    }
  };

  // Handle read receipts
  useEffect(() => {
    const handleFocus = () => {
      markThreadRead(threadId).catch(console.error);
    };

    // Mark read initially when window mounts
    handleFocus();

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [threadId]);

  // Maintain scroll position when older messages are prepended
  useLayoutEffect(() => {
    if (prevHeightRef.current > 0 && scrollRef.current) {
      const newHeight = scrollRef.current.scrollHeight;
      scrollRef.current.scrollTop = newHeight - prevHeightRef.current;
      prevHeightRef.current = 0;
    }
  }, [allMessages.length]);

  // Scroll to bottom on initial load
  useLayoutEffect(() => {
    if (isFirstLoad.current && allMessages.length > 0 && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      isFirstLoad.current = false;
    }
  }, [allMessages]);

  if (isError) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <p className="text-red-500 text-sm">Failed to load conversation history.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full relative bg-background">
      {/* Header for GroupSettingsModal Trigger */}
      <div
        className="flex items-center gap-3 p-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => {
          if (thread.type === 'group') setIsSettingsOpen(true);
        }}
      >
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold overflow-hidden shrink-0">
          {thread.avatar ? (
            <img src={thread.avatar} alt={thread.name} className="w-full h-full object-cover" />
          ) : (
            thread.name[0]?.toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold truncate">{thread.name}</h2>
          <p className="text-xs text-muted-foreground truncate">
            {thread.type === 'group' ? 'Click to view settings' : 'Direct Message'}
          </p>
        </div>
      </div>

      {/* Pinned Messages Banner */}
      {(() => {
        const now = new Date().getTime();
        const pinnedMessages = allMessages.filter(m => {
          if (!m.is_pinned || m.is_deleted) return false;
          if (m.pinned_until && new Date(m.pinned_until).getTime() < now) return false;
          return true;
        });
        if (pinnedMessages.length === 0) return null;
        const topPinned = pinnedMessages[pinnedMessages.length - 1]; // most recently pinned or latest message
        return (
          <div
            className="flex items-center gap-3 px-4 py-2 bg-background border-b border-border shadow-sm shrink-0 cursor-pointer hover:bg-muted/30 transition-colors"
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
          >
            <div className="text-amber-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pin"><line x1="12" x2="12" y1="17" y2="22" /><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" /></svg>
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

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 p-4 bg-muted/20 relative custom-scrollbar flex flex-col"
      >
        {/* Loading indicator at top when fetching older messages */}
        {isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <Spinner className="w-5 h-5 text-muted-foreground" />
          </div>
        )}

        {/* Initial Loading */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <Spinner className="w-8 h-8 text-muted-foreground" />
          </div>
        )}

        {/* Start of conversation indicator */}
        {!hasNextPage && allMessages.length > 0 && !isLoading && (
          <div className="text-center py-6 text-xs text-muted-foreground">
            This is the start of your conversation
          </div>
        )}

        {/* Empty State */}
        {allMessages.length === 0 && !isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70 my-auto">
            <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">👋</span>
            </div>
            <h3 className="text-lg font-bold text-foreground">No messages yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-[250px]">
              Send a message to start the conversation!
            </p>
          </div>
        )}

        {/* Message List */}
        <div className="mt-auto flex flex-col justify-end">
          {allMessages.map((msg, i) => {
            const isMine = msg.sender_id === currentUserId;

            // Only show avatar if previous message was from someone else, 
            // or if there's a large time gap (>5 mins)
            let showAvatar = true;
            if (i > 0) {
              const prev = allMessages[i - 1];
              if (prev.sender_id === msg.sender_id) {
                const timeDiff = new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime();
                if (timeDiff < 5 * 60 * 1000) showAvatar = false;
              }
            }

            const msgUpload = threadUploads.find(u => u.tempId === msg.id);
            const isUploading = !!(msg as any)._uploading && msgUpload && msgUpload.status === 'uploading';
            const uploadFailed = !!(msg as any)._uploadFailed || (msgUpload && msgUpload.status === 'failed');
            const uploadProgress = msgUpload?.progress ?? 0;

            return (
              <div key={(msg as any)._clientKey || msg.id} className="flex flex-col">
                <ChatBubble
                  message={{ ...msg, isSending: isUploading, uploadProgress } as any}
                  isMine={isMine}
                  currentUserId={currentUserId}
                  showAvatar={showAvatar}
                  onReply={(msg) => setReplyTo(msg)}
                  canReply={!isInputDisabled}
                  onDelete={handleDeleteMessage}
                  onEdit={handleEditMessage}
                  onReact={handleReact}
                  poll={polls?.find(p => p.message_id === msg.id)}
                  onVotePoll={handleVotePoll}
                  onPin={handlePinMessage}
                  onApprove={handleApproveMessage}
                  onReject={handleRejectMessage}
                  onAcknowledge={handleAcknowledgeMessage}
                  isAdmin={
                    !groupInfo ||
                    groupInfo?.myRole === 'admin' ||
                    orgUsers?.find(u => u._id === currentUserId)?.role === 'super_admin'
                  }
                />
                {/* Upload Progress / Retry — shown below the message bubble */}
                {isMine && isUploading && (
                  <div className="flex justify-end pr-2 -mt-1 mb-1">
                    <span className="text-xs text-muted-foreground">
                      Uploading... {uploadProgress}%
                    </span>
                  </div>
                )}
                {isMine && uploadFailed && (
                  <div className="flex justify-end items-center gap-2 pr-2 -mt-1 mb-1">
                    <span className="text-xs text-red-500">Upload failed</span>
                    <button
                      onClick={() => retryUpload(threadId, msg.id)}
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <RefreshCw className="w-3 h-3" /> Retry
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Typing Indicator Overlay */}
      {Object.keys(typingUsers).length > 0 && (
        <div className="absolute bottom-[90px] left-4 text-xs font-medium text-muted-foreground bg-background/80 px-3 py-1.5 rounded-full border border-border shadow-sm backdrop-blur-sm z-10 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" ></span>
            <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" ></span>
            <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" ></span>
          </div>
          {Object.values(typingUsers).some(t => t.type === 'recording')
            ? 'Someone is recording...'
            : Object.values(typingUsers).some(t => t.type === 'uploading')
              ? 'Someone is uploading...'
              : 'Someone is typing...'
          }
        </div>
      )}

      {/* Message Input */}
      <div className="shrink-0 w-full relative z-20 bg-background">
        <ChatInput
          onSendMessage={handleSendMessage}
          isSending={isSending}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          disabledReason={disabledReason}
          onOpenPollModal={thread.type === 'group' ? () => setIsCreatePollOpen(true) : undefined}
          canSchedule={true}
          currentUserId={currentUserId}
          orgUsers={orgUsers}
          thread={thread}
          onTyping={(isTyping, type) => {
            channelRef.sendTyping(isTyping, type);
          }}
        />
      </div>

      {/* Modals */}
      {isSettingsOpen && thread.groupId && (
        <Suspense fallback={null}>
          <GroupSettingsModal
            groupId={thread.groupId}
            onClose={() => setIsSettingsOpen(false)}
            onLeaveGroup={() => setIsSettingsOpen(false)}
          />
        </Suspense>
      )}

      {isCreatePollOpen && thread.groupId && (
        <CreatePollModal
          groupId={thread.groupId}
          onClose={() => setIsCreatePollOpen(false)}
        />
      )}
      {messageToDelete && (
        <DeleteMessageModal
          message={messageToDelete}
          isOpen={!!messageToDelete}
          onClose={() => setMessageToDelete(null)}
          onDelete={confirmDeleteMessage}
          currentUserId={currentUserId}
        />
      )}
      {pinningMessageId && (
        <PinDurationModal
          onClose={() => setPinningMessageId(null)}
          onSave={submitPin}
          isPending={isPinning}
        />
      )}
    </div>
  );
}
