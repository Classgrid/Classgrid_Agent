// The Classgrid extension in the other code editors on this computer (VS Code, Cursor, Windsurf, VSCodium), like
// Claude Code adds itself to them. Plan: plan/extension-release.md.
// - finds each editor's command-line tool in its usual install folder;
// - asks once ("Add Classgrid to VS Code and Cursor?") and remembers the answer (Settings → General can change it);
// - with a yes, installs classgrid.classgrid from the editor's own store (`<cli> --install-extension`), now and for an
//   editor added later. Nothing is installed without the yes, and an editor that already has it is left alone.
// - asks only once the extension is really in the stores (Open VSX answers for it), so nobody is asked for nothing.
const { execFile } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const EXTENSION_ID = "classgrid.classgrid";
const PUBLISHED_URL = "https://open-vsx.org/api/classgrid/classgrid";

const local = process.env.LOCALAPPDATA || "";
const programs = [process.env.ProgramFiles, process.env["ProgramFiles(x86)"]].filter(Boolean);
const EDITORS = [
  { id: "vscode", name: "VS Code", clis: [path.join(local, "Programs", "Microsoft VS Code", "bin", "code.cmd"), ...programs.map((p) => path.join(p, "Microsoft VS Code", "bin", "code.cmd"))] },
  { id: "vscode-insiders", name: "VS Code Insiders", clis: [path.join(local, "Programs", "Microsoft VS Code Insiders", "bin", "code-insiders.cmd"), ...programs.map((p) => path.join(p, "Microsoft VS Code Insiders", "bin", "code-insiders.cmd"))] },
  { id: "cursor", name: "Cursor", clis: [path.join(local, "Programs", "cursor", "resources", "app", "bin", "cursor.cmd"), path.join(local, "Programs", "Cursor", "resources", "app", "bin", "cursor.cmd")] },
  { id: "windsurf", name: "Windsurf", clis: [path.join(local, "Programs", "Windsurf", "bin", "windsurf.cmd"), ...programs.map((p) => path.join(p, "Windsurf", "bin", "windsurf.cmd"))] },
  { id: "vscodium", name: "VSCodium", clis: [path.join(local, "Programs", "VSCodium", "bin", "codium.cmd"), ...programs.map((p) => path.join(p, "VSCodium", "bin", "codium.cmd"))] },
];

// %APPDATA%\Classgrid\editor-extension.json: { choice: "yes" | "no" | null }
let file = path.join(process.env.APPDATA || "", "Classgrid", "editor-extension.json");
let busy = null;

function init(appDataDir) {
  file = path.join(appDataDir, "Classgrid", "editor-extension.json");
}
function readChoice() {
  try { const c = JSON.parse(fs.readFileSync(file, "utf8")).choice; return c === "yes" || c === "no" ? c : null; } catch { return null; }
}
function saveChoice(choice) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ choice, at: new Date().toISOString() }));
    return true;
  } catch { return false; }
}

// The editor's .cmd runs through cmd.exe: the path is quoted (it has spaces), the arguments are fixed words
function runCli(cli, args, timeout = 120000) {
  return new Promise((resolve) => {
    execFile(`"${cli}"`, args, { shell: true, windowsHide: true, timeout }, (err, stdout, stderr) => {
      resolve({ ok: !err, out: String(stdout || ""), err: String(stderr || err?.message || "") });
    });
  });
}

// The editors on this computer, and whether each already has the extension
async function found() {
  if (process.platform !== "win32") return [];
  const list = [];
  for (const e of EDITORS) {
    const cli = e.clis.find((c) => c && fs.existsSync(c));
    if (!cli) continue;
    const res = await runCli(cli, ["--list-extensions"], 30000);
    const installed = res.ok && res.out.split(/\r?\n/).some((l) => l.trim().toLowerCase() === EXTENSION_ID);
    list.push({ id: e.id, name: e.name, cli, installed });
  }
  return list;
}

async function isPublished() {
  try { return (await fetch(PUBLISHED_URL, { signal: AbortSignal.timeout(10000) })).ok; } catch { return false; }
}

async function installInto(editors, log) {
  const results = [];
  for (const e of editors.filter((x) => !x.installed)) {
    const res = await runCli(e.cli, ["--install-extension", EXTENSION_ID]);
    if (!res.ok) log(`[editors] ${e.name}: install failed: ${res.err.trim().slice(0, 300)}`);
    results.push({ id: e.id, name: e.name, ok: res.ok });
  }
  return results;
}

// On app start (a little after the window is up): ask once, or keep a yes up to date for editors added later
function check({ ask, log = console.log } = {}) {
  if (busy) return busy;
  busy = (async () => {
    const choice = readChoice();
    if (choice === "no") return;
    const editors = await found();
    const missing = editors.filter((e) => !e.installed);
    if (!missing.length || !(await isPublished())) return;
    if (choice === "yes") return void (await installInto(editors, log));
    const names = missing.map((e) => e.name);
    const yes = await ask(names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0]);
    saveChoice(yes ? "yes" : "no");
    if (yes) await installInto(editors, log);
  })().catch((err) => log(`[editors] ${err?.message || err}`)).finally(() => { busy = null; });
  return busy;
}

// Settings → General: the switch, with the editors found
async function status() {
  return { choice: readChoice(), editors: (await found()).map(({ id, name, installed }) => ({ id, name, installed })) };
}
async function setChoice(on, log = console.log) {
  saveChoice(on ? "yes" : "no");
  if (!on) return { choice: "no", results: [] };
  const results = await installInto(await found(), log);
  return { choice: "yes", results };
}

module.exports = { init, check, status, setChoice, EXTENSION_ID };
