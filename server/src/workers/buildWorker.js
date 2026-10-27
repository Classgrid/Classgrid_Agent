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
 * 🚫 NO DISK BLAME RULE (owner's order, 2026-10-27) 🚫
 * Claude and every AI model are FORBIDDEN to say an error comes from a full disk or low disk space.
 * The owner's disks are not full. Never guess the cause of an error: read the real logs and code first,
 * and only name a cause that was actually seen.
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
import { Worker } from 'bullmq';
import Trajectory from '../models/Trajectory.js';
import Artifact from '../models/Artifact.js';
import { createLLMClient } from '@classgrid/ai/core';
import dotenv from 'dotenv';
dotenv.config();

const redisOptions = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
};

export const buildWorker = new Worker('build-steps', async (job) => {
  const { sessionId, stepId, stepTitle, instructions } = job.data;
  console.log(`[Worker] Picked up job for session ${sessionId} - Step: ${stepTitle} (${stepId})`);

  try {
    const client = createLLMClient({
        providers: [
            {
                name: "mistral",
                url: "https://api.mistral.ai/v1/chat/completions",
                apiKey: process.env.MISTRAL_API_KEY || "",
                /* model: "mistral-large-latest" */
            },
            {
                name: "cloudflare",
                url: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1/chat/completions`,
                apiKey: process.env.CLOUDFLARE_WORKERS_AI_TOKEN || "",
                model: "@cf/deepseek-ai/deepseek-v4-pro-0813"
            }
        ]
    });

    const strictPrompt = `Execute step: ${stepTitle}. Output ONLY the code for ${stepId}. Do not output any other steps, preamble, markdown formatting ticks (unless it is exactly the code block), or explanations.`;
    
    console.log(`[Worker] Calling AI for step: ${stepId}...`);
    const codeResponse = await client.generate({
        messages: [
            { role: "user", content: strictPrompt + (instructions ? `\n\nContext: ${instructions}` : '') }
        ]
    });
    
    // Clean up the code response if it includes markdown backticks
    let cleanCode = codeResponse;
    if (cleanCode.startsWith('```')) {
      const lines = cleanCode.split('\n');
      lines.shift(); // remove opening ```lang
      if (lines[lines.length - 1].startsWith('```')) {
        lines.pop(); // remove closing ```
      }
      cleanCode = lines.join('\n');
    }

    // 2. Save the result to the Artifact store
    console.log(`[Worker] Saving artifact for ${stepId}...`);
    await Artifact.findOneAndUpdate(
      { sessionId, stepId },
      { content: cleanCode },
      { upsert: true, returnDocument: 'after' }
    );

    // 3. Mark the step done in the Trajectory
    console.log(`[Worker] Marking step ${stepId} as done in Trajectory...`);
    await Trajectory.findOneAndUpdate(
      { sessionId, "plan.id": stepId },
      { $set: { "plan.$.status": "done" } }
    );

    console.log(`[Worker] Job for ${stepId} completed successfully.`);
    return { ok: true, stepId };

  } catch (error) {
    console.error(`[Worker] Job failed for ${stepId}:`, error);
    await Trajectory.findOneAndUpdate(
      { sessionId, "plan.id": stepId },
      { 
        $set: { 
          "plan.$.status": "failed",
          "plan.$.error": error.message 
        } 
      }
    );
    throw error; // Let BullMQ handle retries if configured
  }
}, { connection: redisOptions });

buildWorker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed with error ${err.message}`);
});
