// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
// GET /api/net-check: is this visitor on a VPN, proxy or Tor? chat.classgrid.in shows a blank page when blocked.
// POST /api/net-check/human: checks the Cloudflare Turnstile "Verify you are human" token from chat.classgrid.in.
import express from "express";
import { checkIp, clientIp } from "../services/net-check.service.js";

const router = express.Router();

router.get("/", async (req, res) => {
    const { blocked } = await checkIp(clientIp(req));
    res.set("Cache-Control", "no-store");
    res.json({ blocked });
});

router.post("/human", async (req, res) => {
    res.set("Cache-Control", "no-store");
    const secret = process.env.TURNSTILE_SECRET;
    // No secret set on this server yet: let people in rather than lock everyone out
    if (!secret) {
        console.warn("[net-check] TURNSTILE_SECRET is not set; the human check is skipped");
        return res.json({ ok: true });
    }
    const token = String(req.body?.token || "");
    if (!token) return res.status(400).json({ ok: false });
    try {
        const verify = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ secret, response: token, remoteip: clientIp(req) }),
            signal: AbortSignal.timeout(8000),
        });
        const data = await verify.json();
        res.json({ ok: !!data.success });
    } catch (err) {
        // Cloudflare can't be reached: let the visitor in
        console.error("[net-check] Turnstile verify failed:", err.message);
        res.json({ ok: true });
    }
});

export default router;
