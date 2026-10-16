import path from "path";
import { NodeSSH } from "node-ssh";
import IdeProject from "../models/IdeProject.js";
import User from "../models/User.js";
import connectDB from "../../config/db.js";
import redis from "../config/redis.js";

// File tools for a Project Mode project (the code the user and the AI share). Everything runs on the sandbox as
// the normal user, inside the project folder only. Pushing adds the owner's GitHub key just for that one command,
// so the key never ends up in the sandbox.

const MAX_FILE_BYTES = 2 * 1024 * 1024;

export async function sandboxSsh() {
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

export const projectHostDir = (p) => `/home/ubuntu/ide_users/${p.owner}/projects/${p._id}`;
const q = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;

export async function projectForChat(sessionId) {
  await connectDB();
  return IdeProject.findOne({ chatSessionIds: sessionId }).lean();
}

// Paths may be given relative to the project, or as /data/project/... or /home/workspace/projects/<id>/...
function resolveInProject(project, givenPath = "") {
  const root = projectHostDir(project);
  let rel = String(givenPath || "").trim().replace(/\\/g, "/");
  for (const prefix of ["/data/project", `/home/workspace/projects/${project._id}`]) {
    if (rel === prefix) rel = "";
    else if (rel.startsWith(prefix + "/")) rel = rel.slice(prefix.length + 1);
  }
  if (rel.startsWith("/")) throw new Error(`Path must be inside the project (relative, /data/project/... or /home/workspace/projects/${project._id}/...)`);
  const full = path.posix.normalize(path.posix.join(root, rel || "."));
  if (full !== root && !full.startsWith(root + "/")) throw new Error("Path must stay inside the project");
  if (full.split("/").includes(".git")) throw new Error("The .git folder can't be changed directly");
  return { root, full, rel: path.posix.relative(root, full) || "." };
}

async function withProject(sessionId, fn) {
  const project = await projectForChat(sessionId);
  if (!project) return "No project is open in this chat. The user opens one in Project Mode.";
  let ssh;
  try {
    ssh = await sandboxSsh();
    return await fn(project, ssh);
  } catch (e) {
    return `Error: ${e.message}`;
  } finally {
    ssh?.dispose();
  }
}

async function readText(ssh, full) {
  const { stdout: size } = await ssh.execCommand(`[ -f ${q(full)} ] && stat -c %s ${q(full)}`);
  if (!size.trim()) throw new Error("File not found");
  if (Number(size) > MAX_FILE_BYTES) throw new Error("File is too big to open here (over 2 MB)");
  const { stdout, code } = await ssh.execCommand(`base64 -w0 ${q(full)}`);
  if (code) throw new Error("Could not read the file");
  return Buffer.from(stdout, "base64").toString("utf8");
}

async function writeText(ssh, full, content) {
  const res = await ssh.execCommand(`mkdir -p ${q(path.posix.dirname(full))} && base64 -d > ${q(full)}`, { stdin: Buffer.from(content, "utf8").toString("base64") });
  if (res.code) throw new Error(res.stderr || "Could not write the file");
}

// Real change between two versions of a file: lines added and removed (each line counted as many times as it appears)
function lineChange(before, after) {
  const count = new Map();
  for (const l of before.split("\n")) count.set(l, (count.get(l) || 0) + 1);
  let added = 0;
  for (const l of after.split("\n")) {
    const n = count.get(l) || 0;
    if (n > 0) count.set(l, n - 1);
    else added++;
  }
  let removed = 0;
  for (const n of count.values()) removed += n;
  return { added, removed };
}

// The file's exact text for every place where old_text's lines appear with only spaces at line starts/ends different
function findLooseLines(text, oldText) {
  const lines = text.split("\n");
  const want = oldText.split("\n").map((l) => l.trim());
  while (want.length && !want[want.length - 1]) want.pop();
  while (want.length && !want[0]) want.shift();
  if (!want.length) return [];
  const found = [];
  for (let s = 0; s + want.length <= lines.length; s++) {
    if (want.every((w, j) => lines[s + j].trim() === w)) found.push(lines.slice(s, s + want.length).join("\n"));
  }
  return found;
}

// When old_text isn't in the file: the file's lines that look most like its first line, to copy from
function closestLines(text, oldText) {
  const first = oldText.split("\n").map((l) => l.trim()).find(Boolean);
  if (!first) return "";
  const words = first.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
  if (!words.length) return "";
  const scored = text.split("\n").map((l, i) => ({ n: i + 1, l, score: words.filter((w) => l.toLowerCase().includes(w)).length }))
    .filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 3).sort((a, b) => a.n - b.n);
  return scored.length ? ` Closest lines in the file: ${scored.map((x) => `${x.n}: ${x.l.trim().slice(0, 160)}`).join(" | ")}` : " The file has no similar line; read it with view_project_file first.";
}

// After the AI changes a file: the errors the user's editor now shows in it (TypeScript, ESLint...). The editor
// re-checks a moment after the file changes; when it hasn't reported anything new, nothing is added.
async function problemsAfterWrite(ssh, project, full) {
  const since = Date.now();
  const ctxFile = `/home/ubuntu/ide_users/${project.owner}/.classgrid/context.json`;
  const inBox = full.replace(`/home/ubuntu/ide_users/${project.owner}`, "/home/workspace");
  for (let i = 0; i < 4; i++) {
    await new Promise((r) => setTimeout(r, 900));
    const { stdout } = await ssh.execCommand(`cat ${q(ctxFile)} 2>/dev/null`);
    let ctx = null;
    try { ctx = JSON.parse(stdout); } catch {}
    if (!ctx || (ctx.updatedAt || 0) < since) continue;
    const mine = (ctx.problems || []).filter((p) => p.file === inBox);
    if (!mine.length) return "";
    return `\nEditor problems in this file now (${mine.length}):\n${mine.slice(0, 15).map((p) => `- line ${p.line} ${p.severity}: ${p.message}`).join("\n")}`;
  }
  return "";
}

export const projectTools = {
  list_project_files: (sessionId, { path: dir = "", depth = 2 }) => withProject(sessionId, async (project, ssh) => {
    const { full, rel } = resolveInProject(project, dir);
    const d = Math.min(Math.max(Number(depth) || 2, 1), 6);
    const { stdout } = await ssh.execCommand(
      `cd ${q(full)} && find . -mindepth 1 -maxdepth ${d} \\( -name node_modules -o -name .git \\) -prune -o -printf '%y %P\\n' | sort -k2 | head -500`
    );
    const lines = stdout.trim().split("\n").filter(Boolean).map((l) => (l.startsWith("d ") ? `${l.slice(2)}/` : l.slice(2)));
    return `Project folder: ${rel === "." ? "/" : rel} (also /data/project${rel === "." ? "" : "/" + rel})\n${lines.join("\n") || "(empty)"}${lines.length >= 500 ? "\n… (first 500 entries)" : ""}`;
  }),

  view_project_file: (sessionId, { path: file, start_line, end_line }) => withProject(sessionId, async (project, ssh) => {
    const { full, rel } = resolveInProject(project, file);
    const lines = (await readText(ssh, full)).split("\n");
    const start = Math.max(1, Number(start_line) || 1);
    const end = Math.min(lines.length, Number(end_line) || Math.min(lines.length, start + 799));
    const body = lines.slice(start - 1, end).map((l, i) => `${start + i}: ${l}`).join("\n");
    return `${rel} (lines ${start}-${end} of ${lines.length})\n${body}`;
  }),

  search_project: (sessionId, { query, path: dir = "", regex = false }) => withProject(sessionId, async (project, ssh) => {
    if (!query) return "Error: query is empty";
    const { full } = resolveInProject(project, dir);
    const { stdout } = await ssh.execCommand(
      `cd ${q(projectHostDir(project))} && grep -rnI ${regex ? "-E" : "-F"} --exclude-dir=node_modules --exclude-dir=.git -f - -- ${q(path.posix.relative(projectHostDir(project), full) || ".")} | head -200 | cut -c1-300`,
      { stdin: String(query) }
    );
    return stdout.trim() || "No matches.";
  }),

  write_project_file: (sessionId, { path: file, content = "", overwrite = false }) => withProject(sessionId, async (project, ssh) => {
    const { full, rel } = resolveInProject(project, file);
    const { stdout: exists } = await ssh.execCommand(`[ -e ${q(full)} ] && echo yes`);
    if (exists.trim() && !overwrite) return `Error: ${rel} already exists. Set overwrite to true to replace it.`;
    const before = exists.trim() ? await readText(ssh, full) : null;
    await writeText(ssh, full, String(content));
    const total = String(content).split("\n").length;
    const { added, removed } = before !== null ? lineChange(before, String(content)) : { added: total, removed: 0 };
    return `${before !== null ? "Replaced" : "Created"} ${rel} (${total} lines, +${added} -${removed}).${await problemsAfterWrite(ssh, project, full)}`;
  }),

  // One or more edits in one file. Each edit replaces old_text (which must be found exactly, once unless
  // allow_multiple) with new_text; start_line/end_line, when given, limit where old_text is looked for.
  // Line endings never matter (the file keeps its own); when the exact text isn't there, the same lines with
  // different spaces at their start/end are accepted if they appear exactly once.
  edit_project_file: (sessionId, { path: file, edits = [] }) => withProject(sessionId, async (project, ssh) => {
    const { full, rel } = resolveInProject(project, file);
    if (!Array.isArray(edits) || !edits.length) return "Error: edits is empty";
    const raw = await readText(ssh, full);
    const eol = raw.includes("\r\n") ? "\r\n" : "\n";
    let text = raw.replace(/\r\n/g, "\n");
    const original = text;
    const done = [];
    for (const [i, e] of edits.entries()) {
      let oldText = String(e?.old_text ?? "").replace(/\r\n/g, "\n");
      const newText = String(e?.new_text ?? "").replace(/\r\n/g, "\n");
      if (!oldText) return `Error in edit ${i + 1}: old_text is empty`;
      if (!text.includes(oldText)) {
        const loose = findLooseLines(text, oldText);
        if (loose.length === 1) oldText = loose[0];
        else if (loose.length > 1) return `Error in edit ${i + 1}: old_text matches ${loose.length} places (ignoring spaces). Add more surrounding text or a line range. Nothing was changed.`;
        else return `Error in edit ${i + 1}: old_text was not found${e.start_line || e.end_line ? " in that line range" : ""}. Nothing was changed.${closestLines(text, oldText)}`;
      }
      let from = 0;
      let to = text.length;
      if (e.start_line || e.end_line) {
        const lines = text.split("\n");
        const s = Math.max(1, Number(e.start_line) || 1);
        const en = Math.min(lines.length, Number(e.end_line) || lines.length);
        from = lines.slice(0, s - 1).reduce((n, l) => n + l.length + 1, 0);
        to = lines.slice(0, en).reduce((n, l) => n + l.length + 1, 0);
      }
      const part = text.slice(from, to);
      const count = part.split(oldText).length - 1;
      if (!count) return `Error in edit ${i + 1}: old_text was not found${e.start_line || e.end_line ? " in that line range" : ""}. Nothing was changed.`;
      if (count > 1 && !e.allow_multiple) return `Error in edit ${i + 1}: old_text was found ${count} times. Add more surrounding text, a line range, or set allow_multiple. Nothing was changed.`;
      text = text.slice(0, from) + part.split(oldText).join(newText) + text.slice(to);
      done.push(`edit ${i + 1}: ${count} place${count > 1 ? "s" : ""}`);
    }
    await writeText(ssh, full, eol === "\n" ? text : text.replace(/\n/g, eol));
    const { added, removed } = lineChange(original, text);
    return `Edited ${rel} (${done.join(", ")}, +${added} -${removed}).${await problemsAfterWrite(ssh, project, full)}`;
  }),

  push_project_to_github: (sessionId, { message }) => withProject(sessionId, (project, ssh) => pushProject(project, ssh, message)),
};

export async function pushProject(project, ssh, message) {
  if (!project.repo) return "This project has no GitHub repo linked.";
  const msg = String(message || "").trim().slice(0, 500);
  if (!msg) return "Error: a commit message is needed";
  await connectDB();
  const owner = await User.findById(project.owner).select("github_access_token");
  if (!owner?.github_access_token) return "GitHub is not connected. The user connects it in AI Hub, then tries again.";

  const dir = projectHostDir(project);
  const { stdout: isRepo } = await ssh.execCommand(`[ -d ${q(dir)}/.git ] && echo yes`);
  if (!isRepo.trim()) return "The project code is not downloaded. Open the project in Project Mode first.";

  await ssh.execCommand(`git -C ${q(dir)} add -A`);
  const { stdout: staged } = await ssh.execCommand(`git -C ${q(dir)} diff --cached --stat | tail -1`);
  if (staged.trim()) {
    const commit = await ssh.execCommand(`git -C ${q(dir)} commit -q -F -`, { stdin: msg });
    if (commit.code) return `Commit failed: ${(commit.stderr || commit.stdout).slice(0, 500)}`;
  }
  const { stdout: branch } = await ssh.execCommand(`git -C ${q(dir)} rev-parse --abbrev-ref HEAD`);
  const auth = Buffer.from(`x-access-token:${owner.github_access_token}`).toString("base64");
  const push = await ssh.execCommand(
    `GIT_TERMINAL_PROMPT=0 GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=http.https://github.com/.extraheader GIT_CONFIG_VALUE_0="AUTHORIZATION: basic ${auth}" ` +
    `git -C ${q(dir)} push origin HEAD 2>&1 | tail -5`
  );
  const out = (push.stdout || push.stderr || "").split(auth).join("***");
  if (/rejected|error|fatal/i.test(out)) return `Push failed: ${out.slice(0, 800)}`;
  return `${staged.trim() ? `Committed (${staged.trim()}) and pushed` : "Nothing new to commit; pushed"} to ${project.repo} (${branch.trim() || "current branch"}).`;
}

// Open a project file in the owner's code editor at given lines (or at the given text). The Classgrid add-on in
// the editor box watches /home/workspace/.classgrid/open.json and opens what it names.
export async function revealInEditor(project, ssh, { path: file, startLine, endLine, find }) {
  const { full } = resolveInProject(project, file);
  const inBox = full.replace(`/home/ubuntu/ide_users/${project.owner}`, "/home/workspace");
  const req = JSON.stringify({
    path: inBox,
    startLine: Number(startLine) || undefined,
    endLine: Number(endLine) || undefined,
    find: find ? String(find).slice(0, 2000) : undefined,
    stamp: Date.now(),
  });
  const dir = `/home/ubuntu/ide_users/${project.owner}/.classgrid`;
  const res = await ssh.execCommand(`mkdir -p ${q(dir)} && cat > ${q(dir)}/open.tmp && mv ${q(dir)}/open.tmp ${q(dir)}/open.json`, { stdin: req });
  if (res.code) throw new Error("Could not open the file in the editor");
}

// Which project files a code/terminal run changed: a snapshot of the whole folder (as a git tree, without touching
// the user's git index) before and after the run, then the difference between the two.
export async function projectSnapshot(ssh, project) {
  const dir = projectHostDir(project);
  const idx = `/tmp/cg-index-${project._id}-${Date.now()}`;
  const { stdout, code } = await ssh.execCommand(
    `[ -d ${q(dir)}/.git ] && cd ${q(dir)} && GIT_INDEX_FILE=${idx} git add -A . 2>/dev/null && GIT_INDEX_FILE=${idx} git write-tree; rm -f ${idx}`
  );
  return code === 0 && /^[0-9a-f]{40}$/.test(stdout.trim()) ? stdout.trim() : null;
}

export async function projectChangesBetween(ssh, project, before, after) {
  if (!before || !after || before === after) return [];
  const { stdout } = await ssh.execCommand(`git -C ${q(projectHostDir(project))} diff --numstat ${before} ${after} | head -50`);
  return stdout.trim().split("\n").filter(Boolean).map((l) => {
    const [a, r, ...file] = l.split("\t");
    return { file: file.join("\t"), added: Number(a) || 0, removed: Number(r) || 0 };
  });
}

export const formatProjectChanges = (changes) =>
  changes.length ? `\n\nFILES CHANGED IN PROJECT:\n${changes.map((c) => `+${c.added} -${c.removed} ${c.file}`).join("\n")}` : "";

// ── What the user sees in the editor, for the AI ─────────────────────────────────────────────────────────
// Read from the user's own editor box (the Classgrid add-on keeps .classgrid/context.json up to date), plus the
// changes the user made themselves since the AI's last answer (project snapshot at the end of each answer).
const LAST_SNAPSHOT = (sessionId) => `ide:lastsnap:${sessionId}`;

export async function rememberProjectSnapshot(sessionId) {
  const project = await projectForChat(sessionId);
  if (!project) return;
  let ssh;
  try {
    ssh = await sandboxSsh();
    const snap = await projectSnapshot(ssh, project);
    if (snap) await redis.set(LAST_SNAPSHOT(sessionId), snap, "EX", 7 * 24 * 60 * 60);
  } finally {
    ssh?.dispose();
  }
}

export async function editorContextFor(sessionId) {
  const project = await projectForChat(sessionId);
  if (!project) return "";
  let ssh;
  try {
    ssh = await sandboxSsh();
    const root = `/home/workspace/projects/${project._id}`;
    const rel = (p) => (p && p.startsWith(root + "/") ? p.slice(root.length + 1) : p);
    const lines = [
      `Project: ${project.name}${project.repo ? ` (GitHub ${project.repo})` : ""}. Its files are at ${root}/ (the same files at /data/project/). Paths below are relative to it.`,
    ];

    const { stdout } = await ssh.execCommand(`cat ${q(`/home/ubuntu/ide_users/${project.owner}/.classgrid/context.json`)} 2>/dev/null`);
    let ctx = null;
    try { ctx = JSON.parse(stdout); } catch {}
    if (ctx && Date.now() - (ctx.updatedAt || 0) < 6 * 60 * 60 * 1000) {
      if (ctx.activeFile) lines.push(`Open in the editor now: ${rel(ctx.activeFile)}${ctx.cursorLine ? `, cursor on line ${ctx.cursorLine}` : ""}.`);
      if (ctx.selection?.text) lines.push(`Selected by the user (lines ${ctx.selection.startLine}-${ctx.selection.endLine}):\n\`\`\`\n${ctx.selection.text}\n\`\`\``);
      const others = (ctx.openTabs || []).filter((t) => t !== ctx.activeFile).map(rel);
      if (others.length) lines.push(`Other open tabs: ${others.join(", ")}.`);
      if (ctx.problemCount) {
        lines.push(`Problems the editor shows (${ctx.problemCount}${ctx.problemCount > ctx.problems.length ? `, first ${ctx.problems.length}` : ""}):\n` +
          ctx.problems.map((p) => `- ${rel(p.file)}:${p.line} ${p.severity}: ${p.message}${p.source ? ` (${p.source})` : ""}`).join("\n"));
      }
    }

    const prev = await redis.get(LAST_SNAPSHOT(sessionId)).catch(() => null);
    const now = prev ? await projectSnapshot(ssh, project) : null;
    if (prev && now && prev !== now) {
      const { stdout: diff } = await ssh.execCommand(`git -C ${q(projectHostDir(project))} diff --unified=2 ${prev} ${now} | head -c 6000`);
      if (diff.trim()) lines.push(`Changes the user made in the editor since your last answer:\n\`\`\`diff\n${diff.trim()}\n\`\`\``);
    }
    return `\n\n<project_editor>\n${lines.join("\n")}\n</project_editor>`;
  } catch {
    return "";
  } finally {
    ssh?.dispose();
  }
}
