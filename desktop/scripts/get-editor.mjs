// Gets Classgrid Code, the editor built into the app, into desktop/editor/ (shipped as resources/editor). It is made
// by the "Build Classgrid Code for the desktop app" workflow (.github/workflows/build-desktop-editor.yml) and saved as
// a release of Classgrid/Classgrid_Agent. Uses your GitHub login on this computer (git credential fill).
// Run: npm run get-editor      (npm run release runs it too; nothing happens when the editor is already there)
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const VERSION = "1.105.1"; // the same as the cloud editor (infra/ide/Dockerfile)
const REPO = "Classgrid/Classgrid_Agent";
const TAG = `desktop-editor-v${VERSION}`;
const ASSET = `classgrid-code-win32-x64-${VERSION}.zip`;

const here = path.dirname(fileURLToPath(import.meta.url));
const editorDir = path.resolve(here, "..", "editor");

// Ends with a clear message (exitCode, not process.exit: that can crash Node on Windows while a download is open)
class Stop extends Error {}
const stop = (msg) => { throw new Stop(msg); };

// Your GitHub login, the same one git uses (Git Credential Manager)
function githubToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  const r = spawnSync("git", ["credential", "fill"], { input: "protocol=https\nhost=github.com\n\n", encoding: "utf8" });
  return ((r.stdout || "").match(/^password=(.+)$/m) || [])[1]?.trim() || null;
}

async function getEditor() {
  const token = githubToken();
  if (!token) stop("No GitHub login found on this computer. Sign in to GitHub with git (or set GITHUB_TOKEN), then try again.");
  const headers = { Authorization: `Bearer ${token}`, "User-Agent": "classgrid-desktop", "X-GitHub-Api-Version": "2022-11-28" };

  const rel = await fetch(`https://api.github.com/repos/${REPO}/releases/tags/${TAG}`, { headers: { ...headers, Accept: "application/vnd.github+json" } });
  const notYet = `Classgrid Code ${VERSION} isn't ready yet: there is no ${ASSET} in the ${TAG} release of ${REPO}.\n`
    + `Run "Build Classgrid Code for the desktop app" from the repo's Actions tab, wait for it to finish (about 2 hours), then try again.`;
  if (rel.status === 404) stop(notYet);
  if (!rel.ok) stop(`GitHub said ${rel.status} when looking for the ${TAG} release. Check your GitHub login, then try again.`);
  const asset = (await rel.json()).assets?.find((a) => a.name === ASSET);
  if (!asset) stop(notYet);

  // The asset link sends us on to the file itself (without our GitHub login)
  console.log(`Downloading ${ASSET} (${Math.round(asset.size / 1048576)} MB)...`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "classgrid-editor-"));
  const zip = path.join(tmp, ASSET);
  let res = await fetch(asset.url, { headers: { ...headers, Accept: "application/octet-stream" }, redirect: "manual" });
  if (res.status >= 300 && res.status < 400 && res.headers.get("location")) res = await fetch(res.headers.get("location"));
  if (!res.ok || !res.body) stop(`The download failed (${res.status}). Try again.`);
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(zip));

  // Unzipped next to it first, so a half-finished unzip never looks like a ready editor
  console.log("Unzipping...");
  const unzipped = path.join(tmp, "editor");
  fs.mkdirSync(unzipped);
  const winTar = path.join(process.env.SystemRoot || "C:\\Windows", "System32", "tar.exe"); // Windows' own tar opens zips
  let r = fs.existsSync(winTar) ? spawnSync(winTar, ["-xf", zip, "-C", unzipped], { stdio: "inherit" }) : { status: 1 };
  if (r.status !== 0) {
    r = spawnSync("powershell", ["-NoProfile", "-Command", `Expand-Archive -LiteralPath '${zip}' -DestinationPath '${unzipped}' -Force`], { stdio: "inherit" });
  }
  if (r.status !== 0 || !fs.existsSync(path.join(unzipped, "node.exe")) || !fs.existsSync(path.join(unzipped, "classgrid-build.txt"))) {
    stop("The editor download didn't unzip as expected. Try again.");
  }
  fs.rmSync(editorDir, { recursive: true, force: true });
  try { fs.renameSync(unzipped, editorDir); } catch { fs.cpSync(unzipped, editorDir, { recursive: true }); }
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`Classgrid Code ${VERSION} is in desktop/editor/`);
}

// The desktop app's own editor colors (Studio Mode's, desktop/editor-themes), put over the built-in theme every time.
// The cloud editor keeps infra/ide/files.
function putThemes() {
  const themes = path.join(editorDir, "extensions", "theme-defaults", "themes");
  if (!fs.existsSync(themes)) return;
  const ours = path.resolve(here, "..", "editor-themes");
  fs.copyFileSync(path.join(ours, "default-dark-modern.json"), path.join(themes, "dark_modern.json"));
  fs.copyFileSync(path.join(ours, "default-light-modern.json"), path.join(themes, "light_modern.json"));
}

if (fs.existsSync(path.join(editorDir, "classgrid-build.txt"))) {
  console.log("Classgrid Code is already in desktop/editor/");
} else {
  await getEditor().catch((err) => {
    console.error(err instanceof Stop ? `\n${err.message}\n` : err);
    process.exitCode = 1;
  });
}
// The desktop app's editor gets the extension store back (the cloud editor keeps it off): extensions come from Open
// VSX, the open store that VS Codium and other VS Code-based editors use (Microsoft's own store is only for Microsoft's
// VS Code). Users can also install an extension file (.vsix) from the Extensions view's "..." menu.
const OPEN_VSX = {
  serviceUrl: "https://open-vsx.org/vscode/gallery",
  itemUrl: "https://open-vsx.org/vscode/item",
  resourceUrlTemplate: "https://open-vsx.org/vscode/unpkg/{publisher}/{name}/{version}/{path}",
  controlUrl: "",
  nlsBaseUrl: "",
  publisherUrl: "",
};
function openExtensionStore() {
  const product = path.join(editorDir, "product.json");
  if (!fs.existsSync(product)) return;
  const p = JSON.parse(fs.readFileSync(product, "utf8"));
  p.extensionsGallery = OPEN_VSX;
  fs.writeFileSync(product, JSON.stringify(p, null, "\t"));
  // The store address the cloud build renamed inside the program files, and the hidden Extensions icon
  for (const rel of ["out/server-main.js", "out/vs/code/browser/workbench/workbench.js", "out/vs/platform/terminal/node/ptyHostMain.js"]) {
    const f = path.join(editorDir, rel);
    if (!fs.existsSync(f)) continue;
    const text = fs.readFileSync(f, "utf8");
    if (text.includes("extensionsGalleryOff:{")) fs.writeFileSync(f, text.split("extensionsGalleryOff:{").join("extensionsGallery:{"));
  }
  const css = path.join(editorDir, "out/vs/code/browser/workbench/workbench.css");
  if (fs.existsSync(css)) {
    const text = fs.readFileSync(css, "utf8");
    const off = /\n\/\* classgrid-no-extensions:[^\n]*\*\/\n[^\n]*codicon-extensions-view-icon[^\n]*\n/;
    if (off.test(text)) fs.writeFileSync(css, text.replace(off, "\n"));
  }
  console.log("The editor's extension store (Open VSX) is on");
}

putThemes();
openExtensionStore();
