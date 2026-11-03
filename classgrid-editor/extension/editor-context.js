// What the user is doing in Classgrid Code, for the Agent: the open file, cursor, selection, open tabs, errors and the
// commands they ran in the editor's terminal (with their output). Kept in editor-bridge/context.json, the file the
// desktop app's runner reads for the server's editor_context call (runner.js), in this editor's own data folder and in
// the Classgrid app's (whichever runner the server asks, it finds it). Same as the old built-in editor's add-on
// (infra/ide/bridge/extension.js).
const vscode = require("vscode");
const fs = require("node:fs");
const path = require("node:path");

const MAX_RUNS = 10;
const MAX_OUTPUT = 3000;
const terminalRuns = []; // { command, cwd, exitCode, output (its end), at }
const plain = (s) => String(s).replace(/\u001b\][^\u0007]*(\u0007|\u001b\\)/g, "").replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, "").replace(/\r/g, "");
const isFile = (p) => !!p && /^[a-zA-Z]:[\\/]|^\//.test(p);

function contextNow() {
  const editor = vscode.window.activeTextEditor;
  const doc = editor && editor.document.uri.scheme === "file" ? editor.document : null;
  const sel = editor ? editor.selection : null;
  const selected = doc && sel && !sel.isEmpty ? doc.getText(sel) : "";
  const tabs = vscode.window.tabGroups.all.flatMap((g) => g.tabs)
    .map((t) => (t.input && t.input.uri && t.input.uri.scheme === "file" ? t.input.uri.fsPath : null))
    .filter(isFile);
  const problems = [];
  for (const [uri, list] of vscode.languages.getDiagnostics()) {
    if (uri.scheme !== "file") continue;
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
  const active = doc ? doc.uri.fsPath : null;
  problems.sort((a, b) => (a.file === active ? 0 : 1) - (b.file === active ? 0 : 1) || (a.severity === "error" ? 0 : 1) - (b.severity === "error" ? 0 : 1));
  return {
    activeFile: active,
    cursorLine: active && sel ? sel.active.line + 1 : null,
    selection: active && selected ? { startLine: sel.start.line + 1, endLine: sel.end.line + 1, text: selected.slice(0, 4000) } : null,
    openTabs: [...new Set(tabs)].slice(0, 20),
    problems: problems.slice(0, 30),
    problemCount: problems.length,
    terminal: terminalRuns.slice(-MAX_RUNS),
    updatedAt: Date.now(),
  };
}

function start(context, dataDirs) {
  const dirs = dataDirs.map((d) => path.join(d, "editor-bridge"));
  const write = () => {
    let text;
    try { text = JSON.stringify(contextNow()); } catch { return; }
    for (const dir of dirs) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, "context.json");
        fs.writeFileSync(file + ".tmp", text);
        fs.renameSync(file + ".tmp", file);
      } catch { /* that folder can't be written */ }
    }
  };
  let timer;
  const soon = () => { clearTimeout(timer); timer = setTimeout(write, 800); };
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(soon),
    vscode.window.onDidChangeTextEditorSelection(soon),
    vscode.window.tabGroups.onDidChangeTabs(soon),
    vscode.languages.onDidChangeDiagnostics(soon),
    vscode.workspace.onDidSaveTextDocument(soon),
    vscode.window.onDidChangeWindowState((s) => { if (s.focused) soon(); }),
    { dispose: () => clearTimeout(timer) }
  );
  // The commands the user runs in the editor's terminal (the terminal's shell integration, on by default)
  if (vscode.window.onDidStartTerminalShellExecution && vscode.window.onDidEndTerminalShellExecution) {
    const outputs = new Map(); // execution -> { text }
    context.subscriptions.push(
      vscode.window.onDidStartTerminalShellExecution(async (e) => {
        const buf = { text: "" };
        outputs.set(e.execution, buf);
        try { for await (const piece of e.execution.read()) buf.text = (buf.text + piece).slice(-MAX_OUTPUT * 3); } catch { /* stream ended */ }
      }),
      vscode.window.onDidEndTerminalShellExecution((e) => {
        const buf = outputs.get(e.execution);
        outputs.delete(e.execution);
        const command = String((e.execution.commandLine && e.execution.commandLine.value) || "").trim();
        if (!command) return;
        // (the output stream ends a moment after the command)
        setTimeout(() => {
          terminalRuns.push({
            command: command.slice(0, 1000),
            cwd: e.execution.cwd ? e.execution.cwd.fsPath : "",
            exitCode: typeof e.exitCode === "number" ? e.exitCode : null,
            output: plain(buf ? buf.text : "").trim().slice(-MAX_OUTPUT),
            at: Date.now(),
          });
          while (terminalRuns.length > MAX_RUNS) terminalRuns.shift();
          write();
        }, 300);
      })
    );
  }
  write();
}

module.exports = { start };
