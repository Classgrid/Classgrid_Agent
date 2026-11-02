// The AI's own memory on this computer, kept like Claude Code's: one short .md file per thing worth remembering
// (rules the user gave, facts about the user and their projects, problems and how they were fixed, where work
// stopped), and MEMORY.md as the list of them. Notes for everything sit in the main folder; notes about one project
// sit in projects\<project>, so each project has its own memory too. Every question gets the list (and the user's
// rules in full), so every new chat starts knowing them. Shared by every Classgrid account on this computer. It lives
// in Documents\Classgrid memory, where the user can open, change or delete the notes.
const fs = require("node:fs");
const path = require("node:path");
const { app } = require("electron");

const TYPES = new Set(["user", "feedback", "project", "problem", "reference"]);
const MAX_INDEX = 25 * 1024;
const MAX_NOTE = 20 * 1024;
const MAX_RULES = 8 * 1024;

const slug = (name) => String(name || "").toLowerCase().replace(/\.md$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
const oneLine = (s, max) => String(s || "").replace(/\s+/g, " ").trim().slice(0, max);

// The main folder, or a project's own folder inside it
const folder = (project) => {
  const base = path.join(app.getPath("documents"), "Classgrid memory");
  const dir = project && slug(project) ? path.join(base, "projects", slug(project)) : base;
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};
const indexFile = (project) => path.join(folder(project), "MEMORY.md");

function readIndex(project) {
  try { return fs.readFileSync(indexFile(project), "utf8"); } catch { return ""; }
}

// MEMORY.md: one line per note, "- [title](file.md) — what it is about"
function writeIndexLine(project, file, title, description) {
  const lines = readIndex(project).split(/\r?\n/).filter((l) => l.trim() && !l.includes(`](${file})`));
  if (title) lines.push(`- [${oneLine(title, 80)}](${file}) — ${oneLine(description, 150)}`);
  fs.writeFileSync(indexFile(project), lines.join("\n") + (lines.length ? "\n" : ""), "utf8");
}

// Where a note is: the project's folder first, then the main one
function find(name, project) {
  const file = `${slug(name)}.md`;
  for (const p of project ? [project, ""] : [""]) {
    const full = path.join(folder(p), file);
    if (fs.existsSync(full)) return { full, file, project: p };
  }
  return null;
}

function save({ name, description, type, content, project = "" }) {
  const s = slug(name);
  if (!s) return "Error: give the memory a short name.";
  if (!String(content || "").trim()) return "Error: the memory has no text.";
  const kind = TYPES.has(String(type)) ? String(type) : "project";
  const file = `${s}.md`;
  const full = path.join(folder(project), file);
  const existed = fs.existsSync(full);
  const body = `---\nname: ${s}\ndescription: ${oneLine(description, 150)}\ntype: ${kind}\nupdated: ${new Date().toISOString()}\n---\n\n${String(content).trim().slice(0, MAX_NOTE)}\n`;
  fs.writeFileSync(full, body, "utf8");
  writeIndexLine(project, file, s, description || String(content).slice(0, 150));
  return `${existed ? "Updated" : "Saved"} the memory "${s}" (${kind}${project ? ", this project only" : ""}) in ${full}.`;
}

function read({ name, project = "" }) {
  const at = find(name, project);
  if (!at) return `Error: there is no memory "${slug(name)}". MEMORY.md lists the ones there are.`;
  return fs.readFileSync(at.full, "utf8");
}

function remove({ name, project = "" }) {
  const at = find(name, project);
  if (!at) return `Error: there is no memory "${slug(name)}".`;
  fs.rmSync(at.full, { force: true });
  writeIndexLine(at.project, at.file, null);
  return `Deleted the memory "${slug(name)}".`;
}

// The user's rules (feedback notes) in full, so the AI follows them without having to open each one
function rules(project) {
  const out = [];
  for (const p of project ? ["", project] : [""]) {
    let names = [];
    try { names = fs.readdirSync(folder(p)).filter((f) => f.endsWith(".md") && f !== "MEMORY.md"); } catch { /* none */ }
    for (const f of names) {
      const text = fs.readFileSync(path.join(folder(p), f), "utf8");
      if (!/^type:\s*feedback\s*$/m.test(text)) continue;
      out.push(`### ${f.replace(/\.md$/, "")}\n${text.replace(/^---[\s\S]*?---\s*/, "").trim()}`);
    }
  }
  const all = out.join("\n\n");
  return all.length > MAX_RULES ? `${all.slice(0, MAX_RULES)}\n...(more rules in the memory folder)` : all;
}

function index(project) {
  const cut = (t) => (t.length > MAX_INDEX ? `${t.slice(0, MAX_INDEX)}\n...(the list is long: keep it short, merge or delete old notes)` : t);
  const main = readIndex("");
  const own = project ? readIndex(project) : "";
  return cut(main + (own ? `\n## Notes for this project only\n${own}` : ""));
}

module.exports = {
  folder,
  // MEMORY.md for the next question (cut if it grew too long)
  index() {
    try { return index(""); } catch { return ""; }
  },
  run(args = {}) {
    try {
      const action = String(args.action || "");
      if (action === "save") return save(args);
      if (action === "read") return read(args);
      if (action === "delete") return remove(args);
      if (action === "list") return index(args.project || "") || "No memories saved yet.";
      // For the server, at the start of each answer: the list and the rules in full
      if (action === "index") return JSON.stringify({ index: index(args.project || ""), rules: rules(args.project || ""), folder: folder() });
      return 'Error: action must be "save", "read", "delete" or "list".';
    } catch (e) {
      return `Error: ${e.message}`;
    }
  },
};
