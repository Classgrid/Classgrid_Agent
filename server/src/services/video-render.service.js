/*
 * make_video: turns an animated HTML page into an MP4, the way Claude's own video export works.
 * The page runs in Chromium inside the AI sandbox with a fake clock: for every frame the clock is moved forward,
 * a screenshot is taken, and ffmpeg joins the screenshots into an H.264 MP4. Because time only moves when we say,
 * every frame is perfect even when one takes long to draw.
 * Works in its own folder on the sandbox host (never inside a user's project), removed afterwards.
 */
import os from "os";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { NodeSSH } from "node-ssh";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export const VIDEO_LIMITS = { maxSeconds: 120, maxFps: 60, maxSide: 1920 };

// Injected before the page's own scripts. Replaces the clock (performance.now, Date.now, requestAnimationFrame,
// timers) and pauses CSS / Web Animations so window.__cgSeek(ms) can put the page at any moment.
const CLOCK_JS = String.raw`(() => {
  let now = 0, lastSeek = 0;
  const startEpoch = Date.now();
  const RealDate = Date;
  performance.now = () => now;
  Date.now = () => startEpoch + now;
  window.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(startEpoch + now); } static now() { return startEpoch + now; } };
  let rafs = new Map(), rafId = 0;
  window.requestAnimationFrame = (cb) => { rafs.set(++rafId, cb); return rafId; };
  window.cancelAnimationFrame = (id) => { rafs.delete(id); };
  const timers = new Map(); let timerId = 0;
  window.setTimeout = (fn, ms = 0, ...a) => { const id = ++timerId; timers.set(id, { at: now + Math.max(0, +ms || 0), fn, a }); return id; };
  window.setInterval = (fn, ms = 0, ...a) => { const id = ++timerId; const every = Math.max(1, +ms || 0); timers.set(id, { at: now + every, fn, a, every }); return id; };
  window.clearTimeout = window.clearInterval = (id) => { timers.delete(id); };
  const born = new WeakMap();
  window.__cgSeek = (t) => {
    now = t;
    for (let guard = 0; guard < 10000; guard++) {
      let next = null;
      for (const [id, tm] of timers) if (tm.at <= now && (!next || tm.at < next[1].at)) next = [id, tm];
      if (!next) break;
      const [id, tm] = next;
      if (tm.every) tm.at += tm.every; else timers.delete(id);
      try { typeof tm.fn === "function" ? tm.fn(...tm.a) : (0, eval)(String(tm.fn)); } catch (e) { console.error(e); }
    }
    const due = rafs; rafs = new Map();
    for (const cb of due.values()) { try { cb(now); } catch (e) { console.error(e); } }
    for (const anim of document.getAnimations()) {
      if (!born.has(anim)) born.set(anim, lastSeek);
      try { anim.pause(); anim.currentTime = Math.max(0, now - born.get(anim)); } catch { }
    }
    lastSeek = now;
  };
})();`;

// Runs inside the sandbox container (Node + Playwright + ffmpeg are installed there).
const RENDER_JS = String.raw`const fs = require("fs");
const { spawn } = require("child_process");
const { chromium } = require("playwright");
const cfg = JSON.parse(fs.readFileSync("/work/config.json", "utf8"));
(async () => {
  const args = ["--no-sandbox", "--disable-dev-shm-usage", "--hide-scrollbars", "--force-color-profile=srgb"];
  let browser;
  try { browser = await chromium.launch({ args }); }
  catch (e) {
    const exe = ["/usr/bin/chromium", "/usr/bin/chromium-browser"].find((p) => fs.existsSync(p));
    if (!exe) throw e;
    browser = await chromium.launch({ executablePath: exe, args });
  }
  const page = await browser.newPage({ viewport: { width: cfg.width, height: cfg.height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message || e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("requestfailed", (r) => errors.push("Couldn't load " + r.url()));
  await page.addInitScript({ path: "/work/clock.js" });
  await page.goto("file:///work/index.html", { waitUntil: "networkidle", timeout: 60000 }).catch((e) => errors.push("Page load: " + e.message));
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  const total = Math.max(1, Math.round(cfg.seconds * cfg.fps));
  const checkFrames = new Map(cfg.checks.map((s, i) => [Math.min(total - 1, Math.round(s * cfg.fps)), i]));
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(cfg.fps), "-c:v", "mjpeg", "-i", "-",
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "/work/out.mp4"]);
  let ffErr = "";
  ff.stderr.on("data", (d) => { ffErr += d; });
  const ffDone = new Promise((r) => ff.on("close", r));
  for (let i = 0; i < total; i++) {
    await page.evaluate((t) => window.__cgSeek(t), (i * 1000) / cfg.fps);
    const shot = await page.screenshot({ type: "jpeg", quality: 92 });
    if (checkFrames.has(i)) fs.writeFileSync("/work/check_" + checkFrames.get(i) + ".jpg", shot);
    if (!ff.stdin.write(shot)) await new Promise((r) => ff.stdin.once("drain", r));
  }
  ff.stdin.end();
  const code = await ffDone;
  await browser.close();
  fs.writeFileSync("/work/result.json", JSON.stringify({ ok: code === 0, frames: total, ffmpeg: ffErr.slice(-1500), errors: [...new Set(errors)].slice(0, 15) }));
})().catch((e) => { fs.writeFileSync("/work/result.json", JSON.stringify({ ok: false, error: String(e && e.stack || e).slice(0, 2000) })); });
`;

async function sandboxSsh() {
    const ssh = new NodeSSH();
    const isProd = process.env.NODE_ENV === "production";
    await ssh.connect({
        host: isProd ? "172.31.6.98" : "13.63.34.197",
        username: "ubuntu",
        ...(process.env.AGENT_SSH_KEY
            ? { privateKey: process.env.AGENT_SSH_KEY.replace(/\\n/g, "\n") }
            : { privateKeyPath: "C:\\Users\\nikhi\\Downloads\\Nikhil.pem" }),
    });
    return ssh;
}

const even = (n, fallback) => {
    const v = Math.round(Number(n) || fallback);
    return Math.max(64, Math.min(VIDEO_LIMITS.maxSide, v - (v % 2)));
};

/** Renders the page. Returns { mp4: Buffer, checks: [{ at, jpg: Buffer }], frames, errors } or throws. */
export async function renderVideo({ html, seconds, fps, width, height }) {
    if (!String(html || "").trim()) throw new Error("html is empty: give the full animated HTML page.");
    const cfg = {
        seconds: Math.max(1, Math.min(VIDEO_LIMITS.maxSeconds, Number(seconds) || 10)),
        fps: [24, 25, 30, 50, 60].includes(Number(fps)) ? Number(fps) : 30,
        width: even(width, 1920),
        height: even(height, 1080),
    };
    if (cfg.seconds * cfg.fps > VIDEO_LIMITS.maxSeconds * 30) cfg.fps = 30; // long videos record at 30 fps
    cfg.checks = [0.2, 0.5, 0.85].map((p) => +(cfg.seconds * p).toFixed(2));
    const dir = `/home/ubuntu/sandbox_data/_video_${crypto.randomUUID()}`;
    const local = fs.mkdtempSync(path.join(os.tmpdir(), "cg-video-"));
    const ssh = await sandboxSsh();
    try {
        await ssh.execCommand(`mkdir -p ${dir}`);
        await ssh.execCommand(`cat > ${dir}/index.html`, { stdin: String(html) });
        await ssh.execCommand(`cat > ${dir}/clock.js`, { stdin: CLOCK_JS });
        await ssh.execCommand(`cat > ${dir}/render.js`, { stdin: RENDER_JS });
        await ssh.execCommand(`cat > ${dir}/config.json`, { stdin: JSON.stringify(cfg) });
        const run = await ssh.execCommand(`docker run --rm --shm-size=1g -v ${dir}:/work -w /work classgrid-ai-sandbox node /work/render.js`);
        const resultText = (await ssh.execCommand(`cat ${dir}/result.json 2>/dev/null`)).stdout;
        let result;
        try { result = JSON.parse(resultText); } catch { throw new Error(`The renderer stopped: ${(run.stderr || run.stdout || "no output").slice(-1500)}`); }
        if (!result.ok) throw new Error(result.error || `ffmpeg failed: ${result.ffmpeg || "unknown"}${result.errors?.length ? `\nPage errors: ${result.errors.join(" | ")}` : ""}`);
        await ssh.getFile(path.join(local, "out.mp4"), `${dir}/out.mp4`);
        const checks = [];
        for (let i = 0; i < cfg.checks.length; i++) {
            const p = path.join(local, `check_${i}.jpg`);
            try { await ssh.getFile(p, `${dir}/check_${i}.jpg`); checks.push({ at: cfg.checks[i], jpg: fs.readFileSync(p) }); } catch { /* frame not written */ }
        }
        return { mp4: fs.readFileSync(path.join(local, "out.mp4")), checks, frames: result.frames, errors: result.errors || [], cfg };
    } finally {
        await ssh.execCommand(`rm -rf ${dir}`).catch(() => {});
        ssh.dispose();
        fs.rmSync(local, { recursive: true, force: true });
    }
}

/** Same CDN as upload_sandbox_file_to_cdn (ai-generated/ on cdn.classgrid.in). Returns the public URL. */
export async function uploadToCdn(buffer, fileName, mimeType) {
    const s3 = new S3Client({
        region: process.env.AWS_S3_ERP_REGION || "eu-north-1",
        credentials: { accessKeyId: process.env.AWS_S3_ERP_ACCESS_KEY, secretAccessKey: process.env.AWS_S3_ERP_SECRET_KEY },
    });
    const key = `ai-generated/${Date.now()}-${String(fileName).replace(/[^a-zA-Z0-9.-]/g, "_").toLowerCase()}`;
    await s3.send(new PutObjectCommand({ Bucket: process.env.AWS_S3_ERP_BUCKET_NAME || "erp-classgrid", Key: key, Body: buffer, ContentType: mimeType }));
    return { key, url: `${process.env.AWS_CLOUDFRONT_ERP_DOMAIN || "https://cdn.classgrid.in"}/${key}` };
}
