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
import express from "express";
import { isAuthenticated } from "../middleware/auth.middleware.js";
import User from "../models/User.js";
import connectDB from "../../config/db.js";

const router = express.Router();

const CLIENT_ID = process.env.SUPABASE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.SUPABASE_OAUTH_CLIENT_SECRET;
const REDIRECT_URI = `${process.env.BACKEND_URL}/api/auth/supabase/callback`;

// 1. Redirect to Supabase OAuth
router.get("/connect", isAuthenticated, (req, res) => {
    if (!CLIENT_ID || !CLIENT_SECRET) {
        return res.status(500).json({ error: "Supabase OAuth keys not configured" });
    }

    const returnTo = req.query.returnTo || req.headers.referer || req.headers.origin || process.env.FRONTEND_URL;
    const isPopup = req.query.popup === 'true';

    const statePayload = Buffer.from(JSON.stringify({
        userId: req.user._id.toString(),
        returnTo,
        isPopup
    })).toString('base64');

    const authUrl = `https://api.supabase.com/v1/oauth/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${encodeURIComponent(statePayload)}`;
    
    res.json({ url: authUrl });
});

// 2. Handle OAuth Callback
router.get("/callback", async (req, res) => {
    let returnTo = null;
    let isPopup = false;
    
    try {
        await connectDB();
        const { code, state, error } = req.query;

        if (state) {
            try {
                const decodedState = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
                returnTo = decodedState.returnTo;
                isPopup = decodedState.isPopup;
            } catch (e) {}
        }
        
        if (!returnTo) returnTo = process.env.FRONTEND_URL;

        if (error || !code) {
            console.error("Supabase OAuth Error:", error);
            if (isPopup) {
                return res.send(`
                    <!DOCTYPE html>
                    <html><head><title>Error</title></head>
                    <body style="background:#0a0a0a; color:#fff; display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif;">
                      <h2>Authentication failed. You can safely close this window.</h2>
                      <script>
                        const payload = { type: 'integration_error', provider: 'supabase' };
                        if (window.opener) { window.opener.postMessage(payload, '*'); }
                        localStorage.setItem('integration_callback', JSON.stringify({ ...payload, timestamp: Date.now() }));
                        window.close();
                      </script>
                    </body></html>
                `);
            }
            return res.redirect(`${returnTo}?integration_error=supabase`);
        }

        // Exchange code for token
        const authHeader = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
        const tokenResponse = await fetch('https://api.supabase.com/v1/oauth/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${authHeader}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI
            }).toString()
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
            throw new Error(tokenData.error_description || "Failed to exchange token");
        }

        let userId;
        if (state) {
            try {
                const decodedState = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
                userId = decodedState.userId;
            } catch (e) {
                userId = state;
            }
        }

        if (userId) {
            const user = await User.findById(userId);
            if (user) {
                user.supabase_access_token = tokenData.access_token;
                user.supabase_refresh_token = tokenData.refresh_token;
                await user.save();
            }
        }

        if (isPopup) {
            return res.send(`
                <!DOCTYPE html>
                <html><head><title>Authenticating...</title></head>
                <body style="background:#0a0a0a; color:#fff; display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif;">
                  <h2>Authentication complete. You can safely close this window.</h2>
                  <script>
                    const payload = { type: 'integration_success', provider: 'supabase' };
                    if (window.opener) { window.opener.postMessage(payload, '*'); }
                    localStorage.setItem('integration_callback', JSON.stringify({ ...payload, timestamp: Date.now() }));
                    window.close();
                  </script>
                </body></html>
            `);
        }

        const redirectUrl = new URL(returnTo);
        redirectUrl.searchParams.set('integration_success', 'supabase');
        res.redirect(redirectUrl.toString());

    } catch (err) {
        console.error("Supabase Callback Error:", err);
        if (isPopup) {
            return res.send(`
                <!DOCTYPE html>
                <html><head><title>Error</title></head>
                <body style="background:#0a0a0a; color:#fff; display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif;">
                  <h2>Error connecting to Supabase.</h2>
                  <script>
                    const payload = { type: 'integration_error', provider: 'supabase' };
                    if (window.opener) { window.opener.postMessage(payload, '*'); }
                    localStorage.setItem('integration_callback', JSON.stringify({ ...payload, timestamp: Date.now() }));
                    window.close();
                  </script>
                </body></html>
            `);
        }
        res.redirect(`${returnTo}?integration_error=supabase`);
    }
});

// 3. Disconnect
router.post("/disconnect", isAuthenticated, async (req, res) => {
    try {
        await connectDB();
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: "User not found" });

        user.supabase_access_token = undefined;
        user.supabase_refresh_token = undefined;
        await user.save();

        res.json({ success: true, message: "Disconnected Supabase" });
    } catch (err) {
        res.status(500).json({ message: "Failed to disconnect Supabase" });
    }
});

export default router;
