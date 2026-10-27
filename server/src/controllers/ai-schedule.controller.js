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
import AiSchedule from '../models/AiSchedule.js';

export const getMySchedules = async (req, res) => {
  try {
    const userEmail = req.user.email;
    const { status } = req.query;
    
    let query = { user_email: userEmail };
    if (status && status !== 'all') {
      query.status = status;
    }

    const schedules = await AiSchedule.find(query).sort({ scheduled_at: -1 });
    res.status(200).json({ success: true, schedules });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getScheduleById = async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = req.user.email;

    const schedule = await AiSchedule.findOne({ _id: id, user_email: userEmail });
    if (!schedule) {
      return res.status(404).json({ success: false, error: 'Schedule not found' });
    }

    res.status(200).json({ success: true, schedule });
  } catch (error) {
    console.error('Error fetching schedule by id:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const cancelSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = req.user.email;
    
    const schedule = await AiSchedule.findOne({ _id: id, user_email: userEmail });
    if (!schedule) {
      return res.status(404).json({ success: false, error: 'Schedule not found' });
    }
    
    await AiSchedule.deleteOne({ _id: id });
    res.status(200).json({ success: true, message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateSchedule = async (req, res) => {
  try {
    const userEmail = req.user.email;
    const { id } = req.params;
    const { scheduled_at } = req.body;
    
    const schedule = await AiSchedule.findOne({ _id: id, user_email: userEmail });
    if (!schedule) {
      return res.status(404).json({ success: false, error: 'Schedule not found' });
    }
    
    if (scheduled_at) {
      if (schedule.scheduled_at && schedule.scheduled_at.getTime() !== new Date(scheduled_at).getTime()) {
        schedule.reschedule_history = schedule.reschedule_history || [];
        schedule.reschedule_history.push({
          previous_date: schedule.scheduled_at,
          rescheduled_at: new Date()
        });
      }
      schedule.scheduled_at = new Date(scheduled_at);
      if (schedule.status !== 'pending') schedule.status = 'pending';
    }
    
    await schedule.save();
    res.json({ success: true, schedule });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

