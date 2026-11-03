// Builds our screens (client/) for the desktop app into desktop/app/: the same Vite build as the website,
// with VITE_DESKTOP=1 (desktop switches in client/src/main.tsx) and the live API address. Then the welcome screen's
// animation (splash/splash.js, GSAP + Framer Motion from client/) is bundled into app/cg-splash.js.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const clientDir = path.resolve(here, "..", "..", "client");
// --editor: the build for Classgrid Code's Agent panel (classgrid-editor/extension), loaded from the editor's own files,
// so its paths are relative (--base ./) and it goes to app-editor/
const forEditor = process.argv.includes("--editor");
const outDir = path.resolve(here, "..", forEditor ? "app-editor" : "app");

const res = spawnSync("npx", ["vite", "build", "--outDir", outDir, "--emptyOutDir", ...(forEditor ? ["--base", "./"] : [])], {
  cwd: clientDir,
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, VITE_DESKTOP: "1", ...(forEditor ? { VITE_EDITOR: "1" } : {}), VITE_API_URL: process.env.CG_API || "https://api.classgrid.in", VITE_API_BASE_URL: process.env.CG_API || "https://api.classgrid.in" }, // CG_API: a local backend when testing
});
if (res.status !== 0) process.exit(res.status ?? 1);
if (forEditor) {
  console.log("Built our screens for Classgrid Code (app-editor/)");
  process.exit(0);
}

const { build } = await import(pathToFileURL(path.join(clientDir, "node_modules", "esbuild", "lib", "main.js")).href);
await build({
  entryPoints: [path.resolve(here, "..", "splash", "splash.js")],
  outfile: path.join(outDir, "cg-splash.js"),
  bundle: true,
  minify: true,
  format: "iife",
  target: "chrome130",
  nodePaths: [path.join(clientDir, "node_modules")],
  logLevel: "warning",
});
console.log("Built the welcome screen (app/cg-splash.js)");
