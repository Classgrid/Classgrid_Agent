// Remote PC for the phone (owner, 2026-11-18; services/remote-pc.service.js). Only the person's own chats.
//   GET    /api/remote/chats                 -> { chats: [{ sessionId, title, deviceName, online, answering, updatedAt }] }
//   GET    /api/remote/chats/:id/live        -> { running, question, from, turnId, attachments?, events }  the answer running now
//   GET    /api/remote/chats/:id/details     -> { deviceId, deviceName, deviceKind, online, connectedSince, totalConnectedMs,
//                                                 project: { name, path } | null, mode, clientApp, turnedOnAt }
//   POST   /api/remote/chats/:id/messages    { question, permissionMode?, selectedModel?, effort?, attachments?, command? } -> { ok } or 409/503
//                                             attachments: [{ url, name, mimeType }] as the chat sends them to the AI
//   POST   /api/remote/chats/:id/stop        -> { ok }   stops the answer running in the chat (phone's or computer's)
//   DELETE /api/remote/chats/:id             -> { ok }   Remote PC off for this chat (the computer keeps the chat)
//   GET    /api/remote/devices/:deviceId     -> { allowed, defaultMode }   the computer's own settings (its app)
//   PUT    /api/remote/devices/:deviceId     { allowed?, defaultMode? } -> { ok }
// Studio's own tabs for the chat (services/remote-pc-tabs.service.js; 404 not_remote, 403 not_allowed, 503 offline):
//   GET    /api/remote/chats/:id/review              -> { place, projectId, checkpoints, here, needsUpdate }
//   GET    /api/remote/chats/:id/review/:cp          -> { files: [{ file, added, removed, kind, diff }], finished }
//   POST   /api/remote/chats/:id/review/:cp/reject   { file? } -> { reverted }   (asked first on the phone)
//   POST   /api/remote/chats/:id/review/:cp/undo     -> { reverted }
//   GET    /api/remote/chats/:id/files               -> { place, projectId, name, listing? }
//   GET    /api/remote/chats/:id/file?path=          -> { path, binary, image?, mime?, data?, content?, size?, truncated? }
//   GET    /api/remote/chats/:id/jobs                -> { jobs: [{ id, command, running, exitCode, startedAt, output }] }
// The live answer itself comes over the person's socket: "remote:live", "remote:turn", "remote:chats".
import express from "express";
import { isAuthenticated } from "../middleware/auth.middleware.js";
import { primarySupabaseClient } from "../config/supabaseClient.js";
import { deviceSettings, listRemoteChats, liveState, remoteChatDetails, sendFromPhone, setDeviceAllowed, setRemoteChat, stopRemote } from "../services/remote-pc.service.js";
import { RemoteTabError, chatJobs, fileRead, filesList, reviewList, reviewPutBack, reviewShow } from "../services/remote-pc-tabs.service.js";

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

// The phone's Details sheet: the computer, its connection (since when, how long in all), the project open there for this
// chat, the chat's mode and app, and when Remote PC was turned on
router.get("/chats/:id/details", isAuthenticated, async (req, res) => {
    const id = await ownChat(req, res);
    if (!id) return;
    try {
        const details = await remoteChatDetails(req.user, id);
        if (!details) return res.status(404).json({ error: "Remote PC is off for this chat. Type /remote in it on your computer.", code: "not_remote" });
        res.json(details);
    } catch (e) {
        console.error("[Remote PC] details failed:", e?.message || e);
        res.status(500).json({ error: "Could not load this chat's details. Try again." });
    }
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
        attachments: Array.isArray(b.attachments) ? b.attachments : undefined,
        // a "/" command picked in the phone's box (/plan, /review...), as the computer's box sends it
        command: typeof b.command === "string" && /^[a-z_-]{1,40}$/.test(b.command) ? b.command : undefined,
    });
    if (out.ok) return res.json({ ok: true });
    const status = out.code === "offline" ? 503 : out.code === "busy" ? 409 : out.code === "not_remote" ? 404 : out.code === "not_allowed" ? 403 : 400;
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

// ── Studio's own tabs on the phone (services/remote-pc-tabs.service.js): Review, Files, the chat's background commands ──
async function tab(req, res, fn) {
    const id = await ownChat(req, res);
    if (!id) return;
    try {
        res.json(await fn(id));
    } catch (e) {
        if (e instanceof RemoteTabError) return res.status(e.status).json({ error: e.message, code: e.code });
        console.error("[Remote PC] tab failed:", e?.message || e);
        res.status(500).json({ error: "Something went wrong. Try again." });
    }
}
router.get("/chats/:id/review", isAuthenticated, (req, res) => tab(req, res, (id) => reviewList(req.user, id)));
router.get("/chats/:id/review/:cp", isAuthenticated, (req, res) => tab(req, res, (id) => reviewShow(req.user, id, req.params.cp)));
router.post("/chats/:id/review/:cp/reject", isAuthenticated, (req, res) => tab(req, res, (id) => reviewPutBack(req.user, id, req.params.cp, { action: "reject", file: req.body?.file || null })));
router.post("/chats/:id/review/:cp/undo", isAuthenticated, (req, res) => tab(req, res, (id) => reviewPutBack(req.user, id, req.params.cp, { action: "undo" })));
router.get("/chats/:id/files", isAuthenticated, (req, res) => tab(req, res, (id) => filesList(req.user, id)));
router.get("/chats/:id/file", isAuthenticated, (req, res) => tab(req, res, (id) => fileRead(req.user, id, req.query.path)));
router.get("/chats/:id/jobs", isAuthenticated, (req, res) => tab(req, res, (id) => chatJobs(req.user, id)));

router.get("/devices/:deviceId", isAuthenticated, async (req, res) => {
    const deviceId = String(req.params.deviceId || "");
    if (!/^[0-9a-f]{16,128}$/i.test(deviceId)) return res.status(400).json({ error: "Unknown computer" });
    res.json(await deviceSettings(req.user._id, deviceId));
});

router.put("/devices/:deviceId", isAuthenticated, async (req, res) => {
    const deviceId = String(req.params.deviceId || "");
    const b = req.body || {};
    if (!/^[0-9a-f]{16,128}$/i.test(deviceId) || (typeof b.allowed !== "boolean" && typeof b.defaultMode !== "string")) return res.status(400).json({ error: "allowed (true or false) or defaultMode is needed" });
    await setDeviceAllowed(req.user._id, deviceId, typeof b.allowed === "boolean" ? b.allowed : undefined, b.defaultMode);
    res.json({ ok: true });
});

export default router;
