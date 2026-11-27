// Someone removes Classgrid from their Zoom account (services/zoom-deauth.js; owner 2026-11-27): Zoom's
// "app_deauthorized" event deletes what Classgrid keeps from that Zoom account. Checked here:
//   - Zoom's signature: the right one is taken, a wrong, missing or changed one is refused
//   - Zoom's endpoint check is answered with the HMAC of its plain token
//   - only "app_deauthorized" with a Zoom user id is acted on
//   - the matching accounts lose the built-in Zoom plugin's tokens and profile; their Zoom (MCP) connection is signed
//     out; other accounts and other MCP connections are left alone
// The database is a stand-in in memory: nothing real is read or written.
// Run: node --test tests/zoom-deauth.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
    deauthTarget, forgetZoomAccount, isSignedByZoom, isZoomMcpUrl, urlValidationAnswer, zoomSignature, ZOOM_CLEARED,
} from "../src/services/zoom-deauth.js";

const SECRET = "a-secret-only-this-test-knows";

test("Zoom's signature is checked", () => {
    const body = JSON.stringify({ event: "app_deauthorized", payload: { user_id: "z1" } });
    const signature = zoomSignature("1700000000", body, SECRET);
    assert.equal(isSignedByZoom({ signature, timestamp: "1700000000", body, secret: SECRET }), true);
    assert.equal(isSignedByZoom({ signature, timestamp: "1700000001", body, secret: SECRET }), false);
    assert.equal(isSignedByZoom({ signature, timestamp: "1700000000", body: body + " ", secret: SECRET }), false);
    assert.equal(isSignedByZoom({ signature: "v0=bad", timestamp: "1700000000", body, secret: SECRET }), false);
    assert.equal(isSignedByZoom({ signature, timestamp: "1700000000", body, secret: "" }), false);
    assert.equal(isSignedByZoom({ signature: undefined, timestamp: "1700000000", body, secret: SECRET }), false);
});

test("Zoom's endpoint check is answered", () => {
    const answer = urlValidationAnswer({ event: "endpoint.url_validation", payload: { plainToken: "abc" } }, SECRET);
    assert.deepEqual(answer, { plainToken: "abc", encryptedToken: crypto.createHmac("sha256", SECRET).update("abc").digest("hex") });
    assert.equal(urlValidationAnswer({ event: "app_deauthorized" }, SECRET), null);
    assert.equal(urlValidationAnswer({ event: "endpoint.url_validation", payload: {} }, SECRET), null);
});

test("only a removal with a Zoom user id is acted on", () => {
    assert.deepEqual(deauthTarget({ event: "app_deauthorized", payload: { user_id: "z1", account_id: "a1" } }), { zoomUserId: "z1", accountId: "a1" });
    assert.deepEqual(deauthTarget({ event: "app_deauthorized", payload: { object: { user_id: "z2" } } }), { zoomUserId: "z2", accountId: null });
    assert.equal(deauthTarget({ event: "app_deauthorized", payload: {} }), null);
    assert.equal(deauthTarget({ event: "meeting.started", payload: { user_id: "z1" } }), null);
});

test("Zoom (MCP) addresses are known", () => {
    assert.equal(isZoomMcpUrl("https://mcp.zoom.us/mcp/zoom/streamable"), true);
    assert.equal(isZoomMcpUrl("https://mcp-au.zoom.us/mcp/zoom/streamable"), true);
    assert.equal(isZoomMcpUrl("https://mcp.canva.com/mcp"), false);
    assert.equal(isZoomMcpUrl("https://mcp.zoom.us.evil.com/x"), false);
});

// ── A stand-in database ──
const stores = () => {
    const users = [
        { _id: "u1", zoom_user_id: "z1", zoom_access_token: "t1", zoom_refresh_token: "r1", zoom_token_expiry: new Date(), zoom_email: "a@x", zoom_name: "A" },
        { _id: "u2", zoom_user_id: "z2", zoom_access_token: "t2", zoom_refresh_token: "r2" },
    ];
    const servers = [
        { _id: "s1", userId: "u1", url: "https://mcp.zoom.us/mcp/zoom/streamable", oauthTokensEnc: "enc", status: "connected", tools: [{ name: "x" }] },
        { _id: "s2", userId: "u1", url: "https://mcp.canva.com/mcp", oauthTokensEnc: "enc", status: "connected", tools: [{ name: "y" }] },
        { _id: "s3", userId: "u2", url: "https://mcp.zoom.us/mcp/zoom/streamable", oauthTokensEnc: "enc", status: "connected", tools: [] },
    ];
    const match = (row, q) => Object.entries(q).every(([k, v]) => (v && typeof v === "object" && "$in" in v ? v.$in.includes(row[k]) : row[k] === v));
    const model = (rows) => ({
        find: (q) => ({ select: () => ({ lean: async () => rows.filter((r) => match(r, q)).map((r) => ({ ...r })) }) }),
        updateMany: async (q, { $set }) => { for (const r of rows) if (match(r, q)) Object.assign(r, $set); },
    });
    return { users, servers, User: model(users), CustomMcpServer: model(servers) };
};

test("the removed Zoom account's data is deleted, and nothing else", async () => {
    const s = stores();
    const cleared = await forgetZoomAccount({ zoomUserId: "z1" }, s);
    assert.equal(cleared, 1);
    for (const k of Object.keys(ZOOM_CLEARED)) assert.equal(s.users[0][k], null, k);
    assert.equal(s.users[1].zoom_access_token, "t2");
    assert.equal(s.servers[0].oauthTokensEnc, null);
    assert.equal(s.servers[0].status, "needs_login");
    assert.deepEqual(s.servers[0].tools, []);
    assert.equal(s.servers[1].oauthTokensEnc, "enc");
    assert.equal(s.servers[2].oauthTokensEnc, "enc");
});

test("an unknown Zoom account changes nothing", async () => {
    const s = stores();
    assert.equal(await forgetZoomAccount({ zoomUserId: "nobody" }, s), 0);
    assert.equal(await forgetZoomAccount({ zoomUserId: "" }, s), 0);
    assert.equal(s.users[0].zoom_access_token, "t1");
});
