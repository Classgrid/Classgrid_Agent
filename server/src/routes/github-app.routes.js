// Classgrid GitHub App: install status for Project Mode, the page GitHub sends users back to after installing,
// and the webhook GitHub calls with push / Actions / check results.
import express from "express";
import { isAuthenticated } from "../middleware/auth.middleware.js";
import { githubAppReady, githubAppInstallUrl, repoAppToken, repoEvents, saveRepoEvent, webhookSignatureOk, accountHasApp } from "../services/github-app.service.js";

const router = express.Router();
const REPO_NAME = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;

// Is the Classgrid app installed on this repo? (Project Mode asks before letting the AI push)
router.get("/status", isAuthenticated, async (req, res) => {
  const repo = String(req.query.repo || "");
  if (!REPO_NAME.test(repo)) return res.status(400).json({ error: "Pick a repo" });
  if (!githubAppReady()) return res.json({ ready: false, installed: false });
  const installed = !!(await repoAppToken(repo).catch(() => null));
  res.json({ ready: true, installed, installUrl: githubAppInstallUrl() });
});

// Has the user's GitHub account installed the Classgrid app at all? (the Projects page card)
router.get("/info", isAuthenticated, async (req, res) => {
  if (!githubAppReady()) return res.json({ ready: false, installed: false });
  const login = String(req.query.login || "");
  const installed = /^[A-Za-z0-9-]{1,39}$/.test(login) ? await accountHasApp(login).catch(() => false) : false;
  res.json({ ready: true, installed, installUrl: githubAppInstallUrl() });
});

// Push / Actions / check results the app heard for a repo, newest first
router.get("/events", isAuthenticated, async (req, res) => {
  const repo = String(req.query.repo || "");
  if (!REPO_NAME.test(repo)) return res.status(400).json({ error: "Pick a repo" });
  res.json({ events: await repoEvents(repo) });
});

// GitHub's "Setup URL": after installing the app, the user goes straight back into Project Mode
router.get("/installed", (req, res) => {
  res.redirect("https://chat.classgrid.in/c/project?github_app=installed");
});

// GitHub webhook (raw body, signed with GITHUB_APP_WEBHOOK_SECRET)
router.post("/webhook", express.raw({ type: "application/json", limit: "5mb" }), async (req, res) => {
  if (!webhookSignatureOk(req.body, req.get("x-hub-signature-256"))) return res.status(401).end();
  res.status(202).end();
  try {
    const type = req.get("x-github-event");
    const p = JSON.parse(req.body.toString("utf8"));
    const repo = p.repository?.full_name;
    if (!repo) return;
    if (type === "push") {
      await saveRepoEvent(repo, { type, branch: String(p.ref || "").replace("refs/heads/", ""), commit: p.after, by: p.pusher?.name, commits: p.commits?.length || 0 });
    } else if (type === "workflow_run" && p.action === "completed") {
      const r = p.workflow_run;
      await saveRepoEvent(repo, { type, name: r.name, branch: r.head_branch, commit: r.head_sha, result: r.conclusion, url: r.html_url });
    } else if (type === "check_run" && p.action === "completed") {
      const r = p.check_run;
      await saveRepoEvent(repo, { type, name: r.name, commit: r.head_sha, result: r.conclusion, url: r.html_url });
    } else if (type === "status" && p.state !== "pending") {
      await saveRepoEvent(repo, { type, name: p.context, commit: p.sha, result: p.state, url: p.target_url });
    }
  } catch (e) {
    console.error("[GitHub App] webhook failed:", e.message);
  }
});

export default router;
