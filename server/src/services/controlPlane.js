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
import Trajectory from '../models/Trajectory.js';
import { buildQueue } from '../queues/buildQueue.js';
import { deployToR2 } from './deploy.js';

/**
 * The Foreman Loop: Reads the trajectory, decides the next step, enqueues it, and force-stops when done.
 * This function guarantees no infinite loops through strict iteration and timeout guards.
 */
export async function runBuild(sessionId) {
  try {
    let trajectory = await Trajectory.findOne({ sessionId });
    if (!trajectory) throw new Error(`Trajectory not found for session ${sessionId}`);

    const MAX_STEPS = trajectory.plan.length;
    const MAX_ITERATIONS = MAX_STEPS + 2;  // Hard cap to prevent infinite loops
    const GLOBAL_TIMEOUT = 10 * 60 * 1000; // 10 minutes maximum runtime
    const startTime = Date.now();

    let iterations = 0;

    console.log(`[Control Plane] Starting build for session ${sessionId} (${MAX_STEPS} steps)`);

    while (trajectory.currentIndex < MAX_STEPS) {
      // GUARD 1: Hard iteration cap
      iterations++;
      if (iterations > MAX_ITERATIONS) {
        console.error(`[Control Plane] ABORTED: Exceeded max iterations (${MAX_ITERATIONS})`);
        await Trajectory.findOneAndUpdate({ sessionId }, { status: 'aborted', abortReason: 'exceeded max iterations' });
        break;
      }

      // GUARD 2: Global timeout
      if (Date.now() - startTime > GLOBAL_TIMEOUT) {
        console.error(`[Control Plane] ABORTED: Global timeout reached (10 min)`);
        await Trajectory.findOneAndUpdate({ sessionId }, { status: 'aborted', abortReason: 'timeout' });
        break;
      }

      const step = trajectory.plan[trajectory.currentIndex];

      // GUARD 3: Dedup — never re-run a done step
      if (step.status === "done") {
        trajectory.currentIndex++;
        await trajectory.save();
        continue;
      }

      console.log(`[Control Plane] Enqueuing step ${trajectory.currentIndex + 1}/${MAX_STEPS}: ${step.id}`);

      // DEPLOY STEP: Skip AI, call deployToR2 directly
      if (step.id === 'deploy') {
        console.log(`[Control Plane] Deploy step detected — uploading artifacts to R2...`);
        try {
          const url = await deployToR2(sessionId, trajectory.projectName);
          console.log(`[Control Plane] Deploy complete: ${url}`);
          await Trajectory.findOneAndUpdate(
            { sessionId, "plan.id": "deploy" },
            { $set: { "plan.$.status": "done" } }
          );
        } catch (deployErr) {
          console.error(`[Control Plane] Deploy failed:`, deployErr);
          await Trajectory.findOneAndUpdate(
            { sessionId, "plan.id": "deploy" },
            { $set: { "plan.$.status": "failed", "plan.$.error": deployErr.message } }
          );
        }
        // Advance past deploy
        trajectory = await Trajectory.findOne({ sessionId });
        trajectory.currentIndex++;
        await trajectory.save();
        continue;
      }

      // Enqueue ONE step for the worker
      await buildQueue.add('execute-step', {
        sessionId,
        stepId: step.id,
        stepTitle: step.title,
      });

      // Wait for the worker to finish this specific step
      const completed = await waitForStepCompletion(sessionId, step.id);

      if (!completed) {
        console.error(`[Control Plane] ABORTED: Step ${step.id} timed out`);
        await Trajectory.findOneAndUpdate({ sessionId }, { status: 'aborted', abortReason: `step ${step.id} timed out` });
        break;
      }

      // Advance to the next step
      trajectory = await Trajectory.findOne({ sessionId }); // refresh state
      trajectory.currentIndex++;
      await trajectory.save();
    }

    // If we finished the loop normally and didn't abort
    trajectory = await Trajectory.findOne({ sessionId });
    if (trajectory.status === 'running' && trajectory.currentIndex >= MAX_STEPS) {
      console.log(`[Control Plane] Build complete for session ${sessionId}`);
      await Trajectory.findOneAndUpdate({ sessionId }, { status: 'completed' });
    }

  } catch (err) {
    console.error(`[Control Plane] FATAL ERROR in runBuild for session ${sessionId}:`, err);
    await Trajectory.findOneAndUpdate({ sessionId }, { status: 'failed', abortReason: err.message });
  }
}

/**
 * Polls the database to wait for a step to be marked as "done".
 */
async function waitForStepCompletion(sessionId, stepId, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const traj = await Trajectory.findOne({ sessionId });
    const step = traj.plan.find(s => s.id === stepId);
    
    if (step && step.status === "done") {
      return true;
    }
    if (step && step.status === "failed") {
      throw new Error(`Step ${stepId} failed: ${step.error}`);
    }

    // Sleep for 1 second before polling again
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return false; // Timed out
}
