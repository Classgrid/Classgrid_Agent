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
import crypto from "crypto";
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

    // Only Meta's verify token is accepted, and the challenge goes back as plain text (never as a page)
    if (mode === 'subscribe' && token && process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
        console.log("WhatsApp Webhook verified!");
        return res.status(200).type("text/plain").send(String(challenge || ""));
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

// ─────────────────────────────────────────────
// POST /api/whatsapp/calls-internal
// WhatsApp voice calls, passed on by the ai.classgrid.in server (same machine) that receives Meta's webhook.
// Only accepted from this machine and with its signature (HMAC of the body with the shared WhatsApp key).
// ─────────────────────────────────────────────
// From this machine, signed by the ai.classgrid.in server with the shared WhatsApp key
function fromWhatsappServer(req) {
    const ip = String(req.socket?.remoteAddress || "");
    const local = ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
    // Requests through nginx also come from this machine, but they carry these headers; the WhatsApp server's don't
    if (!local || req.headers["x-forwarded-for"] || req.headers["x-real-ip"]) return false;
    const key = process.env.WHATSAPP_ACCESS_TOKEN || "";
    if (!key) return false;
    try {
        const sent = Buffer.from(String(req.headers["x-classgrid-call-signature"] || ""), "hex");
        const expected = crypto.createHmac("sha256", key).update(JSON.stringify(req.body || {})).digest();
        return sent.length === expected.length && crypto.timingSafeEqual(sent, expected);
    } catch {
        return false;
    }
}

router.post("/calls-internal", async (req, res) => {
    if (!fromWhatsappServer(req)) return res.sendStatus(403);
    res.sendStatus(200); // Meta must get its answer fast; the call is handled after this
    try {
        const { handleCallsWebhook } = await import("../services/whatsapp-call.service.js");
        await connectDB();
        await handleCallsWebhook(req.body);
    } catch (err) {
        console.error("WhatsApp call error:", err);
    }
});

// ─────────────────────────────────────────────
// POST /api/whatsapp/messages-internal
// Messages users send to the Classgrid WhatsApp number (text and files), passed on by the ai.classgrid.in server.
// Kept so the Agent can read follow-ups a user sends while it works (read_whatsapp_messages).
// ─────────────────────────────────────────────
router.post("/messages-internal", async (req, res) => {
    if (!fromWhatsappServer(req)) return res.sendStatus(403);
    try {
        const { saveIncomingMessages, isNumberBusy } = await import("../services/whatsapp-inbox.service.js");
        await saveIncomingMessages(req.body);
        // Delivery reports: a message Meta accepted but then failed to deliver stops counting toward the limit
        if (req.body?.statuses?.length) {
            const { handleWhatsappStatusUpdates } = await import("../services/ai-feature-limits.js");
            await handleWhatsappStatusUpdates(req.body.statuses).catch((e) => console.error("WhatsApp status update error:", e.message));
        }
        // A verified number (one account): Classgrid AI answers it (wakes its task or starts one), so the old
        // help bot stays quiet. busy: an Agent or a call is using this number's chat, so the help bot stays quiet.
        const from = req.body?.messages?.[0]?.from;
        let taken = false;
        if (from) {
            const { onWhatsappMessage } = await import("../services/agent-task.service.js");
            taken = await onWhatsappMessage(req.body).catch((e) => { console.error("[agent task] WhatsApp message failed:", e.message); return false; });
        }
        res.json({ busy: taken || (from ? await isNumberBusy(from) : false) });
    } catch (err) {
        console.error("WhatsApp message save error:", err);
        if (!res.headersSent) res.json({ busy: false });
    }
});

export default router;
