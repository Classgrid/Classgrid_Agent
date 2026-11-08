// Classgrid desktop app. Our screens (client/, built into ./app) are served from this computer at
// http://localhost:47821 and talk to the live backend (api.classgrid.in). A fixed port keeps the login saved.
const { app, BrowserWindow, shell, Menu, ipcMain, dialog } = require("electron");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const runner = require("./runner");
const codeEditor = require("./codeeditor");
const terminal = require("./terminal"); // the user's own terminals in Studio's Terminal tab
const browser = require("./browser");
const chats = require("./chats");
const uploads = require("./uploads");
const memory = require("./memory");

const PORT = Number(process.env.CG_PORT) || 47821; // CG_PORT: a second copy while testing
const APP_URL = `http://localhost:${PORT}`;
const APP_DIR = path.join(__dirname, "app");
const OUR_HOSTS = new Set(["localhost", "api.classgrid.in"]);

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".webp": "image/webp", ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2",
  ".ttf": "font/ttf", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".webm": "video/webm", ".wasm": "application/wasm",
  ".txt": "text/plain; charset=utf-8", ".xml": "application/xml", ".webmanifest": "application/manifest+json",
};

// index.html with the welcome screen (splash/) at the top of the page. The app's own script waits until the welcome
// screen has played (window.cgStartApp; it is preloaded meanwhile), and the website's outside styles and payment
// script no longer hold up the first paint, so the window never shows blank.
let pageCache = null;
function appPage() {
  if (pageCache) return pageCache;
  let html = fs.readFileSync(path.join(APP_DIR, "index.html"), "utf8");
  const entry = (html.match(/<script type="module" crossorigin src="([^"]+)"><\/script>/) || [])[1];
  if (entry && fs.existsSync(path.join(APP_DIR, "cg-splash.js"))) {
    html = html.replace(/<script type="module" crossorigin src="[^"]+"><\/script>/, `<link rel="modulepreload" crossorigin href="${entry}">`);
    html = html.replace(/<link\b(?=[^>]*rel="stylesheet")(?=[^>]*href="https:)([^>]*)>/g, `<link$1 media="print" onload="this.media='all'">`);
    html = html.replace(/<script src="(https:[^"]+)"><\/script>/g, `<script async src="$1"></script>`);
    const start = `<script>window.cgStartApp=function(){if(window.cgAppStarted)return;window.cgAppStarted=1;var s=document.createElement("script");s.type="module";s.crossOrigin="anonymous";s.src=${JSON.stringify(entry)};document.head.appendChild(s)};`
      + `setTimeout(function(){if(!window.cgSplashOn){window.cgStartApp();var s=document.getElementById("cg-splash");if(s)s.remove()}},10000)</script>`;
    const splash = fs.readFileSync(path.join(__dirname, "splash", "splash.html"), "utf8");
    html = html.replace(/<body([^>]*)>/, `<body$1>\n${splash}${start}<script src="/cg-splash.js?v=${fs.statSync(path.join(APP_DIR, "cg-splash.js")).mtimeMs | 0}"></script>`);
  }
  return (pageCache = html);
}

// Files on this computer shown in Studio's tabs (the PDF viewer, pictures, sheets, text): our screens ask for them at
// /__file/<secret>/<path>. The secret is new each time the app starts, so other pages can't read files this way.
const FILE_PREFIX = `/__file/${require("node:crypto").randomBytes(16).toString("hex")}/`;
const FILE_MIME = { ...MIME, ".pdf": "application/pdf", ".bmp": "image/bmp", ".wav": "audio/wav", ".ogg": "audio/ogg", ".mov": "video/quicktime" };
function serveLocalFile(req, res) {
  let full;
  try { full = path.resolve(decodeURIComponent(new URL(req.url, APP_URL).pathname.slice(FILE_PREFIX.length))); } catch { res.writeHead(400); return res.end(); }
  fs.stat(full, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "Content-Type": FILE_MIME[path.extname(full).toLowerCase()] || "application/octet-stream", "Content-Length": st.size, "Cache-Control": "no-store" });
    fs.createReadStream(full).pipe(res);
  });
}

// Serves ./app; any path that isn't a file gets index.html (the screens do their own routing)
function startScreenServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (req.url.startsWith(FILE_PREFIX)) return serveLocalFile(req, res);
      let urlPath;
      try { urlPath = decodeURIComponent(new URL(req.url, APP_URL).pathname); } catch { urlPath = "/"; }
      let file = path.normalize(path.join(APP_DIR, urlPath));
      if (!file.startsWith(APP_DIR)) { res.writeHead(403); return res.end(); }
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(APP_DIR, "index.html");
      if (file === path.join(APP_DIR, "index.html")) {
        res.writeHead(200, { "Content-Type": MIME[".html"], "Cache-Control": "no-cache" });
        return res.end(appPage());
      }
      const type = MIME[path.extname(file).toLowerCase()] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": type, "Cache-Control": file.endsWith("index.html") ? "no-cache" : "public, max-age=31536000, immutable" });
      fs.createReadStream(file).pipe(res);
    });
    server.once("error", reject);
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });
}

let win = null;

// Where the user was when the app closed (Agent, Studio or Project Mode, and the open chat): the app opens there again
// instead of a new chat. Login, sign-up and other pages that aren't a place to come back to are not kept.
const lastPlaceFile = () => path.join(app.getPath("userData"), "last-place.json");
function lastPlace() {
  try {
    const p = JSON.parse(fs.readFileSync(lastPlaceFile(), "utf8")).path;
    // Only a Studio or Project Mode place: the app never opens on Grids or another page
    return typeof p === "string" && /^\/(c|superadmin)\/(studio|project)(\/|\?|$)/.test(p) ? p : "/";
  } catch { return "/"; }
}
function rememberPlace(url) {
  try {
    const u = new URL(url);
    if (u.origin !== APP_URL) return;
    const where = u.pathname + u.search;
    if (where === "/" || /^\/(login|signin|signup|register|auth|oauth|verify|reset|forgot|logout|offline|public-chat-login|test-full-login|superadmin\/login)/i.test(u.pathname)) return;
    fs.writeFileSync(lastPlaceFile(), JSON.stringify({ path: where, at: Date.now() }));
  } catch { /* not a page of ours */ }
}
const isOurs = (url) => { try { return OUR_HOSTS.has(new URL(url).hostname); } catch { return false; } };

// The window buttons' colours, the same as our top bar (Studio's greys)
const TITLE_BAR = { dark: { color: "#181818", symbolColor: "#ffffff" }, light: { color: "#f5f5f5", symbolColor: "#000000" } };
// ...and the welcome screen's (splash/), which every window opens with
const SPLASH_BAR = { dark: { color: "#000000", symbolColor: "#ffffff" }, light: { color: "#ffffff", symbolColor: "#000000" } };

// A page of the built-in editor (localhost, its own port): the folder it shows as a Windows path, "" for none,
// undefined when it isn't the editor
function editorFolder(url) {
  let u;
  try { u = new URL(url); } catch { return undefined; }
  if (u.hostname !== "localhost" || !u.port || Number(u.port) === PORT) return undefined;
  let f = u.searchParams.get("folder") || "";
  f = f.replace(/^vscode-remote:\/\/[^/]*/, "");
  if (/^\/[a-zA-Z]:/.test(f)) f = f.slice(1);
  return f ? path.resolve(f.split("/").join(path.sep)) : "";
}
const appWindowOptions = () => ({
  minWidth: 900,
  minHeight: 600,
  title: "Classgrid",
  backgroundColor: "#000000",
  icon: path.join(__dirname, "build", "icon.png"),
  autoHideMenuBar: true,
  // No Windows title bar: our own top bar (client/src/main.tsx) sits in that row, with the window buttons on its right
  titleBarStyle: "hidden",
  titleBarOverlay: { ...SPLASH_BAR.dark, height: 40 },
  webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false, sandbox: true },
});
// The built-in editor's "Open Folder" switches its frame to another folder: that folder opens as this window's
// Project Mode project instead, so the AI works on the folder that is shown
function editorLinks(w) {
  w.webContents.on("will-frame-navigate", (details) => {
    if (details.isMainFrame) return;
    const next = editorFolder(details.url);
    const now = editorFolder(details.frame?.url || "");
    if (next === undefined || now === undefined || !next || next === now) return;
    details.preventDefault();
    if (!fs.existsSync(next)) return;
    runner.allowFolder(next); // picked by the user in the editor's own folder picker
    w.webContents.send("cg:openFolderProject", next);
  });
}
// The built-in editor's "New Window": a new Classgrid window in Project Mode (with the folder it picked, if any),
// never a bare editor window
function openAppWindow(folder) {
  if (folder && fs.existsSync(folder)) runner.allowFolder(folder);
  else folder = "";
  let base = "/c/project";
  try { if (new URL(win.webContents.getURL()).pathname.startsWith("/superadmin")) base = "/superadmin/project"; } catch { /* no main window */ }
  const w = new BrowserWindow({ width: 1300, height: 850, ...appWindowOptions() });
  w.webContents.setWindowOpenHandler(({ url }) => {
    const fromEditor = editorFolder(url);
    if (fromEditor !== undefined) { openAppWindow(fromEditor); return { action: "deny" }; }
    if (url === "about:blank" || isOurs(url)) return { action: "allow", overrideBrowserWindowOptions: { width: 600, height: 720, autoHideMenuBar: true } };
    shell.openExternal(url);
    return { action: "deny" };
  });
  w.webContents.on("will-navigate", (e, url) => { if (!isOurs(url)) { e.preventDefault(); shell.openExternal(url); } });
  editorLinks(w);
  w.loadURL(APP_URL + base + (folder ? `?openFolder=${encodeURIComponent(folder)}` : ""));
}

// The "Classgrid Code" icon runs the app with --code: the app's window stays hidden, Classgrid Code opens signed in with
// the app's login (one login for both), then the app closes. Not signed in yet: the app's window shows to sign in first,
// and Classgrid Code opens once the user has signed in.
let codeOnly = process.argv.includes("--code");
let codeWaiting = codeOnly;
function showMain() {
  codeOnly = false;
  if (win && !win.isDestroyed()) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); }
}
async function startCodeEditor() {
  if (!codeEditor.hasLogin()) { codeWaiting = true; return showMain(); }
  codeWaiting = false;
  try { await codeEditor.start(); }
  catch (err) { showMain(); dialog.showMessageBox(win, { type: "error", title: "Classgrid Code", message: "Classgrid Code didn't start.", detail: String(err.message || err) }); return; }
  if (codeOnly) setTimeout(() => { if (codeOnly) app.quit(); }, 1000);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false, // shown once the welcome screen has painted (no blank window)
    ...appWindowOptions(),
  });

  // Our pages stay in the app; other websites open in the user's own browser. Pop-ups (plugin logins) stay as
  // child windows so they can tell the app when the login is done.
  win.webContents.setWindowOpenHandler(({ url }) => {
    // The built-in editor's "New Window": a new Classgrid window in Project Mode, not a bare editor
    const fromEditor = editorFolder(url);
    if (fromEditor !== undefined) { openAppWindow(fromEditor); return { action: "deny" }; }
    if (url === "about:blank" || isOurs(url)) return { action: "allow", overrideBrowserWindowOptions: { width: 600, height: 720, autoHideMenuBar: true } };
    shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, url) => {
    // Google / GitHub sign-in: Google blocks its login inside apps, so it runs in the user's own browser. It is marked
    // desktop=1 and comes back through a classgrid://login link with a one-time code (see handleDeepLink).
    if (/^https:\/\/api\.classgrid\.in\/api\/auth\/(chat\/)?(google|github)\b/.test(url)) {
      e.preventDefault();
      const u = new URL(url);
      u.searchParams.set("host", "chat.classgrid.in");
      u.searchParams.set("desktop", "1");
      shell.openExternal(u.href);
      return;
    }
    if (!isOurs(url)) { e.preventDefault(); shell.openExternal(url); }
  });
  editorLinks(win);
  // No floating reCAPTCHA badge in the app window
  win.webContents.on("dom-ready", () => { win.webContents.insertCSS(".grecaptcha-badge { visibility: hidden !important; }").catch(() => {}); });
  // Back / forward / reload keys (the app has no menu bar)
  win.webContents.on("before-input-event", (e, input) => {
    if (input.type !== "keyDown") return;
    // Typing in the built-in code editor (an inner frame): its own keys win (Ctrl+R there is "Open Recent")
    const frame = win.webContents.focusedFrame;
    if (frame && frame !== win.webContents.mainFrame) return;
    const nav = win.webContents.navigationHistory;
    if (input.alt && input.key === "ArrowLeft" && nav.canGoBack()) { nav.goBack(); e.preventDefault(); }
    else if (input.alt && input.key === "ArrowRight" && nav.canGoForward()) { nav.goForward(); e.preventDefault(); }
    else if (input.key === "F5" || (input.control && input.key.toLowerCase() === "r")) { win.loadURL(APP_URL); e.preventDefault(); }
  });
  win.webContents.on("did-fail-load", (_e, code, _desc, url, isMainFrame) => {
    if (isMainFrame && code !== -3) win.loadFile(path.join(__dirname, "offline.html"));
  });
  // The welcome screen is at the top of the page, so the window can show as soon as the page is read (the black
  // background matches it). ready-to-show comes too late here.
  win.webContents.once("dom-ready", () => { if (!codeOnly) win.show(); });
  setTimeout(() => { if (win && !win.isDestroyed() && !win.isVisible() && !codeOnly) win.show(); }, 4000);
  // (--code: the page sends its login as soon as it starts; none a few seconds after it loaded means the user has to
  // sign in first)
  if (codeOnly) win.webContents.once("did-finish-load", () => setTimeout(() => { if (codeWaiting && !codeEditor.hasLogin()) showMain(); }, 4000));
  browser.attach(win); // the AI's browser (Studio's Browser tab) lives in this window
  win.webContents.on("did-navigate", (_e, url) => rememberPlace(url));
  win.webContents.on("did-navigate-in-page", (_e, url, isMainFrame) => { if (isMainFrame) rememberPlace(url); });
  win.loadURL(APP_URL + lastPlace());
}

ipcMain.on("cg:version", (e) => { e.returnValue = app.getVersion(); });
// Notification settings: one file on this computer, shared with Classgrid Code (%APPDATA%\Classgrid)
const NOTIFY_FILE = path.join(process.env.APPDATA || app.getPath("appData"), "Classgrid", "notification-settings.json");
ipcMain.handle("cg:getNotificationSettings", () => { try { return JSON.parse(fs.readFileSync(NOTIFY_FILE, "utf8")); } catch { return null; } });
ipcMain.handle("cg:saveNotificationSettings", (_e, s) => { try { fs.mkdirSync(path.dirname(NOTIFY_FILE), { recursive: true }); fs.writeFileSync(NOTIFY_FILE, JSON.stringify(s && typeof s === "object" ? s : {})); return true; } catch { return false; } });
// A Windows notification from our screens (a Grids message while the window is in the background). The window comes
// forward when the notification is clicked.
ipcMain.handle("cg:notify", (_e, { title, body } = {}) => {
  if (!title || !body) return false;
  try {
    const n = new Notification({ title: String(title), body: String(body) });
    n.on("click", () => { if (win && !win.isDestroyed()) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } });
    n.show();
    return true;
  } catch { return false; }
});
// This computer's own Windows ID (MachineGuid), scrambled so the real ID never leaves the computer: the free AI
// limit counts per computer, not per account (more accounts on one PC don't give more free usage)
let deviceId;
ipcMain.on("cg:deviceId", (e) => {
  if (deviceId === undefined) {
    deviceId = null;
    try {
      const out = require("node:child_process").execFileSync("reg", ["query", "HKLM\\SOFTWARE\\Microsoft\\Cryptography", "/v", "MachineGuid", "/reg:64"], { encoding: "utf8", windowsHide: true, timeout: 5000 });
      const guid = (out.match(/MachineGuid\s+REG_SZ\s+([\w-]+)/i) || [])[1];
      if (guid) deviceId = require("node:crypto").createHash("sha256").update(`classgrid-device:${guid.toLowerCase()}`).digest("hex");
    } catch { /* not Windows, or the key can't be read */ }
  }
  e.returnValue = deviceId;
});
// A file on this computer shown in a Studio tab: its address for our screens, and its size
ipcMain.on("cg:fileUrl", (e, file) => { e.returnValue = APP_URL + FILE_PREFIX + encodeURIComponent(path.resolve(String(file || ""))); });
ipcMain.handle("cg:fileInfo", (_e, file) => {
  try { const st = fs.statSync(path.resolve(String(file || ""))); return { exists: true, isFile: st.isFile(), size: st.size, modified: st.mtimeMs }; } catch { return { exists: false }; }
});
// Open it with the computer's own app (documents, sheets, pictures, media; never programs or scripts), or show it in File Explorer
const OPENABLE = /\.(pdf|docx?|xlsx?|xlsm|csv|pptx?|odt|ods|odp|rtf|txt|md|png|jpe?g|gif|webp|bmp|svg|mp3|wav|ogg|m4a|mp4|webm|mov|mkv|avi|zip)$/i;
// (a folder opens in File Explorer: a folder link in the AI's answer)
ipcMain.handle("cg:openPath", (_e, file) => {
  const full = path.resolve(String(file || ""));
  if (!fs.existsSync(full)) return;
  if (OPENABLE.test(full) || fs.statSync(full).isDirectory()) shell.openPath(full);
});
// The folder with the videos of the AI using the browser
ipcMain.handle("cg:openRecordings", () => shell.openPath(require("./recorder").folder()));
ipcMain.handle("cg:showInFolder", (_e, file) => { const full = path.resolve(String(file || "")); if (fs.existsSync(full)) shell.showItemInFolder(full); });
ipcMain.handle("cg:openExternal", (_e, url) => { if (/^https?:\/\//.test(String(url))) shell.openExternal(String(url)); });
ipcMain.handle("cg:retry", () => win?.loadURL(APP_URL));
// New project from a repo, downloaded to this computer: a GitHub "owner/name" or any Git address (https or git@).
// The user picks where, then git clone runs with their own Git login on this computer (Git Credential Manager asks
// when needed). Returns { folder } or { error }.
ipcMain.handle("cg:cloneRepo", async (_e, repo) => {
  const given = String(repo || "").trim();
  const isUrl = /^(https:\/\/[\w.-]+(:\d+)?\/[\w./~-]+|git@[\w.-]+:[\w./~-]+)$/.test(given);
  if (!isUrl && !/^[\w.-]+\/[\w.-]+$/.test(given)) return { error: "Paste a repository address (https://… or git@…) or a GitHub owner/name." };
  const url = isUrl ? given : `https://github.com/${given}.git`;
  const name = (url.split(/[/:]/).filter(Boolean).pop() || "repo").replace(/\.git$/i, "") || "repo";
  const r = await dialog.showOpenDialog(win, { title: `Choose where to download ${name}`, buttonLabel: "Download here", properties: ["openDirectory", "createDirectory"] });
  if (r.canceled) return null;
  const target = path.join(r.filePaths[0], name);
  if (fs.existsSync(target)) return { error: `A folder called "${name}" is already there. Pick another place, or open that folder instead.` };
  return new Promise((resolve) => {
    const { spawn } = require("node:child_process");
    const git = spawn("git", ["clone", "--", url, target], { windowsHide: true });
    let err = "";
    git.stderr.on("data", (d) => { err += d.toString(); });
    git.on("error", () => resolve({ error: "Git isn't installed on this computer. Install it from git-scm.com, then try again." }));
    git.on("close", (code) => {
      if (code !== 0) return resolve({ error: err.trim().split("\n").pop() || "git clone failed" });
      runner.allowFolder(target);
      resolve({ folder: target });
    });
  });
});

// Files tab for folder projects
ipcMain.handle("cg:listFiles", (_e, folder) => runner.listForFilesTab(String(folder || "")));
// A folder project's GitHub repo ("owner/name"), read from its git settings
ipcMain.handle("cg:githubRepo", (_e, folder) => runner.githubRepoOf(String(folder || "")));
ipcMain.handle("cg:readFile", (_e, folder, rel) => runner.readForFilesTab(String(folder || ""), String(rel || "")));

// Project Mode, folder projects: open the folder in VS Code or File Explorer (only folders picked in this app)
ipcMain.handle("cg:openFolder", (_e, folder) => { if (runner.isAllowed(folder)) shell.openPath(String(folder)); });
// (a file inside the folder, at a line, when given)
ipcMain.handle("cg:openInEditor", (_e, folder, file, line) => {
  if (!runner.isAllowed(folder)) return;
  let target = path.resolve(String(folder));
  if (file) {
    const full = path.resolve(target, String(file));
    if (!full.toLowerCase().startsWith(target.toLowerCase() + path.sep)) return;
    target = full + (Number(line) > 0 ? `:${Number(line)}` : "");
  }
  shell.openExternal("vscode://file/" + encodeURI(target.split("\\").join("/")));
});
// Classgrid Code, our own editor (codeeditor.js): a folder project opens in its own window, signed in, with the
// Agent on the right ({ opened: true } or { error })
ipcMain.handle("cg:startEditor", (_e, folder) => {
  if (!runner.isAllowed(folder)) return { error: "This folder wasn't opened in the Classgrid app on this computer." };
  return codeEditor.open(String(folder)).catch((err) => ({ error: String(err.message || err) }));
});
// (a file clicked in the chat steps, at its lines)
ipcMain.handle("cg:revealInEditor", (_e, folder, file, startLine, endLine) => {
  if (!runner.isAllowed(folder)) return { error: "This folder wasn't opened in the Classgrid app on this computer." };
  return codeEditor.reveal(String(folder), file, startLine, endLine).catch((err) => ({ error: String(err.message || err) }));
});
// (the search box and layout buttons in Project Mode's top bar: they are in Classgrid Code's own window now)
ipcMain.handle("cg:editorCommand", () => ({ ok: false }));
// Light or dark mode: the window buttons follow our top bar's colour
// The Edit menu in our top bar (Studio): undo, cut, copy, paste… on what the user was typing in
const EDIT_ACTIONS = new Set(["undo", "redo", "cut", "copy", "paste", "selectAll"]);
ipcMain.on("cg:edit", (e, action) => { if (EDIT_ACTIONS.has(action)) e.sender[action](); });
// While the welcome screen shows, the window buttons take its colour; the app's colour (sent meanwhile) follows after it
const splashBars = new Map(); // webContents id -> the app's last colour (dark or not) while the welcome screen shows
const setBar = (e, colors) => { try { BrowserWindow.fromWebContents(e.sender)?.setTitleBarOverlay(colors); } catch { /* window closing */ } };
ipcMain.on("cg:titleBar", (e, dark) => {
  if (splashBars.has(e.sender.id)) return void splashBars.set(e.sender.id, dark);
  setBar(e, dark ? TITLE_BAR.dark : TITLE_BAR.light);
});
ipcMain.on("cg:splashBar", (e, on, dark) => {
  if (on) {
    if (!splashBars.has(e.sender.id)) splashBars.set(e.sender.id, null);
    return setBar(e, dark ? SPLASH_BAR.dark : SPLASH_BAR.light);
  }
  const appDark = splashBars.get(e.sender.id);
  splashBars.delete(e.sender.id);
  setBar(e, appDark === false ? TITLE_BAR.light : TITLE_BAR.dark);
});
ipcMain.handle("cg:pickFolder", async () => {
  const r = await dialog.showOpenDialog(win, { properties: ["openDirectory"] });
  if (r.canceled) return null;
  runner.allowFolder(r.filePaths[0]); // only folders picked here can be used by the local runner
  return r.filePaths[0];
});
// Studio's Uploads tab: the files the user uploaded, kept on this computer (desktop/uploads.js)
ipcMain.handle("cg:uploadsList", () => uploads.list());
ipcMain.handle("cg:uploadsAdd", (_e, files, chatId) => uploads.add(files, chatId));
ipcMain.handle("cg:uploadsRemove", (_e, id) => uploads.remove(String(id || "")));
ipcMain.handle("cg:uploadsPick", async (_e, chatId) => {
  const r = await dialog.showOpenDialog(win, { title: "Upload files", buttonLabel: "Upload", properties: ["openFile", "multiSelections"] });
  if (r.canceled || !r.filePaths.length) return { files: [] };
  return uploads.add(r.filePaths.map((p) => ({ path: p })), chatId);
});
ipcMain.handle("cg:uploadsFolder", async () => { const dir = uploads.folder(); if (dir) { fs.mkdirSync(dir, { recursive: true }); shell.openPath(dir); } });
// Studio's File → Open File: a code or text file (no pictures, videos, sounds or archives); its folder becomes the project
const NOT_CODE = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "svg", "tif", "tiff", "heic", "avif", "psd", "mp4", "mov", "avi", "mkv", "webm", "wmv", "flv", "mp3", "wav", "ogg", "flac", "aac", "m4a", "zip", "rar", "7z", "tar", "gz", "exe", "msi", "dll", "iso", "bin"]);
ipcMain.handle("cg:pickFile", async () => {
  const r = await dialog.showOpenDialog(win, {
    properties: ["openFile"],
    filters: [
      { name: "Code and text files", extensions: ["js", "jsx", "ts", "tsx", "mjs", "cjs", "json", "html", "htm", "css", "scss", "less", "md", "txt", "py", "java", "kt", "c", "h", "cpp", "hpp", "cs", "go", "rs", "rb", "php", "swift", "dart", "vue", "svelte", "sql", "sh", "ps1", "bat", "yml", "yaml", "toml", "ini", "env", "xml", "csv", "lua", "r", "pl", "gradle", "lock", "log"] },
      { name: "All files", extensions: ["*"] },
    ],
  });
  if (r.canceled) return null;
  const file = r.filePaths[0];
  if (NOT_CODE.has(path.extname(file).slice(1).toLowerCase())) return { error: "Pick a code or text file, not a picture, video, sound or archive." };
  runner.allowFolder(path.dirname(file));
  return { file, folder: path.dirname(file) };
});
// The login token arrives from the screens (client/src/main.tsx); the local runner (Day 2) uses it
ipcMain.on("cg:setToken", (_e, t) => {
  runner.setToken(t || null); chats.setToken(t || null); uploads.setToken(t || null); memory.setToken(t || null); codeEditor.setToken(t || null);
  // (the "Classgrid Code" icon was waiting for the login)
  if (t && codeWaiting) startCodeEditor();
});
// The AI's memory of each account used on this computer (desktop/memory.js): switching accounts keeps it
ipcMain.handle("cg:saveMemory", (_e, m) => { try { return memory.saveMine(m); } catch { return false; } });
ipcMain.handle("cg:otherMemory", () => { try { return memory.others(); } catch { return []; } });
// The AI's own memory notes (desktop/aimemory.js): MEMORY.md goes with every question
ipcMain.handle("cg:memoryIndex", () => { try { return require("./aimemory").index(); } catch { return ""; } });
// Chats kept on this computer (desktop/chats.js): read when the internet is down
ipcMain.handle("cg:saveChat", (_e, chat) => chats.saveChat(chat).catch((err) => ({ error: String(err.message || err) })));
ipcMain.handle("cg:listChats", () => chats.listChats().catch(() => []));
ipcMain.handle("cg:readChat", (_e, id) => chats.readChat(String(id || "")).catch(() => null));
ipcMain.handle("cg:removeChat", (_e, id) => chats.removeChat(String(id || "")).catch((err) => ({ error: String(err.message || err) })));
// Chats saved here by the other accounts that logged in on this computer (read only), to go on under this account
ipcMain.handle("cg:listOtherChats", () => chats.listOtherChats().catch(() => []));
ipcMain.handle("cg:readOtherChat", (_e, userId, id) => chats.readOtherChat(String(userId || ""), String(id || "")).catch(() => null));

// classgrid:// links open this app (Windows passes them as a launch argument)
if (process.defaultApp) app.setAsDefaultProtocolClient("classgrid", process.execPath, [path.resolve(process.argv[1])]);
else app.setAsDefaultProtocolClient("classgrid");

// classgrid://login?code=...: swap the one-time code for the signed-in page (it carries the login token)
async function handleDeepLink(link) {
  if (!link || !win || win.isDestroyed()) return;
  let url;
  try { url = new URL(link); } catch { return; }
  // classgrid://payment?ai_payment=success|failed: a top-up paid in the browser; the app comes forward and shows it
  if (url.hostname === "payment") {
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
    const status = url.searchParams.get("ai_payment") === "failed" ? "failed" : "success";
    win.webContents.executeJavaScript(`window.dispatchEvent(new CustomEvent("classgrid:payment", { detail: ${JSON.stringify(status)} }))`).catch(() => {});
    return;
  }
  // classgrid://github-app: the Classgrid app was installed on GitHub in the browser; bring the app back (Project Mode
  // checks the install again when the window comes forward)
  if (url.hostname === "github-app") {
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
    return;
  }
  // classgrid://logout: Classgrid Code logged out (Settings → Log out); one login for both, so the app logs out too
  if (url.hostname === "logout") {
    win.loadURL(APP_URL + "/logout");
    return;
  }
  if (url.hostname !== "login") return;
  const code = url.searchParams.get("code") || "";
  try {
    const res = await fetch("https://api.classgrid.in/api/auth/desktop-exchange", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || typeof data.path !== "string" || !data.path.startsWith("/")) throw new Error(data.message || "Sign-in didn't finish.");
    win.loadURL(APP_URL + data.path);
  } catch (err) {
    dialog.showMessageBox(win, { type: "error", title: "Classgrid", message: "Sign-in didn't finish.", detail: String(err.message || err) });
  }
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", (_e, argv) => {
    // The "Classgrid Code" icon while the app is open: only the editor opens
    if (argv.includes("--code")) return void startCodeEditor();
    // The app opened again: bring its window forward. The window may already be gone (the app is closing, or it is
    // installing an update), so it is only touched while it exists.
    if (win && !win.isDestroyed()) { if (codeOnly) showMain(); if (win.isMinimized()) win.restore(); win.focus(); }
    handleDeepLink(argv.find((a) => a.startsWith("classgrid://")));
  });
  app.whenReady().then(async () => {
    Menu.setApplicationMenu(null);
    runner.init(app.getPath("userData"));
    chats.init(app.getPath("userData"));
    uploads.init(app.getPath("userData"));
    memory.init(app.getPath("userData"));
    if (!fs.existsSync(path.join(APP_DIR, "index.html"))) {
      dialog.showErrorBox("Classgrid", "The app's screens are missing. Run: npm run build:client");
      return app.quit();
    }
    await startScreenServer();
    createWindow();
    handleDeepLink(process.argv.find((a) => a.startsWith("classgrid://")));
    startUpdates();
    // Classgrid Code: unpacked, run once with no window so Windows' first-run check happens now, and put in Windows'
    // "Open with" and right-click menus (codeeditor.js), all in the background
    if (app.isPackaged) setTimeout(() => codeEditor.register().then(() => codeEditor.warmUp()).catch(() => {}), 5000);
  });
  app.on("window-all-closed", () => app.quit());
  app.on("before-quit", () => { runner.stopAll(); require("./recorder").stop(); require("./computer").stop(); terminal.stop(); });
}

// Updates: the installed app checks our R2 storage (desktop/latest.yml) on start and every 6 hours, downloads a new
// version in the background and offers a restart. The screens are packed inside the app, so every website change
// reaches the app this way (scripts/release.mjs publishes a version).
function startUpdates() {
  if (!app.isPackaged) return;
  const { autoUpdater } = require("electron-updater");
  autoUpdater.disableDifferentialDownload = true; // R2 public links don't do partial downloads: always the whole file
  autoUpdater.on("update-downloaded", async (info) => {
    const { response } = await dialog.showMessageBox(win, {
      type: "info",
      title: "Classgrid",
      message: `A new version of Classgrid (${info.version}) is ready.`,
      detail: "Restart now to use it, or it will be used the next time you open Classgrid.",
      buttons: ["Restart now", "Later"],
      defaultId: 0,
      cancelId: 1,
    });
    if (response === 0) autoUpdater.quitAndInstall();
  });
  autoUpdater.on("error", (err) => console.log("[updates]", err.message));
  const check = () => autoUpdater.checkForUpdates().catch((err) => console.log("[updates]", err.message));
  check();
  setInterval(check, 6 * 60 * 60 * 1000);
}
