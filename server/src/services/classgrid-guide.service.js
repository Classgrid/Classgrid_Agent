// Classgrid AI's own guide (skills/classgrid-guide): copied into each open project at .classgrid/classgrid_guide/, so
// it shows in the Files tab and the AI reads it with view_project_file. It is never pushed to GitHub (the folder is
// added to the repo's .git/info/exclude).
import fs from "fs/promises";
import crypto from "crypto";
import { fileURLToPath } from "url";

const GUIDE_DIR = new URL("../skills/classgrid-guide/", import.meta.url);
export const GUIDE_PROJECT_DIR = ".classgrid/classgrid_guide";

const GUIDE_FILES = [
    "SKILL.md",
    "references/agent-mode.md",
    "references/project-mode.md",
    "references/studio-mode.md",
    "references/settings.md",
    "references/connections.md",
    "references/slash-commands.md",
    "references/desktop-app.md",
];

let cached = null;
// [{ rel, text }] of every guide file, and a version that changes when any of them changes
export async function guideFiles() {
    if (cached) return cached;
    const files = await Promise.all(GUIDE_FILES.map(async (rel) => ({ rel, text: await fs.readFile(fileURLToPath(new URL(rel, GUIDE_DIR)), "utf8") })));
    const version = crypto.createHash("sha1").update(files.map((f) => `${f.rel}\n${f.text}`).join("\n")).digest("hex");
    cached = { files, version };
    return cached;
}
