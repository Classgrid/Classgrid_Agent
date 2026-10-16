// Per-message tool loading for the AI chat.
//
// The chat used to send all ~130 tool definitions with every message (~15-19k tokens). Now a message gets
// the small CORE set plus only the groups it needs:
//   - groups whose keywords match the message (English, Hinglish, Hindi),
//   - groups switched on by attachments,
//   - groups used in the last few turns of the same chat ("sticky"),
//   - anything the model asks for itself with load_tools (and, on Claude, the built-in tool search).
// No tool is removed: every tool still exists and can be loaded. Staff-only groups are offered only to
// users whose database role is super_admin or co_super_admin.
// Design and measurements: docs/AI_TOKEN_ROOT_CAUSE.md, docs/AI_TOKEN_CUT_DESIGN.md.

export const LOAD_TOOLS_NAME = "load_tools";

// Always sent, every user.
export const CORE_TOOL_NAMES = [
    "get_my_profile",
    "recall_session_context",
    "recall_chat",
    "search_recall_chat",
    "open_integration_panel",
    "get_timezone_time",
    "search_web",
    "open_url",
    "search_knowledge_base",
    "warn_user",
    "end_conversation",
];

// Tool definitions with no handler behind them: every call fails today, so they are not offered.
const TOOLS_WITHOUT_HANDLER = new Set(["update_skill", "update_ai_preferences", "search_syllabus_vectors", "read_local_file"]);

const STAFF_ROLES = new Set(["super_admin", "co_super_admin"]);
export const isStaffRole = (role) => STAFF_ROLES.has(role);

// Generic words that mean "mail" or "meeting" load every connected mail or meeting provider.
const MAIL_MEETING = String.raw`mail|inbox|unread|meeting|meet|calendar`;

// Fixed order: the loaded tool list is always built in this order so the cacheable prefix stays stable.
export const TOOL_GROUPS = [
    {
        id: "skills_prefs",
        description: "Create, list, read and delete the user's saved AI skills and preferences.",
        tools: ["create_skill", "list_skills", "read_skill", "delete_skill"],
        pattern: /\b(skills?|preferences?|prefer|remember|from\s+now\s+on|always\s+(reply|respond|answer)|tone|style|about\s+me|personali[sz]e|custom\s+instruction|yaad\s*rakh\w*)\b/i,
    },
    {
        id: "schedules",
        description: "Create, list, edit and delete scheduled tasks, reminders and recurring jobs.",
        tools: ["create_schedule", "edit_schedule_time", "edit_schedule_title", "edit_schedule_email_subject", "edit_schedule_email_body", "edit_schedule_summary", "edit_schedule_description", "edit_schedule_action_info", "delete_schedule_attachment", "delete_schedule", "list_schedules"],
        pattern: /\b(schedul\w*|remind\w*|alarm|recurring|every\s+(day|week|month|morning|evening|night|mon|tue|wed|thu|fri|sat|sun)\w*|daily|weekly|monthly|tomorrow|tonight|kal|parso|subah|shaam|raat|baje|\d{1,2}(:\d{2})?\s*(am|pm|baje)|yaad\s*dila\w*|automat\w*|cron)\b|याद|रिमाइंडर|शेड्यूल|बजे|कल/i,
    },
    {
        id: "grid_chat",
        description: "The Grid 1:1 chats: list grids and threads, read and send messages, share files, find users.",
        tools: ["list_chat_threads", "list_grids", "read_chat_messages", "send_chat_message", "upload_file_to_chat", "get_chat_attachment_url", "search_users_for_chat"],
        pattern: /\b(grids?|chats?|dm|direct\s+message|inbox|thread|send\s+(a\s+)?(message|msg)|msg|message\s+(to|bhej\w*)|bhej\s*do|bol\s*do|bata\s*do|baat\s*kar\w*)\b|मैसेज|संदेश|भेज/i,
    },
    {
        id: "grid_groups",
        description: "The Grid group chats: read and send group messages, announcements, polls and members.",
        tools: ["list_group_chats", "read_group_chat_details", "read_group_chat_messages", "send_group_chat_message", "get_group_chat_attachment_url", "upload_file_to_group_chat", "send_group_announcement", "list_group_polls", "read_group_poll_details", "create_group_poll", "list_group_members", "count_group_members"],
        pattern: /\b(groups?|announce\w*|polls?|vote|voting|members?|sab\s*ko|sabko)\b|ग्रुप|घोषणा|पोल/i,
    },
    {
        id: "erp_stats",
        description: "The user's organization: students, teachers, fees, attendance, classrooms, exams, admissions, leave requests.",
        tools: ["get_organization_info", "get_student_count", "get_teacher_count", "list_recent_users", "get_fee_collection_stats", "list_pending_fee_defaulters", "get_today_attendance_stats", "list_active_classrooms", "list_recent_exams", "list_pending_support_tickets", "list_pending_leave_requests", "get_admission_stats", "list_recent_leads", "list_department_admins"],
        pattern: /\b(students?|teachers?|staff|faculty|fees?|defaulters?|dues?|attendance|present|absent|classrooms?|classes|exams?|results?|marks|admissions?|enquir\w*|leaves?|department|hod|dashboard|stats?|statistics|kitne|kitna|bachch?(e|on)|chhatr\w*|shikshak|ha+z+ri|hajri|baaki)\b|छात्र|विद्यार्थी|शिक्षक|फीस|हाज़िरी|हाजिरी|उपस्थिति|परीक्षा|प्रवेश/i,
        needsOrg: true,
    },
    {
        id: "database",
        description: "Query the database with the access rules of the user's role.",
        tools: ["unified_db_query"],
        pattern: /\b(db|database|mongo\w*|redis|sql|query|collections?|schema|records?|table|rows?)\b/i,
    },
    {
        id: "files_docs",
        description: "Read documents, transcribe audio, generate PDFs and upload files to the CDN.",
        tools: ["parse_document", "transcribe_audio", "upload_file_to_cdn", "generate_pdf", "generate_pdf_from_db"],
        pattern: /\b(pdf|docx?|word|pptx?|slides?|presentation|document|files?|attach\w*|upload\w*|download\w*|cdn|transcri\w*|audio|voice|recording|mp3|wav|ocr|scan\w*|certificate|letter|marksheet|report\s*card|question\s*paper|worksheet|notes)\b|पीडीएफ|फ़ाइल|फाइल|दस्तावेज़/i,
        onAttachment: true,
    },
    {
        id: "image_media",
        description: "Generate images and analyze images by URL.",
        tools: ["generate_image", "analyze_image"],
        pattern: /\b(images?|photos?|pictures?|pics?|poster|banner|logo|thumbnail|illustrat\w*|draw\w*|art|screenshot|tasve?e?r|tasvir)\b|फोटो|तस्वीर|चित्र/i,
        // Any attachment: an image can arrive with an empty or unusual type (e.g. HEIC).
        onAttachment: true,
    },
    {
        id: "code_sandbox",
        description: "Run Python, JavaScript or bash in the sandbox, read sandbox files, upload sandbox files to the CDN, build websites and report plan progress.",
        tools: ["run_code", "read_sandbox_file", "upload_sandbox_file_to_cdn", "update_plan_step"],
        pattern: /\b(run|execute|python|code|script|program|javascript|node(js)?|bash|shell|sandbox|compile|debug|pandas|numpy|matplotlib|plot|graph|chart|csv|excel|xlsx|spreadsheet|calculat\w*|compute|simulat\w*|website|landing\s*page|html|chala\w*|likh\w*)\b|```|कोड|चलाओ/i,
    },
    {
        id: "code_project",
        description: "List, read, search, create and edit files of the Project Mode project open in this chat, and push it to GitHub.",
        tools: ["list_project_files", "view_project_file", "search_project", "write_project_file", "edit_project_file", "push_project_to_github"],
        pattern: /\b(project|repo\w*|files?|folders?|edit\w*|lines?|functions?|components?|imports?|push\w*|commits?|git\s*hub|refactor\w*|bug|fix\w*|code)\b/i,
    },
    {
        id: "email_messaging",
        description: "Send emails and WhatsApp messages.",
        tools: ["send_email", "send_whatsapp_message"],
        pattern: /\b(e-?mails?|mail\s+(to|kar\w*|bhej\w*)|send\s+mail|whats\s*app|sms|notify|parents?\s+ko)\b|ईमेल|मेल|व्हाट्सएप/i,
    },
    // Connector groups: only offered when that integration is connected (its tool is in the list).
    { id: "connector:google", description: "Google Workspace: Gmail, Drive, Docs, Sheets, Calendar, Meet, Classroom.", tools: ["google_workspace_connector"], pattern: new RegExp(String.raw`\b(g-?mail|google|g?drive|docs?|sheets?|classroom|${MAIL_MEETING})\b`, "i") },
    { id: "connector:microsoft", description: "Microsoft 365: Outlook, OneDrive, Teams, SharePoint.", tools: ["microsoft_workspace_connector"], pattern: new RegExp(String.raw`\b(outlook|microsoft|ms\s*365|office\s*365|onedrive|teams|sharepoint|hotmail|${MAIL_MEETING})\b`, "i") },
    { id: "connector:zoom", description: "Zoom meetings.", tools: ["zoom_connector"], pattern: /\b(zoom|meetings?|meet|video\s*call)\b/i },
    { id: "connector:slack", description: "Slack messages and channels.", tools: ["slack_workspace_connector"], pattern: /\b(slack|channels?)\b/i },
    { id: "connector:github", description: "GitHub repositories, commits, pull requests and branches.", tools: ["github_workspace_connector"], pattern: /\b(git\s*hub|repo\w*|commits?|pull\s*request|pr|branch|push)\b/i },
    { id: "connector:vercel", description: "Vercel deployments, projects and domains.", tools: ["vercel_connector"], pattern: /\b(vercel|deploy\w*|hosting|domain|live\s*kar\w*)\b/i },
    { id: "connector:notion", description: "Notion pages and databases.", tools: ["notion_connector"], pattern: /\b(notion|wiki)\b/i },
    { id: "connector:youtube", description: "YouTube channel, videos and analytics.", tools: ["youtube_connector"], pattern: /\b(you\s*tube|yt|videos?|views|subscribers)\b/i },
    { id: "connector:supabase", description: "Supabase projects and SQL.", tools: ["supabase_connector"], pattern: /\b(supa\s*base|postgres|sql)\b/i },
    { id: "connector:sanity", description: "Sanity CMS content.", tools: ["sanity_connector"], pattern: /\b(sanity|cms|blog\s*posts?)\b/i },
    { id: "connector:facebook", description: "Facebook pages and posts.", tools: ["facebook_connector"], pattern: /\b(facebook|fb|meta)\b/i },
    { id: "connector:instagram", description: "Instagram posts, reels and stories.", tools: ["instagram_connector"], pattern: /\b(insta(gram)?|ig|reels?|stor(y|ies))\b/i },
    { id: "connector:whatsapp_business", description: "WhatsApp Business messages.", tools: ["whatsapp_business_connector"], pattern: /\bwhats\s*app\b/i },
    { id: "connector:aws_ses", description: "AWS SES email sending.", tools: ["aws_ses_connector"], pattern: /\b(ses|aws\s*email)\b/i },
    // Staff-only groups (database role super_admin / co_super_admin).
    {
        id: "internal_ops",
        description: "STAFF: run terminal commands on the sandbox and read server logs.",
        tools: ["execute_terminal_command", "read_server_logs", "get_server_status"],
        pattern: /\b(logs?|terminal|ssh|env|ec2|aws|r2|bucket|infra|server|pm2|crash\w*|errors?)\b/i,
        staffOnly: true,
    },
    {
        id: "internal_support",
        description: "STAFF: support tickets and Classgrid Talk conversations.",
        tools: ["list_support_tickets", "read_support_ticket_details", "update_support_ticket_status", "close_support_ticket", "reopen_support_ticket", "assign_support_ticket", "reply_support_ticket", "attach_file_to_support_ticket", "edit_support_ticket_reply", "add_internal_note_to_support_ticket", "read_support_ticket_draft", "save_support_ticket_draft", "delete_support_ticket_draft", "delete_support_ticket",
            "list_classgrid_talks", "read_classgrid_talk_details", "update_classgrid_talk_status", "close_classgrid_talk", "reopen_classgrid_talk", "assign_classgrid_talk", "reply_classgrid_talk", "attach_file_to_classgrid_talk", "edit_classgrid_talk_reply", "add_internal_note_to_classgrid_talk", "read_classgrid_talk_draft", "save_classgrid_talk_draft", "delete_classgrid_talk_draft", "delete_classgrid_talk"],
        pattern: /\b(tickets?|support|complain\w*|helpdesk|talks?|escalat\w*|shikayat)\b|शिकायत/i,
        staffOnly: true,
    },
    {
        id: "internal_crm",
        description: "STAFF: sales leads and CRM: list, assign, update, vet, provision, delete leads.",
        tools: ["list_leads", "read_lead_details", "assign_lead", "update_lead_info", "update_lead_meeting_notes", "schedule_lead_meeting", "request_lead_vetting_approval", "approve_lead_and_provision", "delete_lead"],
        pattern: /\b(leads?|crm|prospects?|demo|vetting|provision\w*|onboard\w*|sales|pipeline)\b/i,
        staffOnly: true,
    },
    {
        id: "internal_platform",
        description: "STAFF: all organizations and all users on the platform (latest sign-ups), and blog subscribers.",
        tools: ["list_organizations", "get_organization_info", "list_global_users", "read_organization_details", "count_organization_users", "list_blog_subscribers", "count_blog_subscribers"],
        pattern: /\b(organi[sz]ations?|orgs?|institutes?|tenants?|subdomains?|subscribers?|newsletter|users?|sign-?ups?|signed up|joined|new accounts?)\b/i,
        staffOnly: true,
    },
];

const GROUP_BY_ID = new Map(TOOL_GROUPS.map((g) => [g.id, g]));
const GROUP_OF_TOOL = new Map(TOOL_GROUPS.flatMap((g) => g.tools.map((t) => [t, g.id])));

const toolName = (t) => t?.function?.name;
const IMAGE_MIME = /^image\//i;

/**
 * Decides which tools to send for this message.
 * @param allTools   every tool the user may have (connectors already filtered to connected ones)
 * @param text       the user's message (plus attachment names)
 * @param attachments body.attachments
 * @param stickyGroupIds groups used in the last turns of this chat
 * @param role       database role of the user
 * @param hasOrg     the user belongs to an organization
 * @param email      the user's email; staff-only (internal) tools also need an @classgrid.in address
 */
export function planToolsForMessage({ allTools, text = "", attachments = [], stickyGroupIds = [], role, hasOrg, email }) {
    // Internal tools (server logs, terminal, support tickets, Classgrid Talk, leads, all organizations) need BOTH
    // a staff role and an @classgrid.in email, so a staff role alone never unlocks them.
    const staff = isStaffRole(role) && String(email || "").trim().toLowerCase().endsWith("@classgrid.in");
    const present = new Set(allTools.map(toolName));

    // Groups this user may load at all.
    const allowedGroups = TOOL_GROUPS.filter((g) =>
        (!g.staffOnly || staff) && (!g.needsOrg || hasOrg) && g.tools.some((t) => present.has(t))
    );
    const allowedIds = new Set(allowedGroups.map((g) => g.id));

    // Tools that belong to no group (e.g. a tool added later) are always loaded, so nothing disappears silently.
    const ungrouped = allTools.filter((t) => !GROUP_OF_TOOL.has(toolName(t)) && !CORE_TOOL_NAMES.includes(toolName(t)) && !TOOLS_WITHOUT_HANDLER.has(toolName(t)));

    // NFC so Hindi written with a precomposed nukta letter matches the patterns.
    const normalizedText = String(text).normalize("NFC");
    const matched = new Set(); // matched by this message itself (keywords or attachments), not by stickiness
    for (const g of allowedGroups) if (g.pattern.test(normalizedText)) matched.add(g.id);
    if (attachments.length > 0) for (const g of allowedGroups) if (g.onAttachment) matched.add(g.id);
    if (attachments.some((a) => IMAGE_MIME.test(String(a?.mimeType || "")))) for (const g of allowedGroups) if (g.onImageAttachment) matched.add(g.id);
    const active = new Set(matched);
    for (const id of stickyGroupIds) if (allowedIds.has(id)) active.add(id);

    const loadedNames = new Set(CORE_TOOL_NAMES.filter((n) => present.has(n)));
    for (const t of ungrouped) loadedNames.add(toolName(t));
    for (const g of allowedGroups) if (active.has(g.id)) for (const t of g.tools) if (present.has(t)) loadedNames.add(t);
    loadedNames.add(LOAD_TOOLS_NAME);

    // Every tool the user may use (for Claude's deferred list and for load_tools); staff-only and broken
    // tools are left out entirely for users who can't use them.
    const allowedToolNames = new Set([
        ...CORE_TOOL_NAMES.filter((n) => present.has(n)),
        ...ungrouped.map(toolName),
        ...allowedGroups.flatMap((g) => g.tools.filter((t) => present.has(t))),
        LOAD_TOOLS_NAME,
    ]);

    // matchedGroupIds refresh the sticky memory; sticky-only groups are allowed to age out.
    return { staff, allowedGroups, activeGroupIds: [...active], matchedGroupIds: [...matched], loadedNames, allowedToolNames };
}

/** The load_tools tool definition, listing only the groups this user may load. */
export function buildLoadToolsTool(allowedGroups) {
    return {
        type: "function",
        function: {
            name: LOAD_TOOLS_NAME,
            description: "Load more tools. Only a few tools are loaded at the start of each message. If the user asks for something and the tool for it isn't loaded, call this with the group(s) you need, then use the tools on your next step. Never tell the user you can't do something before trying this. Groups: " +
                allowedGroups.map((g) => `${g.id} = ${g.description}`).join(" | "),
            parameters: {
                type: "object",
                properties: {
                    groups: { type: "array", items: { type: "string", enum: allowedGroups.map((g) => g.id) }, description: "Group ids to load." },
                },
                required: ["groups"],
            },
        },
    };
}

/**
 * Orders a tool list: core first, then groups in their fixed order, then anything else. Keeps the request
 * prefix stable for a given set of loaded groups.
 */
export function orderTools(tools) {
    const rank = (name) => {
        const core = CORE_TOOL_NAMES.indexOf(name);
        if (core >= 0) return core;
        if (name === LOAD_TOOLS_NAME) return CORE_TOOL_NAMES.length;
        const g = GROUP_OF_TOOL.get(name);
        return g ? 100 + TOOL_GROUPS.findIndex((x) => x.id === g) : 1000;
    };
    return [...tools].sort((a, b) => rank(toolName(a)) - rank(toolName(b)));
}

export function groupOfTool(name) {
    return GROUP_OF_TOOL.get(name) || null;
}

export function getGroup(id) {
    return GROUP_BY_ID.get(id) || null;
}

// ---------------------------------------------------------------------------------------------------------
// Prompt blocks follow their tool groups. In the system prompt a block is wrapped as <<G:tags>>...<</G>>
// (see promptBlock below). Tags:
//   a|b|c        sent when any of these groups is loaded ("connector:*" = any connector group)
//   cf+...       only for Cloudflare models (DeepSeek and co.), claude+... only for Claude
//   staff+...    only for staff (database role super_admin / co_super_admin)
//   cf / claude / staff on their own: that condition alone
//   off          kept in the code, never sent (exact duplicates, rules for tools that have no handler)
// Untagged text is always sent.
const BLOCK_RE = /<<G:([^>]+)>>([\s\S]*?)<<\/G>>/g;

export const promptBlock = (tags, text) => `<<G:${tags}>>${text}<</G>>`;

function blockApplies(tags, { activeGroups, isClaude, isStaff }) {
    if (tags === "off") return false;
    const parts = tags.split("+");
    const groupPart = parts.pop();
    const conditions = parts;
    // A part that is itself a condition word ("cf", "claude", "staff") with no groups after it.
    const groupList = ["cf", "claude", "staff"].includes(groupPart) ? (conditions.push(groupPart), []) : groupPart.split("|");
    for (const c of conditions) {
        if (c === "cf" && isClaude) return false;
        if (c === "claude" && !isClaude) return false;
        if (c === "staff" && !isStaff) return false;
    }
    if (groupList.length === 0) return true;
    return groupList.some((g) => g === "connector:*" ? [...activeGroups].some((a) => a.startsWith("connector:")) : activeGroups.has(g));
}

/** Keeps the blocks whose tags match, drops the rest, and removes the markers. */
export function filterPromptBlocks(text, ctx) {
    return String(text || "").replace(BLOCK_RE, (_, tags, body) => (blockApplies(tags, ctx) ? body : ""));
}

/** The prompt text of blocks that become relevant when `groupIds` are loaded mid-answer (for load_tools). */
export function promptBlocksForGroups(text, groupIds, ctx) {
    const before = new Set(ctx.activeGroups);
    const after = new Set([...before, ...groupIds]);
    const out = [];
    for (const m of String(text || "").matchAll(BLOCK_RE)) {
        const [, tags, body] = m;
        if (!blockApplies(tags, { ...ctx, activeGroups: before }) && blockApplies(tags, { ...ctx, activeGroups: after })) out.push(body.trim());
    }
    return out.join("\n\n");
}

// Sticky groups: a group stays loaded for STICKY_TURNS user messages after it was last matched or used.
export const STICKY_TURNS = 3;
export const stickyKey = (sessionId) => `ai:groups:${sessionId}`;

/** Ages the stored {groupId: turnsSinceUse} map by one turn and returns the ids still sticky. */
export function ageSticky(stored) {
    const out = {};
    for (const [id, age] of Object.entries(stored || {})) {
        if (typeof age === "number" && age + 1 <= STICKY_TURNS) out[id] = age + 1;
    }
    return out;
}
