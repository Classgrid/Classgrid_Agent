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
import express from 'express';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import User from '../models/User.js';
import axios from 'axios';

const router = express.Router();

/**
 * @route GET /api/auth/meta/oauth
 * @desc  Get the Meta OAuth URL to redirect the user to.
 * @access Private
 */
router.get('/oauth', isAuthenticated, (req, res) => {
    const { type } = req.query; // 'facebook' or 'instagram'
    const clientId = process.env.FACEBOOK_CLIENT_ID;
    const redirectUri = `${process.env.BACKEND_URL}/api/auth/meta/callback`;
    const state = Buffer.from(JSON.stringify({ userId: req.user._id.toString(), type })).toString('base64');
    
    let scope = '';
    if (type === 'facebook') {
        scope = 'pages_manage_posts,pages_show_list,pages_read_engagement,pages_manage_metadata';
    } else {
        scope = 'instagram_basic,instagram_business_basic,instagram_content_publish,instagram_business_content_publish,instagram_manage_comments,instagram_business_manage_comments,instagram_manage_insights,instagram_business_manage_insights,instagram_manage_messages,instagram_business_manage_messages,instagram_manage_contents,pages_show_list,pages_manage_metadata,pages_read_engagement';
    }

    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=${scope}`;
    res.json({ success: true, url: authUrl });
});

/**
 * @route GET /api/auth/meta/callback
 * @desc  Handle the OAuth callback from Facebook
 * @access Public
 */
router.get('/callback', async (req, res) => {
    const { code, state, error } = req.query;

    if (error) {
        return res.redirect(`${process.env.FRONTEND_URL}/dashboard/ai-hub?error=meta_auth_failed`);
    }

    if (!code || !state) {
        return res.redirect(`${process.env.FRONTEND_URL}/dashboard/ai-hub?error=missing_code_or_state`);
    }

    try {
        let decodedState = { userId: state, type: 'facebook' };
        try {
            decodedState = JSON.parse(Buffer.from(state, 'base64').toString('ascii'));
        } catch(e) {}
        
        const { userId, type } = decodedState;
        const clientId = process.env.FACEBOOK_CLIENT_ID;
        const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;
        const redirectUri = `${process.env.BACKEND_URL}/api/auth/meta/callback`;

        // 1. Exchange code for User Access Token
        const tokenResponse = await axios.get(`https://graph.facebook.com/v19.0/oauth/access_token?client_id=${clientId}&redirect_uri=${redirectUri}&client_secret=${clientSecret}&code=${code}`);
        const userAccessToken = tokenResponse.data.access_token;

        // 2. Get User's Pages
        const pagesResponse = await axios.get(`https://graph.facebook.com/v19.0/me/accounts?access_token=${userAccessToken}`);
        const pages = pagesResponse.data.data;
        if (!pages || pages.length === 0) {
            return res.redirect(`${process.env.FRONTEND_URL}/dashboard/ai-hub?error=no_facebook_pages_found`);
        }

        const page = pages[0];
        const pageAccessToken = page.access_token;
        const pageId = page.id;

        // 3. Try to get Instagram Business Account
        let igAccountId = null;
        try {
            const igResponse = await axios.get(`https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`);
            if (igResponse.data && igResponse.data.instagram_business_account) {
                igAccountId = igResponse.data.instagram_business_account.id;
            }
        } catch (igError) {}

        // 4. Save to User
        const user = await User.findById(userId);
        if (user) {
            if (type === 'facebook') {
                user.facebook_access_token = pageAccessToken;
                user.facebook_page_id = pageId;
            } else {
                user.instagram_access_token = pageAccessToken;
                user.instagram_account_id = igAccountId;
                // IG also needs the page token to publish sometimes, but pageAccessToken is exactly what's needed for Graph API!
            }
            await user.save();
        }

        return res.redirect(`${process.env.FRONTEND_URL}/dashboard/ai-hub?success=${type}_connected`);
    } catch (err) {
        console.error('Meta OAuth Callback Error:', err?.response?.data || err.message);
        return res.redirect(`${process.env.FRONTEND_URL}/dashboard/ai-hub?error=meta_exchange_failed`);
    }
});

/**
 * @route DELETE /api/auth/meta/disconnect/:type
 * @desc  Disconnect Facebook or Instagram
 * @access Private
 */
router.delete('/disconnect/:type', isAuthenticated, async (req, res) => {
    try {
        const { type } = req.params;
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        if (type === 'facebook') {
            user.facebook_access_token = null;
            user.facebook_page_id = null;
        } else if (type === 'instagram') {
            user.instagram_access_token = null;
            user.instagram_account_id = null;
        }
        await user.save();

        return res.status(200).json({ success: true, message: `${type} disconnected.` });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

export default router;
