// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
/*
 * Tools that exist only on the remote MCP server (POST /mcp), for ChatGPT, Claude and other MCP clients.
 *
 * The AI chat's own project, chat-history, doc and page tools work on "the chat's" project or chat. Over MCP there
 * is no chat, so these take the id of the user's project, chat, doc or page and check it is the user's own.
 *
 *   projects:read  list_projects, get_project, list_project_files, read_project_file, search_project_code
 *   chats:read     list_my_chats, read_my_chat, search_my_chats      (off until the user ticks it)
 *   docs:read      list_my_docs, read_doc
 *   docs:write     create_doc, edit_doc, doc_comments
 *   pages:write    publish_page, page_comments
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
import { SHARE_PAGE_TOOLS, runPublishPage, runPageComments } from "../services/share-page.service.js";
import { getSessions } from "../services/ai-chat.service.js";
import { getChatTranscript } from "../services/ai-chat-history.service.js";
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
        "Read the messages of one of the user's Classgrid AI chats, by message number (1 = the first message).",
        {
            chat_id: { type: "string", description: "The chat id, from list_my_chats or search_my_chats." },
            from: { type: "number", description: "First message number to read (default 1)." },
            count: { type: "number", description: "How many messages to read, 1-20 (default 10)." },
        },
        ["chat_id"]),
    tool("search_my_chats",
        "Search the user's Classgrid AI chats for words or a phrase (titles and message text). Returns the matching chats with a short piece of each match; read more with read_my_chat.",
        {
            query: { type: "string", description: "Words or phrase to find (not case-sensitive)." },
            limit: { type: "number", description: "Most matches to return, 1-30 (default 10)." },
        },
        ["query"]),

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
    if (!all.length) return words ? `No project matches "${args.query}".` : "The user has no Classgrid projects yet. They make one in Project Mode at chat.classgrid.in.";
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

async function readMyChat(ctx, args) {
    const { chat, error } = await ownChat(ctx, args.chat_id);
    if (error) return { error };
    const all = await getChatTranscript(chat.id);
    if (!all.length) return `The chat "${chat.title || "(untitled)"}" has no messages.`;
    const count = clampInt(args.count, 1, 20, 10);
    const from = clampInt(args.from, 1, all.length, 1);
    const picked = all.slice(from - 1, from - 1 + count);
    return maskSecrets(`Chat "${chat.title || "(untitled)"}" (${chat.id}) has ${all.length} messages. Messages ${from}-${from + picked.length - 1}:\n\n` +
        picked.map((m) => `#${m.n} ${m.role}:\n${m.content.slice(0, 4000)}`).join("\n\n---\n\n") +
        (from - 1 + picked.length < all.length ? `\n\nMore: read on with from ${from + picked.length}.` : ""));
}

async function searchMyChats(ctx, args) {
    const query = String(args.query || "").trim();
    if (!query) return { error: "Give the words to search for in query." };
    if (query.length > 200) return { error: "query is too long (200 characters at most)." };
    const limit = clampInt(args.limit, 1, 30, 10);
    const lower = query.toLowerCase();
    const sessions = await getSessions(ctx.userEmail);
    if (!sessions.length) return "The user has no saved Classgrid AI chats yet.";
    const titles = new Map(sessions.map((s) => [s.id, s.title || "(untitled)"]));
    const byTitle = sessions.filter((s) => String(s.title || "").toLowerCase().includes(lower)).slice(0, limit)
        .map((s) => ({ chat_id: s.id, title: titles.get(s.id) }));

    // Message text: the newest 500 chats, in groups (a long id list doesn't fit in one request)
    const like = `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const ids = sessions.slice(0, 500).map((s) => s.id);
    const hits = [];
    for (let i = 0; i < ids.length && hits.length < limit; i += 100) {
        const { data, error } = await primarySupabaseClient
            .from("ai_chat_messages")
            .select("session_id, role, content, created_at")
            .in("session_id", ids.slice(i, i + 100))
            .ilike("content", like)
            .order("created_at", { ascending: false })
            .limit(limit - hits.length);
        if (error) throw error;
        hits.push(...(data || []));
    }
    const pieces = hits.map((m) => {
        const text = typeof m.content === "string" ? m.content : JSON.stringify(m.content ?? "");
        const at = Math.max(text.toLowerCase().indexOf(lower), 0);
        const start = Math.max(0, at - 200);
        return { chat_id: m.session_id, title: titles.get(m.session_id), role: m.role, at: m.created_at, piece: maskSecrets(`${start > 0 ? "…" : ""}${text.slice(start, at + query.length + 300)}`) };
    });
    if (!byTitle.length && !pieces.length) return `No chat title or message contains "${query}".`;
    return JSON.stringify({ query, title_matches: byTitle, message_matches: pieces }, null, 2);
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

const APP_TOOL_NAMES = ["list_my_chats", "search_my_chats", "read_my_chat", "list_my_docs"];
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
    return { list_my_chats: run(listMyChats), search_my_chats: run(searchMyChats), read_my_chat: run(readMyChat), list_my_docs: run(listMyDocs) };
}

const DOC_PAGE_TOOLS = new Set([...LIVE_DOC_TOOLS, ...SHARE_PAGE_TOOLS].map((t) => t.function.name));

async function runDocOrPageTool(name, ctx, args) {
    const user = await tokenUser(ctx);
    if (!user) return { error: "Your Classgrid account was not found." };
    if (name === "publish_page") return runPublishPage(user, args);
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
