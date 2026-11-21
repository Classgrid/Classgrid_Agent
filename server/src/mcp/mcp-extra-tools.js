// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
/*
 * Tools that exist only on the remote MCP server (POST /mcp), for ChatGPT, Claude and other MCP clients.
 *
 * The AI chat's own project, chat-history, doc and page tools work on "the chat's" project or chat. Over MCP there
 * is no chat, so these take the id of the user's project, chat, doc or page and check it is the user's own.
 *
 *   projects:read  list_projects, get_project, list_project_files, read_project_file, search_project_code
 *   chats:read     list_my_chats, read_my_chat, search_my_chats, read_recent_chats   (off until the user ticks it)
 *   docs:read      list_my_docs, read_doc
 *   docs:write     create_doc, edit_doc, doc_comments
 *   pages:write    publish_page, read_page, page_comments
 *
 * Project code is read from GitHub only (owner's order, 2026-11-12): the project's repo on its default branch,
 * through the GitHub API with the Classgrid app's key for that repo (else the owner's GitHub key). Never from
 * Classgrid's cloud computer or the user's computer. A project with no GitHub repo has no code to read here.
 * Secret files (.env, keys, certificates…) are never listed, read or searched, and token-like strings are masked.
 *
 * getRemoteMcpTools / handleRemoteToolCall wrap tools.js for the /mcp router (see ./index.js), so the AI chat's
 * own tool list never gains these.
 */

import path from "path";
import JSZip from "jszip";
import { getMcpTools, handleToolCall } from "./tools.js";
import { githubUser } from "../services/github-token.service.js";
import { githubAppReady, repoAppToken } from "../services/github-app.service.js";
import { GUIDE_PROJECT_DIR } from "../services/classgrid-guide.service.js";
import { LIVE_DOC_TOOLS, buildLiveDocHandlers } from "../services/live-doc-tools.js";
import { SHARE_PAGE_TOOLS, runPublishPage, runReadPage, runPageComments } from "../services/share-page.service.js";
import { getSessions, getSessionMessages } from "../services/ai-chat.service.js";
import { senderLabels } from "../services/ai-chat-grid.service.js";
import { primarySupabaseClient } from "../config/supabaseClient.js";
import connectDB from "../../config/db.js";

const GITHUB_API = "https://api.github.com";
const SKIP_DIRS = ["node_modules", ".git", "dist", "build", ".next", ".turbo", ".cache", "__pycache__", ".venv", "venv"];
const MAX_READ_LINES = 2000;
const MAX_LINE_CHARS = 2000;
const MAX_READ_BYTES = 20 * 1024 * 1024; // one file read
const MAX_SEARCH_ZIP_BYTES = 40 * 1024 * 1024; // a repo bigger than this is searched with GitHub's own code search
const MAX_SEARCH_FILE_BYTES = 2 * 1024 * 1024; // bigger files are skipped by the search
const ZIP_KEEP_MS = 10 * 60 * 1000; // a repo download is reused for 10 minutes
const ZIP_CACHE_MAX = 3;

const isObjectId = (v) => typeof v === "string" && /^[0-9a-f]{24}$/i.test(v);
const clampInt = (v, min, max, dflt) => {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : dflt;
};
const paged = (all, offset, limit) => {
    const page = all.slice(offset, offset + limit);
    return { total: all.length, offset, returned: page.length, ...(offset + page.length < all.length ? { next_offset: offset + page.length } : {}), page };
};

// ---------------------------------------------------------------------------------------------------------
// Secrets: files that are never shown, and token-like text that is masked in whatever is shown

const SECRET_FILE_GLOBS = [
    ".env", ".env.*", "*.env", "*.pem", "*.key", "*.p12", "*.pfx", "*.jks", "*.keystore", "id_rsa*", "id_ed25519*",
    "id_ecdsa*", "id_dsa*", ".npmrc", ".pypirc", ".netrc", ".git-credentials", "credentials.json", "*credentials*.json",
    "*service-account*.json", "*serviceaccount*.json", "*.tfstate", "*.tfstate.*", "secrets.*", "*.secret", "*.secrets",
];
const globToRegex = (g) => new RegExp(`^${g.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".")}$`, "i");
const SECRET_FILE_RES = SECRET_FILE_GLOBS.map(globToRegex);
export const isSecretFile = (relPath) => SECRET_FILE_RES.some((re) => re.test(path.posix.basename(String(relPath || ""))));

const TOKEN_PATTERNS = [
    /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(-----END [A-Z ]*PRIVATE KEY-----|$)/g,
    /\b(AKIA|ASIA)[0-9A-Z]{16}\b/g,
    /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g,
    /\bgithub_pat_[A-Za-z0-9_]{40,}\b/g,
    /\bsk-(ant-|proj-)?[A-Za-z0-9_-]{20,}\b/g,
    /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g,
    /\bAIza[0-9A-Za-z_-]{35}\b/g,
    /\bsk_(live|test)_[0-9A-Za-z]{16,}\b/g,
    /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
    /\b\d{8,10}:AA[A-Za-z0-9_-]{30,}\b/g, // Telegram bot token
    /\b(mongodb(\+srv)?|postgres(ql)?|mysql|redis|amqp):\/\/[^:\s/]+:[^@\s]+@/gi, // connection string with a password
];
// A quoted value given to a secret-sounding name: token = '…', "apiKey": "…", PASSWORD="…"
const NAMED_SECRET = /\b([\w-]*(?:token|secret|password|passwd|pwd|api[_-]?key|access[_-]?key|private[_-]?key|client[_-]?secret)[\w-]*["']?\s*[:=]\s*)(["'`])([^"'`\s]{8,})\2/gi;
export function maskSecrets(text) {
    let out = String(text ?? "");
    for (const re of TOKEN_PATTERNS) out = out.replace(re, "[hidden secret]");
    return out.replace(NAMED_SECRET, (m, name, quote) => `${name}${quote}[hidden secret]${quote}`);
}

// A path in the repo that is left out: build output, dependencies, Classgrid's guide folder and secret files
export const isSkippedPath = (rel) => {
    const parts = String(rel || "").split("/");
    return parts.some((p) => SKIP_DIRS.includes(p)) || rel === GUIDE_PROJECT_DIR || rel.startsWith(`${GUIDE_PROJECT_DIR}/`) || isSecretFile(rel);
};

// ---------------------------------------------------------------------------------------------------------
// Tool definitions (MCP format)

const tool = (name, description, properties, required = []) => ({
    name, description, inputSchema: { type: "object", properties, required },
});
// The AI chat's doc and page tools are in OpenAI's function format
const fromFunction = (t) => tool(t.function.name, t.function.description, t.function.parameters.properties, t.function.parameters.required || []);

const PROJECT_ID = { type: "string", description: "The project's id, from list_projects." };

export const MCP_EXTRA_TOOLS = [
    tool("list_projects",
        "List the user's Classgrid projects (Project Mode and Mastero), newest first: id, name, GitHub repo, whether it is a Mastero project, and when it was last opened and changed. Use the id with the other project tools.",
        {
            query: { type: "string", description: "Only projects whose name or repo contains these words." },
            limit: { type: "number", description: "How many to return, 1-100 (default 50)." },
            offset: { type: "number", description: "How many to skip, for the next page." },
        }),
    tool("get_project",
        "Details of one of the user's Classgrid projects: name, logo, GitHub repo and its link, default branch, Mastero status and Mastero repo, last backup branch, and dates.",
        { project_id: PROJECT_ID },
        ["project_id"]),
    tool("list_project_files",
        "List the files of one of the user's projects, read from its GitHub repo (default branch): path, size and type, in path order. node_modules, .git, build output and secret files (.env, keys) are left out.",
        {
            project_id: PROJECT_ID,
            folder: { type: "string", description: "Only files inside this folder, relative to the repo root (e.g. \"src/components\")." },
            limit: { type: "number", description: "How many files to return, 1-100 (default 100)." },
            offset: { type: "number", description: "How many files to skip, for the next page." },
        },
        ["project_id"]),
    tool("read_project_file",
        "Read a file of one of the user's projects from its GitHub repo (default branch), with line numbers: up to 2000 lines at a time (read on with start_line). Secret files (.env, keys, certificates) are never shown.",
        {
            project_id: PROJECT_ID,
            path: { type: "string", description: "The file's path relative to the repo root, as list_project_files shows it." },
            start_line: { type: "number", description: "First line to show (default 1)." },
            end_line: { type: "number", description: "Last line to show (default start_line + 1999)." },
        },
        ["project_id", "path"]),
    tool("search_project_code",
        "Search the code of one of the user's projects (its GitHub repo, default branch) for a word or a regular expression. Returns file:line matches with the line's text. node_modules, build output and secret files are skipped.",
        {
            project_id: PROJECT_ID,
            query: { type: "string", description: "The text or regular expression to find." },
            regex: { type: "boolean", description: "true (default) = query is a regular expression; false = plain text." },
            ignore_case: { type: "boolean", description: "Match upper and lower case alike (default false)." },
            folder: { type: "string", description: "Only search inside this folder." },
            glob: { type: "string", description: "Only files matching this pattern, e.g. \"*.ts\" or \"src/**/*.js\"." },
            limit: { type: "number", description: "Most matches to return, 1-100 (default 100)." },
            offset: { type: "number", description: "How many matches to skip, for the next page." },
        },
        ["project_id", "query"]),

    tool("list_my_chats",
        "List the user's Classgrid AI chats, newest first: chat id, title and date. Incognito chats are never listed.",
        {
            query: { type: "string", description: "Only chats whose title contains these words." },
            limit: { type: "number", description: "How many to return, 1-100 (default 30)." },
            offset: { type: "number", description: "How many to skip, for the next page." },
        }),
    tool("read_my_chat",
        "Read the messages of one of the user's Classgrid AI chats word for word, by message number (1 = the first message), with each message's date and its file links. Read the whole part that matters (follow \"More: read on with from N\") before answering from it.",
        {
            chat_id: { type: "string", description: "The chat id, from list_my_chats, search_my_chats or read_recent_chats." },
            from: { type: "number", description: "First message number to read (default 1). search_my_chats gives the number of each match: start a few messages before it." },
            count: { type: "number", description: "How many messages to read, 1-50 (default 20)." },
        },
        ["chat_id"]),
    tool("search_my_chats",
        "Search ALL of the user's Classgrid AI chats (titles, messages, files they sent and what the AI read from them), including WhatsApp and call chats. "
        + "Give the few key words, not a sentence: a message matches when it has any of them, and the best matches come first; between equal matches the NEWEST comes first. "
        + "Spaces are ignored, so \"time table\" also finds \"timetable\". Each result has the chat's dates and the number of every matching message: read around it with read_my_chat before answering. "
        + "When the user means something recent (\"yesterday\", \"this week\", \"what I sent you\"), pass days and prefer the newest chat; check its date. If nothing fits, search again with other words or spellings, or read the recent chats with read_recent_chats.",
        {
            query: { type: "string", description: "The key words to find (not case-sensitive), e.g. \"time table\" or \"physics exam date\"." },
            days: { type: "number", description: "Only messages from the last N days (1-3650). Leave out to search every date." },
            limit: { type: "number", description: "How many chats to return, 1-20 (default 8). Each comes with up to 3 of its best matching messages." },
        },
        ["query"]),
    tool("read_recent_chats",
        "Read, word for word, every message the user and Classgrid AI wrote in the last N days (default 7), across all their chats (WhatsApp and call chats too), newest chat first, with dates and file links. "
        + "Use it when the user refers to something recent without clear words to search for (\"what I sent you yesterday\", \"the plan from this week\"), or when search_my_chats found nothing. Follow next_offset to read further.",
        {
            days: { type: "number", description: "How many days back, 1-30 (default 7)." },
            offset: { type: "number", description: "How many chats to skip, for the next page (next_offset from the last call)." },
        }),

    tool("list_my_docs",
        "List the user's Classgrid live docs (their own), newest first: doc id, title, link and when it was last changed.",
        {
            query: { type: "string", description: "Only docs whose title contains these words." },
            limit: { type: "number", description: "How many to return, 1-100 (default 30)." },
            offset: { type: "number", description: "How many to skip, for the next page." },
        }),
    ...LIVE_DOC_TOOLS.map(fromFunction),
    ...SHARE_PAGE_TOOLS.map(fromFunction),
];

const EXTRA_NAMES = new Set(MCP_EXTRA_TOOLS.map((t) => t.name));

// The tool list for /mcp: tools.js plus these (one of these replaces a tools.js tool of the same name, which is
// the AI chat's "open project" version)
// Descriptions written for Classgrid AI's own chat name internal systems (databases, storage, other tools that
// MCP never has); MCP clients get plain ones
const MCP_DESCRIPTIONS = {
    search_users_for_chat: "Find Classgrid users by name or email, to get the user id needed to start or send a direct chat message.",
    list_group_chats: "List the Grid group chats the user is a member of: name, description, type, last message and its time.",
    read_group_chat_details: "Read a group chat's name, description, type and whether it is private.",
    read_group_chat_messages: "Read the latest messages of a group chat the user is in: who sent each, when, the text and any attachments. Deleted messages are left out.",
    read_chat_messages: "Read the latest messages of one of the user's 1:1 direct chats: who sent each, when, the text and any attachments. Deleted messages are left out.",
    get_chat_attachment_url: "Get the download link of a file sent in a 1:1 direct chat message.",
    get_group_chat_attachment_url: "Get the download link of a file sent in a group chat message.",
    upload_file_to_group_chat: "Send a file to a group chat from an https link.",
    list_grids: "List the user's 1:1 direct chats (Grids). Same as list_chat_threads.",
};

export const getRemoteMcpTools = () => [
    ...getMcpTools().filter((t) => !EXTRA_NAMES.has(t.name)).map((t) => (MCP_DESCRIPTIONS[t.name] ? { ...t, description: MCP_DESCRIPTIONS[t.name] } : t)),
    ...MCP_EXTRA_TOOLS,
];

// Grid answers over MCP keep only what the user would see in the app: no other people's emails, no search
// indexes, moderation or storage fields, no organization ids or policy settings
const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj?.[k] !== undefined && obj?.[k] !== null).map((k) => [k, obj[k]]));
const cleanAttachments = (list) => (Array.isArray(list) ? list.map((a) => pick(a, ["file_name", "file_type", "file_size", "file_url"])) : []);
const cleanMessage = (m) => ({ ...pick(m, ["id", "senderName", "message", "created_at", "reply_to", "is_pinned", "is_sent_by_current_user"]), attachments: cleanAttachments(m.attachments) });
const GROUP_FIELDS = ["id", "name", "description", "group_type", "is_private", "is_official", "created_at", "threadId", "last_message", "last_message_at"];
const GRID_CLEANERS = {
    list_group_chats: (j) => (Array.isArray(j) ? j.map((g) => pick(g, GROUP_FIELDS)) : j),
    read_group_chat_details: (j) => (j && !Array.isArray(j) && j.id ? pick(j, GROUP_FIELDS) : j),
    read_group_chat_messages: (j) => (Array.isArray(j) ? j.map(cleanMessage) : j),
    read_chat_messages: (j) => (Array.isArray(j) ? j.map(cleanMessage) : j),
    list_group_members: (j) => (Array.isArray(j) ? j.map((m) => pick(m, ["userId", "name", "groupRole", "joinedAt"])) : j),
    list_group_polls: (j) => (Array.isArray(j) ? j.map((p) => pick(p, ["id", "question", "options", "allow_multiple", "is_anonymous", "closes_at", "created_at", "vote_counts", "total_votes"])) : j),
};

// Applies the cleaner to a tools.js answer whose text is JSON; any other answer goes back unchanged
export function cleanGridResult(name, result) {
    const clean = GRID_CLEANERS[name];
    const text = result?.content?.[0]?.text;
    if (!clean || result?.isError || typeof text !== "string") return result;
    let json;
    try { json = JSON.parse(text); } catch { return result; }
    return { ...result, content: [{ type: "text", text: JSON.stringify(clean(json), null, 2) }, ...result.content.slice(1)] };
}

// ---------------------------------------------------------------------------------------------------------
// Projects

async function ownProject(ctx, projectId) {
    if (!isObjectId(projectId)) return { error: "project_id is not valid. Get it from list_projects." };
    await connectDB();
    const IdeProject = (await import("../models/IdeProject.js")).default;
    const project = await IdeProject.findOne({ _id: projectId, owner: ctx.userId }).lean();
    return project ? { project } : { error: "No project of yours has this id. Get the ids from list_projects." };
}

const projectRow = (p) => ({
    id: String(p._id),
    name: p.name,
    repo: p.repo || null,
    mastero: Boolean(p.mastero),
    last_opened: p.lastOpenedAt || null,
    last_changed: p.updatedAt || null,
});

async function listProjects(ctx, args) {
    await connectDB();
    const IdeProject = (await import("../models/IdeProject.js")).default;
    const words = String(args.query || "").trim().toLowerCase();
    let all = await IdeProject.find({ owner: ctx.userId })
        .select("name repo mastero lastOpenedAt updatedAt")
        .sort({ lastOpenedAt: -1, updatedAt: -1 })
        .lean();
    if (words) all = all.filter((p) => `${p.name} ${p.repo || ""}`.toLowerCase().includes(words));
    if (!all.length) return words ? `No project matches "${args.query}".` : "The user has no Classgrid projects yet. They make one in Studio at chat.classgrid.in (Project in Studio's left sidebar).";
    const { page, ...meta } = paged(all, clampInt(args.offset, 0, 100000, 0), clampInt(args.limit, 1, 100, 50));
    return JSON.stringify({ ...meta, projects: page.map(projectRow) }, null, 2);
}

// GitHub API call with the key for this repo; returns { status, body, headers }
async function gh(key, url, { raw = false } = {}) {
    const res = await fetch(url.startsWith("http") ? url : `${GITHUB_API}${url}`, {
        headers: {
            Authorization: `Bearer ${key}`,
            Accept: raw ? "application/vnd.github.raw+json" : "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "Classgrid-MCP",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(60000),
    });
    return res;
}

// The project's GitHub repo, its key and its default branch, or { error } said plainly
async function projectRepo(project) {
    if (!project.repo) {
        return { error: `"${project.name}" has no GitHub repo, so its code can't be read here (Classgrid reads project code from GitHub only). Put it on GitHub from Classgrid (Studio > Project > GitHub) and try again.` };
    }
    if (!/^[\w.-]+\/[\w.-]+$/.test(project.repo)) return { error: "This project's GitHub repo name is not valid." };
    await connectDB();
    const key = githubAppReady()
        ? await repoAppToken(project.repo).catch(() => null)
        : (await githubUser(project.owner))?.github_access_token;
    if (!key) return { error: `Classgrid has no access to the GitHub repo ${project.repo}. Connect GitHub again in Classgrid (Settings > Connected apps) and try again.` };
    const res = await gh(key, `/repos/${project.repo}`);
    if (res.status === 404) return { error: `The GitHub repo ${project.repo} was not found, or Classgrid can no longer open it.` };
    if (!res.ok) return { error: `GitHub did not answer for ${project.repo} (status ${res.status}). Try again in a minute.` };
    const info = await res.json();
    return { key, repo: project.repo, branch: info.default_branch, sizeKb: Number(info.size) || 0 };
}

async function getProject(ctx, args) {
    const { project: p, error } = await ownProject(ctx, args.project_id);
    if (error) return { error };
    let branch = null;
    if (p.repo) {
        const r = await projectRepo(p).catch(() => null);
        branch = r && !r.error ? r.branch : null;
    }
    return JSON.stringify({
        ...projectRow(p),
        logo: p.logo || null,
        repo_url: p.repo ? `https://github.com/${p.repo}` : null,
        default_branch: branch,
        mastero: p.mastero
            ? { status: "Mastero project", repo: p.masteroRepo || p.repo || null }
            : p.masteroPending ? { status: "Mastero set-up started, not finished" } : { status: "not a Mastero project" },
        last_backup: p.lastBackup?.branch ? { branch: p.lastBackup.branch, at: p.lastBackup.at } : null,
        created: p.createdAt || null,
    }, null, 2);
}

async function withRepo(ctx, args, fn) {
    const { project, error } = await ownProject(ctx, args.project_id);
    if (error) return { error };
    const repo = await projectRepo(project);
    if (repo.error) return { error: repo.error };
    return fn(repo);
}

// A folder or file path given by the caller, as a clean path inside the repo ("" = the root)
function repoPath(given) {
    const rel = path.posix.normalize(String(given || "").trim().replace(/\\/g, "/").replace(/^\.?\/+/, "") || ".");
    if (rel === ".") return { rel: "" };
    if (rel.startsWith("..") || rel.startsWith("/")) return { error: "The path must stay inside the project." };
    if (rel.split("/").includes(".git")) return { error: "The .git folder can't be read." };
    return { rel: rel.replace(/\/+$/, "") };
}

async function listProjectFiles(ctx, args) {
    const where = repoPath(args.folder);
    if (where.error) return { error: where.error };
    return withRepo(ctx, args, async ({ key, repo, branch }) => {
        const res = await gh(key, `/repos/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`);
        if (res.status === 409) return { error: `The GitHub repo ${repo} is empty.` };
        if (!res.ok) return { error: `GitHub did not list the files of ${repo} (status ${res.status}). Try again in a minute.` };
        const tree = await res.json();
        const prefix = where.rel ? `${where.rel}/` : "";
        const files = (tree.tree || [])
            .filter((e) => e.type === "blob" && (!prefix || e.path.startsWith(prefix)) && !isSkippedPath(e.path))
            .sort((a, b) => (a.path < b.path ? -1 : 1))
            .map((e) => ({ path: e.path, size: Number(e.size) || 0, type: path.posix.extname(e.path).slice(1) || "file" }));
        if (!files.length) return { error: where.rel ? `No files in the folder "${where.rel}" (or it does not exist).` : `The GitHub repo ${repo} has no files to show.` };
        const { page, ...meta } = paged(files, clampInt(args.offset, 0, 10000000, 0), clampInt(args.limit, 1, 100, 100));
        return JSON.stringify({ source: `GitHub ${repo} (${branch})`, folder: where.rel || "/", ...meta, ...(tree.truncated ? { note: "GitHub cut this repo's file list short (it is very large); list a folder to see the rest." } : {}), files: page }, null, 2);
    });
}

async function readProjectFile(ctx, args) {
    const where = repoPath(args.path);
    if (where.error) return { error: where.error };
    if (!where.rel) return { error: "Give the file's path (from list_project_files)." };
    if (isSecretFile(where.rel)) return { error: `${where.rel} looks like a secret file (keys, passwords or tokens), so it is never shown.` };
    if (where.rel === GUIDE_PROJECT_DIR || where.rel.startsWith(`${GUIDE_PROJECT_DIR}/`)) return { error: "That folder is Classgrid's own guide, not part of the project." };
    return withRepo(ctx, args, async ({ key, repo, branch }) => {
        const res = await gh(key, `/repos/${repo}/contents/${where.rel.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(branch)}`, { raw: true });
        if (res.status === 404) return { error: `No file "${where.rel}" in ${repo} (${branch}). See the files with list_project_files.` };
        if (!res.ok) return { error: `GitHub did not send ${where.rel} (status ${res.status}). Try again in a minute.` };
        if (Number(res.headers.get("content-length")) > MAX_READ_BYTES) return { error: `${where.rel} is too big to read here (over 20 MB).` };
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > MAX_READ_BYTES) return { error: `${where.rel} is too big to read here (over 20 MB).` };
        if ((res.headers.get("content-type") || "").includes("application/json") && buf.toString("utf8", 0, 1) === "[") {
            return { error: `"${where.rel}" is a folder. List it with list_project_files (folder "${where.rel}").` };
        }
        if (buf.subarray(0, 8000).includes(0)) return { error: `${where.rel} is a binary file (${buf.length} bytes), not text.` };
        const all = buf.toString("utf8").split("\n");
        if (all.length && all[all.length - 1] === "") all.pop();
        const total = all.length;
        if (!total) return `${where.rel} is empty.`;
        const start = clampInt(args.start_line, 1, 100000000, 1);
        if (start > total) return { error: `${where.rel} has only ${total} lines.` };
        const last = Math.min(clampInt(args.end_line, start, 100000000, start + MAX_READ_LINES - 1), start + MAX_READ_LINES - 1, total);
        const lines = all.slice(start - 1, last).map((l, i) => {
            const line = l.replace(/\r$/, "");
            return `${start + i}: ${line.length > MAX_LINE_CHARS ? `${line.slice(0, MAX_LINE_CHARS)}… (line cut)` : line}`;
        });
        const more = last < total ? `\n… ${total - last} more lines: read on with start_line ${last + 1}` : "";
        return maskSecrets(`${where.rel} (lines ${start}-${last} of ${total}, from GitHub ${repo} ${branch})\n${lines.join("\n")}${more}`);
    });
}

// Repo downloads (zip of the default branch), kept a few minutes so a run of searches downloads once
const zips = new Map(); // `${repo}@${branch}` -> { at, zip }
async function repoZip(key, repo, branch) {
    const id = `${repo}@${branch}`;
    const kept = zips.get(id);
    if (kept && Date.now() - kept.at < ZIP_KEEP_MS) return kept.zip;
    const res = await gh(key, `/repos/${repo}/zipball/${encodeURIComponent(branch)}`);
    if (!res.ok) throw new Error(`GitHub did not send the repo (status ${res.status})`);
    if (Number(res.headers.get("content-length")) > MAX_SEARCH_ZIP_BYTES) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_SEARCH_ZIP_BYTES) return null;
    const zip = await JSZip.loadAsync(buf);
    zips.set(id, { at: Date.now(), zip });
    for (const [k, v] of zips) if (Date.now() - v.at >= ZIP_KEEP_MS || zips.size > ZIP_CACHE_MAX) zips.delete(k);
    return zip;
}

async function searchProjectCode(ctx, args) {
    const query = String(args.query ?? "");
    if (!query.trim()) return { error: "Give the text to search for in query." };
    if (query.length > 1000) return { error: "query is too long (1000 characters at most)." };
    const where = repoPath(args.folder);
    if (where.error) return { error: where.error };
    let note = "";
    let matcher;
    const flags = args.ignore_case ? "i" : "";
    if (args.regex !== false) {
        try { matcher = new RegExp(query, flags); } catch { note = " (not a valid regular expression, so it was searched as plain text)"; }
    }
    if (!matcher) matcher = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);
    const globs = String(args.glob || "").split(/[,\s]+/).filter(Boolean).slice(0, 10)
        .map((g) => new RegExp(`(^|/)${g.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*\//g, "(.*/)?").replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*").replace(/\?/g, "[^/]")}$`, "i"));
    const limit = clampInt(args.limit, 1, 100, 100);
    const offset = clampInt(args.offset, 0, 10000000, 0);
    const prefix = where.rel ? `${where.rel}/` : "";

    return withRepo(ctx, args, async ({ key, repo, branch, sizeKb }) => {
        const zip = sizeKb * 1024 > MAX_SEARCH_ZIP_BYTES * 4 ? null : await repoZip(key, repo, branch);
        if (!zip) return { error: `${repo} is too big to search line by line here. Narrow it down: list a folder with list_project_files and read the files with read_project_file.` };
        const matches = [];
        let total = 0;
        const entries = Object.values(zip.files).filter((f) => !f.dir).map((f) => ({ f, rel: f.name.split("/").slice(1).join("/") }))
            .filter(({ rel }) => rel && (!prefix || rel.startsWith(prefix)) && !isSkippedPath(rel) && (!globs.length || globs.some((re) => re.test(rel))))
            .sort((a, b) => (a.rel < b.rel ? -1 : 1));
        for (const { f, rel } of entries) {
            const buf = await f.async("nodebuffer");
            if (buf.length > MAX_SEARCH_FILE_BYTES || buf.subarray(0, 8000).includes(0)) continue;
            const lines = buf.toString("utf8").split("\n");
            for (let i = 0; i < lines.length; i++) {
                if (!matcher.test(lines[i])) continue;
                total++;
                if (total > offset && matches.length < limit) matches.push(`${rel}:${i + 1}: ${lines[i].replace(/\r$/, "").slice(0, 500)}`);
            }
        }
        const where_ = where.rel || "the project";
        if (!total) return `No match for "${query}"${note} in ${where_} (GitHub ${repo}, ${branch}).`;
        const next = offset + matches.length < total ? `\nMore matches: search again with offset ${offset + matches.length}.` : "";
        return maskSecrets(`${total} match(es) for "${query}"${note} in ${where_} (GitHub ${repo}, ${branch}); showing ${Math.min(offset + 1, total)}-${offset + matches.length}:\n${matches.join("\n")}${next}`);
    });
}

// ---------------------------------------------------------------------------------------------------------
// Classgrid AI chat history (the user's own chats, never incognito ones)

async function ownChat(ctx, chatId) {
    const id = String(chatId || "").trim();
    if (!id || id.length > 100 || !/^[\w-]+$/.test(id)) return { error: "chat_id is not valid. Get it from list_my_chats." };
    const { data, error } = await primarySupabaseClient
        .from("ai_chat_sessions")
        .select("id, title, created_at")
        .eq("id", id)
        .eq("user_email", ctx.userEmail)
        .eq("is_incognito", false)
        .maybeSingle();
    if (error) throw error;
    return data ? { chat: data } : { error: "No chat of yours has this id. Get the ids from list_my_chats." };
}

async function listMyChats(ctx, args) {
    const words = String(args.query || "").trim().toLowerCase();
    let all = await getSessions(ctx.userEmail);
    if (words) all = all.filter((s) => String(s.title || "").toLowerCase().includes(words));
    if (!all.length) return words ? `No chat title contains "${args.query}". Try search_my_chats to search the messages too.` : "The user has no saved Classgrid AI chats yet.";
    const { page, ...meta } = paged(all, clampInt(args.offset, 0, 100000, 0), clampInt(args.limit, 1, 100, 30));
    return JSON.stringify({ ...meta, chats: page.map((s) => ({ chat_id: s.id, title: s.title || "(untitled)", created: s.created_at, ...(s.pinned ? { pinned: true } : {}) })) }, null, 2);
}

// Old chats (owner, 2026-11-18: "make the old chat search powerful, it must get the exact result; and the last 7 days
// of chats it can read in full"). He asked for his time table, sent the day before, and the AI answered from a much
// older WhatsApp call chat: the search looked for the whole phrase as typed ("my time table" missed "timetable"),
// only in the newest 500 chats, kept the first 10 rows it met with no ranking, gave no dates and no message
// numbers, and read_my_chat read only the last 500 messages of a chat, 4,000 characters of each.
// Now: the key words of the query are matched one by one, spaces ignored; every match is scored (how many words,
// the words together, in the visible text or only in what a tool read, the chat's title) and the newer of two equal
// matches wins; results come grouped by chat with dates and message numbers; read_my_chat reads any message of the
// whole chat from the database; and read_recent_chats reads every message of the last N days.

const SEARCH_CHATS_MAX = 3000; // the newest chats a search or a recent read covers (100 per request, 5 at a time)
const CHAT_ID_GROUP = 100;
const ROWS_PER_GROUP = 80; // candidate messages per group of chats (the newest ones)
const READ_BUDGET = 60000; // characters of messages one read_my_chat or read_recent_chats call gives back
const MESSAGE_MAX = 20000; // characters of one message (a longer one is cut, and says so)
const DAY_MS = 24 * 60 * 60 * 1000;

// Words that say nothing about what to find (English and Hinglish)
const STOP_WORDS = new Set([
    "a", "an", "the", "my", "me", "i", "is", "am", "are", "was", "were", "be", "of", "to", "in", "on", "at", "for",
    "and", "or", "it", "its", "this", "that", "these", "those", "what", "which", "who", "from", "with", "about", "your",
    "you", "we", "our", "us", "did", "do", "does", "can", "please", "find", "search", "chat", "chats", "message",
    "mera", "meri", "mere", "ka", "ki", "ke", "ko", "hai", "tha", "thi", "se", "maine", "mujhe", "wo", "woh", "jo",
]);

/** The key words of a search, lower case, without filler words (all words when only filler words were given) */
export function chatSearchTerms(query) {
    const words = [...new Set(String(query || "").toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu) || [])].filter((w) => w.length >= 2);
    const kept = words.filter((w) => !STOP_WORDS.has(w));
    return (kept.length ? kept : words).slice(0, 8);
}

/** The text patterns the database looks for: each word, and each two neighbouring words written together */
export function chatSearchPatterns(terms) {
    const pairs = terms.slice(0, -1).map((t, i) => t + terms[i + 1]);
    return [...new Set([...terms, ...pairs])];
}

/** A stored message's visible text, and the text its tools read (a file it parsed, a page it opened) */
export function messageParts(content) {
    let text = typeof content === "string" ? content : JSON.stringify(content ?? "");
    let tools = "";
    if (text.trim().startsWith("{")) {
        try {
            const inner = JSON.parse(text);
            if (inner && inner.classgrid_ai_message) {
                text = String(inner.content || "");
                if (Array.isArray(inner.steps)) tools = inner.steps.map((s) => (typeof s?.result === "string" ? s.result : "")).filter(Boolean).join("\n");
            }
        } catch { /* plain text that starts with a brace */ }
    }
    return { text, tools };
}

const squash = (s) => s.toLowerCase().replace(/\s+/g, "");

// How well one text matches: the words found (spaces ignored), where the first one is, and the words together
function matchIn(text, terms, together) {
    const low = String(text || "").toLowerCase();
    const flat = squash(low);
    let found = 0;
    let first = -1;
    for (const t of terms) {
        const i = low.indexOf(t);
        if (i >= 0 || flat.includes(t)) {
            found++;
            if (i >= 0 && (first < 0 || i < first)) first = i;
        }
    }
    return { found, first, together: together.length >= 4 && flat.includes(together) };
}

/**
 * Scores the candidate messages and groups them by chat, best first (and between equal scores, newest first).
 * rows: { session_id, role, content, created_at, file_urls }; sessions: the user's chats { id, title, created_at }.
 * Pure (no database), so it is tested on its own.
 */
export function rankChatMatches(rows, sessions, terms, { now = Date.now(), limit = 8 } = {}) {
    const together = terms.join("");
    const need = terms.length <= 2 ? 1 : Math.ceil(terms.length / 2);
    const byId = new Map(sessions.map((s) => [s.id, s]));
    const recency = (at) => 3 * Math.max(0, 1 - (now - new Date(at).getTime()) / (30 * DAY_MS)); // up to 3 for today
    const chats = new Map();
    const chatFor = (id) => {
        if (!chats.has(id)) {
            const s = byId.get(id) || {};
            const title = matchIn(s.title || "", terms, together);
            const titleScore = title.found >= need ? 4 * (title.found / terms.length) + (title.together ? 2 : 0) : 0;
            chats.set(id, { chat_id: id, title: s.title || "(untitled)", chat_started: s.created_at || null, titleScore, matches: [], best: 0, newest: 0 });
        }
        return chats.get(id);
    };
    for (const r of rows || []) {
        if (!byId.has(r.session_id)) continue;
        const { text, tools } = messageParts(r.content);
        const seen = matchIn(text, terms, together);
        const inTools = seen.found >= need ? null : matchIn(tools, terms, together);
        const m = inTools || seen;
        if (m.found < need) continue;
        const weight = inTools ? 0.5 : 1; // found only in what a tool read: counts half
        const score = weight * (10 * (m.found / terms.length) + (m.together ? 4 : 0)) + recency(r.created_at);
        const source = inTools ? tools : text;
        const at = Math.max(m.first, 0);
        const start = Math.max(0, at - 250);
        const piece = `${inTools ? "[from what the AI read with a tool] " : ""}${start > 0 ? "…" : ""}${source.slice(start, at + 450)}${at + 450 < source.length ? "…" : ""}`;
        const files = Array.isArray(r.file_urls) ? r.file_urls.filter(Boolean).slice(0, 5) : [];
        const c = chatFor(r.session_id);
        c.matches.push({ role: r.role, at: r.created_at, score, piece, ...(files.length ? { files } : {}) });
        c.best = Math.max(c.best, score);
        c.newest = Math.max(c.newest, new Date(r.created_at).getTime());
    }
    // Chats whose title alone matches
    for (const s of sessions) {
        if (chats.has(s.id)) continue;
        const t = matchIn(s.title || "", terms, together);
        if (t.found >= need) chatFor(s.id);
    }
    const ranked = [...chats.values()]
        .map((c) => ({ ...c, score: c.best + c.titleScore + Math.min(Math.max(c.matches.length - 1, 0), 3) * 0.5 }))
        .filter((c) => c.score > 0)
        .sort((a, b) => b.score - a.score || (b.newest || new Date(b.chat_started || 0).getTime()) - (a.newest || new Date(a.chat_started || 0).getTime()));
    return ranked.slice(0, limit).map((c) => ({
        chat_id: c.chat_id,
        title: c.title,
        chat_started: c.chat_started,
        ...(c.newest ? { last_match_at: new Date(c.newest).toISOString() } : {}),
        matches: c.matches.sort((a, b) => b.score - a.score || new Date(b.at) - new Date(a.at)).slice(0, 3)
            .map(({ score, ...m }) => m),
    }));
}

// Runs fn over the items, `width` at a time
async function inBatches(items, width, fn) {
    const out = [];
    for (let i = 0; i < items.length; i += width) out.push(...await Promise.all(items.slice(i, i + width).map(fn)));
    return out;
}
const groupsOf = (list, size) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, i * size + size));
const when = (at) => (at ? new Date(at).toISOString().replace(/:\d\d\.\d+Z$/, "Z").replace("T", " ") : "");

// The chats the user had in WhatsApp calls and messages (to say so next to them)
async function callChatIds(ctx) {
    try {
        await connectDB();
        const User = (await import("../models/User.js")).default;
        const u = await User.findById(ctx.userId).select("call_chat_ids").lean();
        return new Set(u?.call_chat_ids || []);
    } catch {
        return new Set();
    }
}

/** Every user and AI message of a chat from the database, numbered from 1 (the same numbers read_my_chat takes) */
async function chatMessages(sessionId) {
    const rows = await getSessionMessages(sessionId);
    const label = (await senderLabels(sessionId).catch(() => null)) || (() => "");
    return (rows || []).filter((m) => m.role === "user" || m.role === "assistant").map((m, i) => ({
        n: i + 1,
        role: m.role,
        at: m.created_at,
        text: label(m) + messageParts(m.content).text,
        files: Array.isArray(m.file_urls) ? m.file_urls.filter(Boolean) : [],
    }));
}

const messageBlock = (m) => {
    const text = m.text.length > MESSAGE_MAX ? `${m.text.slice(0, MESSAGE_MAX)}\n…[the rest of this message is cut: ${m.text.length - MESSAGE_MAX} more characters]` : m.text;
    return `#${m.n} ${m.role} (${when(m.at)}):\n${text}${m.files.length ? `\nFiles: ${m.files.join(" ")}` : ""}`;
};

async function readMyChat(ctx, args) {
    const { chat, error } = await ownChat(ctx, args.chat_id);
    if (error) return { error };
    const all = await chatMessages(chat.id);
    if (!all.length) return `The chat "${chat.title || "(untitled)"}" has no messages.`;
    const count = clampInt(args.count, 1, 50, 20);
    const from = clampInt(args.from, 1, all.length, 1);
    const blocks = [];
    let used = 0;
    for (const m of all.slice(from - 1, from - 1 + count)) {
        const block = messageBlock(m);
        if (blocks.length && used + block.length > READ_BUDGET) break;
        blocks.push(block);
        used += block.length;
    }
    const last = from + blocks.length - 1;
    const call = (await callChatIds(ctx)).has(chat.id) ? " It is a WhatsApp chat." : "";
    return maskSecrets(`Chat "${chat.title || "(untitled)"}" (${chat.id}), started ${when(chat.created_at)}, has ${all.length} messages; the last one is from ${when(all[all.length - 1].at)}.${call} Messages ${from}-${last}:\n\n` +
        blocks.join("\n\n---\n\n") +
        (last < all.length ? `\n\nMore: read on with from ${last + 1}.` : ""));
}

async function searchMyChats(ctx, args) {
    const query = String(args.query || "").trim();
    if (!query) return { error: "Give the words to search for in query." };
    if (query.length > 200) return { error: "query is too long (200 characters at most)." };
    const terms = chatSearchTerms(query);
    if (!terms.length) return { error: "Give at least one word of 2 or more letters to search for." };
    const limit = clampInt(args.limit, 1, 20, 8);
    const days = args.days === undefined || args.days === null || args.days === "" ? null : clampInt(args.days, 1, 3650, 7);
    const now = Date.now();
    const since = days ? new Date(now - days * DAY_MS).toISOString() : null;
    const sessions = await getSessions(ctx.userEmail);
    if (!sessions.length) return "The user has no saved Classgrid AI chats yet.";

    // Candidate messages: any of the words (or two neighbours written together), newest first, in groups of chats
    const filter = chatSearchPatterns(terms).map((p) => `content.ilike.%${p}%`).join(",");
    const covered = sessions.slice(0, SEARCH_CHATS_MAX);
    const rows = (await inBatches(groupsOf(covered.map((s) => s.id), CHAT_ID_GROUP), 5, async (ids) => {
        let q = primarySupabaseClient.from("ai_chat_messages")
            .select("session_id, role, content, created_at, file_urls")
            .in("session_id", ids)
            .or(filter);
        if (since) q = q.gte("created_at", since);
        const { data, error } = await q.order("created_at", { ascending: false }).limit(ROWS_PER_GROUP);
        if (error) throw error;
        return data || [];
    })).flat();

    const results = rankChatMatches(rows, covered, terms, { now, limit });
    if (!results.length) {
        return `No chat${days ? ` of the last ${days} days` : ""} matches ${terms.map((t) => `"${t}"`).join(" or ")}. Try other words or spellings, ${days ? "more days, " : ""}or read the recent chats with read_recent_chats.`;
    }
    // Each match's number in its chat (the number read_my_chat takes)
    await Promise.all(results.flatMap((c) => c.matches.map(async (m) => {
        const { count } = await primarySupabaseClient.from("ai_chat_messages")
            .select("id", { count: "exact", head: true })
            .eq("session_id", c.chat_id)
            .in("role", ["user", "assistant"])
            .lt("created_at", m.at);
        if (typeof count === "number") m.message_number = count + 1;
    })));
    const calls = await callChatIds(ctx);
    const out = {
        now: new Date(now).toISOString(),
        query,
        words: terms,
        ...(days ? { only_last_days: days } : {}),
        searched_chats: covered.length,
        ...(sessions.length > covered.length ? { note: `Only the newest ${covered.length} of ${sessions.length} chats were searched.` } : {}),
        how_to_read: "Best match first; between equal matches the newest first. Read around a match with read_my_chat (chat_id, from = message_number minus 2) before answering, and check the dates: for something recent prefer the newest chat.",
        results: results.map((c) => ({
            ...c,
            ...(calls.has(c.chat_id) ? { whatsapp_chat: true } : {}),
            matches: c.matches.map((m) => ({ ...m, at: when(m.at), piece: maskSecrets(m.piece) })),
            chat_started: when(c.chat_started),
            ...(c.last_match_at ? { last_match_at: when(c.last_match_at) } : {}),
        })),
    };
    return JSON.stringify(out, null, 2);
}

async function readRecentChats(ctx, args) {
    const days = clampInt(args.days, 1, 30, 7);
    const offset = clampInt(args.offset, 0, 100000, 0);
    const now = Date.now();
    const since = new Date(now - days * DAY_MS).toISOString();
    const sessions = await getSessions(ctx.userEmail);
    if (!sessions.length) return "The user has no saved Classgrid AI chats yet.";
    const covered = sessions.slice(0, SEARCH_CHATS_MAX);
    const byId = new Map(covered.map((s) => [s.id, s]));

    // Which chats had a message in those days, and when the newest one was (pages of 1,000 rows per group of chats)
    const lastAt = new Map();
    await inBatches(groupsOf(covered.map((s) => s.id), CHAT_ID_GROUP), 5, async (ids) => {
        for (let page = 0; page < 10; page++) {
            const { data, error } = await primarySupabaseClient.from("ai_chat_messages")
                .select("session_id, created_at")
                .in("session_id", ids)
                .in("role", ["user", "assistant"])
                .gte("created_at", since)
                .order("created_at", { ascending: false })
                .range(page * 1000, page * 1000 + 999);
            if (error) throw error;
            for (const m of data || []) if (!lastAt.has(m.session_id) || m.created_at > lastAt.get(m.session_id)) lastAt.set(m.session_id, m.created_at);
            if (!data || data.length < 1000) break;
        }
    });
    const active = [...lastAt.entries()].sort((a, b) => (a[1] < b[1] ? 1 : -1)).map(([id]) => id);
    if (!active.length) return `No chat has a message from the last ${days} days.`;
    if (offset >= active.length) return `There are ${active.length} chats with messages from the last ${days} days; offset ${offset} is past the last one.`;

    const calls = await callChatIds(ctx);
    const parts = [];
    let used = 0;
    let next = null;
    for (let i = offset; i < active.length; i++) {
        const id = active[i];
        const s = byId.get(id) || {};
        const all = await chatMessages(id);
        const recent = all.filter((m) => new Date(m.at).getTime() >= now - days * DAY_MS);
        const head = `=== Chat "${s.title || "(untitled)"}" (${id})${calls.has(id) ? " · WhatsApp chat" : ""} · started ${when(s.created_at)} · ${all.length} messages in all; ${recent.length} in the last ${days} days, #${recent[0]?.n ?? "?"} to #${recent[recent.length - 1]?.n ?? "?"} ===`;
        const blocks = [];
        let size = head.length;
        let cutAt = null;
        for (const m of recent) {
            const block = messageBlock(m);
            if (used + size + block.length > READ_BUDGET && (parts.length || blocks.length)) { cutAt = m.n; break; }
            blocks.push(block);
            size += block.length;
        }
        if (!blocks.length) { next = i; break; }
        parts.push(`${head}\n\n${blocks.join("\n\n---\n\n")}${cutAt ? `\n\n[This chat goes on: read it with read_my_chat (chat_id ${id}, from ${cutAt}).]` : ""}`);
        used += size;
        if (cutAt) { next = i + 1 < active.length ? i + 1 : null; break; }
    }
    const shown = parts.length;
    return maskSecrets(`Now: ${when(new Date(now).toISOString())}. ${active.length} chats have messages from the last ${days} days (newest first)${covered.length < sessions.length ? `; only the newest ${covered.length} of ${sessions.length} chats were looked at` : ""}. Chats ${offset + 1}-${offset + shown}:\n\n` +
        parts.join("\n\n") +
        (next !== null ? `\n\nMore chats: call read_recent_chats again with offset ${next}.` : ""));
}

// ---------------------------------------------------------------------------------------------------------
// Live docs and share pages (the AI chat's own handlers, as the token's user)

async function tokenUser(ctx) {
    await connectDB();
    const User = (await import("../models/User.js")).default;
    return User.findById(ctx.userId).select("_id name email").lean();
}

async function listMyDocs(ctx, args) {
    await connectDB();
    const LiveDoc = (await import("../models/LiveDoc.js")).default;
    const { docLink } = await import("../services/live-doc.helpers.js");
    const words = String(args.query || "").trim().toLowerCase();
    let all = await LiveDoc.find({ owner: ctx.userId }).select("title updatedAt").sort({ updatedAt: -1 }).lean();
    if (words) all = all.filter((d) => String(d.title || "").toLowerCase().includes(words));
    if (!all.length) return words ? `No doc title contains "${args.query}".` : "The user has no live docs yet.";
    const { page, ...meta } = paged(all, clampInt(args.offset, 0, 100000, 0), clampInt(args.limit, 1, 100, 30));
    return JSON.stringify({ ...meta, docs: page.map((d) => ({ doc_id: String(d._id), title: d.title, link: docLink(d._id), last_changed: d.updatedAt || null })) }, null, 2);
}

// ---------------------------------------------------------------------------------------------------------
// The same chat-history and doc-list tools for Classgrid AI's own chat (OpenAI function format), so it can find the
// user's other chats and their docs too. user = the chat's signed-in user.

const APP_TOOL_NAMES = ["list_my_chats", "search_my_chats", "read_my_chat", "read_recent_chats", "list_my_docs"];
export const APP_HISTORY_TOOLS = MCP_EXTRA_TOOLS.filter((t) => APP_TOOL_NAMES.includes(t.name))
    .map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.inputSchema } }));

export function buildAppHistoryHandlers({ user }) {
    const ctx = { userId: user?._id ? String(user._id) : "", userEmail: String(user?.email || "") };
    const run = (fn) => async (args) => {
        if (!ctx.userId || !ctx.userEmail) return "Error: sign in first.";
        try {
            const out = await fn(ctx, args && typeof args === "object" ? args : {});
            return out && typeof out === "object" && out.error ? `Error: ${out.error}` : String(out ?? "");
        } catch (e) {
            return `Error: ${e.message}`;
        }
    };
    return { list_my_chats: run(listMyChats), search_my_chats: run(searchMyChats), read_my_chat: run(readMyChat), read_recent_chats: run(readRecentChats), list_my_docs: run(listMyDocs) };
}

const DOC_PAGE_TOOLS = new Set([...LIVE_DOC_TOOLS, ...SHARE_PAGE_TOOLS].map((t) => t.function.name));

async function runDocOrPageTool(name, ctx, args) {
    const user = await tokenUser(ctx);
    if (!user) return { error: "Your Classgrid account was not found." };
    if (name === "publish_page") return runPublishPage(user, args);
    if (name === "read_page") return runReadPage(user, args);
    if (name === "page_comments") return runPageComments(user, args);
    return buildLiveDocHandlers({ user })[name](args);
}

// ---------------------------------------------------------------------------------------------------------
// Dispatch

const HANDLERS = {
    list_projects: listProjects,
    get_project: getProject,
    list_project_files: listProjectFiles,
    read_project_file: readProjectFile,
    search_project_code: searchProjectCode,
    list_my_chats: listMyChats,
    read_my_chat: readMyChat,
    search_my_chats: searchMyChats,
    read_recent_chats: readRecentChats,
    list_my_docs: listMyDocs,
};

// Handlers return text, or { error } for a clear failure; the doc and page handlers answer failures as text
// starting with "Error" or "FAILED". Failures go back with isError so the client shows them as failures.
function asResult(out) {
    if (out && typeof out === "object" && out.error) return { content: [{ type: "text", text: String(out.error) }], isError: true };
    const text = String(out ?? "");
    return { content: [{ type: "text", text }], ...(/^(Error|FAILED)\b/.test(text) ? { isError: true } : {}) };
}

// tools/call for /mcp: these tools here, everything else through tools.js
export async function handleRemoteToolCall(name, args, ctx) {
    if (!EXTRA_NAMES.has(name)) return cleanGridResult(name, await handleToolCall(name, args, ctx));
    if (!ctx?.userId) return asResult({ error: "No signed-in Classgrid user." });
    const input = args && typeof args === "object" ? args : {};
    if (HANDLERS[name]) return asResult(await HANDLERS[name](ctx, input));
    if (DOC_PAGE_TOOLS.has(name)) return asResult(await runDocOrPageTool(name, ctx, input));
    return asResult({ error: `Tool not available: ${name}` });
}
