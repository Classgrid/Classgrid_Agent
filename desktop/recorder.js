// Videos of the AI using the browser (like a screen recording, as proof of what it did). While the AI works in the
// app's browser, a picture of the page is taken twice a second and drawn into a hidden recorder page that makes a
// WebM video. It is saved in Videos\Classgrid recordings once the AI has stopped using the browser for 30 seconds.
const { BrowserWindow, app } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const FPS = 2;
const IDLE_MS = 30 * 1000;
const MAX_MS = 20 * 60 * 1000; // a very long session is saved in parts
const W = 1280;
const H = 800;

let rec = null; // { win, file, frameTimer, saveTimer, last, started, label }

function folder() {
  const dir = path.join(app.getPath("videos"), "Classgrid recordings");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
const stamp = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
};

// The recorder page: a canvas recorded with MediaRecorder; the main process draws pictures into it and takes the video
const RECORDER = `window.cg = (() => {
  const c = document.createElement("canvas"); c.width = ${W}; c.height = ${H}; document.body.appendChild(c);
  const x = c.getContext("2d"); x.fillStyle = "#000"; x.fillRect(0, 0, ${W}, ${H});
  const mr = new MediaRecorder(c.captureStream(${FPS}), { mimeType: "video/webm;codecs=vp8", videoBitsPerSecond: 900000 });
  const chunks = [];
  mr.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  mr.start(5000);
  return {
    draw(src) {
      return new Promise((ok) => {
        const i = new Image();
        i.onload = () => {
          const s = Math.min(${W} / i.width, ${H} / i.height), w = i.width * s, h = i.height * s;
          x.fillStyle = "#000"; x.fillRect(0, 0, ${W}, ${H}); x.drawImage(i, (${W} - w) / 2, (${H} - h) / 2, w, h); ok(1);
        };
        i.onerror = () => ok(0);
        i.src = src;
      });
    },
    async take() {
      const parts = chunks.splice(0);
      if (!parts.length) return "";
      const b = new Uint8Array(await new Blob(parts).arrayBuffer());
      let s = "";
      for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
      return btoa(s);
    },
    stop() { return new Promise((ok) => { mr.onstop = () => ok(1); mr.requestData(); mr.stop(); }); },
  };
})(); 1`;

async function save() {
  if (!rec) return;
  const b64 = await rec.win.webContents.executeJavaScript("cg.take()").catch(() => "");
  if (b64) fs.appendFileSync(rec.file, Buffer.from(b64, "base64"));
}

async function stop() {
  const r = rec;
  if (!r) return;
  rec = null;
  clearInterval(r.frameTimer);
  clearInterval(r.saveTimer);
  clearTimeout(r.idleTimer);
  try {
    await r.win.webContents.executeJavaScript("cg.stop()");
    const b64 = await r.win.webContents.executeJavaScript("cg.take()").catch(() => "");
    if (b64) fs.appendFileSync(r.file, Buffer.from(b64, "base64"));
  } catch { /* the recorder page is gone */ }
  if (!r.win.isDestroyed()) r.win.destroy();
  // Nothing was recorded: no empty file
  try { if (fs.statSync(r.file).size < 2000) fs.rmSync(r.file, { force: true }); } catch { /* already gone */ }
  console.log("[recording] saved", r.file);
}

async function start(getView, label) {
  const win = new BrowserWindow({ show: false, width: W, height: H, webPreferences: { offscreen: true, sandbox: true, contextIsolation: true, nodeIntegration: false, backgroundThrottling: false } });
  await win.loadURL("about:blank");
  await win.webContents.executeJavaScript(RECORDER);
  const safe = String(label || "browser").replace(/[^\w.-]+/g, " ").trim().slice(0, 60) || "browser";
  rec = { win, file: path.join(folder(), `${stamp()} ${safe}.webm`), last: Date.now(), started: Date.now(), busy: false };
  // A picture of the page twice a second (skipped when the page can't be drawn right now)
  rec.frameTimer = setInterval(async () => {
    const r = rec;
    if (!r || r.busy) return;
    const view = getView();
    if (!view?.webContents || view.webContents.isDestroyed()) return;
    r.busy = true;
    try {
      const img = await view.webContents.capturePage();
      if (!img.isEmpty() && rec === r) {
        const small = img.getSize().width > W ? img.resize({ width: W, quality: "good" }) : img;
        await r.win.webContents.executeJavaScript(`cg.draw(${JSON.stringify(`data:image/jpeg;base64,${small.toJPEG(70).toString("base64")}`)})`);
      }
    } catch { /* the page is between loads */ }
    r.busy = false;
    if (rec === r && Date.now() - r.started > MAX_MS) { await stop(); }
  }, 1000 / FPS);
  rec.saveTimer = setInterval(() => { save().catch(() => {}); }, 5000);
}

module.exports = {
  // The AI did a step in the browser: record (or keep recording) until it has been quiet for 30 seconds
  async activity(getView, label) {
    if (!rec) await start(getView, label).catch((e) => { console.log("[recording] could not start:", e.message); rec = null; });
    if (!rec) return;
    rec.last = Date.now();
    clearTimeout(rec.idleTimer);
    const r = rec;
    rec.idleTimer = setTimeout(() => { if (rec === r) stop(); }, IDLE_MS);
  },
  stop,
  folder,
};
