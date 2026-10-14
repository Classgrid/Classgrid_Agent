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

import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import IORedis from "ioredis";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Message from "../models/Message.js";
import MeetingChat from "../models/MeetingChat.js";
import GoLive from "../models/GoLive.js";
import { dispatchNotification } from "./notification.service.js";
import User from "../models/User.js";
import accessLogger from "../config/logger.js";

// Live Chat Analytics: push fresh numbers to the "superadmin:analytics" room every 20 s,
// only while at least one super admin has the page open (the loop stops when the room is empty).
const ANALYTICS_ROOM = "superadmin:analytics";
const ANALYTICS_PUSH_MS = 20 * 1000;
let analyticsTimer = null;
function startAnalyticsPush() {
    if (analyticsTimer || !io) return;
    analyticsTimer = setInterval(async () => {
        const watchers = io.sockets.adapter.rooms.get(ANALYTICS_ROOM)?.size || 0;
        if (watchers === 0) { clearInterval(analyticsTimer); analyticsTimer = null; return; }
        try {
            const { getChatAnalytics } = await import("./chat-analytics.service.js");
            io.to(ANALYTICS_ROOM).emit("chat_analytics:update", await getChatAnalytics({ maxAgeMs: ANALYTICS_PUSH_MS - 1000 }));
        } catch (err) {
            console.warn("[ChatAnalytics] live push failed:", err.message);
        }
    }, ANALYTICS_PUSH_MS);
}

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const REDIS_URL = process.env.REDIS_URL; // No default localhost fallback to avoid forcing Redis

const isDev = process.env.NODE_ENV !== "production";

let pubClient, subClient, redisClient;

if (!isDev && REDIS_URL) {
    pubClient = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
    subClient = pubClient.duplicate();
    redisClient = pubClient.duplicate();
    
    // Prevent missing Redis from crashing the server
    pubClient.on("error", (err) => console.warn("[Socket] pubClient Redis error:", err.message));
    subClient.on("error", (err) => console.warn("[Socket] subClient Redis error:", err.message));
    redisClient.on("error", (err) => console.warn("[Socket] redisClient Redis error:", err.message));
}

export let io;

// Adaptive worker configuration
const MAX_REDIS_STREAM_SIZE = 800; // 80% of 1000 threshold for emergency flush
const STREAM_GROUP = "chat_workers";
const STREAM_CONSUMER = `worker_${process.pid}`;

export const initSocket = (server) => {
    io = new Server(server, {
        pingTimeout: 86400000, // 24 HOURS — stays alive all day, only closes on logout/tab close
        pingInterval: 25000,   // Heartbeat every 25 seconds to keep connection alive
        cors: {
            origin: (origin, callback) => {
                callback(null, true); // Allow all domains including subdomains and custom domains
            },
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    // Hook up socket.io-redis adapter for PM2 multi-node scaling (production only)
    if (!isDev && pubClient && subClient) {
        io.adapter(createAdapter(pubClient, subClient));
    }

    // Middleware for Auth
    io.use((socket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        if (!token) return next(new Error("Authentication error: No token provided"));

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            socket.userId = decoded.id; // User ID
            socket.orgId = decoded.organizationId; // Tenant isolation
            next();
        } catch (err) {
            next(new Error("Authentication error: Invalid token"));
        }
    });

    io.on("connection", (socket) => {
        const orgId = socket.orgId;
        const orgStreamKey = `chat:stream:org_${orgId}`;

        accessLogger.info(`🔌 Socket connected: ${socket.userId} (Org: ${orgId})`, {
            provider: 'socket',
            event: 'connect',
            userId: socket.userId,
            orgId: orgId,
            ip: socket.handshake.address
        });

        if (socket.userId) {
            io.emit("platform_user_status_changed", { userId: socket.userId, isOnline: true });
        }

        // Ensure consumer group exists (catch if it already exists)
        if (orgId && redisClient) {
            redisClient.xgroup("CREATE", orgStreamKey, STREAM_GROUP, "0", "MKSTREAM").catch(() => {});
        }

        // Join global organization room for org-wide broadcasts (e.g. new public groups)
        const effectiveOrgId = orgId || "classgrid";
        socket.join(`org:${effectiveOrgId}`);

        // Join personal room for private direct messages
        socket.join(`${effectiveOrgId}:${socket.userId}`);
        socket.join(socket.userId.toString());

        socket.on("join_classroom", (classroomId) => {
            const roomName = `${orgId}:${classroomId}`;
            socket.join(roomName);
            console.log(`User ${socket.userId} joined room ${roomName}`);
        });

        // ── Thread Chat (replaces Supabase Realtime) ──
        socket.on("join_thread", (threadId) => {
            if (!threadId) return;
            const roomName = `thread:${threadId}`;
            socket.join(roomName);
        });

        socket.on("leave_thread", (threadId) => {
            if (!threadId) return;
            const roomName = `thread:${threadId}`;
            socket.leave(roomName);
        });

        socket.on("join_user_channel", (userId) => {
            // Only your own private channel (it carries your messages, notifications and block events)
            if (!userId || String(userId) !== String(socket.userId)) return;
            const roomName = `user:${userId}`;
            socket.join(roomName);
        });

        socket.on("thread_typing", ({ threadId, isTyping, activityType }) => {
            if (!threadId) return;
            socket.to(`thread:${threadId}`).emit("thread:typing", {
                userId: socket.userId,
                isTyping,
                activityType: activityType || "typing",
            });
        });

        socket.on("join_org_support", () => {
            const roomName = `org_support:${orgId}`;
            socket.join(roomName);
            console.log(`User ${socket.userId} joined org support room ${roomName}`);
        });

        socket.on("join_support_thread", (threadId) => {
            if (!threadId) return;
            const roomName = `support:${threadId}`;
            socket.join(roomName);
            console.log(`User ${socket.userId} joined support thread ${roomName}`);
        });

        socket.on("join_superadmin_support", () => {
            socket.join("superadmin:support");
            console.log(`Super admin socket ${socket.userId} joined superadmin:support`);
        });

        // Live Chat Analytics (superadmin portal → Analytics): only real super admins may join
        socket.on("join_superadmin_analytics", async () => {
            try {
                const u = await User.findById(socket.userId).select("role").lean();
                if (u?.role !== "super_admin") return socket.emit("chat_analytics:error", { error: "forbidden" });
                socket.join(ANALYTICS_ROOM);
                const { getChatAnalytics } = await import("./chat-analytics.service.js");
                socket.emit("chat_analytics:update", await getChatAnalytics({ maxAgeMs: ANALYTICS_PUSH_MS }));
                startAnalyticsPush();
            } catch (err) {
                socket.emit("chat_analytics:error", { error: err.message });
            }
        });
        socket.on("leave_superadmin_analytics", () => socket.leave(ANALYTICS_ROOM));

        socket.on("join_superadmin_storage", () => {
            socket.join("superadmin:storage");
        });

        socket.on("leave_superadmin_storage", () => {
            socket.leave("superadmin:storage");
        });

        socket.on("join_superadmin_ai_usage", () => {
            socket.join("superadmin:ai_usage");
            console.log(`Super admin socket ${socket.userId} joined superadmin:ai_usage`);
        });

        socket.on("leave_superadmin_ai_usage", () => {
            socket.leave("superadmin:ai_usage");
        });

        // --- Superadmin AI Usage Dashboard Realtime Updates ---
        socket.on("join_ai_usage_dashboard", async () => {
            // Super admins only (role read from the database, never trusted from the client)
            try {
                const u = await User.findById(socket.userId).select("role").lean();
                if (u?.role === "super_admin" || u?.role === "co_super_admin") socket.join("superadmin:ai_usage");
            } catch (e) { /* ignore */ }
        });

        socket.on("leave_ai_usage_dashboard", () => {
            socket.leave("superadmin:ai_usage");
        });

        socket.on("leave_classroom", (classroomId) => {
            const roomName = `${orgId}:${classroomId}`;
            socket.leave(roomName);
        });

        // --- Day 17: Synced Meeting Chat ---
        socket.on("join_meeting", (meetingId) => {
            const roomName = `meeting:${meetingId}`;
            socket.join(roomName);
            console.log(`User ${socket.userId} joined meeting room ${roomName}`);
        });

        socket.on("send_meeting_message", async (data) => {
            try {
                const { meetingId, message } = data;
                const meeting = await GoLive.findById(meetingId);
                
                if (!meeting || meeting.status !== 'active') return;

                const relativeTimestamp = Math.floor((Date.now() - meeting.startTime) / 1000);

                const chatEntry = await MeetingChat.create({
                    orgId: socket.orgId,
                    meeting: meetingId,
                    user: socket.userId,
                    message,
                    timestamp: relativeTimestamp
                });

                // Emit to meeting room
                io.to(`meeting:${meetingId}`).emit("new_meeting_message", {
                    _id: chatEntry._id,
                    user: socket.userId,
                    message,
                    timestamp: relativeTimestamp,
                    createdAt: chatEntry.createdAt
                });
            } catch (err) {
                console.error("[Socket] send_meeting_message error:", err);
            }
        });

        socket.on("send_message", async (data, callback) => {
            try {
                const { classroom, receiver, content, messageType, fileUrl, fileName, fileType, fileSize } = data;
                
                const messageObj = {
                    _id: new mongoose.Types.ObjectId().toString(),
                    classroom,
                    sender: socket.userId,
                    receiver: receiver || null,
                    content,
                    messageType: messageType || "group",
                    fileUrl: fileUrl || null,
                    fileName: fileName || null,
                    fileType: fileType || null,
                    fileSize: fileSize || null,
                    createdAt: new Date().toISOString()
                };

                // 1) Fast emit to clients in the room (optimistic delivery)
                if (messageType === "private" && receiver) {
                    // Send to sender and receiver
                    io.to(`${orgId}:${socket.userId}`).to(`${orgId}:${receiver}`).emit("new_message", messageObj);
                    
                    // 🔔 Push notification for private message
                    dispatchNotification({
                        recipientId: receiver,
                        type: "chat",
                        title: "💬 New Message",
                        message: `Msg from ${socket.userId}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
                        link: `/chat/private/${socket.userId}`,
                        sendPush: true,
                        sendEmail: false
                    }).catch(e => console.error("[Socket] Push error:", e));

                } else {
                    // Group chat
                    const roomName = `${orgId}:${classroom}`;
                    io.to(roomName).emit("new_message", messageObj);

                    // 🔔 Push notification for group message (Optional: could be filtered by mentions)
                    // For now, let's just log it or send to a specific subset if needed.
                    // Implementation note: Sending group push usually requires checking who is offline.
                }
                
                // Return immediate positive response to sender
                if (typeof callback === "function") callback({ success: true, message: messageObj });

                // 2) Push to Redis Stream
                const messageString = JSON.stringify(messageObj);
                await redisClient.xadd(orgStreamKey, "*", "payload", messageString);

                // 3) Check Emergency Flush
                const streamLength = await redisClient.xlen(orgStreamKey);
                if (streamLength >= MAX_REDIS_STREAM_SIZE) {
                    console.log(`[Socket] Emergency flush triggered for ${orgStreamKey}. Size: ${streamLength}`);
                    flushChatStream(orgId); 
                }
            } catch (error) {
                console.error("[Socket] send_message error:", error);
                if (typeof callback === "function") callback({ success: false, error: "Failed to process message" });
            }
        });

        // Typing indicators
        socket.on("typing", ({ classroomId, targetId, isTyping, userName }) => {
            if (targetId) {
                // Private chat typing
                socket.to(`${orgId}:${targetId}`).emit("typing", { userId: socket.userId, userName, isTyping, classroomId });
            } else if (classroomId) {
                // Group chat typing
                socket.to(`${orgId}:${classroomId}`).emit("typing", { userId: socket.userId, userName, isTyping, classroomId });
            }
        });

        // --- Day 17: Video Call Signaling ---
        socket.on("initiate_call", ({ targetId, channelName, type, callerName }) => {
            // 1. Instant Socket delivery (if they are online)
            io.to(`${orgId}:${targetId}`).emit("incoming_call", {
                from: socket.userId,
                callerName: callerName || "A user",
                channelName,
                type // 'video' or 'voice'
            });
            console.log(`[Call] ${socket.userId} calling ${targetId} on ${channelName}`);

            // 2. Guaranteed Push Notification (if they are offline/locked)
            const callType = type === 'video' ? '📹 Video Call' : '📞 Voice Call';
            dispatchNotification({
                recipientId: targetId,
                type: "alert",
                title: `${callType} Incoming`,
                message: `${callerName || "Someone"} is calling you. Tap to answer.`,
                link: `/chat/call/${channelName}`, 
                sendPush: true,
                sendEmail: false,
                isCall: true // Tells FCM to ring aloud!
            }).catch(e => console.error("[Socket Call] Push error:", e));
        });

        socket.on("answer_call", ({ targetId, accepted }) => {
            // Signal the caller about the answer
            io.to(`${orgId}:${targetId}`).emit("call_answered", {
                from: socket.userId,
                accepted
            });
        });

        socket.on("end_call", ({ targetId }) => {
            io.to(`${orgId}:${targetId}`).emit("call_ended", {
                from: socket.userId
            });
        });

        // --- Day 16: Admission Broadcasts ---
        socket.on("join_admission_broadcast", () => {
            const roomName = `org_${orgId}_admission`;
            socket.join(roomName);
            console.log(`📡 User ${socket.userId} joined ADMISSION broadcast room: ${roomName}`);
        });

        // --- Day 15: Canteen KDS Room ---
        socket.on("join_canteen_kitchen", () => {
            const roomName = `org_${orgId}_canteen_kitchen`;
            socket.join(roomName);
            console.log(`🍔 User ${socket.userId} joined CANTEEN KDS room: ${roomName}`);
        });

        socket.on("disconnect", async () => {
            accessLogger.info(`🔌 Socket disconnected: ${socket.userId}`, {
                provider: 'socket',
                event: 'disconnect',
                userId: socket.userId,
                orgId: orgId,
                ip: socket.handshake.address
            });
            
            if (socket.userId) {
                const now = new Date();
                try {
                    await User.findByIdAndUpdate(socket.userId, { lastSeen: now });
                } catch (e) {
                    console.error("[Socket] Failed to update lastSeen:", e.message);
                }
                io.emit("platform_user_status_changed", { userId: socket.userId, isOnline: false, lastSeen: now });
            }
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.io is not initialized!");
    }
    return io;
};

/**
 * Adaptive Worker: Pulls from Redis Stream, Bulk inserts to MongoDB, then ACKs.
 * This can be run explicitly (emergency flush) or tracked via a background interval worker.
 */
export const flushChatStream = async (orgId) => {
    const orgStreamKey = `chat:stream:org_${orgId}`;
    try {
        // Read unacked messages from Stream for our consumer group
        // Read up to 1000 messages at once
        const streams = await redisClient.xreadgroup(
            "GROUP", STREAM_GROUP, STREAM_CONSUMER,
            "COUNT", 1000,
            "STREAMS", orgStreamKey, ">"
        );

        if (!streams || !streams.length) return { success: true, count: 0 };

        const messages = streams[0][1]; // Array of [messageId, [ 'payload', '{"..."}' ]]
        if (!messages.length) return { success: true, count: 0 };

        const bulkOps = [];
        const messageIdsToAck = [];

        messages.forEach(([messageId, fields]) => {
            const dataString = fields[1]; 
            const msgData = JSON.parse(dataString);

            bulkOps.push({
                insertOne: {
                    document: {
                        _id: msgData._id,
                        classroom: msgData.classroom,
                        sender: msgData.sender,
                        receiver: msgData.receiver,
                        content: msgData.content,
                        messageType: msgData.messageType,
                        fileUrl: msgData.fileUrl,
                        fileName: msgData.fileName,
                        fileType: msgData.fileType,
                        fileSize: msgData.fileSize,
                        createdAt: new Date(msgData.createdAt)
                    }
                }
            });
            messageIdsToAck.push(messageId);
        });

        if (bulkOps.length > 0) {
            // Adaptive Worker Phase 1: mongo.insertMany equivalent via bulkWrite
            await Message.bulkWrite(bulkOps);
            
            // Adaptive Worker Phase 2: redis.ack()
            await redisClient.xack(orgStreamKey, STREAM_GROUP, ...messageIdsToAck);
            
            // Cleanup standard stream to keep memory minimal
            await redisClient.xdel(orgStreamKey, ...messageIdsToAck);
            
            // Adaptive Worker Phase 3: emit 'message_saved'
            if (io) {
                // Emit to the organization that the batch was successfully persisted
                // Useful for UI updates or read receipts marking
                io.to(orgId).emit('message_saved', { orgId, count: bulkOps.length });
                console.log(`[Socket Adaptive Worker] Flushed & ACKed ${bulkOps.length} messages for org ${orgId}`);
            }
        }
        
        return { success: true, count: bulkOps.length };
    } catch (err) {
        console.error(`[Socket Adaptive Worker] Failed to flush stream for org ${orgId}:`, err);
        return { success: false, error: err.message };
    }
};
