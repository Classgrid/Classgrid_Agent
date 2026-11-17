// node --experimental-test-module-mocks --test tests/user-sessions.test.mjs   (in server/)
// Sign-ins per device (src/services/user-session.service.js): how a device is named and which kind it is, the check
// the auth middleware makes on each request (Redis first, the database when Redis has nothing or can't be reached),
// the last used time, the plan's device limit (counted by account, whichever of its emails signed in), and Settings >
// Devices' list and logouts. The database, Redis and the plan are stubs (setSessionDeps): nothing outside this file is
// reached.
import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import {
    setSessionDeps, parseUserAgent, deviceKindOf, deviceNameOf, deviceInfoOf, cleanDeviceId, editorSchemeOf, secondsOf,
    sessionState, touchSession, startSession, signUserToken, renewUserToken, listDevices, revokeDevice, revokeSid,
    revokeAllSessions, deviceLimitText, isDeviceLimitError, DEVICES_NOTE, readDeviceLimitTicket, deviceLimitBody,
    sessionCheckAnswer, adoptLegacyToken, attachPushToSession, isWeakDeviceId, legacyTokenState, legacyKeyOf,
    afterSessionEnded, renewalKind, tokenStillSignedIn, noteLegacyUse, editorFromUserAgent, nameSessionIfUnnamed,
} from "../src/services/user-session.service.js";
import { findByAnyEmail } from "../src/utils/account-email.js";

const SECRET = "test-secret";
const DAY = 24 * 60 * 60 * 1000;

const UA = {
    chromeWin: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    edgeWin: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
    safariMac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
    safariIphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    firefoxLinux: "Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0",
    chromeAndroid: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
    desktopApp: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Classgrid/1.4.2 Chrome/130.0.6723.191 Electron/33.2.1 Safari/537.36",
    phoneApp: "Classgrid-Android/1.0.3 okhttp/4.12.0",
    webview: "Mozilla/5.0 (Linux; Android 13; SM-A536E Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.0.0 Mobile Safari/537.36",
};
const reqOf = (ua, headers = {}, body = {}) => ({ headers: { "user-agent": ua, ...headers }, body });

// ── the stubs ──────────────────────────────────────────────────
function memoryStore() {
    let n = 0;
    const rows = [];
    const copy = (r) => (r ? { ...r } : null);
    const store = {
        rows,
        calls: { find: 0, seen: 0, extend: 0 },
        fail: false,
        find: async (sid) => { store.calls.find++; if (store.fail) throw new Error("db down"); return copy(rows.find((r) => r.sid === sid)); },
        insert: async (row) => {
            await new Promise((r) => setImmediate(r));
            if (row.legacy_key && rows.some((x) => x.legacy_key === row.legacy_key)) throw Object.assign(new Error("E11000 duplicate key"), { code: 11000 });
            const r = { _id: `s${++n}`, ...row };
            rows.push(r);
            return copy(r);
        },
        live: async (userId, now) => rows.filter((r) => String(r.user_id) === String(userId) && !r.revoked_at && r.expires_at > now).map(copy),
        byId: async (userId, id) => copy(rows.find((r) => r._id === id && String(r.user_id) === String(userId))),
        revoke: async (ids, at, reason) => { for (const r of rows) if (ids.includes(r._id) && !r.revoked_at) Object.assign(r, { revoked_at: at, revoke_reason: reason }); },
        seen: async (sid, at) => { store.calls.seen++; const r = rows.find((x) => x.sid === sid); if (r) r.last_seen_at = at; },
        extend: async (sid, at) => { store.calls.extend++; const r = rows.find((x) => x.sid === sid && !x.revoked_at); if (r && at > r.expires_at) r.expires_at = at; },
        byLegacy: async (key) => copy(rows.find((r) => r.legacy_key === key)),
        setPush: async (sid, push) => { const r = rows.find((x) => x.sid === sid); if (r) Object.assign(r, push); },
        setInfo: async (sid, info) => { const r = rows.find((x) => x.sid === sid && !x.user_agent); if (r) Object.assign(r, info); },
    };
    return store;
}
function fakeRedis() {
    const kv = new Map();
    return {
        kv,
        status: "ready",
        get: async (k) => (kv.has(k) ? kv.get(k) : null),
        set: async (k, v, ...args) => {
            if (args.includes("NX") && kv.has(k)) return null;
            kv.set(k, v);
            return "OK";
        },
    };
}

let clock = Date.UTC(2026, 10, 17, 10, 0, 0);
let world;
function setup({ limit = null, redis = fakeRedis() } = {}) {
    clock = Date.UTC(2026, 10, 17, 10, 0, 0);
    world = { store: memoryStore(), redis, limit, pushRemoved: [], socketsEnded: [] };
    setSessionDeps({
        store: world.store,
        redis: world.redis,
        secret: () => SECRET,
        now: () => clock,
        deviceLimit: async () => world.limit,
        removePushDevice: async (userId, what) => { world.pushRemoved.push({ userId, ...what }); return { ok: true }; },
        endSockets: (what) => { world.socketsEnded.push(what); },
    });
    return world;
}
const FREE = { max: 2, plan: "Free" };
const userA = { _id: "u-1", role: "user", email: "a@example.com" };
const later = (ms) => new Date(clock + ms);
const signIn = (user, req, opts) => startSession({ user, info: deviceInfoOf(req, opts), expiresAt: later(DAY) });

// ── naming and kinds ───────────────────────────────────────────
test("names browsers in plain words", () => {
    assert.deepEqual(parseUserAgent(UA.chromeWin), { browser: "Chrome", os: "Windows" });
    assert.deepEqual(parseUserAgent(UA.edgeWin), { browser: "Edge", os: "Windows" });
    assert.deepEqual(parseUserAgent(UA.safariMac), { browser: "Safari", os: "Mac" });
    assert.deepEqual(parseUserAgent(UA.firefoxLinux), { browser: "Firefox", os: "Linux" });
    assert.deepEqual(parseUserAgent(UA.chromeAndroid), { browser: "Chrome", os: "Android" });
    assert.equal(deviceNameOf({ kind: "website", userAgent: UA.chromeWin }), "Chrome on Windows");
    assert.equal(deviceNameOf({ kind: "website", userAgent: UA.safariIphone }), "Safari on iPhone");
    assert.equal(deviceNameOf({ kind: "website", userAgent: "" }), "Web browser");
});

test("tells the website, the desktop app, the phone app and the code editor apart", () => {
    assert.equal(deviceKindOf(reqOf(UA.chromeWin)), "website");
    assert.equal(deviceKindOf(reqOf(UA.safariIphone)), "website"); // a phone's browser is the website, not the app
    assert.equal(deviceKindOf(reqOf(UA.desktopApp)), "desktop");
    assert.equal(deviceKindOf(reqOf(UA.phoneApp)), "phone");
    assert.equal(deviceKindOf(reqOf(UA.webview)), "phone");
    assert.equal(deviceKindOf(reqOf("okhttp/4.12.0", { "x-platform-app": "android" })), "phone");
    assert.equal(deviceKindOf(reqOf(UA.chromeWin), { editor: true }), "editor");
    assert.equal(deviceNameOf({ kind: "desktop", userAgent: UA.desktopApp }), "Classgrid desktop app on Windows");
    assert.equal(deviceNameOf({ kind: "phone", userAgent: UA.phoneApp }), "Classgrid phone app on Android");
    assert.equal(deviceNameOf({ kind: "phone", userAgent: "x", platform: "android", deviceModel: "Pixel 8" }), "Classgrid phone app on Android (Pixel 8)");
    assert.equal(deviceNameOf({ kind: "phone", userAgent: "x", platform: "ios" }), "Classgrid phone app on iPhone");
});

test("a phone sign-in keeps the phone's device id and model", () => {
    const info = deviceInfoOf(reqOf(UA.phoneApp, { "x-platform-app": "android", "x-device-id": "dev-abc-123", "x-device-model": "Pixel 8" }));
    assert.equal(info.kind, "phone");
    assert.equal(info.device_name, "Classgrid phone app on Android (Pixel 8)");
    assert.equal(info.device_id, "dev-abc-123");
    assert.equal(info.device_model, "Pixel 8");
    // the body works too; a model is only kept for phones
    const body = deviceInfoOf(reqOf(UA.phoneApp, { "x-platform-app": "android" }, { deviceId: "dev-xyz-999", deviceModel: "Galaxy A53" }));
    assert.equal(body.device_id, "dev-xyz-999");
    assert.equal(body.device_name, "Classgrid phone app on Android (Galaxy A53)");
    assert.equal(deviceInfoOf(reqOf(UA.chromeWin, { "x-device-model": "Pixel 8" })).device_model, "");
    assert.equal(cleanDeviceId("bad id with spaces"), "");
    assert.equal(cleanDeviceId("<script>"), "");
});

test("a Google / GitHub sign-in for the desktop or phone app is named for the app, with the app's own device id", () => {
    const desk = deviceInfoOf(reqOf(UA.chromeWin), { oauthState: { desktop: true, device: "app-device-1", deviceModel: "" } });
    assert.equal(desk.kind, "desktop");
    assert.equal(desk.device_name, "Classgrid desktop app on Windows");
    assert.equal(desk.device_id, "app-device-1");
    const phone = deviceInfoOf(reqOf(UA.chromeAndroid), { oauthState: { desktop: true, device: "phone-dev-9", deviceModel: "Pixel 8" } });
    assert.equal(phone.kind, "phone");
    assert.equal(phone.device_name, "Classgrid phone app on Android (Pixel 8)");
    const web = deviceInfoOf(reqOf(UA.chromeWin), { oauthState: { desktop: false, device: "browser-1" } });
    assert.equal(web.kind, "website");
    assert.equal(web.device_id, "browser-1");
});

test("a code editor is named by the editor, on the computer of the browser that signed it in", () => {
    const req = reqOf(UA.chromeWin, { "x-device-id": "browser-id-1" });
    assert.equal(editorSchemeOf("cursor://classgrid.classgrid/login"), "cursor");
    assert.equal(deviceInfoOf(req, { editor: true, editorScheme: "vscode" }).device_name, "VS Code on Windows");
    assert.equal(deviceInfoOf(req, { editor: true, editorScheme: "cursor" }).device_name, "Cursor on Windows");
    assert.equal(deviceInfoOf(req, { editor: true, editorScheme: "antigravity" }).device_name, "Antigravity on Windows");
    assert.equal(deviceInfoOf(req, { editor: true, editorScheme: "classgrid-code" }).device_name, "Classgrid Code on Windows");
    assert.equal(deviceInfoOf(req, { editor: true, editorScheme: "" }).device_name, "Code editor on Windows");
    assert.equal(deviceInfoOf(req, { editor: true, editorScheme: "newedit", editorApp: "New Editor" }).device_name, "New Editor on Windows");
    // its own device: the editor's id when it sends one, else the browser's id with the editor's name
    const vs = deviceInfoOf(req, { editor: true, editorScheme: "vscode" });
    const cur = deviceInfoOf(req, { editor: true, editorScheme: "cursor" });
    assert.equal(vs.device_id, "editor:vscode:browser-id-1");
    assert.notEqual(vs.device_id, cur.device_id);
    assert.equal(deviceInfoOf(req, { editor: true, editorScheme: "vscode", editorDevice: "machine-42" }).device_id, "editor:vscode:own:machine-42");
});

test("token lifetimes", () => {
    assert.equal(secondsOf("24h"), 86400);
    assert.equal(secondsOf("7d"), 7 * 86400);
    assert.equal(secondsOf("365d"), 365 * 86400);
    assert.equal(secondsOf(60), 60);
    assert.throws(() => secondsOf("forever"));
});

// ── the token and the check on each request ────────────────────
test("a sign-in token carries its sid and expires with its row", async () => {
    setup();
    const token = await signUserToken({ user: userA, req: reqOf(UA.chromeWin), payload: { id: "u-1", role: "user" }, expiresIn: "24h" });
    const decoded = jwt.verify(token, SECRET, { clockTimestamp: Math.floor(clock / 1000) });
    assert.ok(typeof decoded.sid === "string" && decoded.sid.length >= 32);
    assert.equal(decoded.id, "u-1");
    const row = world.store.rows[0];
    assert.equal(row.sid, decoded.sid);
    assert.equal(row.kind, "website");
    assert.equal(row.device_name, "Chrome on Windows");
    assert.equal(row.expires_at.getTime(), decoded.exp * 1000);
    assert.equal(decoded.exp - decoded.iat, 86400);
    // /api/auth/me's renewal: the same sid, a later expiry, the row moved on with it
    clock += 60 * 60 * 1000;
    const renewed = jwt.verify(await renewUserToken({ payload: { id: "u-1", role: "user" }, sid: decoded.sid, expiresIn: "24h" }), SECRET, { clockTimestamp: Math.floor(clock / 1000) });
    assert.equal(renewed.sid, decoded.sid);
    assert.ok(renewed.exp > decoded.exp);
    await new Promise((r) => setImmediate(r));
    assert.equal(world.store.rows[0].expires_at.getTime(), renewed.exp * 1000);
});

test("the check: one Redis read when kept; the database once on a miss; a missing or ended sign-in is refused", async () => {
    setup();
    const sid = await signIn(userA, reqOf(UA.chromeWin));
    // kept "ok" at sign-in: no database read
    assert.equal(await sessionState(sid, 0), "ok");
    assert.equal(world.store.calls.find, 0);
    // Redis lost it: the database answers once and it is kept again
    world.redis.kv.clear();
    assert.equal(await sessionState(sid, 0), "ok");
    assert.equal(await sessionState(sid, 0), "ok");
    assert.equal(world.store.calls.find, 1);
    // a sid with no row is refused
    assert.equal(await sessionState("no-such-sid", Math.floor(clock / 1000) + 3600), "revoked");
    // ended: refused at once, from Redis
    await revokeSid(sid);
    assert.equal(world.redis.kv.get(`usess:${sid}`), "revoked");
    const reads = world.store.calls.find;
    assert.equal(await sessionState(sid, 0), "revoked");
    assert.equal(world.store.calls.find, reads);
});

test("Redis can't be reached: the database is asked, and the answer kept 15 seconds in this process", async () => {
    const redis = fakeRedis();
    setup({ redis });
    const sid = await signIn(userA, reqOf(UA.chromeWin));
    redis.status = "reconnecting";
    redis.kv.clear();
    world.store.calls.find = 0;
    // (kept "ok" from the sign-in in this process: still fresh)
    assert.equal(await sessionState(sid, 0), "ok");
    clock += 20000;
    assert.equal(await sessionState(sid, 0), "ok");
    assert.equal(world.store.calls.find, 1);
    assert.equal(await sessionState(sid, 0), "ok");
    assert.equal(world.store.calls.find, 1);
    // an ended row in the database is refused
    world.store.rows[0].revoked_at = new Date(clock);
    clock += 20000;
    assert.equal(await sessionState(sid, 0), "revoked");
    // neither can answer: it throws (the middleware answers 401)
    clock += 20000;
    world.store.fail = true;
    await assert.rejects(sessionState("other-sid", 0));
});

test("last used is written at most once every 5 minutes per sign-in", async () => {
    setup();
    const sid = await signIn(userA, reqOf(UA.chromeWin));
    assert.equal(await touchSession(sid), true);
    assert.equal(await touchSession(sid), false);
    assert.equal(world.store.calls.seen, 1);
    world.redis.kv.delete(`usess:seen:${sid}`); // the 5 minutes are over
    clock += 5 * 60 * 1000;
    assert.equal(await touchSession(sid), true);
    assert.equal(world.store.rows[0].last_seen_at.getTime(), clock);
    // without Redis: kept in this process
    world.redis.status = "end";
    assert.equal(await touchSession(sid), false);
    clock += 5 * 60 * 1000 + 1;
    assert.equal(await touchSession(sid), true);
});

// ── the plan's device limit ────────────────────────────────────
test("a sign-in over the plan's devices is refused with the owner's message; nothing is saved", async () => {
    setup({ limit: FREE });
    await signIn(userA, reqOf(UA.chromeWin, { "x-device-id": "browser-1" }));
    await signIn(userA, reqOf(UA.desktopApp, { "x-device-id": "desktop-1" }));
    await assert.rejects(signIn(userA, reqOf(UA.phoneApp, { "x-platform-app": "android", "x-device-id": "phone-1" })), (e) => {
        assert.ok(isDeviceLimitError(e));
        assert.equal(e.status, 403);
        assert.equal(e.message, "You're signed in on 2 devices, the most on Free. Log out one in Settings → Devices, or upgrade.");
        return true;
    });
    assert.equal(world.store.rows.length, 2);
    assert.equal(deviceLimitText(1, "Free"), "You're signed in on 1 device, the most on Free. Log out one in Settings → Devices, or upgrade.");
});

test("the same device signing in again replaces its own sign-in and is never refused", async () => {
    setup({ limit: FREE });
    const first = await signIn(userA, reqOf(UA.chromeWin, { "x-device-id": "browser-1" }));
    await signIn(userA, reqOf(UA.desktopApp, { "x-device-id": "desktop-1" }));
    const again = await signIn(userA, reqOf(UA.chromeWin, { "x-device-id": "browser-1" }));
    assert.notEqual(first, again);
    assert.equal(await sessionState(first, 0), "revoked");
    assert.equal(world.store.rows.find((r) => r.sid === first).revoke_reason, "replaced");
    const { limit } = await listDevices(userA, again);
    assert.deepEqual(limit, { used: 2, max: 2 });
    // also when the plan went down to fewer devices than are signed in
    world.limit = { max: 1, plan: "Free" };
    await signIn(userA, reqOf(UA.desktopApp, { "x-device-id": "desktop-1" }));
});

test("an app that sends no device id yet: never logs out another device, and isn't refused for signing in again", async () => {
    setup({ limit: FREE });
    await signIn(userA, reqOf(UA.chromeWin, { "x-device-id": "browser-1" }));
    const phone = reqOf(UA.phoneApp, { "x-platform-app": "android" }); // (the phone app before it sends X-Device-Id)
    assert.ok(isWeakDeviceId(deviceInfoOf(phone).device_id));
    const first = await signIn(userA, phone);
    // the same user agent again (this phone signing in again, or another phone with the same app): a new sign-in, not
    // refused, and the first one is NOT logged out (many devices share a user agent)
    const again = await signIn(userA, phone);
    assert.notEqual(first, again);
    assert.equal(await sessionState(first, 0), "ok");
    assert.equal(await sessionState(again, 0), "ok");
    assert.ok(world.store.rows.every((r) => r.revoke_reason !== "replaced"));
    // the desktop app on two computers has one user agent: neither logs the other out
    setup({ limit: { max: 5, plan: "Pro" } });
    const pc1 = await signIn(userA, reqOf(UA.desktopApp));
    const pc2 = await signIn(userA, reqOf(UA.desktopApp));
    assert.equal(await sessionState(pc1, 0), "ok");
    assert.equal(await sessionState(pc2, 0), "ok");
    // an editor told only by the browser's user agent is weak too
    assert.ok(isWeakDeviceId(deviceInfoOf(reqOf(UA.chromeWin), { editor: true, editorScheme: "vscode" }).device_id));
    assert.ok(!isWeakDeviceId(deviceInfoOf(reqOf(UA.chromeWin, { "x-device-id": "browser-9" }), { editor: true, editorScheme: "vscode" }).device_id));
});

test("a user agent match is not a way past the limit for a new kind of device", async () => {
    setup({ limit: FREE });
    await signIn(userA, reqOf(UA.chromeWin, { "x-device-id": "browser-1" }));
    await signIn(userA, reqOf(UA.phoneApp, { "x-platform-app": "android" }));
    await assert.rejects(signIn(userA, reqOf(UA.desktopApp)), isDeviceLimitError);
});

test("a refused sign-in carries a 10-minute ticket that names only the account", async () => {
    setup({ limit: FREE });
    await signIn(userA, reqOf(UA.chromeWin, { "x-device-id": "browser-1" }));
    await signIn(userA, reqOf(UA.desktopApp, { "x-device-id": "desktop-1" }));
    let refused;
    await signIn(userA, reqOf(UA.firefoxLinux, { "x-device-id": "browser-2" })).catch((e) => { refused = e; });
    assert.ok(isDeviceLimitError(refused));
    const body = deviceLimitBody(refused);
    assert.equal(body.code, "DEVICE_LIMIT");
    assert.equal(body.message, "You're signed in on 2 devices, the most on Free. Log out one in Settings → Devices, or upgrade.");
    assert.ok(body.ticket);
    assert.equal(await readDeviceLimitTicket(body.ticket), "u-1");
    // never a login: no id, its own purpose
    const claims = jwt.decode(body.ticket);
    assert.equal(claims.id, undefined);
    assert.equal(claims.purpose, "device_limit");
    // a login token is not a ticket, and a ticket ends after 10 minutes
    const login = jwt.sign({ id: "u-1", sid: "x", purpose: "device_limit", uid: "u-1" }, SECRET);
    assert.equal(await readDeviceLimitTicket(login), null);
    assert.equal(await readDeviceLimitTicket("nonsense"), null);
    clock += 11 * 60 * 1000;
    assert.equal(await readDeviceLimitTicket(body.ticket), null);
});

test("the middleware's answer: 401 only for a sign-in that ended; 503 when the check couldn't be made", () => {
    assert.equal(sessionCheckAnswer("ok"), null);
    assert.deepEqual(sessionCheckAnswer("revoked"), { status: 401, body: { message: "Token invalid" } });
    const failed = sessionCheckAnswer("error");
    assert.equal(failed.status, 503);
    assert.notEqual(failed.status, 401);
});

test("a database read just before a logout never covers the logout's \"revoked\"", async () => {
    setup();
    const sid = await signIn(userA, reqOf(UA.chromeWin));
    world.redis.kv.clear(); // the kept "ok" ran out
    // The database answers "ok", and while that answer is on its way the sign-in is logged out
    const find = world.store.find;
    world.store.find = async (x) => {
        const row = await find(x);
        world.store.find = find; // (once: the logout reads the row itself)
        await revokeSid(sid);
        return row;
    };
    const state = await sessionState(sid, 0);
    world.store.find = find;
    assert.equal(state, "revoked");
    assert.equal(world.redis.kv.get(`usess:${sid}`), "revoked");
    assert.equal(await sessionState(sid, 0), "revoked");
});

test("an old token without a sid gets one row on /api/auth/me, never refused, the same row each time", async () => {
    setup({ limit: FREE });
    await signIn(userA, reqOf(UA.chromeWin, { "x-device-id": "browser-1" }));
    await signIn(userA, reqOf(UA.desktopApp, { "x-device-id": "desktop-1" }));
    const oldToken = jwt.sign({ id: "u-1", role: "user" }, SECRET);
    const req = reqOf(UA.phoneApp, { "x-platform-app": "android" });
    const t1 = jwt.decode(await adoptLegacyToken({ user: userA, req, oldToken, payload: { id: "u-1", role: "user" }, expiresIn: "365d" }));
    const t2 = jwt.decode(await adoptLegacyToken({ user: userA, req, oldToken, payload: { id: "u-1", role: "user" }, expiresIn: "365d" }));
    assert.ok(t1.sid);
    assert.equal(t1.sid, t2.sid);
    assert.equal(world.store.rows.filter((r) => !r.revoked_at).length, 3);
    assert.equal(await sessionState(t1.sid, 0), "ok");
});

test("the phone's push device is kept on its sign-in", async () => {
    setup();
    const sid = await signIn(userA, reqOf(UA.phoneApp, { "x-platform-app": "android" }));
    await attachPushToSession(sid, { token: "fcm-token-1", deviceId: "android-abc" });
    const row = world.store.rows.find((r) => r.sid === sid);
    assert.equal(row.push_token, "fcm-token-1");
    assert.equal(row.push_device_id, "android-abc");
    // the logout route gets the row back with what it needs to stop the notifications
    const ended = await revokeSid(sid);
    assert.equal(ended.push_token, "fcm-token-1");
    assert.equal(ended.push_device_id, "android-abc");
});

test("a sign-in not used for 30 days no longer counts, but stays signed in", async () => {
    setup({ limit: FREE });
    const old = await signIn(userA, reqOf(UA.chromeWin, { "x-device-id": "browser-1" }));
    clock += 10 * DAY;
    await signIn(userA, reqOf(UA.desktopApp, { "x-device-id": "desktop-1" }));
    world.store.rows.forEach((r) => { r.expires_at = new Date(clock + 365 * DAY); });
    clock += 25 * DAY; // the first one: 35 days without use
    // the phone fits: the unused browser no longer counts
    await signIn(userA, reqOf(UA.phoneApp, { "x-platform-app": "android", "x-device-id": "phone-1" }));
    // but the browser is not logged out (owner: unused only stops counting); it is still listed
    assert.equal(await sessionState(old, 0), "ok");
    assert.equal(world.store.rows.find((r) => r.sid === old).revoked_at, null);
});

test("code editor sign-ins count like the other devices", async () => {
    setup({ limit: FREE });
    const browser = reqOf(UA.chromeWin, { "x-device-id": "browser-1" });
    await signIn(userA, browser);
    await signIn(userA, browser, { editor: true, editorScheme: "vscode" });
    await assert.rejects(signIn(userA, browser, { editor: true, editorScheme: "cursor" }), isDeviceLimitError);
    // VS Code signed in again from the same computer: its own sign-in is replaced
    await signIn(userA, browser, { editor: true, editorScheme: "vscode" });
    assert.equal(world.store.rows.filter((r) => !r.revoked_at).length, 2);
});

test("no device limit: plans off, staff or unlimited (deviceLimit null)", async () => {
    setup({ limit: null });
    for (let i = 0; i < 6; i++) await signIn(userA, reqOf(UA.chromeWin, { "x-device-id": `browser-${i}` }));
    const { limit } = await listDevices(userA, null);
    assert.deepEqual(limit, { used: 6, max: null });
});

test("two sign-ins at the same moment with one place left: only one gets it", async () => {
    setup({ limit: FREE });
    await signIn(userA, reqOf(UA.chromeWin, { "x-device-id": "browser-1" }));
    const results = await Promise.allSettled([
        signIn(userA, reqOf(UA.desktopApp, { "x-device-id": "desktop-1" })),
        signIn(userA, reqOf(UA.phoneApp, { "x-platform-app": "android", "x-device-id": "phone-1" })),
    ]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(world.store.rows.filter((r) => !r.revoked_at).length, 2);
});

test("an account's added emails are one account: one device limit, not one per email", async () => {
    setup({ limit: FREE });
    // One account with its main email and three added ones (User.account_emails, utils/account-email.js)
    const account = {
        _id: "u-77", role: "user", email: "main@example.com",
        account_emails: [
            { email: "work@example.com", verified_at: new Date() },
            { email: "school@example.edu", verified_at: new Date() },
            { email: "old@example.com", verified_at: new Date() },
        ],
    };
    // A stub of the User model's findOne, as findByAnyEmail calls it
    const matches = (q) => (q.email ? account.email === q.email : account.account_emails.some((a) => a.email === q.account_emails.$elemMatch.email && a.verified_at));
    const User = { findOne: (q) => { const p = Promise.resolve(matches(q) ? account : null); p.select = () => p; return p; } };

    const byEmail = async (email, deviceId) => {
        const user = await findByAnyEmail(User, email);
        assert.equal(user._id, "u-77"); // every email signs in to the same account
        return signIn(user, reqOf(UA.chromeWin, { "x-device-id": deviceId }));
    };
    await byEmail("main@example.com", "browser-1");
    await byEmail("work@example.com", "browser-2");
    await assert.rejects(byEmail("school@example.edu", "browser-3"), isDeviceLimitError);
    await assert.rejects(byEmail("old@example.com", "browser-4"), isDeviceLimitError);
    const { limit } = await listDevices(account, null);
    assert.deepEqual(limit, { used: 2, max: 2 });
});

// ── Settings > Devices ─────────────────────────────────────────
test("the list: newest use first, this device marked, the note, ended and expired ones left out", async () => {
    setup({ limit: FREE });
    const web = await signIn(userA, reqOf(UA.chromeWin, { "x-device-id": "browser-1" }));
    clock += 1000;
    const phone = await signIn(userA, reqOf(UA.phoneApp, { "x-platform-app": "android", "x-device-id": "phone-1", "x-device-model": "Pixel 8" }));
    clock += 60 * 1000;
    world.store.rows.find((r) => r.sid === web).last_seen_at = new Date(clock);
    const other = { _id: "u-2", role: "user" };
    await signIn(other, reqOf(UA.firefoxLinux)); // someone else's: never listed

    const list = await listDevices(userA, phone);
    assert.equal(list.note, DEVICES_NOTE);
    assert.deepEqual(list.devices.map((d) => [d.kind, d.device_name, d.this_device]), [
        ["website", "Chrome on Windows", false],
        ["phone", "Classgrid phone app on Android (Pixel 8)", true],
    ]);
    assert.ok(list.devices.every((d) => d.id && d.created_at && d.last_seen_at));
    assert.ok(!("sid" in list.devices[0])); // the sid never leaves the server

    // ended
    await revokeDevice("u-1", list.devices[0].id);
    assert.deepEqual((await listDevices(userA, phone)).devices.map((d) => d.kind), ["phone"]);
    // expired
    clock += 2 * DAY;
    assert.deepEqual((await listDevices(userA, phone)).devices, []);
});

test("logging out one device ends only that one, and only the person's own", async () => {
    setup();
    const web = await signIn(userA, reqOf(UA.chromeWin));
    const desk = await signIn(userA, reqOf(UA.desktopApp));
    const deskRow = world.store.rows.find((r) => r.sid === desk);
    assert.deepEqual(await revokeDevice("u-2", deskRow._id), { found: false, row: null, rows: [] });
    const { found, row } = await revokeDevice("u-1", deskRow._id);
    assert.equal(found, true);
    assert.equal(row.kind, "desktop");
    assert.equal(await sessionState(desk, 0), "revoked");
    assert.equal(await sessionState(web, 0), "ok");
});

test("log out from all ends every sign-in of the person, and none of anyone else's", async () => {
    setup();
    const a1 = await signIn(userA, reqOf(UA.chromeWin));
    const a2 = await signIn(userA, reqOf(UA.phoneApp, { "x-platform-app": "android" }));
    const b1 = await signIn({ _id: "u-2" }, reqOf(UA.chromeWin));
    const ended = await revokeAllSessions("u-1");
    assert.equal(ended.length, 2);
    assert.equal(await sessionState(a1, 0), "revoked");
    assert.equal(await sessionState(a2, 0), "revoked");
    assert.equal(await sessionState(b1, 0), "ok");
    assert.ok(world.store.rows.filter((r) => r.user_id === "u-1").every((r) => r.revoke_reason === "logout_all"));
});

test("sign-ins from before a password change (or log out from all) are ended and not counted", async () => {
    setup({ limit: FREE });
    const before = await signIn(userA, reqOf(UA.chromeWin, { "x-device-id": "browser-1" }));
    await signIn(userA, reqOf(UA.desktopApp, { "x-device-id": "desktop-1" }));
    clock += 1000;
    const changed = { ...userA, passwordChangedAt: new Date(clock) };
    clock += 1000;
    await signIn(changed, reqOf(UA.phoneApp, { "x-platform-app": "android", "x-device-id": "phone-1" }));
    assert.equal(await sessionState(before, 0), "revoked");
    assert.equal(world.store.rows.find((r) => r.sid === before).revoke_reason, "password_changed");
    assert.deepEqual((await listDevices(changed, null)).limit, { used: 1, max: 2 });
});

// ── Second review ──────────────────────────────────────────────
const oldTokenOf = (extra = {}) => jwt.sign({ id: "u-1", role: "user", ...extra }, SECRET);
const adopt = (oldToken, req) => adoptLegacyToken({ user: userA, req, oldToken, payload: { id: "u-1", role: "user" }, expiresIn: "24h" });

test("A: two tabs adopting the same old token at once get one row, and nothing is logged out", async () => {
    setup({ limit: FREE });
    const browser = reqOf(UA.chromeWin, { "x-device-id": "browser-1" });
    const signedIn = await signIn(userA, browser); // a sign-in of this browser that already has a sid
    const oldToken = oldTokenOf();
    const [a, b] = await Promise.all([adopt(oldToken, browser), adopt(oldToken, browser)]);
    const sa = jwt.decode(a).sid;
    const sb = jwt.decode(b).sid;
    assert.equal(sa, sb);
    assert.equal(world.store.rows.filter((r) => r.legacy_key === legacyKeyOf(oldToken)).length, 1);
    // adopting never replaces the same device's sign-in
    assert.equal(await sessionState(signedIn, 0), "ok");
    assert.ok(world.store.rows.every((r) => !r.revoked_at));
});

test("B: a logged-out login token can't stand in for an email ticket", async () => {
    setup();
    const notBlocked = { accountBlocked: async () => false };
    const sid = await signIn(userA, reqOf(UA.chromeWin));
    const decoded = { id: "u-1", sid, iat: Math.floor(clock / 1000), exp: Math.floor(clock / 1000) + 3600 };
    assert.equal(await tokenStillSignedIn(decoded, "raw", notBlocked), true);
    await revokeSid(sid); // Settings > Devices: Log out
    assert.equal(await tokenStillSignedIn(decoded, "raw", notBlocked), false);
    // the account's own checks (Log out from all devices, a password change: passwordChangedAt after iat; blocked)
    const sid2 = await signIn(userA, reqOf(UA.desktopApp));
    assert.equal(await tokenStillSignedIn({ ...decoded, sid: sid2 }, "raw", { accountBlocked: async () => true }), false);
    // support's token, a provisional one, a ticket, no id: never
    for (const bad of [{ impersonatedBy: "admin" }, { impersonation: true }, { isProvisional: true }, { purpose: "device_limit" }, { id: undefined }]) {
        assert.equal(await tokenStillSignedIn({ ...decoded, sid: sid2, ...bad }, "raw", notBlocked), false);
    }
    // an old token whose adopted row was logged out
    const oldToken = oldTokenOf();
    const adopted = jwt.decode(await adopt(oldToken, reqOf(UA.chromeWin)));
    assert.equal(await tokenStillSignedIn({ id: "u-1", iat: 1 }, oldToken, notBlocked), true);
    await revokeSid(adopted.sid);
    assert.equal(await tokenStillSignedIn({ id: "u-1", iat: 1 }, oldToken, notBlocked), false);
});

test("C: support's log-in-as token is handed back as it is, never adopted", () => {
    assert.equal(renewalKind({ impersonatedBy: "admin-1", hasToken: true, hasUser: true }), "as_is");
    assert.equal(renewalKind({ sid: "s", hasToken: true, hasUser: true }), "renew");
    assert.equal(renewalKind({ hasToken: true, hasUser: true }), "adopt");
    assert.equal(renewalKind({ hasToken: true, hasUser: true, isImpersonating: true }), "plain");
    assert.equal(renewalKind({ hasToken: true, hasUser: true, isProvisional: true }), "plain");
});

test("D: ending one row of a phone keeps the push device another live row of it uses", async () => {
    setup();
    const phone = reqOf(UA.phoneApp, { "x-platform-app": "android" });
    const older = await signIn(userA, phone);
    const newer = await signIn(userA, phone);
    await attachPushToSession(older, { token: "fcm-1", deviceId: "android-1" });
    await attachPushToSession(newer, { token: "fcm-1", deviceId: "android-1" });
    const olderRow = await revokeSid(older);
    await afterSessionEnded("u-1", olderRow);
    assert.deepEqual(world.pushRemoved, []);
    const newerRow = await revokeSid(newer);
    await afterSessionEnded("u-1", newerRow);
    assert.deepEqual(world.pushRemoved, [{ userId: "u-1", token: "fcm-1", deviceId: "android-1" }]);
});

test("E: logging out an adopted row ends the old token too, and a hit moves its last used time on", async () => {
    setup();
    const oldToken = oldTokenOf();
    const req = reqOf(UA.chromeWin);
    const first = jwt.decode(await adopt(oldToken, req));
    assert.equal(await legacyTokenState(oldToken), "ok");
    // the client kept its old token and came back later: the same row, its last used time moved on
    clock += 10 * 60 * 1000;
    world.redis.kv.delete(`usess:seen:${first.sid}`);
    const again = jwt.decode(await adopt(oldToken, req));
    assert.equal(again.sid, first.sid);
    await new Promise((r) => setImmediate(r));
    assert.equal(world.store.rows.find((r) => r.sid === first.sid).last_seen_at.getTime(), clock);
    // logged out in Settings > Devices: the old token ends with it
    const row = world.store.rows.find((r) => r.sid === first.sid);
    await revokeDevice("u-1", row._id);
    assert.equal(await legacyTokenState(oldToken), "revoked");
    await assert.rejects(adopt(oldToken, req), (e) => e.code === "LEGACY_REVOKED");
    // Redis forgot: the database still says so
    world.redis.kv.clear();
    setSessionDeps({ store: world.store, redis: world.redis, secret: () => SECRET, now: () => clock, deviceLimit: async () => null, endSockets: () => {} });
    assert.equal(await legacyTokenState(oldToken), "revoked");
    // another old token is untouched
    assert.equal(await legacyTokenState(oldTokenOf({ x: 1 })), "ok");
});

test("an older sign-in is listed from its first request or socket, even if it never calls /api/auth/me", async () => {
    setup({ limit: FREE });
    const exp = Math.floor(clock / 1000) + 365 * 24 * 60 * 60;
    // the desktop app (old token, no sid) reconnects its socket; the phone app makes a request
    await noteLegacyUse({ user: userA, req: reqOf(UA.desktopApp), token: "old-desktop-token", exp });
    await noteLegacyUse({ user: userA, req: reqOf(UA.phoneApp, { "x-platform-app": "android" }), token: "old-phone-token", exp });
    // the same token again within 5 minutes adds nothing
    await noteLegacyUse({ user: userA, req: reqOf(UA.desktopApp), token: "old-desktop-token", exp });
    world.redis.kv.delete(`ulegacy:seen:${legacyKeyOf("old-desktop-token")}`);
    await noteLegacyUse({ user: userA, req: reqOf(UA.desktopApp), token: "old-desktop-token", exp });
    const { devices } = await listDevices(userA, null);
    assert.deepEqual(devices.map((x) => x.kind).sort(), ["desktop", "phone"]);
    // and /api/auth/me later gives that same row its sid, no second row
    await adoptLegacyToken({ user: userA, req: reqOf(UA.desktopApp), oldToken: "old-desktop-token", payload: { id: userA._id }, expiresIn: "7d" });
    assert.equal((await listDevices(userA, null)).devices.length, 2);
});

test("code editors are told by their user agent; a background poller with no user agent makes no row; a row made without one gets its name later", async () => {
    const VSCODE = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.146.0 Chrome/150.0.7871.250 Electron/43.8.6 Safari/537.36";
    const CGCODE = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ClassgridCode/1.143.17696 Chrome/150.0.7871.250 Electron/43.7.7 Safari/537.36";
    assert.equal(editorFromUserAgent(VSCODE), "VS Code");
    assert.equal(editorFromUserAgent(CGCODE), "Classgrid Code");
    assert.equal(editorFromUserAgent(UA.desktopApp), "", "the desktop app is not an editor");
    assert.equal(editorFromUserAgent(UA.chromeWin), "");
    setup({ limit: FREE });
    const exp = Math.floor(clock / 1000) + 365 * 24 * 60 * 60;
    await noteLegacyUse({ user: userA, req: reqOf(VSCODE), token: "old-vscode", exp });
    await noteLegacyUse({ user: userA, req: { headers: {} }, token: "old-poller", exp });
    const { devices } = await listDevices(userA, null);
    assert.deepEqual(devices.map((x) => [x.kind, x.device_name]), [["editor", "VS Code on Windows"]]);
    // a row made earlier from a request with no user agent (before the fix) is named by the app's first real request
    world.store.rows.push({ _id: "old-row", user_id: userA._id, sid: "sid-noagent", kind: "website", device_name: "Web browser", user_agent: "", device_id: "", legacy_key: legacyKeyOf("old-desktop"), created_at: new Date(clock), last_seen_at: new Date(clock), expires_at: new Date(exp * 1000), revoked_at: null });
    await adoptLegacyToken({ user: userA, req: reqOf(UA.desktopApp), oldToken: "old-desktop", payload: { id: userA._id }, expiresIn: "7d" });
    const row = world.store.rows.find((r) => r._id === "old-row");
    assert.deepEqual([row.kind, row.device_name], ["desktop", "Classgrid desktop app on Windows"]);
});

test("one device is listed and counted once, however many rows it has; Log out ends all of them", async () => {
    setup({ limit: FREE });
    const exp = Math.floor(clock / 1000) + 365 * 24 * 60 * 60;
    const phone = (sid) => ({ _id: sid, user_id: userA._id, sid, kind: "phone", device_name: "Classgrid phone app on Android", user_agent: UA.phoneApp, device_id: `ua:${sid}x`, legacy_key: "", created_at: new Date(clock), last_seen_at: new Date(clock), expires_at: new Date(exp * 1000), revoked_at: null });
    // the same phone signed in 4 times without a device id of its own (guessed ids differ only by the test's naming)
    for (const sid of ["p1", "p2", "p3", "p4"]) { const r = phone(sid); r.device_id = "ua:samephone"; world.store.rows.push(r); }
    // the same browser: its sign-in with its own id and its older cookie token's row
    const ua = UA.chromeWin;
    world.store.rows.push({ _id: "b1", user_id: userA._id, sid: "b1", kind: "website", device_name: "Chrome on Windows", user_agent: ua, device_id: "browser-1", legacy_key: "", created_at: new Date(clock), last_seen_at: new Date(clock), expires_at: new Date(exp * 1000), revoked_at: null });
    world.store.rows.push({ _id: "b2", user_id: userA._id, sid: "b2", kind: "website", device_name: "Chrome on Windows", user_agent: ua, device_id: "ua:chrome", legacy_key: legacyKeyOf("old-cookie"), created_at: new Date(clock), last_seen_at: new Date(clock), expires_at: new Date(exp * 1000), revoked_at: null });
    const list = await listDevices(userA, "b1");
    assert.equal(list.devices.length, 2);
    assert.equal(list.limit.used, 2);
    assert.equal(list.devices.find((x) => x.kind === "website").this_device, true);
    const phoneRow = list.devices.find((x) => x.kind === "phone");
    const out = await revokeDevice(userA._id, phoneRow.id);
    assert.equal(out.rows.length, 4);
    assert.equal(world.store.rows.filter((r) => r.kind === "phone" && !r.revoked_at).length, 0);
    assert.equal((await listDevices(userA, "b1")).devices.length, 1);
});

test("the server's own calls are never a device: internal tokens aren't adopted, and older rows from them are not listed", async () => {
    assert.equal(renewalKind({ sid: null, internal: true, hasUser: true, hasToken: true }), "plain");
    setup({ limit: FREE });
    const exp = Math.floor(clock / 1000) + 12 * 60 * 60;
    for (const sid of ["n1", "n2"]) {
        world.store.rows.push({ _id: sid, user_id: userA._id, sid, kind: "phone", device_name: "Classgrid phone app on Android", user_agent: "node", device_id: "ua:nodex", legacy_key: legacyKeyOf(sid), created_at: new Date(clock), last_seen_at: new Date(clock), expires_at: new Date(exp * 1000), revoked_at: null });
    }
    const { devices, limit } = await listDevices(userA, null);
    assert.equal(devices.length, 0);
    assert.equal(limit.used, 0);
});

// (owner, 2026-11-17: "it allows 10 and I am only on 4": his desktop app was refused three times with "You're signed
// in on 11 devices" while Settings > Devices said 4 of 10)
test("a new device is not refused because the devices it has are stored as many rows", async () => {
    setup({ limit: { max: 4, plan: "Max" } });
    const exp = new Date(clock + 7 * DAY);
    const row = (sid, extra) => ({ _id: sid, user_id: userA._id, sid, kind: "website", device_name: "Chrome on Windows", user_agent: UA.chromeWin, device_id: "", legacy_key: "", created_at: new Date(clock), last_seen_at: new Date(clock), expires_at: exp, revoked_at: null, ...extra });
    // one browser, three rows: its own sign-in and two older tokens given rows
    world.store.rows.push(row("c1", { device_id: "browser-1" }));
    world.store.rows.push(row("c2", { device_id: "ua:chrome", legacy_key: legacyKeyOf("cookie-1") }));
    world.store.rows.push(row("c3", { device_id: "ua:chrome", legacy_key: legacyKeyOf("cookie-2") }));
    // the phone
    world.store.rows.push(row("p1", { kind: "phone", device_name: "Classgrid phone app on Android", user_agent: UA.phoneApp, device_id: "ua:phone" }));
    // six rows the server's own calls made, and one older sign-in whose request named no app
    for (let i = 1; i <= 6; i++) world.store.rows.push(row(`n${i}`, { kind: "phone", device_name: "Classgrid phone app on Android", user_agent: "node", device_id: "ua:node", legacy_key: legacyKeyOf(`node-${i}`) }));
    world.store.rows.push(row("w1", { device_name: "Web browser", user_agent: "", legacy_key: legacyKeyOf("no-agent") }));
    assert.equal(world.store.rows.length, 11);
    assert.equal((await listDevices(userA, "c1")).limit.used, 2, "two real devices");

    clock += 60000;
    // the desktop app and a code editor sign in: devices 3 and 4 of 4. Both stay signed in.
    const desktop = await signIn(userA, reqOf(UA.desktopApp, { "x-device-id": "desktop-1" }));
    clock += 60000;
    const editor = await signIn(userA, reqOf(UA.chromeWin, { "x-device-id": "browser-1" }), { editor: true, editorScheme: "vscode" });
    assert.equal(await sessionState(desktop, 0), "ok");
    assert.equal(await sessionState(editor, 0), "ok");
    assert.equal(world.store.rows.filter((r) => r.revoke_reason === "limit").length, 0, "nothing was taken back");
    const list = await listDevices(userA, "c1");
    assert.equal(list.limit.used, 4);
    assert.deepEqual(list.devices.map((x) => x.device_name).sort(), ["Chrome on Windows", "Classgrid desktop app on Windows", "Classgrid phone app on Android", "VS Code on Windows"]);

    // the fifth device is refused, with the number of real devices in the message
    clock += 60000;
    await assert.rejects(
        signIn(userA, reqOf(UA.safariMac, { "x-device-id": "mac-1" })),
        (e) => isDeviceLimitError(e) && e.message === deviceLimitText(4, "Max"),
    );
});

test("an older sign-in whose request named no app is not a device until a request names its app", async () => {
    setup({ limit: FREE });
    const exp = new Date(clock + 7 * DAY);
    world.store.rows.push({ _id: "w1", user_id: userA._id, sid: "w1", kind: "website", device_name: "Web browser", user_agent: "", device_id: "", legacy_key: legacyKeyOf("no-agent"), created_at: new Date(clock), last_seen_at: new Date(clock), expires_at: exp, revoked_at: null });
    let list = await listDevices(userA, null);
    assert.equal(list.devices.length, 0, "no second 'Web browser' next to the person's real browser");
    assert.equal(list.limit.used, 0);
    // its next request says what it is: listed and counted from then on
    await nameSessionIfUnnamed("w1", reqOf(UA.chromeWin));
    list = await listDevices(userA, null);
    assert.deepEqual(list.devices.map((x) => x.device_name), ["Chrome on Windows"]);
    assert.equal(list.limit.used, 1);
    // Log out from all devices ends it either way
    setup({ limit: FREE });
    world.store.rows.push({ _id: "w2", user_id: userA._id, sid: "w2", kind: "website", device_name: "Web browser", user_agent: "", device_id: "", legacy_key: legacyKeyOf("no-agent-2"), created_at: new Date(clock), last_seen_at: new Date(clock), expires_at: exp, revoked_at: null });
    await revokeAllSessions(userA._id);
    assert.ok(world.store.rows.find((r) => r.sid === "w2").revoked_at);
});
