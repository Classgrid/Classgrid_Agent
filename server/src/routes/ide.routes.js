import express from "express";
import { NodeSSH } from "node-ssh";
import { isAuthenticated, requireRole } from "../middleware/auth.middleware.js";
import User from "../models/User.js";
import IdeProject from "../models/IdeProject.js";
import { pushProject, revealInEditor, checkpointChanges, rejectCheckpoint, undoToCheckpoint, backupAndRemoveProjectCode } from "../services/ide-project.service.js";
import mongoose from "mongoose";
import connectDB from "../../config/db.js";
import redis from "../config/redis.js";
import { primarySupabaseClient } from "../config/supabaseClient.js";

const router = express.Router();

// The IDE (OpenVSCode Server) on the sandbox (https://ide.classgrid.in) asks this before every request:
// the browser's normal Classgrid login cookie (.classgrid.in) comes along, and the user is sent to their own
// editor box (started when they open a project). No box = no way in, so nobody can reach another user's box.
const BOX_PORT = (userId) => `ide:port:${userId}`;
const BOX_SEEN = (userId) => `ide:seen:${userId}`;
const BOXES = "ide:boxes";
const BOX_IDLE_MS = 5 * 60 * 1000; // editor closed this long -> code leaves the sandbox

router.get("/check", isAuthenticated, async (req, res) => {
  res.set("Cache-Control", "no-store");
  const userId = String(req.user._id);
  const port = await redis.get(BOX_PORT(userId)).catch(() => null);
  if (!/^4\d{4}$/.test(port || "")) return res.sendStatus(403);
  redis.set(BOX_SEEN(userId), String(Date.now()), "EX", 24 * 60 * 60).catch(() => {});
  res.set("X-Ide-Upstream", `127.0.0.1:${port}`);
  res.sendStatus(204);
});

const CHAT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REPO_NAME = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

async function githubTokenFor(userId) {
  await connectDB();
  const user = await User.findById(userId).select("github_access_token github_name github_email");
  return user?.github_access_token ? user : null;
}

// Start (or reuse) the user's own editor box on the sandbox. It sees only /home/ubuntu/ide_users/<user>.
async function ensureBox(ssh, userId) {
  const { stdout, stderr } = await ssh.execCommand(`/home/ubuntu/ide_branding/ide-user.sh ${userId}`);
  const port = stdout.trim().split("\n").pop();
  if (!/^4\d{4}$/.test(port || "")) {
    if (/busy/.test(stderr)) { const e = new Error("Project Mode is busy right now. Try again in a few minutes."); e.status = 503; throw e; }
    throw new Error(`Editor box did not start: ${stderr.slice(0, 200)}`);
  }
  await redis.set(BOX_PORT(userId), port, "EX", 24 * 60 * 60);
  await redis.set(BOX_SEEN(userId), String(Date.now()), "EX", 24 * 60 * 60);
  await redis.sadd(BOXES, userId);
}

// Every minute: a box with an open editor (a live connection to it) counts as in use. When a user's editor has
// been closed for 5 minutes, their downloaded projects leave the sandbox (unpushed work is first pushed to a
// "classgrid-backup-..." branch; if that fails the code stays) and the box is switched off. Opening a project
// again downloads it fresh. A Redis lock makes sure only one server process does this at a time.
let reaping = false;
setInterval(async () => {
  if (reaping) return;
  reaping = true;
  let ssh;
  try {
    if (!(await redis.set("ide:reaper-lock", "1", "EX", 55, "NX"))) return;
    const users = await redis.smembers(BOXES);
    for (const userId of users) {
      if (!/^[a-f0-9]{24}$/.test(userId)) { await redis.srem(BOXES, userId); continue; }
      ssh = ssh || await sandboxSsh();
      const port = await redis.get(BOX_PORT(userId));
      if (/^4\d{4}$/.test(port || "")) {
        const { stdout } = await ssh.execCommand(`ss -Htn state established "( sport = :${port} )" | wc -l`);
        if (Number(stdout.trim()) > 0) { await redis.set(BOX_SEEN(userId), String(Date.now()), "EX", 24 * 60 * 60); continue; }
      }
      const seen = Number(await redis.get(BOX_SEEN(userId))) || 0;
      if (Date.now() - seen < BOX_IDLE_MS) continue;
      await connectDB();
      const projects = await IdeProject.find({ owner: userId }).lean();
      let keptAny = false;
      for (const p of projects) {
        const r = await backupAndRemoveProjectCode(ssh, p).catch((e) => ({ removed: false, reason: e.message }));
        if (!r.removed) { keptAny = true; console.error(`[IDE] Kept project ${p._id} on the sandbox: ${r.reason}`); }
      }
      await ssh.execCommand(`docker rm -f ide-u-${userId}`);
      await redis.del(BOX_PORT(userId), BOX_SEEN(userId));
      if (!keptAny) await redis.srem(BOXES, userId);
      else await redis.set(BOX_SEEN(userId), String(Date.now()), "EX", 24 * 60 * 60); // try the kept ones again later
    }
  } catch (e) {
    console.error("[IDE] Box cleanup failed:", e.message);
  } finally {
    ssh?.dispose();
    reaping = false;
  }
}, 60 * 1000).unref();

async function sandboxSsh() {
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

// The user's GitHub repos, newest first, for the Project Mode picker
// The GitHub account connected in AI Hub (picture, name, email), shown on the Projects page
router.get("/github/me", isAuthenticated, async (req, res) => {
  try {
    const user = await githubTokenFor(req.user._id);
    if (!user) return res.status(409).json({ error: "github_not_connected" });
    const ghRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${user.github_access_token}`, Accept: "application/vnd.github+json", "User-Agent": "Classgrid" },
    });
    if (ghRes.status === 401) return res.status(409).json({ error: "github_expired" });
    const gh = ghRes.ok ? await ghRes.json() : {};
    res.json({ login: gh.login || null, name: gh.name || user.github_name || gh.login || null, email: gh.email || user.github_email || null, avatar: gh.avatar_url || null });
  } catch (e) {
    console.error("[IDE] GitHub account failed:", e.message);
    res.status(500).json({ error: "Could not load your GitHub account" });
  }
});

router.get("/github/repos", isAuthenticated, async (req, res) => {
  try {
    const user = await githubTokenFor(req.user._id);
    if (!user) return res.status(409).json({ error: "github_not_connected" });
    const ghRes = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member", {
      headers: { Authorization: `Bearer ${user.github_access_token}`, Accept: "application/vnd.github+json", "User-Agent": "Classgrid" },
    });
    if (ghRes.status === 401) {
      console.error("[IDE] GitHub refused the saved key for user", String(req.user._id));
      return res.status(409).json({ error: "github_expired" });
    }
    if (!ghRes.ok) {
      console.error("[IDE] GitHub repos status", ghRes.status, (await ghRes.text()).slice(0, 200));
      return res.status(502).json({ error: "Could not load your GitHub repos" });
    }
    const repos = await ghRes.json();
    res.json({ repos: repos.map((r) => ({ fullName: r.full_name, private: r.private, defaultBranch: r.default_branch })) });
  } catch (e) {
    console.error("[IDE] GitHub repos failed:", e.message);
    res.status(500).json({ error: "Could not load your GitHub repos" });
  }
});

// Copy a repo (latest version only) into this chat's sandbox folder: /data/project for the AI,
// /home/workspace/chats/<chat>/project in the editor. The GitHub key is only sent with the download and never
// written into the folder, so nothing in the sandbox can read it. Unsaved changes of a previous repo are kept
// unless the user chose to replace them.
router.post("/github/open", isAuthenticated, requireRole("super_admin"), async (req, res) => {
  const { sessionId, repo, replace } = req.body || {};
  if (!CHAT_ID.test(sessionId || "")) return res.status(400).json({ error: "Open a chat first" });
  if (!REPO_NAME.test(repo || "")) return res.status(400).json({ error: "Pick a repo" });

  let ssh;
  try {
    const user = await githubTokenFor(req.user._id);
    if (!user) return res.status(409).json({ error: "github_not_connected" });

    const dir = `/home/ubuntu/sandbox_data/${sessionId}/project`;
    ssh = await sandboxSsh();

    if (!replace) {
      const { stdout } = await ssh.execCommand(`[ -d ${dir}/.git ] && git -C ${dir} status --porcelain | head -1`);
      if (stdout.trim()) return res.status(409).json({ error: "unsaved_changes" });
    }

    const auth = Buffer.from(`x-access-token:${user.github_access_token}`).toString("base64");
    const clone = await ssh.execCommand(
      `mkdir -p /home/ubuntu/sandbox_data/${sessionId}/scratch && rm -rf ${dir} && ` +
      `GIT_TERMINAL_PROMPT=0 GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=http.https://github.com/.extraheader GIT_CONFIG_VALUE_0="AUTHORIZATION: basic ${auth}" ` +
      `git clone --depth 1 --quiet https://github.com/${repo}.git ${dir} 2>&1 | tail -3`
    );
    const { stdout: ok } = await ssh.execCommand(`[ -d ${dir}/.git ] && echo yes`);
    if (ok.trim() !== "yes") {
      console.error("[IDE] Clone failed:", (clone.stdout || clone.stderr).replace(auth, "***"));
      return res.status(502).json({ error: "Could not download this repo" });
    }
    if (user.github_name) await ssh.execCommand(`git -C ${dir} config user.name ${JSON.stringify(user.github_name)}`);
    if (user.github_email) await ssh.execCommand(`git -C ${dir} config user.email ${JSON.stringify(user.github_email)}`);

    res.json({ ok: true, folder: `/home/workspace/chats/${sessionId}/project` });
  } catch (e) {
    console.error("[IDE] Open repo failed:", e.message);
    res.status(500).json({ error: "Could not download this repo" });
  } finally {
    ssh?.dispose();
  }
});

// ── Projects ─────────────────────────────────────────────────────────────────────────────────────────────────
// Each user sees only their own projects. A project's code lives in /home/ubuntu/ide_users/<owner>/projects/<id>
// (the owner's editor box sees it at /home/workspace/projects/<id>, chats inside the project see it at /data/project).
const projectDir = (p) => `/home/ubuntu/ide_users/${p.owner}/projects/${p._id}`;

async function ownProject(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) { res.status(404).json({ error: "Project not found" }); return null; }
  await connectDB();
  const project = await IdeProject.findOne({ _id: req.params.id, owner: req.user._id });
  if (!project) res.status(404).json({ error: "Project not found" });
  return project;
}

const projectJson = (p) => ({ id: p._id, name: p.name, repo: p.repo, lastOpenedAt: p.lastOpenedAt, createdAt: p.createdAt, updatedAt: p.updatedAt });

router.get("/projects", isAuthenticated, async (req, res) => {
  await connectDB();
  const projects = await IdeProject.find({ owner: req.user._id }).sort({ updatedAt: -1 }).limit(200);
  res.json({ projects: projects.map(projectJson) });
});

router.post("/projects", isAuthenticated, async (req, res) => {
  const name = String(req.body?.name || "").trim().slice(0, 80);
  if (!name) return res.status(400).json({ error: "Give the project a name" });
  await connectDB();
  const project = await IdeProject.create({ owner: req.user._id, name });
  res.json({ project: projectJson(project) });
});

router.patch("/projects/:id", isAuthenticated, async (req, res) => {
  const project = await ownProject(req, res);
  if (!project) return;
  if (req.body?.name !== undefined) {
    const name = String(req.body.name).trim().slice(0, 80);
    if (!name) return res.status(400).json({ error: "Give the project a name" });
    project.name = name;
  }
  if (req.body?.repo !== undefined) {
    if (req.body.repo !== null && !REPO_NAME.test(req.body.repo)) return res.status(400).json({ error: "Pick a repo" });
    if (req.body.repo) {
      // One project per repo, so the same code never shows up twice
      const other = await IdeProject.findOne({ owner: req.user._id, _id: { $ne: project._id }, repo: new RegExp(`^${req.body.repo.replace(/\./g, "\\.")}$`, "i") }).select("name"); // repo names are only letters, digits, - _ . /
      if (other) return res.status(409).json({ error: `This repo is already linked to your project "${other.name}". Open that project instead.` });
    }
    project.repo = req.body.repo;
  }
  await project.save();
  res.json({ project: projectJson(project) });
});

router.delete("/projects/:id", isAuthenticated, async (req, res) => {
  const project = await ownProject(req, res);
  if (!project) return;
  let ssh;
  try {
    ssh = await sandboxSsh();
    await ssh.execCommand(`rm -rf ${projectDir(project)}`);
  } catch (e) {
    console.error("[IDE] Could not remove project folder:", e.message);
  } finally {
    ssh?.dispose();
  }
  await project.deleteOne();
  res.json({ ok: true });
});

// Open = download the repo fresh. Unsaved (not pushed) changes from last time are kept unless the user chose to replace them.
// Resume (page refresh) = keep the code that is already there and only make sure the editor box is running.
router.post("/projects/:id/open", isAuthenticated, async (req, res) => {
  const project = await ownProject(req, res);
  if (!project) return;
  const dir = projectDir(project);
  let ssh;
  try {
    ssh = await sandboxSsh();
    const { stdout: haveCode } = req.body?.resume ? await ssh.execCommand(`[ -d ${dir} ] && echo yes`) : { stdout: "" };
    const resuming = !!haveCode.trim();
    // GitHub must be connected for every project: code is only kept on GitHub, never on our servers
    const user = await githubTokenFor(req.user._id);
    if (!user) return res.status(409).json({ error: "github_not_connected" });
    if (project.repo && !resuming) {
      if (!req.body?.replace) {
        const { stdout } = await ssh.execCommand(`[ -d ${dir}/.git ] && git -C ${dir} status --porcelain | head -1`);
        if (stdout.trim()) return res.status(409).json({ error: "unsaved_changes" });
      }
      const auth = Buffer.from(`x-access-token:${user.github_access_token}`).toString("base64");
      const clone = await ssh.execCommand(
        `rm -rf ${dir} && mkdir -p ${dir}/.. && ` +
        `GIT_TERMINAL_PROMPT=0 GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=http.https://github.com/.extraheader GIT_CONFIG_VALUE_0="AUTHORIZATION: basic ${auth}" ` +
        `git clone --depth 1 --quiet https://github.com/${project.repo}.git ${dir} 2>&1 | tail -3`
      );
      const { stdout: ok } = await ssh.execCommand(`[ -d ${dir}/.git ] && echo yes`);
      if (ok.trim() !== "yes") {
        console.error("[IDE] Clone failed:", (clone.stdout || clone.stderr).replace(auth, "***"));
        return res.status(502).json({ error: "Could not download this repo" });
      }
      if (user.github_name) await ssh.execCommand(`git -C ${dir} config user.name ${JSON.stringify(user.github_name)}`);
      if (user.github_email) await ssh.execCommand(`git -C ${dir} config user.email ${JSON.stringify(user.github_email)}`);
    } else if (!project.repo) {
      // An empty project (no repo yet): a git folder, so changes can be tracked and the AI can make a repo for it later
      await ssh.execCommand(`mkdir -p ${dir} && cd ${dir} && ([ -d .git ] || git init -q -b main)`);
    } else {
      await ssh.execCommand(`mkdir -p ${dir}`);
    }
    await ensureBox(ssh, String(req.user._id));
    // A fresh download has no packages, so the editor's type checker marks every file red. Install them in the
    // background inside the user's own editor box (with their package cache); the red marks go when it finishes.
    let installing = false;
    const { stdout: needsInstall } = await ssh.execCommand(`[ -f ${dir}/package.json ] && [ ! -d ${dir}/node_modules ] && echo yes`);
    if (needsInstall.trim()) {
      installing = true;
      await ssh.execCommand(
        `docker exec -d ide-u-${req.user._id} sh -c 'mkdir -p /home/workspace/.classgrid && cd /home/workspace/projects/${project._id} && npm install --ignore-scripts --no-audit --no-fund > /home/workspace/.classgrid/npm-install-${project._id}.log 2>&1'`
      );
    }
    const backup = project.lastBackup?.branch ? project.lastBackup.branch : null; // shown once
    project.lastBackup = undefined;
    project.lastOpenedAt = new Date();
    await project.save();
    res.json({ project: projectJson(project), folder: `/home/workspace/projects/${project._id}`, installing, backup });
  } catch (e) {
    console.error("[IDE] Open project failed:", e.message);
    res.status(e.status || 500).json({ error: e.status ? e.message : "Could not open this project" });
  } finally {
    ssh?.dispose();
  }
});

// Push button: commit everything and push to the project's repo with the owner's GitHub key (only for that command)
router.post("/projects/:id/push", isAuthenticated, async (req, res) => {
  const project = await ownProject(req, res);
  if (!project) return;
  let ssh;
  try {
    ssh = await sandboxSsh();
    const result = await pushProject(project.toObject(), ssh, req.body?.message);
    const ok = /pushed/i.test(result) && !/failed/i.test(result);
    res.status(ok ? 200 : 400).json(ok ? { message: result } : { error: result });
  } catch (e) {
    console.error("[IDE] Push failed:", e.message);
    res.status(500).json({ error: "Could not push to GitHub" });
  } finally {
    ssh?.dispose();
  }
});

// Review / Reject / Undo one AI answer's changes (the answer's checkpoint, in a chat of this project)
async function checkpointRoute(req, res, fn) {
  const project = await ownProject(req, res);
  if (!project) return;
  const { sessionId, cp } = req.params;
  if (!CHAT_ID.test(sessionId) || !project.chatSessionIds.includes(sessionId)) return res.status(404).json({ error: "This chat is not part of the project" });
  let ssh;
  try {
    ssh = await sandboxSsh();
    res.json(await fn(project.toObject(), ssh, sessionId, cp));
  } catch (e) {
    res.status(400).json({ error: e.message });
  } finally {
    ssh?.dispose();
  }
}
router.get("/projects/:id/checkpoints/:sessionId/:cp", isAuthenticated, (req, res) =>
  checkpointRoute(req, res, (p, ssh, s, cp) => checkpointChanges(p, ssh, s, cp)));
router.post("/projects/:id/checkpoints/:sessionId/:cp/reject", isAuthenticated, (req, res) =>
  checkpointRoute(req, res, async (p, ssh, s, cp) => ({ reverted: await rejectCheckpoint(p, ssh, s, cp, req.body?.file || null) })));
router.post("/projects/:id/checkpoints/:sessionId/:cp/undo", isAuthenticated, (req, res) =>
  checkpointRoute(req, res, async (p, ssh, s, cp) => ({ reverted: await undoToCheckpoint(p, ssh, s, cp) })));

// Clicking a file in the chat opens it in the editor at those lines
router.post("/projects/:id/reveal", isAuthenticated, async (req, res) => {
  const project = await ownProject(req, res);
  if (!project) return;
  let ssh;
  try {
    ssh = await sandboxSsh();
    await revealInEditor(project.toObject(), ssh, req.body || {});
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  } finally {
    ssh?.dispose();
  }
});

// A chat started inside a project belongs to it, so the AI in that chat works on the project's code (/data/project)
router.post("/projects/:id/chats", isAuthenticated, async (req, res) => {
  const project = await ownProject(req, res);
  if (!project) return;
  const sessionId = req.body?.sessionId;
  if (!CHAT_ID.test(sessionId || "")) return res.status(400).json({ error: "Open a chat first" });
  const { data: session } = await primarySupabaseClient.from("ai_chat_sessions").select("user_email").eq("id", sessionId).maybeSingle();
  if (!session || String(session.user_email || "").toLowerCase() !== String(req.user.email || "").toLowerCase()) {
    return res.status(403).json({ error: "This chat is not yours" });
  }
  await IdeProject.updateMany({ owner: req.user._id, chatSessionIds: sessionId, _id: { $ne: project._id } }, { $pull: { chatSessionIds: sessionId } });
  await IdeProject.updateOne({ _id: project._id }, { $addToSet: { chatSessionIds: sessionId } });
  res.json({ ok: true });
});

export default router;
