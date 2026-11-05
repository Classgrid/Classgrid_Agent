// Runs first in our screens inside Classgrid Code's Agent panel (put into the page by extension.js, before the app's
// own script). Our screens are loaded from the editor's own files (no localhost), so this:
// - gives them window.classgridDesktop, the same thing the Classgrid desktop app's preload.js gives them: each call
//   goes to the editor's Classgrid extension and its answer comes back;
// - carries their calls to our server (api.classgrid.in) through the editor, piece by piece for streamed answers;
// - keeps their saved settings and login (localStorage) in the editor, so they stay after the editor closes;
// - points the root paths of our pictures and files ("/logo.png") at the editor's copy of them;
// - sends page errors to the extension's log.
// Features the editor doesn't offer yet are simply missing, and our screens already hide what isn't there.
(function () {
  var cfg = window.__cgBridge || {};
  var vscode = acquireVsCodeApi();
  var post = function (m) { vscode.postMessage(m); };

  // Page errors go to the extension's log ("Classgrid" output)
  window.addEventListener("error", function (e) { post({ cgLog: "error", text: String(e.message) + (e.filename ? " at " + e.filename + ":" + e.lineno : "") }); });
  window.addEventListener("unhandledrejection", function (e) { var r = e.reason; post({ cgLog: "rejection", text: String((r && (r.stack || r.message)) || r) }); });

  // Saved settings and login: put back what the editor kept, and keep every change there
  try {
    var saved = cfg.storage || {};
    // (exactly what the editor kept: a login it forgot, after Log out, doesn't come back from the page's own copy)
    Object.keys(localStorage).forEach(function (k) { if (!Object.prototype.hasOwnProperty.call(saved, k)) localStorage.removeItem(k); });
    Object.keys(saved).forEach(function (k) { localStorage.setItem(k, saved[k]); });
  } catch (err) { /* storage blocked */ }
  var S = Storage.prototype, setItem = S.setItem, removeItem = S.removeItem, clear = S.clear;
  var isLocal = function (s) { try { return s === window.localStorage; } catch (err) { return false; } };
  S.setItem = function (k, v) { setItem.call(this, k, v); if (isLocal(this)) post({ cgStore: "set", key: String(k), value: String(v) }); };
  S.removeItem = function (k) { removeItem.call(this, k); if (isLocal(this)) post({ cgStore: "remove", key: String(k) }); };
  S.clear = function () { clear.call(this); if (isLocal(this)) post({ cgStore: "clear" }); };

  // Pop-ups (an app's login, a payment) open in the computer's browser: the page gets a stand-in window, so its "if
  // the pop-up was blocked" checks pass, and a page that opens a blank pop-up first and sets its address later works too
  window.open = function (url) {
    var go = function (u) { var s = String(u || ""); if (/^https?:\/\//i.test(s)) call("openExternal", s); };
    var stand = { closed: false, opener: null, close: function () { stand.closed = true; }, focus: function () {}, blur: function () {}, postMessage: function () {}, document: { write: function () {}, close: function () {}, title: "" } };
    var loc = { assign: go, replace: go };
    Object.defineProperty(loc, "href", { get: function () { return "about:blank"; }, set: go });
    Object.defineProperty(stand, "location", { get: function () { return loc; }, set: go });
    if (url && String(url) !== "about:blank") go(url);
    return stand;
  };

  // The page our screens open at (the Agent chat)
  try { if (cfg.startPath && location.pathname !== cfg.startPath) history.replaceState(null, "", cfg.startPath); } catch (err) { post({ cgLog: "route", text: "couldn't open " + cfg.startPath + ": " + err.message }); }
  post({ cgLog: "start", text: "page at " + location.href.slice(0, 200) });
  // A picture or file that fails to load goes to the log too
  window.addEventListener("error", function (e) { var t = e.target; if (t && t !== window && (t.src || t.href)) post({ cgLog: "load", text: (t.tagName || "") + " " + String(t.src || t.href).slice(0, 300) }); }, true);

  // Root paths of our pictures and files point at the editor's copy of our screens
  var base = cfg.base || "./";
  var fix = function (u) { return typeof u === "string" && /^\/(?!\/)/.test(u) && !/^\/api\//.test(u) ? base + u.slice(1) : u; };
  ["HTMLImageElement", "HTMLSourceElement", "HTMLVideoElement", "HTMLAudioElement", "HTMLScriptElement", "HTMLEmbedElement"].forEach(function (n) {
    var P = window[n] && window[n].prototype;
    var d = P && Object.getOwnPropertyDescriptor(P, "src");
    if (d && d.set) Object.defineProperty(P, "src", { get: d.get, set: function (v) { d.set.call(this, fix(v)); }, configurable: true, enumerable: d.enumerable });
  });
  var linkHref = Object.getOwnPropertyDescriptor(HTMLLinkElement.prototype, "href");
  if (linkHref && linkHref.set) Object.defineProperty(HTMLLinkElement.prototype, "href", { get: linkHref.get, set: function (v) { linkHref.set.call(this, fix(v)); }, configurable: true, enumerable: linkHref.enumerable });
  var setAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name, value) {
    var n = String(name).toLowerCase();
    if ((n === "src" && this.tagName !== "A") || n === "poster" || (n === "href" && this.tagName === "LINK")) value = fix(value);
    return setAttribute.call(this, name, value);
  };
  // (also pictures added to the page as text, like innerHTML)
  var fixNode = function (el) {
    if (!el || el.nodeType !== 1) return;
    ["src", "poster"].forEach(function (a) { var v = el.getAttribute(a); if (v && fix(v) !== v) setAttribute.call(el, a, fix(v)); });
    if (el.tagName === "LINK") { var h = el.getAttribute("href"); if (h && fix(h) !== h) setAttribute.call(el, "href", fix(h)); }
    if (el.querySelectorAll) Array.prototype.forEach.call(el.querySelectorAll("[src],[poster],link[href]"), fixNode);
  };
  new MutationObserver(function (list) { list.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, fixNode); }); }).observe(document.documentElement, { childList: true, subtree: true });

  // Big windows (Plugins, settings, file previews: a dark layer over the whole page, or a dialog) open over the whole
  // Classgrid app in Project Mode. Here the panel's page then covers the whole editor window (see-through, with the
  // panel still drawn in its place), so the window's dark layer lies over the files and code the same way. Small
  // pop-ups (menus, the model picker) and invisible click-catchers don't count.
  var bigWindowOpen = function () {
    // (a window that says so itself, like Studio's chat search)
    if (document.querySelector("[data-cg-big-window]")) return true;
    // (the chats sidebar is as narrow as its icons: its menus, like your account menu, need the whole window too)
    if (document.documentElement.classList.contains("cg-editor-sidebar")) {
      var menus = document.querySelectorAll('[role="menu"], [role="listbox"]');
      for (var k = 0; k < menus.length; k++) if (menus[k].getClientRects().length) return true;
    }
    var dialogs = document.querySelectorAll('[role="dialog"], [role="alertdialog"]');
    for (var i = 0; i < dialogs.length; i++) {
      var d = dialogs[i];
      if (!d.closest("[data-radix-popper-content-wrapper]") && d.getClientRects().length) return true;
    }
    var all = document.body ? document.body.querySelectorAll("div") : [];
    for (var j = 0; j < all.length; j++) {
      var el = all[j];
      if (!el.firstElementChild || typeof el.className !== "string" || !/\binset-0\b/.test(el.className)) continue;
      var s = getComputedStyle(el);
      if (s.position !== "fixed" || s.display === "none" || (s.visibility === "hidden" && !root.classList.contains("cg-want-cover")) || (parseInt(s.zIndex, 10) || 0) < 150) continue;
      // (any color format: rgba(0, 0, 0, 0.5), oklab(0 0 0 / 0.5), color(srgb 0 0 0 / 0.5)...; see-through is alpha 0)
      var bg = String(s.backgroundColor || "").trim();
      var alpha = (bg.match(/\/\s*([\d.]+%?)\s*\)$/) || bg.match(/^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+%?)\s*\)$/) || [])[1];
      var a = alpha === undefined ? 1 : /%$/.test(alpha) ? parseFloat(alpha) / 100 : parseFloat(alpha);
      if (!((bg && bg !== "transparent" && a > 0.05) || (s.backdropFilter && s.backdropFilter !== "none"))) continue;
      return true;
    }
    return false;
  };
  // Opening is seen at once (the next frame); closing waits a moment, so the closing animation doesn't flicker
  var covering = false;
  var frame = 0;
  var closeTimer = null;
  // The look of a page covering the window (the panel drawn in its place, see-through around it) applies only while
  // the page really is as wide as the window: a CSS width rule, so it switches in the very frame the editor resizes
  // the page (no flash when a big window opens or closes), and until then the big window waits hidden (it never shows
  // squeezed into the panel first)
  var root = document.documentElement;
  var coverStyle = document.createElement("style");
  var setCoverWidth = function (w) {
    var min = Math.max(1, Math.floor(w) - 4);
    coverStyle.textContent =
      "@media (min-width: " + min + "px) {" +
      " html.cg-editor.cg-want-cover, html.cg-editor.cg-want-cover body, html.cg-editor.cg-want-cover #root > .bg-background, html.cg-editor.cg-want-cover .cg-editor-panel { background: transparent !important; }" +
      " html.cg-editor.cg-want-cover { color-scheme: normal !important; }" +
      // (no scrolling of the page while it covers the window: a scrolled page put the AI Hub too high, cut off,
      // with an undarkened strip and a scrollbar at the bottom)
      " html.cg-editor.cg-want-cover #root { overflow: clip !important; }" +
      " html.cg-editor.cg-want-cover #root aside.sm\\:hidden { top: var(--cg-panel-top) !important; left: var(--cg-panel-left) !important; right: auto !important; bottom: auto !important; width: var(--cg-panel-width) !important; height: var(--cg-panel-height) !important; background: var(--background) !important; }" +
      " html.cg-editor-sidebar.cg-want-cover [data-slot=\"sidebar-container\"] { top: var(--cg-panel-top) !important; left: var(--cg-panel-left) !important; height: var(--cg-panel-height) !important; }" +
      " }" +
      "@media (max-width: " + (min - 1) + "px) {" +
      " html.cg-editor.cg-want-cover :is(.fixed.inset-0, [role=\"dialog\"], [role=\"alertdialog\"], [data-cg-big-window]), html.cg-editor.cg-want-cover body > :not(#root) { visibility: hidden !important; }" +
      " }";
  };
  setCoverWidth(100000);
  (document.head || root).appendChild(coverStyle);
  // Nothing covers the whole editor window any more: dialogs and big windows show inside the AI panel (owner,
  // 2026-11-04: switching the page to window size and back made the panel flash). The covering code stays for now.
  var coversWindow = false;
  if (coversWindow) new MutationObserver(function () {
    if (frame) return;
    frame = requestAnimationFrame(function () {
      frame = 0;
      var now = bigWindowOpen();
      if (now && !covering) { clearTimeout(closeTimer); closeTimer = null; covering = true; setCoverWidth(100000); root.classList.add("cg-want-cover"); post({ cgOverlay: true }); }
      else if (!now && covering && !closeTimer) {
        closeTimer = setTimeout(function () {
          closeTimer = null;
          if (!bigWindowOpen()) { covering = false; post({ cgOverlay: false }); }
        }, 250);
      } else if (now && closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
    });
  }).observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style", "data-state"] });
  // The editor says where the panel is and how wide the window is (before it makes the page cover the window), and
  // when the covering has ended
  var coverWindow = function (rect) {
    root.style.setProperty("--cg-panel-top", rect.top + "px");
    root.style.setProperty("--cg-panel-left", rect.left + "px");
    root.style.setProperty("--cg-panel-width", rect.width + "px");
    root.style.setProperty("--cg-panel-height", rect.height + "px");
    setCoverWidth(rect.windowWidth || 100000);
    root.classList.add("cg-want-cover");
    post({ cgOverlayReady: true });
  };
  var uncoverWindow = function () { root.classList.remove("cg-want-cover"); };

  // Our screens follow the editor's light or dark theme (the editor marks its pages vscode-light / vscode-dark), so the
  // AI panel, the AI Hub and the Settings tab always match the code around them
  var followEditorTheme = function () {
    var b = document.body;
    if (!b) return;
    var dark = b.classList.contains("vscode-dark") || b.classList.contains("vscode-high-contrast");
    var light = b.classList.contains("vscode-light") || b.classList.contains("vscode-high-contrast-light");
    if (!dark && !light) return;
    var want = dark ? "dark" : "light";
    var now = null;
    try { now = localStorage.getItem("theme"); } catch (err) { /* storage blocked */ }
    if (now === want) return;
    try { localStorage.setItem("theme", want); } catch (err) { /* storage blocked */ }
    window.dispatchEvent(new StorageEvent("storage", { key: "theme", newValue: want }));
  };
  var watchTheme = function () {
    followEditorTheme();
    new MutationObserver(followEditorTheme).observe(document.body, { attributes: true, attributeFilter: ["class"] });
  };
  if (document.body) watchTheme(); else document.addEventListener("DOMContentLoaded", watchTheme);
  // The theme just picked in Settings, sent here at once (the editor's own switch reaches this page a moment later)
  var setTheme = function (want) {
    if (want !== "dark" && want !== "light") return;
    try { localStorage.setItem("theme", want); } catch (err) { /* storage blocked */ }
    window.dispatchEvent(new StorageEvent("storage", { key: "theme", newValue: want }));
  };

  // The Agent panel and the chats sidebar on the left edge are two pages: a chat list change in one (a new chat, a
  // refresh after a rename or delete, Ctrl+K for the chat search) is passed on to the other through the extension
  var SHARED = ["agent:refresh-sessions", "agent:session-created", "agent:open-search-palette"];
  var passing = false;
  SHARED.forEach(function (name) {
    window.addEventListener(name, function (e) {
      if (passing) return;
      try { post({ cgShare: name, detail: e.detail === undefined ? null : e.detail }); } catch (err) { post({ cgShare: name, detail: null }); }
    });
  });

  // Bytes <-> text for the messages to the extension
  var toB64 = function (buf) {
    var bytes = new Uint8Array(buf), s = "";
    for (var i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  };
  var fromB64 = function (b64) {
    var s = atob(b64), bytes = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
    return bytes;
  };

  // Calls to our server go through the editor (a page loaded from the editor's files can't call it itself)
  var realFetch = window.fetch.bind(window);
  var API = /^https:\/\/api\.classgrid\.in\//;
  // (and a file upload to our storage: the editor's page can't send it there itself)
  var UPLOAD = /^https:\/\/[a-z0-9]+\.r2\.cloudflarestorage\.com\//;
  var fetches = {};
  var nextFetch = 1;
  window.fetch = function (input, init) {
    var req;
    try { req = new Request(input, init); } catch (err) { return realFetch(input, init); }
    var url = req.url;
    if (url.indexOf(location.origin + "/") === 0) return realFetch(base + url.slice(location.origin.length + 1), init); // our own files
    if (!API.test(url) && !UPLOAD.test(url)) return realFetch(input, init);
    var id = nextFetch++;
    var signal = (init && init.signal) || req.signal;
    var body = req.method === "GET" || req.method === "HEAD" ? Promise.resolve(null) : req.arrayBuffer();
    return body.then(function (buf) {
      return new Promise(function (resolve, reject) {
        var ctrl = null;
        var stream = new ReadableStream({
          start: function (c) { ctrl = c; },
          cancel: function () { post({ cgFetchAbort: id }); delete fetches[id]; },
        });
        fetches[id] = { resolve: resolve, reject: reject, stream: stream, ctrl: function () { return ctrl; }, started: false };
        var headers = [];
        req.headers.forEach(function (v, k) { headers.push([k, v]); });
        post({ cgFetch: id, url: url, method: req.method, headers: headers, body: buf && buf.byteLength ? toB64(buf) : null });
        var abort = function () {
          var f = fetches[id];
          if (!f) return;
          delete fetches[id];
          post({ cgFetchAbort: id });
          var err = new DOMException("The user aborted a request.", "AbortError");
          if (!f.started) reject(err); else try { ctrl.error(err); } catch (e2) { /* already closed */ }
        };
        if (signal) { if (signal.aborted) abort(); else signal.addEventListener("abort", abort); }
      });
    });
  };

  // Calls to the editor's Classgrid extension (window.classgridDesktop)
  var nextCall = 1;
  var waiting = {};
  var listeners = {};
  window.addEventListener("message", function (e) {
    var m = e.data || {};
    var f;
    if (m.cgFetchHead && (f = fetches[m.cgFetchHead])) {
      f.started = true;
      var empty = [101, 204, 205, 304].indexOf(m.status) >= 0;
      f.resolve(new Response(empty ? null : f.stream, { status: m.status, statusText: m.statusText || "", headers: m.headers || [] }));
      if (empty) delete fetches[m.cgFetchHead];
    } else if (m.cgFetchChunk && (f = fetches[m.cgFetchChunk])) {
      try { f.ctrl().enqueue(fromB64(m.data)); } catch (err) { /* the page stopped reading */ }
    } else if (m.cgFetchEnd && (f = fetches[m.cgFetchEnd])) {
      delete fetches[m.cgFetchEnd];
      try { f.ctrl().close(); } catch (err) { /* already closed */ }
    } else if (m.cgFetchError && (f = fetches[m.cgFetchError])) {
      delete fetches[m.cgFetchError];
      var err = new TypeError("Failed to fetch (" + m.error + ")");
      if (!f.started) f.reject(err); else try { f.ctrl().error(err); } catch (e2) { /* already closed */ }
    } else if (m.cgReply && waiting[m.cgReply]) {
      var w = waiting[m.cgReply];
      delete waiting[m.cgReply];
      if (m.error) w.no(new Error(m.error)); else w.ok(m.result);
    } else if (m.cgEvent === "overlayRect") {
      coverWindow(m.data);
    } else if (m.cgEvent === "overlayOff") {
      uncoverWindow();
    } else if (m.cgEvent === "editorTheme") {
      setTheme(m.data);
    } else if (m.cgEvent === "shared" && m.data && SHARED.indexOf(m.data.name) !== -1) {
      passing = true;
      try { window.dispatchEvent(new CustomEvent(m.data.name, { detail: m.data.detail })); } finally { passing = false; }
    } else if (m.cgEvent && listeners[m.cgEvent]) {
      listeners[m.cgEvent].forEach(function (fn) { try { fn(m.data); } catch (err2) { /* a screen's handler failed */ } });
    }
  });

  function call(method) {
    var args = Array.prototype.slice.call(arguments, 1);
    return new Promise(function (ok, no) {
      var id = nextCall++;
      waiting[id] = { ok: ok, no: no };
      post({ cgCall: id, method: method, args: args });
    });
  }
  function send(method) {
    post({ cgCall: 0, method: method, args: Array.prototype.slice.call(arguments, 1) });
  }
  function on(name) {
    return function (fn) {
      (listeners[name] = listeners[name] || []).push(fn);
      return function () { listeners[name] = (listeners[name] || []).filter(function (g) { return g !== fn; }); };
    };
  }
  var bind = function (m) { return function () { return call.apply(null, [m].concat(Array.prototype.slice.call(arguments))); }; };

  // Download buttons and links: the file is saved with the editor's "Save as" box. Following the link in the panel
  // replaced the whole panel with a blank page (a button's link is often made in code and clicked, never put on the page)
  var isDownload = function (a) { return !!(a && a.hasAttribute && a.hasAttribute("download") && a.href && !/^javascript:/i.test(a.href)); };
  var saveLink = function (a) {
    var href = a.href;
    var name = a.getAttribute("download") || decodeURIComponent(href.split(/[?#]/)[0].split("/").pop() || "") || "download";
    var done = /^(blob|data):/i.test(href)
      ? realFetch(href).then(function (r) { return r.arrayBuffer(); }).then(function (buf) { return call("downloadFile", { name: name, data: toB64(buf) }); })
      : call("downloadFile", { url: href, name: name });
    done.catch(function (err) { post({ cgLog: "download", text: String(err && err.message) }); });
  };
  var realClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { if (isDownload(this)) return saveLink(this); return realClick.apply(this, arguments); };
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a") : null;
    if (isDownload(a)) { e.preventDefault(); e.stopPropagation(); saveLink(a); }
  }, true);

  // Copy and paste: inside the editor our page can't use the clipboard itself (the editor keeps Ctrl+C / Ctrl+V and
  // the page's clipboard calls), so copy buttons, Ctrl+C, Ctrl+X and Ctrl+V go through the editor's clipboard
  var clipWrite = function (text) { return call("clipboardWrite", String(text == null ? "" : text)).then(function () { return undefined; }); };
  var clipRead = function () { return call("clipboardRead").then(function (t) { return String(t || ""); }); };
  try {
    if (navigator.clipboard) {
      var clipOwn = function (name, fn) { Object.defineProperty(navigator.clipboard, name, { value: fn, configurable: true, writable: true }); };
      clipOwn("writeText", clipWrite);
      clipOwn("readText", clipRead);
      // (a copy with formatting: its plain text)
      clipOwn("write", function (items) {
        var item = items && items[0];
        if (!item || item.types.indexOf("text/plain") === -1) return Promise.resolve();
        return item.getType("text/plain").then(function (blob) { return blob.text(); }).then(clipWrite);
      });
    }
  } catch (err) { post({ cgLog: "clipboard", text: String(err && err.message) }); }
  var editable = function (el) {
    return !!el && (el.tagName === "TEXTAREA" || el.isContentEditable || (el.tagName === "INPUT" && /^(text|search|url|email|password|tel|number|)$/i.test(el.type || "")));
  };
  var selectedText = function () {
    var el = document.activeElement;
    if (el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT") && typeof el.selectionStart === "number") return el.value.slice(el.selectionStart, el.selectionEnd);
    return String(window.getSelection ? window.getSelection() : "");
  };
  window.addEventListener("keydown", function (e) {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    var key = String(e.key || "").toLowerCase();
    var el = document.activeElement;
    if (key === "v") {
      if (!editable(el)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      clipRead().then(function (text) {
        if (!text) {
          // No text: a picture (a screenshot, a copied image) is read by the editor and pasted as a file, so the
          // chat attaches it like a paste in the browser
          return call("clipboardImage").then(function (img) {
            if (!img || !img.data) return;
            var image = new DataTransfer();
            image.items.add(new File([fromB64(img.data)], img.name, { type: img.type }));
            el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: image, bubbles: true, cancelable: true }));
          });
        }
        // the box's own paste handling first (long texts become a chip, formatted text stays formatted)
        var data = new DataTransfer();
        data.setData("text/plain", text);
        var pasted = new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true });
        if (el.dispatchEvent(pasted)) { el.focus(); document.execCommand("insertText", false, text); }
      });
    } else if ((key === "c" || key === "x") && !e.shiftKey) {
      var text = selectedText();
      if (!text) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      clipWrite(text);
      if (key === "x" && editable(el)) document.execCommand("delete");
    }
  }, true);
  var fileBases = cfg.fileBases || {};

  window.classgridDesktop = {
    isDesktop: true,
    inEditor: true, // inside Classgrid Code (the full editor), not the Classgrid desktop app's own window
    version: cfg.version || "",
    deviceId: cfg.deviceId || null,
    editorFolder: cfg.folder || null, // the folder open in the editor
    openExternal: bind("openExternal"),
    // A file from the internet as { type, data (base64) }: the panel can't load it itself (a chat's PDF)
    fetchFile: bind("fetchFile"),
    // The mic button: the editor gives the panel no microphone, so the editor records it (a WAV as { type, data })
    micStart: bind("micStart"),
    micStop: bind("micStop"),
    micCancel: bind("micCancel"),
    // A file on this computer, shown in our screens (pictures, PDFs): its address in the editor
    fileUrl: function (file) {
      var f = String(file || "");
      var drive = (f.match(/^([a-zA-Z]):[\\/]/) || [])[1];
      if (!drive || !fileBases[drive.toLowerCase()]) return "";
      return fileBases[drive.toLowerCase()] + f.slice(3).split(/[\\/]+/).map(encodeURIComponent).join("/");
    },
    fileInfo: bind("fileInfo"),
    openPath: bind("openPath"),
    showInFolder: bind("showInFolder"),
    pickFolder: bind("pickFolder"),
    setToken: function (token) { send("setToken", token || null); },
    saveMemory: bind("saveMemory"),
    otherMemory: bind("otherMemory"),
    memoryIndex: bind("memoryIndex"),
    saveChat: bind("saveChat"),
    listChats: bind("listChats"),
    readChat: bind("readChat"),
    removeChat: bind("removeChat"),
    listOtherChats: bind("listOtherChats"),
    readOtherChat: bind("readOtherChat"),
    retry: bind("retry"),
    openFolder: bind("openFolder"),
    cloneRepo: bind("cloneRepo"),
    listFiles: bind("listFiles"),
    githubRepo: bind("githubRepo"),
    readFile: bind("readFile"),
    openInEditor: bind("openInEditor"),
    revealInEditor: bind("revealInEditor"),
    onOpenFolderProject: on("openFolderProject"),
    // Settings → Appearance: light, dark or the same as the computer, for the whole editor. It also says which one that
    // is now (the computer's own for "same as your PC"), so the AI panel switches at once, not after the editor does
    setEditorTheme: function (mode) {
      var want = mode === "system" ? (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : mode;
      return call("setEditorTheme", mode, want);
    },
    // A Windows notification (Classgrid Code has no Electron, so the extension shows a toast)
    // (sound: Windows plays its notification sound with it; toast false: only the sound)
    notify: function (title, body, opts) { send("notify", { title: title, body: body, sound: !!(opts && opts.sound), toast: !(opts && opts.toast === false) }); },
    getNotificationSettings: bind("getNotificationSettings"),
    saveNotificationSettings: bind("saveNotificationSettings"),
    // The AI panel's chats sidebar → Settings: the same Settings tab as the gear in the title bar
    openSettings: bind("openSettings"),
    // Settings → Log out of Classgrid Code
    signOut: bind("signOut"),
    // (the Settings tab: the AI panel asks it to show one of its pages, like Plugins)
    onSettingsSection: on("settingsSection"),
    // The X on the AI panel's top line: closes the right side
    closePanel: bind("closePanel"),
    // The chats sidebar on the left edge: its width, the chat picked there (opens in the Agent panel), and the chat
    // the Agent panel shows (marked in the sidebar)
    setStripWidth: function (width) { send("stripWidth", width); },
    openChat: function (id) { send("openChat", id || null); },
    activeChat: function (id) { send("activeChat", id || null); },
    onOpenChat: on("openChat"),
    onActiveChat: on("activeChat"),
    // The sidebar button next to the logo in the title bar
    onToggleSidebar: on("toggleSidebar"),
  };
})();
