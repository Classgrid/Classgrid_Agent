import express from "express";
import { NodeSSH } from "node-ssh";
import { isAuthenticated, requireRole } from "../middleware/auth.middleware.js";
import User from "../models/User.js";
import IdeProject from "../models/IdeProject.js";
import mongoose from "mongoose";
import connectDB from "../../config/db.js";

const router = express.Router();

// The IDE (OpenVSCode Server) on the sandbox (https://ide.classgrid.in) asks this before every request:
// the browser's normal Classgrid login cookie (.classgrid.in) comes along, and only super admins get through.
router.get("/check", isAuthenticated, requireRole("super_admin"), (req, res) => {
  res.set("Cache-Control", "no-store");
  res.sendStatus(204);
});

const CHAT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REPO_NAME = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

async function githubTokenFor(userId) {
  await connectDB();
  const user = await User.findById(userId).select("github_access_token github_name github_email");
  return user?.github_access_token ? user : null;
}

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
router.get("/github/repos", isAuthenticated, requireRole("super_admin"), async (req, res) => {
  try {
    const user = await githubTokenFor(req.user._id);
    if (!user) return res.status(409).json({ error: "github_not_connected" });
    const ghRes = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member", {
      headers: { Authorization: `Bearer ${user.github_access_token}`, Accept: "application/vnd.github+json", "User-Agent": "Classgrid" },
    });
    if (ghRes.status === 401) return res.status(409).json({ error: "github_not_connected" });
    if (!ghRes.ok) return res.status(502).json({ error: "Could not load your GitHub repos" });
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
// Each user sees only their own projects. A project's code lives in /home/ubuntu/sandbox_data/projects/<id>
// (the editor sees it at /home/workspace/chats/projects/<id>, chats inside the project see it at /data/project).
const projectDir = (id) => `/home/ubuntu/sandbox_data/projects/${id}`;

async function ownProject(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) { res.status(404).json({ error: "Project not found" }); return null; }
  await connectDB();
  const project = await IdeProject.findOne({ _id: req.params.id, owner: req.user._id });
  if (!project) res.status(404).json({ error: "Project not found" });
  return project;
}

const projectJson = (p) => ({ id: p._id, name: p.name, repo: p.repo, lastOpenedAt: p.lastOpenedAt, updatedAt: p.updatedAt });

router.get("/projects", isAuthenticated, requireRole("super_admin"), async (req, res) => {
  await connectDB();
  const projects = await IdeProject.find({ owner: req.user._id }).sort({ updatedAt: -1 }).limit(200);
  res.json({ projects: projects.map(projectJson) });
});

router.post("/projects", isAuthenticated, requireRole("super_admin"), async (req, res) => {
  const name = String(req.body?.name || "").trim().slice(0, 80);
  if (!name) return res.status(400).json({ error: "Give the project a name" });
  await connectDB();
  const project = await IdeProject.create({ owner: req.user._id, name });
  res.json({ project: projectJson(project) });
});

router.patch("/projects/:id", isAuthenticated, requireRole("super_admin"), async (req, res) => {
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

router.delete("/projects/:id", isAuthenticated, requireRole("super_admin"), async (req, res) => {
  const project = await ownProject(req, res);
  if (!project) return;
  let ssh;
  try {
    ssh = await sandboxSsh();
    await ssh.execCommand(`rm -rf ${projectDir(project._id)}`);
  } catch (e) {
    console.error("[IDE] Could not remove project folder:", e.message);
  } finally {
    ssh?.dispose();
  }
  await project.deleteOne();
  res.json({ ok: true });
});

// Open = download the repo fresh. Unsaved (not pushed) changes from last time are kept unless the user chose to replace them.
router.post("/projects/:id/open", isAuthenticated, requireRole("super_admin"), async (req, res) => {
  const project = await ownProject(req, res);
  if (!project) return;
  const dir = projectDir(project._id);
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
        `rm -rf ${dir} && mkdir -p /home/ubuntu/sandbox_data/projects && ` +
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
    project.lastOpenedAt = new Date();
    await project.save();
    res.json({ project: projectJson(project), folder: `/home/workspace/chats/projects/${project._id}` });
  } catch (e) {
    console.error("[IDE] Open project failed:", e.message);
    res.status(500).json({ error: "Could not open this project" });
  } finally {
    ssh?.dispose();
  }
});

// A chat started inside a project belongs to it, so the AI in that chat works on the project's code (/data/project)
router.post("/projects/:id/chats", isAuthenticated, requireRole("super_admin"), async (req, res) => {
  const project = await ownProject(req, res);
  if (!project) return;
  const sessionId = req.body?.sessionId;
  if (!CHAT_ID.test(sessionId || "")) return res.status(400).json({ error: "Open a chat first" });
  await IdeProject.updateMany({ owner: req.user._id, chatSessionIds: sessionId, _id: { $ne: project._id } }, { $pull: { chatSessionIds: sessionId } });
  await IdeProject.updateOne({ _id: project._id }, { $addToSet: { chatSessionIds: sessionId } });
  res.json({ ok: true });
});

export default router;
