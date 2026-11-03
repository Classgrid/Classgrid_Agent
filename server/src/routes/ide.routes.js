/*
 * ─────────────────────────────────────────────────────────
 * 🚫 NO BLOCKS RULE (owner's order, 2026-10-23) 🚫
 * Claude and every AI model are FORBIDDEN to add any kind of block, restriction, allowlist or
 * "only for X" rule (owner-only, super-admin-only, email checks, test-number-only, role checks)
 * unless the owner explicitly asks for that exact limit.
 * Every feature is for ALL users. Project Mode is for all users, never super-admin only.
 * ─────────────────────────────────────────────────────────
 */
/*
 * ─────────────────────────────────────────────────────────
 * 🚫 NO DISK BLAME RULE (owner's order, 2026-10-27) 🚫
 * Claude and every AI model are FORBIDDEN to say an error comes from a full disk or low disk space.
 * The owner's disks are not full. Never guess the cause of an error: read the real logs and code first,
 * and only name a cause that was actually seen.
 * ─────────────────────────────────────────────────────────
 */
/*
 * ─────────────────────────────────────────────────────────
 * 🚨 ERP SHUT DOWN 🚨
 * The Classgrid ERP is shut down and will never work or be worked on again.
 * The org admin dashboard and every dashboard other than chat.classgrid.in and the
 * super admin dashboard are banned, and so is all ERP backend code.
 * Any issue or bug in the ERP or the org admin dashboard is banned too: do not look
 * for it, report it or fix it.
 * Do not build, fix, test or talk about ERP features. Only chat.classgrid.in and the
 * super admin dashboard are live.
 * ─────────────────────────────────────────────────────────
 */
import express from "express";
import { NodeSSH } from "node-ssh";
import { isAuthenticated, requireRole } from "../middleware/auth.middleware.js";
import User from "../models/User.js";
import IdeProject from "../models/IdeProject.js";
import ChatGroup from "../models/ChatGroup.js";
import { githubUser } from "../services/github-token.service.js";
import { pushProject, openClassgridPrBranch, revealInEditor, checkpointChanges, rejectCheckpoint, undoToCheckpoint, backupAndRemoveProjectCode, touchStudio, STUDIO_USERS, STUDIO_SEEN, STUDIO_IDLE_MS } from "../services/ide-project.service.js";
import { repoAppToken } from "../services/github-app.service.js";
import { callLocal, runnerOnline } from "../services/local-runner.service.js";
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
  const user = await githubUser(userId, "github_name github_email"); // key renewed if it ran out
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
    // Background commands that finished more than an hour ago are cleared (running ones stop by themselves at 30 min)
    ssh = await sandboxSsh();
    await ssh.execCommand(`docker container prune -f --filter label=classgrid-bg=1 --filter until=1h >/dev/null 2>&1`);
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
      if (Date.now() - (Number(await redis.get(STUDIO_SEEN(userId))) || 0) < STUDIO_IDLE_MS) {
        // Still working in Studio Mode: only the editor box goes; the Studio cleanup removes the code later
        await ssh.execCommand(`docker rm -f ide-u-${userId}`);
        await redis.del(BOX_PORT(userId), BOX_SEEN(userId));
        await redis.srem(BOXES, userId);
        await redis.sadd(STUDIO_USERS, userId);
        continue;
      }
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
    // Studio Mode: no editor box, so its own time since last use decides (users with an editor box are done above)
    for (const userId of await redis.smembers(STUDIO_USERS)) {
      if (!/^[a-f0-9]{24}$/.test(userId)) { await redis.srem(STUDIO_USERS, userId); continue; }
      if (await redis.sismember(BOXES, userId)) continue;
      if (Date.now() - (Number(await redis.get(STUDIO_SEEN(userId))) || 0) < STUDIO_IDLE_MS) continue;
      ssh = ssh || await sandboxSsh();
      await connectDB();
      const projects = await IdeProject.find({ owner: userId }).lean();
      let keptAny = false;
      for (const p of projects) {
        const r = await backupAndRemoveProjectCode(ssh, p).catch((e) => ({ removed: false, reason: e.message }));
        if (!r.removed) { keptAny = true; console.error(`[IDE] Kept Studio project ${p._id} on the sandbox: ${r.reason}`); }
      }
      if (!keptAny) { await redis.srem(STUDIO_USERS, userId); await redis.del(STUDIO_SEEN(userId)); }
      else await redis.set(STUDIO_SEEN(userId), String(Date.now()), "EX", 24 * 60 * 60); // try the kept ones again later
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
router.post("/github/open", isAuthenticated, async (req, res) => {
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

    // Download through the Classgrid app when it is installed on the repo, else with the user's key as before
    const key = (await repoAppToken(repo).catch(() => null)) || user.github_access_token;
    const auth = Buffer.from(`x-access-token:${key}`).toString("base64");
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

const projectJson = (p) => ({ id: p._id, name: p.name, repo: p.repo, logo: p.logo || null, location: p.location || "cloud", localPath: p.localPath || null, localCopies: (p.localCopies || []).map((c) => ({ deviceId: c.deviceId, path: c.path, at: c.at, here: !!c.here })), lastOpenedAt: p.lastOpenedAt, createdAt: p.createdAt, updatedAt: p.updatedAt });

// A project logo must be a picture this user uploaded to our R2 (same upload as the profile picture).
// Returns the link, null to remove the logo, or undefined when the link is not allowed.
function projectLogo(value, userId) {
  if (value === null || value === "") return null;
  const link = String(value);
  const base = (process.env.R2_PUBLIC_URL || `https://pub-${process.env.R2_ACCOUNT_ID}.r2.dev`).replace(/\/$/, "");
  return link.length < 600 && link.startsWith(`${base}/${userId}/`) ? link : undefined;
}

// "Last edited" follows real file edits: newest file change on disk (node_modules and .git skipped), never older than the saved record.
// If the sandbox cannot be reached, the saved record time is used.
// Edit times are cached in Redis for 45s per project, so the SSH `find` only runs for projects not cached yet.
// If Redis fails, every project goes through SSH exactly as before.
const EDIT_CACHE_TTL = 45;
const EDIT_CACHE_KEY = (id) => `ide:lastEdited:${id}`;
const EDIT_CACHE_NO_FILES = "none"; // saved for projects with no files (or no folder yet)

async function newestFileEdits(allProjects) {
  const times = {};
  if (!allProjects.length) return times;
  let projects = allProjects;
  try {
    const cached = await redis.mget(allProjects.map((p) => EDIT_CACHE_KEY(p._id)));
    projects = [];
    allProjects.forEach((p, i) => {
      const ms = Number(cached[i]);
      if (cached[i] === EDIT_CACHE_NO_FILES) return; // cached "no files": nothing to look up, skip SSH
      if (cached[i] && Number.isFinite(ms)) times[String(p._id)] = new Date(ms);
      else projects.push(p);
    });
  } catch (e) {
    console.error("[IDE] Edit-time cache read failed, using SSH:", e.message);
    projects = allProjects;
  }
  if (!projects.length) return times;
  let ssh;
  try {
    ssh = await sandboxSsh();
    const script = projects.map((p) => {
      const dir = projectDir(p);
      return `echo "${p._id} $([ -d ${dir} ] && find ${dir} \\( -name node_modules -o -name .git \\) -prune -o -type f -printf '%T@\\n' 2>/dev/null | sort -n | tail -1)"`;
    }).join("; ");
    const { stdout } = await ssh.execCommand(script);
    for (const line of stdout.split("\n")) {
      const [id, secs] = line.trim().split(/\s+/);
      const ms = Math.round(parseFloat(secs) * 1000);
      if (!id) continue;
      if (Number.isFinite(ms)) {
        times[id] = new Date(ms);
        redis.set(EDIT_CACHE_KEY(id), String(ms), "EX", EDIT_CACHE_TTL).catch(() => {});
      } else if (!secs) {
        redis.set(EDIT_CACHE_KEY(id), EDIT_CACHE_NO_FILES, "EX", EDIT_CACHE_TTL).catch(() => {});
      }
    }
  } catch (e) {
    console.error("[IDE] Could not read file edit times:", e.message);
  } finally {
    ssh?.dispose();
  }
  return times;
}

router.get("/projects", isAuthenticated, async (req, res) => {
  await connectDB();
  // A folder project never has a cloud repo of its own (that comes only with "Also use in the cloud", which makes it a
  // cloud project). The desktop app once saved a folder's GitHub link there by mistake: clear it, so cloud projects
  // and repo links work again.
  await IdeProject.updateMany({ owner: req.user._id, location: "local", repo: { $nin: [null, ""] } }, { $set: { repo: null } }).catch(() => {});
  const projects = await IdeProject.find({ owner: req.user._id }).sort({ updatedAt: -1 }).limit(200);
  const edits = await newestFileEdits(projects);
  const list = projects.map((p) => {
    const json = projectJson(p);
    const edited = edits[String(p._id)];
    if (edited && (!json.updatedAt || edited > new Date(json.updatedAt))) json.updatedAt = edited;
    return json;
  });
  list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  res.json({ projects: list });
});

// Each user's project names are unique (ignoring upper/lower case), so the project list is never ambiguous
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const nameTaken = (ownerId, name, exceptId) => IdeProject.findOne({
  owner: ownerId,
  ...(exceptId ? { _id: { $ne: exceptId } } : {}),
  name: new RegExp(`^${escapeRegex(name)}$`, "i"),
}).select("_id").lean();

router.post("/projects", isAuthenticated, async (req, res) => {
  const name = String(req.body?.name || "").trim().slice(0, 80);
  if (!name) return res.status(400).json({ error: "Give the project a name" });
  await connectDB();
  if (await nameTaken(req.user._id, name)) return res.status(409).json({ error: `You already have a project called "${name}". Pick another name.` });
  const logo = req.body?.logo !== undefined ? projectLogo(req.body.logo, req.user._id) : null;
  if (logo === undefined) return res.status(400).json({ error: "Could not use this logo. Upload it again." });
  const project = await IdeProject.create({ owner: req.user._id, name, logo });
  res.json({ project: projectJson(project) });
});

// A project from a folder on the user's own computer (Classgrid desktop app): its tools run there, never on our sandbox
router.post("/projects/local", isAuthenticated, async (req, res) => {
  const localPath = String(req.body?.localPath || "").trim().slice(0, 500);
  if (!localPath) return res.status(400).json({ error: "Pick a folder" });
  const name = String(req.body?.name || localPath.split(/[\\/]/).filter(Boolean).pop() || "").trim().slice(0, 80);
  if (!name) return res.status(400).json({ error: "Give the project a name" });
  await connectDB();
  // The same folder opens its project again (Windows paths: any case, with or without a slash at the end)
  const existing = await IdeProject.findOne({ owner: req.user._id, location: "local", localPath: new RegExp(`^${escapeRegex(localPath.replace(/[\\/]+$/, ""))}[\\\\/]*$`, "i") });
  if (existing) return res.json({ project: projectJson(existing) });
  // A name that is already used gets a number, like "app (2)"
  let free = name;
  for (let n = 2; n < 100 && (await nameTaken(req.user._id, free)); n++) free = `${name.slice(0, 74)} (${n})`;
  const project = await IdeProject.create({ owner: req.user._id, name: free, location: "local", localPath });
  res.json({ project: projectJson(project) });
});

router.patch("/projects/:id", isAuthenticated, async (req, res) => {
  const project = await ownProject(req, res);
  if (!project) return;
  if (req.body?.name !== undefined) {
    const name = String(req.body.name).trim().slice(0, 80);
    if (!name) return res.status(400).json({ error: "Give the project a name" });
    if (await nameTaken(req.user._id, name, project._id)) return res.status(409).json({ error: `You already have a project called "${name}". Pick another name.` });
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
  if (req.body?.logo !== undefined) {
    const logo = projectLogo(req.body.logo, req.user._id);
    if (logo === undefined) return res.status(400).json({ error: "Could not use this logo. Upload it again." });
    project.logo = logo;
  }
  await project.save();
  res.json({ project: projectJson(project) });
});

// The repo's GitHub details for the project card, like Vercel shows: branch, last commit, repo link.
// Kept in Redis for 60s per project so opening the page doesn't call GitHub again and again.
const GIT_INFO_KEY = (id) => `ide:gitInfo:${id}`;

// The Vercel project made from this repo, when the user connected Vercel: its dashboard link and its live app link.
// Any Vercel problem just means no Vercel line on the card.
async function vercelFor(userId, repo) {
  try {
    const user = await User.findById(userId).select("vercel_access_token vercel_team_id").lean();
    if (!user?.vercel_access_token) return null;
    const headers = { Authorization: `Bearer ${user.vercel_access_token}` };
    const team = user.vercel_team_id ? `&teamId=${encodeURIComponent(user.vercel_team_id)}` : "";
    const pRes = await fetch(`https://api.vercel.com/v10/projects?repoUrl=${encodeURIComponent(`https://github.com/${repo}`)}&limit=1${team}`, { headers });
    if (!pRes.ok) return null;
    const project = (await pRes.json())?.projects?.[0];
    if (!project?.name) return null;
    const domains = project.targets?.production?.alias || [];
    const domain = domains.find((d) => !d.endsWith(".vercel.app")) || domains[0] || `${project.name}.vercel.app`;
    let slug = null;
    if (user.vercel_team_id) {
      const t = await fetch(`https://api.vercel.com/v2/teams/${encodeURIComponent(user.vercel_team_id)}`, { headers });
      if (t.ok) slug = (await t.json())?.slug || null;
    } else {
      const u = await fetch("https://api.vercel.com/v2/user", { headers });
      if (u.ok) slug = (await u.json())?.user?.username || null;
    }
    return {
      name: project.name,
      dashboardUrl: slug ? `https://vercel.com/${slug}/${project.name}` : "https://vercel.com/dashboard",
      appUrl: `https://${domain}`,
      domain,
    };
  } catch (e) {
    console.error("[IDE] Vercel info failed:", e.message);
    return null;
  }
}
router.get("/projects/:id/github", isAuthenticated, async (req, res) => {
  const project = await ownProject(req, res);
  if (!project) return;
  if (!project.repo) return res.json({ repoUrl: null, branch: null, commit: null, vercel: null });
  try {
    const cached = await redis.get(GIT_INFO_KEY(project._id)).catch(() => null);
    if (cached) return res.json(JSON.parse(cached));
    const user = await githubTokenFor(req.user._id);
    if (!user) return res.status(409).json({ error: "github_not_connected" });
    const headers = { Authorization: `Bearer ${user.github_access_token}`, Accept: "application/vnd.github+json", "User-Agent": "Classgrid" };
    const repoRes = await fetch(`https://api.github.com/repos/${project.repo}`, { headers });
    if (repoRes.status === 401) return res.status(409).json({ error: "github_expired" });
    if (!repoRes.ok) return res.json({ repoUrl: `https://github.com/${project.repo}`, branch: null, commit: null });
    const repo = await repoRes.json();
    const branch = repo.default_branch || null; // Project Mode opens the default branch
    let commit = null;
    if (branch) {
      const cRes = await fetch(`https://api.github.com/repos/${project.repo}/commits/${encodeURIComponent(branch)}`, { headers });
      if (cRes.ok) {
        const c = await cRes.json();
        commit = {
          message: String(c.commit?.message || "").split("\n")[0].slice(0, 200),
          date: c.commit?.committer?.date || c.commit?.author?.date || null,
          sha: String(c.sha || "").slice(0, 7),
          url: c.html_url || null,
        };
      }
    }
    const vercel = await vercelFor(req.user._id, project.repo);
    const info = { repoUrl: repo.html_url || `https://github.com/${project.repo}`, branch, commit, vercel };
    redis.set(GIT_INFO_KEY(project._id), JSON.stringify(info), "EX", 60).catch(() => {});
    res.json(info);
  } catch (e) {
    console.error("[IDE] GitHub info failed:", e.message);
    res.status(500).json({ error: "Could not load GitHub details" });
  }
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
  // A folder on the user's computer has nothing to download here: the desktop app works on it directly
  if (project.location === "local") return res.json({ ok: true, local: true, localPath: project.localPath });
  // The desktop app on a computer that has this project's folder: it opens there, as it is (nothing from GitHub)
  const copy = req.body?.deviceId && project.repo ? copyOn(project, String(req.body.deviceId)) : null;
  if (copy) {
    return openCopyHere(res, project, copy, String(req.body.deviceId)).catch((e) => {
      console.error("[IDE] Opening the computer copy failed:", e.message);
      res.status(500).json({ error: "Could not open this project on this computer" });
    });
  }
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
      // Download through the Classgrid app when it is installed on the repo, else with the user's key as before
      const key = (await repoAppToken(project.repo).catch(() => null)) || user.github_access_token;
      const auth = Buffer.from(`x-access-token:${key}`).toString("base64");
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
      // One open PR per project: while a Classgrid pull request is open, work starts from its branch, so the
      // AI sees the changes that are not merged yet and its new commits go to that same pull request
      const base = (await ssh.execCommand(`git -C ${dir} rev-parse --abbrev-ref HEAD`)).stdout.trim();
      const openBranch = await openClassgridPrBranch(project.repo, key, base);
      if (openBranch) {
        const ref = JSON.stringify(`+refs/heads/${openBranch}:refs/remotes/origin/${openBranch}`);
        await ssh.execCommand(
          `GIT_TERMINAL_PROMPT=0 GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=http.https://github.com/.extraheader GIT_CONFIG_VALUE_0="AUTHORIZATION: basic ${auth}" ` +
          `git -C ${dir} fetch -q --depth 1 origin ${ref} && git -C ${dir} checkout -q -B ${JSON.stringify(openBranch)} ${JSON.stringify(`origin/${openBranch}`)}`
        );
      }
      if (user.github_name) await ssh.execCommand(`git -C ${dir} config user.name ${JSON.stringify(user.github_name)}`);
      if (user.github_email) await ssh.execCommand(`git -C ${dir} config user.email ${JSON.stringify(user.github_email)}`);
    } else if (!project.repo) {
      // An empty project (no repo yet): a git folder, so changes can be tracked and the AI can make a repo for it later
      await ssh.execCommand(`mkdir -p ${dir} && cd ${dir} && ([ -d .git ] || git init -q -b main)`);
    } else {
      await ssh.execCommand(`mkdir -p ${dir}`);
    }
    // Studio Mode downloads the code for the agent only: no code editor box (packages are still installed, below)
    const noEditor = !!req.body?.noEditor;
    if (noEditor) await touchStudio(req.user._id).catch(() => {});
    if (!noEditor) await ensureBox(ssh, String(req.user._id));
    // A fresh download has no packages, so the editor's type checker marks every file red. Install them in the
    // background for the project folder and each first-level folder with its own package.json (client/, server/...),
    // with the user's package cache. It runs in a separate short-lived box with its own memory: inside the editor
    // box a big install is killed for lack of memory. Same walls as the editor box (only this user's folder).
    let installing = false;
    const { stdout: needs } = await ssh.execCommand(
      `cd ${dir} && for f in package.json */package.json; do [ -f "$f" ] && d=$(dirname "$f") && [ ! -d "$d/node_modules" ] && echo "$d"; done`
    );
    const folders = needs.split("\n").map((x) => x.trim()).filter((x) => /^[A-Za-z0-9._-]+$/.test(x)).slice(0, 6);
    // The install box can use up to 1.5 GB: only start it when the server has that much free, so it never
    // pushes the sandbox over (opening the project again later installs what is missing)
    const { stdout: freeMb } = await ssh.execCommand(`awk '/^MemAvailable:/ { print int($2 / 1024) }' /proc/meminfo`);
    if (folders.length && Number(freeMb) < 1700) console.error(`[IDE] Package install skipped for now: only ${freeMb.trim()} MB free`);
    if (folders.length && Number(freeMb) >= 1700) {
      installing = true;
      const inBox = `/home/workspace/projects/${project._id}`;
      const steps = folders.map((f) => `cd ${inBox}/${f} && npm install --ignore-scripts --no-audit --no-fund >> /home/workspace/.classgrid/npm-install-${project._id}.log 2>&1`).join("; ");
      await ssh.execCommand(
        `docker rm -f ide-npm-${req.user._id} >/dev/null 2>&1; docker run -d --rm --name ide-npm-${req.user._id} --network ide-net --memory 1500m --memory-swap 1500m --cpus 1 --pids-limit 512 ` +
        `-u 1000:1000 -e HOME=/home/workspace -e npm_config_cache=/home/workspace/.cache/npm -v /home/ubuntu/ide_users/${req.user._id}:/home/workspace ` +
        `--entrypoint sh classgrid-ide -c ${JSON.stringify(`mkdir -p /home/workspace/.classgrid; ${steps}`)}`
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

// Studio Mode's Files tab: a project's files and one file's text. A project with a repo is read from GitHub (the open
// Classgrid pull request's branch when there is one, so unmerged work shows too); one without a repo is read from its
// folder on the sandbox, when it has one.
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "dist", "build", ".cache", "__pycache__", ".venv", "venv"]);
const MAX_FILE_BYTES = 1024 * 1024;
// Pictures open as pictures in Studio's Files tab (up to 8 MB)
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", avif: "image/avif", bmp: "image/bmp", ico: "image/x-icon", svg: "image/svg+xml" };
// A path inside the project: no "..", no empty parts and no control characters. It goes into a shell command only
// through shellQuote (single quotes), so $(...) or backticks in a file name are never run.
const safeFilePath = (p) => {
  const path = String(p || "").replace(/^\/+/, "");
  if (!path || path.length > 1000 || /[\x00-\x1f\x7f]/.test(path)) return null;
  return !path.split("/").some((part) => !part || part === "." || part === "..") ? path : null;
};
const shellQuote = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;

async function projectGithub(project, userId) {
  const key = (await repoAppToken(project.repo).catch(() => null)) || (await githubTokenFor(userId))?.github_access_token;
  if (!key) return null;
  const gh = (path, accept = "application/vnd.github+json") => fetch(`https://api.github.com/repos/${project.repo}${path}`, {
    headers: { Authorization: `Bearer ${key}`, Accept: accept, "User-Agent": "Classgrid" },
  });
  const repoRes = await gh("");
  if (!repoRes.ok) return { gh, error: repoRes.status === 404 ? "The repo was not found, or Classgrid cannot see it" : `GitHub said ${repoRes.status}` };
  const base = (await repoRes.json()).default_branch || "main";
  const branch = (await openClassgridPrBranch(project.repo, key, base)) || base;
  return { gh, branch };
}

router.get("/projects/:id/files", isAuthenticated, async (req, res) => {
  const project = await ownProject(req, res);
  if (!project) return;
  // A folder on the user's computer: the desktop app lists it itself
  if (project.location === "local") return res.json({ local: true, localPath: project.localPath, files: [] });
  touchStudio(req.user._id).catch(() => {});
  try {
    // The project's code on the sandbox (opened in Studio or Project Mode) shows the agent's newest edits first
    const ssh = await sandboxSsh().catch((e) => { console.error("[IDE] Sandbox not reached for Files:", e.message); return null; });
    if (ssh) try {
      const dir = projectDir(project);
      const { stdout: has } = await ssh.execCommand(`[ -d ${dir} ] && ls -A ${dir} | head -1`);
      if (has.trim() || !project.repo) {
        const prune = [...SKIP_DIRS].map((d) => `-name ${shellQuote(d)}`).join(" -o ");
        const { stdout } = await ssh.execCommand(
          `[ -d ${dir} ] && cd ${dir} && find . -mindepth 1 \\( -type d \\( ${prune} \\) -prune \\) -o \\( -type d -printf 'd %P\\n' \\) -o \\( -type f -printf 'f %s %P\\n' \\) 2>/dev/null | head -5000`
        );
        const files = stdout.split("\n").filter(Boolean).map((line) => {
          if (line.startsWith("d ")) return { path: line.slice(2), type: "dir", size: null };
          const [, size, ...rest] = line.split(" ");
          return { path: rest.join(" "), type: "file", size: Number(size) || 0 };
        }).filter((f) => f.path);
        const { stdout: branch } = await ssh.execCommand(`[ -d ${dir}/.git ] && git -C ${dir} rev-parse --abbrev-ref HEAD 2>/dev/null`);
        return res.json({ source: "sandbox", repo: project.repo || null, branch: branch.trim() || null, files });
      }
    } finally {
      ssh.dispose();
    }
    if (!project.repo) return res.status(503).json({ error: ssh ? "This project has no files yet" : "The sandbox can't be reached right now. Try again in a moment." });
    // Not downloaded yet (or the sandbox can't be reached): read the repo on GitHub (the open Classgrid pull request's branch when there is one)
    const g = await projectGithub(project, req.user._id);
    if (!g) return res.status(409).json({ error: "github_not_connected" });
    if (g.error) return res.status(502).json({ error: g.error });
    const treeRes = await g.gh(`/git/trees/${encodeURIComponent(g.branch)}?recursive=1`);
    if (treeRes.status === 409) return res.json({ source: "github", repo: project.repo, branch: g.branch, files: [] }); // empty repo
    if (!treeRes.ok) return res.status(502).json({ error: `Could not read the repo's files (GitHub said ${treeRes.status})` });
    const tree = await treeRes.json();
    const files = (tree.tree || [])
      .filter((t) => (t.type === "blob" || t.type === "tree") && !t.path.split("/").some((part) => SKIP_DIRS.has(part)))
      .slice(0, 5000)
      .map((t) => ({ path: t.path, type: t.type === "tree" ? "dir" : "file", size: t.size ?? null }));
    res.json({ source: "github", repo: project.repo, branch: g.branch, files, truncated: !!tree.truncated });
  } catch (e) {
    console.error("[IDE] Files list failed:", e.message);
    res.status(500).json({ error: "Could not load the files" });
  }
});

router.get("/projects/:id/file", isAuthenticated, async (req, res) => {
  const project = await ownProject(req, res);
  if (!project) return;
  if (project.location === "local") return res.json({ local: true, localPath: project.localPath });
  touchStudio(req.user._id).catch(() => {});
  const path = safeFilePath(req.query.path);
  if (!path) return res.status(400).json({ error: "Pick a file" });
  const imageType = IMAGE_TYPES[(path.split(".").pop() || "").toLowerCase()];
  const limit = imageType ? MAX_IMAGE_BYTES : MAX_FILE_BYTES;
  try {
    let buf = null;
    const ssh = await sandboxSsh().catch((e) => { console.error("[IDE] Sandbox not reached for Files:", e.message); return null; });
    if (ssh) try {
      const full = shellQuote(`${projectDir(project)}/${path}`);
      const { stdout, code } = await ssh.execCommand(`[ -f ${full} ] && head -c ${limit + 1} ${full} | base64 -w0`);
      if (!code) buf = Buffer.from(stdout, "base64");
    } finally {
      ssh.dispose();
    }
    if (!buf) {
      if (!project.repo) return res.status(404).json({ error: "File not found" });
      const g = await projectGithub(project, req.user._id);
      if (!g) return res.status(409).json({ error: "github_not_connected" });
      if (g.error) return res.status(502).json({ error: g.error });
      const fileRes = await g.gh(`/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(g.branch)}`, "application/vnd.github.raw");
      if (!fileRes.ok) return res.status(fileRes.status === 404 ? 404 : 502).json({ error: fileRes.status === 404 ? "File not found" : `GitHub said ${fileRes.status}` });
      buf = Buffer.from(await fileRes.arrayBuffer());
    }
    if (imageType) {
      if (buf.length > MAX_IMAGE_BYTES) return res.json({ path, binary: true, size: buf.length });
      return res.json({ path, binary: true, image: true, mime: imageType, size: buf.length, data: buf.toString("base64") });
    }
    if (buf.includes(0)) return res.json({ path, binary: true, size: buf.length });
    const tooBig = buf.length > MAX_FILE_BYTES;
    res.json({ path, binary: false, size: buf.length, truncated: tooBig, content: buf.subarray(0, MAX_FILE_BYTES).toString("utf8") });
  } catch (e) {
    console.error("[IDE] File read failed:", e.message);
    res.status(500).json({ error: "Could not open the file" });
  }
});

// Comments the user makes on code lines in Studio's Files tab are also kept in the project itself, in one record file
// per repo (made on the first comment, new entries added at the bottom), so the record goes to GitHub with the code.
const CODE_COMMENTS_FILE = ".classgrid/code-comments.md";
router.post("/projects/:id/code-comments", isAuthenticated, async (req, res) => {
  const project = await ownProject(req, res);
  if (!project) return;
  const path = safeFilePath(req.body?.path);
  const action = ["added", "edited", "deleted"].includes(req.body?.action) ? req.body.action : "added";
  const comment = String(req.body?.comment || "").trim().slice(0, 4000);
  const startLine = Math.max(1, parseInt(req.body?.startLine, 10) || 1);
  const endLine = Math.max(startLine, parseInt(req.body?.endLine, 10) || startLine);
  const code = String(req.body?.code || "").slice(0, 8000);
  if (!path || (!comment && action !== "deleted")) return res.status(400).json({ error: "A file and a comment are needed" });
  const when = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const lines = startLine === endLine ? `L${startLine}` : `L${startLine}-${endLine}`;
  const fence = code.includes("```") ? "````" : "```";
  const entry = `\n## ${when} IST · ${path} ${lines} · ${action[0].toUpperCase()}${action.slice(1)}\n\n${comment || "(comment deleted)"}\n${code && action !== "deleted" ? `\n${fence}\n${code.replace(/\n+$/, "")}\n${fence}\n` : ""}`;
  let ssh;
  try {
    ssh = await sandboxSsh();
    const dir = projectDir(project);
    const { stdout: there } = await ssh.execCommand(`[ -d ${shellQuote(dir)} ] && echo yes`);
    if (!there.trim()) return res.status(409).json({ error: "The project's code is not open right now, so the comment was kept in the chat only" });
    const file = shellQuote(`${dir}/${CODE_COMMENTS_FILE}`);
    const header = "# Code comments\n\nEvery comment made on this code in Classgrid Studio, with the date, time, file and lines. New ones are added at the bottom.\n";
    const { stdout: exists } = await ssh.execCommand(`[ -f ${file} ] && echo yes`);
    const { code: failed } = await ssh.execCommand(`mkdir -p ${shellQuote(`${dir}/.classgrid`)} && cat >> ${file}`, { stdin: (exists.trim() ? "" : header) + entry });
    if (failed) return res.status(500).json({ error: "Could not save the comment in the project" });
    res.json({ ok: true, file: CODE_COMMENTS_FILE });
  } catch (e) {
    console.error("[IDE] Code comment save failed:", e.message);
    res.status(500).json({ error: "Could not save the comment in the project" });
  } finally {
    ssh?.dispose();
  }
});

// Studio Mode's Project tab: the project's commit history on the branch the agent works on (the open Classgrid pull
// request's branch when there is one), and that pull request.
router.get("/projects/:id/commits", isAuthenticated, async (req, res) => {
  const project = await ownProject(req, res);
  if (!project) return;
  if (!project.repo) return res.json({ branch: null, pr: null, commits: [] });
  try {
    const g = await projectGithub(project, req.user._id);
    if (!g) return res.status(409).json({ error: "github_not_connected" });
    if (g.error) return res.status(502).json({ error: g.error });
    const listRes = await g.gh(`/commits?sha=${encodeURIComponent(g.branch)}&per_page=30`);
    if (listRes.status === 409) return res.json({ branch: g.branch, pr: null, commits: [] }); // empty repo
    if (!listRes.ok) return res.status(502).json({ error: `Could not read the history (GitHub said ${listRes.status})` });
    const commits = (await listRes.json()).map((c) => ({
      sha: String(c.sha || "").slice(0, 7),
      message: String(c.commit?.message || "").split("\n")[0].slice(0, 200),
      author: c.commit?.author?.name || c.author?.login || null,
      avatar: c.author?.avatar_url || null,
      date: c.commit?.author?.date || c.commit?.committer?.date || null,
      url: c.html_url || null,
    }));
    let pr = null;
    if (g.branch.startsWith("classgrid/")) {
      const prRes = await g.gh(`/pulls?state=open&head=${encodeURIComponent(`${project.repo.split("/")[0]}:${g.branch}`)}`);
      const open = prRes.ok ? (await prRes.json())[0] : null;
      if (open) pr = { number: open.number, title: open.title, url: open.html_url };
    }
    res.json({ branch: g.branch, pr, commits });
  } catch (e) {
    console.error("[IDE] Commit history failed:", e.message);
    res.status(500).json({ error: "Could not load the history" });
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

// ── One project in both places: the cloud and a copy on the user's computer ──────────────────────────────────
// A cloud project can also have a copy on each of the user's computers (localCopies, one per desktop app deviceId).
// The website always opens it in the cloud; the desktop app can open it "On this computer" (here), and then that
// app's chats run their tools in the copy (projectForChat). GitHub keeps the two in step: work is pushed when it
// leaves a place (and after each answer that changed files), and the latest is pulled when the other place opens.
const DEVICE_ID = /^[A-Za-z0-9_-]{8,128}$/;
const copyOn = (project, deviceId) => (project.localCopies || []).find((c) => c.deviceId === deviceId) || null;
// This computer's entry set (or removed with null), keeping the other computers' copies
function putCopy(project, deviceId, copy) {
  const others = (project.localCopies || []).filter((c) => c.deviceId !== deviceId).map((c) => (c.toObject ? c.toObject() : c));
  project.localCopies = copy ? [...others, { deviceId, ...copy }] : others;
}
const lastLine = (text) => String(text || "").trim().split("\n").pop();
const runnerLine = (text, key) => String(text || "").match(new RegExp(`^${key}: (.+)$`, "m"))?.[1]?.trim() || null;
const ghHeaders = (key) => ({ Authorization: `Bearer ${key}`, Accept: "application/vnd.github+json", "User-Agent": "Classgrid" });

// What every step needs: the user's GitHub login and (when the computer does something) their desktop app connected.
// Sends the error itself and returns null.
async function readyForCopy(req, res, { app = true } = {}) {
  const deviceId = String(req.body?.deviceId || "");
  if (!DEVICE_ID.test(deviceId)) { res.status(400).json({ error: "This works in the Classgrid desktop app on your computer." }); return null; }
  const user = await githubTokenFor(req.user._id);
  if (!user) { res.status(409).json({ error: "github_not_connected" }); return null; }
  if (app && !(await runnerOnline(req.user._id))) { res.status(409).json({ error: "The Classgrid desktop app isn't connected right now. Check you're logged in to the app, then try again.", code: "app_not_open" }); return null; }
  return { deviceId, user, key: (project) => repoAppToken(project.repo).catch(() => null).then((k) => k || user.github_access_token) };
}

// One step done by the desktop app (desktop/runner.js clone_repo / sync_repo): { text } or { error, code } in easy words
async function onComputer(project, folder, tool, args) {
  const text = await callLocal({ owner: project.owner, _id: project._id, localPath: folder }, tool, args);
  if (!/^Error/.test(text)) return { text };
  if (/can't run on this computer/.test(text)) return { code: "old_app", error: "Update the Classgrid desktop app to use a project in both places (download it again from classgrid.in)." };
  if (/isn't open there|didn't answer in time/.test(text)) return { code: "app_not_open", error: "The Classgrid desktop app didn't answer. Check it's open and you're logged in, then try again." };
  if (/wasn't opened in the Classgrid app/.test(text)) return { code: "folder_gone", error: `The folder ${folder} wasn't picked in the Classgrid app on this computer.` };
  const code = (text.match(/^Error:\s*([A-Z_]{4,})\s/)?.[1] || "").toLowerCase() || null;
  return { code, error: text.replace(/^Error:\s*(?:[A-Z_]{4,}\s+)?/, "") };
}

// The branch both places work on, like opening in the cloud: the open Classgrid pull request's branch, else the
// repo's default branch. Also the repo's size in KB (for the free space check).
async function projectBranch(repo, key) {
  const r = await fetch(`https://api.github.com/repos/${repo}`, { headers: ghHeaders(key) }).catch(() => null);
  if (!r?.ok) return { error: r?.status === 404 ? `GitHub can't find ${repo}, or Classgrid can't see it.` : "GitHub can't be reached right now. Try again in a moment." };
  const info = await r.json().catch(() => ({}));
  return { branch: (await openClassgridPrBranch(repo, key, info.default_branch)) || info.default_branch || "main", sizeKb: Number(info.size) || 0 };
}

// Before the computer copy is used: the cloud copy's work that isn't on GitHub yet is pushed to the project's branch
// (like the Push button), then the cloud copy is cleared, so the next cloud open downloads it fresh. If that push
// can't be done, the usual cleanup keeps it safe on a "classgrid-backup-..." branch. Returns a line for the user
// ("" when there was nothing to save), or { error } when the work couldn't be saved (then nothing is changed).
async function saveCloudCopy(project) {
  const ssh = await sandboxSsh().catch((e) => { console.error("[IDE] Sandbox not reached before using the computer copy:", e.message); return null; });
  if (!ssh) return "";
  try {
    const dir = projectDir(project);
    const { stdout: unsaved } = await ssh.execCommand(`[ -d ${dir}/.git ] && { git -C ${dir} status --porcelain | head -1; git -C ${dir} rev-list --count @{u}..HEAD 2>/dev/null | grep -v '^0$'; }`);
    let line = "";
    if (unsaved.trim()) {
      const result = await pushProject(project.toObject(), ssh, "Saved by Classgrid: work from the cloud");
      if (/pushed/i.test(result) && !/failed|stopped/i.test(result)) {
        const { stdout: branch } = await ssh.execCommand(`git -C ${dir} rev-parse --abbrev-ref HEAD`);
        line = `Your cloud work was saved to GitHub first (branch ${branch.trim() || "main"}).`;
      }
    }
    const r = await backupAndRemoveProjectCode(ssh, project.toObject());
    if (!r.removed) return { error: `Your cloud work couldn't be saved to GitHub, so nothing was changed (${r.reason}).` };
    if (r.backupBranch) {
      await IdeProject.updateOne({ _id: project._id }, { $unset: { lastBackup: 1 } }); // told now, not on the next open
      line = `Your unsaved cloud work couldn't go to the project's branch, so it was saved to the GitHub branch "${r.backupBranch}". Merge it on GitHub to get it here.`;
    }
    return line;
  } finally {
    ssh.dispose();
  }
}

// Opening the project on this computer: it is the user's folder, used as it is. Nothing is downloaded from GitHub and
// GitHub isn't needed (the folder gets GitHub's changes only when the user asks the agent to pull).
async function openCopyHere(res, project, copy, deviceId) {
  putCopy(project, deviceId, { path: copy.path, at: new Date(), here: true });
  project.lastOpenedAt = new Date();
  await project.save();
  res.json({ ok: true, local: true, localPath: copy.path, project: projectJson(project) });
}

// This computer's copy pushed to GitHub (to its branch): { message } or { error, code }
async function saveComputerCopy(project, copy, ready) {
  const key = await ready.key(project);
  const r = await onComputer(project, copy.path, "sync_repo", { mode: "push", repo: project.repo, message: "Saved by Classgrid", token: key, name: ready.user.github_name, email: ready.user.github_email });
  return r.error ? { error: `Your work on this computer couldn't be saved to GitHub: ${r.error}`, code: r.code } : { message: lastLine(r.text) };
}

// "Get a copy on this computer": the repo is downloaded into the folder the user picked (any drive), after the cloud's
// work is saved to GitHub and the drive is checked for room. From then on the project opens on this computer here.
router.post("/projects/:id/copy", isAuthenticated, async (req, res) => {
  const project = await ownProject(req, res);
  if (!project) return;
  const folder = String(req.body?.folder || "").trim().slice(0, 500);
  if (!folder) return res.status(400).json({ error: "Pick a folder" });
  if (project.location === "local") return res.status(409).json({ error: "This project is already a folder on your computer." });
  if (!project.repo) return res.status(409).json({ error: "This project isn't on GitHub yet. Push it to GitHub first, then get a copy on this computer.", code: "not_on_github" });
  try {
    const ready = await readyForCopy(req, res);
    if (!ready) return;
    const saved = await saveCloudCopy(project);
    if (saved?.error) return res.status(409).json({ error: saved.error });
    const key = await ready.key(project);
    const where = await projectBranch(project.repo, key);
    if (where.error) return res.status(502).json({ error: where.error });
    const r = await onComputer(project, folder, "clone_repo", { repo: project.repo, branch: where.branch, size_kb: where.sizeKb, token: key, name: ready.user.github_name, email: ready.user.github_email });
    if (r.error) return res.status(409).json({ error: r.code === "folder_gone" ? "This folder wasn't picked in the Classgrid app. Pick it again." : r.error, code: r.code });
    const path = runnerLine(r.text, "Folder");
    if (!path) return res.status(502).json({ error: "The download didn't finish. Try again." });
    putCopy(project, ready.deviceId, { path, at: new Date(), here: true });
    await project.save();
    res.json({ ok: true, local: true, localPath: path, project: projectJson(project), message: [saved, lastLine(r.text)].filter(Boolean).join(" ") });
  } catch (e) {
    console.error("[IDE] Copy to computer failed:", e.message);
    res.status(500).json({ error: "Could not get a copy on this computer" });
  }
});

// Switch where the project opens in this desktop app: "local" (this computer's copy, with the latest pulled first)
// or "cloud" (this computer's work pushed first, unless skipSave: the user chose to leave it on this computer).
router.post("/projects/:id/where", isAuthenticated, async (req, res) => {
  const project = await ownProject(req, res);
  if (!project) return;
  const where = ["local", "cloud"].includes(req.body?.where) ? req.body.where : null;
  if (!where) return res.status(400).json({ error: "Pick where to open the project" });
  if (project.location === "local") return res.status(409).json({ error: "This project is only a folder on your computer. Use \"Also use in the cloud\" first." });
  try {
    // On this computer: the folder as it is, no GitHub needed
    if (where === "local") {
      const deviceId = String(req.body?.deviceId || "");
      const here = DEVICE_ID.test(deviceId) ? copyOn(project, deviceId) : null;
      if (!here) return res.status(409).json({ error: "There's no copy of this project on this computer yet. Get a copy first.", code: "no_copy" });
      return await openCopyHere(res, project, here, deviceId);
    }
    // Nothing is pushed by itself: this computer's work goes to GitHub only when the user asks the agent to push
    const skipSave = where === "cloud";
    const ready = await readyForCopy(req, res, { app: !skipSave });
    if (!ready) return;
    const copy = copyOn(project, ready.deviceId);
    if (!copy) return res.status(409).json({ error: "There's no copy of this project on this computer yet. Get a copy first.", code: "no_copy" });
    let message = "";
    if (copy.here && !skipSave) {
      const saved = await saveComputerCopy(project, copy, ready);
      if (saved.error) return res.status(409).json(saved);
      message = saved.message;
    }
    putCopy(project, ready.deviceId, { path: copy.path, at: new Date(), here: false });
    await project.save();
    res.json({ ok: true, project: projectJson(project), message: [message, "This project now opens in the cloud."].filter(Boolean).join(" ") });
  } catch (e) {
    console.error("[IDE] Switching where the project opens failed:", e.message);
    res.status(500).json({ error: "Could not switch where this project opens" });
  }
});

// Save this computer's copy to GitHub now (leaving the project in the desktop app)
router.post("/projects/:id/sync", isAuthenticated, async (req, res) => {
  const project = await ownProject(req, res);
  if (!project) return;
  try {
    const ready = await readyForCopy(req, res);
    if (!ready) return;
    const copy = copyOn(project, ready.deviceId);
    if (!copy || project.location === "local" || !project.repo) return res.status(409).json({ error: "There's no copy of this project on this computer.", code: "no_copy" });
    // Nothing is pushed by itself (owner's rule): the work stays in the folder until the user asks the agent to push
    res.json({ ok: true, message: "" });
  } catch (e) {
    console.error("[IDE] Saving the computer copy failed:", e.message);
    res.status(500).json({ error: "Could not save to GitHub" });
  }
});

// A new private GitHub repo for a folder project, named after it, made with the user's own key (like
// createRepoForProject: GitHub itself checks the user may make it)
async function newRepoFor(project, token) {
  const base = String(project.name || "project").toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "project";
  for (const name of [base, `${base}-${String(project._id).slice(-6)}`]) {
    const r = await fetch("https://api.github.com/user/repos", {
      method: "POST",
      headers: { ...ghHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({ name, private: true, description: "Made by Classgrid Project Mode" }),
    }).catch(() => null);
    const gh = r ? await r.json().catch(() => ({})) : {};
    if (r?.ok && gh.full_name) return { repo: gh.full_name };
    if (r?.status === 401) return { error: "GitHub refused your saved login. Reconnect GitHub in AI Hub, then try again." };
    if (r?.status !== 422) return { error: `Couldn't make a GitHub repo: ${gh.message || r?.status || "GitHub can't be reached"}` };
  }
  return { error: "Couldn't make a GitHub repo: that name is already taken on your GitHub. Rename the project, then try again." };
}

// A folder project whose folder is on GitHub (the user asked the agent to make a repo and push it): it is linked to that
// repo and becomes the same project in both places (the cloud, and this folder as this computer's copy), keeping its
// name, logo and chats. Nothing is pushed, no repo is made and nothing is uploaded here (owner's rule, 2026-11-02).
router.post("/projects/:id/cloud", isAuthenticated, async (req, res) => {
  const project = await ownProject(req, res);
  if (!project) return;
  if (project.location !== "local") return res.status(409).json({ error: "This project already works in the cloud." });
  try {
    const ready = await readyForCopy(req, res);
    if (!ready) return;
    const r = await onComputer(project, project.localPath, "folder_repo", {});
    if (r.error) return res.status(409).json({ error: r.code === "no_remote" || /NO_REMOTE/.test(r.error) ? "This folder isn't on GitHub yet. Ask the agent to make a GitHub repo for this project and push it." : r.error, code: "not_on_github" });
    const repo = runnerLine(r.text, "Repo");
    if (!REPO_NAME.test(repo || "")) return res.status(409).json({ error: "This folder isn't on GitHub yet. Ask the agent to make a GitHub repo for this project and push it.", code: "not_on_github" });
    const other = await IdeProject.findOne({ owner: req.user._id, _id: { $ne: project._id }, repo: new RegExp(`^${escapeRegex(repo)}$`, "i") }).select("name");
    if (other) return res.status(409).json({ error: `This folder's repo ${repo} is already linked to your project "${other.name}". Open that project instead.`, code: "repo_taken" });
    const folder = project.localPath;
    project.repo = repo;
    project.location = "cloud";
    project.localPath = null;
    putCopy(project, ready.deviceId, { path: folder, at: new Date(), here: true });
    await project.save();
    res.json({ ok: true, project: projectJson(project), message: `Linked to ${repo}. This project now works in the cloud too.` });
  } catch (e) {
    console.error("[IDE] Linking the folder's repo failed:", e.message);
    res.status(500).json({ error: "Could not link this folder's GitHub repo" });
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
  // A chat stays with the project it started in (chats are kept per project); it is never moved to another one
  const other = await IdeProject.findOne({ owner: req.user._id, chatSessionIds: sessionId, _id: { $ne: project._id } }).select("_id").lean();
  if (other) return res.status(409).json({ error: "chat_in_other_project" });
  await IdeProject.updateOne({ _id: project._id }, { $addToSet: { chatSessionIds: sessionId } });
  res.json({ ok: true });
});

// Chat groups (left sidebar in Project and Studio Mode). ?project=<id> lists the groups of that open project,
// ?project=none the groups made with no project open. A chat is in at most one group.
const GROUP_ICONS = new Set(["folder", "star", "heart", "zap", "rocket", "code", "bug", "book", "briefcase", "flag", "bookmark", "lightbulb", "target", "flame", "coffee", "music", "camera", "globe", "shield", "sparkles"]);
const groupInput = (body = {}) => {
  const out = {};
  if (body.name !== undefined) out.name = String(body.name).trim().slice(0, 60);
  if (body.icon !== undefined && GROUP_ICONS.has(body.icon)) out.icon = body.icon;
  if (body.pinned !== undefined) out.pinned = !!body.pinned;
  return out;
};
const groupScope = (v) => (v && v !== "none" && mongoose.isValidObjectId(v) ? String(v) : null);
const ownChat = async (req, sessionId) => {
  if (!CHAT_ID.test(sessionId || "")) return false;
  const { data } = await primarySupabaseClient.from("ai_chat_sessions").select("user_email").eq("id", sessionId).maybeSingle();
  return !!data && String(data.user_email || "").toLowerCase() === String(req.user.email || "").toLowerCase();
};
const ownGroup = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.groupId)) { res.status(404).json({ error: "Group not found" }); return null; }
  await connectDB();
  const group = await ChatGroup.findOne({ _id: req.params.groupId, userId: req.user._id });
  if (!group) res.status(404).json({ error: "Group not found" });
  return group;
};
// The group with its chats' titles, so a chat shows in its group even when it isn't in the list below
async function groupsJson(groups, email) {
  const ids = [...new Set(groups.flatMap((g) => g.chatIds || []))];
  let chats = [];
  if (ids.length) {
    const { data } = await primarySupabaseClient.from("ai_chat_sessions").select("id, title, created_at, pinned").in("id", ids).eq("user_email", email);
    chats = data || [];
  }
  const byId = new Map(chats.map((c) => [c.id, c]));
  return groups.map((g) => ({
    id: String(g._id), projectId: g.projectId || null, name: g.name, icon: g.icon, pinned: !!g.pinned,
    chats: (g.chatIds || []).map((id) => byId.get(id)).filter(Boolean).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))),
  }));
}

router.get("/groups", isAuthenticated, async (req, res) => {
  await connectDB();
  // ?project=all: every group of every project (Studio shows each project's groups inside its folder)
  const scope = req.query.project === "all" ? {} : { projectId: groupScope(req.query.project) };
  const groups = await ChatGroup.find({ userId: req.user._id, ...scope }).sort({ createdAt: 1 }).lean();
  res.json({ groups: await groupsJson(groups, req.user.email) });
});

router.post("/groups", isAuthenticated, async (req, res) => {
  await connectDB();
  const input = groupInput(req.body);
  if (!input.name) return res.status(400).json({ error: "Give the group a name" });
  const projectId = groupScope(req.body?.project);
  if (projectId && !(await IdeProject.exists({ _id: projectId, owner: req.user._id }))) return res.status(404).json({ error: "Project not found" });
  const sessionId = (await ownChat(req, req.body?.sessionId)) ? req.body.sessionId : null;
  if (sessionId) await ChatGroup.updateMany({ userId: req.user._id }, { $pull: { chatIds: sessionId } });
  const group = await ChatGroup.create({ ...input, userId: req.user._id, projectId, chatIds: sessionId ? [sessionId] : [] });
  res.json({ group: (await groupsJson([group], req.user.email))[0] });
});

router.patch("/groups/:groupId", isAuthenticated, async (req, res) => {
  const group = await ownGroup(req, res);
  if (!group) return;
  const input = groupInput(req.body);
  if (input.name === "") return res.status(400).json({ error: "Give the group a name" });
  Object.assign(group, input);
  await group.save();
  res.json({ ok: true });
});

// Deleting a group keeps its chats; they go back to the normal list
router.delete("/groups/:groupId", isAuthenticated, async (req, res) => {
  const group = await ownGroup(req, res);
  if (!group) return;
  await group.deleteOne();
  res.json({ ok: true });
});

// Add a chat to a group (it leaves any other group), or take it out with add: false
router.put("/groups/:groupId/chats", isAuthenticated, async (req, res) => {
  const group = await ownGroup(req, res);
  if (!group) return;
  const sessionId = req.body?.sessionId;
  if (!(await ownChat(req, sessionId))) return res.status(403).json({ error: "This chat is not yours" });
  await ChatGroup.updateMany({ userId: req.user._id }, { $pull: { chatIds: sessionId } });
  if (req.body?.add !== false) await ChatGroup.updateOne({ _id: group._id }, { $addToSet: { chatIds: sessionId } });
  res.json({ ok: true });
});

export default router;
