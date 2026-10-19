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
import express from 'express';
import Trajectory from '../models/Trajectory.js';

const router = express.Router();

// POST /api/build/start
// Retired (N2): this used to start the old separate build robot (controlPlane.runBuild + buildWorker,
// its own LLM, failed at step 1) and schedule watchdog alarms (alarmWorker) that posted hidden
// "SYSTEM ALARM: continue building" messages into the chat. The chat AI now executes approved plans
// itself, so this does nothing. The files are kept, just unused. GET /status still serves old sessions.
router.post('/start', (req, res) => {
  res.status(410).json({ error: 'The build robot is retired. Approved plans are now built by the chat AI.' });
});

// GET /api/build/status/:sessionId
// Poll this endpoint from the frontend to update checkboxes
router.get('/status/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const trajectory = await Trajectory.findOne({ sessionId });
    
    if (!trajectory) {
      return res.status(404).json({ error: 'Trajectory not found' });
    }

    res.json({
      sessionId: trajectory.sessionId,
      projectName: trajectory.projectName,
      status: trajectory.status,
      currentIndex: trajectory.currentIndex,
      plan: trajectory.plan,
      deployedUrl: trajectory.deployedUrl || null
    });
  } catch (error) {
    console.error('Error fetching build status:', error);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

export default router;
