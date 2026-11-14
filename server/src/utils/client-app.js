// Which app sent a request: the website (chat.classgrid.in in a browser, or the Classgrid phone app) or the Classgrid desktop app.
// Folder projects (location "local", a folder on the user's computer) and their chats, groups and folder paths are
// shown only in the desktop app. The desktop app's screens are served from http://localhost:47821 (or CG_PORT), and
// its main process and built-in editor send no Origin or another one, so only a known website origin counts as the
// website. Everything else is treated as the desktop app: hiding a folder project from the desktop app is worse than
// showing one.
const WEBSITE_ORIGINS = new Set([
  "https://classgrid.in",
  "https://classgridplatform.vercel.app",
  "https://nikhil.quantumchem.site",
]);
const CLASSGRID_SUBDOMAIN = /^https:\/\/[a-z0-9-]+\.classgrid\.in$/; // chat., www., api., tenant portals

export const isWebsiteOrigin = (origin) => {
  const o = String(origin || "").toLowerCase().replace(/\/$/, "");
  return WEBSITE_ORIGINS.has(o) || CLASSGRID_SUBDOMAIN.test(o);
};

// The Classgrid phone app (X-Platform-App: android / ios, sent with every request from src/api/client.ts) is not a
// browser, so it has no website origin, but like the website it can never reach a folder on the user's computer:
// it sees the same chats and projects as the website (a cloud project's chats listed, folder projects left out).
// It uploads files instead of sending data: pictures, so the website's rule on those fits it too.
export const isPhoneApp = (req) => {
  const app = String(req?.headers?.["x-platform-app"] || "").toLowerCase();
  return app === "android" || app === "ios";
};

export const isWebsite = (req) => isWebsiteOrigin(req?.headers?.origin) || isPhoneApp(req);
