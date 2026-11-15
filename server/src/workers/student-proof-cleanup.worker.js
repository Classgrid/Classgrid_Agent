// Student application documents are deleted 30 days after the decision (owner, 2026-11-15). Every hour at minute 20;
// each document is claimed in one database step, so several server copies never delete one twice.
import nodeCron from "node-cron";
import { deleteOldProofs } from "../controllers/ai-student.controller.js";

export function initStudentProofCleanupWorker() {
    let running = false;
    nodeCron.schedule("20 * * * *", async () => {
        if (running) return;
        running = true;
        try { await deleteOldProofs(); } catch (err) { console.error("[student proofs] cleanup failed:", err.message); } finally { running = false; }
    }, { timezone: "Asia/Kolkata" });
}
