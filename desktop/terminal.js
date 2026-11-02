// The user's own terminals in Studio's Terminal tab (PowerShell, or Git Bash when it is installed), like a code
// editor's terminal. ptyhost.js runs them; this side starts it, opens and closes terminals and passes the keys and
// the output between it and the screens.
const { app, ipcMain } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const editorDir = () => (app.isPackaged ? path.join(process.resourcesPath, "editor") : process.env.CG_EDITOR_DIR || path.join(__dirname, "editor"));

let host = null;
let owner = null; // the window's webContents that gets the output
const open = new Set();

function startHost() {
  if (host) return host;
  const dir = editorDir();
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  // ptyhost.js sits outside app.asar in the installed app (the editor's node.exe can't read inside it)
  const script = app.isPackaged ? path.join(process.resourcesPath, "ptyhost.js") : path.join(__dirname, "ptyhost.js");
  host = spawn(path.join(dir, "node.exe"), [script, dir], { cwd: dir, env, windowsHide: true, stdio: ["pipe", "pipe", "ignore"] });
  let buffer = "";
  host.stdout.setEncoding("utf8");
  host.stdout.on("data", (chunk) => {
    buffer += chunk;
    let at;
    while ((at = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, at);
      buffer = buffer.slice(at + 1);
      let m;
      try { m = JSON.parse(line); } catch { continue; }
      if (m.type === "exit") open.delete(m.id);
      if (owner && !owner.isDestroyed()) owner.send(m.type === "data" ? "cg:termData" : "cg:termExit", m);
    }
  });
  host.on("exit", () => {
    host = null;
    for (const id of open) if (owner && !owner.isDestroyed()) owner.send("cg:termExit", { id, code: -1 });
    open.clear();
  });
  return host;
}
const tell = (msg) => { if (host && host.stdin.writable) host.stdin.write(JSON.stringify(msg) + "\n"); };

// The shells this computer has: PowerShell always, Git Bash when Git for Windows is installed
function shells() {
  const list = [{ id: "powershell", name: "PowerShell", file: "powershell.exe", args: ["-NoLogo"] }];
  const bash = ["C:\\Program Files\\Git\\bin\\bash.exe", "C:\\Program Files (x86)\\Git\\bin\\bash.exe", path.join(os.homedir(), "AppData", "Local", "Programs", "Git", "bin", "bash.exe")].find((f) => fs.existsSync(f));
  if (bash) list.push({ id: "bash", name: "Git Bash", file: bash, args: ["--login", "-i"] });
  list.push({ id: "cmd", name: "Command Prompt", file: "cmd.exe", args: [] });
  return list;
}

let nextId = 1;
ipcMain.handle("cg:termShells", () => shells().map(({ id, name }) => ({ id, name })));
ipcMain.handle("cg:termOpen", (e, { shell, cwd, cols, rows } = {}) => {
  const pick = shells().find((s) => s.id === shell) || shells()[0];
  const folder = cwd && fs.existsSync(String(cwd)) ? String(cwd) : os.homedir();
  owner = e.sender;
  startHost();
  const id = `t${nextId++}`;
  open.add(id);
  tell({ type: "open", id, shell: pick.file, args: pick.args, cwd: folder, cols, rows });
  return { id, name: pick.name, cwd: folder };
});
ipcMain.on("cg:termInput", (_e, { id, data }) => tell({ type: "input", id, data: String(data ?? "") }));
ipcMain.on("cg:termResize", (_e, { id, cols, rows }) => tell({ type: "resize", id, cols, rows }));
ipcMain.on("cg:termClose", (_e, { id }) => { open.delete(id); tell({ type: "close", id }); });

module.exports = {
  stop() { if (host) { try { host.stdin.end(); host.kill(); } catch { /* gone */ } host = null; } },
};
