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
 * =========================================================================================
 * 🚨 CRITICAL AI & SYSTEM RULE 🚨
 * NO FRONTEND GITHUB ACTIONS: NEVER create yaml files that build/deploy the frontend to EC2.
 * The frontend is hosted 100% on Vercel. EC2 is only for the backend.
 * =========================================================================================
 */

/*
 * =========================================================================================
 * STRICT SECURITY POLICY:
 * NO ONE CAN EVER CHANGE THE ORGANIZATION TYPE FROM THE FRONTEND OR BACKEND.
 * NEVER ADD A DROPDOWN OR OPTION TO CHANGE IT ANYWHERE IN THE CODEBASE.
 * NO MEANS NO. THIS IS A FIXED PLATFORM RULE.
 * =========================================================================================
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 CRITICAL AI AND SYSTEM RULES 🚨
 * 1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
 * 2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
 * 3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 NAMING CONVENTION RULE 🚨
 * 1. "CLASSGRID PLATFORM" is strictly the REPO NAME.
 * 2. chat.classgrid.in (Classgrid AI) is the actual PRODUCT. The ERP is shut down.
 * 3. NEVER use "Classgrid Platform" anywhere in the frontend UI or user-facing text.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 HOSTING & ARCHITECTURE RULE 🚨
 * 1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
 * 2. FRONTEND IS HOSTED ON VERCEL
 * ─────────────────────────────────────────────────────────
 */

import mongoose from "mongoose";
import FeatureFlag from "../models/FeatureFlag.js";

/*
 * Feature flags (kill switches) for Classgrid AI.
 *
 * Every user-facing feature has one flag below. The super admin turns a flag off on the Feature flags page
 * (superadmin.classgrid.in/superadmin/feature-flags) and the feature stops for everyone within a few seconds:
 *   - its HTTP entry points (routes below) answer 423 with { code: "feature_off", feature, error, message }
 *     (423, not 403: the chat page treats 403 as a ban; not 503: the apps then switch to the rescue server);
 *   - its AI tools (tools below) are taken out of the chat's tool list, so the AI simply does not use them;
 *   - the places that are not HTTP requests (the schedule worker, sign-up through Google, the model picked in
 *     the chat) ask isFeatureOn / offFeatures themselves.
 * A flag with no document in the database is on. Nothing here writes to the database: a document is made only
 * when the super admin switches a flag (super-admin.controller.js, toggleFeatureFlag).
 * The super admin pages (/api/super-admin) and payment receipts (webhooks, /api/ai/topup/verify, /api/billing)
 * are never gated, so a flag can always be turned back on and paid orders are always recorded.
 */

export const FEATURE_GROUPS = Object.freeze([
    { id: "chat", label: "Chat and models" },
    { id: "voice", label: "Voice" },
    { id: "images", label: "Images" },
    { id: "studio", label: "Studio and projects" },
    { id: "docs", label: "Docs and pages" },
    { id: "messaging", label: "WhatsApp and email" },
    { id: "payments", label: "Payments and sign-up" },
    { id: "other", label: "Other" },
]);

const ANY = null; // a route rule for every method
const route = (methods, path) => ({ methods, path });

// The terminal tools: on Classgrid's cloud computer in the website and phone app, on the user's own computer in the
// desktop app (a chat with no project, or a project in a folder on the computer). So they belong to "Cloud sandbox"
// or to "Desktop computer tools" depending on where the chat runs (toolOffBy, onComputer).
const TERMINAL_TOOLS = ["execute_terminal_command", "start_background_command", "check_background_command", "stop_background_command", "send_background_input", "wait_until"];

export const FEATURE_FLAG_CATALOG = Object.freeze([
    // ── Chat and models ────────────────────────────────────────────────────────────
    {
        key: "chat",
        name: "AI chat",
        group: "chat",
        description: "Every message to Classgrid AI: website, desktop app, phone app, schedules and tasks.",
        message: "Classgrid AI chat is turned off for now. Please try again later.",
        // routes/ai.routes.js:121 POST /api/ai/ask -> controllers/ai-chat.controller.js streamAskAi
        routes: [route(["POST"], /^\/api\/ai\/ask$/)],
    },
    {
        key: "model_auto",
        name: "Auto model",
        group: "chat",
        description: "Classgrid AI picks the model for each message (DeepSeek or GLM).",
        message: "Auto is turned off for now. Please pick a model in the model menu, or try again later.",
        // checked in streamAskAi (ai-chat.controller.js) from body.selectedModel
    },
    {
        key: "model_claude",
        name: "Claude models",
        group: "chat",
        description: "Claude Haiku, Sonnet and Opus when picked in the model menu.",
        message: "Claude models are turned off for now. Please pick another model, or try again later.",
    },
    {
        key: "model_fable",
        name: "Claude Fable",
        group: "chat",
        description: "Claude Fable (all versions) when picked in the model menu.",
        message: "Claude Fable is turned off for now. Please pick another model, or try again later.",
    },
    {
        key: "model_open",
        name: "Other models",
        group: "chat",
        description: "DeepSeek, GLM, GPT-OSS, Qwen, Gemma, Llama and Mistral when picked by name.",
        message: "This model is turned off for now. Please pick another model, or try again later.",
    },
    {
        key: "web_search",
        name: "Web search",
        group: "chat",
        description: "The AI searches the web and opens web pages while it answers.",
        message: "Web search is turned off for now. Please try again later.",
        tools: ["search_web", "open_url"],
    },
    {
        key: "file_uploads",
        name: "File uploads and reading",
        group: "chat",
        description: "Attaching files and pictures, the file library, and the AI reading documents.",
        message: "File uploads are turned off for now. Please try again later.",
        // routes/ai.routes.js:302, routes/upload.routes.js:86 and :120, routes/ai-library.routes.js:39
        routes: [
            route(["POST"], /^\/api\/ai\/upload$/),
            route(["POST"], /^\/api\/upload\/(image|presigned-url)$/),
            route(["POST"], /^\/api\/ai\/library\/upload$/),
        ],
        tools: ["parse_document"],
    },
    {
        key: "file_making",
        name: "Making files",
        group: "chat",
        description: "The AI makes and edits PDF, Word, Excel and PowerPoint files and shares file links.",
        message: "Making files is turned off for now. Please try again later.",
        tools: ["generate_pdf", "generate_pdf_from_db", "make_office_file", "edit_pdf", "edit_office_file", "upload_file_to_cdn"],
    },
    {
        key: "helpers",
        name: "Helpers",
        group: "chat",
        description: "The AI starts helper agents and workflows that work at the same time.",
        message: "Helpers are turned off for now. Please try again later.",
        tools: ["run_project_helpers", "message_helper", "check_helpers", "define_helper", "stop_helpers", "run_workflow"],
    },
    {
        key: "sandbox",
        name: "Cloud sandbox",
        group: "chat",
        description: "The AI runs code and terminal commands on Classgrid's cloud computer.",
        message: "Running code in the cloud is turned off for now. Please try again later.",
        tools: ["read_sandbox_file", "upload_sandbox_file_to_cdn", "view_image"],
        cloudTools: ["run_code", ...TERMINAL_TOOLS],
    },
    {
        key: "connectors",
        name: "Plugins",
        group: "chat",
        description: "Built-in plugins: Google, Microsoft, GitHub, Slack, Notion, Canva and the others.",
        message: "Plugins are turned off for now. Please try again later.",
        // routes/ai-integrations.routes.js:150 GET /api/ai-integrations/connect/:id
        routes: [route(["GET"], /^\/api\/ai-integrations\/connect\/[^/]+$/)],
        tools: ["open_integration_panel"],
        toolPattern: /^(?!custom_mcp_connector$)[a-z0-9_]+_connector$/,
    },
    {
        key: "custom_plugins",
        name: "Custom plugins (MCP)",
        group: "chat",
        description: "MCP servers people add themselves as plugins.",
        message: "Custom plugins are turned off for now. Please try again later.",
        // routes/custom-mcp.routes.js:24, :55, :64, :98, :107 (listing, removing and signing out keep working)
        routes: [
            route(["GET"], /^\/api\/custom-mcp\/oauth\/callback$/),
            route(["POST"], /^\/api\/custom-mcp$/),
            route(["PATCH"], /^\/api\/custom-mcp\/[^/]+$/),
            route(["POST"], /^\/api\/custom-mcp\/[^/]+\/refresh$/),
            route(["GET"], /^\/api\/custom-mcp\/[^/]+\/login$/),
        ],
        tools: ["custom_mcp_connector"],
    },

    // ── Voice ─────────────────────────────────────────────────────────────────────
    {
        key: "voice_mode",
        name: "Voice mode",
        group: "voice",
        description: "Talking with Classgrid AI voice to voice in the phone app.",
        message: "Voice mode is turned off for now. Please try again later.",
        // routes/ai.routes.js:141 POST /api/ai/voice/turn -> controllers/ai-voice.controller.js voiceTurn
        routes: [route(["POST"], /^\/api\/ai\/voice\/turn$/)],
    },
    {
        key: "read_aloud",
        name: "Read aloud",
        group: "voice",
        description: "Classgrid AI reads its answers out loud.",
        message: "Read aloud is turned off for now. Please try again later.",
        // routes/ai.routes.js:136 POST /api/ai/speak -> controllers/ai-speak.controller.js speakAnswer
        routes: [route(["POST"], /^\/api\/ai\/speak$/)],
    },
    {
        key: "voice_input",
        name: "Voice typing",
        group: "voice",
        description: "Speaking into the chat box (speech to text), and the AI turning audio files into text.",
        message: "Voice typing is turned off for now. Please type your message, or try again later.",
        // routes/voice.routes.js:247 POST /api/voice/transcribe
        routes: [route(["POST"], /^\/api\/voice\/transcribe$/)],
        tools: ["transcribe_audio"],
    },

    // ── Images (and video) ─────────────────────────────────────────────────────────
    {
        key: "image_generation",
        name: "Image making",
        group: "images",
        description: "Classgrid AI makes pictures from a description.",
        message: "Image making is turned off for now. Please try again later.",
        // routes/ai.routes.js:149 POST /api/ai/generate-image -> controllers/ai-chat.controller.js generateImage
        routes: [route(["POST"], /^\/api\/ai\/generate-image$/)],
        tools: ["generate_image"],
    },
    {
        key: "photo_editing",
        name: "Photo editing",
        group: "images",
        description: "The AI changes a picture the person sends or one it made.",
        message: "Photo editing is turned off for now. Please try again later.",
        tools: ["edit_image"],
    },
    {
        key: "video_making",
        name: "Video making",
        group: "images",
        description: "The AI makes short videos.",
        message: "Video making is turned off for now. Please try again later.",
        tools: ["make_video"],
    },

    // ── Studio and projects ──────────────────────────────────────────────────────
    {
        key: "studio",
        name: "Studio",
        group: "studio",
        description: "Studio mode: the agent workspace with the scratchpad, Agents board and screenshots.",
        message: "Studio is turned off for now. Please use a normal chat, or try again later.",
        // checked in streamAskAi (body.appMode "studio"); routes/ai.routes.js:282 GET /api/ai/studio/shots/:sessionId
        routes: [route(["GET"], /^\/api\/ai\/studio\/shots\/[^/]+$/)],
    },
    {
        key: "live_browser",
        name: "Live browser",
        group: "studio",
        description: "The AI opens websites and clicks and types in a live browser in Studio.",
        message: "The live browser is turned off for now. Please try again later.",
        // routes/ai.routes.js:286 PUT /api/ai/browser-sites; tools from services/studio-browser-tools.js
        routes: [route(["PUT"], /^\/api\/ai\/browser-sites$/)],
        toolPattern: /^browser_/,
    },
    {
        key: "projects",
        name: "Projects",
        group: "studio",
        description: "Project Mode chats and the Projects page: making, opening and syncing projects.",
        message: "Projects are turned off for now. Please try again later.",
        // routes/ide.routes.js (all of /api/ide); streamAskAi refuses Project Mode chats
        routes: [route(ANY, /^\/api\/ide(\/|$)/)],
    },
    {
        key: "code_editor",
        name: "Code editor",
        group: "studio",
        description: "The code editor in the browser that opens a project's files.",
        message: "The code editor is turned off for now. Please try again later.",
        // routes/ide.routes.js:56 GET /api/ide/check (the editor box lets nobody in without it)
        routes: [route(["GET"], /^\/api\/ide\/check$/)],
    },
    {
        key: "github_push",
        name: "GitHub push",
        group: "studio",
        description: "Pushing projects to GitHub and making repos for them.",
        message: "Pushing to GitHub is turned off for now. Please try again later.",
        // routes/ide.routes.js:848 and :1241
        routes: [route(["POST"], /^\/api\/ide\/projects\/[^/]+\/(push|push-here)$/)],
        tools: ["push_project_to_github", "create_github_repo_for_project", "update_project_github_repo"],
    },
    {
        key: "mastero",
        name: "Mastero",
        group: "studio",
        description: "Mastero reviews and finishes a project's code.",
        message: "Mastero is turned off for now. Please try again later.",
        // routes/ide.routes.js:1107, :1141 and :1226
        routes: [
            route(["POST"], /^\/api\/ide\/projects\/[^/]+\/(mastero|mastero-confirm)$/),
            route(["PUT"], /^\/api\/ide\/mastero-settings$/),
        ],
        tools: ["mastero_ask"],
    },
    {
        key: "cloud_deploy",
        name: "Classgrid Cloud sites",
        group: "studio",
        description: "The AI puts a website it built online on Classgrid Cloud.",
        message: "Putting sites on Classgrid Cloud is turned off for now. Please try again later.",
        tools: ["deploy_to_classgrid_cloud"],
    },
    {
        key: "desktop_computer",
        name: "Desktop computer tools",
        group: "studio",
        description: "In the desktop app the AI uses the person's computer: terminal, files, mouse and keyboard.",
        message: "Using your computer is turned off for now. Please try again later.",
        tools: ["computer", "computer_terminal", "read_local_file", "save_memory", "read_memory", "search_memory", "delete_memory"],
        computerTools: ["run_code", ...TERMINAL_TOOLS, "notebook_edit", "use_worktree", "write_project_file", "edit_project_file", "search_project", "find_project_files", "list_project_files"],
    },

    // ── Docs and pages ───────────────────────────────────────────────────────────
    {
        key: "live_docs",
        name: "Live docs",
        group: "docs",
        description: "Documents the AI writes that people read, edit and comment on.",
        message: "Live docs are turned off for now. Please try again later.",
        // routes/live-doc.routes.js (all of /api/docs)
        routes: [route(ANY, /^\/api\/docs(\/|$)/)],
        tools: ["create_doc", "read_doc", "edit_doc", "doc_comments", "list_my_docs"],
    },
    {
        key: "published_pages",
        name: "Published pages",
        group: "docs",
        description: "Web pages the AI publishes at chat.classgrid.in/p/...",
        message: "Published pages are turned off for now. Please try again later.",
        // routes/share-page.routes.js (all of /api/pages)
        routes: [route(ANY, /^\/api\/pages(\/|$)/)],
        tools: ["publish_page", "read_page", "page_comments"],
    },
    {
        key: "shared_chats",
        name: "Shared chats",
        group: "docs",
        description: "Sharing a chat by link, public share pages and Share Grid chats with other people.",
        message: "Sharing chats is turned off for now. Please try again later.",
        // routes/ai.routes.js:289, :291, :299; routes/ai-grid.routes.js (all of /api/ai/grid)
        routes: [
            route(["POST"], /^\/api\/ai\/sessions\/[^/]+\/(share|public-share)$/),
            route(["GET"], /^\/api\/ai\/shared\/[^/]+$/),
            route(ANY, /^\/api\/ai\/grid(\/|$)/),
        ],
    },
    {
        key: "grids",
        name: "Grids",
        group: "other",
        description: "Person-to-person and group chats (Grids), voice notes in them, and the AI's Grid tools.",
        message: "Grids are turned off for now. Please try again later.",
        // routes/thread_chat.routes.js (all of /api/threads but its cron), routes/group_chat.routes.js, routes/voice.routes.js:171
        routes: [
            route(ANY, /^\/api\/threads(?!\/cron\/)(\/|$)/),
            route(ANY, /^\/api\/group-chat(\/|$)/),
            route(["POST"], /^\/api\/voice\/send$/),
        ],
        tools: ["list_chat_threads", "list_grids", "read_chat_messages", "send_chat_message", "upload_file_to_chat", "get_chat_attachment_url", "search_users_for_chat",
            "list_group_chats", "read_group_chat_details", "read_group_chat_messages", "send_group_chat_message", "get_group_chat_attachment_url", "upload_file_to_group_chat", "send_group_announcement", "list_group_polls", "read_group_poll_details", "create_group_poll", "list_group_members", "count_group_members"],
    },

    // ── WhatsApp and email ───────────────────────────────────────────────────────
    {
        key: "schedules",
        name: "Schedules",
        group: "messaging",
        description: "Reminders and messages the AI schedules by WhatsApp and email. Off pauses them.",
        message: "Schedules are turned off for now. Please try again later.",
        // routes/ai-schedule.routes.js (all of /api/ai/schedules); workers/ai-schedule.worker.js waits while off
        routes: [route(ANY, /^\/api\/ai\/schedules(\/|$)/)],
        tools: ["create_schedule", "edit_schedule_time", "edit_schedule_title", "edit_schedule_email_subject", "edit_schedule_email_body", "edit_schedule_summary", "edit_schedule_description", "edit_schedule_action_info", "delete_schedule_attachment", "delete_schedule", "list_schedules"],
    },
    {
        key: "whatsapp_messages",
        name: "WhatsApp messages",
        group: "messaging",
        description: "The AI sends and reads WhatsApp messages, and schedules that go out by WhatsApp.",
        message: "WhatsApp messages are turned off for now. Please try again later.",
        // routes/whatsapp.routes.js:43 POST /api/whatsapp/connect
        routes: [route(["POST"], /^\/api\/whatsapp\/connect$/)],
        tools: ["send_whatsapp_message", "read_whatsapp_messages", "wait_for_whatsapp_reply"],
    },
    {
        key: "whatsapp_calls",
        name: "WhatsApp calls",
        group: "messaging",
        description: "People call Classgrid AI on WhatsApp and talk with it.",
        message: "WhatsApp calls with Classgrid AI are turned off for now. Please try again later.",
        // services/whatsapp-call.service.js handleCallsWebhook (checked there)
    },
    {
        key: "call_tasks",
        name: "Tasks from calls",
        group: "messaging",
        description: "Jobs a caller gives on a WhatsApp call, which the AI finishes after the call.",
        message: "Tasks from calls are turned off for now. Please try again later.",
        // services/whatsapp-call.service.js (start_task) and services/agent-task.service.js (checked there)
    },
    {
        key: "email_sending",
        name: "Email",
        group: "messaging",
        description: "The AI sends and reads emails, and schedules that go out by email.",
        message: "Sending email is turned off for now. Please try again later.",
        tools: ["send_email", "read_agent_email"],
    },

    // ── Payments and sign-up ─────────────────────────────────────────────────────
    {
        key: "signup",
        name: "Sign-up",
        group: "payments",
        description: "New accounts (Google, GitHub and email). People who already have an account still sign in.",
        message: "Sign-up is turned off for now. Please try again later.",
        // routes/auth.routes.js:111 and :113; passport.service.js (Google, GitHub) and auth.controller.js (email) check it
        routes: [route(["POST"], /^\/api\/auth\/(signup-init|signup-complete)$/)],
    },
    {
        key: "plan_purchase",
        name: "Plan purchase",
        group: "payments",
        description: "Buying or upgrading a plan. Payments already made are still recorded.",
        message: "Buying a plan is turned off for now. Please try again later.",
        // routes/ai-credits-topup.routes.js:46 POST /api/ai/topup/plan
        routes: [route(["POST"], /^\/api\/ai\/topup\/plan$/)],
    },
    {
        key: "credit_topup",
        name: "Credit top-up",
        group: "payments",
        description: "Buying extra AI credits. Payments already made are still recorded.",
        message: "Topping up credits is turned off for now. Please try again later.",
        // routes/ai-credits-topup.routes.js:44 POST /api/ai/topup/initiate
        routes: [route(["POST"], /^\/api\/ai\/topup\/initiate$/)],
    },
    {
        key: "student_pricing",
        name: "Student price applications",
        group: "payments",
        description: "Students apply for the student price with a proof.",
        message: "Student price applications are turned off for now. Please try again later.",
        // routes/ai.routes.js:200 POST /api/ai/student/apply
        routes: [route(["POST"], /^\/api\/ai\/student\/apply$/)],
    },

    // ── Other ────────────────────────────────────────────────────────────────────
    {
        key: "music",
        name: "Music",
        group: "other",
        description: "The AI plays and downloads songs.",
        message: "Music is turned off for now. Please try again later.",
        // routes/music.routes.js:12 and :18
        routes: [route(["GET"], /^\/api\/music(\/|$)/)],
        tools: ["play_song", "download_song"],
    },
]);

const CATALOG_BY_KEY = new Map(FEATURE_FLAG_CATALOG.map((f) => [f.key, f]));
const CATALOG_KEYS = FEATURE_FLAG_CATALOG.map((f) => f.key);

// Paths a flag never closes: the super admin pages (so a flag can be turned back on) and payment receipts.
const NEVER_GATED = [/^\/api\/super-admin(\/|$)/, /^\/api\/webhooks(\/|$)/, /^\/api\/billing(\/|$)/, /^\/api\/ai\/topup\/verify\//];

export function getFeatureFlagDefinition(key) {
    return CATALOG_BY_KEY.get(String(key || "").trim().toLowerCase()) || null;
}

// ── The flags, kept in this process for a few seconds ─────────────────────────────────────────────
// Every request asks; the database is about 150 ms away (measured 2026-11-10), so the switches are read at most
// once every FLAGS_KEEP_MS per server process. A switch made on this process applies at once (forgetFeatureFlags);
// on another process within FLAGS_KEEP_MS. If the database can't be read, the last switches read stay in force
// (and with none read yet, everything is on), so a database hiccup never turns features on or off by itself.
const FLAGS_KEEP_MS = 5000;
let kept = { at: 0, off: new Set() };
let reading = null;

export function forgetFeatureFlags() {
    kept = { ...kept, at: 0 };
}

async function readOffFlags() {
    const rows = await FeatureFlag.find({ key: { $in: CATALOG_KEYS } }).select("key isEnabled").lean().maxTimeMS(1500).exec();
    return new Set(rows.filter((r) => r.isEnabled === false).map((r) => r.key));
}

// The keys of the features that are off right now (a Set; empty when everything is on)
export async function offFeatures() {
    if (Date.now() - kept.at < FLAGS_KEEP_MS) return kept.off;
    // (mongoose would hold the query until it connects, up to 10 s: before that, the last known switches)
    if (mongoose.connection.readyState !== 1) return kept.off;
    if (!reading) {
        reading = readOffFlags()
            .then((off) => { kept = { at: Date.now(), off }; return off; })
            .catch((e) => {
                console.error("[FeatureFlags] Could not read the flags, keeping the last ones:", e.message);
                kept = { ...kept, at: Date.now() - FLAGS_KEEP_MS + 1000 }; // try again in a second
                return kept.off;
            })
            .finally(() => { reading = null; });
    }
    return reading;
}

export async function isFeatureOn(key) {
    return !(await offFeatures()).has(key);
}

// What the person sees when a feature is off. `error` carries the words too, because the apps show `error`
// (the chat page, the image button); `code` and `feature` are for the apps to tell this case apart.
export function featureOffBody(key) {
    const flag = getFeatureFlagDefinition(key);
    const text = flag?.message || "This feature is turned off for now. Please try again later.";
    return { success: false, code: "feature_off", feature: key, error: text, message: text };
}

export function sendFeatureOff(res, key) {
    if (res.headersSent) return;
    res.status(423).json(featureOffBody(key));
}

// Route guard for one feature: router.post("/x", requireFeature("voice_mode"), handler)
export const requireFeature = (key) => async (req, res, next) => {
    try {
        if (await isFeatureOn(key)) return next();
        return sendFeatureOff(res, key);
    } catch (error) {
        console.error(`[FeatureFlags] ${key} check failed:`, error.message);
        return next();
    }
};

function normalizePath(value) {
    return String(value || "").split("?")[0].replace(/\/+$/, "") || "/";
}

// The flags whose route rules this request matches (usually none or one)
export function featuresForRequest(method, requestPath) {
    const path = normalizePath(requestPath);
    if (!path.startsWith("/api/") || NEVER_GATED.some((re) => re.test(path))) return [];
    const m = String(method || "GET").toUpperCase();
    return FEATURE_FLAG_CATALOG.filter((flag) => (flag.routes || []).some((r) => (!r.methods || r.methods.includes(m)) && r.path.test(path))).map((f) => f.key);
}

// Mounted once in api/index.js before every /api route: a request to a feature that is off is answered here.
export async function enforceFeatureFlags(req, res, next) {
    try {
        const keys = featuresForRequest(req.method, req.originalUrl || req.path);
        if (!keys.length) return next();
        const off = await offFeatures();
        const blocking = keys.find((k) => off.has(k));
        if (!blocking) return next();
        return sendFeatureOff(res, blocking);
    } catch (error) {
        console.error("[FeatureFlags] Enforcement check failed:", error.message);
        return next(); // a broken check never takes the whole app down
    }
}

// ── AI tools ──────────────────────────────────────────────────────────────────────────────────────
// The flag that takes this tool away (null = the tool stays). onComputer: the chat runs on the person's own
// computer (the desktop app), where the terminal and file tools are "Desktop computer tools", not the sandbox.
export function toolOffBy(name, off, { onComputer = false } = {}) {
    if (!off || !off.size || !name) return null;
    for (const flag of FEATURE_FLAG_CATALOG) {
        if (!off.has(flag.key)) continue;
        if (flag.tools?.includes(name) || flag.toolPattern?.test(name)) return flag.key;
        if ((onComputer ? flag.computerTools : flag.cloudTools)?.includes(name)) return flag.key;
    }
    return null;
}

// Every tool name that some flag can take away (so a long answer can re-check just those while it runs)
export function isFlaggedTool(name, { onComputer = false } = {}) {
    return FEATURE_FLAG_CATALOG.some((flag) => flag.tools?.includes(name) || flag.toolPattern?.test(name) || (onComputer ? flag.computerTools : flag.cloudTools)?.includes(name));
}

// ── The Feature flags page ────────────────────────────────────────────────────────────────────────
// Every catalog flag with its switch from the database (a flag with no document is on). Older documents whose
// key is not in the catalog are not listed and no longer gate anything.
export async function listFeatureFlagsForPage() {
    const rows = await FeatureFlag.find({ key: { $in: CATALOG_KEYS } })
        .select("key isEnabled lastModifiedBy lastModifiedByName lastModifiedByEmail lastModifiedAt updatedAt")
        .populate("lastModifiedBy", "name email")
        .lean();
    const byKey = new Map(rows.map((r) => [r.key, r]));
    return FEATURE_FLAG_CATALOG.map((flag) => {
        const row = byKey.get(flag.key);
        const by = row?.lastModifiedBy && typeof row.lastModifiedBy === "object" ? row.lastModifiedBy : null;
        return {
            key: flag.key,
            name: flag.name,
            group: flag.group,
            description: flag.description,
            isEnabled: row ? row.isEnabled !== false : true,
            changedAt: row ? (row.lastModifiedAt || row.updatedAt || null) : null,
            changedBy: row && (row.lastModifiedByName || row.lastModifiedByEmail || by)
                ? { name: row.lastModifiedByName || by?.name || "", email: row.lastModifiedByEmail || by?.email || "" }
                : null,
        };
    });
}

// Switch one flag (the super admin's action). Makes the document the first time a flag is switched.
export async function setFeatureFlag(key, isEnabled, user) {
    const flag = getFeatureFlagDefinition(key);
    if (!flag) return null;
    const saved = await FeatureFlag.findOneAndUpdate(
        { key: flag.key },
        {
            $set: {
                name: flag.name,
                description: flag.description,
                group: flag.group,
                isEnabled: !!isEnabled,
                lastModifiedBy: user?._id || null,
                lastModifiedByName: String(user?.name || "").slice(0, 200),
                lastModifiedByEmail: String(user?.email || "").slice(0, 200),
                lastModifiedAt: new Date(),
            },
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    ).lean();
    forgetFeatureFlags();
    return saved;
}
