// Classgrid bridge (runs in the user's own editor box):
// 1. Opens a file at the right lines when the Classgrid chat asks (~/.classgrid/open.json).
// 2. Keeps ~/.classgrid/context.json up to date with what the user is looking at (open file, cursor, selection,
//    open tabs, errors), so the Classgrid AI knows what "this" means.
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

const DIR = "/home/workspace/.classgrid";
const OPEN_FILE = path.join(DIR, "open.json");
const CONTEXT_FILE = path.join(DIR, "context.json");
const PROJECTS = "/home/workspace/projects/";
let lastStamp = 0;

async function handleOpen() {
  let req;
  try { req = JSON.parse(fs.readFileSync(OPEN_FILE, "utf8")); } catch { return; }
  if (!req || !req.path || !req.stamp || req.stamp <= lastStamp) return;
  lastStamp = req.stamp;
  if (!req.path.startsWith(PROJECTS)) return;
  try {
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
      .filter((p) => p && p.startsWith(PROJECTS));
    const problems = [];
    for (const [uri, list] of vscode.languages.getDiagnostics()) {
      if (!uri.fsPath.startsWith(PROJECTS)) continue;
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
    const active = doc && doc.uri.fsPath.startsWith(PROJECTS) ? doc.uri.fsPath : null;
    problems.sort((a, b) => (a.file === active ? 0 : 1) - (b.file === active ? 0 : 1) || (a.severity === "error" ? 0 : 1) - (b.severity === "error" ? 0 : 1));
    const context = {
      activeFile: active,
      cursorLine: active && sel ? sel.active.line + 1 : null,
      selection: active && selected ? { startLine: sel.start.line + 1, endLine: sel.end.line + 1, text: selected.slice(0, 4000) } : null,
      openTabs: [...new Set(tabs)].slice(0, 20),
      problems: problems.slice(0, 30),
      problemCount: problems.length,
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
  writeContext();
}

module.exports = { activate, deactivate() {} };
