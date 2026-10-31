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

// A normal Chrome to websites: without the "run by a program" switch, and with Chrome's usual name instead of
// "HeadlessChrome" (sites block browsers that say they are automated)
const launchOpts = {
  headless: true,
  viewport: view,
  locale: "en-IN",
  ignoreDefaultArgs: ["--enable-automation"],
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--disable-blink-features=AutomationControlled"],
};
// The full Chromium (its newer headless mode) is used when it is there: unlike the small headless build, it doesn't
// call itself "HeadlessChrome" in its brand list either
let context = await chromium.launchPersistentContext(PROFILE, { ...launchOpts, channel: "chromium" })
  .catch(() => chromium.launchPersistentContext(PROFILE, launchOpts));
const firstUa = await (context.pages()[0] || (await context.newPage())).evaluate(() => navigator.userAgent).catch(() => "");
if (/HeadlessChrome/.test(firstUa)) {
  await context.close();
  context = await chromium.launchPersistentContext(PROFILE, { ...launchOpts, userAgent: firstUa.replace(/HeadlessChrome/g, "Chrome") });
}
// Chrome also sends its brand list to websites (and pages can read it): it says "Chrome" there too, on every tab
const NORMAL_UA = firstUa.replace(/HeadlessChrome/g, "Chrome");
const major = (NORMAL_UA.match(/Chrome\/(\d+)/) || [])[1] || "153";
const uaOverride = {
  userAgent: NORMAL_UA,
  acceptLanguage: "en-IN,en;q=0.9",
  platform: "Linux x86_64",
  userAgentMetadata: {
    brands: [{ brand: "Chromium", version: major }, { brand: "Google Chrome", version: major }, { brand: "Not_A Brand", version: "8" }],
    fullVersion: `${major}.0.0.0`, platform: "Linux", platformVersion: "", architecture: "x86", model: "", mobile: false,
  },
};
const uaSessions = new WeakMap(); // page -> its CDP session (the override lasts while it stays open)
async function normalChrome(p) {
  if (!NORMAL_UA || uaSessions.has(p)) return;
  try {
    const cdp = await context.newCDPSession(p);
    uaSessions.set(p, cdp);
    await cdp.send("Network.setUserAgentOverride", uaOverride);
  } catch { /* the tab closed */ }
}
let page = context.pages()[0] || (await context.newPage());
await normalChrome(page);
// Each chat has its own page: back in a chat, its last page opens again (also after a restart); a new chat starts
// with an empty browser. The logins (the profile) are shared.
const CHAT_URLS = `${PROFILE}/../chat-urls.json`;
let chatUrls = (() => { try { return JSON.parse(fs.readFileSync(CHAT_URLS, "utf8")) || {}; } catch { return {}; } })();
let currentChat; // undefined = not known yet, null = a new chat (no id yet), or the chat's id
const saveChatUrls = () => {
  const keys = Object.keys(chatUrls);
  if (keys.length > 300) for (const k of keys.slice(0, keys.length - 300)) delete chatUrls[k];
  fs.writeFile(CHAT_URLS, JSON.stringify(chatUrls), () => {});
};
const watchers = new Set();
let pointer = null; // where the agent last pointed: { x, y }

const send = (ws, msg) => { try { if (ws.readyState === 1) ws.send(JSON.stringify(msg)); } catch { /* gone */ } };
const navInfo = async () => ({ type: "nav", url: page.url(), title: await page.title().catch(() => ""), canGoBack: true });
const broadcast = async (msg) => { for (const ws of watchers) send(ws, msg); };
const shot = async () => (await page.screenshot({ type: "jpeg", quality: 70 })).toString("base64");
const frameNow = async (ws) => { const data = await shot().catch(() => null); if (data) send(ws, { type: "frame", data, w: view.width, h: view.height }); };

// A new tab (a link with target=_blank, a popup) becomes the page everyone sees, at the same size. Only it and the
// tab before it stay open, so old tabs don't pile up.
context.on("page", async (p) => {
  const before = page;
  page = p;
  await normalChrome(p);
  await p.setViewportSize(view).catch(() => {});
  for (const x of context.pages()) if (x !== p && x !== before) await x.close().catch(() => {});
  await restartScreencasts();
  broadcast(await navInfo());
});

function wire(p) {
  p.on("framenavigated", async (f) => {
    if (f !== p.mainFrame() || p !== page) return;
    if (currentChat && /^https?:\/\//.test(p.url())) { chatUrls[currentChat] = p.url(); saveChatUrls(); }
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
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 40, maxWidth: Math.min(view.width, 1280), maxHeight: Math.min(view.height, 1280), everyNthFrame: 2 });
}
async function stopCast(ws) {
  const c = casts.get(ws);
  casts.delete(ws);
  if (c) { await c.cdp.send("Page.stopScreencast").catch(() => {}); await c.cdp.detach().catch(() => {}); }
}
async function restartScreencasts() {
  for (const ws of [...casts.keys()]) { await stopCast(ws); await startCast(ws).catch(() => {}); }
}

// The page follows the shape of the viewer's Browser tab, but is always at least desktop width (1280px): a narrow
// tab shows the desktop page shrunk to fit, so websites never switch to their mobile layout
let resizing = Promise.resolve();
const DESKTOP_WIDTH = 1280;
function resize(w, h) {
  let W = Number(w) || 0;
  let H = Number(h) || 0;
  if (W > 0 && W < DESKTOP_WIDTH) { H = (H * DESKTOP_WIDTH) / W; W = DESKTOP_WIDTH; }
  const next = { width: Math.round(Math.min(1920, Math.max(DESKTOP_WIDTH, W))), height: Math.round(Math.min(1400, Math.max(600, H))) };
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

// The browser follows the chat: its own last page, or an empty page for a new chat
async function useChat(id) {
  id = id ? String(id).slice(0, 100) : null;
  if (id === currentChat) return;
  if (currentChat === null && id) { // the new chat just got its id: it keeps its page
    currentChat = id;
    if (/^https?:\/\//.test(page.url())) { chatUrls[id] = page.url(); saveChatUrls(); }
    return;
  }
  currentChat = id;
  pointer = null;
  for (const x of context.pages()) if (x !== page) await x.close().catch(() => {}); // the old chat's extra tabs close
  await page.goto((id && chatUrls[id]) || "about:blank", { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
  broadcast(await navInfo());
  for (const ws of watchers) await frameNow(ws);
}

async function act(a, byAgent = false) {
  await resizing;
  if (byAgent && a.chat) await useChat(a.chat);
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
      if (byAgent && !a.full) point("shot");
      break;
    case "read":
      // Pages that load their content late (as you scroll): go down the page step by step, then back to the top
      await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});
      await page.evaluate(async () => {
        const step = Math.max(400, Math.round(window.innerHeight * 0.9));
        const start = window.scrollY;
        for (let y = 0, n = 0; y < document.body.scrollHeight && n < 40; y += step, n++) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 150));
        }
        window.scrollTo(0, start);
      }).catch(() => {});
      await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
      break;
    case "wait":
      await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(Math.min(10000, Math.max(500, Number(a.seconds || 2) * 1000)));
      break;
    case "tabs": break;
    default: throw new Error(`Unknown action: ${a.action}`);
  }
  // Wait for the page to settle before the picture: a new page until its files finished loading, and about a second
  // after a click or scroll, so entrance animations (that start invisible) are done in the screenshot
  if (["open", "back", "forward", "reload"].includes(a.action)) {
    await page.waitForLoadState("domcontentloaded", { timeout: 8000 }).catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(800);
  } else if (["click", "press"].includes(a.action)) {
    await page.waitForLoadState("domcontentloaded", { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(900);
  }
  if (a.action === "scroll") await page.waitForTimeout(1000);
  const out = { ok: true, url: page.url(), title: await page.title().catch(() => ""), w: view.width, h: view.height };
  if (a.action === "read") {
    out.text = (await page.evaluate(() => document.body?.innerText || "").catch(() => "")).slice(0, MAX_TEXT);
    out.links = await page.evaluate(() => [...document.querySelectorAll("a[href]")].slice(0, 80).map((l) => ({ text: (l.innerText || "").trim().slice(0, 80), href: l.href }))).catch(() => []);
  }
  if (a.action === "tabs") out.tabs = context.pages().map((p, i) => ({ i, url: p.url(), active: p === page }));
  // full: one tall picture of the whole page, top to bottom (the user's "Full page" button)
  if (a.full) out.screenshot = (await page.screenshot({ type: "jpeg", quality: 70, fullPage: true }).catch(() => null))?.toString("base64") || null;
  else if (a.screenshot !== false && a.action !== "tabs") out.screenshot = await shot().catch(() => null);
  // The viewers see the same picture the agent got, even when the screencast has no new frame
  if (byAgent && !a.full) {
    const data = out.screenshot || (a.action === "read" ? null : await shot().catch(() => null));
    if (data) broadcast({ type: "frame", step: true, data, w: view.width, h: view.height });
  }
  return out;
}

// One step at a time: a model that sends several steps at once (or the same one twice) can't mix them up, e.g. two
// "type" steps at the same moment would mix their letters. The same agent step sent twice at the same moment runs once.
let queue = Promise.resolve();
const inFlight = new Map();
function runAct(a, byAgent) {
  const key = byAgent ? JSON.stringify(a) : null;
  if (key && inFlight.has(key)) return inFlight.get(key);
  const job = queue.then(() => act(a, byAgent));
  queue = job.catch(() => {});
  if (key) { inFlight.set(key, job); job.catch(() => {}).finally(() => inFlight.delete(key)); }
  return job;
}

const server = http.createServer(async (req, res) => {
  if (req.url === "/health") { res.end(JSON.stringify({ ok: true, url: page.url() })); return; }
  if (req.url === "/act" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on("end", async () => {
      res.setHeader("Content-Type", "application/json");
      try { res.end(JSON.stringify(await runAct(JSON.parse(body || "{}"), true))); }
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
      else if (m.type === "chat") { const id = m.id; queue = queue.then(() => useChat(id)).catch(() => {}); }
      else if (m.type === "click") await page.mouse.click(m.x, m.y);
      else if (m.type === "move") await page.mouse.move(m.x, m.y);
      else if (m.type === "wheel") await page.mouse.wheel(0, m.dy || 0);
      else if (m.type === "key") await page.keyboard.press(m.key);
      else if (m.type === "text") await page.keyboard.type(String(m.text || ""));
      else if (m.type === "act") send(ws, { type: "acted", result: await runAct({ ...m.act, screenshot: false }, false) });
    } catch (e) { send(ws, { type: "error", error: String(e.message || e).slice(0, 300) }); }
  });
  ws.on("close", () => { watchers.delete(ws); stopCast(ws); });
});

server.listen(3000, "0.0.0.0", () => console.log("studio browser ready"));
