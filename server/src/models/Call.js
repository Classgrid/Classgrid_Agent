// One call (or one WhatsApp message / email) that Classgrid AI took for a user, and everything the AI did for it
// afterwards (owner's design, 2026-11-09): what was said on the call, the task it saved, every step of the work
// (tool, what went in, what came out, when, how long), its thinking, the models used, the WhatsApp messages and
// emails sent or read, failed steps, and the project it made. Shown read-only under "Calls" in the app; the link
// sent on WhatsApp after a call opens this record, never a chat. Kept for good (unlike TaskLog).
// Written by services/call-record.service.js.
import mongoose from 'mongoose';

const transcriptLine = new mongoose.Schema({
  at: { type: Number, default: 0 },                 // ms since the call started
  who: { type: String, enum: ['caller', 'ai', 'classgrid'], default: 'ai' }, // classgrid: a note about what the AI did
  kind: { type: String, enum: ['speech', 'task', 'asked', 'tool', 'message', 'email'], default: 'speech' },
  text: { type: String, default: '' },
  tool: { type: String, default: '' },
  args: { type: mongoose.Schema.Types.Mixed, default: null },
}, { _id: false });

const stepSchema = new mongoose.Schema({
  run: { type: Number, default: 1 },                // which run of the work this step belongs to
  at: { type: Date, default: Date.now },            // when the tool started
  ended_at: { type: Date, default: null },
  tool: { type: String, default: '' },
  title: { type: String, default: '' },
  args: { type: mongoose.Schema.Types.Mixed, default: null },
  result: { type: String, default: '' },
  status: { type: String, enum: ['ok', 'error', 'stopped'], default: 'ok' },
}, { _id: false });

const runSchema = new mongoose.Schema({
  no: { type: Number, default: 1 },
  started_at: { type: Date, default: Date.now },
  ended_at: { type: Date, default: null },
  reason: { type: String, default: '' },           // why this run started: call, reply, time, tokens, restart, email, helpers, retry
  outcome: { type: String, default: '' },          // answer, sleep, quota, error, stopped
  error: { type: String, default: '' },
  model: { type: String, default: '' },
  thought: { type: String, default: '' },          // the model's thinking during this run
  answer: { type: String, default: '' },           // what it said at the end of this run
  steps: { type: Number, default: 0 },
}, { _id: false });

const sentSchema = new mongoose.Schema({
  at: { type: Date, default: Date.now },
  kind: { type: String, enum: ['whatsapp', 'email'], default: 'whatsapp' },
  by: { type: String, enum: ['agent', 'classgrid'], default: 'classgrid' }, // agent: the AI's own tool; classgrid: the server's message
  to: { type: String, default: '' },
  text: { type: String, default: '' },
  ok: { type: Boolean, default: true },
}, { _id: false });

const callSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  organization_id: { type: String, default: null },
  phone: { type: String, default: null },
  // call: a WhatsApp voice call; message: a WhatsApp message that started a task; email: an email to agent@classgrid.in
  origin: { type: String, enum: ['call', 'message', 'email'], default: 'call' },
  call_id: { type: String, default: null, index: true },   // Meta's call id (calls only)

  // The call
  started_at: { type: Date, default: Date.now, index: true },
  ended_at: { type: Date, default: null },
  duration_ms: { type: Number, default: 0 },
  ended_by: { type: String, default: '' },          // remote (the caller hung up), AI hung up, 15 minute limit, error, connection failed
  call_model: { type: String, default: '' },
  transcript: { type: [transcriptLine], default: [] },
  tasks: { type: [{ text: String, project_name: String, coding: Boolean }], default: [] },
  live_works: { type: [{ key: String, session_id: String, request: String, started_at: Date, ended_at: Date, answer: String, error: String, late: Boolean }], default: [] },

  // What it is called (the AI's title for the work) and a short summary
  name: { type: String, default: '' },
  summary: { type: String, default: '' },

  // The work after the call
  // live: on the call now · answered: no task, answered on the call · queued · working · sleeping (continues at a
  // time) · waiting (for the user's reply) · paused (tokens ran out) · retrying (a run failed, trying again) ·
  // done · failed (gave up) · stopped (48 hours over)
  status: { type: String, default: 'live', index: true },
  agent_task_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AgentTask', default: null, index: true },
  session_id: { type: String, default: null, index: true },
  project_id: { type: String, default: null },
  project_name: { type: String, default: null },
  project_made: { type: Boolean, default: false },  // the project was made for this call
  wake_at: { type: Date, default: null },
  error: { type: String, default: '' },             // the last failure, when status is retrying or failed
  work: {
    started_at: { type: Date, default: null },
    ended_at: { type: Date, default: null },
    attempts: { type: Number, default: 0 },
    runs: { type: [runSchema], default: [] },
    steps: { type: [stepSchema], default: [] },
    models: { type: [String], default: [] },
    counts: {
      steps: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      whatsapp_sent: { type: Number, default: 0 },
      emails_read: { type: Number, default: 0 },
      emails_sent: { type: Number, default: 0 },
    },
  },
  // Messages sent to the user for this work (the AI's own and the server's)
  sent: { type: [sentSchema], default: [] },
}, { timestamps: true });

callSchema.index({ user_id: 1, started_at: -1 });

export default mongoose.models.Call || mongoose.model('Call', callSchema);
