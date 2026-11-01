// Tools of each built-in plugin, for the "Tools" list on its page in AI Hub > Plugins. Built from the real connector
// tools in mcp/tools.js (each connector's operation list), so the list never drifts from what the AI can really do.
import { getMcpTools } from "../mcp/tools.js";

const MS_MEETINGS = ["list_meetings", "create_meeting"];

// Plugin id (as in the client's INTEGRATIONS_LIST) → its connector tool, and which operations belong to it when one
// connector serves several plugins. tools: plugins made of standalone tools instead of one connector.
const PLUGINS = {
    gmail: { tool: "google_workspace_connector", ops: ["list_emails", "read_email", "read_email_attachment", "list_sent_emails", "mark_email_read", "send_email"] },
    gcal: { tool: "google_workspace_connector", ops: ["list_events", "create_event"] },
    gdrive: { tool: "google_workspace_connector", ops: ["list_drive_files", "read_drive_file", "upload_drive_file", "create_folder"] },
    gforms: { tool: "google_workspace_connector", ops: ["get_form", "list_form_responses", "create_form"] },
    gclass: { tool: "google_workspace_connector", match: /classroom/ },
    gmeet: { tool: "google_workspace_connector", ops: ["create_event", "list_events"] },
    outlook: { tool: "microsoft_workspace_connector", ops: ["list_emails", "read_email", "send_email", "mark_email_read", ...MS_MEETINGS] },
    teams: { tool: "microsoft_workspace_connector", ops: ["list_teams", "list_channels", "read_channel_messages", "send_channel_message", "create_channel", "list_chats", "read_chat_messages", "send_direct_message", ...MS_MEETINGS, "read_meeting_transcript"] },
    zoom: { tool: "zoom_connector" },
    "mcp-notion": { tool: "notion_connector" },
    slack: { tool: "slack_workspace_connector" },
    canva: { tool: "canva_connector" },
    spotify: { tool: "spotify_connector" },
    github: { tool: "github_workspace_connector" },
    vercel: { tool: "vercel_connector" },
    youtube: { tool: "youtube_connector" },
    supabase: { tool: "supabase_connector" },
    sanity: { tool: "sanity_connector" },
    facebook: { tool: "facebook_connector" },
    instagram: { tool: "instagram_connector" },
    whatsapp: { tools: ["send_whatsapp_message", "read_whatsapp_messages", "wait_for_whatsapp_reply"] },
};

const READ_VERBS = /^(list|get|read|search|query|wait)_|^search$/;
const label = (name) => name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, " ");
const firstSentence = (text) => String(text || "").split(/(?<=\.)\s/)[0].slice(0, 300);

let cached = null;
/** { [pluginId]: [{ name, label, description?, readOnly }] } */
export function builtinPluginTools() {
    if (cached) return cached;
    const all = new Map(getMcpTools().map((t) => [t.name, t]));
    cached = {};
    for (const [id, p] of Object.entries(PLUGINS)) {
        if (p.tools) {
            cached[id] = p.tools.filter((n) => all.has(n)).map((n) => ({ name: n, label: label(n), description: firstSentence(all.get(n).description), readOnly: READ_VERBS.test(n) }));
            continue;
        }
        const ops = all.get(p.tool)?.inputSchema?.properties?.operation?.enum || [];
        cached[id] = ops.filter((op) => (p.ops ? p.ops.includes(op) : p.match ? p.match.test(op) : true))
            .map((op) => ({ name: op, label: label(op), readOnly: READ_VERBS.test(op) }));
    }
    return cached;
}
