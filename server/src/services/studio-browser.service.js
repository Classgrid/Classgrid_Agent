// Studio Mode's live browser: one real Chromium per user, in its own container on the sandbox server
// (studio-b-<userId>, the classgrid-ai-sandbox image, 1 GB, the user's own saved profile). The API reaches it through
// an SSH tunnel: the agent's browser tools call its /act, and the Studio Browser tab watches its /live screencast
// through Socket.IO. A browser nobody used or watched for 30 minutes is switched off.
import fs from "fs";
import net from "net";
import crypto from "crypto";
import { fileURLToPath } from "url";
import WebSocket from "ws";
import redis from "../config/redis.js";
import { sandboxSsh } from "./ide-project.service.js";

const DAEMON = fs.readFileSync(fileURLToPath(new URL("./studio-browser-daemon.mjs", import.meta.url)), "utf8");
const DAEMON_MD5 = crypto.createHash("md5").update(DAEMON).digest("hex");
const DAEMON_DIR = "/home/ubuntu/studio_branding";
const USERS = "studio:browser:users";
const SEEN = (u) => `studio:browser:seen:${u}`;
const IDLE_MS = 30 * 60 * 1000;
const MIN_FREE_MB = 700;
const name = (u) => `studio-b-${u}`;

const validUser = (u) => /^[a-f0-9]{24}$/.test(String(u));
export async function touchBrowser(userId) {
  await redis.sadd(USERS, String(userId)).catch(() => {});
  await redis.set(SEEN(userId), String(Date.now()), "EX", 24 * 60 * 60).catch(() => {});
}

// One SSH connection + a local TCP port per user that leads to their browser container
const tunnels = new Map(); // userId -> { ssh, server, localPort, port }
function closeTunnel(userId) {
  const t = tunnels.get(userId);
  tunnels.delete(userId);
  if (!t) return;
  try { t.server.close(); } catch { /* closed */ }
  try { t.ssh.dispose(); } catch { /* closed */ }
}

const starting = new Map(); // userId -> Promise (one start at a time per user)
export async function ensureBrowser(userId) {
  userId = String(userId);
  if (!validUser(userId)) throw new Error("No user");
  if (starting.has(userId)) return starting.get(userId);
  const job = (async () => {
    const cached = tunnels.get(userId);
    if (cached) {
      const alive = await fetch(`http://127.0.0.1:${cached.localPort}/health`, { signal: AbortSignal.timeout(4000) }).then((r) => r.ok).catch(() => false);
      if (alive) { await touchBrowser(userId); return cached; }
      closeTunnel(userId);
    }
    const ssh = await sandboxSsh();
    try {
      const n = name(userId);
      let port = (await ssh.execCommand(`docker inspect -f '{{.State.Running}}' ${n} 2>/dev/null | grep -q true && docker port ${n} 3000/tcp | head -1 | sed 's/.*://'`)).stdout.trim();
      // The browser program on the sandbox: uploaded again only when it changed. A browser still running the old
      // program is started again (it opens the user's last page again)
      const { stdout: md5 } = await ssh.execCommand(`md5sum ${DAEMON_DIR}/browser-daemon.mjs 2>/dev/null | cut -d' ' -f1`);
      if (md5.trim() !== DAEMON_MD5) {
        const up = await ssh.execCommand(`mkdir -p ${DAEMON_DIR} && cat > ${DAEMON_DIR}/browser-daemon.mjs`, { stdin: DAEMON });
        if (up.code) throw new Error("Could not set up the browser");
        port = "";
      }
      if (!/^\d+$/.test(port)) {
        const { stdout: freeMb } = await ssh.execCommand(`awk '/^MemAvailable:/ { print int($2 / 1024) }' /proc/meminfo`);
        if (Number(freeMb) < MIN_FREE_MB) throw new Error("The sandbox server is busy right now. Try the browser again in a few minutes.");
        const dir = `/home/ubuntu/studio_users/${userId}`;
        await ssh.execCommand(`mkdir -p ${dir} && sudo chown 1000:1000 ${dir}`);
        const run = await ssh.execCommand(
          `docker rm -f ${n} >/dev/null 2>&1; docker run -d --name ${n} --label classgrid-studio-browser=1 --network ide-net ` +
          `--memory 1g --memory-swap 1g --cpus 1 --pids-limit 512 -p 127.0.0.1::3000 ` +
          `-v ${dir}:/home/agent/studio -v ${DAEMON_DIR}:/opt/studio:ro --entrypoint node classgrid-ai-sandbox /opt/studio/browser-daemon.mjs`
        );
        if (run.code) throw new Error(`Could not start the browser: ${(run.stderr || run.stdout).slice(0, 200)}`);
        port = (await ssh.execCommand(`docker port ${n} 3000/tcp | head -1 | sed 's/.*://'`)).stdout.trim();
        if (!/^\d+$/.test(port)) throw new Error("Could not start the browser");
      }
      // Local port on the API -> the browser container, through this SSH connection
      const server = net.createServer((sock) => {
        ssh.connection?.forwardOut("127.0.0.1", 0, "127.0.0.1", Number(port), (err, channel) => {
          if (err) { sock.destroy(); return; }
          sock.pipe(channel).pipe(sock);
          sock.on("error", () => channel.close());
          channel.on("error", () => sock.destroy());
        });
      });
      await new Promise((resolve, reject) => server.listen(0, "127.0.0.1", resolve).on("error", reject));
      const t = { ssh, server, localPort: server.address().port, port };
      tunnels.set(userId, t);
      ssh.connection?.on("close", () => { if (tunnels.get(userId) === t) closeTunnel(userId); });
      // Wait until Chromium is ready (a new container needs a few seconds)
      for (let i = 0; i < 30; i++) {
        const ok = await fetch(`http://127.0.0.1:${t.localPort}/health`, { signal: AbortSignal.timeout(3000) }).then((r) => r.ok).catch(() => false);
        if (ok) { await touchBrowser(userId); return t; }
        await new Promise((r) => setTimeout(r, 1000));
      }
      closeTunnel(userId);
      throw new Error("The browser did not start in time. Try again.");
    } catch (e) {
      if (!tunnels.has(userId)) ssh.dispose();
      throw e;
    }
  })();
  starting.set(userId, job);
  try { return await job; } finally { starting.delete(userId); }
}

// One browser step: open, click, type, press, scroll, back, forward, reload, screenshot, read
export async function browserAct(userId, step) {
  const t = await ensureBrowser(userId);
  const res = await fetch(`http://127.0.0.1:${t.localPort}/act`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(step),
    signal: AbortSignal.timeout(90000),
  });
  const data = await res.json().catch(() => ({ ok: false, error: "The browser gave no answer" }));
  await touchBrowser(userId);
  return data;
}

// The Studio Browser tab: frames and page changes go to the user's socket; their clicks, wheel and keys come back
const watching = new Map(); // userId -> count of open viewers
export function registerBrowserSocket(socket) {
  let ws = null;
  const stop = () => {
    if (!ws) return;
    try { ws.close(); } catch { /* closed */ }
    ws = null;
    watching.set(socket.userId, Math.max(0, (watching.get(socket.userId) || 1) - 1));
  };
  socket.on("studio:browser:watch", async () => {
    if (!socket.userId || ws) return;
    socket.emit("studio:browser", { type: "status", status: "starting" });
    try {
      const t = await ensureBrowser(socket.userId);
      if (ws) return;
      ws = new WebSocket(`ws://127.0.0.1:${t.localPort}/live`);
      watching.set(socket.userId, (watching.get(socket.userId) || 0) + 1);
      let lastTouch = 0;
      ws.on("open", () => socket.emit("studio:browser", { type: "status", status: "ready" }));
      ws.on("message", (raw) => {
        let m; try { m = JSON.parse(String(raw)); } catch { return; }
        socket.emit("studio:browser", m);
        if (Date.now() - lastTouch > 30000) { lastTouch = Date.now(); touchBrowser(socket.userId); }
      });
      ws.on("close", () => { if (ws) { ws = null; watching.set(socket.userId, Math.max(0, (watching.get(socket.userId) || 1) - 1)); socket.emit("studio:browser", { type: "status", status: "closed" }); } });
      ws.on("error", () => {});
    } catch (e) {
      socket.emit("studio:browser", { type: "status", status: "error", error: e.message });
    }
  });
  socket.on("studio:browser:input", (m) => {
    if (!ws || ws.readyState !== WebSocket.OPEN || !m || typeof m !== "object") return;
    if (!["click", "move", "wheel", "key", "text", "act", "viewport"].includes(m.type)) return;
    try { ws.send(JSON.stringify(m)); } catch { /* closed */ }
  });
  socket.on("studio:browser:unwatch", stop);
  socket.on("disconnect", stop);
}

// Every minute: a browser nobody used or watched for 30 minutes is switched off (its saved logins and last page stay)
let reaping = false;
setInterval(async () => {
  if (reaping) return;
  reaping = true;
  let ssh;
  try {
    if (!(await redis.set("studio:browser:reaper-lock", "1", "EX", 55, "NX"))) return;
    for (const userId of await redis.smembers(USERS)) {
      if (!validUser(userId)) { await redis.srem(USERS, userId); continue; }
      if ((watching.get(userId) || 0) > 0) { await touchBrowser(userId); continue; }
      const seen = Number(await redis.get(SEEN(userId))) || 0;
      if (Date.now() - seen < IDLE_MS) continue;
      ssh = ssh || await sandboxSsh();
      await ssh.execCommand(`docker rm -f ${name(userId)} >/dev/null 2>&1`);
      closeTunnel(userId);
      await redis.srem(USERS, userId);
      await redis.del(SEEN(userId));
    }
  } catch (e) {
    console.error("[Studio browser] cleanup failed:", e.message);
  } finally {
    ssh?.dispose();
    reaping = false;
  }
}, 60 * 1000).unref();
