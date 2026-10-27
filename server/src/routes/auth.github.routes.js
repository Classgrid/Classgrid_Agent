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

export const GITHUB_CLIENT_ID = "Ov23lije9NerEtV7Lseb";
export const GITHUB_CLIENT_SECRET = "07acf4d6a0f8f9be1da6b8b6c18900531ff10ee1";

const getGithubAuthUrl = (statePayload) => {
    const clientId = GITHUB_CLIENT_ID;
    const redirectUri = `${process.env.BACKEND_URL}/api/auth/github/callback`;
    const scopes = ['repo', 'workflow', 'user:email', 'read:org'];
    
    const authUrl = new URL(`https://github.com/login/oauth/authorize`);
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('scope', scopes.join(' '));
    authUrl.searchParams.append('state', statePayload);
    authUrl.searchParams.append('prompt', 'consent');
    
    return authUrl.toString();
};

// 1. GENERATE OAUTH URL
router.get("/connect", isAuthenticated, (req, res) => {
    if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
        return res.status(500).json({ message: "GitHub OAuth keys not configured in backend" });
    }

    const returnTo = req.query.returnTo || req.headers.referer || req.headers.origin || process.env.FRONTEND_URL;
    const isPopup = req.query.popup === 'true';
    const statePayload = Buffer.from(JSON.stringify({ 
        userId: req.user._id.toString(),
        returnTo,
        isPopup
    })).toString('base64');

    const url = getGithubAuthUrl(statePayload);
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
            console.error("GitHub OAuth Error:", error, error_description);
            if (isPopup) {
                return res.send(`
                    <!DOCTYPE html>
                    <html><head><title>Error</title></head>
                    <body style="background:#0a0a0a; color:#fff; display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif;">
                      <h2>Error authenticating.</h2>
                      <script>
                        const payload = { type: 'integration_error', provider: 'github' };
                        if (window.opener) { window.opener.postMessage(payload, '*'); }
                        localStorage.setItem('integration_callback', JSON.stringify({ ...payload, timestamp: Date.now() }));
                        window.close();
                      </script>
                    </body></html>
                `);
            }
            return res.redirect(`${returnTo}?integration_error=github`);
        }

        if (!code || !userId) {
            return res.status(400).send("Missing code or state/userId.");
        }

        // Exchange code for token
        const tokenResponse = await fetch(`https://github.com/login/oauth/access_token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                client_id: GITHUB_CLIENT_ID,
                client_secret: GITHUB_CLIENT_SECRET,
                code,
                redirect_uri: `${process.env.BACKEND_URL}/api/auth/github/callback`
            })
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            console.error("GitHub token error:", tokenData);
            throw new Error(tokenData.error_description || "Failed to exchange token");
        }

        const accessToken = tokenData.access_token;
        const refreshToken = tokenData.refresh_token || null; // GitHub apps may or may not have refresh tokens based on settings

        // Fetch user info to get email
        const userRes = await fetch("https://api.github.com/user", {
            headers: { 
                "Authorization": `Bearer ${accessToken}`,
                "Accept": "application/vnd.github.v3+json"
            }
        });
        const githubUser = await userRes.json();
        
        let githubEmail = githubUser.email;
        if (!githubEmail) {
            // Fetch emails specifically if not public
            const emailRes = await fetch("https://api.github.com/user/emails", {
                headers: { 
                    "Authorization": `Bearer ${accessToken}`,
                    "Accept": "application/vnd.github.v3+json"
                }
            });
            const emails = await emailRes.json();
            const primaryEmail = emails.find(e => e.primary);
            if (primaryEmail) {
                githubEmail = primaryEmail.email;
            }
        }

        const user = await User.findById(userId);
        if (!user) throw new Error("User not found");

        user.github_access_token = accessToken;
        user.github_refresh_token = refreshToken;
        user.github_email = githubEmail;
        user.github_name = githubUser.name || githubUser.login;
        await user.save();

        if (isPopup) {
            return res.send(`
                <!DOCTYPE html>
                <html><head><title>Success</title></head>
                <body style="background:#0a0a0a; color:#fff; display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif;">
                  <h2>Authentication successful!</h2>
                  <script>
                    const payload = { type: 'integration_success', provider: 'github' };
                    if (window.opener) { window.opener.postMessage(payload, '*'); }
                    localStorage.setItem('integration_callback', JSON.stringify({ ...payload, timestamp: Date.now() }));
                    window.close();
                  </script>
                </body></html>
            `);
        }

        res.redirect(`${returnTo}?integration_success=github`);
    } catch (error) {
        console.error("GitHub Callback Error:", error);
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
        res.redirect(`${returnTo}?integration_error=github`);
    }
});

// 3. DISCONNECT
router.delete("/disconnect", isAuthenticated, async (req, res) => {
    try {
        await connectDB();
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: "User not found" });

        user.github_access_token = null;
        user.github_refresh_token = null;
        user.github_email = null;
        await user.save();

        res.json({ message: "GitHub disconnected successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error disconnecting GitHub", error: error.message });
    }
});

export default router;
