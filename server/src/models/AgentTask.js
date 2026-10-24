// One long Agent task (one chat). The Agent can sleep (no AI runs, no tokens used) and is woken by a time, the
// user's WhatsApp message, or its tokens coming back. A task works for at most 48 hours (owner's rule), then the
// server ends it and tells the user. See services/agent-task.service.js.
import mongoose from 'mongoose';

const agentTaskSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  organization_id: { type: String, default: null },
  // The user's verified WhatsApp number (digits only), when they have one
  phone: { type: String, default: null, index: true },
  session_id: { type: String, default: null, index: true },
  project_id: { type: String, default: null },
  project_name: { type: String, default: null },
  // whatsapp: the answers go to the user on WhatsApp; chat: they only see them in the chat
  origin: { type: String, enum: ['whatsapp', 'chat'], default: 'chat' },
  goal: { type: String, default: '' },
  status: { type: String, enum: ['working', 'sleeping', 'waiting_tokens', 'done', 'ended'], default: 'sleeping', index: true },
  wake_at: { type: Date, default: null, index: true },
  wake_on_reply: { type: Boolean, default: true },
  note: { type: String, default: '' },
  sleep_message: { type: String, default: '' },
  // The Agent's last answer, so the small model knows what the user is replying to
  last_answer: { type: String, default: '' },
  slept_at: { type: Date, default: null },
  // The newest WhatsApp message this task has already taken in
  last_seen_msg_at: { type: Number, default: 0 },
  // Wake-ups in a row where the Agent did nothing new (5 in a row: it waits for the user instead of retrying)
  no_progress: { type: Number, default: 0 },
  pause_notified: { type: Boolean, default: false },
  // When this work started (a reply to a finished task starts new work); 48 hours after it the task is ended
  work_started_at: { type: Date, default: Date.now },
  heartbeat_at: { type: Date, default: null },
  wake_count: { type: Number, default: 0 },
  // When the big model ended the task itself (end_task tool)
  ended_by_ai_at: { type: Date, default: null },
  // When the task began (a call task: when the call started); its chat only sees emails from this time on
  started_at: { type: Date, default: null },
}, { timestamps: true });

agentTaskSchema.index({ phone: 1, updatedAt: -1 });

export default mongoose.models.AgentTask || mongoose.model('AgentTask', agentTaskSchema);
