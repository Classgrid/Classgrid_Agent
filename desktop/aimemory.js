// The AI's own memory on this computer, kept like Claude Code's: one short .md file per thing worth remembering
// (rules the user gave, facts about the user and their projects, problems and how they were fixed, where work
// stopped), and MEMORY.md as the list of them. The app sends MEMORY.md with every question, so every new chat starts
// knowing it. Shared by every Classgrid account on this computer. It lives in Documents\Classgrid memory, where the
// user can open, change or delete the notes.
const fs = require("node:fs");
const path = require("node:path");
const { app } = require("electron");

const TYPES = new Set(["user", "feedback", "project", "problem", "reference"]);
const MAX_INDEX = 25 * 1024;
const MAX_NOTE = 20 * 1024;

const folder = () => {
  const dir = path.join(app.getPath("documents"), "Classgrid memory");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};
const indexFile = () => path.join(folder(), "MEMORY.md");
const slug = (name) => String(name || "").toLowerCase().replace(/\.md$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
const oneLine = (s, max) => String(s || "").replace(/\s+/g, " ").trim().slice(0, max);

function readIndex() {
  try { return fs.readFileSync(indexFile(), "utf8"); } catch { return ""; }
}

// MEMORY.md: one line per note, "- [title](file.md) — what it is about"
function writeIndexLine(file, title, description) {
  const lines = readIndex().split(/\r?\n/).filter((l) => l.trim() && !l.includes(`](${file})`));
  if (title) lines.push(`- [${oneLine(title, 80)}](${file}) — ${oneLine(description, 150)}`);
  fs.writeFileSync(indexFile(), lines.join("\n") + (lines.length ? "\n" : ""), "utf8");
}

function save({ name, description, type, content }) {
  const s = slug(name);
  if (!s) return "Error: give the memory a short name.";
  if (!String(content || "").trim()) return "Error: the memory has no text.";
  const kind = TYPES.has(String(type)) ? String(type) : "project";
  const file = `${s}.md`;
  const existed = fs.existsSync(path.join(folder(), file));
  const body = `---\nname: ${s}\ndescription: ${oneLine(description, 150)}\ntype: ${kind}\nupdated: ${new Date().toISOString()}\n---\n\n${String(content).trim().slice(0, MAX_NOTE)}\n`;
  fs.writeFileSync(path.join(folder(), file), body, "utf8");
  writeIndexLine(file, s, description || String(content).slice(0, 150));
  return `${existed ? "Updated" : "Saved"} the memory "${s}" (${kind}) in ${path.join(folder(), file)}.`;
}

function read({ name }) {
  const file = `${slug(name)}.md`;
  try { return fs.readFileSync(path.join(folder(), file), "utf8"); } catch { return `Error: there is no memory "${slug(name)}". MEMORY.md lists the ones there are.`; }
}

function remove({ name }) {
  const file = `${slug(name)}.md`;
  const full = path.join(folder(), file);
  if (!fs.existsSync(full)) return `Error: there is no memory "${slug(name)}".`;
  fs.rmSync(full, { force: true });
  writeIndexLine(file, null);
  return `Deleted the memory "${slug(name)}".`;
}

module.exports = {
  folder,
  // MEMORY.md for the next question (cut if it grew too long)
  index() {
    try { folder(); } catch { return ""; }
    const text = readIndex();
    return text.length > MAX_INDEX ? `${text.slice(0, MAX_INDEX)}\n...(the list is long: keep it short, merge or delete old notes)` : text;
  },
  run(args = {}) {
    try {
      const action = String(args.action || "");
      if (action === "save") return save(args);
      if (action === "read") return read(args);
      if (action === "delete") return remove(args);
      if (action === "list") return readIndex() || "No memories saved yet.";
      return 'Error: action must be "save", "read", "delete" or "list".';
    } catch (e) {
      return `Error: ${e.message}`;
    }
  },
};
