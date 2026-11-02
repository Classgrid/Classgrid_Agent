// Inside Classgrid Code the desktop app's own parts (runner.js, aimemory.js...) run in the editor's extension host,
// which has no Electron. This gives them the few Electron things they use: the app's folders and version, and
// opening links and files. Anything else (hidden windows, screen pictures) isn't there; those parts already handle
// that ("not inside the app").
const Module = require("node:module");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

function install({ userData, version }) {
  const folders = {
    userData,
    home: os.homedir(),
    documents: documentsFolder(),
    downloads: path.join(os.homedir(), "Downloads"),
    desktop: path.join(os.homedir(), "Desktop"),
    temp: os.tmpdir(),
  };
  const open = (target) => spawn("cmd.exe", ["/d", "/s", "/c", "start", '""', `"${target}"`], { windowsHide: true, windowsVerbatimArguments: true, detached: true, stdio: "ignore" }).unref();
  const shim = {
    app: {
      getPath: (name) => folders[name] || folders.userData,
      getVersion: () => version,
      isPackaged: true,
    },
    shell: {
      openExternal: async (url) => open(url),
      openPath: async (file) => { open(file); return ""; },
      showItemInFolder: (file) => spawn("explorer.exe", ["/select,", file], { windowsHide: true, detached: true, stdio: "ignore" }).unref(),
    },
  };
  const load = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request === "electron") return shim;
    return load.call(this, request, parent, isMain);
  };
}

// The user's Documents folder (moved into OneDrive on many computers)
function documentsFolder() {
  try {
    const out = require("node:child_process").execFileSync("reg", ["query", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders", "/v", "Personal"], { encoding: "utf8", windowsHide: true, timeout: 5000 });
    const raw = (out.match(/Personal\s+REG_(?:EXPAND_)?SZ\s+(.+)/i) || [])[1];
    if (raw) return raw.trim().replace(/%([^%]+)%/g, (_m, v) => process.env[v] || "");
  } catch { /* not Windows */ }
  return path.join(os.homedir(), "Documents");
}

module.exports = { install };
