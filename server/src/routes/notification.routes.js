/*
 * ─────────────────────────────────────────────────────────
 * 🚫 NO BLOCKS RULE (owner's order, 2026-10-23) 🚫
 * Claude and every AI model are FORBIDDEN to add any kind of block, restriction, allowlist or
 * "only for X" rule (owner-only, super-admin-only, email checks, test-number-only, role checks)
 * unless the owner explicitly asks for that exact limit.
 * Every feature is for ALL users. Project Mode is for all users, never super-admin only.
 * ─────────────────────────────────────────────────────────
 */
/*
 * ─────────────────────────────────────────────────────────
 * 🚫 NO DISK BLAME RULE (owner's order, 2026-10-27) 🚫
 * Claude and every AI model are FORBIDDEN to say an error comes from a full disk or low disk space.
 * The owner's disks are not full. Never guess the cause of an error: read the real logs and code first,
 * and only name a cause that was actually seen.
 * ─────────────────────────────────────────────────────────
 */
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
import { getChatSb } from "../config/supabaseClient.js";
import { isAuthenticated } from "../middleware/auth.middleware.js";
import connectDB from "../../config/db.js";
import Notification from "../models/Notification.js";
import { broadcastToChannel } from "../services/realtimeBroadcast.js";

const router = express.Router();

// Centralized Supabase Client
const sb = getChatSb();

// GET all notifications for current user — MERGES Supabase + MongoDB
router.get("/", isAuthenticated, async (req, res) => {
    try {
        const myId = req.user._id.toString();
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

        // 1️⃣ Fetch from Supabase (legacy notifications)
        let supaNotifs = [];
        try {
            const { data, error } = await sb
                .from('notifications')
                .select('*')
                .eq('recipient_id', myId)
                .gte('created_at', threeDaysAgo.toISOString())
                .order('created_at', { ascending: false })
                .limit(20);
            if (!error && data) {
                supaNotifs = data.map(n => ({
                    _id: n.id,
                    type: n.type || "system",
                    title: n.title || "",
                    message: n.message || "",
                    link: n.link || "",
                    relatedId: n.related_id || "",
                    isRead: n.is_read || false,
                    createdAt: n.created_at,
                    source: "supabase",
                }));
            }
        } catch (e) {
            console.error("[Notifications] Supabase fetch error:", e.message);
        }

        // 2️⃣ Fetch from MongoDB (attendance, quiz, assignment notifications)
        let mongoNotifs = [];
        try {
            await connectDB();
            const mongoData = await Notification.find({
                recipient: req.user._id,
                createdAt: { $gte: threeDaysAgo }
            })
                .sort({ createdAt: -1 })
                .limit(20)
                .lean();

            mongoNotifs = mongoData.map(n => ({
                _id: n._id.toString(),
                type: n.type || "system",
                title: n.title || "",
                message: n.message || "",
                link: n.link || "",
                relatedId: n.relatedId || "",
                isRead: n.isRead || false,
                createdAt: n.createdAt,
                source: "mongo",
            }));
        } catch (e) {
            console.error("[Notifications] MongoDB fetch error:", e.message);
        }

        // 3️⃣ Merge, sort by date, limit to 30
        const allNotifs = [...supaNotifs, ...mongoNotifs]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 30);

        const unreadCount = allNotifs.filter(n => !n.isRead).length;

        res.json({ notifications: allNotifs, unreadCount });
    } catch (err) {
        console.error("Fetch notifications error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Mark notification as read (handles both Supabase and MongoDB)
router.put("/:id/read", isAuthenticated, async (req, res) => {
    try {
        const notifId = req.params.id;
        const myId = req.user._id.toString();
        // Live: move it to Archive on all my open tabs/devices
        const announce = () => broadcastToChannel(`user:${myId}`, "notifications_read", { id: notifId });

        // Try MongoDB first (ObjectId format = 24 hex chars). Only the recipient can mark it read.
        if (/^[0-9a-fA-F]{24}$/.test(notifId)) {
            try {
                await connectDB();
                const updated = await Notification.findOneAndUpdate({ _id: notifId, recipient: req.user._id }, { isRead: true });
                if (updated) { announce(); return res.json({ message: "Marked read" }); }
            } catch (e) { /* fallthrough to Supabase */ }
        }

        // Try Supabase
        const { error } = await sb
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notifId)
            .eq('recipient_id', myId);

        if (error) throw error;
        announce();
        res.json({ message: "Marked read" });
    } catch (err) {
        console.error("Mark read error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Mark all as read (both Supabase and MongoDB)
router.put("/read-all", isAuthenticated, async (req, res) => {
    try {
        // Supabase
        await sb
            .from('notifications')
            .update({ is_read: true })
            .eq('recipient_id', req.user._id.toString())
            .eq('is_read', false);

        // MongoDB
        try {
            await connectDB();
            await Notification.updateMany(
                { recipient: req.user._id, isRead: false },
                { isRead: true }
            );
        } catch (e) {
            console.error("[Notifications] Mongo mark-all-read error:", e.message);
        }

        broadcastToChannel(`user:${req.user._id.toString()}`, "notifications_read", { all: true });
        res.json({ message: "All marked read" });
    } catch (err) {
        console.error("Mark all read error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /notifications/preferences — Get user's in-app notification preferences
router.get("/preferences", isAuthenticated, async (req, res) => {
    try {
        await connectDB();
        const User = (await import("../models/User.js")).default;
        const user = await User.findById(req.user._id).select('inAppNotifications').lean();
        const prefs = user?.inAppNotifications || {
            global: true, chat: true, classroom: true, meetings: true,
            settings: true, attendance: true, assignments: true, fees: true,
        };
        res.json({ preferences: prefs });
    } catch (err) {
        console.error("Get preferences error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// PUT /notifications/preferences — Update user's in-app notification preferences
router.put("/preferences", isAuthenticated, async (req, res) => {
    try {
        await connectDB();
        const User = (await import("../models/User.js")).default;
        const { preferences } = req.body;
        if (!preferences || typeof preferences !== 'object') {
            return res.status(400).json({ message: "Invalid preferences" });
        }
        
        const allowedKeys = ['global', 'chat', 'classroom', 'meetings', 'settings', 'attendance', 'assignments', 'fees'];
        const updateObj = {};
        for (const key of allowedKeys) {
            if (key in preferences) {
                updateObj[`inAppNotifications.${key}`] = !!preferences[key];
            }
        }
        
        await User.findByIdAndUpdate(req.user._id, { $set: updateObj });
        
        // Return updated preferences
        const updated = await User.findById(req.user._id).select('inAppNotifications').lean();
        res.json({ preferences: updated?.inAppNotifications });
    } catch (err) {
        console.error("Update preferences error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;

