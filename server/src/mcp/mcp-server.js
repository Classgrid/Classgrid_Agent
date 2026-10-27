/*
 * ─────────────────────────────────────────────────────────
 * 🚫 NO BLOCKS RULE (owner's order, 2026-10-23) 🚫
 * Claude and every AI model are FORBIDDEN to add any kind of block, restriction, allowlist or
 * "only for X" rule (owner-only, super-admin-only, email checks, test-number-only, role checks)
 * unless the owner explicitly asks for that exact limit.
 * Every feature is for ALL users. Project Mode is for all users, never super-admin only.
 * ─────────────────────────────────────────────────────────
 */
/*
 * ─────────────────────────────────────────────────────────
 * 🚫 NO DISK BLAME RULE (owner's order, 2026-10-27) 🚫
 * Claude and every AI model are FORBIDDEN to say an error comes from a full disk or low disk space.
 * The owner's disks are not full. Never guess the cause of an error: read the real logs and code first,
 * and only name a cause that was actually seen.
 * ─────────────────────────────────────────────────────────
 */
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
// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
/*
 * Remote MCP server for Claude, Cursor and ChatGPT: POST /mcp (resource https://api.classgrid.in/mcp).
 *
 *   - Streamable HTTP in stateless mode with JSON responses: a new Server + transport per request, built
 *     for the token's user only, closed when the response closes. No sessions, nothing shared.
 *   - Off unless MCP_ENABLED=true (404 otherwise).
 *   - Bearer OAuth access token only (never the query string), issued for this resource (audience).
 *   - Only allowlisted tools whose scope the token carries; apps:use connectors only when this user
 *     connected that app. Arguments scrubbed of identity fields, chat membership checked first.
 *   - Per-token rate limits and one audit log line per tool call (no argument contents).
 *
 * Every dependency is injectable so the tests run with mocks (no database, Redis or network).
 */

import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema, McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { assertAllowlistSafe, scopeForMcpTool, MCP_APP_TOOLS } from "./mcp-allowlist.js";
import { buildMcpContext, sanitizeArgs, toolForListing } from "./mcp-context.js";
import { createChatGuard, createMcpUserSearch } from "./mcp-guards.js";
import { createMcpRateLimiter } from "./mcp-rate-limit.js";
import { getConnectedAppToolNames } from "../services/connected-apps.js";
import { mcpIpLimiter } from "../middleware/rateLimiter.js";

export const MCP_REQUESTS_PER_MINUTE = 120; // every JSON-RPC request, per token
export const MCP_TOOL_CALLS_PER_MINUTE = 60; // tools/call, per token

export const isMcpEnabled = () => process.env.MCP_ENABLED === "true";

// https://api.classgrid.in/mcp -> https://api.classgrid.in/.well-known/oauth-protected-resource/mcp (RFC 9728)
export function protectedResourceMetadataUrl(resourceUrl) {
    try {
        const url = new URL(resourceUrl);
        const path = url.pathname === "/" ? "" : url.pathname;
        return `${url.origin}/.well-known/oauth-protected-resource${path}`;
    } catch {
        return "https://api.classgrid.in/.well-known/oauth-protected-resource/mcp";
    }
}

// Header-safe quoted-string value (no quotes, backslashes or line breaks)
const headerValue = (text) => String(text || "").replace(/["\\]/g, "'").replace(/[\r\n]/g, " ").slice(0, 200);

const jsonRpcError = (code, message, id = null) => ({ jsonrpc: "2.0", error: { code, message }, id });

const defaultAudit = (entry) => {
    console.log(`[MCP audit] ${JSON.stringify(entry)}`);
};

const toolError = (text) => ({ content: [{ type: "text", text }], isError: true });

/**
 * One MCP Server for one request, closed over this user's context.
 * deps: getMcpTools, handleToolCall, checkChatAccess, searchUsers, toolLimiter, audit
 */
export function buildMcpServer(ctx, { user, tokenId, getMcpTools, handleToolCall, checkChatAccess, searchUsers, toolLimiter, audit = defaultAudit }) {
    const connectedApps = getConnectedAppToolNames(user);
    const scopes = new Set(ctx.scopes);

    const isVisible = (name) => {
        const scope = scopeForMcpTool(name);
        if (!scope || !scopes.has(scope)) return false;
        return !MCP_APP_TOOLS.has(name) || connectedApps.has(name);
    };

    const server = new Server(
        { name: "classgrid", version: "2.0.0" },
        {
            capabilities: { tools: {} },
            instructions: "Classgrid tools act as the signed-in user, on their own schedules, Grid chats and connected apps. Confirm with the user before sending messages or deleting anything.",
        }
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: getMcpTools().filter((tool) => isVisible(tool.name)).map(toolForListing),
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const name = typeof request.params?.name === "string" ? request.params.name : "";
        const started = Date.now();
        const log = (ok, reason) => {
            try {
                audit({ at: new Date().toISOString(), event: "mcp_tool_call", userId: ctx.userId, clientId: ctx.clientId, tool: name.slice(0, 80), ok, ...(reason ? { reason } : {}), ms: Date.now() - started });
            } catch { /* logging must never break a call */ }
        };

        // Same answer for unknown, denied and out-of-scope tools: nothing reveals that a tool exists
        if (!isVisible(name)) {
            log(false, "not_available");
            throw new McpError(ErrorCode.InvalidParams, `Tool not available: ${name.slice(0, 80)}`);
        }

        const limit = await toolLimiter(`${tokenId}:tools`, MCP_TOOL_CALLS_PER_MINUTE);
        if (!limit.allowed) {
            log(false, "rate_limited");
            return toolError(`Rate limit reached (${MCP_TOOL_CALLS_PER_MINUTE} tool calls per minute). Try again in ${limit.retryAfterSec}s.`);
        }

        const { args, error } = sanitizeArgs(name, request.params?.arguments, ctx);
        if (error) {
            log(false, "bad_arguments");
            return toolError(error);
        }

        try {
            const denied = await checkChatAccess(name, args, ctx);
            if (denied) {
                log(false, "chat_access");
                return toolError(denied);
            }
            const result = name === "search_users_for_chat"
                ? await searchUsers(args, ctx)
                : await handleToolCall(name, args, ctx);
            const safe = result && Array.isArray(result.content) ? result : { content: [{ type: "text", text: String(result ?? "") }] };
            log(!safe.isError);
            return safe;
        } catch (err) {
            log(false, "exception");
            console.error(`[MCP] ${name} failed:`, err?.message || err);
            return toolError("The tool failed. Please try again.");
        }
    });

    return server;
}

/**
 * Express router for POST /mcp. Throws (and the caller does not mount it) if the allowlist is unsafe
 * or names a tool that does not exist.
 */
export function createRemoteMcpRouter(deps) {
    const {
        getMcpTools,
        handleToolCall,
        verifyToken, // (rawToken, { audience }) -> verifyOAuthAccessToken result
        extractBearerToken,
        getResourceUrl,
        getRedis = () => null,
        getSb,
        getUserModel,
        audit = defaultAudit,
        isEnabled = isMcpEnabled,
        createTransport = () => new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true }),
        limiter = createMcpRateLimiter({ getRedis }),
        ipLimiter = mcpIpLimiter,
    } = deps;

    assertAllowlistSafe(getMcpTools().map((tool) => tool.name));

    const checkChatAccess = createChatGuard({ getSb });
    const searchUsers = createMcpUserSearch({ getUserModel });
    const router = express.Router();

    // Kill switch first: nothing else runs (not even body parsing) while MCP is off
    router.use((req, res, next) => {
        if (!isEnabled()) return res.status(404).json({ error: "not_found" });
        res.set("Access-Control-Expose-Headers", "WWW-Authenticate, Mcp-Session-Id, Mcp-Protocol-Version");
        next();
    });

    router.use(ipLimiter);
    router.use(express.json({ limit: "1mb" }));

    const unauthorized = (res, resourceUrl, params = "") => {
        res.set("WWW-Authenticate", `Bearer ${params}${params ? ", " : ""}resource_metadata="${protectedResourceMetadataUrl(resourceUrl)}"`);
    };

    const authenticate = async (req, res, next) => {
        const resourceUrl = getResourceUrl();
        try {
            const raw = extractBearerToken(req.headers.authorization);
            if (!raw) {
                // RFC 6750 §3.1: no error code when the request carried no credentials
                unauthorized(res, resourceUrl);
                return res.status(401).json({ error: "invalid_token", error_description: "Missing bearer token" });
            }
            const result = await verifyToken(raw, { audience: resourceUrl });
            if (!result.ok || result.audience !== resourceUrl) {
                const status = result.ok ? 401 : result.status;
                const description = result.ok ? "Access token was issued for a different resource" : result.description;
                if (status === 401) {
                    unauthorized(res, resourceUrl, `error="invalid_token", error_description="${headerValue(description)}"`);
                    return res.status(401).json({ error: "invalid_token", error_description: description });
                }
                return res.status(status).json({ error: result.error || "access_denied", error_description: description });
            }
            req.mcp = { user: result.user, tokenId: result.tokenId, clientId: result.clientId, scopes: result.scopes || [], resourceUrl };
            next();
        } catch (err) {
            console.error("[MCP] auth check failed:", err?.message || err);
            res.status(500).json(jsonRpcError(ErrorCode.InternalError, "Internal error"));
        }
    };

    // Express 4 does not catch rejected promises, hence the try/catch in every async middleware
    const rateLimit = async (req, res, next) => {
        let result;
        try {
            result = await limiter(req.mcp.tokenId, MCP_REQUESTS_PER_MINUTE);
        } catch (err) {
            console.error("[MCP] rate limit check failed:", err?.message || err);
            return res.status(500).json(jsonRpcError(ErrorCode.InternalError, "Internal error"));
        }
        if (result.allowed) return next();
        res.set("Retry-After", String(result.retryAfterSec));
        return res.status(429).json(jsonRpcError(-32000, "Too many requests. Please slow down.", req.body?.id ?? null));
    };

    // RFC 6750 §3.1 insufficient_scope (403) for an allowlisted tool the token has no scope for, so the
    // client can ask the user for that permission. Unknown or denied tools get the plain JSON-RPC error.
    const requireToolScope = (req, res, next) => {
        const messages = Array.isArray(req.body) ? req.body : [req.body];
        for (const msg of messages) {
            if (!msg || msg.method !== "tools/call") continue;
            const needed = scopeForMcpTool(msg.params?.name);
            if (needed && !req.mcp.scopes.includes(needed)) {
                const wanted = [...new Set([...req.mcp.scopes, needed])].join(" ");
                unauthorized(res, req.mcp.resourceUrl, `error="insufficient_scope", scope="${headerValue(wanted)}", error_description="This needs the ${needed} permission"`);
                return res.status(403).json(jsonRpcError(-32000, `Insufficient scope: this tool needs ${needed}`, msg.id ?? null));
            }
        }
        next();
    };

    router.post("/", authenticate, rateLimit, requireToolScope, async (req, res) => {
        const ctx = buildMcpContext(req.mcp);
        let server = null;
        let transport = null;
        try {
            server = buildMcpServer(ctx, {
                user: req.mcp.user,
                tokenId: req.mcp.tokenId,
                getMcpTools,
                handleToolCall,
                checkChatAccess,
                searchUsers,
                toolLimiter: limiter,
                audit,
            });
            transport = createTransport();
            res.on("close", () => {
                Promise.resolve(transport.close()).catch(() => {});
                Promise.resolve(server.close()).catch(() => {});
            });
            await server.connect(transport);
            await transport.handleRequest(req, res, req.body);
        } catch (err) {
            console.error("[MCP] request failed:", err?.message || err);
            if (!res.headersSent) res.status(500).json(jsonRpcError(ErrorCode.InternalError, "Internal error", req.body?.id ?? null));
        }
    });

    // Stateless server: no server-initiated streams and no sessions to end
    router.all("/", (req, res) => {
        res.set("Allow", "POST");
        res.status(405).json(jsonRpcError(-32000, "Method not allowed. Use POST."));
    });

    // Body parser errors as JSON-RPC errors instead of Express's HTML page
    // eslint-disable-next-line no-unused-vars
    router.use((err, req, res, next) => {
        if (err?.type === "entity.too.large") return res.status(413).json(jsonRpcError(-32600, "Request too large (1 MB max)"));
        if (err?.type === "entity.parse.failed") return res.status(400).json(jsonRpcError(ErrorCode.ParseError, "Parse error"));
        console.error("[MCP] router error:", err?.message || err);
        return res.status(500).json(jsonRpcError(ErrorCode.InternalError, "Internal error"));
    });

    return router;
}
