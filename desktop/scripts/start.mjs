// Starts the desktop app for testing. Editors like VS Code set ELECTRON_RUN_AS_NODE, which makes Electron act as
// plain Node: it is removed here so the app window opens.
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import electron from "electron";

const here = path.dirname(fileURLToPath(import.meta.url));
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(electron, [path.resolve(here, "..")], { stdio: "inherit", env });
child.on("exit", (code) => process.exit(code ?? 0));
