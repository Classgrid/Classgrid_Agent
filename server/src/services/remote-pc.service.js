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

// The events of an answer the phone shows: everything the computer's chat shows of it (the words, the thinking, every
// step with what it read, wrote and ran, helpers, the plan, the web pages it cited, questions, pictures, the end).
// Only what drives the computer's own loop (turn_info, round_end, tool_done, pc_tool_call, local_loop) stays there.
const LIVE_TYPES = new Set([
    "token", "thought", "status", "tool_start", "tool_result", "generated_image", "answer", "error",
    "permission_request", "permission_resolved", "helper_progress", "plan_step_update", "chat_ended", "limit_ended",
    "sources", "checkpoint", "file_update", "title_updated",
]);
// A step's result as the phone gets it: a command's whole output up to this (the computer's chat shows it all; a
// longer one is cut, as the events are also kept in Redis for a phone that opens the chat later)
export const LIVE_RESULT_CHARS = 20000;
// A file a phone message sends along (the same shape the chat sends to the AI: streamAskAi's body.attachments)
const MAX_ATTACHMENTS = 10;

const emit = (userId, name, data) => { try { getIO().to(String(userId)).emit(name, data); } catch { /* no socket server */ } };

/** The event as the phone gets it: a step's result is cut at LIVE_RESULT_CHARS. */
export function liveEventOf(event) {
    if (!event || !LIVE_TYPES.has(event.type)) return null;
    if (event.type === "tool_result") {
        // (a result that is an object, a tool's own card data, goes as it is; text is cut)
        const r = event.result;
        return typeof r === "string" || r === undefined || r === null ? { ...event, result: String(r ?? "").slice(0, LIVE_RESULT_CHARS) } : event;
    }
    return event;
}

/** The files a phone message sends along: [{ url, name, mimeType }] (web links only, at most 10), else [] */
export function cleanAttachments(list) {
    if (!Array.isArray(list)) return [];
    const out = [];
    for (const a of list) {
        const url = typeof a?.url === "string" ? a.url.trim() : "";
        if (!/^https:\/\/\S+$/i.test(url) || url.length > 4000) continue;
        out.push({
            url,
            name: (typeof a.name === "string" && a.name.trim() ? a.name.trim() : url.split(/[?#]/)[0].split("/").pop() || "file").slice(0, 200),
            mimeType: typeof a.mimeType === "string" && a.mimeType ? a.mimeType.slice(0, 120) : "application/octet-stream",
        });
        if (out.length >= MAX_ATTACHMENTS) break;
    }
    return out;
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
export async function setRemoteChat({ userId, sessionId, on, deviceId = null, deviceName = null, deviceKind = null, clientApp = "desktop", appMode = null }) {
    // (turned on again while it is on: it keeps the time it was turned on)
    const before = on ? await RemoteChat.findOne({ userId, sessionId: String(sessionId), on: true }).lean().catch(() => null) : null;
    const row = await RemoteChat.findOneAndUpdate(
        { userId, sessionId: String(sessionId) },
        { $set: { on: !!on, ...(on ? { deviceId, deviceName, deviceKind, clientApp: clientApp || "desktop", appMode, ...(before ? {} : { turnedOnAt: new Date() }) } : {}) } },
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
    const { deviceOnline } = await import("./remote-device.service.js");
    const { chatAnswering } = await import("./chat-wake.service.js");
    // Each chat's own computer (a connection that did not say its computer counts for any of them)
    const onlineOf = new Map();
    for (const d of new Set(rows.map((r) => r.deviceId || null))) onlineOf.set(d, await deviceOnline(String(user._id), d).catch(() => false));
    const devices = await RemoteDevice.find({ userId: user._id }).select("deviceId allowed defaultMode").lean().catch(() => []);
    const deviceOf = new Map((devices || []).map((d) => [d.deviceId, d]));
    return Promise.all(rows.filter((r) => byId.has(r.sessionId)).map(async (r) => ({
        sessionId: r.sessionId,
        title: byId.get(r.sessionId)?.title || "New chat",
        deviceName: r.deviceName || "Your computer",
        deviceId: r.deviceId || null,
        online: !!onlineOf.get(r.deviceId || null),
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
export async function remoteTurnStarted(userId, sessionId, { question = "", from = "computer", turnId = null, attachments = [] } = {}) {
    const files = cleanAttachments(attachments);
    const turn = { question: String(question || "").slice(0, 20000), from, turnId, ...(files.length ? { attachments: files } : {}) };
    const m = redis.multi().del(LIVE(sessionId)).set(TURN_OF(sessionId), JSON.stringify(turn), "EX", LIVE_TTL_S);
    await m.exec().catch(() => {});
    emit(userId, "remote:turn", { sessionId, phase: "start", ...turn });
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
    return { running: !!t, question: t?.question || "", from: t?.from || null, turnId: t?.turnId || null, ...(t?.attachments?.length ? { attachments: t.attachments } : {}), events };
}

/**
 * A message from the phone into a remote chat. Runs it on our server the way the computer runs the chat (its app,
 * its mode, the phone's permission mode), its steps on the computer through the app's runner socket. Returns
 * { ok } at once, or { error, code } when it can't run now: not a remote chat, the computer is offline, or the chat is
 * answering already.
 */
export async function sendFromPhone(user, sessionId, { question, permissionMode, selectedModel, effort, attachments } = {}, { stopWaitMs = 6000 } = {}) {
    const userId = String(user._id);
    const text = String(question || "").trim();
    const files = cleanAttachments(attachments);
    if (!text && !files.length) return { error: "Write a message first.", code: "empty" };
    const row = await RemoteChat.findOne({ userId: user._id, sessionId: String(sessionId), on: true }).lean();
    if (!row) return { error: "Remote PC is off for this chat. Type /remote in it on your computer.", code: "not_remote" };
    if (!(await deviceAllowed(user._id, row.deviceId))) return { error: "Remote PC is turned off on that computer (Settings, General, Remote PC in the Classgrid app there).", code: "not_allowed" };
    // (that chat's own computer: another computer of the person being on doesn't make this one reachable)
    const { deviceOnline } = await import("./remote-device.service.js");
    if (!(await deviceOnline(userId, row.deviceId || null))) return { error: "Your computer is offline. Open Classgrid on it and try again.", code: "offline" };
    const { chatAnswering } = await import("./chat-wake.service.js");
    // An answer that was just stopped is still ending (it saves what it wrote, up to a few seconds): the message waits
    // for it instead of being refused as busy (the owner's phone, 2026-11-18 09:24 IST: Stop, then a message a second
    // later, was refused with "This chat is answering right now")
    if (await chatAnswering(userId, sessionId)) await stoppedAnswerEnded(userId, sessionId, stopWaitMs);
    if (await chatAnswering(userId, sessionId)) return { error: "This chat is answering right now. Wait for it to finish, or stop it.", code: "busy" };
    const took = await redis.set(RUNNING(sessionId), "1", "EX", 6 * 60 * 60, "NX").catch(() => null);
    if (!took) return { error: "This chat is answering right now. Wait for it to finish, or stop it.", code: "busy" };
    await redis.del(STOP(sessionId)).catch(() => {});
    runFromPhone(user, row, text, { permissionMode, selectedModel, effort, attachments: files })
        .catch((e) => console.error("[Remote PC] a message from the phone failed:", e?.message || e))
        .finally(() => redis.del(RUNNING(sessionId)).catch(() => {}));
    return { ok: true };
}

// Waits (up to waitMs) for an answer that Stop ended to finish ending (it saves what it wrote, up to 3 seconds). Returns
// at once when the answer running was not stopped (its run key is that answer's own id, not Stop's "stopped-" mark, and
// no Stop of the phone's own run is pending). Once it has ended, Stop's mark is taken away: it was only there to stop
// that answer, and it held the chat as "answering" for its 8 seconds.
async function stoppedAnswerEnded(userId, sessionId, waitMs) {
    const runKey = `chat:run:${userId}:${sessionId}`;
    const mark = String((await redis.get(runKey).catch(() => null)) || "");
    const phoneStopped = (await redis.exists(STOP(sessionId)).catch(() => 0)) === 1;
    if (!mark.startsWith("stopped-") && !phoneStopped) return;
    const working = async () => (await redis.hexists(`ai:working:${userId}`, String(sessionId)).catch(() => 0)) === 1
        || (await redis.exists(RUNNING(sessionId)).catch(() => 0)) === 1;
    const until = Date.now() + waitMs;
    while (Date.now() < until && (await working())) await new Promise((r) => setTimeout(r, 250));
    if (await working()) return;
    if (mark.startsWith("stopped-") && (await redis.get(runKey).catch(() => null)) === mark) await redis.del(runKey).catch(() => {});
}

async function runFromPhone(user, row, question, { permissionMode, selectedModel, effort, attachments = [] }) {
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
    await remoteTurnStarted(userId, sessionId, { question, from: "phone", attachments });
    // The computer's app shows it like a woken chat: the start, the live answer, then the saved chat at the end
    // (with the question, so the computer's chat shows it at once above the answer; an app from before shows it at the end)
    emit(userId, "chat:woke", { sessionId, phase: "start", question, ...(attachments.length ? { attachments } : {}) });
    const fullUser = await User.findById(user._id).select("-password -verificationToken");
    try {
        const { runAgentTask } = await import("./whatsapp-call.service.js");
        await runAgentTask(fullUser || user, question, null, null, sessionId, null, {
            clientApp: row.clientApp || meta.clientApp || "desktop",
            ...(row.appMode || meta.appMode ? { appMode: row.appMode || meta.appMode } : {}),
            permissionMode: PERMISSION_MODES.has(permissionMode) ? permissionMode : (meta.permissionMode || "default"),
            ...(selectedModel || meta.selectedModel ? { selectedModel: selectedModel || meta.selectedModel } : {}),
            ...(effort || meta.effort ? { effort: effort || meta.effort } : {}),
            // the chat's computer: its folder project and its copy of a cloud project are used, as when typed there
            ...(row.deviceId ? { deviceId: row.deviceId } : {}),
            // a photo or file sent from the phone reaches the AI like one attached on the computer
            ...(attachments.length ? { attachments, fileUrls: attachments.map((a) => a.url) } : {}),
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
    // The answer itself stops on the server too, the way a newer message stops an older one (streamAskAi checks the
    // chat's run key every 3 seconds and ends, saving what it wrote with "(Stopped.)"). Ending only the phone's run was
    // not enough: the answer went on to the end and saved the whole of it (found testing Stop on the phone,
    // 2026-11-18). Short-lived, so the next message is not taken for a running one.
    const runKey = `chat:run:${userId}:${sessionId}`;
    if (await redis.exists(runKey).catch(() => 0)) await redis.set(runKey, `stopped-${Date.now()}`, "EX", 8).catch(() => {});
    const { turnId } = await liveState(sessionId);
    return { ok: true, turnId };
}

/**
 * The phone's Details of a Remote PC chat (GET /api/remote/chats/:id/details): the computer, whether it is connected,
 * since when and for how long in all, the project (folder) the chat works in on it, the chat's mode and app, and when
 * Remote PC was turned on. null when Remote PC is off for the chat.
 */
export async function remoteChatDetails(user, sessionId) {
    const userId = String(user._id);
    const row = await RemoteChat.findOne({ userId: user._id, sessionId: String(sessionId), on: true }).lean();
    if (!row) return null;
    const { deviceConnection } = await import("./remote-device.service.js");
    const [conn, project] = await Promise.all([
        deviceConnection(userId, row.deviceId || null).catch(() => ({ online: false, connectedSince: null, totalConnectedMs: 0 })),
        chatProject(sessionId),
    ]);
    const turnedOn = row.turnedOnAt || row.createdAt || null;
    return {
        deviceId: row.deviceId || null,
        deviceName: row.deviceName || "Your computer",
        deviceKind: row.deviceKind || (!row.deviceName || /^Classgrid desktop app/.test(String(row.deviceName)) ? "desktop" : "editor"),
        online: conn.online,
        connectedSince: conn.connectedSince,
        totalConnectedMs: conn.totalConnectedMs,
        project,
        mode: row.appMode || "agent",
        clientApp: row.clientApp || "desktop",
        turnedOnAt: turnedOn ? new Date(turnedOn).toISOString() : null,
    };
}

// The project the chat works in: { name, path } (path: its folder on the computer; null for a project on our servers)
async function chatProject(sessionId) {
    try {
        const { projectForChat } = await import("./ide-project.service.js");
        const p = await projectForChat(String(sessionId));
        if (!p) return null;
        return { name: p.name || null, path: p.location === "local" ? p.localPath || null : null };
    } catch {
        return null;
    }
}
