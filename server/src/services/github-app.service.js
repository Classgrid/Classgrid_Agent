// Classgrid GitHub App: Project Mode pushes to a user's repo through the Classgrid app installed on that repo
// (not the user's own GitHub key), so commits show as <slug>[bot] and Classgrid is listed as a contributor.
// Needs GITHUB_APP_ID, GITHUB_APP_SLUG and GITHUB_APP_PRIVATE_KEY (the .pem text) in the server .env.
import crypto from "crypto";
import redis from "../config/redis.js";

const appId = () => process.env.GITHUB_APP_ID;
const slug = () => process.env.GITHUB_APP_SLUG;
const privateKey = () => String(process.env.GITHUB_APP_PRIVATE_KEY || "").replace(/\\n/g, "\n");

export const githubAppReady = () => !!(appId() && slug() && privateKey().includes("PRIVATE KEY"));
export const githubAppInstallUrl = () => `https://github.com/apps/${slug()}/installations/new`;

const b64url = (s) => Buffer.from(s).toString("base64url");
function appJwt() {
  const now = Math.floor(Date.now() / 1000);
  const body = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(JSON.stringify({ iat: now - 60, exp: now + 540, iss: appId() }))}`;
  return `${body}.${crypto.sign("RSA-SHA256", Buffer.from(body), privateKey()).toString("base64url")}`;
}

async function gh(path, opts = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...opts,
    headers: { Accept: "application/vnd.github+json", "User-Agent": "Classgrid", ...(opts.headers || {}) },
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

const tokens = new Map(); // "owner/repo" -> { token, expires }

// A short-lived key that can push to this one repo, or null when the Classgrid app is not installed on it
export async function repoAppToken(repo) {
  if (!githubAppReady() || !repo) return null;
  const hit = tokens.get(repo);
  if (hit && hit.expires - Date.now() > 5 * 60 * 1000) return hit.token;
  const jwt = appJwt();
  const inst = await gh(`/repos/${repo}/installation`, { headers: { Authorization: `Bearer ${jwt}` } });
  if (inst.status !== 200) return null;
  const tok = await gh(`/app/installations/${inst.body.id}/access_tokens`, {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify({ repositories: [repo.split("/")[1]] }),
  });
  if (tok.status !== 201) return null;
  tokens.set(repo, { token: tok.body.token, expires: new Date(tok.body.expires_at).getTime() });
  return tok.body.token;
}

// Has this GitHub user installed the Classgrid app on their own account (any of their repos)?
export async function accountHasApp(login) {
  if (!githubAppReady()) return false;
  const r = await gh(`/users/${encodeURIComponent(login)}/installation`, { headers: { Authorization: `Bearer ${appJwt()}` } });
  return r.status === 200;
}

let bot = null;
// The name and email GitHub links to the app's bot user, so its commits show the Classgrid logo
export async function appBotIdentity() {
  if (bot) return bot;
  const name = `${slug()}[bot]`;
  const u = await gh(`/users/${encodeURIComponent(name)}`);
  if (u.status !== 200) return { name: "Classgrid", email: "code@classgrid.in" };
  bot = { name, email: `${u.body.id}+${name}@users.noreply.github.com` };
  return bot;
}

// Webhook: GitHub signs each message with GITHUB_APP_WEBHOOK_SECRET
export function webhookSignatureOk(rawBody, signature) {
  const secret = process.env.GITHUB_APP_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const a = Buffer.from(expected), b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// The last results GitHub sent for a repo (pushes, Actions runs, checks), newest first, kept 7 days
const EVENTS_KEY = (repo) => `ghapp:events:${String(repo).toLowerCase()}`;

export async function saveRepoEvent(repo, event) {
  const key = EVENTS_KEY(repo);
  await redis.lpush(key, JSON.stringify({ ...event, at: new Date().toISOString() }));
  await redis.ltrim(key, 0, 29);
  await redis.expire(key, 7 * 24 * 60 * 60);
}

export async function repoEvents(repo, limit = 10) {
  const rows = await redis.lrange(EVENTS_KEY(repo), 0, limit - 1).catch(() => []);
  return rows.map((r) => JSON.parse(r));
}
