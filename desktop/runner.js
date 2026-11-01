// Local runner: Project / Studio projects opened from a folder on this computer have their file and terminal tools
// run here instead of on Classgrid's cloud sandbox. The backend (server/src/services/local-runner.service.js) sends
// "local-tool" over a socket logged in as this user; the answers are the same texts the cloud tools give.
// Only folders the user picked in this app (folders.json) can ever be touched.
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { io } = require("socket.io-client");

const API = process.env.CG_API || "https://api.classgrid.in"; // CG_API: a local backend when testing
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_OUTPUT = 60000;
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", ".turbo", ".cache", "__pycache__", ".venv", "venv"]);

let socket = null;
let foldersFile = null;
let currentToken = null;
const jobs = new Map(); // job id -> { proc, command, log, startedAt, exitCode }

// ── Folders the user picked ──────────────────────────────────────────────────────────────────────────────

function readFolders() {
  try { return JSON.parse(fs.readFileSync(foldersFile, "utf8")); } catch { return []; }
}
function allowFolder(folder) {
  const list = readFolders();
  if (!list.includes(folder)) fs.writeFileSync(foldersFile, JSON.stringify([...list, folder], null, 2));
}
const sameFolder = (a, b) => path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();
const isAllowedRoot = (root) => !!root && readFolders().some((f) => sameFolder(f, root));

// Paths are relative to the project folder; never outside it, never into .git
function resolveIn(root, given = "") {
  let rel = String(given || "").trim().replace(/\\/g, "/");
  for (const prefix of ["/data/project", "/data"]) {
    if (rel === prefix) rel = "";
    else if (rel.startsWith(prefix + "/")) rel = rel.slice(prefix.length + 1);
  }
  rel = rel.replace(/^\.\//, "");
  if (path.isAbsolute(rel) || /^[a-zA-Z]:/.test(rel)) throw new Error("Path must be inside the project (relative to the project folder)");
  const full = path.resolve(root, rel || ".");
  const rootFull = path.resolve(root);
  if (full !== rootFull && !full.toLowerCase().startsWith(rootFull.toLowerCase() + path.sep)) throw new Error("Path must stay inside the project");
  if (full.split(path.sep).includes(".git")) throw new Error("The .git folder can't be changed directly");
  return { full, rel: path.relative(rootFull, full).replace(/\\/g, "/") || "." };
}

function readText(full) {
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) throw new Error("File not found");
  if (fs.statSync(full).size > MAX_FILE_BYTES) throw new Error("File is too big to open here (over 2 MB)");
  return fs.readFileSync(full, "utf8");
}

function lineChange(before, after) {
  const count = new Map();
  for (const l of before.split("\n")) count.set(l, (count.get(l) || 0) + 1);
  let added = 0;
  for (const l of after.split("\n")) {
    const n = count.get(l) || 0;
    if (n) count.set(l, n - 1); else added++;
  }
  let removed = 0;
  for (const n of count.values()) removed += n;
  return { added, removed };
}

const cap = (text) => (text.length > MAX_OUTPUT ? text.slice(0, MAX_OUTPUT / 2) + `\n… [${text.length - MAX_OUTPUT} characters cut] …\n` + text.slice(-MAX_OUTPUT / 2) : text);

// ── The tools (same answers as server/src/services/ide-project.service.js projectTools) ────────────────────

const tools = {
  list_project_files(root, { path: dir = "", depth = 2 }) {
    const { full, rel } = resolveIn(root, dir);
    const maxDepth = Math.min(Math.max(Number(depth) || 2, 1), 6);
    const out = [];
    const walk = (d, prefix, level) => {
      if (out.length >= 500) return;
      let entries = [];
      try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
      entries.sort((a, b) => a.name.localeCompare(b.name));
      for (const e of entries) {
        if (out.length >= 500) return;
        const p = prefix ? `${prefix}/${e.name}` : e.name;
        if (e.isDirectory()) {
          out.push(`${p}/`);
          if (!SKIP_DIRS.has(e.name) && level < maxDepth) walk(path.join(d, e.name), p, level + 1);
        } else out.push(p);
      }
    };
    walk(full, "", 1);
    return `Project folder: ${rel === "." ? "/" : rel}\n${out.join("\n") || "(empty)"}${out.length >= 500 ? "\n… (first 500 entries)" : ""}`;
  },

  view_project_file(root, { path: file, start_line, end_line }) {
    const { full, rel } = resolveIn(root, file);
    const lines = readText(full).split(/\r?\n/);
    const start = Math.max(1, Number(start_line) || 1);
    const end = Math.min(lines.length, Number(end_line) || Math.min(lines.length, start + 799));
    return `${rel} (lines ${start}-${end} of ${lines.length})\n${lines.slice(start - 1, end).map((l, i) => `${start + i}: ${l}`).join("\n")}`;
  },

  search_project(root, { query, path: dir = "", regex = false, ignore_case = false }) {
    if (!query) return "Error: query is empty";
    const { full } = resolveIn(root, dir);
    const re = regex ? new RegExp(String(query), ignore_case ? "i" : "") : null;
    const needle = ignore_case ? String(query).toLowerCase() : String(query);
    const hits = [];
    const files = new Set();
    const walk = (d) => {
      let entries = [];
      try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(p); continue; }
        let text;
        try { if (fs.statSync(p).size > MAX_FILE_BYTES) continue; text = fs.readFileSync(p, "utf8"); } catch { continue; }
        if (text.includes("\u0000")) continue; // binary
        text.split(/\r?\n/).forEach((line, i) => {
          const ok = re ? re.test(line) : (ignore_case ? line.toLowerCase() : line).includes(needle);
          if (ok) { files.add(p); hits.push(`${path.relative(root, p).replace(/\\/g, "/")}:${i + 1}:${line.slice(0, 300)}`); }
        });
      }
    };
    walk(full);
    if (!hits.length) return "No matches.";
    return `Found in ${files.size} file${files.size === 1 ? "" : "s"} (${hits.length} matching line${hits.length === 1 ? "" : "s"})${hits.length > 200 ? "; showing the first 200 lines" : ""}.\n${hits.slice(0, 200).join("\n")}`;
  },

  write_project_file(root, { path: file, content = "" }) {
    const { full, rel } = resolveIn(root, file);
    if (fs.existsSync(full)) return `Error: ${rel} already exists, so it was not changed. Change existing files with edit_project_file.`;
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, String(content), "utf8");
    const total = String(content).split("\n").length;
    return `Created ${rel} (${total} lines, +${total} -0).`;
  },

  edit_project_file(root, { path: file, edits = [] }) {
    const { full, rel } = resolveIn(root, file);
    if (!Array.isArray(edits) || !edits.length) return "Error: edits is empty";
    const raw = readText(full);
    const eol = raw.includes("\r\n") ? "\r\n" : "\n";
    let text = raw.replace(/\r\n/g, "\n");
    const original = text;
    const done = [];
    for (const [i, e] of edits.entries()) {
      const oldText = String(e?.old_text ?? "").replace(/\r\n/g, "\n");
      const newText = String(e?.new_text ?? "").replace(/\r\n/g, "\n");
      if (!oldText) return `Error in edit ${i + 1}: old_text is empty`;
      let from = 0;
      let to = text.length;
      if (e.start_line || e.end_line) {
        const lines = text.split("\n");
        const s = Math.max(1, Number(e.start_line) || 1);
        const en = Math.min(lines.length, Number(e.end_line) || lines.length);
        from = lines.slice(0, s - 1).reduce((n, l) => n + l.length + 1, 0);
        to = lines.slice(0, en).reduce((n, l) => n + l.length + 1, 0);
      }
      const part = text.slice(from, to);
      const count = part.split(oldText).length - 1;
      if (!count) return `Error in edit ${i + 1}: old_text was not found${e.start_line || e.end_line ? " in that line range" : ""}. Nothing was changed.`;
      if (count > 1 && !e.allow_multiple) return `Error in edit ${i + 1}: old_text was found ${count} times. Add more surrounding text, a line range, or set allow_multiple. Nothing was changed.`;
      text = text.slice(0, from) + part.split(oldText).join(newText) + text.slice(to);
      done.push(`edit ${i + 1}: ${count} place${count > 1 ? "s" : ""}`);
    }
    fs.writeFileSync(full, eol === "\n" ? text : text.replace(/\n/g, eol), "utf8");
    const { added, removed } = lineChange(original, text);
    return `Edited ${rel} (${done.join(", ")}, +${added} -${removed}).`;
  },

  // Python / JavaScript code, or shell lines, run in the project folder on this computer
  run_code(root, { language = "bash", code = "" }) {
    if (!String(code).trim()) return Promise.resolve("Error: code is empty");
    const lang = String(language).toLowerCase();
    if (lang === "bash" || lang === "shell" || lang === "sh" || lang === "powershell") return tools.execute_terminal_command(root, { command: code });
    const ext = lang === "python" ? "py" : "js";
    const file = path.join(require("node:os").tmpdir(), `classgrid-run-${Date.now()}.${ext}`);
    fs.writeFileSync(file, String(code), "utf8");
    const runner = lang === "python" ? (process.platform === "win32" ? "python" : "python3") : "node";
    return tools.execute_terminal_command(root, { command: `${runner} "${file}"` }).finally(() => fs.rm(file, { force: true }, () => {}));
  },

  // A command in the project folder (PowerShell on Windows), up to 10 minutes
  execute_terminal_command(root, { command }) {
    if (!command) return Promise.resolve("Error: command is empty");
    return new Promise((resolve) => {
      const proc = shellSpawn(String(command), root);
      let out = "";
      const add = (d) => { out += d.toString(); if (out.length > MAX_OUTPUT * 2) out = out.slice(-MAX_OUTPUT * 2); };
      proc.stdout.on("data", add);
      proc.stderr.on("data", add);
      const timer = setTimeout(() => { killTree(proc); out += "\n[Stopped: the command ran longer than 10 minutes. Use start_background_command for servers and long jobs.]"; }, 10 * 60 * 1000);
      proc.on("close", (code) => { clearTimeout(timer); resolve(`${cap(out.trim()) || "(no output)"}\n[exit code ${code}]`); });
      proc.on("error", (err) => { clearTimeout(timer); resolve(`Error: ${err.message}`); });
    });
  },

  start_background_command(root, { command }) {
    if (!command) return "Error: command is empty";
    const id = `job${jobs.size + 1}-${Date.now().toString(36).slice(-4)}`;
    const proc = shellSpawn(String(command), root);
    const job = { proc, command: String(command), log: "", startedAt: Date.now(), exitCode: null };
    const add = (d) => { job.log += d.toString(); if (job.log.length > 200000) job.log = job.log.slice(-200000); };
    proc.stdout.on("data", add);
    proc.stderr.on("data", add);
    proc.on("close", (code) => { job.exitCode = code; });
    jobs.set(id, job);
    return `Started in the background on the user's computer. job_id: ${id}. Check it with check_background_command.`;
  },

  check_background_command(_root, { job_id }) {
    const job = jobs.get(String(job_id));
    if (!job) return `Error: no background command ${job_id} (the desktop app may have been restarted).`;
    const state = job.exitCode === null ? "still running" : `finished (exit code ${job.exitCode})`;
    return `${job.command}\n${state}, started ${Math.round((Date.now() - job.startedAt) / 1000)}s ago. Last output:\n${cap(job.log.slice(-8000).trim()) || "(no output yet)"}`;
  },

  stop_background_command(_root, { job_id }) {
    const job = jobs.get(String(job_id));
    if (!job) return `Error: no background command ${job_id}.`;
    if (job.exitCode === null) killTree(job.proc);
    jobs.delete(String(job_id));
    return `Stopped ${job_id}.`;
  },
};

function shellSpawn(command, cwd) {
  return process.platform === "win32"
    ? spawn("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", command], { cwd, windowsHide: true })
    : spawn("/bin/bash", ["-lc", command], { cwd });
}

function killTree(proc) {
  if (!proc || proc.exitCode !== null) return;
  if (process.platform === "win32") spawn("taskkill", ["/pid", String(proc.pid), "/T", "/F"], { windowsHide: true });
  else proc.kill("SIGTERM");
}

// ── Socket to the backend ─────────────────────────────────────────────────────────────────────────────

function connect(token) {
  if (socket) { socket.disconnect(); socket = null; }
  if (!token) return;
  socket = io(API, { auth: { token, runner: true }, transports: ["websocket"], reconnection: true });
  socket.on("connect", () => console.log("[runner] connected to", API));
  socket.on("connect_error", (err) => console.log("[runner] could not connect:", err.message));
  socket.on("local-tool", async (req, ack) => {
    if (typeof ack !== "function") return;
    try {
      const { tool, args = {}, root } = req || {};
      console.log("[runner] tool", tool, "in", root);
      if (!tools[tool]) return ack({ text: `Error: ${tool} can't run on this computer.` });
      if (!isAllowedRoot(root)) return ack({ text: `Error: the folder ${root || "(none)"} wasn't opened in the Classgrid app on this computer, so it can't be used. Ask the user to open it with "Open folder" in the app.` });
      const text = await tools[tool](root, args);
      ack({ text: String(text) });
    } catch (err) {
      ack({ text: `Error: ${err.message || err}` });
    }
  });
}

module.exports = {
  init(userDataDir) { foldersFile = path.join(userDataDir, "folders.json"); },
  // The screens refresh the token often: only a different person (or logging out) reconnects; otherwise the fresh
  // token is just kept for the next reconnect
  setToken(token) {
    if (token === currentToken) return;
    const userOf = (t) => { try { return JSON.parse(Buffer.from(String(t).split(".")[1], "base64url").toString()).id || null; } catch { return null; } };
    const sameUser = token && currentToken && userOf(token) && userOf(token) === userOf(currentToken);
    currentToken = token;
    if (sameUser && socket) { socket.auth.token = token; return; }
    console.log("[runner] login", token ? "received" : "cleared");
    connect(token);
  },
  allowFolder,
  stopAll() { for (const job of jobs.values()) killTree(job.proc); jobs.clear(); socket?.disconnect(); },
};
