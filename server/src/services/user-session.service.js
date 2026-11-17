/*
 * ─────────────────────────────────────────────────────────
 * 🚫 NO BLOCKS RULE (owner's order, 2026-10-23) 🚫
 * Claude and every AI model are FORBIDDEN to add any kind of block, restriction, allowlist or
 * "only for X" rule (owner-only, super-admin-only, email checks, test-number-only, role checks)
 * unless the owner explicitly asks for that exact limit.
 * Every feature is for ALL users. Project Mode is for all users, never super-admin only.
 * ─────────────────────────────────────────────────────────
 */
// Sign-ins per device (owner, 2026-11-17: "build it for all three devices, show the device name and type, logout, and
// logout from all"; the device limit: "enforce the plan's device limit").
//
// - Every sign-in token a person's browser, desktop app, phone app or code editor gets is made by signUserToken: it
//   saves a UserSession row (models/UserSession.js) and puts the row's random sid in the token. Tokens signed before
//   this existed have no sid and work as before; they end through "Log out from all devices" (User.passwordChangedAt)
//   or their own expiry.
// - The auth middleware asks sessionState(sid) on each request: Redis keeps "ok" for 10 minutes and "revoked" until the
//   token's expiry (usess:<sid>), so a request costs one Redis GET; on a miss the row is read from the database once and
//   kept again. When Redis can't be reached, the database is asked (kept in this process for 15 seconds).
// - last_seen_at is written at most once every 5 minutes per sign-in (usess:seen:<sid>, SET NX).
// - The plan's devices_max (PlanConfig; the owner asked for this limit, 2026-11-17): a new sign-in that would go over it
//   is refused (DeviceLimitError, 403 DEVICE_LIMIT). It counts the account's live sign-ins by user_id, so every email
//   of one account shares the one limit. Website, desktop app, phone app and code editor (the Classgrid extension)
//   sign-ins all count (owner, 2026-11-17). The same device signing in again replaces its own sign-in and is never
//   refused. A sign-in not used for 30 days no longer counts: it is ended when counting.
import crypto from "node:crypto";
import jwt from "jsonwebtoken";

export const SESSION_KINDS = ["website", "desktop", "phone", "editor"];
export const DEVICE_LIMIT_CODE = "DEVICE_LIMIT";
export const DEVICES_NOTE = "Sign-ins from before this list was added aren't shown. Log out from all devices ends them too.";

const OK_KEEP_SEC = 10 * 60; // "ok" kept in Redis (a revoke always writes "revoked" over it)
const SEEN_EVERY_SEC = 5 * 60; // last_seen_at at most once per 5 minutes
const LOCAL_KEEP_MS = 15000; // while Redis can't be reached, a database answer is kept this long in this process
const UNUSED_MS = 30 * 24 * 60 * 60 * 1000; // not used for 30 days: no longer counts toward the device limit
const REDIS_WAIT_MS = 300;

// ── Device: kind, name, id ──────────────────────────────────────

const clip = (v, max) => String(v || "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

/** A device id the client sent, or "" (letters, digits and . _ : -, 6 to 128 long) */
export function cleanDeviceId(v) {
    const s = String(v || "").trim();
    return /^[A-Za-z0-9._:-]{6,128}$/.test(s) ? s : "";
}

/** The browser and the system named in a user agent: { browser: "Chrome", os: "Windows" } ("" when unknown) */
export function parseUserAgent(ua) {
    const s = String(ua || "");
    let os = "";
    if (/Android/i.test(s)) os = "Android";
    else if (/iPhone|iPod/i.test(s)) os = "iPhone";
    else if (/iPad/i.test(s)) os = "iPad";
    else if (/Windows/i.test(s)) os = "Windows";
    else if (/CrOS/.test(s)) os = "Chromebook";
    else if (/Mac OS X|Macintosh/i.test(s)) os = "Mac";
    else if (/Linux|X11/i.test(s)) os = "Linux";
    let browser = "";
    if (/Edg(e|A|iOS)?\//.test(s)) browser = "Edge";
    else if (/OPR\/|Opera/.test(s)) browser = "Opera";
    else if (/SamsungBrowser\//.test(s)) browser = "Samsung Internet";
    else if (/Firefox\/|FxiOS\//.test(s)) browser = "Firefox";
    else if (/Chrome\/|CriOS\//.test(s)) browser = "Chrome";
    else if (/Safari\//.test(s)) browser = "Safari";
    return { browser, os };
}

const header = (req, name) => String(req?.headers?.[name] || "");

/** The Classgrid phone app: its X-Platform-App header (android / ios), its own user agent, or an Android WebView */
export function isPhoneAppRequest(req) {
    const app = header(req, "x-platform-app").toLowerCase();
    if (app === "android" || app === "ios") return true;
    const ua = header(req, "user-agent");
    return /Classgrid-(Android|iOS|iPhone)/i.test(ua) || /;\s*wv\)/.test(ua);
}

/** The Classgrid desktop app (Electron): its user agent names Classgrid/<version> and Electron/<version> */
export function isDesktopAppRequest(req) {
    const ua = header(req, "user-agent");
    return /Classgrid\/\d/i.test(ua) && /Electron\//i.test(ua);
}

/**
 * A code editor's own requests (the Classgrid extension inside it): Electron with the editor's name and version in the
 * user agent ("Code/1.146.0" = VS Code, "Cursor/", "Antigravity/", "ClassgridCode/" ...). The editor's name, or "".
 */
const EDITOR_AGENTS = [
    [/\bClassgridCode\//i, "Classgrid Code"], [/\bCursor\//i, "Cursor"], [/\bAntigravity\//i, "Antigravity"],
    [/\bWindsurf\//i, "Windsurf"], [/\bVSCodium\//i, "VSCodium"], [/\bTrae\//i, "Trae"], [/\bKiro\//i, "Kiro"],
    [/\bCode\/\d/, "VS Code"],
];
export function editorFromUserAgent(ua) {
    const s = String(ua || "");
    if (!/Electron\//i.test(s) || /Classgrid\/\d/i.test(s)) return "";
    const hit = EDITOR_AGENTS.find(([re]) => re.test(s));
    return hit ? hit[1] : "";
}

/** website | desktop | phone | editor */
export function deviceKindOf(req, { editor = false } = {}) {
    if (editor) return "editor";
    if (isDesktopAppRequest(req)) return "desktop";
    if (editorFromUserAgent(header(req, "user-agent"))) return "editor";
    if (isPhoneAppRequest(req)) return "phone";
    return "website";
}

// A code editor's link scheme as a name. The Classgrid extension's browser sign-in sends its link back address,
// <vscode.env.uriScheme>://classgrid.classgrid/login (classgrid-editor/extension/extension.js startSignIn;
// client/src/features/auth/editorHandoff.ts keeps it), so the scheme tells which editor it is.
const EDITOR_NAMES = {
    "classgrid-code": "Classgrid Code", vscode: "VS Code", "vscode-insiders": "VS Code Insiders", vscodium: "VSCodium",
    cursor: "Cursor", windsurf: "Windsurf", antigravity: "Antigravity", trae: "Trae", kiro: "Kiro", positron: "Positron",
};
export const editorNameOf = (scheme) => EDITOR_NAMES[String(scheme || "").toLowerCase()] || "";
/** The scheme of an editor's link back address ("cursor://classgrid.classgrid/login" -> "cursor") */
export const editorSchemeOf = (callback) => {
    const m = /^([a-z][a-z0-9+.-]{1,40}):\/\//i.exec(String(callback || ""));
    return m ? m[1].toLowerCase() : "";
};

const phoneOs = (platform, os) => {
    const p = String(platform || "").toLowerCase();
    if (p === "android") return "Android";
    if (p === "ios") return "iPhone";
    return os === "iPad" ? "iPad" : os === "iPhone" ? "iPhone" : os === "Android" ? "Android" : "";
};

/** The device in plain words, e.g. "Chrome on Windows", "Classgrid desktop app on Windows",
 * "Classgrid phone app on Android (Pixel 8)", "VS Code on Windows", "Code editor on Windows" */
export function deviceNameOf({ kind, userAgent = "", platform = "", deviceModel = "", editorName = "" }) {
    const { browser, os } = parseUserAgent(userAgent);
    const on = (base, where) => (where ? `${base} on ${where}` : base);
    if (kind === "desktop") return on("Classgrid desktop app", os);
    if (kind === "phone") {
        const model = clip(deviceModel, 60);
        const name = on("Classgrid phone app", phoneOs(platform, os));
        return model ? `${name} (${model})` : name;
    }
    if (kind === "editor") {
        // The editor's own name (owner, 2026-11-17: "VS Code on Windows", "Cursor on Windows", "Antigravity on Windows",
        // "Classgrid Code on Windows"); an editor that can't be told is "Code editor". The computer is the browser's.
        return on(clip(editorName, 40) || "Code editor", os);
    }
    if (browser) return on(browser, os);
    return on("Web browser", os);
}

/**
 * What a sign-in request says about its device.
 * opts.editor       the Classgrid extension's sign-in (generateEditorToken); opts.editorScheme its link scheme;
 *                   opts.editorApp the editor's name and opts.editorDevice its own device id, when it sent them
 * opts.oauthState   a Google / GitHub sign-in: its signed state ({ desktop, device, deviceModel }). desktop: the login ran
 *                   in the person's browser for the desktop app or the phone app (an Android or iPhone browser means
 *                   the phone app), and the app's own device id came in the state.
 */
export function deviceInfoOf(req, { editor = false, editorScheme = "", editorApp = "", editorDevice = "", oauthState = null } = {}) {
    const userAgent = clip(header(req, "user-agent"), 512);
    const body = req?.body && typeof req.body === "object" ? req.body : {};
    let kind = deviceKindOf(req, { editor });
    let platform = header(req, "x-platform-app");
    let deviceId = cleanDeviceId(header(req, "x-device-id")) || cleanDeviceId(body.deviceId) || cleanDeviceId(body.device_id);
    let deviceModel = clip(header(req, "x-device-model") || body.deviceModel || body.device_model, 60);
    if (oauthState) {
        deviceId = cleanDeviceId(oauthState.device) || deviceId;
        if (oauthState.desktop) {
            const { os } = parseUserAgent(userAgent);
            kind = ["Android", "iPhone", "iPad"].includes(os) ? "phone" : "desktop";
            if (kind === "phone") platform = os === "Android" ? "android" : "ios";
            deviceModel = clip(oauthState.deviceModel, 60) || deviceModel;
        }
    }
    // An app that sends no device id yet (the phone app and the desktop app before their releases that send one, any
    // other client): its device is told by its user agent ("ua:" id). Many devices share a user agent, so this id never
    // replaces a sign-in (startSession): it only keeps someone who signs in again on the same kind of device from being
    // refused for the plan's limit
    if (!deviceId && userAgent) {
        deviceId = `ua:${crypto.createHash("sha256").update(`${kind}|${platform.toLowerCase()}|${userAgent}`).digest("base64url").slice(0, 32)}`;
    }
    let editorName = "";
    if (kind === "editor") {
        editorName = editorNameOf(editorScheme) || clip(editorApp, 40) || editorFromUserAgent(userAgent);
        // The editor signs in through the browser. Its device: the id the editor sent (none yet: the extension's next
        // release adds it), else the browser's id with the editor's name, so the same editor signed in again from the
        // same computer replaces its own sign-in without touching the browser's
        const scheme = String(editorScheme || "").toLowerCase().replace(/[^a-z0-9.-]/g, "").slice(0, 40) || "editor";
        const own = cleanDeviceId(editorDevice);
        const base = own || deviceId;
        deviceId = base ? cleanDeviceId(`editor:${scheme}:${own ? "own:" : ""}${base}`.slice(0, 128)) : "";
    }
    if (kind !== "phone") deviceModel = "";
    return {
        kind,
        device_name: deviceNameOf({ kind, userAgent, platform, deviceModel, editorName }),
        user_agent: userAgent,
        device_id: deviceId,
        device_model: deviceModel,
    };
}

// ── Dependencies (the database, Redis, the plan, the secret): replaced in tests with setSessionDeps ──

function mongoStore(S) {
    return {
        find: (sid) => S.findOne({ sid }).select("user_id kind device_id revoked_at expires_at push_token push_device_id legacy_key").lean(),
        insert: async (row) => (await S.create(row)).toObject(),
        live: (userId, now) => S.find({ user_id: userId, revoked_at: null, expires_at: { $gt: now } }).lean(),
        byId: (userId, id) => S.findOne({ _id: id, user_id: userId }).lean(),
        revoke: (ids, at, reason) => S.updateMany({ _id: { $in: ids }, revoked_at: null }, { $set: { revoked_at: at, revoke_reason: reason } }),
        seen: (sid, at) => S.updateOne({ sid }, { $set: { last_seen_at: at } }),
        extend: (sid, expiresAt) => S.updateOne({ sid, revoked_at: null }, { $max: { expires_at: expiresAt } }),
        // (the query repeats the unique index's partial filter so MongoDB can use that index)
        byLegacy: (key) => S.findOne({ legacy_key: { $eq: key, $type: "string", $gt: "" } }).lean(),
        setPush: (sid, push) => S.updateOne({ sid }, { $set: push }),
        setInfo: (sid, info) => S.updateOne({ sid, user_agent: "" }, { $set: info }),
    };
}

/** { max, plan } of the person's plan, or null when no device limit applies (plans off, staff, -1 = unlimited) */
async function planDeviceLimit(user) {
    try {
        const { planOf, isUnlimited } = await import("./plan-limits.service.js");
        const plan = await planOf(user);
        if (!plan) return null;
        const max = Number(plan.devices_max);
        if (isUnlimited(max) || !Number.isFinite(max) || max < 1) return null;
        return { max: Math.floor(max), plan: plan.name || "your plan" };
    } catch (e) {
        console.error("[sessions] reading the plan's device limit failed:", e.message);
        return null; // never refuse a sign-in because the plan couldn't be read
    }
}

let deps = null;
async function D() {
    if (deps) return deps;
    const [{ default: UserSession }, { default: redis }, { getJwtSecret }] = await Promise.all([
        import("../models/UserSession.js"),
        import("../config/redis.js"),
        import("../utils/jwt-secret.js"),
    ]);
    deps = { store: mongoStore(UserSession), redis, secret: getJwtSecret, now: () => Date.now(), deviceLimit: planDeviceLimit };
    return deps;
}
/** Tests: { store, redis, secret, now, deviceLimit, removePushDevice?, endSockets? } */
export function setSessionDeps(d) {
    deps = d;
    localKept.clear();
    seenLocal.clear();
    legacyKept.clear();
}

// ── Redis, with a short wait and a fallback ─────────────────────

const localKept = new Map(); // sid -> { at, state } (used while Redis can't be reached; "revoked" set here on revoke)
const seenLocal = new Map(); // sid -> when last_seen_at was last written by this process (while Redis can't be reached)
const ready = (r) => !!r && r.status === "ready";
const within = (p) => {
    let timer;
    const late = new Promise((_, no) => { timer = setTimeout(() => no(new Error("redis slow")), REDIS_WAIT_MS); });
    return Promise.race([p, late]).finally(() => clearTimeout(timer));
};
const stateKey = (sid) => `usess:${sid}`;

// "revoked" is written over anything; "ok" only where nothing is kept (SET NX), so an "ok" read from the database just
// before a logout can never cover the logout's "revoked"
async function keepState(sid, state, untilMs) {
    const d = await D();
    const now = d.now();
    if (state === "revoked" || localKept.get(sid)?.state !== "revoked") localKept.set(sid, { at: now, state });
    if (localKept.size > 50000) localKept.clear();
    if (!ready(d.redis)) return;
    const left = Math.ceil(((untilMs || now) - now) / 1000);
    const ttl = state === "ok" ? Math.max(1, Math.min(OK_KEEP_SEC, left)) : Math.max(60, left);
    const write = state === "ok" ? d.redis.set(stateKey(sid), state, "EX", ttl, "NX") : d.redis.set(stateKey(sid), state, "EX", ttl);
    await within(write).catch(() => {});
}

// ── The check on each request ───────────────────────────────────

/**
 * "ok" or "revoked" for a token's sid (a missing row counts as revoked). tokenExp: the token's exp (seconds).
 * Throws only when neither Redis nor the database can answer.
 */
export async function sessionState(sid, tokenExp) {
    const d = await D();
    const now = d.now();
    const kept = localKept.get(sid);
    if (kept?.state === "revoked") return "revoked";
    let redisUp = ready(d.redis);
    if (redisUp) {
        try {
            const v = await within(d.redis.get(stateKey(sid)));
            if (v === "ok" || v === "revoked") return v;
        } catch {
            redisUp = false;
        }
    }
    if (!redisUp && kept && now - kept.at < LOCAL_KEEP_MS) return kept.state;
    const row = await d.store.find(sid);
    const state = row && !row.revoked_at ? "ok" : "revoked";
    const until = row?.expires_at ? new Date(row.expires_at).getTime() : (Number(tokenExp) || 0) * 1000;
    await keepState(sid, state, state === "ok" ? Math.min(until, now + OK_KEEP_SEC * 1000) : Math.max(until, (Number(tokenExp) || 0) * 1000));
    // (logged out while the database was being read: the logout wins)
    if (state === "ok" && localKept.get(sid)?.state === "revoked") return "revoked";
    return state;
}

/**
 * What the auth middleware answers for a sign-in check: null (go on), 401 for a sign-in that was logged out or is gone
 * (the same answer as a bad token: the app goes to the login page), 503 when the check itself couldn't be made (the
 * person is still signed in: the app must not log them out for that)
 */
export function sessionCheckAnswer(state) {
    if (state === "ok") return null;
    if (state === "revoked") return { status: 401, body: { message: "Token invalid" } };
    return { status: 503, body: { message: "Couldn't check your sign-in. Try again in a moment.", code: "SESSION_CHECK_FAILED" } };
}

// ── Tokens from before sign-in rows existed (no sid) ────────────
// /api/auth/me gives such a token a row (adoptLegacyToken, legacy_key = sha-256 of the token). When that row is
// logged out, the old token ends too: "revoked" is kept in Redis (ulegacy:<key>, for a year, the longest an old token
// lives) and the row says so in the database. The auth middleware asks legacyTokenState for every token without a sid:
// one Redis GET; on a miss the database once, then kept 10 minutes.
const LEGACY_REVOKED_SEC = 366 * 24 * 60 * 60;
const legacyKept = new Map(); // key -> { at, state } (while Redis can't be reached; "revoked" set here on revoke)
export const legacyKeyOf = (token) => crypto.createHash("sha256").update(String(token || "")).digest("base64url");
const legacyStateKey = (key) => `ulegacy:${key}`;

async function keepLegacy(key, state) {
    const d = await D();
    if (state === "revoked" || legacyKept.get(key)?.state !== "revoked") legacyKept.set(key, { at: d.now(), state });
    if (legacyKept.size > 50000) legacyKept.clear();
    if (!ready(d.redis)) return;
    const write = state === "ok"
        ? d.redis.set(legacyStateKey(key), "ok", "EX", OK_KEEP_SEC, "NX")
        : d.redis.set(legacyStateKey(key), "revoked", "EX", LEGACY_REVOKED_SEC);
    await within(write).catch(() => {});
}

/** "ok" or "revoked" for a token without a sid. Throws only when neither Redis nor the database can answer. */
export async function legacyTokenState(token) {
    const d = await D();
    const key = legacyKeyOf(token);
    const kept = legacyKept.get(key);
    if (kept?.state === "revoked") return "revoked";
    let redisUp = ready(d.redis);
    if (redisUp) {
        try {
            const v = await within(d.redis.get(legacyStateKey(key)));
            if (v === "ok" || v === "revoked") return v;
        } catch {
            redisUp = false;
        }
    }
    if (!redisUp && kept && d.now() - kept.at < LOCAL_KEEP_MS) return kept.state;
    const row = await d.store.byLegacy(key);
    const state = row?.revoked_at ? "revoked" : "ok";
    await keepLegacy(key, state);
    if (state === "ok" && legacyKept.get(key)?.state === "revoked") return "revoked";
    return state;
}

/** last_seen_at = now, at most once every 5 minutes per sign-in (never throws) */
export async function touchSession(sid) {
    try {
        const d = await D();
        const now = d.now();
        if (ready(d.redis)) {
            const got = await within(d.redis.set(`usess:seen:${sid}`, "1", "EX", SEEN_EVERY_SEC, "NX")).catch(() => "down");
            if (got === null) return false; // written less than 5 minutes ago
            if (got === "down") {
                const last = seenLocal.get(sid) || 0;
                if (now - last < SEEN_EVERY_SEC * 1000) return false;
            }
        } else {
            const last = seenLocal.get(sid) || 0;
            if (now - last < SEEN_EVERY_SEC * 1000) return false;
        }
        seenLocal.set(sid, now);
        if (seenLocal.size > 50000) seenLocal.clear();
        await d.store.seen(sid, new Date(now));
        return true;
    } catch (e) {
        console.error("[sessions] last used time not saved:", e.message);
        return false;
    }
}

// ── Starting a sign-in ──────────────────────────────────────────

export class DeviceLimitError extends Error {
    constructor(used, plan, ticket = "") {
        super(deviceLimitText(used, plan));
        this.name = "DeviceLimitError";
        this.status = 403;
        this.code = DEVICE_LIMIT_CODE;
        this.used = used;
        this.plan = plan;
        this.ticket = ticket;
    }
}
// The owner's words (2026-11-17), with the real numbers and the plan's name
export const deviceLimitText = (used, plan) =>
    `You're signed in on ${used} device${used === 1 ? "" : "s"}, the most on ${plan}. Log out one in Settings → Devices, or upgrade.`;
export const isDeviceLimitError = (e) => e?.code === DEVICE_LIMIT_CODE;
/** The 403 a refused sign-in gets. ticket: lets the login page list and log out the person's devices for 10 minutes */
export const deviceLimitBody = (e) => ({ success: false, code: DEVICE_LIMIT_CODE, message: e.message, ticket: e.ticket || "" });

// ── The way out of a refused sign-in ────────────────────────────
// Settings > Devices needs a sign-in, which is what was refused. The refusal carries a ticket (10 minutes, signed,
// naming only the account): with it the login page lists the account's devices and logs out one of them, nothing
// else. It has no "id" claim, so it is never a login (the auth middleware also refuses it by its purpose).
export const DEVICE_TICKET_PURPOSE = "device_limit";
const TICKET_SEC = 10 * 60;
async function deviceLimitTicket(userId) {
    const d = await D();
    const iat = Math.floor(d.now() / 1000);
    return jwt.sign({ purpose: DEVICE_TICKET_PURPOSE, uid: String(userId), iat, exp: iat + TICKET_SEC }, d.secret());
}
/** The account a ticket names, or null (wrong, expired, or not a ticket) */
export async function readDeviceLimitTicket(ticket) {
    const d = await D();
    try {
        const t = jwt.verify(String(ticket || ""), d.secret(), { clockTimestamp: Math.floor(d.now() / 1000) });
        return t?.purpose === DEVICE_TICKET_PURPOSE && typeof t.uid === "string" && !t.id ? t.uid : null;
    } catch {
        return null;
    }
}
const refuse = async (used, limit, userId) => new DeviceLimitError(used, limit.plan, await deviceLimitTicket(userId));

const lastUsed = (row) => new Date(row.last_seen_at || row.created_at || 0).getTime();
// A device id told only by the user agent (deviceInfoOf): many devices share one, so it never replaces a sign-in
export const isWeakDeviceId = (id) => /(^|:)ua:/.test(String(id || ""));
const isUnused = (row, now) => now - lastUsed(row) > UNUSED_MS;

async function revokeRows(rows, reason) {
    if (!rows.length) return 0;
    const d = await D();
    const at = new Date(d.now());
    await d.store.revoke(rows.map((r) => r._id), at, reason);
    await Promise.all(rows.map((r) => keepState(r.sid, "revoked", new Date(r.expires_at).getTime())));
    // (an old token given this row by /api/auth/me ends with it)
    await Promise.all(rows.filter((r) => r.legacy_key).map((r) => keepLegacy(r.legacy_key, "revoked")));
    return rows.length;
}

/**
 * The person's sign-ins that still work. Ones started before the password last changed (a password change or reset,
 * "Log out from all devices", a support force-logout: User.passwordChangedAt) no longer work and are ended here.
 * A sign-in not used for 30 days stays signed in (owner: it only stops counting toward the device limit); the
 * count leaves it out (countedSessions), and its next use counts it again.
 */
async function liveSessions(user) {
    const d = await D();
    let live = await d.store.live(user._id, new Date(d.now()));
    const cut = user?.passwordChangedAt ? new Date(user.passwordChangedAt).getTime() : 0;
    if (cut) {
        const before = live.filter((r) => new Date(r.created_at).getTime() < cut);
        await revokeRows(before, "password_changed");
        live = live.filter((r) => !before.includes(r));
    }
    // Rows made by the server's own calls before its tokens were marked internal (2026-11-17: user agent "node", one per
    // voice-mode task, 12 hours each): not a device of the person
    return live.filter((r) => !(r.legacy_key && /^node(\/|$)/i.test(String(r.user_agent || ""))));
}

/** The sign-ins that count toward the device limit: the live ones used in the last 30 days */
/**
 * One device can have several rows: an app that signs in again without a device id of its own, an older token adopted
 * next to a new sign-in, the same browser's cookie token (2026-11-17: 7 rows of one phone). Rows are one device when
 * they share a device id the client sent, or (a guessed or missing id) the same type and the same user agent; a guessed
 * row with the same user agent as a sent-id row joins that row. Key per row, for the list, the count and Log out.
 */
function deviceGroups(rows) {
    const keyOf = new Map();
    const strongByAgent = new Map();
    for (const r of rows) {
        if (r.device_id && !isWeakDeviceId(r.device_id)) {
            keyOf.set(r, `id:${r.device_id}`);
            const agentKey = `${r.kind}|${r.user_agent || ""}`;
            if (r.user_agent && !strongByAgent.has(agentKey)) strongByAgent.set(agentKey, `id:${r.device_id}`);
        }
    }
    for (const r of rows) {
        if (keyOf.has(r)) continue;
        const agentKey = `${r.kind}|${r.user_agent || ""}`;
        keyOf.set(r, (r.user_agent && strongByAgent.get(agentKey)) || `ua:${agentKey}|${r.user_agent ? "" : String(r._id)}`);
    }
    return keyOf;
}

/** The devices that count toward the limit: the live ones used in the last 30 days, one per device */
const countedSessions = (rows, now) => {
    const used = rows.filter((r) => !isUnused(r, now));
    const keys = deviceGroups(used);
    const seen = new Set();
    return used.filter((r) => { const k = keys.get(r); if (seen.has(k)) return false; seen.add(k); return true; });
};

/** Closes the live connections (socket.io) of one sign-in ({ sid }) or of every sign-in of a person ({ userId }) */
export function endSessionSockets({ sid, userId } = {}) {
    if (deps?.endSockets) return deps.endSockets({ sid, userId }); // (tests)
    import("./socket.service.js")
        .then(({ getIO }) => {
            const io = getIO();
            if (sid) io.in(`sid:${sid}`).disconnectSockets(true);
            if (userId) io.in(String(userId)).disconnectSockets(true);
        })
        .catch(() => {}); // (no socket server in this process)
}

/**
 * Saves a new sign-in and returns its sid. Throws DeviceLimitError when the plan's device limit is reached (nothing is
 * saved then). info: deviceInfoOf(req, ...). expiresAt: the token's expiry (Date).
 * legacyKey: an old token given its row by /api/auth/me (UserSession.legacy_key). That sign-in already exists: it is
 * never refused, and it never replaces another sign-in (two tabs of one browser adopting at once must not log each
 * other out).
 */
export async function startSession({ user, info, expiresAt, legacyKey = "" }) {
    const d = await D();
    const userId = user._id;
    const adopting = !!legacyKey;
    const limit = adopting ? null : await d.deviceLimit(user);
    const live = await liveSessions(user);
    // The same device signing in again: only a device id the client sent says so. Its own sign-in is replaced, and it
    // is never refused. An id told by the user agent (many devices can share it) replaces nothing: it only keeps a
    // device that signs in again from being refused (its old sign-in stays until it expires or goes unused).
    const strong = !adopting && !!info.device_id && !isWeakDeviceId(info.device_id);
    const same = strong ? live.filter((r) => r.device_id && r.device_id === info.device_id) : [];
    const weakMatch = !strong && !!info.device_id && live.some((r) => r.device_id === info.device_id);
    await revokeRows(same, "replaced");
    const others = countedSessions(live.filter((r) => !same.includes(r)), d.now());
    const counts = !!limit && !same.length && !weakMatch;
    if (counts && others.length >= limit.max) throw await refuse(others.length, limit, userId);

    const now = new Date(d.now());
    const sid = crypto.randomBytes(24).toString("base64url");
    const row = await d.store.insert({
        user_id: userId, sid, kind: info.kind, device_name: info.device_name, user_agent: info.user_agent,
        device_id: info.device_id, device_model: info.device_model, push_token: "", push_device_id: "", legacy_key: legacyKey,
        created_at: now, last_seen_at: now, expires_at: expiresAt, revoked_at: null, revoke_reason: "",
    });
    await keepState(sid, "ok", Math.min(expiresAt.getTime(), d.now() + OK_KEEP_SEC * 1000));

    // Two sign-ins at the same moment could both have fitted: counted again, the oldest ones keep their place
    if (counts) {
        const after = (await d.store.live(userId, new Date(d.now()))).filter((r) => !isUnused(r, d.now()));
        if (after.length > limit.max) {
            const order = after.sort((a, b) => new Date(a.created_at) - new Date(b.created_at) || String(a._id).localeCompare(String(b._id)));
            if (order.findIndex((r) => r.sid === sid) >= limit.max) {
                await revokeRows([row], "limit");
                throw await refuse(after.length - 1, limit, userId);
            }
        }
    }
    return sid;
}

/** Seconds in "24h", "7d", "365d", "30m", "45s" or a number of seconds */
export function secondsOf(expiresIn) {
    if (typeof expiresIn === "number") return Math.floor(expiresIn);
    const m = /^(\d+)\s*([smhd])$/.exec(String(expiresIn || "").trim());
    if (!m) throw new Error(`Unknown token lifetime: ${expiresIn}`);
    return Number(m[1]) * { s: 1, m: 60, h: 3600, d: 86400 }[m[2]];
}

/**
 * A person's sign-in token with its own sign-in row: { ...payload, sid }. Throws DeviceLimitError (see startSession).
 * deviceOpts: { editor, editorScheme, oauthState } for deviceInfoOf.
 */
export async function signUserToken({ user, req, payload, expiresIn, deviceOpts = {} }) {
    const d = await D();
    const iat = Math.floor(d.now() / 1000);
    const exp = iat + secondsOf(expiresIn);
    const info = deviceInfoOf(req, deviceOpts);
    const sid = await startSession({ user, info, expiresAt: new Date(exp * 1000) });
    return jwt.sign({ ...payload, sid, iat, exp }, d.secret());
}

/** /api/auth/me's renewed token for the same sign-in: same sid, a new expiry, and the row's expiry moved on with it */
export async function renewUserToken({ payload, sid, expiresIn }) {
    const d = await D();
    const iat = Math.floor(d.now() / 1000);
    const exp = iat + secondsOf(expiresIn);
    d.store.extend(sid, new Date(exp * 1000)).catch((e) => console.error("[sessions] expiry not moved on:", e.message));
    return jwt.sign({ ...payload, sid, iat, exp }, d.secret());
}

/**
 * /api/auth/me for a token from before sign-in rows existed (no sid): the token it hands back gets a row and a sid, so
 * everyone signed in today shows up in Settings > Devices from their next visit. Never refused (the person is already
 * signed in). The same old token asking again gets the same row (legacy_key: sha-256 of that token), so a client that
 * keeps its old token doesn't add a row per visit.
 */
export async function adoptLegacyToken({ user, req, oldToken, payload, expiresIn, deviceOpts = {} }) {
    const d = await D();
    const key = legacyKeyOf(oldToken);
    // The row this old token already has: renewed (and its last used time moved on); one that was logged out ends the
    // old token (LegacyRevokedError: the caller answers 401)
    const fromRow = async () => {
        const have = await d.store.byLegacy(key);
        if (!have || String(have.user_id) !== String(user._id)) return null;
        if (have.revoked_at) {
            await keepLegacy(key, "revoked");
            throw new LegacyRevokedError();
        }
        touchSession(have.sid);
        if (!have.user_agent) await nameSessionIfUnnamed(have.sid, req, deviceOpts);
        return renewUserToken({ payload, sid: have.sid, expiresIn });
    };
    const had = await fromRow();
    if (had) return had;
    const iat = Math.floor(d.now() / 1000);
    const exp = iat + secondsOf(expiresIn);
    let sid;
    try {
        sid = await startSession({ user, info: deviceInfoOf(req, deviceOpts), expiresAt: new Date(exp * 1000), legacyKey: key });
    } catch (e) {
        // Another request with the same old token made its row a moment ago (legacy_key is unique): that row is used
        if (e?.code === 11000) {
            const theirs = await fromRow();
            if (theirs) return theirs;
        }
        throw e;
    }
    return jwt.sign({ ...payload, sid, iat, exp }, d.secret());
}

/**
 * An older sign-in (a token from before sign-in rows existed) used for any request or socket: it gets its row the way
 * /api/auth/me gives one, so the phone app and the desktop app show in Settings > Devices from their next request even
 * when they never call /me (seen live on 2026-11-17: the desktop app only reconnected its socket, so it never showed).
 * The token itself is not changed (the next /me swaps it for one with a sid as before). At most once every 5 minutes per
 * token (Redis); skipped while Redis can't be reached; never refused for the limit; never throws.
 */
export async function noteLegacyUse({ user, req, token, exp, deviceOpts = {} }) {
    try {
        if (!user?._id || !token) return;
        // A request with no user agent (an app's background poller, e.g. the desktop app's main process): it can't say
        // what the device is, so it makes no row (seen live 2026-11-17: such rows showed as "Web browser")
        if (!header(req, "user-agent")) return;
        const d = await D();
        if (!ready(d.redis)) return;
        const key = legacyKeyOf(token);
        const got = await within(d.redis.set(`ulegacy:seen:${key}`, "1", "EX", SEEN_EVERY_SEC, "NX")).catch(() => "down");
        if (got !== "OK") return; // seen less than 5 minutes ago, or Redis didn't answer
        const have = await d.store.byLegacy(key);
        if (have) {
            if (!have.revoked_at && String(have.user_id) === String(user._id)) {
                touchSession(have.sid);
                // A row made from a request with no user agent (before 2026-11-17's fix) gets its real name now
                if (!have.user_agent) {
                    const info = deviceInfoOf(req, deviceOpts);
                    await d.store.setInfo(have.sid, { kind: info.kind, device_name: info.device_name, user_agent: info.user_agent, device_id: info.device_id });
                }
            }
            return;
        }
        const expSec = Number(exp) > 0 ? Number(exp) : Math.floor(d.now() / 1000) + 24 * 60 * 60;
        await startSession({ user, info: deviceInfoOf(req, deviceOpts), expiresAt: new Date(expSec * 1000), legacyKey: key })
            .catch((e) => { if (e?.code !== 11000) throw e; }); // (another request made its row a moment ago)
    } catch (e) {
        console.error("[sessions] giving an older sign-in its row failed:", e.message);
    }
}

/** A sign-in row made from a request with no user agent gets its real name, type and device id from this request
 * (only while the row has no user agent: one indexed update that changes nothing otherwise). Never throws. */
export async function nameSessionIfUnnamed(sid, req, deviceOpts = {}) {
    try {
        if (!sid || !header(req, "user-agent")) return;
        const d = await D();
        const info = deviceInfoOf(req, deviceOpts);
        await d.store.setInfo(sid, { kind: info.kind, device_name: info.device_name, user_agent: info.user_agent, device_id: info.device_id });
    } catch (e) {
        console.error("[sessions] naming a sign-in failed:", e.message);
    }
}

export class LegacyRevokedError extends Error {
    constructor() {
        super("This sign-in was logged out.");
        this.name = "LegacyRevokedError";
        this.code = "LEGACY_REVOKED";
        this.status = 401;
    }
}

/**
 * What /api/auth/me hands back for the token it was called with:
 * "as_is"  support's "log in as" token (impersonatedBy): the same token, never one of the person's sign-ins, never longer
 * "renew"  a token with a sid: the same sign-in, a new expiry
 * "adopt"  a person's token from before sign-in rows existed: it gets a row and a sid (adoptLegacyToken)
 * "plain"  the impersonation and provisional tokens: renewed as before
 */
export function renewalKind({ sid, impersonatedBy, isImpersonating, isProvisional, hasUser, hasToken, internal = false }) {
    if (impersonatedBy && hasToken) return "as_is";
    if (internal) return "plain"; // the server's own token (whatsapp-call.service.js userToken): never a device
    if (sid) return "renew";
    if (hasToken && hasUser && !isImpersonating && !isProvisional) return "adopt";
    return "plain";
}

/**
 * A login token that is still signed in, checked the way the auth middleware checks one: a person's own token (not
 * support's, a provisional token or a ticket), its sign-in not logged out (sid), an old token whose row was not logged
 * out, and the account's own checks. accountBlocked(decoded): the account's answer (true when missing, blocked or the
 * password changed after the token was issued). Used where a login token stands in for another proof
 * (auth.controller.js chatFinalizeOnboarding).
 */
export async function tokenStillSignedIn(decoded, rawToken, { accountBlocked }) {
    if (!decoded?.id || decoded.impersonation || decoded.impersonatedBy || decoded.isProvisional || decoded.purpose) return false;
    const state = typeof decoded.sid === "string" ? await sessionState(decoded.sid, decoded.exp) : await legacyTokenState(rawToken);
    if (state !== "ok") return false;
    return !(await accountBlocked(decoded));
}

/** The phone app registered its push device while signed in with this sign-in (POST /api/user/fcm-token) */
export async function attachPushToSession(sid, { token = "", deviceId = "" } = {}) {
    const d = await D();
    const push = {};
    if (token) push.push_token = String(token).slice(0, 4096);
    if (deviceId) push.push_device_id = String(deviceId).slice(0, 128);
    if (Object.keys(push).length) await d.store.setPush(sid, push);
}

/**
 * After a sign-in ended: its live connections close, and a phone stops getting the account's notifications (the push
 * device registered with this sign-in, or the phone's own device id). Never throws.
 */
export async function afterSessionEnded(userId, row) {
    if (!row) return;
    endSessionSockets({ sid: row.sid });
    const token = row.push_token || "";
    const deviceId = row.push_device_id || (row.kind === "phone" && row.device_id && !isWeakDeviceId(row.device_id) ? row.device_id : "");
    if (!token && !deviceId) return;
    try {
        // Another sign-in still live on the same phone (an older row of it) keeps its notifications
        const d = await D();
        const others = (await d.store.live(userId, new Date(d.now()))).filter((r) => r.sid !== row.sid);
        const stillUsed = others.some((r) =>
            (token && r.push_token === token) ||
            (deviceId && (r.push_device_id === deviceId || (r.kind === "phone" && r.device_id === deviceId))));
        if (stillUsed) return;
        const removePushDevice = d.removePushDevice || (await import("./user-push.service.js")).removePushDevice;
        await removePushDevice(userId, { token, deviceId });
    } catch (e) {
        console.error("[sessions] push device not removed:", e.message);
    }
}

// ── Settings > Devices ──────────────────────────────────────────

// What a row is shown as. An older sign-in's row (legacy_key) is named again from its saved user agent each time, so
// rows made before the editor and desktop checks were right (2026-11-17: VS Code saved as "Chrome on Windows") show
// their real name; a row with no user agent keeps what it has until the app's first real request names it.
function shownDevice(r) {
    const saved = { kind: SESSION_KINDS.includes(r.kind) ? r.kind : "website", device_name: r.device_name || "Unknown device" };
    if (!r.legacy_key || !r.user_agent) return saved;
    const info = deviceInfoOf({ headers: { "user-agent": r.user_agent } });
    return info.kind === "website" && saved.kind !== "website" ? saved : { kind: info.kind, device_name: info.device_name };
}

/** { devices, limit: { used, max }, note } for the person; this_device marks the caller's own sign-in */
export async function listDevices(user, currentSid, currentToken = "") {
    // (a request with an older token, no sid: its own row is the one made for that token)
    const currentLegacy = !currentSid && currentToken ? legacyKeyOf(currentToken) : "";
    const d = await D();
    const limit = await d.deviceLimit(user);
    const live = await liveSessions(user);
    // One row per device (deviceGroups): the most recently used row stands for it; This device when any of its rows is
    const keys = deviceGroups(live);
    const isThis = (r) => (!!currentSid && r.sid === currentSid) || (!!currentLegacy && r.legacy_key === currentLegacy);
    const byKey = new Map();
    for (const r of live.slice().sort((a, b) => lastUsed(b) - lastUsed(a))) {
        const k = keys.get(r);
        const g = byKey.get(k);
        if (g) { g.rows.push(r); g.created = Math.min(g.created, new Date(r.created_at).getTime()); }
        else byKey.set(k, { first: r, rows: [r], created: new Date(r.created_at).getTime() });
    }
    const devices = [...byKey.values()]
        .map(({ first: r, rows, created }) => ({ r, rows, created, shown: shownDevice(r) }))
        .map(({ r, rows, created, shown }) => ({
            id: String(r._id),
            kind: shown.kind,
            device_name: shown.device_name,
            created_at: new Date(created),
            last_seen_at: r.last_seen_at || r.created_at,
            this_device: rows.some(isThis),
        }));
    return { devices, limit: { used: countedSessions(live, d.now()).length, max: limit ? limit.max : null }, note: DEVICES_NOTE };
}

/** Ends one of the person's sign-ins: { found, row } (row: the sign-in, with sid, kind and device_id) */
export async function revokeDevice(userId, id) {
    const d = await D();
    const row = await d.store.byId(userId, id);
    if (!row) return { found: false, row: null, rows: [] };
    // The whole device: every live row the list shows as this one device (deviceGroups)
    let rows = [row];
    if (!row.revoked_at) {
        const live = await d.store.live(userId, new Date(d.now()));
        const keys = deviceGroups(live.some((r) => String(r._id) === String(row._id)) ? live : [...live, row]);
        const mine = keys.get(live.find((r) => String(r._id) === String(row._id)) || row);
        rows = live.filter((r) => keys.get(r) === mine);
        if (!rows.some((r) => String(r._id) === String(row._id))) rows.push(row);
        await revokeRows(rows, "logout");
    }
    return { found: true, row, rows };
}

/** Ends the sign-in a token names (the logout route): the row (with sid, kind, device and push device) or null */
export async function revokeSid(sid, reason = "logout") {
    const d = await D();
    const row = await d.store.find(sid);
    if (row && !row.revoked_at) {
        await d.store.revoke([row._id], new Date(d.now()), reason);
    }
    await keepState(sid, "revoked", row?.expires_at ? new Date(row.expires_at).getTime() : d.now() + 365 * 86400000);
    if (row?.legacy_key) await keepLegacy(row.legacy_key, "revoked");
    return row ? { ...row, sid } : null;
}

/** Ends every sign-in of the person: the rows ended (with sid, kind and device_id) */
export async function revokeAllSessions(userId) {
    const d = await D();
    const live = await d.store.live(userId, new Date(d.now()));
    await revokeRows(live, "logout_all");
    return live;
}
