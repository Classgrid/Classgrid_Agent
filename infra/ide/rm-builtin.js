/*
 * ─────────────────────────────────────────────────────────
 * 🚨 ERP SHUT DOWN 🚨
 * The Classgrid ERP is shut down and will never work or be worked on again.
 * The org admin dashboard and every dashboard other than chat.classgrid.in and the
 * super admin dashboard are banned, and so is all ERP backend code.
 * Any issue or bug in the ERP or the org admin dashboard is banned too: do not look
 * for it, report it or fix it.
 * Do not build, fix, test or talk about ERP features. Only chat.classgrid.in and the
 * super admin dashboard are live.
 * ─────────────────────────────────────────────────────────
 */
// Remove built-in web add-ons from the editor's bundled list (string-aware brace matching)
const fs = require("fs");
const file = process.argv[2], names = process.argv.slice(3);
let s = fs.readFileSync(file, "utf8");
for (const name of names) {
  const key = `{extensionPath:"${name}"`;
  const start = s.indexOf(key);
  if (start < 0) { console.log("not listed:", name); continue; }
  let depth = 0, i = start, inStr = null;
  for (; i < s.length; i++) {
    const c = s[i];
    if (inStr) { if (c === "\\") { i++; continue; } if (c === inStr) inStr = null; continue; }
    if (c === '"' || c === "'" || c === "`") { inStr = c; continue; }
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) break; }
  }
  let end = i + 1;
  if (s[end] === ",") end++; else if (s[start - 1] === ",") { s = s.slice(0, start - 1) + s.slice(end); console.log("removed:", name); continue; }
  s = s.slice(0, start) + s.slice(end);
  console.log("removed:", name);
}
fs.writeFileSync(file, s);
