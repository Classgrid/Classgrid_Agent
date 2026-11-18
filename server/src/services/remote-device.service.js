// Remote PC: which of the person's computers is connected, since when, and for how long in all (owner, 2026-11-18: the
// Remote PC chat's Details on the phone, "connected time, total connected time"). A computer is connected while one of
// its apps (the Classgrid app, Classgrid Code, the extension) keeps its runner socket open (local-runner.service.js).
//
// Which computer a runner connection is: the app says it (the socket's auth.deviceId, the same scrambled computer id
// the chat sends as body.deviceId; apps from 2026-11-18 on). An app from before says nothing, so the computer is learnt
// from its sign-in: the chat requests of that sign-in carry the computer id (learnDevice), and the runner uses the
// same sign-in's token. A connection whose computer is still unknown counts as possibly any of the person's computers.
//
// The times are kept on RemoteDevice (models/RemoteChat.js): connectedSince while a connection is open, lastSeenAt
// beat every minute, totalConnectedMs added when the last connection of that computer closes. A server restart closes
// no connection here (the apps reconnect within seconds and the time goes on); a computer that went away meanwhile
// is closed at its last sign of life.
import redis from "../config/redis.js";
import { RemoteDevice } from "../models/RemoteChat.js";
import { getIO } from "./socket.service.js";

const DEVICE_ID = /^[0-9a-f]{16,128}$/i;
const SID_DEVICE = (sid) => `remote:sid-device:${sid}`;
const SID_KEEP_S = 120 * 24 * 60 * 60;
export const BEAT_MS = 60 * 1000;
// A connection whose last sign of life is older than this ended then (the server never saw it close)
export const STALE_MS = 3 * BEAT_MS;
// A computer that reconnects within this time (its internet dropped for a moment, the app reloaded) stays connected
export const RECONNECT_GRACE_MS = 20 * 1000;
const APPS = new Set(["desktop", "code", "extension"]);

export const validDeviceId = (v) => (typeof v === "string" && DEVICE_ID.test(v) ? v : null);
const ms = (d) => (d ? new Date(d).getTime() : null);

async function sockets(userId) {
    const { runnerSockets } = await import("./local-runner.service.js");
    return (await runnerSockets(userId).catch(() => [])) || [];
}

const connectedAtOf = (s) => Number(s?.data?.connectedAt) || Date.parse(s?.handshake?.time || "") || null;

/**
 * Whether a computer is connected now: { online, since } (since: when its oldest open connection started, ms).
 * With no computer named, any runner connection counts. A connection that did not say its computer counts for any.
 */
export async function deviceStatus(userId, deviceId) {
    const all = await sockets(userId);
    const mine = deviceId ? all.filter((s) => s?.data?.remoteDevice === deviceId) : all;
    const unknown = deviceId ? all.filter((s) => !s?.data?.remoteDevice) : [];
    const pick = mine.length ? mine : unknown;
    const times = pick.map(connectedAtOf).filter(Boolean);
    return { online: pick.length > 0, sure: mine.length > 0, since: times.length ? Math.min(...times) : null };
}

/** Whether that computer can take a step now (see deviceStatus) */
export async function deviceOnline(userId, deviceId) {
    return (await deviceStatus(userId, deviceId)).online;
}

// A connection of the computer opened (at: when)
async function spanStarted(userId, deviceId, at) {
    const row = await RemoteDevice.findOne({ userId, deviceId }).select("connectedSince lastSeenAt").lean().catch(() => null);
    const since = ms(row?.connectedSince);
    if (since) {
        const last = ms(row.lastSeenAt) || since;
        if (at - last <= STALE_MS) {
            // still the same connection (the server restarted, a second app of that computer, a quick reconnect)
            await RemoteDevice.updateOne({ userId, deviceId }, { $set: { lastSeenAt: new Date(Math.max(at, last)) } }).catch(() => {});
            return;
        }
        // the earlier one ended unseen: it lasted until its last sign of life
        await RemoteDevice.updateOne(
            { userId, deviceId, connectedSince: row.connectedSince },
            { $inc: { totalConnectedMs: Math.max(0, last - since) }, $set: { connectedSince: new Date(at), lastSeenAt: new Date(at) } },
        );
        return;
    }
    await RemoteDevice.updateOne({ userId, deviceId }, { $set: { connectedSince: new Date(at), lastSeenAt: new Date(at) } }, { upsert: true });
}

// The computer's last connection closed (at: when)
async function spanEnded(userId, deviceId, at) {
    const row = await RemoteDevice.findOne({ userId, deviceId }).select("connectedSince").lean().catch(() => null);
    const since = ms(row?.connectedSince);
    if (!since) return;
    await RemoteDevice.updateOne(
        { userId, deviceId, connectedSince: row.connectedSince },
        { $inc: { totalConnectedMs: Math.max(0, at - since) }, $set: { connectedSince: null, lastSeenAt: new Date(at) } },
    );
}

let beat = null;
// Every minute: each computer connected to this server process was seen now
function startBeat() {
    if (beat) return;
    beat = setInterval(async () => {
        try {
            const seen = new Map();
            for (const s of getIO().of("/").sockets.values()) {
                const d = s?.data?.remoteDevice;
                if (d && s.handshake?.auth?.runner) seen.set(`${s.userId}|${d}`, { userId: String(s.userId), deviceId: d });
            }
            const now = new Date();
            await Promise.all([...seen.values()].map(({ userId, deviceId }) =>
                RemoteDevice.updateOne({ userId, deviceId, connectedSince: { $ne: null } }, { $set: { lastSeenAt: now } }).catch(() => {})));
        } catch { /* no socket server */ }
    }, BEAT_MS);
    beat.unref?.();
}

/** A runner connection opened (local-runner.service.js registerRunnerSocket) */
export async function runnerConnected(socket, { now = Date.now() } = {}) {
    const userId = String(socket.userId);
    const auth = socket.handshake?.auth || {};
    socket.data = socket.data || {};
    socket.data.connectedAt = now;
    if (APPS.has(auth.app)) socket.data.runnerApp = auth.app;
    let deviceId = validDeviceId(auth.deviceId);
    if (!deviceId && socket.sid) deviceId = validDeviceId(await redis.get(SID_DEVICE(socket.sid)).catch(() => null));
    if (!deviceId) return null;
    socket.data.remoteDevice = deviceId;
    startBeat();
    await spanStarted(userId, deviceId, now);
    return deviceId;
}

/** A runner connection closed: when it was that computer's last one (after a short grace for a reconnect), its time adds up */
export async function runnerDisconnected(socket, { graceMs = RECONNECT_GRACE_MS } = {}) {
    const deviceId = socket?.data?.remoteDevice;
    if (!deviceId) return;
    const userId = String(socket.userId);
    const closedAt = Date.now();
    const check = async () => {
        const still = (await sockets(userId)).some((s) => s?.id !== socket.id && s?.data?.remoteDevice === deviceId);
        if (!still) await spanEnded(userId, deviceId, closedAt);
    };
    if (graceMs > 0) await new Promise((r) => { const t = setTimeout(r, graceMs); t.unref?.(); });
    await check();
}

/**
 * A chat request from the desktop app or Classgrid Code named its computer (body.deviceId) under this sign-in: kept, so
 * that sign-in's runner connection is known to be that computer (apps from before 2026-11-18 don't say it themselves).
 * Its open runner connections on this server process are marked now.
 */
export async function learnDevice(userId, sid, deviceId) {
    const id = validDeviceId(deviceId);
    if (!userId || !sid || !id) return;
    const had = await redis.get(SID_DEVICE(sid)).catch(() => null);
    if (had !== id) await redis.set(SID_DEVICE(sid), id, "EX", SID_KEEP_S).catch(() => {});
    let local = [];
    try { local = [...getIO().of("/").sockets.values()]; } catch { return; }
    for (const s of local) {
        if (String(s.userId) !== String(userId) || s.sid !== sid || !s.handshake?.auth?.runner || s.data?.remoteDevice) continue;
        s.data = s.data || {};
        s.data.remoteDevice = id;
        startBeat();
        await spanStarted(String(userId), id, Number(s.data.connectedAt) || Date.now()).catch(() => {});
    }
}

/**
 * A computer's connection for the phone's Details: { online, connectedSince (ISO or null), totalConnectedMs } (the
 * total includes the connection open now). A connection the server never saw close is closed here at its last sign of
 * life; a connection open now that was not counted yet (its app did not say its computer) shows from its start.
 */
export async function deviceConnection(userId, deviceId, { now = Date.now() } = {}) {
    const status = await deviceStatus(userId, deviceId);
    const row = deviceId ? await RemoteDevice.findOne({ userId, deviceId }).select("connectedSince lastSeenAt totalConnectedMs").lean().catch(() => null) : null;
    let since = ms(row?.connectedSince);
    let total = Number(row?.totalConnectedMs) || 0;
    if (!status.online && since) {
        const last = Math.max(since, ms(row.lastSeenAt) || since);
        total += last - since;
        since = null;
        if (now - last > RECONNECT_GRACE_MS) await spanEnded(String(userId), deviceId, last).catch(() => {});
    } else if (status.online && !since) {
        since = status.since;
    }
    if (!status.online) since = null;
    return {
        online: status.online,
        connectedSince: since ? new Date(since).toISOString() : null,
        totalConnectedMs: Math.max(0, total + (since ? now - since : 0)),
    };
}
