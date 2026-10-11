// OAuth provider tests: redirect safety, PKCE, single-use codes, refresh rotation, hashing, audience.
// Mock-only (see _helpers.mjs). Run: node --test tests/mcp/*.test.mjs
import { RESOURCE, ISSUER, setupOAuth, quiet } from "./_helpers.mjs";
import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

let mongoose, routes, db, call;
before(async () => { ({ mongoose, routes, db, call } = await setupOAuth()); });

describe("isSafeRedirectUri", () => {
    test("accepts the known MCP client callbacks and loopback", () => {
        for (const u of [
            "https://claude.ai/api/mcp/auth_callback",
            "https://claude.com/api/mcp/auth_callback",
            "cursor://anysphere.cursor-mcp/oauth/callback",
            "https://chatgpt.com/connector_platform_oauth_redirect",
            "https://www.cursor.com/agents/mcp/oauth/callback",
            "http://localhost:8787/callback",
            "http://127.0.0.1:53111/callback",
            "http://[::1]:8787/callback",
        ]) assert.ok(routes.isSafeRedirectUri(u), u);
    });
    test("rejects script/data schemes, plain http, unknown custom schemes, fragments, junk", () => {
        for (const u of [
            "javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,x", "vbscript:x", "file:///etc/passwd",
            "http://evil.com/cb", "cursor://evil/oauth/callback", "https://x.com/cb#frag",
            "", "not a url", null, undefined, 42,
        ]) assert.ok(!routes.isSafeRedirectUri(u), String(u));
    });
    test("is fast on very long input (no regex blowup)", () => {
        const t0 = Date.now();
        routes.isSafeRedirectUri("https://" + "a.".repeat(50000) + "/cb");
        routes.isSafeRedirectUri("javascript:" + "/".repeat(100000));
        assert.ok(Date.now() - t0 < 500);
    });
    test("redirect matching ignores the port only for loopback", () => {
        assert.ok(routes.redirectUriMatches("http://localhost:1234/callback", "http://localhost:5555/callback"));
        assert.ok(!routes.redirectUriMatches("http://localhost:1234/callback", "http://127.0.0.1:1234/callback"));
        assert.ok(!routes.redirectUriMatches("https://claude.ai/cb", "https://claude.ai:444/cb"));
        assert.ok(!routes.redirectUriMatches("https://claude.ai/cb", "https://claude.ai/cb/"));
    });
});

describe("PKCE", () => {
    const v = "a".repeat(43) + "-._~";
    test("S256 verifier matches its challenge", () => {
        assert.ok(routes.verifyPkce(v, routes.pkceS256(v), "S256"));
    });
    test("wrong verifier, plain method, short verifier, missing challenge all fail", () => {
        const c = routes.pkceS256(v);
        assert.ok(!routes.verifyPkce(v + "x", c, "S256"));
        assert.ok(!routes.verifyPkce(v, c, "plain"));
        assert.ok(!routes.verifyPkce(v, v, "plain"));
        assert.ok(!routes.verifyPkce("short", routes.pkceS256("short"), "S256"));
        assert.ok(!routes.verifyPkce(v, undefined, "S256"));
        assert.ok(!routes.verifyPkce(undefined, c, "S256"));
        assert.ok(!routes.verifyPkce("a".repeat(129), routes.pkceS256("a".repeat(129)), "S256"), "over 128 chars");
    });
});

// ---------- full flow through the route handlers ----------
describe("authorization code + token endpoint", () => {
    const verifier = crypto.randomBytes(40).toString("base64url");
    let challenge, clientId, user, userId;
    const REDIRECT = "http://localhost:5555/callback";

    before(async () => {
        challenge = routes.pkceS256(verifier);
        const reg = await call("post", "/register", { body: { client_name: "Test MCP client", redirect_uris: ["http://localhost:1234/callback"], token_endpoint_auth_method: "none", grant_types: ["authorization_code", "refresh_token"], response_types: ["code"] } });
        assert.equal(reg.statusCode, 201, JSON.stringify(reg.body));
        clientId = reg.body.client_id;
        userId = new mongoose.Types.ObjectId();
        db.users[String(userId)] = { _id: userId, email: "t@school.edu", name: "T", status: "active", role: "user", passwordChangedAt: null };
        user = { _id: userId, name: "T", email: "t@school.edu" };
    });

    const newCode = async (scopes = ["profile:read", "grid:read", "offline_access"]) => {
        const auth = await call("get", "/authorize", { query: { client_id: clientId, redirect_uri: REDIRECT, response_type: "code", state: "s1", code_challenge: challenge, code_challenge_method: "S256", scope: "profile:read grid:read offline_access", resource: RESOURCE } });
        assert.equal(auth.statusCode, 302, JSON.stringify(auth.body));
        const requestId = new URL(auth.location).searchParams.get("request_id");
        const res = await call("post", "/authorize", { body: { request_id: requestId, allow: true, scopes }, user });
        const u = new URL(res.body.redirect_url);
        assert.equal(u.searchParams.get("state"), "s1");
        assert.equal(u.searchParams.get("iss"), ISSUER);
        return u.searchParams.get("code");
    };
    const exchange = (code, extra = {}) => call("post", "/token", { body: { grant_type: "authorization_code", code, redirect_uri: REDIRECT, client_id: clientId, code_verifier: verifier, resource: RESOURCE, ...extra } });
    const refresh = (rt, extra = {}) => call("post", "/token", { body: { grant_type: "refresh_token", refresh_token: rt, client_id: clientId, ...extra } });

    test("GET /authorize without PKCE goes back to the app with invalid_request", async () => {
        const res = await call("get", "/authorize", { query: { client_id: clientId, redirect_uri: REDIRECT, response_type: "code", state: "s1" } });
        const u = new URL(res.location);
        assert.equal(u.searchParams.get("error"), "invalid_request");
        assert.equal(u.searchParams.get("code"), null);
    });

    test("GET /authorize with an unregistered redirect never redirects", async () => {
        const res = await call("get", "/authorize", { query: { client_id: clientId, redirect_uri: "https://evil.com/cb", response_type: "code", code_challenge: challenge, code_challenge_method: "S256" } });
        assert.equal(res.statusCode, 400);
        assert.equal(res.location, null);
    });

    test("PKCE: wrong verifier is invalid_grant, missing verifier is invalid_request", async () => {
        const code = await newCode();
        assert.equal((await exchange(code, { code_verifier: undefined })).body.error, "invalid_request");
        assert.equal((await exchange(code, { code_verifier: "b".repeat(43) })).body.error, "invalid_grant");
    });

    test("code is single-use; replay revokes the tokens it issued", async () => {
        const code = await newCode();
        const first = await exchange(code);
        assert.equal(first.statusCode, 200, JSON.stringify(first.body));
        assert.equal(first.headers["Cache-Control"], "no-store");
        assert.equal((await routes.verifyOAuthAccessToken(first.body.access_token, { audience: RESOURCE })).ok, true);

        const replay = await quiet(() => exchange(code));
        assert.equal(replay.statusCode, 400);
        assert.equal(replay.body.error, "invalid_grant");
        assert.equal((await routes.verifyOAuthAccessToken(first.body.access_token)).ok, false, "access token revoked");
        assert.equal((await refresh(first.body.refresh_token)).body.error, "invalid_grant", "refresh token revoked");
    });

    test("expired code is refused", async () => {
        const code = await newCode();
        db.codes.find((c) => c.codeHash === routes.hashSecret(code)).expiresAt = new Date(Date.now() - 1000);
        assert.equal((await exchange(code)).body.error, "invalid_grant");
    });

    test("tokens, codes and secrets are stored only as hashes", async () => {
        const conf = await call("post", "/register", { body: { client_name: "Confidential", redirect_uris: ["https://chatgpt.com/connector_platform_oauth_redirect"] } });
        assert.ok(conf.body.client_secret);
        const code = await newCode();
        const stash = JSON.stringify(db.codes);
        const res = await exchange(code);
        const { access_token, refresh_token } = res.body;
        const everything = JSON.stringify(db.clients) + JSON.stringify(db.tokens) + JSON.stringify(db.codes) + JSON.stringify(db.used) + JSON.stringify(db.requests) + stash;
        for (const raw of [access_token, refresh_token, code, conf.body.client_secret]) {
            assert.ok(raw && raw.length >= 20);
            assert.equal(everything.includes(raw), false, "raw value found in the store");
        }
        const row = db.tokens.find((t) => t.accessTokenHash === routes.hashSecret(access_token));
        assert.ok(row, "found by hash");
        assert.equal(row.refreshTokenHash, routes.hashSecret(refresh_token));
        assert.equal(row.accessToken, undefined);
        assert.equal(row.refreshToken, undefined);
        assert.equal(db.clients.find((c) => c.clientId === conf.body.client_id).clientSecretHash, routes.hashSecret(conf.body.client_secret));
    });

    test("audience: token for our resource passes, other audience is rejected", async () => {
        const res = await exchange(await newCode());
        const ok = await routes.verifyOAuthAccessToken(res.body.access_token, { audience: RESOURCE });
        assert.equal(ok.ok, true);
        assert.deepEqual(ok.scopes, ["profile:read", "grid:read", "offline_access"]);
        const bad = await routes.verifyOAuthAccessToken(res.body.access_token, { audience: "https://other.example/mcp" });
        assert.equal(bad.ok, false);
        assert.equal(bad.status, 401);
        assert.equal((await exchange(await newCode(), { resource: "https://evil.com/mcp" })).body.error, "invalid_target");
    });

    test("expired access token and suspended user are rejected; Bearer parsing is strict", async () => {
        const res = await exchange(await newCode());
        const row = db.tokens.find((t) => t.accessTokenHash === routes.hashSecret(res.body.access_token));
        const realExpiry = row.accessTokenExpiresAt;
        row.accessTokenExpiresAt = new Date(Date.now() - 1000);
        assert.equal((await routes.verifyOAuthAccessToken(res.body.access_token, { audience: RESOURCE })).ok, false);
        row.accessTokenExpiresAt = realExpiry;
        db.users[String(userId)].status = "suspended";
        const blocked = await routes.verifyOAuthAccessToken(res.body.access_token, { audience: RESOURCE });
        db.users[String(userId)].status = "active";
        assert.equal(blocked.ok, false);
        assert.equal(blocked.status, 403);
        assert.equal(routes.extractBearerToken("bearer abc"), "abc");
        assert.equal(routes.extractBearerToken("Basic abc"), null);
        assert.equal(routes.extractBearerToken("Bearer a b"), null);
        assert.equal(routes.extractBearerToken("Bearer " + "x".repeat(513)), null);
    });

    test("refresh rotates: new pair issued, old access token dead, same family", async () => {
        const t1 = (await exchange(await newCode())).body;
        const r = await refresh(t1.refresh_token);
        assert.equal(r.statusCode, 200, JSON.stringify(r.body));
        assert.notEqual(r.body.refresh_token, t1.refresh_token);
        assert.notEqual(r.body.access_token, t1.access_token);
        assert.equal((await routes.verifyOAuthAccessToken(t1.access_token)).ok, false);
        assert.equal((await routes.verifyOAuthAccessToken(r.body.access_token, { audience: RESOURCE })).ok, true);
        const oldRow = db.tokens.find((t) => t.refreshTokenHash === routes.hashSecret(t1.refresh_token));
        const newRow = db.tokens.find((t) => t.refreshTokenHash === routes.hashSecret(r.body.refresh_token));
        assert.ok(oldRow.rotatedAt);
        assert.equal(String(newRow.familyId), String(oldRow.familyId));
    });

    test("refresh reuse is detected and revokes the whole family", async () => {
        const t1 = (await exchange(await newCode())).body;
        const r2 = (await refresh(t1.refresh_token)).body;
        const r3 = (await refresh(r2.refresh_token)).body;
        assert.ok(r3.access_token);
        const reuse = await quiet(() => refresh(t1.refresh_token));
        assert.equal(reuse.body.error, "invalid_grant");
        assert.equal((await routes.verifyOAuthAccessToken(r3.access_token)).ok, false, "newest access token revoked");
        assert.equal((await refresh(r3.refresh_token)).body.error, "invalid_grant", "newest refresh token revoked");
    });

    test("refresh cannot widen scope", async () => {
        const t1 = (await exchange(await newCode())).body;
        assert.equal((await refresh(t1.refresh_token, { scope: "profile:read grid:write" })).body.error, "invalid_scope");
    });

    test("no offline_access granted = no refresh token", async () => {
        const res = await exchange(await newCode(["profile:read", "grid:read"]));
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.refresh_token, undefined);
    });
});
