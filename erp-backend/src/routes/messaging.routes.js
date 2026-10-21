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

import express from "express";
import multer from "multer";
import { getChatSb, studentNotesClient } from '../config/supabaseClient.js';
import { isAuthenticated } from "../middleware/auth.middleware.js";
import { requireClassroomMember, requireClassroomOwner } from "../middleware/classroom.middleware.js";
import { broadcastToChannel } from "../services/realtimeBroadcast.js";
import { uploadBufferToR2, deleteFromR2, getPresignedUploadUrl } from "../config/r2Client.js";


// Centralized Supabase Client
const getSupabase = () => getChatSb();

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// ─────────────────────────────────────────────
// SEND MESSAGE (Group or Private)
// ─────────────────────────────────────────────
router.post("/:classroomId", isAuthenticated, requireClassroomMember, upload.single("file"), async (req, res) => {
    try {
        const { content, receiverId, messageType } = req.body;
        const file = req.file;
        const sb = getSupabase();

        if (!content && !file) {
            return res.status(400).json({ message: "Message content or file required" });
        }

        const msgData = {
            sender_id: req.user._id.toString(),
            sender_name: req.user.name,
            user_avatar: req.user.profilePicture,
            message: content ? content.trim() : "📎 Attachment",
            created_at: new Date().toISOString()
        };

        if (file) {
            const fileName = `chat/${req.params.classroomId}/${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const publicUrl = await uploadBufferToR2(file.buffer, file.buffer.originalname || 'upload.file', file.buffer.mimetype || 'application/octet-stream', fileName);

            /* Error handled inside R2 */

            /* getPublicUrl replaced by R2 */
                
            msgData.file_url = publicUrl;
            msgData.file_name = file.originalname;
            msgData.file_type = file.mimetype;
            msgData.file_size = file.size;
        }

        let insertedData;
        if (messageType === "private" && receiverId) {
            msgData.receiver_id = receiverId;
            msgData.org_id = req.user.organization_id; // For org compatibility
            const { data, error } = await sb.from('org_direct_messages').insert([msgData]).select().single();
            if (error) throw error;
            insertedData = data;
        } else {
            msgData.classroom_id = req.params.classroomId;
            const { data, error } = await sb.from('classroom_messages').insert([msgData]).select().single();
            if (error) throw error;
            insertedData = data;
        }

        // Broadcast to channel for instant UI updates (compatible with current Chat.jsx)
        try {
            const channel = (messageType === "private" && receiverId)
                ? `dm:${[req.user._id.toString(), receiverId.toString()].sort().join(':')}`
                : `classroom:${req.params.classroomId}`;
            await broadcastToChannel(channel, "new_message", insertedData);
        } catch (e) {
            console.error("Realtime broadcast error:", e);
        }

        res.status(201).json({ message: insertedData });
    } catch (err) {
        console.error("Send message error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

// ─────────────────────────────────────────────
// LIST PRIVATE THREADS & GROUPS (Unified Inbox)
// ─────────────────────────────────────────────
router.get("/threads/all", isAuthenticated, async (req, res) => {
    try {
        const myIdStr = req.user._id.toString();
        const myOrgId = req.user.organization_id?.toString() || null;
        const sb = getSupabase();

        // 1. Get user's classrooms from MongoDB (not Supabase)
        const ClassroomMembership = (await import("../models/ClassroomMembership.js")).default;
        const myMemberships = await ClassroomMembership.find({ student: req.user._id, status: 'approved' }).lean();
        const myClassroomIds = myMemberships.map(m => m.classroom.toString());

        const Classroom = (await import("../models/Classroom.js")).default;
        const teacherClassrooms = await Classroom.find({ teacher: req.user._id }).lean();
        const allMyClassroomIds = [...new Set([...myClassroomIds, ...teacherClassrooms.map(c => c._id.toString())])];

        // 2. Get last message for each group from Supabase
        let groupMsgs = [];
        if (allMyClassroomIds.length > 0) {
            const { data, error: groupErr } = await sb
                .from('classroom_messages')
                .select('*')
                .in('classroom_id', allMyClassroomIds)
                .order('created_at', { ascending: false });

            if (groupErr) throw groupErr;
            groupMsgs = data;
        }

        const latestGroups = {};
        groupMsgs.forEach(m => {
            if (!latestGroups[m.classroom_id]) {
                latestGroups[m.classroom_id] = m;
            }
        });

        const classroomInfoMap = {};
        const validGroupIds = Object.keys(latestGroups).filter(id => /^[0-9a-fA-F]{24}$/.test(id));
        const mongoClassrooms = await Classroom.find({ _id: { $in: validGroupIds } }).lean();
        mongoClassrooms.forEach(c => classroomInfoMap[c._id.toString()] = c);

        const formattedGroups = Object.values(latestGroups).map(m => ({
            id: m.classroom_id,
            isGroup: true,
            name: classroomInfoMap[m.classroom_id]?.name || "Classroom",
            classroomId: m.classroom_id,
            avatar: (classroomInfoMap[m.classroom_id]?.name || "C")[0].toUpperCase(),
            lastMessage: m.message,
            time: m.created_at,
            role: "Group"
        }));

        // 3. Get all private threads from Supabase
        const { data: privateMsgs, error: privateErr } = await sb
            .from('org_direct_messages')
            .select('*')
            .or(`sender_id.eq.${myIdStr},receiver_id.eq.${myIdStr}`)
            .order('created_at', { ascending: false });

        if (privateErr) throw privateErr;

        const latestPrivate = {};
        privateMsgs.forEach(m => {
            const otherId = m.sender_id === myIdStr ? m.receiver_id : m.sender_id;
            if (!latestPrivate[otherId]) {
                latestPrivate[otherId] = m;
            }
        });

        const User = (await import("../models/User.js")).default;
        const otherUserIds = Object.keys(latestPrivate).filter(id => /^[0-9a-fA-F]{24}$/.test(id));
        const mongoUsers = await User.find({ _id: { $in: otherUserIds } }).lean();
        const userInfoMap = {};
        mongoUsers.forEach(u => userInfoMap[u._id.toString()] = u);

        // 🔐 SECURITY: Only show DM threads where the other user is in the SAME org
        const formattedPrivate = Object.values(latestPrivate)
            .filter(m => {
                const otherId = m.sender_id === myIdStr ? m.receiver_id : m.sender_id;
                const u = userInfoMap[otherId];
                // If no org or other user is in a different org, hide the thread
                if (!myOrgId || !u) return false;
                return u.organization_id?.toString() === myOrgId;
            })
            .map(m => {
                const otherId = m.sender_id === myIdStr ? m.receiver_id : m.sender_id;
                const u = userInfoMap[otherId];
                return {
                    id: otherId,
                    isGroup: false,
                    name: u?.name || "User",
                    avatar: u?.profilePicture || (u?.name || "U")[0].toUpperCase(),
                    lastMessage: m.message,
                    time: m.created_at,
                    role: u?.role === "student" ? "Student" : "Faculty"
                };
            });

        const allThreads = [...formattedGroups, ...formattedPrivate]
            .sort((a, b) => new Date(b.time) - new Date(a.time));

        res.json({ threads: allThreads });
    } catch (err) {
        console.error("Get all threads error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

// ─────────────────────────────────────────────
// GET GROUP MESSAGES (with pagination & polling)
// ─────────────────────────────────────────────
router.get("/:classroomId", isAuthenticated, requireClassroomMember, async (req, res) => {
    try {
        const { limit = 50, before, after } = req.query;
        const sb = getSupabase();

        let query = sb
            .from('classroom_messages')
            .select('*')
            .eq('classroom_id', req.params.classroomId)
            .order('created_at', { ascending: !!after })
            .limit(parseInt(limit));

        if (before) query = query.lt('created_at', before);
        if (after) query = query.gt('created_at', after);

        const { data: messages, error } = await query;
        if (error) throw error;

        // Map fields to match Mongo format for frontend compatibility if needed
        const formatted = messages.map(m => ({
            ...m,
            _id: m.id,
            sender: { 
                _id: m.sender_id, 
                name: m.sender_name, 
                profilePicture: m.user_avatar 
            },
            content: m.message,
            fileUrl: m.file_url,
            fileName: m.file_name,
            fileType: m.file_type,
            fileSize: m.file_size,
            createdAt: m.created_at
        }));

        if (!after) formatted.reverse();

        res.json({
            messages: formatted,
            hasMore: messages.length >= parseInt(limit),
        });
    } catch (err) {
        console.error("Get messages error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});
// ─────────────────────────────────────────────
// GET PRIVATE MESSAGES (Between two users)
// ─────────────────────────────────────────────
router.get("/:classroomId/private/:userId", isAuthenticated, requireClassroomMember, async (req, res) => {
    try {
        const { limit = 50, before, after } = req.query;
        const myId = req.user._id.toString();
        const otherId = req.params.userId;
        const sb = getSupabase();

        // Subscribing to messages between myId and otherId
        let query = sb
            .from('org_direct_messages')
            .select('*')
            .or(`and(sender_id.eq.${myId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${myId})`)
            .order('created_at', { ascending: !!after })
            .limit(parseInt(limit));

        if (before) query = query.lt('created_at', before);
        if (after) query = query.gt('created_at', after);

        const { data: messages, error } = await query;
        if (error) throw error;

        const formatted = messages.map(m => ({
            ...m,
            _id: m.id,
            sender: { 
                _id: m.sender_id, 
                name: m.sender_name 
            },
            content: m.message,
            fileUrl: m.file_url,
            fileName: m.file_name,
            fileType: m.file_type,
            fileSize: m.file_size,
            createdAt: m.created_at
        }));

        if (!after) formatted.reverse();

        res.json({ messages: formatted, hasMore: messages.length >= parseInt(limit) });
    } catch (err) {
        console.error("Get private messages error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});
// ─────────────────────────────────────────────
// LIST PRIVATE THREADS (Teacher sees all threads in specific classroom)
// ─────────────────────────────────────────────
router.get("/:classroomId/threads", isAuthenticated, requireClassroomMember, async (req, res) => {
    try {
        const myIdStr = req.user._id.toString();
        const sb = getSupabase();

        // Fetch all private messages in this classroom where user is involved
        const { data: messages, error } = await sb
            .from('org_direct_messages')
            .select('*')
            .eq('classroom_id', req.params.classroomId)
            .or(`sender_id.eq.${myIdStr},receiver_id.eq.${myIdStr}`)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const latestPrivate = {};
        messages.forEach(m => {
            const otherId = m.sender_id === myIdStr ? m.receiver_id : m.sender_id;
            if (!latestPrivate[otherId]) {
                latestPrivate[otherId] = m;
            }
        });

        const User = (await import("../models/User.js")).default;
        const otherUserIds = Object.keys(latestPrivate);
        const mongoUsers = await User.find({ _id: { $in: otherUserIds } }).lean();
        const userInfoMap = {};
        mongoUsers.forEach(u => userInfoMap[u._id.toString()] = u);

        const threads = Object.values(latestPrivate).map(m => {
            const otherId = m.sender_id === myIdStr ? m.receiver_id : m.sender_id;
            const u = userInfoMap[otherId];
            return {
                userId: otherId,
                name: u?.name || "User",
                email: u?.email,
                profilePicture: u?.profilePicture,
                role: u?.role,
                lastMessage: m.message,
                lastMessageAt: m.created_at,
                messageCount: 1 // Simplified for now
            };
        });

        res.json({ threads });
    } catch (err) {
        console.error("Get threads error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

// ─────────────────────────────────────────────
// DELETE MESSAGE (Sender or classroom owner)
// ─────────────────────────────────────────────
router.delete("/:classroomId/:messageId", isAuthenticated, requireClassroomMember, async (req, res) => {
    try {
        const sb = getSupabase();
        
        // Attempt to find in group messages first
        let { data: message, error } = await sb
            .from('classroom_messages')
            .select('*')
            .eq('id', req.params.messageId)
            .single();

        let table = 'classroom_messages';
        
        if (error || !message) {
            // Try private messages
            const { data: privMsg, error: privErr } = await sb
                .from('org_direct_messages')
                .select('*')
                .eq('id', req.params.messageId)
                .single();
            
            if (privErr || !privMsg) {
                return res.status(404).json({ message: "Message not found" });
            }
            message = privMsg;
            table = 'org_direct_messages';
        }

        const isSender = message.sender_id === req.user._id.toString();
        // Simplified owner check logic locally or via classroom info
        if (!isSender && !req.isClassroomOwner) {
            return res.status(403).json({ message: "Cannot delete this message" });
        }

        const { error: delErr } = await sb
            .from(table)
            .update({ message: "[Message deleted]", is_deleted: true })
            .eq('id', req.params.messageId);

        if (delErr) throw delErr;

        res.json({ message: "Message deleted" });
    } catch (err) {
        console.error("Delete message error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

export default router;
