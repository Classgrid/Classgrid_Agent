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
import { Worker } from 'bullmq';
import Trajectory from '../models/Trajectory.js';
import dotenv from 'dotenv';
dotenv.config();

const redisOptions = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
};

export const alarmWorker = new Worker('ai-build-alarms', async (job) => {
  const { sessionId, stepId, userEmail, contextString } = job.data;
  console.log(`[Alarm Worker] Fired for session ${sessionId} - Step: ${stepId}`);

  try {
    // 1. Check if the step is actually still pending in Trajectory
    const trajectory = await Trajectory.findOne({ sessionId });
    if (!trajectory) {
      console.log(`[Alarm Worker] No trajectory found for ${sessionId}. Ignoring alarm.`);
      return;
    }

    const step = trajectory.plan.find(s => s.id === stepId);
    if (!step) {
      console.log(`[Alarm Worker] Step ${stepId} not found in plan. Ignoring alarm.`);
      return;
    }

    // 2. If it's already done or failed, the AI completed it in time. Do nothing.
    if (step.status === 'done' || step.status === 'failed') {
      console.log(`[Alarm Worker] Step ${stepId} is already ${step.status}. Alarm dismissed.`);
      return;
    }

    // 3. If it's still pending, the AI got stuck! We must wake it up.
    console.log(`[Alarm Worker] 🚨 Step ${stepId} is STILL PENDING! Waking up AI...`);
    
    // We send a NEW message to the chat API to trigger the LLM again
    const wakeUpMessage = `SYSTEM ALARM: The execution of step "${step.title}" (${stepId}) has timed out or got stuck. Please continue building immediately. Review the files in the sandbox using read_sandbox_file if needed, and proceed with the remaining steps. Do not apologize, just execute the code for the next step.`;

    const { getIO } = await import('../services/socket.service.js');
    try {
      getIO().emit('ai_chat_message', { 
        sessionId, 
        role: 'system', 
        content: wakeUpMessage 
      });
    } catch (e) {
      console.error("[Alarm Worker] Failed to emit socket event:", e);
    }

    // Send HTTP POST to our own chat endpoint to wake up the agent
    const isProd = process.env.NODE_ENV === 'production';
    const apiUrl = isProd ? 'http://localhost:5000' : 'http://localhost:3000'; // local to the backend
    try {
      await fetch(`${apiUrl}/api/ai/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: wakeUpMessage,
          sessionId,
          userEmail,
          contextString,
          isSystemAlarm: true
        })
      });
      console.log(`[Alarm Worker] Wake up call sent successfully to AI for step ${stepId}.`);
    } catch (fetchErr) {
      console.error("[Alarm Worker] Failed to send wake-up fetch call:", fetchErr);
    }

  } catch (error) {
    console.error(`[Alarm Worker] Error processing alarm for ${stepId}:`, error);
  }
}, { connection: redisOptions });

alarmWorker.on('failed', (job, err) => {
  console.error(`Alarm Job ${job.id} failed with error ${err.message}`);
});
