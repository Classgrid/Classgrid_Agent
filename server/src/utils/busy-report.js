// A new version goes live only when nobody is using the server (scripts/deploy-when-idle.sh waits for it): every few
// seconds each server process that answers people writes how busy it is to ~/.classgrid-busy/<pid>.json:
//   { name, requests, helpers, at }
// Busy = requests being answered right now (an AI answer is one long request) + helpers still working after their
// answer. The live chat socket isn't counted: it stays open while a page is open, and it reconnects by itself after
// a restart.
//
// Two processes report: the main server (server.js, "classgrid") and the rescue server (rescue-server.js,
// "classgrid-rescue"). The rescue server takes people's requests while the main one restarts; until 2026-11-17 it did
// not report, so the deploy restarted it a few seconds after the main one whatever it was doing: a question asked in
// those seconds was answered by it and cut in the middle (owner, that day: "it shows the answer but it got hidden
// within a second"; the chat had his question twice and one answer).
import os from "os";
import fs from "fs";
import path from "path";

export const BUSY_DIR = path.join(os.homedir(), ".classgrid-busy");

/**
 * Counts the requests `httpServer` is answering and writes this process's report every 5 seconds.
 * `name`: the process's pm2 name. `skip(url)`: requests that are not counted (the chat socket). `helpers()`: how many
 * helpers are still working. Returns { count(), write() } (for the tests).
 */
export function reportBusy(httpServer, name, { skip = (url) => url.startsWith("/socket.io"), helpers = async () => 0, dir = BUSY_DIR, everyMs = 5000 } = {}) {
    let requestsNow = 0;
    httpServer.on("request", (req, res) => {
        if (skip(req.url || "")) return;
        requestsNow++;
        let ended = false;
        const end = () => { if (!ended) { ended = true; requestsNow--; } };
        res.on("finish", end);
        res.on("close", end);
    });
    const file = path.join(dir, `${process.pid}.json`);
    const write = async () => {
        let working = 0;
        try { working = Number(await helpers()) || 0; } catch { /* not loaded yet */ }
        try {
            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(file, JSON.stringify({ name, requests: requestsNow, helpers: working, at: Date.now() }));
        } catch { /* the deploy waits for a fresh report */ }
    };
    if (everyMs > 0) setInterval(write, everyMs).unref();
    return { count: () => requestsNow, write, file };
}
