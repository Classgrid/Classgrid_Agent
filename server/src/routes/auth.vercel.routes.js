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

// Hardcoded Vercel Keys (as requested)
const VERCEL_CLIENT_ID = "oac_3hVOxjqQqi7I3jGi19sKQl7r";
const VERCEL_CLIENT_SECRET = "5ZXJiWYrsT4iRwuQbont7H0M";

const getVercelAuthUrl = (state) => {
    // Since this is a full Vercel Integration (classgrid-mcp) and not just a simple OAuth app,
    // it MUST use the Vercel Integration installation URL. 
    // Client ID and Redirect URI are automatically handled by Vercel's dashboard config.
    const authUrl = new URL(`https://vercel.com/integrations/classgrid-mcp/new`);
    authUrl.searchParams.append('state', state);

    console.log(`[Vercel OAuth] Auth URL generated for Integration: ${authUrl.toString()}`);
    return authUrl.toString();
};

// 1. GENERATE OAUTH URL
router.get("/connect", isAuthenticated, (req, res) => {
    // Keys are hardcoded now, no need to check process.env

    const returnTo = req.query.returnTo || req.headers.referer || req.headers.origin || process.env.FRONTEND_URL;
    const isPopup = req.query.popup === 'true';
    const statePayload = Buffer.from(JSON.stringify({
        userId: req.user._id.toString(),
        returnTo,
        isPopup
    })).toString('base64');

    const url = getVercelAuthUrl(statePayload);
    res.json({ url });
});

// 2. HANDLE CALLBACK
router.get("/callback", async (req, res) => {
    let returnTo = process.env.FRONTEND_URL;
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

        if (error) {
            console.error("Vercel OAuth Error:", error, error_description);
            if (isPopup) {
                return res.send(`
                    <!DOCTYPE html>
                    <html><head><title>Error</title></head>
                    <body style="background:#0a0a0a; color:#fff; display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif;">
                      <h2>Authentication failed.</h2>
                      <script>
                        const payload = { type: 'integration_error', provider: 'vercel' };
                        if (window.opener) { window.opener.postMessage(payload, '*'); }
                        localStorage.setItem('integration_callback', JSON.stringify({ ...payload, timestamp: Date.now() }));
                        window.close();
                      </script>
                    </body></html>
                `);
            }
            return res.redirect(`${returnTo}?integration_error=vercel`);
        }

        if (!code || !userId) {
            if (isPopup) {
                return res.send(`
                    <!DOCTYPE html>
                    <html><head><title>Error</title></head>
                    <body style="background:#0a0a0a; color:#fff; display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif;">
                      <h2>Authentication failed.</h2>
                      <script>
                        const payload = { type: 'integration_error', provider: 'vercel' };
                        if (window.opener) { window.opener.postMessage(payload, '*'); }
                        localStorage.setItem('integration_callback', JSON.stringify({ ...payload, timestamp: Date.now() }));
                        window.close();
                      </script>
                    </body></html>
                `);
            }
            return res.redirect(`${returnTo}?integration_error=missing_params`);
        }

        // Exchange code for token
        const tokenResponse = await fetch(`https://api.vercel.com/v2/oauth/access_token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: VERCEL_CLIENT_ID,
                client_secret: VERCEL_CLIENT_SECRET,
                code: code,
                redirect_uri: `${process.env.BACKEND_URL}/api/auth/vercel/callback`
            })
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            console.error("Vercel Token Exchange Error:", tokenData);
            if (isPopup) {
                return res.send(`
                    <!DOCTYPE html>
                    <html><head><title>Error</title></head>
                    <body style="background:#0a0a0a; color:#fff; display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif;">
                      <h2>Error exchanging token.</h2>
                      <script>
                        const payload = { type: 'integration_error', provider: 'vercel' };
                        if (window.opener) { window.opener.postMessage(payload, '*'); }
                        localStorage.setItem('integration_callback', JSON.stringify({ ...payload, timestamp: Date.now() }));
                        window.close();
                      </script>
                    </body></html>
                `);
            }
            return res.redirect(`${returnTo}?integration_error=vercel_token`);
        }

        const user = await User.findById(userId);
        if (!user) {
            if (isPopup) {
                return res.send(`
                    <!DOCTYPE html>
                    <html><head><title>Error</title></head>
                    <body style="background:#0a0a0a; color:#fff; display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif;">
                      <h2>User not found.</h2>
                      <script>
                        const payload = { type: 'integration_error', provider: 'vercel' };
                        if (window.opener) { window.opener.postMessage(payload, '*'); }
                        localStorage.setItem('integration_callback', JSON.stringify({ ...payload, timestamp: Date.now() }));
                        window.close();
                      </script>
                    </body></html>
                `);
            }
            return res.redirect(`${returnTo}?integration_error=user_not_found`);
        }

        user.vercel_access_token = tokenData.access_token;
        
        try {
            const userRes = await fetch("https://api.vercel.com/v2/user", {
                headers: { "Authorization": `Bearer ${tokenData.access_token}` }
            });
            const vUser = await userRes.json();
            if (vUser && vUser.user) {
                user.vercel_email = vUser.user.email || null;
                user.vercel_name = vUser.user.name || null;
            }
        } catch (e) {
            console.error("Failed to fetch Vercel profile:", e);
        }
        if (tokenData.team_id) {
            user.vercel_team_id = tokenData.team_id;
        }
        await user.save();

        if (isPopup) {
            return res.send(`
                <!DOCTYPE html>
                <html><head><title>Authenticating...</title></head>
                <body style="background:#0a0a0a; color:#fff; display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif;">
                  <h2>Authenticating...</h2>
                  <script>
                    const payload = { type: 'integration_success', provider: 'vercel' };
                    if (window.opener) { window.opener.postMessage(payload, '*'); }
                    localStorage.setItem('integration_callback', JSON.stringify({ ...payload, timestamp: Date.now() }));
                    window.close();
                    setTimeout(() => { document.body.innerHTML = '<h2>Authentication complete. You can safely close this window.</h2>'; }, 1000);
                  </script>
                </body></html>
            `);
        }

        const redirectUrl = new URL(returnTo);
        redirectUrl.searchParams.set('integration_success', 'vercel');
        res.redirect(redirectUrl.toString());
    } catch (err) {
        console.error("Vercel Callback Error:", err);
        if (isPopup) {
            return res.send(`
                <!DOCTYPE html>
                <html><head><title>Error</title></head>
                <body style="background:#0a0a0a; color:#fff; display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif;">
                  <h2>Fatal error occurred.</h2>
                  <script>
                    const payload = { type: 'integration_error', provider: 'vercel' };
                    if (window.opener) { window.opener.postMessage(payload, '*'); }
                    localStorage.setItem('integration_callback', JSON.stringify({ ...payload, timestamp: Date.now() }));
                    window.close();
                  </script>
                </body></html>
            `);
        }
        res.redirect(`${process.env.FRONTEND_URL || 'https://classgrid.in'}?integration_error=vercel_fatal`);
    }
});

// 3. DISCONNECT ACCOUNT
router.post("/disconnect", isAuthenticated, async (req, res) => {
    try {
        await connectDB();
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: "User not found" });

        user.vercel_access_token = undefined;
        user.vercel_team_id = undefined;
        await user.save();

        res.json({ success: true, message: "Vercel account disconnected" });
    } catch (err) {
        console.error("Vercel Disconnect Error:", err);
        res.status(500).json({ message: "Failed to disconnect Vercel account" });
    }
});

export default router;
