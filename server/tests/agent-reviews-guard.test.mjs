// People's feedback reports are the Classgrid team's page only. Until 2026-11-25 the four routes asked for a sign-in
// and nothing more, so any signed-in person could read, change and delete everyone's reports.
// (The middleware file needs the server's settings to load, so the routes are read as text here.)
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const routes = fs.readFileSync(new URL("../src/routes/ai.routes.js", import.meta.url), "utf8");
const middleware = fs.readFileSync(new URL("../src/middleware/auth.middleware.js", import.meta.url), "utf8");

test("every agent-reviews route asks for the team's role after the sign-in", () => {
    const lines = routes.split(/\r?\n/).filter((l) => /^router\.\w+\("\/agent-reviews/.test(l));
    assert.equal(lines.length, 4, "the four routes: list, status, delete, bulk delete");
    for (const line of lines) {
        assert.match(line, /isAuthenticated, requireRole\("super_admin"\), \w+\);$/, line);
    }
});

test("the routes file takes that guard from the sign-in middleware", () => {
    assert.match(routes, /import \{[^}]*\brequireRole\b[^}]*\} from "\.\.\/middleware\/auth\.middleware\.js";/);
});

test("the guard refuses a role that is not named", () => {
    const at = middleware.indexOf("export const requireRole");
    assert.ok(at > 0);
    const body = middleware.slice(at, at + 900);
    assert.ok(body.includes("!roles.includes(effectiveRole)"), "a role outside the list does not pass");
    assert.ok(body.includes("res.status(403)"), "and is answered 403");
});
