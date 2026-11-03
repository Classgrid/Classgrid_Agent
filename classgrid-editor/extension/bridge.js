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
    Object.keys(saved).forEach(function (k) { localStorage.setItem(k, saved[k]); });
  } catch (err) { /* storage blocked */ }
  var S = Storage.prototype, setItem = S.setItem, removeItem = S.removeItem, clear = S.clear;
  var isLocal = function (s) { try { return s === window.localStorage; } catch (err) { return false; } };
  S.setItem = function (k, v) { setItem.call(this, k, v); if (isLocal(this)) post({ cgStore: "set", key: String(k), value: String(v) }); };
  S.removeItem = function (k) { removeItem.call(this, k); if (isLocal(this)) post({ cgStore: "remove", key: String(k) }); };
  S.clear = function () { clear.call(this); if (isLocal(this)) post({ cgStore: "clear" }); };

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
      if (s.position !== "fixed" || s.display === "none" || s.visibility === "hidden" || (parseInt(s.zIndex, 10) || 0) < 150) continue;
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
  new MutationObserver(function () {
    if (frame) return;
    frame = requestAnimationFrame(function () {
      frame = 0;
      var now = bigWindowOpen();
      if (now && !covering) { clearTimeout(closeTimer); closeTimer = null; covering = true; post({ cgOverlay: true }); }
      else if (!now && covering && !closeTimer) {
        closeTimer = setTimeout(function () {
          closeTimer = null;
          if (!bigWindowOpen()) { covering = false; post({ cgOverlay: false }); }
        }, 250);
      } else if (now && closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
    });
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style", "data-state"] });
  // The editor says where the panel is (before the page covers the window), and when the covering ends
  var coverWindow = function (rect) {
    var root = document.documentElement.style;
    root.setProperty("--cg-panel-top", rect.top + "px");
    root.setProperty("--cg-panel-left", rect.left + "px");
    root.setProperty("--cg-panel-width", rect.width + "px");
    root.setProperty("--cg-panel-height", rect.height + "px");
    document.documentElement.classList.add("cg-overlay");
    post({ cgOverlayReady: true });
  };
  var uncoverWindow = function () { document.documentElement.classList.remove("cg-overlay"); };

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
  var fetches = {};
  var nextFetch = 1;
  window.fetch = function (input, init) {
    var req;
    try { req = new Request(input, init); } catch (err) { return realFetch(input, init); }
    var url = req.url;
    if (url.indexOf(location.origin + "/") === 0) return realFetch(base + url.slice(location.origin.length + 1), init); // our own files
    if (!API.test(url)) return realFetch(input, init);
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
  var fileBases = cfg.fileBases || {};

  window.classgridDesktop = {
    isDesktop: true,
    inEditor: true, // inside Classgrid Code (the full editor), not the Classgrid desktop app's own window
    version: cfg.version || "",
    deviceId: cfg.deviceId || null,
    openExternal: bind("openExternal"),
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
  };
})();
