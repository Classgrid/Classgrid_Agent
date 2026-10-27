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
 * Tool allowlist for the remote MCP server (POST /mcp). Built from the scope list in mcp-scopes.js:
 * tool name -> the one scope a token needs to see and call it. Anything not in here is not exposed.
 *
 * Fail closed: this module throws at load time if any denied tool made it into the allowlist, and the
 * /mcp route is then never mounted (see loadRemoteMcpRouter in ./index.js).
 */

import { MCP_SCOPES, isNeverExposed } from "./mcp-scopes.js";
import { TOOL_GROUPS } from "../services/ai-tool-groups.js";

// The owner's never-expose list, kept here word for word as a second copy on purpose: editing
// mcp-scopes.js alone can't open one of these up.
export const MCP_HARD_DENYLIST = Object.freeze(new Set([
    "execute_terminal_command", "ubuntu", "unified_db_query", "read_server_logs", "get_server_status", "read_local_file",
    "read_sandbox_file", "run_code", "manage_rag_document", "supabase_connector", "vercel_connector",
    "sanity_connector", "aws_ses_connector", "whatsapp_business_connector", "facebook_connector",
    "instagram_connector", "send_whatsapp_message", "generate_image", "edit_image", "transcribe_audio",
    "update_ai_preferences", "create_skill", "update_skill", "delete_skill",
]));

// Every tool of a staff-only group in the AI chat (support, Classgrid Talk, leads, platform data)
const STAFF_GROUP_TOOLS = new Set(TOOL_GROUPS.filter((g) => g.staffOnly).flatMap((g) => g.tools || []));

export function isDeniedOverMcp(toolName) {
    const name = String(toolName || "");
    return MCP_HARD_DENYLIST.has(name) || STAFF_GROUP_TOOLS.has(name) || isNeverExposed(name);
}

// tool -> required scope
export const MCP_TOOL_ALLOWLIST = Object.freeze(new Map(
    MCP_SCOPES.flatMap((entry) => entry.tools.map((tool) => [tool, entry.scope]))
));

// Tools that act through one of the user's own connected accounts (apps:use): offered only when this
// user has connected that app (see services/connected-apps.js)
export const MCP_APP_TOOLS = Object.freeze(new Set(
    MCP_SCOPES.filter((entry) => entry.scope === "apps:use").flatMap((entry) => entry.tools)
));

// Problems with the allowlist (empty = safe). With availableToolNames, every allowlisted tool must exist.
// scopeEntries defaults to the real scope list; tests pass their own to prove a denied tool is caught.
export function findAllowlistProblems(availableToolNames = null, scopeEntries = MCP_SCOPES) {
    const problems = [];
    const available = availableToolNames ? new Set(availableToolNames) : null;
    const seen = new Set();
    for (const entry of scopeEntries) {
        for (const tool of entry.tools) {
            if (isDeniedOverMcp(tool)) problems.push(`${tool} (${entry.scope}) is on the MCP denylist`);
            if (seen.has(tool)) problems.push(`${tool} is listed under more than one scope`);
            seen.add(tool);
            if (available && !available.has(tool)) problems.push(`${tool} (${entry.scope}) is not a known tool`);
        }
    }
    return problems;
}

export function assertAllowlistSafe(availableToolNames = null, scopeEntries = MCP_SCOPES) {
    const problems = findAllowlistProblems(availableToolNames, scopeEntries);
    if (problems.length) throw new Error(`Unsafe MCP tool allowlist: ${problems.join("; ")}`);
}

// The scope a tool needs over MCP, or null when it is not exposed at all
export function scopeForMcpTool(toolName) {
    const name = String(toolName || "");
    if (isDeniedOverMcp(name)) return null;
    return MCP_TOOL_ALLOWLIST.get(name) || null;
}

// Module-load check (no tool list here; the route checks the names against getMcpTools() too)
assertAllowlistSafe();
