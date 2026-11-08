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

// The first start of a freshly unpacked Classgrid Code is slow: Windows checks its 239 MB program and thousands of
// files the first time they run (the installer is not signed yet). So, right after the unpack at the app's start, the
// editor is run once with no window (its command-line mode only lists extensions and exits), and Windows does that
// check then, not when the person clicks Open. Runs once per unpacked version.
let warmed = null;
function warmUp() {
  if (warmed) return warmed;
  warmed = (async () => {
    const dir = await unpacked();
    const mark = path.join(dir, ".warmed");
    if (fs.existsSync(mark)) return;
    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;
    await new Promise((resolve) => {
      const p = spawn(path.join(dir, EXE), ["--list-extensions"], { cwd: dir, env, stdio: "ignore", windowsHide: true });
      const t = setTimeout(() => { try { p.kill(); } catch { /* already gone */ } resolve(); }, 120000);
      p.on("error", () => { clearTimeout(t); resolve(); });
      p.on("exit", () => { clearTimeout(t); resolve(); });
    });
    try { fs.writeFileSync(mark, new Date().toISOString()); } catch { /* next start warms again */ }
  })();
  warmed.catch(() => { warmed = null; });
  return warmed;
}

// One open per folder at a time: clicks while the editor is still coming up don't start more copies of it
const opening = new Map(); // folder -> promise
function once(key, work) {
  if (opening.has(key)) return opening.get(key);
  const p = work().finally(() => setTimeout(() => opening.delete(key), 8000));
  opening.set(key, p);
  return p;
}

const CODE_TYPES = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".jsonc", ".md", ".mdx", ".txt", ".log", ".csv", ".html", ".htm", ".css", ".scss", ".sass", ".less", ".vue", ".svelte", ".py", ".ipynb", ".java", ".kt", ".c", ".h", ".cpp", ".hpp", ".cc", ".cs", ".go", ".rs", ".php", ".rb", ".swift", ".dart", ".lua", ".r", ".sql", ".sh", ".bash", ".ps1", ".bat", ".cmd", ".yml", ".yaml", ".toml", ".ini", ".cfg", ".conf", ".xml", ".svg", ".env", ".gitignore", ".gitattributes", ".editorconfig", ".prisma", ".graphql", ".dockerfile"];

// Classgrid Code in Windows' menus, like an installed editor: "Open with" on any file, and "Open with Classgrid Code"
// when right-clicking a file, a folder or inside a folder. Only for this Windows user (no admin needed); written again
// on every start, because each Classgrid Code version sits in its own folder.
async function register() {
  const exe = path.join(await unpacked(), EXE);
  const run = `"${exe}"`;
  const C = "HKCU\\Software\\Classes";
  const keys = [
    [`${C}\\Applications\\${EXE}`, "FriendlyAppName", "Classgrid Code"],
    [`${C}\\Applications\\${EXE}\\DefaultIcon`, null, `${exe},0`],
    [`${C}\\Applications\\${EXE}\\shell\\open\\command`, null, `${run} "%1"`],
    [`${C}\\ClassgridCode.File`, null, "Classgrid Code"],
    [`${C}\\ClassgridCode.File\\DefaultIcon`, null, `${exe},0`],
    [`${C}\\ClassgridCode.File\\shell\\open\\command`, null, `${run} "%1"`],
    [`${C}\\*\\OpenWithProgids`, "ClassgridCode.File", ""],
    // (Windows lists an app in "Open with" for code files only when it is named for each file type, like VS Code)
    ...CODE_TYPES.map((ext) => [`${C}\\${ext}\\OpenWithProgids`, "ClassgridCode.File", ""]),
    [`${C}\\*\\OpenWithList\\${EXE}`, null, ""],
    [`${C}\\*\\shell\\ClassgridCode`, null, "Open with Classgrid Code"],
    [`${C}\\*\\shell\\ClassgridCode`, "Icon", exe],
    [`${C}\\*\\shell\\ClassgridCode\\command`, null, `${run} "%1"`],
    [`${C}\\Directory\\shell\\ClassgridCode`, null, "Open with Classgrid Code"],
    [`${C}\\Directory\\shell\\ClassgridCode`, "Icon", exe],
    [`${C}\\Directory\\shell\\ClassgridCode\\command`, null, `${run} "%V"`],
    [`${C}\\Directory\\Background\\shell\\ClassgridCode`, null, "Open with Classgrid Code"],
    [`${C}\\Directory\\Background\\shell\\ClassgridCode`, "Icon", exe],
    [`${C}\\Directory\\Background\\shell\\ClassgridCode\\command`, null, `${run} "%V"`],
  ];
  for (const [key, name, value] of keys) {
    await new Promise((resolve) => {
      const args = ["add", key, ...(name ? ["/v", name] : ["/ve"]), "/t", "REG_SZ", "/d", value, "/f"];
      const p = spawn("reg.exe", args, { windowsHide: true });
      p.on("error", resolve);
      p.on("exit", resolve);
    });
  }
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
  // One login for the Classgrid app and Classgrid Code: when the app logs out (it had a login, now it has none), a note
  // in the app's data folder tells Classgrid Code to log out too (classgrid-editor/extension/extension.js reads it)
  setToken(t) {
    if (token && !t) { try { fs.writeFileSync(path.join(app.getPath("userData"), "signed-out.json"), JSON.stringify({ at: Date.now() })); } catch { /* the editor checks again later */ } }
    token = t || null;
  },
  unpacked,
  warmUp,
  register,
  // Project Mode: open the folder in Classgrid Code, signed in
  open(folder) {
    const target = path.resolve(folder);
    return once(target.toLowerCase(), async () => {
      await launch([target]);
      const code = await loginCode();
      // (the login link goes to the same editor once it is up)
      if (code) setTimeout(() => { launch(["--open-url", `classgrid-code://classgrid.classgrid/login?code=${encodeURIComponent(code)}`]).catch(() => {}); }, 2500);
      return { opened: true };
    });
  },
  // The "Classgrid Code" icon (desktop and Start menu): the editor on its own, with its last folder, signed in with the
  // app's login. Resolves once the login link is sent too, so the app may close after it.
  async start() {
    await launch([]);
    const code = await loginCode();
    if (code) {
      await new Promise((r) => setTimeout(r, 2500));
      await launch(["--open-url", `classgrid-code://classgrid.classgrid/login?code=${encodeURIComponent(code)}`]).catch(() => {});
    }
    return { opened: true };
  },
  hasLogin: () => !!token,
  // A file the AI mentions: open it in Classgrid Code with its lines selected (the editor's Classgrid extension opens
  // classgrid-code://classgrid.classgrid/open)
  async reveal(folder, file, startLine, endLine) {
    const root = path.resolve(folder);
    const full = path.resolve(root, String(file || ""));
    if (!full.toLowerCase().startsWith(root.toLowerCase())) return { error: "That file isn't in this project." };
    const q = new URLSearchParams({ file: full, start: String(Math.max(0, Number(startLine) || 0)), end: String(Math.max(0, Number(endLine) || 0)) });
    await launch(["--open-url", `classgrid-code://classgrid.classgrid/open?${q}`]);
    return { ok: true };
  },
};
