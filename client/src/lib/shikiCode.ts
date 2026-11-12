// Code colouring with Shiki (VS Code's own grammars and its Dark+ / Light+ themes), the same as the Files tab, for the
// chat's code blocks and Studio's Review tab (owner, 2026-11-12: "the AI's code blocks and the Review page must use
// shiki like the files do"). Shiki loads only when something needs colouring; until then the plain text shows.

/** The Shiki theme for the page's current colour mode */
export const shikiTheme = (): "dark-plus" | "light-plus" => (typeof document !== "undefined" && document.documentElement.classList.contains("dark") ? "dark-plus" : "light-plus");

// Endings and names Shiki does not know by that word
const BY_EXT: Record<string, string> = {
  js: "javascript", mjs: "javascript", cjs: "javascript", jsx: "jsx", ts: "typescript", mts: "typescript", cts: "typescript", tsx: "tsx",
  py: "python", rb: "ruby", rs: "rust", kt: "kotlin", kts: "kotlin", cs: "csharp", h: "c", hpp: "cpp", cc: "cpp", cxx: "cpp",
  md: "markdown", mdx: "mdx", yml: "yaml", htm: "html", vue: "vue", svelte: "svelte", sh: "bash", zsh: "bash", bash: "bash", ps1: "powershell",
  env: "dotenv", txt: "text", log: "log", csv: "csv", gql: "graphql", prisma: "prisma", tf: "terraform", dockerfile: "dockerfile", makefile: "makefile",
  gradle: "groovy", toml: "toml", ini: "ini", cfg: "ini", conf: "ini", xml: "xml", svg: "xml", plist: "xml", sql: "sql", lua: "lua", r: "r", scala: "scala",
  swift: "swift", dart: "dart", go: "go", java: "java", php: "php", pl: "perl", ex: "elixir", exs: "elixir", erl: "erlang", hs: "haskell", clj: "clojure",
  json: "json", jsonc: "jsonc", json5: "json5", css: "css", scss: "scss", sass: "sass", less: "less", html: "html",
};
const BY_NAME: Record<string, string> = { dockerfile: "dockerfile", makefile: "makefile", ".env": "dotenv", ".bashrc": "bash", ".zshrc": "bash", "tsconfig.json": "jsonc" };
// The language names markdown fences use
const BY_FENCE: Record<string, string> = { js: "javascript", ts: "typescript", py: "python", sh: "bash", shell: "bash", zsh: "bash", yml: "yaml", md: "markdown", rb: "ruby", rs: "rust", kt: "kotlin", cs: "csharp", "c++": "cpp", "c#": "csharp", plaintext: "text", plain: "text", txt: "text", console: "bash", node: "javascript", jsonc: "jsonc", html: "html", vue: "vue", docker: "dockerfile", ps: "powershell", pwsh: "powershell", ps1: "powershell" };

let langIds: Set<string> | null = null;
let langAliases: Map<string, string> | null = null;
async function langTable() {
  if (langIds && langAliases) return { ids: langIds, aliases: langAliases };
  const { bundledLanguagesInfo } = await import("shiki");
  langIds = new Set(bundledLanguagesInfo.map((l) => l.id));
  langAliases = new Map();
  for (const l of bundledLanguagesInfo) for (const a of l.aliases || []) langAliases.set(a, l.id);
  return { ids: langIds, aliases: langAliases };
}
async function knownLang(want: string): Promise<string> {
  const w = String(want || "").toLowerCase().trim();
  if (!w) return "text";
  const { ids, aliases } = await langTable();
  return ids.has(w) ? w : aliases.get(w) || "text";
}

/** Shiki's language for a file, from its name ("components/Pricing.tsx" -> tsx) */
export async function shikiLangForFile(path: string): Promise<string> {
  const name = String(path || "").split(/[\\/]/).pop()!.toLowerCase();
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1) : name;
  return knownLang(BY_NAME[name] || BY_EXT[ext] || ext);
}

/** Shiki's language for a markdown fence ("```tsx", "```py") */
export async function shikiLangForFence(language: string): Promise<string> {
  const l = String(language || "").toLowerCase().trim();
  return knownLang(BY_FENCE[l] || BY_EXT[l] || l);
}

export type ShikiBlock = { style: string; lines: string[] };

/**
 * The code coloured line by line: Shiki's `<span class="line">…</span>` for each line, and the `style` of its
 * `<pre>` (the theme's background and text colour). Unknown languages are coloured as plain text.
 */
export async function shikiLines(code: string, lang: string, theme = shikiTheme()): Promise<ShikiBlock> {
  const { codeToHtml } = await import("shiki");
  let html: string;
  try { html = await codeToHtml(code, { lang, theme }); } catch { html = await codeToHtml(code, { lang: "text", theme }); }
  const pre = new DOMParser().parseFromString(html, "text/html").querySelector("pre");
  if (!pre) return { style: "", lines: code.split("\n").map(escapeHtml) };
  return { style: pre.getAttribute("style") || "", lines: [...pre.querySelectorAll("code > .line")].map((l) => l.outerHTML) };
}

export const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
