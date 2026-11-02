// Classgrid Code, the built-in code editor: the same editor as the cloud (OpenVSCode Server with our changes), run
// on this computer so a folder project opens inside the app, also offline. One editor server per app run, started the
// first time a folder project is opened. It only listens on this computer and needs a new secret key each run.
const { app } = require("electron");
const { spawn, spawnSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");

const FIRST_PORT = 47830;

let server = null; // { proc, port, token } once it answers
let starting = null; // the start in progress (so two clicks start one server)
let launched = null; // its process, also while it is still starting

// Where the editor is: inside the installed app (resources/editor), or desktop/editor while building (CG_EDITOR_DIR: another copy)
const editorDir = () => (app.isPackaged ? path.join(process.resourcesPath, "editor") : process.env.CG_EDITOR_DIR || path.join(__dirname, "editor"));
const bridgeDir = () => path.join(app.getPath("userData"), "editor-bridge");
// The editor wants Windows paths as /C:/Users/...
const editorPath = (p) => { const s = path.resolve(p).split("\\").join("/"); return s.startsWith("/") ? s : "/" + s; };

function portFree(port) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once("error", () => resolve(false));
    s.listen(port, "127.0.0.1", () => s.close(() => resolve(true)));
  });
}
async function freePort() {
  for (let p = FIRST_PORT; p < FIRST_PORT + 20; p++) if (await portFree(p)) return p;
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once("error", reject);
    s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => resolve(port)); });
  });
}

// Any answer at all means the editor server is up (without the key it says 403)
function answers(port) {
  return new Promise((resolve) => {
    const req = http.get({ host: "127.0.0.1", port, path: "/", timeout: 2000 }, (res) => { res.resume(); resolve(true); });
    req.on("error", () => resolve(false));
    req.on("timeout", () => { req.destroy(); resolve(false); });
  });
}

async function launch() {
  const dir = editorDir();
  if (!fs.existsSync(path.join(dir, "node.exe")) || !fs.existsSync(path.join(dir, "out", "server-main.js"))) {
    return { error: "The code editor isn't in this copy of the app." };
  }
  const userData = app.getPath("userData");
  const dataDir = path.join(userData, "editor-data");
  fs.mkdirSync(bridgeDir(), { recursive: true });

  // Our default editor settings (same as the cloud), only the first time so the user's own changes stay
  const machine = path.join(dataDir, "data", "Machine", "settings.json");
  const defaults = path.join(dir, "classgrid-machine-settings.json");
  if (!fs.existsSync(machine) && fs.existsSync(defaults)) {
    fs.mkdirSync(path.dirname(machine), { recursive: true });
    fs.copyFileSync(defaults, machine);
  }

  // The newest Classgrid add-on (open file, cursor, terminal commands) goes into the built-in editor before it starts
  try {
    const from = app.isPackaged ? path.join(process.resourcesPath, "bridge", "extension.js") : path.join(__dirname, "..", "infra", "ide", "bridge", "extension.js");
    const to = path.join(dir, "extensions", "classgrid-bridge", "extension.js");
    if (fs.existsSync(from) && fs.existsSync(path.dirname(to)) && (!fs.existsSync(to) || fs.readFileSync(from, "utf8") !== fs.readFileSync(to, "utf8"))) fs.copyFileSync(from, to);
  } catch (e) { console.log("[editor] could not update the Classgrid add-on:", e.message); }

  const port = await freePort();
  const token = crypto.randomBytes(16).toString("hex");
  const env = { ...process.env, CLASSGRID_BRIDGE_DIR: bridgeDir(), CLASSGRID_PROJECTS_DIR: "/" }; // "/": the Classgrid add-on may open any folder (only this app writes its open.json)
  delete env.ELECTRON_RUN_AS_NODE;
  const log = fs.openSync(path.join(userData, "editor.log"), "w");
  const proc = spawn(path.join(dir, "node.exe"), [
    path.join(dir, "out", "server-main.js"),
    "--host", "127.0.0.1",
    "--port", String(port),
    "--connection-token", token,
    "--accept-server-license-terms",
    "--server-data-dir", dataDir,
  ], { cwd: dir, env, windowsHide: true, stdio: ["ignore", log, log] });
  fs.closeSync(log);
  launched = proc;

  let exited = false;
  proc.on("error", () => { exited = true; });
  proc.on("exit", () => { exited = true; if (server?.proc === proc) server = null; });

  // Wait until it answers (up to a minute; the first start on a slow computer takes a while)
  const until = Date.now() + 60000;
  while (!exited && Date.now() < until) {
    if (await answers(port)) {
      server = { proc, port, token };
      return server;
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  killTree(proc);
  return { error: "The code editor didn't start. Try opening the project again." };
}

// Opens a folder in the editor: { url } for the app's screen, or { error }
async function start(folder) {
  if (!server) {
    starting = starting || launch().finally(() => { starting = null; });
    const r = await starting;
    if (r.error) return r;
  }
  // localhost (not 127.0.0.1) so the editor's login cookie counts as the same site as the app's screens
  return { url: `http://localhost:${server.port}/?folder=${encodeURIComponent(editorPath(folder))}&tkn=${server.token}` };
}

// Shows a file of the folder at these lines in the open editor (through the Classgrid add-on's open.json)
function reveal(folder, file, startLine, endLine) {
  const root = path.resolve(String(folder));
  let rel = String(file || "").replace(/\\/g, "/");
  for (const prefix of ["/data/project", "/data"]) {
    if (rel === prefix) rel = "";
    else if (rel.startsWith(prefix + "/")) rel = rel.slice(prefix.length + 1);
  }
  const full = path.resolve(root, rel || ".");
  if (full !== root && !full.toLowerCase().startsWith(root.toLowerCase() + path.sep)) return { error: "That file isn't in this project's folder." };
  const isFolder = fs.existsSync(full) && fs.statSync(full).isDirectory();
  const req = { path: editorPath(full), stamp: Date.now() };
  if (isFolder) req.folder = true;
  else {
    if (Number(startLine) > 0) req.startLine = Number(startLine);
    if (Number(endLine) > 0) req.endLine = Number(endLine);
  }
  fs.mkdirSync(bridgeDir(), { recursive: true });
  fs.writeFileSync(path.join(bridgeDir(), "open.json"), JSON.stringify(req));
  return { ok: true };
}

function killTree(proc) {
  if (!proc || proc.exitCode !== null) return;
  if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(proc.pid), "/T", "/F"], { windowsHide: true });
  else proc.kill("SIGTERM");
}

// On quit: the editor server and everything it started
function stop() {
  killTree(launched);
  launched = server = null;
}

module.exports = { start, reveal, stop };
