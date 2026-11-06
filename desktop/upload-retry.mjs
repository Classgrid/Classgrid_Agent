// One-off: upload the already-built installer to R2 with retries. The release script's upload kept
// failing with ECONNRESET on the big exe, so this retries each file with backoff instead of rebuilding.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
dotenv.config({ path: path.resolve(root, "..", "server", ".env"), quiet: true });

const { version } = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const dist = path.join(root, "dist");
const exe = `Classgrid Setup ${version}.exe`;
const files = [
  [exe, "application/octet-stream"],
  [`${exe}.blockmap`, "application/octet-stream"],
  ["latest.yml", "text/yaml"],
];

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const [name, type] of files) {
  const full = path.join(dist, name);
  if (!fs.existsSync(full)) { console.error(`Missing ${name}`); process.exit(1); }
  const body = fs.readFileSync(full);
  let lastErr = null;
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      await s3.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: `desktop/${name}`,
        Body: body,
        ContentType: type,
        CacheControl: name === "latest.yml" ? "no-cache" : "public, max-age=31536000, immutable",
      }));
      console.log(`Uploaded desktop/${name} (${Math.round(body.length / 1048576)} MB)`);
      lastErr = null;
      break;
    } catch (err) {
      lastErr = err;
      console.error(`Attempt ${attempt}/6 for ${name} failed: ${err.message}`);
      if (attempt < 6) await sleep(5000 * attempt);
    }
  }
  if (lastErr) { console.error(`Giving up on ${name}: ${lastErr.message}`); process.exit(1); }
}

console.log(`\nClassgrid ${version} is out. Download link: ${process.env.R2_PUBLIC_URL}/desktop/${encodeURIComponent(exe)}`);