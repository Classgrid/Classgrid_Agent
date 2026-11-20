// One row each time a person's own credits pay for something (owner, 2026-11-20: the Usage page's "Credits used"
// added what the plan covered to what the credits paid, so it never said how many credits were spent). The credits
// are the shared pool used only past a plan limit: gifted (promotion) and bought (top-up).
//
// Written in one place only, deductTokens (services/ai-credits.service.js), with the exact number taken from the
// balance, so the rows of a person add up to what left their credits. Nothing the plan covers is written here, and
// neither is a gift that a super admin took back or paused (that is not spending).
//
// model / what / logId say what the credits paid for, when the caller tells deductTokens (label); empty otherwise.
import mongoose from "mongoose";

const aiCreditSpendSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        orgId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", default: null },
        credits: { type: Number, required: true, min: 0 },
        pool: { type: String, enum: ["gifted", "bought"], required: true },
        model: { type: String, default: "" },
        what: { type: String, default: "" },
        logId: { type: mongoose.Schema.Types.ObjectId, ref: "AiUsageLog", default: null },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

aiCreditSpendSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.AiCreditSpend || mongoose.model("AiCreditSpend", aiCreditSpendSchema);
