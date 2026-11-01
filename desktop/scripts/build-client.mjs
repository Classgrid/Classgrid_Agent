// Builds our screens (client/) for the desktop app into desktop/app/: the same Vite build as the website,
// with VITE_DESKTOP=1 (desktop switches in client/src/main.tsx) and the live API address.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const clientDir = path.resolve(here, "..", "..", "client");
const outDir = path.resolve(here, "..", "app");

const res = spawnSync("npx", ["vite", "build", "--outDir", outDir, "--emptyOutDir"], {
  cwd: clientDir,
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, VITE_DESKTOP: "1", VITE_API_URL: process.env.CG_API || "https://api.classgrid.in", VITE_API_BASE_URL: process.env.CG_API || "https://api.classgrid.in" }, // CG_API: a local backend when testing
});
process.exit(res.status ?? 1);
