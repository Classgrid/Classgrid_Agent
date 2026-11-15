/*
 * ─────────────────────────────────────────────────────────
 * 🚫 NO BLOCKS RULE (owner's order, 2026-10-23) 🚫
 * Claude and every AI model are FORBIDDEN to add any kind of block, restriction, allowlist or
 * "only for X" rule (owner-only, super-admin-only, email checks, test-number-only, role checks)
 * unless the owner explicitly asks for that exact limit.
 * Every feature is for ALL users. Project Mode is for all users, never super-admin only.
 * ─────────────────────────────────────────────────────────
 */
// Push notifications for the Classgrid phone app (owner, 2026-11-15: "add FCM"): one place that sends a push to a
// user's phones through FCM (HTTP v1, firebase-admin), for every user.
//
// - Devices: User.fcmDevices, one entry per device (POST / DELETE /api/user/fcm-token, registerPushDevice and
//   removePushDevice below). A token is on one account only, the one that registered it last. The older list of bare
//   tokens (User.fcmTokens) is still sent to. A token FCM says is gone is removed when a send fails.
// - Settings: User.pushNotifications. "global" is the master switch (the website's "Enable Push Alerts"); answers,
//   images, schedules, calls, sharedChats and productUpdates are one switch per kind, all on by default
//   (GET / PUT /api/user/push-preferences). A kind that is off is never sent.
// - The message: "notification" (title, body: what Android shows while the app is closed or in the background) and
//   "data" (type and the ids the app needs to open the right screen), high priority, an Android channel per kind,
//   and one collapse key and tag per chat (or schedule, or call), so a chat shows one notification, not a pile.
// - What is written: a title and a short plain-text preview (about 100 characters, no markdown), never more of a
//   private message than that.
//
// Who sends: ai-chat.controller.js (an answer that ended while nobody was on its stream, a woken chat's answer, a
// shared chat's messages, an image), ai-schedule.worker.js (a schedule that ran) and call-record.service.js (a
// call's summary). A push never throws into the work that caused it.

const PREVIEW_CHARS = 100;
const MAX_DEVICES = 20; // per account; the oldest is dropped
const DAY_MS = 24 * 60 * 60 * 1000;

// Each kind of push: its Android channel (the phone app makes channels with these ids) and the setting that
// turns it off. "account" (billing, sign-in, the plan) has no switch of its own: only the master switch stops it.
export const PUSH_TYPES = {
    answer: { channel: "answers", pref: "answers" },
    file: { channel: "answers", pref: "answers" },
    image: { channel: "images", pref: "images" },
    schedule: { channel: "schedules", pref: "schedules" },
    call: { channel: "calls", pref: "calls" },
    shared: { channel: "shared", pref: "sharedChats" },
    account: { channel: "account", pref: null },
    update: { channel: "account", pref: "productUpdates" },
};
// The switches under User.pushNotifications (besides the master switch "global")
export const PUSH_PREF_KEYS = ["answers", "images", "schedules", "calls", "sharedChats", "productUpdates"];

// The errors FCM gives for a token that will never work again (the app was removed, or the token was replaced)
const DEAD_TOKEN = new Set(["messaging/registration-token-not-registered", "messaging/invalid-registration-token"]);
// FCM keeps these data keys for itself
const RESERVED_DATA = /^(from|notification|message_type|collapse_key)$|^(google|gcm)/i;

const userModel = async () => (await import("../models/User.js")).default;

// What this service needs from the rest of the server. A test replaces them (setPushDeps), so it runs with no
// database, no Redis and no Firebase.
const deps = {
    // The user's settings and devices
    loadUser: async (userId) => (await userModel()).findById(userId).select("pushNotifications fcmDevices fcmTokens").lean(),
    // One FCM multicast: resolves to firebase-admin's BatchResponse, or null when Firebase is not set up here
    send: async (message) => {
        const { getFirebaseMessaging } = await import("./firebase.service.js");
        const messaging = getFirebaseMessaging();
        return messaging ? messaging.sendEachForMulticast(message) : null;
    },
    // Tokens FCM says are gone leave every account that holds them
    removeTokens: async (tokens) => {
        const User = await userModel();
        await User.updateMany(
            { $or: [{ "fcmDevices.token": { $in: tokens } }, { fcmTokens: { $in: tokens } }] },
            { $pull: { fcmDevices: { token: { $in: tokens } }, fcmTokens: { $in: tokens } } },
        );
    },
    // A chat's name, for the notification's title
    chatTitle: async (sessionId) => {
        const { getSessionById } = await import("./ai-chat.service.js");
        const title = String((await getSessionById(sessionId))?.title || "").trim();
        return /^new chat$/i.test(title) ? "" : title;
    },
    // The people of a shared chat who have an account: [{ userId, email }]
    sharedMembers: async (sessionId) => {
        const { getActiveMembers } = await import("./ai-chat-grid.service.js");
        const emails = [...new Set((await getActiveMembers(sessionId)).map((m) => String(m.user_email || "").trim().toLowerCase()).filter(Boolean))];
        if (!emails.length) return [];
        const users = await (await userModel()).find({ email: { $in: emails } }).select("_id email").lean();
        return users.map((u) => ({ userId: String(u._id), email: String(u.email).toLowerCase() }));
    },
    // The users who have a shared chat open right now: their app joined its live room (socket.service.js "aigrid:").
    // Every socket is also in the room named after its user's id, so the rooms of those sockets hold the user ids.
    watchingSharedChat: async (sessionId) => {
        const { getIO } = await import("./socket.service.js");
        const sockets = await getIO().in(`aigrid:${sessionId}`).fetchSockets();
        const ids = new Set();
        for (const s of sockets) for (const room of s.rooms || []) ids.add(String(room));
        return ids;
    },
    // The chat list's unread dot: when the chat last had a message (the same Redis hash ai-chat.controller.js
    // touchChat writes; GET /api/ai/sessions?studio=1 sends it as updated_at)
    touchChat: async (email, sessionId) => {
        const redis = (await import("../config/redis.js")).default;
        await redis.hset(`ai:chatTouched:${String(email).toLowerCase()}`, String(sessionId), String(Date.now()));
    },
};

/** For tests: replace what the service reads and sends with (loadUser, send, removeTokens, ...) */
export function setPushDeps(overrides) {
    Object.assign(deps, overrides);
}

/**
 * The first words of a message as plain text, for a notification: no markdown, no code, no links, no cards, at most
 * `max` characters. A saved answer (the JSON kept in the chat) gives its text.
 */
export function plainPreview(text, max = PREVIEW_CHARS) {
    let s = String(text ?? "");
    if (s.startsWith("{") && s.includes("classgrid_ai_message")) {
        try { s = String(JSON.parse(s).content ?? ""); } catch { /* not a saved answer: its own text */ }
    }
    s = s
        .replace(/\[IMAGE_GENERATION_[A-Z]+:[^\]]*\]?/g, " ")         // a made picture's marker
        .replace(/```[\s\S]*?(```|$)/g, " ")                           // code, and the cards written as code blocks
        .replace(/<[^>\n]{1,300}>/g, " ")                              // tags
        .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")                         // pictures
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")                       // links keep their words
        .replace(/https?:\/\/\S+/g, " ")                               // bare links
        .replace(/^\s{0,3}(#{1,6}|>+|[-*+]|\d+[.)])\s+/gm, "")         // headings, quotes, list marks
        .replace(/^\s*[-=*_]{3,}\s*$/gm, " ")                          // rules
        .replace(/\*\*|__|~~|[*`|]/g, "")                              // bold, italic, strike, code, table bars
        .replace(/\s+/g, " ")
        .trim();
    if (s.length <= max) return s;
    return `${s.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

// The user's push settings as the phone's Settings page shows them (everything on until the user turns it off)
export function pushPreferencesOf(user) {
    const p = user?.pushNotifications || {};
    const out = { enabled: p.global !== false };
    for (const key of PUSH_PREF_KEYS) out[key] = p[key] !== false;
    return out;
}

/** GET /api/user/push-preferences */
export async function getPushPreferences(userId) {
    const user = await (await userModel()).findById(userId).select("pushNotifications").lean();
    return pushPreferencesOf(user);
}

/**
 * PUT /api/user/push-preferences: the switches given (true / false) are saved, the others stay as they are.
 * Returns the settings after the change, or null when nothing valid was given.
 */
export async function savePushPreferences(userId, given) {
    const set = {};
    if (typeof given?.enabled === "boolean") set["pushNotifications.global"] = given.enabled;
    for (const key of PUSH_PREF_KEYS) if (typeof given?.[key] === "boolean") set[`pushNotifications.${key}`] = given[key];
    if (!Object.keys(set).length) return null;
    const User = await userModel();
    await User.updateOne({ _id: userId }, { $set: set });
    return getPushPreferences(userId);
}

/**
 * POST /api/user/fcm-token: this device's token is saved on this account. The token leaves every other account
 * (the phone signed in to another account before), and the device's older token is replaced, so a device is
 * listed once. Returns how many devices the account has now.
 */
export async function registerPushDevice(userId, { token, platform, deviceId, appVersion } = {}) {
    const t = String(token || "").trim();
    if (!t || t.length > 4096) return { ok: false, error: "Token is required" };
    const p = String(platform || "android").toLowerCase();
    const entry = {
        token: t,
        platform: ["android", "ios", "web"].includes(p) ? p : "android",
        deviceId: String(deviceId || "").trim().slice(0, 200),
        appVersion: String(appVersion || "").trim().slice(0, 40),
        updatedAt: new Date(),
    };
    const User = await userModel();
    await User.updateMany(
        { $or: [{ "fcmDevices.token": t }, { fcmTokens: t }] },
        { $pull: { fcmDevices: { token: t }, fcmTokens: t } },
    );
    if (entry.deviceId) await User.updateOne({ _id: userId }, { $pull: { fcmDevices: { deviceId: entry.deviceId } } });
    await User.updateOne({ _id: userId }, { $push: { fcmDevices: { $each: [entry], $slice: -MAX_DEVICES } } });
    const user = await User.findById(userId).select("fcmDevices").lean();
    return { ok: true, devices: user?.fcmDevices?.length || 0 };
}

/**
 * DELETE /api/user/fcm-token (sign-out): the device is taken off this account, by its token, its deviceId, or both.
 * Returns how many devices the account has left.
 */
export async function removePushDevice(userId, { token, deviceId } = {}) {
    const t = String(token || "").trim();
    const d = String(deviceId || "").trim();
    if (!t && !d) return { ok: false, error: "Token or deviceId is required" };
    const User = await userModel();
    if (t) await User.updateOne({ _id: userId }, { $pull: { fcmDevices: { token: t }, fcmTokens: t } });
    if (d) await User.updateOne({ _id: userId }, { $pull: { fcmDevices: { deviceId: d } } });
    const user = await User.findById(userId).select("fcmDevices").lean();
    return { ok: true, devices: user?.fcmDevices?.length || 0 };
}

// Every token of the user, each once (the device list first, then the older bare tokens)
function tokensOf(user) {
    const all = [...(user?.fcmDevices || []).map((d) => d?.token), ...(user?.fcmTokens || [])];
    return [...new Set(all.map((t) => String(t || "").trim()).filter(Boolean))];
}

// FCM data: text values only, none of FCM's own keys, nothing empty
function dataFor(type, data) {
    const out = {};
    for (const [key, value] of Object.entries(data || {})) {
        if (value === undefined || value === null || value === "" || RESERVED_DATA.test(key)) continue;
        out[key] = typeof value === "string" ? value : typeof value === "object" ? JSON.stringify(value) : String(value);
    }
    out.type = type;
    return out;
}

// One notification per chat (or schedule, or call): a newer push for the same one replaces the older
function groupKey(type, data) {
    if (data?.sessionId) return `chat_${data.sessionId}`;
    if (data?.scheduleId) return `schedule_${data.scheduleId}`;
    if (data?.callId) return `call_${data.callId}`;
    return `classgrid_${type}`;
}

/**
 * The FCM message for one push (every token of the user in one multicast).
 * data carries the type and the ids the app opens the right screen with, plus title, body and sentAt, so the app
 * has them when it handles the message itself (in the foreground).
 */
export function buildPushMessage(tokens, { type, title, body, data = {}, imageUrl = "" }) {
    const kind = PUSH_TYPES[type];
    const key = groupKey(type, data);
    const shownTitle = plainPreview(title, 80) || "Classgrid";
    const shownBody = plainPreview(body, PREVIEW_CHARS);
    const image = /^https:\/\/\S+$/.test(String(imageUrl || "")) ? String(imageUrl) : "";
    return {
        tokens,
        notification: { title: shownTitle, body: shownBody, ...(image ? { imageUrl: image } : {}) },
        data: { ...dataFor(type, data), title: shownTitle, body: shownBody, channelId: kind.channel, sentAt: String(Date.now()) },
        android: {
            priority: "high",
            collapseKey: key,
            ttl: DAY_MS,
            notification: { channelId: kind.channel, tag: key, sound: "default", ...(image ? { imageUrl: image } : {}) },
        },
        apns: {
            headers: { "apns-priority": "10", "apns-collapse-id": key.slice(0, 64) },
            payload: { aps: { sound: "default", "thread-id": key } },
        },
    };
}

/**
 * Sends one push to every phone of a user.
 *   type: answer | file | image | schedule | call | shared | account | update (PUSH_TYPES)
 *   title, body: what the notification shows (cut to a short plain-text preview here)
 *   data: the ids the app needs: sessionId, messageId, url, scheduleId, callId ...
 *   imageUrl: a picture shown in the notification (an https link)
 * Resolves to { sent, failed, pruned } or { sent: 0, skipped: "..." }: unknown_type, no_user, settings_off,
 * no_devices, not_configured, error. Never throws.
 */
export async function sendUserPush(userId, { type, title, body, data = {}, imageUrl = "" } = {}) {
    try {
        const kind = PUSH_TYPES[type];
        if (!kind) return { sent: 0, skipped: "unknown_type" };
        if (!userId) return { sent: 0, skipped: "no_user" };
        const user = await deps.loadUser(String(userId));
        if (!user) return { sent: 0, skipped: "no_user" };
        const prefs = user.pushNotifications || {};
        if (prefs.global === false || (kind.pref && prefs[kind.pref] === false)) return { sent: 0, skipped: "settings_off" };
        const tokens = tokensOf(user);
        if (!tokens.length) return { sent: 0, skipped: "no_devices" };

        const response = await deps.send(buildPushMessage(tokens, { type, title, body, data, imageUrl }));
        if (!response) return { sent: 0, skipped: "not_configured" };

        const dead = [];
        (response.responses || []).forEach((r, i) => {
            if (!r.success && DEAD_TOKEN.has(r.error?.code)) dead.push(tokens[i]);
        });
        if (dead.length) await deps.removeTokens(dead).catch((e) => console.error("[push] removing dead tokens failed:", e.message));
        const sent = response.successCount || 0;
        const failed = response.failureCount || 0;
        console.log(`[push] ${type} to user ${userId}: ${sent} sent, ${failed} failed${dead.length ? `, ${dead.length} dead token${dead.length === 1 ? "" : "s"} removed` : ""}`);
        return { sent, failed, pruned: dead.length };
    } catch (e) {
        console.error(`[push] ${type || "push"} to user ${userId} failed:`, e.message);
        return { sent: 0, skipped: "error" };
    }
}

// ─── The events ────────────────────────────────────────────────

// A file, a doc or a page the answer links to (the same file kinds the chat saves to the Library)
const FILE_LINK = /https?:\/\/[^\s<>()"'\]]+\.(?:pdf|zip|xlsx|xls|csv|docx|doc|pptx|ppt)\b/i;
const DOC_LINK = /https:\/\/chat\.classgrid\.in\/(?:docs|p)\/[A-Za-z0-9_-]+/;
// A picture the answer made, as the chat saves it in the answer's text (ai-chat.controller.js): its prompt and link
const MADE_IMAGE = /\[IMAGE_GENERATION_COMPLETE:\s*([^|\]\n]*)\|\s*(https:\/\/[^\s\]]+)\s*\]/;

/**
 * An answer ended while the user was not on its stream: their app's connection had gone before the end, or the chat
 * was woken by background work (chat-wake.service.js). images: the pictures the answer made ([{ prompt, url }]).
 * A picture gives an "image" push, a file / doc / page link a "file" push, anything else an "answer" push.
 */
export async function pushAnswerFinished({ userId, sessionId, answer, images = [], woken = false }) {
    try {
        if (!userId || !sessionId) return null;
        const text = String(answer ?? "");
        // A task that only went back to sleep (sleep_until) has nothing to tell yet
        if (!text.trim().replace(/💤 Waiting for.*$/, "").trim()) return null;
        // (a caller that only has the answer's text, like voice mode's background task, gives no `images`: the
        // picture is then read from the marker the chat saves in the answer, "[IMAGE_GENERATION_COMPLETE: prompt | url]")
        const marker = text.match(MADE_IMAGE);
        const picture = images.find((img) => img?.url) || (marker ? { prompt: marker[1].trim(), url: marker[2] } : null);
        const link = picture ? "" : (text.match(DOC_LINK) || text.match(FILE_LINK) || [""])[0];
        const type = picture ? "image" : link ? "file" : "answer";
        const preview = plainPreview(text);
        const chat = await deps.chatTitle(sessionId).catch(() => "");
        const title = type === "image" ? "Your image is ready" : type === "file" ? "Your file is ready" : chat || "Classgrid";
        const body = type === "image" ? (plainPreview(picture.prompt) || preview || "Open the chat to see it.")
            : preview || (woken ? "Background work finished. The agent wrote an update." : "The agent finished its answer.");
        return await sendUserPush(userId, {
            type, title, body,
            data: { sessionId, url: picture?.url || link, ...(chat ? { chatTitle: chat } : {}), ...(woken ? { woken: "1" } : {}) },
            imageUrl: picture?.url || "",
        });
    } catch (e) {
        console.error("[push] answer push failed:", e.message);
        return null;
    }
}

/**
 * An image asked for with "@Create image" (POST /api/ai/generate-image) is ready and the app that asked had gone
 * before the reply.
 */
export async function pushImageReady({ userId, sessionId, prompt, imageUrl }) {
    return sendUserPush(userId, {
        type: "image",
        title: "Your image is ready",
        body: plainPreview(prompt) || "Open the chat to see it.",
        data: { sessionId, url: imageUrl },
        imageUrl,
    });
}

/**
 * Something new in a shared chat (Share Grid): a person's message (answer: false, fromName wrote it) or the AI's
 * answer. Every other person in the chat gets the chat marked unread; those who don't have it open get a push.
 * fromEmail: who sent the message, or whose message the AI answered (they are on the stream, or get their own push).
 */
export async function pushSharedChat({ sessionId, fromEmail, fromName = "", text, answer = false }) {
    try {
        if (!sessionId) return null;
        const from = String(fromEmail || "").trim().toLowerCase();
        const others = (await deps.sharedMembers(sessionId)).filter((m) => m.email !== from);
        if (!others.length) return { members: 0, sent: 0 };
        const watching = await deps.watchingSharedChat(sessionId).catch(() => new Set());
        const chat = await deps.chatTitle(sessionId).catch(() => "");
        const preview = plainPreview(text, answer ? PREVIEW_CHARS : PREVIEW_CHARS - Math.min(30, String(fromName).length + 2));
        const body = answer ? preview || "The agent finished its answer."
            : preview ? (fromName ? `${plainPreview(fromName, 30)}: ${preview}` : preview) : "New message in your shared chat.";
        let sent = 0;
        for (const m of others) {
            await deps.touchChat(m.email, sessionId).catch(() => {});
            if (watching.has(m.userId)) continue;
            const r = await sendUserPush(m.userId, {
                type: "shared",
                title: chat || "Shared chat",
                body,
                data: { sessionId, shared: "1", kind: answer ? "answer" : "message", ...(chat ? { chatTitle: chat } : {}), ...(!answer && fromName ? { senderName: fromName } : {}) },
            });
            sent += r?.sent || 0;
        }
        return { members: others.length, sent };
    } catch (e) {
        console.error("[push] shared chat push failed:", e.message);
        return null;
    }
}

/** A schedule ran (workers/ai-schedule.worker.js): its title, and the first words of what it is about */
export async function pushScheduleRan(schedule) {
    if (!schedule?.user_id) return null;
    return sendUserPush(String(schedule.user_id), {
        type: "schedule",
        title: schedule.title || "Your schedule ran",
        body: plainPreview(schedule.summary || schedule.description || schedule.whatsapp_message || schedule.email_subject) || "Your schedule ran.",
        data: { scheduleId: String(schedule._id) },
    });
}

/**
 * A call's record has its summary (call-record.service.js): the recap of a call, or the result of the work the AI
 * did after it. callId: the record's id (the Calls page opens it: /calls/<id>).
 */
export async function pushCallSummary({ userId, callId, name, summary, url = "" }) {
    if (!userId || !callId) return null;
    return sendUserPush(String(userId), {
        type: "call",
        title: name || "Call summary",
        body: plainPreview(summary) || "Your call's summary is ready.",
        data: { callId: String(callId), url },
    });
}
