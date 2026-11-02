// Classgrid GitHub App: install status for Project Mode, the page GitHub sends users back to after installing,
// and the webhook GitHub calls with push / Actions / check results.
import express from "express";
import { isAuthenticated } from "../middleware/auth.middleware.js";
import { githubAppReady, githubAppInstallUrl, repoAppToken, repoEvents, saveRepoEvent, webhookSignatureOk, accountHasApp, forgetAppTokens } from "../services/github-app.service.js";

const router = express.Router();
const REPO_NAME = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;

// Is the Classgrid app installed on this repo? (Project Mode asks before letting the AI push)
// The desktop app (its screens are served at localhost:47821) asks GitHub to bring the user back to the app after
// installing: GitHub passes "state" on to /installed
const fromDesktop = (req) => /^http:\/\/(127\.0\.0\.1|localhost):47821$/.test(String(req.headers.origin || ""));
const installUrlFor = (req) => (fromDesktop(req) ? `${githubAppInstallUrl()}?state=desktop` : githubAppInstallUrl());
const DESKTOP_DONE_PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Classgrid app installed</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#fff;color:#111}@media (prefers-color-scheme:dark){body{background:#121212;color:#eee}a{color:#111;background:#eee}}
.box{text-align:center;padding:24px;max-width:420px}h1{font-size:20px;margin:0 0 8px}p{margin:0 0 20px;color:#666}a{display:inline-block;padding:10px 18px;border-radius:999px;background:#111;color:#fff;text-decoration:none;font-weight:600}</style></head>
<body><div class="box"><h1>Classgrid app installed on GitHub</h1><p>You can go back to the Classgrid app and close this tab.</p><a href="classgrid://github-app?installed=1">Open the Classgrid app</a></div>
<script>setTimeout(function(){location.href="classgrid://github-app?installed=1"},600)</script></body></html>`;

router.get("/status", isAuthenticated, async (req, res) => {
  const repo = String(req.query.repo || "");
  if (!REPO_NAME.test(repo)) return res.status(400).json({ error: "Pick a repo" });
  if (!githubAppReady()) return res.json({ ready: false, installed: false });
  const installed = !!(await repoAppToken(repo).catch(() => null));
  res.json({ ready: true, installed, installUrl: installUrlFor(req) });
});

// Has the user's GitHub account installed the Classgrid app at all? (the Projects page card)
router.get("/info", isAuthenticated, async (req, res) => {
  if (!githubAppReady()) return res.json({ ready: false, installed: false });
  const login = String(req.query.login || "");
  const installed = /^[A-Za-z0-9-]{1,39}$/.test(login) ? await accountHasApp(login).catch(() => false) : false;
  res.json({ ready: true, installed, installUrl: installUrlFor(req) });
});

// Push / Actions / check results the app heard for a repo, newest first
router.get("/events", isAuthenticated, async (req, res) => {
  const repo = String(req.query.repo || "");
  if (!REPO_NAME.test(repo)) return res.status(400).json({ error: "Pick a repo" });
  res.json({ events: await repoEvents(repo) });
});

// GitHub's "Setup URL": after installing the app, the user goes straight back into Project Mode
router.get("/installed", (req, res) => {
  // Installed from the desktop app: GitHub hands back our "desktop" note, and the browser opens the app again
  if (req.query.state === "desktop") return res.type("html").send(DESKTOP_DONE_PAGE);
  res.redirect("https://chat.classgrid.in/c/project?github_app=installed");
});

// GitHub webhook (raw body, signed with GITHUB_APP_WEBHOOK_SECRET)
router.post("/webhook", express.raw({ type: "application/json", limit: "5mb" }), async (req, res) => {
  if (!webhookSignatureOk(req.body, req.get("x-hub-signature-256"))) return res.status(401).end();
  res.status(202).end();
  try {
    const type = req.get("x-github-event");
    const p = JSON.parse(req.body.toString("utf8"));
    if (type === "installation" || type === "installation_repositories") forgetAppTokens(); // installed, removed or repos changed

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
