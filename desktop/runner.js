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
const AUTO_BACKGROUND_S = Number(process.env.CG_AUTO_BACKGROUND_S) || 45; // a command still running after this keeps running as a background job
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", ".turbo", ".cache", "__pycache__", ".venv", "venv"]);

let socket = null;
let foldersFile = null;
let currentToken = null;
const jobs = new Map(); // job id -> { proc, command, log, startedAt, exitCode }
let browserStep = null; // the app's browser (browser.js), once the window is open

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

// "File changed" check: when the AI last read or wrote each file (its time on disk then). If the user (or another
// program) changes the file after that, the AI's next edit is stopped and it reads the file again first, so it
// never writes over newer work.
const seenAt = new Map(); // full path (lower case) -> mtimeMs when the AI last read or wrote it
const markSeen = (full) => { try { seenAt.set(full.toLowerCase(), fs.statSync(full).mtimeMs); } catch { /* gone */ } };
function changedSinceSeen(full) {
  const seen = seenAt.get(full.toLowerCase());
  if (seen === undefined) return false;
  try { return fs.statSync(full).mtimeMs > seen + 1; } catch { return false; }
}

// Hooks: the project's own .classgrid/hooks.json (like Claude Code's hooks), e.g.
//   { "after_edit": ["npx prettier --write \"{file}\""], "block_commands": ["git push --force", "rm -rf /"] }
// after_edit commands run after the AI creates or edits a file ({file} = its full path); a command containing a
// block_commands text is refused.
function projectHooks(root) {
  try {
    const h = JSON.parse(fs.readFileSync(path.join(root, ".classgrid", "hooks.json"), "utf8"));
    return { afterEdit: [].concat(h.after_edit || []).map(String).filter(Boolean), block: [].concat(h.block_commands || []).map(String).filter(Boolean) };
  } catch { return { afterEdit: [], block: [] }; }
}
function runAfterEdit(root, full) {
  const { afterEdit } = projectHooks(root);
  if (!afterEdit.length) return "";
  const { spawnSync } = require("node:child_process");
  const notes = afterEdit.map((cmd) => {
    const line = cmd.split("{file}").join(full);
    const r = spawnSync("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", line], { cwd: root, windowsHide: true, encoding: "utf8", timeout: 30000 });
    return r.status === 0 ? `hook ok: ${cmd}` : `hook failed (${cmd}): ${String(r.stderr || r.stdout || "").trim().split("\n").slice(-2).join(" ").slice(0, 300)}`;
  });
  return ` [${notes.join("; ")}]`;
}
function blockedByHooks(root, command) {
  const low = String(command).toLowerCase();
  return projectHooks(root).block.find((b) => low.includes(b.toLowerCase())) || null;
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

// ── One project in both places (a cloud project's copy on this computer, kept in step through GitHub) ──────────

// Git in a folder. GitHub's key, when the server sends one, only goes with the command (never into the folder);
// without it the user's own Git login on this computer is used, like push_project_to_github
function gitIn(dir, token) {
  const { spawnSync } = require("node:child_process");
  const env = { ...process.env };
  if (token) {
    const auth = Buffer.from(`x-access-token:${token}`).toString("base64");
    Object.assign(env, { GIT_TERMINAL_PROMPT: "0", GIT_CONFIG_COUNT: "1", GIT_CONFIG_KEY_0: "http.https://github.com/.extraheader", GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${auth}` });
  }
  return (...args) => spawnSync("git", dir ? ["-C", dir, ...args] : args, { windowsHide: true, encoding: "utf8", env, timeout: 10 * 60 * 1000 });
}
const gitLast = (r) => String(r.stderr || r.stdout || "").trim().split("\n").slice(-3).join(" ");
// "owner/name" of a GitHub address (https or git@), else null
const repoOfAddress = (url) => String(url || "").trim().match(/github\.com[/:]([\w.-]+\/[\w.-]+?)(?:\.git)?\/?$/i)?.[1] || null;
// The folder's own repo address as written in it (insteadOf rules not applied)
const originOf = (git) => String(git("config", "--get", "remote.origin.url").stdout || "").trim();
// Commits made here use the user's own Git name; only when this computer has none, their GitHub name from Classgrid
const whoArgs = (git, name, email) => (String(git("config", "user.email").stdout || "").trim() ? [] : ["-c", `user.name=${name || "Classgrid"}`, "-c", `user.email=${email || "code@classgrid.in"}`]);
function freeBytes(dir) {
  try { const s = fs.statfsSync(dir); return Number(s.bavail) * Number(s.bsize); } catch { return null; }
}
const driveSize = (b) => (b >= 1073741824 ? `${(b / 1073741824).toFixed(1)} GB` : b >= 1048576 ? `${Math.round(b / 1048576)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

// ripgrep, the search VS Code uses, from Classgrid Code's own files: searches in parallel and skips what .gitignore
// skips, so a big folder answers in about a second instead of reading every file one by one
const RG_INSIDE = [
  "resources/app/node_modules.asar.unpacked/@vscode/ripgrep-universal/bin/win32-x64/rg.exe",
  "resources/app/node_modules.asar.unpacked/@vscode/ripgrep/bin/rg.exe",
  "resources/app/node_modules/@vscode/ripgrep/bin/rg.exe",
];
let rgPath;
function ripgrep() {
  if (rgPath !== undefined) return rgPath;
  // Inside Classgrid Code this runs on the editor's own program; in the Classgrid app, in the editor it unpacked
  const roots = [path.dirname(process.execPath)];
  try {
    const base = path.join(path.dirname(foldersFile || ""), "classgrid-code");
    roots.push(...fs.readdirSync(base).map((n) => path.join(base, n)).filter((d) => fs.existsSync(path.join(d, ".unpacked")))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs));
  } catch { /* no editor unpacked yet */ }
  for (const root of roots) for (const rel of RG_INSIDE) if (fs.existsSync(path.join(root, rel))) return (rgPath = path.join(root, rel));
  return (rgPath = null);
}
// Searching with ripgrep, like Claude Code's Grep: a folder or one file, only some files (glob), lines around each
// match (context) or only the files' names. Results stream in and it stops at the limit, so even a repo of millions of
// lines answers in about a second. null when ripgrep isn't there (then the slower search runs).
const SEARCH_LIMIT = 200;
const globList = (glob) => (Array.isArray(glob) ? glob : String(glob || "").split(/[,\s]+/)).map((g) => String(g).trim()).filter(Boolean);
function runRipgrep(cwd, args, limit) {
  const rg = ripgrep();
  if (!rg) return Promise.resolve(null);
  return new Promise((resolve) => {
    let p;
    try { p = spawn(rg, args, { cwd, windowsHide: true }); } catch { resolve(null); return; }
    const lines = [];
    let buf = "", more = false, done = false;
    const finish = (out) => { if (done) return; done = true; clearTimeout(timer); resolve(out); };
    const timer = setTimeout(() => { more = true; try { p.kill(); } catch { /* gone */ } finish({ lines, more }); }, 60000);
    p.stdout.setEncoding("utf8");
    p.stdout.on("data", (d) => {
      buf += d;
      let at;
      while ((at = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, at).replace(/\r$/, "");
        buf = buf.slice(at + 1);
        if (lines.length >= limit) { more = true; try { p.kill(); } catch { /* gone */ } finish({ lines, more }); return; }
        lines.push(line);
      }
    });
    p.on("error", () => finish(null));
    p.on("close", (code) => {
      if (buf && lines.length < limit) lines.push(buf.replace(/\r$/, ""));
      finish(code === 0 || code === 1 || lines.length ? { lines, more } : null);
    });
  });
}
async function searchWithRipgrep(root, full, { query, regex, ignore_case, glob, context, files_only, max_results }) {
  let isFile = false;
  try { isFile = fs.statSync(full).isFile(); } catch { return "Error: there is no such file or folder."; }
  const cwd = isFile ? path.dirname(full) : full;
  const limit = Math.min(Math.max(Number(max_results) || SEARCH_LIMIT, 1), 2000);
  const around = Math.min(Math.max(Number(context) || 0, 0), 20);
  const args = [
    ...(files_only ? ["-l"] : ["--line-number", "--no-heading", "--with-filename", ...(around ? ["-C", String(around)] : [])]),
    "--color", "never", "--path-separator", "/", "--max-columns", "400", "--max-columns-preview", "--max-filesize", "4M",
    "--no-require-git", "--hidden", ...[...SKIP_DIRS].flatMap((d) => ["-g", `!${d}`]), ...globList(glob).flatMap((g) => ["-g", g]),
    ...(ignore_case ? ["-i"] : ["-s"]), ...(regex ? [] : ["-F"]), "-e", String(query), "--", isFile ? path.basename(full) : ".",
  ];
  const out = await runRipgrep(cwd, args, limit);
  if (!out) return null;
  const prefix = path.relative(root, cwd).replace(/\\/g, "/");
  const lines = out.lines.map((l) => (l === "--" ? l : (prefix ? `${prefix}/` : "") + l.replace(/^\.\//, "")));
  if (!lines.length) return "No matches.";
  if (files_only) return `Found in ${lines.length}${out.more ? "+" : ""} file${lines.length === 1 ? "" : "s"}${out.more ? ` (first ${limit}; narrow it with path or glob)` : ""}.\n${lines.join("\n")}`;
  const hits = lines.filter((l) => /^[^:]+:\d+:/.test(l));
  const files = new Set(hits.map((l) => l.slice(0, l.indexOf(":"))));
  return `Found in ${files.size}${out.more ? "+" : ""} file${files.size === 1 ? "" : "s"} (${hits.length}${out.more ? "+" : ""} matching line${hits.length === 1 ? "" : "s"})${out.more ? `; showing the first ${limit} lines, there are more: narrow it with path or glob, or use files_only` : ""}.\n${lines.join("\n")}`;
}
// Files by name, like Claude Code's Glob ("**/*Settings*.tsx", "*.md", "src/**/use*.ts"), newest first
async function findWithRipgrep(root, full, { pattern, max_results }) {
  const limit = Math.min(Math.max(Number(max_results) || SEARCH_LIMIT, 1), 2000);
  const pats = globList(pattern).map((g) => (/[/*?[]/.test(g) ? g : `**/*${g}*`)); // a bare word finds names containing it
  const args = ["--files", "--path-separator", "/", "--no-require-git", "--hidden", "--sortr", "modified",
    ...[...SKIP_DIRS].flatMap((d) => ["-g", `!${d}`]), ...pats.flatMap((g) => ["--iglob", g])];
  const out = await runRipgrep(full, args, limit);
  if (!out) return null;
  const prefix = path.relative(root, full).replace(/\\/g, "/");
  const lines = out.lines.map((l) => (prefix ? `${prefix}/` : "") + l.replace(/^\.\//, ""));
  if (!lines.length) return `No file matches ${pats.join(", ")}.`;
  return `Found ${lines.length}${out.more ? "+" : ""} file${lines.length === 1 ? "" : "s"}${out.more ? ` (first ${limit}; narrow the pattern)` : ""}, newest first:\n${lines.join("\n")}`;
}

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
    markSeen(full);
    const lines = readText(full).split(/\r?\n/);
    const start = Math.max(1, Number(start_line) || 1);
    const end = Math.min(lines.length, Number(end_line) || Math.min(lines.length, start + 799));
    return `${rel} (lines ${start}-${end} of ${lines.length})\n${lines.slice(start - 1, end).map((l, i) => `${start + i}: ${l}`).join("\n")}`;
  },

  async search_project(root, { query, path: dir = "", regex = false, ignore_case = false, glob, context, files_only, max_results }) {
    if (!query) return "Error: query is empty";
    const { full } = resolveIn(root, dir);
    const fast = await searchWithRipgrep(root, full, { query, regex, ignore_case, glob, context, files_only, max_results });
    if (fast !== null) return fast;
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
    // (one file is searched by itself; walking it as a folder found nothing)
    let isFile = false;
    try { isFile = fs.statSync(full).isFile(); } catch { return "Error: there is no such file or folder."; }
    if (isFile) {
      try {
        fs.readFileSync(full, "utf8").split(/\r?\n/).forEach((line, i) => {
          const ok = re ? re.test(line) : (ignore_case ? line.toLowerCase() : line).includes(needle);
          if (ok) { files.add(full); hits.push(`${path.relative(root, full).replace(/\\/g, "/")}:${i + 1}:${line.slice(0, 300)}`); }
        });
      } catch { /* unreadable */ }
    } else walk(full);
    if (!hits.length) return "No matches.";
    return `Found in ${files.size} file${files.size === 1 ? "" : "s"} (${hits.length} matching line${hits.length === 1 ? "" : "s"})${hits.length > 200 ? "; showing the first 200 lines" : ""}.\n${hits.slice(0, 200).join("\n")}`;
  },

  async find_project_files(root, { pattern, path: dir = "", max_results }) {
    if (!pattern) return "Error: pattern is empty";
    const { full } = resolveIn(root, dir);
    const fast = await findWithRipgrep(root, full, { pattern, max_results });
    if (fast !== null) return fast;
    // Without ripgrep: the names, walked (a bare word finds names containing it)
    const toRe = (g) => new RegExp("^" + (/[/*?]/.test(g) ? g : `**/*${g}*`)
      .replace(/[.+^${}()|\\]/g, "\\$&").replace(/\*\*\//g, "(?:.*/)?").replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*").replace(/\?/g, "[^/]") + "$", "i");
    const res = String(pattern).split(/[,\s]+/).filter(Boolean).map(toRe);
    const found = [];
    const walk = (d) => {
      if (found.length >= SEARCH_LIMIT) return;
      let entries = [];
      try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(p); continue; }
        if (res.some((r) => r.test(path.relative(full, p).replace(/\\/g, "/")))) found.push(path.relative(root, p).replace(/\\/g, "/"));
        if (found.length >= SEARCH_LIMIT) return;
      }
    };
    walk(full);
    return found.length ? `Found ${found.length} file${found.length === 1 ? "" : "s"}:\n${found.join("\n")}` : `No file matches ${pattern}.`;
  },

  write_project_file(root, { path: file, content = "" }) {
    const { full, rel } = resolveIn(root, file);
    if (fs.existsSync(full)) return `Error: ${rel} already exists, so it was not changed. Change existing files with edit_project_file.`;
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, String(content), "utf8");
    const hooked = runAfterEdit(root, full);
    markSeen(full);
    const total = String(content).split("\n").length;
    return `Created ${rel} (${total} lines, +${total} -0).${hooked}`;
  },

  edit_project_file(root, { path: file, edits = [] }) {
    const { full, rel } = resolveIn(root, file);
    if (!Array.isArray(edits) || !edits.length) return "Error: edits is empty";
    if (changedSinceSeen(full)) { seenAt.delete(full.toLowerCase()); return `Error: ${rel} was changed on disk after you last read it (the user or another program edited it). Nothing was changed. Read it again, then make your edit on the new version.`; }
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
    const hooked = runAfterEdit(root, full);
    markSeen(full);
    const { added, removed } = lineChange(original, text);
    return `Edited ${rel} (${done.join(", ")}, +${added} -${removed}).${hooked}`;
  },

  // Push a folder project to GitHub: commit everything and push with the user's own Git login on this computer
  push_project_to_github(root, { message }) {
    const { spawnSync } = require("node:child_process");
    const git = (...args) => spawnSync("git", ["-C", root, ...args], { windowsHide: true, encoding: "utf8", timeout: 5 * 60 * 1000 });
    const last = (r) => String(r.stderr || r.stdout || "").trim().split("\n").slice(-3).join(" ");
    const inside = git("rev-parse", "--is-inside-work-tree");
    if (inside.error) return "Error: Git isn't installed on this computer. Ask the user to install it from git-scm.com.";
    if (String(inside.stdout).trim() !== "true") return "Error: this project folder isn't a Git repository yet. Ask the user for their GitHub repository address, then run in the terminal: git init; git remote add origin <address>; and push again.";
    const remote = String(git("remote").stdout || "").trim();
    if (!remote) return "Error: this folder has no GitHub repository linked. Ask the user for the repository address, then run in the terminal: git remote add origin <address>; and push again.";
    const branch = String(git("rev-parse", "--abbrev-ref", "HEAD").stdout || "").trim() || "main";
    git("add", "-A");
    const changed = String(git("status", "--porcelain").stdout || "").trim();
    let committed = "nothing new to commit";
    if (changed) {
      const c = git("commit", "-m", String(message || "Update from Classgrid").slice(0, 500));
      if (c.status !== 0) return `Error: git commit failed: ${last(c)}`;
      committed = String(c.stdout || "").split("\n")[0].trim();
    }
    const up = git("rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}");
    const p = up.status === 0 ? git("push") : git("push", "-u", remote.split("\n")[0], branch);
    if (p.status !== 0) return `Error: git push failed (${committed}): ${last(p)}`;
    const url = String(git("remote", "get-url", remote.split("\n")[0]).stdout || "").trim();
    return `Pushed to GitHub: branch ${branch} of ${url} (${committed}). ${last(p)}`;
  },

  // A cloud project's copy on this computer: its GitHub repo downloaded into the folder the user picked (any drive),
  // after checking that drive has room. The picked folder is used as it is when it already is that repo, and a copy
  // already there is just brought up to date. Answers "Folder: ...", "Branch: ..." and one line for the user.
  clone_repo(root, { repo, branch, size_kb = 0, token, name, email }) {
    if (!/^[\w.-]+\/[\w.-]+$/.test(String(repo || ""))) return "Error: repo must be a GitHub owner/name.";
    const parent = path.resolve(root);
    const isThis = (dir) => fs.existsSync(dir) && (repoOfAddress(originOf(gitIn(dir))) || "").toLowerCase() === String(repo).toLowerCase();
    const folderName = String(repo).split("/")[1];
    const target = isThis(parent) ? parent : path.join(parent, folderName);
    if (fs.existsSync(target)) {
      if (!isThis(target)) return `Error: FOLDER_TAKEN A folder called "${folderName}" is already in ${parent} with other files in it. Pick another place.`;
      allowFolder(target);
      const got = tools.sync_repo(target, { mode: "pull", repo, branch, token, name, email });
      return got.startsWith("Error") ? got : `Folder: ${target}\n${got}`;
    }
    // Room for the download and its files (about twice GitHub's size), plus some to spare
    const free = freeBytes(parent);
    const need = Math.round((Number(size_kb) || 0) * 1024 * 2.5) + 50 * 1048576;
    if (free !== null && free < need) return `Error: NO_SPACE There isn't enough free space on ${path.parse(parent).root}. This project needs about ${driveSize(need)}, and only ${driveSize(free)} is free there. Pick a folder on another drive.`;
    const args = ["clone", "-q", ...(branch ? ["--branch", String(branch)] : []), "--", `https://github.com/${repo}.git`, target];
    let c = gitIn(null, token)(...args);
    if (c.error) return "Error: Git isn't installed on this computer. Install it from git-scm.com, then try again.";
    if (c.status !== 0 && token) c = gitIn(null)(...args); // the user's own Git login on this computer
    if (c.status !== 0) return `Error: git clone failed: ${gitLast(c)}`;
    allowFolder(target);
    const left = freeBytes(target);
    const on = String(gitIn(target)("rev-parse", "--abbrev-ref", "HEAD").stdout || "").trim();
    return `Folder: ${target}\nBranch: ${on}\nDownloaded to ${target}${left !== null ? ` (${driveSize(left)} still free on that drive)` : ""}.`;
  },

  // Keeps this computer's copy and GitHub in step. mode "pull": unsaved changes here are committed first (never
  // thrown away), then the latest from GitHub is put under them. mode "push": everything here is committed and pushed
  // to its branch on GitHub (a folder with no repo yet is linked to `repo` first). Answers "Repo: ...", "Branch: ..."
  // and one line for the user; "Error: CODE ..." when it can't.
  // The GitHub repo a folder pushes to (read only), for linking a folder project once it is on GitHub
  folder_repo(root) {
    const repo = githubRepoOf(root);
    return repo ? `Repo: ${repo}` : "Error: NO_REMOTE This folder isn't on GitHub yet.";
  },

  // Rename a folder on this computer (Rename in the project list): the folder keeps its place, only its name changes
  rename_folder(root, { name }) {
    if (!fs.existsSync(root)) return `Error: FOLDER_GONE The folder ${root} isn't on this computer any more.`;
    const folderName = String(name || "").trim().split(/[\\/]/).filter(Boolean).pop() || "";
    if (!folderName || /[<>:"|?*]/.test(folderName) || /^\.+$/.test(folderName)) return "Error: A folder name can't have these: < > : \" | ? *";
    const target = path.join(path.dirname(path.resolve(root)), folderName);
    if (sameFolder(target, root)) return `Folder: ${path.resolve(root)}`;
    if (fs.existsSync(target)) return `Error: There's already a folder called ${folderName} next to it. Pick another name.`;
    try {
      fs.renameSync(root, target);
    } catch (e) {
      return /EBUSY|EPERM|EACCES/.test(e.code || "")
        ? "Error: The folder is open in another app (an editor or a terminal). Close it there, then try again."
        : `Error: Could not rename the folder: ${e.message}`;
    }
    const list = readFolders();
    fs.writeFileSync(foldersFile, JSON.stringify([...list.filter((f) => !sameFolder(f, root)), target], null, 2));
    return `Folder: ${target}`;
  },

  // Link a folder on this computer to a GitHub repo the user picked: the folder becomes a Git folder if it isn't one,
  // and its "origin" points at the repo. Nothing is pushed or downloaded.
  link_repo(root, { repo }) {
    if (!fs.existsSync(root)) return `Error: FOLDER_GONE The folder ${root} isn't on this computer any more.`;
    if (!/^[\w.-]+\/[\w.-]+$/.test(String(repo || ""))) return "Error: Pick a repo.";
    const git = gitIn(root);
    const inside = git("rev-parse", "--is-inside-work-tree");
    if (inside.error) return "Error: Git isn't installed on this computer. Install it from git-scm.com, then try again.";
    if (String(inside.stdout).trim() !== "true") {
      const made = git("init");
      if (made.status !== 0) return `Error: Could not make this folder a Git folder: ${gitLast(made)}`;
    }
    const url = `https://github.com/${repo}.git`;
    const set = originOf(git) ? git("remote", "set-url", "origin", url) : git("remote", "add", "origin", url);
    if (set.status !== 0) return `Error: Could not link the folder to ${repo}: ${gitLast(set)}`;
    return `Repo: ${repo}\nLinked ${root} to ${repo}.`;
  },

  sync_repo(root, { mode = "pull", repo, branch, message, token, name, email }) {
    if (!fs.existsSync(root)) return `Error: FOLDER_GONE The copy on this computer isn't at ${root} any more.`;
    const git = gitIn(root, token);
    const inside = git("rev-parse", "--is-inside-work-tree");
    if (inside.error) return "Error: Git isn't installed on this computer. Install it from git-scm.com, then try again.";
    const isRepo = String(inside.stdout).trim() === "true";
    const who = isRepo ? whoArgs(git, name, email) : [];
    const conflict = (other) => {
      git("rebase", "--abort");
      const files = String(git("diff", "--name-only", "HEAD", other).stdout || "").trim().split("\n").filter(Boolean).slice(0, 10).join(", ");
      return `Error: CONFLICT GitHub has changes to the same lines as the changes on this computer, so they couldn't be joined by themselves. Nothing was lost. Files: ${files || "unknown"}.`;
    };

    if (mode === "pull") {
      if (!isRepo || (repo && (repoOfAddress(originOf(git)) || "").toLowerCase() !== String(repo).toLowerCase())) return `Error: FOLDER_GONE The folder ${root} isn't a copy of this project any more.`;
      // The user's own changes here are never committed by Classgrid: they are set aside while the latest comes in
      // (rebase --autostash) and put back after
      const saved = "";
      const f = git("fetch", "-q", "origin");
      if (f.status !== 0) return `Error: couldn't get the latest from GitHub: ${gitLast(f)}`;
      let current = String(git("rev-parse", "--abbrev-ref", "HEAD").stdout || "").trim();
      // The branch the project works on (the cloud opens the same one)
      if (branch && current !== branch && git("rev-parse", "-q", "--verify", `refs/remotes/origin/${branch}`).status === 0) {
        const co = git("checkout", "-q", String(branch));
        if (co.status !== 0) return `Error: couldn't switch to the branch ${branch}: ${gitLast(co)}`;
        current = String(branch);
      }
      if (git("rev-parse", "-q", "--verify", `refs/remotes/origin/${current}`).status !== 0) return `Branch: ${current}\n${saved}Nothing new to get: GitHub has no branch ${current} yet.`;
      const behind = Number(String(git("rev-list", "--count", `HEAD..origin/${current}`).stdout || "").trim()) || 0;
      if (!behind) return `Branch: ${current}\n${saved}Already up to date with GitHub.`;
      if (git(...who, "rebase", "-q", "--autostash", `origin/${current}`).status !== 0) return conflict(`origin/${current}`);
      git("branch", "-q", `--set-upstream-to=origin/${current}`);
      return `Branch: ${current}\n${saved}Got ${behind} new change${behind === 1 ? "" : "s"} from GitHub.`;
    }

    if (!isRepo) {
      if (!repo) return "Error: NO_REMOTE This folder isn't linked to a GitHub repo yet.";
      const init = git("init", "-q", "-b", "main");
      if (init.status !== 0) return `Error: git init failed: ${gitLast(init)}`;
    }
    let origin = originOf(git);
    if (!origin) {
      if (!repo) return "Error: NO_REMOTE This folder isn't linked to a GitHub repo yet.";
      git("remote", "add", "origin", `https://github.com/${repo}.git`);
      origin = originOf(git);
    } else if (repo && (repoOfAddress(origin) || "").toLowerCase() !== String(repo).toLowerCase()) {
      return `Error: OTHER_REMOTE This folder is linked to ${origin}, not to ${repo}.`;
    }
    const ghRepo = repoOfAddress(origin);
    if (!ghRepo) return `Error: OTHER_REMOTE This folder is linked to ${origin}, which isn't on GitHub.`;
    const by = isRepo ? who : whoArgs(git, name, email);
    git("add", "-A");
    const changed = String(git("diff", "--cached", "--name-only").stdout || "").trim().split("\n").filter(Boolean);
    if (changed.length) {
      const what = `${changed.slice(0, 3).join(", ")}${changed.length > 3 ? ` and ${changed.length - 3} more` : ""}`;
      const c = git(...by, "commit", "-q", "-m", `${String(message || "Saved by Classgrid").slice(0, 200)}: ${what}`);
      if (c.status !== 0) return `Error: git commit failed: ${gitLast(c)}`;
    }
    if (git("rev-parse", "-q", "--verify", "HEAD").status !== 0) return `Repo: ${ghRepo}\nBranch: -\nNothing to save yet: this folder has no files.`;
    const current = String(git("rev-parse", "--abbrev-ref", "HEAD").stdout || "").trim() || "main";
    // Someone may have pushed to the same branch meanwhile (the cloud copy): take theirs first and put ours on top
    git("fetch", "-q", "origin", current);
    if (git("rev-parse", "-q", "--verify", `refs/remotes/origin/${current}`).status === 0) {
      const ahead = Number(String(git("rev-list", "--count", `origin/${current}..HEAD`).stdout || "").trim()) || 0;
      if (!ahead) return `Repo: ${ghRepo}\nBranch: ${current}\nNothing new to save: GitHub already has all of it.`;
      if (git(...by, "rebase", "-q", `origin/${current}`).status !== 0) return conflict(`origin/${current}`);
    }
    const pushArgs = ["push", "-q", "-u", "origin", `HEAD:refs/heads/${current}`];
    let p = git(...pushArgs);
    if (p.status !== 0 && token) p = gitIn(root)(...pushArgs); // the user's own Git login on this computer
    if (p.status !== 0) return `Error: git push failed: ${gitLast(p)}`;
    return `Repo: ${ghRepo}\nBranch: ${current}\nSaved to GitHub${changed.length ? ` (${changed.length} file${changed.length === 1 ? "" : "s"} changed)` : ""}, branch ${current}.`;
  },

  // What the user is doing in the built-in editor: open file, cursor, selection, errors and their terminal commands
  editor_context() {
    if (!foldersFile) return "{}";
    try { return fs.readFileSync(path.join(path.dirname(foldersFile), "editor-bridge", "context.json"), "utf8"); } catch { return "{}"; }
  },

  // Wait until something is true on this computer (up to 10 minutes): a port answers, a web address answers, or a
  // file exists (or contains some text)
  async wait_until(root, { port, url, file, contains, timeout_seconds = 120 }) {
    const net = require("node:net");
    const until = Date.now() + Math.min(600, Math.max(1, Number(timeout_seconds) || 120)) * 1000;
    const full = file ? (path.isAbsolute(String(file)) ? String(file) : path.join(root, String(file))) : null;
    const check = async () => {
      if (port) return new Promise((ok) => { const s = net.connect(Number(port), "127.0.0.1"); s.once("connect", () => { s.destroy(); ok(true); }); s.once("error", () => ok(false)); setTimeout(() => { s.destroy(); ok(false); }, 1500); });
      if (url) { try { const r = await fetch(String(url), { signal: AbortSignal.timeout(3000) }); return r.status < 500; } catch { return false; } }
      if (full) { try { return fs.existsSync(full) && (!contains || fs.readFileSync(full, "utf8").includes(String(contains))); } catch { return false; } }
      return false;
    };
    if (!port && !url && !full) return "Error: give a port, a url or a file to wait for.";
    const what = port ? `port ${port}` : url ? String(url) : `${full}${contains ? ` containing "${contains}"` : ""}`;
    const started = Date.now();
    while (Date.now() < until) {
      if (await check()) return `Ready after ${Math.round((Date.now() - started) / 1000)} seconds: ${what}.`;
      await wait(1000);
    }
    return `Still not ready after ${Math.round((Date.now() - started) / 1000)} seconds: ${what}.`;
  },

  // Jupyter notebooks (.ipynb): replace, insert or delete one cell, keeping the notebook valid
  notebook_edit(root, { path: file, cell_index = 0, mode = "replace", source = "", cell_type }) {
    const full = path.isAbsolute(String(file || "")) ? path.resolve(String(file)) : resolveIn(root, file).full;
    if (!/\.ipynb$/i.test(full)) return "Error: notebook_edit only works on .ipynb files.";
    const nb = JSON.parse(readText(full));
    if (!Array.isArray(nb.cells)) return "Error: this file isn't a valid notebook (no cells).";
    const i = Math.max(0, Math.floor(Number(cell_index) || 0));
    const lines = String(source).split("\n").map((l, n, all) => (n < all.length - 1 ? l + "\n" : l));
    const kind = cell_type === "markdown" ? "markdown" : cell_type === "code" ? "code" : null;
    if (mode === "delete") {
      if (i >= nb.cells.length) return `Error: there is no cell ${i} (the notebook has ${nb.cells.length}).`;
      nb.cells.splice(i, 1);
    } else if (mode === "insert") {
      const t = kind || "code";
      nb.cells.splice(Math.min(i, nb.cells.length), 0, t === "code" ? { cell_type: "code", metadata: {}, execution_count: null, outputs: [], source: lines } : { cell_type: "markdown", metadata: {}, source: lines });
    } else {
      if (i >= nb.cells.length) return `Error: there is no cell ${i} (the notebook has ${nb.cells.length}).`;
      const c = nb.cells[i];
      c.source = lines;
      if (kind && kind !== c.cell_type) { c.cell_type = kind; if (kind === "code") { c.outputs = []; c.execution_count = null; } else { delete c.outputs; delete c.execution_count; } }
      else if (c.cell_type === "code") { c.outputs = []; c.execution_count = null; }
    }
    fs.writeFileSync(full, JSON.stringify(nb, null, 1) + "\n", "utf8");
    markSeen(full);
    return `${mode === "delete" ? "Deleted" : mode === "insert" ? "Inserted" : "Replaced"} cell ${i} in ${path.basename(full)} (it now has ${nb.cells.length} cells).`;
  },

  // A helper's own copy of the project (git worktree) on a new branch next to the project folder, so helpers that edit
  // at the same time never touch each other's files; the main AI merges the branch afterwards
  create_worktree(root, { name = "helper" }) {
    const { spawnSync } = require("node:child_process");
    const git = (...args) => spawnSync("git", ["-C", root, ...args], { windowsHide: true, encoding: "utf8" });
    const inside = git("rev-parse", "--is-inside-work-tree");
    if (inside.error) return "Error: Git isn't installed on this computer, so the helper can't get its own copy.";
    if (String(inside.stdout).trim() !== "true") return "Error: this project folder isn't a Git repository, so the helper can't get its own copy.";
    if (git("rev-parse", "--verify", "HEAD").status !== 0) return "Error: this repository has no commits yet, so the helper can't get its own copy.";
    const safe = String(name).replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "helper";
    const stamp = Date.now().toString(36);
    const branch = `classgrid/${safe}-${stamp}`;
    const dir = path.join(path.dirname(path.resolve(root)), `${path.basename(path.resolve(root))}-helpers`, `${safe}-${stamp}`);
    const made = git("worktree", "add", "-b", branch, dir);
    if (made.status !== 0) return `Error: git worktree add failed: ${String(made.stderr || made.stdout).trim().split("\n").pop()}`;
    allowFolder(dir);
    return `Worktree: ${dir}\nBranch: ${branch}`;
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
  // A command that is still running after AUTO_BACKGROUND_S seconds keeps running as a background job (it isn't
  // stopped): the AI gets its job_id and waits for it with check_background_command, and can work on meanwhile
  execute_terminal_command(root, { command, shell }) {
    if (!command) return Promise.resolve("Error: command is empty");
    const blocked = blockedByHooks(root, command);
    if (blocked) return Promise.resolve(`Error: this project's hooks block commands containing "${blocked}" (.classgrid/hooks.json), so it didn't run.`);
    return new Promise((resolve) => {
      const proc = shellSpawn(String(command), root, shell);
      const job = { proc, command: String(command), log: "", startedAt: Date.now(), exitCode: null };
      const add = (d) => { job.log += d.toString(); if (job.log.length > 200000) job.log = job.log.slice(-200000); };
      proc.stdout.on("data", add);
      proc.stderr.on("data", add);
      let moved = false;
      const toBackground = setTimeout(() => {
        moved = true;
        const id = `job${jobs.size + 1}-${Date.now().toString(36).slice(-4)}`;
        job.id = id;
        job.chat = arguments[1] && arguments[1].__chat;
        jobs.set(id, job);
        resolve(`${cap(job.log.trim()) || "(no output yet)"}\n[Still running after ${AUTO_BACKGROUND_S} seconds, so it keeps running in the background as job_id ${id}. Wait for it to finish with check_background_command (job_id "${id}", wait_seconds up to 120), or stop it with stop_background_command.]`);
      }, AUTO_BACKGROUND_S * 1000);
      proc.on("close", (code) => { job.exitCode = code; clearTimeout(toBackground); if (!moved) resolve(`${cap(job.log.trim()) || "(no output)"}\n[exit code ${code}]`); else jobDone(job); });
      proc.on("error", (err) => { job.exitCode = -1; clearTimeout(toBackground); if (!moved) resolve(`Error: ${err.message}`); });
    });
  },

  start_background_command(root, { command, shell }) {
    if (!command) return "Error: command is empty";
    const blocked = blockedByHooks(root, command);
    if (blocked) return `Error: this project's hooks block commands containing "${blocked}" (.classgrid/hooks.json), so it didn't run.`;
    const id = `job${jobs.size + 1}-${Date.now().toString(36).slice(-4)}`;
    const proc = shellSpawn(String(command), root, shell);
    const job = { id, proc, command: String(command), log: "", startedAt: Date.now(), exitCode: null, chat: arguments[1] && arguments[1].__chat };
    const add = (d) => { job.log += d.toString(); if (job.log.length > 200000) job.log = job.log.slice(-200000); };
    proc.stdout.on("data", add);
    proc.stderr.on("data", add);
    proc.on("close", (code) => { job.exitCode = code; jobDone(job); });
    jobs.set(id, job);
    return `Started in the background on the user's computer. job_id: ${id}. Check it with check_background_command.`;
  },

  // wait_seconds: wait here (up to 2 minutes) until the job finishes, so the AI checks once instead of again and again
  async check_background_command(_root, { job_id, wait_seconds }) {
    const job = jobs.get(String(job_id));
    if (!job) return `Error: no background command ${job_id} (the desktop app may have been restarted).`;
    const until = Date.now() + Math.min(120, Math.max(0, Number(wait_seconds) || 0)) * 1000;
    while (job.exitCode === null && Date.now() < until) await wait(500);
    if (job.exitCode !== null) job.reported = true;
    const state = job.exitCode === null ? "still running" : `finished (exit code ${job.exitCode})`;
    return `${job.command}\n${state}, started ${Math.round((Date.now() - job.startedAt) / 1000)}s ago. Last output:\n${cap(job.log.slice(-8000).trim()) || "(no output yet)"}`;
  },

  // Type into a running background command (it asked a question, wants a choice or a line of input)
  async send_background_input(_root, { job_id, text = "", enter = true }) {
    const job = jobs.get(String(job_id));
    if (!job) return `Error: no background command ${job_id}.`;
    if (job.exitCode !== null) return `Error: ${job_id} has already finished (exit code ${job.exitCode}).`;
    const before = job.log.length;
    job.proc.stdin.write(String(text) + (enter === false || enter === "false" ? "" : "\r\n"));
    await wait(1500); // its answer
    return `Sent to ${job_id}. New output:\n${cap(job.log.slice(before).trim()) || "(nothing yet)"}`;
  },

  stop_background_command(_root, { job_id }) {
    const job = jobs.get(String(job_id));
    if (!job) return `Error: no background command ${job_id}.`;
    job.stopped = true; // stopped on purpose: its chat isn't woken
    if (job.exitCode === null) killTree(job.proc);
    jobs.delete(String(job_id));
    return `Stopped ${job_id}.`;
  },
};

// ── Any file on this computer (read_local_file, every chat in the app) ──────────────────────────────────────
// The backend shows the user a permission card before each read, so this is not limited to picked folders.
// Pictures and documents go back in pieces: the backend's socket takes at most 1 MB per message.

const LOCAL_IMAGE_TYPES = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".bmp": "image/bmp" };
const LOCAL_DOC_TYPES = { ".pdf": "application/pdf", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".doc": "application/msword", ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xls": "application/vnd.ms-excel", ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation", ".ppt": "application/vnd.ms-powerpoint" };
const MAX_IMAGE_FILE_BYTES = 10 * 1024 * 1024;
const LOCAL_AUDIO_TYPES = { ".mp3": "audio/mpeg", ".wav": "audio/wav", ".m4a": "audio/mp4", ".aac": "audio/aac", ".ogg": "audio/ogg", ".opus": "audio/ogg", ".flac": "audio/flac", ".webm": "audio/webm" };
const MAX_AUDIO_FILE_BYTES = 25 * 1024 * 1024;
const MAX_DOC_FILE_BYTES = 20 * 1024 * 1024;
const MODEL_IMAGE_BYTES = Math.floor(3.5 * 1024 * 1024); // the AI models take pictures up to 3.75 MB
const CHUNK_BYTES = 512 * 1024;
const TEXT_WINDOW_CHARS = 18000;
let lastBinary = null; // { key, kind, mime, buf }: the file being sent in pieces

function localPath(given) {
  let p = String(given || "").trim().replace(/^["']+|["']+$/g, "").replace(/^file:\/\/\/?/i, "");
  p = p.replace(/%([^%]+)%/g, (m, name) => process.env[name] ?? m);
  if (p === "~" || p.startsWith("~/") || p.startsWith("~\\")) p = path.join(require("node:os").homedir(), p.slice(1));
  if (!p) throw new Error("path is empty. Give the full path of the file, like C:\\Users\\name\\Downloads\\photo.png");
  if (!path.isAbsolute(p)) throw new Error(`"${p}" is not a full path. Give the full path, like C:\\Users\\name\\Downloads\\photo.png`);
  return path.resolve(p);
}

const sizeText = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : n >= 1024 ? `${Math.round(n / 1024)} KB` : `${n} bytes`);

// Big PNG / JPEG pictures (and BMP, which the AI can't take) are made smaller with Electron's image tools
function imageForModel(buf, ext) {
  if (buf.length <= MODEL_IMAGE_BYTES && ext !== ".bmp") return { buf, mime: LOCAL_IMAGE_TYPES[ext] };
  let nativeImage = null;
  try { nativeImage = require("electron").nativeImage; } catch { /* not inside the app */ }
  const img = nativeImage?.createFromBuffer ? nativeImage.createFromBuffer(buf) : null;
  if (!img || img.isEmpty()) {
    throw new Error(ext === ".bmp" ? "this BMP picture can't be opened here. Save it as PNG or JPG and try again." : `this picture is ${sizeText(buf.length)} and couldn't be made smaller to show it (pictures can be shown up to 3.5 MB, and only PNG and JPG pictures can be made smaller).`);
  }
  const { width, height } = img.getSize();
  const scale = Math.min(1, 2000 / Math.max(width, height));
  const small = scale < 1 ? img.resize({ width: Math.round(width * scale), height: Math.round(height * scale), quality: "good" }) : img;
  const png = small.toPNG();
  if (png.length <= MODEL_IMAGE_BYTES) return { buf: png, mime: "image/png" };
  const jpg = small.toJPEG(85);
  if (jpg.length <= MODEL_IMAGE_BYTES) return { buf: jpg, mime: "image/jpeg" };
  throw new Error(`this picture is too big to show to the AI, even after making it smaller (${sizeText(jpg.length)}).`);
}

// One piece of the file being sent (lastBinary), as the backend asks for them
function piece(bin, full, stat, chunk) {
  const chunks = Math.max(1, Math.ceil(bin.buf.length / CHUNK_BYTES));
  const n = Math.min(Math.max(0, Number(chunk) || 0), chunks - 1);
  return { kind: bin.kind, mime: bin.mime, name: path.basename(full), path: full, size: stat.size, bytes: bin.buf.length, chunk: n, chunks, data: bin.buf.subarray(n * CHUNK_BYTES, (n + 1) * CHUNK_BYTES).toString("base64") };
}

function textWindow(text, label, start_line, end_line) {
  const lines = text.split(/\r?\n/);
  const start = Math.min(lines.length, Math.max(1, Number(start_line) || 1));
  const last = Math.min(lines.length, Number(end_line) || lines.length);
  const out = [];
  let chars = 0;
  for (let n = start; n <= last; n++) {
    const line = `${n}: ${lines[n - 1]}`;
    if (out.length && chars + line.length > TEXT_WINDOW_CHARS) break;
    out.push(line.length > TEXT_WINDOW_CHARS ? line.slice(0, TEXT_WINDOW_CHARS) + " …" : line);
    chars += line.length + 1;
  }
  const end = start + out.length - 1;
  const more = end < lines.length ? ` To read more, call read_local_file again with start_line ${end + 1}.` : "";
  return `${label} (lines ${start}-${end} of ${lines.length}).${more}\n${out.join("\n")}`;
}

async function readLocalFile({ path: given, start_line, end_line, chunk = 0 } = {}) {
  const full = localPath(given);
  let stat;
  try { stat = fs.statSync(full); } catch { throw new Error(`there is no file or folder at ${full}`); }

  if (stat.isDirectory()) {
    let entries = [];
    try { entries = fs.readdirSync(full, { withFileTypes: true }); } catch (e) { throw new Error(`the folder ${full} can't be opened (${e.code || e.message})`); }
    entries.sort((a, b) => (b.isDirectory() - a.isDirectory()) || a.name.localeCompare(b.name));
    const rows = entries.slice(0, 500).map((e) => {
      if (e.isDirectory()) return `${e.name}\\`;
      let size = "";
      try { size = `  (${sizeText(fs.statSync(path.join(full, e.name)).size)})`; } catch { /* locked or gone */ }
      return `${e.name}${size}`;
    });
    return { text: `${full} is a folder with ${entries.length} item${entries.length === 1 ? "" : "s"}${entries.length > 500 ? " (the first 500 are shown)" : ""}. Read a file in it with its full path.\n${rows.join("\n") || "(empty)"}` };
  }
  if (!stat.isFile()) throw new Error(`${full} is not a file`);
  markSeen(full);

  const ext = path.extname(full).toLowerCase();
  if (LOCAL_VIDEO_TYPES.has(ext)) {
    // The video's sound goes in pieces after its pictures (the pictures are taken once)
    const key = `${full}|${stat.size}|${stat.mtimeMs}|sound`;
    if (Number(chunk) > 0 && lastBinary?.key === key) return { text: `${full} (its sound)`, file: piece(lastBinary, full, stat, chunk) };
    return readLocalVideo(full, stat, key);
  }
  const kind = LOCAL_IMAGE_TYPES[ext] ? "image" : LOCAL_DOC_TYPES[ext] ? "document" : LOCAL_AUDIO_TYPES[ext] ? "audio" : null;
  if (kind) {
    const max = kind === "image" ? MAX_IMAGE_FILE_BYTES : kind === "audio" ? MAX_AUDIO_FILE_BYTES : MAX_DOC_FILE_BYTES;
    if (stat.size > max) throw new Error(`${full} is ${sizeText(stat.size)}; files like this can be read up to ${sizeText(max)}.`);
    const key = `${full}|${stat.size}|${stat.mtimeMs}`;
    if (!lastBinary || lastBinary.key !== key) {
      const raw = fs.readFileSync(full);
      if (!raw.length) throw new Error(`${full} is empty`);
      const ready = kind === "image" ? imageForModel(raw, ext) : { buf: raw, mime: kind === "audio" ? LOCAL_AUDIO_TYPES[ext] : LOCAL_DOC_TYPES[ext] };
      lastBinary = { key, kind, mime: ready.mime, buf: ready.buf };
    }
    return { text: `${full} (${sizeText(stat.size)})`, file: piece(lastBinary, full, stat, chunk) };
  }

  const fd = fs.openSync(full, "r");
  let buf;
  try {
    buf = Buffer.alloc(Math.min(stat.size, MAX_FILE_BYTES));
    fs.readSync(fd, buf, 0, buf.length, 0);
  } finally {
    fs.closeSync(fd);
  }
  if (buf.subarray(0, 8192).includes(0)) throw new Error(`${full} is not a text file (it looks like a program, archive or other binary file), so it can't be read as text.`);
  const cut = stat.size > MAX_FILE_BYTES ? ` Only the first 2 MB of this ${sizeText(stat.size)} file can be read.` : "";
  return { text: textWindow(buf.toString("utf8").replace(/^\uFEFF/, ""), `${full}${cut ? ` (${sizeText(stat.size)}, cut)` : ""}`, start_line, end_line) + (cut ? `\n[${cut.trim()}]` : "") };
}

// Videos: the app plays the video out of sight and takes pictures (frames) from across it, so the AI can see what
// happens in it (no extra programs needed). The frames go to the AI one by one, and also as one sheet of all frames.
const LOCAL_VIDEO_TYPES = new Set([".mp4", ".webm", ".mov", ".m4v", ".mkv", ".ogv"]);
const VIDEO_FRAMES = 8;
const SOUND_SECONDS = 600;
const FRAME_WIDTH = 512;

async function videoFrames(full) {
  const { BrowserWindow, nativeImage } = require("electron");
  const { pathToFileURL } = require("node:url");
  const w = new BrowserWindow({ show: false, width: 960, height: 540, webPreferences: { offscreen: true, sandbox: true, contextIsolation: true, nodeIntegration: false, backgroundThrottling: false, webSecurity: false } });
  w.webContents.setAudioMuted(true);
  const timeout = (ms, what) => new Promise((_, no) => setTimeout(() => no(new Error(what)), ms));
  try {
    // A small page of our own that holds the video (a video file opened on its own doesn't load in a hidden window)
    const page = path.join(require("node:os").tmpdir(), `classgrid-video-${process.pid}.html`);
    fs.writeFileSync(page, `<!doctype html><meta charset="utf-8"><body><video preload="auto" muted src="${pathToFileURL(full).href}"></video></body>`);
    await Promise.race([w.loadFile(page), timeout(20000, "the video took too long to open")]);
    const meta = await Promise.race([w.webContents.executeJavaScript(`new Promise((ok) => {
      const v = document.querySelector("video");
      if (!v) return ok({ error: "no video" });
      v.pause(); v.muted = true; v.controls = false;
      document.body.style.cssText = "margin:0;background:#000;overflow:hidden";
      v.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;object-fit:contain;max-width:none;max-height:none;margin:0";
      const done = () => ok({ duration: v.duration, width: v.videoWidth, height: v.videoHeight });
      if (v.readyState >= 1) done(); else { v.addEventListener("loadedmetadata", done, { once: true }); v.addEventListener("error", () => ok({ error: "format" }), { once: true }); }
    })`), timeout(20000, "the video took too long to open")]);
    if (meta.error || !(meta.duration > 0) || !meta.width) throw new Error("this video's format can't be played here (MP4 and WebM work best). Ask the user to save it as MP4, or describe it.");
    const ratio = meta.width / meta.height;
    const h = Math.round(Math.min(720, 1280 / ratio));
    w.setContentSize(Math.round(h * ratio), h);
    const times = Array.from({ length: VIDEO_FRAMES }, (_, i) => Math.min(meta.duration - 0.05, (meta.duration * (i + 0.5)) / VIDEO_FRAMES));
    const frames = [];
    for (const t of times) {
      await Promise.race([w.webContents.executeJavaScript(`new Promise((ok) => { const v = document.querySelector("video"); v.addEventListener("seeked", () => requestAnimationFrame(() => requestAnimationFrame(ok)), { once: true }); v.currentTime = ${t}; })`), timeout(10000, "the video couldn't be stepped through")]);
      await wait(120);
      const img = await w.webContents.capturePage();
      if (img.isEmpty()) continue;
      const small = img.resize({ width: FRAME_WIDTH, quality: "good" });
      frames.push({ at: t, jpg: small.toJPEG(70) });
    }
    if (!frames.length) throw new Error("no pictures could be taken from this video");
    // All frames on one sheet (for models that look at one picture through a link)
    const sheet = await w.webContents.executeJavaScript(`new Promise((ok) => {
      const srcs = ${JSON.stringify(frames.map((f) => "data:image/jpeg;base64," + f.jpg.toString("base64")))};
      const cols = 4, rows = Math.ceil(srcs.length / cols), cw = 320;
      const imgs = srcs.map((s) => { const i = new Image(); i.src = s; return i; });
      Promise.all(imgs.map((i) => i.decode())).then(() => {
        const ch = Math.round(cw * imgs[0].naturalHeight / imgs[0].naturalWidth);
        const c = document.createElement("canvas"); c.width = cols * cw; c.height = rows * ch;
        const x = c.getContext("2d"); x.fillStyle = "#000"; x.fillRect(0, 0, c.width, c.height);
        imgs.forEach((im, i) => x.drawImage(im, (i % cols) * cw, Math.floor(i / cols) * ch, cw, ch));
        ok(c.toDataURL("image/jpeg", 0.7).split(",")[1]);
      }).catch(() => ok(""));
    })`).catch(() => "");
    // Its sound, as 16 kHz mono WAV (what speech-to-text wants), up to the first 10 minutes
    const wav = await Promise.race([w.webContents.executeJavaScript(`new Promise((ok) => {
      const x = new XMLHttpRequest(); x.open("GET", document.querySelector("video").src); x.responseType = "arraybuffer";
      x.onerror = () => ok(""); x.onload = async () => {
        try {
          const RATE = 16000, MAX = ${SOUND_SECONDS};
          const ctx = new OfflineAudioContext(1, 1, RATE);
          const decoded = await ctx.decodeAudioData(x.response);
          const secs = Math.min(decoded.duration, MAX);
          const off = new OfflineAudioContext(1, Math.ceil(secs * RATE), RATE);
          const src = off.createBufferSource(); src.buffer = decoded; src.connect(off.destination); src.start();
          const pcm = (await off.startRendering()).getChannelData(0);
          let peak = 0; for (let i = 0; i < pcm.length; i += 50) peak = Math.max(peak, Math.abs(pcm[i]));
          if (peak < 0.003) return ok("silent");
          const out = new DataView(new ArrayBuffer(44 + pcm.length * 2));
          const str = (o, t) => { for (let i = 0; i < t.length; i++) out.setUint8(o + i, t.charCodeAt(i)); };
          str(0, "RIFF"); out.setUint32(4, 36 + pcm.length * 2, true); str(8, "WAVEfmt "); out.setUint32(16, 16, true);
          out.setUint16(20, 1, true); out.setUint16(22, 1, true); out.setUint32(24, RATE, true); out.setUint32(28, RATE * 2, true);
          out.setUint16(32, 2, true); out.setUint16(34, 16, true); str(36, "data"); out.setUint32(40, pcm.length * 2, true);
          for (let i = 0; i < pcm.length; i++) out.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i])) * 0x7fff, true);
          const bytes = new Uint8Array(out.buffer); let bin = "";
          for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
          ok(btoa(bin));
        } catch { ok(""); }
      };
      x.send();
    })`), wait(60000).then(() => "")]).catch(() => "");
    return { meta, frames, sheet, sound: wav === "silent" ? "silent" : wav ? Buffer.from(wav, "base64") : null };
  } finally {
    if (!w.isDestroyed()) w.destroy();
  }
}

const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
async function readLocalVideo(full, stat, key) {
  const { meta, frames, sheet, sound } = await videoFrames(full);
  const heard = sound === "silent" ? " It has no sound (or only silence)." : sound ? "" : " Its sound couldn't be taken out.";
  const out = {
    text: `Video ${full} (${sizeText(stat.size)}, ${clock(meta.duration)} long, ${meta.width}x${meta.height}). ${frames.length} pictures taken from across the whole video are attached below, in order, at ${frames.map((f) => clock(f.at)).join(", ")}. Look at them yourself and describe what happens.${heard}`,
    video: { frames: frames.map((f) => f.jpg.toString("base64")), sheet },
  };
  if (Buffer.isBuffer(sound)) {
    lastBinary = { key, kind: "audio", mime: "audio/wav", buf: sound };
    out.file = piece(lastBinary, full, stat, 0);
  }
  return out;
}

const anywhereTools = { read_local_file: readLocalFile };

// Project Mode's file tools for files anywhere on this computer (chats that aren't a project): full paths, the same
// answers and the same steps in the chat ("Edited notes.txt +3 -1"). Each one is allowed by the user first. Windows,
// installed programs and this app's own folders are never changed.
function protectedFolders() {
  const list = [process.env.SystemRoot || "C:\\Windows", "C:\\Windows", process.env.ProgramFiles || "C:\\Program Files", "C:\\Program Files", process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", "C:\\Program Files (x86)"];
  if (foldersFile) list.push(path.dirname(foldersFile)); // the app's userData
  try {
    const { app } = require("electron");
    if (app?.getPath) list.push(app.getPath("userData"));
    if (app?.isPackaged) list.push(path.dirname(process.execPath));
  } catch { /* not inside the app */ }
  return list.filter(Boolean).map((f) => path.resolve(f).toLowerCase());
}
function writable(full) {
  const low = full.toLowerCase();
  const hit = protectedFolders().find((f) => low === f || low.startsWith(f + path.sep));
  if (hit) throw new Error(`${full} is inside a protected folder (${hit}: Windows, installed programs or the Classgrid app itself), so it can't be changed.`);
}
const withFull = (text, rel, full) => String(text).replace(rel, full);
const computerFileTools = {
  notebook_edit(args) {
    const full = localPath(args.path);
    writable(full);
    return tools.notebook_edit(path.dirname(full), { ...args, path: full });
  },
  write_project_file(args) {
    const full = localPath(args.path);
    writable(full);
    return withFull(tools.write_project_file(path.dirname(full), { ...args, path: path.basename(full) }), path.basename(full), full);
  },
  edit_project_file(args) {
    const full = localPath(args.path);
    writable(full);
    return withFull(tools.edit_project_file(path.dirname(full), { ...args, path: path.basename(full) }), path.basename(full), full);
  },
  list_project_files(args) {
    const full = localPath(args.path);
    if (!fs.existsSync(full) || !fs.statSync(full).isDirectory()) throw new Error(`there is no folder at ${full}`);
    return tools.list_project_files(full, { ...args, path: "" }).replace(/^Project folder: .*/, `Folder: ${full}`);
  },
  async search_project(args) {
    const full = localPath(args.path);
    if (!fs.existsSync(full)) throw new Error(`there is no file or folder at ${full}`);
    if (path.parse(full).root.toLowerCase() === full.toLowerCase()) throw new Error(`${full} is a whole drive; search a folder in it instead (like ${path.join(require("node:os").homedir(), "Documents")}).`);
    // (one file: searched from its folder)
    const isFile = fs.statSync(full).isFile();
    const base = isFile ? path.dirname(full) : full;
    const text = await tools.search_project(base, { ...args, path: isFile ? path.basename(full) : "" });
    // Each line's file as its full path (matches "file:12:", lines around them "file-12-", files_only lists names)
    return text.split("\n").map((l, i) => {
      if (i === 0 || l === "--") return l;
      const m = l.match(/^(.+?)([:-]\d+[:-][\s\S]*)$/);
      return m ? path.join(base, m[1]) + m[2] : args.files_only ? path.join(base, l) : l;
    }).join("\n");
  },
  async find_project_files(args) {
    const full = localPath(args.path);
    if (!fs.existsSync(full) || !fs.statSync(full).isDirectory()) throw new Error(`there is no folder at ${full}`);
    if (path.parse(full).root.toLowerCase() === full.toLowerCase()) throw new Error(`${full} is a whole drive; look in a folder in it instead (like ${path.join(require("node:os").homedir(), "Documents")}).`);
    const text = await tools.find_project_files(full, { ...args, path: "" });
    return text.split("\n").map((l, i) => (i === 0 || !l ? l : path.join(full, l))).join("\n");
  },
};

// The terminal in a chat that isn't a project: runs on this computer in the user's home folder (each command is allowed
// by the user first)
const COMPUTER_TOOLS = new Set(["execute_terminal_command", "start_background_command", "check_background_command", "stop_background_command", "run_code", "wait_until", "send_background_input"]);

// Git Bash when it is installed (else WSL's bash), for shell: "bash"
function bashPath() {
  const os = require("node:os");
  return ["C:\\Program Files\\Git\\bin\\bash.exe", "C:\\Program Files (x86)\\Git\\bin\\bash.exe", path.join(os.homedir(), "AppData", "Local", "Programs", "Git", "bin", "bash.exe")].find((f) => fs.existsSync(f)) || "bash.exe";
}
// A command runs like in the user's own terminal: their PowerShell profile is loaded, a question it asks can be
// answered (send_background_input), and text is UTF-8. shell: "bash" runs it in Bash, "cmd" in Command Prompt.
function shellSpawn(command, cwd, shell = "powershell") {
  if (process.platform !== "win32") return spawn("/bin/bash", ["-lc", command], { cwd });
  const which = String(shell || "powershell").toLowerCase();
  if (which === "bash" || which === "sh" || which === "git-bash") return spawn(bashPath(), ["-lc", command], { cwd, windowsHide: true });
  if (which === "cmd") return spawn("cmd.exe", ["/d", "/s", "/c", command], { cwd, windowsHide: true, windowsVerbatimArguments: true });
  return spawn("powershell.exe", ["-NoLogo", "-ExecutionPolicy", "Bypass", "-Command", `[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false); $OutputEncoding=[Text.UTF8Encoding]::new($false); ${command}`], { cwd, windowsHide: true });
}

// A background job finished: the server wakes the chat that started it (unless it was stopped on purpose)
function jobDone(job) {
  if (!job.chat || job.stopped) return;
  const seconds = Math.round((Date.now() - job.startedAt) / 1000);
  // A moment later: if the AI already saw the result itself (check_background_command), its chat isn't woken
  setTimeout(() => {
    if (job.reported || job.stopped || !socket) return;
    socket.emit("local-job-done", { jobId: job.id, chat: job.chat, command: job.command.slice(0, 1000), exitCode: job.exitCode, seconds, output: cap(job.log.slice(-6000).trim()) });
  }, 5000);
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
      const { tool, args = {}, root, chat } = req || {};
      if (chat) args.__chat = String(chat); // which chat started it (a finished background job wakes that chat)
      // The AI's browser steps go to the app's own browser (browser.js)
      // The AI using any app on this computer: screen pictures, the real mouse and keyboard (computer.js)
      if (tool === "computer") {
        console.log("[runner] computer", args.action);
        const r = await require("./computer").act(args);
        return ack({ text: r.text, computer: { image: r.image } });
      }
      // The AI's own memory notes on this computer (aimemory.js)
      if (tool === "memory") return ack({ text: require("./aimemory").run(args) });
      if (tool === "browser" && browserStep) {
        console.log("[runner] browser", args.action);
        return ack({ text: "ok", browser: await browserStep(args) });
      }
      if (anywhereTools[tool]) {
        console.log("[runner] tool", tool, args.path, args.chunk ? `piece ${args.chunk}` : "");
        return ack(await anywhereTools[tool](args));
      }
      if (!root && computerFileTools[tool]) {
        console.log("[runner] computer", tool, args.path);
        return ack({ text: String(await computerFileTools[tool](args)) });
      }
      if (!root && COMPUTER_TOOLS.has(tool)) {
        console.log("[runner] computer", tool);
        return ack({ text: String(await tools[tool](require("node:os").homedir(), args)) });
      }
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

// The Files tab for a folder project: the same shapes as the server's /projects/:id/files and /file
const IMAGE_TYPES = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon" };
// The GitHub repo ("owner/name") a folder pushes to, from its .git/config (null when it has none)
function githubRepoOf(root) {
  try {
    const cfg = fs.readFileSync(path.join(String(root), ".git", "config"), "utf8");
    const url = (cfg.match(/\[remote "origin"\][^[]*?url\s*=\s*(\S+)/) || cfg.match(/\[remote "[^"]+"\][^[]*?url\s*=\s*(\S+)/) || [])[1] || "";
    const m = url.match(/github\.com[:/]+([\w.-]+\/[\w.-]+?)(?:\.git)?\/?$/i);
    return m ? m[1] : null;
  } catch { return null; }
}

function listForFilesTab(root) {
  if (!isAllowedRoot(root)) return { error: "This folder wasn't opened in the Classgrid app on this computer." };
  const files = [];
  const walk = (d, prefix) => {
    if (files.length >= 5000) return;
    let entries = [];
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (files.length >= 5000) return;
      const rel = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name)) continue;
        files.push({ path: rel, type: "dir", size: null });
        walk(path.join(d, e.name), rel);
      } else {
        let size = 0;
        try { size = fs.statSync(path.join(d, e.name)).size; } catch { /* gone */ }
        files.push({ path: rel, type: "file", size });
      }
    }
  };
  walk(path.resolve(root), "");
  let branch = null;
  try { const head = fs.readFileSync(path.join(root, ".git", "HEAD"), "utf8").trim(); branch = head.startsWith("ref: refs/heads/") ? head.slice(16) : null; } catch { /* not a git folder */ }
  return { source: "local", repo: githubRepoOf(root), branch, files };
}
function readForFilesTab(root, rel) {
  if (!isAllowedRoot(root)) return { error: "This folder wasn't opened in the Classgrid app on this computer." };
  let full;
  try { full = resolveIn(root, rel).full; } catch (e) { return { error: e.message }; }
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) return { error: "File not found" };
  const buf = fs.readFileSync(full);
  const image = IMAGE_TYPES[path.extname(full).toLowerCase()];
  if (image) return buf.length > 5 * 1024 * 1024 ? { path: rel, binary: true, size: buf.length } : { path: rel, binary: true, image: true, mime: image, size: buf.length, data: buf.toString("base64") };
  if (buf.includes(0)) return { path: rel, binary: true, size: buf.length };
  const tooBig = buf.length > MAX_FILE_BYTES;
  return { path: rel, binary: false, size: buf.length, truncated: tooBig, content: buf.subarray(0, MAX_FILE_BYTES).toString("utf8") };
}

module.exports = {
  tools, // the AI's tools on this computer (also used by the terminal tests)
  readLocalFile,
  listForFilesTab,
  githubRepoOf,
  readForFilesTab,
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
  setBrowser(fn) { browserStep = fn; },
  isAllowed: (folder) => isAllowedRoot(folder),
  stopAll() { for (const job of jobs.values()) killTree(job.proc); jobs.clear(); socket?.disconnect(); },
};
