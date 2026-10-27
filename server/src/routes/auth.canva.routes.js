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
// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
// Canva Connect OAuth (PKCE). Redirect URL to set in the Canva Developer Portal: {BACKEND_URL}/api/auth/canva/callback
import express from "express";
import crypto from "crypto";
import { isAuthenticated } from "../middleware/auth.middleware.js";
import User from "../models/User.js";
import connectDB from "../../config/db.js";
import redis from "../config/redis.js";
import { CANVA_TOKEN_URL as TOKEN_URL, canvaBasicAuth as basicAuth, saveCanvaTokens as saveTokens } from "../services/canva.service.js";

const router = express.Router();

const CANVA_CLIENT_ID = () => process.env.CANVA_CLIENT_ID?.trim();
const CANVA_CLIENT_SECRET = () => process.env.CANVA_CLIENT_SECRET?.trim();
const REDIRECT_URI = () => `${process.env.BACKEND_URL}/api/auth/canva/callback`;
// The scopes turned on for the Classgrid app in the Canva Developer Portal
const SCOPES = [
    "app:read", "app:write", "asset:read", "asset:write", "brandtemplate:content:read", "brandtemplate:content:write", "brandtemplate:meta:read",
    "comment:read", "comment:write", "design:content:read", "design:content:write", "design:meta:read", "design:meta:write",
    "design:permission:read", "design:permission:write", "folder:read", "folder:write",
    "folder:permission:read", "folder:permission:write", "profile:read",
];
const STATE_KEY = (state) => `canva:oauth:${state}`;

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
    if (!CANVA_CLIENT_ID() || !CANVA_CLIENT_SECRET()) {
        return res.status(500).json({ message: "Canva OAuth keys not configured in backend" });
    }
    // PKCE: the code_verifier stays on the server (Redis, 10 minutes), only its hash goes to Canva
    const verifier = crypto.randomBytes(64).toString("base64url");
    const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
    const state = crypto.randomBytes(24).toString("base64url");
    const returnTo = req.query.returnTo || req.headers.referer || req.headers.origin || process.env.FRONTEND_URL;
    await redis.set(STATE_KEY(state), JSON.stringify({
        userId: req.user._id.toString(), returnTo, isPopup: req.query.popup === "true", verifier,
    }), "EX", 600);

    const authUrl = new URL("https://www.canva.com/api/oauth/authorize");
    authUrl.searchParams.append("code_challenge", challenge);
    authUrl.searchParams.append("code_challenge_method", "S256");
    authUrl.searchParams.append("scope", SCOPES.join(" "));
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("client_id", CANVA_CLIENT_ID());
    authUrl.searchParams.append("state", state);
    authUrl.searchParams.append("redirect_uri", REDIRECT_URI());
    res.json({ url: authUrl.toString() });
});

// 2. HANDLE CALLBACK
router.get("/callback", async (req, res) => {
    let returnTo = process.env.FRONTEND_URL;
    let isPopup = false;
    try {
        await connectDB();
        const { code, state, error, error_description } = req.query;
        const saved = state ? JSON.parse((await redis.get(STATE_KEY(state))) || "null") : null;
        if (saved) {
            await redis.del(STATE_KEY(state)).catch(() => {});
            if (saved.returnTo) returnTo = saved.returnTo;
            isPopup = !!saved.isPopup;
        }

        if (error || !saved || !code) {
            console.error("Canva OAuth Error:", error || (!saved ? "unknown or expired state" : "missing code"), error_description || "");
            if (isPopup) return res.send(popupPage("Error", { type: "integration_error", provider: "canva" }));
            return res.redirect(`${returnTo}?integration_error=canva`);
        }

        // Exchange code for token
        const tokenResponse = await fetch(TOKEN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: basicAuth() },
            body: new URLSearchParams({ grant_type: "authorization_code", code, code_verifier: saved.verifier, redirect_uri: REDIRECT_URI() }),
        });
        const tokenData = await tokenResponse.json().catch(() => ({}));
        if (!tokenResponse.ok || !tokenData.access_token) {
            console.error("Canva token error:", tokenResponse.status, tokenData);
            throw new Error(tokenData.error_description || tokenData.error || "Failed to exchange token");
        }

        // The Canva display name, shown as "Connected as ..."
        const profileRes = await fetch("https://api.canva.com/rest/v1/users/me/profile", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const profile = await profileRes.json().catch(() => ({}));

        const user = await User.findById(saved.userId);
        if (!user) throw new Error("User not found");
        saveTokens(user, tokenData);
        user.canva_name = profile?.profile?.display_name || null;
        await user.save();

        if (isPopup) return res.send(popupPage("Success", { type: "integration_success", provider: "canva" }));
        res.redirect(`${returnTo}?integration_success=canva`);
    } catch (error) {
        console.error("Canva Callback Error:", error);
        if (isPopup) return res.send(popupPage("Error", { type: "integration_error", provider: "canva" }));
        res.redirect(`${returnTo}?integration_error=canva`);
    }
});

// 3. DISCONNECT
router.delete("/disconnect", isAuthenticated, async (req, res) => {
    try {
        await connectDB();
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Tell Canva to revoke the token too (best effort)
        const token = user.canva_refresh_token || user.canva_access_token;
        if (token && CANVA_CLIENT_ID() && CANVA_CLIENT_SECRET()) {
            await fetch("https://api.canva.com/rest/v1/oauth/revoke", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: basicAuth() },
                body: new URLSearchParams({ token }),
            }).catch(() => {});
        }
        user.canva_access_token = null;
        user.canva_refresh_token = null;
        user.canva_token_expires_at = null;
        user.canva_name = null;
        await user.save();

        res.json({ message: "Canva disconnected successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error disconnecting Canva", error: error.message });
    }
});

export default router;
