// Puts the desktop app's installer on the public CDN: S3 (behind AWS_CLOUDFRONT_ERP_DOMAIN) at
// desktop/Classgrid-Setup-<version>.exe, the link people download from. Runs on the EC2 server
// (.github/workflows/publish-desktop-cdn.yml, after a version bump reaches main): the server is inside AWS, so this upload
// doesn't depend on the network of the computer that made the release (from there, uploads to S3 kept stalling and
// getting cut off).
// It takes the installer npm run release put on R2 and checks it against R2's latest.yml (version, size and sha512)
// before uploading, then checks the CDN link, and only then removes older installers from the CDN (it holds only the
// current version). R2 keeps its own copies (installed apps update from there).
// Run on the server: node publish-cdn.mjs <version>                 (keys are read from the server's .env)
//                    node publish-cdn.mjs <version> --dry-run       (only downloads and checks, uploads nothing)
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createRequire } from "node:module";

const SERVER = process.env.CLASSGRID_SERVER_DIR || "/var/www/classgrid_platform/server";
const req = createRequire(path.join(SERVER, "package.json"));
req("dotenv").config({ path: path.join(SERVER, ".env"), quiet: true });
const { S3Client, PutObjectCommand, HeadObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = req("@aws-sdk/client-s3");

const version = process.argv[2];
const dryRun = process.argv.includes("--dry-run");
if (!/^\d+\.\d+\.\d+$/.test(version || "")) { console.error("Usage: node publish-cdn.mjs <version> [--dry-run]"); process.exit(1); }

const fail = (why) => { console.error(`Not published: ${why}`); process.exit(1); };
const r2 = process.env.R2_PUBLIC_URL;
const cdnHost = process.env.AWS_CLOUDFRONT_ERP_DOMAIN || "";
const cdn = /^https?:\/\//.test(cdnHost) ? cdnHost.replace(/\/$/, "") : `https://${cdnHost}`;
const Bucket = process.env.AWS_S3_ERP_BUCKET_NAME;
if (!r2 || !cdnHost || !Bucket) fail("R2_PUBLIC_URL, AWS_CLOUDFRONT_ERP_DOMAIN or AWS_S3_ERP_BUCKET_NAME is missing from the server's .env");

// What R2 says this version is (latest.yml is what installed apps update from)
const yml = await (await fetch(`${r2}/desktop/latest.yml?t=${Date.now()}`, { cache: "no-store" })).text();
const field = (name) => yml.match(new RegExp(`^${name}: (.+)$`, "m"))?.[1].trim().replace(/^'|'$/g, "");
if (field("version") !== version) fail(`R2's latest.yml is version ${field("version")}, not ${version}: run npm run release for ${version} first`);
const sha512 = field("sha512");
const size = Number(yml.match(/^\s+size: (\d+)$/m)?.[1]);
const exe = field("path");
if (!sha512 || !size || !exe) fail("R2's latest.yml has no path, sha512 or size");

// Download it, hashing on the way
const file = path.join(os.tmpdir(), `Classgrid-Setup-${version}.exe`);
console.log(`Downloading ${exe} from R2...`);
const got = await fetch(`${r2}/desktop/${encodeURIComponent(exe)}`);
if (!got.ok) fail(`R2 answered ${got.status} for ${exe}`);
const hash = crypto.createHash("sha512");
await pipeline(
  Readable.fromWeb(got.body),
  new Transform({ transform(chunk, _enc, done) { hash.update(chunk); done(null, chunk); } }),
  fs.createWriteStream(file),
);
const gotSize = fs.statSync(file).size;
const gotSha = hash.digest("base64");
if (gotSize !== size || gotSha !== sha512) {
  fs.rmSync(file, { force: true });
  fail(`the download doesn't match latest.yml (size ${gotSize} vs ${size}, sha512 ${gotSha === sha512 ? "same" : "different"})`);
}
console.log(`Checked: ${Math.round(size / 1048576)} MB, sha512 matches latest.yml`);
if (dryRun) { fs.rmSync(file, { force: true }); console.log("Dry run: nothing uploaded"); process.exit(0); }

const s3 = new S3Client({
  region: process.env.AWS_S3_ERP_REGION,
  credentials: { accessKeyId: process.env.AWS_S3_ERP_ACCESS_KEY, secretAccessKey: process.env.AWS_S3_ERP_SECRET_KEY },
});
const Key = `desktop/Classgrid-Setup-${version}.exe`;
// Tried again here, each time from the start of the file (the SDK can't resend a file stream it already read from)
for (let attempt = 1; ; attempt++) {
  console.log(`Uploading ${Key}${attempt > 1 ? ` (try ${attempt})` : ""}...`);
  try {
    await s3.send(new PutObjectCommand({
      Bucket, Key,
      Body: fs.createReadStream(file),
      ContentLength: size,
      ContentType: "application/octet-stream",
      ContentDisposition: `attachment; filename="Classgrid-Setup-${version}.exe"`,
      CacheControl: "public, max-age=31536000, immutable",
    }));
    break;
  } catch (e) {
    if (attempt === 5) { fs.rmSync(file, { force: true }); fail(`the upload to S3 failed 5 times (${e.name}: ${e.message})`); }
    await new Promise((r) => setTimeout(r, attempt * 5000));
  }
}
fs.rmSync(file, { force: true });

// Check it's there, in S3 and through the CDN, before anything older goes
const head = await s3.send(new HeadObjectCommand({ Bucket, Key }));
if (head.ContentLength !== size) fail(`S3 has ${head.ContentLength} bytes for ${Key}, not ${size}`);
const link = `${cdn}/${Key}`;
const viaCdn = await fetch(link, { method: "HEAD" });
if (!viaCdn.ok || Number(viaCdn.headers.get("content-length")) !== size) fail(`the CDN link answered ${viaCdn.status} (${viaCdn.headers.get("content-length")} bytes): ${link}`);
console.log(`On the CDN: ${link}`);

// The CDN holds only the current version
const listed = await s3.send(new ListObjectsV2Command({ Bucket, Prefix: "desktop/" }));
for (const o of listed.Contents || []) {
  if (o.Key !== Key && /^desktop\/Classgrid-Setup-[\d.]+\.exe$/.test(o.Key)) {
    await s3.send(new DeleteObjectCommand({ Bucket, Key: o.Key }));
    console.log(`Removed the older ${o.Key}`);
  }
}
console.log(`Classgrid ${version} is on the CDN.`);
