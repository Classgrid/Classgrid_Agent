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
import express from 'express';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import User from '../models/User.js';

const router = express.Router();

router.post('/connect', isAuthenticated, async (req, res) => {
    try {
        const { projectId, apiToken } = req.body;

        if (!projectId || !apiToken) {
            return res.status(400).json({ success: false, message: 'Project ID and API Token are required.' });
        }

        // Test the Sanity connection
        const response = await fetch(`https://${projectId}.api.sanity.io/v2022-03-07/data/query/production?query=*[_type == "sanity.imageAsset"][0...1]`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            console.error('[Sanity API Error]', await response.text());
            return res.status(401).json({ success: false, message: 'Failed to verify Sanity credentials.' });
        }

        await User.findByIdAndUpdate(req.user._id, {
            sanity_project_id: projectId,
            sanity_access_token: apiToken,
        });

        res.json({ success: true, message: 'Sanity connected successfully.' });
    } catch (err) {
        console.error('[Sanity Connect Error]', err);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

router.post('/disconnect', isAuthenticated, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user._id, {
            sanity_project_id: null,
            sanity_access_token: null,
        });
        res.json({ success: true, message: 'Sanity disconnected successfully.' });
    } catch (err) {
        console.error('[Sanity Disconnect Error]', err);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

export default router;
