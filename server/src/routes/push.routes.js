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

// ══════════════════════════════════════════════════════════════
//  PUSH NOTIFICATION ROUTES
//  Handles FCM device token storage + role-based push sending
// ══════════════════════════════════════════════════════════════

import express from "express";
import { getChatSb } from "../config/supabaseClient.js";
import { isAuthenticated, requireRole } from "../middleware/auth.middleware.js";
import { sendPushToDevice, sendPushToMultiple } from "../services/firebase.service.js";
import Notification from "../models/Notification.js";
import { getAppRolesForTarget, normalizeAppRole } from "../utils/notification-targeting.js";

const router = express.Router();
const sb = getChatSb();

// ══════════════════════════════════════════════════════════════
//  POST /api/push/register-device
//  Called by React when the app boots on Android.
//  Saves (or updates) the FCM token for the logged-in user.
//
//  React usage:
//    const token = window.AndroidBridge?.getFCMToken();
//    fetch('/api/push/register-device', {
//      method: 'POST',
//      headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' },
//      body: JSON.stringify({ fcmToken: token, platform: 'android', appRole: 'student' })
//    });
// ══════════════════════════════════════════════════════════════

router.post("/register-device", isAuthenticated, async (req, res) => {
  try {
    const { fcmToken, platform = "android", appRole = req.user.role || "student" } = req.body;
    const normalizedAppRole = normalizeAppRole(appRole);
    const userId = req.user._id.toString();
    const orgId = req.effectiveOrganizationId || req.user.organization_id?.toString() || null;

    if (!fcmToken) {
      return res.status(400).json({ success: false, message: "fcmToken is required" });
    }

    // Upsert: if this token already exists for this user, update it.
    // If it's a new device/token, insert a new row.
    const { error } = await sb
      .from("device_tokens")
      .upsert(
        {
          user_id: userId,
          fcm_token: fcmToken,
          platform,
          app_role: normalizedAppRole,
          org_id: orgId,
          last_active: new Date().toISOString(),
        },
        {
          onConflict: "fcm_token", // If same token exists, just update
        }
      );

    if (error) {
      console.error("[Push] Token register error:", error.message);
      return res.status(500).json({ success: false, message: "Failed to save token" });
    }

    console.log(`📱 Device registered: ${userId} (${appRole}) → ${fcmToken.slice(0, 20)}...`);
    res.json({ success: true, message: "Device registered" });
  } catch (err) {
    console.error("[Push] Register error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ══════════════════════════════════════════════════════════════
//  DELETE /api/push/unregister-device
//  Called when user logs out. Removes their FCM token.
// ══════════════════════════════════════════════════════════════

router.delete("/unregister-device", isAuthenticated, async (req, res) => {
  try {
    const { fcmToken } = req.body;
    const userId = req.user._id.toString();

    if (!fcmToken) {
      return res.status(400).json({ success: false, message: "fcmToken is required" });
    }

    const { error } = await sb
      .from("device_tokens")
      .delete()
      .eq("user_id", userId)
      .eq("fcm_token", fcmToken);

    if (error) throw error;

    console.log(`📱 Device unregistered: ${userId}`);
    res.json({ success: true, message: "Device unregistered" });
  } catch (err) {
    console.error("[Push] Unregister error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ══════════════════════════════════════════════════════════════
//  POST /api/push/send
//  Send a push notification to specific users.
//  Only org_admin and faculty can use this.
//
//  Body: {
//    recipientIds: ["user-id-1", "user-id-2"],  (specific users)
//    title: "Assignment Due Tomorrow",
//    body: "Physics Chapter 3 is due by 11:59 PM",
//    deepLink: "/assignments",
//    type: "assignment"   (assignment|grade|live_class|chat|fee|canteen)
//  }
// ══════════════════════════════════════════════════════════════

router.post("/send", isAuthenticated, requireRole("org_admin", "faculty"), async (req, res) => {
  try {
    const { recipientIds, title, body, deepLink = "", type = "general" } = req.body;

    if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
      return res.status(400).json({ success: false, message: "recipientIds array is required" });
    }
    if (!title || !body) {
      return res.status(400).json({ success: false, message: "title and body are required" });
    }

    // Fetch all FCM tokens for the target users
    const { data: tokens, error } = await sb
      .from("device_tokens")
      .select("fcm_token")
      .in("user_id", recipientIds);

    if (error) throw error;

    if (!tokens || tokens.length === 0) {
      return res.json({ success: true, message: "No devices registered for these users", sent: 0 });
    }

    const fcmTokens = tokens.map((t) => t.fcm_token);

    // Send the notifications
    const result = await sendPushToMultiple(fcmTokens, title, body, { deepLink, type });

    // Clean up invalid tokens from database
    if (result.invalidTokens.length > 0) {
      await sb
        .from("device_tokens")
        .delete()
        .in("fcm_token", result.invalidTokens);

      console.log(`🧹 Cleaned ${result.invalidTokens.length} expired FCM tokens`);
    }

    res.json({
      success: true,
      sent: result.success,
      failed: result.failure,
      cleaned: result.invalidTokens.length,
    });
  } catch (err) {
    console.error("[Push] Send error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ══════════════════════════════════════════════════════════════
//  POST /api/push/send-by-role
//  Send a push notification to ALL users of a specific role
//  within the admin's organization.
//
//  Body: {
//    role: "student",          (student|faculty|org_admin)
//    title: "Fee Payment Reminder",
//    body: "Your semester fee is due by April 30th",
//    deepLink: "/fees",
//    type: "fee"
//  }
// ══════════════════════════════════════════════════════════════

router.post("/send-by-role", isAuthenticated, requireRole("org_admin"), async (req, res) => {
  try {
    const { role, title, body, deepLink = "", type = "general" } = req.body;
    const orgId = req.effectiveOrganizationId || req.user.organization_id?.toString();

    if (!role || !title || !body) {
      return res.status(400).json({ success: false, message: "role, title, and body are required" });
    }
    if (!orgId) {
      return res.status(403).json({ success: false, message: "Organization context required" });
    }

    const appRoles = getAppRolesForTarget(role);
    if (appRoles.length === 0) {
      return res.status(400).json({ success: false, message: "Unsupported notification role" });
    }

    // Fetch all FCM tokens for this role within the admin's org
    let tokenQuery = sb
      .from("device_tokens")
      .select("fcm_token")
      .eq("org_id", orgId);

    tokenQuery = appRoles.length === 1
      ? tokenQuery.eq("app_role", appRoles[0])
      : tokenQuery.in("app_role", appRoles);

    const { data: tokens, error } = await tokenQuery;


    if (error) throw error;

    if (!tokens || tokens.length === 0) {
      return res.json({
        success: true,
        message: `No ${role} devices registered in your organization`,
        sent: 0,
      });
    }

    const fcmTokens = tokens.map((t) => t.fcm_token);
    const result = await sendPushToMultiple(fcmTokens, title, body, { deepLink, type });

    // Clean up invalid tokens
    if (result.invalidTokens.length > 0) {
      await sb.from("device_tokens").delete().in("fcm_token", result.invalidTokens);
    }

    res.json({
      success: true,
      role,
      sent: result.success,
      failed: result.failure,
      cleaned: result.invalidTokens.length,
    });
  } catch (err) {
    console.error("[Push] Send-by-role error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ══════════════════════════════════════════════════════════════
//  POST /api/push/broadcast
//  Send to ALL users in the organization (emergency announcements).
//  Only org_admin can use this.
// ══════════════════════════════════════════════════════════════

router.post("/broadcast", isAuthenticated, requireRole("org_admin"), async (req, res) => {
  try {
    const { title, body, deepLink = "", type = "general" } = req.body;
    const orgId = req.effectiveOrganizationId || req.user.organization_id?.toString();

    if (!title || !body) {
      return res.status(400).json({ success: false, message: "title and body are required" });
    }
    if (!orgId) {
      return res.status(403).json({ success: false, message: "Organization context required" });
    }

    // Fetch ALL tokens in this organization
    const { data: tokens, error } = await sb
      .from("device_tokens")
      .select("fcm_token")
      .eq("org_id", orgId);

    if (error) throw error;

    if (!tokens || tokens.length === 0) {
      return res.json({ success: true, message: "No devices registered", sent: 0 });
    }

    const fcmTokens = tokens.map((t) => t.fcm_token);
    const result = await sendPushToMultiple(fcmTokens, title, body, { deepLink, type });

    if (result.invalidTokens.length > 0) {
      await sb.from("device_tokens").delete().in("fcm_token", result.invalidTokens);
    }

    res.json({
      success: true,
      sent: result.success,
      failed: result.failure,
      totalDevices: fcmTokens.length,
    });
  } catch (err) {
    console.error("[Push] Broadcast error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ══════════════════════════════════════════════════════════════
//  GET /api/push/notifications
//  Fetch the notification history for the logged-in user.
// ══════════════════════════════════════════════════════════════
router.get("/notifications", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const limit = parseInt(req.query.limit) || 20;
    const skip = parseInt(req.query.skip) || 0;

    const notifications = await Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Notification.countDocuments({ recipient: userId });
    const unread = await Notification.countDocuments({ recipient: userId, isRead: false });

    res.json({
      success: true,
      notifications,
      summary: { total, unread }
    });
  } catch (err) {
    console.error("[Push] History error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ══════════════════════════════════════════════════════════════
//  PATCH /api/push/notifications/read-all
//  Mark all notifications as read.
// ══════════════════════════════════════════════════════════════
router.patch("/notifications/read-all", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    await Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true });
    res.json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    console.error("[Push] Read-all error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
