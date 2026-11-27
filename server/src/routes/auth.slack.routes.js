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
import express from "express";
import { isAuthenticated } from "../middleware/auth.middleware.js";
import User from "../models/User.js";
import connectDB from "../../config/db.js";
import redis from "../config/redis.js";
import {
    isState, newState, revokeSlackToken, safeReturnTo, SLACK_CLEARED, SLACK_USER_SCOPES, slackProfile, STATE_TTL_SECONDS, stateKey,
} from "../services/slack-auth.js";

const router = express.Router();

// The Slack app's keys are server settings (SLACK_CLIENT_ID / SLACK_CLIENT_SECRET), never in the code
const slackKeys = () => ({ id: process.env.SLACK_CLIENT_ID, secret: process.env.SLACK_CLIENT_SECRET });
const redirectUri = () => `${process.env.BACKEND_URL}/api/auth/slack/callback`;

const getSlackAuthUrl = (state) => {
    const authUrl = new URL(`https://slack.com/oauth/v2/authorize`);
    authUrl.searchParams.append('client_id', slackKeys().id);
    // user_scope, not scope: Classgrid acts as the person, there is no bot user. The list is services/slack-auth.js;
    // it must equal the User Token Scopes in the Slack app's settings.
    authUrl.searchParams.append('user_scope', SLACK_USER_SCOPES.join(','));
    authUrl.searchParams.append('redirect_uri', redirectUri());
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('prompt', 'consent');
    return authUrl.toString();
};

const popupPage = (ok, heading) => `
    <!DOCTYPE html>
    <html><head><title>${ok ? "Success" : "Error"}</title></head>
    <body style="background:#0a0a0a; color:#fff; display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif;">
      <h2>${heading}</h2>
      <script>
        const payload = { type: '${ok ? "integration_success" : "integration_error"}', provider: 'slack' };
        if (window.opener) { window.opener.postMessage(payload, '*'); }
        localStorage.setItem('integration_callback', JSON.stringify({ ...payload, timestamp: Date.now() }));
        window.close();
      </script>
    </body></html>
`;

const withParam = (url, key, value) => {
    const u = new URL(url);
    u.searchParams.set(key, value);
    return u.toString();
};

// 1. GENERATE OAUTH URL
// The state is a random id kept in Redis for 10 minutes with the account and where to return; the callback takes it
// once. A forged or replayed callback finds nothing and changes nothing.
router.get("/connect", isAuthenticated, async (req, res) => {
    const { id, secret } = slackKeys();
    if (!id || !secret) {
        return res.status(500).json({ message: "Slack OAuth keys not configured in backend" });
    }
    const returnTo = safeReturnTo(req.query.returnTo || req.headers.referer || req.headers.origin || process.env.FRONTEND_URL);
    const state = newState();
    await redis.set(stateKey(state), JSON.stringify({
        userId: req.user._id.toString(),
        returnTo,
        isPopup: req.query.popup === 'true',
    }), "EX", STATE_TTL_SECONDS);
    res.json({ url: getSlackAuthUrl(state) });
});

// 2. HANDLE CALLBACK
router.get("/callback", async (req, res) => {
    let returnTo = null;
    let isPopup = false;
    try {
        await connectDB();
        const { code, state, error, error_description } = req.query;

        const saved = isState(state) ? JSON.parse((await redis.get(stateKey(state))) || "null") : null;
        if (saved) await redis.del(stateKey(state)).catch(() => {});
        const userId = saved?.userId;
        returnTo = saved?.returnTo || null;
        isPopup = !!saved?.isPopup;

        if (error) {
            console.error("Slack OAuth Error:", error, error_description);
            if (isPopup) return res.send(popupPage(false, "Error authenticating."));
            return returnTo ? res.redirect(withParam(returnTo, "integration_error", "slack")) : res.status(400).send("Slack sign-in was cancelled.");
        }

        if (!code || !userId) {
            return res.status(400).send("Missing code or state/userId.");
        }

        // Exchange code for token
        const { id, secret } = slackKeys();
        const tokenResponse = await fetch(`https://slack.com/api/oauth.v2.access`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ client_id: id, client_secret: secret, code, redirect_uri: redirectUri() }),
        });
        const tokenData = await tokenResponse.json();
        if (!tokenData.ok) {
            console.error("Slack token error:", tokenData.error);
            throw new Error(tokenData.error || "Failed to exchange token");
        }

        const accessToken = tokenData.authed_user.access_token;
        const refreshToken = tokenData.authed_user.refresh_token || null;

        const user = await User.findById(userId);
        if (!user) throw new Error("User not found");

        // A token this account had before is ended at Slack, so only one stays alive
        if (user.slack_access_token && user.slack_access_token !== accessToken) await revokeSlackToken(user.slack_access_token);

        user.slack_access_token = accessToken;
        user.slack_refresh_token = refreshToken;
        // The Slack ids find this account when Slack says the app was removed or the token revoked (webhook.routes.js)
        Object.assign(user, {
            slack_user_id: tokenData.authed_user.id || null,
            slack_team_id: tokenData.team?.id || null,
            slack_email: null,
            slack_name: null,
        }, await slackProfile(accessToken));
        await user.save();

        if (isPopup) return res.send(popupPage(true, "Authentication successful!"));
        return returnTo ? res.redirect(withParam(returnTo, "integration_success", "slack")) : res.send("Slack is connected. You can close this window.");
    } catch (error) {
        console.error("Slack Callback Error:", error?.message || error);
        if (isPopup) return res.send(popupPage(false, "Authentication failed."));
        return returnTo ? res.redirect(withParam(returnTo, "integration_error", "slack")) : res.status(500).send("Slack connection failed.");
    }
});

// 3. DISCONNECT: the token is ended at Slack too (auth.revoke), and everything kept from the Slack account is deleted
router.delete("/disconnect", isAuthenticated, async (req, res) => {
    try {
        await connectDB();
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: "User not found" });

        await revokeSlackToken(user.slack_access_token);
        Object.assign(user, SLACK_CLEARED);
        await user.save();

        res.json({ message: "Slack disconnected" });
    } catch (error) {
        res.status(500).json({ message: "Error disconnecting Slack", error: error.message });
    }
});

export default router;
