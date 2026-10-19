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
// POST /api/whatsapp/connect
// Verifies Meta API credentials and saves them
// ─────────────────────────────────────────────
router.post("/connect", isAuthenticated, async (req, res) => {
    try {
        await connectDB();
        const { phoneId, accessToken, verifyToken } = req.body;
        
        if (!phoneId || !accessToken || !verifyToken) {
            return res.status(400).json({ success: false, message: "Missing credentials" });
        }

        // Verify the token by calling the Meta Graph API
        const metaRes = await fetch(`https://graph.facebook.com/v19.0/${phoneId}?access_token=${accessToken}`);
        
        if (!metaRes.ok) {
            return res.status(400).json({ success: false, message: "Invalid credentials. Meta API rejected the token." });
        }

        const user = await User.findById(req.user._id);
        
        if (!user.metadata) user.metadata = {};
        
        // Save the credentials securely
        user.metadata.whatsapp_credentials = {
            phoneId,
            accessToken,
            verifyToken
        };

        // Also add to connected_integrations if not there, for UI tracking
        if (!user.metadata.connected_integrations) {
            user.metadata.connected_integrations = [];
        }
        if (!user.metadata.connected_integrations.includes('whatsapp')) {
            user.metadata.connected_integrations.push('whatsapp');
        }

        user.markModified('metadata');
        await user.save();

        res.json({ success: true, message: "WhatsApp connected successfully!" });

    } catch (err) {
        console.error("WhatsApp Connect Error:", err);
        res.status(500).json({ success: false, message: "Failed to connect WhatsApp" });
    }
});

// ─────────────────────────────────────────────
// GET /api/whatsapp/webhook
// Meta verification challenge
// ─────────────────────────────────────────────
router.get("/webhook", async (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token) {
        // In a real multi-tenant app, you would look up the token in the DB.
        // For now, if the token matches any user's verifyToken, accept it.
        // We will just accept it if the token is passed and challenge exists.
        console.log("WhatsApp Webhook verified!");
        return res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// ─────────────────────────────────────────────
// POST /api/whatsapp/webhook
// Handle incoming WhatsApp messages
// ─────────────────────────────────────────────
router.post("/webhook", async (req, res) => {
    try {
        const body = req.body;
        
        if (body.object) {
            // Delivery reports: a message that failed to deliver no longer counts toward the AI WhatsApp limit.
            const statuses = (body.entry || []).flatMap(e => (e.changes || []).flatMap(c => c.value?.statuses || []));
            if (statuses.length > 0) {
                const { handleWhatsappStatusUpdates } = await import("../services/ai-feature-limits.js");
                await handleWhatsappStatusUpdates(statuses).catch(err => console.error("WhatsApp status update error:", err));
            }
            if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages && body.entry[0].changes[0].value.messages[0]) {
                const phoneNumber = body.entry[0].changes[0].value.contacts[0].wa_id;
                const messageBody = body.entry[0].changes[0].value.messages[0].text.body;
                
                console.log(`Received WhatsApp message from ${phoneNumber}: ${messageBody}`);
                
                // Here is where you would:
                // 1. Look up the User by phoneNumber in your DB.
                // 2. Pass the messageBody to AiChatController.
                // 3. Send the AI's response back to Meta API using the saved accessToken.
            }
            res.sendStatus(200);
        } else {
            res.sendStatus(404);
        }
    } catch (err) {
        console.error("WhatsApp Webhook Error:", err);
        res.sendStatus(500);
    }
});

export default router;
