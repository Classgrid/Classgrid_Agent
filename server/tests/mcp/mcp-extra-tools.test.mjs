// MCP-only tools (projects from GitHub, chat history, docs, pages): scopes, listing, secret handling, and the
// argument checks that answer before any database or GitHub call.
// Run: node --test tests/mcp/*.test.mjs
import "./_helpers.mjs";
import { test, describe, before } from "node:test";
import assert from "node:assert/strict";

let extra, scopes, ctxMod, srv, Client, InMemoryTransport;
before(async () => {
    extra = await import("../../src/mcp/mcp-extra-tools.js");
    scopes = await import("../../src/mcp/mcp-scopes.js");
    ctxMod = await import("../../src/mcp/mcp-context.js");
    srv = await import("../../src/mcp/mcp-server.js");
    ({ Client } = await import("@modelcontextprotocol/sdk/client/index.js"));
    ({ InMemoryTransport } = await import("@modelcontextprotocol/sdk/inMemory.js"));
});

const USER = { _id: "64b000000000000000000001", email: "t@school.edu", role: "student" };
const ctxFor = (s) => ctxMod.buildMcpContext({ user: USER, tokenId: "tok1", clientId: "cli1", scopes: s });

const listed = async (s) => {
    const server = srv.buildMcpServer(ctxFor(s), {
        user: USER, tokenId: "tok1", getMcpTools: extra.getRemoteMcpTools, handleToolCall: async () => ({ content: [] }),
        checkChatAccess: async () => null, searchUsers: async () => ({ content: [] }), toolLimiter: async () => ({ allowed: true }), audit: () => {},
    });
    const [a, b] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "t", version: "1" });
    await Promise.all([server.connect(a), client.connect(b)]);
    return (await client.listTools()).tools;
};

describe("scopes", () => {
    test("chat history and skills are off until the user ticks them; reading projects and docs starts ticked", () => {
        const byScope = new Map(scopes.describeScopes(["projects:read", "chats:read", "skills:read", "docs:read", "docs:write", "pages:write"]).map((s) => [s.scope, s]));
        assert.equal(byScope.get("chats:read").defaultChecked, false);
        assert.equal(byScope.get("skills:read").defaultChecked, false);
        assert.equal(byScope.get("docs:write").defaultChecked, false);
        assert.equal(byScope.get("pages:write").defaultChecked, false);
        assert.equal(byScope.get("projects:read").defaultChecked, true);
        assert.equal(byScope.get("docs:read").defaultChecked, true);
    });
    test("v1 scopes and their tools are unchanged", () => {
        const v1 = { "profile:read": ["get_my_profile"], "schedules:read": ["list_schedules"] };
        for (const [scope, tools] of Object.entries(v1)) assert.deepEqual(scopes.MCP_SCOPES.find((s) => s.scope === scope).tools, tools);
        for (const s of ["profile:read", "schedules:read", "schedules:write", "grid:read", "grid:write", "apps:use", "offline_access"]) assert.ok(scopes.SUPPORTED_SCOPES.includes(s), s);
    });
});

describe("tools/list", () => {
    test("projects:read lists the five project tools, read-only, with the MCP version of list_project_files", async () => {
        const tools = await listed(["projects:read"]);
        assert.deepEqual(tools.map((t) => t.name).sort(), ["get_project", "list_project_files", "list_projects", "read_project_file", "search_project_code"]);
        const files = tools.find((t) => t.name === "list_project_files");
        assert.ok(files.inputSchema.required.includes("project_id"), "takes a project id, not the AI chat's open project");
        for (const t of tools) assert.deepEqual([t.annotations.readOnlyHint, t.annotations.destructiveHint], [true, false], t.name);
    });
    test("each new scope lists only its own tools", async () => {
        assert.deepEqual((await listed(["chats:read"])).map((t) => t.name).sort(), ["list_my_chats", "read_my_chat", "search_my_chats"]);
        assert.deepEqual((await listed(["skills:read"])).map((t) => t.name).sort(), ["list_skills", "read_skill"]);
        assert.deepEqual((await listed(["docs:read"])).map((t) => t.name).sort(), ["list_my_docs", "read_doc"]);
        assert.deepEqual((await listed(["docs:write"])).map((t) => t.name).sort(), ["create_doc", "doc_comments", "edit_doc"]);
        assert.deepEqual((await listed(["pages:write"])).map((t) => t.name).sort(), ["page_comments", "publish_page"]);
    });
    test("the AI chat's own tool list does not gain the MCP-only tools", async () => {
        const { getMcpTools } = await import("../../src/mcp/tools.js");
        const names = new Set(getMcpTools().map((t) => t.name));
        for (const n of ["list_projects", "get_project", "read_project_file", "search_project_code", "list_my_chats", "list_my_docs"]) assert.equal(names.has(n), false, n);
    });
});

describe("secrets", () => {
    test("secret files are recognised by name", () => {
        for (const f of [".env", "server/.env.production", "keys/id_rsa", "deploy.pem", "a/b/credentials.json", "gcp-service-account.json", "infra/terraform.tfstate"]) assert.equal(extra.isSecretFile(f), true, f);
        for (const f of ["src/env.ts", "README.md", "src/keyboard.js", "package.json"]) assert.equal(extra.isSecretFile(f), false, f);
    });
    test("dependencies, build output, Classgrid's guide folder and secrets are skipped", () => {
        for (const f of ["node_modules/x/index.js", "dist/app.js", ".classgrid/classgrid_guide/SKILL.md", "config/.env"]) assert.equal(extra.isSkippedPath(f), true, f);
        assert.equal(extra.isSkippedPath("src/index.js"), false);
    });
    test("token-like strings are masked", () => {
        const out = extra.maskSecrets("key=AKIAABCDEFGHIJKLMNOP gh=ghp_abcdefghijklmnopqrstuvwxyz0123456789 ok=hello");
        assert.doesNotMatch(out, /AKIAABCDEFGHIJKLMNOP|ghp_abcdef/);
        assert.match(out, /ok=hello/);
        const code = extra.maskSecrets("const token = '1234567890:AAFabcdefghijklmnopqrstuvwxyz012345';\nconst apiKey = \"abcd1234efgh5678\";\nconst db = 'mongodb+srv://me:pa55word@cluster0.x.net/db';\nconst name = 'hello world';");
        assert.doesNotMatch(code, /AAFabcdef|abcd1234efgh5678|pa55word/);
        assert.match(code, /const token = '\[hidden secret\]'/);
        assert.match(code, /const name = 'hello world'/);
    });
});

describe("clear errors before any database or GitHub call", () => {
    const call = (name, args) => extra.handleRemoteToolCall(name, args, ctxFor(["projects:read", "chats:read"]));
    test("a bad project id", async () => {
        const r = await call("get_project", { project_id: "nope" });
        assert.equal(r.isError, true);
        assert.match(r.content[0].text, /list_projects/);
    });
    test("a secret file or a path outside the project is refused", async () => {
        const secret = await call("read_project_file", { project_id: "64b000000000000000000009", path: "server/.env" });
        assert.equal(secret.isError, true);
        assert.match(secret.content[0].text, /secret/);
        const out = await call("read_project_file", { project_id: "64b000000000000000000009", path: "../../etc/passwd" });
        assert.equal(out.isError, true);
        assert.match(out.content[0].text, /inside the project/);
    });
    test("an empty search and a bad chat id", async () => {
        assert.equal((await call("search_project_code", { project_id: "64b000000000000000000009", query: "  " })).isError, true);
        const chat = await call("read_my_chat", { chat_id: "x'; drop" });
        assert.equal(chat.isError, true);
        assert.match(chat.content[0].text, /list_my_chats/);
    });
    test("no signed-in user", async () => {
        const r = await extra.handleRemoteToolCall("list_projects", {}, { userId: "" });
        assert.equal(r.isError, true);
    });
});

describe("Classgrid AI's own chat gets the chat-history and doc-list tools", () => {
    test("four tools in the chat's function format, with working handlers", async () => {
        assert.deepEqual(extra.APP_HISTORY_TOOLS.map((t) => t.function.name).sort(), ["list_my_chats", "list_my_docs", "read_my_chat", "search_my_chats"]);
        for (const t of extra.APP_HISTORY_TOOLS) assert.equal(t.type, "function");
        const h = extra.buildAppHistoryHandlers({ user: USER });
        assert.match(await h.read_my_chat({ chat_id: "bad id!" }), /^Error: chat_id is not valid/);
        assert.match(await h.search_my_chats({ query: "" }), /^Error:/);
        assert.match(await extra.buildAppHistoryHandlers({ user: null }).list_my_chats({}), /^Error: sign in first/);
    });
    test("every tool in the chat_history and live_docs groups exists", async () => {
        const { TOOL_GROUPS } = await import("../../src/services/ai-tool-groups.js");
        const history = TOOL_GROUPS.find((g) => g.id === "chat_history");
        assert.deepEqual(history.tools.sort(), ["list_my_chats", "read_my_chat", "search_my_chats"]);
        assert.ok(TOOL_GROUPS.find((g) => g.id === "live_docs").tools.includes("list_my_docs"));
        assert.ok(history.pattern.test("what did we discuss in my other chat"));
    });
});

describe("Grid answers and descriptions over MCP", () => {
    test("internal fields and other people's emails are dropped", () => {
        const msg = { id: "m1", thread_id: "t", sender_id: "u", senderName: "Asha", senderEmail: "asha@x.in", message: "hi", created_at: "2026-11-13", search_vector: "'hi':1", approved_by: null, deleted_for: [], is_sent_by_current_user: false, attachments: [{ file_name: "a.pdf", file_type: "pdf", file_size: 9, file_url: "https://cdn/a.pdf", r2_key: "k" }], ai_hint: "x" };
        const out = JSON.parse(extra.cleanGridResult("read_group_chat_messages", { content: [{ type: "text", text: JSON.stringify([msg]) }] }).content[0].text);
        assert.deepEqual(Object.keys(out[0]).sort(), ["attachments", "created_at", "id", "is_sent_by_current_user", "message", "senderName"]);
        assert.deepEqual(Object.keys(out[0].attachments[0]).sort(), ["file_name", "file_size", "file_type", "file_url"]);
        const group = { id: "g", name: "A2", org_id: "o", send_message_policy: "all", admin_roles: [], is_private: true, threadId: "t" };
        const g = JSON.parse(extra.cleanGridResult("list_group_chats", { content: [{ type: "text", text: JSON.stringify([group]) }] }).content[0].text);
        assert.deepEqual(Object.keys(g[0]).sort(), ["id", "is_private", "name", "threadId"]);
        const members = JSON.parse(extra.cleanGridResult("list_group_members", { content: [{ type: "text", text: JSON.stringify([{ userId: "u", name: "Asha", email: "asha@x.in", groupRole: "admin" }]) }] }).content[0].text);
        assert.equal(members[0].email, undefined);
    });
    test("errors and plain-text answers pass through unchanged", () => {
        const err = { content: [{ type: "text", text: "Error: Group thread not found." }], isError: true };
        assert.equal(extra.cleanGridResult("read_group_chat_messages", err), err);
        const text = { content: [{ type: "text", text: "not json" }] };
        assert.equal(extra.cleanGridResult("list_group_chats", text), text);
    });
    test("tool descriptions over MCP name no internal systems", () => {
        // only the tools MCP clients can see (a tool with a scope); the rest are never listed
        for (const t of extra.getRemoteMcpTools().filter((x) => scopes.requiredScopeForTool(x.name))) assert.doesNotMatch(t.description || "", /mongo|supabase|unified_db_query|\bR2\b/i, t.name);
    });
});
