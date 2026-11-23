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
import { sendsOneTimeWhatsapp, keepSentWhatsappCounted, countWhatsappResend, freeWhatsappResend } from '../services/ai-feature-limits.js';

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
    
    // WhatsApp limit (2026-11-21, owner: "fix all"): deleting a schedule after its WhatsApp message went out
    // removed its row, and the sent message dropped out of the person's count. The sent message is kept in the
    // count first (services/ai-feature-limits.js); if that can't be written, nothing is deleted.
    await keepSentWhatsappCounted(schedule);
    await AiSchedule.deleteOne({ _id: id });
    // A schedule deleted while still waiting frees its place, as before. One that was set to go out again
    // (updateSchedule below) had that message counted the moment it was booked: that place is given back here.
    if (schedule.status === 'pending') {
      await freeWhatsappResend(schedule).catch((e) => console.error('[WhatsApp] the place of a deleted schedule could not be given back:', e.message));
    }
    res.status(200).json({ success: true, message: 'Schedule deleted' });
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

    let resendCounted = false;
    if (scheduled_at) {
      if (schedule.scheduled_at && schedule.scheduled_at.getTime() !== new Date(scheduled_at).getTime()) {
        schedule.reschedule_history = schedule.reschedule_history || [];
        schedule.reschedule_history.push({
          previous_date: schedule.scheduled_at,
          rescheduled_at: new Date()
        });
      }
      schedule.scheduled_at = new Date(scheduled_at);
      if (schedule.status !== 'pending') {
        // WhatsApp limit (2026-11-21, owner: "fix all"): a one-time schedule that already went out is set back to
        // "pending" here, and the worker sends its WhatsApp message again. That is one more message, but it was
        // still one counted row (none once the row was older than the period). Now it is checked against the
        // person's limit the way a new schedule is, the message that went out stays counted and the new one is
        // counted from this moment (countWhatsappResend, services/ai-feature-limits.js).
        if (sendsOneTimeWhatsapp(schedule)) {
          await schedule.validate(); // (a time that can't be saved is refused before anything is counted or paid)
          const wa = await countWhatsappResend(schedule, req.user);
          if (wa && !wa.allowed) {
            return res.status(403).json({
              success: false,
              code: 'whatsapp_limit',
              error: `You have used ${wa.used} of ${wa.limit} WhatsApp messages allowed in the last ${wa.periodText || '7 days'} (the limit is set by Classgrid admins).${wa.extraOffer || ''}`,
              used: wa.used,
              limit: wa.limit,
            });
          }
          resendCounted = !!wa;
        }
        schedule.status = 'pending';
      }
    }

    try {
      await schedule.save();
    } catch (saveError) {
      // The new time was not saved, so nothing will go out again: the place that was just counted is given back
      if (resendCounted) await freeWhatsappResend(schedule).catch(() => {});
      throw saveError;
    }
    res.json({ success: true, schedule });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

