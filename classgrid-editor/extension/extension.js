// The Classgrid AI inside Classgrid Code (our own editor, built from VS Code's open-source code), like Cursor's AI is
// inside Cursor. It is built into the editor (not installed from a store) and:
// 1. shows our same Classgrid screens (client/, the desktop build) in the editor: the Agent chat on the right side,
//    and all of Classgrid (Agent, Studio, Projects) in a tab;
// 2. gives those screens what the Classgrid desktop app gives them (window.classgridDesktop, see bridge.js);
// 3. runs the desktop app's own runner (runner.js), so the AI's terminal, files and memory notes work on this
//    computer, the same code as in the Classgrid desktop app.
// The screens are served from this computer at http://localhost:47822 only for these panels; it is internal, it
// isn't an editor server, and nothing in the editor shows it.
const vscode = require("vscode");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const PORT = Number(process.env.CG_CODE_PORT) || 47822;
const APP_URL = `http://localhost:${PORT}`;
// Packed inside the editor: ./app (our screens) and ./desktop (the desktop app's parts). While developing, the same
// files straight from the repo.
const firstThere = (...dirs) => dirs.find((d) => fs.existsSync(d)) || dirs[0];
const APP_DIR = firstThere(path.join(__dirname, "app"), path.join(__dirname, "..", "..", "desktop", "app"));
const DESKTOP_DIR = firstThere(path.join(__dirname, "desktop"), path.join(__dirname, "..", "..", "desktop"));

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".webp": "image/webp", ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2",
  ".ttf": "font/ttf", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".webm": "video/webm", ".wasm": "application/wasm",
  ".txt": "text/plain; charset=utf-8", ".xml": "application/xml", ".webmanifest": "application/manifest+json",
  ".pdf": "application/pdf", ".bmp": "image/bmp", ".wav": "audio/wav", ".ogg": "audio/ogg", ".mov": "video/quicktime",
};
// Files on this computer shown in our screens (pictures, PDFs...): /__file/<secret>/<path>, a new secret each start
const FILE_PREFIX = `/__file/${crypto.randomBytes(16).toString("hex")}/`;

let parts = null; // the desktop app's runner, chats and memory (after activate)
let deviceId;
const views = new Set(); // the open Classgrid panels (to send events to)

function activate(context) {
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
  parts = { runner, chats, memory, version };
  // The folder open in this editor can be used by the AI (like a folder picked in the Classgrid app)
  for (const f of vscode.workspace.workspaceFolders || []) runner.allowFolder(f.uri.fsPath);
  context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders((e) => { for (const f of e.added) runner.allowFolder(f.uri.fsPath); }));

  const server = startScreenServer(version);
  context.subscriptions.push({ dispose: () => { server.close(); runner.stopAll(); } });

  context.subscriptions.push(vscode.window.registerWebviewViewProvider("classgrid.agent", {
    resolveWebviewView(view) { holdScreens(view.webview, "/agent", () => views.delete(view)); views.add(view); view.onDidDispose(() => views.delete(view)); },
  }, { webviewOptions: { retainContextWhenHidden: true } }));

  context.subscriptions.push(vscode.commands.registerCommand("classgrid.showAgent", () => vscode.commands.executeCommand("classgrid.agent.focus")));
  context.subscriptions.push(vscode.commands.registerCommand("classgrid.open", () => {
    const panel = vscode.window.createWebviewPanel("classgrid.app", "Classgrid", vscode.ViewColumn.Active, { enableScripts: true, retainContextWhenHidden: true });
    panel.iconPath = vscode.Uri.file(path.join(__dirname, "media", "classgrid.svg"));
    holdScreens(panel.webview, "/", () => {});
  }));

  // The Agent is on the right side when the editor opens (the right side bar starts open: configurationDefaults in
  // package.json; this also shows the Agent there once its view is ready)
  const showAgent = (tries) => vscode.commands.executeCommand("classgrid.agent.focus").then(undefined, () => { if (tries > 0) setTimeout(() => showAgent(tries - 1), 1000); });
  showAgent(10);
}

function deactivate() { try { parts?.runner.stopAll(); } catch { /* already stopped */ } }

// The page that holds our screens: a frame with them, and the messages between them and this extension
function holdScreens(webview, startPath, onGone) {
  webview.options = { enableScripts: true };
  const nonce = crypto.randomBytes(16).toString("base64");
  webview.html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src ${APP_URL}; script-src 'nonce-${nonce}'; style-src 'unsafe-inline';">
<style>html,body{margin:0;padding:0;height:100%;overflow:hidden;background:#121212}iframe{border:0;width:100%;height:100%;display:block}</style></head>
<body><iframe id="cg" src="${APP_URL}${startPath}" allow="clipboard-read; clipboard-write; microphone; camera; autoplay; fullscreen"></iframe>
<script nonce="${nonce}">
const vscode = acquireVsCodeApi();
const frame = document.getElementById("cg");
window.addEventListener("message", (e) => {
  const m = e.data || {};
  if (e.source === frame.contentWindow) { if (m.cgCall !== undefined) vscode.postMessage(m); return; }
  if (m.cgReply !== undefined || m.cgEvent) frame.contentWindow.postMessage(m, ${JSON.stringify(APP_URL)});
  if (m.cgReload) frame.src = ${JSON.stringify(APP_URL)} + (m.path || ${JSON.stringify(startPath)});
});
</script></body></html>`;
  webview.onDidReceiveMessage(async (m) => {
    const fn = HANDLERS[m.method];
    let result, error;
    try {
      if (!fn) throw new Error(`${m.method} isn't in Classgrid Code yet`);
      result = await fn(webview, ...(Array.isArray(m.args) ? m.args : []));
    } catch (err) { error = String(err?.message || err); }
    if (m.cgCall) webview.postMessage({ cgReply: m.cgCall, result, error });
  });
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
  openExternal: (_w, url) => { if (/^https?:\/\//.test(String(url))) return vscode.env.openExternal(vscode.Uri.parse(String(url))).then(() => undefined); },
  fileInfo: (_w, file) => {
    try { const st = fs.statSync(path.resolve(String(file || ""))); return { exists: true, isFile: st.isFile(), size: st.size, modified: st.mtimeMs }; } catch { return { exists: false }; }
  },
  openPath: async (_w, file) => {
    const full = path.resolve(String(file || ""));
    if (!fs.existsSync(full)) return;
    if (fs.statSync(full).isDirectory()) return vscode.commands.executeCommand("revealFileInOS", vscode.Uri.file(full)).then(() => undefined);
    // A text or code file opens in the editor itself; other files (PDFs, sheets, media) with the computer's own app
    if (/\.(pdf|docx?|xlsx?|xlsm|pptx?|odt|ods|odp|rtf|png|jpe?g|gif|webp|bmp|mp3|wav|ogg|m4a|mp4|webm|mov|mkv|avi|zip)$/i.test(full)) return vscode.env.openExternal(vscode.Uri.file(full)).then(() => undefined);
    return showFile(full);
  },
  showInFolder: (_w, file) => { const full = path.resolve(String(file || "")); if (fs.existsSync(full)) return vscode.commands.executeCommand("revealFileInOS", vscode.Uri.file(full)).then(() => undefined); },
  pickFolder: async () => {
    const r = await vscode.window.showOpenDialog({ canSelectFolders: true, canSelectFiles: false, canSelectMany: false });
    if (!r?.length) return null;
    parts.runner.allowFolder(r[0].fsPath); // only folders picked here (or open in the editor) are used by the AI's runner
    return r[0].fsPath;
  },
  setToken: (_w, t) => { parts.runner.setToken(t || null); parts.chats.setToken(t || null); parts.memory.setToken(t || null); },
  saveMemory: (_w, m) => { try { return parts.memory.saveMine(m); } catch { return false; } },
  otherMemory: () => { try { return parts.memory.others(); } catch { return []; } },
  memoryIndex: () => { try { return require(path.join(DESKTOP_DIR, "aimemory.js")).index(); } catch { return ""; } },
  saveChat: (_w, chat) => parts.chats.saveChat(chat).catch((err) => ({ error: String(err.message || err) })),
  listChats: () => parts.chats.listChats().catch(() => []),
  readChat: (_w, id) => parts.chats.readChat(String(id || "")).catch(() => null),
  removeChat: (_w, id) => parts.chats.removeChat(String(id || "")).catch((err) => ({ error: String(err.message || err) })),
  listOtherChats: () => parts.chats.listOtherChats().catch(() => []),
  readOtherChat: (_w, userId, id) => parts.chats.readOtherChat(String(userId || ""), String(id || "")).catch(() => null),
  retry: (w) => { w.postMessage({ cgReload: true }); },
  // A folder project opens in this editor itself
  openFolder: (_w, folder) => {
    if (!parts.runner.isAllowed(folder)) return;
    return vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(String(folder)), { forceNewWindow: false }).then(() => undefined);
  },
  cloneRepo: async (_w, repo) => {
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
  listFiles: (_w, folder) => parts.runner.listForFilesTab(String(folder || "")),
  githubRepo: (_w, folder) => parts.runner.githubRepoOf(String(folder || "")),
  readFile: (_w, folder, rel) => parts.runner.readForFilesTab(String(folder || ""), String(rel || "")),
  // A file the AI mentions or changed opens in this editor, at its lines
  openInEditor: (_w, folder, file, line) => {
    if (!parts.runner.isAllowed(folder)) return;
    const full = file ? inside(folder, file) : null;
    if (file && !full) return;
    return full ? showFile(full, line, line) : vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(String(folder))).then(() => undefined);
  },
  revealInEditor: async (_w, folder, file, startLine, endLine) => {
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

// Our screens, with the bridge first in the page (window.classgridDesktop for them)
function startScreenServer(version) {
  const bridge = fs.readFileSync(path.join(__dirname, "bridge.js"), "utf8");
  let page = null;
  const appPage = () => {
    if (page) return page;
    const cfg = { version, deviceId: computerId(), appUrl: APP_URL, filePrefix: FILE_PREFIX };
    const html = fs.readFileSync(path.join(APP_DIR, "index.html"), "utf8");
    return (page = html.replace(/<head([^>]*)>/, `<head$1>\n<script>window.__cgBridge=${JSON.stringify(cfg)};</script><script src="/__classgrid/bridge.js"></script>`));
  };
  const server = http.createServer((req, res) => {
    let urlPath;
    try { urlPath = decodeURIComponent(new URL(req.url, APP_URL).pathname); } catch { urlPath = "/"; }
    if (urlPath === "/__classgrid/bridge.js") {
      res.writeHead(200, { "Content-Type": MIME[".js"], "Cache-Control": "no-cache" });
      return res.end(bridge);
    }
    if (req.url.startsWith(FILE_PREFIX)) {
      let full;
      try { full = path.resolve(decodeURIComponent(new URL(req.url, APP_URL).pathname.slice(FILE_PREFIX.length))); } catch { res.writeHead(400); return res.end(); }
      return fs.stat(full, (err, st) => {
        if (err || !st.isFile()) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { "Content-Type": MIME[path.extname(full).toLowerCase()] || "application/octet-stream", "Content-Length": st.size, "Cache-Control": "no-store" });
        fs.createReadStream(full).pipe(res);
      });
    }
    let file = path.normalize(path.join(APP_DIR, urlPath));
    if (!file.startsWith(APP_DIR)) { res.writeHead(403); return res.end(); }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(APP_DIR, "index.html");
    if (file === path.join(APP_DIR, "index.html")) {
      res.writeHead(200, { "Content-Type": MIME[".html"], "Cache-Control": "no-cache" });
      return res.end(appPage());
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "public, max-age=31536000, immutable" });
    fs.createReadStream(file).pipe(res);
  });
  server.on("error", (err) => vscode.window.showErrorMessage(`Classgrid couldn't start its screens: ${err.message}`));
  server.listen(PORT, "127.0.0.1");
  return server;
}

module.exports = { activate, deactivate };
