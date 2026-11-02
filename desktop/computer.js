// The AI using any app on this computer (like a person at the keyboard): it sees a picture of the screen, then the
// app moves the real mouse and types on the real keyboard. The mouse and keyboard go through one small PowerShell
// helper that stays open (Windows' own user32 functions), so each step is quick. Every step is allowed by the user
// first on the chat's permission card.
const { spawn } = require("node:child_process");

const SHOT_WIDTH = 1280; // pictures the AI sees are at most this wide; its x / y are in this picture's pixels
let scale = 1; // real screen pixels per picture pixel (from the last screenshot)
let ps = null;
let queue = Promise.resolve();

const HELPER = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System; using System.Runtime.InteropServices;
public class CgInput {
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint x, uint y, int d, UIntPtr e);
  [DllImport("user32.dll")] public static extern void keybd_event(byte k, byte s, uint f, UIntPtr e);
}
"@
[CgInput]::SetProcessDPIAware() | Out-Null
"__ready__"
`;

function helper() {
  if (ps && ps.exitCode === null) return ps;
  ps = spawn("powershell.exe", ["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "-"], { windowsHide: true });
  ps.out = "";
  ps.stdout.on("data", (d) => { ps.out += d.toString(); });
  ps.stderr.on("data", (d) => { ps.out += d.toString(); });
  ps.stdin.write(HELPER.replace(/\r?\n/g, "\r\n") + "\r\n");
  return ps;
}

// Runs one PowerShell line in the helper and waits for it to finish
function run(line, timeoutMs = 15000) {
  const job = queue.then(() => new Promise((resolve) => {
    const p = helper();
    const mark = `__done_${Date.now()}_${Math.random().toString(36).slice(2)}__`;
    const start = p.out.length;
    p.stdin.write(`try { ${line} } catch { "ERR: " + $_.Exception.Message }; "${mark}"\r\n`);
    const t0 = Date.now();
    const tick = setInterval(() => {
      const got = p.out.slice(start);
      if (got.includes(mark) || Date.now() - t0 > timeoutMs) {
        clearInterval(tick);
        resolve(got.split(mark)[0].replace(/__ready__\s*/g, "").trim());
      }
    }, 30);
  }));
  queue = job.catch(() => {});
  return job;
}

// A picture of the main screen, at most SHOT_WIDTH wide: { data (JPEG base64), w, h, screenW, screenH }
async function screenshot() {
  const { desktopCapturer, screen } = require("electron");
  const d = screen.getPrimaryDisplay();
  const w = Math.round(d.size.width * d.scaleFactor);
  const h = Math.round(d.size.height * d.scaleFactor);
  const sources = await desktopCapturer.getSources({ types: ["screen"], thumbnailSize: { width: w, height: h } });
  const src = sources.find((s) => String(s.display_id) === String(d.id)) || sources[0];
  if (!src || src.thumbnail.isEmpty()) throw new Error("the screen couldn't be captured");
  let img = src.thumbnail;
  const real = img.getSize();
  if (real.width > SHOT_WIDTH) img = img.resize({ width: SHOT_WIDTH, quality: "good" });
  const size = img.getSize();
  scale = real.width / size.width;
  return { data: img.toJPEG(70).toString("base64"), w: size.width, h: size.height, screenW: real.width, screenH: real.height };
}

// Keys for SendKeys: "Enter", "Ctrl+S", "Alt+Tab", "Ctrl+Shift+Esc"
const SENDKEYS = { enter: "{ENTER}", return: "{ENTER}", tab: "{TAB}", esc: "{ESC}", escape: "{ESC}", backspace: "{BACKSPACE}", delete: "{DELETE}", del: "{DELETE}", up: "{UP}", down: "{DOWN}", left: "{LEFT}", right: "{RIGHT}", arrowup: "{UP}", arrowdown: "{DOWN}", arrowleft: "{LEFT}", arrowright: "{RIGHT}", home: "{HOME}", end: "{END}", pageup: "{PGUP}", pagedown: "{PGDN}", space: " ", f1: "{F1}", f2: "{F2}", f3: "{F3}", f4: "{F4}", f5: "{F5}", f6: "{F6}", f7: "{F7}", f8: "{F8}", f9: "{F9}", f10: "{F10}", f11: "{F11}", f12: "{F12}", insert: "{INSERT}" };
const MODS = { ctrl: "^", control: "^", alt: "%", shift: "+" };
const literal = (text) => String(text).replace(/[+^%~(){}[\]]/g, (c) => `{${c}}`);
const psString = (s) => `'${String(s).replace(/'/g, "''")}'`;

function keyCombo(combo) {
  const parts = String(combo || "Enter").split("+").map((p) => p.trim()).filter(Boolean);
  const win = parts.some((p) => /^(win|windows|meta|cmd)$/i.test(p));
  let mods = "";
  let key = "";
  for (const p of parts) {
    const low = p.toLowerCase();
    if (MODS[low]) mods += MODS[low];
    else if (!/^(win|windows|meta|cmd)$/i.test(p)) key = SENDKEYS[low] || (p.length === 1 ? literal(p.toLowerCase()) : `{${p.toUpperCase()}}`);
  }
  return { win, keys: mods + (key || "") };
}

const pos = (x, y) => ({ px: Math.round(Number(x) * scale), py: Math.round(Number(y) * scale) });

async function act(a = {}) {
  const action = String(a.action || "screenshot");
  if (!["screenshot", "click", "double_click", "right_click", "move", "type", "key", "scroll", "wait"].includes(action)) throw new Error(`unknown action "${action}"`);
  let did = "";
  if (["click", "double_click", "right_click", "move", "scroll"].includes(action) && (a.x === undefined || a.y === undefined) && action !== "scroll") throw new Error(`${action} needs x and y (in the screenshot's pixels)`);
  if (action === "click" || action === "double_click" || action === "right_click" || action === "move") {
    const { px, py } = pos(a.x, a.y);
    const down = action === "right_click" ? "0x0008" : "0x0002";
    const up = action === "right_click" ? "0x0010" : "0x0004";
    const one = `[CgInput]::mouse_event(${down},0,0,0,[UIntPtr]::Zero); [CgInput]::mouse_event(${up},0,0,0,[UIntPtr]::Zero)`;
    await run(`[CgInput]::SetCursorPos(${px},${py}) | Out-Null; Start-Sleep -Milliseconds 60; ${action === "move" ? "" : action === "double_click" ? `${one}; Start-Sleep -Milliseconds 70; ${one}` : one}`);
    did = `${action === "move" ? "Moved the mouse to" : action === "double_click" ? "Double-clicked at" : action === "right_click" ? "Right-clicked at" : "Clicked at"} ${a.x}, ${a.y}`;
  } else if (action === "type") {
    const text = String(a.text ?? "");
    if (!text) throw new Error("type needs text");
    await run(`[System.Windows.Forms.SendKeys]::SendWait(${psString(literal(text).replace(/\r?\n/g, "{ENTER}"))})`, 60000);
    did = `Typed ${text.length} characters`;
  } else if (action === "key") {
    const { win, keys } = keyCombo(a.key);
    if (win) await run(`[CgInput]::keybd_event(0x5B,0,0,[UIntPtr]::Zero); ${keys ? `[System.Windows.Forms.SendKeys]::SendWait(${psString(keys)});` : ""} [CgInput]::keybd_event(0x5B,0,2,[UIntPtr]::Zero)`);
    else await run(`[System.Windows.Forms.SendKeys]::SendWait(${psString(keys)})`);
    did = `Pressed ${a.key || "Enter"}`;
  } else if (action === "scroll") {
    if (a.x !== undefined && a.y !== undefined) { const { px, py } = pos(a.x, a.y); await run(`[CgInput]::SetCursorPos(${px},${py}) | Out-Null`); }
    const notches = Math.max(-30, Math.min(30, Math.round(-(Number(a.dy) || 600) / 120)));
    await run(`[CgInput]::mouse_event(0x0800,0,0,${notches * 120},[UIntPtr]::Zero)`);
    did = `Scrolled ${notches < 0 ? "down" : "up"}`;
  } else if (action === "wait") {
    await new Promise((r) => setTimeout(r, Math.min(10, Math.max(0.2, Number(a.seconds) || 1)) * 1000));
    did = "Waited";
  }
  if (action !== "screenshot") await new Promise((r) => setTimeout(r, 450)); // let the screen update
  const shot = await screenshot();
  return { text: `${did ? `${did}. ` : ""}Screen picture: ${shot.w}x${shot.h} pixels (the screen is ${shot.screenW}x${shot.screenH}); give x / y in this picture's pixels.`, image: shot.data };
}

module.exports = {
  act,
  stop() { try { ps?.kill(); } catch { /* already gone */ } ps = null; },
};
