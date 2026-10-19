/*
 * ─────────────────────────────────────────────────────────
 * 🚨 ERP SHUT DOWN 🚨
 * The Classgrid ERP is shut down and will never work or be worked on again.
 * The org admin dashboard and every dashboard other than chat.classgrid.in and the
 * super admin dashboard are banned, and so is all ERP backend code.
 * Any issue or bug in the ERP or the org admin dashboard is banned too: do not look
 * for it, report it or fix it.
 * Do not build, fix, test or talk about ERP features. Only chat.classgrid.in and the
 * super admin dashboard are live.
 * ─────────────────────────────────────────────────────────
 */
// Remote MCP server tests: scope-filtered tools/list, denylist, identity scrubbing, kill switch, 401/403.
// Mock-only: the SDK InMemoryTransport for MCP traffic, fake req/res for the Express router.
// Run: node --test tests/mcp/*.test.mjs
import { RESOURCE, META_URL } from "./_helpers.mjs";
import { test, describe, before } from "node:test";
import assert from "node:assert/strict";

let allow, ctxMod, srv, tools, Client, InMemoryTransport, oauth, REAL_TOOLS, REAL_NAMES;
before(async () => {
    allow = await import("../../src/mcp/mcp-allowlist.js");
    ctxMod = await import("../../src/mcp/mcp-context.js");
    srv = await import("../../src/mcp/mcp-server.js");
    tools = await import("../../src/mcp/tools.js");
    oauth = await import("../../src/routes/oauth.provider.routes.js");
    ({ Client } = await import("@modelcontextprotocol/sdk/client/index.js"));
    ({ InMemoryTransport } = await import("@modelcontextprotocol/sdk/inMemory.js"));
    REAL_TOOLS = tools.getMcpTools();
    REAL_NAMES = REAL_TOOLS.map((t) => t.name);
});

const ALL_SCOPES = ["profile:read", "schedules:read", "schedules:write", "grid:read", "grid:write", "apps:use", "offline_access"];
const DENIED = ["execute_terminal_command", "ubuntu", "unified_db_query", "read_server_logs", "read_local_file", "read_sandbox_file", "run_code", "manage_rag_document", "supabase_connector", "vercel_connector", "sanity_connector", "aws_ses_connector", "whatsapp_business_connector", "facebook_connector", "instagram_connector", "send_whatsapp_message", "generate_image", "edit_image", "transcribe_audio", "update_ai_preferences", "create_skill", "update_skill", "delete_skill", "list_organizations", "list_global_users", "list_support_tickets", "list_blog_subscribers", "get_student_count"];
const USER = { _id: "64b000000000000000000001", email: "t@school.edu", role: "super_admin", organization_id: "64b0000000000000000000aa", notion_access_token: "x" };
// Every app connected, so apps:use would list every connector
const ALL_APPS_USER = { ...USER, google_refresh_token: 1, microsoft_access_token: 1, zoom_refresh_token: 1, slack_access_token: 1, github_access_token: 1, supabase_access_token: 1, vercel_access_token: 1, metadata: { connected_google_services: ["youtube"] } };

const allowAll = async () => ({ allowed: true, retryAfterSec: 1 });
const connect = async (user, scopes) => {
    const calls = [];
    const ctx = ctxMod.buildMcpContext({ user, tokenId: "tok1", clientId: "cli1", scopes });
    const server = srv.buildMcpServer(ctx, {
        user, tokenId: "tok1", getMcpTools: () => REAL_TOOLS,
        handleToolCall: async (name, args, c) => { calls.push({ name, args, c }); return { content: [{ type: "text", text: "ok" }] }; },
        checkChatAccess: async () => null, // membership is covered elsewhere; here every chat is "allowed"
        searchUsers: async () => ({ content: [{ type: "text", text: "[]" }] }),
        toolLimiter: allowAll,
        audit: () => {},
    });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await server.connect(a);
    const client = new Client({ name: "test", version: "1" });
    await client.connect(b);
    return { client, calls };
};
const listNames = async (user, scopes) => (await (await connect(user, scopes)).client.listTools()).tools.map((t) => t.name);

describe("allowlist", () => {
    test("real allowlist has no problems against the real tools.js names", () => {
        assert.deepEqual(allow.findAllowlistProblems(REAL_NAMES), []);
    });
    test("a denied tool placed in the allowlist throws", () => {
        const poisoned = [{ scope: "grid:read", tools: ["list_grids", "execute_terminal_command"] }];
        assert.throws(() => allow.assertAllowlistSafe(null, poisoned), /execute_terminal_command \(grid:read\) is on the MCP denylist/);
        // staff-only group tools count as denied too
        assert.throws(() => allow.assertAllowlistSafe(null, [{ scope: "grid:read", tools: ["list_support_tickets"] }]), /denylist/);
    });
    test("a tool under two scopes, or missing from tools.js, throws", () => {
        assert.throws(() => allow.assertAllowlistSafe(null, [{ scope: "grid:read", tools: ["list_grids"] }, { scope: "grid:write", tools: ["list_grids"] }]), /more than one scope/);
        assert.throws(() => allow.assertAllowlistSafe(REAL_NAMES.filter((n) => n !== "list_schedules")), /not a known tool/);
    });
    test("the router refuses to build when the allowlist names a missing tool", () => {
        assert.throws(() => makeRouter({ getMcpTools: () => REAL_TOOLS.filter((t) => t.name !== "get_my_profile") }), /Unsafe MCP tool allowlist/);
    });
    test("denied and unknown tools map to no scope", () => {
        for (const t of [...DENIED, "brand_new_tool"]) assert.equal(allow.scopeForMcpTool(t), null, t);
    });
});

describe("tools/list (InMemoryTransport)", () => {
    test("is filtered by the token's scopes", async () => {
        assert.deepEqual((await listNames(USER, ["profile:read", "schedules:read", "offline_access"])).sort(), ["get_my_profile", "list_schedules"]);
        const grid = await listNames(USER, ["grid:read"]);
        assert.ok(grid.includes("list_grids"));
        assert.ok(!grid.includes("send_chat_message"), "grid:write tool hidden");
        assert.ok(!grid.includes("list_schedules"));
        assert.deepEqual(await listNames(USER, ["offline_access"]), []);
    });
    test("apps:use lists only connectors the user connected", async () => {
        assert.deepEqual(await listNames(USER, ["apps:use"]), ["notion_connector"]);
    });
    test("denied tools are never listed, even with every scope and every app connected", async () => {
        const names = await listNames(ALL_APPS_USER, ALL_SCOPES);
        for (const d of DENIED) assert.equal(names.includes(d), false, d);
        for (const n of names) assert.notEqual(allow.scopeForMcpTool(n), null, n);
        assert.ok(names.includes("create_schedule") && names.includes("send_chat_message") && names.includes("google_workspace_connector"));
    });
    test("calling a denied, unknown or out-of-scope tool fails and never runs it", async () => {
        const { client, calls } = await connect(USER, ["grid:read"]);
        for (const name of ["execute_terminal_command", "unified_db_query", "nope", "create_schedule", "send_chat_message"]) {
            await assert.rejects(client.callTool({ name, arguments: {} }), /Tool not available/, name);
        }
        assert.equal(calls.length, 0);
    });
});

describe("identity args", () => {
    test("sanitizeArgs drops identity/path fields and forces the sender", () => {
        const ctx = ctxMod.buildMcpContext({ user: USER, tokenId: "tok1", clientId: "cli1", scopes: ["grid:write"] });
        const body = JSON.parse('{"threadId":"t1","content":"hi","senderUserId":"evil","userId":"evil","userEmail":"a@b","orgId":"o","org_id":"o","filePath":"/etc/passwd","collectionName":"users","isStaff":true,"__proto__":{"polluted":1}}');
        const { args } = ctxMod.sanitizeArgs("send_chat_message", body, ctx);
        assert.deepEqual(Object.keys(args).sort(), ["content", "senderUserId", "threadId"]);
        assert.equal(args.senderUserId, USER._id);
        assert.equal({}.polluted, undefined);
        assert.equal(ctx.isStaff, false);
    });
    test("sanitizeArgs refuses MongoDB operator objects and non-string ids", () => {
        const ctx = ctxMod.buildMcpContext({ user: USER, tokenId: "tok1", clientId: "cli1", scopes: ["schedules:write"] });
        assert.ok(ctxMod.sanitizeArgs("delete_schedule", { schedule_id: { $ne: "x" } }, ctx).error);
        assert.ok(ctxMod.sanitizeArgs("delete_schedule", { schedule_id: ["a"] }, ctx).error);
        assert.ok(ctxMod.sanitizeArgs("list_schedules", { status: { $regex: "." } }, ctx).error);
        assert.ok(ctxMod.sanitizeArgs("create_schedule", { meta: { deep: [{ $where: "1" }] } }, ctx).error);
        let deep = "x";
        for (let i = 0; i < 50; i++) deep = { a: deep };
        assert.ok(ctxMod.sanitizeArgs("create_schedule", { meta: deep }, ctx).error);
        const ok = ctxMod.sanitizeArgs("delete_schedule", { schedule_id: "64b000000000000000000009" }, ctx);
        assert.equal(ok.error, undefined);
        assert.equal(ok.args.schedule_id, "64b000000000000000000009");
    });
    test("upload_drive_file (server-side fetch of any https link) is blocked and its args hidden", () => {
        const ctx = ctxMod.buildMcpContext({ user: USER, tokenId: "tok1", clientId: "cli1", scopes: ["apps:use"] });
        assert.ok(ctxMod.sanitizeArgs("google_workspace_connector", { operation: "upload_drive_file", fileUrl: "https://10.0.0.1/x" }, ctx).error);
        const listed = ctxMod.toolForListing(REAL_TOOLS.find((t) => t.name === "google_workspace_connector"));
        assert.ok(!listed.inputSchema.properties.operation.enum.includes("upload_drive_file"));
        assert.equal(listed.inputSchema.properties.fileUrl, undefined);
    });
    test("delete_schedule deletes only the caller's own document, never by the raw argument", async () => {
        const src = (await import("node:fs")).readFileSync(new URL("../../src/mcp/tools.js", import.meta.url), "utf8");
        const block = src.slice(src.indexOf("if (name === 'delete_schedule')"), src.indexOf("SUPPORT TICKET & CLASSGRID TALK HANDLERS"));
        assert.match(block, /deleteOne\(\{ _id: schedule\._id, user_email: finalUserEmail \}\)/);
        assert.doesNotMatch(block, /deleteOne\(\{ _id: args\.schedule_id/);
    });
    test("a tool call over MCP reaches the handler with scrubbed args and the token user's context", async () => {
        const { client, calls } = await connect(USER, ["grid:write"]);
        await client.callTool({ name: "send_chat_message", arguments: { threadId: "dm1", content: "hi", senderUserId: "64b0000000000000000000ff", userEmail: "boss@classgrid.in", orgId: "x" } });
        assert.equal(calls.length, 1);
        assert.equal(calls[0].args.senderUserId, USER._id);
        assert.equal("userEmail" in calls[0].args, false);
        assert.equal("orgId" in calls[0].args, false);
        assert.equal(calls[0].c.userEmail, USER.email);
        assert.equal(calls[0].c.userId, USER._id);
        assert.equal(calls[0].c.isStaff, false);
    });
});

// ---------- HTTP router with fake req/res (no port) ----------
const TOKENS = {
    good: { ok: true, user: USER, clientId: "cli1", tokenId: "tok1", scopes: ["profile:read", "schedules:read"], audience: RESOURCE },
    otheraud: { ok: true, user: USER, clientId: "cli1", tokenId: "tok3", scopes: ["schedules:read"], audience: "https://evil.example/mcp" },
};
let enabled = true;
const verifyCalls = [];
const makeRouter = (over = {}) => srv.createRemoteMcpRouter({
    getMcpTools: () => REAL_TOOLS,
    handleToolCall: async () => ({ content: [] }),
    verifyToken: async (raw, opts) => { verifyCalls.push({ raw, opts }); return TOKENS[raw] || { ok: false, status: 401, error: "invalid_token", description: "Access token is invalid" }; },
    extractBearerToken: oauth.extractBearerToken,
    getResourceUrl: () => RESOURCE,
    getSb: () => { throw new Error("no Supabase in tests"); },
    getUserModel: async () => { throw new Error("no MongoDB in tests"); },
    isEnabled: () => enabled,
    ipLimiter: (req, res, next) => next(),
    limiter: allowAll,
    audit: () => {},
    createTransport: () => ({
        async handleRequest(req, res, parsed) { res.status(200).json({ jsonrpc: "2.0", id: parsed.id, result: {} }); },
        async close() {}, async start() {}, async send() {},
        set onclose(f) {}, set onerror(f) {}, set onmessage(f) {},
    }),
    ...over,
});
const mkRes = () => {
    const res = { statusCode: 200, headers: {}, body: undefined, headersSent: false };
    res.status = (c) => { res.statusCode = c; return res; };
    res.set = (k, v) => { res.headers[String(k).toLowerCase()] = v; return res; };
    res.setHeader = res.set;
    res.getHeader = (k) => res.headers[String(k).toLowerCase()];
    res.json = (b) => { res.body = b; res.headersSent = true; res.done?.(); return res; };
    res.on = () => res;
    return res;
};
const send = (router, { method = "POST", url = "/", headers = {}, body } = {}) => new Promise((resolve) => {
    // _body: true tells express.json() the body is already parsed
    const req = { method, url, originalUrl: url, headers, body, _body: body !== undefined, ip: "203.0.113.9", query: {} };
    const res = mkRes();
    res.done = () => resolve(res);
    router.handle(req, res, (err) => { res.statusCode = err ? 500 : 404; resolve(res); });
});
const LIST = { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} };

describe("POST /mcp router", () => {
    test("MCP_ENABLED off (the default) => 404 before any token check", async () => {
        assert.equal(srv.isMcpEnabled(), false, "env from _helpers.mjs");
        process.env.MCP_ENABLED = "true";
        assert.equal(srv.isMcpEnabled(), true);
        process.env.MCP_ENABLED = "false";
        const router = makeRouter({ isEnabled: srv.isMcpEnabled });
        const before = verifyCalls.length;
        const res = await send(router, { headers: { authorization: "Bearer good" }, body: LIST });
        assert.equal(res.statusCode, 404);
        assert.equal(verifyCalls.length, before);
    });
    test("missing token => 401 with WWW-Authenticate resource_metadata", async () => {
        const res = await send(makeRouter(), { body: LIST });
        assert.equal(res.statusCode, 401);
        assert.equal(res.headers["www-authenticate"], `Bearer resource_metadata="${META_URL}"`);
    });
    test("token in the query string is ignored (401)", async () => {
        assert.equal((await send(makeRouter(), { url: "/?access_token=good", body: LIST })).statusCode, 401);
    });
    test("invalid token => 401 invalid_token with resource_metadata", async () => {
        const res = await send(makeRouter(), { headers: { authorization: "Bearer nope" }, body: LIST });
        assert.equal(res.statusCode, 401);
        assert.match(res.headers["www-authenticate"], /error="invalid_token"/);
        assert.ok(res.headers["www-authenticate"].includes(`resource_metadata="${META_URL}"`));
    });
    test("token for another audience => 401, and verify is asked for our audience", async () => {
        const res = await send(makeRouter(), { headers: { authorization: "Bearer otheraud" }, body: LIST });
        assert.equal(res.statusCode, 401);
        assert.deepEqual(verifyCalls.at(-1).opts, { audience: RESOURCE });
    });
    test("allowlisted tool without its scope => 403 insufficient_scope", async () => {
        const res = await send(makeRouter(), { headers: { authorization: "Bearer good" }, body: { jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "create_schedule", arguments: {} } } });
        assert.equal(res.statusCode, 403);
        assert.match(res.headers["www-authenticate"], /error="insufficient_scope"/);
        assert.match(res.headers["www-authenticate"], /scope="profile:read schedules:read schedules:write"/);
        assert.ok(res.headers["www-authenticate"].includes(`resource_metadata="${META_URL}"`));
        assert.equal(res.body.id, 5);
    });
    test("insufficient scope is caught inside a JSON-RPC batch too", async () => {
        const res = await send(makeRouter(), { headers: { authorization: "Bearer good" }, body: [LIST, { jsonrpc: "2.0", id: 7, method: "tools/call", params: { name: "send_chat_message" } }] });
        assert.equal(res.statusCode, 403);
    });
    test("valid token reaches the transport", async () => {
        const res = await send(makeRouter(), { headers: { authorization: "Bearer good" }, body: LIST });
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.id, 1);
    });
    test("GET => 405", async () => {
        const res = await send(makeRouter(), { method: "GET", headers: { authorization: "Bearer good" } });
        assert.equal(res.statusCode, 405);
    });
    test("real loader (real modules, no overrides but the IP limiter) is off by default", async () => {
        const legacy = await import("../../src/mcp/index.js");
        const r = await legacy.loadRemoteMcpRouter({ ipLimiter: (req, res, next) => next() });
        assert.equal((await send(r, { body: LIST })).statusCode, 404);
    });
});
