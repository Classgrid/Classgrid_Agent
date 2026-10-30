// Runs INSIDE a user's Studio browser container (classgrid-ai-sandbox image) on the sandbox server, not on the API.
// The API uploads this file to /home/ubuntu/studio_branding/ and starts it with node. It runs one real Chromium
// (Playwright) with the user's own saved profile, and offers:
//   POST /act   {action, ...}  open, click, type, press, scroll, back, forward, reload, screenshot, read, tabs
//   GET  /health
//   WS   /live  the page as JPEG frames (Chrome's screencast) + nav events + the agent's pointer; takes the viewer's
//               clicks, wheel, keys and its size (the page follows the size of the Browser tab)
import http from "http";
import fs from "fs";
import { createRequire } from "module";

const require = createRequire("/usr/lib/node_modules/");
const { chromium } = require("playwright");
const { WebSocketServer } = require("ws");

const PROFILE = process.env.STUDIO_PROFILE || "/home/agent/studio/profile";
const MAX_TEXT = 20000;
let view = { width: 1280, height: 800 };

const context = await chromium.launchPersistentContext(PROFILE, {
  headless: true,
  viewport: view,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
});
let page = context.pages()[0] || (await context.newPage());
// The last page the user was on stays open: after a restart the browser opens it again
const LAST = `${PROFILE}/../last-url`;
const lastUrl = (() => { try { return fs.readFileSync(LAST, "utf8").trim(); } catch { return ""; } })();
if (/^https?:\/\//.test(lastUrl)) await page.goto(lastUrl, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
const watchers = new Set();
let pointer = null; // where the agent last pointed: { x, y }

const send = (ws, msg) => { try { if (ws.readyState === 1) ws.send(JSON.stringify(msg)); } catch { /* gone */ } };
const navInfo = async () => ({ type: "nav", url: page.url(), title: await page.title().catch(() => ""), canGoBack: true });
const broadcast = async (msg) => { for (const ws of watchers) send(ws, msg); };
const shot = async () => (await page.screenshot({ type: "jpeg", quality: 70 })).toString("base64");
const frameNow = async (ws) => { const data = await shot().catch(() => null); if (data) send(ws, { type: "frame", data, w: view.width, h: view.height }); };

// A new tab (a link with target=_blank, a popup) becomes the page everyone sees, at the same size
context.on("page", async (p) => { page = p; await p.setViewportSize(view).catch(() => {}); await restartScreencasts(); broadcast(await navInfo()); });

function wire(p) {
  p.on("framenavigated", async (f) => {
    if (f !== p.mainFrame() || p !== page) return;
    if (/^https?:\/\//.test(p.url())) fs.writeFile(LAST, p.url(), () => {});
    broadcast(await navInfo());
  });
}
wire(page);
context.on("page", wire);

// Each viewer gets its own screencast of the active page
const casts = new Map(); // ws -> { cdp, page }
async function startCast(ws) {
  const cdp = await context.newCDPSession(page);
  casts.set(ws, { cdp, page });
  cdp.on("Page.screencastFrame", ({ data, sessionId, metadata }) => {
    // A slow connection skips frames instead of piling them up (the next frame shows the page as it is now)
    if (ws.bufferedAmount < 256 * 1024) send(ws, { type: "frame", data, w: metadata.deviceWidth, h: metadata.deviceHeight });
    cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 50, maxWidth: view.width, maxHeight: view.height, everyNthFrame: 1 });
}
async function stopCast(ws) {
  const c = casts.get(ws);
  casts.delete(ws);
  if (c) { await c.cdp.send("Page.stopScreencast").catch(() => {}); await c.cdp.detach().catch(() => {}); }
}
async function restartScreencasts() {
  for (const ws of [...casts.keys()]) { await stopCast(ws); await startCast(ws).catch(() => {}); }
}

// The page takes the size of the viewer's Browser tab (within sensible limits)
let resizing = Promise.resolve();
function resize(w, h) {
  const next = { width: Math.round(Math.min(1920, Math.max(640, Number(w) || 0))), height: Math.round(Math.min(1400, Math.max(400, Number(h) || 0))) };
  if (next.width === view.width && next.height === view.height) return resizing;
  view = next;
  resizing = resizing.then(async () => {
    await page.setViewportSize(view).catch(() => {});
    await restartScreencasts();
    for (const ws of watchers) await frameNow(ws);
  });
  return resizing;
}

const norm = (u) => (/^[a-z][a-z0-9+.-]*:/i.test(u) ? u : /\s/.test(u) || !/\./.test(u) ? `https://www.google.com/search?q=${encodeURIComponent(u)}` : `https://${u}`);

// The agent's pointer, shown to the viewers: where it clicks, scrolls and types
const point = (kind, extra = {}) => broadcast({ type: "pointer", kind, x: pointer?.x ?? null, y: pointer?.y ?? null, at: Date.now(), ...extra });

async function act(a, byAgent = false) {
  await resizing;
  switch (a.action) {
    case "open":
      if (byAgent) point("open", { url: String(a.url || "") });
      await page.goto(norm(String(a.url || "")), { waitUntil: "domcontentloaded", timeout: 45000 });
      break;
    case "click": {
      const x = Number(a.x), y = Number(a.y);
      if (byAgent) {
        pointer = { x, y };
        point("move");
        await page.mouse.move(x, y, { steps: 6 });
        point("click");
      }
      await page.mouse.click(x, y, { clickCount: a.double ? 2 : 1 });
      break;
    }
    case "type":
      if (byAgent) point("type", { text: String(a.text ?? "").length });
      await page.keyboard.type(String(a.text ?? ""), { delay: 15 });
      if (a.submit) await page.keyboard.press("Enter");
      break;
    case "press":
      if (byAgent) point("key", { key: String(a.key || "Enter") });
      await page.keyboard.press(String(a.key || "Enter"));
      break;
    case "scroll":
      if (byAgent) point("scroll", { dy: Number(a.dy ?? 600) });
      await page.mouse.wheel(0, Number(a.dy ?? 600));
      break;
    case "back": await page.goBack({ timeout: 20000 }).catch(() => null); break;
    case "forward": await page.goForward({ timeout: 20000 }).catch(() => null); break;
    case "reload": await page.reload({ timeout: 30000 }); break;
    case "screenshot":
      if (byAgent) point("shot");
      break;
    case "read": case "tabs": break;
    default: throw new Error(`Unknown action: ${a.action}`);
  }
  if (["open", "click", "press", "back", "forward", "reload"].includes(a.action)) {
    await page.waitForLoadState("domcontentloaded", { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(600);
  }
  if (a.action === "scroll") await page.waitForTimeout(300);
  const out = { ok: true, url: page.url(), title: await page.title().catch(() => ""), w: view.width, h: view.height };
  if (a.action === "read") {
    out.text = (await page.evaluate(() => document.body?.innerText || "").catch(() => "")).slice(0, MAX_TEXT);
    out.links = await page.evaluate(() => [...document.querySelectorAll("a[href]")].slice(0, 80).map((l) => ({ text: (l.innerText || "").trim().slice(0, 80), href: l.href }))).catch(() => []);
  }
  if (a.action === "tabs") out.tabs = context.pages().map((p, i) => ({ i, url: p.url(), active: p === page }));
  if (a.screenshot !== false && a.action !== "tabs") out.screenshot = await shot().catch(() => null);
  // The viewers see the same picture the agent got, even when the screencast has no new frame
  if (byAgent) {
    const data = out.screenshot || (a.action === "read" ? null : await shot().catch(() => null));
    if (data) broadcast({ type: "frame", data, w: view.width, h: view.height });
  }
  return out;
}

const server = http.createServer(async (req, res) => {
  if (req.url === "/health") { res.end(JSON.stringify({ ok: true, url: page.url() })); return; }
  if (req.url === "/act" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on("end", async () => {
      res.setHeader("Content-Type", "application/json");
      try { res.end(JSON.stringify(await act(JSON.parse(body || "{}"), true))); }
      catch (e) { res.end(JSON.stringify({ ok: false, error: String(e.message || e).slice(0, 500), url: page.url() })); }
    });
    return;
  }
  res.statusCode = 404; res.end("{}");
});

// The viewer's own clicks, wheel and keys go to the page (page pixels)
const wss = new WebSocketServer({ server, path: "/live" });
wss.on("connection", async (ws) => {
  watchers.add(ws);
  send(ws, await navInfo());
  await startCast(ws).catch(() => {});
  await frameNow(ws); // a still page sends no screencast frames, so the viewer gets one picture right away
  ws.on("message", async (raw) => {
    let m; try { m = JSON.parse(String(raw)); } catch { return; }
    try {
      if (m.type === "viewport") await resize(m.w, m.h);
      else if (m.type === "click") await page.mouse.click(m.x, m.y);
      else if (m.type === "move") await page.mouse.move(m.x, m.y);
      else if (m.type === "wheel") await page.mouse.wheel(0, m.dy || 0);
      else if (m.type === "key") await page.keyboard.press(m.key);
      else if (m.type === "text") await page.keyboard.type(String(m.text || ""));
      else if (m.type === "act") send(ws, { type: "acted", result: await act({ ...m.act, screenshot: false }) });
    } catch (e) { send(ws, { type: "error", error: String(e.message || e).slice(0, 300) }); }
  });
  ws.on("close", () => { watchers.delete(ws); stopCast(ws); });
});

server.listen(3000, "0.0.0.0", () => console.log("studio browser ready"));
