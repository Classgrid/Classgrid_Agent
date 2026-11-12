// The AI's browser in the desktop app: a real Chromium page that runs on this computer, so it uses the user's own
// internet, can open their local dev servers (http://localhost:3000), plays sound and keeps its own logins
// (persist:cg-browser) between runs. It sits over the Studio Browser tab while that tab is open (the screens send
// the tab's place on screen); otherwise it keeps working out of sight. The backend sends the AI's browser steps
// here through the local runner ("browser" tool), with the same answers as the cloud browser.
const { WebContentsView, ipcMain, app } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const PARTITION = "persist:cg-browser";
const HOME = "https://www.google.com/"; // a chat with no page yet opens Google (owner's choice)
const DESKTOP_WIDTH = 1280; // pages are always at least desktop width; a narrow tab shows them shrunk to fit
const HIDDEN_SIZE = { width: 1280, height: 800 };
const MAX_TEXT = 20000;
const MAX_SHOT_BYTES = 520 * 1024; // the runner's answer (the picture as base64, a third bigger) must stay under the socket's 1 MB
// Websites may use these without asking; camera, microphone, location and notifications follow Settings → Browser
// (blocked unless the user allows them); anything else is refused
const ALLOWED_PERMISSIONS = new Set(["fullscreen", "clipboard-sanitized-write", "pointerLock"]);

// ── Settings → Browser (browser-settings.json): site permissions and downloads ─────────────────────────────────
const SETTINGS_DEFAULT = { camera: "block", microphone: "block", location: "block", notifications: "block", downloadDir: "", askWhere: false };
let settings = null;
function browserSettings() {
  if (settings) return settings;
  try { settings = { ...SETTINGS_DEFAULT, ...JSON.parse(fs.readFileSync(path.join(app.getPath("userData"), "browser-settings.json"), "utf8")) }; }
  catch { settings = { ...SETTINGS_DEFAULT }; }
  return settings;
}
function saveSettings() { fs.writeFile(path.join(app.getPath("userData"), "browser-settings.json"), JSON.stringify(settings), () => {}); }
const downloadDir = () => {
  const d = browserSettings().downloadDir;
  return d && fs.existsSync(d) ? d : app.getPath("downloads");
};
// A permission the page asks for (Electron's names) is allowed: media is camera and/or microphone
function permitted(permission, details) {
  if (ALLOWED_PERMISSIONS.has(permission)) return true;
  const s = browserSettings();
  if (permission === "media") {
    const types = details?.mediaTypes?.length ? details.mediaTypes : details?.mediaType ? [details.mediaType] : ["video", "audio"];
    return types.every((t) => (t === "video" ? s.camera : t === "audio" ? s.microphone : "block") === "allow");
  }
  if (permission === "geolocation") return s.location === "allow";
  if (permission === "notifications") return s.notifications === "allow";
  return false;
}

// ── Downloads (browser-downloads.json): saved to the chosen folder, or where the user picks; newest first ────────
let downloadsList = null;
function downloads() {
  if (downloadsList) return downloadsList;
  try { downloadsList = JSON.parse(fs.readFileSync(path.join(app.getPath("userData"), "browser-downloads.json"), "utf8")) || []; } catch { downloadsList = []; }
  return downloadsList;
}
function saveDownloads() { fs.writeFile(path.join(app.getPath("userData"), "browser-downloads.json"), JSON.stringify(downloads().slice(0, 1000)), () => {}); }
let downloadsWired = false;
function wireDownloads(ses) {
  if (downloadsWired) return;
  downloadsWired = true;
  ses.on("will-download", (_e, item) => {
    if (!browserSettings().askWhere) {
      // A free name in the folder: report.pdf, then report (1).pdf...
      const dir = downloadDir();
      const ext = path.extname(item.getFilename());
      const base = path.basename(item.getFilename(), ext) || "download";
      let file = path.join(dir, base + ext);
      for (let n = 1; fs.existsSync(file) && n < 1000; n++) file = path.join(dir, `${base} (${n})${ext}`);
      item.setSavePath(file);
    }
    const entry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: item.getFilename(), url: item.getURL(), file: "", size: item.getTotalBytes(), state: "progressing", at: Date.now() };
    downloads().unshift(entry);
    saveDownloads();
    item.once("done", (_ev, state) => {
      entry.state = state; // completed, cancelled or interrupted
      entry.file = item.getSavePath() || "";
      entry.name = entry.file ? path.basename(entry.file) : entry.name;
      entry.size = item.getReceivedBytes() || entry.size;
      saveDownloads();
    });
  });
}

let win = null;
let view = null;
let shownRect = null; // where the Browser tab is (window pixels), or null while it isn't on screen
// The address an "open" step is loading right now, until it is on screen. While the first page of a chat is still on
// its way, the page has no address yet (about:blank), and the Browser tab opening at that moment took that for
// "nothing open yet" and loaded Google over it: the AI's page was replaced in a blink, its screenshot showed Google,
// and it opened the page again (owner, 2026-11-12). The page on its way counts as the open page.
let pendingUrl = null;
let zoom = 1;
let pointerAt = 0;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (u) => (/^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/|$)/i.test(u) ? `http://${u}` : /^[a-z][a-z0-9+.-]*:/i.test(u) ? u :/\s/.test(u) || !/\./.test(u) ? `https://www.google.com/search?q=${encodeURIComponent(u)}` : `https://${u}`);
const isLocal = (u) => /^(https?:\/\/)?(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/|$)/i.test(u);

// Tells the screens what the browser is doing (address bar, the agent's step)
function tell(msg) {
  if (win && !win.isDestroyed()) win.webContents.send("cg:browser", msg);
}
function navInfo() {
  const wc = view?.webContents;
  if (!wc || wc.isDestroyed()) return { type: "nav", url: "", title: "", canGoBack: false, canGoForward: false, loading: false };
  const url = wc.getURL();
  const shown = url && url !== "about:blank" ? url : (pendingUrl || "");
  return { type: "nav", url: shown, title: wc.getTitle(), canGoBack: wc.navigationHistory.canGoBack(), canGoForward: wc.navigationHistory.canGoForward(), loading: wc.isLoading() || !!pendingUrl };
}

// ── Each chat has its own page: back in a chat, its last page opens again; a new chat starts empty ─────────────
let chatFile = null;
let chatUrls = null;
let currentChat; // undefined = not known yet, null = a new chat (no id yet), or the chat's id
let agentChat = null; // the chat the AI's steps came from, until the screens show that chat too
function chats() {
  if (chatUrls) return chatUrls;
  chatFile = path.join(app.getPath("userData"), "browser-chats.json");
  try { chatUrls = JSON.parse(fs.readFileSync(chatFile, "utf8")) || {}; } catch { chatUrls = {}; }
  return chatUrls;
}
function saveChats() {
  const keys = Object.keys(chatUrls);
  if (keys.length > 300) for (const k of keys.slice(0, keys.length - 300)) delete chatUrls[k];
  fs.writeFile(chatFile, JSON.stringify(chatUrls), () => {});
}
async function useChat(id) {
  id = id ? String(id).slice(0, 100) : null;
  if (id && id === agentChat) agentChat = null;
  if (id === currentChat) return;
  // A new chat's screen (no id yet) while the AI works in that chat: the page stays (it's the AI's page)
  if (id === null && agentChat && agentChat === currentChat) return;
  const wc = ensureView().webContents;
  const url = wc.getURL();
  if (currentChat === null && id) { // the new chat just got its id: it keeps its page
    currentChat = id;
    if (/^https?:\/\//.test(url)) { chats()[id] = url; saveChats(); }
    return;
  }
  currentChat = id;
  const next = (id && chats()[id]) || HOME;
  if (next === url) return;
  await Promise.race([wc.loadURL(next).catch(() => {}), wait(30000)]);
  tell(navInfo());
}

// ── History, like Chrome's: every page opened in this browser (by the user or the agent), newest first ─────────
let historyFile = null;
let history = null; // [{ url, title, at }]
let historySave = null;
function historyList() {
  if (history) return history;
  historyFile = path.join(app.getPath("userData"), "browser-history.json");
  try { history = JSON.parse(fs.readFileSync(historyFile, "utf8")) || []; } catch { history = []; }
  return history;
}
function saveHistorySoon() {
  clearTimeout(historySave);
  historySave = setTimeout(() => { fs.writeFile(historyFile, JSON.stringify(history.slice(0, 5000)), () => {}); }, 1500);
}
function addHistory(url, title) {
  if (!/^https?:\/\//.test(url)) return;
  const list = historyList();
  // The same page again within a minute (a reload, an in-page move): just the newest entry is updated
  if (list[0] && list[0].url === url && Date.now() - list[0].at < 60000) { list[0].at = Date.now(); if (title) list[0].title = title; }
  else list.unshift({ url, title: title || "", at: Date.now() });
  if (list.length > 5000) list.length = 5000;
  saveHistorySoon();
}
function titleHistory(url, title) {
  const list = historyList();
  if (list[0] && list[0].url === url && title && list[0].title !== title) { list[0].title = title; saveHistorySoon(); }
}

// ── The page's errors and failed web requests (like a browser's console and network tabs), for the agent ─────────
const pageLog = { console: [], network: [] };
const MAX_LOG = 200;
function resetPageLog() { pageLog.console.length = 0; pageLog.network.length = 0; }
function logPush(list, item) { list.push(item); if (list.length > MAX_LOG) list.shift(); }

// ── The view ─────────────────────────────────────────────────────────────────────────────────────────────

// The page is there (a page that closed itself, like a Google sign-in page after "Allow", has no webContents any more)
const live = () => !!view?.webContents && !view.webContents.isDestroyed();

function ensureView() {
  if (live()) return view;
  if (view && win && !win.isDestroyed() && win.contentView.children.includes(view)) win.contentView.removeChildView(view);
  view = new WebContentsView({ webPreferences: { partition: PARTITION, sandbox: true, contextIsolation: true, nodeIntegration: false, backgroundThrottling: false } });
  const wc = view.webContents;
  const thisView = view;
  // The page closed itself (window.close()): a new page takes its place, on the page before the one that closed
  wc.once("destroyed", () => {
    if (view !== thisView || !win || win.isDestroyed()) return;
    const closed = historyList()[0]?.url;
    const back = historyList().find((h) => h.url !== closed)?.url || HOME;
    setImmediate(() => {
      if (view !== thisView || !win || win.isDestroyed()) return;
      ensureView();
      if (shownRect) view.webContents.loadURL(back).catch(() => {});
    });
  });
  wc.setAudioMuted(false);
  wc.session.setPermissionRequestHandler((_wc, permission, done, details) => done(permitted(permission, details)));
  wc.session.setPermissionCheckHandler((_wc, permission, _origin, details) => permitted(permission, details));
  wireDownloads(wc.session);
  // New tabs and pop-ups open in this same page
  wc.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) wc.loadURL(url).catch(() => {});
    return { action: "deny" };
  });
  const onNav = () => {
    const url = wc.getURL();
    resetPageLog();
    addHistory(url, wc.getTitle());
    if (currentChat && /^https?:\/\//.test(url)) { chats()[currentChat] = url; saveChats(); }
    applyZoom();
    tell(navInfo());
  };
  wc.on("did-navigate", onNav);
  // A new page has no cursor drawn in it: while the agent is working, it shows again once the page has loaded
  wc.on("did-finish-load", () => { if (Date.now() - pointerAt < 20000) cursor(null, null, "Reading the page"); });
  // Console messages (warnings and errors) and failed requests of the page
  wc.on("console-message", (e, ...old) => {
    const level = String(e?.level ?? old[0] ?? "");
    if (!/warn|error|^[23]$/.test(level) || /^Electron Security Warning/.test(String(e?.message ?? old[1] ?? ""))) return;
    logPush(pageLog.console, { level: /error|^3$/.test(level) ? "error" : "warning", message: String(e?.message ?? old[1] ?? "").slice(0, 1000), source: `${e?.sourceId ?? old[3] ?? ""}${(e?.lineNumber ?? old[2]) ? `:${e?.lineNumber ?? old[2]}` : ""}`, at: Date.now() });
  });
  wc.on("render-process-gone", (_e, d) => logPush(pageLog.console, { level: "error", message: `The page crashed (${d?.reason || "unknown"})`, source: "", at: Date.now() }));
  const fromThisPage = (d) => d.webContentsId === wc.id;
  wc.session.webRequest.onCompleted({ urls: ["*://*/*"] }, (d) => {
    if (fromThisPage(d) && d.statusCode >= 400) logPush(pageLog.network, { status: d.statusCode, method: d.method, url: d.url.slice(0, 500), type: d.resourceType, at: Date.now() });
  });
  wc.session.webRequest.onErrorOccurred({ urls: ["*://*/*"] }, (d) => {
    if (fromThisPage(d) && d.error !== "net::ERR_ABORTED") logPush(pageLog.network, { status: 0, error: d.error, method: d.method, url: d.url.slice(0, 500), type: d.resourceType, at: Date.now() });
  });
  wc.on("did-navigate-in-page", onNav);
  wc.on("page-title-updated", () => { titleHistory(wc.getURL(), wc.getTitle()); tell(navInfo()); });
  wc.on("did-start-loading", () => tell(navInfo()));
  wc.on("did-stop-loading", () => tell(navInfo()));
  wc.on("dom-ready", applyZoom);
  // Back / forward / reload keys while the user is in the page
  wc.on("before-input-event", (e, input) => {
    if (input.type !== "keyDown") return;
    const nav = wc.navigationHistory;
    if (input.alt && input.key === "ArrowLeft" && nav.canGoBack()) { nav.goBack(); e.preventDefault(); }
    else if (input.alt && input.key === "ArrowRight" && nav.canGoForward()) { nav.goForward(); e.preventDefault(); }
    else if (input.key === "F5" || (input.control && input.key.toLowerCase() === "r")) { wc.reload(); e.preventDefault(); }
  });
  layout();
  return view;
}

// Over the Browser tab when it is open. Otherwise it is switched off, and while the AI does a step only one pixel of
// it is inside the window (a page outside the window or switched off can't take clicks or screenshots)
let agentSteps = 0;
function layout() {
  if (!view || !win || win.isDestroyed() || !live()) return;
  if (!win.contentView.children.includes(view)) win.contentView.addChildView(view);
  if (shownRect) {
    view.setBounds(shownRect);
    view.setVisible(true);
    zoom = Math.min(1, shownRect.width / DESKTOP_WIDTH);
  } else {
    view.setBounds({ x: -(HIDDEN_SIZE.width - 1), y: -(HIDDEN_SIZE.height - 1), ...HIDDEN_SIZE });
    view.setVisible(agentSteps > 0);
    zoom = 1;
  }
  applyZoom();
}
// Chromium keeps zoom per website, so it is set again after each new page
function applyZoom() {
  const wc = view?.webContents;
  if (wc && !wc.isDestroyed() && Math.abs(wc.getZoomFactor() - zoom) > 0.001) wc.setZoomFactor(zoom);
}

// The picture the AI gets is the page in page pixels (at most 1920 x 1400). toView turns its pixels into the view's.
function geometry() {
  const b = view.getBounds();
  const cssW = b.width / zoom;
  const cssH = b.height / zoom;
  const k = Math.min(1, 1920 / cssW, 1400 / cssH);
  return { w: Math.round(cssW * k), h: Math.round(cssH * k), toView: zoom / k, b };
}

async function shot() {
  const g = geometry();
  let img = null;
  // Right after the tab moved or the page changed the picture can come back empty: try again a moment later
  for (let n = 0; n < 3 && (!img || img.isEmpty()); n++) {
    if (n) await wait(300);
    img = await view.webContents.capturePage().catch(() => null);
  }
  if (!img || img.isEmpty()) return null;
  const small = img.resize({ width: g.w, height: g.h, quality: "good" });
  let q = 70;
  let jpg = small.toJPEG(q);
  while (jpg.length > MAX_SHOT_BYTES && q > 25) { q -= 15; jpg = small.toJPEG(q); }
  return jpg.toString("base64");
}

// Waits until the page stops loading (or the time is up)
function settle(ms) {
  const wc = view.webContents;
  if (!wc.isLoading()) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => { clearTimeout(t); wc.off("did-stop-loading", done); resolve(); };
    const t = setTimeout(done, ms);
    wc.on("did-stop-loading", done);
  });
}

// The agent's step, shown to the user: in the tab's toolbar, and a ring where it clicks
function point(kind, extra = {}) {
  pointerAt = Date.now();
  tell({ type: "pointer", kind, at: pointerAt, ...extra });
}
function ring(cssX, cssY) {
  if (!live()) return;
  const code = `(() => { const d = document.createElement("div"); d.style.cssText = "position:fixed;left:${cssX - 18}px;top:${cssY - 18}px;width:36px;height:36px;border:2px solid #0ea5e9;border-radius:50%;pointer-events:none;z-index:2147483647;transition:transform .7s,opacity .7s;transform:scale(.3);opacity:.9"; document.documentElement.appendChild(d); requestAnimationFrame(() => { d.style.transform = "scale(1.4)"; d.style.opacity = "0"; }); setTimeout(() => d.remove(), 800); })()`;
  view.webContents.executeJavaScriptInIsolatedWorld(1001, [{ code }]).catch(() => {});
}

// The agent's cursor, drawn inside the page (the page is a real window here, so nothing can be drawn over it from
// outside): the same blue arrow and "Agent · Clicking" label as the cloud browser. It glides to where the agent clicks,
// stays there for typing, keys and scrolling, and fades a few seconds after the last step.
let lastCursor = null; // { x, y } in page CSS pixels
function cursor(cssX, cssY, label) {
  if (!live()) return;
  if (Number.isFinite(cssX) && Number.isFinite(cssY)) lastCursor = { x: cssX, y: cssY };
  // Before the agent's first click (it only opened, scrolled or looked): the cursor starts in the middle of the page
  if (!lastCursor) {
    const b = view.getBounds();
    const z = view.webContents.getZoomFactor() || 1;
    lastCursor = { x: b.width / 2 / z, y: b.height / 2 / z };
  }
  const code = `(() => {
    let c = document.getElementById("__cg_agent_cursor");
    if (!c) {
      c = document.createElement("div");
      c.id = "__cg_agent_cursor";
      c.style.cssText = "position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;transition:left .45s cubic-bezier(.22,1,.36,1),top .45s cubic-bezier(.22,1,.36,1),opacity .3s";
      c.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" style="display:block;filter:drop-shadow(0 1px 2px rgba(0,0,0,.45))"><path d="M4 2.5 L4 19 L8.6 14.9 L11.6 21.5 L14.4 20.3 L11.4 13.8 L17.6 13.8 Z" fill="#0ea5e9" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>'
        + '<span style="position:absolute;left:20px;top:16px;white-space:nowrap;border-radius:9999px;background:#0ea5e9;color:#fff;padding:2px 8px;font:500 11px/16px system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 1px 2px rgba(0,0,0,.2);transition:opacity .2s"></span>';
      document.documentElement.appendChild(c);
    }
    c.style.left = "${Math.round(lastCursor.x)}px";
    c.style.top = "${Math.round(lastCursor.y)}px";
    c.style.opacity = "1";
    const l = c.querySelector("span");
    l.textContent = ${JSON.stringify(`Agent · ${label}`)};
    l.style.opacity = "1";
    clearTimeout(window.__cgCursorFade);
    window.__cgCursorFade = setTimeout(() => { c.style.opacity = ".35"; l.style.opacity = "0"; }, 5000);
  })()`;
  view.webContents.executeJavaScriptInIsolatedWorld(1001, [{ code }]).catch(() => {});
}

// Keys like the cloud browser takes them: Enter, Tab, ArrowDown, Control+A, Shift+Tab
const KEY_NAMES = { ArrowUp: "Up", ArrowDown: "Down", ArrowLeft: "Left", ArrowRight: "Right", " ": "Space", Spacebar: "Space", Esc: "Escape", Return: "Enter" };
const MODIFIERS = { control: "control", ctrl: "control", shift: "shift", alt: "alt", meta: "meta", cmd: "meta", command: "meta", controlormeta: "control" };
function press(combo) {
  const wc = view.webContents;
  const parts = String(combo || "Enter").split("+");
  const key = parts.pop() || "+";
  const modifiers = parts.map((m) => MODIFIERS[m.trim().toLowerCase()]).filter(Boolean);
  const keyCode = KEY_NAMES[key] || key;
  wc.sendInputEvent({ type: "keyDown", keyCode, modifiers });
  // The typed character itself (Enter sends forms)
  if (!modifiers.some((m) => m !== "shift")) {
    const ch = keyCode === "Enter" ? "\r" : keyCode === "Space" ? " " : key.length === 1 ? key : null;
    if (ch) wc.sendInputEvent({ type: "char", keyCode: ch, modifiers });
  }
  wc.sendInputEvent({ type: "keyUp", keyCode, modifiers });
}

// Runs in the page: chooses a dropdown choice by its text. A normal <select> is set right here; for a list the page
// draws itself (like Firebase's or Google's) it says where to really click: on the dropdown to open it, then on the
// choice. q: { option, field, x, y (page pixels), phase: "start" | "opened" | "typed" }. No option = list the choices.
// Returns { done, note } | { click: { x, y }, note? } | { type: true } | { error }
function pickInPage(q) {
  const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim().toLowerCase();
  const want = norm(q.option);
  const field = norm(q.field);
  const shown = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
  };
  const words = (el) => String(el.innerText || el.textContent || el.getAttribute("aria-label") || el.value || "").replace(/\s+/g, " ").trim();
  const match = (items, get) => (want
    ? items.find((i) => get(i) === want) || items.find((i) => get(i).startsWith(want)) || items.find((i) => get(i).includes(want)) || null
    : null);
  const center = (el) => {
    el.scrollIntoView({ block: "center", inline: "nearest" });
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  };
  const quote = (list) => list.filter(Boolean).slice(0, 60).map((s) => `"${s}"`).join(", ");
  const DROP = 'select, [role="combobox"], [aria-haspopup="listbox"], [aria-haspopup="menu"], [aria-haspopup="true"], mat-select, input[list]';
  const OPTION = '[role="option"], mat-option, [role="menuitemradio"], [role="menuitem"], [role="listbox"] li';
  // What a dropdown is called: its own label, else the text around it
  const label = (el) => [...new Set([
    el.getAttribute("aria-label"),
    ...(el.getAttribute("aria-labelledby") || "").split(/\s+/).filter(Boolean).map((id) => document.getElementById(id)?.innerText),
    ...[...(el.labels || [])].map((l) => l.innerText),
    el.getAttribute("placeholder"), el.getAttribute("title"), el.getAttribute("name"), el.id,
  ].filter(Boolean).map(norm))].join(" | ");
  const around = (el) => norm(el.closest("label, fieldset, mat-form-field, [class*='form-field'], [class*='FormField']")?.innerText || el.parentElement?.innerText || "").slice(0, 200);
  const typeable = (el) => !!el && (el.matches("input, textarea, [contenteditable='true']") || !!el.querySelector?.("input"));

  // The choices of a list that is open in the page now
  const open = [...document.querySelectorAll(OPTION)].filter((o) => shown(o) && o.getAttribute("aria-disabled") !== "true");
  // Which dropdown: the one at the point, the one with that label, or the only one on the page
  const all = [...document.querySelectorAll(DROP)];
  const visible = all.filter(shown);
  const names = (list) => quote(list.map((el) => label(el) || around(el).slice(0, 60)));
  let target = null;
  if (Number.isFinite(q.x) && Number.isFinite(q.y)) {
    const hit = document.elementFromPoint(q.x, q.y);
    target = hit?.closest(DROP) || hit?.querySelector?.(DROP) || hit;
  } else if (field) {
    const pool = [...visible, ...all.filter((el) => el.tagName === "SELECT" && !shown(el))];
    target = pool.find((el) => label(el) === field) || pool.find((el) => label(el).includes(field)) || pool.find((el) => around(el).includes(field)) || null;
    if (!target) return { error: `No dropdown called "${q.field}" here. The dropdowns on this page: ${names(visible) || "(none)"}` };
  } else if (!open.length && visible.length === 1) target = visible[0];
  const select = target?.tagName === "SELECT" ? target : target?.querySelector?.("select") || null;

  // A normal <select>: set here, as if the user picked it (pages built with React see the change too)
  if (select) {
    const opts = [...select.options].filter((o) => !o.disabled);
    const list = quote(opts.map((o) => (o.text || o.label).trim()));
    if (!want) return { done: true, note: `The choices in this dropdown: ${list}` };
    const o = match(opts, (x) => norm(x.text || x.label));
    if (!o) return { error: `No choice "${q.option}" in this dropdown. Its choices: ${list}` };
    center(select);
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(select, o.value);
    select.dispatchEvent(new Event("input", { bubbles: true }));
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return { done: true, note: `Selected "${o.text.trim()}" in the dropdown.` };
  }

  // A list the page draws: choose from the open list, else open the dropdown first
  if (open.length && (q.phase !== "start" || !target || target.getAttribute("aria-expanded") === "true")) {
    const list = quote(open.map(words));
    if (!want) return { done: true, note: `The choices in this dropdown: ${list}` };
    const o = match(open, (x) => norm(words(x)));
    if (o) return { click: center(o), note: `Selected "${words(o)}" in the dropdown.` };
    // A dropdown you type in (its list follows what is typed): type the choice, then look again
    if (q.phase === "opened" && typeable(target)) return { type: true };
    return { error: `No choice "${q.option}" in the open list. Its choices: ${list}` };
  }
  if (!target) {
    return { error: visible.length
      ? `Say which dropdown: field = its label, or x and y on it. The dropdowns on this page: ${names(visible)}`
      : "No dropdown is on this page and no list is open." };
  }
  if (q.phase === "start") return { click: center(target) };
  if (q.phase === "opened" && want && typeable(target)) return { type: true };
  return { error: "The dropdown's list didn't open. Click it, then look at the screenshot." };
}

// The AI's own JavaScript (the body of an async function) as one expression the page runs; what it returns comes back
// as text (the same copy is in server/src/services/studio-browser-daemon.mjs)
const jsInPage = (code) => `(async () => { try { const v = await (async () => {\n${code}\n})(); let s; try { s = typeof v === "string" ? v : v === undefined ? "(nothing returned)" : JSON.stringify(v, null, 2); } catch { s = String(v); } return { value: String(s) }; } catch (e) { return { error: String((e && e.stack) || e) }; } })()`;

async function act(a, byAgent) {
  ensureView();
  const wc = view.webContents;
  if (byAgent && a.chat) await useChat(a.chat);
  applyZoom();
  const g = geometry();
  let note = null; // what a step found out, told to the AI with the screenshot
  let result = null; // what the AI's own code returned ("js")
  switch (a.action) {
    case "open": {
      const url = norm(String(a.url || "").trim());
      if (byAgent) point("open", { url });
      let failed = null;
      // The step ends when the page is readable, not when every last script and image has finished: a page like
      // Wikipedia keeps loading in the background for 30-45 s after it is on screen, and the AI (and the user) sat
      // waiting all that time (owner, 2026-11-10). Readable = the document is ready and nothing new has started
      // loading for 2 seconds (or the full load finished first); 45 s is the ceiling either way.
      pendingUrl = url;
      const fullLoad = wc.loadURL(url).catch((e) => { if (e.code !== "ERR_ABORTED") failed = e; });
      const readable = new Promise((resolve) => {
        const onReady = () => { wc.off("dom-ready", onReady); settle(2000).then(() => wait(500)).then(resolve); };
        wc.on("dom-ready", onReady);
        fullLoad.finally(() => { wc.off("dom-ready", onReady); resolve(); });
      });
      try { await Promise.race([fullLoad, readable, wait(45000)]); } finally { if (pendingUrl === url) pendingUrl = null; }
      if (failed) {
        const why = String(failed.code || failed.message || "the page didn't load");
        throw new Error(`${why} while opening ${url}${isLocal(url) && /REFUSED/.test(why) ? ". Nothing is running at that address on the user's computer: start the server first" : ""}`);
      }
      break;
    }
    case "click": {
      const x = Math.round(Number(a.x) * g.toView);
      const y = Math.round(Number(a.y) * g.toView);
      if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error("x and y must be numbers");
      if (byAgent) { point("click", { x: Number(a.x), y: Number(a.y) }); ring(x / zoom, y / zoom); cursor(x / zoom, y / zoom, "Clicking"); }
      wc.sendInputEvent({ type: "mouseMove", x, y });
      for (let n = 1; n <= (a.double ? 2 : 1); n++) {
        wc.sendInputEvent({ type: "mouseDown", x, y, button: "left", clickCount: n });
        wc.sendInputEvent({ type: "mouseUp", x, y, button: "left", clickCount: n });
      }
      break;
    }
    case "select": {
      // A dropdown choice by its text: a normal <select> is set in the page; a list the page draws is opened and its
      // choice clicked with real clicks
      const q = { option: String(a.option ?? ""), field: String(a.field ?? ""), phase: "start" };
      if (a.x != null && a.y != null) { q.x = Number(a.x) * g.toView / zoom; q.y = Number(a.y) * g.toView / zoom; }
      if (byAgent) { point("select", { option: q.option }); cursor(null, null, "Choosing"); }
      for (let n = 0; n < 4 && !note; n++) {
        const r = await wc.executeJavaScript(`(${pickInPage.toString()})(${JSON.stringify(q)})`);
        if (!r || r.error) throw new Error(r?.error || "The page didn't answer");
        if (r.type) { await wc.insertText(q.option); q.phase = "typed"; await wait(800); continue; }
        if (r.click) {
          const x = Math.round(r.click.x * zoom), y = Math.round(r.click.y * zoom);
          if (byAgent) { ring(r.click.x, r.click.y); cursor(r.click.x, r.click.y, "Choosing"); }
          wc.sendInputEvent({ type: "mouseMove", x, y });
          wc.sendInputEvent({ type: "mouseDown", x, y, button: "left", clickCount: 1 });
          wc.sendInputEvent({ type: "mouseUp", x, y, button: "left", clickCount: 1 });
        }
        if (r.note) note = r.note;
        else { q.phase = "opened"; await wait(700); }
      }
      if (!note) throw new Error("The choice could not be made: look at the screenshot and click it.");
      break;
    }
    case "type":
      if (byAgent) { point("type", { text: String(a.text ?? "").length }); cursor(null, null, "Typing"); }
      if (String(a.text ?? "")) await wc.insertText(String(a.text ?? ""));
      if (a.submit) { await wait(50); press("Enter"); }
      break;
    case "press":
      if (byAgent) { point("key", { key: String(a.key || "Enter") }); cursor(null, null, `Pressing ${String(a.key || "Enter")}`); }
      press(a.key);
      break;
    case "scroll": {
      const dy = Number(a.dy ?? 600) || 0;
      if (byAgent) { point("scroll", { dy }); cursor(g.b.width / 2 / zoom, g.b.height / 2 / zoom, dy < 0 ? "Scrolling up" : "Scrolling down"); }
      wc.sendInputEvent({ type: "mouseWheel", x: Math.round(g.b.width / 2), y: Math.round(g.b.height / 2), deltaX: 0, deltaY: -dy * zoom, canScroll: true });
      break;
    }
    case "back": if (wc.navigationHistory.canGoBack()) wc.navigationHistory.goBack(); break;
    case "forward": if (wc.navigationHistory.canGoForward()) wc.navigationHistory.goForward(); break;
    case "reload": wc.reload(); break;
    case "screenshot":
      if (byAgent) { point("shot"); cursor(null, null, "Looking at the page"); }
      break;
    case "read":
      // Pages that load their content late (as you scroll): go down the page step by step, then back to the top
      await settle(4000);
      await wc.executeJavaScript(`(async () => {
        const step = Math.max(400, Math.round(window.innerHeight * 0.9));
        const start = window.scrollY;
        for (let y = 0, n = 0; y < document.body.scrollHeight && n < 40; y += step, n++) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 150));
        }
        window.scrollTo(0, start);
      })()`).catch(() => {});
      await settle(3000);
      break;
    case "wait":
      await settle(4000);
      await wait(Math.min(10000, Math.max(500, Number(a.seconds || 2) * 1000)));
      break;
    case "js": {
      // The AI's own JavaScript, run in the page like the browser's developer console
      if (byAgent) { point("js"); cursor(null, null, "Running code"); }
      const r = await Promise.race([
        wc.executeJavaScript(jsInPage(String(a.code ?? "")), true),
        wait(30000).then(() => ({ error: "the code ran for more than 30 seconds" })),
      ]);
      if (!r || r.error) throw new Error(`The code failed: ${r?.error || "the page didn't answer"}`);
      result = r.value;
      break;
    }
    case "tabs": break;
    case "logs": break;
    default: throw new Error(`Unknown action: ${a.action}`);
  }
  // Let the page settle before the picture: a new page until it finished loading, and about a second after a click
  // or scroll, so entrance animations are done in the screenshot
  if (["open", "back", "forward", "reload"].includes(a.action)) {
    await wait(150);
    await settle(10000);
    await wait(800);
  } else if (["click", "press", "select", "js"].includes(a.action) || (a.action === "type" && a.submit)) {
    await wait(300);
    await settle(8000);
    await wait(600);
  } else if (a.action === "scroll") await wait(1000);
  applyZoom();
  const out = { ok: true, url: wc.getURL(), title: wc.getTitle(), w: g.w, h: g.h };
  if (note) out.note = note;
  if (result !== null) out.result = String(result).slice(0, MAX_TEXT);
  if (a.action === "read") {
    out.text = String(await wc.executeJavaScript("document.body ? document.body.innerText : ''").catch(() => "")).slice(0, MAX_TEXT);
    out.links = await wc.executeJavaScript(`[...document.querySelectorAll("a[href]")].slice(0, 80).map((l) => ({ text: (l.innerText || "").trim().slice(0, 80), href: l.href }))`).catch(() => []);
  }
  if (a.action === "tabs") out.tabs = [{ i: 0, url: wc.getURL(), active: true }];
  if (a.action === "logs") out.logs = { console: pageLog.console.slice(-80), network: pageLog.network.slice(-80) };
  if (a.screenshot !== false && a.action !== "tabs") out.screenshot = await shot();
  return out;
}

// One step at a time, so two steps sent at once can't mix (two "type" steps would mix their letters). The same
// agent step sent twice at the same moment runs once.
let queue = Promise.resolve();
const inFlight = new Map();
function runAct(a, byAgent) {
  const key = byAgent ? JSON.stringify(a) : null;
  if (key && inFlight.has(key)) return inFlight.get(key);
  const job = queue.then(async () => {
    if (!byAgent) return act(a || {}, false);
    ensureView();
    agentSteps++;
    layout();
    try { return await act(a || {}, true); } finally { agentSteps--; layout(); }
  });
  queue = job.catch(() => {});
  if (key) { inFlight.set(key, job); job.catch(() => {}).finally(() => inFlight.delete(key)); }
  return job;
}

// A step from the AI (through the local runner): always an answer, like the cloud browser's /act
// The AI's step says which chat it is working in: the page now belongs to that chat (a new chat gets its id only
// when the answer ends, so the screens may still show it without one)
function adoptChat(id) {
  id = String(id).slice(0, 100);
  agentChat = id;
  if (currentChat === id) return;
  currentChat = id;
  const url = live() ? view.webContents.getURL() : "";
  if (/^https?:\/\//.test(url)) { chats()[id] = url; saveChats(); }
}

async function agentAct(step) {
  try {
    if (step && typeof step === "object" && step.chat) { queue = queue.then(() => adoptChat(step.chat)).catch(() => {}); }
    // Every time the AI uses the browser it is recorded (Videos\Classgrid recordings)
    let label = "browser";
    try { label = new URL(live() && view.webContents.getURL().startsWith("http") ? view.webContents.getURL() : norm(String(step?.url || "browser"))).host || label; } catch { /* not a web address */ }
    require("./recorder").activity(() => view, label).catch(() => {});
    return await runAct(step && typeof step === "object" ? step : {}, true);
  } catch (e) {
    return { ok: false, error: String(e.message || e).slice(0, 500), url: live() ? view.webContents.getURL() : "" };
  }
}

// ── The screens: where the Browser tab is, and the user's own buttons ───────────────────────────────────────

const fromApp = (e) => !!win && !win.isDestroyed() && e.sender === win.webContents;
ipcMain.on("cg:browserShow", (e, rect) => {
  if (!fromApp(e) || !rect) return;
  // Nothing open yet (and nothing on its way): Google
  const fresh = !live() || (!/^https?:/.test(view.webContents.getURL()) && !pendingUrl && !view.webContents.isLoading());
  const z = win.webContents.getZoomFactor() || 1;
  const r = { x: Math.round(Number(rect.x) * z), y: Math.round(Number(rect.y) * z), width: Math.round(Number(rect.width) * z), height: Math.round(Number(rect.height) * z) };
  if (!Object.values(r).every(Number.isFinite) || r.width < 20 || r.height < 20) return;
  shownRect = r;
  ensureView();
  layout();
  if (fresh) view.webContents.loadURL(HOME).catch(() => {});
});
ipcMain.on("cg:browserHide", (e) => {
  if (!fromApp(e) || !shownRect) return;
  shownRect = null;
  layout();
});
ipcMain.on("cg:browserChat", (e, id) => {
  if (!fromApp(e)) return;
  queue = queue.then(() => useChat(id)).catch(() => {});
});
ipcMain.handle("cg:browserState", (e) => (fromApp(e) ? { ...navInfo(), pointerAt } : null));
// The toolbar: back, forward, reload, open (no picture needed)
ipcMain.handle("cg:browserAct", async (e, step) => {
  if (!fromApp(e) || !step || !["open", "back", "forward", "reload"].includes(step.action)) return { ok: false };
  try { await runAct({ action: step.action, url: String(step.url || ""), screenshot: false }, false); return { ok: true }; }
  catch (err) { return { ok: false, error: String(err.message || err) }; }
});
// History: the pages opened in this browser, newest first (q: search in titles and addresses), and clearing it
ipcMain.handle("cg:browserHistory", (e, q) => {
  if (!fromApp(e)) return [];
  const words = String(q || "").toLowerCase().split(/\s+/).filter(Boolean);
  return historyList().filter((h) => !words.length || words.every((w) => `${h.title} ${h.url}`.toLowerCase().includes(w))).slice(0, 300);
});
ipcMain.handle("cg:browserHistoryClear", (e) => {
  if (!fromApp(e)) return false;
  historyList().length = 0;
  saveHistorySoon();
  return true;
});
// Settings → Browser: one history entry removed (its address and time)
ipcMain.handle("cg:browserHistoryRemove", (e, url, at) => {
  if (!fromApp(e)) return false;
  const list = historyList();
  const i = list.findIndex((h) => h.url === url && h.at === Number(at));
  if (i !== -1) { list.splice(i, 1); saveHistorySoon(); }
  return true;
});
// Settings → Browser: the choices (site permissions, the download folder, asking where to save)
ipcMain.handle("cg:browserSettings", (e, patch) => {
  if (!fromApp(e)) return null;
  const s = browserSettings();
  if (patch && typeof patch === "object") {
    for (const k of ["camera", "microphone", "location", "notifications"]) if (patch[k] === "allow" || patch[k] === "block") s[k] = patch[k];
    if (typeof patch.askWhere === "boolean") s.askWhere = patch.askWhere;
    saveSettings();
  }
  return { ...s, downloadDir: downloadDir() };
});
ipcMain.handle("cg:browserPickDownloadDir", async (e) => {
  if (!fromApp(e)) return null;
  const r = await require("electron").dialog.showOpenDialog(win, { properties: ["openDirectory", "createDirectory"], defaultPath: downloadDir() });
  if (r.canceled || !r.filePaths[0]) return null;
  browserSettings().downloadDir = r.filePaths[0];
  saveSettings();
  return r.filePaths[0];
});
// Download history: list (q: search), open a file, show it in its folder, remove one, clear all
ipcMain.handle("cg:browserDownloads", (e, q) => {
  if (!fromApp(e)) return [];
  const words = String(q || "").toLowerCase().split(/\s+/).filter(Boolean);
  return downloads().filter((d) => !words.length || words.every((w) => `${d.name} ${d.url}`.toLowerCase().includes(w)))
    .map((d) => ({ ...d, exists: !!d.file && fs.existsSync(d.file) }));
});
ipcMain.handle("cg:browserDownloadAct", (e, id, action) => {
  if (!fromApp(e)) return false;
  const list = downloads();
  const d = list.find((x) => x.id === id);
  if (action === "clear") { list.length = 0; saveDownloads(); return true; }
  if (!d) return false;
  if (action === "remove") { list.splice(list.indexOf(d), 1); saveDownloads(); return true; }
  if (!d.file || !fs.existsSync(d.file)) return false;
  const { shell } = require("electron");
  if (action === "open") { shell.openPath(d.file); return true; }
  if (action === "show") { shell.showItemInFolder(d.file); return true; }
  return false;
});
// Clear browsing data: history, cookies and logins, site data, cache and the download history (files stay)
ipcMain.handle("cg:browserClearData", async (e) => {
  if (!fromApp(e)) return false;
  const ses = require("electron").session.fromPartition(PARTITION);
  await ses.clearStorageData().catch(() => {});
  await ses.clearCache().catch(() => {});
  historyList().length = 0;
  saveHistorySoon();
  downloads().length = 0;
  saveDownloads();
  for (const k of Object.keys(chats())) delete chatUrls[k];
  saveChats();
  if (live()) view.webContents.loadURL(HOME).catch(() => {});
  return true;
});
// The Camera button: the page as it is now
ipcMain.handle("cg:browserShot", async (e) => {
  if (!fromApp(e) || !live()) return null;
  const img = await view.webContents.capturePage().catch(() => null);
  return img && !img.isEmpty() ? `data:image/png;base64,${img.toPNG().toString("base64")}` : null;
});

module.exports = {
  // The app window it lives in; the local runner sends the AI's browser steps here
  attach(window) {
    win = window;
    win.on("closed", () => { win = null; view = null; shownRect = null; });
    require("./runner").setBrowser(agentAct);
  },
  act: agentAct,
};
