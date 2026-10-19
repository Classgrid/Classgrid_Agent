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
// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
import mongoose from 'mongoose';

const aiLibraryFileSchema = new mongoose.Schema({
  user_email: { type: String, required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  organization_id: { type: String },
  original_name: { type: String, required: true },
  file_key: { type: String }, // R2 key or null for generated
  cdn_url: { type: String, required: true },
  mime_type: { type: String },
  file_type: { type: String, enum: ['image', 'video', 'pdf', 'pptx', 'doc', 'audio', 'other'], default: 'other' },
  size_bytes: { type: Number, default: 0 },
  source: { type: String, enum: ['uploaded', 'generated'], default: 'uploaded' },
  thumbnail_url: { type: String },
  created_at: { type: Date, default: Date.now }
});

export default mongoose.model('AiLibraryFile', aiLibraryFileSchema);
