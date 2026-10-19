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
import User from "../models/User.js";
import connectDB from "../../config/db.js";
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } from "../routes/auth.github.routes.js";

// Keys from the Classgrid GitHub app stop working after about 8 hours. The refresh key saved when the user
// connected GitHub (good for months) gets a new one, so the user doesn't have to reconnect every day.
const checkedAt = new Map(); // userId -> time the saved key last worked (so GitHub is not asked on every call)
const CHECK_EVERY_MS = 5 * 60 * 1000;

export async function ensureFreshGithubToken(user) {
  if (!user?.github_access_token) return user;
  const id = String(user._id);
  if (Date.now() - (checkedAt.get(id) || 0) < CHECK_EVERY_MS) return user;

  const check = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${user.github_access_token}`, Accept: "application/vnd.github+json", "User-Agent": "Classgrid" },
  }).catch(() => null);
  if (!check || check.status !== 401) {
    if (check?.ok) checkedAt.set(id, Date.now());
    return user;
  }

  const full = await User.findById(user._id).select("github_refresh_token");
  if (!full?.github_refresh_token) return user; // nothing to renew with; the user reconnects GitHub
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, client_secret: GITHUB_CLIENT_SECRET, grant_type: "refresh_token", refresh_token: full.github_refresh_token }),
  }).catch(() => null);
  const data = res ? await res.json().catch(() => ({})) : {};
  if (!data.access_token) {
    console.error("[GitHub] Could not renew the key for user", id, data.error || res?.status);
    return user;
  }
  await User.updateOne({ _id: user._id }, { $set: { github_access_token: data.access_token, ...(data.refresh_token ? { github_refresh_token: data.refresh_token } : {}) } });
  user.github_access_token = data.access_token;
  checkedAt.set(id, Date.now());
  console.log("[GitHub] Renewed the key for user", id);
  return user;
}

// The user's GitHub key (renewed if it ran out), with any extra fields asked for
export async function githubUser(userId, fields = "") {
  await connectDB();
  const user = await User.findById(userId).select(`github_access_token ${fields}`.trim());
  return user?.github_access_token ? ensureFreshGithubToken(user) : user;
}
