// Gets the newest Classgrid Code (our editor with the Classgrid AI inside, classgrid-editor/) into
// desktop/classgrid-code.zip, shipped in the app as resources/classgrid-code.zip (codeeditor.js unpacks it). It is made
// by the "Build Classgrid Code" workflow (.github/workflows/build-classgrid-editor.yml) and saved as an editor-<version>
// release of Classgrid/Classgrid_Agent. Uses the GitHub CLI (gh) signed in on this computer.
// Run: npm run get-classgrid-code      (npm run release runs it too; nothing is downloaded when it is already the newest)
//      npm run get-classgrid-code -- --tag=editor-<version>   (that build instead of the newest published one, e.g. when
//      two builds ran at once and the one from older code was published last)
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = "Classgrid/Classgrid_Agent";
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const zip = path.join(root, "classgrid-code.zip");
const tagFile = path.join(root, "classgrid-code.tag");

const gh = (args) => {
  const r = spawnSync("gh", args, { cwd: root, encoding: "utf8" });
  if (r.status !== 0) {
    console.error(`GitHub CLI failed (gh ${args.join(" ")}):\n${(r.stderr || r.stdout || "").trim()}\nSign in with "gh auth login", then try again.`);
    process.exit(1);
  }
  return r.stdout;
};

const list = JSON.parse(gh(["release", "list", "--repo", REPO, "--limit", "50", "--json", "tagName,publishedAt"]));
const wanted = process.argv.find((a) => a.startsWith("--tag="))?.slice("--tag=".length);
const editors = list.filter((r) => /^editor-/.test(r.tagName));
const newest = wanted
  ? editors.find((r) => r.tagName === wanted)
  : editors.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))[0];
if (!newest) {
  console.error(wanted ? `No Classgrid Code release ${wanted} in ${REPO}.` : `No Classgrid Code release (editor-*) in ${REPO} yet. Run the "Build Classgrid Code" workflow first.`);
  process.exit(1);
}

const have = fs.existsSync(tagFile) ? fs.readFileSync(tagFile, "utf8").trim() : "";
if (have === newest.tagName && fs.existsSync(zip)) {
  console.log(`Classgrid Code ${newest.tagName} is already here.`);
} else {
  const tmp = path.join(root, "classgrid-code.download");
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp);
  console.log(`Downloading Classgrid Code ${newest.tagName}...`);
  gh(["release", "download", newest.tagName, "--repo", REPO, "--pattern", "*.zip", "--dir", tmp]);
  const got = fs.readdirSync(tmp).find((f) => f.endsWith(".zip"));
  if (!got) { console.error(`The ${newest.tagName} release has no zip.`); process.exit(1); }
  fs.rmSync(zip, { force: true });
  fs.renameSync(path.join(tmp, got), zip);
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.writeFileSync(tagFile, newest.tagName);
  console.log(`Classgrid Code ${newest.tagName} is ready (${Math.round(fs.statSync(zip).size / 1048576)} MB).`);
}
