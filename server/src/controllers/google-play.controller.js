// POST /api/billing/google-play/verify (routes/google-play.routes.js): the Android app sends a Google Play purchase
// here right after buying. Body: { type: "subscription" | "product", productId, purchaseToken }.
// Answers { ok: true, plan?: { key, term, expires_at }, credits_added?: number }, or an error status with
// { error: "<plain sentence>", code? }. The same token sent again answers ok with what was already given.
import { verifyPlayPurchase, PlayError } from "../services/google-play.service.js";

export const verifyGooglePlayPurchase = async (req, res) => {
    const type = req.body?.type;
    const productId = typeof req.body?.productId === "string" ? req.body.productId.trim() : "";
    const purchaseToken = typeof req.body?.purchaseToken === "string" ? req.body.purchaseToken.trim() : "";
    if (type !== "subscription" && type !== "product") return res.status(400).json({ error: "The purchase type must be subscription or product." });
    if (!productId || productId.length > 200) return res.status(400).json({ error: "The product id is missing." });
    if (!purchaseToken || purchaseToken.length > 4096) return res.status(400).json({ error: "The purchase token is missing." });
    try {
        const answer = await verifyPlayPurchase({ user: req.user, type, productId, purchaseToken, io: req.app.get("io") });
        return res.status(200).json(answer);
    } catch (err) {
        if (err instanceof PlayError) return res.status(err.status).json(err.body);
        console.error("[Google Play] verify error:", err);
        return res.status(500).json({ error: "The purchase could not be checked. Please try again." });
    }
};
