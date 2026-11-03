// Classgrid Code, our full desktop editor (classgrid-editor/, built on GitHub) for Project Mode: a folder project
// opens in it, signed in with the user's Classgrid login (a one-time code from /api/auth/editor-code), with the Agent
// on the right. No editor server, no localhost. It ships in the app as resources/classgrid-code.zip and is unpacked
// once per version into the app's data folder. Studio's own terminals also run on its program (terminal.js).
const { app, screen } = require("electron");
const { spawn } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const winembed = require("./winembed");

const EXE = "Classgrid Code.exe";
let token = null;
let ready = null; // the unpacked folder (a promise, so two opens unpack once)
// Classgrid Code's window inside a Classgrid window (Project Mode's code area): { hwnd, folder, owner }
let inside = null;
let placing = Promise.resolve();
let wanted = null; // the newest place asked for: { owner, folder, rect } (rect null: hidden)

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

// Project Mode's code area: Classgrid Code's window for this folder sits inside the Classgrid window at rect (the
// page's pixels), or is hidden (rect null: another page, or a window of the app is open over the code area). The
// editor's own Agent side closes while it is inside (the app's Agent panel is next to it).
async function placeNow() {
  const want = wanted;
  if (!want) return;
  const { owner, folder, rect } = want;
  if (!rect) { if (inside) await winembed.hide(inside.hwnd); return; }
  if (owner.isDestroyed()) return;
  if (!inside || inside.folder !== folder || inside.owner !== owner) {
    if (inside && inside.folder !== folder) await winembed.close(inside.hwnd); // the last project's window
    inside = null;
    const name = path.basename(path.resolve(folder));
    let hwnd = 0;
    for (let i = 0; i < 60 && !hwnd && wanted === want; i++) {
      hwnd = await winembed.find(name);
      if (!hwnd) await new Promise((r) => setTimeout(r, 500));
    }
    if (!hwnd || wanted !== want || owner.isDestroyed()) return;
    const parent = Number(owner.getNativeWindowHandle().readBigUInt64LE(0));
    if (!(await winembed.attach(hwnd, parent))) return;
    inside = { hwnd, folder, owner };
    owner.once("closed", () => { if (inside && inside.owner === owner) { winembed.close(inside.hwnd); inside = null; } });
    launch(["--open-url", "classgrid-code://classgrid.classgrid/inside"]).catch(() => {});
  }
  const latest = wanted && wanted.rect ? wanted.rect : rect;
  const scale = screen.getDisplayMatching(owner.getBounds()).scaleFactor * owner.webContents.getZoomFactor();
  await winembed.move(inside.hwnd, { x: latest.x * scale, y: latest.y * scale, w: latest.width * scale, h: latest.height * scale });
}
function place(owner, folder, rect) {
  wanted = { owner, folder: folder ? path.resolve(folder) : null, rect: folder && rect && rect.width > 0 && rect.height > 0 ? rect : null };
  placing = placing.then(placeNow, placeNow);
  return placing;
}

module.exports = {
  setToken(t) { token = t || null; },
  place,
  // Quitting: Classgrid Code's window inside the app closes with it
  closeInside() {
    wanted = null;
    if (!inside) return winembed.stop();
    const { hwnd } = inside;
    inside = null;
    winembed.close(hwnd).finally(() => winembed.stop());
  },
  unpacked,
  register,
  // Project Mode: open the folder in Classgrid Code, signed in
  async open(folder) {
    await launch([path.resolve(folder)]);
    const code = await loginCode();
    // (the login link goes to the same editor once it is up)
    if (code) setTimeout(() => { launch(["--open-url", `classgrid-code://classgrid.classgrid/login?code=${encodeURIComponent(code)}`]).catch(() => {}); }, 2500);
    return { opened: true };
  },
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
