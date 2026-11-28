// Canva (MCP) and Zoom (MCP): the official MCP servers as a second way to connect Canva and Zoom, next to the built-in
// plugins (owner, 2026-11-27). Zoom lets no new app sign itself up, so it logs in with the built-in Zoom plugin's own
// app (ZOOM_CLIENT_ID / ZOOM_CLIENT_SECRET) and is offered only when both are set.
// node --test tests/mcp-catalog-second-way.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { MCP_CATALOG, publicCatalog, findCatalogApp, presetOAuthClient, catalogAppReady } from "../src/services/custom-mcp-catalog.js";
import { selectClientAuthMethod } from "@modelcontextprotocol/sdk/client/auth.js";

const ZOOM_ENV = { ZOOM_CLIENT_ID: "zoom-id", ZOOM_CLIENT_SECRET: "zoom-secret" };

// Canva is hidden everywhere since 2026-11-28 (utils/hidden-plugins.js): its entry stays in the catalog but is never offered
test("Canva (MCP) stays in the catalog with Canva's own MCP address, but is hidden: never offered", () => {
    const canva = MCP_CATALOG.find((a) => a.id === "canva-mcp");
    assert.equal(canva.name, "Canva (MCP)");
    assert.equal(canva.url, "https://mcp.canva.com/mcp");
    assert.equal(canva.auth, "oauth");
    assert.equal(canva.logo, "https://cdn.classgrid.in/classgrid_intgration/canva.svg");
    assert.equal(canva.oauthClientEnv, undefined); // Canva signs our app up by itself
    assert.ok(!publicCatalog({}).some((a) => a.id === "canva-mcp"));
});

test("Zoom (MCP) is offered only when the Zoom app's id and secret are set", () => {
    const zoom = MCP_CATALOG.find((a) => a.id === "zoom-mcp");
    assert.equal(zoom.name, "Zoom (MCP)");
    assert.equal(zoom.url, "https://mcp.zoom.us/mcp/zoom/streamable");
    assert.equal(zoom.logo, "https://cdn.classgrid.in/classgrid_intgration/zoom-communications-icon_(1).svg");
    assert.equal(catalogAppReady(zoom, {}), false);
    assert.equal(catalogAppReady(zoom, { ZOOM_CLIENT_ID: "x" }), false);
    assert.equal(catalogAppReady(zoom, { ZOOM_CLIENT_ID: " ", ZOOM_CLIENT_SECRET: "y" }), false);
    assert.equal(catalogAppReady(zoom, ZOOM_ENV), true);
    assert.ok(!publicCatalog({}).some((a) => a.id === "zoom-mcp"));
    assert.ok(publicCatalog(ZOOM_ENV).some((a) => a.id === "zoom-mcp"));
});

test("the browser and the AI never get the env variable names", () => {
    for (const app of publicCatalog(ZOOM_ENV)) assert.equal(app.oauthClientEnv, undefined);
    assert.ok(MCP_CATALOG.find((a) => a.id === "zoom-mcp").oauthClientEnv, "the server's own list keeps them");
});

test("preset client: Zoom's from the env, none for apps that sign up by themselves", () => {
    assert.deepEqual(presetOAuthClient("zoom-mcp", ZOOM_ENV), { client_id: "zoom-id", client_secret: "zoom-secret" });
    assert.equal(presetOAuthClient("zoom-mcp", {}), null);
    assert.equal(presetOAuthClient("canva-mcp", ZOOM_ENV), null);
    assert.equal(presetOAuthClient("linear", ZOOM_ENV), null);
    assert.equal(presetOAuthClient(null, ZOOM_ENV), null);
});

test("Zoom's token endpoint takes only client_secret_basic, and the SDK picks it for the preset client", () => {
    assert.equal(selectClientAuthMethod(presetOAuthClient("zoom-mcp", ZOOM_ENV), ["client_secret_basic"]), "client_secret_basic");
});

test("the AI finds the MCP entries by their names, and not Zoom (MCP) before it is set up", () => {
    // (Canva is hidden: never found)
    assert.equal(findCatalogApp("Canva (MCP)", {}), null);
    assert.equal(findCatalogApp("canva-mcp", {}), null);
    assert.equal(findCatalogApp("Zoom (MCP)", ZOOM_ENV)?.id, "zoom-mcp");
    assert.equal(findCatalogApp("Zoom (MCP)", {}), null);
    // the others are found as before
    assert.equal(findCatalogApp("jira", {})?.id, "atlassian");
    assert.equal(findCatalogApp("Linear", {})?.id, "linear");
});

test("ids and addresses stay unique", () => {
    const ids = MCP_CATALOG.map((a) => a.id);
    assert.equal(new Set(ids).size, ids.length);
    const urls = MCP_CATALOG.map((a) => a.url).filter(Boolean);
    assert.equal(new Set(urls).size, urls.length);
});
