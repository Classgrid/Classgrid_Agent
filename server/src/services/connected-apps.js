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
    if (user.github_access_token) names.add("github_workspace_connector");
    const googleServices = user.metadata?.connected_google_services;
    if (Array.isArray(googleServices) && googleServices.includes("youtube")) names.add("youtube_connector");
    return names;
}
