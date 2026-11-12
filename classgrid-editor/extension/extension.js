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
const https = require("node:https");

// Packed inside the editor: ./app (our screens) and ./desktop (the desktop app's parts). While developing, the same
// files straight from the repo.
const firstThere = (...dirs) => dirs.find((d) => fs.existsSync(d)) || dirs[0];
const APP_DIR = firstThere(path.join(__dirname, "app"), path.join(__dirname, "..", "..", "desktop", "app-editor"));
const DESKTOP_DIR = firstThere(path.join(__dirname, "desktop"), path.join(__dirname, "..", "..", "desktop"));
const API = /^https:\/\/api\.classgrid\.in\//;
const UPLOAD = /^https:\/\/[a-z0-9]+\.r2\.cloudflarestorage\.com\//; // a chat file going to our storage (a signed link)
const STORAGE_KEY = "classgrid.storage";
const LAST_CHAT_KEY = "classgrid.lastChat"; // the chat open in the Agent panel, per folder

let parts = null; // the desktop app's runner, chats and memory (after activate)
let deviceId;
let log = null; // the "Classgrid" output (page errors and what failed)
let storage = {}; // our screens' saved settings and login (localStorage), kept in the editor's secret storage
let saveTimer = null;
const loaders = new Set(); // each open panel's "load our screens again"
// The Agent panel (right side) and the chats sidebar (the window's left edge, classgrid-left-strip.patch)
const screens = { agent: null, chats: null };

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
  if (process.platform === "win32") clipboardHost(); // ready before the first image paste
  memory.init(userData);
  // What the user is doing in the editor (open file, cursor, selection, errors, terminal commands), for the Agent
  // (editor-context.js): kept in this editor's data folder and the Classgrid app's, for whichever runner is asked
  require("./editor-context").start(context, [userData, ...(process.env.APPDATA ? [path.join(process.env.APPDATA, "Classgrid")] : [])]);
  // Prettier and Code Runner, like the old built-in editor (from Open VSX, once: a user who removes one keeps it removed)
  for (const id of ["esbenp.prettier-vscode", "formulahendry.code-runner"]) {
    if (vscode.extensions.getExtension(id) || context.globalState.get(`added:${id}`)) continue;
    context.globalState.update(`added:${id}`, true);
    vscode.commands.executeCommand("workbench.extensions.installExtension", id).then(undefined, () => context.globalState.update(`added:${id}`, false));
  }
  parts = { runner, chats, memory, version, context };
  try { storage = JSON.parse((await context.secrets.get(STORAGE_KEY)) || "{}"); } catch { storage = {}; }
  // (the Classgrid app logged out: Classgrid Code too, now and whenever it happens while the editor is open)
  if (process.env.APPDATA) {
    followAppSignOut();
    fs.watchFile(SIGNED_OUT_NOTE, { interval: 2000 }, followAppSignOut);
    context.subscriptions.push({ dispose: () => fs.unwatchFile(SIGNED_OUT_NOTE, followAppSignOut) });
  }
  // The folder open in this editor can be used by the AI (like a folder picked in the Classgrid app)
  for (const f of vscode.workspace.workspaceFolders || []) runner.allowFolder(f.uri.fsPath);
  context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders((e) => { for (const f of e.added) runner.allowFolder(f.uri.fsPath); }));
  context.subscriptions.push({ dispose: () => runner.stopAll() });

  // The Agent panel, in two places like Claude Code: the right side (classgrid.agent) and, in VS Code / Cursor /
  // Windsurf, also a Classgrid icon on the left activity bar (classgrid.sidebar). Classgrid Code has its own left strip.
  const stockEditor = !/classgrid/i.test(vscode.env.appName || "");
  vscode.commands.executeCommand("setContext", "classgrid.stockEditor", stockEditor);
  const agentProvider = {
    resolveWebviewView(view) {
      screens.agent = view.webview;
      // (it opens on the chat that was open last time in this folder, like the editor brings back your files)
      const load = holdScreens(view.webview, () => {
        const last = context.workspaceState.get(LAST_CHAT_KEY);
        return typeof last === "string" && /^[\w-]+$/.test(last) ? `/editor/project/${last}` : "/editor/project";
      });
      view.onDidDispose(() => { loaders.delete(load); stopFetches(view.webview); if (screens.agent === view.webview) screens.agent = null; });
      view.onDidChangeVisibility(() => { if (view.visible) screens.agent = view.webview; });
    },
  };
  for (const id of ["classgrid.agent", "classgrid.sidebar"]) {
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(id, agentProvider, { webviewOptions: { retainContextWhenHidden: true } }));
  }



  // Two ways in, both ending at <scheme>://classgrid.classgrid/login?code=<one-time code>, swapped for the login through
  // /api/auth/desktop-exchange (no RPC):
  // 1. the Classgrid app: Project Mode opens the editor with a code from /api/auth/editor-code (no state);
  // 2. the browser, like Antigravity and Claude Code (plan/editor-sign-in.md): "Sign in with Classgrid" opens
  //    chat.classgrid.in/login with a state and a PKCE challenge; the link back carries the same state, and the code
  //    only works with this editor's verifier. The scheme is this editor's own (classgrid-code, vscode, cursor...).
  context.subscriptions.push(vscode.window.registerUriHandler({
    async handleUri(uri) {
      // A file from the Classgrid app's chat: open it with its lines selected
      if (uri.path === "/open") return openAt(new URLSearchParams(uri.query));
      if (uri.path !== "/login") return;
      const q = new URLSearchParams(uri.query);
      const code = q.get("code") || "";
      const state = q.get("state");
      if (state === null) return finishSignIn(code, null);
      const pending = await pendingSignIn();
      if (!pending || !sameText(pending.state, state)) {
        log.appendLine(`[${new Date().toISOString()}] sign-in link refused: it wasn't started in this editor`);
        return vscode.window.showErrorMessage("This Classgrid sign-in link wasn't started in this editor, so it was ignored. Run \"Classgrid: Sign in\" to sign in.");
      }
      return finishSignIn(code, pending.verifier);
    },
  }));
  context.subscriptions.push(vscode.commands.registerCommand("classgrid.signIn", () => startSignIn()));
  context.subscriptions.push(vscode.commands.registerCommand("classgrid.pasteSignInCode", () => pasteSignInCode()));
  context.subscriptions.push(vscode.commands.registerCommand("classgrid.signOut", async () => {
    await forgetLogin();
    vscode.window.showInformationMessage("Signed out of Classgrid.");
  }));

  context.subscriptions.push(vscode.commands.registerCommand("classgrid.showAgent", () => vscode.commands.executeCommand("classgrid.agent.focus")));
  // Ctrl+K (⌘K on a Mac) is ours, anywhere in the editor: the chat history search of the chats sidebar, over the whole
  // window like in Project Mode (package.json keybindings; VS Code's own Ctrl+K shortcuts give way to it)
  // The gear in the title bar (classgrid-settings-button.patch): your Classgrid Settings, as a tab in the editor
  let settingsPanel = null;
  // (section: one of its pages, like "plugins" when the AI panel opens the AI Hub)
  context.subscriptions.push(vscode.commands.registerCommand("classgrid.openSettings", (section) => {
    const page = typeof section === "string" && /^[a-z-]+$/.test(section) ? section : null;
    if (settingsPanel) {
      settingsPanel.reveal(vscode.ViewColumn.Active);
      if (page) settingsPanel.webview.postMessage({ cgEvent: "settingsSection", data: page });
      return;
    }
    settingsPanel = vscode.window.createWebviewPanel("classgrid.settings", "Classgrid Settings", vscode.ViewColumn.Active, { enableScripts: true, retainContextWhenHidden: true });
    settingsPanel.iconPath = vscode.Uri.file(path.join(__dirname, "media", "classgrid.svg"));
    const load = holdScreens(settingsPanel.webview, page ? `/editor/settings?section=${page}` : "/editor/settings");
    const panelView = settingsPanel.webview;
    settingsPanel.onDidDispose(() => { loaders.delete(load); stopFetches(panelView); settingsPanel = null; });
  }));
  // "Review" under an answer in the Agent panel: the Review tab (the same Review as the app's Studio: every changed
  // file with its diff, Accept / Reject / Undo), opened on that answer; pressed again, the open tab shows that answer
  let reviewPanel = null;
  context.subscriptions.push(vscode.commands.registerCommand("classgrid.openReview", (chat, cp) => {
    const c = typeof chat === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(chat) ? chat : null;
    const p = typeof cp === "string" && /^\d{10,16}$/.test(cp) ? cp : null;
    if (!c) return;
    if (reviewPanel) {
      reviewPanel.reveal(vscode.ViewColumn.Active);
      reviewPanel.webview.postMessage({ cgEvent: "reviewAnswer", data: { chat: c, cp: p } });
      return;
    }
    reviewPanel = vscode.window.createWebviewPanel("classgrid.review", "Classgrid Review", vscode.ViewColumn.Active, { enableScripts: true, retainContextWhenHidden: true });
    reviewPanel.iconPath = vscode.Uri.file(path.join(__dirname, "media", "classgrid.svg"));
    const load = holdScreens(reviewPanel.webview, `/editor/review/${c}${p ? `?cp=${p}` : ""}`);
    const panelView = reviewPanel.webview;
    reviewPanel.onDidDispose(() => { loaders.delete(load); stopFetches(panelView); reviewPanel = null; });
  }));
  context.subscriptions.push(vscode.commands.registerCommand("classgrid.searchChats", async () => {
    // (it opens in the Agent panel's page, which covers the whole window for it, like the AI Hub)
    await vscode.commands.executeCommand("classgrid.agent.focus").then(undefined, () => {});
    screens.agent?.postMessage({ cgEvent: "shared", data: { name: "agent:open-search-palette", detail: null } });
  }));

  context.subscriptions.push(vscode.commands.registerCommand("classgrid.open", () => {
    const panel = vscode.window.createWebviewPanel("classgrid.app", "Classgrid", vscode.ViewColumn.Active, { enableScripts: true, retainContextWhenHidden: true });
    panel.iconPath = vscode.Uri.file(path.join(__dirname, "media", "classgrid.svg"));
    const load = holdScreens(panel.webview, "/");
    const panelView = panel.webview;
    panel.onDidDispose(() => { loaders.delete(load); stopFetches(panelView); });
  }));

  // The Agent is on the right side when the editor opens (the right side bar starts open: configurationDefaults in
  // package.json; this also shows the Agent there once its view is ready)
  const showAgent = (tries) => vscode.commands.executeCommand("classgrid.agent.focus").then(undefined, () => { if (tries > 0) setTimeout(() => showAgent(tries - 1), 1000); });
  showAgent(10);
  // No "Restricted Mode" in Classgrid Code (VS Code's folder trust banner and its links to VS Code's help): it is off
  // from the next start, like the owner asked
  const trust = vscode.workspace.getConfiguration("security.workspace.trust");
  if (trust.inspect("enabled")?.globalValue === undefined) trust.update("enabled", false, vscode.ConfigurationTarget.Global).then(undefined, () => {});
  // (at its normal size: a big window like Plugins may have left it full window when the editor last closed)
  vscode.commands.executeCommand("workbench.action.restoreAuxiliaryBar").then(undefined, () => {});
}

// Opens a file at its lines and selects them (classgrid-code://classgrid.classgrid/open?file=...&start=...&end=...)
async function openAt(q) {
  const file = q.get("file");
  if (!file || !fs.existsSync(file)) return;
  try {
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(file));
    const editor = await vscode.window.showTextDocument(doc, { preview: false });
    const start = Number(q.get("start")) || 0;
    if (!start) return;
    const s = Math.max(0, Math.min(doc.lineCount - 1, start - 1));
    const e = Math.max(s, Math.min(doc.lineCount - 1, (Number(q.get("end")) || start) - 1));
    const range = new vscode.Range(s, 0, e, doc.lineAt(e).text.length);
    editor.selection = new vscode.Selection(range.start, range.end);
    editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
  } catch {
    // pictures, PDFs and other files: their own viewer
    vscode.commands.executeCommand("vscode.open", vscode.Uri.file(file)).then(undefined, () => {});
  }
}

function deactivate() {
  try { parts?.runner.stopAll(); } catch { /* already stopped */ }
  try { clipHost?.proc.kill(); } catch { /* already gone */ }
}

// Our screens in a panel, straight from the editor's files: the page with the bridge first, then the app's own code
function holdScreens(webview, startPath) {
  const drives = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").filter((l) => { try { return fs.existsSync(`${l}:\\`); } catch { return false; } });
  webview.options = { enableScripts: true, localResourceRoots: [vscode.Uri.file(APP_DIR), ...drives.map((l) => vscode.Uri.file(`${l}:\\`))] };
  const slash = (u) => String(u).replace(/\/?$/, "/");
  const base = slash(webview.asWebviewUri(vscode.Uri.file(APP_DIR)));
  const fileBases = Object.fromEntries(drives.map((l) => [l.toLowerCase(), slash(webview.asWebviewUri(vscode.Uri.file(`${l}:\\`)))]));
  // (folder: the folder open in the editor, the Agent's project)
  const folder = (vscode.workspace.workspaceFolders || [])[0]?.uri.fsPath || null;
  const cfg = { version: parts.version, deviceId: computerId(), startPath, base, fileBases, storage, folder };
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
    // The page that goes away doesn't need its calls' answers any more (a long answer would keep coming for nothing)
    stopFetches(webview);
    // Signed out: our own sign-in screen (browser sign-in, like Antigravity and Claude Code)
    if (!storage.token) { webview.html = signedOutHtml(webview); return; }
    if (!fs.existsSync(path.join(APP_DIR, "index.html"))) { webview.html = signedOutHtml(webview, "missing"); return; }
    const html = fs.readFileSync(path.join(APP_DIR, "index.html"), "utf8").replace(/\b(src|href)="\.\//g, `$1="${base}`);
    webview.html = html.replace(/<head([^>]*)>/, `<head$1>
<meta http-equiv="Content-Security-Policy" content="${csp}">
<script>window.__cgBridge=${JSON.stringify({ ...cfg, startPath: typeof startPath === "function" ? startPath() : startPath, storage }).replace(/</g, "\\u003c")};</script>
<script>${bridge}</script>`);
  };
  webview.onDidReceiveMessage((m) => {
    if (m?.cgSignIn) return startSignIn();
    if (m?.cgPasteCode) return pasteSignInCode();
    if (m?.cgFetch) return proxyFetch(webview, m);
    if (m?.cgFetchAbort) return FETCHES.get(m.cgFetchAbort)?.ac.abort();
    if (m?.cgStore) return keepStorage(m);
    // (only the Agent panel and the chats sidebar cover the window for their big windows; a tab like Settings shows its
    // own windows inside the tab)
    if (m?.cgOverlay !== undefined) return webview === screens.chats ? coverWithStrip(webview, !!m.cgOverlay) : webview === screens.agent ? coverWindow(webview, !!m.cgOverlay) : undefined;
    if (m?.cgOverlayReady && webview === screens.chats) return vscode.commands.executeCommand("_classgrid.setStripOverlay", true).then(undefined, (err) => log.appendLine(`[${new Date().toISOString()}] cover the window: ${err?.message || err}`));
    // A chat list change in one of our pages (a new chat, a new title...): the other page's list follows
    if (m?.cgShare) {
      for (const other of [screens.agent, screens.chats]) if (other && other !== webview) other.postMessage({ cgEvent: "shared", data: { name: String(m.cgShare), detail: m.detail ?? null } });
      return;
    }
    if (m?.cgOverlayReady && webview === screens.agent) return vscode.commands.executeCommand("_classgrid.setAgentOverlay", true).then(undefined, (err) => log.appendLine(`[${new Date().toISOString()}] cover the window: ${err?.message || err}`));
    if (m?.cgLog) return log.appendLine(`[${new Date().toISOString()}] page ${m.cgLog}: ${String(m.text).slice(0, 2000)}`);
    if (m?.cgCall !== undefined) return answerCall(webview, m, load);
  });
  load();
  loaders.add(load);
  return load;
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

// The mic button (dictation): the editor gives its panels no microphone, so Windows' own recorder (winmm's waveIn)
// records it, in a PowerShell that waits for "stop" (keep the recording) or "cancel". Meanwhile it prints the sound
// level (the panel's moving bars). The WAV goes back to the panel, which sends it for transcription like the website's
let micRec = null;
// 16 kHz, 16-bit mono into eight 0.1 s buffers; Poll() takes the full ones in order, keeps their sound and the loudest
// sample (Level, 0 to 1); Stop() writes the WAV file (or nothing, when cancelled)
const MIC_RECORDER = `
using System; using System.IO; using System.Runtime.InteropServices;
public class CgRec {
  [StructLayout(LayoutKind.Sequential)] struct Fmt { public ushort tag, channels; public uint rate, bytesPerSec; public ushort align, bits, extra; }
  [StructLayout(LayoutKind.Sequential)] struct Hdr { public IntPtr data; public uint length, recorded; public IntPtr user; public uint flags, loops; public IntPtr next, reserved; }
  [DllImport("winmm.dll")] static extern int waveInOpen(out IntPtr h, int device, ref Fmt f, IntPtr cb, IntPtr inst, int flags);
  [DllImport("winmm.dll")] static extern int waveInPrepareHeader(IntPtr h, IntPtr hdr, int size);
  [DllImport("winmm.dll")] static extern int waveInUnprepareHeader(IntPtr h, IntPtr hdr, int size);
  [DllImport("winmm.dll")] static extern int waveInAddBuffer(IntPtr h, IntPtr hdr, int size);
  [DllImport("winmm.dll")] static extern int waveInStart(IntPtr h);
  [DllImport("winmm.dll")] static extern int waveInReset(IntPtr h);
  [DllImport("winmm.dll")] static extern int waveInClose(IntPtr h);
  const int N = 8, SIZE = 3200;
  static readonly int HS = Marshal.SizeOf(typeof(Hdr));
  IntPtr h; IntPtr[] hdrs = new IntPtr[N]; IntPtr[] bufs = new IntPtr[N]; int next = 0; bool open = false;
  MemoryStream sound = new MemoryStream();
  public double Level = 0;
  public int Start() {
    var f = new Fmt { tag = 1, channels = 1, rate = 16000, bytesPerSec = 32000, align = 2, bits = 16, extra = 0 };
    int rc = waveInOpen(out h, -1, ref f, IntPtr.Zero, IntPtr.Zero, 0);
    if (rc != 0) return rc;
    open = true;
    for (int i = 0; i < N; i++) {
      bufs[i] = Marshal.AllocHGlobal(SIZE);
      hdrs[i] = Marshal.AllocHGlobal(HS);
      Marshal.StructureToPtr(new Hdr { data = bufs[i], length = SIZE }, hdrs[i], false);
      waveInPrepareHeader(h, hdrs[i], HS);
      waveInAddBuffer(h, hdrs[i], HS);
    }
    return waveInStart(h);
  }
  public void Poll() { Take(true); }
  void Take(bool again) {
    int peak = -1;
    for (int k = 0; k < N; k++) {
      var hd = (Hdr)Marshal.PtrToStructure(hdrs[next], typeof(Hdr));
      if ((hd.flags & 1) == 0) break;
      int n = (int)hd.recorded;
      var b = new byte[n];
      Marshal.Copy(bufs[next], b, 0, n);
      sound.Write(b, 0, n);
      for (int i = 0; i + 1 < n; i += 2) { int s = Math.Abs((int)BitConverter.ToInt16(b, i)); if (s > peak) peak = s; }
      waveInUnprepareHeader(h, hdrs[next], HS);
      if (again) {
        Marshal.StructureToPtr(new Hdr { data = bufs[next], length = SIZE }, hdrs[next], false);
        waveInPrepareHeader(h, hdrs[next], HS);
        waveInAddBuffer(h, hdrs[next], HS);
      }
      next = (next + 1) % N;
    }
    if (peak >= 0) Level = Math.Min(1.0, peak / 32768.0);
  }
  public void Stop(string file) {
    if (!open) return;
    waveInReset(h);
    Take(false);
    waveInClose(h);
    open = false;
    for (int i = 0; i < N; i++) { Marshal.FreeHGlobal(bufs[i]); Marshal.FreeHGlobal(hdrs[i]); }
    if (string.IsNullOrEmpty(file)) return;
    var data = sound.ToArray();
    using (var w = new BinaryWriter(File.Create(file))) {
      w.Write(new char[] { 'R', 'I', 'F', 'F' }); w.Write(36 + data.Length); w.Write(new char[] { 'W', 'A', 'V', 'E', 'f', 'm', 't', ' ' });
      w.Write(16); w.Write((short)1); w.Write((short)1); w.Write(16000); w.Write(32000); w.Write((short)2); w.Write((short)16);
      w.Write(new char[] { 'd', 'a', 't', 'a' }); w.Write(data.Length); w.Write(data);
    }
  }
}`;
const MIC_SCRIPT = (file) => [
  "Add-Type -TypeDefinition @'" + MIC_RECORDER + "\n'@",
  "$r = New-Object CgRec",
  "$rc = $r.Start()",
  "[Console]::Out.WriteLine(\"REC $rc\"); [Console]::Out.Flush()",
  "if ($rc -ne 0) { exit }",
  // While it records: the sound level about 14 times a second (the panel's moving bars), until "stop" or "cancel"
  "$in = New-Object System.IO.StreamReader([Console]::OpenStandardInput())",
  "$read = $in.ReadLineAsync()",
  "while (-not $read.IsCompleted) { $r.Poll(); [Console]::Out.WriteLine(\"LVL \" + [int]($r.Level * 32768)); [Console]::Out.Flush(); Start-Sleep -Milliseconds 70 }",
  "$line = $read.Result",
  `if ($line -eq 'stop') { $r.Stop('${file.replace(/'/g, "''")}') } else { $r.Stop($null) }`,
  "[Console]::Out.WriteLine('DONE')",
].join("\n");
function micStart(webview) {
  micCancel();
  const file = path.join(require("node:os").tmpdir(), `classgrid-dictation-${Date.now()}.wav`);
  const proc = require("node:child_process").spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", Buffer.from(MIC_SCRIPT(file), "utf16le").toString("base64")], { windowsHide: true });
  return new Promise((resolve, reject) => {
    let out = "";
    let rest = "";
    proc.stdout.setEncoding("utf8");
    proc.stdout.on("data", (d) => {
      // Each "LVL n" line: the sound level now (0 to 32768), for the panel's moving bars
      rest += d;
      const lines = rest.split(/\r?\n/);
      rest = lines.pop();
      for (const line of lines) {
        const lvl = line.match(/^LVL (\d+)/);
        if (lvl && micRec?.proc === proc) webview?.postMessage({ cgEvent: "micLevel", data: Math.min(1, Number(lvl[1]) / 32768) });
      }
      if (micRec?.proc === proc) return;
      out += d;
      const m = out.match(/REC (\d+)/);
      if (!m || micRec?.proc === proc) return;
      if (m[1] !== "0") { try { proc.kill(); } catch { /* gone */ } return reject(new Error(`the microphone couldn't start (Windows error ${m[1]}): check that a microphone is connected and allowed for desktop apps`)); }
      micRec = { proc, file };
      resolve(true);
    });
    proc.on("error", reject);
    proc.on("exit", () => { if (micRec?.proc === proc) micRec = null; reject(new Error("the microphone couldn't start")); });
  });
}
function micStop() {
  const rec = micRec;
  if (!rec) return Promise.resolve(null);
  micRec = null;
  return new Promise((resolve) => {
    const done = () => {
      try { resolve({ type: "audio/wav", data: fs.readFileSync(rec.file).toString("base64") }); } catch { resolve(null); }
      fs.rm(rec.file, { force: true }, () => {});
    };
    rec.proc.on("exit", done);
    setTimeout(() => { try { rec.proc.kill(); } catch { /* gone */ } }, 10000);
    rec.proc.stdin.write("stop\n");
  });
}
function micCancel() {
  const rec = micRec;
  micRec = null;
  if (!rec) return;
  try { rec.proc.stdin.write("cancel\n"); } catch { /* gone */ }
  setTimeout(() => { try { rec.proc.kill(); } catch { /* gone */ } fs.rm(rec.file, { force: true }, () => {}); }, 3000);
}

// A picture on the clipboard as { name, type, data (base64) }, or null. The editor's clipboard has text only, so
// Windows' own clipboard is read: an image file copied in File Explorer, else the PNG a browser or app copies (it
// keeps transparency), else the plain bitmap (a screenshot)
const IMAGE_TYPES = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".bmp": "image/bmp", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".avif": "image/avif", ".tif": "image/tiff", ".tiff": "image/tiff" };
// One PowerShell stays open (started with the editor), so a paste doesn't wait for PowerShell to start each time
const CLIP_END = "__cg_clip_end__";
const CLIP_SETUP = [
  "Add-Type -AssemblyName System.Windows.Forms,System.Drawing",
  "function CgClip { $c=[System.Windows.Forms.Clipboard]; "
    + "if($c::ContainsFileDropList()){$f=@($c::GetFileDropList()|?{$_ -match '\\.(png|jpe?g|gif|webp|bmp|svg|ico|avif|tiff?)$'})[0];if($f){return 'file|'+$f}}; "
    + "$p=$c::GetData('PNG');if($p -is [System.IO.MemoryStream]){return 'png|'+[Convert]::ToBase64String($p.ToArray())}; "
    + "$i=$c::GetImage();if($i){$m=New-Object System.IO.MemoryStream;$i.Save($m,[System.Drawing.Imaging.ImageFormat]::Png);return 'png|'+[Convert]::ToBase64String($m.ToArray())}; '' }",
].join("\n") + "\n";
let clipHost = null;
function clipboardHost() {
  if (clipHost) return clipHost;
  const proc = require("node:child_process").spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-STA", "-Command", "-"], { windowsHide: true });
  const host = { proc, waiting: [], out: "" };
  proc.stdout.setEncoding("utf8");
  proc.stdout.on("data", (d) => {
    host.out += d;
    let at;
    while ((at = host.out.indexOf(CLIP_END)) !== -1) {
      const answer = host.out.slice(0, at);
      host.out = host.out.slice(at + CLIP_END.length);
      host.waiting.shift()?.(answer);
    }
  });
  const gone = () => { if (clipHost === host) clipHost = null; host.waiting.splice(0).forEach((done) => done("")); };
  proc.on("exit", gone);
  proc.on("error", gone);
  proc.stdin.on("error", gone);
  proc.stdin.write(CLIP_SETUP);
  return (clipHost = host);
}
function clipboardImage() {
  if (process.platform !== "win32") return Promise.resolve(null);
  return new Promise((resolve) => {
    const host = clipboardHost();
    const timer = setTimeout(() => { try { host.proc.kill(); } catch { /* already gone */ } }, 15000); // a stuck PowerShell is started again next time
    host.waiting.push((out) => {
      clearTimeout(timer);
      const [kind, value] = String(out || "").trim().split(/\|(.*)/s);
      if (!value) return resolve(null);
      if (kind === "png") return resolve({ name: `pasted-image-${Date.now()}.png`, type: "image/png", data: value.trim() });
      try {
        resolve({ name: path.basename(value), type: IMAGE_TYPES[path.extname(value).toLowerCase()] || "image/png", data: fs.readFileSync(value.trim()).toString("base64") });
      } catch { resolve(null); }
    });
    host.proc.stdin.write(`CgClip; '${CLIP_END}'\n`);
  });
}

// Our screens' calls to our server, carried by the editor (a page loaded from the editor's files can't call it
// itself); a streamed answer comes back piece by piece as it arrives. Each page load numbers its calls with its own
// prefix (bridge.js), so a call's answer only ever reaches the call that asked for it.
const FETCHES = new Map(); // call id -> { ac, webview }
function stopFetches(webview) {
  for (const [id, f] of FETCHES) if (f.webview === webview) { FETCHES.delete(id); f.ac.abort(); }
}
// One connection to the server, kept open between requests: Node's own fetch closes an idle socket after 4 s, so a
// message sent a few seconds after the last request paid a new TCP and TLS handshake first (0.5-1.5 s measured,
// 2026-11-10). A socket idle for more than 10 s is closed: on mobile internet a connection left idle for longer is
// often silently dead (the carrier's address translation forgot it), and a request on it hung about 60 s before
// failing (the panel showed "Thinking" the whole time, 2026-11-10). The agent's timeout closes idle sockets only; a
// request that is streaming is never cut by it.
const IDLE_SOCKET_MS = 10000;
const keepAliveAgent = new https.Agent({ keepAlive: true, keepAliveMsecs: 5000, maxSockets: 8, timeout: IDLE_SOCKET_MS });
// A connection that died while it was kept open fails at once on the next request: that request is sent once more on
// a fresh connection (Node's own advice for keep-alive agents), instead of the panel seeing the error
const DEAD_SOCKET = /^(ECONNRESET|EPIPE|ETIMEDOUT|ECONNREFUSED)$/;
function httpsRequest(url, opts, attempt = 0) {
  const { method, headers, body, signal } = opts;
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method, headers, agent: keepAliveAgent, signal }, resolve);
    req.on("error", (err) => {
      if (attempt === 0 && req.reusedSocket && !signal?.aborted && DEAD_SOCKET.test(String(err?.code || ""))) {
        log.appendLine(`[${new Date().toISOString()}] ${method} ${String(url).replace(/\?.*$/, "")}: the kept connection had died (${err.code}), sent again on a new one`);
        return httpsRequest(url, opts, 1).then(resolve, reject);
      }
      reject(err);
    });
    if (body) req.end(body); else req.end();
  });
}
async function proxyFetch(webview, m) {
  const id = m.cgFetch;
  if (!API.test(String(m.url)) && !UPLOAD.test(String(m.url))) return webview.postMessage({ cgFetchError: id, error: "only Classgrid's server is carried by the editor" });
  const ac = new AbortController();
  FETCHES.set(id, { ac, webview });
  try {
    const headers = Object.fromEntries((Array.isArray(m.headers) ? m.headers : []).filter(([k]) => !/^(host|origin|referer|content-length|connection|cookie)$/i.test(String(k))));
    const body = m.body ? Buffer.from(m.body, "base64") : undefined;
    let url = String(m.url);
    let res = await httpsRequest(url, { method: m.method || "GET", headers, body, signal: ac.signal });
    // (a redirect is followed like fetch's redirect: "follow" did, up to 5 times, on the same two hosts only)
    for (let hops = 0; hops < 5 && [301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location; hops++) {
      const next = new URL(res.headers.location, url).toString();
      res.resume();
      if (!API.test(next) && !UPLOAD.test(next)) throw new Error("redirected away from Classgrid's server");
      const again = res.statusCode === 303 || ((res.statusCode === 301 || res.statusCode === 302) && m.method && m.method !== "GET" && m.method !== "HEAD");
      url = next;
      res = await httpsRequest(url, { method: again ? "GET" : (m.method || "GET"), headers, body: again ? undefined : body, signal: ac.signal });
    }
    // The login has expired (or was revoked): back to the sign-in screen. Only for /api/auth/me with the login we hold,
    // so a 401 from some other call (or an old token) never signs you out
    const sentAuth = Object.entries(headers).find(([k]) => /^authorization$/i.test(k))?.[1];
    if (res.statusCode === 401 && /\/api\/auth\/me(\?|$)/.test(url) && storage.token && sentAuth === `Bearer ${storage.token}`) {
      log.appendLine(`[${new Date().toISOString()}] the Classgrid login has expired: showing the sign-in screen`);
      setTimeout(() => forgetLogin(), 0);
    }
    const back = [];
    for (const [k, v] of Object.entries(res.headers)) { if (/^(content-encoding|content-length|transfer-encoding|set-cookie|connection)$/i.test(k)) continue; back.push([k, Array.isArray(v) ? v.join(", ") : String(v)]); }
    webview.postMessage({ cgFetchHead: id, status: res.statusCode, statusText: res.statusMessage || "", headers: back });
    for await (const chunk of res) webview.postMessage({ cgFetchChunk: id, data: Buffer.from(chunk).toString("base64") });
    webview.postMessage({ cgFetchEnd: id });
  } catch (err) {
    if (err?.name !== "AbortError") log.appendLine(`[${new Date().toISOString()}] ${m.method || "GET"} ${String(m.url).replace(/\?.*$/, "")} failed: ${err?.message || err}`);
    webview.postMessage({ cgFetchError: id, error: String(err?.message || err) });
  } finally {
    FETCHES.delete(id);
  }
}

// A big window of our screens is open (Plugins, settings...): the panel's page covers the whole editor window, like
// those windows open over the whole Classgrid app in Project Mode. First the page learns where the panel is (it keeps
// the panel drawn there), then it covers the window (our VS Code change, patches/classgrid-agent-overlay.patch).
let agentCovering = false; // a big window of the Agent panel (like the AI Hub) is open over the whole window
async function coverWindow(webview, on) {
  log.appendLine(`[${new Date().toISOString()}] big window ${on ? "open: the panel covers the window" : "closed"}`);
  agentCovering = on;
  // (the chats sidebar's own pop-up, like its chat list, closes under it, so it never shows on top of it)
  if (on && screens.chats) coverWithStrip(screens.chats, false);
  try {
    if (on) {
      const rect = await vscode.commands.executeCommand("_classgrid.agentPanelRect");
      if (rect) webview.postMessage({ cgEvent: "overlayRect", data: rect });
    } else {
      await vscode.commands.executeCommand("_classgrid.setAgentOverlay", false);
      webview.postMessage({ cgEvent: "overlayOff" });
    }
  } catch (err) { log.appendLine(`[${new Date().toISOString()}] cover the window: ${err?.message || err}`); }
}

// The same for a big window of the chats sidebar on the left edge (the chat search, a dialog): its page covers the
// window, the sidebar stays drawn on the left (it is fixed there in the page), and the window opens over everything
// like the Agent panel's Plugins window (patches/classgrid-left-strip.patch, workbench.css)
async function coverWithStrip(webview, on) {
  if (on && agentCovering) return; // (the Agent panel's big window stays on top)
  try {
    if (on) {
      const rect = await vscode.commands.executeCommand("_classgrid.stripRect");
      // (with the window's width, so the page waits until it really covers the window: bridge.js)
      const agent = await vscode.commands.executeCommand("_classgrid.agentPanelRect").then((r) => r, () => undefined);
      webview.postMessage({ cgEvent: "overlayRect", data: { ...(rect || { top: 0, left: 0, width: 0, height: 0 }), windowWidth: agent?.windowWidth } });
    }
    else {
      await vscode.commands.executeCommand("_classgrid.setStripOverlay", false);
      webview.postMessage({ cgEvent: "overlayOff" });
    }
  } catch (err) { log.appendLine(`[${new Date().toISOString()}] chats sidebar cover: ${err?.message || err}`); }
}

// One login for Classgrid Code and the Classgrid app: Classgrid Code forgets its login (the light / dark choice stays)
// and our screens show the sign-in note. When the Classgrid app logs out it leaves a note in its data folder
// (desktop/codeeditor.js), and Classgrid Code logs out too if it signed in before that.
const SIGNED_OUT_NOTE = path.join(process.env.APPDATA || "", "Classgrid", "signed-out.json");
async function forgetLogin() {
  const keep = {};
  for (const k of ["theme", "cg_editor_theme"]) if (k in storage) keep[k] = storage[k];
  storage = keep;
  await parts.context.secrets.store(STORAGE_KEY, JSON.stringify(storage)).then(undefined, () => {});
  for (const load of loaders) load();
}
function followAppSignOut() {
  let at = 0;
  try { at = Number(JSON.parse(fs.readFileSync(SIGNED_OUT_NOTE, "utf8")).at) || 0; } catch { return; }
  if (storage.token && at > (Number(storage.cg_signed_in_at) || 0)) forgetLogin();
}

// Browser sign-in (plan/editor-sign-in.md): state + PKCE, kept in the editor's secret storage until the link comes back
const SIGN_IN_KEY = "classgrid.signIn";
const SIGN_IN_MAX_AGE = 15 * 60 * 1000;
const sameText = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
async function pendingSignIn() {
  try {
    const p = JSON.parse((await parts.context.secrets.get(SIGN_IN_KEY)) || "null");
    return p && Date.now() - p.at < SIGN_IN_MAX_AGE ? p : null;
  } catch { return null; }
}
async function startSignIn() {
  const state = crypto.randomBytes(24).toString("base64url");
  const verifier = crypto.randomBytes(48).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  await parts.context.secrets.store(SIGN_IN_KEY, JSON.stringify({ state, verifier, at: Date.now() }));
  const callback = `${vscode.env.uriScheme}://classgrid.classgrid/login`;
  const query = new URLSearchParams({ editor: "1", state, challenge, callback }).toString();
  const opened = await vscode.env.openExternal(vscode.Uri.parse(`https://chat.classgrid.in/login?${query}`)).then((ok) => ok, () => false);
  if (!opened) return;
  const pick = await vscode.window.showInformationMessage("Finish signing in to Classgrid in your browser.", "Paste a code instead");
  if (pick) pasteSignInCode();
}
async function pasteSignInCode() {
  const pending = await pendingSignIn();
  if (!pending) {
    const pick = await vscode.window.showWarningMessage("Start the sign-in first: it opens Classgrid in your browser, which then gives you the code.", "Sign in");
    if (pick) startSignIn();
    return;
  }
  const code = await vscode.window.showInputBox({ title: "Classgrid: Paste sign-in code", prompt: "The code shown on the \"You're signed in\" page in your browser", ignoreFocusOut: true, validateInput: (v) => /^[A-Za-z0-9_-]{16,64}$/.test(v.trim()) ? null : "That doesn't look like a Classgrid sign-in code." });
  if (code) finishSignIn(code.trim(), pending.verifier);
}
async function finishSignIn(code, verifier) {
  let token = null, message = "";
  try {
    const res = await fetch("https://api.classgrid.in/api/auth/desktop-exchange", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(verifier ? { code, verifier } : { code }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok && typeof data.path === "string") token = new URL(data.path, "https://chat.classgrid.in").searchParams.get("token");
    else message = typeof data.message === "string" ? data.message : "";
  } catch (err) { log.appendLine(`[${new Date().toISOString()}] Classgrid sign-in failed: ${err?.message || err}`); }
  if (!token) {
    const pick = await vscode.window.showErrorMessage(`Classgrid sign-in didn't finish.${message ? ` ${message}` : ""}`, "Sign in again");
    if (pick) startSignIn();
    return;
  }
  if (verifier) await parts.context.secrets.delete(SIGN_IN_KEY).then(undefined, () => {});
  // The Classgrid app hands over its login on every start of Classgrid Code (the shortcut runs the app with --code,
  // which sends this a moment after the editor opens). The panels reload only when the login is new: with the same
  // login already in place they are left alone, so the Agent panel no longer flashes a second time a few seconds
  // after opening (owner, 2026-11-08)
  const sameLogin = storage.token === token;
  keepStorage({ cgStore: "set", key: "token", value: token });
  keepStorage({ cgStore: "set", key: "cg_signed_in_at", value: String(Date.now()) });
  if (!sameLogin) for (const load of loaders) load();
  vscode.commands.executeCommand("classgrid.agent.focus").then(undefined, () => {});
  if (verifier) vscode.window.showInformationMessage("Signed in to Classgrid.");
}
// The Agent panel while signed out (or when this editor has no copy of our screens)
function signedOutHtml(webview, why) {
  const nonce = crypto.randomBytes(16).toString("base64");
  const logo = webview.asWebviewUri(vscode.Uri.file(path.join(__dirname, "media", "icon.png")));
  const body = why === "missing"
    ? `<h1>Classgrid can't open here yet</h1><p>This copy of the extension is missing Classgrid's screens. Reinstall the latest Classgrid extension.</p>`
    : `<h1>Sign in to Classgrid</h1><p>Use your Classgrid account to chat with the Agent here. It opens the Classgrid sign-in page in your browser.</p>
<button id="in" class="main">Sign in with Classgrid</button><button id="paste" class="link">Have a code? Paste it</button>`;
  return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'">
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:var(--vscode-font-family);color:var(--vscode-foreground);background:var(--vscode-sideBar-background)}
.box{max-width:300px;padding:24px;text-align:center}img{width:40px;height:40px;margin-bottom:14px}h1{font-size:16px;font-weight:600;margin:0 0 8px}
p{font-size:13px;line-height:1.55;color:var(--vscode-descriptionForeground);margin:0 0 18px}button{font:inherit;cursor:pointer;border:0}
.main{width:100%;padding:8px 12px;border-radius:6px;background:var(--vscode-button-background);color:var(--vscode-button-foreground)}
.main:hover{background:var(--vscode-button-hoverBackground)}.link{margin-top:12px;background:none;color:var(--vscode-textLink-foreground);font-size:12px}</style></head>
<body><div class="box"><img src="${logo}" alt="">${body}</div>
<script nonce="${nonce}">const vs=acquireVsCodeApi();document.getElementById("in")?.addEventListener("click",()=>vs.postMessage({cgSignIn:true}));document.getElementById("paste")?.addEventListener("click",()=>vs.postMessage({cgPasteCode:true}));</script></body></html>`;
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
  // (copy and paste in our screens: bridge.js)
  clipboardWrite: (_p, text) => vscode.env.clipboard.writeText(String(text ?? "")).then(() => undefined),
  clipboardRead: () => vscode.env.clipboard.readText(),
  clipboardImage: () => clipboardImage(),
  // (the mic button: see micStart)
  micStart: (p) => micStart(p.webview),
  micStop: () => micStop(),
  micCancel: () => micCancel(),
  openExternal: (_p, url) => { if (/^https?:\/\//.test(String(url))) return vscode.env.openExternal(vscode.Uri.parse(String(url))).then(() => undefined); },
  // A file from the internet (a chat's PDF), for our screens to show: the panel can't load it itself
  fetchFile: async (_p, url) => {
    if (!/^https:\/\//.test(String(url))) return null;
    const res = await fetch(String(url), { redirect: "follow" });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return { type: res.headers.get("content-type") || "", data: buf.toString("base64") };
  },
  // A Download button in our screens: a "Save as" box (in Downloads), then the file is written there. Following the
  // link in the panel itself replaced the whole panel with a blank page
  downloadFile: async (_p, { url, name, data } = {}) => {
    const fileName = String(name || "download").replace(/[\\/:*?"<>|]+/g, "_").slice(0, 200) || "download";
    const where = await vscode.window.showSaveDialog({ defaultUri: vscode.Uri.file(path.join(require("node:os").homedir(), "Downloads", fileName)), saveLabel: "Download" });
    if (!where) return false;
    let bytes = data ? Buffer.from(String(data), "base64") : null;
    if (!bytes && /^https:\/\//.test(String(url))) {
      const res = await fetch(String(url), { redirect: "follow" });
      if (!res.ok) throw new Error(`the file couldn't be downloaded (${res.status})`);
      bytes = Buffer.from(await res.arrayBuffer());
    }
    if (!bytes) return false;
    fs.writeFileSync(where.fsPath, bytes);
    vscode.window.showInformationMessage(`Downloaded ${path.basename(where.fsPath)}`, "Open", "Show in folder").then((pick) => {
      if (pick === "Open") vscode.env.openExternal(where);
      else if (pick === "Show in folder") vscode.commands.executeCommand("revealFileInOS", where);
    });
    return true;
  },
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
  // One AI step on this computer (pc_tool_call on the answer's own stream): the same runner the socket fallback uses
  runTool: (_p, req) => parts.runner.runTool(req && typeof req === "object" ? req : {}),
  // Studio's Review tab for a folder on this computer: an answer's changes, and its files put back (runner.js keepBefore)
  listCheckpoints: (_p, chat) => parts.runner.listCheckpoints(chat),
  reviewCheckpoint: (_p, chat, cp) => parts.runner.reviewCheckpoint(chat, cp),
  rejectCheckpoint: (_p, chat, cp, file) => parts.runner.rejectCheckpoint(chat, cp, file || null),
  // The editor notes sent with each message (so the server never asks this computer for them in front of an answer)
  editorContext: () => { try { return parts.runner.tools.editor_context(); } catch { return "{}"; } },
  // A file the AI mentions or changed opens in this editor, at its lines
  openInEditor: async (_p, folder, file, line) => {
    if (!parts.runner.isAllowed(folder)) return;
    const full = file ? inside(folder, file) : null;
    if (file && !full) return;
    if (!full) return vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(String(folder))).then(() => undefined);
    if (fs.existsSync(full)) return showFile(full, line, line);
    // The AI named the file without its folders ("extension.js", "desktop/main.js"): the file of that name in the folder
    // (the one whose path ends the same way, the shortest path when there are several)
    const rel = String(file).replace(/\\/g, "/").replace(/^\.?\//, "");
    const found = await vscode.workspace.findFiles(new vscode.RelativePattern(String(folder), `**/${rel}`), "**/{node_modules,.git,dist,build}/**", 20);
    if (!found.length) { vscode.window.showWarningMessage(`Classgrid: ${rel} isn't in this folder.`); return; }
    found.sort((a, b) => a.fsPath.length - b.fsPath.length);
    return showFile(found[0].fsPath, line, line);
  },
  revealInEditor: async (_p, folder, file, startLine, endLine) => {
    if (!parts.runner.isAllowed(folder)) return { error: "This folder isn't open in Classgrid Code." };
    const full = inside(folder, file);
    if (!full) return { error: "That file isn't in this project." };
    await showFile(full, startLine, endLine);
    return { ok: true };
  },
  // The chats sidebar: its width (the icon strip, or open with the chat history), the chat picked in it (opens in the
  // Agent panel), and the chat the Agent panel shows (marked in the sidebar)
  // (the editor reads the width straight from the page, classgrid-left-strip.patch: setting it here too came late
  // and put back an old width, so the sidebar seemed to ignore its button)
  stripWidth: () => undefined,
  openChat: (_p, id) => {
    screens.agent?.postMessage({ cgEvent: "openChat", data: id ? String(id) : null });
    return vscode.commands.executeCommand("classgrid.agent.focus").then(() => undefined, () => undefined);
  },
  activeChat: (_p, id) => {
    screens.chats?.postMessage({ cgEvent: "activeChat", data: id ? String(id) : null });
    // (remembered for this folder: Classgrid Code opens on it next time)
    parts?.context.workspaceState.update(LAST_CHAT_KEY, id ? String(id) : undefined).then(undefined, () => {});
  },
  // Settings → Log out: one login for Classgrid Code and the Classgrid app, so both log out (the website stays signed in)
  signOut: async () => {
    await forgetLogin();
    try { fs.writeFileSync(SIGNED_OUT_NOTE, JSON.stringify({ at: Date.now() })); } catch { /* the app is told below too */ }
    await vscode.env.openExternal(vscode.Uri.parse("classgrid://logout")).then(undefined, () => {});
  },
  openSettings: (_p, section) => vscode.commands.executeCommand("classgrid.openSettings", section).then(() => undefined),
  openReview: (_p, chat, cp) => vscode.commands.executeCommand("classgrid.openReview", chat, cp).then(() => undefined),
  // The X on the AI panel's top line: closes the right side (the Agent button in the title bar opens it again)
  closePanel: () => vscode.commands.executeCommand("workbench.action.closeAuxiliaryBar").then(() => undefined),
  // Settings → Appearance: the whole editor light, dark, or the same as the computer (our screens follow it: bridge.js)
  setEditorTheme: async (_p, mode, want) => {
    // our other screens switch at once; the editor's own switch takes a moment
    for (const w of [screens.agent, screens.chats]) w?.postMessage({ cgEvent: "editorTheme", data: want });
    const cfg = vscode.workspace.getConfiguration();
    const G = vscode.ConfigurationTarget.Global;
    if (mode === "system") return cfg.update("window.autoDetectColorScheme", true, G);
    await cfg.update("window.autoDetectColorScheme", false, G);
    await cfg.update("workbench.colorTheme", mode === "light" ? "Light Modern" : "Dark Modern", G);
  },
  // Notification settings: Classgrid Code's own file (the Classgrid app keeps its own, %APPDATA%\Classgrid)
  getNotificationSettings: () => { try { return JSON.parse(fs.readFileSync(path.join(process.env.APPDATA || "", "Classgrid", "classgrid-code-notification-settings.json"), "utf8")); } catch { return null; } },
  saveNotificationSettings: (_p, s) => {
    try {
      const file = path.join(process.env.APPDATA || "", "Classgrid", "classgrid-code-notification-settings.json");
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(s && typeof s === "object" ? s : {}));
      return true;
    } catch { return false; }
  },
  // A Windows notification from the AI panel (Classgrid Code has no Electron, so the toast is shown by PowerShell)
  notify: (_p, { title, body, sound, toast = true } = {}) => {
    if (!title || !body) return;
    const script = path.join(DESKTOP_DIR, "notify-toast.ps1");
    if (!fs.existsSync(script)) return;
    // While Classgrid Code is the window in front (typing in the code counts as being here too): only the sound
    const soundOnly = !toast || vscode.window.state.focused;
    if (soundOnly && !sound) return;
    try {
      // Shown as Classgrid Code, with its name and logo (notify-toast.ps1)
      const args = soundOnly ? ["-SoundOnly"] : ["-Title", String(title), "-Body", String(body), ...(sound ? ["-Sound"] : [])];
      require("node:child_process").spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script, ...args], { windowsHide: true, detached: true, stdio: "ignore" }).unref();
    } catch { /* toasts unavailable */ }
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
