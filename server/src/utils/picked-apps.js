// The apps the user picked in the chat box (owner, 2026-11-27). A plugin, Web search or Deep research picked from the
// box's "+" menu or "@" menu goes into the message as "@<name>" (the apps draw it as the app's logo and name). The
// message itself is sent unchanged; this file finds those picks in it, so the AI is told plainly, for that turn,
// which apps were picked, and their tool groups are loaded from the start.
//
// The names are the apps' own (client INTEGRATIONS_LIST in AskAiPanel.tsx, the phone's BUILTIN_PLUGINS in
// src/api/connectors.ts); a custom connector is picked by its name as the user saved it.

import { isHiddenConnectorTool } from "./hidden-plugins.js";

/** Built-in plugins: the name in the box, its tool and the tool group that holds it (services/ai-tool-groups.js). */
const ALL_PLUGINS = [
    { name: "Notion", tool: "notion_connector", group: "connector:notion" },
    { name: "Gmail", tool: "google_workspace_connector", group: "connector:google" },
    { name: "Google Calendar", tool: "google_workspace_connector", group: "connector:google" },
    { name: "Google Drive", tool: "google_workspace_connector", group: "connector:google" },
    { name: "Google Classroom", tool: "google_workspace_connector", group: "connector:google" },
    { name: "Google Meet", tool: "google_workspace_connector", group: "connector:google" },
    { name: "Google Forms", tool: "google_workspace_connector", group: "connector:google" },
    { name: "Microsoft Outlook", tool: "microsoft_workspace_connector", group: "connector:microsoft" },
    { name: "Microsoft Teams", tool: "microsoft_workspace_connector", group: "connector:microsoft" },
    { name: "Zoom", tool: "zoom_connector", group: "connector:zoom" },
    { name: "WhatsApp Business", tool: "whatsapp_business_connector", group: "connector:whatsapp_business" },
    { name: "Vercel", tool: "vercel_connector", group: "connector:vercel" },
    { name: "Slack", tool: "slack_workspace_connector", group: "connector:slack" },
    { name: "GitHub", tool: "github_workspace_connector", group: "connector:github" },
    { name: "Canva", tool: "canva_connector", group: "connector:canva" },
    { name: "Spotify", tool: "spotify_connector", group: "connector:spotify" },
    { name: "YouTube", tool: "youtube_connector", group: "connector:youtube" },
    { name: "Supabase", tool: "supabase_connector", group: "connector:supabase" },
    { name: "Sanity CMS", tool: "sanity_connector", group: "connector:sanity" },
    { name: "Facebook Pages", tool: "facebook_connector", group: "connector:facebook" },
    { name: "Instagram Business", tool: "instagram_connector", group: "connector:instagram" },
];
// Hidden plugins (utils/hidden-plugins.js: Canva, Spotify) cannot be picked with "@"
export const PICKABLE_PLUGINS = ALL_PLUGINS.filter((p) => !isHiddenConnectorTool(p.tool));

/** The box's own two search items. */
export const SEARCH_PICKS = ["Web search", "Deep research"];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Every "@<name>" in `text` whose name is one of `names`, in the order they first appear, each once, with the name as
 * listed (not as typed). The same rule as the apps' chips: the "@" starts the text or follows a space or an opening
 * bracket or quote (so an email address is never a pick), the longest name wins ("@Google Drive", not "@Google"),
 * any letter case, and the name ends the word (not "@Gmailx" or "@Gmail.com").
 */
export function mentionsIn(text, names) {
    const list = [...new Set((names || []).map((n) => String(n || "").trim()).filter(Boolean))].sort((a, b) => b.length - a.length);
    if (!text || !list.length) return [];
    const re = new RegExp(`(?:^|(?<=[\\s(\\[{"'“‘]))@(${list.map(escapeRe).join("|")})(?![\\p{L}\\p{N}_-])(?!\\.[\\p{L}\\p{N}])`, "giu");
    const found = [];
    for (const m of String(text).matchAll(re)) {
        const name = list.find((n) => n.toLowerCase() === m[1].toLowerCase());
        if (name && !found.includes(name)) found.push(name);
    }
    return found;
}

/**
 * The picks in a message: built-in plugins, custom connectors (by the names in `customNames`) and the two search
 * items. `pluginsAllowed` false (a shared Grid chat, where plugins are off) keeps only the search items.
 */
export function pickedApps(text, { customNames = [], pluginsAllowed = true } = {}) {
    const builtin = pluginsAllowed ? PICKABLE_PLUGINS.map((p) => p.name) : [];
    const builtinLower = new Set(builtin.map((n) => n.toLowerCase()));
    // (a custom connector named like a built-in one is the built-in one here)
    const custom = pluginsAllowed ? customNames.filter((n) => n && !builtinLower.has(String(n).toLowerCase())) : [];
    const names = mentionsIn(text, [...builtin, ...custom, ...SEARCH_PICKS]);
    const customSet = new Set(custom.map((n) => String(n).trim()));
    return {
        plugins: PICKABLE_PLUGINS.filter((p) => names.includes(p.name)).sort((a, b) => names.indexOf(a.name) - names.indexOf(b.name)),
        custom: names.filter((n) => customSet.has(n)),
        webSearch: names.includes("Web search"),
        deepResearch: names.includes("Deep research"),
        names,
    };
}

/** The tool groups to load from the start for the picks (each once). */
export const pickedGroupIds = (picked) => [...new Set((picked?.plugins || []).map((p) => p.group))];

/**
 * The note for this turn's instructions, or "" when nothing was picked. `researchLine` is the /research command's
 * line (SLASH_COMMAND_LINES.research), so Deep research works the same way as that command.
 */
export function pickedAppsNote(picked, { researchLine = "" } = {}) {
    if (!picked?.names?.length) return "";
    const rows = [];
    for (const p of picked.plugins) {
        rows.push(`- ${p.name}: use its tool ${p.tool} for this request (group ${p.group}; if the tool is not in your list, load that group with load_tools first). Read what the request needs from ${p.name} with it before you answer, instead of answering without it. If ${p.name} is not connected, call open_integration_panel and ask the user to connect it.`);
    }
    for (const name of picked.custom) {
        rows.push(`- ${name}: the user's custom connector. Use custom_mcp_connector with operation call_tool and server "${name}" for this request (get_tools first when you need a tool's input). If it needs login, use operation login to show the card.`);
    }
    if (picked.webSearch) rows.push(`- Web search: search the web for this request with search_web, and open the best pages with open_url. Answer from what you find, with the sources, even if you think you already know the answer.`);
    if (picked.deepResearch) rows.push(`- Deep research: ${researchLine || "do deep research on the user's question on the web, with several good sources, and write one full report with every source as a link."}`);
    return `\n\n--- APPS THE USER PICKED ---\nThe user picked ${picked.names.length === 1 ? "this app" : "these apps"} in the chat box for this message (each shows as "@<name>" in the message): ${picked.names.join(", ")}. Use ${picked.names.length === 1 ? "it" : "them"} for this request:\n${rows.join("\n")}`;
}
