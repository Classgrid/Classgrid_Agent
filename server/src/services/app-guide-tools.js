// read_app_guide (owner, 2026-11-28): Classgrid AI reads Classgrid's own how-to guide before telling a user how to do
// something in the apps. The guide is the classgrid-guide skill (server/src/skills/classgrid-guide): the website and
// desktop pages in references/, and the Android phone app pages in references/phone-app/ (one page per screen or
// task, written from the phone app's code). Until now an Agent Mode chat had no way to read it (only a project could,
// through .classgrid/classgrid_guide), so a phone user asking "how do I delete my account" got steps for the website
// or a guess. Read only; the pages ship with the server.
import fs from "fs/promises";
import { fileURLToPath } from "url";

export const APP_GUIDE_TOOL_NAME = "read_app_guide";

const GUIDE_DIR = fileURLToPath(new URL("../skills/classgrid-guide/", import.meta.url));
const REFS = "references";
const PHONE = "phone-app";

export const APP_GUIDE_TOOLS = [
    {
        type: "function",
        function: {
            name: APP_GUIDE_TOOL_NAME,
            description: "Read Classgrid's own how-to guide for its apps, to tell the user exactly how to do something in Classgrid (sign in, switch accounts, connect a plugin, see usage, upgrade, delete a chat or the account, Docs, projects, schedules, voice mode, Remote PC and everything else). page \"phone\" lists the pages for the Android phone app, page \"phone/<name>\" reads one of them; page \"index\" lists the pages for the website and the desktop app, and \"<name>\" reads one. Call it before giving steps for using Classgrid, then give only the steps the page has, with the button names it uses. Prices, limits and the user's usage are not in the guide: use get_plans_and_usage for those.",
            parameters: {
                type: "object",
                properties: {
                    page: { type: "string", description: "\"phone\" (list of phone app pages), \"phone/<name>\" (e.g. \"phone/accounts\"), \"index\" (website and desktop pages) or \"<name>\" (e.g. \"settings\")." },
                },
                required: ["page"],
            },
        },
    },
];

// Page names are only ever matched against the files that are there, so a name can never point outside the guide
const pageName = (v) => String(v ?? "").trim().toLowerCase().replace(/\.md$/, "").replace(/^\/+|\/+$/g, "");
const listPages = async (dir) => (await fs.readdir(dir).catch(() => []))
    .filter((f) => f.endsWith(".md") && f !== "README.md").map((f) => f.slice(0, -3)).sort();
const read = (...parts) => fs.readFile([GUIDE_DIR, ...parts].join("/"), "utf8");

export async function readAppGuide(rawPage) {
    const page = pageName(rawPage);
    const phoneDir = `${GUIDE_DIR}${REFS}/${PHONE}`;
    if (page === "phone" || page === PHONE) {
        const index = await read(REFS, PHONE, "README.md").catch(() => "");
        return index || `Phone app pages: ${(await listPages(phoneDir)).join(", ")}. Read one with page "phone/<name>".`;
    }
    const phonePage = page.match(/^(?:phone|phone-app)\/([a-z0-9-]+)$/);
    if (phonePage) {
        const names = await listPages(phoneDir);
        if (!names.includes(phonePage[1])) return `There is no phone app page "${phonePage[1]}". The pages are: ${names.join(", ")}.`;
        return read(REFS, PHONE, `${phonePage[1]}.md`);
    }
    if (page === "index" || page === "" || page === "skill") return read("SKILL.md");
    const names = await listPages(`${GUIDE_DIR}${REFS}`);
    if (!names.includes(page)) return `There is no guide page "${page}". Website and desktop pages: ${names.join(", ")}. For the phone app use page "phone".`;
    return read(REFS, `${page}.md`);
}

export function buildAppGuideHandlers() {
    return {
        [APP_GUIDE_TOOL_NAME]: async (args = {}) => {
            try {
                return await readAppGuide(args.page);
            } catch (e) {
                return `Could not read the guide: ${e.message}`;
            }
        },
    };
}
