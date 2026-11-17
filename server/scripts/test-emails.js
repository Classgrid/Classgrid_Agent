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
import { sendEmail } from '../src/services/aws-ses.service.js';
import {
    getGrantedCreditsLowEmailHtml,
    getTopUpCreditsLowEmailHtml,
    getPlanLimitReachedEmail,
    getGrantedCreditsExhaustedEmailHtml,
    getTopUpCreditsExhaustedEmailHtml,
    CREDIT_EMAIL_SUBJECTS,
} from '../src/services/email-templates.service.js';
import dotenv from 'dotenv';
dotenv.config();

// Sends the plan and credit alerts to the owner's test address only, to look at them in a real inbox (run by hand:
// node scripts/test-emails.js). The plan rows here are stand-ins with only what the emails read.
const testEmails = async () => {
    const recipients = ['nikhilsubsun123@gmail.com'];
    const userName = 'Nikhil';
    const free = { key: 'free', name: 'Free', window_reset_value: 5, window_reset_unit: 'hour' };
    const pro = { key: 'pro', name: 'Pro', window_reset_value: 5, window_reset_unit: 'hour' };
    const backAt = new Date(Date.now() + 3 * 3600 * 1000);

    for (const to of recipients) {
        console.log(`Sending to ${to}...`);
        for (const plan of [free, pro]) {
            const limit = getPlanLimitReachedEmail({ userName, plan, paidNames: ['Pro', 'Max'], which: 'window', backAt, periodMs: 5 * 3600 * 1000 });
            await sendEmail({ to, subject: limit.subject, html: limit.html });
        }
        await sendEmail({ to, subject: CREDIT_EMAIL_SUBJECTS.grantedLow, html: getGrantedCreditsLowEmailHtml(userName, pro) });
        await sendEmail({ to, subject: CREDIT_EMAIL_SUBJECTS.topUpLow, html: getTopUpCreditsLowEmailHtml(userName, pro) });
        await sendEmail({ to, subject: CREDIT_EMAIL_SUBJECTS.grantedUsedUp, html: getGrantedCreditsExhaustedEmailHtml(userName, pro) });
        await sendEmail({ to, subject: CREDIT_EMAIL_SUBJECTS.topUpUsedUp, html: getTopUpCreditsExhaustedEmailHtml(userName, pro) });
    }
    console.log('All test emails sent!');
};

testEmails().catch(console.error);
