// Puts another program's window inside one of our windows (Windows only): Classgrid Code's window sits in Project
// Mode's code area, like the built-in editor did. A small helper (PowerShell with a few Windows calls) does the window
// work; this side talks to it in JSON lines: find / attach / move / hide / detach / close in, { id, ok, hwnd } out.
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const HELPER = String.raw`
Add-Type @"
using System; using System.Text; using System.Runtime.InteropServices;
public static class CgEmbed {
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc f, IntPtr l);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] static extern IntPtr SetParent(IntPtr c, IntPtr p);
  [DllImport("user32.dll")] static extern IntPtr GetParent(IntPtr h);
  [DllImport("user32.dll", EntryPoint = "GetWindowLongPtrW")] static extern IntPtr GetLong(IntPtr h, int i);
  [DllImport("user32.dll", EntryPoint = "SetWindowLongPtrW")] static extern IntPtr SetLong(IntPtr h, int i, IntPtr v);
  [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int w, int hh, uint f);
  [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr h, int c);
  [DllImport("user32.dll")] static extern bool PostMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
  [DllImport("user32.dll")] static extern bool IsWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool SetProcessDpiAwarenessContext(IntPtr v);
  const int GWL_STYLE = -16;
  const long WS_CHILD = 0x40000000, WS_POPUP = 0x80000000, WS_CAPTION = 0x00C00000, WS_THICKFRAME = 0x00040000,
    WS_SYSMENU = 0x00080000, WS_MINIMIZEBOX = 0x00020000, WS_MAXIMIZEBOX = 0x00010000, WS_MAXIMIZE = 0x01000000;
  public static long Find(string part) {
    IntPtr found = IntPtr.Zero;
    EnumWindows((h, l) => {
      if (!IsWindowVisible(h) || GetParent(h) != IntPtr.Zero) return true;
      var s = new StringBuilder(512); GetWindowText(h, s, 512); var t = s.ToString();
      if (t.EndsWith(" - Classgrid Code") && (part.Length == 0 || t.IndexOf(" " + part + " - Classgrid Code", StringComparison.OrdinalIgnoreCase) >= 0 || t.StartsWith(part + " - Classgrid Code", StringComparison.OrdinalIgnoreCase))) { found = h; return false; }
      return true;
    }, IntPtr.Zero);
    return found.ToInt64();
  }
  public static bool Attach(long child, long parent) {
    var c = new IntPtr(child);
    if (!IsWindow(c)) return false;
    ShowWindow(c, 9); // out of maximized / minimized first
    long style = GetLong(c, GWL_STYLE).ToInt64();
    style = (style & ~(WS_POPUP | WS_CAPTION | WS_THICKFRAME | WS_SYSMENU | WS_MINIMIZEBOX | WS_MAXIMIZEBOX | WS_MAXIMIZE)) | WS_CHILD;
    SetLong(c, GWL_STYLE, new IntPtr(style));
    SetParent(c, new IntPtr(parent));
    return true;
  }
  public static bool Move(long child, int x, int y, int w, int h) {
    var c = new IntPtr(child);
    if (!IsWindow(c)) return false;
    SetWindowPos(c, IntPtr.Zero, x, y, w, h, 0x0020 | 0x0040); // on top of the window's own page, frame changed, show
    return true;
  }
  public static bool Hide(long child) { var c = new IntPtr(child); return IsWindow(c) && ShowWindow(c, 0); }
  public static bool Detach(long child) {
    var c = new IntPtr(child);
    if (!IsWindow(c)) return false;
    long style = GetLong(c, GWL_STYLE).ToInt64();
    style = (style & ~WS_CHILD) | WS_CAPTION | WS_THICKFRAME | WS_SYSMENU | WS_MINIMIZEBOX | WS_MAXIMIZEBOX;
    SetLong(c, GWL_STYLE, new IntPtr(style));
    SetParent(c, IntPtr.Zero);
    SetWindowPos(c, IntPtr.Zero, 80, 80, 1200, 800, 0x0004 | 0x0020 | 0x0040);
    return true;
  }
  public static bool Close(long child) { var c = new IntPtr(child); return IsWindow(c) && PostMessage(c, 0x0010, IntPtr.Zero, IntPtr.Zero); }
}
"@
# Real screen pixels (the app sends them so), not ones Windows scales again for a program that doesn't know the scaling
[CgEmbed]::SetProcessDpiAwarenessContext([IntPtr]::new(-4)) | Out-Null
[Console]::Out.WriteLine('{"ready":true}')
while ($true) {
  $line = [Console]::In.ReadLine()
  if ($line -eq $null) { break }
  try {
    $m = $line | ConvertFrom-Json
    $r = @{ id = $m.id; ok = $true }
    switch ($m.op) {
      "find"   { $r.hwnd = [CgEmbed]::Find([string]$m.part) }
      "attach" { $r.ok = [CgEmbed]::Attach([long]$m.child, [long]$m.parent) }
      "move"   { $r.ok = [CgEmbed]::Move([long]$m.child, [int]$m.x, [int]$m.y, [int]$m.w, [int]$m.h) }
      "hide"   { $r.ok = [CgEmbed]::Hide([long]$m.child) }
      "detach" { $r.ok = [CgEmbed]::Detach([long]$m.child) }
      "close"  { $r.ok = [CgEmbed]::Close([long]$m.child) }
    }
  } catch { $r = @{ id = $m.id; ok = $false; error = "$_" } }
  [Console]::Out.WriteLine(($r | ConvertTo-Json -Compress))
}
`;

let helper = null;
let ready = null;
let nextId = 1;
const waiting = new Map();

function start() {
  if (ready) return ready;
  ready = new Promise((resolve, reject) => {
    const script = path.join(os.tmpdir(), "classgrid-winembed.ps1");
    fs.writeFileSync(script, HELPER.replace(/\r?\n/g, "\r\n"));
    const p = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", script], { windowsHide: true, stdio: ["pipe", "pipe", "ignore"] });
    helper = p;
    let buffer = "";
    p.stdout.setEncoding("utf8");
    p.stdout.on("data", (chunk) => {
      buffer += chunk;
      let at;
      while ((at = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, at).trim();
        buffer = buffer.slice(at + 1);
        let m;
        try { m = JSON.parse(line); } catch { continue; }
        if (m.ready) { resolve(); continue; }
        const w = waiting.get(m.id);
        if (w) { waiting.delete(m.id); w(m); }
      }
    });
    p.on("error", reject);
    p.on("exit", () => {
      helper = null; ready = null;
      for (const w of waiting.values()) w({ ok: false, error: "helper ended" });
      waiting.clear();
      reject(new Error("The window helper ended"));
    });
  });
  ready.catch(() => { ready = null; });
  return ready;
}

async function ask(op, args = {}) {
  await start();
  const id = nextId++;
  return new Promise((resolve) => {
    waiting.set(id, resolve);
    helper.stdin.write(JSON.stringify({ id, op, ...args }) + "\r\n");
    setTimeout(() => { if (waiting.delete(id)) resolve({ ok: false, error: "no answer" }); }, 15000);
  });
}

module.exports = {
  start,
  find: (part) => ask("find", { part: String(part || "") }).then((r) => Number(r.hwnd) || 0),
  attach: (child, parent) => ask("attach", { child, parent }).then((r) => !!r.ok),
  move: (child, { x, y, w, h }) => ask("move", { child, x: Math.round(x), y: Math.round(y), w: Math.max(1, Math.round(w)), h: Math.max(1, Math.round(h)) }).then((r) => !!r.ok),
  hide: (child) => ask("hide", { child }).then((r) => !!r.ok),
  detach: (child) => ask("detach", { child }).then((r) => !!r.ok),
  close: (child) => ask("close", { child }).then((r) => !!r.ok),
  stop() { if (helper) { try { helper.stdin.end(); helper.kill(); } catch { /* gone */ } helper = null; ready = null; } },
};
