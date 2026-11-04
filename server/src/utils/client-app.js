// Which app sent a request: the website (chat.classgrid.in in a browser) or the Classgrid desktop app.
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

export const isWebsite = (req) => isWebsiteOrigin(req?.headers?.origin);
