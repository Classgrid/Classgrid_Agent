// A durable copy of the day's Cloudflare Neuron count (services/cf-neuron-cap.service.js). The count itself lives
// in Redis, which on this server keeps its data only in snapshots taken every few minutes (no append-only file): a
// Redis crash can bring back an older count, or none, and the gate would then think less of the day was used than
// Cloudflare will bill (a review, 2026-11-17). Each server process writes the highest count it has seen here (at
// most once a minute, never in a request's way), and the gate never counts the day as less than this copy.
// One small document per UTC day, removed 40 days after its last change.
import mongoose from "mongoose";

const cfNeuronDaySchema = new mongoose.Schema({
    day: { type: String, required: true, unique: true }, // "2026-12-01" (UTC, like Cloudflare's free allocation)
    used: { type: Number, default: 0 },
}, { timestamps: true });

cfNeuronDaySchema.index({ updatedAt: 1 }, { expireAfterSeconds: 40 * 24 * 3600 });

export default mongoose.models.CfNeuronDay || mongoose.model("CfNeuronDay", cfNeuronDaySchema);
