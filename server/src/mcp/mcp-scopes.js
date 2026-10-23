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
 * Scopes a Classgrid OAuth token can carry for the remote MCP server (Claude, Cursor, ChatGPT).
 * Single source of truth: the OAuth provider, the discovery documents, the consent page and the MCP
 * route all read this file. A scope only decides which tools are listed and callable; every tool still
 * runs its own role and organization checks against the real user.
 *
 * Anything that is not in a scope below is NOT exposed over MCP. MCP_NEVER_EXPOSE is a second, hard-coded
 * wall: the MCP route must refuse to start if findScopeMapProblems() returns anything.
 */

export const OFFLINE_ACCESS_SCOPE = "offline_access";

// sensitive = changes data or acts through the user's other accounts; unticked by default on the consent page
export const MCP_SCOPES = Object.freeze([
    {
        scope: "profile:read",
        label: "Read your profile",
        sensitive: false,
        tools: ["get_my_profile"],
    },
    {
        scope: "schedules:read",
        label: "Read your schedules",
        sensitive: false,
        tools: ["list_schedules"],
    },
    {
        scope: "schedules:write",
        label: "Create, edit and delete your schedules",
        sensitive: true,
        tools: [
            "create_schedule", "delete_schedule", "delete_schedule_attachment",
            "edit_schedule_time", "edit_schedule_title", "edit_schedule_email_subject", "edit_schedule_email_body",
            "edit_schedule_summary", "edit_schedule_description", "edit_schedule_action_info",
        ],
    },
    {
        scope: "grid:read",
        label: "Read your Grid chats and groups",
        sensitive: false,
        tools: [
            "list_grids", "list_group_chats", "read_group_chat_details", "read_group_chat_messages",
            "list_group_members", "count_group_members", "list_group_polls", "read_group_poll_details",
            "list_chat_threads", "read_chat_messages", "search_users_for_chat",
            "get_chat_attachment_url", "get_group_chat_attachment_url",
        ],
    },
    {
        scope: "grid:write",
        label: "Send messages in Grid and chats",
        sensitive: true,
        tools: [
            "send_group_chat_message", "send_chat_message", "send_group_announcement", "create_group_poll",
            "upload_file_to_chat", "upload_file_to_group_chat",
        ],
    },
    {
        // The MCP route must also offer each connector only if this user has connected it themselves
        scope: "apps:use",
        label: "Use your connected apps (Gmail, Drive, Notion…)",
        sensitive: true,
        tools: [
            "google_workspace_connector", "microsoft_workspace_connector", "notion_connector",
            "slack_workspace_connector", "github_workspace_connector", "zoom_connector", "youtube_connector",
        ],
    },
    {
        scope: OFFLINE_ACCESS_SCOPE,
        label: "Stay connected (refresh access)",
        sensitive: false,
        tools: [],
    },
]);

export const SUPPORTED_SCOPES = Object.freeze(MCP_SCOPES.map((s) => s.scope));
const SCOPE_BY_NAME = new Map(MCP_SCOPES.map((s) => [s.scope, s]));

// RFC 9728 / MCP 2026-07-28: offline_access is not advertised by the protected resource, only by the
// authorization server metadata.
export const RESOURCE_SCOPES = Object.freeze(SUPPORTED_SCOPES.filter((s) => s !== OFFLINE_ACCESS_SCOPE));

// Used when a client asks for no scope at all: every read scope plus refresh
export const DEFAULT_REQUESTED_SCOPES = Object.freeze(
    MCP_SCOPES.filter((s) => s.scope.endsWith(":read") || s.scope === OFFLINE_ACCESS_SCOPE).map((s) => s.scope)
);

// Never reachable over MCP, whatever the token's scopes (server, database, sandbox, platform accounts,
// paid generation, AI settings/skills and every staff or platform tool).
export const MCP_NEVER_EXPOSE = Object.freeze(new Set([
    "execute_terminal_command", "ubuntu", "unified_db_query", "read_server_logs", "get_server_status", "read_local_file",
    "read_sandbox_file", "run_code", "manage_rag_document", "search_knowledge_base", "search_syllabus_vectors",
    "supabase_connector", "vercel_connector", "sanity_connector", "aws_ses_connector",
    "whatsapp_business_connector", "facebook_connector", "instagram_connector", "send_whatsapp_message",
    "generate_image", "edit_image", "transcribe_audio",
    "update_ai_preferences", "create_skill", "update_skill", "delete_skill",
    // staff / platform data
    "list_organizations", "read_organization_details", "get_organization_info", "list_global_users",
    "count_organization_users", "list_recent_users", "list_department_admins",
    "list_blog_subscribers", "count_blog_subscribers", "list_pending_support_tickets",
    // ERP organization stats
    "get_student_count", "get_teacher_count", "get_fee_collection_stats", "list_pending_fee_defaulters",
    "get_today_attendance_stats", "list_active_classrooms", "list_recent_exams", "list_pending_leave_requests",
    "get_admission_stats",
]));

// Whole staff tool families (leads, support tickets, Classgrid Talk admin, org/global data), matched by
// plain substring so a new tool in one of them is denied too.
const NEVER_EXPOSE_NAME_PARTS = Object.freeze([
    "support_ticket", "classgrid_talk", "lead_", "_lead", "blog_subscriber", "organization", "global_user",
]);

export function isNeverExposed(toolName) {
    const name = String(toolName || "");
    return MCP_NEVER_EXPOSE.has(name) || NEVER_EXPOSE_NAME_PARTS.some((part) => name.includes(part));
}

const TOOL_SCOPE = new Map();
for (const entry of MCP_SCOPES) {
    for (const tool of entry.tools) if (!TOOL_SCOPE.has(tool)) TOOL_SCOPE.set(tool, entry.scope);
}

// The scope a tool needs, or null when the tool is not exposed over MCP at all
export function requiredScopeForTool(toolName) {
    if (isNeverExposed(toolName)) return null;
    return TOOL_SCOPE.get(String(toolName || "")) || null;
}

export function isToolAllowedForScopes(toolName, scopes) {
    const needed = requiredScopeForTool(toolName);
    return Boolean(needed) && Array.isArray(scopes) && scopes.includes(needed);
}

// Every tool the given scopes unlock (never includes a denied tool)
export function toolsForScopes(scopes) {
    const allowed = new Set();
    for (const scope of Array.isArray(scopes) ? scopes : []) {
        const entry = SCOPE_BY_NAME.get(scope);
        if (!entry) continue;
        for (const tool of entry.tools) if (!isNeverExposed(tool)) allowed.add(tool);
    }
    return allowed;
}

/**
 * Safety check for the MCP route's startup. Returns a list of problems (empty = safe):
 *   - a scope lists a denied tool
 *   - a tool sits in two scopes
 *   - (when availableToolNames is given) a scope lists a tool that does not exist
 */
export function findScopeMapProblems(availableToolNames = null) {
    const problems = [];
    const seen = new Map();
    const available = availableToolNames ? new Set(availableToolNames) : null;
    for (const entry of MCP_SCOPES) {
        for (const tool of entry.tools) {
            if (isNeverExposed(tool)) problems.push(`${tool} (${entry.scope}) is on the never-expose list`);
            if (seen.has(tool)) problems.push(`${tool} is in both ${seen.get(tool)} and ${entry.scope}`);
            else seen.set(tool, entry.scope);
            if (available && !available.has(tool)) problems.push(`${tool} (${entry.scope}) is not a known tool`);
        }
    }
    return problems;
}

export function assertScopeMapSafe(availableToolNames = null) {
    const problems = findScopeMapProblems(availableToolNames);
    if (problems.length) throw new Error(`Unsafe MCP scope map: ${problems.join("; ")}`);
}

const MAX_SCOPE_ITEMS = 32;
const MAX_SCOPE_LENGTH = 64;

/**
 * Parses an OAuth "scope" value (space separated string, or an array). No regex on purpose.
 * Returns { scopes, unknown, tooLong }: scopes are the known ones, de-duplicated, in the canonical order
 * of MCP_SCOPES; unknown ones are reported and dropped.
 */
export function parseScopeParam(value) {
    const raw = Array.isArray(value) ? value.join(" ") : (typeof value === "string" ? value : "");
    const items = raw.split(" ").map((s) => s.trim()).filter(Boolean);
    const tooLong = items.length > MAX_SCOPE_ITEMS || items.some((s) => s.length > MAX_SCOPE_LENGTH);
    const wanted = new Set(items.slice(0, MAX_SCOPE_ITEMS));
    const scopes = SUPPORTED_SCOPES.filter((s) => wanted.has(s));
    const unknown = [...wanted].filter((s) => !SCOPE_BY_NAME.has(s)).map((s) => s.slice(0, MAX_SCOPE_LENGTH));
    return { scopes, unknown, tooLong };
}

// Keeps only supported scopes that are also in `allowed`, in canonical order
export function intersectScopes(scopes, allowed) {
    const want = new Set(Array.isArray(scopes) ? scopes : []);
    const allow = new Set(Array.isArray(allowed) ? allowed : []);
    return SUPPORTED_SCOPES.filter((s) => want.has(s) && allow.has(s));
}

export const scopesToString = (scopes) => (Array.isArray(scopes) ? scopes.join(" ") : "");

// Always granted when the app asks for it (the user can't untick it): the app needs to know whose account it is
export const LOCKED_SCOPES = Object.freeze(["profile:read"]);

// Granted scopes = the ticked ones plus the locked ones the app asked for, all within what it asked for
export function grantScopes(ticked, requested) {
    const req = Array.isArray(requested) ? requested : [];
    const locked = LOCKED_SCOPES.filter((s) => req.includes(s));
    return intersectScopes([...(Array.isArray(ticked) ? ticked : []), ...locked], req);
}

// For the consent page: label and default tick for each scope (locked = always on, box disabled)
export function describeScopes(scopes) {
    return intersectScopes(scopes, SUPPORTED_SCOPES).map((scope) => {
        const entry = SCOPE_BY_NAME.get(scope);
        const locked = LOCKED_SCOPES.includes(scope);
        return { scope, label: entry.label, sensitive: entry.sensitive, defaultChecked: locked || !entry.sensitive, locked };
    });
}
