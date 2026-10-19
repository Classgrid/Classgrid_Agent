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
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const AiSchedule = (await import('./server/src/models/AiSchedule.js')).default;
    const failedSchedules = await AiSchedule.find({ status: 'failed' }).sort({ createdAt: -1 }).limit(3);
    for (const schedule of failedSchedules) {
      console.log(`\nSchedule ID: ${schedule._id}`);
      console.log(`Title: ${schedule.title}`);
      console.log(`Scheduled At: ${schedule.scheduled_at}`);
      console.log(`Error Message: ${schedule.error_message}`);
    }
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
