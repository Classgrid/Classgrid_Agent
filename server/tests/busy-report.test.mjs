// Each server process that answers people says how busy it is, so a new version goes live only when nobody is being
// answered (src/utils/busy-report.js; scripts/deploy-when-idle.sh reads the reports). The rescue server reports too
// since 2026-11-17: it takes the requests while the main server restarts, and it used to be restarted a few seconds
// later whatever it was doing, which cut an answer in the middle (owner: "it shows the answer but it got hidden
// within a second"). Checked here:
//   - a request counts from the moment it comes in until its answer has ended, once (finish and close both fire)
//   - the chat socket is not counted
//   - the report names the process, its requests and helpers, and the time
//   - both servers use it: the main one as "classgrid", the rescue one as "classgrid-rescue"
// Run: node --test tests/busy-report.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { reportBusy } from "../src/utils/busy-report.js";

const tempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "cg-busy-"));
const ask = (server, url) => { const res = new EventEmitter(); server.emit("request", { url }, res); return res; };

test("a request counts until its answer has ended, once", () => {
    const server = new EventEmitter();
    const busy = reportBusy(server, "classgrid", { dir: tempDir(), everyMs: 0 });
    assert.equal(busy.count(), 0);
    const a = ask(server, "/api/ai/ask");
    const b = ask(server, "/api/ai/sessions");
    assert.equal(busy.count(), 2);
    b.emit("finish");
    b.emit("close"); // (both fire for one answer)
    assert.equal(busy.count(), 1);
    a.emit("close"); // (the app went away in the middle: still the end of this request)
    assert.equal(busy.count(), 0);
    a.emit("finish");
    assert.equal(busy.count(), 0, "never below zero");
});

test("the chat socket is not counted", () => {
    const server = new EventEmitter();
    const busy = reportBusy(server, "classgrid", { dir: tempDir(), everyMs: 0 });
    ask(server, "/socket.io/?EIO=4&transport=polling");
    assert.equal(busy.count(), 0);
    const rescue = reportBusy(new EventEmitter(), "classgrid-rescue", { dir: tempDir(), everyMs: 0, skip: (url) => url.startsWith("/api/rescue/socket.io") });
    assert.equal(rescue.count(), 0);
});

test("the report names the process, its requests and helpers, and the time", async () => {
    const dir = tempDir();
    const server = new EventEmitter();
    const busy = reportBusy(server, "classgrid-rescue", { dir, everyMs: 0, helpers: async () => 2 });
    ask(server, "/api/rescue/ai/ask");
    await busy.write();
    const report = JSON.parse(fs.readFileSync(path.join(dir, `${process.pid}.json`), "utf8"));
    assert.equal(report.name, "classgrid-rescue");
    assert.equal(report.requests, 1);
    assert.equal(report.helpers, 2);
    assert.ok(Date.now() - report.at < 5000);
    // Helpers that cannot be counted yet (the chat code is still loading) count as none; the report is still written
    const early = reportBusy(new EventEmitter(), "classgrid", { dir, everyMs: 0, helpers: async () => { throw new Error("not loaded"); } });
    await early.write();
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir, `${process.pid}.json`), "utf8")).helpers, 0);
});

test("both servers report, and the deploy waits for each by its own name", () => {
    const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
    const main = fs.readFileSync(path.join(root, "server.js"), "utf8");
    const rescue = fs.readFileSync(path.join(root, "rescue-server.js"), "utf8");
    const deploy = fs.readFileSync(path.join(root, "scripts", "deploy-when-idle.sh"), "utf8");
    assert.match(main, /reportBusy\(server, "classgrid",/);
    assert.match(rescue, /reportBusy\(rescueHttpServer, "classgrid-rescue",/);
    assert.match(deploy, /r\.name && r\.name !== "classgrid"/, "the main server's wait does not count the rescue server's report");
    assert.match(deploy, /b=\$\(busy_of "\$name"\)/, "every other process is waited for by its own report before its restart");
    assert.ok(deploy.indexOf("busy_of \"$name\"") < deploy.lastIndexOf("pm2 restart \"$name\""), "the wait comes before the restart");
});
