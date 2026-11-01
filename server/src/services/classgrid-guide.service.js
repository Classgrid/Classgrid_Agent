// Classgrid AI's own guide (skills/classgrid-guide): read by the AI with read_classgrid_guide and shown
// read-only in Studio Mode's Guide tab (GET /api/ai/guide/:page). Only these fixed files can be read.
import fs from "fs/promises";
import { fileURLToPath } from "url";

const GUIDE_DIR = new URL("../skills/classgrid-guide/", import.meta.url);

export const GUIDE_PAGES = {
    index: { file: "SKILL.md", title: "Classgrid AI Guide" },
    "agent-mode": { file: "references/agent-mode.md", title: "Agent Mode" },
    "project-mode": { file: "references/project-mode.md", title: "Project Mode" },
    "studio-mode": { file: "references/studio-mode.md", title: "Studio Mode" },
    settings: { file: "references/settings.md", title: "Settings, Models and Permissions" },
    connections: { file: "references/connections.md", title: "Connections" },
};

export const GUIDE_PAGE_NAMES = Object.keys(GUIDE_PAGES);

// { page, title, markdown } for a known page name, or null for anything else
export async function readGuidePage(page) {
    const name = String(page || "").trim().toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(GUIDE_PAGES, name)) return null;
    const { file, title } = GUIDE_PAGES[name];
    const markdown = await fs.readFile(fileURLToPath(new URL(file, GUIDE_DIR)), "utf8");
    return { page: name, title, markdown };
}
