// The record of one long task (owner's design, 2026-10-24): its name, the user's WhatsApp messages for it, a summary,
// each step's result, and the small model's messages (its replies to the user and what it passed to the big model).
// Only the small model's side (the server) writes the user's WhatsApp messages here; the big model reads them from
// here. When the task ends, ended_at is set and MongoDB deletes the record 1 hour later (TTL), so a new task never
// sees an old task's messages. See services/agent-task.service.js.
import mongoose from 'mongoose';

const taskLogSchema = new mongoose.Schema({
  agent_task_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AgentTask', default: null, index: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  phone: { type: String, default: null },
  session_id: { type: String, default: null, index: true },
  name: { type: String, default: '' },
  // msg_type, not type: inside an array of objects Mongoose would read "type" as the field's data type
  whatsapp_messages: [{
    wa_id: String, at: Number, msg_type: String, text: String, file_url: String, file_name: String, file_error: String,
    // read: the big model has been given it
    read: { type: Boolean, default: false },
    _id: false,
  }],
  summary: { type: String, default: '' },
  steps: [{ at: { type: Date, default: Date.now }, tool: String, result: String, _id: false }],
  // to_user: the small model's reply to the user · to_agent: what was passed to the big model
  small_model_messages: [{ at: { type: Date, default: Date.now }, to: { type: String, enum: ['user', 'agent'] }, text: String, _id: false }],
  ended: { type: Boolean, default: false },
  ended_at: { type: Date, default: null },
}, { timestamps: true });

// Deleted 1 hour after the task ends (a record with no ended_at is never deleted)
taskLogSchema.index({ ended_at: 1 }, { expireAfterSeconds: 3600 });
taskLogSchema.index({ agent_task_id: 1, ended: 1 });

export default mongoose.models.TaskLog || mongoose.model('TaskLog', taskLogSchema);
