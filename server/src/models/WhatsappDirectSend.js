// One row per WhatsApp message the AI sent right away, or as a run of a repeating schedule (services/
// ai-feature-limits.js recordDirectWhatsappSend): what the WhatsApp limit counts besides the one-time schedules.
// Until 2026-11-21 these sends were kept only in a Redis list, and with Redis away they were not counted at all, so
// the WhatsApp limit did not hold. `ref` is "wamid:<Meta's message id>" (a failed delivery report takes the row off
// again) or a made-up one when Meta gave no id. Rows are removed by themselves after a year (the longest reset
// period a limit can have is 366 days).
import mongoose from "mongoose";

const whatsappDirectSendSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    ref: { type: String, required: true, unique: true },
    at: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
});

whatsappDirectSendSchema.index({ userId: 1, at: 1 });
whatsappDirectSendSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.WhatsappDirectSend || mongoose.model("WhatsappDirectSend", whatsappDirectSendSchema);
