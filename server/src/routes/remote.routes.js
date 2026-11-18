// Remote PC for the phone (owner, 2026-11-18; services/remote-pc.service.js). Only the person's own chats.
//   GET    /api/remote/chats                 -> { chats: [{ sessionId, title, deviceName, online, answering, updatedAt }] }
//   GET    /api/remote/chats/:id/live        -> { running, question, from, turnId, events }  the answer running now
//   POST   /api/remote/chats/:id/messages    { question, permissionMode?, selectedModel?, effort? } -> { ok } or 409/503
//   POST   /api/remote/chats/:id/stop        -> { ok }   stops the answer running in the chat (phone's or computer's)
//   DELETE /api/remote/chats/:id             -> { ok }   Remote PC off for this chat (the computer keeps the chat)
// The live answer itself comes over the person's socket: "remote:live", "remote:turn", "remote:chats".
import express from "express";
import { isAuthenticated } from "../middleware/auth.middleware.js";
import { primarySupabaseClient } from "../config/supabaseClient.js";
import { listRemoteChats, liveState, sendFromPhone, setRemoteChat, stopRemote } from "../services/remote-pc.service.js";

const router = express.Router();
const CHAT_ID = /^[0-9a-f-]{36}$/i;

// The chat is this person's own (a chat shared with them stays the owner's to control)
async function ownChat(req, res) {
    const id = String(req.params.id || "");
    if (!CHAT_ID.test(id)) { res.status(404).json({ error: "Chat not found" }); return null; }
    const { data } = await primarySupabaseClient.from("ai_chat_sessions").select("user_email").eq("id", id).maybeSingle();
    if (!data || String(data.user_email || "").toLowerCase() !== String(req.user.email || "").toLowerCase()) {
        res.status(404).json({ error: "Chat not found" });
        return null;
    }
    return id;
}

router.get("/chats", isAuthenticated, async (req, res) => {
    try {
        res.json({ chats: await listRemoteChats(req.user) });
    } catch (e) {
        console.error("[Remote PC] list failed:", e?.message || e);
        res.status(500).json({ error: "Could not load your computers' chats. Try again." });
    }
});

router.get("/chats/:id/live", isAuthenticated, async (req, res) => {
    const id = await ownChat(req, res);
    if (!id) return;
    res.json(await liveState(id));
});

router.post("/chats/:id/messages", isAuthenticated, async (req, res) => {
    const id = await ownChat(req, res);
    if (!id) return;
    const b = req.body || {};
    const out = await sendFromPhone(req.user, id, {
        question: String(b.question || "").slice(0, 100000),
        permissionMode: b.permissionMode,
        selectedModel: typeof b.selectedModel === "string" ? b.selectedModel : undefined,
        effort: ["low", "high"].includes(b.effort) ? b.effort : undefined,
    });
    if (out.ok) return res.json({ ok: true });
    const status = out.code === "offline" ? 503 : out.code === "busy" ? 409 : out.code === "not_remote" ? 404 : 400;
    res.status(status).json({ error: out.error, code: out.code });
});

router.post("/chats/:id/stop", isAuthenticated, async (req, res) => {
    const id = await ownChat(req, res);
    if (!id) return;
    const { turnId } = await stopRemote(String(req.user._id), id);
    // The computer's own answer: stopped like the phone's Stop of its own answer (this process holds it, usually)
    if (turnId) {
        const { stopTurn } = await import("../services/durable-turn.service.js");
        stopTurn(turnId, String(req.user._id));
    }
    res.json({ ok: true });
});

router.delete("/chats/:id", isAuthenticated, async (req, res) => {
    const id = await ownChat(req, res);
    if (!id) return;
    await setRemoteChat({ userId: req.user._id, sessionId: id, on: false });
    res.json({ ok: true });
});

export default router;
