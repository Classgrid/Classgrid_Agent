// One row per Google Play purchase token the phone app sent to POST /api/billing/google-play/verify
// (services/google-play.service.js). The row is written BEFORE anything is given, and the token is unique, so two
// requests with the same token can never both give the plan or the credits; a later request answers with `granted`.
import mongoose from "mongoose";

const googlePlayPurchaseSchema = new mongoose.Schema(
    {
        purchaseToken: { type: String, required: true, unique: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        type: { type: String, enum: ["subscription", "product"], required: true },
        productId: { type: String, required: true },
        orderId: { type: String, default: "" },
        // A subscription bought as a plan change (Pro to Max, monthly to yearly) or a re-signup: the token it replaced.
        // That older token is then never given again nor renewed (services/google-play.service.js).
        linkedPurchaseToken: { type: String, default: "", index: true },
        // The newer token that replaced this subscription (a plan change); this one is then never given or renewed
        replacedBy: { type: String, default: "" },
        // A credit pack: the credits it gives (saved before they are added) and whether they are on the account. The
        // credits and the account's own mark (User.play_credited) are written in one step; this flag follows it, and
        // a pack that is credited is never rolled back, only finished (google-play.service.js)
        creditsPlanned: { type: Number, default: 0 },
        credited: { type: Boolean, default: false },
        regionCode: { type: String, default: "" },
        // Orders Google voided (refunded, charged back, revoked) that were applied here
        voidedOrders: { type: [String], default: undefined },
        // "granting" while a request is giving it, "granted" once it is on the account
        status: { type: String, enum: ["granting", "granted"], default: "granting" },
        // What was given: { plan: { key, term, expires_at } } or { credits_added }
        granted: { type: mongoose.Schema.Types.Mixed, default: null },
        // Told to Google: a subscription acknowledged, a credit pack consumed (retried while false)
        acknowledged: { type: Boolean, default: false },
        consumed: { type: Boolean, default: false },
    },
    { timestamps: true }
);

export default mongoose.models.GooglePlayPurchase || mongoose.model("GooglePlayPurchase", googlePlayPurchaseSchema);
