// Remote PC (owner, 2026-11-18; plan: C:\CLASSGRIDPLATFORM\plans\remote-control.md): a chat on the person's computer
// (the desktop app, Classgrid Code, the VS Code extension) is followed and answered from the phone, like Claude Code's
// Remote Control. "/remote" in that chat turns it on (ai-chat.controller.js, before the model is called).
//
// The work stays on the computer: the AI runs on our server as always, and its steps on the computer go to the app's
// runner socket (local-runner.service.js), the way a woken chat's steps do (chat-wake.service.js).
//
//   - Live: every event of an answer in a remote chat (the computer's own answer, through the durable turn's mirror,
//     and a message sent from the phone, through runAgentTask's events) goes to the person's sockets as
//     "remote:live" { sessionId, event }, and is kept in Redis while the answer runs, so a phone that opens the chat
//     in the middle gets what it missed (liveEvents). "remote:turn" { sessionId, phase: start|end, question, from }
//     marks an answer's start and end.
//   - A message from the phone (sendFromPhone) runs the chat the way the computer runs it (its app and mode), with
//     the permission mode the phone picked (Turbo included: owner, 2026-11-18). The computer's app shows it live
//     through the woken-chat events it already listens to (chat:woke / chat:woke-live), so the desktop app needs no
//     new version to show it.
//   - Questions ("may I run this?") go to the phone with the other live events; it answers them with
//     POST /api/ai/permission/:id like the computer does (the first answer wins).
import redis from "../config/redis.js";
import RemoteChat, { RemoteDevice } from "../models/RemoteChat.js";
import User from "../models/User.js";
import { getIO } from "./socket.service.js";
import { primarySupabaseClient } from "../config/supabaseClient.js";

const LIVE = (sessionId) => `remote:live:${sessionId}`;
const ON_SET = (userId) => `remote:on:${userId}`;
const STOP = (sessionId) => `remote:stop:${sessionId}`;
const RUNNING = (sessionId) => `remote:running:${sessionId}`;
const TURN_OF = (sessionId) => `remote:turn:${sessionId}`;
const LIVE_KEEP = 5000; // events kept for a phone that opens the chat mid-answer
const LIVE_TTL_S = 6 * 60 * 60;
const CHAT_ID = /^[0-9a-f-]{36}$/i;
const PERMISSION_MODES = new Set(["review", "default", "auto", "turbo"]);

// The events of an answer the phone shows (the words, the thinking, the steps, questions, pictures, the end)
const LIVE_TYPES = new Set([
    "token", "thought", "status", "tool_start", "tool_result", "generated_image", "answer", "error",
    "permission_request", "permission_resolved", "helper_progress", "plan_step_update", "chat_ended", "limit_ended",
]);

const emit = (userId, name, data) => { try { getIO().to(String(userId)).emit(name, data); } catch { /* no socket server */ } };

/** The event as the phone gets it: a step's result is cut (the phone shows a line, not the whole output). */
export function liveEventOf(event) {
    if (!event || !LIVE_TYPES.has(event.type)) return null;
    if (event.type === "tool_result") return { ...event, result: String(event.result ?? "").slice(0, 4000) };
    return event;
}

/** Whether this chat is a Remote PC chat that is on (cached per person in Redis; MongoDB holds it). */
export async function remoteChatOn(userId, sessionId) {
    if (!userId || !CHAT_ID.test(String(sessionId || ""))) return false;
    const cached = await redis.sismember(ON_SET(userId), String(sessionId)).catch(() => null);
    if (cached === 1) return true;
    const exists = await redis.exists(ON_SET(userId)).catch(() => 0);
    if (exists) return false;
    // (no cache yet: built from MongoDB once)
    const on = await RemoteChat.find({ userId, on: true }).select("sessionId").lean().catch(() => null);
    if (!on) return false;
    const ids = on.map((r) => r.sessionId);
    const m = redis.multi().del(ON_SET(userId));
    if (ids.length) m.sadd(ON_SET(userId), ...ids);
    else m.sadd(ON_SET(userId), "-"); // (an empty set can't be kept: "-" marks "none")
    await m.expire(ON_SET(userId), 24 * 60 * 60).exec().catch(() => {});
    return ids.includes(String(sessionId));
}

/** This computer allows Remote PC (its app's switch; no switch saved = allowed). */
export async function deviceAllowed(userId, deviceId) {
    if (!deviceId) return true;
    const row = await RemoteDevice.findOne({ userId, deviceId: String(deviceId) }).select("allowed").lean().catch(() => null);
    return row?.allowed !== false;
}

/** A computer's Remote PC settings, as its app shows them: { allowed, defaultMode } (on and Default until saved). */
export async function deviceSettings(userId, deviceId) {
    const row = await RemoteDevice.findOne({ userId, deviceId: String(deviceId) }).select("allowed defaultMode").lean().catch(() => null);
    return { allowed: row?.allowed !== false, defaultMode: row?.defaultMode || "default" };
}

/** The computer's app saved its Remote PC settings: its switch (allowed) and the phone's starting mode. */
export async function setDeviceAllowed(userId, deviceId, allowed, defaultMode = undefined) {
    const set = {};
    if (typeof allowed === "boolean") set.allowed = allowed;
    if (PERMISSION_MODES.has(defaultMode)) set.defaultMode = defaultMode;
    if (!Object.keys(set).length) return;
    await RemoteDevice.updateOne({ userId, deviceId: String(deviceId) }, { $set: set }, { upsert: true });
    emit(userId, "remote:chats", { deviceId: String(deviceId), ...set });
}

/** Turns Remote PC on or off for a chat. Returns the chat's record. */
export async function setRemoteChat({ userId, sessionId, on, deviceId = null, deviceName = null, clientApp = "desktop", appMode = null }) {
    const row = await RemoteChat.findOneAndUpdate(
        { userId, sessionId: String(sessionId) },
        { $set: { on: !!on, ...(on ? { deviceId, deviceName, clientApp: clientApp || "desktop", appMode } : {}) } },
        { upsert: true, new: true },
    ).lean();
    await redis.del(ON_SET(userId)).catch(() => {});
    emit(userId, "remote:chats", { sessionId: String(sessionId), on: !!on });
    return row;
}

/** The person's Remote PC chats for the phone: title, computer, online, answering now. */
export async function listRemoteChats(user) {
    const rows = await RemoteChat.find({ userId: user._id, on: true }).sort({ updatedAt: -1 }).limit(100).lean();
    if (!rows.length) return [];
    const ids = rows.map((r) => r.sessionId);
    const { data } = await primarySupabaseClient.from("ai_chat_sessions").select("id, title, created_at").in("id", ids).eq("user_email", user.email);
    const byId = new Map((data || []).map((c) => [c.id, c]));
    const { runnerOnline } = await import("./local-runner.service.js");
    const { chatAnswering } = await import("./chat-wake.service.js");
    const online = await runnerOnline(String(user._id));
    const devices = await RemoteDevice.find({ userId: user._id }).select("deviceId allowed defaultMode").lean().catch(() => []);
    const deviceOf = new Map((devices || []).map((d) => [d.deviceId, d]));
    return Promise.all(rows.filter((r) => byId.has(r.sessionId)).map(async (r) => ({
        sessionId: r.sessionId,
        title: byId.get(r.sessionId)?.title || "New chat",
        deviceName: r.deviceName || "Your computer",
        deviceId: r.deviceId || null,
        online,
        allowed: deviceOf.get(r.deviceId)?.allowed !== false,
        defaultMode: deviceOf.get(r.deviceId)?.defaultMode || "default",
        answering: await chatAnswering(String(user._id), r.sessionId).catch(() => false),
        updatedAt: r.updatedAt,
    })));
}

/**
 * An answer started in a remote chat: what the phone has of the last one is cleared, and the phone is told.
 * turnId: the computer's own answer (its durable turn), which the phone's Stop ends.
 */
export async function remoteTurnStarted(userId, sessionId, { question = "", from = "computer", turnId = null } = {}) {
    const m = redis.multi().del(LIVE(sessionId)).set(TURN_OF(sessionId), JSON.stringify({ question: String(question || "").slice(0, 20000), from, turnId }), "EX", LIVE_TTL_S);
    await m.exec().catch(() => {});
    emit(userId, "remote:turn", { sessionId, phase: "start", question: String(question || "").slice(0, 20000), from, turnId });
}

/** The answer ended: the phone reads the saved chat again. Its live events are kept a little while for a late phone. */
export async function remoteTurnEnded(userId, sessionId) {
    await redis.multi().expire(LIVE(sessionId), 120).del(TURN_OF(sessionId)).exec().catch(() => {});
    emit(userId, "remote:turn", { sessionId, phase: "end" });
}

/**
 * One event of an answer in a remote chat: to the phone, and kept for a phone that opens the chat later.
 * computerOnStream: the computer's app is on the answer's stream (someone may be at the computer). A question asked
 * while it is not ("may I run this?", from a message sent from the phone, or with the computer's app gone) also goes
 * to the phone as a push, "Your computer needs your OK" (owner, 2026-11-18; Claude Code sends none while the person
 * is at the computer either).
 */
export function mirrorRemoteEvent(userId, sessionId, event, { computerOnStream = false } = {}) {
    const ev = liveEventOf(event);
    if (!ev || !userId || !sessionId) return;
    emit(userId, "remote:live", { sessionId, event: ev });
    redis.multi().rpush(LIVE(sessionId), JSON.stringify(ev)).ltrim(LIVE(sessionId), -LIVE_KEEP, -1).expire(LIVE(sessionId), LIVE_TTL_S).exec().catch(() => {});
    if (ev.type === "permission_request" && !computerOnStream) {
        import("./user-push.service.js")
            .then((m) => m.pushRemoteQuestion({ userId, sessionId, title: ev.title, detail: ev.detail }))
            .catch(() => {});
    }
}

/**
 * The answer running now in a remote chat, for a phone that opens it in the middle: { running, question, from,
 * turnId, events } (running false and no events when none runs).
 */
export async function liveState(sessionId) {
    const [raw, turn] = await Promise.all([
        redis.lrange(LIVE(sessionId), 0, -1).catch(() => []),
        redis.get(TURN_OF(sessionId)).catch(() => null),
    ]);
    let t = null;
    try { t = turn ? JSON.parse(turn) : null; } catch { t = null; }
    const events = [];
    for (const s of t ? raw || [] : []) { try { events.push(JSON.parse(s)); } catch { /* skip */ } }
    return { running: !!t, question: t?.question || "", from: t?.from || null, turnId: t?.turnId || null, events };
}

/**
 * A message from the phone into a remote chat. Runs it on our server the way the computer runs the chat (its app,
 * its mode, the phone's permission mode), its steps on the computer through the app's runner socket. Returns
 * { ok } at once, or { error, code } when it can't run now: not a remote chat, the computer is offline, or the chat is
 * answering already.
 */
export async function sendFromPhone(user, sessionId, { question, permissionMode, selectedModel, effort } = {}) {
    const userId = String(user._id);
    const text = String(question || "").trim();
    if (!text) return { error: "Write a message first.", code: "empty" };
    const row = await RemoteChat.findOne({ userId: user._id, sessionId: String(sessionId), on: true }).lean();
    if (!row) return { error: "Remote PC is off for this chat. Type /remote in it on your computer.", code: "not_remote" };
    if (!(await deviceAllowed(user._id, row.deviceId))) return { error: "Remote PC is turned off on that computer (Settings, General, Remote PC in the Classgrid app there).", code: "not_allowed" };
    const { runnerOnline } = await import("./local-runner.service.js");
    if (!(await runnerOnline(userId))) return { error: "Your computer is offline. Open Classgrid on it and try again.", code: "offline" };
    const { chatAnswering } = await import("./chat-wake.service.js");
    if (await chatAnswering(userId, sessionId)) return { error: "This chat is answering right now. Wait for it to finish, or stop it.", code: "busy" };
    const took = await redis.set(RUNNING(sessionId), "1", "EX", 6 * 60 * 60, "NX").catch(() => null);
    if (!took) return { error: "This chat is answering right now. Wait for it to finish, or stop it.", code: "busy" };
    await redis.del(STOP(sessionId)).catch(() => {});
    runFromPhone(user, row, text, { permissionMode, selectedModel, effort })
        .catch((e) => console.error("[Remote PC] a message from the phone failed:", e?.message || e))
        .finally(() => redis.del(RUNNING(sessionId)).catch(() => {}));
    return { ok: true };
}

async function runFromPhone(user, row, question, { permissionMode, selectedModel, effort }) {
    const userId = String(user._id);
    const sessionId = row.sessionId;
    // The chat's own model and effort when the phone picked none (how the computer last used it: chatwake meta)
    let meta = {};
    try { meta = JSON.parse((await redis.get(`chatwake:meta:${sessionId}`)) || "{}"); } catch { /* none */ }
    const stop = new AbortController();
    const stopCheck = setInterval(async () => {
        if (await redis.exists(STOP(sessionId)).catch(() => 0)) stop.abort();
    }, 1000);
    stopCheck.unref?.();
    await remoteTurnStarted(userId, sessionId, { question, from: "phone" });
    // The computer's app shows it like a woken chat: the start, the live answer, then the saved chat at the end
    emit(userId, "chat:woke", { sessionId, phase: "start" });
    const fullUser = await User.findById(user._id).select("-password -verificationToken");
    try {
        const { runAgentTask } = await import("./whatsapp-call.service.js");
        await runAgentTask(fullUser || user, question, null, null, sessionId, null, {
            clientApp: row.clientApp || meta.clientApp || "desktop",
            ...(row.appMode || meta.appMode ? { appMode: row.appMode || meta.appMode } : {}),
            permissionMode: PERMISSION_MODES.has(permissionMode) ? permissionMode : (meta.permissionMode || "default"),
            ...(selectedModel || meta.selectedModel ? { selectedModel: selectedModel || meta.selectedModel } : {}),
            ...(effort || meta.effort ? { effort: effort || meta.effort } : {}),
            remoteFrom: "phone",
        }, stop.signal, (data) => {
            mirrorRemoteEvent(userId, sessionId, data);
            if (["token", "thought", "tool_start", "tool_result", "status"].includes(data?.type)) {
                const event = data.type === "tool_result" ? { ...data, result: String(data.result ?? "").slice(0, 4000) } : data;
                emit(userId, "chat:woke-live", { sessionId, event });
            }
        });
    } finally {
        clearInterval(stopCheck);
        await redis.del(STOP(sessionId)).catch(() => {});
        emit(userId, "chat:woke", { sessionId, phase: "end" });
        await remoteTurnEnded(userId, sessionId);
    }
}

/**
 * Stop from the phone: a message the phone sent (its run checks every second), or the computer's own answer (its
 * durable turn, stopped like the phone's Stop of its own answer: durable-turn.service.js stopTurn). Returns
 * { ok, turnId } (turnId: the computer's answer the caller stops).
 */
export async function stopRemote(userId, sessionId) {
    await redis.set(STOP(sessionId), "1", "EX", 60).catch(() => {});
    const { turnId } = await liveState(sessionId);
    return { ok: true, turnId };
}
