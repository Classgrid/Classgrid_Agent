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

const getNotionAuthUrl = (state) => {
    const clientId = process.env.NOTION_CLIENT_ID;
    const redirectUri = `${process.env.BACKEND_URL}/api/auth/notion/callback`;
    
    const authUrl = new URL(`https://api.notion.com/v1/oauth/authorize`);
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('owner', 'user');
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('state', state);
    
    return authUrl.toString();
};

// 1. GENERATE OAUTH URL
router.get("/connect", isAuthenticated, (req, res) => {
    if (!process.env.NOTION_CLIENT_ID || !process.env.NOTION_CLIENT_SECRET) {
        return res.status(500).json({ message: "Notion OAuth keys not configured in backend" });
    }

    const returnTo = req.query.returnTo || req.headers.referer || req.headers.origin || process.env.FRONTEND_URL;
    const isPopup = req.query.popup === 'true';
    const statePayload = Buffer.from(JSON.stringify({ 
        userId: req.user._id.toString(),
        returnTo,
        isPopup
    })).toString('base64');

    const url = getNotionAuthUrl(statePayload);
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
            console.error("Notion OAuth Error:", error, error_description);
            if (userId) {
                const user = await User.findById(userId);
                if (user) {
                    user.metadata = user.metadata || {};
                    user.metadata.integration_errors = user.metadata.integration_errors || {};
                    user.metadata.integration_errors.notion = error_description || error;
                    user.markModified('metadata');
                    await user.save();
                }
            }
            if (isPopup) {
                return res.send(`
                    <!DOCTYPE html>
                    <html><head><title>Error</title></head>
                    <body style="background:#0a0a0a; color:#fff; display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif;">
                      <h2>Error authenticating.</h2>
                      <script>
                        const payload = { type: 'integration_error', provider: 'notion' };
                        if (window.opener) { window.opener.postMessage(payload, '*'); }
                        localStorage.setItem('integration_callback', JSON.stringify({ ...payload, timestamp: Date.now() }));
                        window.close();
                        setTimeout(() => { document.body.innerHTML = '<h2>Authentication failed. You can safely close this window.</h2>'; }, 1000);
                      </script>
                    </body></html>
                `);
            }
            return res.redirect(`${returnTo}?integration_error=notion`);
        }

        if (!code || !userId) {
            console.error("❌ Notion Callback Missing code or state. Query was:", req.query);
            return returnTo 
                ? res.redirect(`${returnTo}?integration_error=notion_missing_params`)
                : res.status(400).json({ error: "Missing code or state" });
        }
        // Exchange code for token
        const credentials = Buffer.from(`${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`).toString('base64');
        const tokenResponse = await fetch(`https://api.notion.com/v1/oauth/token`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json',
                'Notion-Version': '2022-06-28'
            },
            body: JSON.stringify({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: `${process.env.BACKEND_URL}/api/auth/notion/callback`
            })
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            console.error("Notion Token Exchange Error:", tokenData);
            if (isPopup) {
                return res.send(`
                    <!DOCTYPE html>
                    <html><head><title>Error</title></head>
                    <body style="background:#0a0a0a; color:#fff; display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif;">
                      <h2>Error exchanging token.</h2>
                      <script>
                        const payload = { type: 'integration_error', provider: 'notion' };
                        if (window.opener) { window.opener.postMessage(payload, '*'); }
                        localStorage.setItem('integration_callback', JSON.stringify({ ...payload, timestamp: Date.now() }));
                        window.close();
                      </script>
                    </body></html>
                `);
            }
            return res.redirect(`${returnTo}?integration_error=notion_token`);
        }
        
        const user = await User.findById(userId);
        if (!user) {
            console.error(`❌ User not found for ID: ${userId}`);
            return res.redirect(`${returnTo}?integration_error=user_not_found`);
        }

        user.notion_access_token = tokenData.access_token;
        
        try {
            // Notion's /v1/users/me returns bot info which often includes the owner
            const userRes = await fetch("https://api.notion.com/v1/users/me", {
                headers: { 
                    "Authorization": `Bearer ${tokenData.access_token}`,
                    "Notion-Version": "2022-06-28"
                }
            });
            const nUser = await userRes.json();
            if (nUser && nUser.bot && nUser.bot.owner && nUser.bot.owner.user) {
                const owner = nUser.bot.owner.user;
                if (owner.person) {
                    user.notion_email = owner.person.email || null;
                }
                user.notion_name = owner.name || null;
            } else if (tokenData.workspace_name) {
                user.notion_name = tokenData.workspace_name;
            }
        } catch (e) {
            console.error("Failed to fetch Notion profile:", e);
        }
        user.notion_workspace_id = tokenData.workspace_id;
        user.notion_bot_id = tokenData.bot_id;

        if (tokenData.refresh_token) {
            user.notion_refresh_token = tokenData.refresh_token; 
        }
        // Clear any previous errors on success
        user.metadata = user.metadata || {};
        if (user.metadata.integration_errors && user.metadata.integration_errors.notion) {
            delete user.metadata.integration_errors.notion;
            user.markModified('metadata');
        }
        
        await user.save();

        if (isPopup) {
            return res.send(`
                <!DOCTYPE html>
                <html><head><title>Authenticating...</title></head>
                <body style="background:#0a0a0a; color:#fff; display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif;">
                  <h2>Authenticating...</h2>
                  <script>
                    const payload = { type: 'integration_success', provider: 'notion' };
                    if (window.opener) { window.opener.postMessage(payload, '*'); }
                    localStorage.setItem('integration_callback', JSON.stringify({ ...payload, timestamp: Date.now() }));
                    window.close();
                    setTimeout(() => { document.body.innerHTML = '<h2>Authentication complete. You can safely close this window.</h2>'; }, 1000);
                  </script>
                </body></html>
            `);
        }

        const redirectUrl = new URL(returnTo);
        redirectUrl.searchParams.set('integration_success', 'notion');
        res.redirect(redirectUrl.toString());
    } catch (err) {
        console.error("Notion Callback Error:", err);
        
        if (isPopup) {
            return res.send(`
                <!DOCTYPE html>
                <html><head><title>Error</title></head>
                <body style="background:#0a0a0a; color:#fff; display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif;">
                  <h2>Error authenticating.</h2>
                  <script>
                    const payload = { type: 'integration_error', provider: 'notion' };
                    if (window.opener) { window.opener.postMessage(payload, '*'); }
                    localStorage.setItem('integration_callback', JSON.stringify({ ...payload, timestamp: Date.now() }));
                    window.close();
                    setTimeout(() => { document.body.innerHTML = '<h2>Authentication failed. You can safely close this window.</h2>'; }, 1000);
                  </script>
                </body></html>
            `);
        }
        if (returnTo) {
            res.redirect(`${returnTo}?integration_error=notion_fatal`);
        } else {
            res.status(500).json({ error: "Notion connection failed", message: err.message });
        }
    }
});

// 3. DISCONNECT ACCOUNT
router.post("/disconnect", isAuthenticated, async (req, res) => {
    try {
        await connectDB();
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: "User not found" });

        user.notion_access_token = undefined;
        user.notion_refresh_token = undefined;
        user.notion_token_expiry = undefined;
        await user.save();

        res.json({ success: true, message: "Notion account disconnected" });
    } catch (err) {
        console.error("Notion Disconnect Error:", err);
        res.status(500).json({ message: "Failed to disconnect Notion account" });
    }
});

export default router;
