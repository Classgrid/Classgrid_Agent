// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
/*
 * Per-request identity for the remote MCP server. The context handed to handleToolCall is built ONLY from
 * the verified OAuth token's user, never from the request body or tool arguments, and tool arguments are
 * scrubbed of anything that could pick a different user, organization, file or collection.
 */

// Field names match what tools.js reads from its context (userEmail, userRole, userId, orgId, role,
// sessionId, isStaff, subdomain), the same ones the AI chat passes.
export function buildMcpContext({ user, tokenId, clientId, scopes }) {
    return Object.freeze({
        userEmail: String(user?.email || ""),
        userId: user?._id ? String(user._id) : "",
        orgId: user?.organization_id ? String(user.organization_id) : "",
        role: String(user?.role || ""),
        userRole: String(user?.role || ""),
        subdomain: "",
        isStaff: false, // never over MCP, whatever the user's role
        sessionId: `mcp-${tokenId}`,
        scopes: Object.freeze(Array.isArray(scopes) ? [...scopes] : []),
        clientId: String(clientId || ""),
        transport: "mcp",
    });
}

// Argument names that would let the caller act as someone else or reach server-side resources
const SCRUBBED_ARG_NAMES = new Set([
    "userId", "userEmail", "user_email", "user_id", "senderUserId", "creatorUserId",
    "orgId", "org_id", "organizationId", "organization_id",
    "filePath", "collectionName", "isClassgridManaged",
    "sessionId", "isStaff", "role", "userRole", "subdomain",
    "__proto__", "constructor", "prototype",
]);

// Real tool arguments that share a scrubbed name (Microsoft Graph user id for a Teams direct message)
const ARG_EXEMPTIONS = Object.freeze({
    microsoft_workspace_connector: new Set(["userId"]),
});

// Tools whose sender the server fills in from the token's user (the tool would otherwise post as the
// Classgrid support account when no sender is given)
const SENDER_TOOLS = new Set([
    "send_chat_message", "upload_file_to_chat", "send_group_chat_message",
    "upload_file_to_group_chat", "send_group_announcement",
]);

// Operations of an allowed tool that stay off over MCP
const BLOCKED_OPERATIONS = Object.freeze({
    github_workspace_connector: new Set(["push_sandbox_files"]), // reads the AI chat's sandbox, which MCP has none of
    google_workspace_connector: new Set(["upload_drive_file"]), // the server fetches fileUrl itself, which could reach internal https hosts
});

// Arguments that are only meaningful for a blocked operation, hidden from the listed schema
const HIDDEN_ARGS = Object.freeze({
    github_workspace_connector: new Set(["paths"]),
    google_workspace_connector: new Set(["fileUrl", "folderId"]),
});

// Arguments used as database ids or filters: must be plain strings (an object such as {"$ne": "..."}
// would turn a single-document lookup into a query that matches other documents)
const STRING_ONLY_ARGS = new Set([
    "schedule_id", "scheduleId", "threadId", "groupId", "messageId", "pollId", "status",
    "ticketId", "talkId",
]);

const MAX_LIMIT = 100;
const MAX_URL_LENGTH = 2048;
const MAX_ARG_DEPTH = 8;

const isScrubbed = (toolName, argName) =>
    SCRUBBED_ARG_NAMES.has(argName) && !(ARG_EXEMPTIONS[toolName] && ARG_EXEMPTIONS[toolName].has(argName));

// True when a value holds a MongoDB operator key ("$ne", "$where", ...) at any depth, or nests deeper
// than MAX_ARG_DEPTH. Iterative so a deeply nested payload cannot blow the stack.
function hasOperatorKey(value) {
    const stack = [{ v: value, d: 0 }];
    while (stack.length) {
        const { v, d } = stack.pop();
        if (!v || typeof v !== "object") continue;
        if (d > MAX_ARG_DEPTH) return true;
        for (const key of Object.keys(v)) {
            if (key.charAt(0) === "$") return true;
            stack.push({ v: v[key], d: d + 1 });
        }
    }
    return false;
}

/**
 * Returns { args } (a fresh object safe to pass to handleToolCall) or { error } (a message for the caller).
 */
export function sanitizeArgs(toolName, rawArgs, ctx) {
    const input = rawArgs && typeof rawArgs === "object" && !Array.isArray(rawArgs) ? rawArgs : {};
    const args = {};
    for (const key of Object.keys(input)) {
        if (isScrubbed(toolName, key)) continue;
        if (HIDDEN_ARGS[toolName] && HIDDEN_ARGS[toolName].has(key)) continue;
        args[key] = input[key];
    }

    const blocked = BLOCKED_OPERATIONS[toolName];
    if (blocked && blocked.has(args.operation)) {
        return { error: `The ${args.operation} operation is not available over MCP.` };
    }

    for (const key of Object.keys(args)) {
        const value = args[key];
        if (STRING_ONLY_ARGS.has(key) && value !== undefined && value !== null && typeof value !== "string") {
            return { error: `${key} must be a string.` };
        }
        if (hasOperatorKey(value)) {
            return { error: `${key} contains a value that is not allowed (keys starting with "$" or nesting too deep).` };
        }
    }

    // File links are fetched or shown to others: https only (no http, file:, data: or internal hosts over http)
    if (args.fileUrl !== undefined) {
        const url = typeof args.fileUrl === "string" ? args.fileUrl.trim() : "";
        if (!url || url.length > MAX_URL_LENGTH || url.slice(0, 8).toLowerCase() !== "https://") {
            return { error: "fileUrl must be an https:// link." };
        }
        args.fileUrl = url;
    }

    if (args.limit !== undefined) {
        const n = Number(args.limit);
        args.limit = Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), MAX_LIMIT) : undefined;
        if (args.limit === undefined) delete args.limit;
    }

    if (SENDER_TOOLS.has(toolName)) args.senderUserId = ctx.userId;
    if (toolName === "create_group_poll") args.creatorUserId = ctx.userId;

    return { args };
}

// The tool as listed to MCP clients: scrubbed and hidden arguments removed from the schema, blocked
// operations removed from the operation enum.
export function toolForListing(tool) {
    const schema = tool.inputSchema && typeof tool.inputSchema === "object"
        ? JSON.parse(JSON.stringify(tool.inputSchema))
        : { type: "object", properties: {} };
    const props = schema.properties && typeof schema.properties === "object" ? schema.properties : {};
    for (const key of Object.keys(props)) {
        if (isScrubbed(tool.name, key) || (HIDDEN_ARGS[tool.name] && HIDDEN_ARGS[tool.name].has(key))) delete props[key];
    }
    if (Array.isArray(schema.required)) schema.required = schema.required.filter((key) => key in props);
    const blocked = BLOCKED_OPERATIONS[tool.name];
    if (blocked && props.operation && Array.isArray(props.operation.enum)) {
        props.operation.enum = props.operation.enum.filter((op) => !blocked.has(op));
    }
    schema.properties = props;
    if (!schema.type) schema.type = "object";
    return { name: tool.name, description: tool.description || "", inputSchema: schema };
}
