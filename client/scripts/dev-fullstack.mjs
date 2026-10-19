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
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDir = path.resolve(__dirname, "..");
const repoRoot = path.resolve(clientDir, "..");
const serverDir = path.join(repoRoot, "server");
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

const children = new Set();

function isPortOpen(port, host = "127.0.0.1", timeoutMs = 650) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const done = (isOpen) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(isOpen);
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

function pipeWithLabel(child, label) {
  child.stdout?.on("data", (chunk) => process.stdout.write(`[${label}] ${chunk}`));
  child.stderr?.on("data", (chunk) => process.stderr.write(`[${label}] ${chunk}`));
}

function run(label, args, cwd) {
  const child = spawn(npmCmd, args, {
    cwd,
    env: process.env,
    shell: process.platform === "win32",
    stdio: ["inherit", "pipe", "pipe"],
  });

  children.add(child);
  pipeWithLabel(child, label);
  child.once("exit", (code, signal) => {
    children.delete(child);
    if (code && code !== 0) {
      console.error(`[${label}] exited with code ${code}`);
    } else if (signal) {
      console.error(`[${label}] stopped by ${signal}`);
    }
  });

  return child;
}

function stopChildren(signal = "SIGTERM") {
  for (const child of children) {
    child.kill(signal);
  }
}

process.once("SIGINT", () => {
  stopChildren("SIGINT");
  process.exit(0);
});

process.once("SIGTERM", () => {
  stopChildren("SIGTERM");
  process.exit(0);
});

const backendAlreadyRunning = await isPortOpen(3000);

if (backendAlreadyRunning) {
  console.log("[dev] Backend already running at http://localhost:3000");
} else {
  console.log("[dev] Starting backend at http://localhost:3000");
  run("server", ["run", "dev"], serverDir);
}

console.log("[dev] Starting Vite at http://localhost:5173");
run("client", ["run", "dev:client"], clientDir);
