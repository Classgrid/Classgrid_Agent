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

// Commands that change or remove things for good, or reach outside the project
const DESTRUCTIVE = /(^|[\s;&|(])(rm\s|rmdir\s|sudo\s|mkfs|dd\s+if=|shred\s|git\s+push|git\s+reset\s+--hard|git\s+clean\s+-[a-z]*f|git\s+branch\s+-D|git\s+checkout\s+--\s|drop\s+(table|database)|truncate\s+table|npm\s+publish)/i;
const SENSITIVE = /(^|[\s;&|(])(rm\s|rmdir\s|mv\s|sudo\s|chmod\s|chown\s|kill\s|pkill\s|killall\s|docker\s|git\s+(push|reset|clean|rebase|merge|checkout|branch\s+-[dD]|commit|tag)|npm\s+(publish|uninstall|install|i)\b|yarn\s+(add|remove)|pnpm\s+(add|remove|install)|pip\s+(install|uninstall)|curl\s|wget\s|ssh\s|scp\s|drop\s+(table|database)|truncate\s|mkfs|dd\s+if=)/i;

const host = (u) => { try { return new URL(/^[a-z]+:\/\//i.test(u) ? u : `https://${u}`).host; } catch { return String(u || "").slice(0, 80); } };

// What an action is, for the card and for "always allow" (null = never asked)
export function describeAction(tool, args = {}) {
  const command = String(args?.command || "").trim();
  switch (tool) {
    case "execute_terminal_command":
      return { title: "Run this command?", detail: command, key: `cmd:${command}`, label: command, level: DESTRUCTIVE.test(command) ? 3 : SENSITIVE.test(command) ? 2 : 1 };
    case "start_background_command":
      return { title: "Run this command in the background?", detail: command, key: `cmd:${command}`, label: command, level: DESTRUCTIVE.test(command) ? 3 : SENSITIVE.test(command) ? 2 : 1 };
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
    default:
      return null;
  }
}
export const isGatedTool = (tool) => !!describeAction(tool, {});

// Does this mode ask for this action?
const asks = (mode, level) => (mode === "review" ? true : mode === "default" ? level >= 2 : mode === "auto" ? level >= 3 : false);

async function remembered(userId, sessionId, key) {
  const [inChat, always] = await Promise.all([
    sessionId ? redis.sismember(CHAT_ALLOW(sessionId), key).catch(() => 0) : 0,
    userId ? redis.sismember(USER_ALLOW(userId), key).catch(() => 0) : 0,
  ]);
  return !!(inChat || always);
}

// Ask the user (if the mode says so) and wait for the answer. Returns { allowed: true } or { allowed: false, message }.
export async function askPermission({ mode, userId, sessionId, tool, args, emit, isAborted }) {
  if (!PERMISSION_MODES.has(mode) || mode === "turbo") return { allowed: true };
  const a = describeAction(tool, args);
  if (!a || !asks(mode, a.level)) return { allowed: true };
  if (await remembered(userId, sessionId, a.key)) return { allowed: true };

  const id = crypto.randomUUID();
  await redis.set(REQ(id), JSON.stringify({ userId: String(userId || ""), sessionId: sessionId || "", key: a.key }), "EX", Math.ceil(WAIT_MS / 1000) + 600).catch(() => {});
  emit({ type: "permission_request", id, tool, title: a.title, detail: a.detail, label: a.label });

  const end = Date.now() + WAIT_MS;
  while (Date.now() < end) {
    if (isAborted?.()) return { allowed: false, message: "The user stopped the chat." };
    const raw = await redis.get(DECISION(id)).catch(() => null);
    if (raw) {
      let d = {};
      try { d = JSON.parse(raw); } catch { /* bad answer */ }
      emit({ type: "permission_resolved", id, decision: d.decision });
      if (d.decision === "chat" && sessionId) await redis.sadd(CHAT_ALLOW(sessionId), a.key).then(() => redis.expire(CHAT_ALLOW(sessionId), 30 * 24 * 60 * 60)).catch(() => {});
      if (d.decision === "always" && userId) await redis.sadd(USER_ALLOW(userId), a.key).catch(() => {});
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
  if (!PERMISSION_MODES.has(ctx.mode) || ctx.mode === "turbo") return handlers;
  for (const [name, fn] of Object.entries(handlers)) {
    if (typeof fn !== "function" || !isGatedTool(name)) continue;
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
