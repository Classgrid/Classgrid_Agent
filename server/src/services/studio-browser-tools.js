// Studio Mode's browser tools for the two agents: the Planner (the main AI) keeps the plan in a shared scratchpad and
// sends a Browser worker (a helper on Claude Sonnet 5.5 or DeepSeek V4.1 Flash) that drives the user's live browser.
// Every browser step returns a screenshot, so the model sees what happened.
import crypto from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import redis from "../config/redis.js";
import { awsS3Client } from "../config/awsS3Client.js";
import { browserAct, ensureBrowser } from "./studio-browser.service.js";

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
  fn("browser_read", "Read the text of the current page and its links (up to 20,000 characters). Use it to find facts and links instead of guessing from a screenshot."),
];

const ACT = [
  fn("browser_open", "Open a website in the user's live browser. A plain search phrase opens a Google search. Returns a screenshot.", {
    url: { type: "string", description: "A link (example.com or https://...) or words to search for." },
  }, ["url"]),
  fn("browser_click", "Click at a point on the page, in screenshot pixels (the page size is given with each screenshot). Returns a screenshot.", {
    x: { type: "number" }, y: { type: "number" }, double: { type: "boolean", description: "true = double-click." },
  }, ["x", "y"]),
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
  browser_type: (a) => ({ action: "type", text: String(a?.text ?? ""), submit: !!a?.submit }),
  browser_press: (a) => ({ action: "press", key: String(a?.key || "Enter") }),
  browser_scroll: (a) => ({ action: "scroll", dy: Number(a?.dy ?? 600) }),
  browser_back: () => ({ action: "back" }),
  browser_screenshot: () => ({ action: "screenshot" }),
  browser_read: () => ({ action: "read", screenshot: false }),
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

// Handlers for the browser and scratchpad tools of one chat (results: text, or { text, images } with the screenshot)
export function makeBrowserHandlers({ userId, sessionId }) {
  const handlers = {
    scratchpad_read: async () => (await readPad(sessionId)) || "The scratchpad is empty.",
    scratchpad_write: async (a) => {
      const text = String(a?.content ?? "");
      const next = a?.mode === "append" ? `${await readPad(sessionId)}\n${text}`.trim() : text;
      await writePad(sessionId, next.slice(0, 20000));
      // The plan is written: start the user's browser now, in the background, so it is ready when the worker opens a page
      if (userId) ensureBrowser(userId).catch(() => {});
      return "Saved to the scratchpad.";
    },
  };
  for (const [name, toStep] of Object.entries(ACTIONS)) {
    handlers[name] = async (a) => {
      if (!userId) return "Error: the browser needs a signed-in user.";
      try {
        const r = await browserAct(userId, { ...toStep(a), ...(sessionId && sessionId !== "none" ? { chat: sessionId } : {}) });
        if (!r?.ok) return `Error: ${r?.error || "the browser step failed"}${r?.url ? ` (page: ${r.url})` : ""}`;
        const head = `Page: ${r.title || "(no title)"} — ${r.url}${r.w ? `\nPage size: ${r.w}x${r.h} pixels` : ""}`;
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
- Write what you find and what is done to the scratchpad (scratchpad_write, mode append), with links.
- Never type a password, card number or one-time code, and never pay, buy, send, post or delete anything: stop and tell the Planner (tell_main) that the user needs to do that step in the browser.
- If a page blocks you (a captcha, a login wall), stop and say so; do not try to get around it.
- End with a short report: what you did, what you found (with links), what the design looks like and anything left to do. Include the screenshot links that show what you found.`;
