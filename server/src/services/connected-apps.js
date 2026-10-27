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
 * Which of the user's own app connections exist, read from the user document only (no network calls,
 * no database reads). Used by the remote MCP server to offer an apps:use connector only when this
 * user has connected that app themselves.
 *
 * Same rules as the AI chat's connector gate in controllers/ai-chat.controller.js, except that Google is
 * trusted when a token is stored (the chat also pings Google first; the tool reports a dead token itself).
 * Platform-account connectors (Vercel, Supabase, Sanity, Meta, WhatsApp, AWS SES) are not here: they are
 * never offered over MCP.
 */

export function getConnectedAppToolNames(user) {
    const names = new Set();
    if (!user) return names;
    if (user.google_access_token || user.google_refresh_token) names.add("google_workspace_connector");
    if (user.microsoft_refresh_token || user.microsoft_access_token) names.add("microsoft_workspace_connector");
    if (user.zoom_refresh_token || user.zoom_access_token) names.add("zoom_connector");
    if (user.notion_access_token) names.add("notion_connector");
    if (user.slack_access_token) names.add("slack_workspace_connector");
    if (user.canva_access_token || user.canva_refresh_token) names.add("canva_connector");
    if (user.spotify_access_token || user.spotify_refresh_token) names.add("spotify_connector");
    if (user.github_access_token) names.add("github_workspace_connector");
    const googleServices = user.metadata?.connected_google_services;
    if (Array.isArray(googleServices) && googleServices.includes("youtube")) names.add("youtube_connector");
    return names;
}
