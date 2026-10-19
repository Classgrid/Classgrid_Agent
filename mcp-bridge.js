#!/usr/bin/env node
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
/*
 * DEPRECATED: this stdio-to-SSE bridge no longer works and is kept only to explain what replaced it.
 *
 * The old shared-key SSE endpoint (/api/mcp/sse, /api/mcp/messages) has been retired and answers 410 Gone.
 * There is no shared MCP key any more: every user signs in with their own Classgrid account (OAuth).
 *
 * Connect your MCP client straight to the remote MCP server instead:
 *
 *   URL: https://api.classgrid.in/mcp   (Streamable HTTP, OAuth sign-in)
 *
 *   - Claude (desktop or web): Settings > Connectors > Add custom connector, paste the URL, then sign in.
 *   - Cursor: add to ~/.cursor/mcp.json (or .cursor/mcp.json in a project), then click "Connect":
 *       { "mcpServers": { "classgrid": { "url": "https://api.classgrid.in/mcp" } } }
 *   - ChatGPT: add Classgrid as a connector with the same URL.
 *   - Clients that only speak stdio can use the community "mcp-remote" package:
 *       npx -y mcp-remote https://api.classgrid.in/mcp
 *
 * Your browser opens a Classgrid consent page where you choose what the app may do.
 */

const MCP_URL = "https://api.classgrid.in/mcp";

console.error(
  [
    "mcp-bridge.js is deprecated: the Classgrid SSE MCP endpoint and its shared key have been retired.",
    `Connect your MCP client (Claude, Cursor, ChatGPT) directly to ${MCP_URL}`,
    "and sign in with your Classgrid account when asked (OAuth). No API key is needed.",
    `Clients that only support stdio: npx -y mcp-remote ${MCP_URL}`,
  ].join("\n")
);
process.exit(1);
