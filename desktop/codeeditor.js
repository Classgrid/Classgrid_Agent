// Classgrid Code, our full desktop editor (classgrid-editor/, built on GitHub) for Project Mode: a folder project
// opens in it, signed in with the user's Classgrid login (a one-time code from /api/auth/editor-code), with the Agent
// on the right. No editor server, no localhost. It ships in the app as resources/classgrid-code.zip and is unpacked
// once per version into the app's data folder. Studio's own terminals also run on its program (terminal.js).
const { app } = require("electron");
const { spawn } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const EXE = "Classgrid Code.exe";
let token = null;
let ready = null; // the unpacked folder (a promise, so two opens unpack once)

// The packed editor: in the installed app resources/classgrid-code.zip; while building, desktop/classgrid-code.zip
// (scripts/get-classgrid-code.mjs) or an unpacked desktop/classgrid-code/
const zipPath = () => (app.isPackaged ? path.join(process.resourcesPath, "classgrid-code.zip") : path.join(__dirname, "classgrid-code.zip"));

function unpacked() {
  if (ready) return ready;
  ready = (async () => {
    const dev = path.join(__dirname, "classgrid-code");
    if (!app.isPackaged && fs.existsSync(path.join(dev, EXE))) return dev;
    const zip = zipPath();
    if (!fs.existsSync(zip)) throw new Error("Classgrid Code isn't in this version of the app. Update the Classgrid app, then try again.");
    // one folder per version (an older one may still be open while the app updates)
    const st = fs.statSync(zip);
    const version = crypto.createHash("sha1").update(`${st.size}-${st.mtimeMs}`).digest("hex").slice(0, 12);
    const base = path.join(app.getPath("userData"), "classgrid-code");
    const dir = path.join(base, version);
    if (fs.existsSync(path.join(dir, ".unpacked"))) return dir;
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    await new Promise((resolve, reject) => {
      // (Windows own tar, which reads zip files; another tar on the PATH may not)
      const p = spawn(path.join(process.env.SystemRoot || "C:\\Windows", "System32", "tar.exe"), ["-xf", zip, "-C", dir], { windowsHide: true });
      p.on("error", reject);
      p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`Classgrid Code couldn't be unpacked (${code}).`))));
    });
    if (!fs.existsSync(path.join(dir, EXE))) throw new Error("Classgrid Code couldn't be unpacked.");
    fs.writeFileSync(path.join(dir, ".unpacked"), new Date().toISOString());
    // older versions that aren't open any more
    for (const old of fs.readdirSync(base)) if (old !== version) fs.rm(path.join(base, old), { recursive: true, force: true }, () => {});
    return dir;
  })();
  ready.catch(() => { ready = null; });
  return ready;
}

// Classgrid Code as its own program (never as Node: the app's own setting is taken out)
async function launch(args) {
  const dir = await unpacked();
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  spawn(path.join(dir, EXE), args, { cwd: dir, env, detached: true, stdio: "ignore", windowsHide: false }).unref();
}

// A one-time code (60 seconds) for the user's login, so the editor opens signed in
async function loginCode() {
  if (!token) return null;
  try {
    const res = await fetch("https://api.classgrid.in/api/auth/editor-code", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
    const data = await res.json().catch(() => ({}));
    return res.ok && data.code ? String(data.code) : null;
  } catch { return null; }
}

module.exports = {
  setToken(t) { token = t || null; },
  unpacked,
  // Project Mode: open the folder in Classgrid Code, signed in
  async open(folder) {
    await launch([path.resolve(folder)]);
    const code = await loginCode();
    // (the login link goes to the same editor once it is up)
    if (code) setTimeout(() => { launch(["--open-url", `classgrid-code://classgrid.classgrid/login?code=${encodeURIComponent(code)}`]).catch(() => {}); }, 2500);
    return { opened: true };
  },
  // A file the AI mentions: open it in Classgrid Code at its line
  async reveal(folder, file, line) {
    const root = path.resolve(folder);
    const full = path.resolve(root, String(file || ""));
    if (!full.toLowerCase().startsWith(root.toLowerCase())) return { error: "That file isn't in this project." };
    await launch(["-g", `${full}:${Math.max(1, Number(line) || 1)}`]);
    return { ok: true };
  },
};
