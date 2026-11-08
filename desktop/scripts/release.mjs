// Publishes a new desktop app version: gets Classgrid Code (our editor), builds the screens, makes the installer, and uploads
// it with latest.yml to R2 (desktop/), where installed apps look for updates. Raise "version" in package.json first.
// Run: npm run release      (R2 keys are read from server/.env)
//      npm run release -- --upload-only   (only uploads the installer already in dist/, e.g. after an upload failed)
//      npm run release -- --tag=editor-<version>   (ships that Classgrid Code build instead of the newest published one)
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

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

const { version } = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const dist = path.join(root, "dist");
const exe = `Classgrid Setup ${version}.exe`;
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
console.log(`\nClassgrid ${version} is out. Download link: ${process.env.R2_PUBLIC_URL}/desktop/${encodeURIComponent(exe)}`);
