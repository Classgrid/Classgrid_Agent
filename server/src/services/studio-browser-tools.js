// Studio Mode's browser tools for the two agents: the Planner (the main AI) keeps the plan in a shared scratchpad and
// sends a Browser worker (a helper on Claude Sonnet 5.5 or DeepSeek V4.1 Flash) that drives the user's live browser.
// Every browser step returns a screenshot, so the model sees what happened.
import crypto from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import redis from "../config/redis.js";
import { awsS3Client } from "../config/awsS3Client.js";
import { browserAct, ensureBrowser } from "./studio-browser.service.js";
import { chatServerAddress } from "./ide-project.service.js";

const fn = (name, description, properties = {}, required = []) => ({ type: "function", function: { name, description, parameters: { type: "object", properties, required } } });

const SCRATCHPAD = [
  fn("scratchpad_read", "Read the shared scratchpad of this chat: the Planner's plan, the steps done, what was found. The Planner and the Browser worker both use it."),
  fn("scratchpad_write", "Write to the shared scratchpad of this chat. Keep it short and current: the goal, the plan as numbered steps, what is done, what was found (with links), what is next.", {
    content: { type: "string", description: "The text to write." },
    mode: { type: "string", enum: ["replace", "append"], description: "replace (default) = the whole scratchpad becomes this text; append = add it at the end." },
  }, ["content"]),
];

const LOOK = [
  fn("browser_screenshot", "Take a screenshot of the user's live browser (the page you and the user see in the Studio Browser tab). The image is returned to you."),
  fn("browser_read", "Read the text of the current page and its links (up to 20,000 characters). It first scrolls through the page so content that loads late is included. Use it to find facts and links instead of guessing from a screenshot."),
];

// The page's own errors (console) and failed web requests (network), for finding why a page or web app breaks
LOOK.push(fn("browser_logs", "See the current page's errors and warnings (its console) and the web requests that failed (status 400 and up, or no answer), like a browser's developer tools. Use it when a page or the user's web app doesn't work, to find out why. Only in the desktop app's browser."));

const ACT = [
  fn("browser_open", "Open a website in the user's live browser. A plain search phrase opens a Google search. A dev server you started with start_background_command in this chat opens at http://localhost:<port> (it must listen on 0.0.0.0). Returns a screenshot.", {
    url: { type: "string", description: "A link (example.com or https://...) or words to search for." },
  }, ["url"]),
  fn("browser_click", "Click at a point on the page, in screenshot pixels (the page size is given with each screenshot). Returns a screenshot.", {
    x: { type: "number" }, y: { type: "number" }, double: { type: "boolean", description: "true = double-click." },
  }, ["x", "y"]),
  fn("browser_select", "Choose a choice in a dropdown by its text: a normal select box or a list the page draws itself (like Firebase's, Google's or Material dropdowns). Use it for every dropdown instead of clicking its list: clicking a list often picks the wrong line. Say which dropdown with field (its label, e.g. \"Country\") or x and y on it (screenshot pixels); with only one dropdown on the page neither is needed. Without option it tells you the dropdown's choices. Returns a screenshot.", {
    option: { type: "string", description: "The text of the choice, e.g. \"India\" or \"Node.js 20\"." },
    field: { type: "string", description: "The dropdown's label or name on the page." },
    x: { type: "number" }, y: { type: "number" },
  }),
  fn("browser_type", "Type text where the cursor is (click the input first). Returns a screenshot.", {
    text: { type: "string" }, submit: { type: "boolean", description: "true = press Enter after typing." },
  }, ["text"]),
  fn("browser_press", "Press one key, e.g. Enter, Tab, Escape, ArrowDown, Backspace, Control+A. Returns a screenshot.", {
    key: { type: "string" },
  }, ["key"]),
  fn("browser_scroll", "Scroll the page. Positive = down, negative = up (pixels, e.g. 600). Returns a screenshot.", {
    dy: { type: "number" },
  }, ["dy"]),
  fn("browser_back", "Go back one page. Returns a screenshot."),
  fn("browser_wait", "Wait for a slow page to finish loading (1 to 10 seconds), then take a screenshot.", {
    seconds: { type: "number", description: "How long to wait, 1 to 10 (default 2)." },
  }),
  fn("browser_run_js", "Run your own JavaScript in the current page, like the browser's developer console, and get back what it returns. Write it as the body of an async function: use return to send a value back (objects come back as JSON) and await works. Use it to read exact data (tables, lists, prices, attributes, form values, element positions) or for something clicks can't do well. The page and the user's sign-ins are real: never use it to send, buy, post, delete, change settings or read passwords and cookies. Returns text, no screenshot (take one with browser_screenshot when you need it).", {
    code: { type: "string", description: "The JavaScript, e.g. return [...document.querySelectorAll('table tr')].map((r) => r.innerText);" },
  }, ["code"]),
];

// The Planner (main AI in Studio): plans, keeps the scratchpad and sends the worker for long jobs; it has the full
// browser too, so it never has to say it can't open a page
export const PLANNER_BROWSER_TOOLS = [...SCRATCHPAD, ...LOOK, ...ACT];
// The Browser worker (a helper started with browser: true)
export const WORKER_BROWSER_TOOLS = [...SCRATCHPAD, ...LOOK, ...ACT];
// A main AI that can't see images: the scratchpad and the page's text; the Browser worker does the clicking
export const PLANNER_BLIND_TOOLS = [...SCRATCHPAD, LOOK.find((x) => x.function.name === "browser_read")];
export const BROWSER_TOOL_NAMES = new Set(WORKER_BROWSER_TOOLS.map((t) => t.function.name));

const memoryPads = new Map(); // when Redis is not there (local runs)
const PAD = (sessionId) => `studio:scratchpad:${sessionId}`;
async function readPad(sessionId) {
  const v = await redis.get(PAD(sessionId)).catch(() => null);
  return v ?? memoryPads.get(sessionId) ?? "";
}
async function writePad(sessionId, text) {
  memoryPads.set(sessionId, text);
  await redis.set(PAD(sessionId), text, "EX", 7 * 24 * 60 * 60).catch(() => {});
}

const ACTIONS = {
  browser_open: (a) => ({ action: "open", url: String(a?.url || "") }),
  browser_click: (a) => ({ action: "click", x: Number(a?.x), y: Number(a?.y), double: !!a?.double }),
  browser_select: (a) => ({ action: "select", option: String(a?.option ?? ""), field: String(a?.field ?? ""),
    ...(a?.x != null && a?.y != null && Number.isFinite(Number(a.x)) && Number.isFinite(Number(a.y)) ? { x: Number(a.x), y: Number(a.y) } : {}) }),
  browser_type: (a) => ({ action: "type", text: String(a?.text ?? ""), submit: !!a?.submit }),
  browser_press: (a) => ({ action: "press", key: String(a?.key || "Enter") }),
  browser_scroll: (a) => ({ action: "scroll", dy: Number(a?.dy ?? 600) }),
  browser_back: () => ({ action: "back" }),
  browser_wait: (a) => ({ action: "wait", seconds: Number(a?.seconds ?? 2) }),
  browser_screenshot: () => ({ action: "screenshot" }),
  browser_read: () => ({ action: "read", screenshot: false }),
  browser_run_js: (a) => ({ action: "js", code: String(a?.code ?? ""), screenshot: false }),
  browser_logs: () => ({ action: "logs", screenshot: false }),
};

// Every screenshot an agent takes is saved (the CDN, a random link) and listed for the chat's Screenshots tab
const SHOTS = (userId, sessionId) => `studio:shots:${userId}:${sessionId}`;
export async function saveShot({ userId, sessionId, base64, url, title, tool }) {
  const key = `studio-shots/${userId}/${crypto.randomUUID()}.jpg`;
  await awsS3Client.send(new PutObjectCommand({
    Bucket: process.env.AWS_S3_ERP_BUCKET_NAME || "erp-classgrid",
    Key: key,
    Body: Buffer.from(base64, "base64"),
    ContentType: "image/jpeg",
  }));
  const shot = { url: `${process.env.AWS_CLOUDFRONT_ERP_DOMAIN || "https://cdn.classgrid.in"}/${key}`, page: url, title, tool, at: Date.now() };
  const list = SHOTS(userId, sessionId);
  await redis.lpush(list, JSON.stringify(shot)).catch(() => {});
  await redis.ltrim(list, 0, 199).catch(() => {});
  await redis.expire(list, 30 * 24 * 60 * 60).catch(() => {});
  import("./socket.service.js").then((m) => m.getIO().to(String(userId)).emit("studio:shot", { sessionId, ...shot })).catch(() => {});
  return shot;
}

// GET /api/ai/studio/shots/:sessionId: the screenshots of one of the user's chats, newest first
export async function listStudioShots(req, res) {
  const userId = String(req.user?._id || req.user?.id || "");
  const sessionId = String(req.params.sessionId || "").slice(0, 100);
  if (!userId || !sessionId) return res.status(400).json({ shots: [] });
  const rows = await redis.lrange(SHOTS(userId, sessionId), 0, 199).catch(() => []);
  res.json({ shots: rows.map((r) => { try { return JSON.parse(r); } catch { return null; } }).filter(Boolean) });
}

// The Classgrid desktop app's own browser, on the user's computer (their internet, their localhost servers): the step
// goes through the app's local runner and comes back like the cloud browser's /act. null = the app isn't open there
// (or is an older version without a browser), so the cloud browser is used.
export async function desktopBrowserAct(userId, step) {
  const { callRunner } = await import("./local-runner.service.js");
  const reply = await callRunner(userId, "browser", step);
  if (!reply) return null;
  if (reply.browser && typeof reply.browser === "object") return reply.browser;
  if (/can't run on this computer/.test(String(reply.text))) return null;
  return { ok: false, error: String(reply.text || "The desktop app's browser gave no answer").replace(/^Error: /, "") };
}

// Handlers for the browser and scratchpad tools of one chat (results: text, or { text, images } with the screenshot).
// desktop: the chat is in the Classgrid desktop app, so the browser runs there when the app's runner is connected.
export function makeBrowserHandlers({ userId, sessionId, desktop = false }) {
  const handlers = {
    scratchpad_read: async () => (await readPad(sessionId)) || "The scratchpad is empty.",
    scratchpad_write: async (a) => {
      const text = String(a?.content ?? "");
      const next = a?.mode === "append" ? `${await readPad(sessionId)}\n${text}`.trim() : text;
      await writePad(sessionId, next.slice(0, 20000));
      // The plan is written: start the user's browser now, in the background, so it is ready when the worker opens a page
      if (userId && !desktop) ensureBrowser(userId).catch(() => {});
      return "Saved to the scratchpad.";
    },
  };
  for (const [name, toStep] of Object.entries(ACTIONS)) {
    handlers[name] = async (a) => {
      if (!userId) return "Error: the browser needs a signed-in user.";
      try {
        const step = toStep(a);
        const chat = sessionId && sessionId !== "none" ? { chat: sessionId } : {};
        // In the desktop app the browser runs on the user's computer, so localhost is their own computer
        let r = desktop ? await desktopBrowserAct(userId, { ...step, ...chat }) : null;
        if (!r) {
          // localhost = this chat's dev server (it runs in its own container, reached on the user's private network)
          if (name === "browser_open" && /^(https?:\/\/)?(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/|$)/i.test(step.url.trim())) {
            const ip = await chatServerAddress(userId, sessionId).catch(() => null);
            if (!ip) return "Error: no server is running in this chat. Start it with start_background_command (listening on 0.0.0.0), then open http://localhost:<port>.";
            step.url = step.url.trim().replace(/^(https?:\/\/)?(localhost|127\.0\.0\.1|0\.0\.0\.0)/i, `http://${ip}`);
          }
          r = await browserAct(userId, { ...step, ...chat });
        }
        if (!r?.ok) {
          // A Classgrid app from before the dropdown step
          if (name === "browser_select" && /Unknown action/.test(String(r?.error))) return "Error: this Classgrid app is too old to choose in dropdowns. Click the dropdown, then its choice, and tell the user to update the Classgrid app.";
          // A Classgrid app from before running code in the page
          if (name === "browser_run_js" && /Unknown action/.test(String(r?.error))) return "Error: this Classgrid app is too old to run code in the page. Use browser_read and screenshots instead, and tell the user to update the Classgrid app.";
          return `Error: ${r?.error || "the browser step failed"}${r?.url ? ` (page: ${r.url})` : ""}`;
        }
        const head = `Page: ${r.title || "(no title)"} — ${r.url}${r.w ? `\nPage size: ${r.w}x${r.h} pixels` : ""}${r.note ? `\n${r.note}` : ""}`;
        if (name === "browser_logs") {
          if (!r.logs) return `${head}\n\nThis browser can't show the page's errors (only the desktop app's browser can).`;
          const ago = (t) => `${Math.max(0, Math.round((Date.now() - t) / 1000))}s ago`;
          const cons = r.logs.console.map((c) => `- ${c.level}: ${c.message}${c.source ? ` (${c.source})` : ""} · ${ago(c.at)}`).join("\n");
          const net = r.logs.network.map((n) => `- ${n.status ? n.status : n.error} ${n.method} ${n.url} (${n.type}) · ${ago(n.at)}`).join("\n");
          return `${head}\n\nConsole errors and warnings since this page opened:\n${cons || "(none)"}\n\nFailed web requests:\n${net || "(none)"}`;
        }
        if (name === "browser_run_js") return `${head}\n\nThe code returned:\n${r.result ?? "(nothing returned)"}`;
        if (name === "browser_read") {
          const links = (r.links || []).filter((l) => l.text).slice(0, 60).map((l) => `- ${l.text}: ${l.href}`).join("\n");
          return `${head}\n\n${r.text || "(no text)"}${links ? `\n\nLinks:\n${links}` : ""}`;
        }
        if (!r.screenshot) return head;
        const saved = sessionId && sessionId !== "none"
          ? await saveShot({ userId, sessionId, base64: r.screenshot, url: r.url, title: r.title, tool: name }).catch(() => null)
          : null;
        const link = saved ? `\nScreenshot link: ${saved.url} (saved in the Screenshots tab; to show it to the user, put it in your answer as ![short description](${saved.url}))` : "";
        return { text: `${head}\nThe screenshot of the page is attached. Look at it before your next step.${link}`, images: [{ data: r.screenshot }] };
      } catch (e) {
        return `Error: ${e.message}`;
      }
    };
  }
  return handlers;
}

export const BROWSER_WORKER_SYSTEM = `You are the Browser worker in Classgrid Studio. You drive the user's real web browser to do the task the Planner (the main AI) gave you, while the user watches it live.
- Start by reading the scratchpad (scratchpad_read): it has the Planner's plan. Follow it.
- Work step by step: open a page, look at the screenshot, then click (screenshot pixels; the page size is given with each screenshot), type, press keys or scroll. Every step returns a new screenshot: check it before the next step.
- Look at the screenshots closely, not only the text: the design and UI/UX (layout, colours, fonts, spacing, images, buttons, how clear and easy the page is to use, anything broken or out of place). Report what you see in the design too.
- Use browser_read to get exact text and links instead of guessing from the picture.
- For a dropdown, use browser_select with the choice's text (and the dropdown's label as field) instead of clicking its list.
- To get exact data from a page (a table, a list, prices, values) or do what clicks can't, use browser_run_js with a short script that returns it. Never use it to send, buy, post, delete or read passwords and cookies.
- Write what you find and what is done to the scratchpad (scratchpad_write, mode append), with links.
- Never type a password, card number or one-time code, and never pay, buy, send, post or delete anything: stop and tell the Planner (tell_main) that the user needs to do that step in the browser.
- If a page blocks you (a captcha, a login wall), stop and say so; do not try to get around it.
- End with a short report: what you did, what you found (with links), what the design looks like and anything left to do. Include the screenshot links that show what you found.`;
