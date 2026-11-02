// Real terminals for the user (Studio's Terminal tab), run by the built-in editor's own node.exe, which carries a
// ready-built node-pty (the same terminal engine VS Code uses), so the app doesn't need its own copy for Electron.
// Talks with the app (terminal.js) in JSON lines: open / input / resize / close in, data / exit out.
const path = require("node:path");
const pty = require(path.join(process.argv[2], "node_modules", "node-pty"));

const terms = new Map();
const send = (msg) => process.stdout.write(JSON.stringify(msg) + "\n");

let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let at;
  while ((at = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, at);
    buffer = buffer.slice(at + 1);
    let m;
    try { m = JSON.parse(line); } catch { continue; }
    if (m.type === "open") {
      try {
        const p = pty.spawn(m.shell, m.args || [], { name: "xterm-256color", cols: m.cols || 100, rows: m.rows || 30, cwd: m.cwd, env: process.env });
        terms.set(m.id, p);
        p.onData((data) => send({ type: "data", id: m.id, data }));
        p.onExit(({ exitCode }) => { terms.delete(m.id); send({ type: "exit", id: m.id, code: exitCode }); });
      } catch (e) {
        send({ type: "data", id: m.id, data: `\r\nCould not start ${m.shell}: ${e.message}\r\n` });
        send({ type: "exit", id: m.id, code: 1 });
      }
    } else if (m.type === "input") terms.get(m.id)?.write(m.data);
    else if (m.type === "resize") { try { terms.get(m.id)?.resize(Math.max(2, m.cols | 0), Math.max(2, m.rows | 0)); } catch { /* closed */ } }
    else if (m.type === "close") { try { terms.get(m.id)?.kill(); } catch { /* closed */ } terms.delete(m.id); }
  }
});
// The app closed: every terminal goes with it
process.stdin.on("end", () => { for (const p of terms.values()) { try { p.kill(); } catch { /* closed */ } } process.exit(0); });
