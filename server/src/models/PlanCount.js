// The plan's count limits that are not credits (services/plan-usage.service.js): answers read out loud and voice
// minutes per day, cloud computer hours per month. One small document per person, kind and day or month, named like
// the Redis key it used to live in alone ("plan:<kind>:<userId>:<day or month>").
// Until 2026-11-21 these counts were kept only in Redis, and "a count that cannot be read never blocks anyone": with
// Redis away, or after it lost its data (on this server Redis keeps snapshots only), these limits stopped nobody.
// The count is now kept here; Redis holds only a short-lived copy for fast reads.
// A document is removed by itself once its day or month is well over (expiresAt).
import mongoose from "mongoose";

const planCountSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
}, { timestamps: true });

planCountSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.PlanCount || mongoose.model("PlanCount", planCountSchema);
