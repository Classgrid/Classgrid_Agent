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
import cron from 'node-cron';
import AiSchedule from '../models/AiSchedule.js';
import { sendEmail } from '../services/aws-ses.service.js';
import { normalizeWhatsappNumber, checkWhatsappLimit, recordDirectWhatsappSend } from '../services/ai-feature-limits.js';
import { nextRun } from '../utils/schedule-repeat.js';

// Run every minute
cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();
    // Find pending schedules where scheduled time has passed
    const pendingSchedules = await AiSchedule.find({
      status: 'pending',
      scheduled_at: { $lte: now }
    });

    for (const schedule of pendingSchedules) {
        const isRepeat = schedule.repeat && schedule.repeat !== 'once';
        // A repeating schedule moves on to its next run (runs missed while the server was down are skipped,
        // not sent all at once); after the last run it is done like a one-time schedule.
        let next = isRepeat ? nextRun(schedule, schedule.scheduled_at) : null;
        while (next && next <= now) next = nextRun(schedule, next);

        // As requested by user: Trust MongoDB. Mark as sent immediately BEFORE AWS SES even tries.
        // Claimed atomically (only if still pending at this run time), so a run is never sent twice.
        const claimed = await AiSchedule.findOneAndUpdate(
          { _id: schedule._id, status: 'pending', scheduled_at: schedule.scheduled_at },
          next
            ? { scheduled_at: next, sent_at: new Date(), error_message: '', whatsapp_failed: false, $inc: { run_count: 1 } }
            : { status: 'sent', sent_at: new Date(), error_message: '', $inc: { run_count: 1 } },
        );
        if (!claimed) continue;

        console.log(`[AiSchedule Worker] Successfully marked schedule ${schedule._id} as sent for ${schedule.user_email}${next ? ` (next run ${next.toISOString()})` : ''}`);

        try {
          const { getIO } = await import('../services/socket.service.js');
          if (schedule.user_id) getIO().to(schedule.user_id.toString()).emit('ai:schedule_updated', { schedule_id: schedule._id });
        } catch (socErr) {
          console.error("Failed to emit socket update", socErr);
        }

        // Fire and forget AWS SES if email fields exist
        if (schedule.email_subject && schedule.email_body) {
          sendEmail({
            to: schedule.user_email,
            subject: schedule.email_subject,
            html: schedule.email_body
          }).catch(smtpErr => {
            console.warn(`[AiSchedule Worker] AWS SES SMTP threw an error. Error: ${smtpErr.message}`);
          });
        }

        // Each run of a repeating schedule counts toward the weekly WhatsApp limit when it goes out;
        // over the limit, that run sends the email only
        let whatsappAllowed = true;
        if (isRepeat && schedule.whatsapp_phone_number && schedule.whatsapp_message && schedule.user_id) {
          try {
            const { allowed, used, limit, periodText = '7 days' } = await checkWhatsappLimit({ _id: schedule.user_id, organization_id: schedule.organization_id });
            if (!allowed) {
              whatsappAllowed = false;
              await AiSchedule.updateOne({ _id: schedule._id }, { error_message: `WhatsApp skipped: limit reached (${used}/${limit} in the last ${periodText})` });
            }
          } catch (limitErr) {
            console.warn(`[AiSchedule Worker] WhatsApp limit check failed: ${limitErr.message}`);
          }
        }

        // Fire and forget WhatsApp if whatsapp fields exist
        if (whatsappAllowed && schedule.whatsapp_phone_number && schedule.whatsapp_message) {
          if (process.env.WHATSAPP_PHONE_ID && process.env.WHATSAPP_ACCESS_TOKEN) {
            fetch(`https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: normalizeWhatsappNumber(schedule.whatsapp_phone_number),
                type: "text",
                text: {
                  preview_url: false,
                  body: schedule.whatsapp_message
                }
              })
            }).then(res => res.json()).then(data => {
              // Failed WhatsApp parts are flagged so they don't count toward the user's weekly limit.
              if (data.error) {
                console.warn(`[AiSchedule Worker] WhatsApp API error: ${JSON.stringify(data.error)}`);
                return AiSchedule.updateOne({ _id: schedule._id }, { whatsapp_failed: true, error_message: `WhatsApp: ${JSON.stringify(data.error).slice(0, 300)}` });
              }
              const messageId = data.messages?.[0]?.id;
              if (isRepeat && schedule.user_id) recordDirectWhatsappSend(schedule.user_id, messageId);
              if (messageId) return AiSchedule.updateOne({ _id: schedule._id }, { whatsapp_message_id: messageId });
            }).catch(waErr => {
              console.warn(`[AiSchedule Worker] WhatsApp fetch failed. Error: ${waErr.message}`);
              AiSchedule.updateOne({ _id: schedule._id }, { whatsapp_failed: true, error_message: `WhatsApp: ${waErr.message}` }).catch(() => {});
            });
          } else {
             console.warn(`[AiSchedule Worker] Missing WhatsApp credentials in .env`);
          }
        }
    }
  } catch (error) {
    console.error('[AiSchedule Worker] Error processing schedules:', error);
  }
});
