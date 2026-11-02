// Runs in our screens inside Classgrid Code (served at /__classgrid/bridge.js, before the app's own script).
// It gives them window.classgridDesktop, the same thing the Classgrid desktop app's preload.js gives them: each call
// goes to the editor's Classgrid extension (through the panel that holds the page) and its answer comes back.
// Features the editor doesn't offer yet are simply missing, and our screens already hide what isn't there.
(function () {
  var cfg = window.__cgBridge || {};
  var parent = window.parent;
  if (!parent || parent === window) return;
  var next = 1;
  var waiting = {};
  var listeners = {};

  window.addEventListener("message", function (e) {
    if (e.source !== parent) return;
    var m = e.data || {};
    if (m.cgReply && waiting[m.cgReply]) {
      var w = waiting[m.cgReply];
      delete waiting[m.cgReply];
      if (m.error) w.no(new Error(m.error)); else w.ok(m.result);
    } else if (m.cgEvent && listeners[m.cgEvent]) {
      listeners[m.cgEvent].forEach(function (fn) { try { fn(m.data); } catch (err) { /* a screen's handler failed */ } });
    }
  });

  function call(method) {
    var args = Array.prototype.slice.call(arguments, 1);
    return new Promise(function (ok, no) {
      var id = next++;
      waiting[id] = { ok: ok, no: no };
      parent.postMessage({ cgCall: id, method: method, args: args }, "*");
    });
  }
  function send(method) {
    var args = Array.prototype.slice.call(arguments, 1);
    parent.postMessage({ cgCall: 0, method: method, args: args }, "*");
  }
  function on(name) {
    return function (fn) {
      (listeners[name] = listeners[name] || []).push(fn);
      return function () { listeners[name] = (listeners[name] || []).filter(function (f) { return f !== fn; }); };
    };
  }
  var bind = function (m) { return function () { return call.apply(null, [m].concat(Array.prototype.slice.call(arguments))); }; };

  window.classgridDesktop = {
    isDesktop: true,
    inEditor: true, // inside Classgrid Code (the full editor), not the Classgrid desktop app's own window
    version: cfg.version || "",
    deviceId: cfg.deviceId || null,
    openExternal: bind("openExternal"),
    fileUrl: function (file) { return (cfg.appUrl || "") + (cfg.filePrefix || "") + encodeURIComponent(String(file || "")); },
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
