// The AI's memory of every Classgrid account used on this computer (its saved skills and personal settings), kept
// in <userData>/memory.json. A chat in one account also gets what the user saved in their other accounts here,
// so switching accounts keeps the memory (the screens send it with each question).
const fs = require("node:fs");
const path = require("node:path");

let file = null;
let userId = null;

function userOf(token) {
  try { return JSON.parse(Buffer.from(String(token).split(".")[1], "base64url").toString()).id || null; } catch { return null; }
}

function load() {
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    return data && typeof data.accounts === "object" ? data : { accounts: {} };
  } catch { return { accounts: {} }; }
}

// Write to a temp file, then rename over the old one: a crash never leaves half a file
function save(data) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, file);
}

const text = (v, max) => String(v ?? "").slice(0, max);

module.exports = {
  init(userDataDir) { file = path.join(userDataDir, "memory.json"); },
  // The login token the screens send (same one the local runner gets)
  setToken(token) { userId = token ? userOf(token) : null; },

  // The logged-in account's memory, as the server has it now
  saveMine({ email, name, prefs, skills } = {}) {
    if (!file || !userId) return false;
    const data = load();
    data.accounts[userId] = {
      email: text(email, 200),
      name: text(name, 200),
      prefs: Object.fromEntries(Object.entries(prefs && typeof prefs === "object" ? prefs : {}).filter(([, v]) => typeof v === "string" || Array.isArray(v)).map(([k, v]) => [text(k, 50), Array.isArray(v) ? v.slice(0, 50).map((x) => text(x, 100)) : text(v, 2000)])),
      skills: (Array.isArray(skills) ? skills : []).filter((s) => s && s.is_active !== false).slice(0, 200).map((s) => ({ name: text(s.name, 200), instructions: text(s.instructions, 4000) })),
      savedAt: Date.now(),
    };
    save(data);
    return true;
  },

  // The memory of the other accounts on this computer (newest first)
  others() {
    if (!file) return [];
    return Object.entries(load().accounts)
      .filter(([id]) => id !== userId)
      .map(([, a]) => a)
      .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  },
};
