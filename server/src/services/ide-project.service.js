import path from "path";
import { NodeSSH } from "node-ssh";
import IdeProject from "../models/IdeProject.js";
import User from "../models/User.js";
import connectDB from "../../config/db.js";

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
    await writeText(ssh, full, String(content));
    return `${exists.trim() ? "Replaced" : "Created"} ${rel} (${String(content).split("\n").length} lines).`;
  }),

  // One or more edits in one file. Each edit replaces old_text (which must be found exactly, once unless
  // allow_multiple) with new_text; start_line/end_line, when given, limit where old_text is looked for.
  edit_project_file: (sessionId, { path: file, edits = [] }) => withProject(sessionId, async (project, ssh) => {
    const { full, rel } = resolveInProject(project, file);
    if (!Array.isArray(edits) || !edits.length) return "Error: edits is empty";
    let text = await readText(ssh, full);
    const done = [];
    for (const [i, e] of edits.entries()) {
      const oldText = String(e?.old_text ?? "");
      const newText = String(e?.new_text ?? "");
      if (!oldText) return `Error in edit ${i + 1}: old_text is empty`;
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
    await writeText(ssh, full, text);
    return `Edited ${rel} (${done.join(", ")}).`;
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
