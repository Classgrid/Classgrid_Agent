/*
 * ─────────────────────────────────────────────────────────
 * 🚫 NO BLOCKS RULE (owner's order, 2026-10-23) 🚫
 * Claude and every AI model are FORBIDDEN to add any kind of block, restriction, allowlist or
 * "only for X" rule (owner-only, super-admin-only, email checks, test-number-only, role checks)
 * unless the owner explicitly asks for that exact limit.
 * Every feature is for ALL users. Project Mode is for all users, never super-admin only.
 * ─────────────────────────────────────────────────────────
 */
/*
 * ─────────────────────────────────────────────────────────
 * 🚫 NO DISK BLAME RULE (owner's order, 2026-10-27) 🚫
 * Claude and every AI model are FORBIDDEN to say an error comes from a full disk or low disk space.
 * The owner's disks are not full. Never guess the cause of an error: read the real logs and code first,
 * and only name a cause that was actually seen.
 * ─────────────────────────────────────────────────────────
 */
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
import redis from "../config/redis.js";

// GET /api/ai/market?kind=stock&symbol=RELIANCE.NS  |  /api/ai/market?kind=fx&from=USD&to=INR
// Live price + 1-month history for the chat's market card. Stocks come from Yahoo's chart data, currencies
// from Frankfurter (European Central Bank rates). Cached 2 minutes; only those two fixed hosts are contacted.

const CACHE_SECONDS = 120;
const STOCK_RE = /^[A-Z0-9^][A-Z0-9.\-=^]{0,19}$/i;
const CURRENCY_RE = /^[A-Z]{3}$/;

function isoDay(d) {
    return d.toISOString().slice(0, 10);
}

async function stockQuote(symbol) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1mo&interval=1d`;
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    const data = await r.json();
    const result = data?.chart?.result?.[0];
    const meta = result?.meta;
    if (!meta || typeof meta.regularMarketPrice !== "number") return null;
    const closes = result?.indicators?.quote?.[0]?.close || [];
    const times = result?.timestamp || [];
    const points = times
        .map((t, i) => ({ t: t * 1000, v: closes[i] }))
        .filter((p) => typeof p.v === "number");
    const previous = typeof meta.chartPreviousClose === "number" ? meta.chartPreviousClose : (points[0]?.v ?? null);
    const price = meta.regularMarketPrice;
    // Change vs the previous trading day's close when we have it, else vs the start of the month
    const dayBefore = points.length >= 2 ? points[points.length - 2].v : previous;
    const change = typeof dayBefore === "number" ? price - dayBefore : null;
    return {
        kind: "stock",
        symbol: meta.symbol || symbol,
        name: meta.longName || meta.shortName || meta.symbol || symbol,
        exchange: meta.fullExchangeName || meta.exchangeName || "",
        currency: meta.currency || "",
        price,
        change,
        changePct: change !== null && dayBefore ? (change / dayBefore) * 100 : null,
        asOf: meta.regularMarketTime ? meta.regularMarketTime * 1000 : Date.now(),
        points,
    };
}

async function fxQuote(from, to) {
    const end = new Date();
    const start = new Date(end.getTime() - 31 * 86400000);
    const url = `https://api.frankfurter.dev/v1/${isoDay(start)}..${isoDay(end)}?from=${from}&to=${to}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    const data = await r.json();
    const points = Object.entries(data?.rates || {})
        .map(([day, rates]) => ({ t: new Date(`${day}T00:00:00Z`).getTime(), v: rates?.[to] }))
        .filter((p) => typeof p.v === "number")
        .sort((a, b) => a.t - b.t);
    if (points.length === 0) return null;
    const last = points[points.length - 1];
    const prev = points.length >= 2 ? points[points.length - 2] : null;
    const change = prev ? last.v - prev.v : null;
    return {
        kind: "fx",
        symbol: `${from}/${to}`,
        name: `${from} to ${to}`,
        exchange: "European Central Bank reference rate",
        currency: to,
        price: last.v,
        change,
        changePct: change !== null && prev?.v ? (change / prev.v) * 100 : null,
        asOf: last.t,
        points,
    };
}

export const getMarket = async (req, res) => {
    const kind = String(req.query.kind || "stock").toLowerCase();
    let key;
    let load;
    if (kind === "fx") {
        const from = String(req.query.from || "").toUpperCase();
        const to = String(req.query.to || "").toUpperCase();
        if (!CURRENCY_RE.test(from) || !CURRENCY_RE.test(to) || from === to) return res.status(400).json({ error: "Invalid currency pair" });
        key = `ai:market:fx:${from}:${to}`;
        load = () => fxQuote(from, to);
    } else {
        const symbol = String(req.query.symbol || "").trim().toUpperCase();
        if (!STOCK_RE.test(symbol)) return res.status(400).json({ error: "Invalid symbol" });
        key = `ai:market:stock:${symbol}`;
        load = () => stockQuote(symbol);
    }

    res.set("Cache-Control", `public, max-age=${CACHE_SECONDS}`);
    try {
        const cached = await redis.get(key).catch(() => null);
        if (cached) return res.json(JSON.parse(cached));
        const quote = await load();
        if (!quote) return res.status(404).json({ error: "No market data found" });
        redis.set(key, JSON.stringify(quote), "EX", CACHE_SECONDS).catch(() => {});
        return res.json(quote);
    } catch {
        return res.status(502).json({ error: "Market data is unavailable right now" });
    }
};
