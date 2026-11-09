// An answer the desktop app or Classgrid Code can come back to (owner, 2026-11-09): the app's internet drops for a
// moment while an answer streams, and the answer must go on, like Claude Code's retry. The answer's events are kept here
// (in this server process) under a turn id; when the app's connection drops, the answer is NOT stopped: it keeps
// running for a grace period, and the app reattaches with GET /api/ai/turn/:id/events?from=N, gets every event it
// missed, and the stream carries on. Only when nobody comes back within the grace period is the answer stopped, as
// before. streamAskAi writes to the facade `turn.res` exactly as it wrote to the real response.
import crypto from "node:crypto";

const GRACE_MS = 4 * 60 * 1000; // how long an answer waits for its app to come back
const KEEP_AFTER_END_MS = 10 * 60 * 1000; // a finished answer can still be fetched for this long (a late reattach)
const MAX_EVENTS = 20000; // kept per answer (tokens are one event each); older ones are dropped first
const turns = new Map(); // turnId -> DurableTurn

const SSE_HEADERS = { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", "Connection": "keep-alive", "X-Accel-Buffering": "no" };

class DurableTurn {
    constructor(realRes, userId) {
        this.id = crypto.randomBytes(12).toString("hex");
        this.userId = String(userId);
        this.events = []; // every `data:` chunk written, in order
        this.dropped = 0; // how many oldest events were trimmed away
        this.ended = false;
        this.aborted = false;
        this.live = realRes;
        this.timer = null;
        this.closeHandlers = [];
        this.abortHandlers = [];
        this.watch(realRes);
        const self = this;
        // What streamAskAi sees as `res` after the SSE headers: the same calls it makes on a real response
        this.res = {
            get writableEnded() { return self.ended; },
            get destroyed() { return self.aborted; },
            get headersSent() { return true; },
            write(chunk) { return self.write(chunk); },
            end(chunk) { if (chunk) self.write(chunk); self.end(); return this; },
            on(event, fn) { if (event === "close" || event === "finish") self.closeHandlers.push(fn); return this; },
            once(event, fn) { return this.on(event, fn); },
            off() { return this; },
            removeListener() { return this; },
            flush() {},
            flushHeaders() {},
            setHeader() { return this; },
            getHeader() { return undefined; },
            writeHead() { return this; },
            status() { return this; },
            json() { return this; },
            send() { return this; },
        };
    }
    watch(real) {
        real.on("close", () => { if (this.live === real) this.detach(); });
    }
    write(chunk) {
        if (this.ended) return false;
        const s = typeof chunk === "string" ? chunk : String(chunk);
        if (s.startsWith("data:")) {
            this.events.push(s);
            if (this.events.length > MAX_EVENTS) { this.events.shift(); this.dropped++; }
        }
        if (this.live && !this.live.writableEnded && !this.live.destroyed) {
            try { this.live.write(s); } catch { /* the socket is going away; detach() follows */ }
        }
        return true;
    }
    end() {
        if (this.ended) return;
        this.ended = true;
        if (this.timer) { clearTimeout(this.timer); this.timer = null; }
        if (this.live && !this.live.writableEnded) { try { this.live.end(); } catch { /* gone */ } }
        for (const fn of this.closeHandlers.splice(0)) { try { fn(); } catch { /* a handler's own error */ } }
        setTimeout(() => { if (turns.get(this.id) === this) turns.delete(this.id); }, KEEP_AFTER_END_MS).unref?.();
    }
    // The app's connection went away: the answer goes on and waits for the app to come back
    detach() {
        if (this.ended) return;
        this.live = null;
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(() => this.abort(), GRACE_MS);
        this.timer.unref?.();
    }
    // The app is back: it gets everything from event number `from` on, then the live stream
    attach(res, from) {
        if (this.aborted) return false;
        if (this.timer) { clearTimeout(this.timer); this.timer = null; }
        res.writeHead(200, SSE_HEADERS);
        res.write(":" + Array(2048).join(" ") + "\n\n");
        const start = Math.max(0, (Number(from) || 0) - this.dropped);
        for (let i = start; i < this.events.length; i++) res.write(this.events[i]);
        if (this.ended) { res.end(); return true; }
        if (this.live && this.live !== res && !this.live.writableEnded) { try { this.live.end(); } catch { /* gone */ } }
        this.live = res;
        this.watch(res);
        return true;
    }
    abort() {
        if (this.ended) return;
        this.aborted = true;
        for (const fn of this.abortHandlers.splice(0)) { try { fn(); } catch { /* a handler's own error */ } }
        this.end();
    }
    onAbort(fn) { if (this.aborted) fn(); else this.abortHandlers.push(fn); }
}

/** Start keeping an answer's events; returns the turn (use `turn.res` in place of the response from here on) */
export function startDurableTurn(realRes, userId) {
    const turn = new DurableTurn(realRes, userId);
    turns.set(turn.id, turn);
    return turn;
}

/** The app comes back for an answer: true when it was attached (false = unknown turn, another user, or already stopped) */
export function attachToTurn(turnId, userId, res, from) {
    const turn = turns.get(String(turnId || ""));
    if (!turn || turn.userId !== String(userId)) return false;
    return turn.attach(res, from);
}
