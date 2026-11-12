// Publishes a new desktop app version: gets Classgrid Code (our editor), builds the screens, makes the installer, and uploads
// it with latest.yml to R2 (desktop/), where installed apps look for updates. Raise "version" in package.json first.
// Run: npm run release      (R2 keys are read from server/.env)
//      npm run release -- --upload-only   (only uploads the installer already in dist/, e.g. after an upload failed)
//      npm run release -- --no-upload     (builds and checks only; the installer stays in dist/: the GitHub build,
//                                          .github/workflows/build-desktop-app.yml, keeps it as the run's artifact)
//      npm run release -- --tag=editor-<version>   (ships that Classgrid Code build instead of the newest published one)
// After the upload, older versions in R2's desktop/ are removed (the owner keeps only the newest, as on the CDN).
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
dotenv.config({ path: path.resolve(root, "..", "server", ".env"), quiet: true });

const run = (args) => {
  const r = spawnSync("npm", args, { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
if (!process.argv.includes("--upload-only")) {
  const tag = process.argv.find((a) => a.startsWith("--tag="));
  run(["run", "get-classgrid-code", ...(tag ? ["--", tag] : [])]); // Classgrid Code, our editor (the newest editor-* release on GitHub, or --tag)
  run(["run", "build:client"]);
  run(["run", "dist"]);
}

// Release checks, always, before anything is uploaded (owner's rule, 2026-11-12: 1.0.14 was packed without editors.js,
// a file main.js requires, and died at start on every computer; the packing list names the files one by one).
// 1. Every file the app's own scripts require is in electron-builder.yml's files list.
{
  const yml = fs.readFileSync(path.join(root, "electron-builder.yml"), "utf8");
  const listed = new Set([...yml.matchAll(/^  - ([A-Za-z0-9_-]+\.js)$/gm)].map((m) => m[1]));
  const required = new Set();
  for (const f of fs.readdirSync(root).filter((f) => f.endsWith(".js"))) {
    for (const m of fs.readFileSync(path.join(root, f), "utf8").matchAll(/require\("\.\/([A-Za-z0-9_-]+)(?:\.js)?"\)/g)) required.add(`${m[1]}.js`);
  }
  const missing = [...required].filter((f) => !listed.has(f) && f !== "ptyhost.js"); // (ptyhost.js is shipped outside the asar, extraResources)
  if (missing.length) {
    console.error(`Release stopped: ${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} required by the app but not in electron-builder.yml's files list. Add ${missing.length === 1 ? "it" : "them"} to the list and run the release again.`);
    process.exit(1);
  }
  console.log("Check 1 passed: every required file is in the packing list");
}
// 2. The packed app starts: dist/win-unpacked/Classgrid.exe --smoke-test ends with code 0 (main.js) within 60 s.
{
  const unpackedExe = path.join(root, "dist", "win-unpacked", "Classgrid.exe");
  if (!fs.existsSync(unpackedExe)) { console.error(`Release stopped: ${unpackedExe} is missing, the packed app cannot be start-tested`); process.exit(1); }
  // (an editor's terminal sets ELECTRON_RUN_AS_NODE, which makes the app act as plain Node and refuse the switch:
  // "bad option: --smoke-test", as on the first run of this check, 2026-11-12; the app is started as itself here)
  const appEnv = { ...process.env };
  delete appEnv.ELECTRON_RUN_AS_NODE;
  const r = spawnSync(unpackedExe, ["--smoke-test"], { timeout: 60000, encoding: "utf8", windowsHide: true, env: appEnv });
  if (r.error || r.status !== 0) {
    console.error(`Release stopped: the packed app did not start cleanly (${r.error ? r.error.message : `exit code ${r.status}`}).\n${(r.stderr || "").slice(-2000)}`);
    process.exit(1);
  }
  console.log("Check 2 passed: the packed app starts");
}

const { version } = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const dist = path.join(root, "dist");
const exe = `Classgrid Setup ${version}.exe`;
if (process.argv.includes("--no-upload")) {
  for (const name of [exe, `${exe}.blockmap`, "latest.yml"]) {
    if (!fs.existsSync(path.join(dist, name))) { console.error(`Missing ${name}`); process.exit(1); }
  }
  console.log(`\nClassgrid ${version} is built and checked, not uploaded: ${path.join(dist, exe)}`);
  process.exit(0);
}
for (const name of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"]) {
  if (!process.env[name]) { console.error(`Release stopped: ${name} is not set (server/.env has the R2 keys)`); process.exit(1); }
}
const files = [
  [exe, "application/octet-stream"],
  [`${exe}.blockmap`, "application/octet-stream"],
  ["latest.yml", "text/yaml"], // last, so apps never see a version before its installer is there
];

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});
for (const [name, type] of files) {
  const full = path.join(dist, name);
  if (!fs.existsSync(full)) { console.error(`Missing ${name}`); process.exit(1); }
  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: `desktop/${name}`,
    // streamed: the installer is hundreds of MB, and sending it from memory in one write could fail (ENOBUFS)
    Body: fs.createReadStream(full),
    ContentLength: fs.statSync(full).size,
    ContentType: type,
    CacheControl: name === "latest.yml" ? "no-cache" : "public, max-age=31536000, immutable",
  }));
  console.log(`Uploaded desktop/${name}`);
}
// Only the newest version stays in R2's desktop/ (the installers and their blockmaps of older versions go)
{
  const { Contents = [] } = await s3.send(new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET_NAME, Prefix: "desktop/" }));
  for (const o of Contents) {
    const m = /^desktop\/Classgrid Setup (\d+\.\d+\.\d+)\.exe(\.blockmap)?$/.exec(o.Key || "");
    if (!m || m[1] === version) continue;
    await s3.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: o.Key }));
    console.log(`Removed the old ${o.Key}`);
  }
}
console.log(`\nClassgrid ${version} is out. Download link: ${process.env.R2_PUBLIC_URL}/desktop/${encodeURIComponent(exe)}`);
