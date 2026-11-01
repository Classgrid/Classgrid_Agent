// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
/*
 * The AI's custom_mcp_connector tool: list known apps, add a custom MCP server (custom plugin) for the user,
 * show the login card, and run the server's tools. Results are JSON text; a "card" field makes the chat show
 * a connect card with the app's logo and a Log in button (client: answer-cards/mcp-connect).
 */
import CustomMcpServer from "../models/CustomMcpServer.js";
import { MCP_CATALOG, findCatalogApp } from "./custom-mcp-catalog.js";
import { callServerTool, createServer, publicServer, refreshTools } from "./custom-mcp.service.js";

export const CUSTOM_MCP_TOOL_NAME = "custom_mcp_connector";

export const CUSTOM_MCP_TOOL = {
    type: "function",
    function: {
        name: CUSTOM_MCP_TOOL_NAME,
        description: "Custom connectors (remote MCP servers, also called custom plugins). Use it to connect any app that has an MCP server (Linear, Jira, Stripe, Sentry, Airtable, Zapier and more, or any MCP URL the user gives) and then use that app's tools. " +
            "Operations: list_apps (known apps you can connect in one step), list_servers (the user's connectors and their tools), add_server (connect an app: pass app = a known app name, or name + url for any other MCP server; this shows the user a card with the app's logo and a Log in button), login (show the Log in card again), get_tools (full input schemas of one server's tools), call_tool (run one tool: server, tool, arguments), remove_server. " +
            "When the user asks to connect an app that has no built-in Classgrid plugin, call list_apps or add_server yourself; never tell them to do it by hand. After add_server, tell the user to click Log in on the card, then continue the task once they say they're done (call list_servers to see its tools). " +
            "Only add a server the user asked for. Custom MCP servers are run by other companies: say so in one short line when you add an unknown one. Before call_tool on a tool that sends, deletes, pays or changes data, confirm with the user first.",
        parameters: {
            type: "object",
            properties: {
                operation: { type: "string", enum: ["list_apps", "list_servers", "add_server", "login", "get_tools", "call_tool", "remove_server"] },
                app: { type: "string", description: "add_server: a known app's name or id from list_apps, e.g. 'linear', 'jira', 'stripe'." },
                name: { type: "string", description: "add_server for any other server: the name to show, e.g. 'My CRM'." },
                url: { type: "string", description: "add_server for any other server: its https MCP URL, e.g. https://example.com/mcp" },
                auth_type: { type: "string", enum: ["oauth", "api_key", "none"], description: "add_server for any other server: how it logs in. Default oauth." },
                api_key: { type: "string", description: "add_server with auth_type api_key: the key the user gave." },
                api_key_header: { type: "string", description: "add_server with auth_type api_key: header name, default Authorization (sent as Bearer)." },
                description: { type: "string", description: "add_server: a few words on what it does." },
                server: { type: "string", description: "The connector's name or id (login, get_tools, call_tool, remove_server)." },
                tool: { type: "string", description: "call_tool: the tool name exactly as listed." },
                arguments: { type: "object", description: "call_tool: the tool's arguments, matching its input schema." },
            },
            required: ["operation"],
        },
    },
};

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

function card(doc) {
    const s = publicServer(doc);
    return { id: s.id, name: s.name, description: s.description, iconUrl: s.iconUrl, invertInDarkMode: s.invertInDarkMode, status: s.status, authType: s.authType, url: s.url, toolCount: s.tools.length, lastError: s.lastError };
}

async function findServer(userId, ref) {
    const servers = await CustomMcpServer.find({ userId });
    const r = String(ref || "").trim();
    return servers.find((s) => String(s._id) === r) || servers.find((s) => norm(s.name) === norm(r)) ||
        servers.find((s) => s.catalogId && norm(s.catalogId) === norm(r)) || servers.find((s) => norm(s.name).includes(norm(r)) && norm(r)) || null;
}

const out = (o) => JSON.stringify(o);

export async function runCustomMcpTool(userId, args = {}) {
    if (!userId) return out({ error: "Sign in first." });
    const op = args.operation;
    try {
        if (op === "list_apps") {
            const mine = await CustomMcpServer.find({ userId }).select("catalogId").lean();
            const have = new Set(mine.map((m) => m.catalogId).filter(Boolean));
            return out({ apps: MCP_CATALOG.map((a) => ({ app: a.id, name: a.name, what: a.description, login: a.auth === "oauth" ? "log in with the app" : a.auth === "api_key" ? "the user's API key, pasted in AI Hub > Plugins" : "no login", ...(a.askUrl ? { needs_url: `ask the user for their address, like ${a.askUrl.placeholder}` } : {}), added: have.has(a.id) })), note: "Any other app with a remote MCP URL can be added with name + url." });
        }

        if (op === "list_servers") {
            const servers = await CustomMcpServer.find({ userId }).sort({ createdAt: 1 });
            return out({ servers: servers.map((d) => ({ id: String(d._id), name: d.name, status: d.status, enabled: d.enabled, tools: d.tools.map((t) => ({ name: t.name, description: String(t.description || "").slice(0, 200) })), lastError: d.lastError || undefined })) });
        }

        if (op === "add_server") {
            const named = args.app ? findCatalogApp(args.app) : findCatalogApp(args.name);
            // A known app with its own address per user (n8n) uses the URL the user gave; other known apps their fixed one
            const known = named && (named.askUrl || !args.url) ? named : null;
            if (args.app && !known && !args.url) return out({ error: `"${args.app}" isn't in the known apps list. Ask the user for the app's MCP server URL, then add it with name + url.` });
            if (known?.auth === "api_key" && !args.api_key) return out({ error: `${known.name} connects with the user's own API key (${known.keyHint || "from their account settings"}). Tell them to open AI Hub > Plugins > ${known.name} and paste the key there; don't ask them to paste it in the chat.` });
            if (known?.askUrl && !args.url) return out({ error: `Every ${known.name} has its own address. Ask the user for it (it looks like ${known.askUrl.placeholder}; ${known.askUrl.hint}), then call add_server again with app and url.` });
            const input = known
                ? { name: known.name, description: known.description, url: known.askUrl ? args.url : known.url, authType: known.askUrl && args.auth_type ? args.auth_type : known.auth, apiKey: args.api_key, apiKeyHeader: args.api_key_header, catalogId: known.id, iconUrl: known.logo }
                : { name: args.name, description: args.description, url: args.url, authType: args.auth_type || "oauth", apiKey: args.api_key, apiKeyHeader: args.api_key_header };
            const existing = await CustomMcpServer.findOne({ userId, url: new URL(input.url).href }).catch(() => null);
            const doc = existing || await createServer(userId, input);
            const c = card(doc);
            const next = c.status === "connected"
                ? `Connected with ${c.toolCount} tools. Use list_servers or call_tool now.`
                : c.status === "needs_login" ? "Tell the user to click Log in on the card. Continue when they say they're done." : `It didn't connect: ${c.lastError}`;
            return out({ ok: true, already_added: !!existing, card: c, next });
        }

        const doc = await findServer(userId, args.server);
        if (!doc) return out({ error: `No connector called "${args.server}". Call list_servers to see the user's connectors.` });

        if (op === "login") {
            if (doc.status !== "connected") await refreshTools(doc);
            return out({ card: card(doc), next: doc.status === "connected" ? "It's already logged in." : "Tell the user to click Log in on the card." });
        }

        if (op === "get_tools") {
            if (!doc.tools.length && doc.status === "connected") await refreshTools(doc);
            return out({ server: doc.name, status: doc.status, tools: doc.tools.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })) });
        }

        if (op === "call_tool") {
            if (!doc.enabled) return out({ error: `${doc.name} is turned off in AI Hub > Plugins.` });
            if (!args.tool) return out({ error: "Pass tool (the tool name). Use get_tools to see them." });
            if (doc.tools.length && !doc.tools.some((t) => t.name === args.tool)) return out({ error: `${doc.name} has no tool "${args.tool}". Tools: ${doc.tools.map((t) => t.name).join(", ")}` });
            // Wrong argument names or types: the tool's real input schema goes back with the error, so the next try is right
            const badArgs = (msg) => /input validation error|invalid arguments|unrecognized key|invalid input|-32602/i.test(String(msg || ""));
            const schemaOf = () => doc.tools.find((t) => t.name === args.tool)?.inputSchema;
            try {
                const text = await callServerTool(doc, args.tool, args.arguments || {});
                return badArgs(text) && schemaOf() ? out({ error: text, inputSchema: schemaOf(), next: "Call the tool again with arguments that match this inputSchema exactly." }) : text;
            } catch (err) {
                if (err.loginNeeded) return out({ error: `${doc.name} needs the user to log in again.`, card: card(doc), next: "Tell the user to click Log in on the card, then try again." });
                if (badArgs(err?.message) && schemaOf()) return out({ error: `${doc.name}: ${err.message}`, inputSchema: schemaOf(), next: "Call the tool again with arguments that match this inputSchema exactly." });
                return out({ error: `${doc.name}: ${err?.message || err}` });
            }
        }

        if (op === "remove_server") {
            await doc.deleteOne();
            return out({ ok: true, removed: doc.name });
        }

        return out({ error: `Unknown operation "${op}".` });
    } catch (err) {
        return out({ error: err?.message || String(err) });
    }
}

/** One line for the system prompt listing the user's custom connectors and their tools. */
export async function customMcpPromptLine(userId) {
    if (!userId) return "";
    const servers = await CustomMcpServer.find({ userId, enabled: true }).sort({ createdAt: 1 }).lean();
    if (!servers.length) return "";
    const rows = servers.map((s) => {
        if (s.status !== "connected") return `${s.name} (${s.status === "needs_login" ? "needs login: use operation login to show the card" : "error: " + s.lastError})`;
        const names = (s.tools || []).map((t) => t.name);
        return `${s.name} (connected; tools: ${names.slice(0, 40).join(", ")}${names.length > 40 ? `, +${names.length - 40} more` : ""})`;
    });
    return `- **Custom connectors (MCP)**: ${rows.join("; ")}. Use 'custom_mcp_connector' with operation call_tool (server, tool, arguments); call get_tools first when you need a tool's input schema.`;
}
