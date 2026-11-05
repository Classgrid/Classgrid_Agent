// Try a change in Classgrid Code in a few minutes, without the GitHub build (about 35 minutes) and a new app version:
// builds our screens for the editor from this repo and copies them, with the AI panel's extension and the desktop
// parts, into the Classgrid Code the Classgrid app unpacked on this computer. Then reload its window.
//
//   node classgrid-editor/test-local.mjs              screens + extension + desktop parts
//   node classgrid-editor/test-local.mjs --no-build   only extension/ and desktop/ (no screens build: seconds)
//
// The copy lasts until the Classgrid app unpacks a new Classgrid Code (a new app version); the real release still
// goes through the GitHub build.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = path.join(process.env.APPDATA || "", "Classgrid", "classgrid-code");

// The Classgrid Code in use: the newest unpacked copy that has our AI panel
const ext = (fs.existsSync(base) ? fs.readdirSync(base) : [])
  .map((n) => path.join(base, n, "resources", "app", "extensions", "classgrid"))
  .filter((d) => fs.existsSync(path.join(d, "extension.js")))
  .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
if (!ext) {
  console.error("No Classgrid Code found on this computer: open it once from the Classgrid app first.");
  process.exit(1);
}
console.log(`Classgrid Code: ${ext}`);

if (!process.argv.includes("--no-build")) {
  console.log("Building the screens for the editor...");
  const r = spawnSync(process.execPath, [path.join(repo, "desktop", "scripts", "build-client.mjs"), "--editor"], { cwd: path.join(repo, "desktop"), stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status || 1);
  fs.rmSync(path.join(ext, "app"), { recursive: true, force: true });
  fs.cpSync(path.join(repo, "desktop", "app-editor"), path.join(ext, "app"), { recursive: true });
  console.log("Copied the screens");
}

// The AI panel's extension (as the GitHub build packs it), and the desktop parts it runs
for (const f of fs.readdirSync(path.join(repo, "classgrid-editor", "extension"))) {
  fs.cpSync(path.join(repo, "classgrid-editor", "extension", f), path.join(ext, f), { recursive: true });
}
for (const f of ["runner.js", "aimemory.js", "computer.js", "chats.js", "memory.js", "notify-toast.ps1"]) {
  fs.copyFileSync(path.join(repo, "desktop", f), path.join(ext, "desktop", f));
}
console.log("Copied the extension and the desktop parts");
console.log("Now reload Classgrid Code: Ctrl+Shift+P, then \"Developer: Reload Window\" (or close and open it again).");
