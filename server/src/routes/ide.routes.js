import express from "express";
import { NodeSSH } from "node-ssh";
import { isAuthenticated, requireRole } from "../middleware/auth.middleware.js";
import User from "../models/User.js";
import IdeProject from "../models/IdeProject.js";
import { pushProject, revealInEditor } from "../services/ide-project.service.js";
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
const BOX_IDLE_MS = 30 * 60 * 1000;

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

// Boxes nobody used for 30 minutes are switched off (their files stay; the box starts again on the next open)
let reaping = false;
setInterval(async () => {
  if (reaping) return;
  reaping = true;
  let ssh;
  try {
    const users = await redis.smembers(BOXES);
    for (const userId of users) {
      const seen = Number(await redis.get(BOX_SEEN(userId))) || 0;
      if (Date.now() - seen < BOX_IDLE_MS) continue;
      ssh = ssh || await sandboxSsh();
      if (/^[a-f0-9]{24}$/.test(userId)) await ssh.execCommand(`docker rm -f ide-u-${userId}`);
      await redis.del(BOX_PORT(userId), BOX_SEEN(userId));
      await redis.srem(BOXES, userId);
    }
  } catch (e) {
    console.error("[IDE] Box cleanup failed:", e.message);
  } finally {
    ssh?.dispose();
    reaping = false;
  }
}, 5 * 60 * 1000).unref();

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

const projectJson = (p) => ({ id: p._id, name: p.name, repo: p.repo, lastOpenedAt: p.lastOpenedAt, updatedAt: p.updatedAt });

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
router.post("/projects/:id/open", isAuthenticated, async (req, res) => {
  const project = await ownProject(req, res);
  if (!project) return;
  const dir = projectDir(project);
  let ssh;
  try {
    ssh = await sandboxSsh();
    if (project.repo) {
      const user = await githubTokenFor(req.user._id);
      if (!user) return res.status(409).json({ error: "github_not_connected" });
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
    } else {
      await ssh.execCommand(`mkdir -p ${dir}`);
    }
    await ensureBox(ssh, String(req.user._id));
    project.lastOpenedAt = new Date();
    await project.save();
    res.json({ project: projectJson(project), folder: `/home/workspace/projects/${project._id}` });
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
