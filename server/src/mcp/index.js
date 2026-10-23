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
 * =========================================================================================
 * 🚨 CRITICAL AI & SYSTEM RULE 🚨
 * NO FRONTEND GITHUB ACTIONS: NEVER create yaml files that build/deploy the frontend to EC2.
 * The frontend is hosted 100% on Vercel. EC2 is only for the backend.
 * =========================================================================================
 */

/*
 * MCP entry points.
 *
 *   - createMcpRouter(router): the old single-connection SSE server (/api/mcp/sse, /api/mcp/messages) with
 *     its shared key is gone. Both routes answer 410 Gone and point to the remote MCP server. No shared-key
 *     access remains (MCP_API_KEY is no longer read).
 *   - loadRemoteMcpRouter(): the multi-user remote MCP server (POST /mcp, OAuth bearer tokens), built in
 *     ./mcp-server.js. Loaded dynamically so a failed allowlist safety check (thrown at load time) only
 *     keeps /mcp unmounted instead of taking the whole API down.
 */

import { getMcpResourceUrl } from "../routes/oauth.provider.routes.js";

export const createMcpRouter = (expressRouter) => {
  const gone = (req, res) => {
    res.status(410).json({
      error: "gone",
      message: "The Classgrid SSE MCP endpoint has been retired. Connect your MCP client (Claude, Cursor, ChatGPT) to the remote MCP URL instead; it signs you in with your Classgrid account (OAuth).",
      mcp_url: getMcpResourceUrl(),
      transport: "streamable-http"
    });
  };

  expressRouter.all("/mcp/sse", gone);
  expressRouter.all("/mcp/messages", gone);

  return expressRouter;
};

// Builds the POST /mcp router with the real tools, OAuth token check, Redis and Supabase.
// Throws if the allowlist is unsafe; the caller then leaves /mcp unmounted.
export async function loadRemoteMcpRouter(overrides = {}) {
  const [{ createRemoteMcpRouter }, tools, oauth, redisModule, supabase] = await Promise.all([
    import("./mcp-server.js"),
    import("./tools.js"),
    import("../routes/oauth.provider.routes.js"),
    import("../config/redis.js"),
    import("../config/supabaseClient.js"),
  ]);

  return createRemoteMcpRouter({
    getMcpTools: tools.getMcpTools,
    handleToolCall: tools.handleToolCall,
    verifyToken: oauth.verifyOAuthAccessToken,
    extractBearerToken: oauth.extractBearerToken,
    getResourceUrl: oauth.getMcpResourceUrl,
    getRedis: () => redisModule.default,
    getSb: supabase.getChatSb,
    getUserModel: async () => (await import("../models/User.js")).default,
    ...overrides,
  });
}
