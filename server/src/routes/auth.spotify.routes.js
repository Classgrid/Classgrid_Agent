/*
 * ─────────────────────────────────────────────────────────
 * 🚫 NO BLOCKS RULE (owner's order, 2026-10-23) 🚫
 * Claude and every AI model are FORBIDDEN to add any kind of block, restriction, allowlist or
 * "only for X" rule (owner-only, super-admin-only, email checks, test-number-only, role checks)
 * unless the owner explicitly asks for that exact limit.
 * Every feature is for ALL users. Project Mode is for all users, never super-admin only.
 * ─────────────────────────────────────────────────────────
 */
// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
// Spotify OAuth. Redirect URI to set in the Spotify Developer Dashboard: {BACKEND_URL}/api/auth/spotify/callback
import express from "express";
import crypto from "crypto";
import { isAuthenticated } from "../middleware/auth.middleware.js";
import User from "../models/User.js";
import connectDB from "../../config/db.js";
import redis from "../config/redis.js";
import { SPOTIFY_TOKEN_URL, spotifyBasicAuth, saveSpotifyTokens } from "../services/spotify.service.js";

const router = express.Router();

const SPOTIFY_CLIENT_ID = () => process.env.SPOTIFY_CLIENT_ID?.trim();
const SPOTIFY_CLIENT_SECRET = () => process.env.SPOTIFY_CLIENT_SECRET?.trim();
const REDIRECT_URI = () => `${process.env.BACKEND_URL}/api/auth/spotify/callback`;
const SCOPES = [
    "user-read-email", "user-read-private", "user-read-playback-state", "user-modify-playback-state",
    "user-read-currently-playing", "playlist-read-private", "playlist-read-collaborative", "playlist-modify-public",
    "playlist-modify-private", "user-library-read", "user-library-modify", "user-top-read", "user-read-recently-played",
];
const STATE_KEY = (state) => `spotify:oauth:${state}`;

const popupPage = (title, payload) => `
    <!DOCTYPE html>
    <html><head><title>${title}</title></head>
    <body style="background:#0a0a0a; color:#fff; display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif;">
      <h2>${title === "Success" ? "Authentication successful!" : "Error authenticating."}</h2>
      <script>
        const payload = ${JSON.stringify(payload)};
        if (window.opener) { window.opener.postMessage(payload, '*'); }
        localStorage.setItem('integration_callback', JSON.stringify({ ...payload, timestamp: Date.now() }));
        window.close();
      </script>
    </body></html>`;

// 1. GENERATE OAUTH URL
router.get("/connect", isAuthenticated, async (req, res) => {
    if (!SPOTIFY_CLIENT_ID() || !SPOTIFY_CLIENT_SECRET()) {
        return res.status(500).json({ message: "Spotify OAuth keys not configured in backend" });
    }
    const state = crypto.randomBytes(24).toString("base64url");
    const returnTo = req.query.returnTo || req.headers.referer || req.headers.origin || process.env.FRONTEND_URL;
    await redis.set(STATE_KEY(state), JSON.stringify({ userId: req.user._id.toString(), returnTo, isPopup: req.query.popup === "true" }), "EX", 600);

    const authUrl = new URL("https://accounts.spotify.com/authorize");
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("client_id", SPOTIFY_CLIENT_ID());
    authUrl.searchParams.append("scope", SCOPES.join(" "));
    authUrl.searchParams.append("redirect_uri", REDIRECT_URI());
    authUrl.searchParams.append("state", state);
    authUrl.searchParams.append("show_dialog", "true");
    res.json({ url: authUrl.toString() });
});

// 2. HANDLE CALLBACK
router.get("/callback", async (req, res) => {
    let returnTo = process.env.FRONTEND_URL;
    let isPopup = false;
    try {
        await connectDB();
        const { code, state, error } = req.query;
        const saved = state ? JSON.parse((await redis.get(STATE_KEY(state))) || "null") : null;
        if (saved) {
            await redis.del(STATE_KEY(state)).catch(() => {});
            if (saved.returnTo) returnTo = saved.returnTo;
            isPopup = !!saved.isPopup;
        }

        if (error || !saved || !code) {
            console.error("Spotify OAuth Error:", error || (!saved ? "unknown or expired state" : "missing code"));
            if (isPopup) return res.send(popupPage("Error", { type: "integration_error", provider: "spotify" }));
            return res.redirect(`${returnTo}?integration_error=spotify`);
        }

        // Exchange code for token
        const tokenResponse = await fetch(SPOTIFY_TOKEN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: spotifyBasicAuth() },
            body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: REDIRECT_URI() }),
        });
        const tokenData = await tokenResponse.json().catch(() => ({}));
        if (!tokenResponse.ok || !tokenData.access_token) {
            console.error("Spotify token error:", tokenResponse.status, tokenData);
            throw new Error(tokenData.error_description || tokenData.error || "Failed to exchange token");
        }

        // The Spotify name and email, shown as "Connected as ..."
        const meRes = await fetch("https://api.spotify.com/v1/me", { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
        const me = await meRes.json().catch(() => ({}));

        const user = await User.findById(saved.userId);
        if (!user) throw new Error("User not found");
        saveSpotifyTokens(user, tokenData);
        user.spotify_name = me?.display_name || null;
        user.spotify_email = me?.email || null;
        await user.save();

        if (isPopup) return res.send(popupPage("Success", { type: "integration_success", provider: "spotify" }));
        res.redirect(`${returnTo}?integration_success=spotify`);
    } catch (error) {
        console.error("Spotify Callback Error:", error);
        if (isPopup) return res.send(popupPage("Error", { type: "integration_error", provider: "spotify" }));
        res.redirect(`${returnTo}?integration_error=spotify`);
    }
});

// 3. DISCONNECT (Spotify has no revoke API: the user can also remove Classgrid in their Spotify account's Manage apps)
router.delete("/disconnect", isAuthenticated, async (req, res) => {
    try {
        await connectDB();
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: "User not found" });
        user.spotify_access_token = null;
        user.spotify_refresh_token = null;
        user.spotify_token_expires_at = null;
        user.spotify_name = null;
        user.spotify_email = null;
        await user.save();
        res.json({ message: "Spotify disconnected successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error disconnecting Spotify", error: error.message });
    }
});

export default router;
