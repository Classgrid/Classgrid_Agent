// Every AI chat is also kept on this computer, so the user can read it when the internet is down.
// Layout: <userData>/chats/<userId>/<chatId>.json (the chat's details and all its messages, as the server sends
// them: thinking, steps, commands and their output, attachment links, model, times) and
// <userData>/chats/<userId>/index.json (id, title, project, times) for a fast chat list.
// <userData>/chats/<userId>/account.json says whose folder it is ({ userId, email, name }).
// Only the logged-in user's folder is ever written (user id from the login token). The other accounts' folders on
// this computer are only read, so a chat can go on under the account that is logged in now.
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");

const MAX_INLINE = 200 * 1024; // inline base64 longer than this is left out (links are always kept)
const MAX_FILE = 50 * 1024 * 1024; // a chat bigger than this (after the above) isn't saved

let root = null; // <userData>/chats
let userId = null;

const safeId = (id) => (/^[\w-]{1,100}$/.test(String(id || "")) ? String(id) : null);

function userOf(token) {
  try { return JSON.parse(Buffer.from(String(token).split(".")[1], "base64url").toString()).id || null; } catch { return null; }
}

// The logged-in user's folder, or null when nobody is logged in
function userDir() {
  const u = safeId(userId);
  return root && u ? path.join(root, u) : null;
}

// A chat file of the logged-in user (null for a bad id)
function chatFile(id) {
  const dir = userDir();
  const safe = safeId(id);
  if (!dir || !safe || safe === "index" || safe === "account") return null;
  return path.join(dir, `${safe}.json`);
}

// Write to a temp file, then rename over the old one: a crash never leaves half a file
async function writeJson(file, data) {
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fsp.writeFile(tmp, JSON.stringify(data));
  for (let i = 0; ; i++) {
    try { return await fsp.rename(tmp, file); } catch (err) {
      // Windows: the old file may be open for a moment (a reader, antivirus)
      if (i >= 4 || !["EPERM", "EBUSY", "EACCES"].includes(err.code)) { await fsp.rm(tmp, { force: true }); throw err; }
      await new Promise((r) => setTimeout(r, 50 * (i + 1)));
    }
  }
}

async function readJson(file) {
  try { return JSON.parse(await fsp.readFile(file, "utf8")); } catch { return null; }
}

// Drop long runs of base64 (with their "data:...;base64," front) from a text; links stay
const isB64 = (c) => (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || c === 43 || c === 47 || c === 61;
function dropBase64(str, dropped) {
  if (str.length < MAX_INLINE) return str;
  let out = "";
  let last = 0;
  for (let i = 0; i < str.length;) {
    if (!isB64(str.charCodeAt(i))) { i++; continue; }
    let j = i;
    while (j < str.length && isB64(str.charCodeAt(j))) j++;
    if (j - i >= MAX_INLINE) {
      let start = i;
      const front = str.lastIndexOf("data:", i);
      if (front !== -1 && i - front < 120 && /^data:[^,\s"']*;base64,$/.test(str.slice(front, i))) start = front;
      out += str.slice(last, start) + `[large file left out of the saved copy: ${Math.round((j - start) / 1024)} KB]`;
      last = j;
      dropped.count++;
      dropped.kb += Math.round((j - start) / 1024);
    }
    i = j;
  }
  return last ? out + str.slice(last) : str;
}

function shrink(value, dropped, depth = 0) {
  if (typeof value === "string") return dropBase64(value, dropped);
  if (!value || typeof value !== "object" || depth > 60) return value;
  if (Array.isArray(value)) return value.map((v) => shrink(v, dropped, depth + 1));
  const out = {};
  for (const [k, v] of Object.entries(value)) out[k] = shrink(v, dropped, depth + 1);
  return out;
}

// One write at a time per computer (index.json is read, changed and written back)
let queue = Promise.resolve();
const inTurn = (fn) => { const p = queue.then(fn, fn); queue = p.catch(() => {}); return p; };

const indexFile = (dir) => path.join(dir, "index.json");
const byNewest = (a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));

function indexEntry(chat) {
  return { id: chat.id, title: chat.title, projectId: chat.projectId, pinned: chat.pinned, createdAt: chat.createdAt, updatedAt: chat.updatedAt, savedAt: chat.savedAt, messageCount: chat.messages.length };
}

// The index, or (missing / broken) one made again from the chat files
async function readIndex(dir) {
  const idx = await readJson(indexFile(dir));
  if (idx && Array.isArray(idx.chats)) return idx.chats;
  const chats = [];
  let names = [];
  try { names = await fsp.readdir(dir); } catch { return []; }
  for (const name of names) {
    if (!name.endsWith(".json") || name === "index.json") continue;
    const chat = await readJson(path.join(dir, name));
    if (chat && chat.id && Array.isArray(chat.messages)) chats.push(indexEntry(chat));
  }
  return chats.sort(byNewest);
}

const accountFile = (dir) => path.join(dir, "account.json");
let accountSaved = null; // "<userId> <email> <name>" last written, so it isn't written on every save

// Remember whose folder this is. account: the signed-in user the screens know ({ _id, email, name }); it must be the
// same person as the login token
async function saveAccount(dir, account) {
  if (!account || typeof account !== "object" || String(account._id || account.id || "") !== String(userId)) return;
  const email = String(account.email || "").trim().slice(0, 320);
  if (!email) return;
  const name = String(account.name || "").trim().slice(0, 200);
  const key = `${userId} ${email} ${name}`;
  if (accountSaved === key) return;
  const old = await readJson(accountFile(dir));
  if (!old || old.userId !== userId || old.email !== email || (old.name || "") !== name) {
    await writeJson(accountFile(dir), { version: 1, userId, email, name, savedAt: new Date().toISOString() });
  }
  accountSaved = key;
}

// chat: { id, details: GET /api/ai/sessions/:id answer ({ session, projectId }), messages: GET .../messages list,
// account: the signed-in user (optional) }
async function saveChat(chat) {
  const file = chatFile(chat && chat.id);
  if (!file) return { error: userDir() ? "Bad chat id." : "Not logged in." };
  if (!Array.isArray(chat.messages)) return { error: "No messages." };
  const dir = userDir();
  return inTurn(async () => {
    const dropped = { count: 0, kb: 0 };
    const details = shrink(chat.details && typeof chat.details === "object" ? chat.details : null, dropped);
    const messages = shrink(chat.messages, dropped);
    const s = (details && details.session) || {};
    const times = messages.map((m) => m && m.created_at).filter(Boolean).map(String).sort();
    const old = await readJson(file);
    const saved = {
      version: 1,
      id: chat.id,
      // Details are missing when only the messages could be loaded: keep the ones saved before
      title: s.title || (old && old.title) || "New chat",
      projectId: details ? details.projectId || null : (old && old.projectId) || null,
      pinned: details ? !!s.pinned : !!(old && old.pinned),
      createdAt: s.created_at || (old && old.createdAt) || times[0] || new Date().toISOString(),
      updatedAt: times[times.length - 1] || s.updated_at || s.created_at || new Date().toISOString(),
      savedAt: new Date().toISOString(),
      details: details || (old && old.details) || null,
      messages,
    };
    if (dropped.count) saved.dropped = { ...dropped, note: "Some large inline files were left out of this saved copy. Their links are kept." };
    const text = JSON.stringify(saved);
    if (text.length > MAX_FILE) return { error: "This chat is too big to keep on this computer." };
    await fsp.mkdir(dir, { recursive: true });
    await saveAccount(dir, chat.account).catch(() => {});
    await writeJson(file, saved);
    const chats = (await readIndex(dir)).filter((c) => c.id !== saved.id);
    chats.push(indexEntry(saved));
    await writeJson(indexFile(dir), { version: 1, chats: chats.sort(byNewest) });
    return { ok: true, dropped: dropped.count };
  });
}

// The logged-in user's saved chats, newest first
async function listChats() {
  const dir = userDir();
  if (!dir) return [];
  await queue;
  return readIndex(dir);
}

// One saved chat of the logged-in user, or null
async function readChat(id) {
  const file = chatFile(id);
  if (!file) return null;
  await queue;
  const chat = await readJson(file);
  return chat && chat.id === id ? chat : null;
}

// A chat deleted on the server (or no longer yours) is removed here too
async function removeChat(id) {
  const file = chatFile(id);
  if (!file) return { error: "Bad chat id." };
  const dir = userDir();
  return inTurn(async () => {
    await fsp.rm(file, { force: true });
    if (fs.existsSync(indexFile(dir))) {
      const chats = (await readIndex(dir)).filter((c) => c.id !== id);
      await writeJson(indexFile(dir), { version: 1, chats });
    }
    return { ok: true };
  });
}

// The other accounts' folders on this computer (never the logged-in user's)
async function otherDirs() {
  const me = safeId(userId);
  if (!root || !me) return [];
  let names = [];
  try { names = await fsp.readdir(root, { withFileTypes: true }); } catch { return []; }
  return names.filter((d) => d.isDirectory() && safeId(d.name) === d.name && d.name !== me).map((d) => d.name);
}

// Chats saved here by the other accounts, newest first: [{ userId, email, name, chats: [index entries] }].
// email is null for a folder saved before account.json was kept.
async function listOtherChats() {
  await queue;
  const out = [];
  for (const other of await otherDirs()) {
    const dir = path.join(root, other);
    const chats = (await readIndex(dir)).filter((c) => c && safeId(c.id));
    if (!chats.length) continue;
    const acc = await readJson(accountFile(dir));
    const mine = acc && acc.userId === other;
    out.push({ userId: other, email: mine && acc.email ? String(acc.email) : null, name: mine && acc.name ? String(acc.name) : null, chats: chats.sort(byNewest) });
  }
  return out.sort((a, b) => byNewest(a.chats[0], b.chats[0]));
}

// One chat saved here by another account (read only), with that account's email, or null
async function readOtherChat(otherId, id) {
  const other = safeId(otherId);
  const safe = safeId(id);
  if (!root || !other || !safe || safe === "index" || safe === "account" || other === safeId(userId)) return null;
  if (!(await otherDirs()).includes(other)) return null;
  const dir = path.join(root, other);
  const chat = await readJson(path.join(dir, `${safe}.json`));
  if (!chat || chat.id !== safe || !Array.isArray(chat.messages)) return null;
  const acc = await readJson(accountFile(dir));
  const mine = acc && acc.userId === other;
  return { ...chat, account: { userId: other, email: mine && acc.email ? String(acc.email) : null, name: mine && acc.name ? String(acc.name) : null } };
}

module.exports = {
  init(userDataDir) { root = path.join(userDataDir, "chats"); },
  // The login token the screens send (same one the local runner gets)
  setToken(token) { userId = token ? userOf(token) : null; accountSaved = null; },
  saveChat,
  listChats,
  readChat,
  removeChat,
  listOtherChats,
  readOtherChat,
};
