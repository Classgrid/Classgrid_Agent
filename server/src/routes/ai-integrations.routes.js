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

// ─────────────────────────────────────────────
// GET /api/ai-integrations/status
// Returns REAL connection status for all integrations
// by checking actual OAuth tokens stored on the user.
// ─────────────────────────────────────────────
router.get("/status", isAuthenticated, async (req, res) => {
    try {
        await connectDB();
        const user = await User.findById(req.user._id).select(
            "google_access_token google_refresh_token microsoft_access_token microsoft_refresh_token zoom_access_token zoom_refresh_token vercel_access_token notion_access_token notion_refresh_token webex_access_token webex_refresh_token metadata slack_access_token github_access_token supabase_access_token supabase_refresh_token sanity_access_token sanity_project_id meta_access_token meta_page_id meta_ig_account_id facebook_access_token facebook_page_id instagram_access_token instagram_account_id"
        ).lean();

        if (!user) return res.status(404).json({ message: "User not found" });

        const connected = [];

        // Helper to check if a token is valid (exists, not empty, not "null")
        const isValidToken = (token) => {
            return token != null && typeof token === 'string' && token.trim().length > 5 && token !== "null" && token !== "undefined";
        };

        // Google Workspace — ONLY if real OAuth tokens exist AND they specifically connected that service
        if (isValidToken(user.google_access_token) || isValidToken(user.google_refresh_token)) {
            if (user.metadata && Array.isArray(user.metadata.connected_google_services)) {
                connected.push(...user.metadata.connected_google_services);
            }
        }
        
        // YouTube — Check explicitly in metadata
        if (user.metadata?.youtube_tokens?.access_token || user.metadata?.youtube_tokens?.refresh_token) {
            if (isValidToken(user.metadata.youtube_tokens.access_token) || isValidToken(user.metadata.youtube_tokens.refresh_token)) {
                connected.push("youtube");
            }
        }

        // Microsoft — ONLY if real OAuth tokens exist
        if (isValidToken(user.microsoft_access_token) || isValidToken(user.microsoft_refresh_token)) {
            connected.push("outlook", "teams");
        }

        // Zoom — ONLY if real OAuth tokens exist
        if (isValidToken(user.zoom_access_token) || isValidToken(user.zoom_refresh_token)) {
            connected.push("zoom");
        }

        // Vercel — ONLY if real OAuth token exists
        if (isValidToken(user.vercel_access_token)) connected.push("vercel");

        // Supabase — ONLY if real OAuth token exists
        if (isValidToken(user.supabase_access_token) || isValidToken(user.supabase_refresh_token)) {
            connected.push("supabase");
        }

        // Sanity — ONLY if real API token exists
        if (isValidToken(user.sanity_access_token)) {
            connected.push("sanity");
        }

        // Facebook — ONLY if real API token exists
        if (isValidToken(user.facebook_access_token)) {
            connected.push("facebook");
        }

        // Instagram — ONLY if real API token exists
        if (isValidToken(user.instagram_access_token)) {
            connected.push("instagram");
        }

        // Notion — ONLY if real OAuth tokens exist
        if (isValidToken(user.notion_access_token) || isValidToken(user.notion_refresh_token)) connected.push("mcp-notion");

        // Slack — ONLY if real OAuth token exists
        if (isValidToken(user.slack_access_token)) connected.push("slack");

        // GitHub — ONLY if real OAuth token exists
        if (isValidToken(user.github_access_token)) connected.push("github");

        // Generic integrations (Claude, ChatGPT, Cursor, etc)
        if (user.metadata && Array.isArray(user.metadata.connected_integrations)) {
            const genericIntegrations = user.metadata.connected_integrations.filter(id => 
                !["slack", "github", "mcp-notion", "vercel", "zoom", "outlook", "teams"].includes(id)
            );
            connected.push(...genericIntegrations);
        }

        // Log what we found for debugging
        console.log(`[Integration Status] User ${req.user._id}: connected=[${connected.join(',')}], google_token=${!!user.google_access_token}, ms_token=${!!user.microsoft_access_token}, zoom_token=${!!user.zoom_access_token}, vercel_token=${!!user.vercel_access_token}, notion_token=${!!user.notion_access_token}, slack_token=${!!user.slack_access_token}, github_token=${!!user.github_access_token}`);

        res.json({ connected });
    } catch (err) {
        console.error("AI Integration Status Error:", err);
        res.status(500).json({ message: "Failed to fetch integration status" });
    }
});

// ─────────────────────────────────────────────
// GET /api/ai-integrations/connect/:id  
// Only for integrations that don't have their own OAuth routes
// (MCP plugins like Cursor, ChatGPT, Claude, WhatsApp)
// ─────────────────────────────────────────────
router.get("/connect/:id", isAuthenticated, async (req, res) => {
    try {
        await connectDB();
        const { id } = req.params;
        
        const user = await User.findById(req.user._id);
        
        if (!user.metadata) user.metadata = {};
        if (!user.metadata.connected_integrations) {
            user.metadata.connected_integrations = [];
        }

        if (!user.metadata.connected_integrations.includes(id)) {
            user.metadata.connected_integrations.push(id);
            user.markModified('metadata');
            await user.save();
        }

        // Return success without a redirect URL so the frontend can just show a toast
        res.json({ success: true });

    } catch (err) {
        console.error("AI Integration Connect Error:", err);
        res.status(500).json({ message: "Failed to connect integration" });
    }
});

router.post("/disconnect/:id", isAuthenticated, async (req, res) => {
    try {
        await connectDB();
        const { id } = req.params;
        const user = await User.findById(req.user._id);
        
        if (user.metadata && user.metadata.connected_integrations) {
            user.metadata.connected_integrations = user.metadata.connected_integrations.filter(i => i !== id);
            user.markModified('metadata');
        }

        if (id === 'slack') {
            user.slack_access_token = undefined;
            user.slack_refresh_token = undefined;
            user.slack_email = undefined;
        } else if (id === 'github') {
            user.github_access_token = undefined;
            user.github_refresh_token = undefined;
            user.github_username = undefined;
            user.github_email = undefined;
        }

        await user.save();

        res.json({ success: true, message: "Integration disconnected" });
    } catch (error) {
        console.error("Integration disconnect error:", error);
        res.status(500).json({ message: "Failed to disconnect" });
    }
});

export default router;

