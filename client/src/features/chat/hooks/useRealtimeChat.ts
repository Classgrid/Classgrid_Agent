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
 * 2. "CLASSGRID ERP" is the actual PRODUCT NAME.
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

import { useEffect, useRef, useCallback } from "react";
import { getSocket } from "@/lib/socketClient";

type RealtimeHandler = (payload: any) => void;

/**
 * Subscribe to a Socket.IO room for real-time events.
 * Replaces Supabase Realtime channels with native WebSocket via Socket.IO.
 * 
 * The server emits events as "{channelType}:{event}" (e.g. "thread:new_message").
 * This hook listens for those events and routes them to the appropriate handler.
 */
export function useRealtimeChannel(
  channelName: string | null,
  handlers: Record<string, RealtimeHandler>
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!channelName) return;

    const channelType = channelName.split(":")[0];
    const channelId = channelName.split(":").slice(1).join(":");

    const listeners: Array<{ event: string; fn: (payload: any) => void }> = [];

    function setup() {
      const socket = getSocket();
      if (!socket) return;

      // Join the room on the server
      if (channelType === "thread") {
        socket.emit("join_thread", channelId);
      } else if (channelType === "user") {
        socket.emit("join_user_channel", channelId);
      }

      // Remove old listeners first to avoid duplicates on reconnect
      listeners.forEach(({ event, fn }) => socket.off(event, fn));
      listeners.length = 0;

      // Register fresh event listeners
      Object.keys(handlersRef.current).forEach((event) => {
        const fullEvent = `${channelType}:${event}`;
        const fn = (payload: any) => {
          handlersRef.current[event]?.(payload);
        };
        socket.on(fullEvent, fn);
        listeners.push({ event: fullEvent, fn });
      });
    }

    // Setup immediately (socket may already be connected)
    setup();

    // Also re-setup every time the socket reconnects
    const socket = getSocket();
    if (socket) {
      socket.on("connect", setup);
    }

    return () => {
      const socket = getSocket();
      if (socket) {
        listeners.forEach(({ event, fn }) => socket.off(event, fn));
        socket.off("connect", setup);
        if (channelType === "thread") {
          socket.emit("leave_thread", channelId);
        }
      }
    };
  }, [channelName]);
}


/**
 * Subscribe to the user's personal channel for sidebar updates (thread list changes).
 */
export function useUserChannel(
  userId: string | null,
  handlers: {
    onThreadUpdated?: (data: any) => void;
    onThreadDeleted?: (data: any) => void;
  }
) {
  useRealtimeChannel(userId ? `user:${userId}` : null, {
    thread_updated: (payload: any) => handlers.onThreadUpdated?.(payload),
    thread_deleted: (payload: any) => handlers.onThreadDeleted?.(payload),
  });
}

export function useOrgChannel(
  orgId: string | null,
  handlers: {
    onExploreGroupsUpdated?: (data: any) => void;
  }
) {
  useRealtimeChannel(orgId ? `org:${orgId}` : null, {
    explore_groups_update: (payload: any) => handlers.onExploreGroupsUpdated?.(payload),
  });
}

/**
 * Subscribe to a specific thread for new messages, deletions, reactions, read receipts, typing.
 */
export function useThreadChannel(
  threadId: string | null,
  userId: string | null,
  handlers: {
    onNewMessage?: (msg: any) => void;
    onMessageDeleted?: (data: { messageId?: string; messageIds?: string[] }) => void;
    onReactionUpdate?: (data: { messageId: string; reactions: any }) => void;
    onReadReceipt?: (data: { userId: string; lastReadAt: string }) => void;
    onTyping?: (data: { userId: string; isTyping?: boolean; activityType?: 'typing' | 'recording' | 'uploading' | null }) => void;
    onNewPoll?: (data: { poll: any; messageId: string }) => void;
    onPollVote?: (data: { pollId: string; voteCounts: any; totalVoters: number }) => void;
    onThreadUpdated?: (data: { allow_replies?: boolean; [key: string]: any }) => void;
    onThreadDeleted?: (data: { threadId: string; [key: string]: any }) => void;
    onMessageUpdated?: (data: any) => void;
    onMessageAcknowledged?: (data: any) => void;
  }
) {
  useRealtimeChannel(threadId ? `thread:${threadId}` : null, {
    new_message: (payload: any) => handlers.onNewMessage?.(payload),
    message_deleted: (payload: any) => handlers.onMessageDeleted?.(payload),
    messages_bulk_deleted: (payload: any) => handlers.onMessageDeleted?.(payload),
    reaction_update: (payload: any) => handlers.onReactionUpdate?.(payload),
    read_receipt: (payload: any) => handlers.onReadReceipt?.(payload),
    typing: (payload: any) => handlers.onTyping?.(payload),
    new_poll: (payload: any) => handlers.onNewPoll?.(payload),
    poll_vote: (payload: any) => handlers.onPollVote?.(payload),
    thread_updated: (payload: any) => handlers.onThreadUpdated?.(payload),
    thread_deleted: (payload: any) => handlers.onThreadDeleted?.(payload),
    message_updated: (payload: any) => handlers.onMessageUpdated?.(payload),
    message_acknowledged: (payload: any) => handlers.onMessageAcknowledged?.(payload),
  });

  const sendTyping = useCallback((isTyping: boolean, activityType: 'typing' | 'recording' | 'uploading' | null = 'typing') => {
    const socket = getSocket();
    if (socket && threadId && userId) {
      socket.emit("thread_typing", { threadId, isTyping, activityType });
    }
  }, [userId, threadId]);

  return { sendTyping };
}
