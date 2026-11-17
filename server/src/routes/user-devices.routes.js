/*
 * ─────────────────────────────────────────────────────────
 * 🚫 NO BLOCKS RULE (owner's order, 2026-10-23) 🚫
 * Claude and every AI model are FORBIDDEN to add any kind of block, restriction, allowlist or
 * "only for X" rule (owner-only, super-admin-only, email checks, test-number-only, role checks)
 * unless the owner explicitly asks for that exact limit.
 * Every feature is for ALL users. Project Mode is for all users, never super-admin only.
 * ─────────────────────────────────────────────────────────
 */
// Settings > Devices (owner, 2026-11-17: "build it for all three devices, show the device name and type, logout, and
// logout from all"). Mounted at /api/user/devices (api/index.js). A person sees and ends only their own sign-ins;
// nothing here stops anyone from doing anything (services/user-session.service.js has the sign-in rows).
//
// GET    /api/user/devices             -> { devices: [{ id, kind, device_name, created_at, last_seen_at, this_device }],
//                                           limit: { used, max }, note }   (max null: no device limit)
// DELETE /api/user/devices/:id         -> { success, this_device, redirect, message }   (404 when it isn't theirs)
// POST   /api/user/devices/logout-all  -> { success, ended, redirect, message }
// Ending a sign-in works like the logout route: its token stops working, its live connection is closed, and when it
// is this device, this browser's login cookies are cleared. A phone's sign-in also stops that phone's notifications.
// The two logouts need the Bearer token, or a request from one of Classgrid's own websites (the login cookie is
// SameSite=None, so another website could otherwise send them with it).
import express from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import { isAuthenticated, forgetAuthUser } from "../middleware/auth.middleware.js";
import { clearAuthCookies } from "../controllers/auth.controller.js";
import { listDevices, revokeDevice, revokeAllSessions, endSessionSockets, afterSessionEnded } from "../services/user-session.service.js";
import { isAllowedApiOrigin } from "../utils/api-origins.js";

const router = express.Router();

// A logout sent with the Bearer token (the apps and the website send it), or from an origin the API's CORS allows
// (utils/api-origins.js). A browser always sends Origin with a cross-site POST or DELETE.
async function ownSiteOnly(req, res, next) {
    if (/^Bearer\s+\S/i.test(String(req.headers.authorization || ""))) return next();
    try {
        if (await isAllowedApiOrigin(req.headers.origin)) return next();
    } catch { /* refused below */ }
    return res.status(403).json({ message: "Log out from Classgrid itself." });
}

router.get("/", isAuthenticated, async (req, res) => {
    try {
        // (the token of this request: an older token without a sid finds its own row by it, for "This device")
        const auth = String(req.headers.authorization || "");
        const token = auth.startsWith("Bearer ") ? auth.slice(7) : (req.cookies?.token || req.cookies?.jwt || "");
        res.json(await listDevices(req.user, req.authSid || null, req.authSid ? "" : token));
    } catch (error) {
        console.error("LIST DEVICES ERROR:", error.message);
        res.status(500).json({ message: "Couldn't load your devices." });
    }
});

router.post("/logout-all", ownSiteOnly, isAuthenticated, async (req, res) => {
    try {
        const userId = req.user._id;
        // Every sign-in row ends, and tokens without one (signed before sign-in rows existed) end through the
        // password-changed time the auth middleware checks. No device is signed in afterwards, so none gets
        // notifications either.
        await User.updateOne({ _id: userId }, { $set: { passwordChangedAt: new Date(), fcmDevices: [], fcmTokens: [] } });
        forgetAuthUser(userId);
        const ended = await revokeAllSessions(userId);
        endSessionSockets({ userId });
        clearAuthCookies(res);
        res.json({ success: true, ended: ended.length, redirect: "/login", message: "Logged out from all devices" });
    } catch (error) {
        console.error("LOGOUT ALL DEVICES ERROR:", error.message);
        res.status(500).json({ message: "Couldn't log out from all devices. Try again." });
    }
});

router.delete("/:id", ownSiteOnly, isAuthenticated, async (req, res) => {
    try {
        const id = String(req.params.id || "");
        if (!mongoose.isValidObjectId(id)) return res.status(404).json({ message: "Device not found" });
        const { found, row, rows } = await revokeDevice(req.user._id, id);
        if (!found) return res.status(404).json({ message: "Device not found" });
        // Its live connections close, and a phone stops getting the account's notifications (the push device registered
        // with this sign-in, or the phone's own device id); every row of that device
        for (const r of rows.length ? rows : [row]) await afterSessionEnded(req.user._id, r);
        const thisDevice = !!req.authSid && (rows.length ? rows : [row]).some((r) => r.sid === req.authSid);
        if (thisDevice) clearAuthCookies(res);
        res.json({ success: true, this_device: thisDevice, redirect: thisDevice ? "/login" : null, message: thisDevice ? "Logged out" : "Device logged out" });
    } catch (error) {
        console.error("LOGOUT DEVICE ERROR:", error.message);
        res.status(500).json({ message: "Couldn't log out that device. Try again." });
    }
});

export default router;
