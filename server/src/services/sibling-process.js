// Two copies of this server run on the machine: the main one (port 3000, nginx /api/...) and the rescue copy
// (rescue-server.js, port 4000, nginx /api/rescue/...), which answers when the main one is down or a request to it
// fails. A running answer lives in ONE process (durable-turn.service.js `turns`, local-loop.service.js `loops`): when
// the app's request to the main copy failed and its /ask went to the rescue copy, the answer ran there, but the app's
// next steps (POST /turn/:id/cmd, GET /turn/:id/events) went back to the main copy, which did not know the answer and
// said "This answer isn't here any more"; the panel then waited for ever (owner, 2026-11-10, 431 s "Thinking"). So a
// turn request for an answer this process does not know is passed to the other copy once, and its reply (a JSON
// answer or the live event stream) is relayed back as is. Only the owner's own copies on 127.0.0.1 are reached.
import http from "node:http";

export const PROCESS_ROLE = process.env.CG_PROCESS_ROLE === "rescue" ? "rescue" : "main";
const MAIN_PORT = Number(process.env.CG_MAIN_PORT || 3000);
const RESCUE_PORT = Number(process.env.CG_RESCUE_PORT || 4000);
const SIBLING_HEADER = "x-cg-sibling";
const CONNECT_TIMEOUT_MS = 3000;
// Headers that describe this hop, not the request: not passed on (Node sets content-length and connection itself)
const HOP_HEADERS = /^(host|connection|content-length|transfer-encoding|keep-alive|upgrade|proxy-connection|te|trailer)$/i;

/** The other copy's address for this request: the rescue copy serves the backend under /api/rescue */
function siblingTarget(req) {
    const path = String(req.originalUrl || req.url || "/");
    return PROCESS_ROLE === "rescue"
        ? { port: MAIN_PORT, path }
        : { port: RESCUE_PORT, path: `/api/rescue${path}` };
}

/**
 * Passes this request to the other copy and relays its reply. Resolves true when the reply was relayed (whatever its
 * status), false when nothing was sent (the request already came from the other copy, or that copy is not reachable),
 * so the caller answers as it would have without a sibling.
 */
export function forwardToSibling(req, res) {
    if (req.headers[SIBLING_HEADER]) return Promise.resolve(false);
    const { port, path } = siblingTarget(req);
    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) if (!HOP_HEADERS.test(k) && v !== undefined) headers[k] = v;
    headers[SIBLING_HEADER] = PROCESS_ROLE;
    // The body was already read and parsed here (express.json); it goes on as JSON again
    const hasBody = req.method !== "GET" && req.method !== "HEAD" && req.body !== undefined;
    const body = hasBody ? Buffer.from(JSON.stringify(req.body ?? {})) : null;
    if (body) headers["content-type"] = "application/json";
    return new Promise((resolve) => {
        let settled = false;
        const done = (sent) => { if (!settled) { settled = true; resolve(sent); } };
        const up = http.request({ host: "127.0.0.1", port, method: req.method, path, headers, timeout: CONNECT_TIMEOUT_MS }, (upRes) => {
            const out = {};
            for (const [k, v] of Object.entries(upRes.headers)) if (!HOP_HEADERS.test(k) && v !== undefined) out[k] = v;
            res.writeHead(upRes.statusCode || 502, out);
            if (typeof res.flushHeaders === "function") res.flushHeaders();
            upRes.pipe(res);
            upRes.on("error", () => { try { res.end(); } catch { /* already closed */ } });
            done(true);
        });
        // (the timeout covers only the wait for the first byte of the reply: a live event stream keeps going after it)
        up.on("timeout", () => { if (!settled) up.destroy(new Error("sibling did not answer in time")); });
        up.on("error", (err) => {
            if (!settled) console.warn(`[sibling] ${PROCESS_ROLE}: the other copy did not take ${req.method} ${path}: ${err.message}`);
            done(false);
        });
        // The app went away: the relayed stream is closed too, so the other copy sees the same drop it would have seen
        const stop = () => { try { up.destroy(); } catch { /* already closed */ } };
        res.on("close", stop);
        if (body) up.end(body); else up.end();
    });
}
