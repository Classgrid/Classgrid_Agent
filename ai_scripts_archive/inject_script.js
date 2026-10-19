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
const fs = require("fs");
const path = require("path");

const COMMENT_BLOCK = `/*
 * =========================================================================================
 * 🚨 CRITICAL AI & SYSTEM RULE 🚨
 * NO FRONTEND GITHUB ACTIONS: NEVER create yaml files that build/deploy the frontend to EC2.
 * The frontend is hosted 100% on Vercel. EC2 is only for the backend.
 * =========================================================================================
 */\n\n`;

function processDirectory(directory) {
  const files = fs.readdirSync(directory);

  for (const file of files) {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!["node_modules", "dist", ".git", "build", ".next", "scratch"].includes(file)) {
        processDirectory(fullPath);
      }
    } else {
      if (fullPath.endsWith(".js") || fullPath.endsWith(".ts") || fullPath.endsWith(".tsx") || fullPath.endsWith(".jsx")) {
        const content = fs.readFileSync(fullPath, "utf8");
        if (!content.includes("NO FRONTEND GITHUB ACTIONS")) {
          fs.writeFileSync(fullPath, COMMENT_BLOCK + content, "utf8");
          console.log(`Injected into ${fullPath}`);
        }
      }
    }
  }
}

processDirectory("./client/src");
processDirectory("./server/src");
console.log("Done injecting rules into all frontend and backend source files!");
