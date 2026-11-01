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

// ── Any file on this computer (read_local_file, every chat in the app) ──────────────────────────────────────
// The backend shows the user a permission card before each read, so this is not limited to picked folders.
// Pictures and documents go back in pieces: the backend's socket takes at most 1 MB per message.

const LOCAL_IMAGE_TYPES = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".bmp": "image/bmp" };
const LOCAL_DOC_TYPES = { ".pdf": "application/pdf", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".doc": "application/msword", ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xls": "application/vnd.ms-excel", ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation", ".ppt": "application/vnd.ms-powerpoint" };
const MAX_IMAGE_FILE_BYTES = 10 * 1024 * 1024;
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

function readLocalFile({ path: given, start_line, end_line, chunk = 0 } = {}) {
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

  const ext = path.extname(full).toLowerCase();
  const kind = LOCAL_IMAGE_TYPES[ext] ? "image" : LOCAL_DOC_TYPES[ext] ? "document" : null;
  if (kind) {
    const max = kind === "image" ? MAX_IMAGE_FILE_BYTES : MAX_DOC_FILE_BYTES;
    if (stat.size > max) throw new Error(`${full} is ${sizeText(stat.size)}; files like this can be read up to ${sizeText(max)}.`);
    const key = `${full}|${stat.size}|${stat.mtimeMs}`;
    if (!lastBinary || lastBinary.key !== key) {
      const raw = fs.readFileSync(full);
      if (!raw.length) throw new Error(`${full} is empty`);
      const ready = kind === "image" ? imageForModel(raw, ext) : { buf: raw, mime: LOCAL_DOC_TYPES[ext] };
      lastBinary = { key, kind, mime: ready.mime, buf: ready.buf };
    }
    const { buf, mime } = lastBinary;
    const chunks = Math.max(1, Math.ceil(buf.length / CHUNK_BYTES));
    const n = Math.min(Math.max(0, Number(chunk) || 0), chunks - 1);
    return {
      text: `${full} (${sizeText(stat.size)})`,
      file: { kind, mime, name: path.basename(full), path: full, size: stat.size, bytes: buf.length, chunk: n, chunks, data: buf.subarray(n * CHUNK_BYTES, (n + 1) * CHUNK_BYTES).toString("base64") },
    };
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

// Windows' own folders, installed programs and this app's own folders are never changed
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
function writablePath(given) {
  const full = localPath(given);
  const low = full.toLowerCase();
  const hit = protectedFolders().find((f) => low === f || low.startsWith(f.endsWith(path.sep) ? f : f + path.sep));
  if (hit) throw new Error(`${full} is inside a protected folder (${hit}: Windows, installed programs or the Classgrid app itself), so it can't be changed.`);
  if (path.parse(full).root.toLowerCase() === low || path.parse(full).root.toLowerCase() === low + path.sep) throw new Error(`${full} is a whole drive, so it can't be changed.`);
  return full;
}

function writeLocalFile({ path: given, content = "", overwrite = false } = {}) {
  const full = writablePath(given);
  const replace = overwrite === true || overwrite === "true";
  const text = String(content ?? "");
  let before = null;
  if (fs.existsSync(full)) {
    if (fs.statSync(full).isDirectory()) throw new Error(`${full} is a folder, not a file.`);
    if (!replace) throw new Error(`${full} already exists, so it was not changed. To replace it, call write_local_file again with overwrite: true, or change part of it with edit_local_file.`);
    before = fs.readFileSync(full, "utf8");
  }
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, text, "utf8");
  const total = text.split("\n").length;
  if (before === null) return { text: `Created ${full} (${total} lines, +${total} -0).` };
  const { added, removed } = lineChange(before.replace(/\r\n/g, "\n"), text.replace(/\r\n/g, "\n"));
  return { text: `Replaced ${full} (${total} lines, +${added} -${removed}).` };
}

function editLocalFile({ path: given, old_text, new_text, replace_all = false } = {}) {
  const full = writablePath(given);
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) throw new Error(`there is no file at ${full}`);
  const raw = readText(full);
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const text = raw.replace(/\r\n/g, "\n");
  const oldText = String(old_text ?? "").replace(/\r\n/g, "\n");
  const newText = String(new_text ?? "").replace(/\r\n/g, "\n");
  if (!oldText) return { text: "Error: old_text is empty" };
  const count = text.split(oldText).length - 1;
  if (!count) return { text: `Error: old_text was not found in ${full}. Nothing was changed.` };
  const all = replace_all === true || replace_all === "true";
  if (count > 1 && !all) return { text: `Error: old_text was found ${count} times in ${full}. Add more surrounding text, or set replace_all. Nothing was changed.` };
  const after = text.split(oldText).join(newText);
  fs.writeFileSync(full, eol === "\n" ? after : after.replace(/\n/g, eol), "utf8");
  const { added, removed } = lineChange(text, after);
  return { text: `Edited ${full} (${count} place${count > 1 ? "s" : ""}, +${added} -${removed}).` };
}

async function manageLocalFiles({ action, path: given, to } = {}) {
  const full = writablePath(given);
  const exists = fs.existsSync(full);
  const what = () => (fs.statSync(full).isDirectory() ? "folder" : "file");
  switch (action) {
    case "create_folder":
      if (exists) return { text: fs.statSync(full).isDirectory() ? `The folder ${full} already exists.` : `Error: ${full} is a file, so a folder can't be made there.` };
      fs.mkdirSync(full, { recursive: true });
      return { text: `Created the folder ${full}.` };
    case "move":
    case "copy": {
      if (!exists) throw new Error(`there is no file or folder at ${full}`);
      if (!to) throw new Error(`"to" is empty. Give the full path to ${action} it to.`);
      let dest = writablePath(to);
      if (fs.existsSync(dest) && fs.statSync(dest).isDirectory()) dest = path.join(dest, path.basename(full)); // into an existing folder
      if (fs.existsSync(dest)) throw new Error(`${dest} already exists, so nothing was ${action === "move" ? "moved" : "copied"}.`);
      if ((dest.toLowerCase() + path.sep).startsWith(full.toLowerCase() + path.sep)) throw new Error(`a folder can't be ${action === "move" ? "moved" : "copied"} into itself.`);
      const kind = what();
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      if (action === "copy") fs.cpSync(full, dest, { recursive: true, errorOnExist: true, force: false });
      else {
        try { fs.renameSync(full, dest); } catch (e) {
          if (e.code !== "EXDEV") throw e;
          fs.cpSync(full, dest, { recursive: true, errorOnExist: true, force: false }); // another drive: copy, then remove
          fs.rmSync(full, { recursive: true, force: true });
        }
      }
      return { text: `${action === "move" ? "Moved" : "Copied"} the ${kind} ${full} to ${dest}.` };
    }
    case "delete": {
      if (!exists) throw new Error(`there is no file or folder at ${full}`);
      let shell = null;
      try { shell = require("electron").shell; } catch { /* not inside the app */ }
      if (!shell?.trashItem) throw new Error("the Recycle Bin can only be used from inside the Classgrid app, so nothing was deleted.");
      const kind = what();
      await shell.trashItem(full);
      return { text: `Moved the ${kind} ${full} to the Recycle Bin (it can be restored from there).` };
    }
    default:
      throw new Error(`action must be create_folder, move, copy or delete (got "${action ?? ""}")`);
  }
}

// Tools that may touch any path (each call is allowed by the user on the permission card first)
const anywhereTools = { read_local_file: readLocalFile, write_local_file: writeLocalFile, edit_local_file: editLocalFile, manage_local_files: manageLocalFiles };

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
      // The AI's browser steps go to the app's own browser (browser.js)
      if (tool === "browser" && browserStep) {
        console.log("[runner] browser", args.action);
        return ack({ text: "ok", browser: await browserStep(args) });
      }
      if (anywhereTools[tool]) {
        console.log("[runner] tool", tool, args.path, args.chunk ? `piece ${args.chunk}` : "");
        return ack(await anywhereTools[tool](args));
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
  return { source: "local", repo: null, branch, files };
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
  listForFilesTab,
  readForFilesTab,
  readLocalFile,
  writeLocalFile,
  editLocalFile,
  manageLocalFiles,
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
