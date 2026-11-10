// Packs the standalone Classgrid extension (.vsix) for VS Code and Cursor: the same parts the Classgrid Code build packs
// (.github/workflows/build-classgrid-editor.yml, "Pack the Classgrid AI part"): the extension, the editor build of our
// screens (app/) and the desktop app's runner, chats and memory (desktop/) with their node modules.
// Usage (from the repo root): node classgrid-editor/pack-vsix.mjs [--skip-client]
//   --skip-client  reuse desktop/app-editor instead of building the screens again
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..");
const ext = path.join(here, "extension");
const out = path.join(here, "out", "vsix");
const run = (cmd, cwd) => { console.log(`> ${cmd}`); execSync(cmd, { cwd, stdio: "inherit", shell: true }); };

const appEditor = path.join(repo, "desktop", "app-editor");
if (!process.argv.includes("--skip-client") || !fs.existsSync(path.join(appEditor, "index.html"))) {
  run("node ../desktop/scripts/build-client.mjs --editor", path.join(repo, "client"));
}
if (!fs.existsSync(path.join(appEditor, "index.html"))) throw new Error("desktop/app-editor/index.html is missing: the screens didn't build");

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, "desktop"), { recursive: true });
for (const f of ["extension.js", "bridge.js", "editor-context.js", "electron-shim.js", "LICENSE.txt", "package.json"]) fs.copyFileSync(path.join(ext, f), path.join(out, f));
fs.cpSync(path.join(ext, "media"), path.join(out, "media"), { recursive: true });
fs.cpSync(appEditor, path.join(out, "app"), { recursive: true });
for (const f of ["runner.js", "doctext.js", "pdfpages.js", "picture.js", "aimemory.js", "computer.js", "chats.js", "memory.js", "notify-toast.ps1"]) {
  fs.copyFileSync(path.join(repo, "desktop", f), path.join(out, "desktop", f));
}
const deps = JSON.parse(fs.readFileSync(path.join(repo, "desktop", "package.json"), "utf8")).dependencies;
fs.writeFileSync(path.join(out, "desktop", "package.json"), JSON.stringify({ name: "classgrid-desktop-parts", private: true }));
const pkgs = ["socket.io-client", "xlsx", "pdf-parse", "word-extractor"].map((m) => `"${m}@${deps[m]}"`).join(" ");
run(`npm install --no-audit --no-fund --omit=dev ${pkgs}`, path.join(out, "desktop"));

// The standalone package also carries app/ and desktop/
const pkg = JSON.parse(fs.readFileSync(path.join(out, "package.json"), "utf8"));
pkg.files = [...new Set([...(pkg.files || []), "app/**", "desktop/**"])];
delete pkg.scripts;
fs.writeFileSync(path.join(out, "package.json"), JSON.stringify(pkg, null, 2));

const vsix = path.join(ext, `classgrid-${pkg.version}.vsix`);
run(`npx --yes @vscode/vsce@latest package --no-dependencies --out "${vsix}"`, out);
console.log(`\nPacked: ${vsix} (${(fs.statSync(vsix).size / 1024 / 1024).toFixed(1)} MB)`);
