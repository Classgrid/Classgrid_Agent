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

/**
 * Socket.io Client Provider
 * 
 * Connects to the backend Socket.io server for:
 * - Classroom chat (legacy)
 * - Typing indicators
 * - Video/voice call signaling
 * - Canteen KDS
 * - Admission broadcasts
 * 
 * - Thread-based DM/group chat (replaces Supabase Realtime)
 * This Socket.io connection handles everything else.
 */
import { io, Socket } from "socket.io-client";
import { RESCUE_SOCKET_PATH, isMainDown, markMainDown } from "./rescue";

const BACKEND_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "" : "https://api.classgrid.in");

let socket: Socket | null = null;

/**
 * Initialize Socket.io connection with JWT auth.
 * Call this after user login with a valid JWT token.
 */
export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket;

  socket = io(BACKEND_URL, {
    ...(isMainDown() ? { path: RESCUE_SOCKET_PATH } : {}),
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,   // NEVER give up reconnecting
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  socket.on("connect", () => {
    console.log("🔌 Socket.io connected:", socket?.id);
  });

  let failedConnects = 0;
  socket.on("connect", () => {
    failedConnects = 0;
  });
  socket.on("connect_error", (err) => {
    console.warn("🔴 Socket.io connection error:", err.message);
    failedConnects += 1;
    if (failedConnects >= 2 && socket) {
      failedConnects = 0;
      const usingRescue = socket.io.opts.path === RESCUE_SOCKET_PATH;
      if (!usingRescue) markMainDown();
      socket.io.opts.path = usingRescue ? "/socket.io" : RESCUE_SOCKET_PATH;
      console.warn(`🔁 Socket.io switching to ${usingRescue ? "main" : "rescue"} server`);
    }
  });

  socket.on("disconnect", (reason) => {
    console.warn("🔌 Socket.io disconnected:", reason);
  });

  return socket;
}

/**
 * Get the current socket instance.
 * Returns null if not connected.
 */
export function getSocket(): Socket | null {
  if (!socket) {
    const token = localStorage.getItem("token");
    if (token) {
      return connectSocket(token);
    }
  }
  return socket;
}

/**
 * Disconnect the socket (call on logout).
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Emit a typing indicator.
 */
export function emitTyping(classroomId: string | null, targetId: string | null, isTyping: boolean, userName: string) {
  socket?.emit("typing", { classroomId, targetId, isTyping, userName });
}

/**
 * Join a classroom chat room.
 */
export function joinClassroom(classroomId: string) {
  socket?.emit("join_classroom", classroomId);
}

/**
 * Leave a classroom chat room.
 */
export function leaveClassroom(classroomId: string) {
  socket?.emit("leave_classroom", classroomId);
}

/**
 * Join org support room.
 */
export function joinOrgSupport() {
  socket?.emit("join_org_support");
}

/**
 * Join a specific support thread room.
 */
export function joinSupportThread(threadId: string) {
  socket?.emit("join_support_thread", threadId);
}

/**
 * Join superadmin support room.
 */
export function joinSuperadminSupport() {
  socket?.emit("join_superadmin_support");
}

/**
 * Join superadmin storage room.
 */
export function joinSuperadminStorage() {
  socket?.emit("join_superadmin_storage");
}

/**
 * Leave superadmin storage room.
 */
export function leaveSuperadminStorage() {
  socket?.emit("leave_superadmin_storage");
}

/**
 * Initiate a video/voice call.
 */
export function initiateCall(targetId: string, channelName: string, type: "video" | "voice", callerName: string) {
  socket?.emit("initiate_call", { targetId, channelName, type, callerName });
}

/**
 * Answer a call.
 */
export function answerCall(targetId: string, accepted: boolean) {
  socket?.emit("answer_call", { targetId, accepted });
}

/**
 * End a call.
 */
export function endCall(targetId: string) {
  socket?.emit("end_call", { targetId });
}

// ── Thread Chat (Native WebSocket) ──

/**
 * Join a thread chat room for real-time messages.
 */
export function joinThread(threadId: string) {
  socket?.emit("join_thread", threadId);
}

/**
 * Leave a thread chat room.
 */
export function leaveThread(threadId: string) {
  socket?.emit("leave_thread", threadId);
}

/**
 * Join the user's personal channel for sidebar updates.
 */
export function joinUserChannel(userId: string) {
  socket?.emit("join_user_channel", userId);
}

/**
 * Emit typing indicator for thread chat.
 */
export function emitThreadTyping(threadId: string, isTyping: boolean, activityType: 'typing' | 'recording' | 'uploading' | null = 'typing') {
  socket?.emit("thread_typing", { threadId, isTyping, activityType });
}

export function joinAiUsageDashboard() {
  socket?.emit("join_ai_usage_dashboard");
}

export function leaveAiUsageDashboard() {
  socket?.emit("leave_ai_usage_dashboard");
}

export default {
  connectSocket,
  getSocket,
  disconnectSocket,
  emitTyping,
  joinClassroom,
  leaveClassroom,
  joinOrgSupport,
  joinSupportThread,
  joinSuperadminSupport,
  joinSuperadminStorage,
  leaveSuperadminStorage,
  initiateCall,
  answerCall,
  endCall,
  joinThread,
  leaveThread,
  joinUserChannel,
  emitThreadTyping,
  joinAiUsageDashboard,
  leaveAiUsageDashboard,
};