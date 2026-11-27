// The Zoom app's two keys (services/zoom-oauth.js; owner 2026-11-27, for the Zoom Marketplace review). Checked here:
//   - which keys are set, Production first; which key "Connect" starts with
//   - a sign-in code is traded with the key that started it, whichever that is; the key is remembered
//   - a refresh tries the key the tokens came from first
//   - an install id is random and checked before use
// Zoom is a stand-in: nothing real is called. Run: node --test tests/zoom-oauth.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
    applyZoomTokens, connectClient, exchangeZoomCode, isInstallId, newInstallId, refreshZoomToken, zoomClients,
} from "../src/services/zoom-oauth.js";

const BOTH = { ZOOM_CLIENT_ID: "dev-id", ZOOM_CLIENT_SECRET: "dev-secret", ZOOM_PROD_CLIENT_ID: "prod-id", ZOOM_PROD_CLIENT_SECRET: "prod-secret" };

// A stand-in for Zoom's token endpoint: only `goodId` is accepted; every call's key is recorded
const fakeZoom = (goodId, calls) => async (_url, opts) => {
    const id = Buffer.from(opts.headers.Authorization.replace("Basic ", ""), "base64").toString().split(":")[0];
    calls.push({ id, grant: opts.body.get("grant_type") });
    return { json: async () => (id === goodId ? { access_token: `at-${id}`, refresh_token: `rt-${id}`, expires_in: 3600 } : { error: "invalid_client", reason: "Invalid client_id or client_secret" }) };
};

test("the keys that are set, Production first", () => {
    assert.deepEqual(zoomClients(BOTH).map((c) => c.kind), ["production", "development"]);
    assert.deepEqual(zoomClients({ ZOOM_CLIENT_ID: "a", ZOOM_CLIENT_SECRET: "b" }).map((c) => c.kind), ["development"]);
    assert.deepEqual(zoomClients({ ZOOM_PROD_CLIENT_ID: "a" }), []);
});

test("Connect starts with Development until ZOOM_CONNECT_KEY=production", () => {
    assert.equal(connectClient(BOTH).kind, "development");
    assert.equal(connectClient({ ...BOTH, ZOOM_CONNECT_KEY: "production" }).kind, "production");
    assert.equal(connectClient({ ZOOM_CLIENT_ID: "a", ZOOM_CLIENT_SECRET: "b", ZOOM_CONNECT_KEY: "production" }).kind, "development");
    assert.equal(connectClient({}), null);
});

test("a code from the Production key (a Marketplace install) is traded with it", async () => {
    const calls = [];
    const { tokens, kind } = await exchangeZoomCode("c", "https://x/cb", { env: BOTH, fetchImpl: fakeZoom("prod-id", calls) });
    assert.equal(kind, "production");
    assert.equal(tokens.access_token, "at-prod-id");
    assert.deepEqual(calls.map((c) => c.id), ["prod-id"]);
});

test("a code from the Development key is traded with it after Production refuses", async () => {
    const calls = [];
    const { kind } = await exchangeZoomCode("c", "https://x/cb", { env: BOTH, fetchImpl: fakeZoom("dev-id", calls) });
    assert.equal(kind, "development");
    assert.deepEqual(calls.map((c) => c.id), ["prod-id", "dev-id"]);
});

test("the preferred key is tried first", async () => {
    const calls = [];
    await exchangeZoomCode("c", "https://x/cb", { env: BOTH, prefer: "development", fetchImpl: fakeZoom("dev-id", calls) });
    assert.deepEqual(calls.map((c) => c.id), ["dev-id"]);
});

test("a code no key accepts fails with both answers", async () => {
    await assert.rejects(exchangeZoomCode("c", "https://x/cb", { env: BOTH, fetchImpl: fakeZoom("nobody", []) }), /production: invalid_client.*development: invalid_client/);
    await assert.rejects(exchangeZoomCode("c", "https://x/cb", { env: {}, fetchImpl: fakeZoom("x", []) }), /no Zoom key/);
});

test("a refresh uses the key the tokens came from first", async () => {
    const calls = [];
    const { kind } = await refreshZoomToken("rt", { env: BOTH, prefer: "development", fetchImpl: fakeZoom("dev-id", calls) });
    assert.equal(kind, "development");
    assert.deepEqual(calls, [{ id: "dev-id", grant: "refresh_token" }]);
    await assert.rejects(refreshZoomToken("rt", { env: BOTH, fetchImpl: fakeZoom("nobody", []) }), /expired/);
});

test("tokens and their key go on the user", () => {
    const user = { zoom_refresh_token: "old" };
    applyZoomTokens(user, { access_token: "a", expires_in: 60 }, "production");
    assert.equal(user.zoom_access_token, "a");
    assert.equal(user.zoom_refresh_token, "old");
    assert.equal(user.zoom_client_kind, "production");
    assert.ok(user.zoom_token_expiry > new Date());
});

test("install ids are random and checked", () => {
    const a = newInstallId();
    assert.notEqual(a, newInstallId());
    assert.equal(isInstallId(a), true);
    assert.equal(isInstallId("short"), false);
    assert.equal(isInstallId("x".repeat(30) + "/.."), false);
    assert.equal(isInstallId(undefined), false);
});
