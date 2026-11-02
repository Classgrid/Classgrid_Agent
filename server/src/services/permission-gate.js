// Permission modes for the agent's actions (Studio and Project Mode), like Antigravity:
//   review  - every command, push and browser action asks the user first
//   default - asks before sensitive ones (risky commands, git push, repos, opening websites, typing into pages)
//   auto    - asks only before destructive ones (deleting, force or hard resets, git push, sudo...)
//   turbo   - never asks
// While the agent waits, the chat shows a permission card; the answer comes back through POST /api/ai/permission/:id
// and is passed on in Redis (any API process can take it). "Always in this chat" and "always" answers are remembered.
import crypto from "crypto";
import redis from "../config/redis.js";

export const PERMISSION_MODES = new Set(["review", "default", "auto", "turbo"]);

const REQ = (id) => `perm:req:${id}`;
const DECISION = (id) => `perm:decision:${id}`;
const CHAT_ALLOW = (sessionId) => `perm:chat:${sessionId}`;
const USER_ALLOW = (userId) => `perm:user:${userId}`;
const WAIT_MS = 30 * 60 * 1000;
const ALWAYS_ASKS = 4; // asks even with no mode or in turbo

// Commands that change or remove things for good, or reach outside the project
const DESTRUCTIVE = /(^|[\s;&|(])(rm\s|rmdir\s|sudo\s|mkfs|dd\s+if=|shred\s|git\s+push|git\s+reset\s+--hard|git\s+clean\s+-[a-z]*f|git\s+branch\s+-D|git\s+checkout\s+--\s|drop\s+(table|database)|truncate\s+table|npm\s+publish)/i;
const SENSITIVE = /(^|[\s;&|(])(rm\s|rmdir\s|mv\s|sudo\s|chmod\s|chown\s|kill\s|pkill\s|killall\s|docker\s|git\s+(push|reset|clean|rebase|merge|checkout|branch\s+-[dD]|commit|tag)|npm\s+(publish|uninstall|install|i)\b|yarn\s+(add|remove)|pnpm\s+(add|remove|install)|pip\s+(install|uninstall)|curl\s|wget\s|ssh\s|scp\s|drop\s+(table|database)|truncate\s|mkfs|dd\s+if=)/i;

// "Always allow" for a command covers the programs it runs (git, npm, python...), like Claude Code's allow rules,
// not just that exact text: "git status" allowed means every git command is. Commands that remove things for good
// are only ever allowed exactly as written.
const programOf = (part) => {
  const m = part.trim().replace(/^&\s*/, "").match(/^"([^"]+)"|^'([^']+)'|^([^\s"']+)/);
  const first = m ? m[1] || m[2] || m[3] || "" : "";
  return first.split(/[\\/]/).pop().replace(/\.(exe|cmd|bat|ps1)$/i, "").toLowerCase();
};
const PROGRAM_NAMES = (command) => [...new Set(String(command).split(/;|&&|\|\||\|/).map(programOf).filter(Boolean))].sort();
const commandAllow = (command) => {
  if (DESTRUCTIVE.test(command)) return { key: `cmd:${command}`, label: command };
  const programs = PROGRAM_NAMES(command);
  return programs.length ? { key: `cmd:${programs.join("+")}`, label: `${programs.join(", ")} commands` } : { key: `cmd:${command}`, label: command };
};
const folderOf = (file) => String(file).replace(/[\\/][^\\/]*$/, "") || file;

const host = (u) => { try { return new URL(/^[a-z]+:\/\//i.test(u) ? u : `https://${u}`).host; } catch { return String(u || "").slice(0, 80); } };

// What an action is, for the card and for "always allow" (null = never asked)
export function describeAction(tool, args = {}) {
  const command = String(args?.command || "").trim();
  switch (tool) {
    case "execute_terminal_command":
      return { title: "Run this command?", detail: command, ...commandAllow(command), level: DESTRUCTIVE.test(command) ? 3 : SENSITIVE.test(command) ? 2 : 1 };
    case "start_background_command":
      return { title: "Run this command in the background?", detail: command, ...commandAllow(command), level: DESTRUCTIVE.test(command) ? 3 : SENSITIVE.test(command) ? 2 : 1 };
    case "run_code":
      return { title: `Run this ${args?.language || "code"}?`, detail: String(args?.code || "").slice(0, 1500), key: `code:${args?.language || "code"}`, label: `running ${args?.language || "code"}`, level: 1 };
    case "push_project_to_github":
      return { title: args?.direct_to_main === true || args?.direct_to_main === "true" ? "Push the changes straight to main with your GitHub account?" : "Push the changes to GitHub?", detail: String(args?.message || "Commit and push this project's changes"), key: "push", label: "pushing to GitHub", level: 3 };
    case "create_github_repo_for_project":
      return { title: "Create a new GitHub repository?", detail: `${args?.organization ? `${args.organization}/` : ""}${args?.name || ""}${args?.private === false ? "  (public)" : "  (private)"}`, key: "create_repo", label: "creating GitHub repositories", level: 2 };
    case "update_project_github_repo":
      return { title: "Change this project's GitHub repository settings?", detail: [args?.new_name && `Rename to ${args.new_name}`, args?.description && `Description: ${args.description}`, args?.homepage && `Website: ${args.homepage}`, typeof args?.private === "boolean" && (args.private ? "Make it private" : "Make it public")].filter(Boolean).join("; "), key: "repo_settings", label: "changing repository settings", level: 2 };
    case "browser_open":
      return { title: "Open this website in the browser?", detail: String(args?.url || ""), key: `site:${host(args?.url)}`, label: `opening ${host(args?.url)}`, level: 2 };
    case "browser_type":
      return { title: "Type this into the page?", detail: String(args?.text ?? "").slice(0, 500) + (args?.submit ? "   (then press Enter)" : ""), key: "browser_type", label: "typing into pages", level: 2 };
    case "browser_click":
      return { title: "Click on the page?", detail: `At x ${Math.round(Number(args?.x) || 0)}, y ${Math.round(Number(args?.y) || 0)}`, key: "browser_click", label: "clicking in the browser", level: 1 };
    case "browser_press":
      return { title: "Press this key in the page?", detail: String(args?.key || ""), key: "browser_press", label: "pressing keys in the browser", level: 1 };
    // Custom connectors (MCP apps like n8n, Linear): asks per app tool, like claude.ai. Reading the user's own
    // connector list never asks; "always allow" covers one tool of one app.
    case "custom_mcp_connector":
      return describeConnectorAction(args);
    // A file or folder anywhere on the user's computer (desktop app): asks in Review and Default; Auto and Turbo don't ask
    case "read_local_file": {
      const file = String(args?.path || "").trim().replace(/^["']+|["']+$/g, "");
      return { title: "Read a file on your computer?", detail: file, key: "localfile", label: "reading files on this computer", level: 2 };
    }
    // Using apps on the user's computer (the real mouse and keyboard): every step that does something asks
    case "computer": {
      const a = String(args?.action || "screenshot");
      if (a === "screenshot" || a === "wait") return { title: "Look at your screen?", detail: "Take a picture of your screen", key: "computer:look", label: "looking at your screen", level: 1 };
      const what = a === "type" ? `Type: ${String(args?.text ?? "").slice(0, 300)}` : a === "key" ? `Press ${args?.key || "Enter"}` : a === "scroll" ? "Scroll" : `${a.replace("_", " ")} at ${args?.x}, ${args?.y} on the screen picture`;
      return { title: "Use your computer?", detail: what, key: `computer:${a}`, label: "using apps on your computer", level: 2 };
    }
    // Project Mode's file tools used on files anywhere on the user's computer (desktop app, chats that aren't a project)
    case "computer_write": {
      const file = String(args?.path || "").trim();
      return { title: "Create this file on your computer?", detail: `${file}

${String(args?.content ?? "").slice(0, 1200)}`, key: `localwrite:${folderOf(file).toLowerCase()}`, label: `creating files in ${folderOf(file).split(/[\\/]/).pop() || "this folder"}`, level: 2 };
    }
    case "computer_edit": {
      const file = String(args?.path || "").trim();
      const first = Array.isArray(args?.edits) ? args.edits[0] : null;
      return { title: "Change this file on your computer?", detail: `${file}${first ? `

Replace:
${String(first.old_text ?? "").slice(0, 500)}

With:
${String(first.new_text ?? "").slice(0, 500)}` : ""}${Array.isArray(args?.edits) && args.edits.length > 1 ? `

(+${args.edits.length - 1} more change${args.edits.length > 2 ? "s" : ""})` : ""}`, key: `localedit:${folderOf(file).toLowerCase()}`, label: `editing files in ${folderOf(file).split(/[\\/]/).pop() || "this folder"}`, level: 2 };
    }
    case "computer_search":
    case "computer_list": {
      const folder = String(args?.path || "").trim();
      return { title: tool === "computer_search" ? `Search the files in this folder for "${String(args?.query || "").slice(0, 80)}"?` : "Look at the files in this folder?", detail: folder, key: `localfolder:${folder.toLowerCase()}`, label: `looking in ${folder.split(/[\\/]/).filter(Boolean).pop() || "this folder"}`, level: 1 };
    }
    default:
      return null;
  }
}
// Connector tools by their name: reading = 1, changing = 2, deleting / cancelling / making something live = 3
const MCP_DESTRUCTIVE = /(^|_|-)(delete|remove|drop|destroy|purge|truncate|revoke|cancel|archive|unpublish|deactivate|reset|wipe|refund|publish|activate|deploy)/i;
const MCP_CHANGE = /(^|_|-)(create|add|update|edit|set|put|patch|post|send|write|insert|upsert|execute|run|trigger|publish|activate|deploy|invite|move|rename|merge|assign|approve|reply|comment|upload|import|enable|disable|start|stop|restore|charge|pay|transfer|book|schedule|save|commit|push)/i;

function describeConnectorAction(args = {}) {
  const op = String(args?.operation || "");
  const server = String(args?.server || args?.app || args?.name || "the app");
  const app = server; // as the user named it ("n8n" stays n8n)
  const key = (s) => `mcp:${server.toLowerCase()}:${s}`;
  if (op === "call_tool") {
    const tool = String(args?.tool || "");
    const words = tool.replace(/[_-]+/g, " ");
    let detail = "";
    try { detail = JSON.stringify(args?.arguments ?? {}, null, 2).slice(0, 1500); } catch { /* unreadable arguments */ }
    return { title: `Let ${app} run ${words}?`, detail, key: key(`tool:${tool}`), label: `${words} in ${app}`, level: MCP_DESTRUCTIVE.test(tool) ? 3 : MCP_CHANGE.test(tool) ? 2 : 1 };
  }
  if (op === "add_server") return { title: `Connect ${app}?`, detail: String(args?.url || args?.app || ""), key: key("add"), label: `connecting ${app}`, level: 2 };
  if (op === "remove_server") return { title: `Remove the ${app} connector?`, detail: app, key: key("remove"), label: `removing ${app}`, level: 3 };
  return null; // list_apps, list_servers, get_tools, login: only read the user's own connectors
}

export const isGatedTool = (tool) => tool === "custom_mcp_connector" || !!describeAction(tool, {});
const alwaysAsksTool = (tool) => describeAction(tool, {})?.level >= ALWAYS_ASKS;

// Does this mode ask for this action?
const asks = (mode, level) => (level >= ALWAYS_ASKS ? true : mode === "review" ? true : mode === "default" ? level >= 2 : mode === "auto" ? level >= 3 : false);

async function remembered(userId, sessionId, key) {
  const [inChat, always] = await Promise.all([
    sessionId ? redis.sismember(CHAT_ALLOW(sessionId), key).catch(() => 0) : 0,
    userId ? redis.sismember(USER_ALLOW(userId), key).catch(() => 0) : 0,
  ]);
  return !!(inChat || always);
}

// Ask the user (if the mode says so) and wait for the answer. Returns { allowed: true } or { allowed: false, message }.
export async function askPermission({ mode, userId, sessionId, tool, args, emit, isAborted }) {
  const a = describeAction(tool, args);
  if (!a || (a.level < ALWAYS_ASKS && (!PERMISSION_MODES.has(mode) || mode === "turbo"))) return { allowed: true };
  if (!asks(mode, a.level)) return { allowed: true };
  if (!a.once && await remembered(userId, sessionId, a.key)) return { allowed: true };

  const id = crypto.randomUUID();
  await redis.set(REQ(id), JSON.stringify({ userId: String(userId || ""), sessionId: sessionId || "", key: a.key }), "EX", Math.ceil(WAIT_MS / 1000) + 600).catch(() => {});
  emit({ type: "permission_request", id, tool, title: a.title, detail: a.detail, label: a.label, ...(a.once ? { onceOnly: true } : {}) });

  const end = Date.now() + WAIT_MS;
  while (Date.now() < end) {
    if (isAborted?.()) return { allowed: false, message: "The user stopped the chat." };
    const raw = await redis.get(DECISION(id)).catch(() => null);
    if (raw) {
      let d = {};
      try { d = JSON.parse(raw); } catch { /* bad answer */ }
      emit({ type: "permission_resolved", id, decision: d.decision });
      if (d.decision === "chat" && sessionId && !a.once) await redis.sadd(CHAT_ALLOW(sessionId), a.key).then(() => redis.expire(CHAT_ALLOW(sessionId), 30 * 24 * 60 * 60)).catch(() => {});
      if (d.decision === "always" && userId && !a.once) await redis.sadd(USER_ALLOW(userId), a.key).catch(() => {});
      if (d.decision === "once" || d.decision === "chat" || d.decision === "always") return { allowed: true };
      const note = String(d.note || "").trim().slice(0, 2000);
      return {
        allowed: false,
        message: d.decision === "skip"
          ? `The user skipped this step (${a.title.replace(/\?$/, "")}); it did not run. Carry on without it, or ask them.`
          : `The user did not allow this (${a.title.replace(/\?$/, "")}); it did not run.${note ? ` They said: "${note}". Do what they asked instead.` : " Do not try it another way; ask them what to do."}`,
      };
    }
    await new Promise((r) => setTimeout(r, 700));
  }
  emit({ type: "permission_resolved", id, decision: "timeout" });
  return { allowed: false, message: "The user did not answer the permission request in time, so this did not run. Tell them what you wanted to do and wait." };
}

// Wraps a set of tool handlers so the gated ones ask first (the handler object is changed in place)
export function gateHandlers(handlers, ctx) {
  const modeAsks = PERMISSION_MODES.has(ctx.mode) && ctx.mode !== "turbo";
  for (const [name, fn] of Object.entries(handlers)) {
    if (typeof fn !== "function" || !isGatedTool(name) || (!modeAsks && !alwaysAsksTool(name))) continue;
    handlers[name] = async (args, ...rest) => {
      const p = await askPermission({ ...ctx, tool: name, args });
      if (!p.allowed) return p.message;
      return fn(args, ...rest);
    };
  }
  return handlers;
}

// POST /api/ai/permission/:id  { decision: once | chat | always | no | skip, note }
export async function answerPermission(req, res) {
  const id = String(req.params.id || "");
  const decision = String(req.body?.decision || "");
  if (!/^[0-9a-f-]{36}$/.test(id) || !["once", "chat", "always", "no", "skip"].includes(decision)) return res.status(400).json({ error: "Bad answer" });
  const raw = await redis.get(REQ(id)).catch(() => null);
  if (!raw) return res.status(404).json({ error: "This request is no longer waiting" });
  let meta = {};
  try { meta = JSON.parse(raw); } catch { /* bad request record */ }
  if (meta.userId && meta.userId !== String(req.user?._id || req.user?.id || "")) return res.status(403).json({ error: "Not your request" });
  await redis.set(DECISION(id), JSON.stringify({ decision, note: String(req.body?.note || "").slice(0, 2000) }), "EX", 3600);
  res.json({ ok: true });
}
