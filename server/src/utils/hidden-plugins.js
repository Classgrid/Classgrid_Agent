// Plugins that are HIDDEN everywhere (owner, 2026-11-28: "hide Canva and Spotify from all, mobile, web, everything,
// don't remove"). Their code stays as it is; while an id is listed here nobody sees it or can use it:
//   - not in AI Hub > Plugins (website, desktop app, Classgrid Code: client INTEGRATIONS_LIST; phone: src/api/connectors.ts)
//   - not in the connected-apps status (GET /api/ai-integrations/status) nor the home strip
//   - the AI never gets the tool and is never told about the app (ai-chat.controller.js), "@Canva" picks nothing,
//     the remote MCP server does not offer it (connected-apps.js)
//   - its official MCP server is not in the custom connector catalog, and a custom connector already added for it is
//     not listed nor offered to the AI
// To bring one back, take its id out of HIDDEN_PLUGINS (and put its entry back in the two app lists).

export const HIDDEN_PLUGINS = Object.freeze(new Set(["canva", "spotify"]));

const TOOL_OF = { canva: "canva_connector", spotify: "spotify_connector" };
const CATALOG_OF = { canva: "canva-mcp" };
const MCP_HOSTS_OF = { canva: ["mcp.canva.com"], spotify: [] };

export const HIDDEN_CONNECTOR_TOOLS = Object.freeze(new Set([...HIDDEN_PLUGINS].map((id) => TOOL_OF[id]).filter(Boolean)));
const HIDDEN_CATALOG_IDS = new Set([...HIDDEN_PLUGINS].map((id) => CATALOG_OF[id]).filter(Boolean));
const HIDDEN_MCP_HOSTS = new Set([...HIDDEN_PLUGINS].flatMap((id) => MCP_HOSTS_OF[id] || []));

export const isHiddenPlugin = (id) => HIDDEN_PLUGINS.has(String(id || "").replace(/^mcp-/, ""));
export const isHiddenConnectorTool = (name) => HIDDEN_CONNECTOR_TOOLS.has(name);
export const isHiddenCatalogApp = (catalogId) => HIDDEN_CATALOG_IDS.has(catalogId);

/** A custom connector (custom MCP server) that points at a hidden app's official MCP server. */
export const isHiddenCustomServer = (server) => {
    if (server?.catalogId && isHiddenCatalogApp(server.catalogId)) return true;
    try { return HIDDEN_MCP_HOSTS.has(new URL(String(server?.url || "")).hostname); } catch { return false; }
};
