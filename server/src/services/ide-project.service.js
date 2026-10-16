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

// Newest file change on disk (node_modules and .git skipped), as a Date, or null if there is nothing to read.
// Used to persist the real "last edited" time before the project code leaves the sandbox.
async function newestFileEdit(ssh, project) {
  const dir = projectHostDir(project);
  const { stdout } = await ssh.execCommand(
    `[ -d ${q(dir)} ] && find ${q(dir)} \\( -name node_modules -o -name .git \\) -prune -o -type f -printf '%T@\\n' 2>/dev/null | sort -n | tail -1`
  );
  const secs = parseFloat(String(stdout).trim());
  return Number.isFinite(secs) ? new Date(Math.round(secs * 1000)) : null;
}

export async function projectForChat(sessionId) {
  await connectDB();
  return IdeProject.findOne({ chatSessionIds: sessionId }).lean();
}

// Paths may be given relative to the project, or as /data/... or /home/workspace/projects/<id>/...
function resolveInProject(project, givenPath = "") {
  const root = projectHostDir(project);
  let rel = String(givenPath || "").trim().replace(/\\/g, "/");
  for (const prefix of [`/home/workspace/projects/${project._id}`, "/data"]) {
    if (rel === prefix) rel = "";
    else if (rel.startsWith(prefix + "/")) rel = rel.slice(prefix.length + 1);
  }
  if (rel.startsWith("/")) throw new Error(`Path must be inside the project (relative, /data/... or /home/workspace/projects/${project._id}/...)`);
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
    return `Project folder: ${rel === "." ? "/" : rel} (also /data${rel === "." ? "" : "/" + rel})\n${lines.join("\n") || "(empty)"}${lines.length >= 500 ? "\n… (first 500 entries)" : ""}`;
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

  // New files only. A file that already exists is always changed with edit_project_file, never replaced whole.
  write_project_file: (sessionId, { path: file, content = "" }) => withProject(sessionId, async (project, ssh) => {
    const { full, rel } = resolveInProject(project, file);
    const { stdout: exists } = await ssh.execCommand(`[ -e ${q(full)} ] && echo yes`);
    if (exists.trim()) return `Error: ${rel} already exists, so it was not changed. Change existing files with edit_project_file.`;
    await writeText(ssh, full, String(content));
    const total = String(content).split("\n").length;
    return `Created ${rel} (${total} lines, +${total} -0).${await problemsAfterWrite(ssh, project, full)}`;
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

  create_github_repo_for_project: (sessionId, args) => withProject(sessionId, (project, ssh) => createRepoForProject(project, ssh, args || {})),

  update_project_github_repo: (sessionId, args) => withProject(sessionId, (project, ssh) => updateProjectRepo(project, ssh, args || {})),
};

// Rename the project's GitHub repo or change its description, website or public/private setting.
// A new name is also saved on the project and in the downloaded code, so pushing keeps working.
export async function updateProjectRepo(project, ssh, { new_name, description, homepage, private: isPrivate }) {
  if (!project.repo) return "This project has no GitHub repo yet. Create one with create_github_repo_for_project.";
  const body = {};
  if (new_name !== undefined) {
    const n = String(new_name).trim();
    if (!/^[A-Za-z0-9._-]{1,100}$/.test(n)) return "Error: the repo name can only use letters, numbers, dots, dashes and underscores.";
    body.name = n;
  }
  if (description !== undefined) body.description = String(description).slice(0, 300);
  if (homepage !== undefined) body.homepage = String(homepage).slice(0, 300);
  if (isPrivate !== undefined) body.private = !!isPrivate;
  if (!Object.keys(body).length) return "Error: nothing to change. Give new_name, description, homepage or private.";
  await connectDB();
  const owner = await User.findById(project.owner).select("github_access_token");
  if (!owner?.github_access_token) return "GitHub is not connected. The user connects it in AI Hub, then tries again.";

  const ghRes = await fetch(`https://api.github.com/repos/${project.repo}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${owner.github_access_token}`, Accept: "application/vnd.github+json", "User-Agent": "Classgrid", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const gh = await ghRes.json().catch(() => ({}));
  if (ghRes.status === 401) return "GitHub refused the saved key. The user reconnects GitHub in AI Hub, then tries again.";
  if (!ghRes.ok) return `Could not change the repo: ${gh.errors?.[0]?.message || gh.message || ghRes.status}`;

  const old = project.repo;
  if (gh.full_name && gh.full_name !== old) {
    await IdeProject.updateOne({ _id: project._id }, { $set: { repo: gh.full_name } });
    project.repo = gh.full_name;
    const dir = projectHostDir(project);
    await ssh.execCommand(`[ -d ${q(dir)}/.git ] && git -C ${q(dir)} remote set-url origin ${q(`https://github.com/${gh.full_name}.git`)}`);
  }
  const changed = [
    gh.full_name !== old && `renamed ${old} to ${gh.full_name}`,
    body.description !== undefined && "description updated",
    body.homepage !== undefined && "website updated",
    body.private !== undefined && `now ${gh.private ? "private" : "public"}`,
  ].filter(Boolean);
  return `Repo ${gh.full_name} (${gh.html_url}): ${changed.join(", ")}.`;
}

// A project made without a repo: make a new repo on the user's GitHub account, link it to the project and push the
// project's files to it, so it can be downloaded again later.
export async function createRepoForProject(project, ssh, { name, private: isPrivate = true, description }) {
  if (project.repo) return `This project is already linked to ${project.repo}.`;
  const repoName = String(name || "").trim();
  if (!/^[A-Za-z0-9._-]{1,100}$/.test(repoName)) return "Error: the repo name can only use letters, numbers, dots, dashes and underscores.";
  await connectDB();
  const owner = await User.findById(project.owner).select("github_access_token github_name github_email");
  if (!owner?.github_access_token) return "GitHub is not connected. The user connects it in AI Hub, then tries again.";

  const ghRes = await fetch("https://api.github.com/user/repos", {
    method: "POST",
    headers: { Authorization: `Bearer ${owner.github_access_token}`, Accept: "application/vnd.github+json", "User-Agent": "Classgrid", "Content-Type": "application/json" },
    body: JSON.stringify({ name: repoName, private: isPrivate !== false, description: description ? String(description).slice(0, 300) : undefined }),
  });
  const gh = await ghRes.json().catch(() => ({}));
  if (ghRes.status === 401) return "GitHub refused the saved key. The user reconnects GitHub in AI Hub, then tries again.";
  if (!ghRes.ok) return `Could not create the repo: ${gh.errors?.[0]?.message || gh.message || ghRes.status}`;

  await IdeProject.updateOne({ _id: project._id }, { $set: { repo: gh.full_name } });
  project.repo = gh.full_name;

  const dir = projectHostDir(project);
  const branch = gh.default_branch || "main";
  await ssh.execCommand(`mkdir -p ${q(dir)} && cd ${q(dir)} && ([ -d .git ] || git init -q -b ${q(branch)})`);
  await ssh.execCommand(`git -C ${q(dir)} remote remove origin 2>/dev/null; git -C ${q(dir)} remote add origin ${q(`https://github.com/${gh.full_name}.git`)}`);
  await ssh.execCommand(`git -C ${q(dir)} config user.name ${q(owner.github_name || "Classgrid")} && git -C ${q(dir)} config user.email ${q(owner.github_email || "code@classgrid.in")}`);
  await ssh.execCommand(`git -C ${q(dir)} add -A`);
  const { stdout: staged } = await ssh.execCommand(`git -C ${q(dir)} diff --cached --stat | tail -1`);
  if (staged.trim()) await ssh.execCommand(`git -C ${q(dir)} commit -q -m "First version"`);
  const { stdout: hasCommit } = await ssh.execCommand(`git -C ${q(dir)} rev-parse -q --verify HEAD`);
  if (!hasCommit.trim()) return `Created ${gh.private ? "private" : "public"} repo ${gh.full_name} (${gh.html_url}) and linked it to this project. The project has no files yet, so nothing was pushed.`;
  const auth = Buffer.from(`x-access-token:${owner.github_access_token}`).toString("base64");
  const push = await ssh.execCommand(
    `GIT_TERMINAL_PROMPT=0 GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=http.https://github.com/.extraheader GIT_CONFIG_VALUE_0="AUTHORIZATION: basic ${auth}" ` +
    `git -C ${q(dir)} push -u origin HEAD:${q(branch)} 2>&1 | tail -5`
  );
  const out = (push.stdout || push.stderr || "").split(auth).join("***");
  if (/rejected|error|fatal/i.test(out)) return `Created and linked ${gh.full_name}, but the first push failed: ${out.slice(0, 800)}`;
  return `Created ${gh.private ? "private" : "public"} repo ${gh.full_name} (${gh.html_url}), linked it to this project and pushed the project's files${staged.trim() ? ` (${staged.trim()})` : ""}.`;
}

export async function pushProject(project, ssh, message) {
  if (!project.repo) return "This project has no GitHub repo yet. Create one with create_github_repo_for_project.";
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
  const { full, rel } = resolveInProject(project, file);
  const { stdout: kind } = await ssh.execCommand(`if [ -d ${q(full)} ]; then echo folder; elif [ -f ${q(full)} ]; then echo file; fi`);
  if (!kind.trim()) throw new Error(`${rel} is not in this project`);
  const folder = kind.trim() === "folder";
  const inBox = full.replace(`/home/ubuntu/ide_users/${project.owner}`, "/home/workspace");
  const req = JSON.stringify({
    path: inBox,
    folder: folder || undefined,
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

// Only sent in Project Mode chats (a chat linked to a project); normal Agent chats never get these
const PROJECT_MODE_RULES = `PROJECT MODE RULES (this chat is in Project Mode; they don't apply to normal Agent chats):
- The user's project is the work. Create and change files only inside the project (/data is the project, and the user sees it live in their code editor). Every script, page or file you make is saved there.
- No download links and no uploads: don't upload files to the CDN or the Library, don't make files only to be downloaded, and never offer to save something so the user can download it. To point at a file, write its path in the project (the user can click it to open it in the editor).
- No extra notes, reports or markdown files unless the user asks for that file in the project; answer in the chat instead.
- Downloads and handing over files are for Agent mode (the normal chat), not here.
- After a task, if you are not sure it really works, test it in the terminal and show the user the proof.`;

// A chat sent from Project Mode belongs to the project that is open there (only the owner's own projects)
export async function linkChatToProject(userId, projectId, sessionId) {
  await connectDB();
  const project = await IdeProject.findOne({ _id: projectId, owner: userId }).select("_id");
  if (!project) return;
  await IdeProject.updateMany({ owner: userId, chatSessionIds: sessionId, _id: { $ne: project._id } }, { $pull: { chatSessionIds: sessionId } });
  await IdeProject.updateOne({ _id: project._id }, { $addToSet: { chatSessionIds: sessionId } });
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
      PROJECT_MODE_RULES,
      `Project: ${project.name}${project.repo ? ` (GitHub ${project.repo})` : " (no GitHub repo yet)"}. Its files are at ${root}/ (the same files at /data/). Paths below are relative to it.`,
    ];

    const { stdout: hasCode } = await ssh.execCommand(`[ -n "$(ls -A ${q(projectHostDir(project))} 2>/dev/null)" ] && echo yes`);
    if (!hasCode.trim()) lines.push("The project's code is not downloaded right now (it leaves our servers a few minutes after the user closes the editor). The user can open the project in Project Mode to download it again.");
    const { stdout } = await ssh.execCommand(`cat ${q(`/home/ubuntu/ide_users/${project.owner}/.classgrid/context.json`)} 2>/dev/null`);
    let ctx = null;
    try { ctx = JSON.parse(stdout); } catch {}
    if (ctx && Date.now() - (ctx.updatedAt || 0) < 6 * 60 * 60 * 1000) {
      if (ctx.activeFile) lines.push(`Open in the editor now: ${rel(ctx.activeFile)}${ctx.cursorLine ? `, cursor on line ${ctx.cursorLine}` : ""}.`);
      if (ctx.selection?.text) lines.push(`Selected by the user (lines ${ctx.selection.startLine}-${ctx.selection.endLine}):\n\`\`\`\n${ctx.selection.text}\n\`\`\``);
      const others = (ctx.openTabs || []).filter((t) => t !== ctx.activeFile).map(rel);
      if (others.length) lines.push(`Other open tabs: ${others.join(", ")}.`);
    }

    // The user's own changes since the AI's last answer, and which lines they touched (to mark errors on them)
    let userDiff = "";
    const touched = new Map(); // file (relative) -> [[from, to], ...] lines in the new version
    const prev = await redis.get(LAST_SNAPSHOT(sessionId)).catch(() => null);
    const now = prev ? await projectSnapshot(ssh, project) : null;
    if (prev && now && prev !== now) {
      const { stdout: diff } = await ssh.execCommand(`git -C ${q(projectHostDir(project))} diff --unified=2 ${prev} ${now} | head -c 6000`);
      userDiff = diff.trim();
      let file = null;
      for (const l of userDiff.split("\n")) {
        const f = l.match(/^\+\+\+ b\/(.+)$/);
        if (f) { file = f[1]; continue; }
        const h = l.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
        if (h && file) {
          const from = Number(h[1]);
          const to = from + Math.max(Number(h[2] ?? 1) - 1, 0);
          touched.set(file, [...(touched.get(file) || []), [from, to]]);
        }
      }
    }
    const onUserChange = (p) => (touched.get(rel(p.file)) || []).some(([a, b]) => p.line >= a && p.line <= b);

    if (ctx?.problemCount && Date.now() - (ctx.updatedAt || 0) < 6 * 60 * 60 * 1000) {
      lines.push(`Problems the editor shows (${ctx.problemCount}${ctx.problemCount > ctx.problems.length ? `, first ${ctx.problems.length}` : ""}):\n` +
        ctx.problems.map((p) => `- ${rel(p.file)}:${p.line} ${p.severity}: ${p.message}${p.source ? ` (${p.source})` : ""}${onUserChange(p) ? " (on a line the user just changed)" : ""}`).join("\n"));
    }
    if (userDiff) lines.push(`Changes the user made in the editor since your last answer:\n\`\`\`diff\n${userDiff}\n\`\`\``);
    return `\n\n<project_editor>\n${lines.join("\n")}\n</project_editor>`;
  } catch {
    return "";
  } finally {
    ssh?.dispose();
  }
}

// Where /data is for a chat's sandbox on the sandbox server: in a Project Mode chat it IS the project (the AI
// works only in the user's repo), otherwise the chat's own folder.
export async function sandboxDataDir(sessionId) {
  const project = await projectForChat(sessionId).catch(() => null);
  return project ? projectHostDir(project) : `/home/ubuntu/sandbox_data/${sessionId}`;
}

// ── Checkpoints: the project before and after each AI answer, for Review / Accept / Reject / Undo ───────────────
// Saved as local git commits under refs/classgrid/ in the project (never pushed, and gone when the project is
// downloaded fresh). The user's own git index and branches are never touched.
const CP_KEY = (sessionId, id) => `ide:cp:${sessionId}:${id}`;
const CP_TTL = 30 * 24 * 60 * 60;

async function snapshotCommit(ssh, project, label) {
  const dir = projectHostDir(project);
  const tree = await projectSnapshot(ssh, project);
  if (!tree) return null;
  const { stdout, code } = await ssh.execCommand(
    `git -C ${q(dir)} -c user.name=Classgrid -c user.email=checkpoint@classgrid.in commit-tree ${tree} -m ${q(label)}`
  );
  const commit = stdout.trim();
  if (code || !/^[0-9a-f]{40}$/.test(commit)) return null;
  await ssh.execCommand(`git -C ${q(dir)} update-ref refs/classgrid/${label} ${commit}`);
  return commit;
}

export async function startCheckpoint(sessionId) {
  const project = await projectForChat(sessionId);
  if (!project) return null;
  let ssh;
  try {
    ssh = await sandboxSsh();
    const id = `${Date.now()}`;
    const before = await snapshotCommit(ssh, project, `cp-${id}-before`);
    if (!before) return null;
    await redis.set(CP_KEY(sessionId, id), JSON.stringify({ project: String(project._id), before, after: null }), "EX", CP_TTL);
    return id;
  } catch {
    return null;
  } finally {
    ssh?.dispose();
  }
}

export async function finishCheckpoint(sessionId, id) {
  if (!id) return;
  const project = await projectForChat(sessionId);
  const cp = JSON.parse((await redis.get(CP_KEY(sessionId, id))) || "null");
  if (!project || !cp) return;
  let ssh;
  try {
    ssh = await sandboxSsh();
    cp.after = await snapshotCommit(ssh, project, `cp-${id}-after`);
    await redis.set(CP_KEY(sessionId, id), JSON.stringify(cp), "EX", CP_TTL);
  } finally {
    ssh?.dispose();
  }
}

async function loadCheckpoint(project, sessionId, id, ssh) {
  if (!/^\d+$/.test(String(id))) throw new Error("Unknown checkpoint");
  const cp = JSON.parse((await redis.get(CP_KEY(sessionId, id))) || "null");
  if (!cp || cp.project !== String(project._id)) throw new Error("This answer's changes can't be reviewed anymore");
  const dir = projectHostDir(project);
  const { code } = await ssh.execCommand(`git -C ${q(dir)} cat-file -e ${cp.before}`);
  if (code) throw new Error("This answer's changes can't be reviewed anymore (the project was downloaded fresh)");
  return { cp, dir };
}

// The AI's changes in one answer: each file with +/- and its diff
export async function checkpointChanges(project, ssh, sessionId, id) {
  const { cp, dir } = await loadCheckpoint(project, sessionId, id, ssh);
  const after = cp.after || (await snapshotCommit(ssh, project, `cp-${id}-now`));
  const { stdout: stat } = await ssh.execCommand(`git -C ${q(dir)} diff --numstat ${cp.before} ${after} | head -100`);
  const { stdout: status } = await ssh.execCommand(`git -C ${q(dir)} diff --name-status ${cp.before} ${after} | head -100`);
  const kinds = Object.fromEntries(status.trim().split("\n").filter(Boolean).map((l) => { const [k, ...f] = l.split("\t"); return [f.join("\t"), k[0]]; }));
  const files = [];
  for (const line of stat.trim().split("\n").filter(Boolean)) {
    const [a, r, ...f] = line.split("\t");
    const file = f.join("\t");
    const { stdout: diff } = await ssh.execCommand(`git -C ${q(dir)} diff --unified=3 ${cp.before} ${after} -- ${q(file)} | head -c 60000`);
    files.push({ file, added: Number(a) || 0, removed: Number(r) || 0, kind: { A: "added", D: "deleted" }[kinds[file]] || "changed", diff });
  }
  return { files, finished: !!cp.after };
}

// Reject: put back what the file(s) were before this answer (files the AI created are removed)
export async function rejectCheckpoint(project, ssh, sessionId, id, onlyFile) {
  const { cp, dir } = await loadCheckpoint(project, sessionId, id, ssh);
  const after = cp.after || (await snapshotCommit(ssh, project, `cp-${id}-now`));
  const { stdout } = await ssh.execCommand(`git -C ${q(dir)} diff --name-status ${cp.before} ${after}`);
  let entries = stdout.trim().split("\n").filter(Boolean).map((l) => { const [k, ...f] = l.split("\t"); return { kind: k[0], file: f.join("\t") }; });
  if (onlyFile) entries = entries.filter((e) => e.file === onlyFile);
  for (const e of entries) {
    const { full } = resolveInProject(project, e.file);
    if (e.kind === "A") await ssh.execCommand(`rm -f ${q(full)}`);
    else await ssh.execCommand(`mkdir -p ${q(path.posix.dirname(full))} && git -C ${q(dir)} show ${cp.before}:${q(e.file)} > ${q(full)}`);
  }
  return entries.length;
}

// Undo: the whole project back to how it was before this answer (later changes are undone too)
export async function undoToCheckpoint(project, ssh, sessionId, id) {
  const { cp, dir } = await loadCheckpoint(project, sessionId, id, ssh);
  const now = await snapshotCommit(ssh, project, `cp-${id}-undo`);
  const { stdout } = await ssh.execCommand(`git -C ${q(dir)} diff --name-status ${cp.before} ${now}`);
  const entries = stdout.trim().split("\n").filter(Boolean).map((l) => { const [k, ...f] = l.split("\t"); return { kind: k[0], file: f.join("\t") }; });
  for (const e of entries) {
    const { full } = resolveInProject(project, e.file);
    if (e.kind === "A") await ssh.execCommand(`rm -f ${q(full)}`);
    else await ssh.execCommand(`mkdir -p ${q(path.posix.dirname(full))} && git -C ${q(dir)} show ${cp.before}:${q(e.file)} > ${q(full)}`);
  }
  return entries.length;
}

// ── Closed projects leave the sandbox ────────────────────────────────────────────────────────────────────────────
// When the user's editor has been closed for a while, each downloaded project is removed from the sandbox (it is
// downloaded fresh on the next open). Unpushed work is first pushed to a new "classgrid-backup-..." branch on GitHub;
// if that backup fails, the code is kept. Returns what happened per project.
export async function backupAndRemoveProjectCode(ssh, project) {
  const dir = projectHostDir(project);
  // Persist the real "last edited" time before the code leaves the sandbox, so the Projects page
  // keeps showing the correct time even after the folder is gone.
  const saveLastEdit = async () => {
    const edited = await newestFileEdit(ssh, project);
    if (edited) await IdeProject.updateOne({ _id: project._id }, { $set: { updatedAt: edited } }, { timestamps: false });
  };
  // No GitHub repo yet: an empty project is just removed; one with files first gets its own private repo
  // on the user's GitHub (named after the project), so the work is saved there before it leaves the sandbox
  if (!project.repo) {
    const { stdout: files } = await ssh.execCommand(`ls -A ${q(dir)} 2>/dev/null | grep -v '^.git$' | head -1`);
    if (!files.trim()) { await ssh.execCommand(`rm -rf ${q(dir)}`); return { removed: true }; }
    const base = String(project.name || "project").toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "project";
    let made = "";
    for (const name of [base, `${base}-${String(project._id).slice(-6)}`]) {
      made = await createRepoForProject(project, ssh, { name, private: true, description: "Made by Classgrid Project Mode" });
      if (project.repo) break;
    }
    if (!project.repo || /failed/i.test(made)) return { removed: false, reason: `could not save to a new GitHub repo: ${made}` };
    await saveLastEdit();
    await ssh.execCommand(`rm -rf ${q(dir)}`);
    return { removed: true, backupBranch: null, createdRepo: project.repo };
  }
  const { stdout: exists } = await ssh.execCommand(`[ -d ${q(dir)}/.git ] && echo yes`);
  if (!exists.trim()) {
    await saveLastEdit();
    await ssh.execCommand(`rm -rf ${q(dir)}`); // a folder without a repo has nothing to save
    return { removed: true };
  }
  const { stdout: dirty } = await ssh.execCommand(`git -C ${q(dir)} status --porcelain | head -1`);
  const { stdout: ahead } = await ssh.execCommand(`git -C ${q(dir)} rev-list --count @{u}..HEAD 2>/dev/null || echo 0`);
  let backupBranch = null;
  if (dirty.trim() || Number(ahead.trim()) > 0) {
    await connectDB();
    const owner = await User.findById(project.owner).select("github_access_token");
    if (!owner?.github_access_token || !project.repo) return { removed: false, reason: "unpushed work and no GitHub access" };
    const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "").replace(/^(\d{8})(\d{4})$/, "$1-$2");
    backupBranch = `classgrid-backup-${stamp}`;
    const auth = Buffer.from(`x-access-token:${owner.github_access_token}`).toString("base64");
    await ssh.execCommand(`git -C ${q(dir)} checkout -q -b ${backupBranch} && git -C ${q(dir)} add -A && git -C ${q(dir)} -c user.name=Classgrid -c user.email=backup@classgrid.in commit -q -m "Classgrid: unsaved work, saved when the project was closed" || true`);
    const push = await ssh.execCommand(
      `GIT_TERMINAL_PROMPT=0 GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=http.https://github.com/.extraheader GIT_CONFIG_VALUE_0="AUTHORIZATION: basic ${auth}" ` +
      `git -C ${q(dir)} push -q origin ${backupBranch} 2>&1 | tail -3`
    );
    if (/rejected|error|fatal/i.test(push.stdout || push.stderr || "")) {
      console.error("[IDE] Backup push failed, keeping the code:", String(push.stdout || push.stderr).split(auth).join("***").slice(0, 300));
      return { removed: false, reason: "backup push failed" };
    }
    await IdeProject.updateOne({ _id: project._id }, { $set: { lastBackup: { branch: backupBranch, at: new Date() } } });
  }
  await saveLastEdit();
  await ssh.execCommand(`rm -rf ${q(dir)}`);
  return { removed: true, backupBranch };
}
