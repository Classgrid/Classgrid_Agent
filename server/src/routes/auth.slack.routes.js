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

const router = express.Router();

const SLACK_CLIENT_ID = "11597433427378.12100062712277";
const SLACK_CLIENT_SECRET = "6d586b933a83e67f3256c02ab349b766";

const getSlackAuthUrl = (statePayload) => {
    const clientId = SLACK_CLIENT_ID;
    const redirectUri = `${process.env.BACKEND_URL}/api/auth/slack/callback`;
    // Must match the User Token Scopes in the Slack app settings (a scope missing there fails the whole connect).
    // admin.*, auditlogs:read (Enterprise Grid admins only) and email/profile (Sign in with Slack) are not asked for.
    const scopes = [
        'bookmarks:read', 'canvases:write',
        'channels:history', 'channels:read', 'channels:write', 'channels:write.invites',
        'chat:write', 'files:read', 'files:write',
        'groups:history', 'groups:read', 'groups:write', 'groups:write.topic',
        'im:read', 'mpim:read', 'pins:read', 'pins:write', 'reactions:read',
        'search:read', 'search:read.files', 'search:read.im', 'search:read.mpim', 'search:read.public', 'search:read.users',
        'stars:read', 'stars:write', 'team:read', 'usergroups:read',
        'users.profile:read', 'users.profile:write', 'users:read', 'users:read.email', 'users:write',
        'workflows.templates:write'
    ];
    
    const authUrl = new URL(`https://slack.com/oauth/v2/authorize`);
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('user_scope', scopes.join(',')); // user_scope instead of scope to act on behalf of user
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('state', statePayload);
    authUrl.searchParams.append('prompt', 'consent');
    
    return authUrl.toString();
};

// 1. GENERATE OAUTH URL
router.get("/connect", isAuthenticated, (req, res) => {
    if (!SLACK_CLIENT_ID || !SLACK_CLIENT_SECRET) {
        return res.status(500).json({ message: "Slack OAuth keys not configured in backend" });
    }

    const returnTo = req.query.returnTo || req.headers.referer || req.headers.origin || process.env.FRONTEND_URL;
    const isPopup = req.query.popup === 'true';
    const statePayload = Buffer.from(JSON.stringify({ 
        userId: req.user._id.toString(),
        returnTo,
        isPopup
    })).toString('base64');

    const url = getSlackAuthUrl(statePayload);
    res.json({ url });
});

// 2. HANDLE CALLBACK
router.get("/callback", async (req, res) => {
    let returnTo = null;
    let isPopup = false;
    try {
        await connectDB();
        const { code, state, error, error_description } = req.query;

        let userId;
        if (state) {
            try {
                const decodedState = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
                userId = decodedState.userId;
                if (decodedState.returnTo) returnTo = decodedState.returnTo;
                if (decodedState.isPopup) isPopup = true;
            } catch (e) {
                userId = state;
            }
        }

        if (!returnTo) returnTo = req.headers.referer || req.headers.origin;

        if (error) {
            console.error("Slack OAuth Error:", error, error_description);
            if (isPopup) {
                return res.send(`
                    <!DOCTYPE html>
                    <html><head><title>Error</title></head>
                    <body style="background:#0a0a0a; color:#fff; display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif;">
                      <h2>Error authenticating.</h2>
                      <script>
                        const payload = { type: 'integration_error', provider: 'slack' };
                        if (window.opener) { window.opener.postMessage(payload, '*'); }
                        localStorage.setItem('integration_callback', JSON.stringify({ ...payload, timestamp: Date.now() }));
                        window.close();
                      </script>
                    </body></html>
                `);
            }
            return res.redirect(`${returnTo}?integration_error=slack`);
        }

        if (!code || !userId) {
            return res.status(400).send("Missing code or state/userId.");
        }

        // Exchange code for token
        const tokenResponse = await fetch(`https://slack.com/api/oauth.v2.access`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: SLACK_CLIENT_ID,
                client_secret: SLACK_CLIENT_SECRET,
                code,
                redirect_uri: `${process.env.BACKEND_URL}/api/auth/slack/callback`
            })
        });

        const tokenData = await tokenResponse.json();

        if (!tokenData.ok) {
            console.error("Slack token error:", tokenData);
            throw new Error(tokenData.error || "Failed to exchange token");
        }

        const accessToken = tokenData.authed_user.access_token;
        const refreshToken = tokenData.authed_user.refresh_token || null; 
        
        // Fetch user info to get email
        const userRes = await fetch("https://slack.com/api/users.identity", {
            headers: { 
                "Authorization": `Bearer ${accessToken}`,
            }
        });
        const slackUser = await userRes.json();
        const slackEmail = slackUser.user?.email || null;

        const user = await User.findById(userId);
        if (!user) throw new Error("User not found");

        user.slack_access_token = accessToken;
        user.slack_refresh_token = refreshToken;
        user.slack_email = slackEmail;
        user.slack_name = slackUser.user?.name || null;
        await user.save();

        if (isPopup) {
            return res.send(`
                <!DOCTYPE html>
                <html><head><title>Success</title></head>
                <body style="background:#0a0a0a; color:#fff; display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif;">
                  <h2>Authentication successful!</h2>
                  <script>
                    const payload = { type: 'integration_success', provider: 'slack' };
                    if (window.opener) { window.opener.postMessage(payload, '*'); }
                    localStorage.setItem('integration_callback', JSON.stringify({ ...payload, timestamp: Date.now() }));
                    window.close();
                  </script>
                </body></html>
            `);
        }

        res.redirect(`${returnTo}?integration_success=slack`);
    } catch (error) {
        console.error("Slack Callback Error:", error);
        if (isPopup) {
            return res.send(`
                <!DOCTYPE html>
                <html><head><title>Error</title></head>
                <body style="background:#0a0a0a; color:#fff; display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif;">
                  <h2>Authentication failed.</h2>
                  <script>window.close();</script>
                </body></html>
            `);
        }
        res.redirect(`${returnTo}?integration_error=slack`);
    }
});

// 3. DISCONNECT
router.delete("/disconnect", isAuthenticated, async (req, res) => {
    try {
        await connectDB();
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: "User not found" });

        user.slack_access_token = null;
        user.slack_refresh_token = null;
        user.slack_email = null;
        await user.save();

        res.json({ message: "Slack disconnected successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error disconnecting Slack", error: error.message });
    }
});

export default router;
