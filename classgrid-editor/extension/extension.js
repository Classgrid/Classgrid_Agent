// The Classgrid AI inside Classgrid Code (our own editor, built from VS Code's open-source code), like Cursor's AI is
// inside Cursor. It is built into the editor (not installed from a store) and:
// 1. shows our same Classgrid screens (client/, the editor build in ./app) in the editor: the Agent chat on the right
//    side, and all of Classgrid (Agent, Studio, Projects) in a tab. They are loaded from the editor's own files: no
//    localhost;
// 2. gives those screens what the Classgrid desktop app gives them (window.classgridDesktop, see bridge.js), carries
//    their calls to our server, and keeps their login;
// 3. runs the desktop app's own runner (runner.js), so the AI's terminal, files and memory notes work on this
//    computer, the same code as in the Classgrid desktop app.
const vscode = require("vscode");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

// Packed inside the editor: ./app (our screens) and ./desktop (the desktop app's parts). While developing, the same
// files straight from the repo.
const firstThere = (...dirs) => dirs.find((d) => fs.existsSync(d)) || dirs[0];
const APP_DIR = firstThere(path.join(__dirname, "app"), path.join(__dirname, "..", "..", "desktop", "app-editor"));
const DESKTOP_DIR = firstThere(path.join(__dirname, "desktop"), path.join(__dirname, "..", "..", "desktop"));
const API = /^https:\/\/api\.classgrid\.in\//;
const STORAGE_KEY = "classgrid.storage";

let parts = null; // the desktop app's runner, chats and memory (after activate)
let deviceId;
let log = null; // the "Classgrid" output (page errors and what failed)
let storage = {}; // our screens' saved settings and login (localStorage), kept in the editor's secret storage
let saveTimer = null;

async function activate(context) {
  log = vscode.window.createOutputChannel("Classgrid");
  context.subscriptions.push(log);
  const userData = context.globalStorageUri.fsPath;
  fs.mkdirSync(userData, { recursive: true });
  const version = context.extension.packageJSON.version;
  require("./electron-shim").install({ userData, version });
  const runner = require(path.join(DESKTOP_DIR, "runner.js"));
  const chats = require(path.join(DESKTOP_DIR, "chats.js"));
  const memory = require(path.join(DESKTOP_DIR, "memory.js"));
  runner.init(userData);
  chats.init(userData);
  memory.init(userData);
  parts = { runner, chats, memory, version, context };
  try { storage = JSON.parse((await context.secrets.get(STORAGE_KEY)) || "{}"); } catch { storage = {}; }
  // The folder open in this editor can be used by the AI (like a folder picked in the Classgrid app)
  for (const f of vscode.workspace.workspaceFolders || []) runner.allowFolder(f.uri.fsPath);
  context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders((e) => { for (const f of e.added) runner.allowFolder(f.uri.fsPath); }));
  context.subscriptions.push({ dispose: () => runner.stopAll() });

  context.subscriptions.push(vscode.window.registerWebviewViewProvider("classgrid.agent", {
    resolveWebviewView(view) { holdScreens(view.webview, "/agent"); },
  }, { webviewOptions: { retainContextWhenHidden: true } }));

  context.subscriptions.push(vscode.commands.registerCommand("classgrid.showAgent", () => vscode.commands.executeCommand("classgrid.agent.focus")));
  context.subscriptions.push(vscode.commands.registerCommand("classgrid.open", () => {
    const panel = vscode.window.createWebviewPanel("classgrid.app", "Classgrid", vscode.ViewColumn.Active, { enableScripts: true, retainContextWhenHidden: true });
    panel.iconPath = vscode.Uri.file(path.join(__dirname, "media", "classgrid.svg"));
    holdScreens(panel.webview, "/");
  }));

  // The Agent is on the right side when the editor opens (the right side bar starts open: configurationDefaults in
  // package.json; this also shows the Agent there once its view is ready)
  const showAgent = (tries) => vscode.commands.executeCommand("classgrid.agent.focus").then(undefined, () => { if (tries > 0) setTimeout(() => showAgent(tries - 1), 1000); });
  showAgent(10);
}

function deactivate() { try { parts?.runner.stopAll(); } catch { /* already stopped */ } }

// Our screens in a panel, straight from the editor's files: the page with the bridge first, then the app's own code
function holdScreens(webview, startPath) {
  const drives = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").filter((l) => { try { return fs.existsSync(`${l}:\\`); } catch { return false; } });
  webview.options = { enableScripts: true, localResourceRoots: [vscode.Uri.file(APP_DIR), ...drives.map((l) => vscode.Uri.file(`${l}:\\`))] };
  const slash = (u) => String(u).replace(/\/?$/, "/");
  const base = slash(webview.asWebviewUri(vscode.Uri.file(APP_DIR)));
  const fileBases = Object.fromEntries(drives.map((l) => [l.toLowerCase(), slash(webview.asWebviewUri(vscode.Uri.file(`${l}:\\`)))]));
  const cfg = { version: parts.version, deviceId: computerId(), startPath, base, fileBases, storage };
  const bridge = fs.readFileSync(path.join(__dirname, "bridge.js"), "utf8");
  const src = webview.cspSource;
  const csp = [
    `default-src ${src} https: data: blob: 'unsafe-inline' 'unsafe-eval'`,
    `connect-src ${src} https: wss: data: blob:`,
    `img-src ${src} https: data: blob:`,
    `media-src ${src} https: data: blob:`,
    `font-src ${src} https: data:`,
    `frame-src ${src} https:`,
    `worker-src ${src} blob:`,
  ].join("; ");
  // The page keeps its own address (so our screens' pages work); only its files point at the editor's copy
  const load = () => {
    const html = fs.readFileSync(path.join(APP_DIR, "index.html"), "utf8").replace(/\b(src|href)="\.\//g, `$1="${base}`);
    webview.html = html.replace(/<head([^>]*)>/, `<head$1>
<meta http-equiv="Content-Security-Policy" content="${csp}">
<script>window.__cgBridge=${JSON.stringify({ ...cfg, storage }).replace(/</g, "\\u003c")};</script>
<script>${bridge}</script>`);
  };
  webview.onDidReceiveMessage((m) => {
    if (m?.cgFetch) return proxyFetch(webview, m);
    if (m?.cgFetchAbort) return FETCHES.get(m.cgFetchAbort)?.abort();
    if (m?.cgStore) return keepStorage(m);
    if (m?.cgLog) return log.appendLine(`[${new Date().toISOString()}] page ${m.cgLog}: ${String(m.text).slice(0, 2000)}`);
    if (m?.cgCall !== undefined) return answerCall(webview, m, load);
  });
  load();
}

async function answerCall(webview, m, reload) {
  const fn = HANDLERS[m.method];
  let result, error;
  try {
    if (!fn) throw new Error(`${m.method} isn't in Classgrid Code yet`);
    result = await fn({ webview, reload }, ...(Array.isArray(m.args) ? m.args : []));
  } catch (err) { error = String(err?.message || err); }
  if (m.cgCall) webview.postMessage({ cgReply: m.cgCall, result, error });
}

// Our screens' calls to our server, carried by the editor (a page loaded from the editor's files can't call it
// itself); a streamed answer comes back piece by piece as it arrives
const FETCHES = new Map();
async function proxyFetch(webview, m) {
  const id = m.cgFetch;
  if (!API.test(String(m.url))) return webview.postMessage({ cgFetchError: id, error: "only Classgrid's server is carried by the editor" });
  const ac = new AbortController();
  FETCHES.set(id, ac);
  try {
    const headers = (Array.isArray(m.headers) ? m.headers : []).filter(([k]) => !/^(host|origin|referer|content-length|connection|cookie)$/i.test(String(k)));
    const res = await fetch(m.url, { method: m.method || "GET", headers, body: m.body ? Buffer.from(m.body, "base64") : undefined, signal: ac.signal, redirect: "follow" });
    const back = [];
    res.headers.forEach((v, k) => { if (!/^(content-encoding|content-length|transfer-encoding|set-cookie|connection)$/i.test(k)) back.push([k, v]); });
    webview.postMessage({ cgFetchHead: id, status: res.status, statusText: res.statusText, headers: back });
    if (res.body) for await (const chunk of res.body) webview.postMessage({ cgFetchChunk: id, data: Buffer.from(chunk).toString("base64") });
    webview.postMessage({ cgFetchEnd: id });
  } catch (err) {
    if (err?.name !== "AbortError") log.appendLine(`[${new Date().toISOString()}] ${m.method || "GET"} ${String(m.url).replace(/\?.*$/, "")} failed: ${err?.message || err}`);
    webview.postMessage({ cgFetchError: id, error: String(err?.message || err) });
  } finally {
    FETCHES.delete(id);
  }
}

// Saved settings and login, kept in the editor's secret storage (a moment after the last change)
function keepStorage(m) {
  if (m.cgStore === "set") storage[m.key] = m.value;
  else if (m.cgStore === "remove") delete storage[m.key];
  else if (m.cgStore === "clear") storage = {};
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { parts.context.secrets.store(STORAGE_KEY, JSON.stringify(storage)).then(undefined, () => {}); }, 300);
}

// What our screens can ask for (the same names and answers as the Classgrid desktop app's main.js)
const inside = (folder, file) => {
  const root = path.resolve(String(folder));
  const full = path.resolve(root, String(file));
  return full.toLowerCase().startsWith(root.toLowerCase() + path.sep) ? full : null;
};
async function showFile(full, startLine, endLine) {
  const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(full));
  const from = Math.max(0, (Number(startLine) || 1) - 1);
  const to = Math.max(from, (Number(endLine) || Number(startLine) || 1) - 1);
  const range = new vscode.Range(from, 0, to, 0);
  await vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.One, preview: false, selection: Number(startLine) > 0 ? range : undefined });
}
const HANDLERS = {
  openExternal: (_p, url) => { if (/^https?:\/\//.test(String(url))) return vscode.env.openExternal(vscode.Uri.parse(String(url))).then(() => undefined); },
  fileInfo: (_p, file) => {
    try { const st = fs.statSync(path.resolve(String(file || ""))); return { exists: true, isFile: st.isFile(), size: st.size, modified: st.mtimeMs }; } catch { return { exists: false }; }
  },
  openPath: async (_p, file) => {
    const full = path.resolve(String(file || ""));
    if (!fs.existsSync(full)) return;
    if (fs.statSync(full).isDirectory()) return vscode.commands.executeCommand("revealFileInOS", vscode.Uri.file(full)).then(() => undefined);
    // A text or code file opens in the editor itself; other files (PDFs, sheets, media) with the computer's own app
    if (/\.(pdf|docx?|xlsx?|xlsm|pptx?|odt|ods|odp|rtf|png|jpe?g|gif|webp|bmp|mp3|wav|ogg|m4a|mp4|webm|mov|mkv|avi|zip)$/i.test(full)) return vscode.env.openExternal(vscode.Uri.file(full)).then(() => undefined);
    return showFile(full);
  },
  showInFolder: (_p, file) => { const full = path.resolve(String(file || "")); if (fs.existsSync(full)) return vscode.commands.executeCommand("revealFileInOS", vscode.Uri.file(full)).then(() => undefined); },
  pickFolder: async () => {
    const r = await vscode.window.showOpenDialog({ canSelectFolders: true, canSelectFiles: false, canSelectMany: false });
    if (!r?.length) return null;
    parts.runner.allowFolder(r[0].fsPath); // only folders picked here (or open in the editor) are used by the AI's runner
    return r[0].fsPath;
  },
  setToken: (_p, t) => { parts.runner.setToken(t || null); parts.chats.setToken(t || null); parts.memory.setToken(t || null); },
  saveMemory: (_p, m) => { try { return parts.memory.saveMine(m); } catch { return false; } },
  otherMemory: () => { try { return parts.memory.others(); } catch { return []; } },
  memoryIndex: () => { try { return require(path.join(DESKTOP_DIR, "aimemory.js")).index(); } catch { return ""; } },
  saveChat: (_p, chat) => parts.chats.saveChat(chat).catch((err) => ({ error: String(err.message || err) })),
  listChats: () => parts.chats.listChats().catch(() => []),
  readChat: (_p, id) => parts.chats.readChat(String(id || "")).catch(() => null),
  removeChat: (_p, id) => parts.chats.removeChat(String(id || "")).catch((err) => ({ error: String(err.message || err) })),
  listOtherChats: () => parts.chats.listOtherChats().catch(() => []),
  readOtherChat: (_p, userId, id) => parts.chats.readOtherChat(String(userId || ""), String(id || "")).catch(() => null),
  retry: (p) => { p.reload(); },
  // A folder project opens in this editor itself
  openFolder: (_p, folder) => {
    if (!parts.runner.isAllowed(folder)) return;
    return vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(String(folder)), { forceNewWindow: false }).then(() => undefined);
  },
  cloneRepo: async (_p, repo) => {
    const given = String(repo || "").trim();
    const isUrl = /^(https:\/\/[\w.-]+(:\d+)?\/[\w./~-]+|git@[\w.-]+:[\w./~-]+)$/.test(given);
    if (!isUrl && !/^[\w.-]+\/[\w.-]+$/.test(given)) return { error: "Paste a repository address (https://… or git@…) or a GitHub owner/name." };
    const url = isUrl ? given : `https://github.com/${given}.git`;
    const name = (url.split(/[/:]/).filter(Boolean).pop() || "repo").replace(/\.git$/i, "") || "repo";
    const r = await vscode.window.showOpenDialog({ title: `Choose where to download ${name}`, openLabel: "Download here", canSelectFolders: true, canSelectFiles: false });
    if (!r?.length) return null;
    const target = path.join(r[0].fsPath, name);
    if (fs.existsSync(target)) return { error: `A folder called "${name}" is already there. Pick another place, or open that folder instead.` };
    return new Promise((resolve) => {
      const git = require("node:child_process").spawn("git", ["clone", "--", url, target], { windowsHide: true });
      let err = "";
      git.stderr.on("data", (d) => { err += d.toString(); });
      git.on("error", () => resolve({ error: "Git isn't installed on this computer. Install it from git-scm.com, then try again." }));
      git.on("close", (code) => {
        if (code !== 0) return resolve({ error: err.trim().split("\n").pop() || "git clone failed" });
        parts.runner.allowFolder(target);
        resolve({ folder: target });
      });
    });
  },
  listFiles: (_p, folder) => parts.runner.listForFilesTab(String(folder || "")),
  githubRepo: (_p, folder) => parts.runner.githubRepoOf(String(folder || "")),
  readFile: (_p, folder, rel) => parts.runner.readForFilesTab(String(folder || ""), String(rel || "")),
  // A file the AI mentions or changed opens in this editor, at its lines
  openInEditor: (_p, folder, file, line) => {
    if (!parts.runner.isAllowed(folder)) return;
    const full = file ? inside(folder, file) : null;
    if (file && !full) return;
    return full ? showFile(full, line, line) : vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(String(folder))).then(() => undefined);
  },
  revealInEditor: async (_p, folder, file, startLine, endLine) => {
    if (!parts.runner.isAllowed(folder)) return { error: "This folder isn't open in Classgrid Code." };
    const full = inside(folder, file);
    if (!full) return { error: "That file isn't in this project." };
    await showFile(full, startLine, endLine);
    return { ok: true };
  },
};

// The device id the free AI limit counts per computer (the same scrambled Windows ID as the Classgrid desktop app)
function computerId() {
  if (deviceId !== undefined) return deviceId;
  deviceId = null;
  try {
    const out = require("node:child_process").execFileSync("reg", ["query", "HKLM\\SOFTWARE\\Microsoft\\Cryptography", "/v", "MachineGuid", "/reg:64"], { encoding: "utf8", windowsHide: true, timeout: 5000 });
    const guid = (out.match(/MachineGuid\s+REG_SZ\s+([\w-]+)/i) || [])[1];
    if (guid) deviceId = crypto.createHash("sha256").update(`classgrid-device:${guid.toLowerCase()}`).digest("hex");
  } catch { /* not Windows */ }
  return deviceId;
}

module.exports = { activate, deactivate };
