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

const aiScheduleSchema = new mongoose.Schema({
  user_email: { type: String, required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  organization_id: { type: String },
  title: { type: String, required: true },
  description: { type: String },
  summary: { type: String },
  action_info: { type: String },
  scheduled_at: { type: Date, required: true },
  email_subject: { type: String },
  email_body: { type: String },
  whatsapp_phone_number: { type: String },
  whatsapp_message: { type: String },
  // Meta's message id, and whether the WhatsApp part failed (failed ones don't count toward the weekly limit)
  whatsapp_message_id: { type: String, index: true, sparse: true },
  whatsapp_failed: { type: Boolean, default: false },
  status: { 
    type: String, 
    enum: ['pending', 'sent', 'failed', 'cancelled'], 
    default: 'pending' 
  },
  sent_at: { type: Date },
  // Repeating schedules (utils/schedule-repeat.js): after each send scheduled_at moves to the next run
  repeat: { type: String, enum: ['once', 'daily', 'weekly', 'custom'], default: 'once' },
  repeat_days: [{ type: Number, min: 0, max: 6 }], // weekdays for "custom", 0 = Sunday
  repeat_until: { type: Date },
  repeat_tz: { type: String },
  run_count: { type: Number, default: 0 },
  error_message: { type: String },
  reschedule_history: [{
    previous_date: Date,
    rescheduled_at: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

const AiSchedule = mongoose.model('AiSchedule', aiScheduleSchema);

export default AiSchedule;
