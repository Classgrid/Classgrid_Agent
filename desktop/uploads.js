// Studio's Uploads tab in the desktop app: every file the user uploaded (in the tab, or sent in a chat) is kept on
// this computer, never on our storage. Layout: <userData>/uploads/<userId>/<id>-<name> and
// <userData>/uploads/<userId>/index.json ([{ id, name, type, size, at, chatId, file }], newest first).
// Only the logged-in user's folder is used (user id from the login token, like chats.js).
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const MAX_FILE = 2 * 1024 * 1024 * 1024; // 2 GB a file
const MAX_KEPT = 2000;

let root = null; // <userData>/uploads
let userId = null;

const safeId = (id) => (/^[\w-]{1,100}$/.test(String(id || "")) ? String(id) : null);
function userOf(token) {
  try { return JSON.parse(Buffer.from(String(token).split(".")[1], "base64url").toString()).id || null; } catch { return null; }
}
function userDir() {
  const u = safeId(userId);
  return root && u ? path.join(root, u) : null;
}
// A name that is safe as a file name on Windows (the shown name stays the original one)
const fileName = (name) => (String(name || "file").replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/, "").slice(-120) || "file");

const MIME = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", bmp: "image/bmp", svg: "image/svg+xml",
  mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", m4a: "audio/mp4",
  pdf: "application/pdf", csv: "text/csv", txt: "text/plain", md: "text/markdown", json: "application/json",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};
const typeOf = (name, given) => (given && given !== "application/octet-stream" ? given : MIME[path.extname(name).slice(1).toLowerCase()] || "application/octet-stream");

async function readIndex(dir) {
  try { const list = JSON.parse(await fsp.readFile(path.join(dir, "index.json"), "utf8")); return Array.isArray(list) ? list : []; } catch { return []; }
}
async function writeIndex(dir, list) {
  const file = path.join(dir, "index.json");
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fsp.writeFile(tmp, JSON.stringify(list));
  for (let i = 0; ; i++) {
    try { return await fsp.rename(tmp, file); } catch (err) {
      if (i >= 4 || !["EPERM", "EBUSY", "EACCES"].includes(err.code)) { await fsp.rm(tmp, { force: true }); throw err; }
      await new Promise((r) => setTimeout(r, 50 * (i + 1)));
    }
  }
}

// One write at a time, so two uploads together don't lose each other in index.json
let queue = Promise.resolve();
const serial = (fn) => { const run = queue.then(fn, fn); queue = run.catch(() => {}); return run; };

// The files still there, newest first (a file deleted outside the app leaves the list)
async function list() {
  const dir = userDir();
  if (!dir) return [];
  const items = await readIndex(dir);
  return items.filter((f) => f && f.file && fs.existsSync(f.file));
}

// Adds files: { path } (a file on this computer, copied) or { name, type, data } (its bytes). The same file again
// (same name and size) moves to the top instead of being kept twice.
function add(files, chatId) {
  return serial(async () => {
    const dir = userDir();
    if (!dir) return { error: "Log in to keep uploads on this computer." };
    await fsp.mkdir(dir, { recursive: true });
    let items = await readIndex(dir);
    const added = [];
    for (const f of Array.isArray(files) ? files : []) {
      try {
        const from = f.path ? path.resolve(String(f.path)) : null;
        const name = String(f.name || (from ? path.basename(from) : "file"));
        const size = from ? (await fsp.stat(from)).size : f.data ? f.data.byteLength : 0;
        if (!size || size > MAX_FILE) continue;
        const same = items.find((x) => x.name === name && x.size === size && fs.existsSync(x.file));
        if (same) {
          items = items.filter((x) => x !== same);
          const again = { ...same, at: Date.now(), chatId: safeId(chatId) || same.chatId || null };
          items.unshift(again);
          added.push(again);
          continue;
        }
        const id = crypto.randomBytes(6).toString("hex");
        const file = path.join(dir, `${id}-${fileName(name)}`);
        if (from) await fsp.copyFile(from, file);
        else await fsp.writeFile(file, Buffer.from(f.data));
        const item = { id, name, type: typeOf(name, f.type), size, at: Date.now(), chatId: safeId(chatId), file };
        items.unshift(item);
        added.push(item);
      } catch { /* this one couldn't be read or written: the others go on */ }
    }
    for (const old of items.splice(MAX_KEPT)) await fsp.rm(old.file, { force: true }).catch(() => {});
    await writeIndex(dir, items);
    return { files: added };
  });
}

function remove(id) {
  return serial(async () => {
    const dir = userDir();
    if (!dir) return false;
    const items = await readIndex(dir);
    const gone = items.find((x) => x.id === id);
    if (!gone) return false;
    await fsp.rm(gone.file, { force: true }).catch(() => {});
    await writeIndex(dir, items.filter((x) => x !== gone));
    return true;
  });
}

module.exports = {
  init(userDataDir) { root = path.join(userDataDir, "uploads"); },
  setToken(token) { userId = token ? userOf(token) : null; },
  folder() { return userDir(); },
  list,
  add,
  remove,
};
