/*
 * ─────────────────────────────────────────────────────────
 * 🚨 ERP SHUT DOWN 🚨
 * The Classgrid ERP is shut down and will never work or be worked on again.
 * The org admin dashboard and every dashboard other than chat.classgrid.in and the
 * super admin dashboard are banned, and so is all ERP backend code.
 * Any issue or bug in the ERP or the org admin dashboard is banned too: do not look
 * for it, report it or fix it.
 * Do not build, fix, test or talk about ERP features. Only chat.classgrid.in and the
 * super admin dashboard are live.
 * ─────────────────────────────────────────────────────────
 */
// Classgrid bridge (runs in the user's own editor box):
// 1. Opens a file at the right lines when the Classgrid chat asks (~/.classgrid/open.json).
// 2. Keeps ~/.classgrid/context.json up to date with what the user is looking at (open file, cursor, selection,
//    open tabs, errors) and the commands they ran in the editor's terminal (with their output), so the Classgrid AI
//    knows what "this" means and what just failed.
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

// The desktop app runs this editor on the user's own computer and sets these two; the cloud box uses the defaults
const DIR = process.env.CLASSGRID_BRIDGE_DIR || "/home/workspace/.classgrid";
const OPEN_FILE = path.join(DIR, "open.json");
const CONTEXT_FILE = path.join(DIR, "context.json");
const PROJECTS = process.env.CLASSGRID_PROJECTS_DIR || "/home/workspace/projects/";
let lastStamp = 0;
const BAR_COMMAND = /^[\w.-]{1,120}$/; // a command name only, run without arguments
// "/" (the desktop app): any file on the computer, also Windows paths like C:\\Users\\...
const inProjects = (p) => !!p && (PROJECTS === "/" || p.startsWith(PROJECTS));
// The user's latest terminal commands: { command, cwd, exitCode, output (its end), at }
const terminalRuns = [];
const MAX_RUNS = 10;
const MAX_OUTPUT = 3000;
const plain = (s) => String(s).replace(/\u001b\][^\u0007]*(\u0007|\u001b\\)/g, "").replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, "").replace(/\r/g, "");

async function handleOpen() {
  let req;
  try { req = JSON.parse(fs.readFileSync(OPEN_FILE, "utf8")); } catch { return; }
  if (!req || !req.stamp || req.stamp <= lastStamp) return;
  lastStamp = req.stamp;
  // The desktop app's top bar: search box, layout buttons and its File / Edit / … menu
  if (req.command) {
    if (BAR_COMMAND.test(String(req.command))) await vscode.commands.executeCommand(req.command).then(undefined, () => {});
    return;
  }
  if (!req.path || !inProjects(req.path)) return;
  try {
    if (req.folder) {
      // A folder: show it in the Explorer
      await vscode.commands.executeCommand("workbench.view.explorer");
      await vscode.commands.executeCommand("revealInExplorer", vscode.Uri.file(req.path));
      return;
    }
    // Pictures, PDFs and other non-text files: open them in their own viewer
    if (/\.(png|jpe?g|gif|webp|svg|ico|bmp|avif|pdf|mp4|webm|mp3|wav|woff2?|ttf|zip)$/i.test(req.path)) {
      await vscode.commands.executeCommand("vscode.open", vscode.Uri.file(req.path), { preview: false });
      return;
    }
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(req.path));
    let range;
    if (req.find) {
      const at = doc.getText().indexOf(req.find);
      if (at >= 0) range = new vscode.Range(doc.positionAt(at), doc.positionAt(at + req.find.length));
    }
    if (!range && req.startLine) {
      const s = Math.max(0, Math.min(doc.lineCount - 1, req.startLine - 1));
      const e = Math.max(s, Math.min(doc.lineCount - 1, (req.endLine || req.startLine) - 1));
      range = new vscode.Range(s, 0, e, doc.lineAt(e).text.length);
    }
    const editor = await vscode.window.showTextDocument(doc, { preview: false });
    if (range) {
      editor.selection = new vscode.Selection(range.start, range.end);
      editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
    }
  } catch {
    vscode.window.showWarningMessage(`Could not open ${path.basename(req.path)}`);
  }
}

function writeContext() {
  try {
    const editor = vscode.window.activeTextEditor;
    const doc = editor && editor.document.uri.scheme === "file" ? editor.document : null;
    const sel = editor ? editor.selection : null;
    const selected = doc && sel && !sel.isEmpty ? doc.getText(sel) : "";
    const tabs = vscode.window.tabGroups.all.flatMap((g) => g.tabs)
      .map((t) => (t.input && t.input.uri ? t.input.uri.fsPath : null))
      .filter((p) => inProjects(p));
    const problems = [];
    for (const [uri, list] of vscode.languages.getDiagnostics()) {
      if (!inProjects(uri.fsPath)) continue;
      for (const d of list) {
        if (d.severity > vscode.DiagnosticSeverity.Warning) continue;
        problems.push({
          file: uri.fsPath,
          line: d.range.start.line + 1,
          severity: d.severity === vscode.DiagnosticSeverity.Error ? "error" : "warning",
          message: String(d.message).split("\n")[0].slice(0, 300),
          source: d.source || "",
        });
      }
    }
    const active = doc && inProjects(doc.uri.fsPath) ? doc.uri.fsPath : null;
    problems.sort((a, b) => (a.file === active ? 0 : 1) - (b.file === active ? 0 : 1) || (a.severity === "error" ? 0 : 1) - (b.severity === "error" ? 0 : 1));
    const context = {
      activeFile: active,
      cursorLine: active && sel ? sel.active.line + 1 : null,
      selection: active && selected ? { startLine: sel.start.line + 1, endLine: sel.end.line + 1, text: selected.slice(0, 4000) } : null,
      openTabs: [...new Set(tabs)].slice(0, 20),
      problems: problems.slice(0, 30),
      problemCount: problems.length,
      terminal: terminalRuns.slice(-MAX_RUNS),
      updatedAt: Date.now(),
    };
    fs.writeFileSync(CONTEXT_FILE + ".tmp", JSON.stringify(context));
    fs.renameSync(CONTEXT_FILE + ".tmp", CONTEXT_FILE);
  } catch {}
}

function activate(context) {
  try { fs.mkdirSync(DIR, { recursive: true }); } catch {}
  try { lastStamp = JSON.parse(fs.readFileSync(OPEN_FILE, "utf8")).stamp || 0; } catch {}
  let openTimer;
  const watcher = fs.watch(DIR, (_e, name) => { if (name === "open.json") { clearTimeout(openTimer); openTimer = setTimeout(handleOpen, 50); } });
  context.subscriptions.push({ dispose: () => watcher.close() });

  let ctxTimer;
  const soon = () => { clearTimeout(ctxTimer); ctxTimer = setTimeout(writeContext, 800); };
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(soon),
    vscode.window.onDidChangeTextEditorSelection(soon),
    vscode.window.tabGroups.onDidChangeTabs(soon),
    vscode.languages.onDidChangeDiagnostics(soon),
    vscode.workspace.onDidSaveTextDocument(soon)
  );
  // The commands the user runs in the editor's terminal (needs the terminal's shell integration, on by default)
  if (vscode.window.onDidStartTerminalShellExecution && vscode.window.onDidEndTerminalShellExecution) {
    const outputs = new Map(); // execution -> { text }
    context.subscriptions.push(
      vscode.window.onDidStartTerminalShellExecution(async (e) => {
        const buf = { text: "" };
        outputs.set(e.execution, buf);
        try {
          for await (const piece of e.execution.read()) {
            buf.text = (buf.text + piece).slice(-MAX_OUTPUT * 3);
          }
        } catch {}
      }),
      vscode.window.onDidEndTerminalShellExecution((e) => {
        const buf = outputs.get(e.execution);
        outputs.delete(e.execution);
        const command = String((e.execution.commandLine && e.execution.commandLine.value) || "").trim();
        if (!command) return;
        // The output stream ends a moment after the command; wait for it
        setTimeout(() => {
          terminalRuns.push({
            command: command.slice(0, 1000),
            cwd: e.execution.cwd ? e.execution.cwd.fsPath : "",
            exitCode: typeof e.exitCode === "number" ? e.exitCode : null,
            output: plain(buf ? buf.text : "").trim().slice(-MAX_OUTPUT),
            at: Date.now(),
          });
          while (terminalRuns.length > MAX_RUNS) terminalRuns.shift();
          writeContext();
        }, 300);
      })
    );
  }
  writeContext();
}

module.exports = { activate, deactivate() {} };
